# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Dwelling-type specimen plates for British Exchange (Census 2021 accommodation type).

One plate per type — detached, semi-detached, terraced, purpose-built flat, other
(static caravan) — drawn as a matched set: the same camera, light, ground, scale and
screen, so the buildings compare at true relative size. Same engine as the site plates
(raymarched 3D, 45° halftone in one ink, line work knocked out).

Usage:
  uv run dwelling-types.py OUT_DIR [--only detached,semi,...] [--size 1000x1000]
  uv run dwelling-types.py OUT_DIR --only owner,private,social        # tenure set
Writes OUT_DIR/d-<type>.png (dwelling types) and t-<tenure>.png (tenure) masks for <Plate>.
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

STOREY = 2.8


# ───────────────────────── shared pieces ─────────────────────────
def gable(p, cx, cz, hx, hz, y0, k):
    """Gable roof, ridge along x, eaves at y0, pitch k, overhang built into hx/hz."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    top = y0 + k * hz
    return np.maximum.reduce([(y - top + k * np.abs(z - cz)) / math.hypot(1, k), y0 - y, np.abs(x - cx) - hx])


def hipped(p, cx, cz, ra, rb, y0, k):
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    rise = np.minimum(ra - np.abs(x - cx), rb - np.abs(z - cz))
    return np.maximum((y - y0 - k * rise) / math.hypot(1, k), y0 - y)


def box(p, c, b):
    return P.sd_box(p, np.array(c, float), np.array(b, float))


def sky(rd):
    el = np.clip(rd[:, 1], 0, 1)
    return np.clip(0.985 - el * 0.08, 0, 1)  # near-blank sheet: the building is the specimen


def ground_albedo(p):
    x, z = p[:, 0], p[:, 2]
    # kept light so the building is the specimen and the sheet stays clean
    lawn = 0.84 + 0.06 * (P.fbm(x * 0.35, 0, z * 0.35, 3) - 0.5)
    g = np.where(z > -6.5, lawn, 0.97)  # plot, then pavement
    g = np.where(z < -8.5, 0.93, g)  # carriageway
    g = np.where(z < -8.3, np.where(z > -8.7, 0.62, g), g)  # kerb line
    # the plot vignettes to bare paper: no horizon band, no distant ground texture
    f = np.clip((np.hypot(x * 0.8, z) - 16.0) / 14.0, 0, 1)
    return g * (1 - f) + 1.3 * f


def windows(p, n, pitch, w0, w1, top, off=0.0, sill=1.0, head=2.15):
    """Window panes on walls: storey bands, columns every `pitch` m from `off`."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    vertical = np.abs(n[:, 1]) < 0.35
    a = np.where(np.abs(n[:, 2]) > np.abs(n[:, 0]), x, z)
    yy = np.mod(y, STOREY)
    col = np.mod(a - off, pitch)
    return vertical & (y < top) & (yy > sill) & (yy < head) & (col > w0) & (col < w1)


def glass(p):
    x, y = p[:, 0], p[:, 1]
    bars = (np.mod(x * 2.0, 1) < 0.1) | (np.mod(y * 1.8, 1) < 0.09)
    return np.where(bars, 0.72, 0.1)


def brick(p):
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    return 0.6 - 0.07 * (np.mod(y * 4, 1) < 0.14) + 0.08 * (P.fbm(x * 3, y * 6, z * 3, 2) - 0.5)


