/** Controls marks added to a pair of consecutive rho in Greek output. */
export type DoubleRhoOrthography = "unmarked" | "smooth-rough";

/** Selects standard beta or the medial lowercase symbol `ϐ` in Greek output. */
export type MedialBetaOrthography = "standard" | "symbol";

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

/** Selects standard, lunate, or source-preserving sigma glyphs. */
export type SigmaOrthography = "standard" | "lunate" | "preserve";

/** Selects `s` or `c` for a provenanced lunate sigma in transliteration. */
export type LunateSigmaTransliteration = "s" | "c";

/** Selects contextual final sigma or a uniform medial sigma in Greek output. */
export type FinalSigmaOrthography = "contextual" | "medial" | "preserve";

/** Preserves marked alphabetic numerals or renders valid groups as decimals. */
export type NumeralOrthography = "alphabetic" | "decimal";

/** Selects Greek keraia marks or the BnF comma and combining acute in Latin output. */
export type KeraiaTransliteration = "greek" | "bnf";

/** Preserves a dental before sigma or applies the lossy assimilation. */
export type DentalSigmaOrthography = "preserve" | "assimilate";

/**
 * Selects the transliterated spelling of upsilon.
 *
 * `"y-with-ou-v-f"` follows ISO 843 Type 2: `y`, but `u` in the diphthong
 * `ου`, and in the diphthongs `αυ`, `ευ`, `ηυ` a `v` before a voiced
 * consonant (β, γ, δ, ζ, λ, μ, ν, ρ) or a vowel and an `f` before a voiceless
 * consonant (θ, κ, ξ, π, σ, τ, φ, χ, ψ) or at the end of a word; an accent on
 * that upsilon moves to the preceding vowel (`Εύβοια` → `Évvoia`). The `v`
 * and `f` are read back as beta and phi under `beta: "v"` and `phi: "f"`, as
 * in the `iso-843-type-2` preset, and otherwise remain Latin letters: the
 * spelling is not reversible.
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

/** Selects the composed Unicode form used for eligible acute vowels. */
export type GreekAcuteForm = "system" | "tonos" | "oxia";

/** Selects the Unicode scalar used for Greek question marks. */
export type GreekQuestionMarkForm = "canonical" | "semicolon" | "greek";

/** Selects the Unicode scalar used for Greek ano teleia. */
export type GreekAnoTeleiaForm = "canonical" | "middle-dot" | "greek";

/** Preserves whitespace or collapses each Unicode whitespace run. */
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

/** Selects the mechanical case transformation applied during rendering. */
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
  | "sbl-academic"
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
}

/**
 * Which semantic diacritics are kept. `all` sets every class at once; a class
 * named alongside it is the exception: `{ all: "remove", roughBreathing:
 * "preserve" }`. The shorthand is expanded where it is written, so `all` in
 * the caller's options overrides every class a preset set.
 *
 * Removing a class removes its marks from the output in every format. In
 * transliteration the rough breathing is a letter, `h`: it goes with its
 * class, so `{ all: "remove", roughBreathing: "preserve" }` keeps it.
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
  /** Upsilon transliteration. Defaults to `"y-with-diphthong-u"`, the SBL academic spelling; `"y-with-au-eu-ou"` uses `u` only in the three cited pairs. */
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
 * Unicode form of the output. `sigma` and `doubleRho` also shape Beta Code,
 * which writes Greek in ASCII; `accentuation` also decides whether reading
 * transliteration infers a smooth breathing, which monotonic Greek has not.
 */
export interface GreekOptions {
  /** Sigma glyph policy. Defaults to `"standard"`. */
  sigma?: SigmaOrthography;
  /** Lowercase final sigma policy in Greek output. Defaults to `"contextual"`; `"preserve"` retains source Greek sigma shapes. */
  finalSigma?: FinalSigmaOrthography;
  /** Medial lowercase beta glyph. Defaults to `"standard"`. */
  medialBeta?: MedialBetaOrthography;
  /** Double-rho marks in Greek output. Defaults to `"unmarked"`. */
  doubleRho?: DoubleRhoOrthography;
  /** Dental assimilation before sigma. Defaults to `"preserve"`. */
  dentalSigma?: DentalSigmaOrthography;
  /** Greek accentuation system. Defaults to `"polytonic"`; `"monotonic"` follows the monotonic rules, monosyllables included, as far as the written text allows. */
  accentuation?: GreekAccentuation;
  /** Composed or decomposed output. Defaults to `"composed"`. */
  composition?: UnicodeComposition;
  /** Tonos/oxia preference for eligible acute vowels. Defaults to `"system"`. */
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
}

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
  /** Literal default transliteration spellings: SBL academic style. */
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
    readonly sigma: "standard";
    readonly finalSigma: "contextual";
    readonly medialBeta: "standard";
    readonly doubleRho: "unmarked";
    readonly dentalSigma: "preserve";
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
  /** Dotted path of the option, such as `"transliteration.eta"` or `"preset"`. */
  readonly path: string;
  /** The value received, or undefined for an unknown key. */
  readonly received: unknown;
  /**
   * The accepted values of the option, or the accepted keys of its group.
   * For two values that cannot be combined, the values accepted next to the
   * other one.
   */
  readonly accepted: readonly string[];
  /** The current path of a removed key, or the current spelling of a renamed value. */
  readonly replacement?: string;

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
    sigma: ["standard", "lunate", "preserve"],
    finalSigma: ["contextual", "medial", "preserve"],
    medialBeta: ["standard", "symbol"],
    doubleRho: ["unmarked", "smooth-rough"],
    dentalSigma: ["preserve", "assimilate"],
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
  }),
});

/**
 * Complete, immutable defaults used when no preset or custom option overrides
 * them. Inspect this value in an IDE to discover the engine's effective
 * baseline configuration. The default transliteration is the SBL academic
 * style: without a preset, `convert()` writes what `sbl-academic` writes.
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
        sigma: "standard",
        finalSigma: "contextual",
        medialBeta: "standard",
        doubleRho: "unmarked",
        dentalSigma: "preserve",
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
      }),
    } as const satisfies ResolvedConversionOptions,
  );
