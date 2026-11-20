# Changelog

All notable changes to `greek-conversion` are documented in this file. The
project follows [Semantic Versioning](https://semver.org/); the
[stability policy](docs/stability.md) states what each kind of release may
change.

## [Unreleased]

### Removed

- The `sbl-academic` preset. The SBL Handbook of Style gives Greek a single
  transliteration, for general readers (§5.3), and asks for Greek characters
  for academic readers: it defines no academic style, which the preset's name
  claimed. The defaults write what the preset wrote, so leaving it out
  changes nothing; `preset: "sbl-academic"` now throws an `OptionError` that
  says so. The documentation describes the default transliteration as the
  library's own: the letters of the Handbook, with the accents, iota
  subscript, diaeresis, and quantity marks that the Handbook leaves out.

### Added

- Signs that stand for several letters are read as those letters, and noted
  as the glyph variant of the first: the καί symbol `ϗ` (`Ϗ`, Beta Code
  `#1532` and `#1531`) as `και` (`kai-symbol`), and the ligature `ȣ` (`Ȣ`,
  Beta Code `#1521`), a Latin letter that editions use for the Greek one, as
  `ου` (`ou-ligature`); rc.10 copied them as they were. No accent is
  supplied; marks after a sign belong to its last letter (`ϗ́` is `καί`).
  Greek output writes the sign again, Beta Code its TLG code where the TLG
  has one, and transliteration the letters, with a reported loss.
  `greek.ligatures: "standard"` (type `LigatureOrthography`) writes the
  letters in Greek and Beta Code too.
- `greek.stigma: "ligature"` (type `StigmaReading`) reads a stigma between two
  letters as `σ` and `τ`, which older printing joined in that sign (`ἐϛὶ`
  gives `estì`), in every format; a stigma at the end of a word or before a
  keraia stays the numeral. Greek output writes `ϛ` again where the source
  has it (`stigma-ligature`), never for `στ` the source writes as letters.
  The default, `"letter"`, reads the stigma as before.
- The overline of abbreviations and numerals, U+0305, as over the nomina
  sacra (`θ̅ς̅`), is a mark, `overline`, a new member of `Diacritic`, which
  rc.10 kept as an unknown combining mark. Greek and transliteration write it
  after its letter (`th̅s̅`), and Beta Code over a run of letters, between `<`
  and `>`, as the TLG does (`<qs>`), which the reader reads; `<` and `>` are
  then written `#18` and `#15`, their TLG codes, and kept as text where no
  letter stands between them or a digit follows one. Monotonic accentuation
  keeps it, and `diacritics.overline: "remove"` removes it, as
  `diacritics.all: "remove"` does, so the presets that remove every mark
  remove it with a reported loss. Abbreviations are not expanded.
- `greek.kaiAccent` (type `KaiAccent`) writes the accent of `καί` where the
  output writes `ϗ`, which marks none, as letters: in transliteration, and in
  Greek and Beta Code under `greek.ligatures: "standard"`. `"byzantine"`
  writes the grave, as the manuscripts do even before punctuation;
  `"modern"` follows modern editions, with the acute before punctuation, at
  the end of the text, and before an enclitic (`καί τινες`, `καὶ τοῦ`). No
  accent is written on a sign that has one, on capitals, or in a text with
  no grave and no circumflex. `convertDetailed()` reports each accent written
  as `added-diacritic`. The default, `"none"`, writes no accent, as before.

### Changed

- `sbl-general` writes no diaeresis, which the SBL Handbook does not provide
  for: `ἀΐδιος` gives `aidios` (rc.10: `aïdios`). An upsilon written `y`
  still says that it is not in a diphthong (`Θύιλλος` gives `Thyillos`). The
  preset cites §5.3 of the Handbook, and its coverage becomes `complete`.
- The README presents the library by task, for Ancient and Byzantine Greek
  and for Modern Greek, says what the presets are tested against, and shows
  what a conversion loses. Its example is that of the site's home page, which
  `npm run check` keeps identical, and converts Ancient Greek without a
  preset, "with every accent and breathing". The tables of the presets guide
  give the default in a row of its own, and the playground describes it as
  the letters of the SBL Handbook with the marks that the Handbook leaves
  out; a link shared with `sbl-academic` opens the defaults.
- The API documentation of `Format` and the glossary say in which sense the
  Latin format is named `"transliteration"`: the broad sense that software
  gives the word after Unicode CLDR, which holds transcriptions as well.
- Every reader takes a spacing breathing before a capital for the capital's,
  as older editions and their digitizations write it: at the start of a
  word, before a capital vowel or rho, psili U+1FBF and dasia U+1FFE, and
  their compounds with an accent, join the capital (`῾Ρωμαῖοι` gives
  `Rhōmaĩoi`, rc.10: `῾Rōmaĩoi`, and Greek output writes `Ῥωμαῖοι`). A psili
  after a letter is the apostrophe of an elision (`τ᾿ ἐστί` gives `t’ estí`),
  so that a sigma before it stays medial (`ὅσ᾿ ἂν` gives `o(/s' a)\n` in Beta
  Code, rc.10: `o(/s1᾿ a)\n`). Elsewhere, the signs are kept as before. Text
  that rc.10 wrote from such a source reads back: `῾*rwmai=oi` and
  `῾Rōmaĩoi` give `Ῥωμαῖοι`.
- Beta Code reads and writes signs with the TLG's codes (*Beta Code Manual*,
  §3), listed in the reference on punctuation: the ASCII signs that Beta
  Code would read as something else (`/` is `%3`, `*` `%2`, `:` `%10`, `%`
  `%8`, `#` `%101`), the dagger (`%`), the dash (`_`), the angle brackets,
  braces, and double square brackets (`[2`, `[3`, `[4`), editorial signs (the
  paragraphos `#6`), Byzantine punctuation (`⸒` `#532`, `⁘` `#544`), and the
  spacing accents and breathings of a lacuna (`%30` to `%39`, `%132` to
  `%134`). rc.10 wrote them as themselves: `λόγος/ψυχή` gave `lo/gos/yuxh/`,
  which read back with an acute on the sigma, and `*α` gave `*a`, a capital;
  they now give `lo/gos%3yuxh/` and `%2a`. Before a digit, which would
  extend a code, a sign is written as itself where it reads back as itself:
  `(1)` gives `(1]1`, which reads back (rc.10: `[11]1`, which did not). The
  codes of `&`, `"`, `<`, and `>` are left out, since the TLG uses these
  signs, bare, for mark-up, which Beta Code converted to itself keeps. Every
  reader takes `〈` (U+2329 or U+3008) for `⟨`, and the right bracket
  likewise. Before anything but a letter, `*` is an asterisk, and what
  follows it is read as if it were not there: `*(` was one piece of text,
  and is now an asterisk and a parenthesis.
- The Byzantine guide shows how to transliterate strictly, as the _Oxford
  Dictionary of Byzantium_ does: `ala-lc-ancient` with `longVowels: "omit"`
  gives `Alexios Komnenos`. The dictionary publishes no table, and keeps a
  traditional form for many names (John, Nicaea), which no option supplies;
  no `odb` preset is added. The guide also shows how to expand the nomina
  sacra with a table of one's own through the document API, since the library
  does not expand abbreviations.
- The metadata of the presets (names, authorities, scopes, references,
  limitations) is kept apart from their options, so that a bundle that
  converts, without `listPresetMetadata()` or `getPresetMetadata()`, no
  longer carries it: about 10 KB less minified, 3 KB with gzip, for
  `convert()` or `parse()`. The API is unchanged.

### Fixed

- The Beta Code reader takes every digit after `#` as the number of one TLG
  code, as it did for `%` and the brackets: `#12`, the obelus, was read as
  koppa followed by `2`, `#532`, the hypodiastole, as sampi followed by `32`,
  and `#6`, the paragraphos, as a keraia followed by `6`. The letters and
  the keraiai read as before (`#`, `#1`, `#2`, `#3`, `#5`, `#22`, `#401`),
  the signs as above, and any other code is kept as text, whole. A letter
  written as a code before a digit
  (`ϛ5`, which gives `#25`) therefore no longer reads back, like a
  parenthesis before a digit, and `convertDetailed()` reports the loss; a
  sigma before it is written as one that ends its word, so that the output
  stays idempotent.
- The Beta Code reader reads the marks after a letter written as a `#` code,
  as after any letter: `#1/`, which Beta Code output gives for a koppa with
  an acute, was read as a koppa followed by `/`.

## [1.0.0-rc.10] - 2026-11-19

Tenth release candidate for `1.0.0`. Greek output writes the acutes of
monotonic text with tonos, so that monotonic Greek converts back to itself,
and keeps an elided consonant before a rough breathing as the source writes
it (`greek.elidedStop`). ISO 843 Type 2 writes `ωυ` letter by letter. A final
sigma that is the units of a numeral is read as a stigma (`ιςʹ`, 16),
monotonic accentuation keeps the accent of `ό,τι`, `κ.ά.`, and `20ός`, and a
decimal numeral is read on its letters as the output writes them, which made
the ALA-LC presets idempotent. `createConverter()` checks its configuration
as conversion options are checked. The documentation has a site of its own,
https://greek-conversion.humanites.fr/, with a guide for Ancient, Byzantine,
and Modern Greek, a reference of every option, and the redesigned
playground.

### Added

- `greek.elidedStop` decides how Greek output writes a final `π`, `τ`, or `κ`
  whose vowel is elided before a word with a rough breathing: `"preserve"`,
  the default, keeps the consonant of the source, and `"aspirate"` writes
  `φ`, `θ`, or `χ` (`ἀπ’ οὗ` → `ἀφ’ οὗ`). Its type is
  `ElidedStopOrthography`.
- A documentation site, at https://greek-conversion.humanites.fr/, a domain of
  its own (the address the playground had on GitHub Pages redirects to it),
  built with Starlight (`web/docs/`): a guide and recipes taken from the
  README, the reference generated from `docs/` at each build, and the API
  reference generated from the TSDoc of both entry points, with search. It uses
  the playground's design (`web/shared/`) and follows the system's light or dark
  appearance. The playground moves to `/playground/`; a link shared before, to
  the site's root with its state in the fragment, opens the playground. The site
  is laid out for translations, English being the source; none is published yet.
  Code, in the site and the playground, is set in Noto Sans Mono, served with
  the site, which covers polytonic Greek and stacks diacritics on every system,
  with Fira Mono for the symbol forms and lunate sigmas it does not tell apart.
- The guide answers a reader who comes with a Greek. Pages on Ancient Greek
  and on Byzantine and Medieval Greek join the one on Modern Greek, each
  with the conventions that apply, what converts back, the tasks proper to
  the period, and its limits; the Byzantine page says which signs are kept
  but not read yet (`ϗ`, `ȣ`, a spacing breathing before a capital, the
  overline of nomina sacra). The page on presets compares what each preset
  loses on a monotonic and a polytonic text, in a table computed from the
  library (`npm run docs:losses`) and kept up to date by `npm run check`. A
  page on the canonical document takes the section that How it works had.