def render_set(name, sdf, albedo, frontage, height, out, seed, z_front, prefix="d"):
    w, h = P.W // 2, P.H // 2
    # one camera for every type: raised three-quarter view from the front left
    cam = P.Cam((-27, 15.5, -40), (0.8, 4.6, 0.0), 33, w, h)
    tone, _, _ = P.render(sdf, cam, (-0.55, 0.7, -0.45), sky, albedo, ao_scale=0.4, fog=0.0, amb=0.42, sun=1.0)
    tone = np.nan_to_num(tone, nan=0.85)

    N = P.Notes(P.W, P.H)
    m = P.W * 0.05
    for cx, cy in ((m, m), (P.W - m, m), (m, P.H - m), (P.W - m, P.H - m)):
        N.cross((cx, cy), s=P.W * 0.018, w=2)
    # measured: the frontage under the building
    a, _ = cam.project([(-frontage / 2, 0.0, z_front)], P.W, P.H)
    b, _ = cam.project([(frontage / 2, 0.0, z_front)], P.W, P.H)
    ybar = max(a[0][1], b[0][1]) + P.H * 0.06
    N.line((a[0][0], ybar), (b[0][0], ybar), w=2)
    for xx in (a[0][0], b[0][0]):
        N.line((xx, ybar - 10), (xx, ybar + 10), w=2)
        N.line((xx, ybar - 10), (xx, ybar - 26), w=1, dash=(4, 5))
    compose_clean(tone, N, out / f"{prefix}-{name}.png", seed, lo=0.04, hi=0.9, gamma=1.25)


def compose_clean(tone_small, notes, path, seed, lo, hi, gamma, cell=5.2):
    """P.compose, but pure paper stays paper: no stray grain dots where the tone is white."""
    from PIL import Image
    size = (P.W, P.H)
    tone = np.asarray(Image.fromarray((np.clip(tone_small, 0, 1) * 255).astype(np.uint8)).resize(size, Image.Resampling.LANCZOS), np.float32) / 255
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


def is_ground(p, n):
    # march tolerance grows with distance, so far ground hits land a little above y = 0
    far = np.hypot(p[:, 0], p[:, 2])
    return (p[:, 1] < 0.06 + 0.002 * far) & ((n[:, 1] > 0.9) | (far > 40))


# ───────────────────────── the five types ─────────────────────────
def detached(out, seed):
    """Detached: a two-storey gabled house standing in its own plot, bay and porch, garden tree."""
    def sdf(p):
        body = box(p, (0, 2.8, 0), (4.4, 2.8, 3.6))
        roof = gable(p, 0, 0, 4.75, 4.0, 5.6, 0.85)
        chim = box(p, (4.1, 7.6, 0.6), (0.5, 2.0, 0.75))
        bay = box(p, (1.9, 1.4, -3.95), (1.25, 1.4, 0.45))
        bay_cap = box(p, (1.9, 2.9, -4.0), (1.4, 0.12, 0.55))
        porch = box(p, (-2.0, 1.25, -4.0), (0.85, 1.25, 0.5))
        porch_cap = gable(np.stack([p[:, 2] + 4.0, p[:, 1], p[:, 0] + 2.0], -1), 0, 0, 0.65, 1.05, 2.5, 0.8)
        hedge = box(p, (0, 0.55, -6.3), (7.5, 0.55, 0.35))
        hedge = np.maximum(hedge, -box(p, (-2.0, 0.6, -6.3), (0.9, 1.0, 0.6)))
        return np.minimum.reduce([p[:, 1], body, roof, chim, bay, bay_cap, porch, porch_cap, hedge])

    def albedo(p, n):
        y = p[:, 1]
        a = brick(p)
        win = windows(p, n, 2.2, 0.5, 1.55, 5.4, off=-4.4)
        a = np.where(win, glass(p), a)
        door = (n[:, 2] < -0.7) & (np.abs(p[:, 0] + 2.0) < 0.5) & (y < 2.1)
        a = np.where(door, 0.2, a)
        a = np.where((y > 5.55) & (n[:, 1] > 0.25), 0.3 + 0.07 * (np.mod(y * 4, 1) < 0.22), a)
        a = np.where((y < 1.15) & (np.abs(p[:, 2] + 6.3) < 0.45), 0.3 + 0.2 * P.fbm(p[:, 0] * 2, y * 2, 0, 2), a)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set("detached", sdf, albedo, 8.8, 7.8, out, seed, -3.6)


