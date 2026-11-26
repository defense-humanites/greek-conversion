"""Convert Ancient, Byzantine, and Modern Greek between Greek script, Beta
Code, and Latin script, with standards-based presets and information-loss
diagnostics.

A Python binding of the JavaScript library ``@humanities/greek-conversion``:
the library's own bundle runs in an embedded engine, so the outputs are those
of the JavaScript library, by construction.

>>> from greek_conversion import convert
>>> convert("ἄνδρα μοι ἔννεπε, μοῦσα", "greek", "beta-code")
'a)/ndra moi e)/nnepe, mou=sa'
>>> convert("Νίκος Καζαντζάκης", "greek", "transliteration", preset="ala-lc-modern")
'Nikos Kazantzakēs'

Options are those of the JavaScript library, given as a mapping, as keyword
arguments, or both. Their keys may be written in camelCase, as the reference
documents them (``longVowels``), or in snake_case (``long_vowels``); their
values are unchanged (``"iso-843-type-2"``).

Positions (``offset``, ``length``, spans) are in code points, as Python
indexes strings, and not in the UTF-16 code units of JavaScript.
"""

from __future__ import annotations

import copy
import functools
import weakref
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any, Literal, Optional

from . import _engine
from ._engine import JavaScriptError, engine_name, set_engine
from ._errors import CharacterScopeDiagnostic, CharacterScopeError, OptionError
from ._version import __js_version__, __version__

__all__ = [
    "CONVERSION_OPTION_VALUES",
    "DEFAULT_CONVERSION_OPTIONS",
    "FORMATS",
    "CharacterScopeDiagnostic",
    "CharacterScopeError",
    "ConversionLoss",
    "ConversionResult",
    "ConversionSpan",
    "Converter",
    "ConverterConversionResult",
    "JavaScriptError",
    "OptionError",
    "PreparedOptions",
    "convert",
    "convert_detailed",
    "convert_greek_passages",
    "convert_greek_passages_detailed",
    "convert_many",
    "create_converter",
    "engine_name",
    "get_preset_metadata",
    "get_preset_options",
    "list_preset_metadata",
    "prepare_options",
    "reencode",
    "resolve_conversion_options",
    "set_engine",
]

Format = Literal["greek", "beta-code", "transliteration"]


# --- Options -----------------------------------------------------------------


def _camel(key: str) -> str:
    if "_" not in key:
        return key
    head, *rest = key.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in rest)


