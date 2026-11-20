/** Controls marks added to a pair of consecutive rho in Greek output. */
export type DoubleRhoOrthography = "unmarked" | "smooth-rough";

/**
 * Selects the beta of Greek output. `"preserve"` writes `ϐ` where the source
 * notes it and `β` elsewhere; `"symbol"` writes `ϐ` inside a word and `β` at
 * its start, as French typography does, whatever the source; `"standard"`
 * writes `β` everywhere.
 */
export type MedialBetaOrthography = "preserve" | "standard" | "symbol";

/**
 * Selects the symbol forms of letters in Greek output: `ϑ`, `ϴ`, `ϕ`, `ϖ`,
 * `ϰ`, `ϱ`, `ϵ`, and `ϒ` with its accented forms `ϓ` and `ϔ`, and the final
 * sigma `ς` written for a stigma as the units of a numeral (`ιςʹ`, 16).
 * `"preserve"` writes those the source notes, and `"standard"` the ordinary
 * letters (`ιϛʹ`). No value writes a symbol form where the source has an
 * ordinary letter, which Unicode reserves them for mathematics. The beta
 * symbol `ϐ` follows `medialBeta`, and the lunate sigma `ϲ` follows `sigma`.
 */
export type SymbolFormOrthography = "preserve" | "standard";

/**
 * Selects how Greek output writes the signs that stand for several letters,
 * which reading the source gives as those letters: the καί symbol `ϗ`
 * (`και`), the ου ligature `ȣ` (`ου`), and the στ ligature `ϛ` that
 * `stigma: "ligature"` reads. `"preserve"` writes the signs the source has,
 * and `"standard"` the letters. No value writes a sign where the source has
 * the letters. Beta Code writes the TLG codes of `ϗ` and `Ϗ` (`#1532`,
 * `#1531`) and of the capital `Ȣ` (`#1521`) under `"preserve"`, and
 * transliteration always writes the letters.
 */
export type LigatureOrthography = "preserve" | "standard";

/**
 * Selects how Greek text reads a stigma between two letters. `"letter"`
 * reads it as the letter stigma, the numeral six (`ἐϛὶ` gives `ec̄ì`);
 * `"ligature"` as `σ` and `τ`, which older printing joined in that sign
 * (`ἐϛὶ` gives `estì`). A stigma after a letter but before none (`ιϛ`), or
 * before a keraia, is read as the letter either way. This option bears on
 * reading only: Greek output writes `ϛ` for `στ` only where the source has
 * it, under `ligatures: "preserve"`.
 */
export type StigmaReading = "letter" | "ligature";

/**
 * Selects the accent written on `καί` where the καί symbol `ϗ`, which marks
 * none, is written as letters: in transliteration, and in Greek and Beta Code
 * under `ligatures: "standard"`. `"none"` writes no accent (`και`, `kai`).
 * `"byzantine"` writes the grave, as Byzantine manuscripts do even before
 * punctuation (`καὶ`). `"modern"` follows modern editions: the acute before
 * punctuation, at the end of the text, and before an enclitic (`καί τινες`,
 * `καί μ’`), and the grave elsewhere (`καὶ ὁ`, `καὶ ἔστι`, `καὶ τίς`). Where
 * the form alone does not decide, it writes the grave before `οἱ` and before
 * an accented enclitic, and the acute before a comma and `σ’`. No accent is
 * written on a sign that has one, in capitals, or in a text with no grave
 * and no circumflex, which may be monotonic or unaccented. Each accent
 * written is reported as an added diacritic.
 */
export type KaiAccent = "none" | "byzantine" | "modern";

/**
 * Selects where Greek output writes a kept iota subscript.
 *
 * `"subscript"` writes it below the line, and after a capital as the
 * prosgegrammeni (`ᾳ`, `ᾼ`). `"capital-adscript"` writes it on the line after
 * a capital, as Smyth (§ 5) describes and as Unicode's uppercase mapping does
 * (`ᾨδῇ` → `Ὠιδῇ`, `ΤΗΙ ΩΙΔΗΙ`), and below the line elsewhere; `"adscript"`
 * writes it on the line after every vowel (`τῶι`), as some editions and
 * papyrological transcriptions do. An iota written on the line reads back as
 * the letter iota, so a conversion that writes one reports the loss of the
 * subscript.
 */
export type IotaSubscriptOrthography =
  | "subscript"
  | "capital-adscript"
  | "adscript";

/** Selects how a semantic coronis is represented in transliteration. */
export type CoronisTransliteration = "omit" | "apostrophe" | "greek";

/** Selects whether a known smooth breathing is rendered on a Latin letter. */
export type SmoothBreathingTransliteration = "omit" | "greek" | "apostrophe";

/** Selects the combining mark used for a transliterated circumflex accent. */
export type CircumflexTransliteration = "tilde" | "circumflex";

/** Selects whether explicit source quantity marks appear in Latin output. */
export type QuantityTransliteration = "preserve" | "omit";

