"""Writes the API reference of the Python package for the documentation
site, from its signatures and docstrings:
`web/docs/src/content/docs/python/reference/api.md`.

    python python/scripts/api_reference.py            # writes the page
    python python/scripts/api_reference.py --check    # fails if it is stale

The page is committed, so that the site builds without Python; the Python
workflow checks that it follows the code.
"""

from __future__ import annotations

import dataclasses
import inspect
import re
import sys
from pathlib import Path

import greek_conversion as gc

PAGE = (
    Path(__file__).resolve().parents[2]
    / "web/docs/src/content/docs/python/reference/api.md"
)

SECTIONS: list[tuple[str, str, list[str]]] = [
    (
        "Conversion",
        (
            "Each function takes options as a dictionary, as keyword arguments, "
            "or both, or prepared options; each `_many` form takes a list of "
            "strings and gives back a list, in one call into the engine."
        ),
        [
            "convert",
            "convert_many",
            "reencode",
            "reencode_many",
            "convert_detailed",
            "convert_detailed_many",
            "convert_greek_passages",
            "convert_greek_passages_detailed",
        ],
    ),
    (
        "Options and presets",
        "",
        [
            "prepare_options",
            "PreparedOptions",
            "resolve_conversion_options",
            "get_preset_options",
            "get_preset_metadata",
            "list_preset_metadata",
        ],
    ),
    ("Converters", "", ["create_converter", "Converter"]),
    (
        "Results",
        (
            "Frozen dataclasses. Positions are in characters of the strings, "
            "as Python indexes them."
        ),
        [
            "ConversionResult",
            "ConverterConversionResult",
            "ConversionLoss",
            "ConversionSpan",
            "CharacterScopeDiagnostic",
        ],
    ),
    ("Errors", "", ["OptionError", "CharacterScopeError", "JavaScriptError"]),
    ("Engines", "", ["set_engine", "engine_name"]),
]

CONSTANTS = [
    ("FORMATS", "The formats: `('greek', 'beta-code', 'transliteration')`."),
    (
        "DEFAULT_CONVERSION_OPTIONS",
        "The options that apply when none is given, as a dictionary.",
    ),
    (
        "CONVERSION_OPTION_VALUES",
        "The values that each option accepts, by group and key.",
    ),
]

TYPES = [
    "Format",
    "Preset",
    "ConversionOptions",
    "SourceOptions",
    "TransliterationOptions",
    "GreekOptions",
    "BetaCodeOptions",
    "TextOptions",
    "DiacriticsOptions",
    "ConverterConfiguration",
    "CharacterAlias",
    "CustomCharacter",
]


def docstring(obj: object) -> str:
    """A docstring in Markdown: its roles as code, its examples as blocks, its
    fields as a list."""
    text = inspect.getdoc(obj) or ""
    text = re.sub(r":(?:func|meth):`([^`]+)`", r"`\1()`", text)
    text = re.sub(r":(?:class|data|attr):`([^`]+)`", r"`\1`", text)
    text = re.sub(r"``([^`]+)``", r"`\1`", text)
    out: list[str] = []
    lines = text.split("\n")
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.startswith(">>>"):
            block = []
            while index < len(lines) and lines[index].strip():
                block.append(lines[index])
                index += 1
            out += ["```python", *block, "```"]
            continue
        raises = re.match(r":raises (\w+):\s*(.*)", line)
        if raises:
            body = [raises.group(2)]
            index += 1
            while index < len(lines) and lines[index].startswith("    "):
                body.append(lines[index].strip())
                index += 1
            out.append(f"- **Raises** `{raises.group(1)}`: {' '.join(body)}")
            continue
        out.append(line)
        index += 1
    return "\n".join(out).strip()


def annotation(value: object) -> str:
    return value if isinstance(value, str) else inspect.formatannotation(value)


