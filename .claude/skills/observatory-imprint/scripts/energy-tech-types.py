# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Energy Field Guide specimen plates — matched set for Domain 06 techs.

One plate per Field Guide technology (offshore wind, onshore wind, solar, hydro,
bioenergy, nuclear). Same camera, light, ground and screen so forms compare as
illustrative specimens — plate area is NOT capacity. Numbers live in the UI.

Usage:
  uv run energy-tech-types.py OUT_DIR [--only offshore,onshore,...] [--size 1000x1000]
Writes OUT_DIR/e-<id>.png masks for <Plate>.
"""

from __future__ import annotations

import argparse
import importlib.util
import math
from pathlib import Path

import numpy as np

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("halftone_plates", _HERE / "halftone-plates.py")
assert _spec and _spec.loader
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)


def box(p, c, b):
    return P.sd_box(p, np.array(c, float), np.array(b, float))


def sky(rd):
    el = np.clip(rd[:, 1], 0, 1)
    return np.clip(0.985 - el * 0.08, 0, 1)


def ground_albedo(p):
    x, z = p[:, 0], p[:, 2]
    lawn = 0.84 + 0.05 * (P.fbm(x * 0.35, 0, z * 0.35, 3) - 0.5)
    f = np.clip((np.hypot(x * 0.8, z) - 18.0) / 14.0, 0, 1)
    return lawn * (1 - f) + 1.3 * f


def is_ground(p, n):
    far = np.hypot(p[:, 0], p[:, 2])
    return (p[:, 1] < 0.06 + 0.002 * far) & ((n[:, 1] > 0.9) | (far > 40))


def compose_clean(tone_small, notes, path, seed, lo, hi, gamma, cell=5.2):
    from PIL import Image

    size = (P.W, P.H)
    tone = (
        np.asarray(
            Image.fromarray((np.clip(tone_small, 0, 1) * 255).astype(np.uint8)).resize(
                size, Image.Resampling.LANCZOS
            ),
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


def render_set(name, sdf, albedo, out, seed, lookat=(0.0, 6.0, 0.0)):
    w, h = P.W // 2, P.H // 2
    cam = P.Cam((-28, 16.0, -42), lookat, 32, w, h)
    tone, _, _ = P.render(
        sdf, cam, (-0.55, 0.7, -0.45), sky, albedo, ao_scale=0.4, fog=0.0, amb=0.42, sun=1.0
    )
    tone = np.nan_to_num(tone, nan=0.85)
    N = P.Notes(P.W, P.H)
    m = P.W * 0.05
    for cx, cy in ((m, m), (P.W - m, m), (m, P.H - m), (P.W - m, P.H - m)):
        N.cross((cx, cy), s=P.W * 0.018, w=2)
    compose_clean(tone, N, out / f"e-{name}.png", seed, lo=0.04, hi=0.9, gamma=1.25)


def turbine_sdf(p, base, scale, rot=0.35):
    q = (p - base) / scale
    tower = np.maximum(
        np.hypot(q[:, 0], q[:, 2]) - (0.85 - 0.012 * q[:, 1]),
        np.maximum(-q[:, 1] - 0.2, q[:, 1] - 18),
    )
    nac = box(q, (0, 18.2, 0.9), (0.7, 0.7, 1.8))
    hub = P.sd_sphere(q, np.array([0.0, 18.1, -1.1]), 0.85)
    d = np.minimum.reduce([tower, nac, hub])
    blade_len = 12.0
    for k in range(3):
        a = rot + k * 2 * math.pi / 3
        r = q - np.array([0.0, 18.1, -1.4])
        x = r[:, 0] * math.cos(-a) - r[:, 1] * math.sin(-a)
        y = r[:, 0] * math.sin(-a) + r[:, 1] * math.cos(-a)
        loc = np.stack([x, y, r[:, 2]], -1)
        width = 0.55 - 0.35 * np.clip(y / blade_len, 0, 1)
        qd = np.abs(loc - np.array([0, blade_len / 2 + 0.4, 0])) - np.stack(
            [width, np.full_like(width, blade_len / 2), np.full_like(width, 0.1)], -1
        )
        bl = np.linalg.norm(np.maximum(qd, 0), axis=-1) + np.minimum(qd.max(-1), 0)
        d = np.minimum(d, bl * 0.85)
    return d * scale


def tech_offshore(out, seed):
    def sdf(p):
        sea = p[:, 1] + 0.35 * (P.fbm(p[:, 0] * 0.12, 0, p[:, 2] * 0.2, 3) - 0.5)
        return np.minimum(sea, turbine_sdf(p, np.array([0.0, 0.0, 0.0]), 1.0))

    def albedo(p, n):
        a = np.where(p[:, 1] < 0.5, 0.22, 0.88)
        return np.where(is_ground(p, n) | (p[:, 1] < 0.45), a, a)

    render_set("offshore", sdf, albedo, out, seed, lookat=(0.0, 10.0, 0.0))


def tech_onshore(out, seed):
    def sdf(p):
        ground = p[:, 1]
        hill = ground - 1.2 * np.exp(-((p[:, 0] - 8) ** 2 + (p[:, 2] - 6) ** 2) / 90)
        return np.minimum(hill, turbine_sdf(p, np.array([0.0, 0.0, 0.0]), 0.92, rot=0.9))

    def albedo(p, n):
        a = np.where(p[:, 1] < 0.4, ground_albedo(p), 0.88)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set("onshore", sdf, albedo, out, seed, lookat=(0.0, 9.0, 0.0))


def tech_solar(out, seed):
    """Ground-mounted array: tilted slabs on posts, facing the camera."""

    def panel(p, c):
        # Local frame: X along row, Y up the panel face, Z through thickness
        q = p - c
        tilt = 0.55
        ct, st = math.cos(tilt), math.sin(tilt)
        # rotate around X so the face leans toward -Z (camera)
        y = q[:, 1] * ct - q[:, 2] * st
        z = q[:, 1] * st + q[:, 2] * ct
        return P.sd_box(
            np.stack([q[:, 0], y, z], -1),
            np.array([0.0, 0.0, 0.0]),
            np.array([2.8, 1.5, 0.07]),
        )

    def sdf(p):
        ground = p[:, 1]
        centres = [(dx, 1.55, dz) for dx in (-6.0, -2.0, 2.0, 6.0) for dz in (-2.5, 2.0)]
        racks = [panel(p, np.array(c, float)) for c in centres]
        posts = [
            P.sd_capsule(
                p,
                np.array([c[0], 0.0, c[2]], float),
                np.array([c[0], 1.2, c[2]], float),
                0.07,
            )
            for c in centres
        ]
        return np.minimum.reduce([ground, *racks, *posts])

    def albedo(p, n):
        a = 0.16 + 0.06 * (np.mod(p[:, 0] * 1.6, 1) < 0.1) + 0.05 * (np.mod(p[:, 1] * 1.2, 1) < 0.08)
        face = (p[:, 1] > 0.9) & (p[:, 1] < 3.2) & (n[:, 2] < -0.25)
        a = np.where(face, 0.1, a)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set("solar", sdf, albedo, out, seed, lookat=(0.0, 2.2, 0.0))


def tech_hydro(out, seed):
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        ground = y
        dam = box(p, (0, 5.0, 0), (10.0, 5.0, 1.2))
        crest = box(p, (0, 10.2, 0), (10.2, 0.35, 1.5))
        water_up = np.maximum(y - 7.2, np.abs(z + 6.0) - 5.0)
        water_down = np.maximum(y - 1.2, np.abs(z - 5.5) - 4.0)
        spill = box(p, (0, 4.0, 1.8), (1.6, 4.0, 0.4))
        return np.minimum.reduce([ground, dam, crest, water_up, water_down, spill])

    def albedo(p, n):
        y, z = p[:, 1], p[:, 2]
        a = 0.62 + 0.05 * (P.fbm(p[:, 0] * 2, y * 2, z * 2, 2) - 0.5)
        water = ((z < -2.5) & (y < 7.4)) | ((z > 2.5) & (y < 1.4))
        a = np.where(water, 0.2, a)
        a = np.where((y > 9.8) & (n[:, 1] > 0.7), 0.78, a)
        return np.where(is_ground(p, n) & ~water, ground_albedo(p), a)

    render_set("hydro", sdf, albedo, out, seed, lookat=(0.0, 5.5, 0.0))


def tech_bioenergy(out, seed):
    def sdf(p):
        ground = p[:, 1]
        hall = box(p, (0, 3.2, 0), (6.0, 3.2, 3.5))
        roof = box(p, (0, 6.6, 0), (6.2, 0.25, 3.7))
        stack = P.sd_capsule(p, np.array([4.2, 0.0, -1.5]), np.array([4.2, 14.0, -1.5]), 0.55)
        bunker = box(p, (-5.5, 1.6, 2.0), (2.2, 1.6, 2.5))
        return np.minimum.reduce([ground, hall, roof, stack, bunker])

    def albedo(p, n):
        y = p[:, 1]
        a = 0.7 + 0.05 * (P.fbm(p[:, 0] * 2, y * 3, p[:, 2] * 2, 2) - 0.5)
        win = (n[:, 2] < -0.7) & (np.mod(p[:, 0] + 6, 2.4) > 0.5) & (np.mod(p[:, 0] + 6, 2.4) < 1.7) & (y > 1.2) & (y < 4.5)
        a = np.where(win, 0.12, a)
        stack = np.hypot(p[:, 0] - 4.2, p[:, 2] + 1.5) < 0.7
        a = np.where(stack & (y > 0.5), 0.45 - 0.1 * (np.mod(y, 1.2) < 0.15), a)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set("bioenergy", sdf, albedo, out, seed, lookat=(0.0, 6.0, 0.0))


def tech_nuclear(out, seed):
    """Illustrative PWR form: reactor hall + dome + one hyperboloid cooling tower."""

    def cooling_tower(p, c):
        q = p - c
        h = q[:, 1]
        r = np.hypot(q[:, 0], q[:, 2])
        # hyperboloid radius: fat at base and lip, waist mid-height
        t = np.clip(h / 14.0, 0, 1)
        rad = 2.6 * (1 - t) + 2.4 * t + 1.1 * (4 * (t - 0.45) ** 2)
        shell = r - rad
        hollow = rad - 0.35 - r
        body = np.maximum(shell, np.maximum(-h, h - 14.0))
        # open throat near top
        body = np.maximum(body, np.where(h > 12.2, hollow, -1e3))
        return body

    def sdf(p):
        ground = p[:, 1]
        hall = box(p, (-4.0, 3.0, 1.5), (5.5, 3.0, 4.0))
        dome = P.sd_sphere(p, np.array([-4.0, 6.8, 1.5]), 3.6)
        dome = np.maximum(dome, 3.2 - p[:, 1])
        tower = cooling_tower(p, np.array([6.0, 0.0, -1.5]))
        skirt = box(p, (6.0, 0.35, -1.5), (3.2, 0.35, 3.2))
        return np.minimum.reduce([ground, hall, dome, tower, skirt])

    def albedo(p, n):
        y = p[:, 1]
        a = 0.76 + 0.04 * (P.fbm(p[:, 0] * 1.5, y * 1.5, p[:, 2] * 1.5, 2) - 0.5)
        dome = (np.hypot(p[:, 0] + 4.0, p[:, 2] - 1.5) < 3.8) & (y > 5.5)
        a = np.where(dome, 0.88, a)
        tower = np.hypot(p[:, 0] - 6.0, p[:, 2] + 1.5) < 3.4
        a = np.where(tower & (y > 0.8), 0.7 - 0.06 * (np.mod(y * 0.7, 1) < 0.12), a)
        win = (n[:, 2] < -0.7) & (np.abs(p[:, 0] + 4.0) < 4.5) & (y > 1.0) & (y < 5.0)
        win &= np.mod(p[:, 0] * 1.1, 1.8) > 0.5
        a = np.where(win, 0.15, a)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set("nuclear", sdf, albedo, out, seed, lookat=(0.5, 6.0, 0.0))


TYPES = {
    "offshore": tech_offshore,
    "onshore": tech_onshore,
    "solar": tech_solar,
    "hydro": tech_hydro,
    "bioenergy": tech_bioenergy,
    "nuclear": tech_nuclear,
}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(TYPES))
    ap.add_argument("--size", default="1000x1000")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE, P.MASK, P.PREFIX = True, not a.preview, ""
    P.W, P.H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        key = name.strip()
        TYPES[key](a.out, a.seed)


if __name__ == "__main__":
    main()