def semi(out, seed, name="semi-detached", prefix="d", extra=None):
    """Semi-detached: a mirrored interwar pair under one hipped roof, two-storey bays, shared chimney."""
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        body = box(p, (0, 2.8, 0), (5.2, 2.8, 3.8))
        roof = hipped(p, 0, 0, 5.65, 4.25, 5.6, 0.85)
        bq = np.stack([np.abs(x) - 2.7, y, z + 4.35], -1)
        bay = P.sd_box(bq, np.array([0, 2.6, 0]), np.array([1.15, 2.6, 0.6]))
        bay = np.maximum(bay, (np.abs(bq[:, 0]) * 0.7 - bq[:, 2] * 0.7) - 0.85)
        bay_cap = P.sd_box(bq, np.array([0, 5.3, 0]), np.array([1.3, 0.12, 0.72]))
        chim = box(p, (0, 8.1, 0.6), (0.6, 1.5, 0.9))
        porch = P.sd_box(np.stack([np.abs(x) - 4.6, y, z], -1), np.array([0, 1.3, -4.3]), np.array([0.5, 1.3, 0.55]))
        fence = box(p, (0, 0.6, 8.0), (0.06, 0.6, 4.2))
        hedge = np.maximum(box(p, (0, 0.5, -6.3), (8.5, 0.5, 0.35)), -P.sd_box(np.stack([np.abs(x) - 6.3, y, z], -1), np.array([0, 0.6, -6.3]), np.array([1.4, 1.0, 0.6])))
        d = np.minimum.reduce([y, body, roof, bay, bay_cap, chim, porch, fence, hedge])
        return d if extra is None else np.minimum(d, extra[0](p))

    def albedo(p, n):
        x, y = p[:, 0], p[:, 1]
        a = 0.76 + 0.05 * (P.fbm(x * 2, y * 2, p[:, 2] * 2, 2) - 0.5)  # rendered walls
        bays = (np.abs(np.abs(x) - 2.7) < 1.05) & (p[:, 2] < -3.9) & (np.abs(n[:, 1]) < 0.35) & (np.mod(y, STOREY) > 1.0) & (np.mod(y, STOREY) < 2.2) & (y < 5.2)
        side = windows(p, n, 3.0, 0.6, 1.6, 5.4, off=-1.0) & (np.abs(n[:, 0]) > 0.7)
        a = np.where(bays | side, glass(p), a)
        a = np.where((n[:, 2] < -0.7) & (np.abs(np.abs(x) - 4.6) < 0.4) & (y < 2.2), 0.2, a)
        a = np.where((y > 5.55) & (n[:, 1] > 0.2), 0.3 + 0.07 * (np.mod(y * 4, 1) < 0.22), a)
        a = np.where((y < 1.05) & (np.abs(p[:, 2] + 6.3) < 0.45), 0.3 + 0.2 * P.fbm(x * 2, y * 2, 0, 2), a)
        if extra is not None:
            a = extra[1](p, n, a)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set(name, sdf, albedo, 10.4, 8.6, out, seed, -3.8, prefix)


