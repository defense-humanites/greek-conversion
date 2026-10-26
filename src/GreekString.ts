import { KeyType, Preset } from './enums';
import { IConversionOptions, MixedPreset } from './interfaces';
import { Mapping } from './Mapping';
import { toBetaCode } from './toBetaCode';
import { toGreek } from './toGreek';
import { toTransliteration } from './toTransliteration';
import { handleOptions, handleTLGInput, notImplementedError } from './utils';

/**
 * Holds the beta code, Greek and transliterated representations of a string.
 *
 * @deprecated `greek-conversion` 0.x is no longer maintained. Its successor
 * is `@humanities/greek-conversion`, a rewrite with a new API; see
 * https://github.com/defense-humanites/greek-conversion/blob/main/MIGRATION.md
 */
export class GreekString {
  readonly #fromType: KeyType;
  readonly #options: IConversionOptions;
  readonly #mapping: Mapping;
  readonly #source: string;

  #betaCode: string;
  #greek: string;
  #transliteration: string;

  constructor(
    str: string,
    fromType: KeyType,
    settings?: Preset | MixedPreset | Partial<IConversionOptions>
  ) {
    const options = handleOptions(str, fromType, settings);

    if (fromType === KeyType.TLG_BETA_CODE) {
      [str, fromType] = handleTLGInput(str);
    }

    this.#fromType = fromType;
    this.#options = options;
    this.#mapping = new Mapping(options);
    this.#source = str;

    this.#handleConversion(this.#fromType);
  }

  #handleConversion(toType: KeyType): void {
    const conversionSource = (): string => {
      switch (this.#fromType) {
        case KeyType.BETA_CODE:
          return !this.#options.betaCodeStyle?.useTLGStyle
            ? this.#betaCode ?? this.#source
            : this.source;
        case KeyType.TRANSLITERATION:
          return this.#transliteration ?? this.#source;
        case KeyType.GREEK:
          return this.#greek ?? this.#source;
        default:
          throw notImplementedError('KeyType', toType);
      }
    };

    switch (toType) {
      case KeyType.BETA_CODE:
        this.#betaCode = toBetaCode(
          conversionSource(),
          this.#fromType,
          this.#options,
          this.#mapping
        );
        break;

      case KeyType.GREEK:
        this.#greek = toGreek(
          conversionSource(),
          this.#fromType,
          this.#options,
          this.#mapping
        );
        break;

      case KeyType.TRANSLITERATION:
        this.#transliteration = toTransliteration(
          conversionSource(),
          this.#fromType,
          this.#options,
          this.#mapping
        );
        break;
    }
  }

  get betaCode(): string {
    if (!this.#betaCode) this.#handleConversion(KeyType.BETA_CODE);
    return this.#betaCode;
  }

  get greek(): string {
    if (!this.#greek) this.#handleConversion(KeyType.GREEK);
    return this.#greek;
  }

  get source(): string {
    return this.#source;
  }

  get transliteration(): string {
    if (!this.#transliteration) this.#handleConversion(KeyType.TRANSLITERATION);
    return this.#transliteration;
  }
}
