import { AdditionalChar, Coronis, KeyType, Preset } from './enums';
import { IConversionOptions, MixedPreset } from './interfaces';
import { Mapping } from './Mapping';
import {
  applyGammaNasals,
  fromTLG,
  handleOptions,
  hasAdditionalChar,
  normalizeBetaCode,
  normalizeGreek,
  normalizeTransliteration,
  removeDiacritics as utilRmDiacritics,
  removeExtraWhitespace as utilRmExtraWhitespace,
  removeGreekVariants as utilRmGreekVariants,
  toTLG,
  trApplyUppercaseChars
} from './utils';

/**
 * Converts a string into beta code.
 *
 * @deprecated `greek-conversion` 0.x is no longer maintained. Its successor
 * is `@humanities/greek-conversion`, a rewrite with a new API; see
 * https://github.com/defense-humanites/greek-conversion/blob/main/MIGRATION.md
 */
export function toBetaCode(
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
  const mapping = declaredMapping ?? new Mapping(options);

  const isInputTLG = fromType === KeyType.TLG_BETA_CODE;
  const isOutputTLG = betaCodeStyle?.useTLGStyle;

  if (isInputTLG) fromType = KeyType.BETA_CODE;

  switch (fromType) {
    case KeyType.BETA_CODE:
      if (removeDiacritics) str = utilRmDiacritics(str, fromType);
      str = applyGammaNasals(str, fromType);
      break;

    case KeyType.GREEK:
      str = normalizeGreek(str);
      if (removeDiacritics) str = utilRmDiacritics(str, fromType);
      str = utilRmGreekVariants(str, {
        preserveAccents: true,
        preserveLunateSigma: hasAdditionalChar(AdditionalChar.LUNATE_SIGMA, additionalChars)
      });
      str = mapping.apply(str, fromType, KeyType.BETA_CODE);
      break;

    case KeyType.TRANSLITERATION:
      str = normalizeTransliteration(str, transliterationStyle, isUpperCase);
      str = trApplyUppercaseChars(str);

      // Flag transliterated rough breathings.
      str = str.replace(/(?<=\p{P}|\s|^|r{1,2})h/gimu, '$');

      // Remove the intra-words apostrophes that are invalid chars unless the coronis style uses them.
      if (transliterationStyle?.setCoronisStyle !== Coronis.APOSTROPHE) {
        str = str.replace(
          new RegExp(`(?<=[\\p{L}\\p{M}])${Coronis.APOSTROPHE}(?=\\p{L})`, 'gu'),
          ''
        );
      }

      str = mapping.apply(str, fromType, KeyType.BETA_CODE);

      if (removeDiacritics) {
        str = utilRmDiacritics(str, fromType).replace(/\$/gi, '');
      } else {
        str = trConvertFlaggedBreathings(str);
      }
      break;
  }

  str = normalizeBetaCode(str, betaCodeStyle);

  if (isInputTLG && !isOutputTLG) str = fromTLG(str);
  if (!isInputTLG && isOutputTLG) str = toTLG(str);

  if (removeExtraWhitespace) str = utilRmExtraWhitespace(str);

  return str;
}

/**
 * Returns a string with beta code formated breathings.
 *
 * @remarks
 * This function applies:
 *   1. initial breathings, taking care of diphthongs and diaeresis rules;
 *   2. rough breathing on single rhos (excluding double rhos).
 * Then it removes possibly remaining flagged rough breathings (such as
 * on double rhos).
 */
function trConvertFlaggedBreathings(str: string): string {
  const diphthongs = ['ai', 'au', 'ei', 'eu', 'hu', 'oi', 'ou', 'ui'];
  const vowels = 'aehiouw';
  const diacritics = '()\\/+=|';

  // $1: trRough, $2: firstV, $3: firstD, $4: nextV, $5: nextD.
  const reInitialBreathing = new RegExp(`(?<=(?![${diacritics}])\\p{P}|\\s|^)(\\$?)([${vowels}])([${diacritics}]*)([${vowels}]?)([${diacritics}]*)`, 'gimu'); // prettier-ignore

  return str
    .normalize('NFD')
    .replace(reInitialBreathing, (m, trRough, firstV, firstD, nextV, nextD) => {
      const hasDiphthong = diphthongs.includes((firstV + nextV).toLowerCase());
      const breathing = trRough ? '(' : ')';

      return /* diaeresis */ !/\+/.test(nextD) && hasDiphthong
        ? firstV + firstD + nextV + breathing + nextD
        : firstV + breathing + firstD + nextV + nextD;
    })
    .replace(/(?<!r)(r)\$/gi, '$1(')
    .replace(/\$/g, '')
    .normalize();
}
