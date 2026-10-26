import { AdditionalChar, Coronis, KeyType, Preset } from './enums';
import {
  IConversionOptions,
  IInternalConversionOptions,
  MixedPreset
} from './interfaces';
import {
  DIAERESIS,
  Mapping,
  RIGHT_SINGLE_QUOTATION_MARK,
  ROUGH_BREATHING,
  SMOOTH_BREATHING
} from './Mapping';
import {
  handleOptions,
  handleTLGInput, hasAdditionalChar,
  normalizeBetaCode,
  normalizeTransliteration,
  notImplementedError,
  removeDiacritics as utilRmDiacritics,
  removeExtraWhitespace as utilRmExtraWhitespace,
  removeGreekVariants as utilRmGreekVariants
} from './utils';

/**
 * Converts a string into a transliteration.
 *
 * @deprecated `greek-conversion` 0.x is no longer maintained. Its successor
 * is `@humanities/greek-conversion`, a rewrite with a new API; see
 * https://github.com/defense-humanites/greek-conversion/blob/main/MIGRATION.md
 */
export function toTransliteration(
  str: string,
  fromType: KeyType,
  settings: Preset | MixedPreset | Partial<IConversionOptions> = {},
  declaredMapping?: Mapping
): string {
  const options = handleOptions(str, fromType, settings);
  const {
    additionalChars,
    removeDiacritics,
    removeExtraWhitespace,
    betaCodeStyle,
    transliterationStyle,
    isUpperCase
  } = options;
  const {
    setCoronisStyle,
    useCxOverMacron,
    muPi_b,
    nuTau_d,
    rho_rh,
    upsilon_y
  } = transliterationStyle ?? {};
  const mapping = declaredMapping ?? new Mapping(options);

  if (upsilon_y) str = flagDiaereses(str, fromType);

  if (fromType === KeyType.TLG_BETA_CODE) [str, fromType] = handleTLGInput(str);

  switch (fromType) {
    case KeyType.BETA_CODE:
      str = normalizeBetaCode(str, betaCodeStyle);
      str = bcFlagRoughBreathings(str, options);
      if (removeDiacritics) str = utilRmDiacritics(str, fromType);
      str = mapping.apply(str, fromType, KeyType.TRANSLITERATION);
      str = bcConvertBreathings(str, options);
      break;

    case KeyType.GREEK:
      str = grConvertBreathings(str, options);
      if (removeDiacritics) str = utilRmDiacritics(str, fromType);
      str = utilRmGreekVariants(str, {
        preserveAccents: true,
        preserveLunateSigma: hasAdditionalChar(AdditionalChar.LUNATE_SIGMA, additionalChars),
      });
      str = mapping.apply(str, fromType, KeyType.TRANSLITERATION);
      break;

    case KeyType.TRANSLITERATION:
      str = normalizeTransliteration(str, transliterationStyle, isUpperCase);

      if (removeDiacritics) {
        str = utilRmDiacritics(
          str,
          fromType,
          mapping.trLettersWithCxOrMacron(),
          useCxOverMacron
        );
      }

      str = mapping.apply(str, fromType, fromType);

      if (rho_rh) {
        str = str
          .replace(/rr(?!h)/gi, (m) =>
            m.toUpperCase() === m ? m + 'H' : m + 'h'
          )
          .replace(/(?<=\p{P}|\s|^)r/gimu, (m) =>
            options.isUpperCase ? m + 'H' : m + 'h'
          );
      }
      break;
  }

  if (upsilon_y) {
    str = applyUpsilonDiphthongs(str, options, mapping).replace(/@/gm, '');
  }

  if (muPi_b) {
    str = str.replace(/(?<=\p{P}|\s|^)(m)p/gimu, (m, $1) =>
      $1.toUpperCase() === $1 ? 'B' : 'b'
    );
  }

  if (nuTau_d) {
    str = str.replace(/(?<=\p{P}|\s|^)(n)t/gimu, (m, $1) =>
      $1.toUpperCase() === $1 ? 'D̲' : 'd̲'
    );
  }

  if (removeExtraWhitespace) str = utilRmExtraWhitespace(str);

  // @FIXME It should be part of a normalization processes (cf. `./utils.ts` >
  //        `normalizeTransliteration()`), but transliteration normalization is
  //        currently not handled as expected.
  // \u02BC = 'modified letter apostrophe'; \u0027 = 'apostrophe'.
  str = str.replace(/[\u02BC\u0027]/g, RIGHT_SINGLE_QUOTATION_MARK);

  return trApplyCoronis(str, setCoronisStyle);
}

