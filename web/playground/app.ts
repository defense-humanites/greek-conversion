import {
  CharacterScopeError,
  createConverter,
  FORMATS,
  getPresetOptions,
  listPresetMetadata,
  resolveConversionOptions,
} from "../../src/mod.ts";
import type {
  CharacterAliasDefinition,
  ConversionLoss,
  ConversionOptions,
  Converter,
  ConverterConfiguration,
  CustomCharacterDefinition,
  Format,
  Preset,
  Token,
} from "../../src/mod.ts";
import { parseDetailed, validateDocument } from "../../src/document.ts";
import { icon } from "../shared/icons.ts";
import { detectFormat } from "./detect_format.ts";
import { changedSpans, firstChange, PROBE_GREEK } from "./option_probe.ts";
import { exampleFrom, EXAMPLES, INVALID_MARKS, sourceOf } from "./examples.ts";
import type { Example, MarksExample, SourceStyle } from "./examples.ts";
import {
  aliasSummary,
  characterChoices,
  characterName,
  customSummary,
  FORMAT_LABELS,
  knownInventory,
  matchCharacters,
  splitSpellings,
  withAlias,
  withCharacter,
  withListItem,
  withoutEntry,
  withoutListItem,
} from "./inventory.ts";
import type { CharacterList, Inventory } from "./inventory.ts";
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
const presetLimits = element<HTMLOListElement>("preset-limits");
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
const optionStepName = element<HTMLSpanElement>("option-step-name");
const optionBack = element<HTMLButtonElement>("option-back");
const optionList = element<HTMLDivElement>("option-list");
const sameFormatHint = element<HTMLParagraphElement>("same-format-hint");
const sourceState = element<HTMLSpanElement>("source-state");
const sourceLine = element<HTMLDivElement>("source-line");
const sourceStyleSelect = element<HTMLSelectElement>("source-style");
const outputMarks = element<HTMLDivElement>("output-marks");
const inventoryBox = element<HTMLDivElement>("inventory");
const inventoryPicker = element<HTMLDivElement>("inventory-picker");
const strict = element<HTMLInputElement>("strict");
const status = element<HTMLParagraphElement>("status");
const verdict = status.parentElement as HTMLDivElement;
const diagnostics = element<HTMLElement>("diagnostics");
const documentPreview = element<HTMLPreElement>("document-preview");
const documentTable = element<HTMLDivElement>("document-table");
const documentLimit = element<HTMLDivElement>("document-limit");
const documentLimitText = element<HTMLParagraphElement>("document-limit-text");
const documentShowAll = element<HTMLButtonElement>("document-show-all");
const code = element<HTMLElement>("code");
const copyButton = element<HTMLButtonElement>("copy");
const copyCodeButton = element<HTMLButtonElement>("copy-code");
const clearButton = element<HTMLButtonElement>("clear");
const resetButton = element<HTMLButtonElement>("reset");
const resetNote = element<HTMLParagraphElement>("reset-note");
const shareButton = element<HTMLButtonElement>("share");
const shareNote = element<HTMLParagraphElement>("share-help");
const swapButton = element<HTMLButtonElement>("swap");

const FORMAT_NAMES: Readonly<Record<Format, string>> = {
  greek: "Greek",
  "beta-code": "Beta Code",
  transliteration: "Transliteration",
};

/**
 * Opens a link that leaves the playground in a new tab, so that following
 * it never loses the work in progress, and marks it as such: an icon kept
 * on the line of the last word, and a phrase for screen readers. That is a
 * link to another site, or to the documentation, as the documentation
 * opens the playground; links within the playground are left as they are.
 */
const PLAYGROUND = new URL("./", location.href).pathname;

function markExternal(link: HTMLAnchorElement): void {
  const target = new URL(link.href, location.href);
  if (
    target.origin === location.origin &&
    target.pathname.startsWith(PLAYGROUND)
  ) return;
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
/**
 * The last choice for each format, offered again on return: a standard, or
 * "" when the reader chose none.
 */
const lastPreset: Partial<Record<Format, Preset | "">> = {};

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
  // When "written in" says how the transliteration is written, the standard
  // is the output's.
  const formats: Format[] = [
    ...new Set(readsStyle(from, to) ? [to] : [from, to]),
  ].filter((format) => format !== "greek");
  const before = presetSelect.value;
  const none = new Option("Library defaults", "");
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
  // A standard of a format in use, or the reader's choice of none for it.
  const fallback = formats.map((format) => lastPreset[format]).find((
    preset,
  ) => preset === "" || applies(preset));
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
  // By touch, without titles, the state shows beside the verb.
  sourceState.textContent = !touchOnly()
    ? ""
    : sourceAuto
    ? note
    : "tap again to detect";
  shownSource = format;
}

function targetFormat(): Format {
  const checked = targetInputs.find((input) => input.checked);
  return (checked?.value ?? "transliteration") as Format;
}

function setTarget(format: Format): void {
  for (const input of targetInputs) input.checked = input.value === format;
}

/*
 * How the source is written. Reading transliteration depends on its style,
 * which the standard and the options otherwise describe: they write the
 * output and read the input alike, which normalizes a text in its own
 * style. When the source is transliteration and the output is not Greek
 * (whose standard is the source's), "written in" says how the input is
 * written, as the library's `source` option does.
 */

/** The reader's choice; `""` reads the input as the output is written. */
let sourceStyle: SourceStyle = "";

/** Whether "written in" was shown at the last update. */
let styleShown = false;

/**
 * Towards Greek, the standard describes the source: a style the reader gave
 * it becomes the standard, so that the text is still read as written.
 */
function keepStyle(from: Format, to: Format): void {
  const shown = readsStyle(from, to);
  if (styleShown && !shown && from === "transliteration" && sourceStyle) {
    choosePreset(sourceStyle === "defaults" ? "" : sourceStyle);
    sourceStyle = "";
  }
  styleShown = shown;
}

/** Whether the reader says how the source is written. */
function readsStyle(from: Format, to: Format): boolean {
  return from === "transliteration" && to !== "greek";
}

/**
 * Lists the styles the source may be written in. Between two
 * transliterations, the default reads it as the output writes it; towards
 * Beta Code, whose standards say nothing of transliteration, the default is
 * the library's style, refined by the options.
 */
function syncSourceStyle(from: Format, to: Format): void {
  const shown = readsStyle(from, to);
  sourceLine.hidden = !shown;
  if (!shown) return;
  const restyle = to === "transliteration";
  if (!restyle && sourceStyle === "defaults") sourceStyle = "";
  if (sourceStyleSelect.dataset.for !== to) {
    sourceStyleSelect.dataset.for = to;
    sourceStyleSelect.replaceChildren(
      ...(restyle
        ? [
          new Option("Same as the output", ""),
          new Option("Library defaults", "defaults"),
        ]
        : [new Option("Library defaults", "")]),
      ...presets.filter(({ id }) => presetFormat(id) === "transliteration")
        .map(({ id, name }) => new Option(name, id)),
    );
  }
  sourceStyleSelect.value = sourceStyle;
}

/**
 * The `source` option of the conversion in use. Towards Beta Code, the
 * transliteration options refine the style the source is written in.
 */
function sourceOption(
  from: Format,
  to: Format,
  options: ConversionOptions,
): ConversionOptions["source"] {
  if (!readsStyle(from, to)) return undefined;
  const style = sourceOf(sourceStyle);
  if (style === undefined || to === "transliteration") return style;
  return {
    ...style,
    ...(options.transliteration
      ? { transliteration: options.transliteration }
      : {}),
  };
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
  if (preset) {
    lastPreset[presetFormat(preset)] = preset;
    return;
  }
  // The defaults: for every format in use, until the reader picks a standard.
  for (const format of [sourceFormat(), targetFormat()]) {
    if (format !== "greek") lastPreset[format] = "";
  }
}

/**
 * What the library's defaults write: in transliteration, the letters of the
 * SBL Handbook with the marks it leaves out; in Beta Code, the spelling of
 * Perseus, whose options they share. Both for every character the library
 * knows, where a standard keeps to its repertoire.
 */
function defaultsText(): string {
  const formats = new Set([sourceFormat(), targetFormat()]);
  const transliteration = formats.has("transliteration")
    ? "the letters of the SBL Handbook, with the accents, iota subscript, diaeresis, and quantity marks it leaves out"
    : "";
  const betaCode = formats.has("beta-code") ? "the spelling of Perseus" : "";
  const spelling = transliteration && betaCode
    ? `In transliteration, ${transliteration}; in Beta Code, ${betaCode}`
    : (transliteration || betaCode).replace(/^t/, "T");
  return spelling &&
    `${spelling}. Every character the library knows is converted.`;
}

