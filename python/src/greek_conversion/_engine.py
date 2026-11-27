"""The embedded JavaScript engine that runs the library's bundle.

Two engines evaluate the same bundle:

- ``"quickjs"``, through ``quickjs-ng``, a dependency of the package: an
  interpreter, small and quick to start, with a low cost per call, but
  several times slower than Node on a long text;
- ``"v8"``, through ``mini-racer`` (``pip install greek-conversion[v8]``):
  V8 with its JIT, as fast as Node inside the engine, but each call costs
  tens to hundreds of microseconds, and the wheel weighs 20 MB.

The engine is chosen by :func:`set_engine`, or by the environment variable
``GREEK_CONVERSION_ENGINE``, or else is V8 if it is installed, which asks
for it, and QuickJS otherwise. One engine serves the process, created on
first use; calls are serialized by a lock, since neither binding allows
concurrent calls into one context.
"""

from __future__ import annotations

import atexit
import collections
import json
import os
import re
import threading
import weakref
from collections.abc import Callable, Sequence
from importlib import resources
from typing import Any, ClassVar, Protocol

ENGINES = ("v8", "quickjs")


class _Backend(Protocol):
    name: str

    def call(self, operation: str, args_json: str) -> str: ...

    def close(self) -> None: ...


def _read(name: str) -> str:
    return resources.files("greek_conversion").joinpath("_bundle", name).read_text(
        encoding="utf-8"
    )


class _V8Backend:
    name = "v8"

    def __init__(self) -> None:
        from py_mini_racer import MiniRacer

        self._context = MiniRacer()
        self._context.eval(_read("greek_conversion.js"))
        self._call: Callable[[str, str], str] = self._context.eval(
            "__greekConversion.call"
        )

    def call(self, operation: str, args_json: str) -> str:
        return self._call(operation, args_json)

    def close(self) -> None:
        # Without it, mini-racer's thread keeps the interpreter from exiting.
        self._context.close()


class _QuickJSBackend:
    name = "quickjs"

    def __init__(self) -> None:
        import quickjs

        self._context = quickjs.Context()
        self._context.eval(_read("polyfills.js"))
        self._context.eval(_read("greek_conversion.js"))
        self._call: Callable[[str, str], str] = self._context.eval(
            "__greekConversion.call"
        )

    def call(self, operation: str, args_json: str) -> str:
        return self._call(operation, args_json)

    def close(self) -> None:
        pass


_FACTORIES: dict[str, Callable[[], _Backend]] = {
    "v8": _V8Backend,
    "quickjs": _QuickJSBackend,
}

_lock = threading.RLock()
_backend: _Backend | None = None
_requested: str | None = None
# Incremented each time the engine is closed or left behind by a fork: the
# objects made in an engine (prepared options, converters) belong to one
# process and one generation, and are made again in any other.
generation = 0
# Engines left behind in a forked child, kept from being collected: closing
# one would wait for a thread that only exists in the parent.
_abandoned: list[_Backend] = []
# Objects collected, whose engine side is released at the next call. A
# finalizer only appends here: it may run in any thread, including
# mini-racer's own, which must never wait for the lock.
_pending: collections.deque[tuple[tuple[int, int], int]] = collections.deque()


def _owner() -> tuple[int, int]:
    return (os.getpid(), generation)


def set_engine(name: str | None) -> None:
    """Chooses the engine, ``"v8"`` or ``"quickjs"``, or ``None`` for the
    default. The current engine, if any, is closed; prepared options and
    converters are made again in the next one when they are next used."""
    global _backend, _requested, generation
    if name is not None and name not in ENGINES:
        raise ValueError(f"Unknown engine: {name!r}; expected one of {ENGINES}.")
    with _lock:
        if _backend is not None:
            _backend.close()
            _backend = None
            generation += 1
        _requested = name


def engine_name() -> str:
    """The name of the engine in use, starting it if needed."""
    with _lock:
        return _get().name


def _create() -> _Backend:
    requested = _requested or os.environ.get("GREEK_CONVERSION_ENGINE") or None
    if requested is not None:
        if requested not in _FACTORIES:
            raise ValueError(
                f"Unknown engine: {requested!r}; expected one of {ENGINES}."
            )
        try:
            return _FACTORIES[requested]()
        except ImportError as error:
            remedy = (
                "pip install greek-conversion[v8]"
                if requested == "v8"
                else "pip install quickjs-ng"
            )
            raise ImportError(
                f"The {requested} engine is not installed: {remedy} ({error})."
            ) from error
    errors = []
    for name in ENGINES:
        try:
            return _FACTORIES[name]()
        except ImportError as error:
            errors.append(f"{name}: {error}")
    raise ImportError(
        "No JavaScript engine is installed: pip install quickjs-ng, or "
        "pip install greek-conversion[v8]. " + "; ".join(errors)
    )


