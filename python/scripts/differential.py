"""Compares the Python package with the library run in Node.

    node python/scripts/differential_dump.ts > /tmp/expected.jsonl
    python python/scripts/differential.py /tmp/expected.jsonl [--engine v8|quickjs]

Every case of the dump is converted again through the package, with
``convert()`` and ``convert_detailed()``: the outputs, the losses, the spans,
and the errors must be the same. Positions are converted here, from the
UTF-16 code units of Node to code points, independently of the bridge.
"""

from __future__ import annotations

import argparse
import json
import sys
import time

import greek_conversion as gc


def code_points(text: str):
    """A function from UTF-16 offsets in ``text`` to code point offsets."""
    table = []
    for index, char in enumerate(text):
        table.append(index)
        if ord(char) > 0xFFFF:
            table.append(index)
    table.append(len(text))
    return lambda offset: table[offset]


def expected_detailed(input: str, value: dict) -> dict:
    inp, out = code_points(input), code_points(value["output"])
    return {
        "output": value["output"],
        "lossy": value["lossy"],
        "losses": [
            {
                "code": loss["code"],
                "index": loss["index"],
                "offset": inp(loss["offset"]),
                "length": inp(loss["offset"] + loss["length"]) - inp(loss["offset"]),
                "message": loss["message"],
                "diacritic": loss.get("diacritic"),
                "glyph_variant": loss.get("glyphVariant"),
            }
            for loss in value["losses"]
        ],
        "spans": [
            (
                inp(span["inputStart"]),
                inp(span["inputEnd"]),
                out(span["outputStart"]),
                out(span["outputEnd"]),
            )
            for span in value["spans"]
        ],
    }


def actual_detailed(result: gc.ConversionResult) -> dict:
    return {
        "output": result.output,
        "lossy": result.lossy,
        "losses": [
            {
                "code": loss.code,
                "index": loss.index,
                "offset": loss.offset,
                "length": loss.length,
                "message": loss.message,
                "diacritic": loss.diacritic,
                "glyph_variant": loss.glyph_variant,
            }
            for loss in result.losses
        ],
        "spans": [
            (s.input_start, s.input_end, s.output_start, s.output_end)
            for s in result.spans
        ],
    }


def attempt(run, transform=lambda value: value):
    try:
        return {"ok": transform(run())}
    except (gc.OptionError, gc.CharacterScopeError, ValueError, TypeError) as error:
        return {"error": str(error)}


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
            source, target, options, text = (
                case["from"], case["to"], case["options"], case["input"],
            )

            expected = case["convert"]
            if "error" in expected:
                expected = {"error": expected["error"]["message"]}
            actual = attempt(lambda: gc.convert(text, source, target, options))

            expected_d = case["detailed"]
            expected_d = (
                {"error": expected_d["error"]["message"]}
                if "error" in expected_d
                else {"ok": expected_detailed(text, expected_d["ok"])}
            )
            actual_d = attempt(
                lambda: gc.convert_detailed(text, source, target, options),
                actual_detailed,
            )

            compared += 2
            for kind, want, got in (
                ("convert", expected, actual),
                ("detailed", expected_d, actual_d),
            ):
                if want != got:
                    differences += 1
                    if differences <= 10:
                        print(
                            f"DIFFERENCE {kind} {source} → {target} [{case['set']}]\n"
                            f"  input:    {text[:120]!r}\n"
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
