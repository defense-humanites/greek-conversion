import {
  CharacterScopeError,
  createConverter,
  FORMATS,
  listPresetMetadata,
} from "../src/mod.ts";
import type {
  ConversionLoss,
  ConversionOptions,
  ConverterConfiguration,
  Format,
  Preset,
} from "../src/mod.ts";
import { encode, parse, validateDocument } from "../src/document.ts";
import { suggestInventory } from "./inventory_suggestions.ts";
import { suggestOptions } from "./options_suggestions.ts";
import type { Suggestion } from "./options_suggestions.ts";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`Missing interface element: ${id}`);
  return found as T;
}

const sourceFormat = element<HTMLSelectElement>("source-format");
const targetFormat = element<HTMLSelectElement>("target-format");
const presetSelect = element<HTMLSelectElement>("preset");
const exampleSelect = element<HTMLSelectElement>("examples");
const source = element<HTMLTextAreaElement>("source");
const output = element<HTMLTextAreaElement>("output");
const sourceLabel = element<HTMLLabelElement>("source-label");
const outputLabel = element<HTMLLabelElement>("output-label");
const optionsInput = element<HTMLTextAreaElement>("options");
const optionsSuggestions = element<HTMLDivElement>("options-suggestions");
const inventoryInput = element<HTMLTextAreaElement>("inventory");
const inventorySuggestions = element<HTMLDivElement>("inventory-suggestions");
const strict = element<HTMLInputElement>("strict");
const status = element<HTMLParagraphElement>("status");
const diagnostics = element<HTMLDivElement>("diagnostics");
const presetInfo = element<HTMLDetailsElement>("preset-info");
const presetSummary = element<HTMLElement>("preset-summary");
const presetBody = element<HTMLDivElement>("preset-body");
const documentPanel = element<HTMLDetailsElement>("document-panel");
const documentPreview = element<HTMLPreElement>("document-preview");
const documentLimit = element<HTMLDivElement>("document-limit");
const documentLimitText = element<HTMLParagraphElement>("document-limit-text");
const documentShowAll = element<HTMLButtonElement>("document-show-all");
const code = element<HTMLElement>("code");
const copyButton = element<HTMLButtonElement>("copy");
const copyCodeButton = element<HTMLButtonElement>("copy-code");
const shareButton = element<HTMLButtonElement>("share");
const swapButton = element<HTMLButtonElement>("swap");

/**
 * Opens a link to another site in a new tab, so that following it never
 * leaves the playground and its work in progress, and marks it as such: an
 * icon kept on the line of the last word, and a phrase for screen readers.
 * Links on the playground's own origin are left as they are.
 */
function markExternal(link: HTMLAnchorElement): void {
  if (new URL(link.href, location.href).origin === location.origin) return;
  link.target = "_blank";
  link.rel = "noopener";
  if (link.querySelector(".external-mark") !== null) return;

  const icon = document.createElement("span");
  icon.className = "external-mark";
  icon.setAttribute("aria-hidden", "true");
  const last = link.lastChild;
  const value = last?.nodeType === Node.TEXT_NODE ? last.textContent ?? "" : "";
  const start = value.search(/\S+\s*$/);
  if (last !== null && start >= 0) {
    const tail = document.createElement("span");
    tail.className = "external-tail";
    tail.append(value.slice(start).trimEnd(), icon);
    last.textContent = value.slice(0, start);
    link.append(tail);
  } else {
    link.append(icon);
  }
  const phrase = document.createElement("span");
  phrase.className = "visually-hidden";
  phrase.textContent = " (opens in a new tab)";
  link.append(phrase);
}

for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
  markExternal(link);
}

/**
 * The circled question mark beside the title: its text shows on hover and
 * keyboard focus (CSS), and a click or tap keeps it open until a second
 * click, Escape, or a click elsewhere. Escape also hides the hover or focus
 * view until the pointer or focus leaves.
 */