/**
 * Selects contextual nasal gamma (`n`) or literal gamma (`g`).
 *
 * `"nasal"` writes `n` for gamma before gamma, kappa, xi, and chi (`γγ` →
 * `ng`, `γκ` → `nk`); `"nasal-except-kappa"` does so except before kappa
 * (`γκ` → `gk`), as ISO 843 Type 2 does; `"nasal-medial-kappa"` writes `γκ`
 * as `nk` inside a word and `gk` at its beginning or end, as ALA-LC does for
 * Modern Greek; `"literal"` always writes `g`.
 */
export type NasalGammaTransliteration =
  | "nasal"
  | "nasal-except-kappa"
  | "nasal-medial-kappa"
  | "literal";

/**
 * Selects the sigma glyph of Greek and Beta Code output. `"preserve"` writes a
 * lunate sigma where the source notes one (`ϲ`, Beta Code `s3`), numerals
 * included, and a standard sigma elsewhere; `"standard"` writes every sigma as `σ` or `ς`;
 * `"lunate"` writes every sigma as `ϲ`, except in numerals.
 */
export type SigmaOrthography = "preserve" | "standard" | "lunate";

/** Selects `s` or `c` for a provenanced lunate sigma in transliteration. */
export type LunateSigmaTransliteration = "s" | "c";

/**
 * Selects the shape of a standard sigma in lowercase Greek output.
 * `"preserve"` writes the shape the source notes, and places by its position
 * a sigma whose shape the source does not note; `"contextual"` places every
 * sigma by its position (`ς` at the end of a word, `σ` elsewhere);
 * `"medial"` writes `σ` everywhere. Under `"preserve"`, Beta Code writes a
 * noted shape that contradicts the place as `s1` (`σ`) or `s2` (`ς`), as the
 * TLG defines them; otherwise it writes `s`, whose shape the place decides.
 */
export type FinalSigmaOrthography = "preserve" | "contextual" | "medial";

/** Preserves marked alphabetic numerals or renders valid groups as decimals. */
export type NumeralOrthography = "alphabetic" | "decimal";

/**
 * Selects Greek keraia marks or the BnF comma and combining acute in Latin
 * output. Under `"bnf"`, an acute after a consonant reads back as the right
 * keraia, which a consonant cannot bear as an accent, and a comma before
 * `c̄` or `s̄`, the stigma and sampi of numerals, as the left keraia; after a
 * vowel, the acute reads back as an accent (`αʹ` and `ά` are both `á`). When
 * the acute accents are removed, the right keraia is written `ʹ`, which an
 * acute would not survive.
 */
export type KeraiaTransliteration = "greek" | "bnf";

/** Preserves a dental before sigma or applies the lossy assimilation. */
export type DentalSigmaOrthography = "preserve" | "assimilate";

/**
 * Selects how Greek output writes a final `π`, `τ`, or `κ` whose vowel is
 * elided before a word with a rough breathing. `"preserve"` keeps the
 * consonant the source writes: `ἀπ’ οὗ`, as Ionic prose and many editions
 * have it, stays, and so does `ἀφ’ οὗ`. `"aspirate"` writes the aspirated
 * consonant that Attic spelling requires (`ἀπ’ οὗ` → `ἀφ’ οὗ`, `κατ’
 * ἡμέραν` → `καθ’ ἡμέραν`); the conversion then reports the consonant it
 * replaced as lost. Beta Code and transliteration write the consonant of
 * the source in either case.
 */
export type ElidedStopOrthography = "preserve" | "aspirate";

/**
 * Selects the transliterated spelling of upsilon.
 *
 * `"y-with-ou-v-f"` follows ISO 843 Type 2: `y`, but `u` in the diphthong
 * `ου`, and in the diphthongs `αυ`, `ευ`, `ηυ` a `v` before a voiced
 * consonant (β, γ, δ, ζ, λ, μ, ν, ρ) or a vowel and an `f` before a voiceless
 * consonant (θ, κ, ξ, π, σ, τ, φ, χ, ψ) or at the end of a word; an accent on
 * that upsilon moves to the preceding vowel (`Εύβοια` → `Évvoia`). The `v`
 * and `f` are read back as beta and phi under `beta: "v"` and `phi: "f"`, as
 * in the `iso-843-type-2` preset, where the spelling is not reversible.
 * Otherwise they read back as that upsilon, with its accent.
 */
export type UpsilonTransliteration =
  | "u"
  | "y"
  | "y-with-diphthong-u"
  | "y-with-au-eu-ou"
  | "y-with-ou-v-f";

