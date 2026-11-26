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

const MONOTONIC_HIATUS =
  "Monotonic accentuation writes a diaeresis where a breathing or an iota subscript it removes showed a hiatus (αϋτμή), as words in capitals do.";
const NUMERAL_NEXT_TO_DIGIT =
  "A numeral next to a digit is not written as a number, which would make one number with the digit and read back otherwise.";

const EDGE_NU_KAPPA =
  "Under ALA-LC, nk at the beginning or end of a word reads back as νκ, since γκ is written gk there.";
const MARKED_RHO =
  'ISO 843, ALA-LC Modern, and BnF write the h of rho only for a rough breathing that Greek writes (rho: "marked"): Πύρρος gives Pýrros.';

const KEPT_LETTER =
  "A converter reports a letter kept out of its scope whose output does not convert back to its spelling in the source (unrepresented-literal).";

/** The changes of output that are meant. */
export const MEANT: readonly MeantChange[] = [
  {
    input: /^(?:Ἀίδης|ἀίδηλος|ἀυτμή|a\)i\/dhlos|a\)utmh\/)/u,
    label: "monotonic, decomposed",
    reason: MONOTONIC_HIATUS,
  },
  { input: "7/0r#('in1b", reason: NUMERAL_NEXT_TO_DIGIT },
  { input: "cóRt\u03421 ăk0ōʹ", reason: NUMERAL_NEXT_TO_DIGIT },
  { input: "[\u03BD\u0300\u03D7\u0306漢", reason: EDGE_NU_KAPPA },
  { input: "chhoi\u00A0nkhē", reason: EDGE_NU_KAPPA },
  {
    input: /ρρ|ῤρ|rr/iu,
    label:
      /^(?:ala-lc-modern|bnf-core|iso-843-type-[12]|source|random 9: \{"preset":"ala-lc-modern")/u,
    reason: MARKED_RHO,
  },
  ...["greek", "transliteration"].map((to) => ({
    input: "e)#2i\\ #2# i#2#",
    label: /^(?:iso-843-type-1|ala-lc-ancient)$/u,
    call: `createConverter().convertDetailed(beta-code → ${to})`,
    reason: KEPT_LETTER,
  })),
  {
    input: "ec̄ì ec̄ʹ",
    label: "ala-lc-ancient",
    call: "createConverter().convertDetailed(transliteration → beta-code)",
    reason: KEPT_LETTER,
  },
];
