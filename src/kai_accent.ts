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
 * §181 D): the personal pronouns, with their poetic and dialect forms (`μοι`,
 * `οὑ`, `σφισι`, `μιν`, `σφε`); the indefinite pronoun and adverbs, with the
 * Ionic forms in `κ` (`τις`, `πῃ`, `κως`); the present of `εἰμί` and `φημί`
 * but for the second person singular; and the particles (`γε`, `τε`, `κε`,
 * `ῥα`). `οἱ`, which is also the article, is left out: the grave is right
 * before the article, far more frequent in prose.
 *
 * The forms are written in Beta Code without accents, as {@link formOf}
 * spells a word: Greek text in a string costs six bytes a letter in a bundle
 * that a minifier writes in ASCII, esbuild's default. The list is turned
 * into a set on first use.
 */
const ENCLITIC_FORMS = "mou moi me sou soi se ou( e( sfisi sfisin meu seu " +
  "seo e(o eu( e(qen min nin sfi sfin sfe sfea sfeas sfewn sfwe sfwi sfwin " +
  "sfwi+ sfwi+n tis ti tinos tini tina tines tinwn tisi tisin tinas tine " +
  "tinoin tou tw| teo teu tew| pou ph ph| poi poqen poqi pote pw pws kou " +
  "kh| kh koqen kote kws ei)mi e)sti e)stin e)smen e)ste ei)si ei)sin " +
  "e)ston e)ssi ei)men fhmi fhsi fhsin famen fate fasi fasin faton ge te " +
  "toi per nu nun ke ken ka qhn r(a";

/**
 * The elided enclitics, in Beta Code: `με` or `μοι`, `σε`, `τε` (`θ’` before
 * a rough breathing), `γε`, `ῥα`, `κε` (`χ’`), `σφε`, `ποτε`, `κοτε`. `σ’`
 * may also be the emphatic `σέ`, which is rarer; `τιν’`, as often
 * interrogative as not, keeps the grave.
 */
const ELIDED_ENCLITICS: ReadonlySet<string> = new Set(
  "m s t q g r( k x sf pot poq kot".split(" "),
);

/**
 * The marks that only polytonic Greek writes, as `greek.acute: "system"`
 * counts them: a breathing, a grave, a circumflex, an iota subscript, a
 * coronis, or a quantity mark. A text with none may be monotonic or
 * unaccented, and no accent of `καί` is written in it.
 */
const POLYTONIC_MARKS: readonly Diacritic[] = [
  "smooth",
  "rough",
  "grave",
  "circumflex",
  "iota-subscript",
  "coronis",
  "macron",
  "breve",
];

let enclitics: ReadonlySet<string> | undefined;

/** The enclitics, by {@link formOf}. */
function encliticForms(): ReadonlySet<string> {
  return enclitics ??= new Set(ENCLITIC_FORMS.split(" "));
}

/**
 * Writes the accent of `καί` for each `ϗ` that the output writes as letters,
 * as `options.greek.kaiAccent` says: in transliteration, and where Greek and
 * Beta Code write no sign. A sign that has an accent keeps it; a sign among
 * capitals, or in a text with no polytonic mark ({@link POLYTONIC_MARKS}),
 * gets none.
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
      POLYTONIC_MARKS.some((mark) => token.diacritics.has(mark))
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
 * A word as {@link encliticForms} and {@link ELIDED_ENCLITICS} have it: its
 * letters in small Beta Code, each with its breathing, diaeresis, and iota
 * subscript, and without accents (`οὑ` is `ou(`, `πῃ` is `ph|`).
 */
function formOf(document: Document, start: number, end: number): string {
  let form = "";
  for (let index = start; index < end; index++) {
    const token = document[index];
    if (token.kind !== "grapheme") continue;
    const marks = token.diacritics;
    form += ALPHABET[token.letter].beta;
    if (marks.has("smooth")) form += ")";
    else if (marks.has("rough")) form += "(";
    if (marks.has("diaeresis")) form += "+";
    if (marks.has("iota-subscript")) form += "|";
  }
  return form;
}
