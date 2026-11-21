/**
 * The Greek writer.
 *
 * Internal: exported by the `./greek` entry point.
 */
import { makeWriter, type Writer, type WriterHooks } from "../codec.ts";
import { encodeGreek, greekGlyphForm } from "../encode.ts";
import { supplyKaiAccents } from "../kai_accent.ts";
import { applyOrthography } from "../orthography.ts";

/** How Greek is written. */
export const GREEK_WRITING: WriterHooks & { readonly format: "greek" } = {
  format: "greek",
  prepare: (document, options, targets) =>
    applyOrthography(
      supplyKaiAccents(document, "greek", options),
      options,
      targets,
      "greek",
    ),
  write: encodeGreek,
  form: (options) => options.greek.composition === "decomposed" ? "NFD" : "NFC",
  glyphForm: greekGlyphForm,
};

/**
 * Writes Greek script, for the functions of the `./core` entry point.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { betaCodeReader } from "@humanities/greek-conversion/beta-code";
 * import { greekWriter } from "@humanities/greek-conversion/greek";
 *
 * convert("lo/gos", betaCodeReader, greekWriter); // "λόγος"
 * ```
 */
export const greekWriter: Writer<"greek"> = /* @__PURE__ */ makeWriter(
  GREEK_WRITING,
);
