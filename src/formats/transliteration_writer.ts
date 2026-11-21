/**
 * The transliteration writer.
 *
 * Internal: exported by the `./transliteration` entry point.
 */
import { makeWriter, type Writer, type WriterHooks } from "../codec.ts";
import { encodeTransliteration, transliterationGlyphForm } from "../encode.ts";
import { supplyKaiAccents } from "../kai_accent.ts";
import { applyNumeralOrthography } from "../orthography.ts";

/** How transliteration is written. */
export const TRANSLITERATION_WRITING: WriterHooks & {
  readonly format: "transliteration";
} = {
  format: "transliteration",
  prepare: (document, options, targets) =>
    applyNumeralOrthography(
      supplyKaiAccents(document, "transliteration", options),
      options,
      targets,
      "transliteration",
    ),
  write: encodeTransliteration,
  form: () => "NFC",
  glyphForm: transliterationGlyphForm,
};

/**
 * Writes scientific transliteration, for the functions of the `./core` entry
 * point.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { greekReader } from "@humanities/greek-conversion/greek";
 * import { transliterationWriter } from "@humanities/greek-conversion/transliteration";
 *
 * convert("λόγος", greekReader, transliterationWriter); // → lógos
 * ```
 */
export const transliterationWriter: Writer = /* @__PURE__ */ makeWriter(
  TRANSLITERATION_WRITING,
);