function showPreset(): void {
  const metadata = presets.find(({ id }) => id === presetSelect.value);
  presetSummary.replaceChildren();
  presetLimits.replaceChildren();
  presetLimits.hidden = true;
  if (metadata === undefined) {
    const text = defaultsText();
    presetSummary.textContent = text;
    presetLine.hidden = text === "";
    return;
  }
  presetLine.hidden = false;

  // The menu shows the full name. Here: the description, the standard's
  // own text, the coverage, then the limitations, last, since they unfold.
  presetSummary.append(metadata.description);
  for (const reference of metadata.references) {
    const link = document.createElement("a");
    link.href = reference.url;
    link.textContent = reference.title;
    markExternal(link);
    presetSummary.append(" · ", link);
  }
  presetSummary.append(
    ` · ${metadata.coverage === "partial" ? "Partial" : "Full"} coverage`,
  );
  const limits = metadata.limitations.length;
  if (limits) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "link-button";
    const label = limits === 1
      ? "1 known limitation"
      : `${limits} known limitations`;
    // The last word and the chevron stay together, as for external links.
    const space = label.lastIndexOf(" ");
    const tail = document.createElement("span");
    tail.className = "external-tail";
    const chevron = document.createElement("span");
    chevron.className = "disclosure-mark";
    chevron.setAttribute("aria-hidden", "true");
    tail.append(label.slice(space + 1), chevron);
    toggle.append(label.slice(0, space + 1), tail);
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
}

/**
 * The examples of the standard. Once the reader chooses the source format,
 * each is written in that format, and those that cannot be are left out.
 */
function examples(): readonly Example[] {
  const preset = currentPreset();
  const choice = sourceChoice();
  if (choice === "auto") return EXAMPLES[preset];
  return EXAMPLES[preset].flatMap((example) =>
    exampleFrom(example, choice, preset) ?? []
  );
}

/** The examples of invalid marks: one per format, or the chosen one's. */
function marksExamples(): number[] {
  const choice = sourceChoice();
  return INVALID_MARKS.flatMap((example, index) =>
    choice === "auto" || example.from === choice ? [index] : []
  );
}

/** A format's name within a sentence. */
function formatInProse(format: Format): string {
  return format === "transliteration"
    ? "transliteration"
    : FORMAT_NAMES[format];
}

/** The source choice the examples were last listed for. */
let examplesFor: Format | "auto" | undefined;

/** The example on screen, if the text and settings are still its own. */
function activeExample(): Example | undefined {
  return examples().find((example) =>
    example.text === source.value &&
    example.to === targetFormat() &&
    example.from === sourceFormat() &&
    (example.sourceStyle ?? "") === sourceStyle &&
    sameOptions(example.options ?? {}, conversionOptions)
  );
}

/**
 * Lists the examples of the standard in the menu of the source field: the
 * title, then the rule it shows. Under them, whatever the standard, a text
 * with marks Greek does not allow, which are hard to type: one per format,
 * or one in the chosen source format.
 */
function renderExamples(): void {
  examplesFor = sourceChoice();
  exampleMenu.replaceChildren(new Option("Choose an example", ""));
  const standard = document.createElement("optgroup");
  const name = currentPreset()
    ? `${presets.find(({ id }) => id === currentPreset())?.name ?? ""}`
    : "Library defaults";
  standard.label = examplesFor === "auto"
    ? name
    : `${name}, from ${formatInProse(examplesFor)}`;
  examples().forEach((example, index) => {
    standard.append(
      new Option(`${example.title} — ${example.note}`, String(index)),
    );
  });
  if (!standard.children.length) {
    const others = FORMATS.filter((format) =>
      format !== examplesFor &&
      EXAMPLES[currentPreset()].some((example) =>
        exampleFrom(example, format, currentPreset())
      )
    ).map(formatInProse);
    const none = new Option(
      `None from ${formatInProse(examplesFor as Format)}` +
        (others.length ? `: choose ${others.join(" or ")} as the source` : ""),
      "none",
    );
    none.disabled = true;
    standard.append(none);
  }
  const marks = document.createElement("optgroup");
  marks.label = "Marks Greek does not allow";
  for (const index of marksExamples()) {
    const example = INVALID_MARKS[index]!;
    marks.append(
      new Option(`${example.title} — ${example.note}`, `marks-${index}`),
    );
  }
  exampleMenu.append(standard, marks);
  markActiveExample();
}

/** The example of invalid marks on screen, if its text is still there. */
function activeMarksExample(): number {
  return INVALID_MARKS.findIndex((example) =>
    example.text === source.value && example.from === sourceFormat()
  );
}

/** Selects the example on screen in the menu, or none once it is edited. */
function markActiveExample(): void {
  const active = activeExample();
  const marks = activeMarksExample();
  exampleMenu.value = active
    ? String(examples().findIndex(({ title }) => title === active.title))
    : marks >= 0
    ? `marks-${marks}`
    : "";
}

/**
 * Loads a text with invalid marks. The target stays, unless it is the
 * source's own format: the marks show whatever the conversion.
 */
function loadMarksExample(example: MarksExample): void {
  source.value = example.text;
  keepSourceChoice(example.from);
  if (targetFormat() === example.from) {
    setTarget(example.from === "greek" ? "transliteration" : "greek");
  }
  update();
}

/**
 * Sets the source format of an example. A chosen format stays chosen: the
 * menu lists the examples in it. Otherwise, detection stays on when it reads
 * the example right.
 */
function keepSourceChoice(from: Format): void {
  if (sourceChoice() !== "auto") return;
  setSourceChoice(detectFormat(source.value) === from ? "auto" : from);
}

function loadExample(example: Example): void {
  source.value = example.text;
  keepSourceChoice(example.from);
  setTarget(example.to);
  sourceStyle = example.sourceStyle ?? "";
  conversionOptions = knownOptions(example.options ?? {});
  update();
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
  /** The letter form a loss is about (`removed-glyph-variant`, `added-…`). */
  glyphVariant?: string;
}

/** The letter forms a loss may name, as a sentence names them. */
const GLYPH_NAMES: Readonly<Record<string, string>> = {
  "lunate-sigma": "lunate sigma ϲ",
  "final-sigma": "final sigma ς inside a word",
  "medial-sigma": "medial sigma σ at the end of a word",
  "beta-symbol": "beta symbol ϐ",
  "theta-symbol": "theta symbol ϑ",
  "capital-theta-symbol": "capital theta symbol ϴ",
  "phi-symbol": "phi symbol ϕ",
  "pi-symbol": "pi symbol ϖ",
  "kappa-symbol": "kappa symbol ϰ",
  "rho-symbol": "rho symbol ϱ",
  "lunate-epsilon": "lunate epsilon ϵ",
  "upsilon-hook": "upsilon with hook ϒ",
  "final-sigma-stigma": "final sigma ς for a stigma in a numeral",
};

/** The losses where the target writes what the source does not have. */
function isAddition(issue: Issue): boolean {
  return issue.code.startsWith("added-");
}

/**
 * A short name for a kind of loss, from its message ("The target
 * representation does not retain the acute accent." gives "Acute accent"),
 * or its code when the message has no such form.
 */
