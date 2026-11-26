// The steps that only options outside the presets take (the accent of καί,
// monotonic accentuation, the stigma read as `στ`) are carried by the options
// that their resolution returns (src/steps.ts). The presets as prepared
// options, made without it, take none, and options resolved by any entry
// point take theirs.
import { test } from "node:test";
import { assert, assertEquals } from "./assertions.ts";
import * as core from "../src/core.ts";
import * as betaCode from "../src/formats/beta_code.ts";
import * as greek from "../src/formats/greek.ts";
import * as transliteration from "../src/formats/transliteration.ts";
import { needsSteps } from "../src/steps.ts";
import { preparedProfiles } from "../src/prepared.ts";
import * as presets from "../src/prepared_presets.ts";
import * as main from "../src/mod.ts";
import { applyGreekOrthography, encode, parse } from "../src/document.ts";

// The sign of καί, which takes the accent of `greek.kaiAccent`, and a
// stigma in a word, read as `στ` under `greek.stigma: "ligature"`.
const TEXT = "Ὁ δὲ ϗ τοῦ λόγου ἐϛὶ ιϛʹ, ἀλλʼ ΑΛΗΘΕΙΑ ἐστί.";
const FORMATS = ["greek", "beta-code", "transliteration"] as const;
const VALUES = {
  greek: greek.greekFormat,
  "beta-code": betaCode.betaCodeFormat,
  transliteration: transliteration.transliterationFormat,
} as const;
const PRESETS = [
  ["ala-lc-ancient", presets.alaLcAncient],
  ["ala-lc-modern", presets.alaLcModern],
  ["bnf-core", presets.bnfCore],
  ["iso-843-type-1", presets.iso843Type1],
  ["iso-843-type-2", presets.iso843Type2],
  ["perseus", presets.perseus],
  ["sbl-general", presets.sblGeneral],
  ["tlg-core", presets.tlgCore],
] as const;
const CASES = [
  { greek: { kaiAccent: "byzantine" } },
  { greek: { kaiAccent: "modern", accentuation: "monotonic" } },
  { greek: { accentuation: "monotonic" } },
  { greek: { stigma: "ligature" } },
  { source: { greek: { stigma: "ligature" } } },
] as const satisfies main.ConversionOptions[];

test("the presets and the defaults of the core take none of the steps", () => {
  assertEquals(
    PRESETS.map(([id]) => id),
    main.listPresetMetadata().map(({ id }) => id),
  );
  for (const [id, prepared] of PRESETS) {
    const profiles = preparedProfiles(prepared)!;
    assertEquals(needsSteps(profiles.writing), false, id);
    assertEquals(needsSteps(profiles.reading), false, id);
    assertEquals(
      FORMATS.map((to) =>
        core.convert(TEXT, greek.greekReader, VALUES[to], prepared)
      ),
      FORMATS.map((to) => main.convert(TEXT, "greek", to, { preset: id })),
      id,
    );
  }
  assertEquals(
    FORMATS.map((to) =>
      core.convertDetailed(TEXT, greek.greekFormat, VALUES[to])
    ),
    FORMATS.map((to) => main.convertDetailed(TEXT, "greek", to)),
  );
});

test("options resolved by every entry point take the steps", () => {
  for (const options of CASES) {
    const prepared = core.prepareOptions(options);
    const label = JSON.stringify(options);
    for (const to of FORMATS) {
      const expected = main.convert(TEXT, "greek", to, options);
      assertEquals(
        core.convert(TEXT, greek.greekReader, VALUES[to], prepared),
        expected,
        label,
      );
      assertEquals(main.convert(TEXT, "greek", to, prepared), expected, label);
      assertEquals(
        main.createConverter().convert(TEXT, "greek", to, options),
        expected,
        label,
      );
      assertEquals(
        core.convertDetailed(TEXT, greek.greekFormat, VALUES[to], prepared),
        main.convertDetailed(TEXT, "greek", to, options),
        label,
      );
      if (!("source" in options)) {
        assertEquals(
          encode(parse(TEXT, "greek"), to, options),
          encode(parse(TEXT, "greek"), to, prepared),
          label,
        );
      }
    }
    // Each case changes the output of one format at least.
    assert(
      FORMATS.some((to) =>
        main.convert(TEXT, "greek", to, options) !==
        main.convert(TEXT, "greek", to)
      ),
      label,
    );
  }
});

test("resolved options given back take the steps", () => {
  // resolveConversionOptions() returns a copy of prepared options, which the
  // caller may give back as options.
  const options = { greek: { accentuation: "monotonic" } } as const;
  const resolved = main.resolveConversionOptions(
    core.prepareOptions(options),
  );
  assertEquals(
    main.convert(TEXT, "greek", "greek", resolved),
    main.convert(TEXT, "greek", "greek", options),
  );
  assertEquals(
    applyGreekOrthography(parse(TEXT, "greek"), core.prepareOptions(options)),
    applyGreekOrthography(parse(TEXT, "greek"), options),
  );
});
