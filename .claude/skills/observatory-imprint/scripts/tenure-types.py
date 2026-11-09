# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Tenure specimen plates for British Exchange (MHCLG dwelling stock by tenure).

Tenure is who occupies — not building form. Three clear instruments, matched set
(same camera family, light, ground, screen). No labels baked in.

  owner   — sealed title deed (freehold ownership)
  private — door key (private tenancy — access by agreement)
  social  — letterbox bank (many dwellings, shared entrance)

Usage:
  uv run tenure-types.py OUT_DIR [--only owner,private,social] [--size 1000x1000]
"""

from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path

import numpy as np

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("halftone_plates", _HERE / "halftone-plates.py")
assert _spec and _spec.loader
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)


def sky(rd):
    el = np.clip(rd[:, 1], 0, 1)
    return np.clip(0.985 - el * 0.06, 0, 1)


def paper_ground(p):
    x, z = p[:, 0], p[:, 2]
    g = 0.97 + 0.015 * (P.fbm(x * 0.15, 0, z * 0.15, 2) - 0.5)
    f = np.clip((np.hypot(x * 0.7, z) - 7.0) / 9.0, 0, 1)
    return g * (1 - f) + 1.3 * f


def is_ground(p, n):
    far = np.hypot(p[:, 0], p[:, 2])
    return (p[:, 1] < 0.05 + 0.002 * far) & ((n[:, 1] > 0.85) | (far > 25))


def compose_clean(tone_small, notes, path, seed, lo=0.03, hi=0.93, gamma=1.18, cell=5.0):
    from PIL import Image

    size = (P.W, P.H)
    tone = (
        np.asarray(
            Image.fromarray((np.clip(tone_small, 0, 1) * 255).astype(np.uint8)).resize(size, Image.Resampling.LANCZOS),
            np.float32,
        )
        / 255
    )
    tone = np.clip((tone - lo) / (hi - lo), 0, 1) ** gamma
    ink = P.halftone(tone, cell=cell, seed=seed)
    ink &= tone < 0.985
    ink = notes.apply(ink)
    if P.MASK:
        a = np.zeros((*ink.shape, 2), np.uint8)
        a[..., 0] = 255
        a[..., 1] = ink * 255
        Image.fromarray(a, "LA").save(path, optimize=True)
    else:
        rgb = np.where(ink[..., None], np.array(P.INK, np.uint8), np.array(P.PAPER, np.uint8))
        Image.fromarray(rgb).quantize(colors=2).save(path, optimize=True)
    print(f"saved {path}")


def finish(name, sdf, albedo, out, seed, cam, span=5.0, z_bar=0.0):
    tone, _, _ = P.render(sdf, cam, (-0.35, 0.9, -0.3), sky, albedo, ao_scale=0.32, fog=0.0, amb=0.42, sun=1.05)
    tone = np.nan_to_num(tone, nan=0.85)
    N = P.Notes(P.W, P.H)
    m = P.W * 0.05
    for cx, cy in ((m, m), (P.W - m, m), (m, P.H - m), (P.W - m, P.H - m)):
        N.cross((cx, cy), s=P.W * 0.018, w=2)
    a, _ = cam.project([(-span / 2, 0.0, z_bar)], P.W, P.H)
    b, _ = cam.project([(span / 2, 0.0, z_bar)], P.W, P.H)
    ybar = max(a[0][1], b[0][1]) + P.H * 0.045
    N.line((a[0][0], ybar), (b[0][0], ybar), w=2)
    for xx in (a[0][0], b[0][0]):
        N.line((xx, ybar - 10), (xx, ybar + 10), w=2)
    compose_clean(tone, N, out / f"t-{name}.png", seed)


# ───────────────────────── instruments ─────────────────────────


def owner(out, seed):
    """Sealed title deed — ownership of the dwelling (not a house drawing)."""
    w, h = P.W // 2, P.H // 2
    # Three-quarter desk view — silhouette of a document, seal readable
    cam = P.Cam((-4.8, 4.2, -6.5), (0.15, 2.2, 0.0), 30, w, h)

    def sdf(p):
        y = p[:, 1]
        sheet = P.sd_box(p, np.array([0.0, 2.4, 0.0]), np.array([2.1, 2.8, 0.08]))
        leaf = P.sd_box(p, np.array([0.25, 2.35, -0.14]), np.array([1.9, 2.65, 0.05]))
        # raised wax seal on the face
        seal = P.sd_sphere(p, np.array([1.15, 0.9, 0.35]), 0.5)
        ribbon = P.sd_box(p, np.array([1.15, 0.5, 0.5]), np.array([0.12, 0.38, 0.05]))
        return np.minimum.reduce([y, sheet, leaf, seal, ribbon])

    def albedo(p, n):
        # Light face + dark rules + dark seal — document silhouette, not a solid block
        a = np.full(len(p), 0.88)
        face = (np.abs(p[:, 2]) < 0.12) & (np.abs(p[:, 0]) < 1.95) & (p[:, 1] > 0.3) & (p[:, 1] < 5.0)
        a = np.where(face, 0.84, a)
        lines = face & (np.abs(np.mod(p[:, 1] * 1.65, 1) - 0.5) < 0.1) & (np.abs(p[:, 0]) < 1.65)
        a = np.where(lines, 0.32, a)
        a = np.where(face & (p[:, 1] > 4.55) & (p[:, 1] < 5.0) & (np.abs(p[:, 0]) < 1.4), 0.25, a)
        # dark border so the rectangle holds
        border = face & (
            (np.abs(p[:, 0]) > 1.85)
            | (p[:, 1] > 4.95)
            | ((p[:, 1] < 0.55) & (np.abs(p[:, 0]) < 1.95))
        )
        a = np.where(border, 0.22, a)
        seal = np.linalg.norm(p - np.array([1.15, 0.9, 0.35]), axis=-1) < 0.58
        a = np.where(seal, 0.18 + 0.22 * np.clip(n @ np.array([-0.3, 0.4, 0.85]), 0, 1), a)
        return np.where(is_ground(p, n), paper_ground(p), a)

    finish("owner", sdf, albedo, out, seed, cam, span=4.2)


def private(out, seed):
    """Door key — private tenancy: you hold the key for a term, not the title."""
    w, h = P.W // 2, P.H // 2
    cam = P.Cam((0.8, 5.5, 7.2), (1.6, 0.15, 0.0), 30, w, h)

    def sdf(p):
        y = p[:, 1]
        # bow (ring)
        q = np.stack([np.linalg.norm(p[:, [0, 2]], axis=-1) - 1.15, p[:, 1]], -1)
        bow = np.linalg.norm(q, axis=-1) - 0.38
        # shaft along +X
        shaft = P.sd_capsule(p, np.array([1.15, 0.0, 0.0]), np.array([4.4, 0.0, 0.0]), 0.2)
        # bits
        bit1 = P.sd_box(p, np.array([4.15, -0.42, 0.0]), np.array([0.22, 0.42, 0.14]))
        bit2 = P.sd_box(p, np.array([3.55, -0.32, 0.0]), np.array([0.18, 0.32, 0.14]))
        bit3 = P.sd_box(p, np.array([3.95, -0.22, 0.0]), np.array([0.12, 0.22, 0.14]))
        return np.minimum.reduce([y, bow, shaft, bit1, bit2, bit3])

    def albedo(p, n):
        metal = 0.58 + 0.32 * np.clip(n[:, 1] * 0.6 + np.abs(n[:, 2]) * 0.4, 0, 1)
        return np.where(is_ground(p, n), paper_ground(p), metal)

    finish("private", sdf, albedo, out, seed, cam, span=5.6, z_bar=0.0)


def social(out, seed):
    """Letterbox bank — many dwellings behind one shared social / PRP entrance."""
    w, h = P.W // 2, P.H // 2
    # Straight-on so flaps read as letterboxes, not windows
    cam = P.Cam((0.0, 2.4, -9.5), (0.0, 2.2, 0.0), 26, w, h)

    def sdf(p):
        y = p[:, 1]
        frame = P.sd_box(p, np.array([0.0, 2.2, 0.0]), np.array([3.6, 2.3, 0.2]))
        recess = P.sd_box(p, np.array([0.0, 2.2, -0.15]), np.array([3.35, 2.1, 0.18]))
        shell = np.maximum(frame, -recess)
        parts = [y, shell]
        for row in range(4):
            for col in range(3):
                cx = -2.15 + col * 2.15
                cy = 0.75 + row * 1.0
                # hinged flap (tilted slightly open via offset z)
                flap = P.sd_box(p, np.array([cx, cy, -0.32]), np.array([0.85, 0.32, 0.06]))
                # dark slot behind the flap
                slot = P.sd_box(p, np.array([cx, cy + 0.12, -0.22]), np.array([0.7, 0.08, 0.1]))
                # number plate stub under each flap (blank)
                tag = P.sd_box(p, np.array([cx, cy - 0.38, -0.28]), np.array([0.35, 0.1, 0.03]))
                parts.extend([flap, slot, tag])
        # entryphone strip
        phone = P.sd_box(p, np.array([4.15, 2.4, -0.05]), np.array([0.4, 1.1, 0.12]))
        parts.append(phone)
        return np.minimum.reduce(parts)

    def albedo(p, n):
        a = 0.55 + 0.1 * (P.fbm(p[:, 0] * 2, p[:, 1] * 2, 0, 2) - 0.5)
        for row in range(4):
            for col in range(3):
                cx = -2.15 + col * 2.15
                cy = 0.75 + row * 1.0
                flap = (np.abs(p[:, 0] - cx) < 0.85) & (np.abs(p[:, 1] - cy) < 0.32) & (p[:, 2] < -0.25)
                a = np.where(flap, 0.82, a)
                slot = (np.abs(p[:, 0] - cx) < 0.7) & (np.abs(p[:, 1] - (cy + 0.12)) < 0.09) & (p[:, 2] < -0.15)
                a = np.where(slot, 0.12, a)
                tag = (np.abs(p[:, 0] - cx) < 0.35) & (np.abs(p[:, 1] - (cy - 0.38)) < 0.1)
                a = np.where(tag, 0.9, a)
        phone = (np.abs(p[:, 0] - 4.15) < 0.4) & (np.abs(p[:, 1] - 2.4) < 1.1)
        a = np.where(phone, 0.38, a)
        btns = phone & (np.abs(np.mod(p[:, 1] * 2.8, 1) - 0.5) < 0.14) & (np.abs(p[:, 0] - 4.15) < 0.2)
        a = np.where(btns, 0.88, a)
        return np.where(is_ground(p, n), paper_ground(p), a)

    finish("social", sdf, albedo, out, seed, cam, span=7.6)


TYPES = {"owner": owner, "private": private, "social": social}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(TYPES))
    ap.add_argument("--size", default="1000x1000")
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE, P.MASK, P.PREFIX = True, not a.preview, ""
    P.W, P.H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        TYPES[name.strip()](a.out, a.seed)


if __name__ == "__main__":
    main()
