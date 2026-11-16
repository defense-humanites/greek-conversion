---
title: "Control Greek Unicode output"
description: "Choose composed or decomposed output, tonos or oxia, and Greek punctuation."
sidebar:
  order: 9
---
```ts
import { reencode } from "@humanities/greek-conversion";

const styled = reencode("ά;", "greek", {
  greek: { acute: "oxia", questionMark: "greek" },
});
[...styled].map((c) => c.codePointAt(0)!.toString(16)); // → ["1f71","37e"]
```

Composed or decomposed output, tonos or oxia, and the Greek punctuation scalars
are representation choices: they never change the text's meaning, and they are
not reported as loss. See
[Greek accentuation and Unicode](/reference/greek-unicode/).
