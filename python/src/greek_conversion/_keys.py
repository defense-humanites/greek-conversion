"""The spelling of option keys: snake_case in Python, camelCase in the
library.

The library's keys are converted mechanically, both ways: ``long_vowels`` ↔
``longVowels``, ``beta_code`` ↔ ``betaCode``. The bridge lists them: the keys
of options, of a converter's configuration, and of preset metadata
(``python/js/entry.ts``). Anything else is left as it is: values
(``"grave-circumflex"``, ``"myPreset"``), the formats that key a custom
character's forms (``"beta-code"``), and unknown keys, which the library then
refuses as they were written. A test checks that every key converts both
ways (``tests/test_keys.py``).

A key of the library written in camelCase is refused, so that one option has
one spelling.
"""

from __future__ import annotations

import functools
import re
from collections.abc import Mapping
from typing import Any

from . import _engine
from ._errors import OptionError

# An identifier in a message or a path, which may be a key of the library.
_IDENTIFIER = re.compile(r"\b[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+\b")
# A JSON string in a message: a value received or accepted, left as it is.
_QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"')


def snake(key: str) -> str:
    """``longVowels`` → ``long_vowels``."""
    return re.sub(r"[A-Z]", lambda match: "_" + match.group().lower(), key)


@functools.cache
def constants() -> dict[str, Any]:
    """The library's constants and keys, as the bridge gives them."""
    return _engine.call("constants")


@functools.cache
def _tables() -> tuple[dict[str, str], frozenset[str]]:
    """The camelCase spelling of each snake_case key, and the camelCase keys
    that have another spelling in Python."""
    camel_keys = frozenset(key for key in constants()["keys"] if snake(key) != key)
    return {snake(key): key for key in camel_keys}, camel_keys


def to_js(value: Any, path: str = "") -> Any:
    """Options as the library reads them: its keys in camelCase.

    :raises OptionError: for a key of the library written in camelCase.
    """
    if isinstance(value, Mapping):
        to_camel, camel_keys = _tables()
        converted = {}
        for key, item in value.items():
            where = f"{path}.{key}" if path else str(key)
            if isinstance(key, str) and key in camel_keys:
                written = f"{path}.{snake(key)}" if path else snake(key)
                raise OptionError(
                    f"Unknown option: {where}; options are written in "
                    f"snake_case: {written}",
                    path=where,
                    received=None,
                    accepted=(),
                    replacement=written,
                )
            name = to_camel.get(key, key) if isinstance(key, str) else key
            converted[name] = to_js(item, where)
        return converted
    if isinstance(value, (list, tuple)):
        return [to_js(item, f"{path}[{index}]") for index, item in enumerate(value)]
    return value


def from_js(value: Any) -> Any:
    """Options or metadata as the package gives them: the library's keys in
    snake_case."""
    if isinstance(value, dict):
        _, camel_keys = _tables()
        return {
            (snake(key) if key in camel_keys else key): from_js(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [from_js(item) for item in value]
    return value


def _rewrite(part: str) -> str:
    _, camel_keys = _tables()
    return _IDENTIFIER.sub(
        lambda m: snake(m.group()) if m.group() in camel_keys else m.group(), part
    )


def text(message: str) -> str:
    """The library's keys in a message or a path, in snake_case, outside the
    JSON strings that quote values."""
    parts = []
    last = 0
    for quoted in _QUOTED.finditer(message):
        parts.append(_rewrite(message[last : quoted.start()]))
        parts.append(quoted.group())
        last = quoted.end()
    parts.append(_rewrite(message[last:]))
    return "".join(parts)
