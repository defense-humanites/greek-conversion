/**
 * Translates the TypeScript examples of the guide into Python, for the pages
 * of the Python package (`scripts/sync_python.ts`).
 *
 * The examples of the guide are written in a small part of TypeScript:
 * imports from the main entry point, constants, calls with literal options,
 * property and index access, and `.map()` over a list. This module reads
 * them with the TypeScript compiler and writes the same statements in
 * Python:
 *
 * - functions, option keys, and fields in snake_case (`convertDetailed` →
 *   `convert_detailed`, `longVowels` → `long_vowels`, `glyphVariant` →
 *   `glyph_variant`);
 * - the options of a call as keyword arguments, when they are written in
 *   the call; a constant of options as a dictionary;
 * - `.map((x) => e)` and `.filter((x) => c)` as list comprehensions,
 *   `.length` as `len()`, spread options as `**`;
 * - a field of the mappings that Python returns as dictionaries (options,
 *   metadata, the constants) as a subscript: `["long_vowels"]`;
 * - `true`, `false`, `null` as `True`, `False`, `None`;
 * - comments with `#`, and an expected result (`// → …`) as `# → …`, in
 *   Python's notation when it is not text.
 *
 * Anything else, such as another entry point, a function, or a `try`,
 * raises `Untranslatable`: such a block is given by hand
 * (`scripts/python_overrides.ts`).
 */

import ts from "typescript";

export class Untranslatable extends Error {}

/** `longVowels` → `long_vowels`. */
export const snake = (name: string) =>
  name.replace(
    /[a-z0-9][A-Z]/g,
    (pair) => `${pair[0]}_${pair[1].toLowerCase()}`,
  );

/** The functions of the main entry point that the Python package has. */
export const FUNCTIONS = new Set([
  "convert",
  "reencode",
  "convertDetailed",
  "convertGreekPassages",
  "convertGreekPassagesDetailed",
  "prepareOptions",
  "createConverter",
  "resolveConversionOptions",
  "getPresetOptions",
  "getPresetMetadata",
  "listPresetMetadata",
]);

/** The constants and classes of the main entry point, in Python too. */
const CONSTANTS = new Set([
  "DEFAULT_CONVERSION_OPTIONS",
  "CONVERSION_OPTION_VALUES",
  "FORMATS",
  "OptionError",
  "CharacterScopeError",
]);

/** The methods of a converter, whose last argument is options too. */
const METHODS = new Set(["convert", "convertDetailed"]);

/** What Python returns as dictionaries, or as a list of them. */
const DICTIONARIES = new Set([
  "DEFAULT_CONVERSION_OPTIONS",
  "CONVERSION_OPTION_VALUES",
  "getPresetMetadata",
  "getPresetOptions",
  "resolveConversionOptions",
]);
const LISTS_OF_DICTIONARIES = new Set(["listPresetMetadata"]);

type Kind = "dict" | "dicts" | "other";

/** The functions whose last argument is options, given as keywords. */
const TAKES_OPTIONS = new Set([
  "convert",
  "reencode",
  "convertDetailed",
  "convertGreekPassages",
  "convertGreekPassagesDetailed",
  "prepareOptions",
  "createConverter",
  "resolveConversionOptions",
]);

/** The columns of a code block of the site (`scripts/check_code_width.ts`). */
const WIDTH = 76;

interface Name {
  python: string;
  kind: Kind;
}