/**
 * Returns a transliterated string with correct upsilon forms.
 *
 * @remarks
 * This applies to the `transliterationStyle.upsilon_y` option. If its
 * value has been set to `Preset.ISO`, diphthongs 'au', 'eu', 'ou' only
 * will be preserved.
 *
 * @privateRemarks
 * (1) The expected input form of the upsilon is 'y'.
 * (2) Upsilon diphthongs to preserve are: 'au', 'eu', 'ēu', 'ou', 'ui', 'ōu'.
 * (3) The given string's diaereses should have been flagged as '@' using
 * the `flagDiaereses()` function.
 */
function applyUpsilonDiphthongs(
  transliteratedStr: string,
  options: IInternalConversionOptions,
  mapping: Mapping
): string {
  const { transliterationStyle } = options;
  const reUpsilonDiphthongs = /([aeioy\p{M}@]{2,})/giu;

  return transliteratedStr
    .normalize('NFD')
    .replace(/u/gi, (m) => (m.toUpperCase() === m ? 'Y' : 'y')) // not optimal
    .replace(reUpsilonDiphthongs, (m, vowelsGroup) => {
      if (!/y/i.test(vowelsGroup)) return vowelsGroup;
      if (/* flagged diaeresis */ /@/.test(vowelsGroup)) return vowelsGroup;
      if (vowelsGroup.normalize().length === 1) return vowelsGroup;

      if (transliterationStyle?.upsilon_y === Preset.ISO) {
        const unaccentedGroup = utilRmDiacritics(
          vowelsGroup,
          KeyType.TRANSLITERATION,
          mapping.trLettersWithCxOrMacron(),
          transliterationStyle?.useCxOverMacron
        );
        if (!/ay|ey|oy/i.test(unaccentedGroup)) return vowelsGroup;
      }

      return vowelsGroup.replace(/Y/, 'U').replace(/y/, 'u');
    })
    .normalize();
}

/**
 * Returns a transliterated string with transliterated breathings.
 *
 * @remarks
 * This function does:
 *   1. convert flagged rough breathings;
 *   2. enforce rough breathings on rhos if `transliterationStyle.rho_rh` is enabled;
 *   3. remove initial smooth breathings (while keeping coronides);
 *   4. remove potential smooth breathings on rhos.
 *   5. transliterate the remaining smooth breathings.
 *
 * @param transliteratedStr - Expects an already transliterated string with flagged
 * rough breathings ('$', '$$').
 * @param options - Internal conversion options.
 */
function bcConvertBreathings(
  transliteratedStr: string,
  options: IInternalConversionOptions
): string {
  const { isUpperCase, transliterationStyle } = options;

  transliteratedStr = transliteratedStr
    .replace(/\$\$/g, 'H')
    .replace(/\$/g, 'h');

  if (transliterationStyle?.rho_rh) {
    transliteratedStr = transliteratedStr
      .replace(new RegExp(`(r${SMOOTH_BREATHING}?r)(?!h)`, 'gi'), (m) =>
        m.toUpperCase() === m ? 'RRH' : 'rrh'
      )
      .replace(/(?<=\p{P}|\\s|^)(r)(?!h)/gimu, (m) =>
        // @fixme(v0.15): case should be checked against the current word.
        isUpperCase ? m + 'H' : m + 'h'
      );
  }

  const vowels = 'aeēiouō';
  const reInitialSmooth = new RegExp(`(?<=\\p{P}|\\s|^)([${vowels}]{1,2})(${SMOOTH_BREATHING})`, 'gimu'); // prettier-ignore

  transliteratedStr = transliteratedStr
    .replace(reInitialSmooth, '$1')
    .replace(new RegExp(`(r)${SMOOTH_BREATHING}`, 'gi'), '$1');

  return transliteratedStr;
}

/**
 * Returns a beta code string with an unambiguous representation
 * of rough breathings (`h` -> `$`, `H` -> `$$`).
 *
 * @remarks
 * Rough breathings are ambiguous as letter `h` is transliterated
 * as `ē` or `ê`.
 */
