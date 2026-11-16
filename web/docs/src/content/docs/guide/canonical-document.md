---
title: "Working with the canonical document"
description: "Parse once, inspect or edit the document, and encode it in any format."
---
The `@humanities/greek-conversion/document` entry point exposes the parsed text,
for validation, analysis, or controlled edits:

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

Parse once and encode as many times as you need. `parseDetailed()` also returns
the position of each token in the input, as `spans`. Validation checks the
document, not the original spelling: a malformed source sequence can survive as
a literal. The
[document API contract](/reference/document-api/)
describes ownership and editing rules, and
[validation](/reference/validation/)
lists the diagnostic codes.
