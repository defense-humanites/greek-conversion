import { ALPHABET, GREEK_MARKS } from "../alphabet.ts";
import {
  breathingTarget,
  followsNasalGamma,
  hasQuantity,
  isAuEuOuAt,
  isDiphthongAt,
  isGreekNumeralContext,
  isVowel,
} from "../context.ts";
import {
  type Diacritic,
  type Document,
  grapheme,
  type Letter,
  literal,
  type Token,
} from "../model.ts";
import type { ConversionOptions } from "../options.ts";
import { parsePunctuation } from "../punctuation.ts";
import { Trie } from "../trie.ts";

const CANONICAL_ENTRIES = [
  ...Object.entries(ALPHABET)
    .filter(([letter]) =>
      letter !== "eta" &&
      letter !== "omega" &&
      letter !== "stigma" &&
      letter !== "sampi" &&
      letter !== "archaic-koppa"
    )
    .map(([letter, forms]) =>
      [
        forms.tr.normalize("NFD").replaceAll(/\p{M}/gu, ""),
        letter as Letter,
      ] as const
    ),
  ["y", "upsilon"] as const,
] as const;

const TRIE = new Trie<Letter>(CANONICAL_ENTRIES);

export function parseTransliteration(
  input: string,
  options: ConversionOptions = {},
): Document {
  const chars = prioritizeEtaMacron(
    Array.from(input.normalize("NFD")),
    options,
  );
  const out: Token[] = [];
  const trie = transliterationTrie(options);
  const contextualY = new Set<number>();

  for (let i = 0; i < chars.length;) {
    let rough = false;
    let roughUppercase = false;

    if (
      (options.orthography?.modernDigraphs === "phonetic" ||
        options.orthography?.modernDigraphs === "ala-lc") &&
      options.orthography.beta === "v" &&
      chars[i].toLowerCase() === "b"
    ) {
      const uppercase = chars[i] !== chars[i].toLowerCase();
      out.push(grapheme("mu", uppercase), grapheme("pi"));
      i++;
      continue;
    }

    if (
      options.orthography?.modernDigraphs === "ala-lc" &&
      chars[i].toLowerCase() === "d" &&
      chars[i + 1] === "\u0332"
    ) {
      const uppercase = chars[i] !== chars[i].toLowerCase();
      out.push(grapheme("nu", uppercase), grapheme("tau"));
      i += 2;
      continue;
    }

    if (
      chars[i].toLowerCase() === "h" && startsVowel(chars, i + 1, trie)
    ) {
      rough = true;
      roughUppercase = chars[i] !== chars[i].toLowerCase();
      i++;
    }

    const archaic = markedArchaicLetter(chars, i);
    const ordinary = trie.longest(chars, i);
    const lunateSigma = !archaic && !ordinary &&
      options.orthography?.lunateSigma === "c" &&
      chars[i]?.toLowerCase() === "c";
    const match = archaic ?? ordinary ??
      (lunateSigma ? { value: "sigma" as const, length: 1 } : undefined);

    if (!match) {
      if (chars[i] === "\u1FBD") {
        const previous = out.at(-1);
        if (
          previous?.kind === "grapheme" && isVowel(previous.letter)
        ) {
          previous.diacritics.add("coronis");
          i++;
          continue;
        }
      }

      if (rough) out.push(literal(roughUppercase ? "H" : "h"));
      out.push(
        literal(parsePunctuation(chars[i], "transliteration") ?? chars[i]),
      );
      i++;
      continue;
    }

    const source = chars[i];

    i += match.length;

    if (match.value === "rho" && chars[i]?.toLowerCase() === "h") {
      const previous = out.at(-1);

      if (
        options.orthography?.rho !== "systematic" &&
        (previous?.kind !== "grapheme" || previous.letter !== "rho")
      ) {
        rough = true;
      }

      i++;
    }

    const marks = new Set<Diacritic>();
    let structuralCircumflex = false;

    if (rough) marks.add("rough");

    while (i < chars.length) {
      if (
        chars[i] === "\u0302" &&
        (match.value === "epsilon" || match.value === "omicron") &&
        !(marks.has("macron") &&
          options.orthography?.circumflexAccent === "circumflex")
      ) {
        structuralCircumflex = true;
        i++;
        continue;
      }
      const mark = trMark(chars[i]);
      if (!mark) break;
      marks.add(mark);
      i++;
    }

    const letter = resolveLongVowel(
      match.value,
      marks,
      structuralCircumflex,
    );

    if (
      letter === "upsilon" &&
      (options.orthography?.upsilon === "y-with-diphthong-u" ||
        options.orthography?.upsilon === "y-with-au-eu-ou") &&
      source.toLowerCase() === "y"
    ) {
      const candidate = grapheme(letter, false, marks);
      const document = [...out, candidate];
      const wouldRenderU = options.orthography.upsilon === "y-with-au-eu-ou"
        ? isAuEuOuAt(document, out.length - 1)
        : isDiphthongAt(document, out.length - 1);
      if (wouldRenderU) {
        marks.add("diaeresis");
      }
    }

    if (
      letter === "iota" &&
      options.orthography?.upsilon === "y-with-diphthong-u" &&
      contextualY.has(out.length - 1)
    ) {
      const candidate = grapheme(letter, false, marks);
      if (isDiphthongAt([...out, candidate], out.length - 1)) {
        marks.add("diaeresis");
      }
    }

    if (
      letter === "upsilon" &&
      options.orthography?.upsilon === "y-with-diphthong-u" &&
      source.toLowerCase() === "y"
    ) {
      contextualY.add(out.length);
    }

    out.push(grapheme(
      letter,
      roughUppercase || source !== source.toLowerCase(),
      marks,
      lunateSigma ? "lunate-sigma" : undefined,
    ));
  }

  if (options.orthography?.nasalGamma !== "literal") {
    inferNasalGammas(out);
  }
  inferInitialBreathings(out, options);

  return out;
}

