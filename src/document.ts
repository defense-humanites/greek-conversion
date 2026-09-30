/**
 * Advanced access to the canonical document used by the conversion engine.
 *
 * This supported advanced entry point is intended for validation, custom
 * analysis, and controlled transformations.
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

/**
 * Returns a Greek-output orthographic view after resolving preset options.
 *
 * Some policies remove source distinctions. Keep the original document when
 * encoding other formats, and use `encode(document, "greek", options)` when no
 * intermediate transformed document is needed. The returned tokens and their
 * diacritic sets are detached from the source so callers may edit the view.
 */
export function applyGreekOrthography(
  document: Document,
  options: ConversionOptions = {},
): Document {
  const transformed = applyResolvedGreekOrthography(
    document,
    resolveConversionOptions(options),
  );
  return transformed.map((token) =>
    token.kind === "literal" ? { ...token } : {
      ...token,
      diacritics: new Set(token.diacritics),
    }
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
