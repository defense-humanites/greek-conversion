import {
  CharacterScopeError,
  createConverter,
  FORMATS,
  listPresetMetadata,
  resolveConversionOptions,
} from "../src/mod.ts";
import type {
  ConversionLoss,
  ConversionOptions,
  ConverterConfiguration,
  Format,
  Preset,
} from "../src/mod.ts";
import { parse, validateDocument } from "../src/document.ts";
import { detectFormat } from "./detect_format.ts";
import { EXAMPLES } from "./examples.ts";
import type { Example } from "./examples.ts";
import { suggestInventory } from "./inventory_suggestions.ts";
import { suggestOptions } from "./options_suggestions.ts";
import type { Suggestion } from "./options_suggestions.ts";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`Missing interface element: ${id}`);
  return found as T;
}

const sourceSelect = element<HTMLSelectElement>("source-format");
const targetInputs = [
  ...document.querySelectorAll<HTMLInputElement>('input[name="target"]'),
];
const presetSelect = element<HTMLSelectElement>("preset");
const presetLine = element<HTMLDivElement>("preset-line");
const presetSummary = element<HTMLParagraphElement>("preset-summary");
const presetLimits = element<HTMLUListElement>("preset-limits");
const exampleList = element<HTMLDivElement>("examples");
const source = element<HTMLTextAreaElement>("source");
const sourceMarks = element<HTMLDivElement>("source-marks");
const output = element<HTMLTextAreaElement>("output");
const sourceLabel = element<HTMLSpanElement>("source-label");
const outputLabel = element<HTMLSpanElement>("output-label");
const sourceMeta = element<HTMLSpanElement>("source-meta");
const outputMeta = element<HTMLSpanElement>("output-meta");
const optionsInput = element<HTMLTextAreaElement>("options");
const optionsSuggestions = element<HTMLDivElement>("options-suggestions");
const inventoryInput = element<HTMLTextAreaElement>("inventory");
const inventorySuggestions = element<HTMLDivElement>("inventory-suggestions");
const strict = element<HTMLInputElement>("strict");
const status = element<HTMLParagraphElement>("status");
const verdict = status.parentElement as HTMLDivElement;
const diagnostics = element<HTMLElement>("diagnostics");
const documentPreview = element<HTMLPreElement>("document-preview");
const documentLimit = element<HTMLDivElement>("document-limit");
const documentLimitText = element<HTMLParagraphElement>("document-limit-text");
const documentShowAll = element<HTMLButtonElement>("document-show-all");
const code = element<HTMLElement>("code");
const copyButton = element<HTMLButtonElement>("copy");
const copyCodeButton = element<HTMLButtonElement>("copy-code");
const clearButton = element<HTMLButtonElement>("clear");
const shareButton = element<HTMLButtonElement>("share");
const shareNote = element<HTMLParagraphElement>("share-help");
const swapButton = element<HTMLButtonElement>("swap");

const FORMAT_NAMES: Readonly<Record<Format, string>> = {
  greek: "Greek",
  "beta-code": "Beta Code",
  transliteration: "Transliteration",
};

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

/**
 * Short names for the standard menu, so that the settings sentence fits on
 * one line; the full name opens the description under it.
 */
const SHORT_NAMES: Readonly<Record<Preset, string>> = {
  "ala-lc-ancient": "ALA-LC Ancient",
  "ala-lc-modern": "ALA-LC Modern",
  "bnf-core": "BnF",
  "iso-843-type-1": "ISO 843 Type 1",
  "iso-843-type-2": "ISO 843 Type 2",
  perseus: "Perseus",
  "sbl-academic": "SBL Academic",
  "sbl-general": "SBL General",
  "tlg-core": "TLG",
};

const presets = listPresetMetadata();
for (const metadata of presets) {
  const option = new Option(SHORT_NAMES[metadata.id], metadata.id);
  option.title = metadata.name;
  presetSelect.add(option);
}

/* Source and target formats */

const autoOption = sourceSelect.options[0];
/** The last format read from the text, kept while the text gives no clue. */
let detected: Format = "greek";

/**
 * The source format: the reader's choice, or, by default, the one the text
 * shows (`detectFormat`). Plain unaccented Latin letters read the same in
 * Beta Code and in transliteration; the last detected format then stays,
 * marked as assumed.
 */