const about = element<HTMLDivElement>("about");
const aboutButton = element<HTMLButtonElement>("about-button");
function setAboutOpen(open: boolean): void {
  about.toggleAttribute("data-open", open);
  aboutButton.setAttribute("aria-expanded", String(open));
}
aboutButton.addEventListener("click", () => {
  about.removeAttribute("data-dismissed");
  setAboutOpen(!about.hasAttribute("data-open"));
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!about.matches(":hover, :focus-within, [data-open]")) return;
  setAboutOpen(false);
  about.setAttribute("data-dismissed", "");
});
document.addEventListener("click", (event) => {
  if (!about.contains(event.target as Node)) setAboutOpen(false);
});
about.addEventListener("pointerleave", () => {
  about.removeAttribute("data-dismissed");
});
about.addEventListener("focusout", () => {
  about.removeAttribute("data-dismissed");
});

const FORMAT_NAMES: Readonly<Record<Format, string>> = {
  greek: "Greek",
  "beta-code": "Beta Code",
  transliteration: "Transliteration",
};

function attachSuggestions(
  input: HTMLTextAreaElement,
  list: HTMLDivElement,
  suggest: (value: string, caret: number) => Suggestion[],
): void {
  let visible: Suggestion[] = [];
  let selected = 0;

  function render(): void {
    list.replaceChildren();
    list.hidden = visible.length === 0;
    input.setAttribute(
      "aria-expanded",
      String(!list.hidden),
    );
    for (const [index, suggestion] of visible.entries()) {
      const option = document.createElement("div");
      option.id = `${list.id}-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === selected));
      option.textContent = suggestion.label;
      option.addEventListener("pointerdown", (event) => event.preventDefault());
      option.addEventListener("click", () => accept(index));
      list.append(option);
    }
    if (list.hidden) {
      input.removeAttribute("aria-activedescendant");
    } else {
      input.setAttribute("aria-activedescendant", `${list.id}-${selected}`);
    }
  }

  function refresh(): void {
    visible = suggest(input.value, input.selectionStart);
    selected = 0;
    render();
  }

  function accept(index: number): void {
    const suggestion = visible[index];
    if (!suggestion) return;
    input.setRangeText(
      suggestion.replacement,
      suggestion.start,
      suggestion.end,
      "end",
    );
    input.setSelectionRange(suggestion.cursor, suggestion.cursor);
    input.focus();
    update();
    refresh();
  }

  input.addEventListener("input", refresh);
  input.addEventListener("click", refresh);
  input.addEventListener("focus", refresh);
  input.addEventListener("blur", () => {
    visible = [];
    render();
  });
  input.addEventListener("keydown", (event) => {
    if (!visible.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      selected = (selected +
        (event.key === "ArrowDown" ? 1 : visible.length - 1)) %
        visible.length;
      render();
    } else if (event.key === "Enter") {
      event.preventDefault();
      accept(selected);
    } else if (event.key === "Escape") {
      event.preventDefault();
      visible = [];
      render();
    }
  });
}

const presets = listPresetMetadata();
for (const metadata of presets) {
  presetSelect.add(new Option(metadata.name, metadata.id));
}

/** A complete scenario: loading one sets the text, formats, and settings. */
interface Example {
  label: string;
  text: string;
  from: Format;
  to: Format;
  preset?: Preset;
  options?: ConversionOptions;
}

const THUCYDIDES =
  "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων.";

const EXAMPLES: readonly Example[] = [
  {
    label: "Thucydides, transliterated",
    text: THUCYDIDES,
    from: "greek",
    to: "transliteration",
  },
  {
    label: "Thucydides, ALA-LC",
    text: THUCYDIDES,
    from: "greek",
    to: "transliteration",
    preset: "ala-lc-ancient",
  },
  {
    label: "Thucydides, TLG Beta Code",
    text: THUCYDIDES,
    from: "greek",
    to: "beta-code",
    preset: "tlg-core",
  },
  {
    label: "Monotonic Greek",
    text: "Ποῦ εἶσαι; Ἢ ἐδῶ ἢ ἐκεῖ, καὶ ὄχι ἀλλοῦ.",
    from: "greek",
    to: "greek",
    options: { orthography: { accentuation: "monotonic" } },
  },
  {
    label: "Modern Greek, ALA-LC",
    text: "Βίος και πολιτεία του Αλέξη Ζορμπά",
    from: "greek",
    to: "transliteration",
    preset: "ala-lc-modern",
  },
  {
    label: "Hiatus and iota adscript",
    text: "Ἅιδῃ Ἀίδης ἀίδηλος ἄυλος",
    from: "greek",
    to: "transliteration",
  },
  {
    label: "Numerals and archaic letters",
    text: "αʹ ιβʹ ͵αωκγʹ ϛʹ ϟʹ ϡʹ ϝάναξ",
    from: "greek",
    to: "transliteration",
    preset: "bnf-core",
  },
  {
    label: "Beta Code to Greek",
    text: "*mh=nin a)/eide qea\\ *phlhi+a/dew *)axilh=os",
    from: "beta-code",
    to: "greek",
  },
  {
    label: "Transliteration to Greek",
    text: "Hóti mèn humeĩs, ō̃ ándres Athēnaĩoi",
    from: "transliteration",
    to: "greek",
  },
];

exampleSelect.add(new Option("Choose an example", ""));
for (const [index, example] of EXAMPLES.entries()) {
  exampleSelect.add(new Option(example.label, String(index)));
}

function selectedFormat(select: HTMLSelectElement): Format {
  return select.value as Format;
}

/** Shows each text in the typeface of its format. */
function applyFaces(): void {
  for (
    const [field, label, select] of [
      [source, sourceLabel, sourceFormat],
      [output, outputLabel, targetFormat],
    ] as const
  ) {
    const format = selectedFormat(select);
    for (const name of FORMATS) {
      field.classList.toggle(`face-${name}`, name === format);
    }
    field.lang = format === "greek" ? "grc" : "";
    label.textContent = FORMAT_NAMES[format];
  }
}

function showPreset(): void {
  const metadata = presets.find(({ id }) => id === presetSelect.value);
  presetInfo.hidden = metadata === undefined;
  presetBody.replaceChildren();
  if (metadata === undefined) return;

  const limits = metadata.limitations.length;
  presetSummary.textContent =
    `${metadata.name}: ${metadata.coverage} coverage, ${
      limits === 1 ? "1 known limit" : `${limits} known limits`
    }`;

  const description = document.createElement("p");
  description.textContent = `${metadata.description} For ${
    metadata.scope.join("; ")
  }.`;
  const list = document.createElement("ul");
  for (const limitation of metadata.limitations) {
    const item = document.createElement("li");
    item.textContent = limitation;
    list.append(item);
  }
  const references = document.createElement("p");
  references.append("Based on ");
  metadata.references.forEach((reference, index) => {
    if (index > 0) {
      references.append(
        index === metadata.references.length - 1 ? " and " : ", ",
      );
    }
    const link = document.createElement("a");
    link.href = reference.url;
    link.textContent = reference.title;
    markExternal(link);
    references.append(link);
  });
  references.append(".");
  presetBody.append(description, list, references);
}

function parseSettings<T>(
  input: HTMLTextAreaElement,
  allowed: readonly string[],
  label: string,
): T {
  let value: unknown;
  try {
    value = JSON.parse(input.value.trim() || "{}");
  } catch {
    throw new SyntaxError(`${label}: this is not valid JSON yet.`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label}: expected a JSON object.`);
  }
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new TypeError(
      `${label}: unsupported field (${unknown.join(", ")}).`,
    );
  }
  return value as T;
}