/** The Python of a TypeScript example. */
export function toPython(code: string): string {
  const source = ts.createSourceFile(
    "example.ts",
    code,
    ts.ScriptTarget.Latest,
    true,
  );
  const names = new Map<string, Name>();
  const out: string[] = [];
  let previousEnd = 0;

  const comments = (start: number) =>
    (ts.getLeadingCommentRanges(code, start) ?? []).map((range) =>
      code.slice(range.pos, range.end)
    );
  /** Blank lines between two positions, kept as one. */
  const gap = (from: number, to: number) => {
    const between = code.slice(from, to);
    if (/\n[ \t]*\n/.test(between.replace(/\/\/.*$/gm, ""))) out.push("");
  };

  for (const statement of source.statements) {
    const leading = ts.getLeadingCommentRanges(code, statement.pos) ?? [];
    let cursor = previousEnd;
    for (const range of leading) {
      gap(cursor, range.pos);
      out.push(comment(code.slice(range.pos, range.end)));
      cursor = range.end;
    }
    gap(cursor, statement.getStart());
    const line = emitStatement(statement, names);
    const trailing = (ts.getTrailingCommentRanges(code, statement.end) ?? [])
      .map((range) => code.slice(range.pos, range.end));
    if (line !== null) {
      const lines = line.split("\n");
      if (trailing.length > 0) {
        let note = comment(trailing[0]);
        // `FORMATS` is a tuple in Python.
        if (line === "FORMATS") note = note.replace(/→ \[(.*)\]$/, "→ ($1)");
        lines[lines.length - 1] += "  " + note;
      }
      out.push(...lines);
    }
    previousEnd = trailing.length > 0
      ? statement.end + code.slice(statement.end).indexOf(trailing.at(-1)!) +
        trailing.at(-1)!.length
      : statement.end;
  }
  let cursor = previousEnd;
  for (const text of comments(source.endOfFileToken.pos)) {
    const position = code.indexOf(text, cursor);
    gap(cursor, position);
    out.push(comment(text));
    cursor = position + text.length;
  }
  while (out[0] === "") out.shift();
  return out.join("\n");
}

/** A comment in Python; an expected result in Python's notation. */
function comment(text: string): string {
  if (text.startsWith("/*")) throw new Untranslatable("block comment");
  const body = text.replace(/^\/\/ ?/, "");
  const raises = body.match(/^throws (\w+)(.*)$/);
  if (raises !== null) {
    const name = raises[1] === "RangeError" ? "ValueError" : raises[1];
    return `# raises ${name}${raises[2]}`;
  }
  const arrow = body.match(/^→ (.*)$/);
  if (arrow === null) return `# ${body}`.trimEnd();
  return `# → ${expected(arrow[1])}`;
}

/** An expected result: text as it is, other values as Python writes them. */
function expected(text: string): string {
  if (!/^(\[|\{|true$|false$|null$|-?\d+(\.\d+)?$)/.test(text)) return text;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return text;
  }
  return pythonValue(value);
}

function pythonValue(value: unknown): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") return pythonString(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map(pythonValue).join(", ")}]`;
  return `{${
    Object.entries(value as Record<string, unknown>).map(([key, item]) =>
      `${pythonString(snake(key))}: ${pythonValue(item)}`
    ).join(", ")
  }}`;
}

/** A string as Python's `repr()` writes it, in single quotes if it can. */
function pythonString(text: string): string {
  const quote = text.includes("'") && !text.includes('"') ? '"' : "'";
  const escaped = text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n")
    .replace(new RegExp(quote, "g"), `\\${quote}`);
  return `${quote}${escaped}${quote}`;
}

function emitStatement(
  statement: ts.Statement,
  names: Map<string, Name>,
): string | null {
  if (ts.isImportDeclaration(statement)) {
    const module = (statement.moduleSpecifier as ts.StringLiteral).text;
    if (module !== "@humanities/greek-conversion") {
      throw new Untranslatable(`import from ${module}`);
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      throw new Untranslatable("import without named imports");
    }
    const imported = bindings.elements.filter((element) => !element.isTypeOnly)
      .map((element) => element.name.text);
    const python = (name: string) => CONSTANTS.has(name) ? name : snake(name);
    for (const name of imported) {
      if (!FUNCTIONS.has(name) && !CONSTANTS.has(name)) {
        throw new Untranslatable(`import of ${name}`);
      }
      names.set(name, {
        python: python(name),
        kind: DICTIONARIES.has(name) && CONSTANTS.has(name) ? "dict" : "other",
      });
    }
    if (imported.length === 0) return null;
    const line = `from greek_conversion import ${
      imported.map(python).join(", ")
    }`;
    if (line.length <= WIDTH) return line;
    return `from greek_conversion import (\n${
      imported.map((name) => `    ${python(name)},`).join("\n")
    }\n)`;
  }
  if (ts.isVariableStatement(statement)) {
    const [declaration, ...rest] = statement.declarationList.declarations;
    if (
      rest.length > 0 || !ts.isIdentifier(declaration.name) ||
      declaration.initializer === undefined
    ) {
      throw new Untranslatable("declaration");
    }
    const name = snake(declaration.name.text);
    names.set(declaration.name.text, {
      python: name,
      kind: kindOf(declaration.initializer, names),
    });
    return assign(name, declaration.initializer, names);
  }
  if (ts.isExpressionStatement(statement)) {
    return layout(statement.expression, names, 0);
  }
  throw new Untranslatable(ts.SyntaxKind[statement.kind]);
}

