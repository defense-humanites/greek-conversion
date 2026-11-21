/**
 * The defaults of the conversion options, in a module of their own: a
 * conversion that takes prepared options (the `./core` entry point) needs
 * them, but not the table of accepted values or the validation, which
 * `options.ts` and `presets.ts` hold.
 *
 * Internal: `DEFAULT_CONVERSION_OPTIONS` is exported by the main entry point
 * through `options.ts`.
 */
import type {
  DefaultConversionOptions,
  ResolvedConversionOptions,
} from "./options.ts";

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
