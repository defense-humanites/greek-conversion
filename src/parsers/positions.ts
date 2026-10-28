/**
 * Positions of tokens in the text they were read from, and of their output in
 * the text they were written to.
 *
 * The readers and the encoders work on a normalized form of the text (NFD on
 * input, NFC or NFD on output), while positions are reported in the text as
 * the caller supplied or receives it, in UTF-16 code units: what selections,
 * ranges and editors use. The two forms are aligned segment by segment. A
 * segment is a starter and the combining marks that follow it; normalization
 * never moves a mark from one segment to another, so one segment of the
 * supplied text becomes one segment of the normalized text, whatever happens
 * inside it (composition, decomposition, reordering of marks).
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
 * `ends[i]` excluded. Two typed arrays rather than one object per token: a
 * long text has a hundred thousand tokens.
 */
export interface SpanTable {
  readonly starts: Uint32Array;
  readonly ends: Uint32Array;
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
  starts: Uint32Array;
  ends: Uint32Array;
}

/**
 * Whether a BMP code unit is a combining mark (general category M), decided
 * once per unit with the Unicode property and remembered: 0 unknown, 1 mark,
 * 2 starter. The table is allocated on the first conversion that reports
 * positions. A low surrogate continues its pair, so it counts as a mark.
 */
let markClasses: Uint8Array | undefined;

function isMark(unit: number): boolean {
  if (unit >= 0xDC00 && unit <= 0xDFFF) return true;
  const classes = markClasses ??= new Uint8Array(0x10000);
  let kind = classes[unit];
  if (kind === 0) {
    kind = classes[unit] = /\p{M}/u.test(String.fromCharCode(unit)) ? 1 : 2;
  }
  return kind === 1;
}

/** Index of the unit after the segment that starts at `index`. */
function segmentEnd(text: string, index: number): number {
  let end = index + 1;
  while (end < text.length && isMark(text.charCodeAt(end))) end++;
  return end;
}

/**
 * For each code unit of one text (`from`), plus one entry for its length,
 * the start and the end in another text (`to`) of the segment it belongs to.
 */
export interface SegmentMap {
  readonly starts: Uint32Array;
  readonly ends: Uint32Array;
}

/**
 * Aligns two texts, one the normalization of the other, segment by segment,
 * and returns for every unit of `from` the range in `to` of its segment.
 * `original` says which of the two is the text the other was normalized from,
 * and `form` how. The map is undefined when the texts are equal: positions
 * then need no mapping.
 *
 * The two texts are walked together, one segment at a time, which costs about
 * as much as the normalization itself. The walk is right whenever each
 * segment of the original is one segment of its normalization, which holds
 * for Greek, Latin and nearly every script. When it does not (a Hangul
 * syllable decomposes into three starters), the walk does not end on both
 * texts at once, and the map is rebuilt from the normalization of each
 * segment of the original on its own, which is slower.
 */
export function segmentMap(
  from: string,
  to: string,
  original: "from" | "to",
  form: "NFC" | "NFD",
): SegmentMap | undefined {
  if (from === to) return undefined;
  const starts = new Uint32Array(from.length + 1);
  const ends = new Uint32Array(from.length + 1);

  let f = 0;
  let t = 0;
  while (f < from.length && t < to.length) {
    const fEnd = segmentEnd(from, f);
    const tEnd = segmentEnd(to, t);
    for (let k = f; k < fEnd; k++) {
      starts[k] = t;
      ends[k] = tEnd;
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

/**
 * The slow alignment: each segment of the original text is normalized alone
 * to find how many units it makes in the other text. Exact unless several
 * starters compose into one (Hangul jamo under NFC), where the ranges stay
 * within bounds and in order but may be off by a few units.
 */
function segmentMapBySegment(
  from: string,
  to: string,
  original: "from" | "to",
  form: "NFC" | "NFD",
  starts: Uint32Array,
  ends: Uint32Array,
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
 * segment map (or as they are, without one): a range becomes the start of the
 * segment holding its first unit to the end of the segment holding its last.
 * Ranges inside one segment therefore all become that segment's range: the
 * literals read from one precomposed character share it, as do a token and a
 * stray combining mark written right after it. An empty range stays empty,
 * at the start of its segment.
 */
export function spansIn(
  starts: ArrayLike<number>,
  ends: ArrayLike<number>,
  count: number,
  map: SegmentMap | undefined,
): SpanTable {
  const mappedStarts = new Uint32Array(count);
  const mappedEnds = new Uint32Array(count);
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
 * record the same start and share the character.
 */
export function readSpans(input: string, read: ReadPositions): SpanTable {
  const { starts } = read;
  const count = starts.length - 1;
  const ends = new Uint32Array(count);
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
 * normalization in `form`.
 */
export function writtenSpans(
  output: string,
  written: WrittenPositions,
  form: "NFC" | "NFD",
): SpanTable {
  const map = segmentMap(written.text, output, "from", form);
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
 * Where each token of the document an orthography pass received ended up in
 * the document it returned: an index there, or -1 when the pass dropped it.
 * Several tokens may end up in one (the tokens of a Greek numeral written as
 * one decimal literal, the whitespace run collapsed to one space).
 *
 * A conversion keeps one such array for its source document and composes
 * into it the mapping of each pass that changes the token count.
 */
export function identityTargets(count: number): Int32Array {
  const targets = new Int32Array(count);
  for (let i = 0; i < count; i++) targets[i] = i;
  return targets;
}

export function composeTargets(
  targets: Int32Array,
  next: ArrayLike<number>,
): void {
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    if (target >= 0) targets[i] = next[target];
  }
}

/**
 * The output span of each source token: that of the rendered token it ended
 * up in, or, for a token the output dropped, an empty span where the output
 * of the next token that has one starts (the end of the output after the
 * last).
 */
export function outputSpans(
  targets: Int32Array,
  rendered: SpanTable,
  outputLength: number,
): SpanTable {
  const starts = new Uint32Array(targets.length);
  const ends = new Uint32Array(targets.length);
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