- A reference of the conversion options, `docs/options.md`: each of the 46
  options with what its API documentation says, its values, its default, an
  example of what each other value changes, and the presets that select it.
  It is generated from the library (`npm run docs:options`): the texts are
  the TSDoc of the options, and each example is the first word of the
  playground's probe text that the value writes otherwise. In the guide, the
  page on presets compares how each transliteration preset writes the
  letters, vowel pairs, digraphs, and marks on which the conventions differ
  (`npm run docs:comparison`). `npm run check` keeps both up to date.
- The reference states how punctuation and numerals are read and written,
  in `docs/punctuation-and-numerals.md`: the six signs read for what they
  mean in Greek and their spelling in each format, the spellings each reader
  accepts, what Greek output therefore changes in a text converted to itself
  (`?` to `;`, `-` to `‐`, `'` to `’`), what a numeral is, its signs, and
  what is not read as one. The guide gains a glossary.
- The README is now a short entry point: installation, one example, the main
  functions, and links to the site. Its development notes move to
  `CONTRIBUTING.md`. `npm run check` (`scripts/check_examples.ts`, formerly
  `check_readme.ts`) type-checks and runs the examples of the guide pages as
  well as the README's, and checks the links between pages. The package's
  `homepage` is the site.
- A Modern Greek page in the guide: which preset to use for names on
  passports and maps (`iso-843-type-2`), for a reversible transliteration
  (`iso-843-type-1`), and for library records (`ala-lc-modern`); how to read
  transliteration back as monotonic Greek, romanize a polytonic text as a
  monotonic one, and make search keys and URL slugs; and what needs more than
  the text. The README, Getting started, and Presets lead to it, and the
  table of presets says which Greek each one is for.
- The ISO 843 presets name ELOT 743, the Greek national standard: Type 2 is
  its transcription, which the United Nations and BGN/PCGN adopted for
  geographical names, and Type 1 its transliteration since 2001.
  `iso-843-type-2` cites the BGN/PCGN and UNGEGN tables, and its conformance
  corpus checks every example of the BGN/PCGN table. The rules that need more
  than the text are recorded: the stress of unaccented capitals, unaccented
  abbreviations, and older polytonic accents. The package's keywords include
  `elot743`, `byzantine-greek`, and `medieval-greek`, and those of
  `CITATION.cff` Byzantine and Medieval Greek. The keywords `beta-code` and
  `iso-843` become `betacode` and `iso843`, the spellings that the
  repository's topics and other Greek packages on npm use.

### Changed

- Greek output that carries no polytonic mark writes its acutes with tonos
  (`ά`, U+03AC), the form monotonic text is typed in and the one NFC gives,
  instead of oxia (`ά`, U+1F71). Monotonic Greek now converts back to itself
  scalar for scalar: `reencode("Αθήνα", "greek")` returns its input, as does
  a round trip through Beta Code or `iso-843-type-1`. Output that carries a
  breathing, a grave, a circumflex, an iota subscript, a coronis, or a
  quantity mark still writes every acute with oxia. This is what
  `greek.acute: "system"`, the default, now means; `"oxia"` and `"tonos"`
  still decide alone. The choice is made for the whole output of one
  conversion, so a polytonic text converted word by word needs
  `greek.acute: "oxia"` to write every acute alike (`λόγος` alone gives
  U+03CC; in `ὁ λόγος`, U+1F79). The two forms are canonically equivalent,
  and no loss is reported either way.
- The names of the ISO 843 presets say what each type does, as the standard
  does: "ISO 843:1997 — Type 1 (transliteration)" and "ISO 843:1997 — Type 2
  (transcription)". Their ids are unchanged.
- The playground has a new design, in the project's identity (tessera
  symbol, Bricolage Grotesque, Papier and Nuit themes). Source and target are
  chosen from two segmented groups; the source is detected from the text by
  default, plain Latin letters reading as transliteration. The standards
  offered are those of the formats in use. Conversion options are pills after
  the standard, added from a searchable list of the options that change the
  result of the conversion in use (measured by `npm run site:options`),
  instead of a JSON field; the sentence says "Restyle" when both sides share
  a format. A transliteration converted to transliteration or Beta Code says
  what it is written in ("written in", the `source` option): read as the
  output writes it, the default, it is normalized ("Normalize"); written in
  another style, it is restyled; towards Greek, the style becomes the
  standard. Losses name the letter form they are about (`glyphVariant`), one
  card per form, and the forms and marks the target adds are listed apart.
  Examples, in a menu of the source field, now go with the selected
  standard, each with a note on the rule it shows, and are checked against
  the library by `tests/playground_examples_test.ts`. Letters whose
  distinctions the target loses are underlined in the source; letters of
  another script, copied as is but read back as Greek
  (`unrepresented-literal`), are dotted, listed under their own heading, and
  not counted as lost distinctions.
  Marks the reader keeps but Greek does not allow (`validateDocument()`) are
  dashed and listed too, with an example per format in the menu. The
  character inventory is edited as pills too, in place of a JSON field:
  characters left out or kept alone, spellings added to letters, and new
  characters, each added from a searchable list or a short form. It sits in
  a tab beside the generated code and the canonical document, both
  highlighted. Texts in all three formats are set in Literata Light, served
  by the playground with the letters it lacked (`web/shared/fonts/README.md`);
  its icons are Lucide's, shared with the documentation site
  (`npm run site:icons`). Reset, beside Share, brings the page back to its
  opening state, and offers to undo it for a few seconds. On a touch screen,
  Share opens the system's share sheet; elsewhere, it copies the link. By
  touch, the pickers of options and characters show their lists without a
  search field, whose keyboard would hide them. The result reads on the
  ground of the code blocks, says where it will appear while empty, and,
  typed in, where to write instead.
- The contract is stated in `docs/` and the API documentation alone: the
  stability policy no longer counts the `README`, which will become a short
  entry point to a documentation site, among the documents that define
  behavior. What only the `README` stated has moved: the guarantees and limits
  to the new `docs/guarantees.md` (the stability policy linked to a heading
  that no longer existed); to the API documentation of their options, the
  capitals of `letterCase: "preserve"` and `"title"`, the trimming of
  `whitespace: "collapse"`, the spelling of eta and omega when diacritics are
  removed, and what a restyle with `source` cannot restore; and the Beta Code
  apostrophe and font shifts to `docs/information-loss.md`. The English text
  prevails over the `README`, guides, and translations. No behavior changes.
- One sentence describes the project: "Convert Ancient and Modern Greek
  between Greek script, Beta Code, and Latin script, with standards-based
  presets and information-loss diagnostics." It is the package's
  `description`, the README's tagline, and the documentation of the main
  module; the text of the site's home page, the description of the site, and
  the abstract of `CITATION.cff` give it after "A TypeScript library that
  converts". `npm run check` keeps the copies identical. The playground's
  description follows it. The social card, which must hold its text on three
  lines, gives a shorter form: "Convert Ancient and Modern Greek to and from
  Beta Code or Latin script, with standards-based presets and
  information-loss diagnostics."; its foot reads "TypeScript library on npm
  and JSR", and its text alternative follows the card.
- Greek output no longer aspirates an elided consonant before a rough
  breathing unless asked: `ἀπ’ οὗ`, `κατ’ ἑωυτούς`, and `μετ’ ἡμέρην`, as
  Herodotus and other Ionic prose are edited, stay as written, where every
  Greek output rewrote them (`ἀφ’ οὗ`, `καθ’ ἑωυτούς`, `μεθ’ ἡμέρην`) and
  reported a loss. This follows the letter forms, kept as the source writes
  them since rc.9. `greek: { elidedStop: "aspirate" }` gives the earlier
  output; transliteration `ap’ hēmō̃n` now reads as `ἀπ’ ἡμῶν` without it.
- The reference (`docs/`) says more: `validation.md` lists the codes of
  `validateDocument()` and how to locate one in the input;
  `ala-lc-conformance-corpus.md` no longer counts the missing `h` of
  monotonic text among the open rules, since the ALA-LC table supplies none
  there (`Ελληνική` → `Ellēnikē`, now a case of the corpus).
- The examples of the README and of the guide are checked code point for
  code point, no longer after NFC normalization: a result is written as it is
  returned, oxia or tonos.
- The examples of the reference (`docs/`) are checked like those of the
  guide. Each of its twenty-three examples is now a module with its imports
  and its results, type-checked and run by `npm run check`, which also checks
  the links between its documents and their headings. A result given inside
  a block, such as a `catch`, is checked too: three of the guide were read as
  plain comments.
- The conversions the documentation cites in its prose (`Ἅιδῃ → Háidȩ̄`,
  "`ἐϛὶ` gives `ec̄ì`") are checked by `npm run check`: each must be what the
  library returns between the formats it is written in, under the defaults,
  a preset its page names, or the options named around it. One citation of
  `docs/information-loss.md` lacked the apostrophe of its smooth breathing
  (`εὖ` → `’ẽf` under ISO 843 Type 1).

### Fixed

- `createConverter()` checks the keys of its configuration, as conversion
  options are checked: `createConverter({ exlude: ["stigma"] })` was
  accepted and excluded nothing. An unknown key, of the configuration, of an
  alias (`aliases[0].spelings`), or of a custom character
  (`characters[0].forms.betacode`), throws an `OptionError` whose `path`
  names it and whose `accepted` lists the keys allowed there. So does a value
  outside a known set, as an option value does: an out-of-scope behavior
  (`outOfScopeBehavior: "rejct"`), an identifier of `repertoire` or `exclude`
  that names no character (`path: "exclude[1]"`), both a `TypeError` in rc.9,
  and the letter of an alias, which rc.9 accepted, then failed on at the
  first conversion. A configuration, a list, a definition, or a field of the
  wrong type throws a `TypeError` that says which (`aliases[0].spellings`, a
  string, or `characters[0].override`, `"yes"`, which rc.9 took for `true`),
  where it failed on a property of `undefined`.
- ISO 843 Type 2 (`iso-843-type-2`) writes `ωυ` letter by letter, as note 8
  requires of a combination that Table 2 does not list: `ἑωυτοῦ` gives
  `heoytoû` (rc.9: `heoutoû`). Omega was written as it reads back, omicron,
  and `ωυ` like `ου`. Since `ου` is written `ou`, or `oy` only with an accent
  on the `o` or a diaeresis on the `y` (note 9), an `o` without marks before
  a `y` without diaeresis now reads back as omega, so that `ωυ` converts back
  without loss. A rough breathing on its upsilon stays there (`κωὑ` gives
  `kohy`). A numeral, whose letters are digits, is still written as it reads
  back (`ωυʹ` gives `ouʹ`, with a reported loss).