/**
 * Selects the mark that shows the length of eta and omega in
 * transliteration: a macron (`ē`, `ō`), a circumflex (`ê`, `ô`), or none
 * (`e`, `o`, as in ISO 843 Type 2). The letter that carries it on eta is
 * chosen by {@link EtaTransliteration}. The same mark distinguishes stigma and
 * sampi from `c` and `s` (`c̄`, `ĉ`); under `"omit"`, they keep the macron.
 * Explicit philological macrons remain independent semantic marks.
 *
 * `"omit"` writes eta and omega like epsilon (or iota) and omicron, so they
 * are read back as those letters. `"circumflex"` cannot be combined with
 * `circumflexAccent: "circumflex"`, which would write the length mark and the
 * accent alike.
 */
export type LongVowelTransliteration =
  | "macron"
  | "circumflex"
  | "omit";

/** Selects polytonic output or a mechanical, lossy monotonic transformation. */
export type GreekAccentuation = "polytonic" | "monotonic";

/** Selects composed or canonically decomposed Greek Unicode output. */
export type UnicodeComposition = "composed" | "decomposed";

/**
 * Selects the composed Unicode form of an acute where Unicode has two: the
 * tonos (`ά`, U+03AC), which is also what NFC gives, or the oxia (`ά`,
 * U+1F71). `"system"` writes the oxia when the Greek output carries a
 * polytonic mark (a breathing, a grave, a circumflex, an iota subscript, a
 * coronis, or a quantity mark) and the tonos when it carries none, as
 * monotonic text is written and as `accentuation: "monotonic"` writes it.
 * The choice is made for the whole output of one conversion: a polytonic
 * text converted word by word needs `"oxia"` to write every acute alike.
 */
export type GreekAcuteForm = "system" | "tonos" | "oxia";

/** Selects the Unicode scalar used for Greek question marks. */
export type GreekQuestionMarkForm = "canonical" | "semicolon" | "greek";

/** Selects the Unicode scalar used for Greek ano teleia. */
export type GreekAnoTeleiaForm = "canonical" | "middle-dot" | "greek";

/**
 * Preserves whitespace, or collapses it: `"collapse"` trims the text and
 * reduces each run of Unicode whitespace to one space.
 */
export type WhitespaceOrthography = "preserve" | "collapse";

/** Selects ASCII or typographic hyphen in transliteration output. */
export type HyphenTransliteration = "ascii" | "typographic";

/** Preserves the enotikon or renders it as an ambiguous Latin hyphen. */
export type EnotikonTransliteration = "preserve" | "hyphen";

/** Selects `b` or modern `v` for beta in transliteration. */
export type BetaTransliteration = "b" | "v";

/**
 * Selects the Latin letter for eta in transliteration: `e` or `i`. The letter
 * carries the length mark selected by {@link LongVowelTransliteration}: `ē` or
 * `ī` by default, `ê` or `î` under `longVowels: "circumflex"`.
 */
export type EtaTransliteration = "e" | "i";

/** Selects `x` or `ks` for xi in transliteration. */
export type XiTransliteration = "x" | "ks";

/** Selects `ph` or `f` for phi in transliteration. */
export type PhiTransliteration = "ph" | "f";

/** Selects `ch` or `kh` for chi in transliteration. */
export type ChiTransliteration = "ch" | "kh";

/**
 * Selects the transliteration of `μπ`: `mp` letter by letter, or `b` at the
 * beginning of a word (`"b-initial"`, ALA-LC) or at either end of it
 * (`"b-initial-final"`, ISO 843 Type 2), `mp` elsewhere. `b` is read back as
 * `μπ` only under `beta: "v"`; otherwise it is also the spelling of beta.
 */
export type MuPiTransliteration = "mp" | "b-initial" | "b-initial-final";

/**
 * Selects the transliteration of `ντ`: `nt` letter by letter, or, at the
 * beginning of a word, `d` (`"d-initial"`) or `d̲` (`"d-underline-initial"`,
 * ALA-LC). Only `d̲` is read back as `ντ`, since `d` is also delta.
 */
export type NuTauTransliteration = "nt" | "d-initial" | "d-underline-initial";

/** Selects contextual rho spelling or one final `h` per contiguous rho group. */
export type RhoTransliteration = "contextual" | "systematic";

/**
 * Selects the mechanical case transformation applied during rendering.
 *
 * `"preserve"` keeps the case of the source. In transliteration, a capital
 * spelled with several Latin letters (`TH`, `CH`, `PS`, and the `H` of a rough
 * breathing or of rho) is written in full capitals among capitals, and with
 * its first letter only before lowercase text, which ISO 843 allows (note 11):
 * `ΘΑΛΑΣΣΑ` → `THALASSA`, `Θάλασσα` → `Thálassa`. A capital consonant on its
 * own, such as a letter name, a numeral, or a siglum, is written in full
 * capitals (`Θ` → `TH`), except before a period, where it is an abbreviated
 * initial (`Θ.` → `Th.`). A vowel with a rough breathing on its own, such as
 * the article at the head of a sentence, keeps its first letter only
 * (`Ὁ` → `Ho`).
 *
 * `"title"` capitalizes the first letter of each word; an apostrophe between
 * two letters, as a coronis written so (`Ka’gṓ`), does not start a word.
 */