/**
 * The text of each source token, for display beside its diagnostic. The
 * source is read once, on first use: reading it again for every affected
 * letter made a long lossy text quadratic (two seconds per keystroke for
 * 10,000 characters of Latin read as Greek).
 */
function tokenTexts(
  format: Format,
  options: ConversionOptions,
): (index: number) => string {
  let tokens: ReturnType<typeof parse> | null | undefined;
  return (index) => {
    if (tokens === undefined) {
      try {
        tokens = parse(source.value, format, options);
      } catch {
        tokens = null;
      }
    }
    const token = tokens?.[index];
    if (token === undefined) return "";
    return token.kind === "literal" ? token.value : encode([token], "greek");
  };
}

/** Affected letters shown per kind of loss; the status gives the total. */
const LETTERS_PER_ISSUE = 60;

/**
 * Lists diagnostics grouped by message, so that one kind of loss appears
 * once with every letter it affects rather than once per letter.
 */
function showIssues(
  losses: readonly ConversionLoss[],
  scope: readonly { code: string; index: number; message: string }[],
  letters: ((index: number) => string) | undefined,
): void {
  diagnostics.replaceChildren();
  diagnostics.hidden = losses.length + scope.length === 0;
  if (diagnostics.hidden) return;

  for (
    const [label, issues] of [
      ["What the target does not keep", losses],
      ["Characters outside the repertoire", scope],
    ] as const
  ) {
    if (!issues.length) continue;
    const groups = new Map<string, { code: string; indices: number[] }>();
    for (const issue of issues) {
      const group = groups.get(issue.message) ??
        { code: issue.code, indices: [] };
      group.indices.push(issue.index);
      groups.set(issue.message, group);
    }

    const heading = document.createElement("h2");
    heading.textContent = label;
    const list = document.createElement("ul");
    for (const [message, { code: issueCode, indices }] of groups) {
      const item = document.createElement("li");
      const text = document.createElement("p");
      const detail = document.createElement("span");
      detail.className = "code";
      detail.textContent = ` ${issueCode}`;
      text.append(message, detail);
      const affected = document.createElement("p");
      affected.className = "letters";
      for (const index of indices.slice(0, LETTERS_PER_ISSUE)) {
        const letter = document.createElement("span");
        letter.className = "letter";
        letter.lang = "grc";
        letter.title = `Token ${index}`;
        letter.textContent = letters?.(index) || `#${index}`;
        affected.append(letter);
      }
      if (indices.length > LETTERS_PER_ISSUE) {
        const more = document.createElement("span");
        more.className = "more";
        more.textContent = `… and ${indices.length - LETTERS_PER_ISSUE} more`;
        affected.append(more);
      }
      item.append(text, affected);
      list.append(item);
    }
    diagnostics.append(heading, list);
  }
}

