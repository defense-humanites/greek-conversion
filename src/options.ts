/** Controls marks added to a pair of consecutive rho in Greek output. */
export type DoubleRhoOrthography = "unmarked" | "smooth-rough";

/** Selects standard beta or the medial lowercase symbol `ϐ` in Greek output. */
export type MedialBetaOrthography = "standard" | "symbol";

/** Selects how a semantic coronis is represented in transliteration. */
export type CoronisOrthography = "omit" | "apostrophe" | "greek";

/** Selects contextual nasal gamma (`n`) or literal gamma (`g`). */
export type NasalGammaOrthography = "nasal" | "literal";

/** Selects standard, lunate, or source-preserving sigma glyphs. */
export type SigmaOrthography = "standard" | "lunate" | "preserve";

/** Selects `s` or `c` for a provenanced lunate sigma in transliteration. */
export type LunateSigmaTransliteration = "s" | "c";

/** Selects contextual final sigma or a uniform medial sigma in Greek output. */
export type FinalSigmaOrthography = "contextual" | "medial" | "preserve";

/** Preserves marked alphabetic numerals or renders valid groups as decimals. */
export type NumeralOrthography = "alphabetic" | "decimal";

/** Preserves a dental before sigma or applies the lossy assimilation. */
export type DentalSigmaOrthography = "preserve" | "assimilate";

/** Selects the transliterated spelling of upsilon. */
export type UpsilonOrthography = "u" | "y" | "y-with-diphthong-u";

/**
 * Selects whether structural eta and omega length is shown by macron or
 * circumflex in transliteration. Explicit philological macrons remain
 * independent semantic marks.
 */
export type LongVowelOrthography =
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
export type TransliterationHyphen = "ascii" | "typographic";

/** Selects `b` or modern `v` for beta in transliteration. */
export type BetaTransliteration = "b" | "v";

/** Selects `ē` or `ī` for eta in transliteration. */
export type EtaTransliteration = "ē" | "ī";

/** Selects `x` or `ks` for xi in transliteration. */
export type XiTransliteration = "x" | "ks";

/** Selects `ph` or `f` for phi in transliteration. */
export type PhiTransliteration = "ph" | "f";

/** Selects `ch` or `kh` for chi in transliteration. */
export type ChiTransliteration = "ch" | "kh";

/** Selects preservation or a supported modern-Greek digraph policy. */
export type ModernDigraphOrthography = "preserve" | "phonetic" | "ala-lc";

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
export type YotBetaCode = "j" | "#401";

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
  coronis?: CoronisOrthography;
  /** Nasal gamma spelling. Defaults to `"nasal"`. */
  nasalGamma?: NasalGammaOrthography;
  /** Sigma glyph policy. Defaults to `"standard"`. */
  sigma?: SigmaOrthography;
  /** Provenanced lunate sigma transliteration. Defaults to `"s"`. */
  lunateSigma?: LunateSigmaTransliteration;
  /** Lowercase final sigma policy in Greek output. Defaults to `"contextual"`; `"preserve"` retains source Greek sigma shapes. */
  finalSigma?: FinalSigmaOrthography;
  /** Alphabetic or decimal numeral output. Defaults to `"alphabetic"`. */
  numerals?: NumeralOrthography;
  /** Dental assimilation before sigma. Defaults to `"preserve"`. */
  dentalSigma?: DentalSigmaOrthography;
  /** Upsilon transliteration. Defaults to `"u"`. */
  upsilon?: UpsilonOrthography;
  /** Structural long-vowel marker: `"macron"` or `"circumflex"`. */
  longVowels?: LongVowelOrthography;
  /** Greek accentuation system. Defaults to `"polytonic"`. */
  accentuation?: GreekAccentuation;
  /** Whitespace rendering. Defaults to `"preserve"`. */
  whitespace?: WhitespaceOrthography;
  /** Transliteration hyphen. Defaults to `"ascii"`. */
  hyphen?: TransliterationHyphen;
  /** Beta transliteration. Defaults to `"b"`. */
  beta?: BetaTransliteration;
  /** Eta transliteration. Defaults to `"ē"`. */
  eta?: EtaTransliteration;
  /** Xi transliteration. Defaults to `"x"`. */
  xi?: XiTransliteration;
  /** Phi transliteration. Defaults to `"ph"`. */
  phi?: PhiTransliteration;
  /** Chi transliteration. Defaults to `"ch"`. */
  chi?: ChiTransliteration;
  /** Modern-Greek digraph policy. Defaults to `"preserve"`. */
  modernDigraphs?: ModernDigraphOrthography;
  /** Rho transliteration. Defaults to `"contextual"`. */
  rho?: RhoTransliteration;
  /** Semantic letter case applied to recognized graphemes. Defaults to `"preserve"`. */
  letterCase?: LetterCaseOrthography;
  /** Insignificant ASCII letter case used only in Beta Code output. Defaults to `"lowercase"`. */
  betaCodeCase?: BetaCodeCase;
  /** Beta Code spelling of yot. Defaults to `"j"`; TLG uses `"#401"`. */
  yotBetaCode?: YotBetaCode;
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

/** Options shared by conversion functions, helpers, and converters. */
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

/** Fully populated conversion options used internally after resolution. */
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
    readonly nasalGamma: "nasal";
    readonly sigma: "standard";
    readonly lunateSigma: "s";
    readonly finalSigma: "contextual";
    readonly numerals: "alphabetic";
    readonly dentalSigma: "preserve";
    readonly upsilon: "u";
    readonly longVowels: "macron";
    readonly accentuation: "polytonic";
    readonly whitespace: "preserve";
    readonly hyphen: "ascii";
    readonly beta: "b";
    readonly eta: "ē";
    readonly xi: "x";
    readonly phi: "ph";
    readonly chi: "ch";
    readonly modernDigraphs: "preserve";
    readonly rho: "contextual";
    readonly letterCase: "preserve";
    readonly betaCodeCase: "lowercase";
    readonly yotBetaCode: "j";
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
        nasalGamma: "nasal",
        sigma: "standard",
        lunateSigma: "s",
        finalSigma: "contextual",
        numerals: "alphabetic",
        dentalSigma: "preserve",
        upsilon: "u",
        longVowels: "macron",
        accentuation: "polytonic",
        whitespace: "preserve",
        hyphen: "ascii",
        beta: "b",
        eta: "ē",
        xi: "x",
        phi: "ph",
        chi: "ch",
        modernDigraphs: "preserve",
        rho: "contextual",
        letterCase: "preserve",
        betaCodeCase: "lowercase",
        yotBetaCode: "j",
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
