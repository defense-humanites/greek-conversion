"""Measure the Python package on each engine installed.

Run from the repository's root, with the package installed:

    python python/scripts/bench.py             # every engine installed
    python python/scripts/bench.py quickjs     # one engine

It measures what the Python documentation's page on performance gives
(web/docs/src/content/docs/python/guide/performance.md), on the input of
`npm run bench`, Thucydides 1.1-10 (bench/thucydides.ts): the time to start
an engine, conversions of the whole text, one word a call, and the words of
the text converted one by one and in one call. Each figure is the median of
several runs, after a warm-up; another machine gives other times, but the
ratios between rows and between engines hold better.
"""

from __future__ import annotations

import statistics
import subprocess
import sys
import time
from collections.abc import Callable
from importlib.util import find_spec
from pathlib import Path

import greek_conversion as gc

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (ROOT / "bench" / "thucydides.ts").read_text(encoding="utf-8")
GREEK = SOURCE[SOURCE.index("`") + 1 : SOURCE.rindex("`")]
WORD = "Ἕλλησιν"


def median(run: Callable[[], object], repeat: int, number: int) -> float:
    """The median time of one call, in seconds."""
    for _ in range(number):
        run()
    times = []
    for _ in range(repeat):
        start = time.perf_counter()
        for _ in range(number):
            run()
        times.append((time.perf_counter() - start) / number)
    return statistics.median(times)


def show(label: str, seconds: float) -> None:
    if seconds >= 1e-3:
        value = f"{seconds * 1e3:.1f} ms"
    else:
        value = f"{seconds * 1e6:.0f} µs"
    print(f"  {label:<52} {value:>10}")


def startup(engine: str) -> float:
    """Loading the package and a first conversion, in a new process."""
    code = (
        "import greek_conversion as g;"
        f"g.set_engine({engine!r});"
        "g.convert('α', 'greek', 'beta-code')"
    )

    def run(script: str) -> float:
        start = time.perf_counter()
        subprocess.run([sys.executable, "-c", script], check=True)
        return time.perf_counter() - start

    base = statistics.median(run("pass") for _ in range(5))
    return statistics.median(run(code) for _ in range(5)) - base


def measure(engine: str) -> None:
    gc.set_engine(engine)
    beta = gc.convert(GREEK, "greek", "beta-code")
    latin = gc.convert(GREEK, "greek", "transliteration")
    words = GREEK.split()
    scheme = gc.prepare_options(transliteration={"chi": "kh"})
    converter = gc.create_converter()

    print(f"{engine}, {len(GREEK):,} characters, {len(words):,} words")
    show("start: import and a first conversion", startup(engine))

    print(" the whole text")
    rows: list[tuple[str, Callable[[], object]]] = [
        ("greek → beta-code", lambda: gc.convert(GREEK, "greek", "beta-code")),
        ("beta-code → greek", lambda: gc.convert(beta, "beta-code", "greek")),
        ("greek → greek, reencode()", lambda: gc.reencode(GREEK, "greek")),
        (
            "greek → transliteration",
            lambda: gc.convert(GREEK, "greek", "transliteration"),
        ),
        (
            "transliteration → greek",
            lambda: gc.convert(latin, "transliteration", "greek"),
        ),
        (
            "greek → transliteration, iso-843-type-2",
            lambda: gc.convert(
                GREEK, "greek", "transliteration", preset="iso-843-type-2"
            ),
        ),
        (
            "greek → transliteration, convert_detailed()",
            lambda: gc.convert_detailed(GREEK, "greek", "transliteration"),
        ),
    ]
    for label, run in rows:
        show(label, median(run, 15, 3))

    print(" one word a call")
    rows = [
        ("convert() into beta-code", lambda: gc.convert(WORD, "greek", "beta-code")),
        (
            "convert() into transliteration",
            lambda: gc.convert(WORD, "greek", "transliteration"),
        ),
        (
            "convert() into transliteration, other options",
            lambda: gc.convert(
                WORD, "greek", "transliteration", transliteration={"chi": "kh"}
            ),
        ),
        (
            "convert() into transliteration, prepared options",
            lambda: gc.convert(WORD, "greek", "transliteration", scheme),
        ),
        (
            "convert_detailed() into transliteration",
            lambda: gc.convert_detailed(WORD, "greek", "transliteration"),
        ),
        (
            "convert() of a converter",
            lambda: converter.convert(WORD, "greek", "transliteration"),
        ),
    ]
    for label, run in rows:
        show(label, median(run, 15, 200))

    print(" the words of the text, greek → transliteration")
    rows = [
        (
            "one convert() a word, for the whole list",
            lambda: [gc.convert(w, "greek", "transliteration") for w in words],
        ),
        (
            "convert_many(), for the whole list",
            lambda: gc.convert_many(words, "greek", "transliteration"),
        ),
        (
            "convert_detailed_many(), for the whole list",
            lambda: gc.convert_detailed_many(words, "greek", "transliteration"),
        ),
    ]
    for label, run in rows:
        show(label, median(run, 7, 1))
    print()


#: The module that each engine needs.
MODULES = {"quickjs": "quickjs", "v8": "py_mini_racer"}


def main() -> None:
    available = [engine for engine, module in MODULES.items() if find_spec(module)]
    for engine in sys.argv[1:] or available:
        measure(engine)


if __name__ == "__main__":
    main()
