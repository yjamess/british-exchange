# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Halftone icon plates for British Exchange UI (nav rails, condensed marks).

Same craft as the site plates: small 3D subjects, raymarched, screened through a
45° halftone in one ink. Symbolic subjects (digger, key, plot…) — not line-art
and not crops of the large hero plates.

Usage:
  uv run penship-icons.py OUT_DIR [--only digger,key,...] [--size 320]
"""

from __future__ import annotations

import argparse
import importlib.util
import math
from pathlib import Path

import numpy as np

# Load the plate engine (same folder) so icons share march / halftone / compose.
_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("halftone_plates", _HERE / "halftone-plates.py")
assert _spec and _spec.loader
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)


def _sky(rd: np.ndarray) -> np.ndarray:
    el = np.clip(rd[:, 1], 0, 1)
    return np.clip(0.94 - el * 0.5, 0, 1)


def _ground_alb(p: np.ndarray, base: float = 0.55) -> np.ndarray:
    return base + 0.08 * (P.fbm(p[:, 0] * 0.4, 0.0, p[:, 2] * 0.4, 2) - 0.5)


def _finish(tone: np.ndarray, out: Path, name: str, seed: int, size: int) -> None:
    """Bare mask with registration crosses only — depth from the screen, not line art."""
    N = P.Notes(size, size)
    m = size * 0.1
    arm = size * 0.04
    for cx, cy in ((m, m), (size - m, m), (m, size - m), (size - m, size - m)):
        N.cross((cx, cy), s=arm, w=max(2, size // 160))
    # Slightly finer cell so form holds at icon scale; still reads as print.
    P.compose(tone, N, out / f"i-pen-{name}.png", seed, size=(size, size), lo=0.05, hi=0.96, gamma=1.15, cell=3.8)


# ───────────────────────── subjects ─────────────────────────


def icon_house_price(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1] + 0.02
        body = P.sd_box(p, np.array([0.0, 1.1, 0.0]), np.array([1.35, 1.1, 1.0]))
        # pitched roof as two wedges via max of boxes rotated approx with abs
        roof_l = P.sd_box(p, np.array([-0.55, 2.55, 0.0]), np.array([1.05, 0.55, 1.15]))
        roof_r = P.sd_box(p, np.array([0.55, 2.55, 0.0]), np.array([1.05, 0.55, 1.15]))
        # board
        board = P.sd_box(p, np.array([2.2, 1.6, 0.0]), np.array([0.55, 0.4, 0.06]))
        post = P.sd_box(p, np.array([2.2, 0.7, 0.0]), np.array([0.06, 0.7, 0.06]))
        return np.min(np.stack([ground, body, roof_l, roof_r, board, post]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.7)
        a = np.where(p[:, 1] < 0.05, _ground_alb(p, 0.42), a)
        board = (np.abs(p[:, 0] - 2.2) < 0.55) & (np.abs(p[:, 1] - 1.6) < 0.4) & (np.abs(p[:, 2]) < 0.08)
        a = np.where(board, 0.88, a)
        roof = p[:, 1] > 2.1
        a = np.where(roof, 0.35, a)
        return a

    cam = P.Cam((-4.8, 2.4, -5.6), (0.4, 1.4, 0.0), 38, w, h)
    tone, _, _ = P.render(sdf, cam, (0.55, 0.75, -0.4), _sky, albedo, ao_scale=0.35, fog=0.01, amb=0.3)
    _finish(tone, out, "house-price", seed, size)


def icon_key(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        # bow as torus approx: ring of capsules is heavy — use thick torus via shells
        # torus in XY: sdf = length(length(xz)-R) - r  but we want Y up — use XZ plane ring
        q = np.stack([np.linalg.norm(p[:, [0, 2]], axis=-1) - 1.0, p[:, 1]], -1)
        bow = np.linalg.norm(q, axis=-1) - 0.32
        shaft = P.sd_capsule(p, np.array([1.0, 0.0, 0.0]), np.array([3.2, 0.0, 0.0]), 0.18)
        bit1 = P.sd_box(p, np.array([3.05, -0.35, 0.0]), np.array([0.18, 0.35, 0.12]))
        bit2 = P.sd_box(p, np.array([2.55, -0.28, 0.0]), np.array([0.14, 0.28, 0.12]))
        return np.min(np.stack([bow, shaft, bit1, bit2]), 0)

    def albedo(p, n):
        metal = 0.62 + 0.2 * np.clip(n[:, 1], 0, 1)
        return metal

    cam = P.Cam((0.5, 3.8, 5.2), (1.4, -0.1, 0.0), 34, w, h)
    tone, _, _ = P.render(sdf, cam, (0.4, 0.9, 0.2), _sky, albedo, ao_scale=0.25, fog=0.008, amb=0.28, sun=1.05)
    _finish(tone, out, "key", seed, size)


def icon_balance(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        base = P.sd_box(p, np.array([0.0, 0.15, 0.0]), np.array([0.9, 0.15, 0.5]))
        stem = P.sd_box(p, np.array([0.0, 1.5, 0.0]), np.array([0.12, 1.4, 0.12]))
        beam = P.sd_box(p, np.array([0.0, 2.85, 0.0]), np.array([2.2, 0.1, 0.1]))
        # pans
        left = P.sd_box(p, np.array([-1.8, 2.2, 0.0]), np.array([0.55, 0.06, 0.55]))
        right = P.sd_box(p, np.array([1.8, 2.05, 0.0]), np.array([0.55, 0.06, 0.55]))
        # hangers
        hl = P.sd_capsule(p, np.array([-1.8, 2.85, 0.0]), np.array([-1.8, 2.26, 0.0]), 0.05)
        hr = P.sd_capsule(p, np.array([1.8, 2.85, 0.0]), np.array([1.8, 2.11, 0.0]), 0.05)
        # house weight vs coin
        house = P.sd_box(p, np.array([-1.8, 2.45, 0.0]), np.array([0.28, 0.22, 0.22]))
        roof = P.sd_box(p, np.array([-1.8, 2.78, 0.0]), np.array([0.34, 0.12, 0.26]))
        coin = P.sd_box(p, np.array([1.8, 2.2, 0.0]), np.array([0.28, 0.08, 0.28]))  # flat disc approx
        ground = p[:, 1]
        return np.min(np.stack([ground, base, stem, beam, left, right, hl, hr, house, roof, coin]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.68)
        a = np.where(p[:, 1] < 0.02, _ground_alb(p, 0.4), a)
        a = np.where((np.abs(p[:, 0] - 1.8) < 0.35) & (np.abs(p[:, 1] - 2.2) < 0.15), 0.9, a)
        return a

    cam = P.Cam((-3.2, 3.4, -6.5), (0.0, 1.8, 0.0), 36, w, h)
    tone, _, _ = P.render(sdf, cam, (0.6, 0.8, -0.35), _sky, albedo, ao_scale=0.3, fog=0.01, amb=0.3)
    _finish(tone, out, "balance", seed, size)


def icon_blocks(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1]
        a = P.sd_box(p, np.array([-1.4, 1.4, 0.0]), np.array([0.9, 1.4, 0.7]))
        b = P.sd_box(p, np.array([0.5, 2.1, 0.2]), np.array([0.85, 2.1, 0.75]))
        c = P.sd_box(p, np.array([2.2, 1.1, -0.3]), np.array([0.6, 1.1, 0.55]))
        return np.min(np.stack([ground, a, b, c]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.72)
        a = np.where(p[:, 1] < 0.05, _ground_alb(p, 0.4), a)
        # windows as darker pits on faces
        face = np.abs(n[:, 2]) > 0.65
        u = np.where(np.abs(n[:, 2]) > 0.65, p[:, 0], p[:, 2])
        fy = np.mod(p[:, 1], 0.55) / 0.55
        win = face & (np.mod(u * 1.4, 1) > 0.35) & (fy > 0.25) & (fy < 0.8) & (p[:, 1] > 0.4)
        return np.where(win, 0.18, a)

    cam = P.Cam((-5.5, 2.8, -6.8), (0.3, 1.6, 0.0), 38, w, h)
    tone, _, _ = P.render(sdf, cam, (0.55, 0.7, -0.45), _sky, albedo, ao_scale=0.28, fog=0.012, amb=0.32)
    _finish(tone, out, "blocks", seed, size)


def icon_digger(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1]
        track = P.sd_box(p, np.array([0.0, 0.35, 0.0]), np.array([1.6, 0.35, 0.85]))
        body = P.sd_box(p, np.array([0.1, 1.15, 0.0]), np.array([1.1, 0.55, 0.7]))
        cabin = P.sd_box(p, np.array([-0.35, 1.95, 0.0]), np.array([0.55, 0.45, 0.55]))
        # boom
        boom = P.sd_capsule(p, np.array([0.6, 1.5, 0.0]), np.array([2.4, 2.6, 0.0]), 0.16)
        stick = P.sd_capsule(p, np.array([2.4, 2.6, 0.0]), np.array([3.1, 1.2, 0.0]), 0.14)
        bucket = P.sd_box(p, np.array([3.25, 0.95, 0.0]), np.array([0.35, 0.28, 0.32]))
        return np.min(np.stack([ground, track, body, cabin, boom, stick, bucket]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.7)
        a = np.where(p[:, 1] < 0.05, _ground_alb(p, 0.38), a)
        track = (np.abs(p[:, 1] - 0.35) < 0.4) & (np.abs(p[:, 0]) < 1.65) & (np.abs(p[:, 2]) < 0.9)
        a = np.where(track, 0.28, a)
        cabin = (np.abs(p[:, 0] + 0.35) < 0.55) & (np.abs(p[:, 1] - 1.95) < 0.45)
        a = np.where(cabin & (n[:, 2] > 0.5), 0.2, a)
        return a

    cam = P.Cam((-3.8, 2.6, -5.8), (0.9, 1.3, 0.0), 40, w, h)
    tone, _, _ = P.render(sdf, cam, (0.5, 0.85, -0.3), _sky, albedo, ao_scale=0.3, fog=0.012, amb=0.3)
    _finish(tone, out, "digger", seed, size)


def icon_plot(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1]
        # extruded cadastral parcels at different heights
        a = P.sd_box(p, np.array([-1.2, 0.25, -0.4]), np.array([1.1, 0.25, 1.3]))
        b = P.sd_box(p, np.array([1.3, 0.45, 0.3]), np.array([0.9, 0.45, 1.0]))
        c = P.sd_box(p, np.array([0.2, 0.7, 1.5]), np.array([0.7, 0.7, 0.55]))
        # survey peg
        peg = P.sd_capsule(p, np.array([0.2, 0.0, 0.2]), np.array([0.2, 1.6, 0.2]), 0.07)
        return np.min(np.stack([ground, a, b, c, peg]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.65)
        a = np.where(p[:, 1] < 0.04, _ground_alb(p, 0.45), a)
        top = n[:, 1] > 0.75
        a = np.where(top & (p[:, 1] > 0.3), 0.82, a)
        a = np.where(top & (p[:, 1] > 0.9), 0.55, a)
        return a

    cam = P.Cam((-4.2, 4.5, -4.8), (0.1, 0.4, 0.3), 42, w, h)
    tone, _, _ = P.render(sdf, cam, (0.35, 0.95, -0.25), _sky, albedo, ao_scale=0.35, fog=0.015, amb=0.34)
    _finish(tone, out, "plot", seed, size)


def icon_gauge(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1]
        # dial as short cylinder along Z
        xy = np.linalg.norm(p[:, [0, 1]] - np.array([0.0, 1.6]), axis=-1)
        dial = np.maximum(xy - 1.35, np.abs(p[:, 2]) - 0.18)
        hub = P.sd_sphere(p, np.array([0.0, 1.6, 0.2]), 0.18)
        needle = P.sd_capsule(p, np.array([0.0, 1.6, 0.25]), np.array([0.85, 2.35, 0.25]), 0.06)
        base = P.sd_box(p, np.array([0.0, 0.2, 0.0]), np.array([0.7, 0.2, 0.5]))
        house = P.sd_box(p, np.array([0.0, 0.55, 0.9]), np.array([0.45, 0.35, 0.3]))
        return np.min(np.stack([ground, dial, hub, needle, base, house]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.7)
        a = np.where(p[:, 1] < 0.05, _ground_alb(p, 0.4), a)
        face = (np.abs(p[:, 2] - 0.18) < 0.05) & (np.linalg.norm(p[:, [0, 1]] - np.array([0.0, 1.6]), axis=-1) < 1.3)
        a = np.where(face, 0.88, a)
        return a

    cam = P.Cam((0.0, 1.8, 5.2), (0.0, 1.4, 0.0), 36, w, h)
    tone, _, _ = P.render(sdf, cam, (0.45, 0.7, 0.55), _sky, albedo, ao_scale=0.28, fog=0.01, amb=0.3)
    _finish(tone, out, "gauge", seed, size)


def icon_shelter(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1]
        # A-frame: two thick slabs
        # left roof plane approx as box rotated — use abs tricks
        q = p.copy()
        # left panel
        pl = p - np.array([-0.9, 1.4, 0.0])
        # rotate ~35° around Z for left
        a = math.radians(38)
        c, s = math.cos(a), math.sin(a)
        rl = np.stack([pl[:, 0] * c - pl[:, 1] * s, pl[:, 0] * s + pl[:, 1] * c, pl[:, 2]], -1)
        left = P.sd_box(rl, np.array([0.0, 0.0, 0.0]), np.array([1.5, 0.1, 1.1]))
        pr = p - np.array([0.9, 1.4, 0.0])
        rr = np.stack([pr[:, 0] * c + pr[:, 1] * s, -pr[:, 0] * s + pr[:, 1] * c, pr[:, 2]], -1)
        right = P.sd_box(rr, np.array([0.0, 0.0, 0.0]), np.array([1.5, 0.1, 1.1]))
        ridge = P.sd_capsule(p, np.array([0.0, 2.55, -1.0]), np.array([0.0, 2.55, 1.0]), 0.08)
        return np.min(np.stack([ground, left, right, ridge]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.62)
        a = np.where(p[:, 1] < 0.05, _ground_alb(p, 0.36), a)
        a = np.where(n[:, 1] > 0.4, 0.78, a)
        return a

    cam = P.Cam((-3.6, 2.4, -4.8), (0.0, 1.3, 0.0), 40, w, h)
    tone, _, _ = P.render(sdf, cam, (0.55, 0.8, -0.35), _sky, albedo, ao_scale=0.32, fog=0.015, amb=0.3)
    _finish(tone, out, "shelter", seed, size)


def icon_deed(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1]
        sheet = P.sd_box(p, np.array([0.0, 1.5, 0.0]), np.array([1.5, 1.9, 0.08]))
        fold = P.sd_box(p, np.array([0.0, 1.5, -0.12]), np.array([1.45, 1.85, 0.05]))
        seal = P.sd_sphere(p, np.array([0.7, 0.55, 0.25]), 0.35)
        return np.min(np.stack([ground, sheet, fold, seal]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.85)
        a = np.where(p[:, 1] < 0.05, _ground_alb(p, 0.4), a)
        # ruled lines as darker bands
        lines = (np.abs(np.mod(p[:, 1] * 2.2, 1) - 0.5) < 0.06) & (np.abs(p[:, 2]) < 0.1) & (np.abs(p[:, 0]) < 1.2)
        a = np.where(lines, 0.55, a)
        seal = np.linalg.norm(p - np.array([0.7, 0.55, 0.25]), axis=-1) < 0.4
        a = np.where(seal, 0.35, a)
        return a

    cam = P.Cam((-2.8, 2.5, -4.5), (0.1, 1.3, 0.0), 38, w, h)
    tone, _, _ = P.render(sdf, cam, (0.5, 0.75, -0.4), _sky, albedo, ao_scale=0.28, fog=0.01, amb=0.32)
    _finish(tone, out, "deed", seed, size)


def icon_scroll(out: Path, seed: int, size: int) -> None:
    w = h = max(160, size // 2)

    def sdf(p):
        ground = p[:, 1]
        # two rolls + sheet between
        roll_l = np.linalg.norm(p[:, [1, 2]] - np.array([1.5, -1.2]), axis=-1) - 0.45
        roll_l = np.maximum(roll_l, np.abs(p[:, 0]) - 1.4)
        roll_r = np.linalg.norm(p[:, [1, 2]] - np.array([1.5, 1.2]), axis=-1) - 0.45
        roll_r = np.maximum(roll_r, np.abs(p[:, 0]) - 1.4)
        sheet = P.sd_box(p, np.array([0.0, 1.5, 0.0]), np.array([1.35, 1.1, 0.06]))
        return np.min(np.stack([ground, roll_l, roll_r, sheet]), 0)

    def albedo(p, n):
        a = np.full(len(p), 0.8)
        a = np.where(p[:, 1] < 0.05, _ground_alb(p, 0.4), a)
        lines = (np.abs(np.mod(p[:, 1] * 2.0, 1) - 0.5) < 0.07) & (np.abs(p[:, 2]) < 0.08)
        a = np.where(lines, 0.5, a)
        return a

    cam = P.Cam((-3.5, 2.8, -4.2), (0.0, 1.4, 0.0), 40, w, h)
    tone, _, _ = P.render(sdf, cam, (0.55, 0.8, -0.35), _sky, albedo, ao_scale=0.3, fog=0.012, amb=0.3)
    _finish(tone, out, "scroll", seed, size)


ICONS = {
    "house-price": icon_house_price,
    "key": icon_key,
    "balance": icon_balance,
    "blocks": icon_blocks,
    "digger": icon_digger,
    "plot": icon_plot,
    "gauge": icon_gauge,
    "shelter": icon_shelter,
    "deed": icon_deed,
    "scroll": icon_scroll,
}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(ICONS))
    ap.add_argument("--size", type=int, default=320)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE = True
    P.MASK = True
    P.PREFIX = ""
    P.W = P.H = a.size
    for name in a.only.split(","):
        key = name.strip()
        if key not in ICONS:
            raise SystemExit(f"unknown icon: {key}; choose from {', '.join(ICONS)}")
        ICONS[key](a.out, a.seed, a.size)


if __name__ == "__main__":
    main()