export type LetterCaseOrthography =
  | "preserve"
  | "lowercase"
  | "uppercase"
  | "title";

/** Selects the insignificant ASCII letter case used in Beta Code output. */
export type BetaCodeCase = "lowercase" | "uppercase";

/** Selects the Beta Code spelling emitted for yot. */
export type BetaCodeYot = "j" | "#401";

/** Selects the transliteration emitted for archaic koppa. */
export type ArchaicKoppaTransliteration = "k-dot-below" | "q";

/** Preserves or removes one semantic class of diacritics. */
export type DiacriticDisposition = "preserve" | "remove";

/**
 * Identifies a bundled, standards-oriented conversion configuration.
 *
 * Presets are ordinary partial options applied between engine defaults and
 * caller overrides. They implement only the mechanically expressible subset
 * described by their metadata; an identifier is not a claim of exhaustive
 * conformity. Use `getPresetMetadata()` for scope, references, coverage, and
 * limitations, and `getPresetOptions()` for contributed option fields.
 */
export type Preset =
  | "ala-lc-ancient"
  | "ala-lc-modern"
  | "bnf-core"
  | "iso-843-type-1"
  | "iso-843-type-2"
  | "perseus"
  | "sbl-general"
  | "tlg-core";

/** Disposition of each semantic diacritic class. */
export interface DiacriticClassOptions {
  /** Accent marks: acute, grave, and circumflex. Defaults to `"preserve"`. */
  accents?: DiacriticDisposition;
  /** Initial smooth breathing marks. Defaults to `"preserve"`. */
  smoothBreathing?: DiacriticDisposition;
  /** Initial rough breathing marks. Defaults to `"preserve"`. */
  roughBreathing?: DiacriticDisposition;
  /** Internal coronides marking crasis. Defaults to `"preserve"`. */
  coronis?: DiacriticDisposition;
  /** Diaeresis marks. Defaults to `"preserve"`. */
  diaeresis?: DiacriticDisposition;
  /** Iota subscripts. Defaults to `"preserve"`. */
  iotaSubscript?: DiacriticDisposition;
  /** Explicit macron and breve quantity marks. Defaults to `"preserve"`. */
  quantity?: DiacriticDisposition;
  /**
   * The overline of abbreviations and numerals, such as the nomina sacra
   * (`θ̅ς̅`). Defaults to `"preserve"`.
   */
  overline?: DiacriticDisposition;
}

/**
 * Which semantic diacritics are kept. `all` sets every class at once; a class
 * named alongside it is the exception: `{ all: "remove", roughBreathing:
 * "preserve" }`. The shorthand is expanded where it is written, so `all` in
 * the caller's options overrides every class a preset set.
 *
 * Removing a class removes its marks from the output in every format. In
 * transliteration the rough breathing is a letter, `h`: it goes with its
 * class, so `{ all: "remove", roughBreathing: "preserve" }` keeps it. The
 * letters stay as they are spelled: in transliteration, eta and omega keep
 * the length mark that `longVowels` selects (`η` → `ē`, `ω` → `ō` by
 * default), which spells the letter and is not a diacritic.
 */
export interface DiacriticOptions extends DiacriticClassOptions {
  /** Disposition of every class not named alongside. */
  all?: DiacriticDisposition;
}

/**
 * How the Latin writing system spells Greek: the spelling of each letter and
 * mark, and what a Latin spelling is read back as. These options act when
 * transliteration is written and when it is read.
 */
export interface TransliterationOptions {
  /** Beta transliteration. Defaults to `"b"`. */
  beta?: BetaTransliteration;
  /** Latin letter for eta, which carries the `longVowels` mark: `"e"` (`ē`) or `"i"` (`ī`). Defaults to `"e"`. */
  eta?: EtaTransliteration;
  /** Xi transliteration. Defaults to `"x"`. */
  xi?: XiTransliteration;
  /** Phi transliteration. Defaults to `"ph"`. */
  phi?: PhiTransliteration;
  /** Chi transliteration. Defaults to `"ch"`. */
  chi?: ChiTransliteration;
  /** Upsilon transliteration. Defaults to `"y-with-diphthong-u"`, the spelling of the SBL Handbook; `"y-with-au-eu-ou"` uses `u` only in the three cited pairs. */
  upsilon?: UpsilonTransliteration;
  /** Transliteration of `μπ`. Defaults to `"mp"`. */
  muPi?: MuPiTransliteration;
  /** Transliteration of `ντ`. Defaults to `"nt"`. */
  nuTau?: NuTauTransliteration;
  /** Rho transliteration. Defaults to `"contextual"`. */
  rho?: RhoTransliteration;
  /** Nasal gamma spelling. Defaults to `"nasal"`. */
  nasalGamma?: NasalGammaTransliteration;
  /** Length mark of eta and omega in transliteration: `"macron"`, `"circumflex"`, or `"omit"`. Defaults to `"macron"`; `"circumflex"` cannot be combined with `circumflexAccent: "circumflex"`. */
  longVowels?: LongVowelTransliteration;
  /** Circumflex accent in transliteration. Defaults to `"tilde"` (U+0303); `"circumflex"` cannot be combined with `longVowels: "circumflex"`. */
  circumflexAccent?: CircumflexTransliteration;
  /** Explicit macron/breve in transliteration. Defaults to `"preserve"`. */
  quantity?: QuantityTransliteration;
  /** Smooth breathing in transliteration; `"apostrophe"` prefixes an initial vowel. Defaults to `"omit"`. */
  smoothBreathing?: SmoothBreathingTransliteration;
  /** Coronis representation in transliteration. Defaults to `"omit"`. */
  coronis?: CoronisTransliteration;
  /** Transliteration hyphen. Defaults to `"ascii"`. */
  hyphen?: HyphenTransliteration;
  /** Keraia marks in transliteration. Defaults to `"greek"`; `"bnf"` is not always reversible. */
  keraia?: KeraiaTransliteration;
  /** Transliteration of Greek enotikon (U+203F). Defaults to `"preserve"`. */
  enotikon?: EnotikonTransliteration;
  /** Provenanced lunate sigma transliteration. Defaults to `"s"`. */
  lunateSigma?: LunateSigmaTransliteration;
  /** Archaic-koppa transliteration. Defaults to `"k-dot-below"`; BnF uses `"q"`. */
  archaicKoppa?: ArchaicKoppaTransliteration;
}

