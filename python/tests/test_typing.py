"""The option types: a type checker accepts what the library accepts, and
reports keys and values it does not know."""

import pytest

api = pytest.importorskip("mypy.api")

ACCEPTED = """
from greek_conversion import ConversionOptions, convert, create_converter
from greek_conversion import resolve_conversion_options

convert("λόγος", "greek", "transliteration", preset="sbl-general")
convert("λόγος", "greek", "transliteration", transliteration={"long_vowels": "omit"})
options: ConversionOptions = {"diacritics": {"all": "remove"}}
convert("λόγος", "greek", "beta-code", options)
convert("λόγος", "greek", "beta-code", resolve_conversion_options(preset="tlg-core"))
create_converter(out_of_scope_behavior="reject", exclude=["digamma"])
"""

REFUSED = [
    'convert("λόγος", "greek", "klingon")',
    'convert("λόγος", "greek", "transliteration", preset="nope")',
    'convert("λόγος", "greek", "transliteration", transliteration={"long_vowels": "x"})',
    'convert("λόγος", "greek", "transliteration", transliteration={"longVowels": "omit"})',
    'create_converter(out_of_scope_behavior="ignore")',
]


def check(source, tmp_path):
    path = tmp_path / "user.py"
    path.write_text(source, encoding="utf-8")
    stdout, _, status = api.run(
        [str(path), "--no-incremental", "--cache-dir", str(tmp_path / "cache")]
    )
    return status, stdout


def test_accepted(tmp_path):
    status, stdout = check(ACCEPTED, tmp_path)
    assert status == 0, stdout


def test_refused(tmp_path):
    source = "from greek_conversion import convert, create_converter\n" + "\n".join(REFUSED)
    status, stdout = check(source, tmp_path)
    assert status == 1
    assert stdout.count("error:") == len(REFUSED), stdout
