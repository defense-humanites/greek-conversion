"""The spelling of option keys: snake_case in Python, camelCase in the
library, converted mechanically both ways."""

import re

import pytest

import greek_conversion as gc
from greek_conversion._keys import constants, snake, text


def camel(key):
    head, *rest = key.split("_")
    return head + "".join(part.capitalize() for part in rest)


def keys_of(value, found):
    if isinstance(value, dict):
        for key, item in value.items():
            found.add(key)
            keys_of(item, found)
    elif isinstance(value, list):
        for item in value:
            keys_of(item, found)
    return found


def test_every_key_of_the_library_converts_both_ways():
    keys = constants()["keys"]
    assert {"longVowels", "betaCode", "outOfScopeBehavior", "repertoire"} <= set(keys)
    for key in keys:
        # A new key with an acronym or a digit (`useTLG`, `iso843`) would
        # have no unambiguous snake_case: it fails here first.
        assert re.fullmatch(r"[a-z]+(?:[A-Z][a-z]+)*", key), key
        assert camel(snake(key)) == key, key
    assert len({snake(key) for key in keys}) == len(set(keys))


def test_camel_case_keys_are_refused():
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration",
                   transliteration={"longVowels": "omit"})
    assert caught.value.path == "transliteration.longVowels"
    assert caught.value.replacement == "transliteration.long_vowels"
    assert "snake_case" in str(caught.value)
    with pytest.raises(gc.OptionError):
        gc.reencode("a", "beta-code", betaCode={"case": "uppercase"})
    with pytest.raises(gc.OptionError) as caught:
        gc.create_converter(outOfScopeBehavior="reject")
    assert caught.value.replacement == "out_of_scope_behavior"


def test_other_keys_reach_the_library_unchanged():
    for key in ("long__vowels", "_long_vowels", "LongVowels", "fooBar"):
        with pytest.raises(gc.OptionError) as caught:
            gc.convert("λόγος", "greek", "transliteration", transliteration={key: "omit"})
        assert caught.value.path == f"transliteration.{key}"
        message = str(caught.value)
        assert message.startswith(f"Unknown conversion option: transliteration.{key}")
        # The library's suggestion, in Python's spelling.
        if key != "fooBar":
            assert message.endswith("did you mean transliteration.long_vowels?")


def test_unknown_keys_are_reported_in_snake_case():
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration",
                   transliteration={"long_vowel": "omit"})
    assert caught.value.path == "transliteration.long_vowel"
    assert caught.value.received is None
    assert "long_vowels" in caught.value.accepted
    assert "nasal_gamma" in caught.value.accepted
    assert str(caught.value) == "Unknown conversion option: transliteration.long_vowel"


def test_combined_values_are_reported_in_snake_case():
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("ἦ", "greek", "transliteration",
                   transliteration={"long_vowels": "circumflex",
                                    "circumflex_accent": "circumflex"})
    message = str(caught.value)
    assert "transliteration.long_vowels" in message
    assert "transliteration.circumflex_accent" in message
    assert "Vowels" not in message


def test_values_are_never_rewritten():
    assert (
        text('Invalid value for transliteration.longVowels: "muPi"; expected "omit".')
        == 'Invalid value for transliteration.long_vowels: "muPi"; expected "omit".'
    )
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration", preset="myPreset")
    assert "myPreset" in str(caught.value)
    assert caught.value.received == "myPreset"
    with pytest.raises(ValueError) as caught:
        gc.convert("λόγος", "greek", "greekScript")
    assert "greekScript" in str(caught.value)


def test_returned_options_can_be_given_back():
    resolved = gc.resolve_conversion_options(preset="iso-843-type-2")
    assert "beta_code" in resolved
    assert all(not any(c.isupper() for c in key) for key in keys_of(resolved, set()))
    word = "Θεσσαλονίκη"
    assert gc.convert(word, "greek", "transliteration", resolved) == gc.convert(
        word, "greek", "transliteration", preset="iso-843-type-2"
    )
    assert "long_vowels" in gc.DEFAULT_CONVERSION_OPTIONS["transliteration"]
    assert "letter_case" in gc.CONVERSION_OPTION_VALUES["text"]
    metadata = gc.get_preset_metadata("iso-843-type-2")
    assert "out_of_scope_behavior" in metadata


def test_converter_configuration():
    converter = gc.create_converter(
        out_of_scope_behavior="preserve",
        characters=[{
            "id": "test-letter",
            "override": True,
            "forms": {
                "greek": {"lowercase": "ϳ", "uppercase": "Ϳ"},
                "beta-code": {"lowercase": "j"},
                "transliteration": {"lowercase": "j"},
            },
        }],
    )
    assert converter.convert("ϳα", "greek", "beta-code") == "ja"
