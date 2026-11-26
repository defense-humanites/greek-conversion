/**
 * The Beta Code writer.
 *
 * Internal: exported by the `./beta-code` entry point.
 */
import { makeWriter, type Writer, type WriterHooks } from "../codec.ts";
import { betaCodeGlyphForm, encodeBetaCode } from "../encode.ts";
import { kaiAccents } from "../steps.ts";
import { applyOrthography } from "../orthography.ts";

/** How Beta Code is written. */
export const BETA_CODE_WRITING: WriterHooks & {
  readonly format: "beta-code";
} = {
  format: "beta-code",
  prepare: (document, options, targets) =>
    applyOrthography(
      kaiAccents(document, "beta-code", options),
      options,
      targets,
      "beta-code",
    ),
  write: encodeBetaCode,
  form: () => "NFC",
  finish: (text) => text,
  glyphForm: betaCodeGlyphForm,
};

/**
 * Writes TLG Beta Code, for the functions of the `./core` entry point.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { betaCodeWriter } from "@humanities/greek-conversion/beta-code";
 * import { greekReader } from "@humanities/greek-conversion/greek";
 *
 * convert("λόγος", greekReader, betaCodeWriter); // → lo/gos
 * ```
 */
export const betaCodeWriter: Writer = /* @__PURE__ */ makeWriter(
  BETA_CODE_WRITING,
);
