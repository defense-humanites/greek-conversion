import {
  convert,
  foldGreekVariants,
  transliterationToBetaCode,
  transliterationToGreek,
} from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";
import { MEDIAL_BETA_SYMBOL, SMOOTH_ROUGH_DOUBLE_RHO } from "./fixtures.ts";

Deno.test("collapses Unicode whitespace on demand", () => {
  const collapse = { orthography: { whitespace: "collapse" } } as const;
  const input = "\u2003\tἄνθρωπος\n\u00A0  λόγος\u2029";

  assertNfcEquals(
    convert(input, "greek", "greek", collapse),
    "ἄνθρωπος λόγος",
  );
  assertNfcEquals(
    convert(input, "greek", "beta-code", collapse),
    "a)/nqrwpos lo/gos",
  );
  assertNfcEquals(
    convert(input, "greek", "transliteration", collapse),
    "ánthrōpos lógos",
  );
  assertNfcEquals(convert(input, "greek", "greek"), input);
});

Deno.test("applies deterministic letter-case policies", () => {
  const source = "ΦΙΛΗΒΟΣ Η ΠΕΡΙ ΗΔΟΝΗΣ";

  assertNfcEquals(
    convert(source, "greek", "transliteration", {
      orthography: { letterCase: "lowercase" },
    }),
    "philēbos ē peri ēdonēs",
  );
  assertNfcEquals(
    convert(source, "greek", "transliteration", {
      orthography: { letterCase: "uppercase" },
    }),
    "PHILĒBOS Ē PERI ĒDONĒS",
  );
  assertNfcEquals(
    convert(source, "greek", "transliteration", {
      orthography: { letterCase: "title" },
    }),
    "Philēbos Ē Peri Ēdonēs",
  );
});

Deno.test("applies letter case to every output format", () => {
  const title = { orthography: { letterCase: "title" } } as const;
  const uppercase = { orthography: { letterCase: "uppercase" } } as const;

  assertNfcEquals(
    convert("φιληβος-η περι", "greek", "greek", title),
    "Φιληβος‐Η Περι",
  );
  assertNfcEquals(
    convert("φιληβος-η περι", "greek", "beta-code", title),
    "*filhbos-*h *peri",
  );
  assertNfcEquals(
    convert("φ χ θ ψ ἁ αἱ ρρ", "greek", "transliteration", uppercase),
    "PH CH TH PS HA HAI RRH",
  );
});

Deno.test("combines uppercase output with ALA-LC digraphs", () => {
  const options = {
    orthography: {
      beta: "v",
      letterCase: "uppercase",
      modernDigraphs: "ala-lc",
    },
  } as const;

  assertNfcEquals(
    convert("μπ ντ γκ αγκά αγκ", "greek", "transliteration", options),
    "B D̲ GK ANKÁ AGK",
  );
});

Deno.test("applies double-rho orthography on demand", () => {
  assertNfcEquals(
    transliterationToGreek("polúrrhizos", SMOOTH_ROUGH_DOUBLE_RHO),
    "πολύῤῥιζος",
  );
  assertNfcEquals(
    transliterationToBetaCode("polúrrhizos", SMOOTH_ROUGH_DOUBLE_RHO),
    "polu/r)r(izos",
  );
  assertNfcEquals(
    convert(
      "πολύρριζος",
      "greek",
      "greek",
      SMOOTH_ROUGH_DOUBLE_RHO,
    ),
    "πολύῤῥιζος",
  );
});

Deno.test("transliterates every rho with one final h per group", () => {
  const systematic = { orthography: { rho: "systematic" } } as const;

  assertNfcEquals(
    convert(
      "ρ αρ ρρ ρρρ ῥ ῤῥ Ρ ΡΡ",
      "greek",
      "transliteration",
      systematic,
    ),
    "rh arh rrh rrrh rh rrh Rh RRh",
  );
  assertNfcEquals(
    convert("rh rrh rrrh Rh RRh", "transliteration", "greek", systematic),
    "ρ ρρ ρρρ Ρ ΡΡ",
  );
  assertNfcEquals(
    convert("ρ αρ ρρ", "greek", "transliteration"),
    "r ar rrh",
  );
});

Deno.test("applies the beta symbol only to medial lowercase beta", () => {
  assertNfcEquals(transliterationToGreek("bárbaros"), "βάρβαρος");
  assertNfcEquals(
    transliterationToGreek("bárbaros", MEDIAL_BETA_SYMBOL),
    "βάρϐαρος",
  );
  assertNfcEquals(
    convert("β β βββ", "greek", "greek", MEDIAL_BETA_SYMBOL),
    "β β βϐϐ",
  );
  assertNfcEquals(
    convert("ΒΒ", "greek", "greek", MEDIAL_BETA_SYMBOL),
    "ΒΒ",
  );
});