def signature(name: str, function: object, prefix: str = "") -> str:
    parameters = []
    try:
        sig = inspect.signature(function)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return f"{prefix}{name}(…)"
    positional_only = False
    for parameter in sig.parameters.values():
        if parameter.name == "self":
            continue
        if parameter.kind is parameter.POSITIONAL_ONLY:
            positional_only = True
        elif positional_only:
            parameters.append("/")
            positional_only = False
        text = parameter.name
        if parameter.kind is parameter.VAR_KEYWORD:
            text = "**" + text
        if parameter.annotation is not parameter.empty:
            text += f": {annotation(parameter.annotation)}"
        if parameter.default is not parameter.empty:
            text += f" = {parameter.default!r}"
        parameters.append(text)
    if positional_only:
        parameters.append("/")
    returns = (
        ""
        if sig.return_annotation is sig.empty
        else f" -> {annotation(sig.return_annotation)}"
    )
    one_line = f"{prefix}{name}({', '.join(parameters)}){returns}"
    if len(one_line) <= 79:
        return one_line
    body = "".join(f"\n    {parameter}," for parameter in parameters)
    return f"{prefix}{name}({body}\n){returns}"


def entry(name: str) -> list[str]:
    obj = getattr(gc, name)
    out = []
    if inspect.isclass(obj):
        bases = [base.__name__ for base in obj.__bases__ if base is not object]
        heading = f"class {name}" + (f"({', '.join(bases)})" if bases else "")
        out += [f"### `{name}`", "", "```python", heading, "```", ""]
        out += [docstring(obj), ""]
        if dataclasses.is_dataclass(obj):
            out += ["| Field | Type |", "| --- | --- |"]
            for field in dataclasses.fields(obj):
                out.append(f"| `{field.name}` | `{annotation(field.type)}` |")
            out.append("")
        for method_name, method in vars(obj).items():
            if method_name.startswith("_") or not callable(method):
                continue
            out += [
                f"#### `{name}.{method_name}()`",
                "",
                "```python",
                signature(method_name, method, "def "),
                "```",
                "",
                docstring(method),
                "",
            ]
    else:
        out += [
            f"### `{name}()`",
            "",
            "```python",
            signature(name, obj, "def "),
            "```",
            "",
            docstring(obj),
            "",
        ]
    return out


def page() -> str:
    out = [
        "---",
        'title: "API reference"',
        (
            'description: "Every function, class, constant, and type of the '
            'Python package, from its docstrings."'
        ),
        "---",
        "",
        "<!-- Generated by python/scripts/api_reference.py from the docstrings. -->",
        "",
        (
            "Everything is imported from `greek_conversion`. Options are those "
            "of [Conversion options](/python/reference/options/), with their "
            "keys in snake_case."
        ),
        "",
    ]
    for title, intro, names in SECTIONS:
        out += [f"## {title}", ""]
        if intro:
            out += [intro, ""]
        for name in names:
            out += entry(name)
    out += ["## Constants", "", "| Name | Value |", "| --- | --- |"]
    out += [f"| `{name}` | {text} |" for name, text in CONSTANTS]
    out += [
        "",
        "## Types",
        "",
        "Generated from the library's options and values, to annotate code and "
        "let a type checker check options: "
        + ", ".join(f"`{name}`" for name in TYPES)
        + ". `ConversionOptions` and its groups are `TypedDict`s whose values "
        "are `Literal`s; `Format` and `Preset` are `Literal`s.",
        "",
    ]
    return "\n".join(out)


def main() -> int:
    text = page()
    if "--check" in sys.argv:
        current = PAGE.read_text(encoding="utf-8") if PAGE.exists() else ""
        if current != text:
            print(f"{PAGE} is stale: run python python/scripts/api_reference.py")
            return 1
        print("The API reference follows the docstrings.")
        return 0
    PAGE.parent.mkdir(parents=True, exist_ok=True)
    PAGE.write_text(text, encoding="utf-8")
    print(f"Wrote {PAGE}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