function sourceFormat(): Format {
  if (sourceSelect.value !== "auto") return sourceSelect.value as Format;
  return detectFormat(source.value) ?? detected;
}

function showDetection(): void {
  const found = detectFormat(source.value);
  if (found !== undefined) detected = found;
  autoOption.textContent = `${FORMAT_NAMES[detected]} · ${
    found === undefined ? "assumed" : "detected"
  }`;
  sourceSelect.classList.toggle("auto", sourceSelect.value === "auto");
  fitSelect(sourceSelect);
}

const measure = document.createElement("canvas").getContext("2d");

/** Fits a menu to the option it shows, as `field-sizing: content` would. */
function fitSelect(select: HTMLSelectElement): void {
  if (measure === null || CSS.supports("field-sizing", "content")) return;
  const style = getComputedStyle(select);
  measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const text = select.selectedOptions[0]?.text ?? "";
  const frame = [
    "paddingLeft",
    "paddingRight",
    "borderLeftWidth",
    "borderRightWidth",
  ]
    .reduce((sum, side) =>
      sum + parseFloat(style.getPropertyValue(
        side.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      )), 0);
  select.style.width = `${
    Math.ceil(measure.measureText(text).width + frame)
  }px`;
}

function targetFormat(): Format {
  const checked = targetInputs.find((input) => input.checked);
  return (checked?.value ?? "transliteration") as Format;
}

function setTarget(format: Format): void {
  for (const input of targetInputs) input.checked = input.value === format;
}

/** Shows each text in the typeface of its format. */
function applyFaces(from: Format, to: Format): void {
  for (
    const [fields, label, format] of [
      [[source, sourceMarks], sourceLabel, from],
      [[output], outputLabel, to],
    ] as const
  ) {
    for (const field of fields) {
      for (const name of FORMATS) {
        field.classList.toggle(`face-${name}`, name === format);
      }
      field.lang = format === "greek" ? "grc" : "";
    }
    label.textContent = FORMAT_NAMES[format];
  }
}

/* The standard: its scope, its limits, its examples */

function currentPreset(): Preset | "" {
  return presetSelect.value as Preset | "";
}

function showPreset(): void {
  const metadata = presets.find(({ id }) => id === presetSelect.value);
  presetLine.hidden = metadata === undefined;
  presetSummary.replaceChildren();
  presetLimits.replaceChildren();
  presetLimits.hidden = true;
  if (metadata === undefined) return;

  const name = document.createElement("strong");
  name.textContent = `${metadata.name}.`;
  presetSummary.append(
    name,
    ` ${metadata.description} · ${
      metadata.coverage === "partial" ? "Partial" : "Full"
    } coverage`,
  );
  const limits = metadata.limitations.length;
  if (limits) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "link-button";
    toggle.textContent = limits === 1
      ? "1 known limitation"
      : `${limits} known limitations`;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", presetLimits.id);
    toggle.addEventListener("click", () => {
      presetLimits.hidden = !presetLimits.hidden;
      toggle.setAttribute("aria-expanded", String(!presetLimits.hidden));
    });
    presetSummary.append(" · ", toggle);
    for (const limitation of metadata.limitations) {
      const item = document.createElement("li");
      item.textContent = limitation;
      presetLimits.append(item);
    }
  }
  for (const reference of metadata.references) {
    const link = document.createElement("a");
    link.href = reference.url;
    link.textContent = reference.title;
    markExternal(link);
    presetSummary.append(" · ", link);
  }
}

function examples(): readonly Example[] {
  return EXAMPLES[currentPreset()];
}

/** The example on screen, if the text and settings are still its own. */
function activeExample(): Example | undefined {
  return examples().find((example) =>
    example.text === source.value &&
    example.to === targetFormat() &&
    example.from === sourceFormat() &&
    (example.options ? JSON.stringify(example.options) : "") ===
      optionsInput.value.trim()
  );
}

