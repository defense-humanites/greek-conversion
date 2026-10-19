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

/** Selects contextual nasal gamma (`n`) or literal gamma (`g`). */
export type NasalGammaTransliteration = "nasal" | "literal";

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

/** Selects the transliterated spelling of upsilon. */
export type UpsilonTransliteration =
  | "u"
  | "y"
  | "y-with-diphthong-u"
  | "y-with-au-eu-ou";

/**
 * Selects whether structural eta and omega length is shown by macron or
 * circumflex in transliteration. Explicit philological macrons remain
 * independent semantic marks.
 */
export type LongVowelTransliteration =
  | "macron"
  | "circumflex";

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

/** Selects `ē` or `ī` for eta in transliteration. */
export type EtaTransliteration = "e-macron" | "i-macron";

/** Selects `x` or `ks` for xi in transliteration. */
export type XiTransliteration = "x" | "ks";

/** Selects `ph` or `f` for phi in transliteration. */
export type PhiTransliteration = "ph" | "f";

/** Selects `ch` or `kh` for chi in transliteration. */
export type ChiTransliteration = "ch" | "kh";

/** Selects preservation or a supported modern-Greek digraph policy. */
export type ModernDigraphTransliteration = "preserve" | "phonetic" | "ala-lc";

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
  | "perseus"
  | "sbl-academic"
  | "sbl-general"
  | "tlg-core";

