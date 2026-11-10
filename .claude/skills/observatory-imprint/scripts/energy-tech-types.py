# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Energy Field Guide specimen plates + motion atlases — matched set for Domain 06.

One plate per Field Guide technology, each a recognisable British scene:
  offshore   turbine on monopile + transition piece, farm behind, sea      · rotors turn, sea drifts
  onshore    turbine on a hilltop over field patchwork, ridge turbines     · rotors turn
  solar      ground-mounted rows with cell grids, mown grass               · a cloud shadow passes
  hydro      curved concrete dam across a valley, reservoir, spillway      · spillway + river flow
  bioenergy  storage domes, conveyor, boiler house, tall stack            · plume drifts
  nuclear    reactor dome + turbine hall + vent stack on the coast        · sea drifts

Same light, ground and screen, so forms compare as illustrative specimens —
plate area is NOT capacity. Numbers live in the UI.

Every loop is seamless (rotor 120°, periodic noise phases), so the atlas plays forever.

Usage:
  uv run energy-tech-types.py OUT_DIR [--only offshore,...] [--size 1000x1000] [--frames 20] [--no-atlas]
Writes OUT_DIR/e-<id>.png (mask for <Plate>, frame 0) and
       OUT_DIR/e-<id>-atlas-<cols>x<rows>-<fw>.jpg (grayscale tone atlas for <HalftoneMotion>).
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

TAU = 2 * math.pi
LIGHT = P.nrm(np.array([-0.55, 0.7, -0.45]))
# Tone curve shared by the static plate and the atlas, so frame 0 matches the still.
LO, HI, GAMMA = 0.04, 0.92, 1.2


# ───────────────────────── helpers ─────────────────────────
def box(p, c, b):
    return P.sd_box(p, np.array(c, float), np.array(b, float))


def cyl(p, c, r, y0, y1):
    """Vertical capped cylinder at (c.x, c.z)."""
    d = np.hypot(p[:, 0] - c[0], p[:, 2] - c[1]) - r
    return np.maximum(d, np.maximum(y0 - p[:, 1], p[:, 1] - y1))


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def loop_noise(x, z, t, period, scale=1.0, octaves=3):
    """fbm that is periodic in x (period) and drifts one full period as t goes 0→1."""
    th = TAU * (x / period - t)
    R = period / TAU * scale
    return P.fbm(R * np.cos(th), R * np.sin(th), z * scale, octaves)


def sky(rd):
    el = np.clip(rd[:, 1], 0, 1)
    return np.clip(0.995 - el * 0.04, 0, 1)


def fade(p, a, r0=28.0, r1=60.0, cx=0.0, cz=0.0):
    """Fade far ground to paper, so each specimen sits on a vignette."""
    f = sstep(r0, r1, np.hypot(p[:, 0] - cx, p[:, 2] - cz))
    return a * (1 - f) + 1.2 * f


def is_flat(n):
    return n[:, 1] > 0.85


# ───────────────────────── render (geometry cached for albedo-only motion) ─────────────────────────
class Geo:
    def __init__(self, sdf, cam):
        self.cam = cam
        rd = cam.rays()
        t, hit = P.march(sdf, cam.pos, rd, steps=160)
        self.rd, self.hit = rd, hit
        p = cam.pos + rd[hit] * t[hit, None]
        n = P.normals(sdf, p)
        self.p, self.n = p, n
        self.dif = np.clip(n @ LIGHT, 0, 1)
        self.sh = P.shadow(sdf, p + n * 0.03, LIGHT)
        self.oc = P.ao(sdf, p, n, 0.45)

    def shade(self, albedo, t, sunmod=None, amb=0.44, sun=0.95):
        out = sky(self.rd)
        sunk = self.dif * self.sh
        if sunmod is not None:
            sunk = sunk * sunmod(self.p, t)
        out[self.hit] = albedo(self.p, self.n, t) * (amb * self.oc + sun * sunk)
        return out.reshape(self.cam.h, self.cam.w)


    def to_paper(self, tone, fn):
        """Blend lit surfaces to paper by fn(p) in 0..1, whatever their shading — a specimen on white."""
        f = np.zeros(self.hit.size)
        f[self.hit] = fn(self.p)
        f = f.reshape(tone.shape)
        return tone * (1 - f) + f


