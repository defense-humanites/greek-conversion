---
title: "The canonical document"
description: "Parse a text once, read its letters and marks, validate it, and encode it in any format."
---

Every conversion goes through a canonical document: the letters, case, and
marks of a text, independent of any spelling. The
`@humanities/greek-conversion/document` entry point exposes it, to parse a
text once, read or edit what was read, validate it, and write it in any
format.

## Parse once, encode in any format

`parse()` reads a text into a document, and `encode()` writes one:

```ts
import {
  encode,
  parse,
  validateDocument,
} from "@humanities/greek-conversion/document";

const document = parse("a)/nqrwpos", "beta-code");
validateDocument(document); // → []
encode(document, "greek"); // → ἄνθρωπος
encode(document, "transliteration"); // → ánthrōpos
```

Parse once and encode as many times as you need: `encode()` does not change
the document, so each format is written from the text as it was read.

## Read the letters and their marks

A document is a list of tokens. A grapheme is a letter with its case and its
marks, and anything else is a literal, kept as it was read:

```ts
import { parse } from "@humanities/greek-conversion/document";

const document = parse("Ἄνθρωπος, ϑεός", "greek");

document.map((token) =>
  token.kind === "grapheme" ? token.letter : token.value
).slice(6, 12);
// → ["omicron","sigma",","," ","theta","epsilon"]

const [first] = document;
first.kind === "grapheme" && first.uppercase; // → true
first.kind === "grapheme" && [...first.diacritics]; // → ["smooth","acute"]

const theta = document[10];
theta.kind === "grapheme" && theta.glyphVariant; // → theta-symbol
```

`parseDetailed()` also returns the position of each token in the input, as
`spans`, to relate a token to a selection or to an editor position:

```ts
import { parseDetailed } from "@humanities/greek-conversion/document";

const input = "ἄνθρωπος";
const { spans } = parseDetailed(input, "greek");
input.slice(spans[2].start, spans[2].end); // → θ
```

## Validate a document

`validateDocument()` checks that each mark suits its letter and its context,
and returns every problem it finds, with a code and the index of the token.
It is a step of its own: `encode()` does not call it.

```ts
import {
  grapheme,
  validateDocument,
} from "@humanities/greek-conversion/document";

const beta = grapheme("beta", false, ["acute"]);
validateDocument([beta]).map((diagnostic) => diagnostic.code);
// → ["invalid-accent"]
```

Validation checks the document, not the original spelling: a malformed source
sequence can survive as a literal. The
[validation contract](/reference/validation/) lists the codes, and the
[document contract](/reference/document-api/) describes the ownership and
editing rules of tokens.
