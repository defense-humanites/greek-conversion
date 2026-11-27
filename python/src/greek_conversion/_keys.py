"""The spelling of option keys: snake_case in Python, camelCase in the
library.

Option keys are converted mechanically, both ways: ``long_vowels`` ↔
``longVowels``, ``beta_code`` ↔ ``betaCode``. Values never change
(``"grave-circumflex"``, ``"iso-843-type-2"``), nor do keys that are not
identifiers, such as the formats of a custom character (``"beta-code"``).
A test checks that every key of the library converts both ways
(tests/test_keys.py).

A key written in camelCase is refused, so that one option has one spelling.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any

from ._errors import OptionError

# The keys of the library: camelCase identifiers.
_CAMEL = re.compile(r"\b[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+\b")
# The keys of the package: snake_case identifiers.
_SNAKE = re.compile(r"[a-z][a-z0-9]*(?:_[a-z0-9]+)+")
# A JSON string in a message: a value received or accepted, left as it is.
_QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"')


def snake(key: str) -> str:
    """``longVowels`` → ``long_vowels``."""
    return re.sub(r"[A-Z]", lambda match: "_" + match.group().lower(), key)


def camel(key: str) -> str:
    """``long_vowels`` → ``longVowels``; any other key is left as it is, for
    the library to refuse if it is not one of its own."""
    if _SNAKE.fullmatch(key) is None:
        return key
    head, *rest = key.split("_")
    return head + "".join(part[0].upper() + part[1:] for part in rest)


def to_js(value: Any, path: str = "") -> Any:
    """Options as the library reads them: keys in camelCase.

    :raises OptionError: for a key written in camelCase.
    """
    if isinstance(value, Mapping):
        converted = {}
        for key, item in value.items():
            if not isinstance(key, str):
                converted[key] = to_js(item, path)
                continue
            where = f"{path}.{key}" if path else key
            if any(char.isupper() for char in key) and _CAMEL.fullmatch(key):
                written = f"{path}.{snake(key)}" if path else snake(key)
                raise OptionError(
                    f"Unknown option: {where}; options are written in "
                    f"snake_case: {written}",
                    path=where,
                    received=None,
                    accepted=(),
                    replacement=written,
                )
            converted[camel(key)] = to_js(item, where)
        return converted
    if isinstance(value, (list, tuple)):
        return [to_js(item, f"{path}[{index}]") for index, item in enumerate(value)]
    return value


def from_js(value: Any) -> Any:
    """Options or metadata as the package gives them: keys in snake_case."""
    if isinstance(value, dict):
        return {
            (snake(key) if isinstance(key, str) else key): from_js(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [from_js(item) for item in value]
    return value


def text(message: str) -> str:
    """The option keys of a message or a path in snake_case, outside the JSON
    strings that quote values."""
    parts = []
    last = 0
    for quoted in _QUOTED.finditer(message):
        parts.append(_CAMEL.sub(lambda m: snake(m.group()), message[last : quoted.start()]))
        parts.append(quoted.group())
        last = quoted.end()
    parts.append(_CAMEL.sub(lambda m: snake(m.group()), message[last:]))
    return "".join(parts)
