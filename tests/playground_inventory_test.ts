import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import {
  aliasSummary,
  characterChoices,
  characterName,
  customSummary,
  knownInventory,
  LETTERS,
  matchCharacters,
  splitSpellings,
  withAlias,
  withCharacter,
  withListItem,
  withoutEntry,
  withoutListItem,
} from "../web/inventory.ts";

const SHO = {
  id: "sho",
  forms: {
    greek: { lowercase: "ϸ", uppercase: "Ϸ" },
    "beta-code": { lowercase: "#400" },
    transliteration: { lowercase: "š" },
  },
};

test("names characters for people", () => {
  assertEquals(LETTERS.length, 30);
  assertEquals(characterName("archaic-koppa"), "Archaic koppa ϙ");
  assertEquals(characterName("sho"), "sho");
  assertEquals(
    aliasSummary({
      letter: "kappa",
      format: "transliteration",
      spellings: ["c", "k̄"],
      uppercase: true,
    }),
    "Kappa κ ← c, k̄ · Transliteration, uppercase",
  );
  assertEquals(customSummary(SHO), "sho: ϸ · #400 · š");
});

test("finds characters by name, id, or form", () => {
  const names = (query: string) =>
    matchCharacters(characterChoices({}), query).map(({ id }) => id);
  assertEquals(names("stig"), ["stigma"]);
  assertEquals(names("koppa"), ["koppa", "archaic-koppa"]);
  assertEquals(names("ϡ"), ["sampi"]);
  assertEquals(
    characterChoices({ characters: [SHO] }).at(-1)?.forms,
    "ϸ · #400 · š",
  );
});

test("edits the inventory without empty fields", () => {
  let inventory = withListItem({}, "exclude", "stigma");
  inventory = withListItem(inventory, "exclude", "stigma");
  assertEquals(inventory, { exclude: ["stigma"] });
  assertEquals(withoutListItem(inventory, "exclude", "stigma"), {});
  inventory = withAlias(
    {},
    { letter: "kappa", format: "transliteration", spellings: ["c"] },
  );
  inventory = withCharacter(inventory, SHO);
  assertEquals(Object.keys(inventory), ["aliases", "characters"]);
  assertEquals(withoutEntry(inventory, "aliases", 0), { characters: [SHO] });
  assertEquals(splitSpellings(" c, k̄ ,, "), ["c", "k̄"]);
});

test("keeps what has the shape of an inventory from a link", () => {
  assertEquals(
    knownInventory({
      exclude: ["stigma", 1],
      repertoire: ["alpha"],
      aliases: [
        { letter: "kappa", format: "transliteration", spellings: ["c"] },
        { letter: "kappa", format: "latin", spellings: ["c"] },
      ],
      characters: [SHO, { id: "x", forms: {} }],
      other: true,
    }),
    {
      aliases: [
        { letter: "kappa", format: "transliteration", spellings: ["c"] },
      ],
      characters: [SHO],
      repertoire: ["alpha"],
    },
  );
  assertEquals(knownInventory("text"), {});
});