Deno.test("applies the requested upsilon transliteration", () => {
  const greek = "υ αυ ευ ηυ ου υι ωυ αϋ";

  assertNfcEquals(
    convert(greek, "greek", "transliteration"),
    "u au eu ēu ou ui ōu aü",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", {
      orthography: { upsilon: "u" },
    }),
    "u au eu ēu ou ui ōu aü",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", {
      orthography: { upsilon: "y" },
    }),
    "y ay ey ēy oy yi ōy aÿ",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", {
      orthography: { upsilon: "y-with-diphthong-u" },
    }),
    "y au eu ēu ou ui ōu aÿ",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", {
      orthography: { upsilon: "y-with-au-eu-ou" },
    }),
    "y au eu ēy ou yi ōy aÿ",
  );
  assertNfcEquals(
    convert("Υ ΑΥ ΕΥ ΟΥ ΗΥ ΑΫ", "greek", "transliteration", {
      orthography: { upsilon: "y-with-au-eu-ou" },
    }),
    "Y AU EU OU ĒY AŸ",
  );
  const threePairs = { orthography: { upsilon: "y-with-au-eu-ou" } } as const;
  const canonical = "au eu ou ēy yi ōy aÿ";
  assertNfcEquals(
    convert(canonical, "transliteration", "transliteration", threePairs),
    canonical,
  );
  assertNfcEquals(
    convert("ay ey oy", "transliteration", "transliteration", threePairs),
    "aÿ eÿ oÿ",
  );
  assertNfcEquals(
    convert("Υ ΑΥ ΑΫ", "greek", "transliteration", {
      orthography: { upsilon: "y-with-diphthong-u" },
    }),
    "Y AU AŸ",
  );
  assertNfcEquals(
    convert("bu by", "transliteration", "greek"),
    "βυ βυ",
  );
});

Deno.test("applies individual transliteration variants", () => {
  const variants = {
    orthography: {
      beta: "v",
      eta: "ī",
      xi: "ks",
      phi: "f",
      chi: "kh",
      upsilon: "y",
    },
  } as const;

  assertNfcEquals(
    convert("βήξφυχή", "greek", "transliteration", variants),
    "vī́ksfykhī́",
  );
  assertNfcEquals(
    convert("vī́ksfykhī́", "transliteration", "greek", variants),
    "βήξφυχή",
  );
  assertNfcEquals(
    convert("ΒΗΞΦΧΥ", "greek", "transliteration", variants),
    "VĪKsFKhY",
  );
  assertNfcEquals(
    convert("βηξφχυ", "greek", "transliteration"),
    "bēxphchu",
  );
  assertNfcEquals(
    convert("βῇ", "greek", "transliteration", variants),
    "vī̧̃",
  );
  assertNfcEquals(
    convert("vī̧̃", "transliteration", "greek", variants),
    "βῇ",
  );
  assertNfcEquals(
    convert("ηω", "greek", "transliteration", {
      orthography: { eta: "ī", longVowels: "circumflex" },
    }),
    "īô",
  );
});

Deno.test("transliterates initial modern Greek digraphs phonetically", () => {
  const modern = {
    orthography: { modernDigraphs: "phonetic" },
  } as const;

  assertNfcEquals(
    convert(
      "μπάλα ντομάτα αμπέλι ένταση",
      "greek",
      "transliteration",
      modern,
    ),
    "bála domáta ampéli éntasē",
  );
  assertNfcEquals(
    convert("Μπάλα, ΝΤΟ. μπ", "greek", "transliteration", modern),
    "Bála, DO. b",
  );
  assertNfcEquals(
    convert("μπάλα ντομάτα", "greek", "transliteration"),
    "mpála ntomáta",
  );
});

Deno.test("recognizes modern b when beta uses v", () => {
  const modern = {
    orthography: { beta: "v", modernDigraphs: "phonetic" },
  } as const;

  assertNfcEquals(
    convert("b v d", "transliteration", "greek", modern),
    "μπ β δ",
  );
  assertNfcEquals(
    convert("μπ β δ", "greek", "transliteration", modern),
    "b v d",
  );
});

