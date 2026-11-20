#!/usr/bin/env python3
"""Builds the fonts of the playground and the documentation site (web/shared/fonts)
from the files of google/fonts.

    pip install "fonttools[woff]==4.67.0"
    python3 scripts/build_fonts.py [--sources DIR] [--output DIR]

Without --sources, the source fonts are downloaded from google/fonts.
With it, DIR holds them under the names google/fonts gives them. Either way,
each file is checked against the SHA-256 the fonts were built from, so that a
newer release is a deliberate change: pass --any-version to accept one.

The output (web/shared/fonts by default) is reproducible: each font keeps the
modification date of its source, so the same sources and the same fontTools
give the same bytes. web/shared/fonts/README.md says what each step does and why.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent
from fontTools.varLib import instancer

GOOGLE_FONTS = "https://raw.githubusercontent.com/google/fonts/main/ofl"


@dataclass(frozen=True)
class Source:
    name: str
    folder: str
    sha256: str

    @property
    def url(self) -> str:
        quoted = (
            self.name.replace("[", "%5B").replace("]", "%5D").replace(",", "%2C")
        )
        return f"{GOOGLE_FONTS}/{self.folder}/{quoted}"


BRICOLAGE = Source(
    "BricolageGrotesque[opsz,wdth,wght].ttf",
    "bricolagegrotesque",
    "413e7357809ddd12fd80a96a8a396de0e401638d4acd3cb3e37532f0472ac682",
)
LITERATA = Source(
    "Literata[opsz,wght].ttf",
    "literata",
    "b41138c9373112f32abb589cc22e8674b06ed4048b0c513be922bdd26f274440",
)
NOTO_SERIF = Source(
    "NotoSerif[wdth,wght].ttf",
    "notoserif",
    "4d8e6761424656867019081a1a01336f3cb086982682698714054fc33f782713",
)
NOTO_SANS_MONO = Source(
    "NotoSansMono[wdth,wght].ttf",
    "notosansmono",
    "2cb2adb378a8f574213e23df697050b83c54c27df465a2015552740b2769a081",
)
FIRA_MONO = Source(
    "FiraMono-Regular.ttf",
    "firamono",
    "2e00b0cf3106a3d792f35711b7722740b76c02ee7300ea8c60f940584b7a8ac9",
)


def span(first: int, last: int) -> list[int]:
    return list(range(first, last + 1))


# Shared by the two subsets: the euro, the trade mark, the arrows the
# interface draws (← →), and the minus.
SYMBOLS = [0x20AC, 0x2122, 0x2190, 0x2192, 0x2212]

# Bricolage Grotesque: Basic Latin, Latin-1, Latin Extended-A, the acute and
# the macron, general punctuation.
BRICOLAGE_UNICODES = (
    span(0x0020, 0x007E)
    + span(0x00A0, 0x00FF)
    + span(0x0100, 0x017F)
    + [0x0301, 0x0304]
    + span(0x2000, 0x206F)
    + SYMBOLS
)

# Literata GC: Latin with Latin Extended-B and Extended Additional, spacing
# modifiers, combining diacritics, Greek and Coptic, Greek Extended, general
# punctuation.
LITERATA_UNICODES = (
    span(0x0020, 0x007E)
    + span(0x00A0, 0x024F)
    + span(0x02B0, 0x02FF)
    + span(0x0300, 0x036F)
    + span(0x0370, 0x03FF)
    + span(0x1E00, 0x1EFF)
    + span(0x1F00, 0x1FFF)
    + span(0x2000, 0x206F)
    + SYMBOLS
)

# The sixteen letters Literata lacks: the reversed and dotted lunate sigmas,
# and the symbol forms of Greek letters.
NOTO_UNICODES = (
    span(0x037B, 0x037D)
    + span(0x03D0, 0x03D6)
    + [0x03F0, 0x03F1, 0x03F5]
    + span(0x03FD, 0x03FF)
)

# The letter forms that Noto Sans Mono draws as the ordinary letters (ϐ as β,
# ϑ as θ, Ϲ as Σ...): the reversed and dotted lunate sigmas, the symbol forms,
# the lunate sigmas. Fira Mono, at the same advance, draws them apart.
MONO_SYMBOLS = (
    span(0x037B, 0x037D)
    + span(0x03D0, 0x03D6)
    + [0x03F0, 0x03F1, 0x03F2, 0x03F4, 0x03F5, 0x03F9]
    + span(0x03FD, 0x03FF)
)

# Noto Sans Mono: the code of the playground and the site, in all three
# formats, with the Latin of transliterations, every combining diacritic
# and Greek Extended, less the forms Fira Mono draws.
MONO_UNICODES = [
    codepoint
    for codepoint in (
        span(0x0020, 0x007E)
        + span(0x00A0, 0x024F)
        + span(0x02B0, 0x02FF)
        + span(0x0300, 0x036F)
        + span(0x0370, 0x03FF)
        + span(0x1E00, 0x1EFF)
        + span(0x1F00, 0x1FFF)
        + span(0x2000, 0x206F)
        + span(0x2190, 0x2199)
        + SYMBOLS
    )
    if codepoint not in MONO_SYMBOLS
]

# Modified, Literata takes another name, as a courtesy: the font declares no
# Reserved Font Name (OFL 1.1).
LITERATA_NAMES = {
    1: "Literata GC",
    2: "Regular",
    3: "3.103;TT;LiterataGC-Regular",
    4: "Literata GC Regular",
    6: "LiterataGC-Regular",
}

# The layout features the texts need: composition, local forms, marks,
# kerning and the standard ligatures. Fractions and the other numeral forms
# stay out, with the glyphs they would bring.
LAYOUT_FEATURES = ["ccmp", "locl", "mark", "mkmk", "kern", "liga"]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch(source: Source, folder: Path | None, cache: Path) -> Path:
    """The source file, from `folder` or downloaded into `cache`."""
    if folder is not None:
        path = folder / source.name
        if not path.is_file():
            raise SystemExit(f"missing: {path}")
        return path
    path = cache / source.name
    print(f"downloading {source.url}")
    with urllib.request.urlopen(source.url) as response:
        path.write_bytes(response.read())
    return path


def check(source: Source, path: Path, any_version: bool) -> None:
    digest = sha256(path)
    if digest == source.sha256:
        return
    message = (
        f"{path.name}: SHA-256 {digest}, not {source.sha256}, the version "
        "the fonts were built from"
    )
    if not any_version:
        raise SystemExit(f"{message}. Pass --any-version to build anyway.")
    print(f"warning: {message}", file=sys.stderr)


def reloaded(font: TTFont) -> TTFont:
    """
    The font saved and read again: the instancer and added glyphs leave
    tables and glyph maps that the subsetter cannot read as they are.
    """
    buffer = io.BytesIO()
    font.save(buffer)
    buffer.seek(0)
    return TTFont(buffer)


def instance(path: Path, location: dict) -> tuple[TTFont, int]:
    """The font instantiated at `location`, and its source's date."""
    font = TTFont(path)
    modified = font["head"].modified
    return reloaded(instancer.instantiateVariableFont(font, location)), modified