function bcFlagRoughBreathings(
  betaCodeStr: string,
  options: IInternalConversionOptions
): string {
  const { isUpperCase } = options;

  return betaCodeStr
    .replace(/([aehiouw]{1,2})\(/gi, (m, vowelsGroup) => {
      // @fixme(v0.15): case should be checked against the current word too.
      if (isUpperCase) return '$$' + vowelsGroup;
      else {
        return vowelsGroup.charAt(0).toUpperCase() === vowelsGroup.charAt(0)
          ? '$$' + vowelsGroup.toLowerCase()
          : '$' + vowelsGroup;
      }
    })
    .replace(/(r{1,2})\(/gi, (m, rho) =>
      isUpperCase ? rho + '$$' : rho + '$'
    );
}

/**
 * Returns a string with added 'commercial at' when diaereses occur
 * (`\u0308` + `@`) to be able to test the presence of diaereses even
 * if the diacritics have been removed.
 */
function flagDiaereses(str: string, fromType: KeyType): string {
  switch (fromType) {
    case KeyType.BETA_CODE:
      return str.replace(new RegExp('\\+', 'g'), '$&@');

    case KeyType.GREEK:
    case KeyType.TRANSLITERATION:
      return str
        .normalize('NFD')
        .replace(new RegExp(DIAERESIS, 'g'), '$&@')
        .normalize();

      default:
        throw notImplementedError("KeyType", fromType);
  }
}

/**
 * Returns a greek string with transliterated breathings.
 *
 * @remarks
 * This function does:
 *   1. remove initial smooth breathings (while keeping coronides);
 *   2. add an `h` before a word starting by 1-2 vowels carrying a rough breathing;
 *   3. add an `h` after double rhos;
 *   4. add an `h` after a single rho (carrying a rough breathing or not if `rho_rh` is true).
 */
function grConvertBreathings(
  greekStr: string,
  options: IInternalConversionOptions
): string {
  const { isUpperCase, transliterationStyle } = options;
  const { rho_rh } = transliterationStyle ?? {};

  const reInitialSmooth = new RegExp(`(?<=\\p{P}|\\s|^)([αεηιουω]{1,2})(${SMOOTH_BREATHING})`, 'gimu'); // prettier-ignore
  const reInitialRough = new RegExp(`([αεηιοωυ]{1,2})(${ROUGH_BREATHING})`, 'gi'); // prettier-ignore
  const reDoubleRhoLazy = new RegExp(`(ρ${SMOOTH_BREATHING}?ρ)${ROUGH_BREATHING}?`, 'gi'); //prettier-ignore
  const reInitialRho = new RegExp(`(ρ)${ROUGH_BREATHING}`, 'gi');
  const reInitialRhoLazy = new RegExp(`(?<=\\p{P}|\\s|^)(ρ)${ROUGH_BREATHING}?`, 'gimu'); // prettier-ignore

  return greekStr
    .normalize('NFD')
    .replace(reInitialSmooth, '$1')
    .replace(reInitialRough, (m, vowelsGroup) => {
      // @fixme(v0.15): case should be checked against the current word too.
      if (isUpperCase) return 'H' + vowelsGroup;
      else {
        return vowelsGroup.charAt(0).toUpperCase() === vowelsGroup.charAt(0)
          ? 'H' + vowelsGroup.toLowerCase()
          : 'h' + vowelsGroup;
      }
    })
    .replace(reDoubleRhoLazy, (m, doubleRho) =>
      doubleRho.toUpperCase() === doubleRho ? 'RRH' : 'rrh'
    )
    .replace(rho_rh ? reInitialRhoLazy : reInitialRho, (m, initialRho) =>
      isUpperCase ? initialRho + 'H' : initialRho + 'h'
    )
    .normalize();
}

/**
 * Returns a transliterated string with converted coronides,
 * following the given `coronisStyle`.
 */
function trApplyCoronis(
  transliteratedStr: string,
  coronisStyle?: Coronis
): string {
  transliteratedStr = transliteratedStr
    .normalize('NFD')
    .replace(
      new RegExp(`(?<=\\S)${Coronis.APOSTROPHE}(?=\\S)`, 'gu'),
      SMOOTH_BREATHING
    );

  switch (coronisStyle) {
    case Coronis.APOSTROPHE:
      transliteratedStr = transliteratedStr.replace(
        new RegExp(`(${SMOOTH_BREATHING})(\\p{M}*)`, 'gu'),
        (m, $1, $2) => $2 + Coronis.APOSTROPHE
      );
      break;

    case Coronis.NO:
      transliteratedStr = transliteratedStr.replace(
        new RegExp(SMOOTH_BREATHING, 'g'),
        ''
      );
      break;

    case Coronis.PSILI:
    default:
      transliteratedStr = transliteratedStr.replace(
        new RegExp(`(\\p{M}*)(${SMOOTH_BREATHING})`, 'gu'),
        (m, $1, $2) => $2 + $1
      );
      break;
  }

  return transliteratedStr.normalize();
}