/**
 * How Greek is written: letter shapes, accentuation, assimilation, and the
 * Unicode form of the output. `sigma`, `finalSigma`, and `doubleRho` also
 * shape Beta Code, which writes Greek in ASCII; `accentuation` also decides
 * whether reading transliteration infers a smooth breathing, which monotonic
 * Greek has not.
 */
export interface GreekOptions {
  /** Sigma glyph policy. Defaults to `"preserve"`, which keeps a lunate sigma the source notes. */
  sigma?: SigmaOrthography;
  /** Lowercase final sigma policy in Greek output. Defaults to `"preserve"`, which retains the sigma shapes the source notes (Greek `σ` and `ς`, Beta Code `s1` and `s2`) and places any other sigma by its position, such as a sigma read from Beta Code `s` or a lunate sigma written as a standard sigma; `"contextual"` places every sigma by its position, correcting a shape the source notes. A sigma before an elision apostrophe is not at the end of its word. */
  finalSigma?: FinalSigmaOrthography;
  /** Beta glyph. Defaults to `"preserve"`, which keeps a `ϐ` the source notes. */
  medialBeta?: MedialBetaOrthography;
  /** Symbol forms of letters, such as `ϑ`. Defaults to `"preserve"`. */
  symbolForms?: SymbolFormOrthography;
  /** Signs that stand for several letters, such as `ϗ` for `και`. Defaults to `"preserve"`. */
  ligatures?: LigatureOrthography;
  /** How Greek text reads a stigma between two letters. Defaults to `"letter"`; `"ligature"` reads `σ` and `τ`. */
  stigma?: StigmaReading;
  /** The accent of `καί` written for `ϗ` as letters. Defaults to `"none"`; `"byzantine"` writes the grave, `"modern"` follows modern editions. */
  kaiAccent?: KaiAccent;
  /** Where a kept iota subscript is written. Defaults to `"subscript"`; whether it is kept is `diacritics.iotaSubscript`. */
  iotaSubscript?: IotaSubscriptOrthography;
  /** Double-rho marks in Greek output. Defaults to `"unmarked"`. */
  doubleRho?: DoubleRhoOrthography;
  /** Dental assimilation before sigma. Defaults to `"preserve"`. */
  dentalSigma?: DentalSigmaOrthography;
  /** An elided `π`, `τ`, or `κ` before a rough breathing. Defaults to `"preserve"`, which keeps the consonant the source writes; `"aspirate"` writes `φ`, `θ`, or `χ`. */
  elidedStop?: ElidedStopOrthography;
  /** Greek accentuation system. Defaults to `"polytonic"`; `"monotonic"` follows the monotonic rules, monosyllables included, as far as the written text allows. */
  accentuation?: GreekAccentuation;
  /** Composed or decomposed output. Defaults to `"composed"`. */
  composition?: UnicodeComposition;
  /** Tonos/oxia preference for eligible acute vowels. Defaults to `"system"`: oxia in output that carries a polytonic mark, tonos otherwise. */
  acute?: GreekAcuteForm;
  /** Greek question-mark scalar. Defaults to `"canonical"`. */
  questionMark?: GreekQuestionMarkForm;
  /** Greek ano-teleia scalar. Defaults to `"canonical"`. */
  anoTeleia?: GreekAnoTeleiaForm;
}