def subset_font(
    font: TTFont,
    unicodes: list[int],
    notdef_outline: bool = True,
) -> None:
    """Keeps the code points given and the glyphs their features reach."""
    options = subset.Options()
    options.layout_features = LAYOUT_FEATURES
    # Every name, the licence and the designers' included, and the outline
    # of .notdef, which shows a missing glyph.
    options.name_IDs = ["*"]
    options.notdef_outline = notdef_outline
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)


def save_woff2(font: TTFont, path: Path, modified: int) -> None:
    """Saves the font as WOFF2, dated as its source, for the same bytes."""
    font["head"].modified = modified
    font.recalcTimestamp = False
    font.flavor = "woff2"
    font.save(path)
    print(
        f"{path}: {len(font.getBestCmap())} characters, "
        f"{path.stat().st_size} bytes"
    )


def bricolage(path: Path, output: Path) -> None:
    """Width fixed at 100, weight limited to 400–800, optical size kept."""
    font, modified = instance(path, {"wdth": 100, "wght": (400, 800)})
    subset_font(font, BRICOLAGE_UNICODES)
    save_woff2(font, output / "bricolage-grotesque.woff2", modified)


def mark_offset(font: TTFont, base: str, mark: str) -> int:
    """
    The horizontal offset that puts `mark` on `base` as the font's own
    mark-to-base attachment does: the base's anchor minus the mark's, for
    the first anchor class that both glyphs have.
    """
    for lookup in font["GPOS"].table.LookupList.Lookup:
        for table in lookup.SubTable:
            if lookup.LookupType == 9:  # extension
                table = table.ExtSubTable
            if getattr(table, "LookupType", lookup.LookupType) != 4:
                continue
            marks = table.MarkCoverage.glyphs
            bases = table.BaseCoverage.glyphs
            if mark not in marks or base not in bases:
                continue
            record = table.MarkArray.MarkRecord[marks.index(mark)]
            anchors = table.BaseArray.BaseRecord[bases.index(base)].BaseAnchor
            anchor = anchors[record.Class]
            if anchor is not None:
                return anchor.XCoordinate - record.MarkAnchor.XCoordinate
    raise LookupError(f"no anchor puts {mark} on {base}")


