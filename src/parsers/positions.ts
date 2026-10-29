/**
 * Positions of tokens in the text they were read from, and of their output in
 * the text they were written to.
 *
 * The readers and the encoders work on a normalized form of the text (NFD on
 * input, NFC or NFD on output), while positions are reported in the text as
 * the caller supplied or receives it, in UTF-16 code units: what selections,
 * ranges and editors use. The two forms are aligned segment by segment. A
 * segment is a character and the code points that continue it: the combining
 * marks that follow it, and the few letters that canonical composition joins
 * to the letter before them ({@link continuesSegment}). With that definition,
 * normalization never moves a code point from one segment to another, so one
 * segment of the supplied text becomes one segment of the normalized text,
 * whatever happens inside it (composition, decomposition, reordering of
 * marks); `tests/positions_test.ts` checks it for every code point.
 *
 * The readers record, for each token, where it starts in the text they read;
 * the encoders record where each rendered token's output starts and ends in
 * the text they assemble. {@link spansIn} then maps those ranges to the
 * supplied or final text through a {@link segmentMap}.
 *
 * @module
 */

/**
 * Ranges of UTF-16 code units, one per token: `starts[i]` included and
 * `ends[i]` excluded. Two arrays rather than one object per token: a long
 * text has a hundred thousand tokens. Plain arrays rather than typed ones,
 * here and in the other tables of this module: a typed array costs about a
 * microsecond to allocate, more than converting a word, and a conversion
 * that reports positions allocates a dozen tables.
 */
export interface SpanTable {
  readonly starts: number[];
  readonly ends: number[];
}

/**
 * Filled by a reader: the text it read (`input` once normalized, or `input`
 * itself) and the start of each token in it, followed by the text's length.
 * Tokens cover the text without gaps, so each one ends where the next starts.
 */
export interface ReadPositions {
  text: string;
  starts: number[];
}

/**
 * Filled by an encoder: the text it assembled, before normalization, and the
 * start and end in it of each rendered token's output, in arrays the caller
 * sized to the document. The output of several tokens written as one (the
 * two letters of a modern digraph, a dental and the sigma it assimilates to)
 * is one range, recorded for each of them.
 */
export interface WrittenPositions {
  text: string;
  starts: number[];
  ends: number[];
}

/**
 * Whether a code point continues the segment of the character before it: a
 * combining mark (general category M), or one of the few letters that
 * canonical composition joins to the letter before them (Hangul vowel and
 * final jamo, the Kirat Rai vowel signs E and AI; AI decomposes into two E,
 * so it continues a segment too, or its decomposed form would not). With this
 * definition, normalization turns each segment of a text into exactly one
 * segment, which `tests/positions_test.ts` checks for every code point.
 */
export function continuesSegment(codePoint: number): boolean {
  return (codePoint >= 0x1161 && codePoint <= 0x1175) ||
    (codePoint >= 0x11A8 && codePoint <= 0x11C2) ||
    codePoint === 0x16D67 || codePoint === 0x16D68 ||
    /\p{M}/u.test(String.fromCodePoint(codePoint));
}

/**
 * {@link continuesSegment} of each BMP unit, decided once per unit and
 * remembered: 0 unknown, 1 continues, 2 starts a segment. The table is
 * allocated on the first conversion that reports positions.
 */
let unitClasses: Uint8Array | undefined;
/** {@link continuesSegment} of the astral code points met so far. */
let astralClasses: Map<number, boolean> | undefined;

/**
 * Index of the unit after the segment that starts at `index`. Code points are
 * classified whole: the high surrogate of an astral combining mark continues
 * the segment like any mark.
 */
function segmentEnd(text: string, index: number): number {
  let end = index + 1;
  while (end < text.length) {
    const unit = text.charCodeAt(end);
    // A low surrogate continues its pair (or stands alone).
    if (unit >= 0xDC00 && unit <= 0xDFFF) {
      end++;
      continue;
    }
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      const low = text.charCodeAt(end + 1);
      if (!(low >= 0xDC00 && low <= 0xDFFF)) break;
      const codePoint = (unit - 0xD800) * 0x400 + (low - 0xDC00) + 0x10000;
      const known = astralClasses ??= new Map();
      let continues = known.get(codePoint);
      if (continues === undefined) {
        continues = continuesSegment(codePoint);
        known.set(codePoint, continues);
      }
      if (!continues) break;
      end += 2;
      continue;
    }
    const classes = unitClasses ??= new Uint8Array(0x10000);
    let kind = classes[unit];
    if (kind === 0) kind = classes[unit] = continuesSegment(unit) ? 1 : 2;
    if (kind !== 1) break;
    end++;
  }
  return end;
}

/**
 * For each code unit of one text (`from`), plus one entry for its length, a
 * range in another text (`to`): the unit it corresponds to when its segment
 * is the same in both texts, the whole segment otherwise.
 */