def turbine(p, base, s, rot, hub_h=18.0, blade=12.0, tower_y0=0.0):
    """Three-blade turbine; tower from base.y up to hub. Facing -z."""
    q = (p - base) / s
    tower = np.maximum(
        np.hypot(q[:, 0], q[:, 2]) - (0.8 - 0.018 * q[:, 1]),
        np.maximum(tower_y0 - q[:, 1], q[:, 1] - hub_h),
    )
    nac = box(q, (0, hub_h + 0.1, 0.9), (0.7, 0.7, 1.8))
    hub = P.sd_sphere(q, np.array([0.0, hub_h, -1.1]), 0.8)
    d = np.minimum.reduce([tower, nac, hub])
    for k in range(3):
        a = rot + k * TAU / 3
        r = q - np.array([0.0, hub_h, -1.4])
        x = r[:, 0] * math.cos(-a) - r[:, 1] * math.sin(-a)
        y = r[:, 0] * math.sin(-a) + r[:, 1] * math.cos(-a)
        loc = np.stack([x, y, r[:, 2]], -1)
        width = 0.6 - 0.42 * np.clip(y / blade, 0, 1)
        qd = np.abs(loc - np.array([0, blade / 2 + 0.4, 0])) - np.stack(
            [width, np.full_like(width, blade / 2), np.full_like(width, 0.12)], -1
        )
        bl = np.linalg.norm(np.maximum(qd, 0), axis=-1) + np.minimum(qd.max(-1), 0)
        d = np.minimum(d, bl * 0.8)
    return d * s


def sea_lines(p, t, k=0.9, base=0.66, depth=0.3):
    """Wave lines across the sea that drift toward the camera, one cycle per loop."""
    x, z = p[:, 0], p[:, 2]
    warp = 2.2 * (loop_noise(x, z * 0.3, 0.0, 120.0, 0.08, 2) - 0.5)
    w = np.sin(z * k + warp + TAU * t)
    line = sstep(0.55, 0.9, w)
    return base - depth * line


# ───────────────────────── scenes ─────────────────────────
# Each returns (cam_args, sdf_for(t) or sdf, albedo(p, n, t), sunmod, overlay, moving_geometry)


def scene_offshore():
    def sdf_for(t):
        rot = 0.35 + TAU / 3 * t

        def sdf(p):
            sea = p[:, 1]
            pile = cyl(p, (0, 0), 1.0, -2, 3.0)
            tp = cyl(p, (0, 0), 1.15, 3.0, 6.0)
            deck = box(p, (0, 6.1, 0), (2.4, 0.15, 2.4))
            main = turbine(p, np.array([0.0, 6.2, 0.0]), 1.0, rot, hub_h=19.0, blade=13.0)
            far1 = np.minimum(
                cyl(p, (-12, 70), 1.15, -1, 6.0), turbine(p, np.array([-12.0, 6.2, 70.0]), 1.0, rot + 0.9, 19.0, 13.0)
            )
            far2 = np.minimum(
                cyl(p, (24, 120), 1.15, -1, 6.0), turbine(p, np.array([24.0, 6.2, 120.0]), 1.0, rot + 1.7, 19.0, 13.0)
            )
            return np.minimum.reduce([sea, pile, tp, deck, main, far1, far2])

        return sdf

    def albedo(p, n, t):
        y = p[:, 1]
        a = np.full(len(p), 0.9)
        r0 = np.hypot(p[:, 0], p[:, 2])
        r1 = np.hypot(p[:, 0] + 12, p[:, 2] - 70)
        r2 = np.hypot(p[:, 0] - 24, p[:, 2] - 120)
        near = np.minimum.reduce([r0, r1, r2]) < 1.4
        a = np.where(near & (y < 3.0), 0.32, a)  # monopile
        a = np.where(near & (y >= 3.0) & (y < 6.0), 0.55, a)  # transition piece
        a = np.where((y > 5.9) & (y < 6.3) & (r0 < 2.6), 0.4, a)  # deck edge
        sea = (y < 0.3) & ~near
        s = fade(p, sea_lines(p, t, 0.9, 0.72, 0.26), 45, 120, 0, 10)
        return np.where(sea, s, a)

    cam = ((-22, 9, -52), (-3, 17.5, 10), 44)
    return cam, sdf_for, albedo, None, None, True