function assign(
  name: string,
  value: ts.Expression,
  names: Map<string, Name>,
): string {
  return `${name} = ${layout(value, names, name.length + 3)}`;
}

/**
 * An expression on one line if it fits, or else broken one argument, entry,
 * or item a line, and so on within them.
 */
function layout(
  node: ts.Expression,
  names: Map<string, Name>,
  indent: number,
  tail = 0,
): string {
  const line = expression(node, names);
  if (indent + line.length + tail <= WIDTH) return line;
  const inner = strip(node);
  // A field or an item of a result: the call broken, then its subscripts.
  if (
    ts.isElementAccessExpression(inner) || ts.isPropertyAccessExpression(inner)
  ) {
    const base = expression(inner.expression, names);
    if (line.startsWith(base) && line.length > base.length) {
      const suffix = line.slice(base.length);
      return layout(inner.expression, names, indent, tail + suffix.length) +
        suffix;
    }
  }
  const comprehension = ts.isCallExpression(inner) &&
    comprehensionParts(inner, names);
  if (comprehension) {
    const [body, clause, condition] = comprehension;
    return `[\n    ${body}\n    ${clause}${
      condition === undefined ? "" : `\n    if ${condition}`
    }\n]`;
  }
  const parts = pieces(inner, names);
  if (parts === undefined) return line;
  const body = parts.items.map(({ prefix, node: child, text }) => {
    const value = child === undefined
      ? text
      : layout(child, names, indent + 4 + prefix.length);
    return `${prefix}${value},`.split("\n").map((row) => `    ${row}`)
      .join("\n");
  });
  return `${parts.open}\n${body.join("\n")}\n${parts.close}`;
}

interface Piece {
  prefix: string;
  node?: ts.Expression;
  text?: string;
}

/** The brackets and the items of a call, an object, or a list. */
function pieces(
  node: ts.Expression,
  names: Map<string, Name>,
): { open: string; close: string; items: Piece[] } | undefined {
  if (ts.isObjectLiteralExpression(node)) {
    return {
      open: "{",
      close: "}",
      items: node.properties.map((property) => {
        if (ts.isSpreadAssignment(property)) {
          return {
            prefix: "",
            text: `**${expression(property.expression, names)}`,
          };
        }
        const [key, value] = keyNode(property);
        return { prefix: `${JSON.stringify(key)}: `, node: value };
      }),
    };
  }
  if (
    ts.isArrayLiteralExpression(node) && !node.elements.some(ts.isSpreadElement)
  ) {
    return {
      open: "[",
      close: "]",
      items: node.elements.map((item) => ({ prefix: "", node: item })),
    };
  }
  if (!ts.isCallExpression(node)) return undefined;
  const callee = node.expression;
  const name = ts.isIdentifier(callee)
    ? callee.text
    : ts.isPropertyAccessExpression(callee) && METHODS.has(callee.name.text)
    ? callee.name.text
    : undefined;
  if (name === undefined) return undefined;
  const args = [...node.arguments];
  const last = args.at(-1) && strip(args.at(-1)!);
  const items: Piece[] = [];
  let options: ts.ObjectLiteralExpression | undefined;
  if (
    (TAKES_OPTIONS.has(name) || METHODS.has(name)) && last &&
    ts.isObjectLiteralExpression(last)
  ) {
    args.pop();
    options = last;
  }
  items.push(...args.map((arg) => ({ prefix: "", node: arg })));
  for (const property of options?.properties ?? []) {
    if (ts.isSpreadAssignment(property)) {
      items.push({
        prefix: "",
        text: `**${expression(property.expression, names)}`,
      });
    } else {
      const [key, value] = keyNode(property);
      items.push({ prefix: `${key}=`, node: value });
    }
  }
  return { open: `${expression(callee, names)}(`, close: ")", items };
}

