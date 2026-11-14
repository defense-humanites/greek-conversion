import {
  CharacterScopeError,
  createConverter,
  FORMATS,
  getPresetOptions,
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
import type { Suggestion } from "./inventory_suggestions.ts";
import {
  actsOn,
  findEntry,
  GROUP_NAMES,
  isAmbiguous,
  knownOptions,
  matchEntries,
  OPTION_ENTRIES,
  sameOptions,
  settingsOf,
  standardValue,
  withSetting,
} from "./option_catalogue.ts";
import type { OptionEntry } from "./option_catalogue.ts";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`Missing interface element: ${id}`);
  return found as T;
}

const sourceInputs = [
  ...document.querySelectorAll<HTMLInputElement>('input[name="source"]'),
];
const targetInputs = [
  ...document.querySelectorAll<HTMLInputElement>('input[name="target"]'),
];
const presetSelect = element<HTMLSelectElement>("preset");
const presetLine = element<HTMLDivElement>("preset-line");
const presetSummary = element<HTMLParagraphElement>("preset-summary");
const presetLimits = element<HTMLUListElement>("preset-limits");
const exampleMenu = element<HTMLSelectElement>("examples");
const source = element<HTMLTextAreaElement>("source");
const sourceMarks = element<HTMLDivElement>("source-marks");
const output = element<HTMLTextAreaElement>("output");
const sourceLabel = element<HTMLSpanElement>("source-label");
const outputLabel = element<HTMLSpanElement>("output-label");
const sourceMeta = element<HTMLSpanElement>("source-meta");
const outputMeta = element<HTMLSpanElement>("output-meta");
const verb = element<HTMLLabelElement>("verb");
const optionPills = element<HTMLUListElement>("option-pills");
const addOptionButton = element<HTMLButtonElement>("add-option");
const optionPicker = element<HTMLDivElement>("option-picker");
const optionSearch = element<HTMLInputElement>("option-search");
const optionStep = element<HTMLParagraphElement>("option-step");
const optionList = element<HTMLDivElement>("option-list");
const sameFormatHint = element<HTMLParagraphElement>("same-format-hint");
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

/** Short names, for the head of the output field. */
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

/**
 * The format a standard governs: Beta Code for the presets that set Beta
 * Code options, transliteration for the others. A standard is offered only
 * when the source or the target is in its format.
 */
function presetFormat(preset: Preset): Format {
  return "betaCode" in getPresetOptions(preset)
    ? "beta-code"
    : "transliteration";
}

/** The reader's standard, kept when the formats hide it for a while. */
let chosenPreset: Preset | "" = "";
/** The last standard chosen for each format, offered again on return. */
const lastPreset: Partial<Record<Format, Preset>> = {};

const PRESET_GROUPS: Readonly<Partial<Record<Format, string>>> = {
  transliteration: "Transliteration",
  "beta-code": "Beta Code",
};

/**
 * Lists the standards that apply to the formats in use, grouped by format
 * when both apply (Beta Code to transliteration). A standard that no longer
 * applies gives way to the last one chosen for the new format, or to none.
 * Returns whether the standard in use changed.
 */
function syncPresets(from: Format, to: Format): boolean {
  const formats: Format[] = [...new Set([from, to])].filter((format) =>
    format !== "greek"
  );
  const before = presetSelect.value;
  const none = new Option("No standard", "");
  presetSelect.replaceChildren(none);
  for (const format of formats) {
    const parent = formats.length > 1
      ? document.createElement("optgroup")
      : presetSelect;
    if (parent instanceof HTMLOptGroupElement) {
      parent.label = PRESET_GROUPS[format] ?? format;
      presetSelect.append(parent);
    }
    for (const metadata of presets) {
      if (presetFormat(metadata.id) !== format) continue;
      const option = new Option(metadata.name, metadata.id);
      option.title = metadata.name;
      parent.append(option);
    }
  }
  const applies = (preset: Preset | "" | undefined): preset is Preset =>
    preset !== undefined && preset !== "" &&
    formats.includes(presetFormat(preset));
  const fallback = formats.map((format) => lastPreset[format]).find(applies);
  presetSelect.value = applies(chosenPreset) ? chosenPreset : fallback ?? "";
  // Greek to Greek: no standard applies.
  presetSelect.disabled = formats.length === 0;
  presetSelect.title = presetSelect.disabled
    ? "Standards apply to transliteration and Beta Code"
    : "";
  return presetSelect.value !== before;
}