function prioritizeEtaMacron(
  input: string[],
  options: ConversionOptions,
): string[] {
  if (options.orthography?.eta !== "ī") return input;

  const chars = [...input];
  for (let start = 0; start < chars.length; start++) {
    if (chars[start].toLowerCase() !== "i") continue;

    let end = start + 1;
    while (end < chars.length && /^\p{M}$/u.test(chars[end])) end++;

    const macron = chars.indexOf("\u0304", start + 1);
    if (macron >= end || macron === -1) continue;
    chars.splice(macron, 1);
    chars.splice(start + 1, 0, "\u0304");
    start = end - 1;
  }

  return chars;
}

function transliterationTrie(options: ConversionOptions): Trie<Letter> {
  const variants: Array<readonly [string, Letter]> = [];
  const orthography = options.orthography;

  if (orthography?.beta === "v") variants.push(["v", "beta"]);
  if (orthography?.eta === "ī") variants.push(["i\u0304", "eta"]);
  if (orthography?.xi === "ks") variants.push(["ks", "xi"]);
  if (orthography?.phi === "f") variants.push(["f", "phi"]);
  if (orthography?.chi === "kh") variants.push(["kh", "chi"]);

  return variants.length === 0
    ? TRIE
    : new Trie<Letter>([...CANONICAL_ENTRIES, ...variants]);
}

function markedArchaicLetter(
  chars: readonly string[],
  start: number,
):
  | { value: "archaic-koppa"; length: 2 }
  | { value: "stigma" | "sampi"; length: number }
  | undefined {
  if (
    chars[start]?.toLowerCase() === "k" &&
    chars[start + 1] === "\u0323"
  ) {
    return { value: "archaic-koppa", length: 2 };
  }

  const firstMark = chars[start + 1];
  if (firstMark !== "\u0304" && firstMark !== "\u0302") return undefined;

  const secondMark = chars[start + 2];
  const length = secondMark !== firstMark &&
      (secondMark === "\u0304" || secondMark === "\u0302")
    ? 3
    : 2;

  switch (chars[start].toLowerCase()) {
    case "c":
      return { value: "stigma", length };
    case "s":
      return { value: "sampi", length };
    default:
      return undefined;
  }
}

function inferNasalGammas(tokens: Token[]) {
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (
      token.kind === "grapheme" &&
      token.letter === "nu" &&
      next.kind === "grapheme" &&
      followsNasalGamma(next.letter)
    ) {
      token.letter = "gamma";
    }
  }
}

function startsVowel(
  chars: readonly string[],
  start: number,
  trie: Trie<Letter>,
) {
  const match = trie.longest(chars, start);
  return !!match && isVowel(match.value);
}

function trMark(char: string): Diacritic | undefined {
  if (char === "\u0303" || char === "\u0342") return "circumflex";
  if (char === "\u0327") return "iota-subscript";
  return GREEK_MARKS.get(char);
}

function resolveLongVowel(
  letter: Letter,
  marks: Set<Diacritic>,
  structuralCircumflex: boolean,
): Letter {
  if (!marks.has("macron") && !structuralCircumflex) return letter;

  if (letter === "epsilon") {
    if (!structuralCircumflex) marks.delete("macron");
    return "eta";
  }

  if (letter === "omicron") {
    if (!structuralCircumflex) marks.delete("macron");
    return "omega";
  }

  return letter;
}

function inferInitialBreathings(tokens: Token[], options: ConversionOptions) {
  let wordStart = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === "literal") {
      wordStart = true;
      continue;
    }

    if (!wordStart) continue;
    wordStart = false;

    if (!isVowel(token.letter) || isGreekNumeralContext(tokens, i)) continue;

    const target = tokens[breathingTarget(tokens, i)];
    if (target.kind !== "grapheme") continue;

    if (token.diacritics.has("rough") && target !== token) {
      token.diacritics.delete("rough");
      target.diacritics.add("rough");
    } else if (
      options.orthography?.smoothBreathing !== "greek" &&
      options.orthography?.smoothBreathing !== "apostrophe" &&
      !target.diacritics.has("rough") &&
      !hasQuantity(token) &&
      !hasQuantity(target)
    ) {
      target.diacritics.add("smooth");
    }
  }
}