- A final sigma before the keraia, as the units of a numeral, is read as a
  stigma written with the sign it resembles, which keyboards have: `ςʹ` is 6,
  `ιςʹ` 16, and `͵αςʹ` 1006 (rc.9: 200, no numeral, and 1200). 200 is `σʹ`,
  the final sigma being no numeral sign of its own. Greek output keeps the
  `ς`, or writes `ϛ` under `greek.symbolForms: "standard"`; Beta Code and
  transliteration write a stigma (`i#2#`, `ic̄ʹ`), and `convertDetailed()`
  reports the form as lost, under the new glyph variant
  `final-sigma-stigma`. A final sigma that is not the units of a numeral
  stays a sigma, which Greek output and Beta Code now keep before a keraia
  (`αςʹ`, `as2#`), where rc.9 wrote `ασʹ` and `as#`.
- Monotonic accentuation (`greek.accentuation: "monotonic"`) keeps the
  accent of a word that abbreviates a longer one, as usage does: `ὅ,τι`
  gives `ό,τι`, whose comma (the hypodiastole) is inside its word, `κ.ἄ.`
  gives `κ.ά.`, a word joined by a period to a letter belonging to an
  abbreviation, and the ending of an ordinal written with digits keeps its
  accent (`20ός`). rc.9 counted each as a monosyllable and wrote `ο,τι`,
  `κ.α.`, and `20ος`, which the documentation listed as limits of the count.
- Under `text.numerals: "decimal"`, a numeral is read on its letters as the
  output writes them, so that converting the output again gives the same
  text. A letter whose marks the options remove counts as bare: under the
  ALA-LC presets, which remove the accents and the smooth breathing, `ἰβʹ`
  gives `12` and `σόʹ` gives `270`, where rc.9 wrote `ιβʹ` and `σοʹ`, which
  read back as those numbers. So does a letter whose breathing monotonic
  Greek output removes, and a final sigma before the keraia that the output
  writes `ς` is a stigma there.

## [1.0.0-rc.9] - 2026-11-15