function renderExamples(): void {
  exampleList.replaceChildren();
  for (const example of examples()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example";
    if (example.label) {
      const title = document.createElement("span");
      title.className = "title";
      title.textContent = example.label;
      button.append(title);
    } else {
      const pair = document.createElement("span");
      pair.className = "pair";
      const from = document.createElement("span");
      from.className = `face-${example.from}`;
      from.textContent = example.text;
      if (example.from === "greek") from.lang = "grc";
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.setAttribute("aria-label", "to");
      arrow.textContent = "→";
      const to = document.createElement("span");
      to.className = `face-${example.to}`;
      to.textContent = example.output;
      if (example.to === "greek") to.lang = "grc";
      pair.append(from, arrow, to);
      button.append(pair);
    }
    const note = document.createElement("span");
    note.className = "note";
    note.textContent = example.note;
    button.append(note);
    button.addEventListener("click", () => loadExample(example));
    exampleList.append(button);
  }
  markActiveExample();
}

function markActiveExample(): void {
  const active = activeExample();
  examples().forEach((example, index) => {
    exampleList.children[index]?.setAttribute(
      "aria-pressed",
      String(example === active),
    );
  });
}

function loadExample(example: Example): void {
  source.value = example.text;
  // Detection stays on when it reads the example right.
  sourceSelect.value = detectFormat(example.text) === example.from
    ? "auto"
    : example.from;
  setTarget(example.to);
  optionsInput.value = example.options ? JSON.stringify(example.options) : "";
  update();
}

/**
 * Reads one JSON settings field. The keys are checked against `allowed`
 * when a list is given; the conversion options pass none, so that the
 * library's own error names the replacement of a key of an earlier release.
 */
function parseSettings<T>(
  input: HTMLTextAreaElement,
  allowed: readonly string[] | undefined,
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
  if (allowed !== undefined) {
    const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
    if (unknown.length) {
      throw new TypeError(
        `${label}: unsupported field (${unknown.join(", ")}).`,
      );
    }
  }
  return value as T;
}

/* What a conversion loses */

/** Affected letters shown per kind of loss; the status gives the total. */
const LETTERS_PER_ISSUE = 60;

/** A loss or a scope diagnostic: what it says, and where in the input. */
interface Issue {
  code: string;
  index: number;
  offset: number;
  length: number;
  message: string;
}

/**
 * A short name for a kind of loss, from its message ("The target
 * representation does not retain the acute accent." gives "Acute accent"),
 * or its code when the message has no such form.
 */