/** How Beta Code is written. */
export interface BetaCodeOptions {
  /** Insignificant ASCII letter case of Beta Code output. Defaults to `"lowercase"`. */
  case?: BetaCodeCase;
  /** Beta Code spelling of yot. Defaults to `"j"`; TLG uses `"#401"`. */
  yot?: BetaCodeYot;
}

/** Transformations of the text as a whole, in every output format. */
export interface TextOptions {
  /** Semantic letter case applied to recognized graphemes. Defaults to `"preserve"`. */
  letterCase?: LetterCaseOrthography;
  /** Whitespace rendering. Defaults to `"preserve"`. */
  whitespace?: WhitespaceOrthography;
  /** Alphabetic or decimal numeral output. Defaults to `"alphabetic"`. */
  numerals?: NumeralOrthography;
}

/**
 * Options shared by the conversion functions and converters.
 *
 * The groups are named after what they describe: `transliteration` is the
 * Latin writing system (how each letter and mark is spelled, written and
 * read), `greek` the Greek one (shapes, accentuation, Unicode form; sigma
 * and double rho reach Beta Code too), `betaCode` the Beta Code conventions,
 * `text` the transformations of the whole text in every format, and
 * `diacritics` which classes of marks are kept at all. A name can appear in
 * two groups because the questions differ: `diacritics.coronis` asks whether
 * the coronis is kept, `transliteration.coronis` how it is written in Latin.
 *
 * Every accepted value is ASCII; see {@link CONVERSION_OPTION_VALUES}.
 */
export interface ConversionOptions {
  /** Named configuration applied before custom fields. */
  preset?: Preset;
  /** The Latin writing system. */
  transliteration?: TransliterationOptions;
  /** The Greek writing system, and what reaches Beta Code. */
  greek?: GreekOptions;
  /** Beta Code conventions. */
  betaCode?: BetaCodeOptions;
  /** Transformations of the whole text, in every format. */
  text?: TextOptions;
  /** Which semantic diacritics are kept. */
  diacritics?: DiacriticOptions;
  /**
   * How the input is written, when it is not written as the output: the
   * input is read with these options, resolved on their own, and the output
   * written with the others. `source` replaces the options for reading and
   * does not merge with them: `greek.accentuation` and `diacritics`, which
   * also change how transliteration is read, then only write the output.
   * Without it, the options describe the input as well, which is how a text
   * is normalized in its own style. Functions that only write, `encode()`
   * among them, check it and ignore it. A restyle cannot restore what the
   * source style does not note: the default style writes no coronis, so a
   * text in that style has none to give.
   *
   * Reading Greek and Beta Code depends on one option, `greek.stigma`, which
   * reads a stigma between two letters as the ligature of `σ` and `τ`, in
   * every format. Reading transliteration also depends on the
   * `transliteration` group, `greek.accentuation`, and the smooth breathing
   * class of `diacritics`, so that restyling a transliteration needs the
   * style it is written in:
   *
   * @example
   * ```ts
   * reencode("tōn barbarōn", "transliteration", {
   *   preset: "ala-lc-modern",
   *   source: { preset: "sbl-general" },
   * }); // "tōn varvarōn"
   * ```
   */
  source?: SourceOptions;
}

/**
 * The options that describe how the input of a conversion is written (see
 * {@link ConversionOptions.source}): the options of a conversion, without a
 * `source` of their own.
 */
export type SourceOptions = Omit<ConversionOptions, "source">;

/**
 * Every effective option after defaults, a preset, and custom overrides.
 *
 * This is an output type, returned by `resolveConversionOptions()`. Fields are
 * added in minor releases, so construct it through that function rather than
 * by hand; see the stability policy.
 */
export interface ResolvedConversionOptions {
  /** Effective transliteration spellings. */
  transliteration: Required<TransliterationOptions>;
  /** Effective Greek orthography and Unicode form. */
  greek: Required<GreekOptions>;
  /** Effective Beta Code conventions. */
  betaCode: Required<BetaCodeOptions>;
  /** Effective whole-text transformations. */
  text: Required<TextOptions>;
  /** Effective disposition of every semantic diacritic class. */
  diacritics: Required<DiacriticClassOptions>;
}

