import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { detectFormat } from "../web/detect_format.ts";

test("detects Greek, Beta Code, and transliteration from their characters", () => {
  assertEquals(detectFormat("Μῆνιν ἄειδε θεὰ"), "greek");
  assertEquals(detectFormat("Πού είσαι;"), "greek");
  assertEquals(detectFormat("*mh=nin a)/eide qea\\"), "beta-code");
  assertEquals(detectFormat("*)AQHNAI=OI"), "beta-code");
  assertEquals(detectFormat("w)|dh/"), "beta-code");
  assertEquals(detectFormat("Hóti mèn humeĩs, ō̃ ándres"), "transliteration");
  assertEquals(detectFormat("Hellēsin (egeneto)"), "transliteration");
  assertEquals(detectFormat("pháos) hó|"), "transliteration");
});

test("takes plain Latin letters as a transliteration", () => {
  assertEquals(detectFormat("logos"), "transliteration");
  assertEquals(detectFormat("LOGOS"), "transliteration");
  assertEquals(detectFormat("Menin aeide thea, 12"), "transliteration");
  assertEquals(detectFormat("*logos"), "beta-code");
});

test("leaves text without letters undecided", () => {
  assertEquals(detectFormat(""), undefined);
  assertEquals(detectFormat("  , ; 12"), undefined);
});