/**
 * Tokens shown in the canonical document until the reader asks for all: as
 * pretty JSON, a 10,000-character text makes a megabyte of text to lay out
 * at every keystroke (about 330 ms against 18 ms without the preview).
 */
const PREVIEW_TOKENS = 300;
let showAllTokens = false;

function inspectDocument(options: ConversionOptions): void {
  if (!documentPanel.open) return;
  const parsed = parse(source.value, selectedFormat(sourceFormat), options);
  const shown = showAllTokens ? parsed : parsed.slice(0, PREVIEW_TOKENS);
  documentPreview.textContent = JSON.stringify(
    {
      tokens: shown.map((token) =>
        token.kind === "grapheme"
          ? { ...token, diacritics: [...token.diacritics] }
          : token
      ),
      // Always the whole document, whatever the preview shows.
      validation: validateDocument(parsed),
    },
    null,
    2,
  );
  const truncated = shown.length < parsed.length;
  documentLimit.hidden = !truncated;
  if (truncated) {
    documentLimitText.textContent = `Showing tokens 0 to ${
      shown.length - 1
    } of ${parsed.length}; validation covers them all.`;
  }
}

/** Writes a value as a TypeScript literal, with unquoted identifier keys. */
function literalOf(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z_$][\w$]*)":/g, "$1:");
}

