import { BY_GREEK, GREEK_MARKS } from "../alphabet.ts";
import { greekLower } from "../case.ts";
import { classifyCoronides } from "../context.ts";
import {
  type Diacritic,
  type Document,
  literal,
  ownedGrapheme,
  type Token,
} from "../model.ts";
import { parsePunctuation } from "../punctuation.ts";

export function parseGreek(input: string): Document {
  const chars = Array.from(input.normalize("NFD"));
  const out: Token[] = [];

  for (let i = 0; i < chars.length;) {
    const source = chars[i];
    const lower = greekLower(source);
    const letter = BY_GREEK.get(lower === "ς" ? "σ" : lower);

    if (!letter) {
      out.push(literal(parsePunctuation(source, "greek") ?? source));
      i++;
      continue;
    }

    const marks = new Set<Diacritic>();

    i++;

    while (i < chars.length) {
      const mark = GREEK_MARKS.get(chars[i]);
      if (!mark) break;
      marks.add(mark);
      i++;
    }

    out.push(ownedGrapheme(
      letter,
      source !== lower,
      marks,
      lower === "ϲ"
        ? "lunate-sigma"
        : lower === "ς"
        ? "final-sigma"
        : lower === "σ"
        ? "medial-sigma"
        : undefined,
    ));
  }

  classifyCoronides(out);

  return out;
}