function issueTitle(message: string, code: string): string {
  const named = /does not retain (?:the |an? )?(.+?)\.?$/.exec(message);
  const title = named?.[1] ?? code.replaceAll("-", " ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Underlines, in a copy of the input laid out under it, the letters whose
 * distinctions the conversion loses. Offsets count UTF-16 code units of the
 * input as typed.
 */
function showMarks(issues: readonly Issue[]): void {
  const text = source.value;
  const ranges = issues
    .map(({ offset, length }) => [offset, offset + Math.max(length, 1)])
    .sort((a, b) => a[0] - b[0]);
  sourceMarks.replaceChildren();
  let position = 0;
  for (const [start, end] of ranges) {
    if (end <= position) continue;
    const from = Math.max(start, position);
    sourceMarks.append(text.slice(position, from));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(from, end);
    sourceMarks.append(mark);
    position = end;
  }
  // A final newline needs a character after it to take up its line.
  sourceMarks.append(text.slice(position) + "​");
  sourceMarks.scrollTop = source.scrollTop;
}

/**
 * Lists diagnostics grouped by message, so that one kind of loss appears
 * once with every letter it affects rather than once per letter. Each letter
 * is the text of the input at the diagnostic's offset, as typed: indices
 * count the tokens of the document the conversion prepared, in which a
 * character outside the repertoire may be several literals, so they do not
 * match a reading of the input.
 */
function showIssues(
  losses: readonly ConversionLoss[],
  scope: readonly Issue[],
  format: Format,
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
    const groups = new Map<string, { code: string; issues: Issue[] }>();
    for (const issue of issues) {
      const group = groups.get(issue.message) ??
        { code: issue.code, issues: [] };
      group.issues.push(issue);
      groups.set(issue.message, group);
    }

    const heading = document.createElement("h2");
    heading.textContent = label;
    const list = document.createElement("ul");
    for (const [message, { code: issueCode, issues: affected }] of groups) {
      const item = document.createElement("li");
      const title = document.createElement("h3");
      const count = document.createElement("span");
      count.textContent = String(affected.length);
      title.append(issueTitle(message, issueCode), count);
      const text = document.createElement("p");
      text.textContent = message;
      const letters = document.createElement("div");
      letters.className = "letters";
      for (const issue of affected.slice(0, LETTERS_PER_ISSUE)) {
        const letter = document.createElement("span");
        letter.className = `letter face-${format}`;
        if (format === "greek") letter.lang = "grc";
        letter.title = `Token ${issue.index}, at ${issue.offset}`;
        letter.textContent =
          source.value.slice(issue.offset, issue.offset + issue.length) ||
          `#${issue.index}`;
        letters.append(letter);
      }
      if (affected.length > LETTERS_PER_ISSUE) {
        const more = document.createElement("span");
        more.className = "more";
        more.textContent = `… and ${affected.length - LETTERS_PER_ISSUE} more`;
        letters.append(more);
      }
      const name = document.createElement("code");
      name.className = "code-name";
      name.textContent = issueCode;
      item.append(title, text, letters, name);
      list.append(item);
    }
    diagnostics.append(heading, list);
  }
}

function showVerdict(
  state: "empty" | "ok" | "lossy" | "error",
  title: string,
  text: string,
): void {
  verdict.className = `verdict ${state}`;
  status.replaceChildren();
  if (title) {
    const strong = document.createElement("strong");
    strong.textContent = title;
    status.append(strong, " ");
  }
  status.append(text);
}

/* Settings and output, in tabs */

const tabs = [
  ...document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
];
const TAB_KEY = "greek-conversion:tab";

function selectedTab(): string {
  return tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.id ??
    "tab-code";
}

/**
 * Shows one tab's panel. The reader's choice is remembered for the next
 * visit; browser storage may be unavailable (private windows, blocked site
 * data), in which case the Code tab opens by default.
 */
function selectTab(id: string, remember = false): void {
  for (const tab of tabs) {
    const selected = tab.id === id;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    element(tab.getAttribute("aria-controls") ?? "").hidden = !selected;
  }
  if (!remember) return;
  try {
    localStorage.setItem(TAB_KEY, id);
  } catch {
    // Storage unavailable: the Code tab opens by default next time.
  }
}

function restoreTab(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(TAB_KEY);
  } catch {
    // Storage unavailable.
  }
  selectTab(tabs.some(({ id }) => id === saved) ? saved! : "tab-code");
}

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    selectTab(tab.id, true);
    update();
  });
  tab.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(tab);
    const next = event.key === "ArrowRight"
      ? tabs[(index + 1) % tabs.length]
      : event.key === "ArrowLeft"
      ? tabs[(index + tabs.length - 1) % tabs.length]
      : event.key === "Home"
      ? tabs[0]
      : event.key === "End"
      ? tabs[tabs.length - 1]
      : undefined;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(next.id, true);
    next.focus();
    update();
  });
}

/**
 * Tokens shown in the canonical document until the reader asks for all: as
 * pretty JSON, a 10,000-character text makes a megabyte of text to lay out
 * at every keystroke (about 330 ms against 18 ms without the preview).
 */
const PREVIEW_TOKENS = 300;
let showAllTokens = false;

function inspectDocument(options: ConversionOptions, from: Format): void {
  if (selectedTab() !== "tab-document") return;
  const parsed = parse(source.value, from, options);
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

/* The same conversion as code, highlighted */

/** Writes a value as a TypeScript literal, with unquoted identifier keys. */
function literalOf(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z_$][\w$]*)":/g, "$1:");
}

const TOKENS = new RegExp(
  [
    String.raw`(?<comment>\/\/.*)`,
    String.raw`(?<string>"(?:\\.|[^"\\])*")`,
    String.raw`(?<keyword>\b(?:import|from|const|true|false|null)\b)`,
    String.raw`(?<function>\b[A-Za-z_$][\w$]*(?=\())`,
    String.raw`(?<key>\b[A-Za-z_$][\w$]*(?=:))`,
    String.raw`(?<punctuation>[{}()[\],;:.=])`,
  ].join("|"),
  "g",
);

