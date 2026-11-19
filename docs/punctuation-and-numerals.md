# Punctuation and numerals

Greek writes a few signs otherwise than Latin script does, and counts with
letters marked by a keraia. This document states which signs the library
reads, how it writes them in each format, and what it reads as a numeral.
Every other character is copied as it is.

## Punctuation

Six signs are read for what they mean in Greek, and written as each format
writes them:

| Sign | Greek | Beta Code | Transliteration |
| --- | --- | --- | --- |
| Question mark | `;` | `;` | `?` |
| Ano teleia | `·` | `:` | `;` |
| Apostrophe | `’` | `'` | `’` |
| Hyphen | `‐` (U+2010) | `-` | `-` |
| Enotikon | `‿` | `‿` | `‿` |
| Parentheses | `(` and `)` | `[1` and `]1` | `(` and `)` |
| Dash | `—` (U+2014) | `_` | `—` |

```ts
import { convert } from "@humanities/greek-conversion";

const greek = "τί; ναί· ἀλλ’ οὖν (ὡς).";

convert(greek, "greek", "transliteration"); // → tí? naí; all’ oũn (hōs).
convert(greek, "greek", "beta-code"); // → ti/; nai/: a)ll' ou)=n [1w(s]1.
```

The full stop, the comma, quotation marks, and square brackets are literals:
every format copies them. So are the other signs, but Beta Code writes many
of them with the TLG's codes (see [Signs with a TLG code](#signs-with-a-tlg-code)).

### Spellings read

Each reader accepts more than one spelling of a sign, and the output has one:

- the Greek reader takes `;`, the Greek question mark (U+037E), and `?` for
  the question mark; `·` (U+00B7) and the Greek ano teleia (U+0387) for the
  ano teleia; `-` and `‐` for the hyphen;
- every reader takes `'`, `ʼ` (U+02BC), `᾽` (U+1FBD), and `’` (U+2019) for the
  apostrophe, and also the psili `᾿` (U+1FBF) after a letter, which some
  texts write for the elision (`τ᾿ ἐστί`);
- every reader takes `‿` (U+203F) and the combining U+035C for the enotikon,
  and `⟨` (U+27E8), `〈` (U+2329), and `〈` (U+3008) for the left angle
  bracket, which the output writes `⟨`, and the same for the right one;
- the Beta Code reader takes `_` for the dash, as the TLG does.

Greek output therefore changes these signs in a text converted to itself,
without loss, since their meaning is kept:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const typed = "τί? καλο-κἀγαθός, ἀλλ' οὖν";
const result = convertDetailed(typed, "greek", "greek");

