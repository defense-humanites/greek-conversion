import threading

import pytest

import greek_conversion as gc


@pytest.fixture(autouse=True, params=gc._engine.ENGINES)
def engine(request):
    gc.set_engine(request.param)
    yield request.param
    gc.set_engine(None)


def test_engine(engine):
    assert gc.engine_name() == engine


def test_readme_examples():
    assert gc.convert("ἄνδρα μοι ἔννεπε, μοῦσα", "greek", "beta-code") == (
        "a)/ndra moi e)/nnepe, mou=sa"
    )
    assert gc.convert("τȣ̃ θεȣ̃", "greek", "transliteration") == "toũ theoũ"
    assert (
        gc.convert("Νίκος Καζαντζάκης", "greek", "transliteration", preset="ala-lc-modern")
        == "Nikos Kazantzakēs"
    )
    assert gc.reencode("ἔτει ͵αωκαʹ", "greek", text={"numerals": "decimal"}) == "ἔτει 1821"
    assert (
        gc.reencode("a)/ndra moi e)/nnepe, mou=sa", "beta-code", preset="tlg-core")
        == "A)/NDRA MOI E)/NNEPE, MOU=SA"
    )


def test_options_mapping_and_keywords():
    expected = "aristoteles"
    options = {
        "diacritics": {"all": "remove"},
        "transliteration": {"long_vowels": "omit"},
        "text": {"letter_case": "lowercase"},
    }
    assert gc.convert("Ἀριστοτέλης", "greek", "transliteration", options) == expected
    assert (
        gc.convert("Ἀριστοτέλης", "greek", "transliteration", **options) == expected
    )
    # Keywords override the mapping's keys.
    assert (
        gc.convert("φ", "greek", "transliteration", {"transliteration": {"phi": "ph"}},
                   transliteration={"phi": "f"})
        == "f"
    )
    assert gc.reencode("a)/ndra", "beta-code", beta_code={"case": "uppercase"}) == "A)/NDRA"


def test_convert_detailed():
    result = gc.convert_detailed(
        "Θεσσαλονίκη", "greek", "transliteration", preset="iso-843-type-2"
    )
    assert result.output == "Thessaloníki"
    assert result.lossy
    assert result.losses[0].offset == 10
    assert result.losses[0].message == "The target representation does not retain eta."
    assert len(result.spans) == len("Θεσσαλονίκη")

    verse = gc.convert_detailed("ἐν ἀρχῇ ἦν", "greek", "transliteration", preset="sbl-general")
    assert verse.output == "en archē ēn"
    assert len(verse.losses) == 6
    assert verse.losses[0].diacritic == "smooth"


def test_positions_are_code_points():
    # U+10140, a Greek acrophonic numeral, is outside the BMP: two UTF-16
    # code units, one Python character.
    text = "\U00010140 ἄνδρα"
    result = gc.convert_detailed(text, "greek", "beta-code")
    for span in result.spans:
        assert 0 <= span.input_start <= span.input_end <= len(text)
        assert 0 <= span.output_start <= span.output_end <= len(result.output)
    letters = [text[s.input_start : s.input_end] for s in result.spans]
    assert letters[0] == "\U00010140"
    assert "".join(letters).replace(" ", "") == text.replace(" ", "")
    written = [result.output[s.output_start : s.output_end] for s in result.spans]
    assert written[0] == "\U00010140"
    assert written[2] == "a)/"


def test_loss_offsets_after_astral_character():
    text = "\U0001F600 ϐίος"
    result = gc.convert_detailed(text, "greek", "beta-code")
    loss = next(l for l in result.losses if l.code == "removed-glyph-variant")
    assert text[loss.offset : loss.offset + loss.length] == "ϐ"
    assert loss.glyph_variant == "beta-symbol"


def test_greek_passages():
    assert (
        gc.convert_greek_passages("see λόγος; also ‘ἀπ᾽ αὐτοῦ’", "transliteration")
        == "see lógos; also ‘ap’ autoũ’"
    )
    result = gc.convert_greek_passages_detailed("voir ϐίος ;", "beta-code")
    assert result.output == "voir bi/os ;"
    assert [loss.code for loss in result.losses] == ["removed-glyph-variant"]


def test_convert_many():
    words = ["λόγος", "ψυχή", "ἄνθρωπος", ""]
    assert gc.convert_many(words, "greek", "beta-code") == [
        gc.convert(word, "greek", "beta-code") for word in words
    ]
    assert gc.convert_many(iter(words), "greek", "transliteration", preset="sbl-general") == [
        gc.convert(word, "greek", "transliteration", preset="sbl-general") for word in words
    ]


def test_prepared_options():
    prepared = gc.prepare_options(transliteration={"phi": "f"})
    assert gc.convert("φίλος", "greek", "transliteration", prepared) == "fílos"
    assert gc.convert_many(["φως"], "greek", "transliteration", prepared) == ["fōs"]
    assert gc.prepare_options(prepared) is prepared
    assert gc.resolve_conversion_options(prepared)["transliteration"]["phi"] == "f"
    with pytest.raises(TypeError):
        gc.convert("φ", "greek", "transliteration", prepared, preset="sbl-general")
    # Checked at once.
    with pytest.raises(gc.OptionError):
        gc.prepare_options(transliteration={"phi": "x"})


def test_handles_follow_the_engine(engine):
    prepared = gc.prepare_options(preset="iso-843-type-2")
    converter = gc.create_converter(preset="iso-843-type-2")
    gc.set_engine("quickjs" if engine == "v8" else "v8")
    assert gc.convert("Θεσσαλονίκη", "greek", "transliteration", prepared) == "Thessaloníki"
    assert converter.convert("Θεσσαλονίκη", "greek", "transliteration") == "Thessaloníki"