def hill_h(x, z):
    h = 3.6 * np.exp(-(x**2 + (z - 4) ** 2) / 520)
    h += 9.0 * np.exp(-((z - 92) ** 2) / 900) * (0.75 + 0.25 * np.cos(x * 0.03))
    return h + 0.6 * (P.fbm(x * 0.05, 0, z * 0.05, 3) - 0.5)


def scene_onshore():
    b0 = float(hill_h(np.array([0.0]), np.array([0.0]))[0])
    b1 = float(hill_h(np.array([-14.0]), np.array([88.0]))[0])
    b2 = float(hill_h(np.array([24.0]), np.array([96.0]))[0])

    def sdf_for(t):
        rot = 0.9 + TAU / 3 * t

        def sdf(p):
            ground = (p[:, 1] - hill_h(p[:, 0], p[:, 2])) * 0.7
            pad = box(p, (0, b0 - 0.2, 0), (2.0, 0.35, 2.0))
            main = turbine(p, np.array([0.0, b0, 0.0]), 1.0, rot, hub_h=19.0, blade=13.0, tower_y0=-1.0)
            t1 = turbine(p, np.array([-14.0, b1, 88.0]), 1.0, rot + 1.1, 19.0, 13.0, -1.0)
            t2 = turbine(p, np.array([24.0, b2, 96.0]), 1.0, rot + 2.0, 19.0, 13.0, -1.0)
            return np.minimum.reduce([ground, pad, main, t1, t2])

        return sdf

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        gy = hill_h(x, z)
        ground = (y - gy) < 0.25
        # Field patchwork with hedgerows (darker lines at field edges).
        cx, cz = np.floor((x + 3) / 16), np.floor((z + 5) / 13)
        tint = 0.74 + 0.14 * (P.h3(cx.astype(int), 3, cz.astype(int)) - 0.5)
        fx, fz = np.mod(x + 3, 16), np.mod(z + 5, 13)
        hedge = (fx < 0.55) | (fz < 0.55)
        rows = np.mod(x * 0.9 + cz * 0.4, 1.0) < 0.12
        f = np.where(hedge, 0.3, np.where(rows, tint - 0.08, tint))
        f = np.where(np.abs(x) < 2.2, np.where(np.abs(z) < 2.2, 0.82, f), f)
        a = np.where(ground, fade(p, f, 55, 140, 0, 30), 0.92)
        return a

    cam = ((-22, 12, -52), (-3, 18.5, 10), 44)
    return cam, sdf_for, albedo, None, None, True


SOLAR_TILT = math.radians(28)
SOLAR_ROWS = (-6.0, -0.5, 5.0, 10.5)


def solar_local(p, zc):
    q = p - np.array([0.0, 1.35, zc])
    ct, st = math.cos(SOLAR_TILT), math.sin(SOLAR_TILT)
    y = q[:, 1] * ct + q[:, 2] * st
    z = -q[:, 1] * st + q[:, 2] * ct
    return np.stack([q[:, 0], y, z], -1)


