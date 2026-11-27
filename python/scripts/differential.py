"""Compares the Python package with the library run in Node.

    node python/scripts/differential_dump.ts > /tmp/expected.jsonl
    python python/scripts/differential.py /tmp/expected.jsonl [--engine v8|quickjs]

Every case of the dump is run again through the package: ``convert()`` and
``convert_detailed()``, ``reencode()``, prepared options, Greek passages,
and converters. The outputs, the losses, the spans, the diagnostics, and the
errors must be the same. Positions are converted here, from the UTF-16 code
units of Node to code points, independently of the bridge. The options of
the dump are given in snake_case, as a Python user writes them, and the
messages of Node's errors are compared with their option keys in snake_case.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Callable
from typing import Any

import greek_conversion as gc
from greek_conversion._keys import from_js, text


def code_points(string: str) -> Callable[[int], int]:
    """A function from UTF-16 offsets in ``string`` to code point offsets."""
    table = []
    for index, char in enumerate(string):
        table.append(index)
        if ord(char) > 0xFFFF:
            table.append(index)
    table.append(len(string))
    return lambda offset: table[offset]


def located(items: list[dict[str, Any]], at: Callable[[int], int], fields: tuple[str, ...]):
    return [
        (
            *(item.get(field) for field in fields),
            at(item["offset"]),
            at(item["offset"] + item["length"]) - at(item["offset"]),
        )
        for item in items
    ]


LOSS = ("code", "index", "message", "diacritic", "glyphVariant")
DIAGNOSTIC = ("code", "index", "character", "message")


def expected_detailed(input_: str, value: dict[str, Any]) -> dict[str, Any]:
    at, out = code_points(input_), code_points(value["output"])
    expected = {
        "output": value["output"],
        "lossy": value["lossy"],
        "losses": located(value["losses"], at, LOSS),
        "spans": [
            (at(s["inputStart"]), at(s["inputEnd"]), out(s["outputStart"]), out(s["outputEnd"]))
            for s in value["spans"]
        ],
    }
    if "diagnostics" in value:
        expected["diagnostics"] = located(value["diagnostics"], at, DIAGNOSTIC)
    return expected


def actual_detailed(result: Any) -> dict[str, Any]:
    actual = {
        "output": result.output,
        "lossy": result.lossy,
        "losses": [
            (l.code, l.index, l.message, l.diacritic, l.glyph_variant, l.offset, l.length)
            for l in result.losses
        ],
        "spans": [
            (s.input_start, s.input_end, s.output_start, s.output_end) for s in result.spans
        ],
    }
    if isinstance(result, gc.ConverterConversionResult):
        actual["diagnostics"] = diagnostics(result.diagnostics)
    return actual


def diagnostics(items: Any) -> list[tuple[Any, ...]]:
    return [(d.code, d.index, d.character, d.message, d.offset, d.length) for d in items]


def expected_error(input_: str, error: dict[str, Any]) -> dict[str, Any]:
    expected: dict[str, Any] = {"error": text(error["message"])}
    if "diagnostics" in error:
        expected["diagnostics"] = located(error["diagnostics"], code_points(input_), DIAGNOSTIC)
    return expected


def expected_of(input_: str, value: dict[str, Any], detailed: bool) -> dict[str, Any]:
    if "error" in value:
        return expected_error(input_, value["error"])
    return {"ok": expected_detailed(input_, value["ok"]) if detailed else value["ok"]}


def attempt(run: Callable[[], Any], transform: Callable[[Any], Any] = lambda v: v):
    try:
        return {"ok": transform(run())}
    except gc.CharacterScopeError as error:
        return {"error": str(error), "diagnostics": diagnostics(error.diagnostics)}
    except (ValueError, TypeError) as error:
        return {"error": str(error)}


def checks(case: dict[str, Any]):
    """The comparisons of one case: (name, expected, actual)."""
    op, input_ = case["op"], case["input"]
    options = from_js(case.get("options"))
    if op == "convert":
        source, target = case["from"], case["to"]
        yield (
            "convert",
            expected_of(input_, case["convert"], False),
            attempt(lambda: gc.convert(input_, source, target, options)),
        )
        yield (
            "detailed",
            expected_of(input_, case["detailed"], True),
            attempt(
                lambda: gc.convert_detailed(input_, source, target, options), actual_detailed
            ),
        )
    elif op == "reencode":
        yield (
            "reencode",
            expected_of(input_, case["result"], False),
            attempt(lambda: gc.reencode(input_, case["format"], options)),
        )
    elif op == "prepared":
        yield (
            "prepared",
            expected_of(input_, case["result"], False),
            attempt(
                lambda: gc.convert(
                    input_, case["from"], case["to"], gc.prepare_options(options)
                )
            ),
        )
    elif op == "passages":
        yield (
            "passages",
            expected_of(input_, case["result"], False),
            attempt(lambda: gc.convert_greek_passages(input_, case["to"])),
        )
        yield (
            "passages detailed",
            expected_of(input_, case["detailed"], True),
            attempt(
                lambda: gc.convert_greek_passages_detailed(input_, case["to"]),
                actual_detailed,
            ),
        )
    elif op == "converter":
        configuration = from_js(case["configuration"])
        yield (
            "converter",
            expected_of(input_, case["detailed"], True),
            attempt(
                lambda: gc.create_converter(configuration).convert_detailed(
                    input_, case["from"], case["to"]
                ),
                actual_detailed,
            ),
        )
    else:
        raise ValueError(f"Unknown operation in the dump: {op}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("dump")
    parser.add_argument("--engine", choices=gc._engine.ENGINES)
    parser.add_argument("--every", type=int, default=1, help="compare one case in N")
    args = parser.parse_args()
    if args.engine:
        gc.set_engine(args.engine)

    compared = differences = 0
    start = time.perf_counter()
    with open(args.dump, encoding="utf-8") as dump:
        for number, line in enumerate(dump):
            if number % args.every:
                continue
            case = json.loads(line)
            for name, want, got in checks(case):
                compared += 1
                if want != got:
                    differences += 1
                    if differences <= 10:
                        print(
                            f"DIFFERENCE {name} [{case.get('set', '')}]\n"
                            f"  input:    {case['input'][:120]!r}\n"
                            f"  node:     {json.dumps(want, ensure_ascii=False)[:400]}\n"
                            f"  python:   {json.dumps(got, ensure_ascii=False)[:400]}"
                        )
    elapsed = time.perf_counter() - start
    print(
        f"{gc.engine_name()}: {compared} comparisons, {differences} differences, "
        f"{elapsed:.1f} s"
    )
    return 1 if differences else 0


if __name__ == "__main__":
    sys.exit(main())