Deno.test("applies contextual ALA-LC modern digraphs", () => {
  const alaLc = {
    orthography: {
      beta: "v",
      modernDigraphs: "ala-lc",
    },
  } as const;

  assertNfcEquals(
    convert(
      "μπάλα αμπέλι λαμπ ντομάτα ένταση γκαράζ αγκάλη πάρκιγκ",
      "greek",
      "transliteration",
      alaLc,
    ),
    "bála ampéli lamp d̲omáta éntasē gkaráz ankálē párkigk",
  );
  assertNfcEquals(
    convert("Μπάλα ΝΤΟ Γκα ΓΚ αγκά αγκ", "greek", "transliteration", alaLc),
    "Bála D̲O Gka GK anká agk",
  );
});

Deno.test("recognizes reversible ALA-LC digraph spellings", () => {
  const alaLc = {
    orthography: {
      beta: "v",
      modernDigraphs: "ala-lc",
    },
  } as const;

  assertNfcEquals(
    convert("b v d̲ d gk nk", "transliteration", "greek", alaLc),
    "μπ β ντ δ γκ γκ",
  );
  assertNfcEquals(
    convert("μπ β ντ δ γκ αγκά αγκ", "greek", "transliteration", alaLc),
    "b v d̲ d gk anká agk",
  );
});

Deno.test("applies the requested coronis transliteration", () => {
  assertNfcEquals(convert("κἀγώ", "greek", "transliteration"), "kagṓ");
  assertNfcEquals(
    convert("κἀγώ", "greek", "transliteration", {
      orthography: { coronis: "omit" },
    }),
    "kagṓ",
  );
  assertNfcEquals(
    convert("κἀγώ", "greek", "transliteration", {
      orthography: { coronis: "apostrophe" },
    }),
    "ka\u2019gṓ",
  );
  assertNfcEquals(
    convert("κἀγώ", "greek", "transliteration", {
      orthography: { coronis: "greek" },
    }),
    "ka\u1FBDgṓ",
  );
  assertNfcEquals(
    convert("τοὔνομα", "greek", "transliteration", {
      orthography: { coronis: "apostrophe" },
    }),
    "toú\u2019noma",
  );
  assertNfcEquals(
    convert("τοὔνομα", "greek", "transliteration", {
      orthography: { coronis: "greek" },
    }),
    "toú\u1FBDnoma",
  );
  assertNfcEquals(
    convert("ἄνθρωπος", "greek", "transliteration", {
      orthography: { coronis: "apostrophe" },
    }),
    "ánthrōpos",
  );
});

Deno.test("preserves the provenance of the Greek coronis scalar", () => {
  const greekCoronis = { orthography: { coronis: "greek" } } as const;
  const transliteration = convert(
    "κἀγώ",
    "greek",
    "transliteration",
    greekCoronis,
  );

  assertNfcEquals(transliteration, "ka\u1FBDgṓ");
  assertNfcEquals(
    convert(
      transliteration,
      "transliteration",
      "transliteration",
      greekCoronis,
    ),
    transliteration,
  );
  assertNfcEquals(
    convert(transliteration, "transliteration", "greek", greekCoronis),
    "κἀγώ",
  );
});

Deno.test("does not infer coronis from ordinary apostrophe punctuation", () => {
  assertNfcEquals(
    convert("ka’gṓ", "transliteration", "greek", {
      orthography: { coronis: "greek" },
    }),
    "κα’γώ",
  );
  assertNfcEquals(
    convert("᾽a", "transliteration", "greek", {
      orthography: { coronis: "greek" },
    }),
    "’ἀ",
  );
});

Deno.test("applies lunate sigma orthography on demand", () => {
  const lunate = { orthography: { sigma: "lunate" } } as const;

  assertNfcEquals(convert("σος ΣΟΣ", "greek", "greek"), "σος ΣΟΣ");
  assertNfcEquals(
    convert("σος ΣΟΣ", "greek", "greek", lunate),
    "ϲοϲ ϹΟϹ",
  );
  assertNfcEquals(
    convert("σος ΣΟΣ", "greek", "beta-code", lunate),
    "s3os3 *s3*o*s3",
  );
  assertNfcEquals(
    convert("s3os3 *s3*o*s3", "beta-code", "greek"),
    "σος ΣΟΣ",
  );
  assertNfcEquals(
    convert("s3os3 *s3*o*s3", "beta-code", "greek", lunate),
    "ϲοϲ ϹΟϹ",
  );
  assertNfcEquals(
    convert("sos", "transliteration", "greek", lunate),
    "ϲοϲ",
  );
  assertNfcEquals(convert("ϲοϲ", "greek", "transliteration"), "sos");
});