def scene_solar():
    def sdf(p):
        ground = p[:, 1]
        parts = [ground]
        for zc in SOLAR_ROWS:
            parts.append(P.sd_box(solar_local(p, zc), np.zeros(3), np.array([11.0, 1.35, 0.06])))
            for xp in np.arange(-10.0, 10.5, 2.5):
                parts.append(P.sd_capsule(p, np.array([xp, 0.0, zc + 0.6]), np.array([xp, 1.4, zc + 0.6]), 0.06))
                parts.append(P.sd_capsule(p, np.array([xp, 0.0, zc - 0.5]), np.array([xp, 0.8, zc - 0.5]), 0.06))
        return np.minimum.reduce(parts)

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = np.full(len(p), 0.55)
        for zc in SOLAR_ROWS:
            loc = solar_local(p, zc)
            on = (np.abs(loc[:, 0]) < 11.1) & (np.abs(loc[:, 1]) < 1.45) & (np.abs(loc[:, 2]) < 0.2)
            gx = np.mod(loc[:, 0] + 11, 1.1) < 0.07
            gy = np.mod(loc[:, 1] + 1.35, 0.68) < 0.05
            edge = (np.abs(loc[:, 0]) > 10.85) | (np.abs(loc[:, 1]) > 1.25)
            face = np.where(gx | gy, 0.62, 0.14)
            face = np.where(edge, 0.75, face)
            a = np.where(on, face, a)
        grass = (y < 0.3) & is_flat(n)
        mown = 0.8 + 0.06 * (np.mod(x * 0.25, 1) < 0.5)
        a = np.where(grass, fade(p, mown, 18, 40, 0, 2), a)
        return a

    def sunmod(p, t):
        c = loop_noise(p[:, 0] + p[:, 2] * 0.4, p[:, 2], t, 60.0, 0.09, 3)
        shade = sstep(0.48, 0.62, c) * (1 - sstep(16, 30, np.hypot(p[:, 0], p[:, 2] - 2)))
        return 1 - 0.75 * shade

    cam = ((-15, 10.5, -21), (0.5, -0.4, 2.5), 46)
    return cam, sdf, albedo, sunmod, None, False


DAM_H = 16.0


def dam_back(y):
    """Downstream offset of the sloping face (gravity profile): wide base, narrow crest."""
    return 1.4 + 9.0 * (1 - np.clip(y, 0, DAM_H) / DAM_H)


def valley_h(x, z):
    ax = np.abs(x)
    h = 20.0 * sstep(13.0, 30.0, ax)
    return h + 1.4 * (P.fbm(x * 0.08, 1.0, z * 0.08, 3) - 0.5)


def scene_hydro():
    """Straight concrete gravity dam across a glen: reservoir behind, spillway, power house at the foot."""

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        terrain = (y - valley_h(x, z)) * 0.6
        dam = np.maximum.reduce([z - 0.0, (-z - dam_back(y)) * 0.75, y - DAM_H, -y - 1, np.abs(x) - 26])
        crest = box(p, (0, DAM_H + 0.35, -0.7), (26, 0.35, 1.0))
        res = np.maximum(y - (DAM_H - 1.2), -z - 0.2)
        sheet = np.maximum.reduce([np.abs(-z - dam_back(y) - 0.15) * 0.75 - 0.15, np.abs(x) - 2.6, y - DAM_H, -y])
        house = box(p, (9.0, 2.6, -15.0), (4.2, 2.6, 3.0))
        roof = box(p, (9.0, 5.35, -15.0), (4.5, 0.2, 3.3))
        pipes = np.minimum(
            P.sd_capsule(p, np.array([7.6, DAM_H - 2.0, -2.2]), np.array([7.6, 3.5, -12.2]), 0.45),
            P.sd_capsule(p, np.array([10.4, DAM_H - 2.0, -2.2]), np.array([10.4, 3.5, -12.2]), 0.45),
        )
        river = np.maximum.reduce([y - 0.3, np.abs(x + 1.0 * np.sin(z * 0.08)) - 3.2, z + 10.0])
        return np.minimum.reduce([terrain, dam, crest, res, sheet, house, roof, pipes, river])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        land = 0.9 + 0.08 * (P.fbm(x * 0.3, y * 0.3, z * 0.3, 3) - 0.5)
        a = land
        face = (z < 0.3) & (z > -dam_back(y) - 0.6) & (y > 0.2) & (y < DAM_H + 0.8) & (np.abs(x) < 26.2)
        lifts = np.mod(y, 1.6) < 0.1
        joints = np.mod(x + 26, 4.0) < 0.12
        a = np.where(face, np.where(lifts | joints, 0.42, 0.62), a)
        a = np.where((y > DAM_H) & (n[:, 1] > 0.6) & (np.abs(x) < 26.2), 0.9, a)  # crest road
        sheet = face & (np.abs(x) < 2.7) & (y < DAM_H + 0.1)
        streak = np.sin(y * 3.0 + TAU * 2 * t) * 0.5 + 0.5
        a = np.where(sheet, 0.92 - 0.35 * sstep(0.8, 0.97, streak), a)
        res = (z > 0.1) & (y > DAM_H - 1.4) & (y < DAM_H - 1.0)
        a = np.where(res, sea_lines(p, t, 1.0, 0.5, 0.2), a)
        house = (np.abs(x - 9) < 4.7) & (np.abs(z + 15) < 3.6) & (y > 0.2)
        win = house & (np.abs(n[:, 1]) < 0.3) & (np.mod(x * 1.2, 1.4) < 0.5) & (y > 1.6) & (y < 4.2)
        a = np.where(house, np.where(win, 0.3, 0.82), a)
        pipe = (np.minimum(np.abs(x - 7.6), np.abs(x - 10.4)) < 0.6) & (z < -1.5) & (z > -12.8) & ~house
        a = np.where(pipe & (y > 2.5), 0.38, a)
        river = (y > 0.15) & (y < 0.45) & (z < -9.5)
        flow = np.sin(z * 1.3 + 0.6 * np.sin(x * 0.7) + TAU * t) * 0.5 + 0.5
        a = np.where(river, 0.55 + 0.3 * sstep(0.55, 0.9, flow), a)
        return a

    cam = ((-14, 36, -72), (1, 6.0, 0), 44)
    return cam, sdf, albedo, None, None, False


