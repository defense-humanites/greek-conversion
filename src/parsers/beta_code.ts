import { BETA_MARKS, BY_BETA } from "../alphabet.ts";
import {
  ARISTERI_KERAIA,
  classifyCoronides,
  DEXIA_KERAIA,
  normalizeInitialDiphthongBreathings,
} from "../context.ts";
import {
  type Diacritic,
  type Document,
  grapheme,
  literal,
  type Token,
} from "../model.ts";
import { parsePunctuation } from "../punctuation.ts";

const QUANTITY_LETTERS = new Set(["alpha", "iota", "upsilon"]);

export function parseBetaCode(input: string): Document {
  const chars = Array.from(input);
  const out: Token[] = [];

  for (let i = 0; i < chars.length;) {
    let upper = false;

    if (chars[i] === "*" && i + 1 < chars.length) {
      upper = true;
      i++;
    }

    const marks = new Set<Diacritic>();
    if (upper) i = consumeMarks(chars, i, marks, true);

    if (chars[i]?.toLowerCase() === "s" && chars[i + 1] === "3") {
      out.push(grapheme("sigma", upper, marks, "lunate-sigma"));
      i += 2;
      continue;
    }

    const punctuation = !upper
      ? parsePunctuation(chars[i], "beta-code")
      : undefined;
    if (punctuation) {
      out.push(literal(punctuation));
      i++;
      continue;
    }

    const additional = additionalCharacter(chars, i);
    if (additional) {
      out.push(grapheme(additional.letter, upper));
      i += additional.length;
      continue;
    }

    if (chars[i] === "#") {
      if (chars[i + 1] === "2" && chars[i + 2] === "2") {
        out.push(literal(ARISTERI_KERAIA));
        i += 3;
      } else {
        out.push(literal(DEXIA_KERAIA));
        i++;
      }
      continue;
    }

    const source = chars[i];
    const letter = source && BY_BETA.get(source.toLowerCase());

    if (!letter) {
      if (upper) out.push(literal("*"));
      if (source) out.push(literal(source));
      i++;
      continue;
    }

    i++;
    i = consumeMarks(chars, i, marks, QUANTITY_LETTERS.has(letter));

    out.push(grapheme(letter, upper, marks));
  }

  normalizeInitialDiphthongBreathings(out);
  classifyCoronides(out);

  return out;
}

function consumeMarks(
  chars: readonly string[],
  start: number,
  marks: Set<Diacritic>,
  acceptsBreve: boolean,
): number {
  let index = start;
  while (index < chars.length) {
    if (chars[index] === "'" && !acceptsBreve) break;
    const mark = BETA_MARKS.get(chars[index]);
    if (!mark) break;
    marks.add(mark);
    index++;
  }
  return index;
}

function additionalCharacter(
  chars: readonly string[],
  start: number,
):
  | { letter: "stigma" | "koppa" | "archaic-koppa" | "sampi"; length: 2 }
  | { letter: "yot"; length: 4 }
  | undefined {
  if (chars[start] !== "#") return undefined;

  if (
    chars[start + 1] === "4" && chars[start + 2] === "0" &&
    chars[start + 3] === "1"
  ) {
    return { letter: "yot", length: 4 };
  }

  switch (chars[start + 1]) {
    case "1":
      return { letter: "koppa", length: 2 };
    case "2":
      if (chars[start + 2] === "2") return undefined;
      return { letter: "stigma", length: 2 };
    case "3":
      return { letter: "archaic-koppa", length: 2 };
    case "5":
      return { letter: "sampi", length: 2 };
    default:
      return undefined;
  }
}
