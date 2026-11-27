"""Runs the Python examples of the documentation site, and compares their
results with the documented ones.

    node web/docs/scripts/sync_python.ts       # writes the generated pages
    python python/scripts/check_docs.py

Every ```python block of the Python pages (`web/docs/src/content/docs/python/`),
but those of the API reference, whose examples are the docstrings' doctests,
runs as a module of its own, statement by statement, through the package
installed. An expected result is a comment that starts with an arrow, after
a one-line statement or on the lines that follow a statement:

    convert("a)/nqrwpos", "beta-code", "greek")  # → ἄνθρωπος

    convert(text, "greek", "transliteration",
            diacritics={"all": "remove"})
    # → Hellēsin egeneto …

Text is compared code point for code point; other results are read as a
Python literal and compared by value, or else compared with their repr. `# raises OptionError: message`
expects an exception instead.
"""

from __future__ import annotations

import ast
import re
import sys
import textwrap
import unicodedata
from pathlib import Path

PAGES = Path(__file__).resolve().parents[2] / "web/docs/src/content/docs/python"
# At the margin, or indented in a list item.
BLOCK = re.compile(r"^( *)```python\n(.*?)^\1```$", re.MULTILINE | re.DOTALL)
ARROW = re.compile(r"#\s*→ (.*)$")
RAISES = re.compile(r"#\s*raises (\w+)(?:: (.*))?$")


def expectation(lines: list[str], node: ast.stmt) -> str | None:
    """The comment that gives the result of `node`, if any."""
    last = lines[node.end_lineno - 1]
    tail = last[node.end_col_offset :]
    for pattern in (ARROW, RAISES):
        if pattern.search(tail):
            return tail.strip()
    following = node.end_lineno
    if following < len(lines):
        text = lines[following].strip()
        if ARROW.match(text) or RAISES.match(text):
            return text
    return None


def visible(text: str) -> str:
    return "".join(
        char if char.isprintable() and not unicodedata.combining(char)
        else f"<U+{ord(char):04X}>"
        for char in text
    )


def check_block(code: str, where: str) -> list[str]:
    failures = []
    lines = code.split("\n")
    tree = ast.parse(code)
    namespace: dict[str, object] = {"__name__": "__docs__"}
    for node in tree.body:
        comment = expectation(lines, node)
        line = f"{where}:{node.lineno}"
        raises = RAISES.search(comment) if comment else None
        try:
            if isinstance(node, ast.Expr) and comment and not raises:
                value = eval(
                    compile(ast.Expression(node.value), where, "eval"), namespace
                )
            else:
                # The examples of the documentation, which this script runs.
                exec(compile(ast.Module([node], []), where, "exec"), namespace)  # noqa: S102
                value = None
        except Exception as error:  # noqa: BLE001
            if raises and type(error).__name__ == raises.group(1) and (
                raises.group(2) is None or str(error) == raises.group(2)
            ):
                continue
            failures.append(f"{line}: {type(error).__name__}: {error}")
            continue
        if raises:
            failures.append(f"{line}: expected {raises.group(1)}, raised nothing")
            continue
        if not comment or not isinstance(node, ast.Expr):
            continue
        expected = ARROW.search(comment).group(1)
        if isinstance(value, str):
            ok = value == expected
        else:
            try:
                literal = ast.literal_eval(expected)
            except (ValueError, SyntaxError):
                literal = object()
            # A tuple and a list of the same items read the same.
            if isinstance(value, tuple) and isinstance(literal, list):
                value = list(value)
            # A dataclass reads as Python prints it.
            ok = value == literal or repr(value) == expected
        if not ok:
            failures.append(
                f"{line}: expected {visible(expected)!s}, got {visible(repr(value))}"
            )
    return failures


def main() -> int:
    # The API reference holds signatures, and the docstrings' examples,
    # which the package's doctests run.
    pages = [
        page
        for page in sorted(PAGES.rglob("*.md")) + sorted(PAGES.rglob("*.mdx"))
        if page.relative_to(PAGES).as_posix() != "reference/api.md"
    ]
    if not pages:
        print(f"No pages in {PAGES}: run node web/docs/scripts/sync_python.ts")
        return 1
    failures: list[str] = []
    blocks = 0
    for page in pages:
        text = page.read_text(encoding="utf-8")
        for match in BLOCK.finditer(text):
            start = text[: match.start()].count("\n") + 2
            blocks += 1
            failures += [
                failure.replace(":", f":{start - 1}+", 1)
                for failure in check_block(
                    textwrap.dedent(match.group(2)),
                    str(page.relative_to(PAGES.parents[3])),
                )
            ]
    for failure in failures:
        print(failure)
    print(f"{blocks} Python examples in {len(pages)} pages: {len(failures)} failures.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