def _get() -> _Backend:
    """The engine, started if needed. Called with the lock held."""
    global _backend
    if _backend is None:
        _backend = _create()
    return _backend


def _after_fork_in_child() -> None:
    # The lock may have been held by another thread of the parent, and V8's
    # thread does not exist in the child: start afresh.
    global _lock, _backend, generation
    _lock = threading.RLock()
    if _backend is not None:
        _abandoned.append(_backend)
        _backend = None
    generation += 1
    _pending.clear()


if hasattr(os, "register_at_fork"):
    os.register_at_fork(after_in_child=_after_fork_in_child)


@atexit.register
def _close() -> None:
    global _backend, generation
    # Not forever: a thread that dies holding the lock must not hang the exit.
    if not _lock.acquire(timeout=5):
        return
    try:
        if _backend is not None:
            _backend.close()
            _backend = None
            generation += 1
    finally:
        _lock.release()


class JavaScriptError(RuntimeError):
    """An error of the library that has no Python counterpart: a bug, which
    should be reported."""


class _HandleState:
    """Where an object lives in the engine: the process and generation it
    was made in, and its number there."""

    __slots__ = ("id", "owner")

    def __init__(self) -> None:
        self.owner: tuple[int, int] | None = None
        self.id = 0


def _forget(state: _HandleState) -> None:
    try:
        if state.owner is not None and state.owner == _owner():
            _pending.append((state.owner, state.id))
    except Exception:  # noqa: BLE001, S110 - at shutdown, modules may be gone.
        pass


class Handle:
    """An object of the library made in the engine from a mapping, which
    stays on the Python side: made again in another engine or process,
    released when collected, picklable."""

    __slots__ = ("__weakref__", "_payload", "_state")

    _operation: ClassVar[str]

    def __init__(self, payload: Any) -> None:
        self._payload = payload
        self._state = _HandleState()
        weakref.finalize(self, _forget, self._state)

    def _arguments(self) -> tuple[Any, ...]:
        return (self._payload,)

    @classmethod
    def _restore(cls, payload: Any) -> Handle:
        return cls(payload)

    def __reduce__(self) -> tuple[Any, ...]:
        return (type(self)._restore, (self._payload,))

    # Immutable: a copy is the object itself.
    def __copy__(self) -> Handle:
        return self

    def __deepcopy__(self, memo: dict[int, Any]) -> Handle:
        return self


def _resolve(handle: Handle, backend: _Backend) -> int:
    """The number of a handle in the current engine, made if needed. Called
    with the lock held."""
    owner = _owner()
    state = handle._state
    if state.owner != owner:
        state.id = _raw(backend, handle._operation, handle._arguments())
        state.owner = owner
    return state.id


def _drain(backend: _Backend) -> None:
    owner = _owner()
    ids = []
    while _pending:
        made_by, id_ = _pending.popleft()
        if made_by == owner:
            ids.append(id_)
    if ids:
        _raw(backend, "release", (ids,))


_SURROGATE = re.compile("[\ud800-\udfff]")


def _raw(backend: _Backend, operation: str, args: tuple[Any, ...]) -> Any:
    # NaN and infinities are refused here, as ValueError: JSON has none.
    args_json = json.dumps(
        args, ensure_ascii=False, allow_nan=False, separators=(",", ":")
    )
    if _SURROGATE.search(args_json):
        # A lone surrogate cannot be encoded as UTF-8 for the engine: escaped.
        args_json = json.dumps(args, allow_nan=False, separators=(",", ":"))
    result = json.loads(backend.call(operation, args_json))
    if "error" in result:
        from ._errors import from_javascript

        raise from_javascript(result["error"])
    return result["ok"]


def make(handle: Handle) -> None:
    """Makes a handle in the engine now, so that its errors are raised at
    once rather than at its first use."""
    with _lock:
        backend = _get()
        if _pending:
            _drain(backend)
        _resolve(handle, backend)


def call(
    operation: str, *args: Any, handles: Sequence[Handle | None] | None = None
) -> Any:
    """Runs one operation of the bridge and returns its value, or raises the
    Python counterpart of the JavaScript error. The numbers of ``handles``
    (``None`` for none) follow the arguments."""
    with _lock:
        backend = _get()
        if _pending:
            _drain(backend)
        if handles is not None:
            args = args + tuple(
                None if handle is None else _resolve(handle, backend)
                for handle in handles
            )
        return _raw(backend, operation, args)