/** The key of a property, in snake_case, and its value. */
function keyNode(
  property: ts.ObjectLiteralElementLike,
): [string, ts.Expression] {
  if (!ts.isPropertyAssignment(property)) {
    throw new Untranslatable(ts.SyntaxKind[property.kind]);
  }
  const key = ts.isIdentifier(property.name)
    ? snake(property.name.text)
    : ts.isStringLiteral(property.name)
    ? property.name.text
    : undefined;
  if (key === undefined) throw new Untranslatable("computed key");
  return [key, property.initializer];
}

function strip(node: ts.Expression): ts.Expression {
  while (
    ts.isAsExpression(node) || ts.isSatisfiesExpression(node) ||
    ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node)
  ) node = node.expression;
  return node;
}

function callParts(
  node: ts.CallExpression,
  names: Map<string, Name>,
): { callee: string; args: string[] } {
  const callee = expression(node.expression, names);
  const name = ts.isIdentifier(node.expression)
    ? node.expression.text
    : ts.isPropertyAccessExpression(node.expression) &&
        METHODS.has(node.expression.name.text)
    ? node.expression.name.text
    : "";
  const args = [...node.arguments];
  const last = args.at(-1) && strip(args.at(-1)!);
  const takes = TAKES_OPTIONS.has(name) || METHODS.has(name);
  if (takes && last && ts.isObjectLiteralExpression(last)) {
    args.pop();
    return {
      callee,
      args: [
        ...args.map((arg) => expression(arg, names)),
        ...last.properties.map((property) => {
          if (ts.isSpreadAssignment(property)) {
            return `**${expression(property.expression, names)}`;
          }
          const [key, value] = keyValue(property, names);
          return `${key}=${value}`;
        }),
      ],
    };
  }
  return { callee, args: args.map((arg) => expression(arg, names)) };
}

function keyValue(
  property: ts.ObjectLiteralElementLike,
  names: Map<string, Name>,
): [string, string] {
  if (!ts.isPropertyAssignment(property)) {
    throw new Untranslatable(ts.SyntaxKind[property.kind]);
  }
  const key = ts.isIdentifier(property.name)
    ? snake(property.name.text)
    : ts.isStringLiteral(property.name)
    ? property.name.text
    : undefined;
  if (key === undefined) throw new Untranslatable("computed key");
  return [key, expression(property.initializer, names)];
}

function entries(
  node: ts.ObjectLiteralExpression,
  names: Map<string, Name>,
): string[] {
  return node.properties.map((property) => {
    if (ts.isSpreadAssignment(property)) {
      return `**${expression(property.expression, names)}`;
    }
    const [key, value] = keyValue(property, names);
    return `${JSON.stringify(key)}: ${value}`;
  });
}