function showCode(
  preset: Preset | "",
  options: ConversionOptions,
  inventory: ConverterConfiguration,
): void {
  const from = JSON.stringify(sourceFormat.value);
  const to = JSON.stringify(targetFormat.value);
  const bound = Object.keys(inventory).length > 0 || strict.checked;
  // The input itself, so that the copied code reproduces this conversion.
  const text = `const text = ${JSON.stringify(source.value)};\n`;

  if (!bound) {
    const all = { ...(preset ? { preset } : {}), ...options };
    const argument = Object.keys(all).length ? `, ${literalOf(all)}` : "";
    code.textContent =
      `import { convert } from "@humanities/greek-conversion";\n\n` +
      text +
      `convert(text, ${from}, ${to}${argument});`;
    return;
  }
  const configuration = {
    ...(preset ? { preset } : {}),
    ...inventory,
    ...(strict.checked ? { outOfScopeBehavior: "reject" } : {}),
  };
  const argument = Object.keys(options).length ? `, ${literalOf(options)}` : "";
  code.textContent =
    `import { createConverter } from "@humanities/greek-conversion";\n\n` +
    text +
    `const converter = createConverter(${literalOf(configuration)});\n` +
    `converter.convert(text, ${from}, ${to}${argument});`;
}

/**
 * The settings panels are open by default; each one the reader closes or
 * opens stays so on the next visit. Browser storage may be unavailable
 * (private windows, blocked site data), in which case the panels simply
 * open by default.
 */
const PANELS_KEY = "greek-conversion:panels";
const panels = [
  "options-panel",
  "characters-panel",
  "code-panel",
  "document-panel",
].map((id) => element<HTMLDetailsElement>(id));

function restorePanels(): void {
  let saved: Record<string, boolean> = {};
  try {
    saved = JSON.parse(localStorage.getItem(PANELS_KEY) ?? "{}");
  } catch {
    return;
  }
  for (const panel of panels) {
    if (typeof saved[panel.id] === "boolean") panel.open = saved[panel.id];
  }
}

function savePanels(): void {
  try {
    localStorage.setItem(
      PANELS_KEY,
      JSON.stringify(
        Object.fromEntries(panels.map((panel) => [panel.id, panel.open])),
      ),
    );
  } catch {
    // Storage unavailable: the panels open by default next time.
  }
}

// Only the reader's own clicks (or Enter and Space on a summary) are
// remembered, not the panels that a shared link opens because they hold
// options or characters.
let panelClicked = false;
for (const panel of panels) {
  panel.querySelector("summary")?.addEventListener("click", () => {
    panelClicked = true;
  });
  panel.addEventListener("toggle", () => {
    if (panelClicked) savePanels();
    panelClicked = false;
  });
}

/** Keeps the page state in the address, so that a link reproduces it. */
function saveState(): void {
  const state = new URLSearchParams({
    from: sourceFormat.value,
    to: targetFormat.value,
    text: source.value,
  });
  if (presetSelect.value) state.set("preset", presetSelect.value);
  if (optionsInput.value.trim()) state.set("options", optionsInput.value);
  if (inventoryInput.value.trim()) {
    state.set("characters", inventoryInput.value);
  }
  if (strict.checked) state.set("strict", "1");
  history.replaceState(null, "", `#${state}`);
}

function restoreState(): void {
  const state = new URLSearchParams(location.hash.slice(1));
  const known = (value: string | null): value is Format =>
    value !== null && (FORMATS as readonly string[]).includes(value);
  const from = state.get("from");
  const to = state.get("to");
  if (known(from)) sourceFormat.value = from;
  if (known(to)) targetFormat.value = to;
  const preset = state.get("preset");
  if (preset && presets.some(({ id }) => id === preset)) {
    presetSelect.value = preset;
  }
  if (state.has("text")) source.value = state.get("text") ?? "";
  optionsInput.value = state.get("options") ?? "";
  inventoryInput.value = state.get("characters") ?? "";
  strict.checked = state.get("strict") === "1";
  for (const panel of [optionsInput, inventoryInput]) {
    if (panel.value) panel.closest("details")?.setAttribute("open", "");
  }
}

