# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Sector hero plates for British Exchange (wide 2400x1350 masks for <Plate>).

Same renderer, screen and line work as halftone-plates.py (imported from it), with one
subject per sector, each British and about what the sector measures:

  port        Economy & Public Finance   container port: gantry cranes, stacks, ship
  crowd       People & Society           engineered figures on a paved square (no real people)
  polling     Government & Politics      a polling station: ballot box on the table, booths behind
  viaduct     Infrastructure             railway viaduct across a valley, train on the deck
  relief      Regions & Places           hill-shaded relief of the UK outline (ONS boundaries), north up
  pithead     History & Change           colliery headframe, winding wheels, engine house, stack

Usage:
  uv run sector-plates.py OUT_DIR [--only port,crowd,...] [--bare --mask] [--size 2400x1350]
"""

from __future__ import annotations

import argparse
import importlib.util
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("hp", HERE / "halftone-plates.py")
hp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hp)  # type: ignore[union-attr]

Cam, render, Notes, compose, fbm, h3, sd_box, sd_sphere, sd_capsule = (
    hp.Cam, hp.render, hp.Notes, hp.compose, hp.fbm, hp.h3, hp.sd_box, hp.sd_sphere, hp.sd_capsule,
)
ROOT = HERE.parents[3]

# render at half size; compose screens at full size
RW, RH = 960, 540


def sky_fn(cloud=0.5, top=0.55):
    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        cl = fbm(rd[:, 0] * 2.4 + 3, rd[:, 1] * 6.5, rd[:, 2] * 2.4, 5)
        return np.clip(0.93 - el * top + (cl - 0.5) * cloud, 0, 1)

    return sky


def cyl_y(p, c, r, hh):
    q = p - np.asarray(c, float)
    d = np.stack([np.hypot(q[:, 0], q[:, 2]) - r, np.abs(q[:, 1]) - hh], -1)
    return np.linalg.norm(np.maximum(d, 0), axis=-1) + np.minimum(d.max(-1), 0)


def torus_x(p, c, R, r):
    """Torus in the y–z plane (a wheel facing along x)."""
    q = p - np.asarray(c, float)
    return np.hypot(np.hypot(q[:, 1], q[:, 2]) - R, q[:, 0]) - r


def caps(p, segs, r):
    d = np.full(len(p), 1e9)
    for a, b in segs:
        d = np.minimum(d, sd_capsule(p, np.asarray(a, float), np.asarray(b, float), r))
    return d


def frame_notes(cam, marks=(), axis=None, dims=()):
    """Shared line work: registration crosses, a dashed axis, dimension lines."""
    N = Notes(hp.W, hp.H)
    for P in marks:
        (xy, _) = cam.project([P], hp.W, hp.H)
        N.cross(xy[0])
    if axis is not None:
        (a, _) = cam.project([axis[0]], hp.W, hp.H)
        (b, _) = cam.project([axis[1]], hp.W, hp.H)
        N.line(a[0], b[0], dash=(16, 10))
    for x, P0, P1, label in dims:
        (a, _) = cam.project([P0], hp.W, hp.H)
        (b, _) = cam.project([P1], hp.W, hp.H)
        N.dim_v(x, a[0][1], b[0][1], label)
    N.ruler(30, 120, hp.H - 120)
    return N


# ───────────────────────── Economy: container port ─────────────────────────
def plate_port(out: Path, seed: int):
    cranes = [-34.0, -2.0, 30.0]

    def crane(p, x0):
        segs = []
        for sx in (-6, 6):
            for z in (-9, 3):
                segs.append(((x0 + sx, 0, z), (x0 + sx, 40, z)))
            segs.append(((x0 + sx, 12, -9), (x0 + sx, 12, 3)))
            segs.append(((x0 + sx, 40, -9), (x0 + sx, 40, 3)))
            segs.append(((x0 + sx, 12, -9), (x0 + sx, 40, 3)))  # side brace
            segs.append(((x0 + sx, 40, -12), (x0 + sx, 54, -3)))  # A-frame
            segs.append(((x0 + sx, 54, -3), (x0 + sx, 43, 38)))  # boom stay
        segs += [((x0 - 6, 40, z), (x0 + 6, 40, z)) for z in (-9, 3)]
        d = caps(p, segs, 0.55)
        for sx in (-1.6, 1.6):  # twin boom girders
            d = np.minimum(d, sd_box(p, np.array([x0 + sx, 42.0, 12.0]), np.array([0.5, 0.9, 30.0])))
        d = np.minimum(d, sd_box(p, np.array([x0, 39.0, 19.0]), np.array([1.6, 1.6, 1.4])))  # trolley
        return d

    def stacks(p, centre=(0.0, 6.0, -26.0), half=(72.0, 7.0, 13.0), y0=0.0):
        cx, cz = 7.0, 3.2
        ix = np.floor(p[:, 0] / cx)
        iz = np.floor(p[:, 2] / cz)
        hgt = (1 + np.floor(h3(ix, iz, 3.0 + y0) * 3.0)) * 2.6
        q = p.copy()
        q[:, 0] = p[:, 0] - (ix + 0.5) * cx
        q[:, 2] = p[:, 2] - (iz + 0.5) * cz
        c = np.zeros_like(p)
        c[:, 1] = y0 + hgt / 2
        b = np.stack([np.full(len(p), 3.05), hgt / 2, np.full(len(p), 1.22)], -1)
        qq = np.abs(q - c) - b
        d = np.linalg.norm(np.maximum(qq, 0), axis=-1) + np.minimum(qq.max(-1), 0)
        d = np.where(h3(ix, iz, 9.0 + y0) < 0.1, 3.0, d)  # an empty slot is empty, not a flat box
        region = sd_box(p, np.array(centre), np.array(half))
        return np.maximum(d, region)

    def ship(p):
        hull = sd_box(p, np.array([0.0, 1.5, 22.0]), np.array([70.0, 4.5, 7.5]))
        bridge = sd_box(p, np.array([58.0, 10.0, 22.0]), np.array([4.0, 5.0, 6.5]))
        deck = stacks(p, centre=(-8.0, 10.0, 22.0), half=(56.0, 4.2, 6.6), y0=6.0)
        return np.minimum(np.minimum(hull, bridge), deck)

    def sdf(p):
        quay = sd_box(p, np.array([0.0, -6.0, -40.0]), np.array([400.0, 6.0, 40.0]))
        water = p[:, 1] + 1.6
        d = np.minimum(quay, water)
        d = np.minimum(d, stacks(p))
        d = np.minimum(d, ship(p))
        for x0 in cranes:
            d = np.minimum(d, crane(p, x0))
        return d

    def albedo(p, n):
        y, z = p[:, 1], p[:, 2]
        water = y < -1.2
        quay = (y < 0.05) & (z < 0)
        box = h3(np.floor(p[:, 0] / 7), np.floor(z / 3.2), np.floor(y / 2.6))
        ribs = 0.12 * (np.abs(np.sin(p[:, 0] * 6.0)) < 0.35)  # corrugated sides
        cont = 0.55 + 0.38 * box - ribs
        wave = 0.42 + 0.18 * np.sin(p[:, 0] * 0.9 + z * 2.2) * fbm(p[:, 0] * 0.1, 0, z * 0.1, 2)
        a = np.where(water, wave, np.where(quay, 0.72, cont))
        hull = (z > 14) & (y < 6.1) & ~water
        a = np.where(hull, 0.22, a)
        crane_m = np.zeros(len(p), bool)
        for x0 in cranes:
            crane_m |= (np.abs(p[:, 0] - x0) < 7) & (y > 11)
        return np.where(crane_m & (z < 41), 0.93, a)

    cam = Cam((78, 44, -96), (-4, 12, 2), 42, RW, RH)
    tone, _, _ = render(sdf, cam, (-0.5, 0.7, 0.45), sky_fn(), albedo, ao_scale=0.8, fog=0.004, amb=0.4)
    N = frame_notes(cam, marks=[(-2, 54, -3), (30, 54, -3)], axis=((-200, 0, 0), (200, 0, 0)),
                    dims=[(hp.W - 140, (30, 54, -3), (30, 0, 3), "")])
    compose(tone, N, out / "10-container-port.png", seed, lo=0.05, hi=0.95, gamma=1.2)


# ───────────────────────── People: engineered figures on a square ─────────────────────────
def plate_crowd(out: Path, seed: int):
    CELL = 1.9

    def figures(p):
        ix = np.floor(p[:, 0] / CELL)
        iz = np.floor(p[:, 2] / CELL)
        r1, r2, r3 = h3(ix, iz, 1.0), h3(ix, iz, 2.0), h3(ix, iz, 5.0)
        # loose groups: a slow field decides where people gather
        group = fbm(ix * 0.35, iz * 0.35, 4.2, 2)
        empty = (r3 < 0.25) | (group < 0.42)
        s = np.where(r1 < 0.16, 0.62, 0.88 + 0.2 * r2)  # children and adults
        q = p.copy()
        q[:, 0] = p[:, 0] - (ix + 0.5 + (r2 - 0.5) * 0.45) * CELL
        q[:, 2] = p[:, 2] - (iz + 0.5 + (r1 - 0.5) * 0.45) * CELL
        q = q / s[:, None]
        # a standing figure: two legs, torso, arms at the sides, head (simple, anonymous)
        ox = np.where(h3(ix, iz, 11.0) < 0.5, 1.0, -1.0)  # some face the other way
        qx = q[:, 0] * ox
        legs = np.minimum(
            np.hypot(np.hypot(qx - 0.1, q[:, 2]), q[:, 1] - np.clip(q[:, 1], 0.05, 0.82)) - 0.085,
            np.hypot(np.hypot(qx + 0.1, q[:, 2] - 0.04 * ox), q[:, 1] - np.clip(q[:, 1], 0.05, 0.82)) - 0.085,
        )
        torso = np.hypot(np.hypot(qx / 1.25, q[:, 2] / 0.8), q[:, 1] - np.clip(q[:, 1], 0.9, 1.32)) - 0.17
        arms = np.minimum(
            np.hypot(np.hypot(qx - 0.29, q[:, 2]), q[:, 1] - np.clip(q[:, 1], 0.78, 1.36)) - 0.06,
            np.hypot(np.hypot(qx + 0.29, q[:, 2]), q[:, 1] - np.clip(q[:, 1], 0.78, 1.36)) - 0.06,
        )
        body = np.minimum(np.minimum(legs, torso), arms)
        head = np.linalg.norm(q - np.array([0.0, 1.62, 0.0]), axis=-1) - 0.13
        d = np.minimum(body, head) * s
        d = np.where(empty, 0.9, d)
        region = sd_box(p, np.array([0.0, 1.5, 24.0]), np.array([60.0, 2.0, 30.0]))
        return np.maximum(d, region)

    def sdf(p):
        return np.minimum(p[:, 1], figures(p))

    def albedo(p, n):
        ground = p[:, 1] < 0.02
        slab = (np.abs(np.sin(p[:, 0] * math.pi / 1.9)) < 0.05) | (np.abs(np.sin(p[:, 2] * math.pi / 1.9)) < 0.05)
        paving = np.where(slab, 0.55, 0.86) - 0.08 * fbm(p[:, 0] * 0.3, 0, p[:, 2] * 0.3, 2)
        coat = 0.28 + 0.5 * h3(np.floor(p[:, 0] / CELL), np.floor(p[:, 2] / CELL), 7.0)
        return np.where(ground, paving, coat)

    cam = Cam((-2, 2.3, -6), (2, 1.5, 14), 50, RW, RH)
    tone, _, _ = render(sdf, cam, (-0.55, 0.75, -0.3), sky_fn(0.3, 0.4), albedo, ao_scale=0.35, fog=0.02)
    N = frame_notes(cam, marks=[(-6, 0, 6), (8, 0, 14)], axis=((-40, 0, 9.5), (40, 0, 9.5)))
    compose(tone, N, out / "11-crowd.png", seed, lo=0.06, hi=0.96, gamma=1.15)


# ───────────────────────── Government: a polling station ─────────────────────────
def plate_polling(out: Path, seed: int):
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        d = y
        d = np.minimum(d, sd_box(p, np.array([0.0, 0.72, 0.0]), np.array([1.0, 0.03, 0.5])))  # table top
        for lx in (-0.92, 0.92):
            for lz in (-0.42, 0.42):
                d = np.minimum(d, sd_box(p, np.array([lx, 0.36, lz]), np.array([0.03, 0.36, 0.03])))
        body = sd_box(p, np.array([0.1, 0.99, 0.0]), np.array([0.26, 0.24, 0.19])) - 0.01
        lid = sd_box(p, np.array([0.1, 1.245, 0.0]), np.array([0.29, 0.02, 0.22]))
        slot = sd_box(p, np.array([0.1, 1.25, 0.0]), np.array([0.13, 0.05, 0.012]))
        box = np.maximum(np.minimum(body, lid), -slot)
        hasp = torus_x(p, (0.1, 1.08, -0.215), 0.045, 0.012)
        lock = sd_box(p, np.array([0.1, 1.02, -0.215]), np.array([0.035, 0.035, 0.015]))
        d = np.minimum(d, np.minimum(box, np.minimum(hasp, lock)))
        paper = sd_box(p - np.array([0.1, 1.33, 0.0]), np.zeros(3), np.array([0.1, 0.1, 0.004]))  # half in the slot
        d = np.minimum(d, paper)
        for k in range(5):  # a row of polling booths behind
            bx = -2.2 + k * 1.1
            d = np.minimum(d, sd_box(p, np.array([bx - 0.55, 0.95, 2.6]), np.array([0.015, 0.95, 0.45])))  # partition
            d = np.minimum(d, sd_box(p, np.array([bx, 1.05, 2.95]), np.array([0.53, 0.02, 0.17])))  # shelf
            d = np.minimum(d, sd_box(p, np.array([bx, 1.6, 3.06]), np.array([0.55, 0.32, 0.015])))  # back panel
        d = np.minimum(d, sd_box(p, np.array([3.3, 0.95, 2.6]), np.array([0.015, 0.95, 0.45])))
        return np.minimum(d, sd_box(p, np.array([0.0, 2.2, 4.0]), np.array([8.0, 2.2, 0.1])))  # hall wall

    def albedo(p, n):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y < 0.01
        tiles = 0.74 - 0.12 * ((np.floor(x * 2.5) + np.floor(z * 2.5)) % 2)
        a = np.where(floor, tiles, 0.82)
        boxm = (np.abs(x - 0.1) < 0.3) & (y > 0.74) & (y < 1.27) & (np.abs(z) < 0.23)
        a = np.where(boxm, 0.26, a)
        paper = (y > 1.26) & (np.abs(z) < 0.02)
        a = np.where(paper, 0.97, a)
        table = (np.abs(y - 0.72) < 0.04) & (np.abs(x) < 1.0)
        a = np.where(table, 0.58 + 0.06 * np.sin(x * 40), a)
        wall = z > 3.85
        return np.where(wall, 0.9 - 0.08 * (np.abs(np.sin(y * 3.0)) < 0.05), a)

    cam = Cam((2.4, 1.85, -3.0), (0.0, 1.0, 0.8), 44, RW, RH)
    tone, _, _ = render(sdf, cam, (-0.4, 0.85, -0.5), lambda rd: np.full(len(rd), 0.9), albedo, ao_scale=0.08, amb=0.42, sun=0.8)
    N = frame_notes(cam, marks=[(0.1, 1.43, 0.0), (-2.75, 1.9, 2.6)], axis=((-6, 0.72, -0.5), (6, 0.72, -0.5)),
                    dims=[(hp.W - 140, (0.1, 1.25, -0.2), (0.1, 0.0, -0.2), "")])
    compose(tone, N, out / "12-polling-station.png", seed, lo=0.06, hi=0.96, gamma=1.15)


# ───────────────────────── Infrastructure: railway viaduct ─────────────────────────
def plate_viaduct(out: Path, seed: int):
    DECK, SPAN, R = 30.0, 13.0, 5.2

    def ground_h(x, z):
        """A valley under the viaduct, rising to either side."""
        return 0.0028 * x * x - 6 + 3.5 * fbm(x * 0.02, 0, z * 0.02, 3)

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        g = (y - ground_h(x, z)) * 0.6
        body = sd_box(p, np.array([0.0, DECK / 2 - 4, 0.0]), np.array([95.0, DECK / 2 + 4, 2.6]))
        qx = np.mod(x, SPAN) - SPAN / 2
        spring = DECK - 9.5
        arch = np.minimum(np.hypot(qx, y - spring) - R, np.maximum(np.abs(qx) - R, y - spring))
        arch = np.maximum(arch, np.abs(z) - 3.0)
        via = np.maximum(body, -arch)
        parapet = sd_box(p, np.array([0.0, DECK + 0.6, 0.0]), np.array([95.0, 0.6, 2.7]))
        via = np.minimum(via, parapet)
        # five carriages on the deck, with gaps between them
        q = p.copy()
        q[:, 0] = np.mod(x + 46.0, 11.2) - 5.6
        cars = sd_box(q, np.array([0.0, DECK + 3.2, 0.0]), np.array([5.2, 1.9, 1.5])) - 0.25
        train = np.maximum(cars, sd_box(p, np.array([-14.0, DECK + 3.2, 0.0]), np.array([28.0, 3.0, 3.0])))
        d = np.minimum(g, via)
        return np.minimum(d, train)

    def albedo(p, n):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        ground = y < ground_h(x, z) + 0.3
        field = 0.52 + 0.2 * np.sin(x * 0.7 + z * 0.25) * fbm(x * 0.05, 0, z * 0.05, 2) + 0.1 * fbm(x * 0.2, 0, z * 0.2, 2)
        course = 0.6 + 0.1 * (np.abs(np.sin(y * 3.1)) < 0.18) - 0.06 * fbm(x * 0.4, y * 0.4, 0, 2)
        train = (y > DECK + 1.0) & (np.abs(z) < 1.9)
        windows = train & (np.abs(y - (DECK + 3.6)) < 0.5) & (np.abs(np.sin(x * 1.4)) > 0.4)
        a = np.where(ground, field, course)
        a = np.where(train, 0.86, a)
        return np.where(windows, 0.25, a)

    cam = Cam((-54, 9, -78), (8, 20, 0), 46, RW, RH)
    tone, _, _ = render(sdf, cam, (-0.6, 0.6, -0.5), sky_fn(), albedo, ao_scale=0.9, fog=0.004)
    N = frame_notes(cam, marks=[(-39, DECK + 2, 0), (39, DECK + 2, 0)], axis=((-120, DECK + 1.2, -3), (120, DECK + 1.2, -3)),
                    dims=[(hp.W - 140, (52, DECK, -3), (52, 0, -3), "")])
    compose(tone, N, out / "13-viaduct.png", seed, lo=0.05, hi=0.95, gamma=1.2)


# ───────────────────────── Regions: relief model of the UK ─────────────────────────
def britain_path() -> tuple[float, str]:
    ts = (ROOT / "web/src/brand/motion/glyphs.britain.ts").read_text()
    width = float(re.search(r"width: ([\d.]+)", ts).group(1))
    return width, re.search(r'd: "([^"]+)"', ts).group(1)


def blur(a: np.ndarray, r: int, passes: int = 3) -> np.ndarray:
    """Separable box blur (three passes ≈ Gaussian) for float height maps."""
    a = a.astype(np.float32)
    for _ in range(passes):
        for axis in (0, 1):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (r, r)
            c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float64)
            c = np.insert(c, 0, 0, axis=axis)
            n = a.shape[axis]
            a = ((np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, range(0, n), axis=axis)) / (2 * r + 1)).astype(np.float32)
    return a


def plate_relief(out: Path, seed: int):
    """Hill-shaded relief of the UK (ONS outline), north up, as a relief model on a light sea."""
    width, d = britain_path()
    RES = RH * 0.9 / 100.0  # 100 units tall → 90% of the frame
    ox, oy = RW * 0.56 - width * RES / 2, RH * 0.05
    img = Image.new("L", (RW, RH), 0)
    dr = ImageDraw.Draw(img)
    for ring in re.findall(r"M([^Z]+)Z", d):
        pts = [tuple(float(v) for v in pair.split()) for pair in ring.split("L")]
        dr.polygon([(ox + x * RES, oy + y * RES) for x, y in pts], fill=255)
    mask = np.asarray(img, np.float32) / 255
    yy, xx = np.mgrid[0:RH, 0:RW].astype(np.float32)
    north = np.clip(1 - (yy - oy) / (100 * RES) * 1.3, 0, 1)
    west = np.clip(1 - (xx - ox) / (width * RES) * 1.4, 0, 1)
    hills = fbm(xx * 0.03, yy * 0.03, 1.7, 5)
    inland = blur(mask, 3)
    height = inland * (0.4 + np.clip(hills - 0.38, 0, None) * (1.5 + 7.0 * np.maximum(north, west * 0.8)))
    height = blur(height, 1)
    gy, gx = np.gradient(height)
    shade = np.clip(0.62 - (gx * -0.7 + gy * -0.7) * 2.2, 0.08, 1.0)  # light from the north-west
    contour = (np.abs(np.sin(height * 9.0)) < 0.12) & (height > 0.05)
    land = np.where(contour, shade * 0.55, shade)
    shadow = blur(np.roll(np.roll(mask, 7, 0), 7, 1), 2) * (1 - mask)  # relief model on the table
    swell = (np.abs(np.sin(yy * 0.28 + 1.5 * np.sin(xx * 0.012))) < 0.07) * 0.1
    sea = 0.94 - swell - shadow * 0.45
    tone = np.where(mask > 0.5, land, sea)
    edge = (blur(mask, 1) > 0.15) & (mask < 0.5)
    tone = np.where(edge, 0.25, tone)  # coastline drawn

    N = Notes(hp.W, hp.H)
    sx, sy = hp.W / RW, hp.H / RH
    for k in range(1, 8):  # graticule: meridians and parallels, dashed
        N.line((hp.W * k / 8, 60), (hp.W * k / 8, hp.H - 60), w=1, dash=(10, 14))
    for k in range(1, 5):
        N.line((60, hp.H * k / 5), (hp.W - 60, hp.H * k / 5), w=1, dash=(10, 14))
    N.cross((ox * sx, oy * sy))
    N.cross(((ox + width * RES) * sx, (oy + 100 * RES) * sy))
    N.ruler(30, 120, hp.H - 120)
    compose(tone, N, out / "14-uk-relief.png", seed, lo=0.04, hi=0.97, gamma=1.1)


# ───────────────────────── History: colliery headframe ─────────────────────────
def plate_pithead(out: Path, seed: int):
    TOP = 27.0
    legs = [(sx, sz) for sx in (-2.6, 2.6) for sz in (-2.6, 2.6)]

    def frame_segments():
        S = []
        lerp = lambda a, b, t: tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
        base = [(sx, 0, sz) for sx, sz in legs]
        top = [(sx * 0.5, TOP, sz * 0.5) for sx, sz in legs]
        for a, b in zip(base, top):
            S.append((a, b))
        levels = np.linspace(0, 1, 7)
        for t0, t1 in zip(levels, levels[1:]):
            A = [lerp(a, b, t0) for a, b in zip(base, top)]
            B = [lerp(a, b, t1) for a, b in zip(base, top)]
            for i, j in ((0, 1), (2, 3), (0, 2), (1, 3)):
                S.append((A[i], B[j]))
                S.append((A[j], B[i]))
                S.append((B[i], B[j]))
        for sx in (-1.3, 1.3):  # back stays to the engine house
            S.append(((sx, TOP, -1.3), (sx * 2.4, 0, -17)))
            S.append(((sx, TOP * 0.55, -6.5), (sx * 2.4, 0, -17)))
        return S

    SEG = frame_segments()

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        d = y - 0.35 * fbm(x * 0.06, 0, z * 0.06, 3)
        d = np.minimum(d, caps(p, SEG, 0.28))
        for sx in (-1.4, 1.4):
            c = (sx, TOP + 3.0, 0.0)
            d = np.minimum(d, torus_x(p, c, 3.2, 0.22))
            spokes = [(c, (sx, c[1] + 3.2 * math.sin(a), 3.2 * math.cos(a))) for a in np.linspace(0, math.pi, 4, endpoint=False)]
            spokes += [(c, (sx, c[1] - 3.2 * math.sin(a), -3.2 * math.cos(a))) for a in np.linspace(0, math.pi, 4, endpoint=False)]
            d = np.minimum(d, caps(p, spokes, 0.12))
        d = np.minimum(d, sd_box(p, np.array([0.0, TOP + 0.4, 0.0]), np.array([2.2, 0.4, 1.6])))  # pulley deck
        house = sd_box(p, np.array([0.0, 5.0, -24.0]), np.array([7.0, 5.0, 5.5]))
        roof = np.maximum(sd_box(p, np.array([0.0, 11.5, -24.0]), np.array([7.6, 2.0, 6.0])), (np.abs(z + 24) * 0.55 + (y - 13.2)) * 0.85)
        d = np.minimum(d, np.minimum(house, roof))
        taper = 1.9 - 0.016 * np.clip(y, 0, 52)
        stack = np.maximum(np.hypot(x - 15, z + 31) - taper, np.abs(y - 26) - 26)
        d = np.minimum(d, stack)
        heap = (np.hypot(x + 36, z + 46) * 0.55 + y - 16) * 0.85
        return np.minimum(d, heap)

    def albedo(p, n):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        ground = y < 0.4
        brick = 0.5 + 0.12 * (np.abs(np.sin(y * 6.0)) < 0.2) + 0.08 * fbm(x * 0.6, y * 0.6, z * 0.6, 2)
        steel = 0.86
        heap = 0.38 + 0.12 * fbm(x * 0.3, y * 0.3, z * 0.3, 3)
        a = np.where(ground, 0.62 + 0.1 * fbm(x * 0.1, 0, z * 0.1, 2), steel)
        a = np.where((z < -17) & (np.abs(x) < 8) & (y > 0.3), brick, a)
        a = np.where((np.hypot(x - 15, z + 31) < 2.4) & (y > 0.3), brick, a)
        return np.where(np.hypot(x + 36, z + 46) < 32 - y * 1.6, np.where(ground, a, heap), a)

    cam = Cam((36, 7, 32), (-2, 16, -10), 50, RW, RH)
    tone, _, _ = render(sdf, cam, (0.6, 0.55, 0.55), sky_fn(), albedo, ao_scale=0.7, fog=0.006)
    # winding ropes: from each wheel to the engine house, drawn as line work
    N = frame_notes(cam, marks=[(0, TOP + 3, 0), (15, 52, -31)], dims=[(hp.W - 140, (0, TOP + 6.2, 0), (0, 0, 0), "")])
    for sx in (-1.4, 1.4):
        (a, _) = cam.project([(sx, TOP + 6.2, 0.0)], hp.W, hp.H)
        (b, _) = cam.project([(sx * 0.6, 9.0, -18.6)], hp.W, hp.H)
        N.line(a[0], b[0], 2)
        (c, _) = cam.project([(sx, TOP + 3.0, 3.2)], hp.W, hp.H)
        (g, _) = cam.project([(sx, 0.0, 3.2)], hp.W, hp.H)
        N.line(c[0], g[0], 2, dash=(14, 8))
    compose(tone, N, out / "15-pithead.png", seed, lo=0.05, hi=0.95, gamma=1.2)


PLATES = {
    "port": plate_port,
    "crowd": plate_crowd,
    "polling": plate_polling,
    "viaduct": plate_viaduct,
    "relief": plate_relief,
    "pithead": plate_pithead,
}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(PLATES))
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--bare", action="store_true")
    ap.add_argument("--mask", action="store_true")
    ap.add_argument("--size", default="2400x1350")
    ap.add_argument("--prefix", default="l-")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    hp.BARE, hp.MASK, hp.PREFIX = a.bare, a.mask, a.prefix
    hp.W, hp.H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        PLATES[name.strip()](a.out, a.seed)


if __name__ == "__main__":
    main()
