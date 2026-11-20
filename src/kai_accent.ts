/**
 * The accent of `καί` written where the καί symbol `ϗ`, which marks none, is
 * written as letters (`greek.kaiAccent`). The accent is written, not read:
 * the document keeps the sign unaccented, so that Greek under
 * `greek.ligatures: "preserve"` and Beta Code still write the sign.
 *
 * @module
 */
import { ALPHABET } from "./alphabet.ts";
import { isElisionMark } from "./context.ts";
import { writtenLigature } from "./ligatures.ts";
import {
  type Diacritic,
  type Document,
  type Format,
  ownedGrapheme,
  type Token,
  withDiacritic,
} from "./model.ts";
import type { ResolvedConversionOptions } from "./options.ts";

/** The accents, any of which the sign may already have. */
export const ACCENTS: readonly Diacritic[] = ["acute", "grave", "circumflex"];

/**
 * The signs before which modern editions keep the acute of an oxytone
 * (Smyth §154 a): the comma, the period, the raised dot, the question mark,
 * the colon, and the exclamation mark. Brackets, dashes, and quotation marks
 * do not end a phrase: `καὶ [`, `καὶ —`.
 */
const PAUSES: ReadonlySet<string> = new Set([
  ",",
  ".",
  "·",
  "·",
  ";",
  ";",
  ":",
  "!",
  "?",
]);

/**
 * The enclitics, as written without accent after an oxytone (Smyth §181,
 * §181 D): the personal pronouns, with their poetic and dialect forms; the
 * indefinite pronoun and adverbs, with the Ionic forms in `κ`; the present of
 * `εἰμί` and `φημί` but for the second person singular; and the particles.
 * `οἱ`, which is also the article, is left out: the grave is right before
 * the article, far more frequent in prose. The list is read on first use.
 */
const ENCLITIC_FORMS = "μου μοι με σου σοι σε οὑ ἑ σφισι σφισιν μευ σευ " +
  "σεο ἑο εὑ ἑθεν μιν νιν σφι σφιν σφε σφεα σφεας σφεων σφωε σφωι σφωιν σφωϊ " +
  "σφωϊν τις τι τινος τινι τινα τινες τινων τισι τισιν τινας τινε τινοιν " +
  "του τῳ τεο τευ τεῳ που πη πῃ ποι ποθεν ποθι ποτε πω πως κου κῃ κη " +
  "κοθεν κοτε κως εἰμι ἐστι ἐστιν ἐσμεν ἐστε εἰσι εἰσιν ἐστον ἐσσι εἰμεν " +
  "φημι φησι φησιν φαμεν φατε φασι φασιν φατον γε τε τοι περ νυ νυν κε κεν " +
  "κα θην ῥα";

/**
 * The elided enclitics: `με` or `μοι`, `σε`, `τε` (`θ’` before a rough
 * breathing), `γε`, `ῥα`, `κε` (`χ’`), `σφε`, `ποτε`, `κοτε`. `σ’` may also
 * be the emphatic `σέ`, which is rarer; `τιν’`, as often interrogative as
 * not, keeps the grave.
 */
const ELIDED_ENCLITICS: ReadonlySet<string> = new Set([
  "μ",
  "σ",
  "τ",
  "θ",
  "γ",
  "ῥ",
  "κ",
  "χ",
  "σφ",
  "ποτ",
  "ποθ",
  "κοτ",
]);

let enclitics: ReadonlySet<string> | undefined;

/** The enclitics, by {@link formOf}. */
function encliticForms(): ReadonlySet<string> {
  return enclitics ??= new Set(
    ENCLITIC_FORMS.replaceAll("ς", "σ").normalize("NFC").split(" "),
  );
}

/**
 * Writes the accent of `καί` for each `ϗ` that the output writes as letters,
 * as `options.greek.kaiAccent` says: in transliteration, and where Greek and
 * Beta Code write no sign. A sign that has an accent keeps it; a sign among
 * capitals, or in a text with no grave and no circumflex, gets none.
 */
export function supplyKaiAccents(
  document: Document,
  format: Format,
  options: ResolvedConversionOptions,
): Document {
  const convention = options.greek.kaiAccent;
  if (convention === "none") return document;
  let out: Token[] | undefined;
  let polytonic: boolean | undefined;
  for (let index = 0; index + 2 < document.length; index++) {
    const kappa = document[index];
    const alpha = document[index + 1];
    const iota = document[index + 2];
    if (
      kappa.kind !== "grapheme" || kappa.glyphVariant !== "kai-symbol" ||
      alpha.kind !== "grapheme" || alpha.letter !== "alpha" ||
      iota.kind !== "grapheme" || iota.letter !== "iota" ||
      iota.uppercase || ACCENTS.some((mark) => iota.diacritics.has(mark))
    ) continue;
    if (
      format !== "transliteration" &&
      writtenLigature(document, index, options) !== undefined
    ) continue;
    polytonic ??= document.some((token) =>
      token.kind === "grapheme" &&
      (token.diacritics.has("grave") || token.diacritics.has("circumflex"))
    );
    if (!polytonic) return document;
    const accent = convention === "byzantine"
      ? "grave"
      : modernAccent(document, index + 3);
    out ??= [...document];
    out[index + 2] = ownedGrapheme(
      iota.letter,
      iota.uppercase,
      withDiacritic(iota.diacritics, accent),
      iota.glyphVariant,
    );
    index += 2;
  }
  return out ?? document;
}

/**
 * The accent of `καί` before what follows `from`, as modern editions write
 * it: the acute at the end of the text, before a pause, and before an
 * enclitic without accent or an elided one; the grave before any other word
 * or sign, a line break being no pause.
 */
function modernAccent(document: Document, from: number): "acute" | "grave" {
  let start = from;
  while (isSpace(document[start])) start++;
  const next = document[start];
  if (next === undefined) return "acute";
  if (next.kind === "literal") {
    return PAUSES.has(next.value) ? "acute" : "grave";
  }
  let end = start + 1;
  while (document[end]?.kind === "grapheme") end++;
  const form = formOf(document, start, end);
  if (isElisionMark(document[end])) {
    return ELIDED_ENCLITICS.has(form) ? "acute" : "grave";
  }
  for (let index = start; index < end; index++) {
    const token = document[index];
    if (
      token.kind === "grapheme" &&
      ACCENTS.some((mark) => token.diacritics.has(mark))
    ) return "grave";
  }
  return encliticForms().has(form) ? "acute" : "grave";
}

function isSpace(token: Token | undefined): boolean {
  return token?.kind === "literal" && /^\s+$/u.test(token.value);
}

/**
 * The small letters of a word with their breathings, diaeresis, and iota
 * subscript, in NFC, and with `σ` for every sigma: the key of
 * {@link encliticForms} and {@link ELIDED_ENCLITICS}.
 */
function formOf(document: Document, start: number, end: number): string {
  let form = "";
  for (let index = start; index < end; index++) {
    const token = document[index];
    if (token.kind !== "grapheme") continue;
    const marks = token.diacritics;
    form += ALPHABET[token.letter].greek;
    if (marks.has("smooth")) form += "̓";
    else if (marks.has("rough")) form += "̔";
    if (marks.has("diaeresis")) form += "̈";
    if (marks.has("iota-subscript")) form += "ͅ";
  }
  return form.normalize("NFC");
}