function update(): void {
  documentPreview.textContent = "";
  applyFaces();
  const from = selectedFormat(sourceFormat);
  const to = selectedFormat(targetFormat);
  let letters: ((index: number) => string) | undefined;
  try {
    const options = parseSettings<ConversionOptions>(
      optionsInput,
      ["orthography", "diacritics", "unicode", "removeDiacritics"],
      "Options",
    );
    const preset = presetSelect.value as Preset | "";
    const withPreset = { ...options, ...(preset ? { preset } : {}) };
    inspectDocument(withPreset);
    const inventory = parseSettings<ConverterConfiguration>(
      inventoryInput,
      ["aliases", "characters", "repertoire", "exclude"],
      "Character inventory",
    );
    showCode(preset, options, inventory);
    // Token numbers match the built-in reading only without custom characters.
    letters = Object.keys(inventory).length === 0
      ? tokenTexts(from, withPreset)
      : undefined;
    const converter = createConverter({
      ...inventory,
      ...(preset ? { preset } : {}),
      outOfScopeBehavior: strict.checked ? "reject" : "preserve",
    });
    const result = converter.convertDetailed(source.value, from, to, options);

    output.value = result.output;
    copyButton.disabled = swapButton.disabled = false;
    const lost = result.losses.length;
    const outside = result.diagnostics.length;
    status.className = !source.value ? "" : lost ? "lossy" : "ok";
    status.textContent = !source.value
      ? "Type or paste text to convert it."
      : lost
      ? `${
        lost === 1 ? "1 distinction" : `${lost} distinctions`
      } lost: converting the result back will not give the same text.`
      : `Lossless: converting the result back gives the same text.`;
    if (source.value && outside) {
      status.textContent += ` ${
        outside === 1 ? "1 character is" : `${outside} characters are`
      } outside the repertoire and copied through.`;
    }
    showIssues(result.losses, result.diagnostics, letters);
  } catch (error) {
    output.value = "";
    copyButton.disabled = swapButton.disabled = true;
    status.className = "error";
    status.textContent = error instanceof Error ? error.message : String(error);
    showIssues(
      [],
      error instanceof CharacterScopeError ? error.diagnostics : [],
      letters,
    );
  }
  saveState();
}

async function copy(text: string, button: HTMLButtonElement): Promise<void> {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Select and copy manually";
  }
  setTimeout(() => (button.textContent = label), 1600);
}

function loadExample(example: Example): void {
  source.value = example.text;
  sourceFormat.value = example.from;
  targetFormat.value = example.to;
  presetSelect.value = example.preset ?? "";
  optionsInput.value = example.options ? JSON.stringify(example.options) : "";
  if (example.options) {
    optionsInput.closest("details")?.setAttribute("open", "");
  }
  showPreset();
  update();
}

for (const select of [sourceFormat, targetFormat]) {
  select.addEventListener("change", update);
}
presetSelect.addEventListener("change", () => {
  showPreset();
  update();
});
exampleSelect.addEventListener("change", () => {
  const example = EXAMPLES[Number(exampleSelect.value)];
  if (exampleSelect.value && example) loadExample(example);
});
source.addEventListener("input", () => {
  exampleSelect.value = "";
  update();
});
for (const field of [optionsInput, inventoryInput]) {
  field.addEventListener("input", update);
}
attachSuggestions(optionsInput, optionsSuggestions, suggestOptions);
attachSuggestions(inventoryInput, inventorySuggestions, suggestInventory);
strict.addEventListener("change", update);
documentPanel.addEventListener("toggle", update);
documentShowAll.addEventListener("click", () => {
  showAllTokens = true;
  update();
});
swapButton.addEventListener("click", () => {
  const oldSource = sourceFormat.value;
  sourceFormat.value = targetFormat.value;
  targetFormat.value = oldSource;
  source.value = output.value;
  exampleSelect.value = "";
  update();
});
copyButton.addEventListener("click", () => copy(output.value, copyButton));
copyCodeButton.addEventListener(
  "click",
  () => copy(code.textContent ?? "", copyCodeButton),
);
shareButton.addEventListener("click", () => copy(location.href, shareButton));
addEventListener("hashchange", () => {
  restoreState();
  showPreset();
  update();
});

restorePanels();
restoreState();
showPreset();
update();