/* Source and target formats */

/** The last format read from the text, kept while the text gives no clue. */
let detected: Format = "greek";

/** Whether the source format is detected rather than chosen. */
let sourceAuto = true;
/** The source format checked when the settings were last shown. */
let shownSource: Format = "greek";

/** The reader's choice of source format, or "auto" to detect it. */
function sourceChoice(): Format | "auto" {
  if (sourceAuto) return "auto";
  const checked = sourceInputs.find((input) => input.checked);
  return (checked?.value ?? detected) as Format;
}

function setSourceChoice(choice: Format | "auto"): void {
  sourceAuto = choice === "auto";
  if (choice !== "auto") {
    for (const input of sourceInputs) input.checked = input.value === choice;
  }
}

/**
 * The source format: the reader's choice, or, by default, the one the text
 * shows (`detectFormat`). A text without letters gives no clue; the last
 * detected format then stays, marked as assumed.
 */
function sourceFormat(): Format {
  const choice = sourceChoice();
  if (choice !== "auto") return choice;
  return detectFormat(source.value) ?? detected;
}

/**
 * Checks the source format and says how it was set: a dashed border and the
 * source colour when detected, a solid border when chosen. Screen readers
 * hear "Greek (detected)".
 */
function showDetection(): void {
  const found = detectFormat(source.value);
  if (found !== undefined) detected = found;
  const format = sourceFormat();
  const note = found === undefined ? "assumed" : "detected";
  for (const input of sourceInputs) {
    input.checked = input.value === format;
    const label = input.parentElement as HTMLLabelElement;
    const guessed = sourceAuto && input.checked;
    label.classList.toggle("detected", guessed);
    const spoken = label.querySelector(".source-note");
    if (spoken) spoken.textContent = guessed ? ` (${note})` : "";
    label.title = !input.checked
      ? ""
      : sourceAuto
      ? found === undefined
        ? "Assumed: the text has no letters yet. Choose it to keep it."
        : "Detected from the text. Choose it to keep it."
      : "Chosen. Choose it again to detect the format from the text.";
  }
  shownSource = format;
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

function choosePreset(preset: Preset | ""): void {
  chosenPreset = preset;
  if (preset) lastPreset[presetFormat(preset)] = preset;
}

function showPreset(): void {
  const metadata = presets.find(({ id }) => id === presetSelect.value);
  presetLine.hidden = metadata === undefined;
  presetSummary.replaceChildren();
  presetLimits.replaceChildren();
  presetLimits.hidden = true;
  if (metadata === undefined) return;

  // The menu shows the full name; the description follows it here.
  presetSummary.append(
    `${metadata.description} · ${
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
    sameOptions(example.options ?? {}, conversionOptions)
  );
}

/**
 * Lists the examples of the standard in the menu of the source field: the
 * title, then the rule it shows.
 */
function renderExamples(): void {
  exampleMenu.replaceChildren(new Option("Choose an example", ""));
  examples().forEach((example, index) => {
    exampleMenu.append(
      new Option(`${example.title} — ${example.note}`, String(index)),
    );
  });
  markActiveExample();
}

/** Selects the example on screen in the menu, or none once it is edited. */
function markActiveExample(): void {
  const active = activeExample();
  exampleMenu.value = active ? String(examples().indexOf(active)) : "";
}

function loadExample(example: Example): void {
  source.value = example.text;
  // Detection stays on when it reads the example right.
  setSourceChoice(
    detectFormat(example.text) === example.from ? "auto" : example.from,
  );
  setTarget(example.to);
  conversionOptions = knownOptions(example.options ?? {});
  update();
}

/** Reads one JSON settings field, its keys checked against `allowed`. */
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
 * A loss about a literal token: a character of another script, copied as it
 * is, that the target format cannot set apart from Greek, so that converting
 * back reads it as a Greek letter. Nothing of the Greek is lost.
 */
function readAsGreek(issue: Issue): boolean {
  return issue.code === "unrepresented-literal";
}

/**
 * Underlines, in a copy of the input laid out under it, the letters whose
 * distinctions the conversion loses, and dots those it copies but would read
 * back as Greek. Offsets count UTF-16 code units of the input as typed.
 */
function showMarks(issues: readonly Issue[]): void {
  const text = source.value;
  const ranges = issues
    .map((issue) => ({
      start: issue.offset,
      end: issue.offset + Math.max(issue.length, 1),
      literal: readAsGreek(issue),
    }))
    .sort((a, b) => a.start - b.start);
  sourceMarks.replaceChildren();
  let position = 0;
  for (const { start, end, literal } of ranges) {
    if (end <= position) continue;
    const from = Math.max(start, position);
    sourceMarks.append(text.slice(position, from));
    const mark = document.createElement("mark");
    if (literal) mark.className = "literal";
    mark.textContent = text.slice(from, end);
    sourceMarks.append(mark);
    position = end;
  }
  // A final newline needs a character after it to take up its line.
  sourceMarks.append(text.slice(position) + "\u200b");
  sourceMarks.scrollTop = source.scrollTop;
}

/**
 * Joins the issues of adjacent tokens into runs, so that a word of another
 * script shows as one word rather than letter by letter.
 */
function runsOf(issues: readonly Issue[]): Issue[] {
  const runs: Issue[] = [];
  for (const issue of [...issues].sort((a, b) => a.offset - b.offset)) {
    const last = runs.at(-1);
    if (last && last.offset + last.length === issue.offset) {
      runs[runs.length - 1] = { ...last, length: last.length + issue.length };
    } else {
      runs.push(issue);
    }
  }
  return runs;
}

/** One card of the diagnostics: a kind of issue and the text it affects. */
interface IssueCard {
  title: string;
  count: number;
  text: string;
  code: string;
  affected: readonly Issue[];
}

/** Groups issues by message: one card per kind, with every letter it affects. */
function cardsByMessage(issues: readonly Issue[]): IssueCard[] {
  const groups = new Map<string, { code: string; issues: Issue[] }>();
  for (const issue of issues) {
    const group = groups.get(issue.message) ??
      { code: issue.code, issues: [] };
    group.issues.push(issue);
    groups.set(issue.message, group);
  }
  return [...groups].map(([message, { code, issues: affected }]) => ({
    title: issueTitle(message, code),
    count: affected.length,
    text: message,
    code,
    affected,
  }));
}

/**
 * Lists diagnostics in three sections: the distinctions the target does not
 * keep; the letters of another script it copies but would read back as
 * Greek; and the characters outside the repertoire. Each letter is the text
 * of the input at the diagnostic's offset, as typed: indices count the
 * tokens of the document the conversion prepared, in which a character
 * outside the repertoire may be several literals, so they do not match a
 * reading of the input.
 */
function showIssues(
  losses: readonly ConversionLoss[],
  scope: readonly Issue[],
  format: Format,
): void {
  diagnostics.replaceChildren();
  diagnostics.hidden = losses.length + scope.length === 0;
  if (diagnostics.hidden) return;

  const literals = losses.filter(readAsGreek);
  const sections: [string, IssueCard[]][] = [
    [
      "What the target does not keep",
      cardsByMessage(losses.filter((loss) => !readAsGreek(loss))),
    ],
    [
      "Copied as is, read back as Greek",
      literals.length
        ? [{
          title: "Letters of another script",
          count: literals.length,
          text:
            "The target writes them as they are but cannot set them apart from Greek: converting the result back turns them into Greek letters.",
          code: "unrepresented-literal",
          affected: runsOf(literals),
        }]
        : [],
    ],
    ["Characters outside the repertoire", cardsByMessage(scope)],
  ];

  for (const [label, cards] of sections) {
    if (!cards.length) continue;
    const heading = document.createElement("h2");
    heading.textContent = label;
    const list = document.createElement("ul");
    for (const { title: name, count, text, code, affected } of cards) {
      const item = document.createElement("li");
      const title = document.createElement("h3");
      const total = document.createElement("span");
      total.textContent = String(count);
      title.append(name, total);
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
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
      const codeName = document.createElement("code");
      codeName.className = "code-name";
      codeName.textContent = code;
      item.append(title, paragraph, letters, codeName);
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
    from: sourceChoice(),
    to: targetFormat(),
    text: source.value,
  });
  if (presetSelect.value) state.set("preset", presetSelect.value);
  if (settingsOf(conversionOptions).length) {
    state.set("options", JSON.stringify(conversionOptions));
  }
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
  setSourceChoice(known(from) ? from : "auto");
  if (known(to)) setTarget(to);
  const preset = presets.find(({ id }) => id === state.get("preset"))?.id;
  choosePreset(preset ?? "");
  if (state.has("text")) source.value = state.get("text") ?? "";
  conversionOptions = {};
  try {
    conversionOptions = knownOptions(JSON.parse(state.get("options") ?? "{}"));
  } catch {
    // A damaged link keeps the rest of its settings.
  }
  inventoryInput.value = state.get("characters") ?? "";
  strict.checked = state.get("strict") === "1";
  // A link that carries settings opens on them.
  if (inventoryInput.value || strict.checked) selectTab("tab-characters");
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

/*
 * Conversion options, as pills after the sentence: one per option that
 * departs from the standard, its value a menu, and a picker to add one.
 */

let conversionOptions: ConversionOptions = {};

function setOption(
  entry: OptionEntry,
  value: string | undefined,
): void {
  // The standard's own value is no departure from it.
  const standard = standardValue(currentPreset(), entry.group, entry.key);
  conversionOptions = withSetting(
    conversionOptions,
    entry.group,
    entry.key,
    value === standard ? undefined : value,
  );
  update();
}

/** "Smooth breathing", or "Diacritics: smooth breathing" when both exist. */
function optionName(entry: OptionEntry): string {
  return isAmbiguous(entry)
    ? `${GROUP_NAMES[entry.group]}: ${entry.label.toLowerCase()}`
    : entry.label;
}

/**
 * Draws a pill per option set. The value is a native menu, transparent over
 * a drawn face, as for the source format: the menu keeps the keyboard and
 * what screen readers announce.
 */
function showOptions(from: Format, to: Format): void {
  const preset = currentPreset();
  const pills = settingsOf(conversionOptions).flatMap(
    ({ group, key, value }) => {
      const entry = findEntry(group, key);
      if (entry === undefined) return [];
      const name = optionName(entry);
      const item = document.createElement("li");
      item.className = "option-pill";
      item.dataset.option = `${group}.${key}`;
      if (!actsOn(entry, from, to)) {
        item.classList.add("idle");
        item.title = "No effect on this conversion";
      }
      const label = document.createElement("span");
      label.className = "pill-name";
      label.textContent = name;

      const choice = document.createElement("span");
      choice.className = "pill-value";
      const face = document.createElement("span");
      face.setAttribute("aria-hidden", "true");
      face.textContent = value;
      const menu = document.createElement("select");
      menu.setAttribute("aria-label", name);
      const standard = standardValue(preset, group, key);
      for (const option of entry.values) {
        const element = document.createElement("option");
        element.value = option;
        element.textContent = option === standard
          ? `${option} (standard)`
          : option;
        menu.append(element);
      }
      menu.value = value;
      menu.addEventListener("change", () => {
        const removed = menu.value === standard;
        setOption(entry, menu.value);
        if (removed) addOptionButton.focus();
        else {
          optionPills.querySelector<HTMLSelectElement>(
            `[data-option="${group}.${key}"] select`,
          )?.focus();
        }
      });
      choice.append(face, menu);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "pill-remove";
      remove.setAttribute("aria-label", `Remove ${name}`);
      remove.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
      remove.addEventListener("click", () => {
        setOption(entry, undefined);
        addOptionButton.focus();
      });
      item.append(label, choice, remove);
      return [item];
    },
  );
  // Rebuilt only when it changes, so that a menu in use keeps its focus.
  const signature = JSON.stringify([
    settingsOf(conversionOptions),
    preset,
    from,
    to,
  ]);
  if (optionPills.dataset.signature !== signature) {
    optionPills.dataset.signature = signature;
    optionPills.replaceChildren(...pills);
  }
  optionPills.hidden = pills.length === 0;

  const same = from === to;
  verb.textContent = same ? "Restyle" : "Convert";
  sameFormatHint.hidden = !same;
  addOptionButton.classList.toggle("prompt", same && pills.length === 0);
}

/* The picker: find an option, then choose its value */

let pickerEntry: OptionEntry | undefined;
let pickerItems: { label: string; detail: string; pick: () => void }[] = [];
let pickerActive = 0;

function openPicker(): void {
  pickerEntry = undefined;
  optionSearch.value = "";
  optionPicker.hidden = false;
  addOptionButton.setAttribute("aria-expanded", "true");
  placePicker();
  showPickerItems();
  optionSearch.focus();
}

function closePicker(focusButton: boolean): void {
  if (optionPicker.hidden) return;
  optionPicker.hidden = true;
  addOptionButton.setAttribute("aria-expanded", "false");
  if (focusButton) addOptionButton.focus();
}

/** Under the button, kept inside the settings. */
function placePicker(): void {
  const line = optionPicker.offsetParent as HTMLElement;
  const room = line.clientWidth - optionPicker.offsetWidth;
  optionPicker.style.left = `${
    Math.max(0, Math.min(addOptionButton.offsetLeft, room))
  }px`;
  optionPicker.style.top = `${
    addOptionButton.offsetTop + addOptionButton.offsetHeight + 6
  }px`;
}

function showPickerItems(): void {
  const from = sourceFormat();
  const to = targetFormat();
  const preset = currentPreset();
  optionList.replaceChildren();
  pickerItems = [];

  if (pickerEntry === undefined) {
    optionStep.hidden = true;
    optionSearch.placeholder = "Find an option";
    const set = new Set(
      settingsOf(conversionOptions).map(({ group, key }) => `${group}.${key}`),
    );
    const offered = OPTION_ENTRIES.filter((entry) =>
      actsOn(entry, from, to) && !set.has(`${entry.group}.${entry.key}`)
    );
    let group = "";
    for (const entry of matchEntries(offered, optionSearch.value)) {
      if (entry.group !== group) {
        group = entry.group;
        const heading = document.createElement("div");
        heading.className = "option-group";
        heading.setAttribute("role", "presentation");
        heading.textContent = GROUP_NAMES[entry.group];
        optionList.append(heading);
      }
      pickerItems.push({
        label: entry.label,
        detail: entry.values.join(" · "),
        pick: () => {
          pickerEntry = entry;
          optionSearch.value = "";
          showPickerItems();
        },
      });
      optionList.append(pickerItem(pickerItems.length - 1));
    }
  } else {
    const entry = pickerEntry;
    const standard = standardValue(preset, entry.group, entry.key);
    optionStep.hidden = false;
    optionStep.textContent = `${optionName(entry)}${
      standard ? ` · standard: ${standard}` : ""
    }`;
    optionSearch.placeholder = "Choose a value";
    const needle = optionSearch.value.trim().toLowerCase();
    for (const value of entry.values) {
      if (value === standard || !value.toLowerCase().includes(needle)) {
        continue;
      }
      pickerItems.push({
        label: value,
        detail: "",
        pick: () => {
          closePicker(true);
          setOption(entry, value);
        },
      });
      optionList.append(pickerItem(pickerItems.length - 1));
    }
  }

  if (!pickerItems.length) {
    const empty = document.createElement("div");
    empty.className = "option-empty";
    empty.setAttribute("role", "presentation");
    empty.textContent = pickerEntry ? "No other value" : "No option matches";
    optionList.append(empty);
  }
  setPickerActive(0);
}

function pickerItem(index: number): HTMLDivElement {
  const { label, detail, pick } = pickerItems[index];
  const item = document.createElement("div");
  item.id = `option-item-${index}`;
  item.className = "option-item";
  item.setAttribute("role", "option");
  const name = document.createElement("span");
  name.textContent = label;
  item.append(name);
  if (detail) {
    const values = document.createElement("span");
    values.className = "option-values";
    values.textContent = detail;
    item.append(values);
  }
  // Keeps the focus in the search field.
  item.addEventListener("mousedown", (event) => event.preventDefault());
  item.addEventListener("click", pick);
  return item;
}

function setPickerActive(index: number): void {
  pickerActive = pickerItems.length
    ? (index + pickerItems.length) % pickerItems.length
    : 0;
  for (const item of optionList.querySelectorAll('[role="option"]')) {
    item.setAttribute(
      "aria-selected",
      String(item.id === `option-item-${pickerActive}`),
    );
  }
  const active = document.getElementById(`option-item-${pickerActive}`);
  if (active) {
    optionSearch.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  } else {
    optionSearch.removeAttribute("aria-activedescendant");
  }
}

addOptionButton.addEventListener("click", () => {
  if (optionPicker.hidden) openPicker();
  else closePicker(true);
});
optionSearch.addEventListener("input", showPickerItems);
optionSearch.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    setPickerActive(pickerActive + (event.key === "ArrowDown" ? 1 : -1));
  } else if (event.key === "Enter") {
    event.preventDefault();
    pickerItems[pickerActive]?.pick();
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (pickerEntry) {
      pickerEntry = undefined;
      optionSearch.value = "";
      showPickerItems();
    } else {
      closePicker(true);
    }
  } else if (
    event.key === "Backspace" && pickerEntry && optionSearch.value === ""
  ) {
    pickerEntry = undefined;
    showPickerItems();
  }
});
optionPicker.addEventListener("focusout", (event) => {
  const next = event.relatedTarget as Node | null;
  if (next === null || !optionPicker.contains(next)) {
    if (next !== addOptionButton) closePicker(false);
  }
});
addEventListener("resize", () => {
  if (!optionPicker.hidden) placePicker();
});

/* Conversion */

function update(): void {
  documentPreview.textContent = "";
  showDetection();
  const from = sourceFormat();
  const to = targetFormat();
  if (syncPresets(from, to)) {
    showPreset();
    renderExamples();
  }
  applyFaces(from, to);
  sourceMeta.textContent = source.value
    ? `${[...source.value].length} characters`
    : "";
  const preset = currentPreset();
  outputMeta.textContent = preset ? SHORT_NAMES[preset] : "";
  showOptions(from, to);
  let options: ConversionOptions = {};
  let inventory: ConverterConfiguration = {};
  try {
    options = conversionOptions;
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
    const literals = result.losses.filter(readAsGreek).length;
    const lost = result.losses.length - literals;
    const outside = result.diagnostics.length;
    const literalText = literals
      ? ` ${
        literals === 1
          ? "1 letter of another script is"
          : `${literals} letters of another script are`
      } copied as is but would read back as Greek (dotted).`
      : "";
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
          literalText + outsideText,
      );
    } else if (literals) {
      showVerdict(
        "ok",
        "No distinction lost.",
        literalText.trimStart() + outsideText,
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

for (const input of sourceInputs) {
  // Choosing the format already shown keeps it, or, once kept, goes back to
  // detecting it; choosing another one keeps that one.
  input.addEventListener("click", () => {
    if (input.value === shownSource) {
      sourceAuto = !sourceAuto;
      update();
    }
  });
  // Space on the checked format does nothing natively.
  input.addEventListener("keydown", (event) => {
    if (event.key === " " && input.value === shownSource) {
      event.preventDefault();
      sourceAuto = !sourceAuto;
      update();
      // Detection may check another format: the focus follows it.
      sourceInputs.find((other) => other.checked)?.focus();
    }
  });
  input.addEventListener("change", () => {
    sourceAuto = false;
    update();
  });
}
for (const input of targetInputs) input.addEventListener("change", update);
presetSelect.addEventListener("change", () => {
  choosePreset(currentPreset());
  showPreset();
  renderExamples();
  update();
});
source.addEventListener("input", update);
exampleMenu.addEventListener("change", () => {
  const example = examples()[Number(exampleMenu.value)];
  if (exampleMenu.value !== "" && example) loadExample(example);
});
source.addEventListener("scroll", () => {
  sourceMarks.scrollTop = source.scrollTop;
});
inventoryInput.addEventListener("input", update);
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
  setSourceChoice(detectFormat(source.value) === to ? "auto" : to);
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

restoreTab();
restoreState();
showPreset();
renderExamples();
update();