/** Read-only view exposed by {@link DEFAULT_CONVERSION_OPTIONS}. */
export interface DefaultConversionOptions {
  /**
   * Literal default transliteration spellings: the letters of the SBL
   * Handbook, with the marks it leaves out.
   */
  readonly transliteration: {
    readonly beta: "b";
    readonly eta: "e";
    readonly xi: "x";
    readonly phi: "ph";
    readonly chi: "ch";
    readonly upsilon: "y-with-diphthong-u";
    readonly muPi: "mp";
    readonly nuTau: "nt";
    readonly rho: "contextual";
    readonly nasalGamma: "nasal";
    readonly longVowels: "macron";
    readonly circumflexAccent: "tilde";
    readonly quantity: "preserve";
    readonly smoothBreathing: "omit";
    readonly coronis: "omit";
    readonly hyphen: "ascii";
    readonly keraia: "greek";
    readonly enotikon: "preserve";
    readonly lunateSigma: "s";
    readonly archaicKoppa: "k-dot-below";
  };
  /** Literal default Greek orthography and Unicode form. */
  readonly greek: {
    readonly sigma: "preserve";
    readonly finalSigma: "preserve";
    readonly medialBeta: "preserve";
    readonly symbolForms: "preserve";
    readonly ligatures: "preserve";
    readonly stigma: "letter";
    readonly kaiAccent: "none";
    readonly iotaSubscript: "subscript";
    readonly doubleRho: "unmarked";
    readonly dentalSigma: "preserve";
    readonly elidedStop: "preserve";
    readonly accentuation: "polytonic";
    readonly composition: "composed";
    readonly acute: "system";
    readonly questionMark: "canonical";
    readonly anoTeleia: "canonical";
  };
  /** Literal default Beta Code conventions. */
  readonly betaCode: {
    readonly case: "lowercase";
    readonly yot: "j";
  };
  /** Literal default whole-text transformations. */
  readonly text: {
    readonly letterCase: "preserve";
    readonly whitespace: "preserve";
    readonly numerals: "alphabetic";
  };
  /** Literal default disposition of every semantic diacritic class. */
  readonly diacritics: {
    readonly accents: "preserve";
    readonly smoothBreathing: "preserve";
    readonly roughBreathing: "preserve";
    readonly coronis: "preserve";
    readonly diaeresis: "preserve";
    readonly iotaSubscript: "preserve";
    readonly quantity: "preserve";
    readonly overline: "preserve";
  };
}

/**
 * Error raised for an option that cannot be resolved: an unknown key or
 * preset, a value outside the accepted ones, or two values that cannot be
 * combined. A `RangeError`, with the option named by `path` and what was
 * received, what is accepted, and the replacement of a key or value that an
 * earlier release knew, when there is one. The message is for humans.
 */
export class OptionError extends RangeError {
  /** Dotted path of the option, such as `"transliteration.eta"` or `"preset"`; for a key of a converter's configuration, such as `"exclude"` or `"aliases[0].spellings"`. */
  readonly path: string;
  /** The value received, or undefined for an unknown key. */
  readonly received: unknown;
  /**
   * The accepted values of the option, or the accepted keys of its group.
   * For two values that cannot be combined, the values accepted next to the
   * other one.
   */
  readonly accepted: readonly string[];
  /**
   * The current path of a removed key, or the current spelling of a renamed
   * value. A property of the error only when there is one: declared without
   * a field, which would set it to `undefined` on every error.
   */
  declare readonly replacement?: string;

  /** Creates the error with its message and the details of the option. */
  constructor(
    message: string,
    details: {
      path: string;
      received: unknown;
      accepted: readonly string[];
      replacement?: string;
    },
  ) {
    super(message);
    this.name = "OptionError";
    this.path = details.path;
    this.received = details.received;
    this.accepted = Object.freeze([...details.accepted]);
    if (details.replacement !== undefined) {
      this.replacement = details.replacement;
    }
  }
}

/** Accepted values of every field of one option group. */
export type OptionValueTable<T> = {
  readonly [K in keyof T]-?: readonly NonNullable<T[K]>[];
};

/** Every accepted value of every conversion option, by group. */
export interface ConversionOptionValues {
  /** Accepted values of each transliteration spelling. */
  readonly transliteration: OptionValueTable<TransliterationOptions>;
  /** Accepted values of each Greek orthography and Unicode preference. */
  readonly greek: OptionValueTable<GreekOptions>;
  /** Accepted values of each Beta Code convention. */
  readonly betaCode: OptionValueTable<BetaCodeOptions>;
  /** Accepted values of each whole-text transformation. */
  readonly text: OptionValueTable<TextOptions>;
  /** Accepted values of each semantic diacritic class disposition, and of `all`. */
  readonly diacritics: OptionValueTable<DiacriticOptions>;
}

const freezeTable = <T>(table: OptionValueTable<T>): OptionValueTable<T> =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(table).map(([key, values]) => [
        key,
        Object.freeze([...(values as readonly unknown[])]),
      ]),
    ) as OptionValueTable<T>,
  );

/**
 * Complete, immutable inventory of option keys and their accepted values.
 *
 * {@link resolveConversionOptions} rejects any key or value absent from this
 * table, so it is also the reference for user interfaces and validators. It
 * also rejects one combination of accepted values: `longVowels: "circumflex"`
 * with `circumflexAccent: "circumflex"`.
 */
