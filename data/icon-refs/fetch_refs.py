# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "pypdf>=4"]
# ///
"""Download Wikimedia Commons references and convert to Exchange icon masks."""

from __future__ import annotations

import json
import subprocess
import urllib.parse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REF = Path(__file__).resolve().parent
OUT = ROOT / "web/public/brand/plates"
SCRIPT = ROOT / ".claude/skills/observatory-imprint/scripts/photo-to-icon.py"

# Domain id → Commons filename (Special:FilePath)
FILES: dict[str, str] = {
    "prices": "Terraced_houses_on_Basset_Street,_Camborne,_Cornwall_-_April_2023.jpg",
    "renting": "House_to_let_in_Queens_Road_-_geograph.org.uk_-_1403042.jpg",
    "affordability": "Time_Money_Balance.jpg",
    "stock": "Tower_blocks._Gleadless_Valley.jpg",
    "supply": "Caterpillar_330_Excavator.jpg",
    "land": "View_east_to_mature_trees_over_fairway_of_Whitewebbs_Golf_Course_-_geograph.org.uk_-_1285879.jpg",
    "quality": "Thermal_insulation.jpg",
    "insecurity": "Camden_,_tents_of_homeless_people,_Tottenham_Court_Road_-_geograph.org.uk_-_7741961.jpg",
    "ownership": "Example_of_a_blank_Kenyan_Deed_Title.png",
    "policy": "The_Houses_of_Parliament_(Palace_of_Westminster)_-_geograph.org.uk_-_2956524.jpg",
}

# Optional crop box (left, top, right, bottom as fractions) before the converter's centre square,
# so the subject survives at rail size. Square in pixels for the source's aspect ratio.
CROPS: dict[str, tuple[float, float, float, float]] = {
    "renting": (0.37, 0.36, 0.64, 0.72),  # the letting-agent boards on the terrace
    "insecurity": (0.43, 0.15, 1.0, 1.0),  # pale tents against the dark shopfront, no people
    "policy": (0.0, 0.0, 0.75, 1.0),  # Victoria Tower to the clock tower
}

SOURCES = {
    "prices": {
        "page": "https://commons.wikimedia.org/wiki/File:Terraced_houses_on_Basset_Street,_Camborne,_Cornwall_-_April_2023.jpg",
        "license": "CC BY-SA 4.0",
        "credit": "Terraced houses, Basset Street, Camborne (Wikimedia Commons)",
    },
    "renting": {
        "page": "https://commons.wikimedia.org/wiki/File:House_to_let_in_Queens_Road_-_geograph.org.uk_-_1403042.jpg",
        "license": "CC BY-SA 2.0",
        "credit": "House to let in Queens Road (Geograph, Wikimedia Commons)",
    },
    "affordability": {
        "page": "https://commons.wikimedia.org/wiki/File:Time_Money_Balance.jpg",
        "license": "CC BY-SA 4.0",
        "credit": "Time Money Balance (Wikimedia Commons)",
    },
    "stock": {
        "page": "https://commons.wikimedia.org/wiki/File:Tower_blocks._Gleadless_Valley.jpg",
        "license": "CC BY-SA 3.0",
        "credit": "Tower blocks, Gleadless Valley (Wikimedia Commons)",
    },
    "supply": {
        "page": "https://commons.wikimedia.org/wiki/File:Caterpillar_330_Excavator.jpg",
        "license": "CC BY-SA 4.0",
        "credit": "Caterpillar 330 excavator (Wikimedia Commons)",
    },
    "land": {
        "page": "https://commons.wikimedia.org/wiki/File:View_east_to_mature_trees_over_fairway_of_Whitewebbs_Golf_Course_-_geograph.org.uk_-_1285879.jpg",
        "license": "CC BY-SA 2.0",
        "credit": "Whitewebbs Green Belt landscape (Geograph / Wikimedia Commons)",
    },
    "quality": {
        "page": "https://commons.wikimedia.org/wiki/File:Thermal_insulation.jpg",
        "license": "CC BY-SA 2.0 DE",
        "credit": "Thermal insulation (Wikimedia Commons)",
    },
    "insecurity": {
        "page": "https://commons.wikimedia.org/wiki/File:Camden_,_tents_of_homeless_people,_Tottenham_Court_Road_-_geograph.org.uk_-_7741961.jpg",
        "license": "CC BY-SA 2.0",
        "credit": "Tents of homeless people, Tottenham Court Road, Camden (Geograph, Wikimedia Commons)",
    },
    "ownership": {
        "page": "https://commons.wikimedia.org/wiki/File:Example_of_a_blank_Kenyan_Deed_Title.png",
        "license": "CC0 1.0",
        "credit": "Blank title deed example (Wikimedia Commons)",
    },
    "policy": {
        "page": "https://commons.wikimedia.org/wiki/File:The_Houses_of_Parliament_(Palace_of_Westminster)_-_geograph.org.uk_-_2956524.jpg",
        "license": "CC BY-SA 2.0",
        "credit": "The Houses of Parliament, Palace of Westminster (Geograph, Wikimedia Commons)",
    },
}


def fetch(name: str, filename: str) -> Path:
    dest = REF / f"{name}.src"
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename) + "?width=1600"
    print(f"GET {name}: {url}")
    subprocess.run(
        [
            "curl",
            "-fsSL",
            "-A",
            "BritishExchangeBot/0.1 (research; local icon lab)",
            "-L",
            "-o",
            str(dest),
            url,
        ],
        check=True,
    )
    return dest


def pdf_first_page_png(pdf: Path, png: Path) -> None:
    from pypdf import PdfReader

    # pypdf can't rasterise; use macOS `qlmanage` or `sips` fallback via Preview tools.
    # Prefer `pdftoppm` if present, else ImageMagick, else PIL via pdf2image-less path:
    # On macOS, `qlmanage -t` generates a thumbnail.
    thumb_dir = REF / "_ql"
    thumb_dir.mkdir(exist_ok=True)
    subprocess.run(
        ["qlmanage", "-t", "-s", "1024", "-o", str(thumb_dir), str(pdf)],
        check=False,
        capture_output=True,
    )
    candidates = list(thumb_dir.glob(pdf.name + "*")) + list(thumb_dir.glob(pdf.stem + "*"))
    if not candidates:
        raise RuntimeError(f"Could not thumbnail PDF {pdf}; install qlmanage or pdftoppm")
    Image.open(candidates[0]).convert("RGB").save(png)


def main() -> None:
    REF.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for domain, filename in FILES.items():
        src = fetch(domain, filename)
        work = REF / f"{domain}.png"
        if filename.lower().endswith(".pdf"):
            pdf_first_page_png(src, work)
        else:
            img = Image.open(src).convert("RGB")
            if domain in CROPS:
                l, t, r, b = CROPS[domain]
                w, h = img.size
                img = img.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
            img.save(work)
        dst = OUT / f"i-ref-{domain}.png"
        subprocess.run(
            ["uv", "run", str(SCRIPT), str(work), str(dst), "--size", "320", "--cell", "4.0"],
            check=True,
        )
    (REF / "SOURCES.json").write_text(json.dumps(SOURCES, indent=2) + "\n")
    print("wrote", REF / "SOURCES.json")


if __name__ == "__main__":
    main()