STACK = np.array([22.0, 50.0, 12.0])


def scene_bioenergy():
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        ground = y
        parts = [ground]
        for cx, cz in ((-17.0, 2.0), (-31.0, 10.0)):
            drum = cyl(p, (cx, cz), 7.0, 0, 3.0)
            dome = np.maximum(P.sd_sphere(p, np.array([cx, 3.0, cz]), 7.0), 3.0 - y)
            parts += [drum, dome]
        parts.append(P.sd_capsule(p, np.array([-11.0, 9.0, 2.0]), np.array([5.5, 22.0, 2.0]), 0.9))
        parts.append(P.sd_capsule(p, np.array([-31.0, 10.6, 10.0]), np.array([-17.0, 10.6, 2.0]), 0.7))
        parts.append(box(p, (11, 13, 3), (5.5, 13, 6.5)))
        parts.append(box(p, (11, 26.2, 3), (5.8, 0.3, 6.8)))
        parts.append(box(p, (12, 5.5, -10), (8.5, 5.5, 5.5)))
        tap = 1.9 - 0.012 * y
        parts.append(np.maximum(np.hypot(x - STACK[0], z - STACK[2]) - tap, np.maximum(-y, y - STACK[1])))
        return np.minimum.reduce(parts)

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = 0.8 + 0.05 * (P.fbm(x * 1.5, y * 1.5, z * 1.5, 2) - 0.5)
        dome = np.minimum(np.hypot(x + 17, z - 2), np.hypot(x + 31, z - 10)) < 7.3
        a = np.where(dome & (y > 0.2), 0.9 - 0.12 * (np.mod(y * 1.2, 1) < 0.08), a)
        hall = (np.abs(x - 11) < 5.7) & (y > 0.3) & (y < 26)
        clad = np.mod(x * 1.4 + z * 1.4, 1) < 0.14
        a = np.where(hall & (np.abs(n[:, 1]) < 0.3) & clad, 0.58, a)
        stack = np.hypot(x - STACK[0], z - STACK[2]) < 2.2
        band = (np.abs(y - (STACK[1] - 2.5)) < 1.0) | (np.abs(y - 18) < 0.5)
        a = np.where(stack & (y > 0.3), np.where(band, 0.35, 0.74), a)
        conv = (y > 8) & (y < 23) & ~hall & ~dome & ~stack
        a = np.where(conv & (np.abs(n[:, 1]) < 0.7), 0.5, a)
        grass = (y < 0.3) & is_flat(n)
        a = np.where(grass, fade(p, 0.84 + 0.04 * (P.fbm(x * 0.2, 0, z * 0.2, 2) - 0.5), 34, 70, 2, 4), a)
        return a

    def overlay(tone, cam, t):
        return plume(tone, cam, STACK + np.array([0.0, 0.3, 0.0]), t, strength=0.85)

    cam = ((-50, 24, -64), (-9, 23, 8), 54)
    return cam, sdf, albedo, None, overlay, False


