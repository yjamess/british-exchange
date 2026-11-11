# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Download Royal Mint reference photographs of the King Charles III definitive reverses
(the coins on Economy › Inflation › What £1 buys) into raw/, and write SOURCES.json.

Same pattern as ../economy/fetch_refs.py. Downloads are untrusted data: they land in their own
folder (raw/) and are only ever read as images (coin-types.py --ref raw/, run under uv / python -I).

Use: reverses only, under the owner's Royal Mint permission (2026-11-11) —
see docs/permissions/royal-mint-coins.md. Obverse images are never fetched.

  uv run data/icon-refs/coins/fetch_refs.py
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import subprocess
import time
from pathlib import Path

REF = Path(__file__).resolve().parent
RAW = REF / "raw"

BASE = "https://www.royalmint.com/globalassets/_ecommerce/commemorative/launches/2025-launches/annual-sets/product-images/bu-comm-and-def/"
PAGE = "https://www.royalmint.com/annual-sets/2025-annual-sets/the-2025-united-kingdom-brilliant-uncirculated-definitive-coin-set/"
LICENCE = "Crown copyright / The Royal Mint — used under written Royal Mint permission held by the owner (2026-11-11); not openly licensed"

# coin id → (file on the Royal Mint asset server, design)
REFS: dict[str, tuple[str, str]] = {
    "1p": ("duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-1p-reverse-1500x1500-f3a2c67.jpg", "Hazel dormouse"),
    "2p": ("duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-2p-reverse-1500x1500-f3a2c67.jpg", "Red squirrel"),
    "5p": ("duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-5p-reverse-1500x1500-f3a2c67.jpg", "Oak leaves and acorns"),
    "10p": ("duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-10p-reverse-1500x1500-f3a2c67.jpg", "Capercaillie"),
    "20p": ("duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-20p-reverse-1500x1500-f3a2c67.jpg", "Puffin"),
    "50p": ("duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-50p-reverse-1500x1500-f3a2c67.jpg", "Atlantic salmon"),
    "1pound": ("duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-gbp1-reverse-1500x1500-f3a2c67.jpg", "Bees"),
    "2pound": (
        "duw25--du25-the-2025-united-kingdom-brilliant-uncirculated-definitive-gbp2-reverse--1500x1500-f3a2c67.jpg",
        "National flowers: rose, thistle, daffodil and shamrock",
    ),
}


def fetch(coin: str, filename: str) -> Path:
    dest = RAW / f"{coin}.jpg"
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    url = BASE + filename
    print(f"GET {coin}: {url}")
    for attempt in range(5):
        r = subprocess.run(["curl", "-fsSL", "-A", "Mozilla/5.0 (BritishExchangeBot/0.1; reference fetch)", "-o", str(dest), url])
        if r.returncode == 0:
            return dest
        time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"could not fetch {coin}")


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    sources: dict[str, dict] = {}
    today = dt.date.today().isoformat()
    for coin, (filename, design) in REFS.items():
        src = fetch(coin, filename)
        sources[coin] = {
            "design": design,
            "side": "reverse (King Charles III definitive, 2023–)",
            "file": BASE + filename,
            "page": PAGE,
            "publisher": "The Royal Mint",
            "license": LICENCE,
            "retrieved": today,
            "local": f"raw/{src.name}",
            "sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
        }
        time.sleep(1)
    (REF / "SOURCES.json").write_text(json.dumps(sources, indent=2, ensure_ascii=False) + "\n")
    print("wrote", REF / "SOURCES.json")


if __name__ == "__main__":
    main()