Ninth release candidate for `1.0.0`. Greek output now keeps the letter forms
the source writes, by default: the lunate sigma, a sigma whose shape
contradicts its place, `ϐ`, and the symbol forms such as `ϑ`; MIGRATION gives
the options that reproduce rc.8. `convertDetailed()` reports a form only where
converting back cannot restore it, and names it. The API gains the `source`
option, which restyles a transliteration (#70), `greek.iotaSubscript`,
`greek.symbolForms`, the loss codes `added-glyph-variant` and
`added-diacritic`, and the `glyphVariant` field of a loss. Beta Code reads and
writes the TLG sigma codes `s1` and `s2`. Checking the Bailly corpus and
fuzzing the options fixed a series of conversions that did not read back as
written, or that were not idempotent.

### Added

- `greek.iotaSubscript` decides where Greek output writes a kept iota
  subscript. `"subscript"`, the default, writes it below the line as before.
  `"capital-adscript"` writes it on the line after a capital, as Smyth
  describes (§ 5) and as Unicode's uppercase mapping does: `ᾨδῇ` gives `Ὠιδῇ`,
  and `τῇ ᾠδῇ` in capitals gives `ΤΗΙ ΩΙΔΗΙ` once the other marks are
  removed. `"adscript"` writes it on the line after every vowel (`τῶι`). An
  iota on the line reads back as a letter, and `convertDetailed()` reports the
  loss of the subscript. The README gives a recipe for Greek in the uncial
  style, with this option.
- `source` describes how the input of a conversion is written, when it is not
  written as the output (#70). The input is read with these options, resolved
  on their own, and the output written with the others. Reading
  transliteration depends on its options, which also described the input in
  a conversion that keeps the format, so `reencode()` could not restyle a
  transliteration into a style that reads it otherwise:
  `reencode("phílos", "transliteration", { transliteration: { phi: "f" } })`
  read `ph` as pi and a rough breathing and gave `phílos`, and ALA-LC Modern
  read the `b` of `barbarōn` as μπ. With `source: {}`, the default style, the
  first gives `fílos`, and with `source: { preset: "sbl-academic" }`, the
  second gives `varvarōn` (README, *Restyle a transliteration*). Without
  `source`, nothing changes: the options describe the input as well, which
  normalizes a text in its own style and keeps output idempotent. `source`
  replaces the options for reading, without merging with them, and works with
  every function that reads text, including a converter bound to another
  preset. Its options are checked like the others, with paths that start with
  `source.`.
- `greek.symbolForms` decides how Greek output writes the symbol forms of
  letters: `ϑ`, `ϴ`, `ϕ`, `ϖ`, `ϰ`, `ϱ`, `ϵ`, and `ϒ`, with its accented forms
  `ϓ` and `ϔ`. `"preserve"`, the default, keeps those the source writes, and
  `"standard"` writes the ordinary letters. No value writes a symbol form
  where the source has the ordinary letter: Unicode reserves them for
  mathematics. The Greek reader records each symbol form as the grapheme's
  `glyphVariant` (`"beta-symbol"` for `ϐ`, `"theta-symbol"`,
  `"capital-theta-symbol"`, `"phi-symbol"`, `"pi-symbol"`, `"kappa-symbol"`,
  `"rho-symbol"`, `"lunate-epsilon"`, `"upsilon-hook"`). A symbol form belongs
  to one case: in capitals, `ϑ` is `Θ`, as `toUpperCase()` writes it, and
  `validateDocument()` reports a symbol form on a grapheme of the other case.
- `greek.medialBeta: "preserve"`, the new default, writes `ϐ` where the source
  notes it and `β` elsewhere.
- A `removed-glyph-variant` loss names the source form in its new
  `glyphVariant` field. The new code `added-glyph-variant` reports a form the
  target writes where the source has none, and that converts back as another
  spelling; its `glyphVariant` is the form written.
- The loss code `added-diacritic` reports a diaeresis the target writes where
  the source has none, and that reads back: under the contextual upsilon,
  `ἀἑυ` gives `aheÿ`, which reads back as `ἀἑϋ`; `convertDetailed()`
  reported no loss.
- Beta Code reads `s1` and `s2`, the medial and final sigma of the TLG, and
  writes them where the shape contradicts the place, under the default
  `greek.finalSigma: "preserve"`: `λόγοσ` gives `lo/gos1` (was `lo/gos`, which
  reads back as `λόγος`), and `lo/gos1` gives `λόγοσ` (was `λόγος1`). A shape
  the place gives needs no code (`s1a` gives `sa`), and the TLG defines none
  for a capital (`*s1` is still a capital sigma and a digit). Since `s1` and
  `s2` now read as sigmas, a small sigma before a digit from 1 to 3 is
  written with its code (`λόγος2` gives `lo/gos22`), so that the digit
  survives; see *Changed* for how existing input reads.

### Changed

- Greek output keeps the letter forms the source writes, by default. The
  defaults of `greek.sigma`, `greek.finalSigma`, and `greek.medialBeta` are
  now `"preserve"` (were `"standard"`, `"contextual"`, and `"standard"`), and
  so is that of the new `greek.symbolForms`. `ϲῶμα`, `λόγοσ`, `ϐίος`, and
  `ϑεός` stay as written (rc.8: `σῶμα`, `λόγος`, `βίος`, `θεός`); so do a
  sigma noted final inside a word and the shapes of a word whose marks are
  removed. The lunate sigma that Beta Code writes `s3`, and `bnf-core` `c`,
  gives `ϲ` in Greek, and Beta Code output writes it `s3` (rc.8: `s`). A sigma
  whose shape the source does not note, as in Beta Code or transliteration,
  is still placed by its position. The options
  `{ greek: { sigma: "standard", finalSigma: "contextual", medialBeta: "standard", symbolForms: "standard" } }`
  give the output of rc.8, and the README gives a recipe to fold the forms
  for comparison (*Keep or fold letter variants*).
- `convertDetailed()` reports a letter form when the source format, under the
  options of the conversion, writes it from the source but not from the text
  read back, so that a conversion without loss still converts back to
  the same text (Information loss, *Letter forms*). A form the target cannot
  write is reported: `ϐίος` gives `bíos` in transliteration, which reads back
  as `βίος`, with a loss whose `glyphVariant` is `"beta-symbol"`; so do `ϑ`,
  and a sigma whose shape contradicts its place (`λόγοσ` → `lógos`). Under
  `medialBeta: "symbol"`, which writes `ϐ` inside a word as French typography
  does, a text written that way gives no loss. A form that the options fold
  is no longer reported: `ϲῶμα` under `sigma: "standard"` gives `σῶμα`, which
  is how the same options write the source (rc.8: `removed-glyph-variant`).
- Under the default `greek.sigma: "preserve"`, Greek and Beta Code output
  keep a lunate sigma in a numeral (`ϲʹ`, Beta Code `s3#`); `"lunate"` still
  writes a numeral with the standard sigma.
- Beta Code `s1` and `s2` read as a sigma with a noted shape, and no longer
  as a sigma followed by a digit: `lo/gos1` gives `λόγοσ` (rc.8: `λόγος1`).
  Marks after a sigma code are read as marks of the sigma (`s2/a` gives
  `ς́α`; rc.8: `ς/α`).

### Fixed

- A sigma before an elision apostrophe stays medial in Greek output: the
  apostrophe stands for the elided vowel. Every apostrophe ended the word, so
  `ἔχουσ’ ἐγώ` gave `ἔχους’ ἐγώ`, the Modern Greek `σ’ αγαπώ` gave `ς’ αγαπώ`,
  and the Beta Code `a)gge/llous'` gave `ἀγγέλλους’`. The sigma is final only
  before an apostrophe that closes a quotation opened by `‘` on the same line,
  and that no word beginning with a vowel follows on that line (‘λόγος’). A
  sigma on its own (`σ’ το πω`) is always medial, and an apostrophe after
  punctuation or a digit always closes the quotation (‘ναί.’). A straight
  quotation mark opens nothing, since it cannot be told from an aphaeresis:
  under `finalSigma: "contextual"`, `'λόγος'` now gives `’λόγοσ’`. This
  applies wherever the position decides the shape: under `"contextual"`, and
  under `"preserve"` for a sigma whose shape the source does not note.
- Under `greek.finalSigma: "preserve"`, a lunate sigma written as a standard
  sigma takes its shape from its place in the word, as a sigma read from Beta
  Code or transliteration does. A lunate sigma notes no position, but it was
  always written `σ`, even at the end of a word: with `sigma: "standard"`,
  `ϲῶμαϲ` gave `σῶμασ` and now gives `σῶμας`; the Beta Code `lo/gos3` and
  `logoc` under `bnf-core` gave `λόγοσ` and `λογοσ`. `finalSigma:
  "contextual"` was not affected.
- Under `text.numerals: "decimal"` (the ALA-LC presets), `στʹ` is also read as
  the units of a longer numeral, as `ϛʹ` is: the ALA-LC tables give
  `ϝʹ, ϛʹ, στʹ` for six, and Modern Greek writes 16 as `ΙΣΤʹ`. Only a lone
  `στʹ` was read, so `ΙΣΤʹ` gave `ISTʹ`; it now gives `16`, and `͵αστʹ` gives
  `1006`. Read as 200 and 300, the pair would break the descending order of
  the digits, so it cannot mean anything else.
- A letter that a converter keeps out of its scope (`createConverter()` with
  `exclude`, a `repertoire`, or a bound preset) is written as the source
  writes it in its word, and the letters around it stay in that word (#68).
  It was written alone, with the options of the converted text: with sigma
  excluded, `λόγος σῶμα` gave `λόγος ςῶμα`, and with omega excluded, `τῷ` gave
  `tω` in transliteration with `diacritics: { all: "remove" }`, which
  `convertDetailed()` did not report. A Greek or Beta Code letter is now
  written in its format's canonical spelling, whatever the `betaCode` options
  (`lo/gos` with `betaCode.case: "uppercase"` gave `λόγοS` and gives `λόγοs`).
  A transliterated letter is copied from the source, with the marks that the
  options would leave out (`pā́n` under `bnf-core`, alpha excluded, gave `πáν`
  and gives `πā́ν`). Only the transformations of the whole text (`text`)
  reach a kept letter, in its context: title case capitalizes it at the start
  of a word only (`σῶμα λόγος`, sigma excluded, gave `ΣΩ͂μα ΛόγοΣ` and gives
  `Σῶμα Λόγος`), and under `numerals: "decimal"` a numeral it belongs to is
  written as one number (`ιϛʹ`, stigma excluded, gave `iϛʹ` and gives `16`).
  A kept letter also ended its word: `σο`, with omicron excluded, gave `ςο`,
  and a capital next to it was not among capitals (`ΘΕΟΣ`, epsilon excluded,
  gave `ThΕOS` and gives `THΕOS`). A kept letter is one literal, which
  `convertDetailed()` no longer reports as lost when a reader splits it into
  a letter and its marks (`τῷ` in transliteration). In Beta Code output, the
  marks of a kept Beta Code letter are no longer escaped as punctuation (`e)`
  gave `e]1`).
- Under `transliteration.upsilon: "y-with-ou-v-f"` alone, the `v` and `f`
  written for the upsilon of `αυ`, `ευ`, `ηυ` read back as that upsilon, with
  the accent the encoder moves onto the vowel: `aftós` gives `αὐτός`. They
  were read as text, which ended the word, so that title case wrote `Aftós`
  again as `AfTós`. Under `beta: "v"` and `phi: "f"`, as in
  `iso-843-type-2`, they still read back as beta and phi.
- BnF numerals (`transliteration.keraia: "bnf"`, as in `bnf-core`) stay as
  written when the output is converted again. An acute after a consonant,
  which bears no accent, reads back as the right keraia (`c̄́` gives `ϛʹ`),
  and a comma before `c̄` or `s̄`, the stigma and sampi of numerals, as the
  left keraia (`,c̄` gives `͵ϛ`). Both read as an accent and a comma, so that
  in capitals `c̄́` became `C̄́` the second time, and with the accents removed,
  the keraia went. With the acute accents removed, the right keraia is now
  written `ʹ`, since an acute after a vowel still reads back as an accent:
  `αʹ` gives `aʹ` (was `á`, then `a`). A small stigma or sampi is written
  only where the numeral reads back: `ϡαʹ` in capitals gives `S̄Á` (was
  `s̄Á`, then `S̄Á`).
- A lunate sigma that the options write where the source has a standard
  sigma is reported when it converts back otherwise. Under
  `transliteration.lunateSigma: "c"` and `greek.sigma: "lunate"`, `sōma`
  gives `ϲωμα`, which converts back to `cōma`; `convertDetailed()` reported
  no loss, and now reports `added-glyph-variant`.
- Beta Code no longer writes a small sigma before the digit 3 as `s3`, which
  read back as a lunate sigma: `ς3` gives `s23` (rc.8: `s3`, read back as
  `ϲ`). A capital sigma before `3` still gives `*s3`, since the TLG defines
  no code for it; `convertDetailed()` reports the loss
  (`added-glyph-variant`).
- A keraia followed by a digit is written as itself in Beta Code, `ʹ`, since
  `#` and a digit are a TLG character code: `αʹ1` gave `a#1`, which reads
  back as `αϟ`.
- In a numeral, which takes no breathing, the contextual `y` keeps its
  separation by a diaeresis, in both directions: `oyʹ` gives `οϋʹ` (was
  `ουʹ`), and `ὀυʹ` gives `oÿʹ` (was `oyʹ`, which read back as `ουʹ` and
  then gave `ouʹ`).
- Under `letterCase: "title"`, a coronis written as an apostrophe and read
  back started a word: `κἀγώ` gave `Ka’gṓ`, which then gave `Ka’Gṓ`. An
  apostrophe between two letters, with no space, no longer starts a word,
  which also changes an elision written without a space (`δ’ἐγώ` gives
  `Δ’ἐγώ`; rc.8: `Δ’Ἐγώ`).
- Under `upsilon: "y-with-ou-v-f"`, three spellings did not read back as
  written:
  - a `v` or `f` after an eta written `i` without a length mark (ISO 843
    Type 2 with `beta: "b"`): `ηὗρον` gives `hîvron`, which now reads back as
    `ηὗρον` (rc.8: `ἷvρον`);
  - a circumflex moved to epsilon, where `ê` is eta (ISO 843 Type 1, BnF):
    `εὖ` gives `’ẽf` (rc.8: `’êf`, which read back as eta);
  - a `v` or `f` before a coronis written as an apostrophe, which counted as
    the end of the word: `κεὐγένειαν` gives `kev’géneian`, which no longer
    gives `kef’géneian` when read back.
- Under `eta: "i"`, an iota with a macron is written like eta (`ī`), and an
  upsilon after it takes the separation diaeresis it would take after eta:
  `ῑῠ` gives `īy̆̈` (rc.8: `īy̆`, which read back as `ηῠ̈`).

## [1.0.0-rc.8] - 2026-11-11

Eighth release candidate for `1.0.0`. The API does not change. Following #47,
a capital consonant that stands alone is written in full capitals in
transliteration (`Θ` → `TH`), and the symbol forms of letters, such as `ϑ`,
are read as those letters. Conversion to transliteration is faster again, back
to rc.6 on long texts and about a quarter faster on words and sentences. A
capital sigma no longer records a medial shape. The next release candidate is
planned to keep glyph variants, such as `ϲ` and `ϐ`, in Greek output by
default.

### Added

- The symbol forms of letters are read as those letters in Greek, as `ϐ`
  already was: `ϑ`, `ϕ`, `ϖ`, `ϰ`, `ϱ`, `ϵ`, and the capital `ϒ`, with its
  accented forms `ϓ` and `ϔ` (#47). They were kept as text: `ϑεός` gave
  `ϑeós` in transliteration, its `ε` taken for the start of a word; it now
  gives `theós`, and `θεός` in Greek output, which writes the ordinary
  letters, as for `ϐ` ([Greek Unicode](docs/greek-unicode.md#letter-forms)).

### Changed

- A capital consonant that stands alone, as a letter name, a numeral, or a
  siglum, is written in full capitals in transliteration, like the capitals
  of a word in capitals (#47): `Θ` → `TH` (was `Th`), `ΘΕΟΣ Θ` → `THEOS TH`
  (was `THEOS Th`), `Ῥ` → `RH`, `Θʹ` → `THʹ`. Followed by a period, it is an
  abbreviated initial and keeps its first letter only: `Θ. Δημητρίου` →
  `Th. Dēmētríou`, as before. A vowel with a rough breathing on its own can be
  a word, such as the article at the head of a sentence, and is unchanged:
  `Ὁ δὲ` → `Ho dè`. Under `letterCase: "title"`, a lone capital keeps its
  first letter only. Both spellings read back as the same capital.
- Conversion to transliteration is faster, and its output is unchanged. The
  Latin spelling of each set of marks is kept from one call to the next with
  the same options, and the encoder follows the start of each word as it
  writes, instead of looking for it at every letter. Measured under Node.js 24
  against rc.7, a word or a sentence converts about 25 % faster, and a text of
  10,000 characters about 6 % faster, as fast as in rc.6.
  `convertDetailed()` also compares the source and the text read back faster,
  by about 8 % on long texts in every direction.

### Fixed

- A capital sigma no longer records a medial shape when Greek is read. It
  has none, but the reader recorded `medial-sigma` for `Σ`, so that under
  `greek.finalSigma: "preserve"` a word in capitals lowercased by
  `text.letterCase` kept a medial sigma at its end: `ΛΟΓΟΣ` gave `λογοσ` under
  `"lowercase"` and `Λογοσ` under `"title"`; it now gives `λογος` and
  `Λογος`. In the document that `parse()` returns, `Σ` has no `glyphVariant`,
  as `*s` read from Beta Code; the capital lunate `Ϲ` is still
  `lunate-sigma`. Lowercase source shapes are kept as before.

## [1.0.0-rc.7] - 2026-11-10

Seventh release candidate for `1.0.0`. The API does not change. Transliteration
writes the `h` of a rough breathing before a whole diphthong inside a word, as
ALA-LC prescribes (#44), and now reads back as it was written in the vowel
sequences where it did not, which an independent audit and a dictionary corpus
found. Beta Code writes parentheses with the TLG codes `[1` and `]1`, and
`convertDetailed()` locates each loss at the token that lost something. The
project leaves Deno for Node.js; the npm package is built by TypeScript. Unless
a problem is found, `1.0.0` will have the same content.

### Fixed

- Transliteration no longer drops or misplaces a rough breathing in a few
  vowel sequences that an independent audit found:
  - after a diphthong, an iota or upsilon with a rough breathing keeps its
    `h`: `αυἱ` gave `aui` and gives `auhi` (vowels pair from the left);
  - a vowel that has its own breathing keeps the `h` before the previous
    vowel: `ἁἱ` gave `hahi`, which read back as `αἱ`; it now reads back as
    `ἁἱ`;
  - where the `h` of the first vowel forms a digraph with the consonant before
    it, the pair is written as it reads back: `τἁἱς` gave `thahis`, written
    again `thhais`, and gives `thais`;
  - a coronis written as an apostrophe keeps the next vowel's `h` on its side:
    `τὠὑτό` gave `thō’ytó` and gives `tō’hytó`;
  - no diaeresis is written or read on a vowel that carries a breathing:
    `ὑἱός` gave `hyhïós`, which read back as an invalid `ὑἱ̈ός`, and gives
    `hyhiós`.
- In Beta Code, `*` before `[1` or `]1` is kept as text and the code read as a
  parenthesis, as after `*` before any character that is not a letter:
  `*[1a]1` gave `*[1α)` and gives `*(α)`.
- Transliteration writes a vowel pair as it reads back, so that the output
  converted again stays the same. A dictionary corpus showed four cases where
  it did not:
  - under `iso-843-type-2`, omega is written `o`, and Ionic `ωυ` is now
    written like `ου`: `ἑωυτοῦ` gave `heoytoû`, read back as the hiatus `οϋ`
    and written again `heoÿtoû`; it gives `heoutoû`. More generally, under
    `longVowels: "omit"`, the choice of `u` or `y` and the place of the `h` of
    a rough breathing follow the letters as they read back (`ηἱ` gives `hei`,
    like `εἱ`, under the default `eta`);
  - under `iso-843-type-2`, the apostrophe written for a coronis reads back
    as punctuation, after which `μπ` counted as the start of a word:
    `τοὔμπαλιν` gave `toú’mpalin`, written again `toú’balin`; the `μπ` now
    stays inside the word both times;
  - under `sbl-general`, which removes the accent that marks the hiatus of
    `υι`, `Θύιλλος` gave `Thyillos`, whose `yi` reads back as a hiatus and was
    written again `Thyïllos`; the diaeresis is now written at once, as it
    already was for a vowel followed by upsilon;
  - such a diaeresis is written before the accent, where a diaeresis of the
    source goes (`ÿ́`); it came after it (`ý̈`), and the two orders are
    different texts.

  A test now converts every pair of a vowel and iota or upsilon, with each
  mark that tells a hiatus from a diphthong, under every combination of the
  vowel options; it found the remaining cases, outside the presets: a
  coronis written as an apostrophe after the first vowel of a diphthong
  splits it in Latin (`τὠυτὸ` gives `to’ytò`), and a Greek coronis after an
  upsilon written `v` or `f` is written as the apostrophe it reads back as.
- Beta Code writes and reads parentheses with the TLG bracket codes `[1` and
  `]1`. They were written `(` and `)`, which are the breathings: `δῆσε(ν)`
  gave `dh=se(n)`, read back as `δῆσἑν̓` (a reported loss), and under the
  presets that remove the smooth breathing (`ala-lc-*`, `sbl-general`), the
  closing parenthesis disappeared when the output was converted again
  (`dhse(n)` → `dhse(n`). It now gives `dh=se[1n]1`, which reads back as
  `δῆσε(ν)`. The other TLG bracket codes (`[2`, `[10`…) are still kept as text.
- `convertDetailed()` reports each loss at the token that lost something, and
  with what it lost. When the output read back did not have the same letters
  as the source, the comparison guessed where the two agreed again, and could
  guess wrong: under `iso-843-type-2`, `παιδαγωγῶν` reported `γ` and `ῶ`
  instead of `ω`, and in a longer text a loss could land on another line, or
  on a token that lost nothing. Source and target tokens are now paired by
  their place in the output. Some codes become more precise: under the ISO 843
  presets, `ἄλφα` reports the smooth breathing it loses (`removed-diacritic`)
  instead of an unrepresented `ἄ`; under `ala-lc-ancient`, the `ὺ` of `ἐνγὺς`
  reports its grave accent instead of the letter. Whether a conversion is
  lossy is not affected. On the 289,857 lines of a dictionary corpus, under
  every preset, each line now reports the same losses alone and within the
  text.
- Transliteration writes the `h` of a rough breathing on the second vowel of a
  diphthong before the whole diphthong inside a word, as at its start and as
  ALA-LC prescribes ("the h precedes the romanized vowel or diphthong"):
  `χοὗτος` gave `chohũtos` and gives `chhoũtos`, `χοἱ` gave `chohi` and gives
  `chhoi` (#44). The reader follows: `chhoi` gave `χὁι`, a hiatus, and gives
  `χοἱ`; under `ala-lc-ancient`, `chhoutos` gave `χὁυτος`, written back
  `chhoytos`, and gives `χοὑτος`. After `t`, `p`, or `r`, the `h` now forms a
  digraph, a loss that `convertDetailed()` reports: `τοὑ` gave `tohu` and gives
  `thou`, which reads back as `θου`. As at the start of a word, an `h` before
  two vowels that can form a diphthong now gives the breathing to the
  diphthong: `mhaidēs` gave `μἁιδης` and gives `μαἱδης`, so `μἁιδης`, whose
  hiatus no accent marks, now reports `displaced-diacritic`, like `ἁι` → `hai`.

### Changed

- Under `phi: "f"`, as in both ISO 843 presets, `ph` reads as pi followed by a
  rough breathing, not as phi, so that the output is idempotent: `πἡ` is
  written `phī` (`iso-843-type-1`), which gave `fī` when converted again and
  now stays `phī`. A `ph` typed for phi in such text is no longer read as phi:
  `philosophía` gave `φιλοσοφία` and gives `πἱλοσοπἵα`.
- Under `chi: "kh"` with `lunateSigma: "c"`, `ch` reads as a lunate sigma
  followed by a rough breathing, not as chi: `ϲἡ` is written `chē`, which gave
  `khē` when converted again and now stays `chē`.
- Under `chi: "kh"` with `nasalGamma: "nasal-except-kappa"` or
  `"nasal-medial-kappa"`, `gkh` before a vowel reads as gamma, kappa, and a
  rough breathing, not as gamma and chi: `γκἡ` is written `gkhē`, which gave
  `nkhē` when converted again and now stays `gkhē`.
- The project leaves Deno, whose development is to end in 2027, for Node.js 24:
  tests run on `node:test`, types are checked by TypeScript, formatting is
  done by dprint with Deno's style, and linting by oxlint. The library itself
  is unchanged and still has no dependencies; it is still published on JSR and
  npm.
- The README and the [stability policy](docs/stability.md) no longer list
  supported runtimes: the library is standard ECMAScript 2022, with no
  runtime-specific API. The npm `engines` field still declares the Node.js
  versions on which the test suite runs.
- The npm package is built by the TypeScript compiler instead of dnt. Its
  exports, declarations, and files are the same, without dnt's `Object.hasOwn`
  polyfill module, which Node.js 24 does not need, and its `package.json`
  declares `"type": "module"`.

## [1.0.0-rc.6] - 2026-10-29

Sixth release candidate for `1.0.0`. It settles the public API for the stable
release: the ten convenience functions are removed, the options are regrouped by
what they describe, the `removeDiacritics` flag becomes `diacritics.all`, the
default transliteration is the SBL academic style, and option errors are
`OptionError`s. Every removed function, key, and flag has a one-line replacement
in the migration guide, and an old key or flag throws an error that names it. It
also adds positions: where each token was read and written. Beta Code now
writes and reads vowel quantity with the TLG codes.

### Added

- `diacritics.all`, which sets every diacritic class at once and yields to a
  class named alongside it (`{ all: "remove", roughBreathing: "preserve" }`). It
  is expanded where it is written, so a caller's `all` overrides every class a
  preset set. The presets that remove most marks are written with it.
- `OptionError`, a `RangeError` thrown for an unknown preset, option key, or
  option value, and for the one incompatible pair of values, with the option's
  `path`, what was `received`, what is `accepted`, and the `replacement` of a
  key or value an earlier release candidate knew.

- Positions. `convertDetailed()` returns `spans`, one per token of the parsed
  source: where the token was read in the input (`inputStart`, `inputEnd`) and
  where its output was written (`outputStart`, `outputEnd`), and each
  `ConversionLoss` carries the `offset` and `length` of its token in the input.
  The `./document` entry point gains `parseDetailed()`, which returns the
  document with the input span of each token. Positions are offsets in UTF-16
  code units in the input as supplied and in the output as returned: a
  character that normalization leaves unchanged, or changes on its own, keeps
  its own units, and the tokens of a group that it composes, decomposes, or
  reorders share the group's range. Starts and ends
  never decrease; the grouping and sharing rules (tokens read from one
  character, a token read from part of a character inside the previous one's
  span, tokens written as one, tokens with no output) are in the
  [conversion-analysis contract](docs/conversion-analysis.md#positions). A bound
  converter reports the same positions, before its own spellings are substituted
  on input and after its custom forms are written on output, and its
  `CharacterScopeDiagnostic`s carry the `offset` and `length` of the character
  they report, in results and in `CharacterScopeError`. `convert()` is unchanged
  in output and speed; `convertDetailed()` costs about a microsecond more than
  in `1.0.0-rc.5` on a word (0.6 to 1.3 µs), 3 to 5 µs more on a sentence, and
  10 to 25 % more on long texts.

### Changed

- The options are grouped by what they describe. `orthography` and `unicode` are
  replaced by `transliteration` (the Latin writing system, 20 keys), `greek`
  (letter shapes, accentuation, assimilation, and the Unicode form of the
  output; `sigma` and `doubleRho` reach Beta Code too), `betaCode` (`case`,
  `yot`, formerly `betaCodeCase` and `betaCodeYot`), and `text` (`letterCase`,
  `whitespace`, `numerals`, in every format); `diacritics` is unchanged. Keys
  and values keep their names and meanings, and output is unchanged. The types
  `OrthographyOptions` and `GreekUnicodeOptions` are replaced by
  `TransliterationOptions`, `GreekOptions`, `BetaCodeOptions`, and
  `TextOptions`; `DEFAULT_CONVERSION_OPTIONS`, `CONVERSION_OPTION_VALUES`, and
  `ResolvedConversionOptions` follow.
- Without a preset, transliteration follows the SBL academic style: the default
  `upsilon` is `"y-with-diphthong-u"` (`ψυχή` → `psychḗ`, `ὑΐδιον` → `hyḯdion`),
  as `sbl-academic`, `sbl-general`, and both ALA-LC presets already wrote it.
  About six words in a hundred of a classical text change; `perseus` and
  `tlg-core`, which set nothing for Latin, follow the default. Reading follows:
  `u` and `y` are both upsilon, and a `y` after a vowel is read as a hiatus, as
  under `sbl-academic`.
- `Converter` is exported as a type only: `createConverter()` is the one way to
  make one. `OutOfScopeBehavior`, the type of a preset's metadata, is renamed
  `PresetOutOfScopeBehavior`, next to `ConverterOutOfScopeBehavior`.
- `CharacterScopeDiagnostic.index` now indexes the source document as the
  conversion prepared it, like `losses.index` and `spans`, rather than the
  document as read: a character preserved as several literals is reported at the
  first of them, and the diagnostics after it shift accordingly (see the
  migration guide).

### Fixed

- Beta Code writes and reads vowel quantity with the TLG codes, `%26` for the
  macron and `%27` for the breve, as `0.14.x` did: `ᾱ` → `a%26`, `ᾰ` → `a%27`,
  `ᾱ̓́` → `a)/%26`, for every preset, `tlg-core` included. The 1.0 prereleases
  wrote `&` and `'`, which in TLG Beta Code shift to the Latin font and write
  the apostrophe; they are now read that way: `&` is kept as text, and `'` is
  the apostrophe after any letter (`a'` → `α’`, was `ᾰ`).

### Removed

- The ten convenience functions: `greekToBetaCode`, `greekToTransliteration`,
  `betaCodeToGreek`, `betaCodeToTransliteration`, `transliterationToGreek`,
  `transliterationToBetaCode`, `removeDiacritics()`, `foldGreekVariants()`,
  `formatGreekUnicode()`, and the debugging helper `toUnicodeCodePoints()`. Each
  was one call to `convert()` or `reencode()` with fixed arguments; the README's
  recipes and the migration guide give those calls.
- The `removeDiacritics: true` flag, replaced by `diacritics.all: "remove"`. The
  flag also kept the rough breathing's `h` in transliteration and forced `sigma`
  and `finalSigma` to `"preserve"`; both are now ordinary options, shown as
  recipes in the README (_Remove all or some diacritics_).

## [1.0.0-rc.5] - 2026-10-26

Fifth release candidate for `1.0.0`. It brings transliteration closer to ISO 843
and settles the last option names before the stable release. Two option changes
break code written for `1.0.0-rc.4`: the values of `orthography.eta`, and
`orthography.modernDigraphs`, split into `muPi`, `nuTau`, and a value of
`nasalGamma` (see the migration guide). One combination of options is now
rejected, and a preset is added, `iso-843-type-2`. Output changes for capitals
spelled with several Latin letters among capitals (`THALASSA`, every preset),
for the perispomeni under `iso-843-type-1` (`toû`), and for eta under `eta: "i"`
with `longVowels: "circumflex"` (`î`); otherwise it is unchanged, and so is
speed, `ala-lc-modern` aside. Unless a problem is found, `1.0.0` will have the
same content.

### Added

- Preset `iso-843-type-2`: the Type 2 transcription of ISO 843:1997, which
  follows pronunciation (identity documents, road signs, maps) and is not
  reversible by design. Examples: `Εύβοια` → `Évvoia`, `αυτός` → `aftós`,
  `άγκυρα` → `ágkyra`, `κλαμπ` → `klab`, `ημέρα` → `iméra`. A conformance corpus
  covers Table 2 and notes 3 to 10. It rests on four new option values, usable
  on their own:
  - `longVowels: "omit"` writes eta and omega without a length mark (stigma and
    sampi keep their macron); a circumflex or an iota subscript on `e`, `i`, or
    `o`, which only the long vowel can bear, still reads back as eta or omega
    (`tôn` → `τῶν`);
  - `nasalGamma: "nasal-except-kappa"` writes `γκ` as `gk` and the other nasal
    gammas as `n`;
  - `muPi: "b-initial-final"` writes `μπ` as `b` at either end of a word (see
    the split of `modernDigraphs` below);
  - `upsilon: "y-with-ou-v-f"` writes the upsilon of `αυ`, `ευ`, `ηυ` as `v`
    before a voiced sound and `f` before a voiceless one or at the end of a
    word, and moves its accent to the vowel; `ου` stays `ou`.

### Changed

- `orthography.eta` takes `"e"` or `"i"` instead of `"e-macron"` or
  `"i-macron"`: it chooses the Latin letter of eta, and `longVowels` its mark,
  as for omega. `eta: "i"` with `longVowels: "circumflex"` now writes `î`
  (`"i-macron"` kept `ī` whatever `longVowels` said) and reads it back as eta;
  under that mark, `ī` is iota with a macron again, so `ῑ` is no longer confused
  with eta. Other output is unchanged. An old value throws a `RangeError` that
  names its replacement. See the migration guide.

- `orthography.modernDigraphs` is replaced by one option per letter pair, so
  that each rule can be combined with the others and no rule depends on a
  preset's name: `muPi` (`"mp"`, `"b-initial"`, `"b-initial-final"`), `nuTau`
  (`"nt"`, `"d-initial"`, `"d-underline-initial"`), and
  `nasalGamma: "nasal-medial-kappa"` for the ALA-LC rule on `γκ`, which
  `modernDigraphs: "ala-lc"` handled apart from `nasalGamma`. `ala-lc-modern` is
  unchanged in output; overriding its `nasalGamma` now applies to `γκ` too. The
  old key throws a `RangeError` that names the new ones. See the migration
  guide.

- The documentation of custom characters (`createConverter({ characters })`) no
  longer presents them as word boundaries by contract. They still act as such
  today, so that a neighbouring sigma takes its final form and a neighbouring
  multi-letter capital keeps only its first letter in capitals; a `1.x` release
  may let them take part in their word and write a multi-letter uppercase form
  in full capitals among capitals. No case or word behavior is guaranteed for a
  form that spells more than one letter.

- Writing `μπ` or `ντ` as one letter tests the two letters before the costlier
  numeral context: `ala-lc-modern` transliterates long texts about 10 % faster
  than in `1.0.0-rc.4` (100,000 characters of Thucydides, medians of five
  processes). Other paths are unchanged in speed, and output is unchanged.

### Fixed

- A Greek capital spelled with several Latin letters is written in full capitals
  among capitals, for every preset and by default, after ISO 843 (Table 1 and
  note 11): `ΘΑΛΑΣΣΑ` → `THALASSA` (was `ThALASSA`), `ΧΘΩΝ` → `CHTHŌN` (was
  `ChThŌN`), `ΓΧ` → `NCH`. The `h` of a rough breathing or of rho follows:
  `ἙΛΛΑΣ` → `HELLAS` (was `HeLLAS`), `ΑἹΜΑ` → `HAIMA` (was `HaiMA`), `ΠΥΡΡΟΣ` →
  `PURRHOS` (was `PURRhOS`). Before lowercase text or for a lone letter, only
  the first letter is a capital, as before: `Θάλασσα` → `Thálassa`, `Θ.` →
  `Th.`. A capital rough-breathing group such as `ΑἹ` or `ΟἹ`, rendered `Hai`
  and `Hoi` before, now reads back with its case, so `convertDetailed()` no
  longer reports `changed-case` for it. Earlier spellings are still read as
  before. Compared with `1.0.0-rc.4` over 52,000 conversions (13 option
  settings, mixed-case text): no other output changes, no new loss.

- `iso-843-type-1` writes the perispomeni as a circumflex, as ISO 843 Table 3
  prescribes for both types: `τοῦ` → `toû` (was `toũ`). The README quick start
  changes accordingly (`tō̂n`, `eipeîn`, `pleîston`).

- `longVowels: "circumflex"` with `circumflexAccent: "circumflex"` wrote `ῆ` as
  `ê̂`, which read back as `η` without its accent, so the output was not
  idempotent. The combination is now rejected with a `RangeError`, including
  when one value comes from a preset (`bnf-core`, and `iso-843-type-1` since it
  writes the perispomeni as a circumflex).

- A capital `B` read as `μπ` (or `D̲` as `ντ`) among capitals now gives `ΜΠ`
  (`ΝΤ`): `BAMPAS` reads back as `ΜΠΑΜΠΑΣ` instead of `ΜπΑΜΠΑΣ` under
  `ala-lc-modern` and `iso-843-type-2`.

- The `iso-843-type-1` metadata records that note 2 (a Latin `s` before a hyphen
  is read back as medial sigma) is not followed: the parser takes the hyphen as
  a word boundary.

## [1.0.0-rc.4] - 2026-10-25

Fourth release candidate for `1.0.0`. It only makes the library faster. Compared
with `1.0.0-rc.3`, converting a long text is 2 to 3 times as fast (Greek →
transliteration on Thucydides, book I: 2.4 to 3 times, depending on the
machine), a short conversion about 3 times as fast, and a word converted with a
preset about 6 times as fast; a Greek → transliteration conversion allocates 7
to 8 times less memory. The entries below give the share of each change. The API
and the output are unchanged (more than two million comparisons with
`1.0.0-rc.3`, errors included). Unless a problem is found, `1.0.0` will have the
same content.

### Changed

- The three readers work on UTF-16 code units instead of one string per
  character, with small lookup tables indexed by code unit (under 10 KB in all);
  marks are gathered in a bitmask everywhere. On Thucydides, book I (10,000 and
  100,000 characters), reading is about 3 times as fast for Greek, 2 to 2.5
  times for Beta Code, and 1.7 to 2.6 times for transliteration, and conversions
  are 1.15 to 1.8 times as fast; reading a short sentence is about twice as
  fast. The exact factors depend on the machine. Output is unchanged (441,936
  conversions and parses compared with `1.0.0-rc.3`, plus 150,000 parses of
  random strings: 10,000 per reader, transliteration under 13 option settings).

- The transliteration encoder writes the marks of a letter once per combination
  of marks instead of building them at every letter, finds diphthongs without
  building a string per pair, and reads which marks the options remove as a
  mask. Encoding to transliteration is about twice as fast, and Greek →
  transliteration 1.5 to 1.65 times as fast, on Thucydides, book I (10,000 and
  100,000 characters); other paths gain up to 20 %. Output is unchanged (441,936
  conversions and parses compared with `1.0.0-rc.3`, plus 414,000 encodings of
  random texts under 23 option settings, half of them with caller-built
  diacritic sets).

- `convert()`, `convertDetailed()`, `removeDiacritics()`, `foldGreekVariants()`
  and the converters returned by `createConverter()` resolve their options once
  per call. They used to pass the resolved options to `parse()` and `encode()`,
  which validated and copied all of them again: about three quarters of the time
  of a short conversion. Converting one word is about 4 times as fast (Greek →
  transliteration with a preset: 24 µs → 6 µs), and so is converting Thucydides
  1.1–10 one word per call (1,672 calls: 40 → 10 ms; 87 → 33 ms on the first
  pass of a process). `parse()`, `encode()` and `resolveConversionOptions()`
  behave as before. Outputs and errors are unchanged (1,442,718 comparisons with
  `1.0.0-rc.3`, invalid inputs and options included).

- Conversions read Greek and Beta Code into tokens shared by every occurrence of
  the same grapheme or literal, instead of one new object per letter, and the
  preparation of diacritics copies a token only when an option removes one of
  its marks, once per distinct token. `parse()` still returns tokens of its own,
  which callers may modify. A conversion allocates about 40 % less memory; on
  Thucydides, book I (100,000 characters), conversions from Greek are 7 to 8 %
  faster with the default options and 23 to 48 % faster with `ala-lc-ancient`,
  and short conversions do not change. Outputs and errors are unchanged
  (1,457,622 comparisons with `1.0.0-rc.3`, and 840,000 conversions of random
  texts).

## [1.0.0-rc.3] - 2026-10-21

Third release candidate for `1.0.0`. It fixes one conversion rule: Greek output
no longer rewrites a labial or a velar before sigma as `ψ` or `ξ`, which altered
correct text such as `ἔκστασις`. The API is unchanged. Unless a problem is
found, `1.0.0` will have the same content.

### Fixed

- Greek output no longer contracts a labial or a velar before sigma to `ψ` or
  `ξ`. Greek writes these pairs where a prefix meets a stem, so the rule altered
  correct text: `ἔκστασις` and the TLG's `e)/kstasis` both became `ἔξτασις`. Psi
  and xi are still read from their own spellings (`y` and `c` in Beta Code, `ps`
  and `x` in transliteration); a transliterated `ks` is now read as two letters
  unless `orthography.xi` is `"ks"`. The opt-in `dentalSigma: "assimilate"` is
  unchanged.

## [1.0.0-rc.2] - 2026-10-21

Second release candidate for `1.0.0`. It changes one type of the advanced
`./document` entry point, which a stable release could no longer change:
`Grapheme.diacritics` becomes read-only, so that graphemes can share their
diacritic sets; see the [migration guide](MIGRATION.md). Conversion output is
unchanged, conversion is faster on long texts, and parsing transliteration under
`orthography.eta: "i-macron"` is linear again. The ordinary conversion functions
are not affected. Unless a problem is found, `1.0.0` will have the same content.

### Changed

- `Grapheme.diacritics` is typed `ReadonlySet<Diacritic>` instead of
  `Set<Diacritic>`. The sets built by the library are shared between the
  graphemes that carry the same marks (at most 1,024 combinations), so parsing
  no longer allocates one set per letter; their `add`, `delete`, and `clear`
  throw a `TypeError`. Assign a new set to change a grapheme's marks. Any `Set`
  is still accepted, and structural equality with one still holds.
- Conversion is 1.1 to 2.6 times faster on texts of 10,000 to 1,000,000
  characters (median of five runs), mostly through less garbage collection;
  encoders also compute the rendered marks once per combination rather than once
  per letter.
- Losses reported for several marks of one grapheme follow the canonical mark
  order instead of the order of the marks in the source spelling; losses remain
  in source-token order. Output is otherwise unchanged (442,584 conversions and
  parses compared with `1.0.0-rc.1`).

### Fixed

- Parsing transliteration with `orthography.eta: "i-macron"` (used by the
  `iso-843-type-1` preset) took time quadratic in the length of the text: each
  `i` searched the rest of the text for a macron. It is linear again, with the
  same results (180,000 parses compared with `1.0.0-rc.1`).

## [1.0.0-rc.1] - 2026-10-19

Release candidate for `1.0.0`. The stable release prepared as `1.0.0` on
2026-09-30 was not published; a review before publication led to the changes
below. Some option identifiers are renamed and some conversion output is
corrected; see the [migration guide](MIGRATION.md) for the renames. Unless a
problem is found, `1.0.0` will have the same content.

### Added

- The README is reorganized around tasks, opens with a Thucydides quick start,
  and documents the option groups, the loss codes, and the error behavior. Every
  TypeScript example in it is type-checked and executed by `deno task check`,
  and its output must match the `// →` comment beside it.
- `CITATION.cff` describes how to cite the library; GitHub offers it as "Cite
  this repository".
- `deno task bench` measures conversion throughput as a baseline for future
  changes.
- A [stability policy](docs/stability.md) states what the version number covers
  from `1.0.0` on: the documented contract rather than the bytes of a release,
  with corrections of output toward the documentation or a preset's reference
  classified as patches, additions of codes, options, and presets as minor
  releases, and open diagnostic unions.
- A property-based invariant suite (`tests/invariants_corpus_test.ts`) checks,
  for every preset and every format pair over a deterministic corpus of
  difficult forms, that canonical output is idempotent, that reparsed output is
  a valid document outside the documented boundaries, and that a conversion
  reported as lossless converts back to the same canonical source.
- `FORMATS` lists the supported format identifiers, and
  `CONVERSION_OPTION_VALUES` lists every option key with its accepted values;
  the playground's option suggestions are derived from that table.
- `convertDetailed()` reports `inferred-breathing` when transliteration of an
  unmarked initial vowel (monotonic or uncial Greek such as `άνθρωπος` or
  `ΑΙΔΗΣ`) reads back with a smooth breathing the source did not have. Such a
  conversion was previously reported as lossless although the round trip changed
  the text.
- `convertDetailed()` reports `displaced-diacritic` when a source breathing is
  reread on the following vowel of the target, instead of the misleading
  `removed-diacritic`. The breathing is retained; the hiatus it marked is not.

### Changed

- Conversion is about twice as fast from Greek and Beta Code, and about four
  times as fast from transliteration, on 20 000-character inputs: Greek case
  mapping is cached per character, the oxia substitution runs in one pass, and
  parsers no longer copy each grapheme's diacritic set. Output is unchanged.
- Greek output writes a macron or breve before the other marks of its vowel,
  following the typographic convention that the quantity sits on the letter with
  breathing and accent above it. `ᾱ́` is now U+1FB1 U+0301 instead of U+1F71
  U+0304, and `ἀ̄` becomes `ᾱ̓` (U+1FB1 U+0313). The canonical document is
  unchanged and either order is still accepted as input; Beta Code keeps the TLG
  order.
- The npm package requires Node.js 24 or later (`engines.node: ">=24"`),
  declares `sideEffects: false` so that bundlers can drop unused exports, and
  carries an up-to-date description. `RELEASING.md`, a maintainer procedure, is
  no longer included in the JSR and npm packages.
- Option identifiers follow one naming rule: `diacritics.X` asks whether a mark
  class is kept, `orthography.X` how X is written in the target format,
  `unicode.X` which scalar represents it; and every accepted value is ASCII.
  Accordingly `orthography.quantityTransliteration` is now
  `orthography.quantity`, `orthography.yotBetaCode` is
  `orthography.betaCodeYot`, and `orthography.eta` takes `"e-macron"` or
  `"i-macron"` instead of `"ē"` or `"ī"`. The value types
  `TransliterationHyphen`, `CoronisOrthography`, `UpsilonOrthography`,
  `LongVowelOrthography`, `NasalGammaOrthography`, `ModernDigraphOrthography`,
  and `YotBetaCode` are renamed `HyphenTransliteration`,
  `CoronisTransliteration`, `UpsilonTransliteration`,
  `LongVowelTransliteration`, `NasalGammaTransliteration`,
  `ModernDigraphTransliteration`, and `BetaCodeYot`, so that the suffix names
  the format a policy applies to. See the migration guide.
- Conversion options are validated strictly. An unknown option key, an unknown
  option value, or an option of the wrong type now throws (`RangeError` for
  unknown identifiers and values, `TypeError` for wrong types) instead of being
  silently replaced by the engine default. A field set to `undefined` is still
  treated as absent.
- The transliteration parser infers a smooth breathing only when the selected
  orthography writes smooth breathings. Under `accentuation: "monotonic"`,
  `removeDiacritics: true`, or `diacritics.smoothBreathing: "remove"` (as in the
  ALA-LC and SBL general presets), an unmarked initial vowel stays unmarked in
  the canonical document. As a consequence, a preset that removes the smooth
  breathing now reports that removal for polytonic sources instead of hiding it
  behind the reparse.
- An unknown format identifier throws `RangeError("Unknown format: …")` from
  `convert()`, `convertDetailed()`, `parse()`, `encode()`, and the `Converter`
  methods; `convert()` with an unknown target format previously returned
  `undefined`. Non-string input throws a `TypeError` with a clear message.

### Fixed

- Reading transliteration took time quadratic in the length of the text: the
  parser copied the whole document at every word-initial vowel. 80 000
  characters took 2.5 s and now take about 60 ms; `convertDetailed()`, which
  reads its target back, benefits for every target format. A scaling test now
  guards every format against superlinear cost.
- `accentuation: "monotonic"` no longer accents monosyllables. Polytonic `καὶ`,
  `τῶν`, `δὲ` gave `καί`, `τών`, `δέ`; they now give `και`, `των`, `δε`, as
  monotonic orthography requires. The exceptions are identified from the
  polytonic marks: disjunctive `ἤ`/`ἢ` gives `ή`, interrogative `ποῦ` and `πῶς`
  give `πού` and `πώς`, and monotonic input is unchanged. Monosyllables by
  synizesis (`γιὰ`, `μιὰ`) keep their accent, because recognizing them needs
  knowledge of the word.
- A breathing or accent written on the first vowel of a pair that could form a
  diphthong is now read as the hiatus or iota-adscript signal it is (`Ἅιδῃ`,
  `Ἀίδης`, `ἀίδηλος`, `ἄυλος`), instead of being moved onto the second vowel.
  Previously `Ἅιδῃ` became the invalid `Άἱδῃ` and the change was not reported as
  a loss. Greek and Beta Code conversions now preserve these forms;
  transliteration keeps a first-vowel accent, and `convertDetailed()` reports
  the loss when a hiatus is marked only by a breathing.
- A hiatus marked only by a breathing on its first vowel is not compensated with
  an inferred diaeresis in transliteration, because the same spelling also marks
  an iota adscript; `smoothBreathing: "greek"` or `"apostrophe"` keeps it
  reversible.
- Removing a diaeresis or an iota subscript no longer turns `ἄϋλος` or `ᾄυ` into
  a diphthong while the first vowel still carries its marks.
- Under the contextual upsilon rules (`y-with-au-eu-ou`, `y-with-diphthong-u`),
  a `y` read after a vowel that could form a diphthong no longer always receives
  a diaeresis. At word start the separation is carried by the breathing on the
  first vowel, as Greek writes it (`ay → ἀυ`, `hay → ἁυ`), so `ἀυτμή` and `ἁυ`
  convert back and forth exactly under `bnf-core` and `ay` is canonical. Where
  no breathing is written or inferred, the encoder writes the diaeresis at once
  (`ἄυλος → aÿlos` under `sbl-general`, `ἀυτμή → ’aÿtmī́` under `iso-843-type-1`)
  instead of producing text that a second conversion changed.
- Transliteration no longer infers a smooth breathing on an initial vowel that
  carries a diaeresis (`ḯ`, `ü`, `Ï`). The result was a document that
  `validateDocument()` rejects as `incompatible-diaeresis-breathing`, and
  `ΐδιος` did not survive a round trip.
- Transliteration writes the combining marks of one vowel in a single canonical
  order: quantity, breathing, diaeresis, accent. An explicit macron is now
  spelled like the structural macron of eta and omega (`ā́` like `ḗ`). Previously
  `ῑ́` rendered as `í̄`, which `iso-843-type-1` reread and rewrote as `ī́`,
  breaking idempotence. Output changes only where an explicit macron or breve
  meets another mark (`á̄` → `ā́`, `ã̄` → `ā̃`); input in either order is still
  accepted.
- A macron or breve on epsilon or omicron is omitted from transliteration,
  because `ē` and `ō` denote eta and omega, and `convertDetailed()` reports the
  removed mark instead of producing text that reparses as another letter.

### Companion website (not included in JSR or npm)

- Each format is shown in its own typeface: a polytonic-capable serif for Greek
  and transliteration, a monospace face for Beta Code, whose marks are letters.
- The page state is kept in the address, so "Copy link" shares a conversion with
  its standard and options; the equivalent library call is shown and can be
  copied.
- Diagnostics are grouped by kind and show the affected letters; a standard's
  references and known limits can be expanded in place.
- Examples are complete scenarios, starting with Thucydides 1.1.2; the page
  follows the system dark mode and fits narrow screens.
- Loss messages name diacritics in full ("the smooth breathing").

## [1.0.0-beta.9] - 2026-09-30

### Added

- Documented ownership, mutation, copying, option reuse, and converter
  boundaries for the supported `./document` entry point, including the fact that
  document validation does not certify source syntax and that lossy orthographic
  views must not replace the reusable parsed source.
- The npm package check now type-checks a separate consumer of the packed
  `./document` entry point and its generated declarations.
- `validateDocument()` reports unknown letters and diacritics and invalid glyph
  variants on manually modified documents before encoding.

### Changed

- The audited `./document` entry point is now documented as a supported advanced
  API, with explicit ownership and validation boundaries.

### Fixed

- The public `applyGreekOrthography()` helper now resolves preset options like
  `parse()` and `encode()` instead of silently ignoring them, and returns an
  independent document whose tokens and diacritic sets can be edited without
  changing the source.
- `validateDocument()` now diagnoses malformed document tokens instead of
  throwing during contextual validation of neighboring graphemes, including
  missing entries in a sparse document.
- Incomplete uppercase Beta Code prefixes retain their marks as literal text
  instead of silently dropping them during parsing.
- `validateDocument()` accepts a final-sigma source variant after a case policy
  changes the grapheme to uppercase; the variant remains source provenance.

### Companion website (not included in JSR or npm)

- Added a browser playground for the three formats, presets, conversion options,
  character repertoires, and loss and scope diagnostics, hosted on GitHub Pages
  and built from the current `main` branch.
- Presented the controls and diagnostics in English, and added contextual JSON
  suggestions for conversion options and custom character inventories.
- Kept the canonical document visible after strict scope rejection and fixed
  placeholder visibility and stale example selection.

## [1.0.0-beta.8] - 2026-09-26

### Added

- A source-traceable conformance corpus for the published ALA-LC Ancient and
  Modern Greek tables, with inverse stability and information-loss checks.
- A source-traceable BnF and ISO 843 Type 1 conformance corpus with forward
  output, inverse stability, loss expectations, and documented open rules.

### Fixed

- Both ALA-LC presets convert the documented `στʹ` form of six and thousands
  marked only by the leading sign (`͵α`, `͵αα`) to decimal numbers. The ancient
  preset reference now points to the published Ancient Greek table.
- `iso-843-type-1` renders the enotikon as a Latin hyphen and reports its
  ambiguous inverse; the new `orthography.enotikon` option controls this
  target-specific rendering.
- `bnf-core` renders marked uppercase stigma and sampi numerals with lowercase
  Latin letters, while leaving unmarked archaic capitals uppercase; detailed
  conversion reports the case lost in marked numerals.
- `bnf-core` parses the `ch` digram as chi before considering standalone `c` as
  Byzantine sigma, so its `Chará` and `téchnē` transliterations can be read back
  correctly.
- `bnf-core` preserves the BnF's typographic U+2010 hyphen in Latin output.

## [1.0.0-beta.7] - 2026-09-25

### Changed

- Starting with this release, the project is distributed under the MIT License
  instead of AGPL-3.0-or-later. Earlier published releases retain their original
  license.

### Added

- `createConverter({ outOfScopeBehavior: "reject" })` rejects recognized
  characters outside the preset or custom repertoire and exposes all source
  diagnostics through the public `CharacterScopeError`.
- Bound ISO 843 Type 1 converters now report undefined transliterations for
  stigma, koppa, and sampi, and the unresolved identification of archaic koppa.
  Preservation retains the source glyph; strict mode rejects it. Decimal
  conversion of marked numerals remains available explicitly.
- Audited each bundled preset's diacritics, punctuation, and numerals against
  its cited references; documented reversibility and remaining contextual
  boundaries in `docs/preset-behavior-audit.md`.
- Target-specific orthography choices for smooth breathing, circumflex, and
  explicit quantity marks in transliteration.

### Fixed

- `bnf-core` and `iso-843-type-1` transliterate `αυ`, `ευ`, and `ου` as `au`,
  `eu`, and `ou` while retaining `y` for other upsilons. The new
  `orthography.upsilon: "y-with-au-eu-ou"` setting also preserves those
  distinctions when parsing transliteration.
- `bnf-core` renders the right keraia as an acute and the left keraia as a comma
  in transliteration through `orthography.keraia: "bnf"`. The inverse is
  ambiguous for some accented vowels; `convertDetailed()` reports the
  information loss.
- `bnf-core` preserves the smooth breathing on the Latin letter, emits a
  combining circumflex (U+0302), and omits explicit macrons and breves in
  transliteration, in line with its reference.
- `iso-843-type-1` prefixes an initial smooth breathing with an apostrophe. The
  Greek question mark and ano teleia retain their distinct `?` and `;`
  transliterations.
- Transliteration with either of those presets no longer invents a smooth
  breathing from unmarked Latin input.

## [1.0.0-beta.6] - 2026-09-23

### Fixed

- `removeDiacritics` retains Greek sigma glyphs by default, including
  noncontextual `σ` and `ς` and lunate `ϲ`. Explicit orthographic policies still
  control sigma output. `finalSigma: "preserve"` is available for same-format
  conversions that need the same behavior.

### Added

- `createConverter({ preset })` binds preset options and enforces audited
  built-in character boundaries while preserving and reporting out-of-scope
  input.

## [1.0.0-beta.5] - 2026-09-23

### Changed

- `removeDiacritics` preserves the Latin `h` of rough breathing in
  transliteration, including `rh`. Greek and Beta Code still remove the mark;
  explicit `diacritics.roughBreathing: "remove"` suppresses the `h`.
- Transliteration emits ASCII `-` by default. Set
  `orthography.hyphen: "typographic"` to request U+2010.
- Audited the built-in character inventory against every preset reference and
  documented exact matches, known mapping differences, undefined conversions,
  numeral-only characters, and repertoire boundaries.

### Fixed

- `bnf-core` now transliterates both koppa forms as `q`, as prescribed by the
  BnF table.
- `tlg-core` now emits and recognizes `#401` for yot while the default Beta Code
  spelling remains `j`.

### Removed

- The optional `GreekText` facade. Use the functional conversion API for
  ordinary calls or `parse()` and `encode()` to reuse one canonical document.

## [1.0.0-beta.4] - 2026-08-29

### Added

- `createConverter()` and immutable `Converter` instances for registering
  built-in-letter aliases, opaque custom characters, exact character
  allow-lists, and semantic exclusions.
- Separate `out-of-scope-character` diagnostics for characters preserved by a
  restricted converter repertoire.

### Fixed

- JSR receives the explicit `AGPL-3.0-or-later` SPDX identifier instead of
  inferring `AGPL-3.0-only` from the license text.

## [1.0.0-beta.3] - 2026-08-26

### Added

- `betaCodeCase` separates lowercase/uppercase ASCII presentation from the
  semantic letter case represented by `*`.

### Changed

- The README now identifies the target format and intended use of every bundled
  preset.
- The README introduction and Beta Code guidance now describe the current
  conversion engine and canonical spelling rules directly.

### Fixed

- Beta Code ASCII letter case is ignored on input; only a preceding asterisk
  produces an uppercase Greek grapheme.
- Canonical Beta Code places ordered diacritics after lowercase letters and
  before uppercase letters, except for the trailing iota subscript.
- The Perseus and TLG presets select lowercase and uppercase ASCII output
  respectively without changing the represented Greek letter case.

## [1.0.0-beta.2] - 2026-08-26

### Added

- `foldGreekVariants()` for normalizing medial beta, lunate sigma, and final
  sigma glyphs without relying on Unicode compatibility normalization.
- `reencode()` as a same-format conversion shorthand.
- Public immutable defaults and resolved-option inspection through
  `DEFAULT_CONVERSION_OPTIONS`, `ResolvedConversionOptions`, and
  `resolveConversionOptions()`.
- Typed preset metadata, references, coverage, out-of-scope behavior, option
  inspection, and generated preset documentation.
- A lowercase Perseus Beta Code preset, with Morpheus, Perseids Tools, and TLG
  references.
- Source provenance for lunate sigma, source-preserving sigma output, uniform
  medial-sigma output, `c` transliteration for provenanced lunate forms, and the
  `removed-glyph-variant` loss diagnostic.

### Changed

- The npm package is now published as `@humanities/greek-conversion`, matching
  its JSR name. The historical unscoped package remains on the `0.x` series.
- The TLG core preset now always emits uppercase Beta Code.
- The BnF core preset now contributes its mechanically expressible options and
  documents the remaining contextual or unsupported rules.
- `longVowels` now selects either `"macron"` or `"circumflex"`; the combined
  `"circumflex-macron"` rendering introduced in the first beta was removed.
- Preset scope, implementation coverage, references, and limitations are now
  documented from the same typed registry used at runtime.
- The README was reorganized to restore the presentation style of the legacy
  package while documenting the rewritten API.

### Fixed

- Package documentation links now resolve correctly on registry pages.
- Lunate sigma can round-trip across Greek, Beta Code, and transliteration
  without losing a known source glyph variant when preservation is requested.

### Removed

- The public `PRESETS` registry from the first beta; use `getPresetOptions()`,
  `getPresetMetadata()`, and `listPresetMetadata()` instead.

## [1.0.0-beta.1] - 2026-08-25

This prerelease is a complete rewrite of the `0.14.x` conversion engine.

### Added

- Bidirectional conversion between Greek, Beta Code, and scientific
  transliteration through one canonical document model.
- Structured information-loss diagnostics with `convertDetailed()`.
- Immutable, reusable `GreekText` representations.
- Standards-oriented presets for ISO 843 Type 1, ancient and modern ALA-LC,
  academic and general SBL, TLG core, and BnF core policies.
- Polytonic and mechanical monotonic Greek output.
- Granular diacritic, case, whitespace, Unicode, transliteration, and contextual
  orthography policies.
- Semantic Greek punctuation, archaic letters, and marked alphabetic numerals.
- Experimental canonical-document API at the `./document` entry point.

### Changed

- The public API is incompatible with `greek-conversion` `0.14.x`; see
  [MIGRATION.md](MIGRATION.md).
- The package is ESM-only. CommonJS and the historical browser bundle are not
  produced.

### Removed

- The `KeyType`, `Preset`, and `GreekString` runtime enums/classes from the
  legacy API.
- Parcel, Jest, and the legacy prebuilt distribution pipeline.

[Unreleased]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.10...HEAD
[1.0.0-rc.10]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.9...v1.0.0-rc.10
[1.0.0-rc.9]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.8...v1.0.0-rc.9
[1.0.0-rc.8]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.7...v1.0.0-rc.8
[1.0.0-rc.7]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.6...v1.0.0-rc.7
[1.0.0-rc.6]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.5...v1.0.0-rc.6
[1.0.0-rc.5]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.4...v1.0.0-rc.5
[1.0.0-rc.4]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.3...v1.0.0-rc.4
[1.0.0-rc.3]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.2...v1.0.0-rc.3
[1.0.0-rc.2]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-rc.1...v1.0.0-rc.2
[1.0.0-rc.1]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.9...v1.0.0-rc.1
[1.0.0-beta.9]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.8...v1.0.0-beta.9
[1.0.0-beta.8]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.7...v1.0.0-beta.8
[1.0.0-beta.7]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.6...v1.0.0-beta.7
[1.0.0-beta.6]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.5...v1.0.0-beta.6
[1.0.0-beta.5]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.4...v1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.3...v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.2...v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/defense-humanites/greek-conversion/releases/tag/v1.0.0-beta.1
