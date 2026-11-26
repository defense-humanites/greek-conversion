"""The library's errors, as Python exceptions.

JavaScript's ``RangeError`` becomes ``ValueError``, and ``TypeError`` stays
``TypeError``. ``OptionError`` and ``CharacterScopeError`` keep their names
and details, as subclasses of ``ValueError``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ._engine import JavaScriptError


@dataclass(frozen=True, slots=True)
class CharacterScopeDiagnostic:
    """One recognized character excluded by a converter, or lacking a
    mapping in its preset. ``offset`` and ``length`` are in code points of the
    input, as Python indexes strings."""

    code: str
    index: int
    offset: int
    length: int
    character: str
    message: str

    @classmethod
    def _from(cls, value: dict[str, Any]) -> CharacterScopeDiagnostic:
        return cls(
            code=value["code"],
            index=value["index"],
            offset=value["offset"],
            length=value["length"],
            character=value["character"],
            message=value["message"],
        )


class OptionError(ValueError):
    """An option that cannot be resolved: an unknown key or preset, a value
    outside the accepted ones, or two values that cannot be combined.

    ``path`` names the option (``"transliteration.eta"``, ``"preset"``),
    ``received`` is the value given (``None`` for an unknown key),
    ``accepted`` the accepted values or keys, and ``replacement`` the current
    name of a key or value that a release candidate knew, if there is one.
    """

    def __init__(
        self,
        message: str,
        path: str,
        received: Any,
        accepted: tuple[str, ...],
        replacement: str | None = None,
    ) -> None:
        super().__init__(message)
        self.path = path
        self.received = received
        self.accepted = accepted
        self.replacement = replacement


class CharacterScopeError(ValueError):
    """Raised when a converter created with ``out_of_scope_behavior="reject"``
    meets recognized characters outside its scope."""

    def __init__(
        self, message: str, diagnostics: tuple[CharacterScopeDiagnostic, ...]
    ) -> None:
        super().__init__(message)
        self.diagnostics = diagnostics


def from_javascript(error: dict[str, Any]) -> Exception:
    name = error.get("name")
    message = error.get("message", "")
    if name == "OptionError":
        return OptionError(
            message,
            path=error.get("path", ""),
            received=error.get("received"),
            accepted=tuple(error.get("accepted") or ()),
            replacement=error.get("replacement"),
        )
    if name == "CharacterScopeError":
        return CharacterScopeError(
            message,
            tuple(
                CharacterScopeDiagnostic._from(value)
                for value in error.get("diagnostics") or ()
            ),
        )
    kind = error.get("kind")
    if kind == "TypeError":
        return TypeError(message)
    if kind == "RangeError":
        return ValueError(message)
    return JavaScriptError(f"{name}: {message}")