result.output; // → τί; καλο‐κἀγαθός, ἀλλ’ οὖν
result.lossy; // → false
```

The Greek question mark and ano teleia are written as the characters Unicode
normalization gives, `;` (U+003B) and `·` (U+00B7); `greek.questionMark` and
`greek.anoTeleia` select the Greek scalars instead (see
[Greek punctuation scalars](greek-unicode.md#greek-punctuation-scalars)).
In transliteration, `transliteration.hyphen: "typographic"` writes the hyphen
`‐`, and `transliteration.enotikon: "hyphen"` writes the enotikon `-`, which
then reads back as a hyphen.

### Signs with a TLG code

In Beta Code, `(` and `/` are marks, `*` marks a capital, `:` is the ano
teleia, and `%`, `#`, `[`, and `]` begin a code. The TLG therefore writes
these signs, and others that are not ASCII, with codes of their own (*Beta
Code Manual*, §3), which the library reads and writes:

| Sign | Code | Sign | Code | Sign | Code |
| --- | --- | --- | --- | --- | --- |
| `(` `)` | `[1` `]1` | `\|` | `%5` | `᾿` (psili) | `%30` |
| `⟨` `⟩` | `[2` `]2` | `=` | `%6` | `῾` (dasia) | `%31` |
| `{` `}` | `[3` `]3` | `+` | `%7` | `´` | `%32` |
| `⟦` `⟧` | `[4` `]4` | `%` | `%8` | `` ` `` | `%33` |
| `†` | `%` | `:` | `%10` | `῀` | `%34` |
| `*` | `%2` | `•` | `%11` | `῎` `῞` `῝` `῟` | `%35` to `%38` |
| `/` | `%3` | `‡` | `%13` | `¨` | `%39` |
| `!` | `%4` | `§` | `%14` | `΅` `῍` `῏` | `%132` to `%134` |
| `\` | `%103` | `ˈ` | `%15` | `⸏` (paragraphos) | `#6` |
| `^` | `%104` | `¦` | `%16` | `⸐` | `#8` |
| `~` | `%107` | `‖` | `%17` | `※` | `#13` |
| `#` | `%101` | `⁙` | `#55` | `⸖` | `#14` |
| `⸒` (hypodiastole) | `#532` | `⁚` | `#73` | `⁘` | `#544` |

The reader also takes `%1` for the question mark and `%12` for the asterisk.
The TLG writes the spacing breathings of a lacuna `%30` and `%31` as U+02BC
and U+02BD, which every reader takes for an apostrophe; the library reads
them as the Greek psili and dasia. As in the TLG, the number of a code is
every digit after it; a code the library does not know is kept as text,
`#1532` or `%40`, and so are `#12` and `#17`, obeli that the TLG gives as a
dash and a solidus. Before anything but a letter, `*` is an asterisk.

The codes of `&`, `"`, `<`, and `>` (`%9`, `%98`, `#18`, and `#15`) are
left out: bare, the TLG uses these signs for mark-up (a font, quotation
marks, an overline), which the reader keeps as text, and the writer writes
them bare, so that Beta Code converted to itself keeps its mark-up.

```ts
import { convert } from "@humanities/greek-conversion";

convert("†⟨λόγος⟩† ὅ⸒τι", "greek", "beta-code");
// → %[2lo/gos]2% o(/#532ti
convert("[2lo/gos]2 _ %", "beta-code", "greek"); // → ⟨λόγος⟩ — †
```

A digit after a code would make it another (`#1` and `2` are `#12`): before
a digit, a sign is written as itself where it reads back as itself, as a
sign outside ASCII does, or a parenthesis or a solidus after anything but a
letter (`1/2` and `(1)` give `1/2` and `(1]1`). Where it does not, the sign
is lost, and `convertDetailed()` reports it (see
[Canonical spelling and Unicode](information-loss.md#canonical-spelling-and-unicode)).

### Consequences

- **The whole text is read as Greek.** In a text that mixes Greek with
  another language, the punctuation of that language is converted with the
  rest: a `?` becomes `;` in Greek output, and a `;` becomes `?` in
  transliteration (see
  [Guarantees and limits](guarantees.md#text-that-mixes-greek-with-another-language)).
- **A colon is a literal in Greek**, and is copied. Beta Code writes it
  `%10`, since `:` is the ano teleia there; before a digit, as in `10:30`, it
  cannot be written, and `convertDetailed()` reports it
  (`unrepresented-literal`). So does a parenthesis after a letter and before
  a digit (see
  [Canonical spelling and Unicode](information-loss.md#canonical-spelling-and-unicode)).
- **An apostrophe written for a smooth breathing or a coronis**
  (`smoothBreathing: "apostrophe"`, `coronis: "apostrophe"`) reads back as
  an apostrophe, not as the mark.

## Alphabetic numerals

A numeral is a group of letters that a keraia marks. The library reads one
when:

- the letters carry no mark (under `numerals: "decimal"`, no mark that the
  output keeps, as said below) and follow no other letter;
- their values go down from one letter to the next: hundreds, tens, units;
- a right keraia `ʹ` closes the group;
- thousands, if any, come first, as a left keraia `͵` and a letter from 1
  to 9. A group that has them needs no right keraia (`͵α` is 1000).

The letters have their usual values, with stigma `ϛ` and digamma `ϝ` for 6,
the two koppas `ϟ` and `ϙ` for 90, and sampi `ϡ` for 900. `στ` before the
keraia is also 6, alone or as the units of a longer numeral, as the ALA-LC
tables list it. The highest numeral is 9999.

A final sigma `ς` before the keraia, as the units, is a stigma written with
the sign it resembles, which keyboards have: `ςʹ` is 6 and `ιςʹ` 16, while
200 is `σʹ`, the final sigma being no numeral sign of its own. Greek output
writes it `ς`, as the source does, or `ϛ` under `greek.symbolForms:
"standard"`; Beta Code and transliteration write a stigma (`i#2#`, `ic̄ʹ`),
and `convertDetailed()` reports the form as lost (`final-sigma-stigma`).

The right keraia is read from U+0374 or U+02B9, which are canonically
equivalent, and written U+02B9; the left keraia is U+0375. An apostrophe, a
tonos (`΄`, U+0384), or a prime (`′`) is not a keraia: `ιβ΄` is not read as a
numeral.

| Number | Greek | Beta Code | Transliteration |
| --- | --- | --- | --- |
| 12 | `ιβʹ` | `ib#` | `ibʹ` |
| 1821 | `͵αωκαʹ` | `#22awka#` | `͵aōkaʹ` |

`text.numerals: "decimal"` writes a numeral as a number, in every format. The
letters cannot be recovered from it, and `convertDetailed()` reports them as
lost. The ALA-LC presets select it:

```ts
import { convert, convertDetailed } from "@humanities/greek-conversion";

const decimal = { text: { numerals: "decimal" } } as const;

convert("ἔτος ͵αωκαʹ, βιβλίον ιβʹ, ϛʹ καὶ στʹ", "greek", "greek", decimal);
// → ἔτος 1821, βιβλίον 12, 6 καὶ 6

convert("ιβʹ", "greek", "transliteration", { preset: "ala-lc-modern" });
// → 12

convertDetailed("ιβʹ", "greek", "transliteration", decimal).lossy; // → true
```

The numeral is read on its letters as the output would write them, so that
converting the output again gives the same text. A letter whose marks the
options all remove counts as bare: the ALA-LC presets remove the accents and
the smooth breathing, so that `ἰβʹ` gives `12` there, as `ιβʹ` does, and
monotonic Greek output removes the breathings too. A final sigma before the
keraia is a stigma where the output writes it `ς`, in Greek and Beta Code
under `greek.finalSigma: "preserve"`.

Under `transliteration.keraia: "bnf"`, transliteration writes the right
keraia as an acute and the left one as a comma (see
[Scope limits](presets.md#scope-limits)).

### What is not read as a numeral

```ts
import { convert } from "@humanities/greek-conversion";

const decimal = { text: { numerals: "decimal" } } as const;

// Values that do not go down, a letter with a mark, a tonos for the keraia.
convert("αιʹ ἀʹ ιβ΄", "greek", "transliteration", decimal);
// → aiʹ aʹ ib΄
```

A final sigma that is not the units before the keraia is a sigma: `ςαʹ` is
201, and `αςʹ`, whose values do not go down, is not a numeral.
