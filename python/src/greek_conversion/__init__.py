"""Convert Ancient, Byzantine, and Modern Greek between Greek script, Beta
Code, and Latin script, with atomic options composed into standards-based
presets, and information-loss diagnostics.

The Python distribution of the TypeScript library
``@humanities/greek-conversion``, whose bundle it runs in an embedded
JavaScript engine: its results are the library's.

>>> from greek_conversion import convert
>>> convert("ἄνδρα μοι ἔννεπε, μοῦσα", "greek", "beta-code")
'a)/ndra moi e)/nnepe, mou=sa'
>>> convert("Νίκος Καζαντζάκης", "greek", "transliteration", preset="ala-lc-modern")
'Nikos Kazantzakēs'

Options are those of the JavaScript library, given as a mapping, as keyword
arguments, or both. Their keys are written in snake_case (``long_vowels``,
``beta_code``) where the library writes them in camelCase (``longVowels``,
``betaCode``), and so are the keys of the options and metadata returned, and
the option names of errors. Their values are unchanged
(``"iso-843-type-2"``).

Positions (``offset``, ``length``, spans) are in code points, as Python
indexes strings, and not in the UTF-16 code units of JavaScript.
"""

from __future__ import annotations

import copy
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from . import _engine
from ._engine import Handle, JavaScriptError, engine_name, set_engine
from ._errors import CharacterScopeDiagnostic, CharacterScopeError, OptionError
from ._keys import constants, from_js, to_js

try:
    from ._options import (
        BetaCodeOptions,
        CharacterAlias,
        ConversionOptions,
        ConverterConfiguration,
        CustomCharacter,
        DiacriticsOptions,
        Format,
        GreekOptions,
        Preset,
        SourceOptions,
        TextOptions,
        TransliterationOptions,
    )
    from ._version import __js_version__ as __js_version__
    from ._version import __version__ as __version__
except ImportError as error:  # pragma: no cover
    raise ImportError(
        "greek_conversion is not built: run `node python/scripts/build_bundle.mjs` "
        "at the root of the repository, after `npm ci`, or install the package "
        "from PyPI."
    ) from error

if TYPE_CHECKING:
    from typing_extensions import Unpack

__all__ = [
    "CONVERSION_OPTION_VALUES",
    "DEFAULT_CONVERSION_OPTIONS",
    "FORMATS",
    "BetaCodeOptions",
    "CharacterAlias",
    "CharacterScopeDiagnostic",
    "CharacterScopeError",
    "ConversionLoss",
    "ConversionOptions",
    "ConversionResult",
    "ConversionSpan",
    "Converter",
    "ConverterConfiguration",
    "ConverterConversionResult",
    "CustomCharacter",
    "DiacriticsOptions",
    "Format",
    "GreekOptions",
    "JavaScriptError",
    "OptionError",
    "PreparedOptions",
    "Preset",
    "SourceOptions",
    "TextOptions",
    "TransliterationOptions",
    "convert",
    "convert_detailed",
    "convert_detailed_many",
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
    "reencode_many",
    "resolve_conversion_options",
    "set_engine",
]

# --- Options -----------------------------------------------------------------


class PreparedOptions(Handle):
    """Options checked and resolved once, for many conversions: see
    :func:`prepare_options`. They can be pickled, copied, and used in
    another process or after :func:`set_engine`."""

    __slots__ = ()
    _operation = "prepareOptions"



def _options(
    options: Mapping[str, Any] | PreparedOptions | None, keywords: Mapping[str, Any]
) -> tuple[dict[str, Any] | None, PreparedOptions | None]:
    """The options of a call, as the library reads them, and the prepared
    options given instead, if any."""
    if isinstance(options, PreparedOptions):
        if keywords:
            raise TypeError("Prepared options cannot be combined with keywords.")
        return None, options
    if options is not None and not isinstance(options, Mapping):
        raise TypeError(
            f"Expected options to be a mapping, received {type(options).__name__}."
        )
    if options is None and not keywords:
        return None, None
    merged: dict[str, Any] = dict(options) if options is not None else {}
    merged.update(keywords)
    return to_js(merged), None


def _call(operation: str, *args: Any, options: Any, keywords: Mapping[str, Any]) -> Any:
    mapping, prepared = _options(options, keywords)
    return _engine.call(operation, *args, mapping, handles=(prepared,))


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
    diacritic: str | None = None
    glyph_variant: str | None = None


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
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> str:
    """Converts text between Greek, Beta Code, and transliteration.

    Unknown characters are kept. The output is canonical; a reverse
    conversion is not necessarily lossless: use :func:`convert_detailed` when
    that matters.

    >>> convert("ἄνδρα μοι ἔννεπε", "greek", "beta-code")
    'a)/ndra moi e)/nnepe'
    >>> convert("a)/ndra", "beta-code", "greek")
    'ἄνδρα'
    >>> convert("Θεσσαλονίκη", "greek", "transliteration", preset="iso-843-type-2")
    'Thessaloníki'
    >>> convert("ψυχή", "greek", "transliteration",
    ...         transliteration={"chi": "kh", "upsilon": "u"})
    'psukhḗ'

    :raises TypeError: if ``text`` is not a string.
    :raises ValueError: if a format is unknown; :class:`OptionError` if a
        preset, an option key, or an option value is.
    """
    return _call("convert", text, source, target, options=options, keywords=keywords)