export interface SegmentMap {
  readonly starts: number[];
  readonly ends: number[];
}

/**
 * Aligns two texts, one the normalization of the other, segment by segment,
 * and returns for every unit of `from` its range in `to`. A segment that
 * normalization left unchanged is aligned unit for unit, so that its units
 * keep their own positions; a segment it changed (composed, decomposed, or
 * reordered) cannot be split, and each of its units maps to the whole
 * segment. Positions are therefore as precise as the texts allow, whatever
 * the rest of the text holds. `original` says which of the two is the text
 * the other was normalized from, and `form` how. The map is undefined when
 * the texts are equal: positions then need no mapping.
 *
 * The two texts are walked together, one segment at a time, which costs about
 * as much as the normalization itself. The walk pairs segments by their
 * order, not their content, so it also holds when the other text is not
 * exactly the normalization (Greek output rewrites the acute as oxia after
 * NFC). It is right because each segment of the original is one segment of
 * its normalization ({@link continuesSegment}). Should a later Unicode
 * version add a letter that composes with the one before it, the walk would
 * not end on both texts at once, and the map is then rebuilt by
 * {@link segmentMapBySegment}.
 */
export function segmentMap(
  from: string,
  to: string,
  original: "from" | "to",
  form: "NFC" | "NFD",
): SegmentMap | undefined {
  if (from === to) return undefined;
  const starts = new Array<number>(from.length + 1).fill(0);
  const ends = new Array<number>(from.length + 1).fill(0);

  let f = 0;
  let t = 0;
  while (f < from.length && t < to.length) {
    const fEnd = segmentEnd(from, f);
    const tEnd = segmentEnd(to, t);
    // A segment of one unit maps to its counterpart either way; only longer
    // ones are compared.
    if (fEnd - f > 1 && sameUnits(from, f, to, t, fEnd - f, tEnd - t)) {
      for (let k = f; k < fEnd; k++) {
        starts[k] = t + (k - f);
        ends[k] = t + (k - f) + 1;
      }
    } else {
      for (let k = f; k < fEnd; k++) {
        starts[k] = t;
        ends[k] = tEnd;
      }
    }
    f = fEnd;
    t = tEnd;
  }
  if (f !== from.length || t !== to.length) {
    return segmentMapBySegment(from, to, original, form, starts, ends);
  }
  starts[from.length] = to.length;
  ends[from.length] = to.length;
  return { starts, ends };
}

/** Whether two ranges of units, of the given lengths, hold the same units. */
function sameUnits(
  a: string,
  aStart: number,
  b: string,
  bStart: number,
  aLength: number,
  bLength: number,
): boolean {
  if (aLength !== bLength) return false;
  for (let k = 0; k < aLength; k++) {
    if (a.charCodeAt(aStart + k) !== b.charCodeAt(bStart + k)) return false;
  }
  return true;
}

/**
 * The fallback alignment, for a letter that composes with the one before it
 * and that {@link continuesSegment} does not list yet (the test of every code
 * point fails first): each segment of the original text is normalized alone
 * to find how many units it makes in the other text. The ranges stay within
 * bounds and in order, but after such a letter they may be off by a few
 * units. It is not reached with the Unicode version the tests run on.
 */
function segmentMapBySegment(
  from: string,
  to: string,
  original: "from" | "to",
  form: "NFC" | "NFD",
  starts: number[],
  ends: number[],
): SegmentMap {
  let f = 0;
  let t = 0;
  if (original === "from") {
    while (f < from.length) {
      const fEnd = segmentEnd(from, f);
      const length = from.slice(f, fEnd).normalize(form).length;
      const tEnd = Math.min(t + length, to.length);
      for (let k = f; k < fEnd; k++) {
        starts[k] = t;
        ends[k] = tEnd;
      }
      f = fEnd;
      t = tEnd;
    }
  } else {
    while (t < to.length && f < from.length) {
      const tEnd = segmentEnd(to, t);
      const length = to.slice(t, tEnd).normalize(form).length;
      const fEnd = Math.min(f + length, from.length);
      for (let k = f; k < fEnd; k++) {
        starts[k] = t;
        ends[k] = tEnd;
      }
      f = fEnd;
      t = tEnd;
    }
  }
  for (let k = f; k <= from.length; k++) {
    starts[k] = to.length;
    ends[k] = to.length;
  }
  return { starts, ends };
}

/**
 * Maps the ranges `[starts[i], ends[i])` of one text to the other through a
 * segment map (or as they are, without one): a range goes from the start of
 * the range its first unit maps to, to the end of the range its last unit
 * maps to. Ranges inside a segment that normalization changed therefore all
 * become that segment's range: the literals read from one precomposed
 * character share it, and a token read from part of a character the previous
 * token also draws on lies inside that token's range; so do a token and a
 * stray combining mark written right after it that the output composes with
 * it. An empty range stays empty, at the start of its unit's range.
 */