def terraced(out, seed, name="terraced", prefix="d", extra=None):
    """Terraced: four bay-fronted Victorian houses under one slate roof, stacks on the party walls."""
    HW, X0 = 4.6, -9.2

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        inx = np.abs(x) - 9.2
        walls = box(p, (0, 3.0, 0), (9.2, 3.0, 3.5))
        roof = np.maximum.reduce([(y - 9.0 + 0.77 * np.abs(z)) / math.hypot(1, 0.77), 6.0 - y, inx - 0.2])
        u = np.mod(x - X0, HW * 2) - HW
        chim = np.maximum(P.sd_box(np.stack([u, y, z], -1), np.array([0, 9.6, 0]), np.array([0.5, 1.5, 0.85])), inx - 0.5)
        b = np.mod(x - X0, HW) - HW * 0.36
        bq = np.stack([b, y, z], -1)
        bay = np.maximum(P.sd_box(bq, np.array([0, 1.75, -4.05]), np.array([1.05, 1.75, 0.6])), inx)
        bay_roof = np.maximum(P.sd_box(bq, np.array([0, 3.6, -4.1]), np.array([1.15, 0.12, 0.7])), inx)
        wall = np.maximum(box(p, (0, 0.4, -6.4), (9.2, 0.4, 0.14)), -P.sd_box(np.stack([np.mod(x - X0, HW) - HW * 0.82, y, z], -1), np.array([0, 0.4, -6.4]), np.array([0.5, 1.0, 0.5])))
        d = np.minimum.reduce([y, walls, roof, chim, bay, bay_roof, wall])
        return d if extra is None else np.minimum(d, extra[0](p))

    def albedo(p, n):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        u = np.mod(x - X0, HW)
        front = n[:, 2] < -0.7
        a = brick(p)
        up_win = front & (z < -3.4) & (y > 3.9) & (y < 5.5) & (((u > 0.55) & (u < 1.95)) | ((u > 2.7) & (u < 4.0)))
        door = front & (y < 2.5) & (u > 3.25) & (u < 4.05)
        bayglass = (z < -3.55) & (y > 0.75) & (y < 2.9) & (np.abs(u - HW * 0.36) < 1.1)
        a = np.where(up_win | bayglass, glass(p), np.where(door, 0.22, a))
        a = np.where((y > 6.02) & (y < 9.05) & (np.abs(n[:, 1]) > 0.3) & (np.abs(x) < 9.5), 0.38 + 0.07 * (np.mod((9 - y) * 3.2, 1) < 0.2), a)
        if extra is not None:
            a = extra[1](p, n, a)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set(name, sdf, albedo, 18.4, 9.0, out, seed, -3.5, prefix)


def flat(out, seed):
    """Purpose-built flats: a four-storey brick block, flat roof and parapet, balconies, stair core."""
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        body = box(p, (0, 5.6, 0), (9.6, 5.6, 5.0))
        parapet = np.maximum(box(p, (0, 11.55, 0), (9.6, 0.35, 5.0)), -box(p, (0, 11.8, 0), (9.35, 0.6, 4.75)))
        core = box(p, (-5.6, 6.4, -5.6), (1.5, 6.4, 0.7))
        parts = [y, body, parapet, core]
        for k in (1, 2, 3):
            for xc in (-0.6, 4.4):
                parts.append(box(p, (xc, STOREY * k - 0.1, -5.65), (1.7, 0.1, 0.65)))
                parts.append(box(p, (xc, STOREY * k + 0.45, -6.25), (1.7, 0.45, 0.05)))
        bins = box(p, (8.0, 0.65, -7.0), (1.4, 0.65, 0.8))
        parts.append(bins)
        return np.minimum.reduce(parts)

    def albedo(p, n):
        x, y = p[:, 0], p[:, 1]
        a = brick(p)
        win = windows(p, n, 2.5, 0.5, 1.9, 11.0, off=-9.6, sill=0.9, head=2.3)
        a = np.where(win, glass(p), a)
        core_glass = (n[:, 2] < -0.7) & (np.abs(x + 5.6) < 0.7) & (y > 1.0) & (y < 12.0)
        a = np.where(core_glass, np.where(np.mod(y, 1.4) < 0.12, 0.7, 0.14), a)
        a = np.where((n[:, 2] < -0.7) & (np.abs(x + 5.6) < 0.8) & (y < 2.3), 0.2, a)
        a = np.where((y > 11.1) & (n[:, 1] > 0.9), 0.72, a)  # felt roof
        a = np.where(p[:, 2] < -6.2, np.where(y > 0.05, 0.85, a), a)  # balustrade fronts, light
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set("flat", sdf, albedo, 19.2, 11.9, out, seed, -5.0)


