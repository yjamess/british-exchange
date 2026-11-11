# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10"]
# ///
"""Download Wikimedia Commons references for the Economy & Public Finance domains and screen
them to rail icon masks (web/public/brand/plates/i-ref-economy-<domain>.png).

Same treatment as the Housing and Energy references (../fetch_refs.py, ../energy/fetch_refs.py):
320px square, 4.0 cell. Domain ids match `SECTOR_PAGES.economy.domains` in web/src/brand/sector-pages.ts.
"""

from __future__ import annotations

import json
import subprocess
import time
import urllib.parse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
REF = Path(__file__).resolve().parent
OUT = ROOT / "web/public/brand/plates"
SCRIPT = ROOT / ".claude/skills/observatory-imprint/scripts/photo-to-icon.py"

# Domain id → (Commons filename, licence, credit)
REFS: dict[str, tuple[str, str, str]] = {
    "inflation": (
        "Fuel prices sign, Belfast (11 October 2018) - geograph.org.uk - 5936689.jpg",
        "CC BY-SA 2.0",
        "Fuel prices sign, Belfast (Geograph, Wikimedia Commons)",
    ),
    "wages": (
        "Clocking -on machine at the Brewery Museum in Burton-upon-Trent - geograph.org.uk - 2664345.jpg",
        "CC BY-SA 2.0",
        "Clocking-on machine, Brewery Museum, Burton-upon-Trent (Geograph, Wikimedia Commons)",
    ),
    "employment": (
        "Jobcentre Plus, City Road, Chester - geograph.org.uk - 3328899.jpg",
        "CC BY-SA 2.0",
        "Jobcentre Plus, City Road, Chester (Geograph, Wikimedia Commons)",
    ),
    "household": (
        "Barclays Bank cash machine - geograph.org.uk - 6450466.jpg",
        "CC BY-SA 2.0",
        "Barclays Bank cash machine (Geograph, Wikimedia Commons)",
    ),
    "growth": (
        "Canary Wharf Skyline - geograph.org.uk - 2088457.jpg",
        "CC BY-SA 2.0",
        "Canary Wharf skyline (Geograph, Wikimedia Commons)",
    ),
    "tax": (
        "HMRC Building, Pilgrim's Quarter, Pilgrim Street, Newcastle upon Tyne - geograph.org.uk - 8289061.jpg",
        "CC BY-SA 2.0",
        "HMRC regional centre, Pilgrim's Quarter, Newcastle upon Tyne (Geograph, Wikimedia Commons)",
    ),
    "spending": (
        "Midpark Hospital Entrance (geograph 5999290).jpg",
        "CC BY-SA 2.0",
        "Midpark Hospital entrance, Dumfries (Geograph, Wikimedia Commons)",
    ),
    "debt": (
        "Bank of England Threadneedle St. (12565194585).jpg",
        "CC BY-SA 2.0",
        "Bank of England, Threadneedle Street (Flickr, Wikimedia Commons)",
    ),
    "investment": (
        "Cranes at Trinity Terminal, Port of Felixstowe - geograph.org.uk - 7456601.jpg",
        "CC BY-SA 2.0",
        "Container cranes, Trinity Terminal, Port of Felixstowe (Geograph, Wikimedia Commons)",
    ),
    "policy": (
        "View of the HM Treasury building from Horse Guards Road Geograph (3888622).jpg",
        "CC BY-SA 2.0",
        "HM Treasury from Horse Guards Road (Geograph, Wikimedia Commons)",
    ),
}

# Optional crop box (left, top, right, bottom as fractions) before the converter's centre square.
CROPS: dict[str, tuple[float, float, float, float]] = {
    "inflation": (0.2, 0.4, 0.85, 0.98),  # the price figures, clear of the forecourt brand
    "wages": (0.0, 0.0, 1.0, 0.78),  # the dial and ring of the clocking-on machine
    "employment": (0.0, 0.3, 0.45, 0.9),  # the entrance and sign
    "household": (0.22, 0.0, 0.78, 1.0),  # the machine in the wall
    "growth": (0.3, 0.0, 1.0, 0.72),  # the towers
    "tax": (0.0, 0.0, 1.0, 0.8),  # the curved glass facade
    "spending": (0.15, 0.1, 0.75, 0.78),  # the glazed entrance
    "debt": (0.1, 0.0, 0.9, 1.0),  # the Threadneedle Street facade
    "investment": (0.0, 0.0, 0.8, 0.95),  # the row of cranes
    "policy": (0.3, 0.12, 0.95, 0.75),  # the Treasury block
}
# Per-domain converter overrides (e.g. --gamma for dark photographs).
ARGS: dict[str, list[str]] = {}


def page(filename: str) -> str:
    return "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_"))


def fetch(name: str, filename: str) -> Path:
    dest = REF / f"{name}.src"
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename) + "?width=1600"
    print(f"GET {name}: {url}")
    for attempt in range(5):
        r = subprocess.run(
            ["curl", "-fsSL", "-A", "BritishExchangeBot/0.1 (research; local icon lab)", "-o", str(dest), url]
        )
        if r.returncode == 0:
            return dest
        time.sleep(20 * (attempt + 1))
    raise RuntimeError(f"could not fetch {name}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for domain, (filename, _, _) in REFS.items():
        src = fetch(domain, filename)
        img = Image.open(src).convert("RGB")
        if domain in CROPS:
            l, t, r, b = CROPS[domain]
            w, h = img.size
            img = img.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        work = REF / f"{domain}.png"
        img.save(work)
        dst = OUT / f"i-ref-economy-{domain}.png"
        subprocess.run(
            ["uv", "run", str(SCRIPT), str(work), str(dst), "--size", "320", "--cell", "4.0", *ARGS.get(domain, [])],
            check=True,
        )
        time.sleep(2)
    sources = {d: {"page": page(f), "license": lic, "credit": credit} for d, (f, lic, credit) in REFS.items()}
    (REF / "SOURCES.json").write_text(json.dumps(sources, indent=2) + "\n")
    print("wrote", REF / "SOURCES.json")


if __name__ == "__main__":
    main()