def add_composite(
    font: TTFont,
    codepoint: int,
    parts: list[tuple[str, int]],
) -> None:
    """Adds a glyph made of others, as wide as the first, for `codepoint`."""
    name = f"uni{codepoint:04X}"
    glyph = Glyph()
    glyph.numberOfContours = -1
    glyph.components = []
    for part, x in parts:
        component = GlyphComponent()
        component.glyphName = part
        component.x, component.y = x, 0
        component.flags = 0x4  # ROUND_XY_TO_GRID, as font compilers set it
        glyph.components.append(component)
    font["glyf"][name] = glyph
    font["hmtx"][name] = font["hmtx"][parts[0][0]]
    if "vmtx" in font:
        font["vmtx"][name] = font["vmtx"][parts[0][0]]
    glyph.recalcBounds(font["glyf"])
    order = font.getGlyphOrder()
    if name not in order:
        font.setGlyphOrder(order + [name])
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[codepoint] = name


def literata(path: Path, output: Path) -> None:
    """
    A static Regular at optical size 24, with the four letters it lacks made
    of its own glyphs, renamed Literata GC because it is modified.
    """
    font, modified = instance(path, {"opsz": 24, "wght": 400})
    cmap = font.getBestCmap()
    k, capital_k, dot = cmap[ord("k")], cmap[ord("K")], cmap[0x0323]
    # The lunate sigma: the Latin c and C.
    add_composite(font, 0x03F2, [(cmap[ord("c")], 0)])
    add_composite(font, 0x03F9, [(cmap[ord("C")], 0)])
    # The archaic koppa of ALA-LC: k and K with the dot below, where the
    # font's anchors put it.
    add_composite(font, 0x1E33, [(k, 0), (dot, mark_offset(font, k, dot))])
    add_composite(
        font,
        0x1E32,
        [(capital_k, 0), (dot, mark_offset(font, capital_k, dot))],
    )
    font = reloaded(font)
    subset_font(font, LITERATA_UNICODES)
    names = font["name"]
    for record in list(names.names):
        if record.nameID in LITERATA_NAMES:
            names.setName(
                LITERATA_NAMES[record.nameID],
                record.nameID,
                record.platformID,
                record.platEncID,
                record.langID,
            )
    save_woff2(font, output / "literata-gc.woff2", modified)


def noto(path: Path, output: Path) -> None:
    """The sixteen letters, from a static Regular at width 100."""
    font, modified = instance(path, {"wght": 400, "wdth": 100})
    # Literata's .notdef shows a missing glyph: the fallback needs none.
    subset_font(font, NOTO_UNICODES, notdef_outline=False)
    save_woff2(font, output / "noto-serif-greek-symbols.woff2", modified)


def noto_sans_mono(path: Path, output: Path) -> None:
    """Width fixed at 100, weight limited to 400–700 for bold code."""
    font, modified = instance(path, {"wdth": 100, "wght": (400, 700)})
    subset_font(font, MONO_UNICODES)
    save_woff2(font, output / "noto-sans-mono.woff2", modified)


def fira_mono(path: Path, output: Path) -> None:
    """The letter forms Noto Sans Mono does not tell apart."""
    font = TTFont(path)
    modified = font["head"].modified
    # Noto Sans Mono's .notdef shows a missing glyph: the fallback needs none.
    subset_font(font, MONO_SYMBOLS, notdef_outline=False)
    save_woff2(font, output / "fira-mono-greek-symbols.woff2", modified)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Builds the shared fonts from google/fonts.",
    )
    parser.add_argument(
        "--sources",
        type=Path,
        help="folder holding the variable fonts (default: download them)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "web" / "shared" / "fonts",
        help="folder to write the fonts to (default: web/shared/fonts)",
    )
    parser.add_argument(
        "--any-version",
        action="store_true",
        help="build from sources whose SHA-256 differs from the pinned one",
    )
    arguments = parser.parse_args()
    arguments.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as cache:
        paths = {}
        for source in (BRICOLAGE, LITERATA, NOTO_SERIF, NOTO_SANS_MONO, FIRA_MONO):
            path = fetch(source, arguments.sources, Path(cache))
            check(source, path, arguments.any_version)
            paths[source.name] = path
        bricolage(paths[BRICOLAGE.name], arguments.output)
        literata(paths[LITERATA.name], arguments.output)
        noto(paths[NOTO_SERIF.name], arguments.output)
        noto_sans_mono(paths[NOTO_SANS_MONO.name], arguments.output)
        fira_mono(paths[FIRA_MONO.name], arguments.output)


if __name__ == "__main__":
    main()
