import { CONVERSION_OPTION_VALUES } from "../src/mod.ts";

type Group = "transliteration" | "greek" | "betaCode" | "text" | "diacritics";
const GROUPS: readonly Group[] = [
  "transliteration",
  "greek",
  "betaCode",
  "text",
  "diacritics",
];
type Frame = {
  path: string;
  phase: "key" | "colon" | "value" | "after";
  key: string;
};

const choices = CONVERSION_OPTION_VALUES;

export interface Suggestion {
  label: string;
  replacement: string;
  start: number;
  end: number;
  cursor: number;
}

/** Suggestions at the caret in a partial conversion-options JSON object. */
export function suggestOptions(value: string, caret: number): Suggestion[] {
  const frames: Frame[] = [];
  let quotedStart = -1;
  let escaped = false;
  let tokenStart = -1;

  for (let i = 0; i < caret; i++) {
    const character = value[i];
    if (quotedStart >= 0) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') {
        const frame = frames.at(-1);
        if (frame?.phase === "key") {
          frame.key = value.slice(quotedStart + 1, i);
          frame.phase = "colon";
        } else if (frame?.phase === "value") frame.phase = "after";
        quotedStart = -1;
      }
      continue;
    }
    const frame = frames.at(-1);
    if (character === '"') quotedStart = i;
    else if (character === "{") {
      const path = frame?.phase === "value" ? frame.key : "";
      if (frame) frame.phase = "after";
      frames.push({ path, phase: "key", key: "" });
    } else if (character === "}") frames.pop();
    else if (character === ":" && frame?.phase === "colon") {
      frame.phase = "value";
    } else if (
      character === "," && frame &&
      (frame.phase === "after" || tokenStart >= 0)
    ) {
      frame.phase = "key";
      frame.key = "";
      tokenStart = -1;
    } else if (frame?.phase === "value" && /[a-z]/i.test(character)) {
      if (tokenStart < 0) tokenStart = i;
    } else if (tokenStart >= 0 && /\s/.test(character)) {
      if (frame) frame.phase = "after";
      tokenStart = -1;
    }
  }

  const frame = frames.at(-1);
  if (
    !frame ||
    (frame.path !== "" && !(GROUPS as readonly string[]).includes(frame.path))
  ) return [];
  const isKey = frame.phase === "key";
  if (!isKey && frame.phase !== "value") return [];
  if (quotedStart >= 0 && value.slice(quotedStart + 1, caret).includes("\\")) {
    return [];
  }
  if (
    !isKey && quotedStart < 0 && tokenStart < 0 &&
    !/\s/.test(value[caret - 1] ?? " ") && value[caret - 1] !== ":"
  ) return [];

  const start = quotedStart >= 0
    ? quotedStart
    : tokenStart >= 0
    ? tokenStart
    : caret;
  const prefix = value.slice(start + (quotedStart >= 0 ? 1 : 0), caret);
  let end = caret;
  if (quotedStart >= 0) {
    while (
      end < value.length && !['"', "\n", "}", ",", "]"].includes(value[end])
    ) {
      end++;
    }
    if (value[end] === '"') end++;
  } else {
    while (end < value.length && /[\w-]/.test(value[end])) end++;
  }

  const names = isKey
    ? frame.path === "" ? GROUPS : Object.keys(choices[frame.path as Group])
    : frame.path === ""
    ? []
    : (choices[frame.path as Group] as Record<string, readonly string[]>)[
      frame.key
    ] ?? [];

  return names.filter((name) =>
    name.toLowerCase().startsWith(prefix.toLowerCase())
  ).slice(0, 8).map((name) => {
    const suffix = value.slice(end).trimStart();
    const alreadyHasColon = isKey && suffix.startsWith(":");
    const objectKey = isKey && frame.path === "";
    const closeRoot = isKey && frame.path === "" &&
      value.slice(0, start).trim() === "{" && !suffix;
    const completion = isKey
      ? `"${name}"${alreadyHasColon ? "" : objectKey ? ": {}" : ": "}`
      : frame.path !== ""
      ? `"${name}"`
      : name;
    const replacement = completion + (closeRoot ? "}" : "");
    const cursor = objectKey && !alreadyHasColon
      ? start + completion.length - 1
      : start + completion.length;
    return { label: name, replacement, start, end, cursor };
  });
}
