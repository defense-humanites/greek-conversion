import { ALPHABET } from "../src/alphabet.ts";
import type { Suggestion } from "./options_suggestions.ts";

type Frame = {
  kind: "object" | "array";
  path: string;
  phase: "key" | "colon" | "value" | "after";
  key: string;
};

const formats = ["greek", "beta-code", "transliteration"];
const fields: Record<string, readonly string[]> = {
  "": ["aliases", "characters", "repertoire", "exclude"],
  "aliases[]": ["letter", "format", "spellings", "uppercase", "override"],
  "characters[]": ["id", "forms", "override"],
  "characters[].forms": formats,
  "characters[].forms.greek": ["lowercase", "uppercase"],
  "characters[].forms.beta-code": ["lowercase", "uppercase"],
  "characters[].forms.transliteration": ["lowercase", "uppercase"],
};

function childPath(frame: Frame | undefined): string {
  if (!frame) return "";
  if (frame.kind === "array") return `${frame.path}[]`;
  return frame.path ? `${frame.path}.${frame.key}` : frame.key;
}

/** Suggestions for the nested, partially written converter inventory JSON. */
export function suggestInventory(value: string, caret: number): Suggestion[] {
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
    else if (character === "{" || character === "[") {
      const path = childPath(frame);
      if (frame) frame.phase = "after";
      frames.push({
        kind: character === "{" ? "object" : "array",
        path,
        phase: character === "{" ? "key" : "value",
        key: "",
      });
      tokenStart = -1;
    } else if (character === "}" || character === "]") frames.pop();
    else if (character === ":" && frame?.phase === "colon") {
      frame.phase = "value";
    } else if (
      character === "," && frame &&
      (frame.phase === "after" || tokenStart >= 0)
    ) {
      frame.phase = frame.kind === "object" ? "key" : "value";
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
  if (!frame || (frame.kind === "object" && !fields[frame.path])) return [];
  const isKey = frame.kind === "object" && frame.phase === "key";
  if (!isKey && frame.phase !== "value") return [];
  if (quotedStart >= 0 && value.slice(quotedStart + 1, caret).includes("\\")) {
    return [];
  }
  if (
    !isKey && quotedStart < 0 && tokenStart < 0 &&
    !/\s/.test(value[caret - 1] ?? " ") &&
    value[caret - 1] !== ":" && value[caret - 1] !== "[" &&
    value[caret - 1] !== ","
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
    ) end++;
    if (value[end] === '"') end++;
  } else {
    while (end < value.length && /[\w-]/.test(value[end])) end++;
  }

  const path = frame.kind === "array" ? `${frame.path}[]` : frame.path;
  if (
    frame.kind === "array" &&
    (path === "aliases[]" || path === "characters[]")
  ) {
    if (prefix) return [];
    return [{
      label: path === "aliases[]" ? "New alias" : "New character",
      replacement: "{}",
      start,
      end,
      cursor: start + 1,
    }];
  }
  const customIds = [...value.matchAll(/"id"\s*:\s*"([^"\\]+)"/g)].map(
    (match) => match[1],
  );
  const names = isKey
    ? fields[path]
    : path === "aliases[]" && frame.key === "letter"
    ? Object.keys(ALPHABET)
    : path === "repertoire[]" || path === "exclude[]"
    ? [...Object.keys(ALPHABET), ...customIds]
    : path === "aliases[]" && frame.key === "format"
    ? formats
    : path === "aliases[]" &&
          (frame.key === "uppercase" || frame.key === "override") ||
        path === "characters[]" && frame.key === "override"
    ? ["false", "true"]
    : [];

  return [...new Set(names)].filter((name) =>
    name.toLowerCase().startsWith(prefix.toLowerCase())
  ).slice(0, 8).map((name) => {
    const suffix = value.slice(end).trimStart();
    const alreadyHasColon = isKey && suffix.startsWith(":");
    const propertyPath = frame.path ? `${frame.path}.${name}` : name;
    const opensArray = isKey && [
      "aliases",
      "characters",
      "repertoire",
      "exclude",
      "aliases[].spellings",
    ].includes(propertyPath);
    const opensObject = isKey && (
      propertyPath === "characters[].forms" ||
      frame.path === "characters[].forms"
    );
    const closeRoot = isKey && frame.path === "" &&
      value.slice(0, start).trim() === "{" && !suffix;
    const completion = isKey
      ? `"${name}"${
        alreadyHasColon ? "" : opensArray ? ": []" : opensObject ? ": {}" : ": "
      }`
      : name === "true" || name === "false"
      ? name
      : `"${name}"`;
    const replacement = completion + (closeRoot ? "}" : "");
    const cursor = isKey && !alreadyHasColon && (opensArray || opensObject)
      ? start + completion.length - 1
      : start + completion.length;
    return { label: name, replacement, start, end, cursor };
  });
}