Deno.test("preserves known lunate sigma glyphs across formats", () => {
  const preserve = { orthography: { sigma: "preserve" } } as const;

  assertNfcEquals(
    convert("σϲς ϹΣ", "greek", "greek", preserve),
    "σϲς ϹΣ",
  );
  assertNfcEquals(
    convert("ss3s *s3*s", "beta-code", "greek", preserve),
    "σϲς ϹΣ",
  );
  assertNfcEquals(
    convert("σϲς ϹΣ", "greek", "beta-code", preserve),
    "ss3s *s3*s",
  );
});

Deno.test("transliterates only provenanced lunate sigma as c", () => {
  const options = {
    orthography: { lunateSigma: "c", sigma: "preserve" },
  } as const;

  assertNfcEquals(
    convert("σϲς ϹΣ", "greek", "transliteration", options),
    "scs CS",
  );
  assertNfcEquals(
    convert("scs CS", "transliteration", "greek", options),
    "σϲς ϹΣ",
  );
  assertNfcEquals(
    convert("sos", "transliteration", "greek", {
      orthography: { lunateSigma: "c", sigma: "lunate" },
    }),
    "ϲοϲ",
  );
  assertNfcEquals(convert("c", "transliteration", "greek"), "c");
});

Deno.test("lunate c does not shadow marked stigma or sampi", () => {
  const options = {
    orthography: {
      longVowels: "circumflex",
      lunateSigma: "c",
      sigma: "preserve",
    },
  } as const;

  assertNfcEquals(convert("ĉŝ c", "transliteration", "greek", options), "ϛϡ ϲ");
  assertNfcEquals(convert("ϛϡ ϲ", "greek", "transliteration", options), "ĉŝ c");
});

Deno.test("selects contextual or uniform medial final sigma", () => {
  const medial = { orthography: { finalSigma: "medial" } } as const;

  assertNfcEquals(convert("σος ΣΟΣ", "greek", "greek"), "σος ΣΟΣ");
  assertNfcEquals(
    convert("σος ΣΟΣ", "greek", "greek", medial),
    "σοσ ΣΟΣ",
  );
  assertNfcEquals(
    convert("ψ βς κς", "greek", "greek", medial),
    "ψ ψ ξ",
  );
  assertNfcEquals(
    convert("σος σʹ", "greek", "greek", {
      orthography: { finalSigma: "medial", sigma: "lunate" },
    }),
    "ϲοϲ σʹ",
  );
});

Deno.test("folds Greek variants while keeping letter case independent", () => {
  assertNfcEquals(
    foldGreekVariants("ϐίος ΛΌΓΟΣ ϲῶμα βʹ σʹ"),
    "βίοσ ΛΌΓΟΣ σῶμα βʹ σʹ",
  );
  assertNfcEquals(
    foldGreekVariants("ϐΊΟΣ ϹῶΜΑ", {
      orthography: { letterCase: "lowercase" },
    }),
    "βίοσ σῶμα",
  );
  assertNfcEquals(
    foldGreekVariants("ϐίος", { removeDiacritics: true }),
    "βιοσ",
  );
});

Deno.test("converts marked alphabetic numerals to decimal on demand", () => {
  const decimal = { orthography: { numerals: "decimal" } } as const;
  const greek = "αʹ ͵βκγʹ ϛʹ ϝʹ ϟʹ ϙʹ ϡʹ σʹ";

  assertNfcEquals(convert(greek, "greek", "greek"), greek);
  for (const format of ["greek", "beta-code", "transliteration"] as const) {
    assertNfcEquals(
      convert(greek, "greek", format, decimal),
      "1 2023 6 6 90 90 900 200",
    );
  }
  assertNfcEquals(
    convert("#22bkg#", "beta-code", "greek", decimal),
    "2023",
  );
  assertNfcEquals(
    convert("͵bkgʹ", "transliteration", "greek", decimal),
    "2023",
  );

  assertNfcEquals(
    convert("αβγ αβʹ ͵ιʹ ͵ααα", "greek", "greek", decimal),
    "αβγ αβʹ ͵ιʹ ͵ααα",
  );
  assertNfcEquals(
    convert("στʹ ͵α ͵αα ͵αβ", "greek", "greek", decimal),
    "6 1000 1001 1002",
  );
});

Deno.test("numeral glyphs override contextual letter styling", () => {
  const styled = {
    orthography: { medialBeta: "symbol", sigma: "lunate" },
  } as const;

  assertNfcEquals(convert("βίος σός", "greek", "greek", styled), "βίοϲ ϲόϲ");
  assertNfcEquals(convert("βʹ σʹ", "greek", "greek", styled), "βʹ σʹ");
  assertNfcEquals(convert("βʹ σʹ", "greek", "beta-code", styled), "b# s#");
});