def plume(tone, cam, top, t, strength=0.5):
    """Drifting plume in screen space from a stack top. Loops in t."""
    h, w = tone.shape
    xy, _ = cam.project([top], w, h)
    sx, sy = xy[0]
    d = np.array([1.0, -0.2])
    d /= np.linalg.norm(d)
    nrm_ = np.array([-d[1], d[0]])
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rx, ry = xx - sx, yy - sy
    L = 0.5 * w
    s = (rx * d[0] + ry * d[1]) / L
    u = (rx * nrm_[0] + ry * nrm_[1]) / ((0.014 + 0.09 * np.clip(s, 0, 1)) * w)
    th = TAU * (s * 1.5 - t)
    R = 1.4
    nz = P.fbm((R * np.cos(th)).ravel() + 3, (R * np.sin(th)).ravel(), (u * 0.45).ravel(), 4).reshape(h, w)
    dens = np.exp(-(u**2) * 0.9) * (1 - np.clip(s, 0, 1)) ** 1.3 * sstep(-0.01, 0.04, s) * (s < 1)
    dens = dens * sstep(0.38, 0.72, nz) * 1.25
    k = np.clip(dens, 0, 1) * strength
    return tone * (1 - k) + 0.45 * k


def scene_nuclear():
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        land = np.maximum(y, -(z + 15.0))  # land ends at a shoreline
        beach = np.maximum(y + 0.15, np.maximum(-(z + 22.0), z + 15.0))
        sea = y + 0.35
        rx = cyl(p, (0, 2), 8.0, 0, 12.0)
        dome = np.maximum(P.sd_sphere(p, np.array([0.0, 12.0, 2.0]), 8.0), 12.0 - y)
        th = box(p, (18, 7, 3), (9.5, 7, 7))
        aux = box(p, (-6, 3.2, 14), (11, 3.2, 5))
        side = box(p, (-11, 4.5, 0), (3.5, 4.5, 5))
        vent = cyl(p, (-15.0, 6.0), 0.75, 0, 30.0)
        return np.minimum.reduce([land, beach, sea, rx, dome, th, aux, side, vent])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = np.full(len(p), 0.8)
        dome = (np.hypot(x, z - 2) < 8.3) & (y > 0.2)
        a = np.where(dome, np.where(y > 12, 0.8 - 0.14 * (np.mod(np.arcsin(np.clip((y - 12) / 8, 0, 1)) * 7, 1) < 0.1), 0.74 - 0.12 * (np.mod(y, 2.4) < 0.12)), a)
        th = (np.abs(x - 18) < 9.7) & (y > 0.2)
        clad = np.mod(x * 1.1, 1) < 0.16
        a = np.where(th & (np.abs(n[:, 1]) < 0.3), np.where(clad, 0.56, 0.78), a)
        vent = np.hypot(x + 15, z - 6) < 1.0
        a = np.where(vent & (y > 0.2), np.where(np.mod(y, 6) < 0.6, 0.35, 0.82), a)
        land = (y > -0.1) & (y < 0.3) & (z > -15) & is_flat(n)
        a = np.where(land, fade(p, 0.82 + 0.05 * (P.fbm(x * 0.2, 0, z * 0.2, 2) - 0.5), 40, 80, 4, 4), a)
        beach = (y < 0.0) & (z > -22.3) & (z <= -15)
        a = np.where(beach, fade(p, 0.7 + 0.1 * (P.fbm(x * 2, 0, z * 2, 2) - 0.5), 45, 90, 4, 0), a)
        sea = (y < -0.2) & (z <= -22.3)
        a = np.where(sea, fade(p, sea_lines(p, t, 0.8, 0.7, 0.22), 60, 130, 4, -10), a)
        return a

    cam = ((-38, 17, -60), (4, 11, 2), 42)
    return cam, sdf, albedo, None, None, False


# Scenes whose ground would otherwise fill the square: fade everything to paper around the subject.
PAPER = {
    "solar": lambda p: sstep(24.0, 34.0, np.hypot(p[:, 0], p[:, 2] - 2.0)),
    "hydro": lambda p: np.maximum(sstep(20.0, 38.0, np.hypot(p[:, 0] * 0.85, (p[:, 2] + 4.0) * 1.1)), 0.55 * sstep(15.0, 26.0, np.abs(p[:, 0])) * (p[:, 1] > 1.0)),
}