function expression(node: ts.Expression, names: Map<string, Name>): string {
  node = strip(node);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return JSON.stringify(node.text);
  }
  if (ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return "True";
  if (node.kind === ts.SyntaxKind.FalseKeyword) return "False";
  if (node.kind === ts.SyntaxKind.NullKeyword) return "None";
  if (ts.isIdentifier(node)) {
    if (node.text === "undefined") return "None";
    const name = names.get(node.text);
    if (name === undefined) throw new Untranslatable(`name ${node.text}`);
    return name.python;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const object = expression(node.expression, names);
    if (node.name.text === "length") return `len(${object})`;
    if (kindOf(node.expression, names) === "dict") {
      return `${object}[${JSON.stringify(snake(node.name.text))}]`;
    }
    return `${object}.${snake(node.name.text)}`;
  }
  if (ts.isBinaryExpression(node)) {
    const operator = BINARY[node.operatorToken.kind];
    if (operator === undefined) {
      throw new Untranslatable(ts.SyntaxKind[node.operatorToken.kind]);
    }
    return `${expression(node.left, names)} ${operator} ${
      expression(node.right, names)
    }`;
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken
  ) {
    return `not ${expression(node.operand, names)}`;
  }
  if (ts.isElementAccessExpression(node)) {
    return `${expression(node.expression, names)}[${
      expression(node.argumentExpression, names)
    }]`;
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (ts.isPropertyAccessExpression(callee)) {
      const method = callee.name.text;
      const object = expression(callee.expression, names);
      const comprehension = comprehensionParts(node, names);
      if (comprehension) {
        const [body, clause, condition] = comprehension;
        return `[${body} ${clause}${
          condition === undefined ? "" : ` if ${condition}`
        }]`;
      }
      if (method === "join" && node.arguments.length === 1) {
        return `${expression(node.arguments[0], names)}.join(${object})`;
      }
      if (METHODS.has(method)) {
        const parts = callParts(node, names);
        return `${parts.callee}(${parts.args.join(", ")})`;
      }
      throw new Untranslatable(`method ${method}`);
    }
    const parts = callParts(node, names);
    return `${parts.callee}(${parts.args.join(", ")})`;
  }
  if (ts.isObjectLiteralExpression(node)) {
    return `{${entries(node, names).join(", ")}}`;
  }
  if (
    ts.isArrayLiteralExpression(node) && node.elements.length === 1 &&
    ts.isSpreadElement(node.elements[0])
  ) {
    // `[...new Set(items)]`: the distinct items, in order.
    const spread = strip(node.elements[0].expression);
    if (
      ts.isNewExpression(spread) && ts.isIdentifier(spread.expression) &&
      spread.expression.text === "Set" && spread.arguments?.length === 1
    ) {
      return `list(dict.fromkeys(${expression(spread.arguments[0], names)}))`;
    }
    return `[*${expression(spread, names)}]`;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return `[${
      node.elements.map((item) => expression(item, names)).join(", ")
    }]`;
  }
  throw new Untranslatable(ts.SyntaxKind[node.kind]);
}

const BINARY: Partial<Record<ts.SyntaxKind, string>> = {
  [ts.SyntaxKind.EqualsEqualsEqualsToken]: "==",
  [ts.SyntaxKind.ExclamationEqualsEqualsToken]: "!=",
  [ts.SyntaxKind.AmpersandAmpersandToken]: "and",
  [ts.SyntaxKind.BarBarToken]: "or",
  // The values of the examples are text or null, for which both agree.
  [ts.SyntaxKind.QuestionQuestionToken]: "or",
  [ts.SyntaxKind.LessThanToken]: "<",
  [ts.SyntaxKind.GreaterThanToken]: ">",
  [ts.SyntaxKind.PlusToken]: "+",
};

/** Whether Python gives `node` as a dictionary, a list of them, or else. */
function kindOf(node: ts.Expression, names: Map<string, Name>): Kind {
  node = strip(node);
  if (ts.isIdentifier(node)) return names.get(node.text)?.kind ?? "other";
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const name = node.expression.text;
    if (DICTIONARIES.has(name)) return "dict";
    if (LISTS_OF_DICTIONARIES.has(name)) return "dicts";
    return "other";
  }
  if (ts.isPropertyAccessExpression(node)) {
    return kindOf(node.expression, names) === "dict" ? "dict" : "other";
  }
  if (ts.isElementAccessExpression(node)) {
    const kind = kindOf(node.expression, names);
    return kind === "dicts" || kind === "dict" ? "dict" : "other";
  }
  if (ts.isObjectLiteralExpression(node)) return "dict";
  return "other";
}

/**
 * `.map((x) => e)` and `.filter((x) => c)` as the parts of a list
 * comprehension: its expression, its `for` clause, and its condition.
 */
function comprehensionParts(
  node: ts.CallExpression,
  names: Map<string, Name>,
): [string, string, string | undefined] | undefined {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee)) return undefined;
  const method = callee.name.text;
  const fn = node.arguments[0];
  if (
    (method !== "map" && method !== "filter") || node.arguments.length !== 1 ||
    !ts.isArrowFunction(fn) || fn.parameters.length !== 1 ||
    !ts.isIdentifier(fn.parameters[0].name) || ts.isBlock(fn.body)
  ) return undefined;
  const parameter = fn.parameters[0].name.text;
  const item = snake(parameter);
  const kind = kindOf(callee.expression, names) === "dicts" ? "dict" : "other";
  const inner = new Map(names).set(parameter, { python: item, kind });
  const body = expression(fn.body, inner);
  const clause = `for ${item} in ${expression(callee.expression, names)}`;
  return method === "map" ? [body, clause, undefined] : [item, clause, body];
}