/** Granular rendering policy for semantic diacritic classes. */
export interface DiacriticOptions {
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

/** Orthographic and transliteration policies applied during rendering. */
export interface OrthographyOptions {
  /** Double-rho marks in Greek output. Defaults to `"unmarked"`. */
  doubleRho?: DoubleRhoOrthography;
  /** Medial lowercase beta glyph. Defaults to `"standard"`. */
  medialBeta?: MedialBetaOrthography;
  /** Coronis representation in transliteration. Defaults to `"omit"`. */
  coronis?: CoronisTransliteration;
  /** Smooth breathing in transliteration; `"apostrophe"` prefixes an initial vowel. Defaults to `"omit"`. */
  smoothBreathing?: SmoothBreathingTransliteration;
  /** Circumflex accent in transliteration. Defaults to `"tilde"` (U+0303). */
  circumflexAccent?: CircumflexTransliteration;
  /** Explicit macron/breve in transliteration. Defaults to `"preserve"`. */
  quantity?: QuantityTransliteration;
  /** Nasal gamma spelling. Defaults to `"nasal"`. */
  nasalGamma?: NasalGammaTransliteration;
  /** Sigma glyph policy. Defaults to `"standard"`. */
  sigma?: SigmaOrthography;
  /** Provenanced lunate sigma transliteration. Defaults to `"s"`. */
  lunateSigma?: LunateSigmaTransliteration;
  /** Lowercase final sigma policy in Greek output. Defaults to `"contextual"`; `"preserve"` retains source Greek sigma shapes. */
  finalSigma?: FinalSigmaOrthography;
  /** Alphabetic or decimal numeral output. Defaults to `"alphabetic"`. */
  numerals?: NumeralOrthography;
  /** Keraia marks in transliteration. Defaults to `"greek"`; `"bnf"` is not always reversible. */
  keraia?: KeraiaTransliteration;
  /** Dental assimilation before sigma. Defaults to `"preserve"`. */
  dentalSigma?: DentalSigmaOrthography;
  /** Upsilon transliteration. Defaults to `"u"`; `"y-with-au-eu-ou"` uses `u` only in the three cited pairs. */
  upsilon?: UpsilonTransliteration;
  /** Structural long-vowel marker in transliteration. Defaults to `"macron"`. */
  longVowels?: LongVowelTransliteration;
  /** Greek accentuation system. Defaults to `"polytonic"`; `"monotonic"` follows the monotonic rules, monosyllables included, as far as the written text allows. */
  accentuation?: GreekAccentuation;
  /** Whitespace rendering. Defaults to `"preserve"`. */
  whitespace?: WhitespaceOrthography;
  /** Transliteration hyphen. Defaults to `"ascii"`. */
  hyphen?: HyphenTransliteration;
  /** Transliteration of Greek enotikon (U+203F). Defaults to `"preserve"`. */
  enotikon?: EnotikonTransliteration;
  /** Beta transliteration. Defaults to `"b"`. */
  beta?: BetaTransliteration;
  /** Eta transliteration: `"e-macron"` (`ē`) or `"i-macron"` (`ī`). Defaults to `"e-macron"`. */
  eta?: EtaTransliteration;
  /** Xi transliteration. Defaults to `"x"`. */
  xi?: XiTransliteration;
  /** Phi transliteration. Defaults to `"ph"`. */
  phi?: PhiTransliteration;
  /** Chi transliteration. Defaults to `"ch"`. */
  chi?: ChiTransliteration;
  /** Modern-Greek digraph policy. Defaults to `"preserve"`. */
  modernDigraphs?: ModernDigraphTransliteration;
  /** Rho transliteration. Defaults to `"contextual"`. */
  rho?: RhoTransliteration;
  /** Semantic letter case applied to recognized graphemes. Defaults to `"preserve"`. */
  letterCase?: LetterCaseOrthography;
  /** Insignificant ASCII letter case used only in Beta Code output. Defaults to `"lowercase"`. */
  betaCodeCase?: BetaCodeCase;
  /** Beta Code spelling of yot. Defaults to `"j"`; TLG uses `"#401"`. */
  betaCodeYot?: BetaCodeYot;
  /** Archaic-koppa transliteration. Defaults to `"k-dot-below"`; BnF uses `"q"`. */
  archaicKoppa?: ArchaicKoppaTransliteration;
}

/** Unicode representation preferences for Greek output. */
export interface GreekUnicodeOptions {
  /** Composed or decomposed output. Defaults to `"composed"`. */
  composition?: UnicodeComposition;
  /** Tonos/oxia preference for eligible acute vowels. Defaults to `"system"`. */
  acute?: GreekAcuteForm;
  /** Greek question-mark scalar. Defaults to `"canonical"`. */
  questionMark?: GreekQuestionMarkForm;
  /** Greek ano-teleia scalar. Defaults to `"canonical"`. */
  anoTeleia?: GreekAnoTeleiaForm;
}

/**
 * Options shared by conversion functions, helpers, and converters.
 *
 * The three option groups answer three different questions, which is why one
 * name can appear in two of them:
 *
 * - `diacritics.X` asks whether the mark class X is kept: `"preserve"` or
 *   `"remove"` from the document;
 * - `orthography.X` asks how X is written in the target format: a spelling
 *   (`"omit"` means not written in that format, `"greek"` the Greek scalar,
 *   a Latin spelling such as `"ph"`) or a policy such as `"contextual"`;
 * - `unicode.X` asks which Unicode scalar represents X in Greek output.
 *
 * Every accepted value is ASCII; see {@link CONVERSION_OPTION_VALUES}.
 */
export interface ConversionOptions {
  /** Named configuration applied before custom fields. */
  preset?: Preset;
  /** Orthographic and transliteration policies. */
  orthography?: OrthographyOptions;
  /** Greek Unicode representation preferences. */
  unicode?: GreekUnicodeOptions;
  /** Selective diacritic rendering policies. */
  diacritics?: DiacriticOptions;
  /**
   * Removes removable marks, including breathings in Greek and Beta Code.
   * In transliteration, the rough breathing's Latin `h` is retained unless
   * `diacritics.roughBreathing` explicitly requests removal. Greek sigma
   * glyphs are retained unless a sigma orthographic policy is selected.
   */
  removeDiacritics?: boolean;
}

/**
 * Every effective option after defaults, a preset, and custom overrides.
 *
 * This is an output type, returned by `resolveConversionOptions()`. Fields are
 * added in minor releases, so construct it through that function rather than
 * by hand; see the stability policy.
 */
export interface ResolvedConversionOptions {
  /** Effective orthographic and transliteration policies. */
  orthography: Required<OrthographyOptions>;
  /** Effective Greek Unicode representation preferences. */
  unicode: Required<GreekUnicodeOptions>;
  /** Effective disposition of every semantic diacritic class. */
  diacritics: Required<DiacriticOptions>;
  /** Whether removable marks are suppressed in the selected output format. */
  removeDiacritics: boolean;
}

/** Read-only view exposed by {@link DEFAULT_CONVERSION_OPTIONS}. */
export interface DefaultConversionOptions {
  /** Literal default values for orthographic and transliteration policies. */
  readonly orthography: {
    readonly doubleRho: "unmarked";
    readonly medialBeta: "standard";
    readonly coronis: "omit";
    readonly smoothBreathing: "omit";
    readonly circumflexAccent: "tilde";
    readonly quantity: "preserve";
    readonly nasalGamma: "nasal";
    readonly sigma: "standard";
    readonly lunateSigma: "s";
    readonly finalSigma: "contextual";
    readonly numerals: "alphabetic";
    readonly keraia: "greek";
    readonly dentalSigma: "preserve";
    readonly upsilon: "u";
    readonly longVowels: "macron";
    readonly accentuation: "polytonic";
    readonly whitespace: "preserve";
    readonly hyphen: "ascii";
    readonly enotikon: "preserve";
    readonly beta: "b";
    readonly eta: "e-macron";
    readonly xi: "x";
    readonly phi: "ph";
    readonly chi: "ch";
    readonly modernDigraphs: "preserve";
    readonly rho: "contextual";
    readonly letterCase: "preserve";
    readonly betaCodeCase: "lowercase";
    readonly betaCodeYot: "j";
    readonly archaicKoppa: "k-dot-below";
  };
  /** Literal default values for Greek Unicode representation. */
  readonly unicode: {
    readonly composition: "composed";
    readonly acute: "system";
    readonly questionMark: "canonical";
    readonly anoTeleia: "canonical";
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
  /** The default global diacritic-removal shortcut. */
  readonly removeDiacritics: false;
}

/** Accepted values of every field of one option group. */
export type OptionValueTable<T> = {
  readonly [K in keyof T]-?: readonly NonNullable<T[K]>[];
};

/** Every accepted value of every string-valued conversion option, by group. */
export interface ConversionOptionValues {
  /** Accepted values of each orthographic and transliteration policy. */
  readonly orthography: OptionValueTable<OrthographyOptions>;
  /** Accepted values of each Greek Unicode representation preference. */
  readonly unicode: OptionValueTable<GreekUnicodeOptions>;
  /** Accepted values of each semantic diacritic class disposition. */
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
 * table, so it is also the reference for user interfaces and validators.
 */
export const CONVERSION_OPTION_VALUES: ConversionOptionValues = Object.freeze({
  orthography: freezeTable<OrthographyOptions>({
    doubleRho: ["unmarked", "smooth-rough"],
    medialBeta: ["standard", "symbol"],
    coronis: ["omit", "apostrophe", "greek"],
    smoothBreathing: ["omit", "greek", "apostrophe"],
    circumflexAccent: ["tilde", "circumflex"],
    quantity: ["preserve", "omit"],
    nasalGamma: ["nasal", "literal"],
    sigma: ["standard", "lunate", "preserve"],
    lunateSigma: ["s", "c"],
    finalSigma: ["contextual", "medial", "preserve"],
    numerals: ["alphabetic", "decimal"],
    keraia: ["greek", "bnf"],
    dentalSigma: ["preserve", "assimilate"],
    upsilon: ["u", "y", "y-with-diphthong-u", "y-with-au-eu-ou"],
    longVowels: ["macron", "circumflex"],
    accentuation: ["polytonic", "monotonic"],
    whitespace: ["preserve", "collapse"],
    hyphen: ["ascii", "typographic"],
    enotikon: ["preserve", "hyphen"],
    beta: ["b", "v"],
    eta: ["e-macron", "i-macron"],
    xi: ["x", "ks"],
    phi: ["ph", "f"],
    chi: ["ch", "kh"],
    modernDigraphs: ["preserve", "phonetic", "ala-lc"],
    rho: ["contextual", "systematic"],
    letterCase: ["preserve", "lowercase", "uppercase", "title"],
    betaCodeCase: ["lowercase", "uppercase"],
    betaCodeYot: ["j", "#401"],
    archaicKoppa: ["k-dot-below", "q"],
  }),
  unicode: freezeTable<GreekUnicodeOptions>({
    composition: ["composed", "decomposed"],
    acute: ["system", "tonos", "oxia"],
    questionMark: ["canonical", "semicolon", "greek"],
    anoTeleia: ["canonical", "middle-dot", "greek"],
  }),
  diacritics: freezeTable<DiacriticOptions>({
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
 * baseline configuration.
 */
export const DEFAULT_CONVERSION_OPTIONS: DefaultConversionOptions = Object
  .freeze(
    {
      orthography: Object.freeze({
        doubleRho: "unmarked",
        medialBeta: "standard",
        coronis: "omit",
        smoothBreathing: "omit",
        circumflexAccent: "tilde",
        quantity: "preserve",
        nasalGamma: "nasal",
        sigma: "standard",
        lunateSigma: "s",
        finalSigma: "contextual",
        numerals: "alphabetic",
        keraia: "greek",
        dentalSigma: "preserve",
        upsilon: "u",
        longVowels: "macron",
        accentuation: "polytonic",
        whitespace: "preserve",
        hyphen: "ascii",
        enotikon: "preserve",
        beta: "b",
        eta: "e-macron",
        xi: "x",
        phi: "ph",
        chi: "ch",
        modernDigraphs: "preserve",
        rho: "contextual",
        letterCase: "preserve",
        betaCodeCase: "lowercase",
        betaCodeYot: "j",
        archaicKoppa: "k-dot-below",
      }),
      unicode: Object.freeze({
        composition: "composed",
        acute: "system",
        questionMark: "canonical",
        anoTeleia: "canonical",
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
      removeDiacritics: false,
    } as const satisfies ResolvedConversionOptions,
  );
