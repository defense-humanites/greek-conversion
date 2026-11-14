import { ALPHABET } from "../src/alphabet.ts";
import { FORMATS } from "../src/mod.ts";
import type {
  CharacterAliasDefinition,
  ConverterConfiguration,
  CustomCharacterDefinition,
  Format,
} from "../src/mod.ts";

/** The character inventory the playground edits: a converter's own fields. */
export type Inventory = Pick<
  ConverterConfiguration,
  "aliases" | "characters" | "repertoire" | "exclude"
>;

/** The lists of character names: an allow-list, and what it removes. */
export type CharacterList = "repertoire" | "exclude";

export const FORMAT_LABELS: Readonly<Record<Format, string>> = {
  greek: "Greek",
  "beta-code": "Beta Code",
  transliteration: "Transliteration",
};

/** A character the lists can name: a built-in letter or a defined one. */
export interface CharacterChoice {
  id: string;
  label: string;
  /** Its forms in the three formats, for recognition. */
  forms: string;
}

/** `archaic-koppa` gives "Archaic koppa". */
function humanize(id: string): string {
  const words = id.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Every built-in letter, in the order of the alphabet. */
export const LETTERS: readonly CharacterChoice[] = Object.entries(ALPHABET)
  .map(([id, forms]) => ({
    id,
    label: humanize(id),
    forms: `${forms.greek} · ${forms.beta} · ${forms.tr}`,
  }));

/** The built-in letters, then the characters the inventory defines. */
export function characterChoices(
  inventory: Inventory,
): CharacterChoice[] {
  return [
    ...LETTERS,
    ...(inventory.characters ?? []).map(({ id, forms }) => ({
      id,
      label: id,
      forms: FORMATS.map((format) => forms[format]?.lowercase ?? "")
        .join(" · "),
    })),
  ];
}

/** Choices whose name, id, or forms contain the query, ignoring case. */
export function matchCharacters(
  choices: readonly CharacterChoice[],
  query: string,
): CharacterChoice[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...choices];
  const found = choices.filter(({ id, label, forms }) =>
    [id, label, forms].some((text) => text.toLowerCase().includes(needle))
  );
  const starts = (choice: CharacterChoice) =>
    choice.label.toLowerCase().startsWith(needle) ? 0 : 1;
  return found.sort((a, b) => starts(a) - starts(b));
}

/** The name of a character for a pill: "Stigma ϛ", or a defined id. */
export function characterName(id: string): string {
  const forms = (ALPHABET as Record<string, { greek: string }>)[id];
  return forms ? `${humanize(id)} ${forms.greek}` : id;
}

/** "Kappa κ ← c, k̄ · Transliteration, uppercase" */
export function aliasSummary(alias: CharacterAliasDefinition): string {
  const details = [
    FORMAT_LABELS[alias.format],
    ...(alias.uppercase ? ["uppercase"] : []),
    ...(alias.override ? ["takes precedence"] : []),
  ];
  return `${characterName(alias.letter)} ← ${alias.spellings.join(", ")} · ${
    details.join(", ")
  }`;
}

/** "sho: ϸ · #400 · š" */
export function customSummary(character: CustomCharacterDefinition): string {
  return `${character.id}: ${
    FORMATS.map((format) => character.forms[format]?.lowercase ?? "")
      .join(" · ")
  }`;
}

/** The inventory without its empty fields, which a converter does not need. */
function compact(inventory: Inventory): Inventory {
  const next: Inventory = {};
  for (
    const key of ["aliases", "characters", "repertoire", "exclude"] as const
  ) {
    const value = inventory[key];
    if (value && value.length) (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

export function withListItem(
  inventory: Inventory,
  list: CharacterList,
  id: string,
): Inventory {
  const items = inventory[list] ?? [];
  if (items.includes(id)) return inventory;
  return compact({ ...inventory, [list]: [...items, id] });
}

export function withoutListItem(
  inventory: Inventory,
  list: CharacterList,
  id: string,
): Inventory {
  return compact({
    ...inventory,
    [list]: (inventory[list] ?? []).filter((item) => item !== id),
  });
}

export function withAlias(
  inventory: Inventory,
  alias: CharacterAliasDefinition,
): Inventory {
  return compact({
    ...inventory,
    aliases: [...(inventory.aliases ?? []), alias],
  });
}

export function withCharacter(
  inventory: Inventory,
  character: CustomCharacterDefinition,
): Inventory {
  return compact({
    ...inventory,
    characters: [...(inventory.characters ?? []), character],
  });
}

export function withoutEntry(
  inventory: Inventory,
  field: "aliases" | "characters",
  index: number,
): Inventory {
  return compact({
    ...inventory,
    [field]: (inventory[field] ?? []).filter((_, i) => i !== index),
  });
}

/** "c, k̄" gives `["c", "k̄"]`. */
export function splitSpellings(text: string): string[] {
  return text.split(",").map((spelling) => spelling.trim()).filter(Boolean);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/**
 * Keeps the parts of a parsed value that have the shape of an inventory,
 * from a shared link: the converter checks the rest, and says what is wrong.
 */
export function knownInventory(value: unknown): Inventory {
  if (!isRecord(value)) return {};
  const inventory: Inventory = {};
  for (const list of ["repertoire", "exclude"] as const) {
    if (isStrings(value[list])) inventory[list] = value[list];
  }
  if (Array.isArray(value.aliases)) {
    inventory.aliases = value.aliases.filter((alias) =>
      isRecord(alias) && typeof alias.letter === "string" &&
      (FORMATS as readonly unknown[]).includes(alias.format) &&
      isStrings(alias.spellings)
    ) as CharacterAliasDefinition[];
  }
  if (Array.isArray(value.characters)) {
    inventory.characters = value.characters.filter((character) =>
      isRecord(character) && typeof character.id === "string" &&
      isRecord(character.forms) &&
      FORMATS.every((format) => {
        const forms = (character.forms as Record<string, unknown>)[format];
        return isRecord(forms) && typeof forms.lowercase === "string";
      })
    ) as CustomCharacterDefinition[];
  }
  return compact(inventory);
}