export const CONVERSION_OPTION_VALUES: ConversionOptionValues = Object.freeze({
  transliteration: freezeTable<TransliterationOptions>({
    beta: ["b", "v"],
    eta: ["e", "i"],
    xi: ["x", "ks"],
    phi: ["ph", "f"],
    chi: ["ch", "kh"],
    upsilon: [
      "u",
      "y",
      "y-with-diphthong-u",
      "y-with-au-eu-ou",
      "y-with-ou-v-f",
    ],
    muPi: ["mp", "b-initial", "b-initial-final"],
    nuTau: ["nt", "d-initial", "d-underline-initial"],
    rho: ["contextual", "systematic"],
    nasalGamma: [
      "nasal",
      "nasal-except-kappa",
      "nasal-medial-kappa",
      "literal",
    ],
    longVowels: ["macron", "circumflex", "omit"],
    circumflexAccent: ["tilde", "circumflex"],
    quantity: ["preserve", "omit"],
    smoothBreathing: ["omit", "greek", "apostrophe"],
    coronis: ["omit", "apostrophe", "greek"],
    hyphen: ["ascii", "typographic"],
    keraia: ["greek", "bnf"],
    enotikon: ["preserve", "hyphen"],
    lunateSigma: ["s", "c"],
    archaicKoppa: ["k-dot-below", "q"],
  }),
  greek: freezeTable<GreekOptions>({
    sigma: ["preserve", "standard", "lunate"],
    finalSigma: ["preserve", "contextual", "medial"],
    medialBeta: ["preserve", "standard", "symbol"],
    symbolForms: ["preserve", "standard"],
    ligatures: ["preserve", "standard"],
    stigma: ["letter", "ligature"],
    kaiAccent: ["none", "byzantine", "modern"],
    iotaSubscript: ["subscript", "capital-adscript", "adscript"],
    doubleRho: ["unmarked", "smooth-rough"],
    dentalSigma: ["preserve", "assimilate"],
    elidedStop: ["preserve", "aspirate"],
    accentuation: ["polytonic", "monotonic"],
    composition: ["composed", "decomposed"],
    acute: ["system", "tonos", "oxia"],
    questionMark: ["canonical", "semicolon", "greek"],
    anoTeleia: ["canonical", "middle-dot", "greek"],
  }),
  betaCode: freezeTable<BetaCodeOptions>({
    case: ["lowercase", "uppercase"],
    yot: ["j", "#401"],
  }),
  text: freezeTable<TextOptions>({
    letterCase: ["preserve", "lowercase", "uppercase", "title"],
    whitespace: ["preserve", "collapse"],
    numerals: ["alphabetic", "decimal"],
  }),
  diacritics: freezeTable<DiacriticOptions>({
    all: ["preserve", "remove"],
    accents: ["preserve", "remove"],
    smoothBreathing: ["preserve", "remove"],
    roughBreathing: ["preserve", "remove"],
    coronis: ["preserve", "remove"],
    diaeresis: ["preserve", "remove"],
    iotaSubscript: ["preserve", "remove"],
    quantity: ["preserve", "remove"],
    overline: ["preserve", "remove"],
  }),
});

/**
 * Complete, immutable defaults used when no preset or custom option overrides
 * them. Inspect this value in an IDE to discover the engine's effective
 * baseline configuration. The default transliteration is the library's own:
 * the letters of the SBL Handbook of Style (§5.3), which `sbl-general`
 * writes, with the accents, iota subscript, diaeresis, and quantity marks
 * that the Handbook leaves out.
 */
export const DEFAULT_CONVERSION_OPTIONS: DefaultConversionOptions = Object
  .freeze(
    {
      transliteration: Object.freeze({
        beta: "b",
        eta: "e",
        xi: "x",
        phi: "ph",
        chi: "ch",
        upsilon: "y-with-diphthong-u",
        muPi: "mp",
        nuTau: "nt",
        rho: "contextual",
        nasalGamma: "nasal",
        longVowels: "macron",
        circumflexAccent: "tilde",
        quantity: "preserve",
        smoothBreathing: "omit",
        coronis: "omit",
        hyphen: "ascii",
        keraia: "greek",
        enotikon: "preserve",
        lunateSigma: "s",
        archaicKoppa: "k-dot-below",
      }),
      greek: Object.freeze({
        sigma: "preserve",
        finalSigma: "preserve",
        medialBeta: "preserve",
        symbolForms: "preserve",
        ligatures: "preserve",
        stigma: "letter",
        kaiAccent: "none",
        iotaSubscript: "subscript",
        doubleRho: "unmarked",
        dentalSigma: "preserve",
        elidedStop: "preserve",
        accentuation: "polytonic",
        composition: "composed",
        acute: "system",
        questionMark: "canonical",
        anoTeleia: "canonical",
      }),
      betaCode: Object.freeze({
        case: "lowercase",
        yot: "j",
      }),
      text: Object.freeze({
        letterCase: "preserve",
        whitespace: "preserve",
        numerals: "alphabetic",
      }),
      diacritics: Object.freeze({
        accents: "preserve",
        smoothBreathing: "preserve",
        roughBreathing: "preserve",
        coronis: "preserve",
        diaeresis: "preserve",
        iotaSubscript: "preserve",
        quantity: "preserve",
        overline: "preserve",
      }),
    } as const satisfies ResolvedConversionOptions,
  );