def other(out, seed):
    """Other accommodation: a static caravan on its pitch — skirted, shallow roof, steps to the door."""
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        body = box(p, (0, 2.0, 0), (5.6, 1.35, 1.85)) - 0.12
        roof = gable(p, 0, 0, 5.7, 1.95, 3.35, 0.22)
        skirt = box(p, (0, 0.35, 0), (5.45, 0.35, 1.7))
        steps = np.minimum(box(p, (1.6, 0.3, -2.35), (0.6, 0.3, 0.45)), box(p, (1.6, 0.6, -2.15), (0.6, 0.15, 0.25)))
        hitch = np.minimum(P.sd_capsule(p, np.array([-5.6, 0.7, -1.2]), np.array([-7.0, 0.55, 0.0]), 0.08),
                           P.sd_capsule(p, np.array([-5.6, 0.7, 1.2]), np.array([-7.0, 0.55, 0.0]), 0.08))
        fence = np.maximum(box(p, (0, 0.5, -5.2), (8.0, 0.5, 0.05)), -box(p, (1.6, 0.6, -5.2), (0.8, 1.0, 0.4)))
        return np.minimum.reduce([y, body, roof, skirt, steps, hitch, fence])

    def albedo(p, n):
        x, y = p[:, 0], p[:, 1]
        a = 0.86 - 0.12 * (np.mod(y * 3.2, 1) < 0.1)  # ribbed cladding
        band = (np.abs(n[:, 1]) < 0.35) & (y > 1.6) & (y < 2.6)
        win = band & ((np.mod(x + 5.6, 2.6) > 0.5) & (np.mod(x + 5.6, 2.6) < 2.1))
        a = np.where(win, glass(p), a)
        a = np.where((n[:, 2] < -0.7) & (np.abs(x - 1.6) < 0.45) & (y > 0.7) & (y < 2.9), 0.22, a)
        a = np.where(y < 0.7, 0.35, a)  # skirt
        a = np.where((y > 3.3) & (n[:, 1] > 0.5), 0.62, a)
        gravel = 0.8 + 0.08 * (P.fbm(x * 2, 0, p[:, 2] * 2, 2) - 0.5)
        g = np.where((np.abs(p[:, 2]) < 3.2) & (np.abs(x) < 7.5), gravel, ground_albedo(p))  # the pitch only
        return np.where(is_ground(p, n), g, a)

    render_set("other", sdf, albedo, 11.2, 3.4, out, seed, -1.85)


TYPES = {"detached": detached, "semi": semi, "terraced": terraced, "flat": flat, "other": other}


# ───────────────────────── tenure (who occupies) ─────────────────────────
# Same camera, light, ground and scale as the dwelling set, so the two sets sit together.
# Tenure is read from the street the way people read it: the sold board, the to-let boards,
# the council deck-access block. No text is baked in.


def _board(p, x0, z0, h=3.4):
    """An estate agent's board on a post, facing the street."""
    post = P.sd_capsule(p, np.array([x0, 0.0, z0]), np.array([x0, h + 0.8, z0]), 0.09)
    panel = box(p, (x0, h, z0 - 0.1), (1.25, 0.8, 0.05))
    return np.minimum(post, panel)


def _board_face(p, n, x0, z0, h=3.4):
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    return (np.abs(x - x0) < 1.3) & (np.abs(y - h) < 0.85) & (np.abs(z - (z0 - 0.1)) < 0.14) & (n[:, 2] < -0.5)


def tenure_owner(out, seed):
    """Owner-occupied: the semi with its car on the drive and a sold board by the gate."""
    BX, BZ = -7.4, -7.4

    def extra_sdf(p):
        car = np.minimum(box(p, (6.35, 0.62, -1.6), (0.9, 0.42, 2.05)) - 0.1, box(p, (6.35, 1.28, -1.4), (0.78, 0.32, 1.1)) - 0.08)
        return np.minimum(car, _board(p, BX, BZ))

    def extra_albedo(p, n, a):
        x, y = p[:, 0], p[:, 1]
        face = _board_face(p, n, BX, BZ)
        u, v = x - BX, y - 3.4
        slip = np.abs(u * 0.6 - v) < 0.17  # the diagonal sold slip
        border = (np.abs(u) > 1.12) | (np.abs(v) > 0.67)
        a = np.where(face, np.where(slip | border, 0.12, 0.97), a)
        incar = (np.abs(x - 6.35) < 1.1) & (y > 0.15) & (y < 1.7) & (np.abs(p[:, 2] + 1.5) < 2.3)
        return np.where(incar, np.where(n[:, 1] > 0.5, 0.45, np.where((y > 1.0) & (np.abs(n[:, 1]) < 0.5), 0.15, 0.3)), a)

    semi(out, seed, name="owner", prefix="t", extra=(extra_sdf, extra_albedo))


