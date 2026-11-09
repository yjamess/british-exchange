# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Convert a reference photo into a British Exchange plate mask (icon or wide plate).

Reads a local image, centre-crops it to the output aspect, screens it through the same
45° halftone language as observatory-imprint plates, and writes an LA mask PNG for <Plate>
with light registration crosses.

Usage:
  uv run photo-to-icon.py IN.png OUT.png [--size 320] [--cell 4.2]          # square icon
  uv run photo-to-icon.py IN.jpg OUT.png --size 1600x900 --cell 5.2         # wide plate

Only screen photographs whose licence allows a derivative (public domain, OGL, CC BY,
CC BY-SA); record source, author and licence beside the plate (e.g. a plates.json register).
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def halftone(tone: np.ndarray, cell: float = 4.2, angle: float = 45.0, grain: float = 0.05, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    h, w = tone.shape
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    a = math.radians(angle)
    u = (x * math.cos(a) + y * math.sin(a)) * 2 * math.pi / cell
    v = (-x * math.sin(a) + y * math.cos(a)) * 2 * math.pi / cell
    screen = 0.5 + 0.25 * (np.cos(u) + np.cos(v))
    cov = 1 - tone
    low = (
        np.asarray(
            Image.fromarray((rng.random((h // 24 + 2, w // 24 + 2)) * 255).astype(np.uint8)).resize(
                (w, h), Image.Resampling.BICUBIC
            ),
            np.float32,
        )
        / 255
    )
    cov = cov + rng.normal(0, grain, cov.shape) + (low - 0.5) * 0.1
    ink = screen < cov
    img = Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.55))
    return np.asarray(img) > 118 + rng.normal(0, 14, (h, w))


def aspect_crop(img: Image.Image, aspect: float, focus_y: float = 0.5) -> Image.Image:
    """Centre crop to width/height = aspect; focus_y shifts a vertical crop (0 top … 1 bottom)."""
    w, h = img.size
    if w / h > aspect:
        cw, ch = int(h * aspect), h
    else:
        cw, ch = w, int(w / aspect)
    left = (w - cw) // 2
    top = int((h - ch) * focus_y)
    return img.crop((left, top, left + cw, top + ch))


def reg_crosses(ink: np.ndarray) -> np.ndarray:
    h, w = ink.shape
    out = ink.copy()
    img = Image.fromarray((out * 255).astype(np.uint8), "L")
    d = ImageDraw.Draw(img)
    m = int(min(w, h) * 0.1)
    arm = max(4, min(w, h) // 28)
    for cx, cy in ((m, m), (w - m, m), (m, h - m), (w - m, h - m)):
        d.line([(cx - arm, cy), (cx + arm, cy)], fill=255, width=2)
        d.line([(cx, cy - arm), (cx, cy + arm)], fill=255, width=2)
    return np.asarray(img) > 127


def convert(src: Path, dst: Path, size: tuple[int, int], cell: float, seed: int, focus_y: float = 0.5, gamma: float = 0.95) -> None:
    rgb = Image.open(src).convert("RGB")
    w, h = size
    crop = aspect_crop(rgb, w / h, focus_y).resize((w, h), Image.Resampling.LANCZOS)
    # luminance, slightly lifted so midtones still print as dots
    arr = np.asarray(crop, np.float32) / 255
    tone = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]
    tone = np.clip((tone - 0.08) / 0.84, 0, 1) ** gamma
    ink = reg_crosses(halftone(tone, cell=cell, seed=seed))
    a = np.zeros((h, w, 2), np.uint8)
    a[..., 0] = 255
    a[..., 1] = ink * 255
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(a, "LA").save(dst, optimize=True)
    print(f"saved {dst}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("src", type=Path)
    ap.add_argument("dst", type=Path)
    ap.add_argument("--size", default="320", help="N (square) or WxH")
    ap.add_argument("--cell", type=float, default=4.2)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--focus-y", type=float, default=0.5, help="vertical crop position, 0 top … 1 bottom")
    ap.add_argument("--gamma", type=float, default=0.95, help="tone curve; below 1 lightens dark photographs")
    a = ap.parse_args()
    parts = [int(x) for x in str(a.size).lower().split("x")]
    size = (parts[0], parts[-1])
    convert(a.src, a.dst, size, a.cell, a.seed, a.focus_y, a.gamma)


if __name__ == "__main__":
    main()
