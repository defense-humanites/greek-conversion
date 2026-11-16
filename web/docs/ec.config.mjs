// @ts-check
/**
 * Code blocks in the colors of the playground's code (`web/shared/tokens.css`):
 * keywords in cobalt, strings in the orange of the target, functions in ink,
 * comments muted, on the code background, with the same rounded frame.
 * Expressive Code needs literal colors: these are the tokens' values, for
 * Papier (light) and Nuit (dark).
 */
import { defineEcConfig, ExpressiveCodeTheme } from "@astrojs/starlight/expressive-code";

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
          "constant.language",
          "variable.language",
        ],
        settings: { foreground: c.keyword },
      },
      {
        scope: ["string", "constant.character", "constant.numeric"],
        settings: { foreground: c.string },
      },
      {
        scope: ["entity.name.function", "support.function", "meta.function-call"],
        settings: { foreground: c.function, fontStyle: "bold" },
      },
      {
        scope: ["variable", "variable.other", "meta.object-literal.key"],
        settings: { foreground: c.ink },
      },
      {
        scope: ["punctuation", "meta.brace", "keyword.operator"],
        settings: { foreground: c.muted },
      },
    ],
  });
}

const light = theme("light", {
  background: "#fbf8f2",
  ink: "#1f2a44",
  muted: "#5e5a63",
  keyword: "#2f4fa8",
  string: "#a9461c",
  function: "#1f2a44",
  selection: "#e2d9c8",
});

const dark = theme("dark", {
  background: "#191f31",
  ink: "#d9ddeb",
  muted: "#9aa3bf",
  keyword: "#c9d3ec",
  string: "#e08a5e",
  function: "#f4ecdd",
  selection: "#323a5c",
});

export default defineEcConfig({
  themes: [dark, light],
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
      inlineButtonBorder: "var(--line)",
      tooltipSuccessBackground: "var(--from)",
    },
  },
});
