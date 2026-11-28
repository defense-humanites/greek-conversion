/**
 * greek-conversion
 * Copyright (C) 2021-2026 Antoine Boquet
 * @license MIT
 */

export { AdditionalChar, Coronis, KeyType, Preset } from './enums';
export { GreekString } from './GreekString';
export { toBetaCode } from './toBetaCode';
export { toGreek } from './toGreek';
export { toTransliteration } from './toTransliteration';
export {
  applyGreekVariants,
  removeDiacritics,
  removeGreekVariants
} from './utils';