function issueTitle(
  message: string,
  code: string,
  glyphVariant?: string,
): string {
  const form = glyphVariant && GLYPH_NAMES[glyphVariant];
  const named = form ||
    /writes an? ([a-z ]+?) (?:to|where|that)\b/.exec(message)?.[1] ||
    /does not retain (?:the |an? )?(.+?)\.?$/.exec(message)?.[1];
  const title = named ?? code.replaceAll("-", " ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/** The message of a loss, naming the letter form it is about. */
function issueText(message: string, glyphVariant?: string): string {
  const form = glyphVariant && GLYPH_NAMES[glyphVariant];
  if (!form) return message;
  return message.replace(
    /the source glyph variant|a glyph variant/,
    `the ${form}`,
  );
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
function showMarks(
  issues: readonly Issue[],
  invalid: readonly Issue[] = [],
): void {
  type Kind = "loss" | "literal" | "invalid";
  const text = source.value;
  const tagged: { issue: Issue; kind: Kind }[] = [
    // Marks Greek does not allow come first where they overlap a loss.
    ...invalid.map((issue) => ({ issue, kind: "invalid" as Kind })),
    ...issues.map((issue) => ({
      issue,
      kind: (readAsGreek(issue) ? "literal" : "loss") as Kind,
    })),
  ];
  const ranges = tagged
    .map(({ issue, kind }) => ({
      start: issue.offset,
      end: issue.offset + Math.max(issue.length, 1),
      kind,
    }))
    .sort((a, b) => a.start - b.start)
    // Adjacent letters of one kind share a mark, so that its underline runs
    // on, dots included, rather than starting again at each letter.
    .reduce<{ start: number; end: number; kind: Kind }[]>(
      (runs, range) => {
        const last = runs.at(-1);
        if (last && last.kind === range.kind && range.start <= last.end) {
          last.end = Math.max(last.end, range.end);
        } else {
          runs.push({ ...range });
        }
        return runs;
      },
      [],
    );
  sourceMarks.replaceChildren();
  let position = 0;
  for (const { start, end, kind } of ranges) {
    if (end <= position) continue;
    const from = Math.max(start, position);
    sourceMarks.append(text.slice(position, from));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(from, end);
    if (kind !== "loss") mark.className = kind;
    // A lone letter read back as Greek gets a single dot, centred under it.
    if (kind === "literal" && isOneLetter(mark.textContent)) {
      mark.classList.add("single");
    }
    sourceMarks.append(mark);
    position = end;
  }
  // A final newline needs a character after it to take up its line.
  sourceMarks.append(text.slice(position) + "​");
  sourceMarks.scrollTop = source.scrollTop;
}

/** Whether a text is one letter, with or without its combining marks. */
function isOneLetter(text: string): boolean {
  return text.normalize("NFD").replace(/\p{M}/gu, "").length === 1;
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
  const groups = new Map<
    string,
    { message: string; code: string; glyphVariant?: string; issues: Issue[] }
  >();
  for (const issue of issues) {
    // A letter form per card: the message alone does not name it.
    const key = `${issue.message}\u0000${issue.glyphVariant ?? ""}`;
    const group = groups.get(key) ?? {
      message: issue.message,
      code: issue.code,
      glyphVariant: issue.glyphVariant,
      issues: [],
    };
    group.issues.push(issue);
    groups.set(key, group);
  }
  return [...groups.values()].map((
    { message, code, glyphVariant, issues: affected },
  ) => ({
    title: issueTitle(message, code, glyphVariant),
    count: affected.length,
    text: issueText(message, glyphVariant),
    code,
    affected,
  }));
}

/**
 * Lists diagnostics in five sections: the distinctions the target does not
 * keep; the forms and marks it adds, which read back as others; the letters of another script it copies but would read back as
 * Greek; the characters outside the repertoire; and the marks the reader
 * kept but Greek does not allow (`validateDocument`). Each letter is the text
 * of the input at the diagnostic's offset, as typed: indices count the
 * tokens of the document the conversion prepared, in which a character
 * outside the repertoire may be several literals, so they do not match a
 * reading of the input.
 */
function showIssues(
  losses: readonly ConversionLoss[],
  scope: readonly Issue[],
  format: Format,
  invalid: readonly Issue[] = [],
): void {
  diagnostics.replaceChildren();
  diagnostics.hidden = losses.length + scope.length + invalid.length === 0;
  if (diagnostics.hidden) return;

  const literals = losses.filter(readAsGreek);
  const sections: [string, IssueCard[]][] = [
    [
      "What the target does not keep",
      cardsByMessage(
        losses.filter((loss) => !readAsGreek(loss) && !isAddition(loss)),
      ),
    ],
    [
      "What the target adds, and reads back",
      cardsByMessage(losses.filter(isAddition)),
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
    ["Marks Greek does not allow", cardsByMessage(invalid)],
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

/** The document as a table, or as the JSON the library would give. */
function documentView(): "table" | "json" {
  return document.querySelector<HTMLInputElement>(
      'input[name="document-view"]:checked',
    )?.value === "json"
    ? "json"
    : "table";
}

function inspectDocument(options: ConversionOptions, from: Format): void {
  if (selectedTab() !== "tab-document") return;
  const read = parseDetailed(source.value, from, options);
  const parsed = read.document;
  const shown = showAllTokens ? parsed : parsed.slice(0, PREVIEW_TOKENS);
  // Always the whole document, whatever the preview shows.
  const validation = validateDocument(parsed);
  const asTable = documentView() === "table";
  documentTable.hidden = !asTable;
  documentPreview.hidden = asTable;
  if (asTable) {
    documentPreview.textContent = "";
    showDocumentTable(shown, read.spans, validation, from);
  } else {
    documentTable.replaceChildren();
    showHighlighted(
      documentPreview,
      JSON_TOKENS,
      JSON.stringify(
        {
          tokens: shown.map((token) =>
            token.kind === "grapheme"
              ? { ...token, diacritics: [...token.diacritics] }
              : token
          ),
          validation,
        },
        null,
        2,
      ),
    );
  }
  const truncated = shown.length < parsed.length;
  documentLimit.hidden = !truncated;
  if (truncated) {
    documentLimitText.textContent = `Showing tokens 0 to ${
      shown.length - 1
    } of ${parsed.length}; validation covers them all.`;
  }
}

/** The token whose row was tapped, kept from one drawing of the table to the next. */
let activeToken: number | undefined;

/** Names for the characters a cell would show as nothing. */
const BLANKS: Record<string, string> = {
  " ": "space",
  "\n": "line break",
  "\r\n": "line break",
  "\t": "tab",
  "\u00a0": "no-break space",
};

/**
 * The canonical document as a table, one row a token: its number, the
 * characters it was read from, its letter, case, marks and glyph variant
 * (a column only when a token has one), and what validation says of it (a
 * column only when it says something). A literal fills the letter's cell
 * with "literal" and leaves the others empty.
 */
function showDocumentTable(
  tokens: readonly Token[],
  spans: readonly { start: number; end: number }[],
  validation: readonly { index: number; message: string }[],
  from: Format,
): void {
  const notes = new Map<number, string[]>();
  for (const { index, message } of validation) {
    if (index < tokens.length) {
      notes.set(index, [...(notes.get(index) ?? []), message]);
    }
  }
  const variants = tokens.some((token) =>
    token.kind === "grapheme" && token.glyphVariant !== undefined
  );
  const cell = (tag: "td" | "th", text: string, className = "") => {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const head = document.createElement("tr");
  for (
    const name of [
      "Token",
      "Read from",
      "Letter",
      "Uppercase",
      "Diacritics",
      ...(variants ? ["Variant"] : []),
      ...(notes.size ? ["Validation"] : []),
    ]
  ) {
    const th = cell("th", name);
    th.scope = "col";
    head.append(th);
  }
  const body = document.createElement("tbody");
  tokens.forEach((token, index) => {
    const span = spans[index];
    const text = span === undefined
      ? ""
      : source.value.slice(span.start, span.end);
    const row = document.createElement("tr");
    row.dataset.token = String(index);
    if (index === activeToken) row.classList.add("active");
    const blank = BLANKS[text] ??
      (/^\s+$/u.test(text)
        ? [...text].map((char) =>
          `U+${
            char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")
          }`
        ).join(" ")
        : undefined);
    const read = blank === undefined
      ? cell("td", text, "read")
      : cell("td", blank, "read blank");
    if (from === "greek" && blank === undefined) read.lang = "grc";
    row.append(cell("td", String(index), "index"), read);
    if (token.kind === "grapheme") {
      row.append(
        cell("td", token.letter),
        cell("td", String(token.uppercase)),
        cell("td", [...token.diacritics].join(", ")),
      );
      if (variants) row.append(cell("td", token.glyphVariant ?? ""));
    } else {
      row.append(
        cell("td", "literal", "kind"),
        cell("td", ""),
        cell("td", ""),
      );
      if (variants) row.append(cell("td", ""));
    }
    if (notes.size) {
      row.append(cell("td", (notes.get(index) ?? []).join(" "), "validation"));
      if (notes.has(index)) row.classList.add("invalid");
    }
    body.append(row);
  });
  const thead = document.createElement("thead");
  thead.append(head);
  const table = document.createElement("table");
  table.append(thead, body);
  documentTable.replaceChildren(table);
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

/** The canonical document, as JSON: a string before a colon is a key. */
const JSON_TOKENS = new RegExp(
  [
    String.raw`(?<key>"(?:\\.|[^"\\])*"(?=\s*:))`,
    String.raw`(?<string>"(?:\\.|[^"\\])*")`,
    String.raw`(?<keyword>\b(?:true|false|null)\b)`,
    String.raw`(?<number>-?\b\d+(?:\.\d+)?\b)`,
    String.raw`(?<punctuation>[{}[\],:])`,
  ].join("|"),
  "g",
);

/** Shows code in an element, coloured by kind of token. */
function showHighlighted(
  target: HTMLElement,
  tokens: RegExp,
  text: string,
): void {
  target.replaceChildren();
  let position = 0;
  for (const match of text.matchAll(tokens)) {
    const [kind, value] = Object.entries(match.groups ?? {})
      .find(([, found]) => found !== undefined) ?? [];
    if (kind === undefined || value === undefined) continue;
    target.append(text.slice(position, match.index));
    const span = document.createElement("span");
    span.className = `tok-${kind}`;
    span.textContent = value;
    target.append(span);
    position = match.index + value.length;
  }
  target.append(text.slice(position));
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
  showHighlighted(code, TOKENS, codeText);
}

/* State in the address, so that a link reproduces the conversion */

function saveState(): void {
  const state = new URLSearchParams({
    from: sourceChoice(),
    to: targetFormat(),
    text: source.value,
  });
  if (presetSelect.value) state.set("preset", presetSelect.value);
  if (sourceStyle) state.set("written", sourceStyle);
  if (settingsOf(conversionOptions).length) {
    state.set("options", JSON.stringify(conversionOptions));
  }
  if (Object.keys(inventory).length) {
    state.set("characters", JSON.stringify(inventory));
  }
  if (strict.checked) state.set("strict", "1");
  // The page as it opens needs no parameters in its address, and has nothing
  // to reset.
  const atStart = `#${state}` === START;
  history.replaceState(
    null,
    "",
    atStart ? location.pathname + location.search : `#${state}`,
  );
  resetButton.disabled = atStart;
}

function restoreState(): void {
  const state = new URLSearchParams(location.hash.slice(1));
  const known = (value: string | null): value is Format =>
    value !== null && (FORMATS as readonly string[]).includes(value);
  const from = state.get("from");
  const to = state.get("to");
  setSourceChoice(known(from) ? from : "auto");
  if (known(to)) setTarget(to);
  if (state.has("text")) source.value = state.get("text") ?? "";
  // A preset the library no longer has falls back to the defaults, which
  // write what `sbl-academic` wrote before 1.0.0.
  const preset = presets.find(({ id }) => id === state.get("preset"))?.id;
  choosePreset(preset ?? "");
  const written = state.get("written");
  sourceStyle = written === "defaults" || written === "sbl-academic"
    ? "defaults"
    : presets.find(({ id }) =>
      id === written && presetFormat(id) ===
        "transliteration"
    )?.id ?? "";
  conversionOptions = {};
  try {
    conversionOptions = knownOptions(JSON.parse(state.get("options") ?? "{}"));
  } catch {
    // A damaged link keeps the rest of its settings.
  }
  inventory = {};
  try {
    inventory = knownInventory(JSON.parse(state.get("characters") ?? "{}"));
  } catch {
    // A damaged link keeps the rest of its settings.
  }
  strict.checked = state.get("strict") === "1";
  // A link that carries settings opens on them.
  if (Object.keys(inventory).length || strict.checked) {
    selectTab("tab-characters");
  }
}

/*
 * The two fields keep one height, so that their character counts stay on
 * one line. They grow with the longer text: the grid stretches both fields,
 * and the texts fill them, sized by CSS (`field-sizing: content`) where the
 * browser supports it, otherwise by measuring them. Resizing one field by
 * its handle resizes the other with it; from then on, both keep the height
 * chosen.
 */
const SIZES_ITSELF = CSS.supports("field-sizing", "content");
let resizing: HTMLTextAreaElement | undefined;
let resized = false;

function fitHeights(): void {
  if (SIZES_ITSELF || resized) return;
  for (const field of [source, output]) field.style.height = "auto";
  const height = Math.max(source.scrollHeight, output.scrollHeight);
  for (const field of [source, output]) field.style.height = `${height}px`;
}

const followResize = new ResizeObserver(() => {
  if (resizing === undefined || !resizing.style.height) return;
  const other = resizing === source ? output : source;
  resized = true;
  if (other.style.height !== resizing.style.height) {
    other.style.height = resizing.style.height;
  }
});
for (const field of [source, output]) {
  // The handle belongs to the field: a press on it starts on the field.
  field.addEventListener("pointerdown", () => {
    resizing = field;
  });
  followResize.observe(field);
}
addEventListener("pointerup", () => {
  resizing = undefined;
});
addEventListener("pointercancel", () => {
  resizing = undefined;
});

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
      remove.innerHTML = icon("x");
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
  // A transliteration read as the output writes it is normalized.
  const normalized = same && from === "transliteration" && !sourceStyle;
  verb.textContent = normalized ? "Normalize" : same ? "Restyle" : "Convert";
  sameFormatHint.hidden = !same;
  sameFormatHint.textContent = from !== "transliteration"
    ? "Same format on both sides: only the standard and the options change the text."
    : normalized
    ? "Read as the output writes it, the text is normalized in that style: say what it is written in to restyle it."
    : "Read as written in one style, the text is written in another.";
  addOptionButton.classList.toggle("prompt", same && pills.length === 0);
}

/*
 * Previewing a value: while the reader moves through the values of an
 * option, the output shows the text written with the value under the
 * active one, its changed words highlighted, without setting it. Enter sets
 * it; leaving the values goes back to the settings as they were.
 */
let preview: { entry: OptionEntry; value: string } | undefined;
/** The output before the preview, which the highlights compare with. */
let previewBase = "";
/** The conversion last run, which the examples of values reuse. */
let conversion: { converter: Converter; from: Format; to: Format } | undefined;

function setPreview(next: typeof preview): void {
  if (preview === undefined && next !== undefined) previewBase = output.value;
  const same = preview?.entry === next?.entry && preview?.value === next?.value;
  preview = next;
  if (!same) update();
}

/** The options in effect: the reader's, with the value under preview. */
function effectiveOptions(): ConversionOptions {
  return preview
    ? withSetting(
      conversionOptions,
      preview.entry.group,
      preview.entry.key,
      preview.value,
    )
    : conversionOptions;
}

/** Highlights, in a copy of the output laid under it, the words that changed. */
function showOutputMarks(
  spans: readonly { start: number; end: number }[],
): void {
  const text = output.value;
  outputMarks.replaceChildren();
  let position = 0;
  for (const { start, end } of spans) {
    outputMarks.append(text.slice(position, start));
    const mark = document.createElement("mark");
    mark.className = "preview";
    mark.textContent = text.slice(start, end);
    outputMarks.append(mark);
    position = end;
  }
  outputMarks.append(text.slice(position) + "\u200b");
  outputMarks.scrollTop = output.scrollTop;
}

/**
 * An example of what a value changes: a word of the reader's text, or of a
 * text written for the purpose when the reader's has none, as the settings
 * write it and as the value would.
 */
function valueExample(
  entry: OptionEntry,
  value: string,
): { word: string; before: string; after: string } | undefined {
  if (conversion === undefined) return undefined;
  const { converter, from, to } = conversion;
  const alternative = withSetting(
    conversionOptions,
    entry.group,
    entry.key,
    value,
  );
  const write = (text: string, options: ConversionOptions) => {
    try {
      return converter.convert(text, from, to, options);
    } catch {
      return undefined;
    }
  };
  let sample: string | undefined;
  try {
    sample = from === "greek"
      ? PROBE_GREEK
      : converter.convert(PROBE_GREEK, "greek", from);
  } catch {
    sample = undefined;
  }
  for (const text of [source.value.slice(0, 4000), sample]) {
    if (!text) continue;
    const before = write(text, conversionOptions);
    const after = write(text, alternative);
    if (before === undefined || after === undefined) continue;
    const change = firstChange(text, before, after);
    if (change) return change;
  }
  return undefined;
}

/* The picker: find an option, then choose its value */

let pickerEntry: OptionEntry | undefined;
let pickerItems: {
  label: string;
  detail: string;
  pick: () => void;
  /** For a value: what previewing it sets. */
  value?: string;
}[] = [];
let pickerActive = 0;

/**
 * Whether the page is used without a mouse, by touch. There, the pickers
 * show their lists without a search field: the virtual keyboard it raises
 * would hide most of a list that a finger scrolls faster than it types.
 */
function touchOnly(): boolean {
  return matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function openPicker(): void {
  pickerEntry = undefined;
  optionSearch.value = "";
  optionPicker.hidden = false;
  addOptionButton.setAttribute("aria-expanded", "true");
  showPickerItems();
  (optionSearch.hidden ? optionList : optionSearch).focus();
}

function closePicker(focusButton: boolean): void {
  if (optionPicker.hidden) return;
  optionPicker.hidden = true;
  controls?.style.setProperty("--picker-room", "0px");
  setPreview(undefined);
  addOptionButton.setAttribute("aria-expanded", "false");
  if (focusButton) addOptionButton.focus();
}

/** Under the button, kept inside the settings. */
/** Under its button, floating over the page, kept inside the settings. */
function placePicker(): void {
  const line = optionPicker.offsetParent as HTMLElement | null;
  const room = (line?.clientWidth ?? 0) - optionPicker.offsetWidth;
  optionPicker.style.left = `${
    Math.max(0, Math.min(addOptionButton.offsetLeft, room))
  }px`;
  optionPicker.style.top = `${
    addOptionButton.offsetTop + addOptionButton.offsetHeight + 6
  }px`;
}

const controls = optionPicker.closest<HTMLElement>(".controls");

/**
 * Two rows of values hide no more than the head of the output. Beyond them,
 * the settings grow by the height of the rows that follow, so that the
 * output moves down with the list and stays in view for the preview.
 */
function makeRoom(): void {
  const rows = pickerEntry
    ? [...optionList.querySelectorAll<HTMLElement>('[role="option"]')]
    : [];
  let room = 0;
  if (rows.length > 2) {
    const list = optionList.getBoundingClientRect();
    const second = rows[1].getBoundingClientRect();
    const last = rows[rows.length - 1].getBoundingClientRect();
    room = Math.max(0, Math.min(last.bottom, list.bottom) - second.bottom);
  }
  controls?.style.setProperty("--picker-room", `${Math.ceil(room)}px`);
}

function showPickerItems(): void {
  const from = sourceFormat();
  const to = targetFormat();
  const preset = currentPreset();
  optionList.replaceChildren();
  pickerItems = [];

  if (pickerEntry === undefined) {
    optionStep.hidden = true;
    if (touchOnly()) {
      // By touch, the list alone, as for the values.
      optionList.tabIndex = 0;
      if (optionPicker.contains(document.activeElement)) optionList.focus();
      optionSearch.hidden = true;
      optionSearch.removeAttribute("aria-activedescendant");
    } else {
      // The field takes the focus back before the list stops taking it.
      optionSearch.hidden = false;
      if (optionPicker.contains(document.activeElement)) optionSearch.focus();
      optionList.removeAttribute("tabindex");
      optionList.removeAttribute("aria-activedescendant");
    }
    optionList.removeAttribute("aria-labelledby");
    optionList.setAttribute("aria-label", "Conversion options");
    setPreview(undefined);
    placePicker();
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
    optionStepName.textContent = optionName(entry);
    // A few values: the list takes the keyboard, without a search field.
    // It takes the focus before the field hides, so that the picker stays.
    optionList.tabIndex = 0;
    optionList.focus();
    optionSearch.hidden = true;
    optionSearch.removeAttribute("aria-activedescendant");
    // The heading names the option.
    optionList.removeAttribute("aria-label");
    optionList.setAttribute("aria-labelledby", "option-step-name");
    const values = entry.values
      .filter((value) => value !== standard)
      .map((value) => ({ value, example: valueExample(entry, value) }));
    // The standard's value heads the list, as the reference, not as a choice.
    if (standard !== undefined) {
      const first = values.find(({ example }) => example)?.example;
      const row = document.createElement("div");
      row.className = "option-item option-standard";
      row.setAttribute("role", "option");
      row.setAttribute("aria-disabled", "true");
      const name = document.createElement("span");
      const tag = document.createElement("span");
      tag.className = "option-tag";
      tag.textContent = "standard";
      name.append(standard, tag);
      row.append(name);
      if (first) {
        const example = document.createElement("span");
        example.className = "option-example";
        example.textContent = `${first.word} → ${first.before}`;
        row.append(example);
      }
      optionList.append(row);
    }
    for (const { value, example } of values) {
      pickerItems.push({
        label: value,
        detail: example ? `${example.word} → ${example.after}` : "",
        value,
        pick: () => {
          preview = undefined;
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
  makeRoom();
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
    // The values of an option in code; the example of a value in letters.
    values.className = pickerEntry ? "option-example" : "option-values";
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
  // The search field leads the list of options, the list itself its values,
  // and its options by touch.
  const owner = optionSearch.hidden ? optionList : optionSearch;
  const value = pickerItems[pickerActive]?.value;
  if (pickerEntry && value !== undefined) {
    setPreview({ entry: pickerEntry, value });
  }
  const active = document.getElementById(`option-item-${pickerActive}`);
  if (active) {
    owner.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  } else {
    owner.removeAttribute("aria-activedescendant");
  }
}

addEventListener("resize", () => {
  if (!optionPicker.hidden) {
    placePicker();
    makeRoom();
  }
});
addOptionButton.addEventListener("click", () => {
  if (optionPicker.hidden) openPicker();
  else closePicker(true);
});
optionSearch.addEventListener("input", showPickerItems);
function pickerKeydown(event: KeyboardEvent): void {
  // Right opens the values of the active option, once the caret has nothing
  // more to its right in the search field; Left goes back to the options.
  const atEnd = optionSearch.selectionStart === optionSearch.value.length &&
    optionSearch.selectionEnd === optionSearch.value.length;
  if (event.key === "ArrowRight" && !pickerEntry && atEnd) {
    const item = pickerItems[pickerActive];
    if (item) {
      event.preventDefault();
      item.pick();
    }
    return;
  }
  if (event.key === "ArrowLeft" && pickerEntry) {
    event.preventDefault();
    pickerEntry = undefined;
    optionSearch.value = "";
    showPickerItems();
    return;
  }
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
    event.preventDefault();
    pickerEntry = undefined;
    showPickerItems();
  }
}
// Back to the options, as Escape and Backspace do from the keyboard.
optionBack.addEventListener("click", () => {
  pickerEntry = undefined;
  optionSearch.value = "";
  showPickerItems();
});
optionSearch.addEventListener("keydown", pickerKeydown);
optionList.addEventListener("keydown", pickerKeydown);
/**
 * A press on an empty part of a picker would move the focus out of it, to
 * the page, and close it, losing what was typed: the focus stays where it
 * is instead. So does a press on a button, which Safari, on macOS and iOS,
 * does not focus: the focus would leave for the page, and the picker close
 * before the button is clicked, as its back arrow did. Fields, labels, and
 * links take the press as usual.
 */
function keepFocusInside(panel: HTMLElement): void {
  panel.addEventListener("mousedown", (event) => {
    // Within the picker only: the tab panel around it takes the focus too.
    const hit = (event.target as Element).closest(
      "input, textarea, select, label, a, [tabindex]",
    );
    if (hit === null || !panel.contains(hit)) event.preventDefault();
  });
}
keepFocusInside(optionPicker);
keepFocusInside(inventoryPicker);
optionPicker.addEventListener("focusout", (event) => {
  const next = event.relatedTarget as Node | null;
  if (next === null || !optionPicker.contains(next)) {
    if (next !== addOptionButton) closePicker(false);
  }
});

/*
 * The character inventory, as rows of pills like the options: characters
 * left out, kept alone, spellings added to letters, and new characters.
 * One picker serves them: a searchable list of characters, then, for a
 * spelling, a short form; for a new character, a form at once.
 */

let inventory: Inventory = {};

type InventoryField = CharacterList | "aliases" | "characters";

function setInventory(next: Inventory): void {
  inventory = next;
  updateInPlace();
}

/**
 * Updates while keeping the settings tabs where they are on the screen. A
 * change there can add or remove diagnostics above them (a repertoire of
 * one letter puts most of the text outside it), which would otherwise push
 * the tabs, and the reader's place in them, out of view.
 */
function updateInPlace(): void {
  const anchor = inventoryBox.closest<HTMLElement>(".settings") ??
    inventoryBox;
  const before = anchor.getBoundingClientRect().top;
  update();
  const shift = anchor.getBoundingClientRect().top - before;
  if (shift) scrollBy({ top: shift, behavior: "instant" });
}

function inventoryRow(field: InventoryField): HTMLElement {
  return inventoryBox.querySelector<HTMLElement>(
    `.inventory-row[data-field="${field}"]`,
  )!;
}

function pill(label: string, remove: () => void, removeLabel: string) {
  const item = document.createElement("li");
  item.className = "option-pill";
  const name = document.createElement("span");
  name.className = "pill-text";
  name.textContent = label;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pill-remove";
  button.setAttribute("aria-label", removeLabel);
  button.innerHTML = icon("x");
  button.addEventListener("click", () => {
    // The row first: the pill leaves the page with the change.
    const row = inventoryRow(field(item));
    remove();
    row.querySelector<HTMLButtonElement>(".add-option")?.focus();
  });
  item.append(name, button);
  return item;
}

function field(element: Element): InventoryField {
  return (element.closest<HTMLElement>(".inventory-row")?.dataset.field ??
    "exclude") as InventoryField;
}

/** Draws the pills of every row, rebuilt only when the inventory changes. */
function showInventory(): void {
  const signature = JSON.stringify(inventory);
  if (inventoryBox.dataset.signature === signature) return;
  inventoryBox.dataset.signature = signature;
  for (const list of ["exclude", "repertoire"] as const) {
    const row = inventoryRow(list);
    const ids = inventory[list] ?? [];
    row.querySelector("ul")!.replaceChildren(
      ...ids.map((id) =>
        pill(
          characterName(id),
          () => setInventory(withoutListItem(inventory, list, id)),
          `Remove ${characterName(id)}`,
        )
      ),
    );
  }
  inventoryRow("aliases").querySelector("ul")!.replaceChildren(
    ...(inventory.aliases ?? []).map((alias, index) =>
      pill(
        aliasSummary(alias),
        () => setInventory(withoutEntry(inventory, "aliases", index)),
        `Remove ${aliasSummary(alias)}`,
      )
    ),
  );
  inventoryRow("characters").querySelector("ul")!.replaceChildren(
    ...(inventory.characters ?? []).map((character, index) =>
      pill(
        customSummary(character),
        () => setInventory(withoutEntry(inventory, "characters", index)),
        `Remove ${character.id}`,
      )
    ),
  );
}

/* The inventory picker */

let inventoryField: InventoryField = "exclude";
let inventoryButton: HTMLButtonElement | undefined;
let inventoryActive = 0;
let inventoryItems: { id: string; pick: () => void }[] = [];

function openInventoryPicker(
  button: HTMLButtonElement,
  target: InventoryField,
): void {
  inventoryField = target;
  inventoryButton = button;
  for (const other of inventoryBox.querySelectorAll(".add-option")) {
    other.setAttribute("aria-expanded", String(other === button));
  }
  // Under its row, whatever its kind, where a form shows in the flow. It
  // moves while empty: moving it with the focus inside would blur it.
  const row = button.closest(".inventory-row");
  if (row && row.nextElementSibling !== inventoryPicker) {
    inventoryPicker.replaceChildren();
    row.after(inventoryPicker);
  }
  inventoryPicker.hidden = false;
  inventoryPicker.classList.toggle("wide", target === "characters");
  if (target === "characters") showCharacterForm();
  else showCharacterList();
}

function closeInventoryPicker(focusButton: boolean): void {
  if (inventoryPicker.hidden) return;
  inventoryPicker.hidden = true;
  inventoryPicker.replaceChildren();
  makeInventoryRoom();
  for (const button of inventoryBox.querySelectorAll(".add-option")) {
    button.setAttribute("aria-expanded", "false");
  }
  if (focusButton) inventoryButton?.focus();
}

/**
 * A list floats under the button that opened it, kept inside the panel,
 * which grows where the list would run past it, as at the foot of the page.
 * A form, where one types and stays, opens in the page under its row, and
 * pushes what follows down rather than covering it. Either way the page
 * scrolls, if it must, to show it whole.
 */
function placeInventoryPicker(inline: boolean): void {
  if (!inventoryButton) return;
  inventoryPicker.classList.toggle("inline", inline);
  const box = inventoryBox.getBoundingClientRect();
  const button = inventoryButton.getBoundingClientRect();
  const left = Math.max(
    0,
    Math.min(button.left - box.left, box.width - inventoryPicker.offsetWidth),
  );
  if (inline) {
    inventoryPicker.style.left = inventoryPicker.style.top = "";
    inventoryPicker.style.marginLeft = `${left}px`;
  } else {
    inventoryPicker.style.marginLeft = "";
    inventoryPicker.style.left = `${left}px`;
    inventoryPicker.style.top = `${button.bottom - box.top + 6}px`;
  }
  makeInventoryRoom();
  revealInventoryPicker();
}

const inventoryPanel = inventoryBox.closest<HTMLElement>(".panel");

/** Grows the panel by what a floating list runs past its foot. */
function makeInventoryRoom(): void {
  if (!inventoryPanel) return;
  inventoryPanel.style.paddingBottom = "";
  if (inventoryPicker.hidden || inventoryPicker.classList.contains("inline")) {
    return;
  }
  const panel = inventoryPanel.getBoundingClientRect();
  const picker = inventoryPicker.getBoundingClientRect();
  const past = picker.bottom + 16 - panel.bottom;
  if (past > 0) {
    const base = parseFloat(getComputedStyle(inventoryPanel).paddingBottom);
    inventoryPanel.style.paddingBottom = `${base + past}px`;
  }
}

/** Scrolls the page, gently unless motion is reduced, to show the picker. */
function revealInventoryPicker(): void {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  inventoryPicker.scrollIntoView({
    block: "nearest",
    behavior: still ? "auto" : "smooth",
  });
}

function pickerHeading(text: string, back?: () => void): HTMLElement {
  const heading = document.createElement("p");
  heading.className = "option-step";
  if (back) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-back";
    button.setAttribute("aria-label", "Back to the characters");
    button.title = "Back to the characters (Escape)";
    button.innerHTML = icon("chevron-left");
    button.addEventListener("click", back);
    heading.append(button);
  }
  const name = document.createElement("span");
  name.id = "inventory-step-name";
  name.textContent = text;
  heading.append(name);
  return heading;
}

/** A searchable list of characters: what to leave out, keep, or respell. */
function showCharacterList(query = ""): void {
  const search = document.createElement("input");
  search.type = "text";
  search.className = "picker-search";
  search.setAttribute("role", "combobox");
  search.setAttribute("aria-expanded", "true");
  search.setAttribute("aria-controls", "inventory-list");
  search.setAttribute("aria-autocomplete", "list");
  search.autocomplete = "off";
  search.spellcheck = false;
  search.placeholder = "Find a character";
  search.setAttribute("aria-label", "Find a character");
  search.value = query;
  const list = document.createElement("div");
  list.id = "inventory-list";
  list.className = "option-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Characters");
  // By touch, the list alone takes the focus and the keys (touchOnly).
  const byTouch = touchOnly();
  const owner = byTouch ? list : search;
  if (byTouch) list.tabIndex = 0;

  const render = () => {
    list.replaceChildren();
    const taken = inventoryField === "aliases"
      ? []
      : inventory[inventoryField as CharacterList] ?? [];
    // Spellings go to built-in letters only.
    const choices = inventoryField === "aliases"
      ? characterChoices({})
      : characterChoices(inventory);
    inventoryItems = matchCharacters(
      choices.filter(({ id }) => !taken.includes(id)),
      search.value,
    ).map((choice, index) => {
      const item = document.createElement("div");
      item.id = `inventory-item-${index}`;
      item.className = "option-item";
      item.setAttribute("role", "option");
      const name = document.createElement("span");
      name.textContent = choice.label;
      const forms = document.createElement("span");
      forms.className = "option-example";
      forms.textContent = choice.forms;
      item.append(name, forms);
      const pick = () => {
        if (inventoryField === "aliases") {
          showSpellingForm(choice.id, search.value);
        } else {
          const list = inventoryField as CharacterList;
          closeInventoryPicker(true);
          setInventory(withListItem(inventory, list, choice.id));
        }
      };
      item.addEventListener("mousedown", (event) => event.preventDefault());
      item.addEventListener("click", pick);
      list.append(item);
      return { id: item.id, pick };
    });
    if (!inventoryItems.length) {
      const empty = document.createElement("div");
      empty.className = "option-empty";
      empty.textContent = "No character matches";
      list.append(empty);
    }
    setInventoryActive(owner, list, 0);
  };
  search.addEventListener("input", render);
  owner.addEventListener("keydown", (event) => {
    const atEnd = search.selectionStart === search.value.length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setInventoryActive(
        owner,
        list,
        inventoryActive + (event.key === "ArrowDown" ? 1 : -1),
      );
    } else if (
      event.key === "Enter" ||
      (event.key === "ArrowRight" && atEnd && inventoryField === "aliases")
    ) {
      event.preventDefault();
      inventoryItems[inventoryActive]?.pick();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeInventoryPicker(true);
    }
  });
  inventoryPicker.replaceChildren(...(byTouch ? [list] : [search, list]));
  render();
  // The focus first, without its own jump: the scroll is the picker's.
  owner.focus({ preventScroll: true });
  placeInventoryPicker(false);
}

function setInventoryActive(
  owner: HTMLElement,
  list: HTMLElement,
  index: number,
): void {
  const count = inventoryItems.length;
  inventoryActive = count ? (index + count) % count : 0;
  for (const item of list.querySelectorAll('[role="option"]')) {
    item.setAttribute(
      "aria-selected",
      String(item.id === `inventory-item-${inventoryActive}`),
    );
  }
  const active = document.getElementById(`inventory-item-${inventoryActive}`);
  if (active) {
    owner.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  } else {
    owner.removeAttribute("aria-activedescendant");
  }
}

function formatChoice(name: string, legend: string): HTMLFieldSetElement {
  const group = document.createElement("fieldset");
  group.className = "picker-formats";
  const caption = document.createElement("legend");
  caption.className = "visually-hidden";
  caption.textContent = legend;
  group.append(caption);
  FORMATS.forEach((format, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = format;
    input.checked = index === 2;
    label.append(input, ` ${FORMAT_LABELS[format]}`);
    group.append(label);
  });
  return group;
}

function textField(label: string, placeholder = ""): HTMLLabelElement {
  const wrapper = document.createElement("label");
  wrapper.className = "picker-field";
  const input = document.createElement("input");
  input.type = "text";
  input.spellcheck = false;
  input.autocomplete = "off";
  input.placeholder = placeholder;
  wrapper.append(label, input);
  return wrapper;
}

function checkField(label: string): HTMLLabelElement {
  const wrapper = document.createElement("label");
  wrapper.className = "check";
  const input = document.createElement("input");
  input.type = "checkbox";
  wrapper.append(input, ` ${label}`);
  return wrapper;
}

function submitButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "button small primary";
  button.textContent = label;
  return button;
}

/** A form, with Escape to go back or close, and the focus on its first field. */
function showForm(
  form: HTMLFormElement,
  onEscape: () => void,
): void {
  form.className = "picker-form";
  form.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onEscape();
    }
  });
  inventoryPicker.replaceChildren(form);
  form.querySelector<HTMLInputElement>('input[type="text"]')?.focus({
    preventScroll: true,
  });
  placeInventoryPicker(true);
}

/** The spellings of one letter: in which format, which, and how. */
function showSpellingForm(letter: string, query: string): void {
  const form = document.createElement("form");
  const back = () => showCharacterList(query);
  const formats = formatChoice("alias-format", "Format of the spellings");
  const spellings = textField("Spellings, separated by commas", "c, k̄");
  const uppercase = checkField("These spellings are capitals");
  const override = checkField("They take precedence over existing readings");
  form.append(
    pickerHeading(characterName(letter), back),
    formats,
    spellings,
    uppercase,
    override,
    submitButton("Add spellings"),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = splitSpellings(spellings.querySelector("input")!.value);
    if (!values.length) {
      spellings.querySelector("input")!.focus();
      return;
    }
    const format = formats.querySelector<HTMLInputElement>("input:checked")!
      .value as Format;
    closeInventoryPicker(true);
    setInventory(withAlias(inventory, {
      letter: letter as CharacterAliasDefinition["letter"],
      format,
      spellings: values,
      ...(uppercase.querySelector("input")!.checked ? { uppercase: true } : {}),
      ...(override.querySelector("input")!.checked ? { override: true } : {}),
    }));
  });
  showForm(form, back);
}

/** A new character: its name, and its forms in every format. */
function showCharacterForm(): void {
  const form = document.createElement("form");
  const id = textField("Name", "sho");
  const forms = FORMATS.map((format) => ({
    format,
    lowercase: textField(`${FORMAT_LABELS[format]}, lowercase`),
    uppercase: textField(`${FORMAT_LABELS[format]}, capital (optional)`),
  }));
  const override = checkField(
    "Its forms take precedence over existing readings",
  );
  const grid = document.createElement("div");
  grid.className = "picker-grid";
  for (const { lowercase, uppercase } of forms) {
    grid.append(lowercase, uppercase);
  }
  form.append(
    pickerHeading("New character"),
    id,
    grid,
    override,
    submitButton("Add character"),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = (field: HTMLLabelElement) =>
      field.querySelector("input")!.value.trim();
    const missing = [id, ...forms.map(({ lowercase }) => lowercase)]
      .find((field) => !value(field));
    if (missing) {
      missing.querySelector("input")!.focus();
      return;
    }
    closeInventoryPicker(true);
    setInventory(withCharacter(inventory, {
      id: value(id),
      forms: Object.fromEntries(
        forms.map(({ format, lowercase, uppercase }) => [format, {
          lowercase: value(lowercase),
          ...(value(uppercase) ? { uppercase: value(uppercase) } : {}),
        }]),
      ) as CustomCharacterDefinition["forms"],
      ...(override.querySelector("input")!.checked ? { override: true } : {}),
    }));
  });
  showForm(form, () => closeInventoryPicker(true));
}

for (
  const button of inventoryBox.querySelectorAll<HTMLButtonElement>(
    ".add-option",
  )
) {
  button.addEventListener("click", () => {
    const target = field(button);
    if (!inventoryPicker.hidden && inventoryField === target) {
      closeInventoryPicker(true);
    } else {
      openInventoryPicker(button, target);
    }
  });
}
inventoryPicker.addEventListener("focusout", (event) => {
  const next = event.relatedTarget as Node | null;
  if (next !== null && inventoryPicker.contains(next)) return;
  if (next instanceof HTMLElement && next === inventoryButton) return;
  // A click inside the picker on something that takes no focus keeps it.
  requestAnimationFrame(() => {
    if (!inventoryPicker.contains(document.activeElement)) {
      closeInventoryPicker(false);
    }
  });
});

/* Conversion */

/** "15 characters", counted as code points, as in a word processor. */
function characterCount(text: string): string {
  if (!text) return "";
  const count = [...text].length;
  return count === 1 ? "1 character" : `${count} characters`;
}

function update(): void {
  documentPreview.textContent = "";
  documentTable.replaceChildren();
  showDetection();
  const from = sourceFormat();
  const to = targetFormat();
  keepStyle(from, to);
  if (syncPresets(from, to)) {
    showPreset();
    renderExamples();
  } else if (sourceChoice() !== examplesFor) {
    renderExamples();
  }
  syncSourceStyle(from, to);
  applyFaces(from, to);
  sourceMeta.textContent = characterCount(source.value);
  const preset = currentPreset();
  // The defaults' line names the formats in use.
  if (!preset) showPreset();
  showOptions(from, to);
  let options: ConversionOptions = {};
  showInventory();
  try {
    options = effectiveOptions();
    const written = sourceOption(from, to, options);
    if (written) options = { ...options, source: written };
    const withPreset = { ...options, ...(preset ? { preset } : {}) };
    resolveConversionOptions(withPreset);
    inspectDocument(withPreset, from);
    const converter = createConverter({
      ...inventory,
      ...(preset ? { preset } : {}),
      outOfScopeBehavior: strict.checked ? "reject" : "preserve",
    });
    const result = converter.convertDetailed(source.value, from, to, options);
    conversion = { converter, from, to };
    // The reader keeps every mark it reads; validation says which ones Greek
    // does not allow, at the place of their token in the input.
    const read = parseDetailed(source.value, from, withPreset);
    const invalid: Issue[] = validateDocument(read.document).map((
      { code, index, message },
    ) => {
      const span = read.spans[index] ?? { start: 0, end: 0 };
      return {
        code,
        index,
        message,
        offset: span.start,
        length: span.end - span.start,
      };
    });

    output.value = result.output;
    showOutputMarks(preview ? changedSpans(previewBase, result.output) : []);
    outputMeta.textContent = characterCount(result.output);
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
    const invalidText = invalid.length
      ? ` ${
        invalid.length === 1
          ? "1 mark that Greek does not allow is kept"
          : `${invalid.length} marks that Greek does not allow are kept`
      } (dashed).`
      : "";
    if (!source.value) {
      showVerdict("empty", "", "Type or paste text to convert it.");
    } else if (lost) {
      showVerdict(
        "lossy",
        `${lost === 1 ? "1 distinction" : `${lost} distinctions`} lost.`,
        "Converting the result back will not give the same text. Underlined letters lose a distinction." +
          literalText + outsideText + invalidText,
      );
    } else if (literals) {
      showVerdict(
        "ok",
        "No distinction lost.",
        (literalText + outsideText + invalidText).trimStart(),
      );
    } else {
      showVerdict(
        "ok",
        "Lossless.",
        "Converting the result back gives the same text." + outsideText +
          invalidText,
      );
    }
    showMarks(result.losses, invalid);
    showIssues(result.losses, result.diagnostics, from, invalid);
    showCode(from, to, preset, options, inventory, result.output);
  } catch (error) {
    output.value = "";
    showOutputMarks([]);
    outputMeta.textContent = "";
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
  fitHeights();
  markActiveExample();
  // A value under preview is not set: the link keeps the settings.
  if (!preview) saveState();
}

const copyTimers = new WeakMap<
  HTMLButtonElement,
  ReturnType<typeof setTimeout>
>();
/**
 * Copies a text, as Share copies its link: the button keeps its label, its
 * icon turns into a check for a moment, and a note under it says that the
 * text was copied, or, where the clipboard refuses, how to copy it.
 */
async function copy(text: string, button: HTMLButtonElement): Promise<void> {
  clearTimeout(copyTimers.get(button));
  const holder = button.parentElement!;
  const note = holder.querySelector<HTMLElement>(".copy-note")!;
  const icon = button.querySelector(".copy-icon")!;
  const done = button.querySelector(".copy-done")!;
  let copied = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    copied = false;
  }
  note.textContent = copied
    ? "Copied to the clipboard."
    : "The text could not be copied: select it and copy it by hand.";
  icon.toggleAttribute("hidden", copied);
  done.toggleAttribute("hidden", !copied);
  placeNote(note);
  renew(note);
  holder.classList.add("shown");
  copyTimers.set(
    button,
    setTimeout(() => {
      holder.classList.remove("shown");
      icon.removeAttribute("hidden");
      done.setAttribute("hidden", "");
    }, copied ? 2000 : 6000),
  );
}

let shareTimer: ReturnType<typeof setTimeout> | undefined;
/**
 * Without a pointer to hover with, no note says what Share does: there, the
 * system's share sheet, which shows the page and the link, says it itself.
 * Where the sheet is missing or fails, and with a pointer, the link is
 * copied; closed, the sheet copies nothing.
 */
const SHARES_NATIVELY = touchOnly() && typeof navigator.share === "function";
const SHARE_HELP = SHARES_NATIVELY
  ? "Share a link that opens this text with the same settings."
  : "Copy a link that opens this text with the same settings.";
shareNote.textContent = SHARE_HELP;
const shareLinkIcon = shareButton.querySelector<SVGElement>(".share-link")!;
const shareDoneIcon = shareButton.querySelector<SVGElement>(".share-done")!;

/**
 * Back to the button's resting state: its icon, and the note on hover. The
 * message leaves rather than turning back into the help under the pointer:
 * the note stays hidden until the pointer or the focus leaves the button,
 * and takes the help again once it has faded out.
 */
function resetShare(): void {
  shareLinkIcon.removeAttribute("hidden");
  shareDoneIcon.setAttribute("hidden", "");
  const holder = shareNote.parentElement!;
  holder.classList.remove("shown");
  if (holder.matches(":hover") || shareButton.matches(":focus-visible")) {
    holder.classList.add("dismissed");
  }
  shareTimer = setTimeout(() => {
    shareNote.textContent = SHARE_HELP;
    placeShareNote();
  }, 150);
}

/** Plays a note's entrance again, for a new message in a note already shown. */
function renew(note: HTMLElement): void {
  note.classList.remove("renewed");
  void note.offsetWidth;
  note.classList.add("renewed");
}

/**
 * Copies the address, which holds the whole conversion. The note, shown on
 * hover and focus, says what the button does; after a click, the icon turns
 * into a check for a moment and the note says that the link was copied.
 */
/**
 * Keeps the note of Share within the page: centred under the button where
 * it has room, moved left, its pointer still on the button, where it would
 * leave the page and let it scroll sideways.
 */
function placeShareNote(): void {
  placeNote(shareNote);
}

/** Moves a note under a button left or right, so that it stays in the page. */
function placeNote(note: HTMLElement): void {
  note.style.setProperty("--nudge", "0px");
  const margin = 12;
  // From its centre and its layout width, as a hidden note is drawn a
  // little smaller (--squish) before it comes in.
  const box = note.getBoundingClientRect();
  const centre = (box.left + box.right) / 2;
  const left = centre - note.offsetWidth / 2;
  const right = centre + note.offsetWidth / 2;
  const page = document.documentElement.clientWidth;
  const nudge = right > page - margin
    ? right - (page - margin)
    : left < margin
    ? left - margin
    : 0;
  note.style.setProperty("--nudge", `${Math.round(nudge)}px`);
}

/** Shows that the link went out: a check on the button, and a note. */
function confirmShare(message: string): void {
  shareLinkIcon.setAttribute("hidden", "");
  shareDoneIcon.removeAttribute("hidden");
  shareNote.textContent = message;
  placeShareNote();
  renew(shareNote);
  shareNote.parentElement?.classList.add("shown");
  shareTimer = setTimeout(resetShare, 2000);
}

async function share(): Promise<void> {
  clearTimeout(shareTimer);
  // Sharing ends Reset's offer of Undo: one note at a time in the header.
  hideUndo();
  const holder = shareNote.parentElement;
  holder?.classList.remove("dismissed");
  if (SHARES_NATIVELY) {
    try {
      await navigator.share({ title: document.title, url: location.href });
      confirmShare("Link shared.");
      return;
    } catch (error) {
      // Closed: the reader chose not to share, nor to copy, which the sheet
      // offers. Refused or failed: the link is copied instead.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }
  try {
    await navigator.clipboard.writeText(location.href);
    confirmShare("Link copied to the clipboard.");
  } catch {
    shareNote.textContent =
      "The link could not be copied: copy the address from the address bar.";
    placeShareNote();
    renew(shareNote);
    holder?.classList.add("shown");
    shareTimer = setTimeout(resetShare, 6000);
  }
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
sourceStyleSelect.addEventListener("change", () => {
  sourceStyle = sourceStyleSelect.value as SourceStyle;
  update();
});
exampleMenu.addEventListener("change", () => {
  const value = exampleMenu.value;
  if (value.startsWith("marks-")) {
    const example = INVALID_MARKS[Number(value.slice("marks-".length))];
    if (example) loadMarksExample(example);
    return;
  }
  const example = examples()[Number(value)];
  if (value !== "" && example) loadExample(example);
});
source.addEventListener("scroll", () => {
  sourceMarks.scrollTop = source.scrollTop;
});
output.addEventListener("scroll", () => {
  outputMarks.scrollTop = output.scrollTop;
});
strict.addEventListener("change", updateInPlace);
// A tap on a row makes it the active one; a tap on it again, none.
documentTable.addEventListener("click", (event) => {
  const row = (event.target as Element).closest<HTMLTableRowElement>(
    "tbody tr",
  );
  if (row === null) return;
  const token = Number(row.dataset.token);
  activeToken = token === activeToken ? undefined : token;
  for (const other of documentTable.querySelectorAll("tr.active")) {
    other.classList.remove("active");
  }
  if (activeToken !== undefined) row.classList.add("active");
});
for (
  const input of document.querySelectorAll<HTMLInputElement>(
    'input[name="document-view"]',
  )
) {
  input.addEventListener("change", update);
}
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
  // The result is written as the output was.
  sourceStyle = "";
  setTarget(from);
  update();
});
/*
 * Reset: back to the page as it opens, with its text and without a setting,
 * the standards remembered per format forgotten. Undo, offered for a while,
 * brings the conversion back from the address it had.
 */
const START = `#${new URLSearchParams({
  from: "auto",
  to: "transliteration",
  text: source.defaultValue,
})}`;
let undoTimer: ReturnType<typeof setTimeout> | undefined;

/** Applies the state of an address, as following a link does. */
function applyState(hash: string): void {
  history.replaceState(null, "", hash || location.pathname);
  restoreState();
  showPreset();
  renderExamples();
  update();
}

function hideUndo(): void {
  clearTimeout(undoTimer);
  resetNote.replaceChildren();
}

function resetAll(): void {
  const before = location.hash;
  // Share's message, if any, gives way to Reset's note.
  if (shareNote.parentElement!.classList.contains("shown")) {
    clearTimeout(shareTimer);
    resetShare();
  }
  for (const format of FORMATS) delete lastPreset[format];
  setTarget("transliteration");
  applyState(START);
  const undo = document.createElement("button");
  undo.type = "button";
  undo.textContent = "Undo";
  undo.addEventListener("click", () => {
    hideUndo();
    applyState(before);
    resetButton.focus();
  });
  resetNote.replaceChildren("Back to the start.", undo);
  placeNote(resetNote);
  // Reset is disabled now: the focus goes to Undo rather than the page.
  undo.focus();
  clearTimeout(undoTimer);
  undoTimer = setTimeout(hideUndo, 8000);
}

resetButton.addEventListener("click", resetAll);

/*
 * The result is read-only: typing in it, or pasting, says where to write
 * instead, until the next click or for a few seconds.
 */
const outputTip = element<HTMLParagraphElement>("output-tip");
let outputTipTimer: ReturnType<typeof setTimeout> | undefined;

function hideOutputTip(): void {
  clearTimeout(outputTipTimer);
  outputTip.textContent = "";
}

function showOutputTip(): void {
  outputTip.textContent =
    "The result follows the source: edit the source, or Swap.";
  clearTimeout(outputTipTimer);
  outputTipTimer = setTimeout(hideOutputTip, 5000);
}

output.addEventListener("keydown", (event) => {
  const typing = event.key.length === 1 ||
    ["Backspace", "Delete", "Enter"].includes(event.key);
  if (typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
    showOutputTip();
  }
});
output.addEventListener("paste", showOutputTip);
output.addEventListener("pointerdown", hideOutputTip);
output.addEventListener("blur", hideOutputTip);
// Undo is offered for the conversion reset, not for what follows it.
source.addEventListener("input", hideUndo);
clearButton.addEventListener("click", () => {
  source.value = "";
  update();
  source.focus();
});
copyButton.addEventListener("click", () => copy(output.value, copyButton));
copyCodeButton.addEventListener("click", () => copy(codeText, copyCodeButton));
shareButton.addEventListener("click", share);

/**
 * Lays the masthead out on one line when the name, the links, Reset and
 * Share fit on it; otherwise the links go under the name, with the buttons
 * beside it, as icons if need be, rather than alone under the name.
 */
const masthead = shareButton.closest<HTMLElement>(".masthead")!;
function fitMasthead(): void {
  masthead.classList.remove("stacked", "compact");
  const below = (selector: string): boolean =>
    masthead.querySelector(selector)!.getBoundingClientRect().top >=
    masthead.querySelector(".identity")!.getBoundingClientRect().bottom;
  if (!below(".links") && !below(".page-actions")) return;
  masthead.classList.add("stacked");
  // Beside the name, the buttons keep only their icons if they must.
  if (below(".page-actions")) masthead.classList.add("compact");
}

function placeHeader(): void {
  fitMasthead();
  placeShareNote();
}
placeHeader();
addEventListener("resize", placeHeader);
// The widths change once the fonts have loaded.
document.fonts.ready.then(placeHeader);
// Escape hides the note until the pointer or the focus leaves the button
// (WCAG 1.4.13); a click elsewhere hides a note that a click had shown.
const shareHolder = shareButton.parentElement!;
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    shareHolder.classList.add("dismissed");
    shareHolder.classList.remove("shown");
  }
});
// The focus a click leaves on the button does not keep it hidden: only the
// keyboard's, which shows the note.
for (const type of ["mouseleave", "focusout"] as const) {
  shareHolder.addEventListener(type, () => {
    requestAnimationFrame(() => {
      if (
        !shareHolder.matches(":hover") &&
        !shareButton.matches(":focus-visible")
      ) {
        shareHolder.classList.remove("dismissed");
      }
    });
  });
}
document.addEventListener("click", (event) => {
  if (!shareHolder.contains(event.target as Node)) {
    shareHolder.classList.remove("shown");
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
