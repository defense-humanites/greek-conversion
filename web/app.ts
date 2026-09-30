import {
  CharacterScopeError,
  createConverter,
  listPresetMetadata,
} from "../src/mod.ts";
import type {
  ConversionOptions,
  ConverterConfiguration,
  Format,
  Preset,
} from "../src/mod.ts";
import { parse, validateDocument } from "../src/document.ts";
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
const optionsInput = element<HTMLTextAreaElement>("options");
const optionsSuggestions = element<HTMLDivElement>("options-suggestions");
const inventoryInput = element<HTMLTextAreaElement>("inventory");
const inventorySuggestions = element<HTMLDivElement>("inventory-suggestions");
const strict = element<HTMLInputElement>("strict");
const status = element<HTMLParagraphElement>("status");
const diagnostics = element<HTMLDivElement>("diagnostics");
const presetInfo = element<HTMLDivElement>("preset-info");
const documentPanel = element<HTMLDetailsElement>("document-panel");
const documentPreview = element<HTMLPreElement>("document-preview");
const copyButton = element<HTMLButtonElement>("copy");
const swapButton = element<HTMLButtonElement>("swap");

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

const examples: Record<Format, readonly [string, string][]> = {
  greek: [
    ["Choose an example…", ""],
    ["ἄνθρωπος", "ἄνθρωπος"],
    ["Ἄνθρωπος ῥόδος", "Ἄνθρωπος ῥόδος"],
    ["ϲῶμα ϝ ϛʹ", "ϲῶμα ϝ ϛʹ"],
    ["αʹ καὶ ͵β", "αʹ καὶ ͵β"],
  ],
  "beta-code": [
    ["Choose an example…", ""],
    ["A)/NQRWPOS", "A)/NQRWPOS"],
    ["*)/ANQRWPOS", "*)/ANQRWPOS"],
    ["*(=W|", "*(=W|"],
  ],
  transliteration: [
    ["Choose an example…", ""],
    ["ánthrōpos", "ánthrōpos"],
    ["Chará", "Chará"],
    ["Thálassa", "Thálassa"],
  ],
};

function selectedFormat(select: HTMLSelectElement): Format {
  return select.value as Format;
}

function updateExamples(): void {
  exampleSelect.replaceChildren();
  for (const [label, value] of examples[selectedFormat(sourceFormat)]) {
    exampleSelect.add(new Option(label, value));
  }
}

function showPreset(): void {
  const metadata = presets.find(({ id }) => id === presetSelect.value);
  presetInfo.replaceChildren();
  presetInfo.hidden = metadata === undefined;
  if (metadata === undefined) return;

  const description = document.createElement("p");
  description.textContent = `${metadata.description} Scope: ${
    metadata.scope.join(", ")
  }.`;
  const details = document.createElement("p");
  details.textContent =
    `Coverage: ${metadata.coverage} · Known limitations: ${metadata.limitations.length} · `;
  const link = document.createElement("a");
  link.href =
    "https://github.com/defense-humanites/greek-conversion/blob/main/docs/presets.md";
  link.textContent = "Preset details ↗";
  details.append(link);
  presetInfo.append(description, details);
}

function parseSettings<T>(
  input: HTMLTextAreaElement,
  allowed: readonly string[],
  label: string,
): T {
  const value: unknown = JSON.parse(input.value.trim() || "{}");
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

function showIssues(
  losses: readonly { code: string; index: number; message: string }[],
  scope: readonly { code: string; index: number; message: string }[],
): void {
  diagnostics.replaceChildren();
  diagnostics.hidden = losses.length + scope.length === 0;
  if (diagnostics.hidden) return;

  for (
    const [label, issues] of [["Information loss", losses], [
      "Repertoire",
      scope,
    ]] as const
  ) {
    if (!issues.length) continue;
    const heading = document.createElement("strong");
    heading.textContent = `${label} (${issues.length})`;
    const list = document.createElement("ul");
    for (const issue of issues) {
      const item = document.createElement("li");
      item.textContent =
        `Token ${issue.index} · ${issue.code} — ${issue.message}`;
      list.append(item);
    }
    diagnostics.append(heading, list);
  }
}

function inspectDocument(options: ConversionOptions): void {
  if (!documentPanel.open) return;
  const parsed = parse(source.value, selectedFormat(sourceFormat), options);
  documentPreview.textContent = JSON.stringify(
    {
      tokens: parsed.map((token) =>
        token.kind === "grapheme"
          ? { ...token, diacritics: [...token.diacritics] }
          : token
      ),
      validation: validateDocument(parsed),
    },
    null,
    2,
  );
}

function update(): void {
  documentPreview.textContent = "";
  try {
    const options = parseSettings<ConversionOptions>(
      optionsInput,
      ["orthography", "diacritics", "unicode", "removeDiacritics"],
      "Conversion options",
    );
    const preset = presetSelect.value as Preset | "";
    inspectDocument({ ...options, ...(preset ? { preset } : {}) });
    const inventory = parseSettings<ConverterConfiguration>(
      inventoryInput,
      ["aliases", "characters", "repertoire", "exclude"],
      "Custom character inventory",
    );
    const converter = createConverter({
      ...inventory,
      ...(preset ? { preset } : {}),
      outOfScopeBehavior: strict.checked ? "reject" : "preserve",
    });
    const result = converter.convertDetailed(
      source.value,
      selectedFormat(sourceFormat),
      selectedFormat(targetFormat),
      options,
    );

    output.value = result.output;
    copyButton.disabled = swapButton.disabled = false;
    status.classList.remove("error");
    const lossCount = result.losses.length;
    const scopeCount = result.diagnostics.length;
    status.textContent = source.value
      ? lossCount || scopeCount
        ? `Losses: ${lossCount} · Repertoire diagnostics: ${scopeCount}.`
        : "No information loss or repertoire issues detected."
      : "Enter text or load an example.";
    showIssues(result.losses, result.diagnostics);
  } catch (error) {
    output.value = "";
    copyButton.disabled = swapButton.disabled = true;
    status.classList.add("error");
    status.textContent = error instanceof Error ? error.message : String(error);
    showIssues(
      [],
      error instanceof CharacterScopeError ? error.diagnostics : [],
    );
  }
}

sourceFormat.addEventListener("change", () => {
  updateExamples();
  update();
});
targetFormat.addEventListener("change", update);
presetSelect.addEventListener("change", () => {
  showPreset();
  update();
});
exampleSelect.addEventListener("change", () => {
  if (exampleSelect.value) {
    source.value = exampleSelect.value;
    update();
  }
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
swapButton.addEventListener("click", () => {
  const oldSource = sourceFormat.value;
  sourceFormat.value = targetFormat.value;
  targetFormat.value = oldSource;
  source.value = output.value;
  updateExamples();
  update();
});
copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    status.textContent = "Output copied.";
  } catch {
    status.textContent = "Copy unavailable; select the output manually.";
  }
});

updateExamples();
showPreset();
update();