/** Shows the generated code, coloured by kind of token. */
function showHighlighted(text: string): void {
  code.replaceChildren();
  let position = 0;
  for (const match of text.matchAll(TOKENS)) {
    const [kind, value] = Object.entries(match.groups ?? {})
      .find(([, found]) => found !== undefined) ?? [];
    if (kind === undefined || value === undefined) continue;
    code.append(text.slice(position, match.index));
    const span = document.createElement("span");
    span.className = `tok-${kind}`;
    span.textContent = value;
    code.append(span);
    position = match.index + value.length;
  }
  code.append(text.slice(position));
}

/** Long results are cut in the comment; the code itself is complete. */
const RESULT_PREVIEW = 100;
let codeText = "";

function showCode(
  from: Format,
  to: Format,
  preset: Preset | "",
  options: ConversionOptions,
  inventory: ConverterConfiguration,
  result: string | undefined,
): void {
  const formats = `${JSON.stringify(from)}, ${JSON.stringify(to)}`;
  const bound = Object.keys(inventory).length > 0 || strict.checked;
  // The input itself, so that the copied code reproduces this conversion.
  const text = `const text = ${JSON.stringify(source.value)};\n\n`;
  const comment = result === undefined ? "" : `\n// → ${
    JSON.stringify(
      result.length > RESULT_PREVIEW
        ? `${result.slice(0, RESULT_PREVIEW)}…`
        : result,
    )
  }`;

  if (!bound) {
    const all = { ...(preset ? { preset } : {}), ...options };
    const argument = Object.keys(all).length ? `, ${literalOf(all)}` : "";
    codeText = `import { convert } from "@humanities/greek-conversion";\n\n` +
      text + `convert(text, ${formats}${argument});` + comment;
  } else {
    const configuration = {
      ...(preset ? { preset } : {}),
      ...inventory,
      ...(strict.checked ? { outOfScopeBehavior: "reject" } : {}),
    };
    const argument = Object.keys(options).length
      ? `, ${literalOf(options)}`
      : "";
    codeText =
      `import { createConverter } from "@humanities/greek-conversion";\n\n` +
      text +
      `const converter = createConverter(${literalOf(configuration)});\n` +
      `converter.convert(text, ${formats}${argument});` + comment;
  }
  showHighlighted(codeText);
}

/* State in the address, so that a link reproduces the conversion */

