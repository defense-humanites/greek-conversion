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
const inventoryInput = element<HTMLTextAreaElement>("inventory");
const strict = element<HTMLInputElement>("strict");
const status = element<HTMLParagraphElement>("status");
const diagnostics = element<HTMLDivElement>("diagnostics");
const presetInfo = element<HTMLDivElement>("preset-info");
const documentPanel = element<HTMLDetailsElement>("document-panel");
const documentPreview = element<HTMLPreElement>("document-preview");
const copyButton = element<HTMLButtonElement>("copy");
const swapButton = element<HTMLButtonElement>("swap");

const presets = listPresetMetadata();
for (const metadata of presets) {
  presetSelect.add(new Option(metadata.name, metadata.id));
}

const examples: Record<Format, readonly [string, string][]> = {
  greek: [
    ["Choisir un exemple…", ""],
    ["ἄνθρωπος", "ἄνθρωπος"],
    ["Ἄνθρωπος ῥόδος", "Ἄνθρωπος ῥόδος"],
    ["ϲῶμα ϝ ϛʹ", "ϲῶμα ϝ ϛʹ"],
    ["αʹ καὶ ͵β", "αʹ καὶ ͵β"],
  ],
  "beta-code": [
    ["Choisir un exemple…", ""],
    ["A)/NQRWPOS", "A)/NQRWPOS"],
    ["*)/ANQRWPOS", "*)/ANQRWPOS"],
    ["*(=W|", "*(=W|"],
  ],
  transliteration: [
    ["Choisir un exemple…", ""],
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
  description.textContent = `${metadata.description} Périmètre : ${metadata.scope.join(", ")}.`;
  const details = document.createElement("p");
  details.textContent = `Couverture : ${metadata.coverage} · ${metadata.limitations.length} limite(s) documentée(s) · `;
  const link = document.createElement("a");
  link.href = "https://github.com/defense-humanites/greek-conversion/blob/main/docs/presets.md";
  link.textContent = "Détails du preset ↗";
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
    throw new TypeError(`${label} : un objet JSON est attendu.`);
  }
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new TypeError(`${label} : champ non pris en charge (${unknown.join(", ")}).`);
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

  for (const [label, issues] of [["Pertes détectées", losses], ["Périmètre", scope]] as const) {
    if (!issues.length) continue;
    const heading = document.createElement("strong");
    heading.textContent = `${label} (${issues.length})`;
    const list = document.createElement("ul");
    for (const issue of issues) {
      const item = document.createElement("li");
      item.textContent = `Token ${issue.index} · ${issue.code} — ${issue.message}`;
      list.append(item);
    }
    diagnostics.append(heading, list);
  }
}

function inspectDocument(options: ConversionOptions): void {
  if (!documentPanel.open) return;
  const parsed = parse(source.value, selectedFormat(sourceFormat), options);
  documentPreview.textContent = JSON.stringify({
    tokens: parsed.map((token) =>
      token.kind === "grapheme"
        ? { ...token, diacritics: [...token.diacritics] }
        : token
    ),
    validation: validateDocument(parsed),
  }, null, 2);
}

function update(): void {
  try {
    const options = parseSettings<ConversionOptions>(
      optionsInput,
      ["orthography", "diacritics", "unicode", "removeDiacritics"],
      "Options de conversion",
    );
    const inventory = parseSettings<ConverterConfiguration>(
      inventoryInput,
      ["aliases", "characters", "repertoire", "exclude"],
      "Inventaire personnalisé",
    );
    const preset = presetSelect.value as Preset | "";
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
    status.textContent = source.value
      ? result.lossy || result.diagnostics.length
        ? `${result.losses.length} perte(s) · ${result.diagnostics.length} diagnostic(s) de périmètre.`
        : "Aucune perte ni sortie de périmètre détectée."
      : "Saisissez un texte ou chargez un exemple.";
    showIssues(result.losses, result.diagnostics);
    inspectDocument({ ...options, ...(preset ? { preset } : {}) });
  } catch (error) {
    output.value = "";
    copyButton.disabled = swapButton.disabled = true;
    status.classList.add("error");
    status.textContent = error instanceof Error ? error.message : String(error);
    showIssues([], error instanceof CharacterScopeError ? error.diagnostics : []);
    documentPreview.textContent = "";
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
for (const field of [source, optionsInput, inventoryInput]) {
  field.addEventListener("input", update);
}
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
    status.textContent = "Résultat copié.";
  } catch {
    status.textContent = "Copie indisponible : sélectionnez le résultat manuellement.";
  }
});

updateExamples();
showPreset();
update();