def reencode(
    text: str,
    format: Format,
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> str:
    """Parses and writes text again in the same format: normalizes it, or
    restyles it after other options.

    >>> reencode("ϲοφίαϲ", "greek", greek={"sigma": "standard"})
    'σοφίας'
    """
    return _call("reencode", text, format, options=options, keywords=keywords)


def convert_detailed(
    text: str,
    source: Format,
    target: Format,
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> ConversionResult:
    """Converts text and reports what the target cannot retain, and where each
    source token was read and written.

    >>> result = convert_detailed("Θεσσαλονίκη", "greek", "transliteration",
    ...                           preset="iso-843-type-2")
    >>> result.output, result.lossy, result.losses[0].offset
    ('Thessaloníki', True, 10)
    """
    return _result(
        _call("convertDetailed", text, source, target, options=options, keywords=keywords)
    )


def convert_greek_passages(
    text: str,
    target: Format,
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> str:
    """Converts the Greek passages of a text in another language, and copies
    the rest as it is.

    >>> convert_greek_passages("see λόγος; also ‘ἀπ᾽ αὐτοῦ’", "transliteration")
    'see lógos; also ‘ap’ autoũ’'
    """
    return _call("convertGreekPassages", text, target, options=options, keywords=keywords)


def convert_greek_passages_detailed(
    text: str,
    target: Format,
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> ConversionResult:
    """:func:`convert_greek_passages`, with the losses and spans of
    :func:`convert_detailed`.

    >>> result = convert_greek_passages_detailed("voir ϐίος", "beta-code")
    >>> result.output, [loss.code for loss in result.losses]
    ('voir bi/os', ['removed-glyph-variant'])
    """
    return _result(
        _call(
            "convertGreekPassagesDetailed", text, target, options=options, keywords=keywords
        )
    )


def convert_many(
    texts: Iterable[str],
    source: Format,
    target: Format,
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> list[str]:
    """Converts many strings in one call into the engine, as :func:`convert`
    converts each: the fixed cost of a call is paid once. The fastest way to
    convert the lines of a corpus or the cells of a column.

    >>> convert_many(["λόγος", "ψυχή"], "greek", "beta-code", preset="tlg-core")
    ['LO/GOS', 'YUXH/']

    :raises TypeError: if ``texts`` is a string rather than strings.
    """
    return _call(
        "convertMany", _texts(texts), source, target, options=options, keywords=keywords
    )


def reencode_many(
    texts: Iterable[str],
    format: Format,
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> list[str]:
    """Parses and writes many strings again, in one call into the engine, as
    :func:`reencode` does each.

    >>> reencode_many(["ϲοφίαϲ", "λόγοϲ"], "greek", greek={"sigma": "standard"})
    ['σοφίας', 'λόγος']

    :raises TypeError: if ``texts`` is a string rather than strings.
    """
    return _call("reencodeMany", _texts(texts), format, options=options, keywords=keywords)


def convert_detailed_many(
    texts: Iterable[str],
    source: Format,
    target: Format,
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> list[ConversionResult]:
    """Converts many strings in one call into the engine, and reports for each
    what :func:`convert_detailed` reports: the losses, and where each token
    went. The positions of each result are in its own string.

    >>> results = convert_detailed_many(["Θεσσαλονίκη", "Αθήνα"], "greek",
    ...                                 "transliteration", preset="iso-843-type-2")
    >>> [(result.output, result.lossy) for result in results]
    [('Thessaloníki', True), ('Athína', True)]

    :raises TypeError: if ``texts`` is a string rather than strings.
    """
    values = _call(
        "convertDetailedMany", _texts(texts), source, target, options=options, keywords=keywords
    )
    return [_result(value) for value in values]


def _texts(texts: Iterable[str]) -> list[str]:
    if isinstance(texts, str):
        raise TypeError("Expected strings to convert, received one string.")
    return list(texts)


def prepare_options(
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> PreparedOptions:
    """Checks and resolves options once, for many conversions. The defaults
    and the presets alone are already resolved once; this serves custom
    options in a loop. Prepared options are returned as they are.

    >>> scheme = prepare_options(transliteration={"phi": "f", "chi": "kh"})
    >>> [convert(word, "greek", "transliteration", scheme)
    ...  for word in ["φύσις", "χάος"]]
    ['fýsis', 'kháos']

    :raises OptionError: as :func:`convert` would, at once.
    """
    mapping, prepared = _options(options, keywords)
    if prepared is not None:
        return prepared
    created = PreparedOptions(mapping or {})
    _engine.make(created)  # Checked now, rather than at the first conversion.
    return created


# --- Converters --------------------------------------------------------------


class Converter(Handle):
    """A converter with its own preset, repertoire, and characters: see
    :func:`create_converter`. It can be pickled, copied, and used in another
    process or after :func:`set_engine`."""

    __slots__ = ()
    _operation = "createConverter"

    def _arguments(self) -> tuple[Any, ...]:
        return (self._payload, None)

    def _call(
        self, operation: str, args: tuple[Any, ...], options: Any, keywords: Mapping[str, Any]
    ) -> Any:
        mapping, prepared = _options(options, keywords)
        return _engine.call(operation, *args, mapping, handles=(prepared, self))

    def convert(
        self,
        text: str,
        source: Format,
        target: Format,
        options: ConversionOptions | None = None,
        /,
        **keywords: Unpack[ConversionOptions],
    ) -> str:
        """Converts text with this converter's characters and scope. Options
        add to its preset; prepared options are refused, as by the library.

        >>> sbl = create_converter(preset="sbl-general")
        >>> sbl.convert("ἐν ἀρχῇ", "greek", "transliteration")
        'en archē'

        :raises CharacterScopeError: if the converter rejects characters
            outside its scope.
        """
        return self._call(
            "converterConvert", (text, source, target), options, keywords
        )

    def convert_detailed(
        self,
        text: str,
        source: Format,
        target: Format,
        options: ConversionOptions | None = None,
        /,
        **keywords: Unpack[ConversionOptions],
    ) -> ConverterConversionResult:
        """Converts text and reports the losses and the repertoire's
        diagnostics.

        >>> no_digamma = create_converter(exclude=["digamma"])
        >>> result = no_digamma.convert_detailed("ϝάναξ", "greek", "transliteration")
        >>> result.output, result.diagnostics[0].character
        ('ϝánax', 'digamma')
        """
        value = self._call(
            "converterConvertDetailed", (text, source, target), options, keywords
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
    configuration: ConverterConfiguration | None = None,
    /,
    **keywords: Unpack[ConverterConfiguration],
) -> Converter:
    """Creates a converter that binds a preset, adds characters or spellings,
    or restricts the repertoire.

    >>> strict = create_converter(exclude=["digamma"], out_of_scope_behavior="reject")
    >>> strict.convert("ϝάναξ", "greek", "transliteration")
    Traceback (most recent call last):
    ...
    greek_conversion._errors.CharacterScopeError: Conversion rejected: 1 out-of-scope character.

    :raises OptionError: or :class:`TypeError`, for an invalid configuration,
        at once.
    """
    mapping, prepared = _options(configuration, keywords)
    if prepared is not None:
        # Refused by the library, with its message.
        _engine.call("createConverter", None, handles=(prepared,))
    created = Converter(mapping or {})
    _engine.make(created)
    return created


# --- Presets and options -----------------------------------------------------


def resolve_conversion_options(
    options: ConversionOptions | PreparedOptions | None = None,
    /,
    **keywords: Unpack[ConversionOptions],
) -> ConversionOptions:
    """The complete options that the given ones resolve to, as a fresh
    mapping, which can be given back as options.

    >>> resolve_conversion_options(preset="sbl-general")["transliteration"]["long_vowels"]
    'macron'
    """
    return from_js(
        _call("resolveConversionOptions", options=options, keywords=keywords)
    )


def get_preset_options(preset: Preset) -> ConversionOptions:
    """The options a preset sets.

    >>> get_preset_options("tlg-core")
    {'beta_code': {'case': 'uppercase', 'yot': '#401'}}
    """
    return from_js(_engine.call("getPresetOptions", preset))


def get_preset_metadata(preset: Preset) -> dict[str, Any]:
    """What a preset follows, its references, and its coverage.

    >>> get_preset_metadata("iso-843-type-2")["name"]
    'ISO 843:1997 — Type 2 (transcription)'
    """
    return from_js(_engine.call("getPresetMetadata", preset))


def list_preset_metadata() -> list[dict[str, Any]]:
    """The metadata of every preset.

    >>> [metadata["id"] for metadata in list_preset_metadata()][:3]
    ['ala-lc-ancient', 'ala-lc-modern', 'bnf-ancient']
    """
    return from_js(_engine.call("listPresetMetadata"))


_CONSTANTS = {
    "FORMATS": "formats",
    "DEFAULT_CONVERSION_OPTIONS": "defaultConversionOptions",
    "CONVERSION_OPTION_VALUES": "conversionOptionValues",
}

if TYPE_CHECKING:
    FORMATS: tuple[Format, ...]
    DEFAULT_CONVERSION_OPTIONS: dict[str, Any]
    CONVERSION_OPTION_VALUES: dict[str, dict[str, list[str]]]


def __getattr__(name: str) -> Any:
    # Read from the engine on first use, so that importing starts nothing.
    if name in _CONSTANTS:
        value = constants()[_CONSTANTS[name]]
        if name == "FORMATS":
            return tuple(value)
        return copy.deepcopy(from_js(value))
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    return sorted(set(globals()) | set(_CONSTANTS))