function saveState(): void {
  const state = new URLSearchParams({
    from: sourceSelect.value,
    to: targetFormat(),
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
  sourceSelect.value = known(from) ? from : "auto";
  if (known(to)) setTarget(to);
  const preset = state.get("preset");
  presetSelect.value = preset && presets.some(({ id }) => id === preset)
    ? preset
    : "";
  if (state.has("text")) source.value = state.get("text") ?? "";
  optionsInput.value = state.get("options") ?? "";
  inventoryInput.value = state.get("characters") ?? "";
  strict.checked = state.get("strict") === "1";
  // A link that carries settings opens on them.
  if (optionsInput.value) selectTab("tab-options");
  else if (inventoryInput.value || strict.checked) selectTab("tab-characters");
}

/*
 * The fields grow with their text: through CSS (`field-sizing: content`)
 * where the browser supports it, otherwise by measuring the text.
 */
const SIZES_ITSELF = CSS.supports("field-sizing", "content");

function fitHeight(field: HTMLTextAreaElement): void {
  if (SIZES_ITSELF) return;
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
}

/* Conversion */

function update(): void {
  documentPreview.textContent = "";
  showDetection();
  const from = sourceFormat();
  const to = targetFormat();
  applyFaces(from, to);
  sourceMeta.textContent = source.value
    ? `${[...source.value].length} characters`
    : "";
  const preset = currentPreset();
  outputMeta.textContent = preset ? SHORT_NAMES[preset] : "";
  let options: ConversionOptions = {};
  let inventory: ConverterConfiguration = {};
  try {
    options = parseSettings<ConversionOptions>(
      optionsInput,
      undefined,
      "Options",
    );
    const withPreset = { ...options, ...(preset ? { preset } : {}) };
    resolveConversionOptions(withPreset);
    inspectDocument(withPreset, from);
    inventory = parseSettings<ConverterConfiguration>(
      inventoryInput,
      ["aliases", "characters", "repertoire", "exclude"],
      "Character inventory",
    );
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
    const outsideText = outside
      ? ` ${
        outside === 1 ? "1 character is" : `${outside} characters are`
      } outside the repertoire and copied through.`
      : "";
    if (!source.value) {
      showVerdict("empty", "", "Type or paste text to convert it.");
    } else if (lost) {
      showVerdict(
        "lossy",
        `${lost === 1 ? "1 distinction" : `${lost} distinctions`} lost.`,
        "Converting the result back will not give the same text. Underlined letters lose a distinction." +
          outsideText,
      );
    } else {
      showVerdict(
        "ok",
        "Lossless.",
        "Converting the result back gives the same text." + outsideText,
      );
    }
    showMarks(result.losses);
    showIssues(result.losses, result.diagnostics, from);
    showCode(from, to, preset, options, inventory, result.output);
  } catch (error) {
    output.value = "";
    copyButton.disabled = swapButton.disabled = true;
    showVerdict(
      "error",
      "",
      error instanceof Error ? error.message : String(error),
    );
    showMarks([]);
    showIssues(
      [],
      error instanceof CharacterScopeError ? error.diagnostics : [],
      from,
    );
    showCode(from, to, preset, options, inventory, undefined);
  }
  fitHeight(source);
  fitHeight(output);
  markActiveExample();
  saveState();
}

async function copy(text: string, button: HTMLButtonElement): Promise<void> {
  const label = button.querySelector(".button-label") ?? button;
  const original = label.textContent;
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = "Copied";
  } catch {
    label.textContent = "Select and copy manually";
  }
  setTimeout(() => (label.textContent = original), 1600);
}

let shareTimer: ReturnType<typeof setTimeout> | undefined;

/** Copies the address, which holds the whole conversion, and says so. */
async function share(): Promise<void> {
  clearTimeout(shareTimer);
  try {
    await navigator.clipboard.writeText(location.href);
    shareNote.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = "Link copied.";
    shareNote.append(
      strong,
      " It opens this text with the same source, target, standard and settings.",
    );
  } catch {
    shareNote.textContent =
      "The link could not be copied: copy the address from the address bar. It holds the text, formats, standard and settings.";
  }
  shareTimer = setTimeout(() => (shareNote.textContent = ""), 6000);
}

sourceSelect.addEventListener("change", update);
for (const input of targetInputs) input.addEventListener("change", update);
presetSelect.addEventListener("change", () => {
  showPreset();
  renderExamples();
  update();
});
source.addEventListener("input", update);
source.addEventListener("scroll", () => {
  sourceMarks.scrollTop = source.scrollTop;
});
for (const field of [optionsInput, inventoryInput]) {
  field.addEventListener("input", update);
}
attachSuggestions(optionsInput, optionsSuggestions, suggestOptions);
attachSuggestions(inventoryInput, inventorySuggestions, suggestInventory);
strict.addEventListener("change", update);
documentShowAll.addEventListener("click", () => {
  showAllTokens = true;
  update();
});
swapButton.addEventListener("click", () => {
  // The result becomes the text to convert, back to the format it came from.
  const from = sourceFormat();
  const to = targetFormat();
  source.value = output.value;
  sourceSelect.value = detectFormat(source.value) === to ? "auto" : to;
  setTarget(from);
  update();
});
clearButton.addEventListener("click", () => {
  source.value = "";
  update();
  source.focus();
});
copyButton.addEventListener("click", () => copy(output.value, copyButton));
copyCodeButton.addEventListener("click", () => copy(codeText, copyCodeButton));
shareButton.addEventListener("click", share);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") shareNote.textContent = "";
});
document.addEventListener("click", (event) => {
  if (!shareButton.parentElement?.contains(event.target as Node)) {
    shareNote.textContent = "";
  }
});
addEventListener("hashchange", () => {
  restoreState();
  showPreset();
  renderExamples();
  update();
});

// The menu is measured again once its typeface has loaded.
void document.fonts.ready.then(() => fitSelect(sourceSelect));

restoreTab();
restoreState();
showPreset();
renderExamples();
update();
