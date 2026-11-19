/**
 * Greek that every option has something to act on: every letter, mark,
 * punctuation and context the options name. It probes which options act on
 * which conversion (`scripts/generate_option_relevance.ts`), and gives the
 * playground an example of a value when the reader's text has none.
 */
export const PROBE_GREEK = [
  "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων· τί λέγεις;",
  "ὑπὲρ ἀνθρώπων εὐθύς αὐτοῦ ηὑρέθη ὑϊός Ἀίδης ἀΐδιος ῥήτωρ ἄρρητος Πύρρος",
  "ἄγγελος ἀνάγκη σφίγξ ἔλεγχος ἐμπορία μπαμπάς ντομάτα ἀντί Μπαρ Ντίνος γκρι",
  "κἀγώ τοὔνομα ταὐτό ᾠδῇ ᾨδῇ τῷ θεῷ ᾄδω ᾱ̓́ ῐ ῡ ᾰ ἀπ’ οὗ",
  "βίβλος ϐίος ϑεός ϕῶς ἐλπίσι ἐλπίδσι γέγραπται ψυχή ξένος φίλος χάρις λόγοσ",
  "ϲοφία Ϲωκράτης ϛʹ ϟʹ ϡʹ ϙ Ϙ ϝ ϳ αʹ ιβʹ ͵α",
  "ϗ Ϗ ȣ̓κ ἐϛὶ",
  "ΛΟΓΟΣ λόγος Λόγος  δύο   διαστήματα πολυ-λογία πολυ‐λογία πολυ‿λογία",
  "πού πώς ή άνθρωπος",
].join("\n");

/**
 * The first word that differs between two writings of one text, with the
 * word it writes in the source: `{ word: "ὑπὲρ", before: "hypèr", after:
 * "hupèr" }`. Words are what whitespace separates; texts whose words do not
 * line up give none.
 */
export function firstChange(
  source: string,
  before: string,
  after: string,
): { word: string; before: string; after: string } | undefined {
  const words = (text: string) => text.split(/\s+/).filter(Boolean);
  const [from, a, b] = [words(source), words(before), words(after)];
  if (a.length !== b.length || from.length !== a.length) return undefined;
  const index = a.findIndex((word, i) => word !== b[i]);
  if (index === -1) return undefined;
  // Without the punctuation around the words, unless it is the change.
  const bare = (word: string) =>
    word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
  const [word, was, is] = [from[index], a[index], b[index]].map(bare);
  return word && is && was !== is
    ? { word, before: was, after: is }
    : { word: from[index], before: a[index], after: b[index] };
}

/**
 * The span of `after` that differs from `before`, by words where they line
 * up, otherwise as one span between their common start and end: the
 * offsets of each changed word, in UTF-16 code units of `after`.
 */
export function changedSpans(
  before: string,
  after: string,
): { start: number; end: number }[] {
  if (before === after) return [];
  const split = (text: string) => text.split(/(\s+)/);
  const [a, b] = [split(before), split(after)];
  if (a.length === b.length) {
    const spans: { start: number; end: number }[] = [];
    let offset = 0;
    b.forEach((part, i) => {
      if (part !== a[i] && part.trim()) {
        spans.push({ start: offset, end: offset + part.length });
      }
      offset += part.length;
    });
    return spans;
  }
  let start = 0;
  while (start < before.length && before[start] === after[start]) start++;
  let end = 0;
  while (
    end < before.length - start && end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) end++;
  return [{ start, end: after.length - end }];
}