export function spansIn(
  starts: ArrayLike<number>,
  ends: ArrayLike<number>,
  count: number,
  map: SegmentMap | undefined,
): SpanTable {
  const mappedStarts = new Array<number>(count).fill(0);
  const mappedEnds = new Array<number>(count).fill(0);
  for (let i = 0; i < count; i++) {
    const start = starts[i];
    const end = ends[i];
    if (map === undefined) {
      mappedStarts[i] = start;
      mappedEnds[i] = end;
    } else if (end > start) {
      mappedStarts[i] = map.starts[start];
      mappedEnds[i] = map.ends[end - 1];
    } else {
      mappedStarts[i] = mappedEnds[i] = map.starts[start];
    }
  }
  return { starts: mappedStarts, ends: mappedEnds };
}

/**
 * Spans in the supplied `input` of the tokens a reader read from it. The
 * reader's starts are in the text it read, which is `input` normalized to NFD
 * (or `input` itself for Beta Code). A token ends where the next one starts;
 * tokens read from one character (the two letters of a modern digraph)
 * record the same start and share the character. A token read from part of a
 * precomposed character that the previous token also draws on (the dot below
 * of `ḥ` after the `p` of `ph`) gets that character's span, inside the
 * previous token's.
 */
export function readSpans(input: string, read: ReadPositions): SpanTable {
  const { starts } = read;
  const count = starts.length - 1;
  const ends = new Array<number>(count).fill(0);
  let end = read.text.length;
  for (let i = count - 1; i >= 0; i--) {
    if (starts[i + 1] > starts[i]) end = starts[i + 1];
    ends[i] = end;
  }
  const map = segmentMap(read.text, input, "to", "NFD");
  return spansIn(starts, ends, count, map);
}

/**
 * Spans in the final `output` of the rendered tokens an encoder wrote. The
 * encoder's ranges are in the text it assembled, of which `output` is the
 * normalization in `form`. When normalization changed nothing (Beta Code,
 * or a text already in its form), they are the spans, and the encoder's
 * arrays are returned as they are.
 */
export function writtenSpans(
  output: string,
  written: WrittenPositions,
  form: "NFC" | "NFD",
): SpanTable {
  const map = segmentMap(written.text, output, "from", form);
  if (map === undefined) return { starts: written.starts, ends: written.ends };
  return spansIn(written.starts, written.ends, written.starts.length, map);
}

/**
 * Joins the output pieces of the rendered tokens, recording the range of each.
 * An empty piece after another is output merged into the previous token's
 * (the second letter of a modern digraph): it shares that token's range.
 */
export function joinPieces(
  pieces: readonly string[],
  written: WrittenPositions,
): string {
  const { starts, ends } = written;
  let position = 0;
  let start = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (piece.length > 0 || i === 0) {
      start = position;
      position += piece.length;
    }
    starts[i] = start;
    ends[i] = position;
  }
  const text = pieces.join("");
  written.text = text;
  return text;
}

/**
 * Where each token of a conversion's source document ended up after the
 * orthography passes: `map[i]` is an index in the document the passes
 * returned, or -1 when a pass dropped the token. Several tokens may end up
 * in one (the tokens of a Greek numeral written as one decimal literal, the
 * whitespace run collapsed to one space).
 *
 * `map` stays undefined, the identity, until a pass changes the token count:
 * only `whitespace: "collapse"` and `numerals: "decimal"` do, so most
 * conversions never build it.
 */
export interface TokenTargets {
  map?: number[];
}

/**
 * Composes into `targets` the mapping `next` of a pass that changed the token
 * count: `next[i]` is where token `i` of the document the pass received ended
 * up in the document it returned.
 */
export function composeTargets(targets: TokenTargets, next: number[]): void {
  const map = targets.map;
  if (map === undefined) {
    targets.map = next;
    return;
  }
  for (let i = 0; i < map.length; i++) {
    const target = map[i];
    if (target >= 0) map[i] = next[target];
  }
}

/**
 * The output span of each source token: that of the rendered token it ended
 * up in, or, for a token the output dropped, an empty span where the output
 * of the next token that has one starts (the end of the output after the
 * last). Without `targets` (no pass changed the token count), the source
 * tokens are the rendered ones and their spans are `rendered`.
 */
export function outputSpans(
  targets: number[] | undefined,
  rendered: SpanTable,
  outputLength: number,
): SpanTable {
  if (targets === undefined) return rendered;
  const starts = new Array<number>(targets.length).fill(0);
  const ends = new Array<number>(targets.length).fill(0);
  let next = outputLength;
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    if (target >= 0) {
      starts[i] = next = rendered.starts[target];
      ends[i] = rendered.ends[target];
    } else {
      starts[i] = ends[i] = next;
    }
  }
  return { starts, ends };
}