def _keys(value: Any) -> Any:
    """The keys of every mapping in camelCase, the values unchanged."""
    if isinstance(value, Mapping):
        return {
            (_camel(key) if isinstance(key, str) else key): _keys(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_keys(item) for item in value]
    return value


class _Handle:
    """An object kept in the engine, released when its Python owner is
    collected."""

    __slots__ = ("__weakref__", "_generation", "_ref")

    def __init__(self, ref: dict[str, int]) -> None:
        self._ref = ref
        self._generation = _engine.generation
        weakref.finalize(self, _Handle._release, ref, self._generation)

    @staticmethod
    def _release(ref: dict[str, int], generation: int) -> None:
        if generation == _engine.generation:
            try:
                _engine.call("release", ref)
            except Exception:
                pass

    def _checked(self) -> dict[str, int]:
        if self._generation != _engine.generation:
            raise RuntimeError(
                f"This {type(self).__name__} belongs to an engine that was "
                "closed; create it again."
            )
        return self._ref


class PreparedOptions(_Handle):
    """Options checked and resolved once, for many conversions: see
    :func:`prepare_options`."""

    __slots__ = ()


def _options(options: Any, keywords: dict[str, Any]) -> Any:
    if isinstance(options, PreparedOptions):
        if keywords:
            raise TypeError("Prepared options cannot be combined with keywords.")
        return options._checked()
    if options is None and not keywords:
        return None
    merged: dict[str, Any] = dict(options) if options is not None else {}
    merged.update(keywords)
    return _keys(merged)


# --- Results -----------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ConversionSpan:
    """Where one source token was read in the input and written in the
    output, in code points."""

    input_start: int
    input_end: int
    output_start: int
    output_end: int


@dataclass(frozen=True, slots=True)
class ConversionLoss:
    """One distinction of a source token that the target does not retain.

    ``offset`` and ``length`` locate the token in the input, in code points.
    ``diacritic`` is set for the codes about a mark, and ``glyph_variant``
    for those about a letter form.
    """

    code: str
    index: int
    offset: int
    length: int
    message: str
    diacritic: Optional[str] = None
    glyph_variant: Optional[str] = None


@dataclass(frozen=True, slots=True)
class ConversionResult:
    """The output of a conversion, whether it lost information, what it lost,
    and where each source token went."""

    output: str
    lossy: bool
    losses: tuple[ConversionLoss, ...]
    spans: tuple[ConversionSpan, ...]


@dataclass(frozen=True, slots=True)
class ConverterConversionResult(ConversionResult):
    """A detailed conversion by a :class:`Converter`, with the diagnostics of
    its repertoire kept apart from the losses."""

    diagnostics: tuple[CharacterScopeDiagnostic, ...] = ()


def _loss(value: dict[str, Any]) -> ConversionLoss:
    return ConversionLoss(
        code=value["code"],
        index=value["index"],
        offset=value["offset"],
        length=value["length"],
        message=value["message"],
        diacritic=value.get("diacritic"),
        glyph_variant=value.get("glyphVariant"),
    )


def _spans(flat: list[int]) -> tuple[ConversionSpan, ...]:
    # The bridge sends four numbers a span, flat.
    return tuple(map(ConversionSpan, flat[0::4], flat[1::4], flat[2::4], flat[3::4]))


def _result(value: dict[str, Any]) -> ConversionResult:
    return ConversionResult(
        output=value["output"],
        lossy=value["lossy"],
        losses=tuple(_loss(loss) for loss in value["losses"]),
        spans=_spans(value["spans"]),
    )


# --- Conversion --------------------------------------------------------------


def convert(
    text: str,
    source: Format,
    target: Format,
    options: Mapping[str, Any] | PreparedOptions | None = None,
    /,
    **keywords: Any,
) -> str:
    """Converts text between Greek, Beta Code, and transliteration.

    Unknown characters are kept. The output is canonical; a reverse
    conversion is not necessarily lossless: use :func:`convert_detailed` when
    that matters.

    :raises TypeError: if ``text`` is not a string.
    :raises ValueError: if a format is unknown; :class:`OptionError` if a
        preset, an option key, or an option value is.
    """
    return _engine.call("convert", text, source, target, _options(options, keywords))


def reencode(
    text: str,
    format: Format,
    options: Mapping[str, Any] | PreparedOptions | None = None,
    /,
    **keywords: Any,
) -> str:
    """Parses and writes text again in the same format: normalizes it, or
    restyles it after other options.

    >>> reencode("ϲοφίαϲ", "greek", greek={"sigma": "standard"})
    'σοφίας'
    """
    return _engine.call("reencode", text, format, _options(options, keywords))


def convert_detailed(
    text: str,
    source: Format,
    target: Format,
    options: Mapping[str, Any] | PreparedOptions | None = None,
    /,
    **keywords: Any,
) -> ConversionResult:
    """Converts text and reports what the target cannot retain, and where each
    source token was read and written.

    >>> result = convert_detailed("Θεσσαλονίκη", "greek", "transliteration",
    ...                           preset="iso-843-type-2")
    >>> result.output, result.lossy, result.losses[0].offset
    ('Thessaloníki', True, 10)
    """
    return _result(
        _engine.call(
            "convertDetailed", text, source, target, _options(options, keywords)
        )
    )


def convert_greek_passages(
    text: str,
    target: Format,
    options: Mapping[str, Any] | PreparedOptions | None = None,
    /,
    **keywords: Any,
) -> str:
    """Converts the Greek passages of a text in another language, and copies
    the rest as it is.

    >>> convert_greek_passages("see λόγος; also ‘ἀπ᾽ αὐτοῦ’", "transliteration")
    'see lógos; also ‘ap’ autoũ’'
    """
    return _engine.call(
        "convertGreekPassages", text, target, _options(options, keywords)
    )


def convert_greek_passages_detailed(
    text: str,
    target: Format,
    options: Mapping[str, Any] | PreparedOptions | None = None,
    /,
    **keywords: Any,
) -> ConversionResult:
    """:func:`convert_greek_passages`, with the losses and spans of
    :func:`convert_detailed`."""
    return _result(
        _engine.call(
            "convertGreekPassagesDetailed", text, target, _options(options, keywords)
        )
    )


def convert_many(
    texts: Iterable[str],
    source: Format,
    target: Format,
    options: Mapping[str, Any] | PreparedOptions | None = None,
    /,
    **keywords: Any,
) -> list[str]:
    """Converts many strings in one call into the engine, as :func:`convert`
    converts each: the fixed cost of a call is paid once. The fastest way to
    convert the lines of a corpus or the cells of a column."""
    return _engine.call(
        "convertMany", list(texts), source, target, _options(options, keywords)
    )


def prepare_options(
    options: Mapping[str, Any] | None = None, /, **keywords: Any
) -> PreparedOptions:
    """Checks and resolves options once, for many conversions. The defaults
    and the presets alone are already resolved once; this serves custom
    options in a loop."""
    return PreparedOptions(
        _engine.call("prepareOptions", _options(options, keywords))
    )


# --- Converters --------------------------------------------------------------


class Converter(_Handle):
    """A converter with its own preset, repertoire, and characters: see
    :func:`create_converter`."""

    __slots__ = ()

    def convert(
        self,
        text: str,
        source: Format,
        target: Format,
        options: Mapping[str, Any] | None = None,
        /,
        **keywords: Any,
    ) -> str:
        """Converts text with this converter's characters and scope.

        :raises CharacterScopeError: if the converter rejects characters
            outside its scope.
        """
        return _engine.call(
            "converterConvert",
            self._checked(),
            text,
            source,
            target,
            _options(options, keywords),
        )

    def convert_detailed(
        self,
        text: str,
        source: Format,
        target: Format,
        options: Mapping[str, Any] | None = None,
        /,
        **keywords: Any,
    ) -> ConverterConversionResult:
        """Converts text and reports the losses and the repertoire's
        diagnostics."""
        value = _engine.call(
            "converterConvertDetailed",
            self._checked(),
            text,
            source,
            target,
            _options(options, keywords),
        )
        base = _result(value)
        return ConverterConversionResult(
            output=base.output,
            lossy=base.lossy,
            losses=base.losses,
            spans=base.spans,
            diagnostics=tuple(
                CharacterScopeDiagnostic._from(item) for item in value["diagnostics"]
            ),
        )


def create_converter(
    configuration: Mapping[str, Any] | None = None, /, **keywords: Any
) -> Converter:
    """Creates a converter that binds a preset, adds characters or spellings,
    or restricts the repertoire.

    >>> strict = create_converter(preset="iso-843-type-2",
    ...                           out_of_scope_behavior="reject")
    """
    return Converter(_engine.call("createConverter", _options(configuration, keywords)))


# --- Presets and options -----------------------------------------------------


def resolve_conversion_options(
    options: Mapping[str, Any] | None = None, /, **keywords: Any
) -> dict[str, Any]:
    """The complete options that the given ones resolve to, as a fresh
    mapping with the library's keys (camelCase)."""
    return _engine.call("resolveConversionOptions", _options(options, keywords))


def get_preset_options(preset: str) -> dict[str, Any]:
    """The options a preset sets, with the library's keys (camelCase)."""
    return _engine.call("getPresetOptions", preset)


def get_preset_metadata(preset: str) -> dict[str, Any]:
    """What a preset follows, its references, and its coverage."""
    return _engine.call("getPresetMetadata", preset)


def list_preset_metadata() -> list[dict[str, Any]]:
    """The metadata of every preset."""
    return _engine.call("listPresetMetadata")


@functools.cache
def _constants() -> dict[str, Any]:
    return _engine.call("constants")


_CONSTANTS = {
    "FORMATS": "formats",
    "DEFAULT_CONVERSION_OPTIONS": "defaultConversionOptions",
    "CONVERSION_OPTION_VALUES": "conversionOptionValues",
}


def __getattr__(name: str) -> Any:
    # Read from the engine on first use, so that importing starts nothing.
    if name in _CONSTANTS:
        value = _constants()[_CONSTANTS[name]]
        return tuple(value) if name == "FORMATS" else copy.deepcopy(value)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
