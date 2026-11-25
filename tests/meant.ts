/**
 * The changes of output that are meant (`differential.ts`), until the
 * reference moves to the release that makes them, when the list is emptied
 * (RELEASING.md). `scripts/differential_changes.ts` lists the inputs that
 * change and that the list does not have yet.
 */

import type { ConversionOptions } from "../src/mod.ts";

/**
 * A change of output that is meant: the input, and, where it changes under
 * some options or calls only, their label and the call, as a difference
 * reports them, with the reason. Without an input, the change is meant for
 * every input under its options and call: the change of an option, which
 * every input it acts on shows. A pattern stands for the inputs or the
 * labels it matches. The change of a default goes with `undoneBy`, the
 * options that restore the reference: a difference is meant only where the
 * current tree, given them, gives the reference again. The comparison then
 * checks only what those options keep: an error in the code that they turn
 * off, which the default runs, is for that code's own tests to find.
 */
export interface MeantChange {
  input?: string | RegExp;
  label?: string | RegExp;
  call?: string;
  undoneBy?: ConversionOptions;
  reason: string;
}

const TEXT_LETTER =
  "A letter that a reader keeps as text, of another script or one it does not read, is a letter of its word";
const TEXT_LETTER_MONOTONIC =
  `${TEXT_LETTER}: monotonic accentuation keeps the accent of a word whose syllables it cannot count, as it does for a kept letter.`;
const TEXT_LETTER_TITLE =
  `${TEXT_LETTER}: title case leaves the letters after it small.`;
const TEXT_LETTER_SIGMA = `${TEXT_LETTER}: a sigma before it is medial.`;
const TEXT_LETTER_ISO =
  `${TEXT_LETTER}: ISO 843 type 2 writes a beta before it as \`mp\`, inside the word.`;
const TEXT_LETTER_CORONIS =
  `${TEXT_LETTER}: Greek output reads a smooth breathing after a letter that transliteration does not read as a coronis, which convertDetailed() reports lost, though the output converts back to the source.`;

/** The labels of the options that write in title case, and of ISO 843 type 2. */
const TITLE_CASE = /"letterCase":"title"/;
const ISO_TYPE_2 = /^(?:iso-843-type-2|source)$/;
const DETAILED_TO_GREEK = "convertDetailed(transliteration → greek)";

/** The changes of output that are meant. */
export const MEANT: readonly MeantChange[] = [
  {
    input: "ότaω7Σ",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  { input: "ότaω7Σ", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: "[ν\u0300ϗ\u0306漢",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "ΔΡ᾿[Ξ\u037E῍a\u0300ήάθΞϰ",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "ΔΡ᾿[Ξ\u037E῍a\u0300ήάθΞϰ",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "\u0301Θ\u0307ȣϜϳ’ἄ\u0300漢Πξ1\u0323",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "\u0301Θ\u0307ȣϜϳ’ἄ\u0300漢Πξ1\u0323",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  { input: "ϙ΅ρυΛάψι漢ο;'»Ϟ", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: "ΑΕ\u0313a\u0306ϵ37;ίή",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "\u2009ʹ\u0374Ω1漢ΕΤ\u0306",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "a0ϝϠάω\u2009·漢σ΅\u20DD\u0305\u0323",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "λφ3,ῥ\u20DDβ\u2009漢\u20DDσ",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  { input: "ϡ'ζaΘ", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: "\u0305īS M9h\u0304ēó",
    call: DETAILED_TO_GREEK,
    reason: TEXT_LETTER_CORONIS,
  },
  {
    input: "\u0305īS M9h\u0304ēó",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "cóRt\u03421 ăk0ōʹ",
    call: DETAILED_TO_GREEK,
    reason: TEXT_LETTER_CORONIS,
  },
  {
    input: "cóRt\u03421 ăk0ōʹ",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  { input: "cóRt\u03421 ăk0ōʹ", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: "῾(vo῾āʹK\u0342\u0304w",
    call: DETAILED_TO_GREEK,
    reason: TEXT_LETTER_CORONIS,
  },
  {
    input: "῾(vo῾āʹK\u0342\u0304w",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  { input: "í1èì\u0305sc\u0314Ro’", reason: TEXT_LETTER_SIGMA },
  {
    input: "uHǖü\u0308ûD\u0308fu᾿h0M",
    call: DETAILED_TO_GREEK,
    reason: TEXT_LETTER_CORONIS,
  },
  {
    input: "uHǖü\u0308ûD\u0308fu᾿h0M",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "0ca3ī·ô\u0300xă\u0342",
    call: DETAILED_TO_GREEK,
    reason: TEXT_LETTER_CORONIS,
  },
  {
    input: "0ca3ī·ô\u0300xă\u0342",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "Rhōmaĩoi, «OUKOŨN» — aḯdios? 1 xʹ ʹ á abc 漢字 \u200C",
    label: ISO_TYPE_2,
    reason: TEXT_LETTER_ISO,
  },
  { input: "x\u0308ddùŌôf,'ìbf", label: ISO_TYPE_2, reason: TEXT_LETTER_ISO },
  {
    input: "x\u0308ddùŌôf,'ìbf",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "tOfī\u0342",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  { input: "tOfī\u0342", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: "káhD\u0305Tû\u0345e\u0304",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "káhD\u0305Tû\u0345e\u0304",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "ùc",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "û\u0303phwh\u0305",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "\u0314Yï\u0303RP\u0305efǘ᾿",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  {
    input: "\u0314Yï\u0303RP\u0305efǘ᾿",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "\u0314û᾿\u0304xvPí",
    label: "monotonic, decomposed",
    reason: TEXT_LETTER_MONOTONIC,
  },
  { input: "\u0314û᾿\u0304xvPí", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: "\u0304clxüǘ᾿\u0342ō5úòz",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  {
    input: "vwûdDāü\u0301v\u0303d",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  { input: "hpo\u0306ï\u0313Uû", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: ";hfhw\u0314\u0300pX756ĭT",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  { input: "9vū-c\u0345", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
  {
    input: "\u0303.9cĭi7\u0313àē,àA",
    label: TITLE_CASE,
    reason: TEXT_LETTER_TITLE,
  },
  { input: "TT'XĒ’.Xvn\u0345ă", label: TITLE_CASE, reason: TEXT_LETTER_TITLE },
];