SCENES = {
    "offshore": scene_offshore,
    "onshore": scene_onshore,
    "solar": scene_solar,
    "hydro": scene_hydro,
    "bioenergy": scene_bioenergy,
    "nuclear": scene_nuclear,
}


# ───────────────────────── output ─────────────────────────
def curve(tone):
    return np.clip((np.clip(tone, 0, 1) - LO) / (HI - LO), 0, 1) ** GAMMA


def cross_points(w, h):
    m = w * 0.05
    return [(m, m), (w - m, m), (m, h - m), (w - m, h - m)], w * 0.018


def write_plate(tone_small, path, seed):
    from PIL import Image

    size = (P.W, P.H)
    tone = (
        np.asarray(
            Image.fromarray((np.clip(tone_small, 0, 1) * 255).astype(np.uint8)).resize(size, Image.Resampling.LANCZOS),
            np.float32,
        )
        / 255
    )
    tone = curve(tone)
    ink = P.halftone(tone, cell=5.2, seed=seed)
    ink &= tone < 0.985
    N = P.Notes(P.W, P.H)
    pts, s = cross_points(P.W, P.H)
    for c in pts:
        N.cross(c, s=s, w=2)
    ink = N.apply(ink)
    if P.MASK:
        a = np.zeros((*ink.shape, 2), np.uint8)
        a[..., 0] = 255
        a[..., 1] = ink * 255
        Image.fromarray(a, "LA").save(path, optimize=True)
    else:
        rgb = np.where(ink[..., None], np.array(P.INK, np.uint8), np.array(P.PAPER, np.uint8))
        Image.fromarray(rgb).quantize(colors=2).save(path, optimize=True)
    print(f"saved {path}", flush=True)


def frame_with_crosses(tone):
    """Atlas frame: same curve as the plate, registration crosses drawn as solid ink (tone 0)."""
    f = curve(tone).copy()
    h, w = f.shape
    pts, s = cross_points(w, h)
    for cx, cy in pts:
        cx, cy, s2 = int(round(cx)), int(round(cy)), int(round(s))
        f[cy, max(cx - s2, 0) : cx + s2 + 1] = 0
        f[max(cy - s2, 0) : cy + s2 + 1, cx] = 0
    return f


def build(name, out, seed, frames, atlas, cols=4):
    from PIL import Image

    cam_args, sdf_or, albedo, sunmod, overlay, moving = SCENES[name]()
    w, h = P.W // 2, P.H // 2
    cam = P.Cam(cam_args[0], cam_args[1], cam_args[2], w, h)
    static_geo = None if moving else Geo(sdf_or, cam)

    def tone_at(t):
        geo = Geo(sdf_or(t), cam) if moving else static_geo
        tone = geo.shade(albedo, t, sunmod)
        tone = np.nan_to_num(tone, nan=0.9)
        if name in PAPER:
            tone = geo.to_paper(tone, PAPER[name])
        if overlay is not None:
            tone = overlay(tone, cam, t)
        return tone

    t0 = tone_at(0.0)
    write_plate(t0, out / f"e-{name}.png", seed)
    if not atlas:
        return
    tones = [t0] + [tone_at(k / frames) for k in range(1, frames)]
    rows = math.ceil(frames / cols)
    sheet = np.ones((rows * h, cols * w), np.float32)
    for k, tn in enumerate(tones):
        r_, c_ = divmod(k, cols)
        sheet[r_ * h : (r_ + 1) * h, c_ * w : (c_ + 1) * w] = frame_with_crosses(tn)
        print(f"  {name} frame {k + 1}/{frames}", flush=True)
    path = out / f"e-{name}-atlas-{cols}x{rows}-{w}.jpg"
    Image.fromarray((sheet * 255).astype(np.uint8), "L").save(path, quality=86, optimize=True)
    print(f"saved {path}", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(SCENES))
    ap.add_argument("--size", default="1000x1000")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--frames", type=int, default=20)
    ap.add_argument("--no-atlas", action="store_true")
    ap.add_argument("--preview", action="store_true", help="two-colour PNG instead of a mask")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE, P.MASK, P.PREFIX = True, not a.preview, ""
    P.W, P.H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        build(name.strip(), a.out, a.seed, a.frames, not a.no_atlas)


if __name__ == "__main__":
    main()
