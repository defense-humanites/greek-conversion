/**
 * Advanced access to the canonical document used by the conversion engine.
 *
 * This entry point is experimental during the `1.0.0` prerelease series. It is
 * intended for validation, custom analysis, and controlled transformations.
 * Ordinary conversions should use the package's main entry point instead.
 *
 * A document may be constructed manually, but {@link validateDocument} should
 * be used before encoding data that did not originate from {@link parse}.
 * `Document` has a readonly sequence but mutable tokens; copy the nested
 * diacritic sets when deriving independent versions of one parsed document.
 *
 * @module
 */

export { encode, parse } from "./conversion.ts";
import type { Document } from "./model.ts";
import type { ConversionOptions } from "./options.ts";
import { applyGreekOrthography as applyResolvedGreekOrthography } from "./orthography.ts";
import { resolveConversionOptions } from "./presets.ts";

/** Applies Greek-output policies, resolving preset options before transforming. */
export function applyGreekOrthography(
  document: Document,
  options: ConversionOptions = {},
): Document {
  return applyResolvedGreekOrthography(
    document,
    resolveConversionOptions(options),
  );
}

export {
  type Diacritic,
  type Document,
  type Format,
  type GlyphVariant,
  type Grapheme,
  grapheme,
  type Letter,
  type Literal,
  literal,
  type Token,
} from "./model.ts";
export type { ConversionOptions } from "./options.ts";
export {
  validateDocument,
  type ValidationCode,
  type ValidationDiagnostic,
} from "./validation.ts";
