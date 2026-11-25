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

const LONE_CAPITAL =
  "A capital on its own takes the case of the nearest words on either side, as a word of one letter does in Greek: it is written in full capitals only among words in capitals.";

/** The changes of output that are meant. */
export const MEANT: readonly MeantChange[] = [
  { input: "῎῾Ρ", reason: LONE_CAPITAL },
  { input: "ἀίδηλος ῎῾Ρ", reason: LONE_CAPITAL },
  { input: "῎῾Ρ\nὦ", reason: LONE_CAPITAL },
  { input: "ἀροἱ, ἐγώ, ῎῾Ρ", reason: LONE_CAPITAL },
  { input: ";έ0\u0300\u0374\n\u0304Χ", reason: LONE_CAPITAL },
  { input: "\u0342\u0307\u00A0ί\nΧ\u0305—", reason: LONE_CAPITAL },
  { input: "Ρ\u2009Χξ\u20DD—Ψ", reason: LONE_CAPITAL },
  { input: "Ϝϝη͵φ'Φ\u0342", reason: LONE_CAPITAL },
  { input: "a)i/dhlos %35*(r", reason: LONE_CAPITAL },
  { input: "%35*(r\nw)=", reason: LONE_CAPITAL },
  { input: "%35*(r", reason: LONE_CAPITAL },
  { input: "a)roi(, e)gw/, %35*(r", reason: LONE_CAPITAL },
  { input: "aídēlos ῎RH", reason: LONE_CAPITAL },
  { input: "῎RH\nō\u0303", reason: LONE_CAPITAL },
  { input: "῎RH", reason: LONE_CAPITAL },
  { input: "arhoi, egṓ, ῎RH", reason: LONE_CAPITAL },
];
