// @ts-check
/**
 * Code blocks in the colors of the playground's code (`web/shared/tokens.css`):
 * keywords in cobalt, strings in the orange of the target, functions in ink,
 * comments muted, on the code background, with the same rounded frame.
 * Expressive Code needs literal colors: they are read from the tokens
 * themselves, for Papier (light, `:root`) and Nuit (dark, the
 * `prefers-color-scheme: dark` block), so that a change there reaches the
 * site as it reaches the playground.
 */
import { readFileSync } from "node:fs";
import { defineEcConfig, ExpressiveCodeTheme } from "@astrojs/starlight/expressive-code";

const TOKENS = readFileSync(
  new URL("../shared/tokens.css", import.meta.url),
  "utf8",
);

/**
 * The value of each custom property of the first `:root` block after
 * `start` in tokens.css.
 * @param {number} start
 * @returns {Record<string, string>}
 */
function tokens(start) {
  const open = TOKENS.indexOf(":root {", start);
  const block = TOKENS.slice(open, TOKENS.indexOf("}", open));
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
}

/**
 * The colors of the code in one appearance.
 * @param {Record<string, string>} t
 */
function colors(t) {
  return {
    background: t["--code-bg"],
    ink: t["--ink"],
    muted: t["--code-muted"],
    keyword: t["--code-keyword"],
    string: t["--code-string"],
    function: t["--code-function"],
    selection: t["--line"],
  };
}

/**
 * @param {"light" | "dark"} type
 * @param {Record<string, string>} c
 */
function theme(type, c) {
  return new ExpressiveCodeTheme({
    name: `greek-conversion-${type}`,
    type,
    colors: {
      "editor.background": c.background,
      "editor.foreground": c.ink,
      "editor.selectionBackground": c.selection,
      "editorLineNumber.foreground": c.muted,
    },
    // As the playground's code (`web/playground/styles.css`, `.tok-*`):
    // keywords bold in cobalt, numbers in cobalt, strings in orange,
    // functions bold, comments muted and in italics, the rest in ink: object
    // keys and punctuation read apart from a comment. A string's quotes take
    // its colour.
    tokenColors: [
      { settings: { foreground: c.ink } },
      {
        scope: ["comment", "punctuation.definition.comment"],
        settings: { foreground: c.muted, fontStyle: "italic" },
      },
      {
        scope: [
          "keyword",
          "storage",
          "storage.type",
          "storage.modifier",
          "constant.language",
          "variable.language",
        ],
        settings: { foreground: c.keyword, fontStyle: "bold" },
      },
      {
        scope: ["keyword.operator", "punctuation", "meta.brace"],
        settings: { foreground: c.ink, fontStyle: "" },
      },
      {
        scope: ["punctuation.definition.string"],
        settings: { foreground: c.string },
      },
      { scope: ["constant.numeric"], settings: { foreground: c.keyword } },
      {
        scope: ["string", "constant.character"],
        settings: { foreground: c.string },
      },
      {
        scope: ["entity.name.function", "support.function", "meta.function-call"],
        settings: { foreground: c.function, fontStyle: "bold" },
      },
      {
        scope: ["meta.object-literal.key", "variable.other.property"],
        settings: { foreground: c.ink },
      },
      {
        scope: ["variable", "variable.other.readwrite"],
        settings: { foreground: c.ink },
      },
    ],
  });
}

const light = theme("light", colors(tokens(0)));
const dark = theme(
  "dark",
  colors(tokens(TOKENS.indexOf("@media (prefers-color-scheme: dark)"))),
);

/**
 * The playground's copy icon (`web/playground/index.html`): a 24px grid,
 * 2px rounded stroke, as every icon of the design system. Expressive Code
 * draws it as a mask, in the button's foreground colour.
 */
const COPY_ICON = `url("data:image/svg+xml,${
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  )
}")`;

export default defineEcConfig({
  themes: [dark, light],
  // The tokens' colors as they are: they already contrast enough.
  minSyntaxHighlightingColorContrast: 0,
  styleOverrides: {
    borderRadius: "6px",
    borderColor: "var(--line)",
    borderWidth: "1px",
    codeFontFamily: "var(--face-code)",
    uiFontFamily: "var(--face-ui)",
    codeFontSize: "0.875rem",
    codeLineHeight: "1.65",
    codePaddingBlock: "1rem",
    codePaddingInline: "1.25rem",
    frames: {
      shadowColor: "transparent",
      frameBoxShadowCssValue: "none",
      editorTabBarBackground: "var(--raised)",
      editorActiveTabBackground: "var(--code-bg)",
      editorActiveTabIndicatorTopColor: "var(--to)",
      editorTabBarBorderBottomColor: "var(--line)",
      terminalTitlebarBackground: "var(--raised)",
      terminalTitlebarBorderBottomColor: "var(--line)",
      terminalTitlebarDotsForeground: "var(--line)",
      terminalBackground: "var(--code-bg)",
      // The copy button as the playground's secondary buttons: no fill, a
      // line border (darker on hover, in theme.css), the icon in ink.
      copyIcon: COPY_ICON,
      inlineButtonForeground: "var(--ink)",
      inlineButtonBackground: "var(--raised)",
      inlineButtonBackgroundIdleOpacity: "0",
      inlineButtonBackgroundHoverOrFocusOpacity: "0",
      inlineButtonBackgroundActiveOpacity: "0",
      inlineButtonBorder: "var(--line)",
      inlineButtonBorderOpacity: "1",
      tooltipSuccessBackground: "var(--link)",
      tooltipSuccessForeground: "var(--surface)",
    },
  },
});
