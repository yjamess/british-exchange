# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10"]
# ///
"""Download Wikimedia Commons references for the Energy & Industry domains and screen them
to rail icon masks (web/public/brand/plates/i-ref-energy-<domain>.png).

Same treatment as the Housing references (../fetch_refs.py): 320px square, 4.0 cell.
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
    "generation": (
        "Ballylumford Power Station - geograph.org.uk - 5847174.jpg",
        "CC BY-SA 2.0",
        "Ballylumford Power Station, Islandmagee (Geograph, Wikimedia Commons)",
    ),
    "consumption": (
        "Economy 7 Meter and Teleswitcher.JPG",
        "Public domain",
        "Economy 7 meter and teleswitcher (Wikimedia Commons)",
    ),
    "prices": (
        "Smart prepayment meter.jpg",
        "CC0 1.0",
        "Smart prepayment meter (Wikimedia Commons)",
    ),
    "fossil": (
        "North Sea Oil Rig (7573694644).jpg",
        "CC BY 2.0",
        "North Sea oil rig (Flickr, Wikimedia Commons)",
    ),
    "imports": (
        "Grain LNG Terminal.jpg",
        "CC BY-SA 2.0",
        "Grain LNG Terminal, Isle of Grain (Wikimedia Commons)",
    ),
    "low-carbon": (
        "Sizewell B nuclear power station - geograph.org.uk - 5825003.jpg",
        "CC BY-SA 2.0",
        "Sizewell B nuclear power station (Geograph, Wikimedia Commons)",
    ),
    "networks": (
        "National Grid Creyke Beck substation - geograph.org.uk - 4448542.jpg",
        "CC BY-SA 2.0",
        "National Grid Creyke Beck substation (Geograph, Wikimedia Commons)",
    ),
    "manufacturing": (
        "Factory at Wainstalls - geograph.org.uk - 3487361.jpg",
        "CC BY-SA 2.0",
        "Factory at Wainstalls, Calderdale (Geograph, Wikimedia Commons)",
    ),
    "industrial-work": (
        "Port Talbot Steelworks - geograph.org.uk - 3044640.jpg",
        "CC BY-SA 2.0",
        "Port Talbot Steelworks (Geograph, Wikimedia Commons)",
    ),
    "policy": (
        "Redcar blast furnace - geograph.org.uk - 1709346.jpg",
        "CC BY-SA 2.0",
        "Redcar blast furnace (Geograph, Wikimedia Commons)",
    ),
}

# Optional crop box (left, top, right, bottom as fractions) before the converter's centre square.
CROPS: dict[str, tuple[float, float, float, float]] = {
    "generation": (0.35, 0.05, 0.95, 0.6),  # the stacks, not the perimeter fence
    "imports": (0.22, 0.4, 0.72, 1.0),  # the LNG storage tanks
    "networks": (0.2, 0.28, 0.8, 0.78),  # pylon over the substation gantries
    "prices": (0.15, 0.5, 0.95, 0.92),  # the credit display and dial, clear of maker marks
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
        dst = OUT / f"i-ref-energy-{domain}.png"
        subprocess.run(
            ["uv", "run", str(SCRIPT), str(work), str(dst), "--size", "320", "--cell", "4.0", *ARGS.get(domain, [])],
            check=True,
        )
    sources = {d: {"page": page(f), "license": lic, "credit": credit} for d, (f, lic, credit) in REFS.items()}
    (REF / "SOURCES.json").write_text(json.dumps(sources, indent=2) + "\n")
    print("wrote", REF / "SOURCES.json")


if __name__ == "__main__":
    main()