def test_handles_copy_and_pickle():
    import copy
    import pickle

    prepared = gc.prepare_options(preset="iso-843-type-2")
    converter = gc.create_converter(preset="iso-843-type-2")
    assert copy.copy(prepared) is prepared
    assert copy.deepcopy(converter) is converter
    word = "Θεσσαλονίκη"
    restored = pickle.loads(pickle.dumps(prepared))
    assert gc.convert(word, "greek", "transliteration", restored) == "Thessaloníki"
    restored = pickle.loads(pickle.dumps(converter))
    assert restored.convert(word, "greek", "transliteration") == "Thessaloníki"


def test_prepared_options_in_a_converter_are_refused():
    prepared = gc.prepare_options(preset="sbl-general")
    converter = gc.create_converter()
    with pytest.raises(TypeError):
        converter.convert("λόγος", "greek", "transliteration", prepared)
    with pytest.raises(TypeError):
        gc.create_converter(prepared)


def test_a_mapping_is_never_a_handle():
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration", {"__handle": 1})
    assert caught.value.path == "__handle"


def test_errors():
    with pytest.raises(TypeError):
        gc.convert(42, "greek", "beta-code")
    with pytest.raises(TypeError):
        gc.convert("λόγος", "greek", "beta-code", [("preset", "tlg-core")])
    with pytest.raises(TypeError):
        gc.convert_many("λόγος", "greek", "beta-code")
    with pytest.raises(ValueError, match="JSON"):
        gc.convert("λόγος", "greek", "beta-code", text={"numerals": float("nan")})
    with pytest.raises(ValueError, match="Unknown format"):
        gc.convert("λόγος", "greek", "klingon")
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration", preset="nope")
    assert isinstance(caught.value, ValueError)
    assert caught.value.path == "preset"
    assert caught.value.received == "nope"
    assert "sbl-general" in caught.value.accepted
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration", transliteration={"eta": "x"})
    assert caught.value.path == "transliteration.eta"
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration", transliteration={"long_vowels": "x"})
    assert caught.value.path == "transliteration.long_vowels"
    assert str(caught.value).startswith("Invalid value for transliteration.long_vowels:")
    assert "grave-circumflex" in caught.value.accepted
    with pytest.raises(gc.OptionError) as caught:
        gc.convert("λόγος", "greek", "transliteration", nonsense=True)
    assert caught.value.received is None


def test_converter():
    converter = gc.create_converter(preset="sbl-general")
    assert converter.convert("ἐν ἀρχῇ", "greek", "transliteration") == "en archē"
    result = converter.convert_detailed("ἐν ἀρχῇ", "greek", "transliteration")
    assert isinstance(result, gc.ConverterConversionResult)
    assert result.output == "en archē"
    assert result.diagnostics == ()


def test_converter_scope_error_positions():
    strict = gc.create_converter(exclude=["digamma"], out_of_scope_behavior="reject")
    text = "\U0001F600 ϝάναξ"
    with pytest.raises(gc.CharacterScopeError) as caught:
        strict.convert(text, "greek", "transliteration")
    (diagnostic,) = caught.value.diagnostics
    assert diagnostic.character == "digamma"
    assert text[diagnostic.offset : diagnostic.offset + diagnostic.length] == "ϝ"

    lenient = gc.create_converter(exclude=["digamma"])
    result = lenient.convert_detailed(text, "greek", "transliteration")
    (diagnostic,) = result.diagnostics
    assert text[diagnostic.offset : diagnostic.offset + diagnostic.length] == "ϝ"


def test_presets_and_constants():
    assert gc.FORMATS == ("greek", "beta-code", "transliteration")
    assert gc.__js_version__.startswith("1.0.0")
    names = [meta["id"] for meta in gc.list_preset_metadata()]
    assert "iso-843-type-2" in names
    assert gc.get_preset_metadata("sbl-general")["id"] == "sbl-general"
    assert "transliteration" in gc.get_preset_options("sbl-general")
    resolved = gc.resolve_conversion_options(preset="sbl-general")
    assert set(resolved) >= {"greek", "transliteration", "diacritics", "beta_code"}
    assert "long_vowels" in resolved["transliteration"]
    assert gc.get_preset_metadata("iso-843-type-2")["out_of_scope_behavior"]
    defaults = gc.DEFAULT_CONVERSION_OPTIONS
    defaults["greek"] = None  # a copy: the module's value is unchanged
    assert gc.DEFAULT_CONVERSION_OPTIONS["greek"] is not None
    assert "transliteration" in gc.CONVERSION_OPTION_VALUES


def test_lone_surrogates_are_kept():
    text = "λ\ud800ος \udc00ἄ"
    assert gc.convert(text, "greek", "beta-code") == "l\ud800os \udc00a)/"
    result = gc.convert_detailed(text, "greek", "beta-code")
    assert result.output == "l\ud800os \udc00a)/"
    assert [text[s.input_start : s.input_end] for s in result.spans][:2] == ["λ", "\ud800"]


def test_threads():
    words = ["λόγος", "ψυχή", "ἄνθρωπος", "θεός"] * 50
    expected = [gc.convert(word, "greek", "beta-code") for word in words]
    results = [None] * 8

    def work(slot):
        results[slot] = [gc.convert(word, "greek", "beta-code") for word in words]

    threads = [threading.Thread(target=work, args=(slot,)) for slot in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert all(result == expected for result in results)
