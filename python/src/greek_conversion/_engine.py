"""The embedded JavaScript engine that runs the library's bundle.

Two engines evaluate the same bundle:

- ``"quickjs"``, through ``quickjs-ng``, a dependency of the package (or the
  archived ``quickjs`` package, which provides the same module): an
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
import json
import os
import threading
from importlib import resources
from typing import Any, Callable, Protocol

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
# Incremented each time an engine is closed: a handle remembers the
# generation it was made in, and is invalid in any other.
generation = 0


def set_engine(name: str | None) -> None:
    """Chooses the engine, ``"v8"`` or ``"quickjs"``, or ``None`` for the
    default. The current engine, if any, is closed: handles made with it
    (prepared options, converters) can no longer be used."""
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
    global _backend
    with _lock:
        if _backend is None:
            _backend = _create()
        return _backend


@atexit.register
def _close() -> None:
    global _backend, generation
    with _lock:
        if _backend is not None:
            _backend.close()
            _backend = None
            generation += 1


class JavaScriptError(RuntimeError):
    """An error of the library that has no Python counterpart: a bug, which
    should be reported."""


def call(operation: str, *args: Any) -> Any:
    """Runs one operation of the bridge and returns its value, or raises the
    Python counterpart of the JavaScript error."""
    args_json = json.dumps(args, ensure_ascii=False, separators=(",", ":"))
    with _lock:
        result = json.loads(_get().call(operation, args_json))
    if "error" in result:
        from ._errors import from_javascript

        raise from_javascript(result["error"])
    return result["ok"]