def tenure_private(out, seed):
    """Private rented: the terrace with to-let boards in the front gardens."""
    BOARDS = (-6.6, 2.6, 7.2)  # three of the four houses are let

    def extra_sdf(p):
        return np.minimum.reduce([_board(p, bx, -7.2) for bx in BOARDS])

    def extra_albedo(p, n, a):
        y = p[:, 1]
        for bx in BOARDS:
            face = _board_face(p, n, bx, -7.2)
            band = (y > 3.4 + 0.28) | (np.abs(p[:, 0] - bx) > 1.12) | (y < 3.4 - 0.67)  # agent band across the top, keyline
            a = np.where(face, np.where(band, 0.12, 0.97), a)
        return a

    terraced(out, seed, name="private", prefix="t", extra=(extra_sdf, extra_albedo))


def tenure_social(out, seed):
    """Social rented: a council deck-access block — open walkways along every floor, stair towers, bin store."""
    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        body = box(p, (0, 5.6, 0), (9.6, 5.6, 4.2))
        roofline = np.maximum(box(p, (0, 11.5, 0), (9.6, 0.3, 4.2)), -box(p, (0, 11.8, 0), (9.35, 0.6, 3.95)))
        parts = [y, body, roofline]
        for k in (1, 2, 3):
            parts.append(box(p, (0, STOREY * k - 0.1, -5.0), (9.6, 0.12, 0.8)))  # access deck
            parts.append(box(p, (0, STOREY * k + 0.55, -5.75), (9.6, 0.55, 0.08)))  # solid balustrade
        for sx in (-10.7, 10.7):
            parts.append(box(p, (sx, 6.0, -1.8), (1.1, 6.0, 2.4)))  # stair towers
        parts.append(box(p, (-6.0, 0.85, -8.6), (2.4, 0.85, 1.0)))  # bin store
        return np.minimum.reduce(parts)

    def albedo(p, n):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = 0.62 + 0.06 * (P.fbm(x * 2, y * 3, z * 2, 2) - 0.5)  # stock brick
        front = (n[:, 2] < -0.7) & (z > -4.4) & (z < -4.0)
        cell = np.mod(x + 9.6, 3.2)
        yy = np.mod(y, STOREY)
        door = front & (cell > 0.35) & (cell < 1.2) & (yy < 2.1)
        win = front & (cell > 1.55) & (cell < 2.95) & (yy > 0.95) & (yy < 2.05)
        a = np.where(door, 0.18, np.where(win, glass(p), a))
        balus = (z < -5.6) & (np.abs(n[:, 2]) > 0.7) & (y > STOREY - 0.2)
        a = np.where(balus, 0.86 - 0.3 * (np.mod(y, STOREY) < 0.18), a)  # concrete fronts, dark drip line
        tower = np.abs(np.abs(x) - 10.7) < 1.15
        a = np.where(tower & (np.abs(n[:, 2]) > 0.7), np.where(np.mod(y, 1.4) < 0.9, 0.82, 0.25), a)  # stair glazing slits
        a = np.where((y > 11.1) & (n[:, 1] > 0.9), 0.7, a)
        a = np.where((np.abs(x + 6.0) < 2.5) & (z < -7.5) & (y < 1.75) & (y > 0.05), 0.55 - 0.2 * (np.mod(x * 1.2, 1) < 0.1), a)
        return np.where(is_ground(p, n), ground_albedo(p), a)

    render_set("social", sdf, albedo, 19.2, 11.6, out, seed, -4.2, prefix="t")


TENURES = {"owner": tenure_owner, "private": tenure_private, "social": tenure_social}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(TYPES))
    ap.add_argument("--size", default="1000x1000")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--preview", action="store_true", help="two-colour PNG instead of an alpha mask")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE, P.MASK, P.PREFIX = True, not a.preview, ""
    P.W, P.H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        key = name.strip()
        (TENURES.get(key) or TYPES[key])(a.out, a.seed)


if __name__ == "__main__":
    main()
