import type { Diacritic, Letter } from "./model.ts";

export interface Forms {
  greek: string;
  beta: string;
  tr: string;
}

export const ALPHABET: Record<Letter, Forms> = {
  alpha: { greek: "α", beta: "a", tr: "a" },
  beta: { greek: "β", beta: "b", tr: "b" },
  gamma: { greek: "γ", beta: "g", tr: "g" },
  delta: { greek: "δ", beta: "d", tr: "d" },
  epsilon: { greek: "ε", beta: "e", tr: "e" },
  zeta: { greek: "ζ", beta: "z", tr: "z" },
  eta: { greek: "η", beta: "h", tr: "ē" },
  theta: { greek: "θ", beta: "q", tr: "th" },
  iota: { greek: "ι", beta: "i", tr: "i" },
  kappa: { greek: "κ", beta: "k", tr: "k" },
  lambda: { greek: "λ", beta: "l", tr: "l" },
  mu: { greek: "μ", beta: "m", tr: "m" },
  nu: { greek: "ν", beta: "n", tr: "n" },
  xi: { greek: "ξ", beta: "c", tr: "x" },
  omicron: { greek: "ο", beta: "o", tr: "o" },
  pi: { greek: "π", beta: "p", tr: "p" },
  rho: { greek: "ρ", beta: "r", tr: "r" },
  sigma: { greek: "σ", beta: "s", tr: "s" },
  tau: { greek: "τ", beta: "t", tr: "t" },
  upsilon: { greek: "υ", beta: "u", tr: "u" },
  phi: { greek: "φ", beta: "f", tr: "ph" },
  chi: { greek: "χ", beta: "x", tr: "ch" },
  psi: { greek: "ψ", beta: "y", tr: "ps" },
  omega: { greek: "ω", beta: "w", tr: "ō" },
  digamma: { greek: "ϝ", beta: "v", tr: "w" },
  yot: { greek: "\u03F3", beta: "j", tr: "j" },
  stigma: { greek: "ϛ", beta: "#2", tr: "c\u0304" },
  koppa: { greek: "ϟ", beta: "#1", tr: "q" },
  "archaic-koppa": { greek: "ϙ", beta: "#3", tr: "k\u0323" },
  sampi: { greek: "ϡ", beta: "#5", tr: "s\u0304" },
};

const reverse = (key: keyof Forms) =>
  new Map(
    Object.entries(ALPHABET).map((
      [letter, forms],
    ) => [forms[key], letter as Letter]),
  );

export const BY_GREEK = reverse("greek");
export const BY_BETA = reverse("beta");

BY_GREEK.set("ϐ", "beta");
BY_GREEK.set("ϲ", "sigma");

export const GREEK_MARKS = new Map<string, Diacritic>([
  ["\u0313", "smooth"],
  ["\u0314", "rough"],
  ["\u0301", "acute"],
  ["\u0300", "grave"],
  ["\u0342", "circumflex"],
  ["\u0302", "circumflex"],
  ["\u0308", "diaeresis"],
  ["\u0345", "iota-subscript"],
  ["\u0304", "macron"],
  ["\u0306", "breve"],
]);

export const GREEK_FOR: Record<Diacritic, string> = {
  smooth: "\u0313",
  coronis: "\u0313",
  rough: "\u0314",
  acute: "\u0301",
  grave: "\u0300",
  circumflex: "\u0342",
  diaeresis: "\u0308",
  "iota-subscript": "\u0345",
  macron: "\u0304",
  breve: "\u0306",
};

export const BETA_FOR: Record<Diacritic, string> = {
  smooth: ")",
  coronis: ")",
  rough: "(",
  acute: "/",
  grave: "\\",
  circumflex: "=",
  diaeresis: "+",
  "iota-subscript": "|",
  macron: "&",
  breve: "'",
};

export const BETA_MARKS = new Map(
  Object.entries(BETA_FOR).map(([name, mark]) => [mark, name as Diacritic]),
);

BETA_MARKS.set(")", "smooth");

/**
 * Order of combining marks in Greek output: quantity first, then breathing,
 * diaeresis, accent, and iota subscript.
 *
 * Marks of the same canonical combining class stack outward from the letter
 * in sequence order, so the macron or breve sits on the vowel and the
 * breathing and accent above it, as Greek is typeset (`ᾱ́`, `ᾱ̓`). NFC then
 * composes the precomposed long or short vowel (`ᾱ` U+1FB1) and keeps the
 * other marks as combining characters.
 */
export const GREEK_ORDER: readonly Diacritic[] = [
  "macron",
  "breve",
  "smooth",
  "coronis",
  "rough",
  "diaeresis",
  "acute",
  "grave",
  "circumflex",
  "iota-subscript",
];

/** Order of Beta Code marks, after the TLG placement rules. */
export const ORDER: readonly Diacritic[] = [
  "smooth",
  "coronis",
  "rough",
  "diaeresis",
  "acute",
  "grave",
  "circumflex",
  "macron",
  "breve",
  "iota-subscript",
];
