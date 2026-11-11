# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Everyday-basket specimen plates (ONS shopping prices: ten everyday items).

One matched set: the same tabletop camera, one light from the upper left, the same plain
paper ground with a soft contact shadow, and the same 45° screen as the dwelling specimens.
Every item is a raymarched signed-distance object — generic and unbranded: no logos, no
lettering, no supermarket marks.

  bananas            a bunch of five, crown and stalk
  butter             250 g block, foil wrapper peeled back from a cut end
  eggs               half-dozen pulp box, lid open
  instant-coffee     glass jar of granules, ribbed lid, a spoonful beside it
  restaurant-coffee  cup and saucer, crema on top, a teaspoon
  semi-skimmed-milk  plastic milk bottle — striped cap and striped label band
  whole-milk         the same bottle — solid dark cap and solid label band
  white-potatoes     a loose pile
  white-bread        sliced tin loaf, slices fallen forward showing white crumb
  wholemeal-bread    the same loaf, darker crust and flecked brown crumb

Scale: objects are modelled in centimetres at real size, then drawn at a display scale
compressed toward a common size (scale ∝ size^-0.6), so a butter block still reads next to
a loaf in a grid without looking the same size.

Usage:
  uv run basket-items.py OUT_DIR [--only bananas,eggs] [--size 1000x1000] [--preview]
Writes OUT_DIR/b-<id>.png — LA masks (ink as alpha) for <Plate src fit="contain">.
Ink is clipped to the object and its shadow: no stray dots on the sheet.
"""

from __future__ import annotations

import argparse
import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("halftone_plates", _HERE / "halftone-plates.py")
assert _spec and _spec.loader
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

TAU = 2 * math.pi
REF_SIZE = 22.0  # cm: an item this size is drawn at scale 1


# ───────────────────────── sdf helpers ─────────────────────────
def box(p, c, b, r=0.0):
    return P.sd_box(p, np.array(c, float), np.array(b, float) - r) - r


def cyl(p, cx, cz, r, y0, y1, rr=0.0):
    """Vertical capped cylinder with rounded edges rr."""
    dx = np.hypot(p[:, 0] - cx, p[:, 2] - cz) - (r - rr)
    dy = np.abs(p[:, 1] - (y0 + y1) / 2) - ((y1 - y0) / 2 - rr)
    return np.minimum(np.maximum(dx, dy), 0) + np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) - rr


def ellipsoid(q, r):
    """IQ's ellipsoid bound; q already in the ellipsoid's local frame."""
    r = np.asarray(r, float)
    k0 = np.linalg.norm(q / r, axis=-1)
    k1 = np.linalg.norm(q / (r * r), axis=-1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-6)


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def roty(p, c, a):
    """Point p in a frame rotated by `a` about the vertical axis through c (x, z)."""
    x, z = p[:, 0] - c[0], p[:, 2] - c[1]
    ca, sa = math.cos(a), math.sin(a)
    return np.stack([ca * x - sa * z, p[:, 1], sa * x + ca * z], -1)


def rotx(q, a):
    y, z = q[:, 1], q[:, 2]
    ca, sa = math.cos(a), math.sin(a)
    return np.stack([q[:, 0], ca * y - sa * z, sa * y + ca * z], -1)


def hash2(x, y):
    s = np.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - np.floor(s)


def dots(p, f, thresh, r):
    """Sparse round spots: one per lattice cell (where the hash passes thresh), radius r cells."""
    q = p * f
    i = np.floor(q)
    c = i + 0.25 + 0.5 * np.stack([P.h3(i[:, 0], i[:, 1], i[:, 2] + 5.1), P.h3(i[:, 0] + 3.3, i[:, 1], i[:, 2]), P.h3(i[:, 0], i[:, 1] + 7.7, i[:, 2])], -1)
    return (P.h3(i[:, 0], i[:, 1], i[:, 2]) > thresh) & (np.linalg.norm(q - c, axis=-1) < r)


def speck(p, f, thresh):
    """Sparse flecks: cell noise at frequency f, true where the cell hash exceeds thresh."""
    i, j, k = np.floor(p[:, 0] * f), np.floor(p[:, 1] * f), np.floor(p[:, 2] * f)
    return P.h3(i, j, k) > thresh


# ───────────────────────── camera, light, render ─────────────────────────
CAM_DIR = P.nrm(np.array([-0.52, 0.56, -0.66]))  # raised three-quarter view from the front left
CAM_DIST = 128.0
CAM_LOOK = np.array([0.0, 5.0, 0.0])
CAM_FOV = 14.0


def camera(w, h, canvas=1.0):
    """canvas > 1 widens the view at the same pixel scale (the plate is cropped back later)."""
    fov = math.degrees(2 * math.atan(math.tan(math.radians(CAM_FOV) / 2) * canvas))
    return P.Cam(tuple(CAM_LOOK + CAM_DIR * CAM_DIST), tuple(CAM_LOOK), fov, w, h)


def light_for(cam):
    """One light from the upper left of the picture, a little in front of the objects."""
    return P.nrm(-0.62 * cam.r + 1.3 * np.array([0, 1.0, 0]) - 0.32 * cam.f)


def render(obj_sdf, albedo, w, h, spec=None, canvas=1.0):
    """obj_sdf excludes the table; the table (y = 0) is added here and printed as bare paper."""
    def sdf(p):
        return np.minimum(p[:, 1], obj_sdf(p))

    cam = camera(w, h, canvas)
    L = light_for(cam)
    rd = cam.rays()
    t, hit = P.march(sdf, cam.pos, rd, steps=260, far=400.0, k=0.7)
    # the march stops within 1e-3·t of a surface (≈0.13 units here); walk every hit onto it so
    # albedo tests like `part(q) < 0.05` see the true surface
    th = t[hit]
    for _ in range(6):
        th = th + sdf(cam.pos + rd[hit] * th[:, None]) * 0.9
    t[hit] = th
    p = cam.pos + rd[hit] * t[hit, None]
    n = P.normals(sdf, p, e=2e-3)
    dif = np.clip(n @ L, 0, 1)
    sh = P.shadow(sdf, p + n * 0.02, L, steps=110, k=9.0, tmax=60.0)
    oc = P.ao(sdf, p, n, 0.35)
    ground = p[:, 1] < obj_sdf(p)
    alb = np.where(ground, 1.0, albedo(p, n))
    lit = 0.42 * oc + 1.0 * dif * sh
    col = alb * lit
    # rim darkening at grazing angles, so light objects keep their outline on paper
    ndv = np.abs((n * -rd[hit]).sum(-1))
    col = col * (0.62 + 0.38 * np.clip(ndv * 1.6, 0, 1))
    if spec is not None:
        r = rd[hit] - 2 * (rd[hit] * n).sum(-1, keepdims=True) * n
        col = col + spec(p, n) * np.clip(r @ L, 0, 1) ** 40 * sh
    col = np.clip(col, 0.03, 0.9)  # every object surface carries at least a fine dot
    # ground: pure paper, darkened only by the cast shadow and contact occlusion
    gtone = 1.0 - 0.42 * (1 - sh) - 0.45 * (1 - oc)
    col = np.where(ground, np.clip(gtone, 0.35, 1.0), col)
    tone = np.ones(w * h)
    tone[hit] = col
    obj = np.zeros(w * h, bool)
    obj[hit] = ~ground
    return tone.reshape(h, w), obj.reshape(h, w)


def compose(tone_small, obj_small, path, seed, canvas, cell=5.2):
    """Screen at canvas × plate size, then crop the plate centred on the ink (translation only,
    so every item keeps the set's scale)."""
    W, H = int(round(P.W * canvas)), int(round(P.H * canvas))
    tone = np.asarray(Image.fromarray((np.clip(tone_small, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.Resampling.LANCZOS), np.float32) / 255
    tone = np.clip((tone - 0.03) / (0.92 - 0.03), 0, 1) ** 1.15
    obj = np.asarray(Image.fromarray((obj_small * 255).astype(np.uint8)).resize((W, H), Image.Resampling.BILINEAR)) > 100
    shadow = tone < 0.93
    region = Image.fromarray(((obj | shadow) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    region = np.asarray(region) > 0
    ink = P.halftone(tone, cell=cell, seed=seed)
    ink &= region & ((tone < 0.985) | obj)
    # drop isolated specks that the grain leaves in the shadow fringe
    keep = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(3))) > 18
    ink &= keep | obj
    ys, xs = np.nonzero(ink)
    cy, cx = (ys.min() + ys.max()) // 2, (xs.min() + xs.max()) // 2
    y0 = int(np.clip(cy - P.H // 2, 0, H - P.H))
    x0 = int(np.clip(cx - P.W // 2, 0, W - P.W))
    if ys.max() - ys.min() > P.H * 0.94 or xs.max() - xs.min() > P.W * 0.94:
        print(f"  warning: {path.name} ink spans {xs.max() - xs.min()}×{ys.max() - ys.min()} px")
    ink = ink[y0 : y0 + P.H, x0 : x0 + P.W]
    if P.MASK:
        a = np.zeros((*ink.shape, 2), np.uint8)
        a[..., 0] = 255
        a[..., 1] = ink * 255
        Image.fromarray(a, "LA").save(path, optimize=True)
    else:
        rgb = np.where(ink[..., None], np.array(P.INK, np.uint8), np.array(P.PAPER, np.uint8))
        Image.fromarray(rgb).save(path, optimize=True)
    print(f"saved {path}", flush=True)


def scaled(sdf, albedo, s, spec=None):
    """Draw an object modelled in cm at display scale s (about the ground origin)."""
    def sdf_s(p):
        return sdf(p / s) * s

    def alb_s(p, n):
        return albedo(p / s, n)

    spec_s = None if spec is None else (lambda p, n: spec(p / s, n))
    return sdf_s, alb_s, spec_s


def display_scale(size_cm):
    return (REF_SIZE / size_cm) ** 0.6


# ───────────────────────── items ─────────────────────────
def banana(q, crown, yaw, pitch, R=17.0, sweep=1.22, rmax=1.6):
    """One banana: a tapered tube swept along a circular arc. Returns (dist, t along banana)."""
    lq = roty(q, (crown[0], crown[2]), yaw)
    lq = lq - np.array([0, crown[1], 0])
    lq = rotx(lq, pitch)  # tip rises
    # arc in the x/z plane starting at the crown, heading +x, bending toward +z
    dx, dz = lq[:, 0], lq[:, 2] - R
    th = np.clip(np.arctan2(dx, -dz), 0, sweep)
    ax, az = R * np.sin(th), R - R * np.cos(th)
    d = np.sqrt((lq[:, 0] - ax) ** 2 + lq[:, 1] ** 2 + (lq[:, 2] - az) ** 2)
    t = th / sweep
    neck = np.clip(t / 0.22, 0, 1)
    body = 0.3 + 0.7 * (1 - (1 - neck) ** 2)
    tip = np.clip((1 - t) / 0.28, 0, 1)
    prof = body * (0.22 + 0.78 * np.sqrt(tip))
    # faceted skin: a pentagonal section, the ridges running the length
    off_y = lq[:, 1]
    off_r = (lq[:, 0] - ax) * np.sin(th) - (lq[:, 2] - az) * np.cos(th)
    ang = np.arctan2(off_y, off_r)
    ridge = 1 - 0.07 * (0.5 + 0.5 * np.cos(5 * ang))
    return (d - rmax * prof * ridge) * 0.8, t


BUNCH = [  # crown (x, y, z), yaw, pitch — bottom hand of three, two lying on top
    ((-9.0, 1.7, -2.6), 0.30, 0.0),
    ((-9.0, 1.6, -2.8), 0.04, 0.0),
    ((-9.0, 1.7, -3.0), -0.24, 0.0),
    ((-9.2, 4.4, -2.5), 0.18, -0.03),
    ((-9.2, 4.4, -2.9), -0.09, -0.03),
]


def item_bananas():
    def parts(q):
        ds, ts = [], []
        for crown, yaw, pitch in BUNCH:
            d, t = banana(q, crown, yaw, pitch)
            ds.append(d)
            ts.append(t)
        return np.stack(ds), np.stack(ts)

    def sdf(q):
        ds, _ = parts(q)
        stalk = P.sd_capsule(q, np.array([-9.6, 3.1, -2.8]), np.array([-12.4, 3.9, -2.9]), 0.7)
        crown = P.sd_sphere(q, np.array([-9.5, 3.0, -2.8]), 1.3)
        return np.minimum.reduce([ds.min(0), smin(stalk, crown, 0.6)])

    def albedo(q, n):
        ds, ts = parts(q)
        i = ds.argmin(0)
        t = ts[i, np.arange(len(q))]
        a = 0.86 - 0.06 * P.fbm(q[:, 0] * 0.8, q[:, 1] * 0.8, q[:, 2] * 0.8, 2)
        a = np.where(dots(q, 1.6, 0.75, 0.14), 0.5, a)  # sugar spots
        a = np.where(t > 0.965, 0.12, a)  # black tips
        a = np.where(t < 0.1, 0.5, a)  # green necks
        near_crown = np.hypot(np.hypot(q[:, 0] + 10.4, q[:, 1] - 3.4), q[:, 2] + 2.85) < 3.3
        a = np.where(near_crown & (ds.min(0) > 0.05), 0.32, a)
        return a

    return sdf, albedo, 16.0


def item_butter():
    LX, LY, LZ = 6.4, 1.65, 3.3  # 250 g block, half-sizes (12.8 × 3.3 × 6.6 cm)
    CUT = -2.4  # foil peeled back to here; butter exposed toward -x

    def sdf(q):
        block = box(q, (0, LY, 0), (LX, LY, LZ), 0.3)
        wrap = np.maximum(box(q, (0.04, LY, 0), (LX + 0.07, LY + 0.07, LZ + 0.07), 0.3), CUT - q[:, 0])
        # the peeled foil lies open on the table, gently crumpled
        sheet = box(q, (CUT - 3.4, 0.1, 0), (3.4, 0.1, LZ + 1.6), 0.05) - 0.06 * P.fbm(q[:, 0] * 1.4, 0, q[:, 2] * 1.4, 2)
        pat = box(q, (-9.0, 0.45, -3.6), (1.25, 0.45, 1.05), 0.22)
        knife_blade = box(q, (-6.0, 0.18, -6.2), (3.2, 0.06, 0.75), 0.05)
        knife_handle = box(q, (-0.6, 0.45, -6.4), (2.6, 0.42, 0.6), 0.35)
        return np.minimum.reduce([np.minimum(block, wrap), sheet, pat, knife_blade, knife_handle])

    def albedo(q, n):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        crinkle = P.fbm(x * 2.2, y * 2.2, z * 2.2, 3)
        a = np.full(len(q), 0.9)  # butter
        a = np.where(speck(q, 5.0, 0.9) & (x < CUT), 0.8, a)
        foil = (x > CUT - 0.02) & (y > 0.06)
        fa = 0.34 + 0.4 * crinkle
        # end folds: diagonal creases on the far end face
        endf = n[:, 0] > 0.7
        crease = endf & (np.abs(np.abs(z) - (LZ - np.abs(y - LY) * 1.4)) < 0.16)
        fa = np.where(crease, 0.2, fa)
        seam = (n[:, 1] > 0.7) & (np.abs(z - 0.9) < 0.12)
        fa = np.where(seam, 0.3, fa)
        edge = foil & (x < CUT + 0.35)
        fa = np.where(edge, 0.35, fa)
        a = np.where(foil, fa, a)
        sheet = (x < CUT) & (y < 0.45) & (np.abs(z) < LZ + 1.65) & (x > CUT - 6.9)
        a = np.where(sheet, 0.45 + 0.4 * crinkle, a)
        pat = (np.abs(x + 9.0) < 1.35) & (np.abs(z + 3.6) < 1.15)
        a = np.where(pat & (y > 0.05), 0.9, a)
        blade = (z < -5.3) & (x < -2.7) & (y < 0.35)
        a = np.where(blade, 0.62, a)
        handle = (z < -5.6) & (x > -3.3) & (y > 0.02)
        a = np.where(handle, 0.2, a)
        return a

    def spec(q, n):
        foil = (q[:, 0] > CUT) | ((q[:, 1] < 0.45) & (q[:, 0] > CUT - 7))
        blade = (q[:, 2] < -5.3) & (q[:, 0] < -2.7)
        return np.where(foil | blade, 0.5, 0.0)

    return sdf, albedo, 13.5, spec


EGG_CELLS = [(x, z) for z in (-2.45, 2.45) for x in (-4.9, 0.0, 4.9)]


def egg(q, cx, cz, y0, tilt=0.0):
    lq = q - np.array([cx, y0 + 2.85, cz])
    lq = rotx(lq, tilt)
    k = 1 - 0.1 * np.clip(lq[:, 1] / 2.85, -1, 1)  # narrower at the top
    lq2 = np.stack([lq[:, 0] / k, lq[:, 1], lq[:, 2] / k], -1)
    return ellipsoid(lq2, (2.2, 2.85, 2.2)) * 0.9


def item_eggs():
    BH = 5.4  # base height
    HINGE = np.array([0.0, BH, 5.0])
    OPEN = math.radians(118)
    d_dir = np.array([0.0, math.sin(OPEN), -math.cos(OPEN)])
    u_dir = np.array([0.0, math.cos(OPEN), math.sin(OPEN)])

    def lid_local(q):
        r = q - HINGE
        return np.stack([r[:, 0], r @ u_dir, r @ d_dir], -1)  # x, out of the lid, along the lid

    def sdf(q):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        base = box(q, (0, BH / 2, 0), (7.6, BH / 2, 5.0), 0.7)
        base = np.maximum(base, -box(q, (0, BH + 0.5, 0), (7.15, 0.9, 4.55), 0.4))  # open tray
        cups = np.full(len(q), 1e9)
        for cx, cz in EGG_CELLS:
            cups = np.minimum(cups, P.sd_sphere(q, np.array([cx, BH + 0.4, cz]), 2.55))
        base = np.maximum(base, -cups)
        eggs = np.minimum.reduce([egg(q, cx, cz, 2.4) for cx, cz in EGG_CELLS])
        lq = lid_local(q)
        # lid: a hollow tray hinged at the back, its open side turned toward the camera
        outer = box(lq, (0, 1.4, 5.0), (7.6, 1.4, 5.0), 0.7)
        lid = np.maximum(np.abs(outer) - 0.2, -lq[:, 1] + 0.05)
        return np.minimum.reduce([base, eggs, lid])

    def albedo(q, n):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        pulp = 0.6 + 0.16 * (P.fbm(x * 3, y * 3, z * 3, 2) - 0.5)
        pulp = np.where(speck(q, 6.0, 0.88), 0.45, pulp)
        eggs = np.minimum.reduce([egg(q, cx, cz, 2.4) for cx, cz in EGG_CELLS])
        a = np.where(eggs < 0.05, 0.86 - 0.04 * P.fbm(x * 4, y * 4, z * 4, 2), pulp)
        return a

    return sdf, albedo, 22.0


def item_instant_coffee():
    R, H = 4.4, 12.4
    FILL = 9.6

    def sdf(q):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        body = cyl(q, 0, 0, R, 0, H, 0.8)
        shoulder = cyl(q, 0, 0, 3.5, H - 1.0, H + 1.0, 0.5)
        jar = smin(body, shoulder, 0.9)
        rho = np.hypot(x, z)
        ribs = 0.05 * np.cos(np.arctan2(z, x) * 72)
        lid = cyl(q, 0, 0, 3.95, H + 0.9, H + 3.1, 0.3) - ribs * (np.abs(y - (H + 2.0)) < 0.9)
        spoon_bowl = ellipsoid(q - np.array([-1.0, 0.45, -8.2]), (2.0, 0.45, 1.4))
        spoon_bowl = np.maximum(spoon_bowl, -ellipsoid(q - np.array([-1.0, 0.75, -8.2]), (1.8, 0.45, 1.2)))
        heap = ellipsoid(q - np.array([-1.0, 0.55, -8.2]), (1.6, 0.6, 1.05)) + 0.06 * P.fbm(x * 6, y * 6, z * 6, 2)
        handle = P.sd_capsule(q, np.array([0.9, 0.42, -8.4]), np.array([7.4, 0.2, -9.6]), 0.28)
        spill = np.full(len(q), 1e9)
        for i in range(14):
            gx = -3.2 + 6.0 * math.sin(i * 2.3) * 0.55 + i * 0.12
            gz = -5.8 - 1.1 * math.cos(i * 1.7)
            spill = np.minimum(spill, P.sd_sphere(q, np.array([gx, 0.08, gz]), 0.22))
        del rho
        return np.minimum.reduce([jar, lid, smin(spoon_bowl, handle, 0.3), heap, spill])

    def albedo(q, n):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        rho = np.hypot(x, z)
        injar = (rho < R + 0.2) & (y > 0.02) & (y < H + 0.95)
        gran = 0.14 + 0.24 * speck(q, 3.2, 0.72)
        glass_empty = 0.86 - 0.1 * (np.abs(y - H) < 0.6)
        a = np.full(len(q), 0.8)
        a = np.where(injar, np.where(y < FILL, gran, glass_empty), a)
        a = np.where(injar & (np.abs(y - FILL) < 0.18), 0.08, a)
        lid = (y > H + 0.9) & (rho < 4.1)
        a = np.where(lid, 0.42 + 0.18 * (np.cos(np.arctan2(z, x) * 72) > 0.4) * (n[:, 1] < 0.6), a)
        a = np.where(lid & (n[:, 1] > 0.8), 0.48, a)
        spoon = (z < -7.0) & (y < 1.5)
        a = np.where(spoon, 0.66, a)
        heap = ellipsoid(q - np.array([-1.0, 0.55, -8.2]), (1.6, 0.6, 1.05)) < 0.12
        a = np.where(heap, gran, a)
        a = np.where((z > -7.2) & (z < -4.3) & (y < 0.4) & (rho > R + 0.5), 0.18, a)  # spilt granules
        return a

    def spec(q, n):
        rho = np.hypot(q[:, 0], q[:, 2])
        glass = (rho < R + 0.2) & (q[:, 1] < 13.3) & (q[:, 1] > 0.3)
        spoon = (q[:, 2] < -7.0) & (q[:, 1] < 1.5)
        return np.where(glass, 1.2, np.where(spoon, 0.5, 0.0))

    return sdf, albedo, 19.0, spec


CUP_C = np.array([0.4, 0.0, 0.6])
HANDLE_A = math.radians(-28)  # handle points toward +x, swung toward the camera


def cup_profile(q):
    """Revolved cup + saucer distances in cup-centred coordinates."""
    x, y, z = q[:, 0] - CUP_C[0], q[:, 1], q[:, 2] - CUP_C[2]
    rho = np.hypot(x, z)
    # saucer: shallow dish, raised rim, foot ring
    top = 0.55 + 0.55 * np.clip((rho - 3.6) / 3.8, 0, 1) ** 2
    saucer = np.maximum.reduce([rho - 7.6, (y - top) * 0.8, 0.12 - y])
    saucer = np.minimum(saucer, np.maximum(np.abs(rho - 3.3) - 0.3, y - 0.3))
    saucer = saucer - 0.1
    # cup: bowl sitting in the saucer well
    yb = 0.75
    hgt = 6.3
    ro = 2.4 + 1.9 * np.sqrt(np.clip((y - yb) / hgt, 0, 1))
    outer = np.maximum.reduce([rho - ro, yb - y, y - (yb + hgt)])
    inner = np.maximum(rho - (ro - 0.32), (yb + 0.5) - y)
    cup = np.maximum(outer, -inner) - 0.08
    coffee = np.maximum(rho - (ro - 0.3), y - (yb + hgt - 1.05))
    return saucer, cup, coffee, rho, y


def item_restaurant_coffee():
    hx, hz = math.cos(HANDLE_A), math.sin(HANDLE_A)

    def handle(q):
        x, y, z = q[:, 0] - CUP_C[0], q[:, 1], q[:, 2] - CUP_C[2]
        u = x * hx + z * hz  # radial toward the handle
        v = -x * hz + z * hx
        cu, cy = 4.55, 4.6
        ring = np.hypot(np.hypot(u - cu, y - cy) - 1.35, v) - 0.36
        return np.maximum(ring, 3.9 - u)

    def spoon(q):
        bowl = ellipsoid(q - np.array([-2.6, 1.05, -4.9]), (1.1, 0.22, 0.7))
        stem = P.sd_capsule(q, np.array([-1.6, 1.05, -5.25]), np.array([3.6, 1.15, -6.0]), 0.17)
        return smin(bowl, stem, 0.2)

    def sdf(q):
        saucer, cup, coffee, _, _ = cup_profile(q)
        return np.minimum.reduce([saucer, cup, coffee, handle(q), spoon(q)])

    def albedo(q, n):
        saucer, cup, coffee, rho, y = cup_profile(q)
        a = np.full(len(q), 0.9)
        on_coffee = (coffee < 0.04) & (cup > 0.02) & (n[:, 1] > 0.8) & (y > 5.5)
        crema = 0.42 + 0.18 * P.fbm(q[:, 0] * 2.5, 0, q[:, 2] * 2.5, 3)
        ring = (rho > 3.35)
        a = np.where(on_coffee, np.where(ring, 0.52, np.where(rho < 1.6, crema, 0.2 + 0.2 * P.fbm(q[:, 0] * 3, 0, q[:, 2] * 3, 2))), a)
        a = np.where((spoon(q) < 0.05), 0.6, a)
        # the cup's gilt-free plain rim gets a thin band to hold its edge
        a = np.where((cup < 0.05) & (np.abs(y - 6.95) < 0.12), 0.45, a)
        return a

    def spec(q, n):
        return np.full(len(q), 0.35)

    return sdf, albedo, 15.5, spec


def bottle(q, cap_style):
    """2-pint HDPE milk bottle: rounded square body, sloped shoulder to a front neck, back handle."""
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    HB = 4.7  # half width of the body
    s = np.clip((y - 12.0) / 6.0, 0, 1)
    s = s * s * (3 - 2 * s)
    half = HB * (1 - s) + 1.75 * s
    cx, cz = 1.0 * s, -1.0 * s  # neck sits toward the front corner, away from the handle
    r = 1.5 * (1 - s) + 1.7 * s
    qx, qz = np.abs(x - cx) - (half - r), np.abs(z - cz) - (half - r)
    d2 = np.hypot(np.maximum(qx, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qx, qz), 0) - r
    body = np.maximum(d2 * 0.85, np.maximum(-y, y - 18.2))
    body = smin(body, cyl(q, 1.0, -1.0, 1.75, 17.0, 19.0, 0.1), 0.35)
    # handle: a loop on the back corner, hole through it
    hq = roty(q, (0.0, 0.0), math.radians(-45))
    hx, hz2 = hq[:, 0], hq[:, 2]
    loop = np.hypot(np.hypot(hz2 - 4.3, y - 13.6) - 2.2, hx) - 0.8
    loop = np.maximum(loop, 3.2 - hz2)
    body = smin(body, loop, 0.9)
    cap_r = 2.25
    ribs = 0.05 * np.cos(np.arctan2(z + 1.0, x - 1.0) * 40)
    cap = cyl(q, 1.0, -1.0, cap_r, 18.9, 21.1, 0.3) - ribs * (np.abs(y - 20.0) < 0.9)
    return body, cap


def item_milk(cap_style):
    def sdf(q):
        body, cap = bottle(q, cap_style)
        return np.minimum(body, cap)

    def albedo(q, n):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        body, cap = bottle(q, cap_style)
        a = np.full(len(q), 0.88)
        a = np.where(np.mod(y, 2.6) < 0.12, 0.74, a) * (y < 11.5) + a * (y >= 11.5)  # moulded ribs
        # plain label wrap with a cap-matched band (no lettering)
        lab = (y > 4.2) & (y < 10.8) & (cap > 0.05)
        a = np.where(lab, 0.95, a)
        band = (y > 8.2) & (y < 10.1) & lab
        on_cap = cap < 0.05
        if cap_style == "solid":
            a = np.where(band, 0.07, a)
            a = np.where(on_cap, 0.07, a)
        else:
            u = x + y + z  # diagonal hatching on the band
            a = np.where(band, np.where(np.mod(u, 1.1) < 0.55, 0.07, 0.95), a)
            stripes = np.mod(np.arctan2(z + 1.0, x - 1.0) * 6 / math.pi + 0.5 * (y - 19), 1.0) < 0.5
            top = n[:, 1] > 0.75
            rr = np.hypot(x - 1.0, z + 1.0)
            topring = (np.mod(rr, 1.0) < 0.5)
            a = np.where(on_cap, np.where(top, np.where(topring, 0.07, 0.95), np.where(stripes, 0.07, 0.95)), a)
        return a

    def spec(q, n):
        return np.full(len(q), 0.25)

    return sdf, albedo, 23.5, spec


POTATOES = [  # centre (x, y, z), radii, yaw
    ((-3.6, 2.5, -2.2), (4.0, 2.5, 2.9), 0.4),
    ((3.4, 2.4, -2.8), (3.6, 2.4, 2.7), -0.7),
    ((-0.2, 2.6, 2.8), (4.2, 2.6, 3.0), 0.1),
    ((5.4, 2.3, 2.6), (3.3, 2.3, 2.6), 1.2),
    ((-6.4, 2.2, 2.4), (3.0, 2.2, 2.5), -0.3),
    ((0.2, 2.2, -6.4), (3.1, 2.2, 2.4), 0.9),
    ((-0.6, 6.4, -0.6), (3.8, 2.5, 2.8), -0.35),
    ((3.2, 5.6, 0.9), (3.2, 2.3, 2.5), 0.8),
]


def potatoes_d(q):
    ds = []
    for c, r, yaw in POTATOES:
        lq = roty(q, (c[0], c[2]), yaw) - np.array([0, c[1], 0])
        ds.append(ellipsoid(lq, r))
    return np.stack(ds)


def item_potatoes():
    def sdf(q):
        d = potatoes_d(q).min(0)
        lumpy = 0.32 * (P.fbm(q[:, 0] * 0.45, q[:, 1] * 0.45, q[:, 2] * 0.45, 2) - 0.5)
        return d * 0.85 + lumpy

    def albedo(q, n):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        a = 0.74 + 0.12 * (P.fbm(x * 1.6, y * 1.6, z * 1.6, 3) - 0.5)
        a = np.where(dots(q, 1.3, 0.9, 0.16), 0.28, a)  # eyes
        a = np.where(dots(q, 4.0, 0.7, 0.3), a - 0.1, a)  # skin flecks
        return a

    return sdf, albedo, 20.0


# tin loaf, long axis along z, cut end facing the camera
LOAF_Z0, LOAF_Z1 = -6.5, 13.5
SLICE = 1.3


def section(x, y):
    """2-D cross-section of a tin loaf: straight sides, a domed crown that mushrooms over."""
    sides = np.maximum(np.abs(x) - 5.6, np.maximum(-y, y - 8.2))
    crown = np.hypot(x / 6.3, (y - 8.2) / 3.6) - 1.0
    crown = np.maximum(crown * 3.6, 7.0 - y)
    return smin(sides, crown, 0.5)


SLICES = [  # z of the slice's back face, tilt (rad; + falls toward -z, - leans back), x offset
    (-8.9, -0.2, 0.0),
    (-5.2, 1.5, 7.0),
]


def slice_local(q, z0, tilt, dx=0.0):
    """Slice frame: hinge at its bottom front edge, rotating forward."""
    lq = q - np.array([dx, 0, z0])
    c, s = math.cos(tilt), math.sin(tilt)
    y, z = lq[:, 1], lq[:, 2]
    return np.stack([lq[:, 0], c * y - s * z, s * y + c * z], -1)


def loaf_parts(q):
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    sec = section(x, y)
    loaf = np.maximum(sec, np.maximum(LOAF_Z0 - z, z - LOAF_Z1))
    loaf = np.maximum(loaf, -0.0)
    sl = []
    for z0, tilt, dx in SLICES:
        lq = slice_local(q, z0, tilt, dx)
        s2 = section(lq[:, 0], lq[:, 1])
        sl.append(np.maximum(s2, np.abs(lq[:, 2] + SLICE / 2) - SLICE / 2))
    return loaf, np.stack(sl)


def item_bread(kind):
    if kind == "white":
        crumb_base, crust_top, crust_side = 0.95, 0.52, 0.7
    else:
        crumb_base, crust_top, crust_side = 0.58, 0.3, 0.46

    def sdf(q):
        loaf, sl = loaf_parts(q)
        return np.minimum(loaf, sl.min(0))

    def albedo(q, n):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        loaf, sl = loaf_parts(q)
        on_slice = sl.min(0) < loaf
        i = sl.argmin(0)
        # local section coords for the surface point
        sx = x.copy()
        sy = y.copy()
        sz = z.copy()
        for k, (z0, tilt, dx) in enumerate(SLICES):
            lq = slice_local(q, z0, tilt, dx)
            m = on_slice & (i == k)
            sx = np.where(m, lq[:, 0], sx)
            sy = np.where(m, lq[:, 1], sy)
            sz = np.where(m, lq[:, 2], sz)
        sec = section(sx, sy)
        face = sec < -0.42  # inside the crust ring → a cut face
        crust = np.where(sy > 7.6, crust_top, crust_side) + 0.06 * (P.fbm(x * 2, y * 2, z * 2, 2) - 0.5)
        if kind == "white":
            crumb = crumb_base - 0.1 * speck(np.stack([sx, sy, sz * 0], -1), 3.4, 0.82)
        else:
            fp = np.stack([sx, sy, sz * 0], -1)
            crumb = crumb_base + 0.1 * (P.fbm(sx * 3, sy * 3, 0, 2) - 0.5)
            crumb = np.where(speck(fp, 4.2, 0.6), 0.2, crumb)  # bran flecks
            crumb = np.where(speck(fp + 0.37, 2.6, 0.8), 0.78, crumb)  # oat/light flecks
        a = np.where(face, crumb, crust)
        # slice lines down the loaf's crust
        lines = (~on_slice) & (np.mod(z - LOAF_Z0, SLICE) < 0.07) & (z > LOAF_Z0 + 0.2) & ~face
        a = np.where(lines, a * 0.55, a)
        # the loaf's cut end is crumb too
        return a

    return sdf, albedo, 36.0


# ───────────────────────── basket archetypes (generic pictures by item type) ─────────────────────────
# Every other basket item shows one of these by type. Same camera, light, ground and screen as the
# featured ten; files are b-type-<id>.png.


def seg(p, a, b, r):
    """Flat-capped cylinder between points a and b (IQ)."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba, pa = b - a, p - a
    baba = ba @ ba
    paba = pa @ ba
    x = np.linalg.norm(pa * baba - ba[None, :] * paba[:, None], axis=-1) - r * baba
    y = np.abs(paba - baba * 0.5) - baba * 0.5
    x2, y2 = x * x, y * y * baba
    d = np.where(np.maximum(x, y) < 0, -np.minimum(x2, y2), np.where(x > 0, x2, 0) + np.where(y > 0, y2, 0))
    return np.sign(d) * np.sqrt(np.abs(d)) / baba


def lathe(q, cx, cz, radius, y0, y1, k=0.75):
    """Pseudo-distance to a solid of revolution with radius(y), between y0 and y1."""
    y = q[:, 1]
    rho = np.hypot(q[:, 0] - cx, q[:, 2] - cz)
    return np.maximum((rho - radius(y)) * k, np.maximum(y0 - y, y - y1))


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def cone(q, a, b, ra, rb):
    """Tapered round rod from a (radius ra) to b (radius rb), pseudo-distance."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    u = b - a
    L = np.linalg.norm(u)
    u = u / L
    pa = q - a
    t = np.clip(pa @ u / L, 0, 1)
    return (np.linalg.norm(pa - u[None, :] * (t * L)[:, None], axis=-1) - (ra + (rb - ra) * t)) * 0.9, t


def side_toward_cam(n, cos_min=0.9):
    """Normals that face the camera horizontally (for front-panel graphics)."""
    h = np.array([-CAM_DIR[0], -CAM_DIR[2]])
    h = h / np.linalg.norm(h)
    nh = np.hypot(n[:, 0], n[:, 2]) + 1e-6
    return ((-n[:, 0] * h[0] - n[:, 2] * h[1]) / nh > cos_min) & (np.abs(n[:, 1]) < 0.5)


def glass_spec(level):
    return lambda q, n: np.full(len(q), level)


def type_bottle():
    def R(y):
        return np.where(y < 18.5, 3.7, 3.7 + (1.45 - 3.7) * ss(18.5, 24.0, y)) + 0.18 * (np.abs(y - 29.3) < 0.45)

    def sdf(q):
        return lathe(q, 0, 0, R, 0, 30.0) - 0.05

    def albedo(q, n):
        y = q[:, 1]
        a = np.full(len(q), 0.2)  # dark green glass
        lab = (y > 5.5) & (y < 13.5)
        a = np.where(lab, 0.9, a)
        a = np.where(lab & ((np.abs(y - 6.2) < 0.25) | (np.abs(y - 12.8) < 0.25)), 0.35, a)
        a = np.where(lab & (np.abs(y - 9.6) < 1.5) & side_toward_cam(n, 0.75), 0.45, a)  # emblem, no lettering
        a = np.where(y > 24.5, 0.42, a)  # foil capsule
        return a

    def spec(q, n):
        return np.where((q[:, 1] > 5.5) & (q[:, 1] < 13.5), 0.2, 1.5)

    return sdf, albedo, 30.0, spec


def type_pint():
    def R(y):
        return 2.9 + 1.05 * (y / 15.0) + 0.32 * np.exp(-(((y - 12.6) / 0.8) ** 2))

    HEAD = 13.0

    def sdf(q):
        return lathe(q, 0, 0, R, 0, 15.2) - 0.04

    def albedo(q, n):
        y = q[:, 1]
        a = 0.36 + 0.14 * dots(q, 2.0, 0.6, 0.12)  # beer, rising bubbles
        a = np.where(y < 0.9, 0.55, a)  # thick glass base
        a = np.where(y > HEAD, 0.94 - 0.06 * P.fbm(q[:, 0] * 3, y * 3, q[:, 2] * 3, 2), a)  # head
        a = np.where(np.abs(y - HEAD) < 0.15, 0.6, a)
        return a

    return sdf, albedo, 15.0, glass_spec(1.3)


def type_tin():
    H = 10.6

    def R(y):
        ribs = 0.08 * (0.5 + 0.5 * np.cos(TAU * y / 0.85)) * ((y > 1.4) & (y < H - 1.4))
        rims = 0.12 * ((y < 0.45) | (y > H - 0.45))
        return 3.7 - ribs + rims

    def sdf(q):
        body = lathe(q, 0, 0, R, 0, H) - 0.03
        body = np.maximum(body, -cyl(q, 0, 0, 3.45, H - 0.25, H + 1.0))
        pull = np.hypot(np.hypot(q[:, 0] - 1.7, q[:, 2] + 0.2) - 0.75, q[:, 1] - (H - 0.15)) - 0.13
        tab = box(q, (0.5, H - 0.15, -0.2), (0.7, 0.08, 0.45), 0.05)
        return np.minimum.reduce([body, pull, tab])

    def albedo(q, n):
        y = q[:, 1]
        rho = np.hypot(q[:, 0], q[:, 2])
        a = np.full(len(q), 0.62)
        top = (y > H - 0.5) & (n[:, 1] > 0.6)
        a = np.where(top, 0.72 - 0.25 * (np.mod(rho, 0.7) < 0.12), a)
        return a

    return sdf, albedo, 12.0, glass_spec(0.9)


def type_box():
    HX, HY, HZ = 9.5, 14.0, 3.5
    YAW = -0.15

    def lq(q):
        return roty(q, (0.0, 0.0), YAW)

    def sdf(q):
        return box(lq(q), (0, HY, 0), (HX, HY, HZ), 0.15)

    def albedo(q, n):
        l = lq(q)
        x, y, z = l[:, 0], l[:, 1], l[:, 2]
        front = z < -HZ + 0.05
        a = np.full(len(q), 0.66)
        a = np.where(y > 2 * HY - 0.05, 0.78 - 0.4 * (np.abs(z) < 0.08), a)  # top, tuck flap line
        f = np.full(len(q), 0.86)
        f = np.where(y > 22.5, 0.3, f)  # top band
        f = np.where(np.abs(y - 21.6) < 0.3, 0.55, f)
        bowl = ((x / 6.8) ** 2 + ((y - 10.5) / 5.0) ** 2 < 1) & (y < 10.5)
        flakes = ((x / 6.2) ** 2 + ((y - 11.0) / 2.6) ** 2 < 1) & (y >= 10.5)
        f = np.where(bowl, 0.28, f)
        f = np.where(flakes, np.where(dots(l * np.array([1, 1, 0]), 1.4, 0.15, 0.42), 0.48, 0.75), f)
        f = np.where(np.abs(np.hypot(x - 5.2, y - 18.0) - 2.2) < 0.35, 0.4, f)  # a roundel, no lettering
        f = np.where(y < 3.0, 0.55, f)
        return np.where(front, f, a)

    return sdf, albedo, 36.0


def type_packet():
    TILT = math.radians(30)  # leans back, face up to the light
    BASE = np.array([0.0, 0.0, 0.0])

    def lq(q):
        l = rotx(q - np.array([0, 11.6 * math.cos(TILT), 0]) * 1.0, -TILT)
        return l

    def sdf(q):
        l = lq(q)
        x, y, z = l[:, 0], l[:, 1], l[:, 2]
        t = 2.4 * np.sqrt(np.clip(1 - (y / 10.2) ** 2, 0, 1)) * np.sqrt(np.clip(1 - (x / 8.3) ** 4, 0, 1))
        crumple = 0.12 * (P.fbm(x * 0.7, y * 0.7, 0, 2) - 0.5)
        pillow = np.maximum.reduce([(np.abs(z) - t - 0.12 + crumple) * 0.55, np.abs(x) - 8.0, np.abs(y) - 10.0])
        tri = np.abs(np.mod(x * 2.6, 1.0) - 0.5)
        seal = np.maximum.reduce([np.abs(z) - 0.13, np.abs(x) - 8.0, np.abs(y) - (11.3 - 0.35 * tri)])
        return np.minimum(pillow, seal)

    def albedo(q, n):
        l = lq(q)
        x, y = l[:, 0], l[:, 1]
        a = 0.5 + 0.16 * (P.fbm(x * 1.2, y * 1.2, 0, 2) - 0.5)
        oval = (x / 5.4) ** 2 + ((y + 0.5) / 4.0) ** 2 < 1
        a = np.where(oval, 0.88, a)
        crisp = oval & (dots(np.stack([x, y, x * 0], -1), 0.75, 0.25, 0.45))
        a = np.where(crisp, 0.62, a)
        a = np.where(np.abs(y - 6.6) < 0.55, 0.85, a)  # a plain stripe, no lettering
        sealz = np.abs(y) > 10.0
        a = np.where(sealz, np.where(np.mod(x * 2.6, 1.0) < 0.5, 0.35, 0.65), a)
        return a

    return sdf, albedo, 24.0, glass_spec(0.6)


def type_jar():
    def R(y):
        return np.where(y < 7.6, 4.2, 3.6) + 0.35 * ((y > 8.2) & (y < 10.3))

    def sdf(q):
        return lathe(q, 0, 0, R, 0, 10.3) - 0.25

    def albedo(q, n):
        y = q[:, 1]
        ang = np.arctan2(q[:, 2], q[:, 0])
        a = np.where(y < 7.0, 0.26 + 0.12 * dots(q, 1.8, 0.5, 0.25), 0.8)  # preserve, glass headspace
        lab = (y > 2.0) & (y < 5.6)
        a = np.where(lab, 0.92, a)
        a = np.where(lab & ((np.abs(y - 2.3) < 0.18) | (np.abs(y - 5.3) < 0.18)), 0.4, a)
        lid = y > 8.1
        side = lid & (n[:, 1] < 0.6)
        a = np.where(side, 0.45 + 0.3 * (np.cos(ang * 64) > 0.3), a)
        a = np.where(lid & (n[:, 1] >= 0.6), 0.55 - 0.2 * (np.abs(np.hypot(q[:, 0], q[:, 2]) - 3.2) < 0.15), a)
        return a

    def spec(q, n):
        return np.where((q[:, 1] < 8.1) & ~((q[:, 1] > 2.0) & (q[:, 1] < 5.6)), 1.2, 0.3)

    return sdf, albedo, 13.0, spec


def type_carton():
    HX, HZ, H = 3.7, 3.7, 18.0
    YAW = 0.2

    def lq(q):
        return roty(q, (0.0, 0.0), YAW)

    def sdf(q):
        l = lq(q)
        x, y, z = l[:, 0], l[:, 1], l[:, 2]
        body = box(l, (0, H / 2, 0), (HX, H / 2, HZ), 0.12)
        roof = np.maximum.reduce([(y - (H + 3.4) + 0.92 * np.abs(z)) / math.hypot(1, 0.92), H - 0.1 - y, np.abs(x) - HX])
        fin = box(l, (0, H + 3.9, 0), (HX, 0.6, 0.14), 0.05)
        cap = seg(l, (0.0, H + 1.55, -1.85), (0.0, H + 2.55, -2.75), 1.05)
        return np.minimum.reduce([body, roof, fin, cap])

    def albedo(q, n):
        l = lq(q)
        x, y, z = l[:, 0], l[:, 1], l[:, 2]
        a = np.full(len(q), 0.9)
        wave = 9.0 + 0.9 * np.sin(x * 0.9 + z * 0.9)
        a = np.where((y < wave) & (y > 1.0) & (n[:, 1] < 0.5), 0.42, a)
        a = np.where((y < 1.0), 0.6, a)
        cap = np.linalg.norm(l - np.array([0, H + 2.2, -2.3]), axis=-1) < 1.5
        a = np.where(cap, 0.3, a)
        a = np.where(y > H + 3.3, 0.8 - 0.3 * (np.mod(x * 3, 1) < 0.15), a)
        return a

    return sdf, albedo, 24.0


def type_fruit():
    A = np.array([-2.6, 0.0, 0.4])
    O = np.array([3.9, 3.6, 2.2])

    def apple(q):
        l = q - (A + np.array([0, 3.8, 0]))
        d = ellipsoid(l, (4.1, 3.8, 4.1))
        dimple = P.sd_sphere(l, np.array([0, 4.2, 0]), 1.5)
        return -smin(-d, dimple, 0.8)

    def sdf(q):
        ap = apple(q)
        stem = P.sd_capsule(q, A + np.array([0, 6.6, 0]), A + np.array([0.35, 8.9, 0.1]), 0.17)
        leaf_l = rotx(roty(q, (A[0] - 1.6, A[2] + 0.2), 0.6) - np.array([0, A[1] + 8.4, 0]), 0.35)
        leaf = ellipsoid(leaf_l, (1.9, 0.12, 0.85))
        orange = P.sd_sphere(q, O, 3.6) + 0.04 * dots(q, 3.0, 0.0, 0.3)
        return np.minimum.reduce([ap, stem, leaf, orange])

    def albedo(q, n):
        dA = np.linalg.norm(q - (A + np.array([0, 3.8, 0])), axis=-1)
        dO = np.linalg.norm(q - O, axis=-1)
        ang = np.arctan2(q[:, 2] - A[2], q[:, 0] - A[0])
        a = np.full(len(q), 0.3)  # stem / leaf
        appl = (dA < 4.4) & (q[:, 1] < A[1] + 7.6)
        a = np.where(appl, 0.4 + 0.12 * (np.cos(ang * 9 + P.fbm(q[:, 0], q[:, 1], q[:, 2], 2) * 6) > 0.4), a)
        org = dO < 3.8
        a = np.where(org, 0.64 - 0.14 * dots(q, 3.0, 0.0, 0.28), a)
        a = np.where(org & (np.hypot(q[:, 0] - O[0], q[:, 2] - O[2]) < 0.35) & (q[:, 1] > O[1] + 3.3), 0.2, a)
        leaf = (q[:, 1] > A[1] + 7.9) & (dA > 4.0)
        a = np.where(leaf, 0.28, a)
        return a

    return sdf, albedo, 16.0, glass_spec(0.6)


CARROTS = [((-9.5, 1.4, -1.0), (5.5, 0.4, -4.6), 1.45), ((-9.0, 1.35, 1.6), (6.5, 0.35, -1.0), 1.4), ((-9.4, 3.6, 0.1), (5.0, 2.0, -2.6), 1.3)]
BROC = np.array([4.5, 0.0, 5.0])


def veg_parts(q):
    car = np.full(len(q), 1e9)
    tcar = np.zeros(len(q))
    for a, b, r in CARROTS:
        d, t = cone(q, a, b, r, 0.18)
        tcar = np.where(d < car, t, tcar)
        car = np.minimum(car, d)
    tops = np.full(len(q), 1e9)
    for a, b, r in CARROTS:
        a = np.array(a)
        for k in range(4):
            ang = -0.5 + 0.33 * k
            end = a + np.array([-5.5 * math.cos(ang), 1.2 + 0.9 * k, 5.5 * math.sin(ang)])
            tops = np.minimum(tops, P.sd_capsule(q, a, end, 0.22))
            tops = np.minimum(tops, ellipsoid(q - end, (1.5, 0.35, 1.0)) - 0.05 * P.fbm(q[:, 0] * 3, q[:, 1] * 3, q[:, 2] * 3, 1))
    stalk = cone(q, BROC + np.array([0, 0.0, 0]), BROC + np.array([0, 5.5, 0]), 1.5, 1.1)[0]
    head = np.full(len(q), 1e9)
    for i in range(9):
        th = i * 2.4
        rr = 0.0 if i == 0 else 2.6
        c = BROC + np.array([rr * math.cos(th), 7.8 - 0.25 * rr, rr * math.sin(th)])
        head = np.minimum(head, P.sd_sphere(q, c, 2.4))
    head = smin(head, 1e9 * np.ones(len(q)), 0.1) - 0.35 * (P.fbm(q[:, 0] * 1.6, q[:, 1] * 1.6, q[:, 2] * 1.6, 2) - 0.5)
    return car, tcar, tops, stalk, head


def type_veg():
    def sdf(q):
        car, _, tops, stalk, head = veg_parts(q)
        return np.minimum.reduce([car, tops, smin(stalk, head, 0.8)]) * 0.9

    def albedo(q, n):
        car, tcar, tops, stalk, head = veg_parts(q)
        m = np.argmin(np.stack([car, tops, stalk, head]), 0)
        a = np.full(len(q), 0.55)
        a = np.where(m == 0, 0.56 - 0.25 * (np.mod(tcar * 16, 1.0) < 0.07), a)  # carrot rings
        a = np.where(m == 1, 0.3, a)
        a = np.where(m == 2, 0.66, a)
        a = np.where(m == 3, 0.24 + 0.2 * dots(q, 3.5, 0.35, 0.3), a)  # floret buds
        return a

    return sdf, albedo, 22.0


STEAKS = [((-2.9, 1.25, 0.4), 0.35), ((3.0, 1.55, -0.4), -0.45)]


def steak_d(q):
    d = np.full(len(q), 1e9)
    for (cx, cy, cz), yaw in STEAKS:
        l = roty(q, (cx, cz), yaw) - np.array([0, cy, 0])
        # a flat cut: an irregular oval slab 1.2 cm thick with softened edges
        wob = 0.35 * (P.fbm(q[:, 0] * 0.45, 0, q[:, 2] * 0.45, 2) - 0.5)
        dxz = (np.hypot(l[:, 0] / 4.4, l[:, 2] / 3.2) - 1) * 3.2 + wob + 0.35
        dy = np.abs(l[:, 1]) - 0.6 + 0.35
        slab = np.minimum(np.maximum(dxz, dy), 0) + np.hypot(np.maximum(dxz, 0), np.maximum(dy, 0)) - 0.35
        d = np.minimum(d, slab)
    return d


def type_meat():
    TOP = 2.2

    def tray(q):
        t = box(q, (0, TOP / 2, 0), (9.4, TOP / 2, 6.8), 0.6)
        t = np.maximum(t, -box(q, (0, TOP + 0.6, 0), (8.7, TOP, 6.1), 0.5))
        lip = np.maximum(box(q, (0, TOP - 0.08, 0), (10.0, 0.08, 7.4), 0.08), -box(q, (0, TOP, 0), (8.9, 1.0, 6.3), 0.5))
        return np.minimum(t, lip)

    def label(q):
        return box(q, (-5.4, 2.85, -3.4), (2.6, 0.04, 1.7), 0.02)

    def sdf(q):
        return np.minimum.reduce([tray(q), steak_d(q) * 0.8, label(q)])

    def albedo(q, n):
        x, z = q[:, 0], q[:, 2]
        a = np.full(len(q), 0.88)
        meat = steak_d(q) < 0.08
        marbling = 0.2 + 0.4 * (np.abs(P.fbm(x * 1.1, 0, z * 1.1, 3) - 0.5) < 0.04)
        a = np.where(meat, np.where(n[:, 1] < 0.6, 0.8, marbling), a)  # fat rind on the sides
        lab = label(q) < 0.05
        bars = np.mod(x * 4.5, 1) < 0.45
        a = np.where(lab, np.where((np.abs(z + 4.1) < 0.6) & (np.abs(x + 6.0) < 1.4) & bars, 0.2, 0.96), a)
        a = np.where(lab & (np.abs(z + 2.5) < 0.18) & (np.abs(x + 5.4) < 2.1), 0.45, a)
        return a

    def spec(q, n):
        return np.full(len(q), 0.12)  # a trace of film sheen

    return sdf, albedo, 19.0, spec


PEAS = [(0.6 + 1.1 * math.cos(i * 2.39) * math.sqrt(i) * 0.55, 3.6 + 1.1 * math.sin(i * 2.39) * math.sqrt(i) * 0.55) for i in range(14)]


def type_meal():
    def plate_d(q):
        rho = np.hypot(q[:, 0], q[:, 2])
        top = 0.75 + 0.65 * ss(6.8, 11.5, rho)
        return np.maximum.reduce([rho - 11.8, (q[:, 1] - top) * 0.8, 0.2 - q[:, 1]]) - 0.08

    def food(q):
        fillet = ellipsoid(roty(q, (-2.6, -1.0), 0.4) - np.array([0, 1.6, 0]), (4.2, 1.0, 2.4))
        mash = P.sd_sphere(q, np.array([3.4, 1.0, -1.6]), 2.5) - 0.3 * (P.fbm(q[:, 0] * 1.2, q[:, 1] * 1.2, q[:, 2] * 1.2, 2) - 0.5)
        mash = np.maximum(mash, 0.8 - q[:, 1])
        peas = np.full(len(q), 1e9)
        for px, pz in PEAS:
            peas = np.minimum(peas, P.sd_sphere(q, np.array([px, 1.35, pz]), 0.55))
        return fillet, mash, peas

    def cutlery(q):
        knife = np.minimum(box(q, (13.8, 0.12, -3.0), (0.55, 0.08, 6.2), 0.06), box(q, (13.8, 0.3, 6.0), (0.6, 0.3, 4.0), 0.25))
        fork = box(q, (-13.8, 0.3, 6.0), (0.55, 0.3, 4.0), 0.25)
        fork = np.minimum(fork, box(q, (-13.8, 0.15, -1.2), (0.25, 0.08, 4.0), 0.05))
        fork = np.minimum(fork, box(q, (-13.8, 0.15, -5.6), (0.95, 0.08, 0.8), 0.05))
        tines = np.maximum(box(q, (-13.8, 0.15, -7.9), (0.95, 0.08, 1.6), 0.03), 0.07 - np.abs(np.mod(q[:, 0] + 13.8 + 0.95, 0.63) - 0.315))
        return knife, np.minimum(fork, tines)

    def sdf(q):
        fillet, mash, peas = food(q)
        knife, fork = cutlery(q)
        return np.minimum.reduce([plate_d(q), fillet, mash, peas, knife, fork])

    def albedo(q, n):
        fillet, mash, peas = food(q)
        knife, fork = cutlery(q)
        rho = np.hypot(q[:, 0], q[:, 2])
        a = np.where(np.abs(rho - 10.6) < 0.18, 0.5, 0.93)  # plate rim line
        a = np.where(fillet < 0.05, 0.55 - 0.18 * dots(q, 2.5, 0.4, 0.3), a)
        a = np.where(mash < 0.05, 0.9, a)
        a = np.where(peas < 0.05, 0.32, a)
        a = np.where(knife < 0.05, np.where(q[:, 2] > 2.0, 0.25, 0.62), a)
        a = np.where(fork < 0.05, np.where(q[:, 2] > 2.0, 0.25, 0.62), a)
        return a

    return sdf, albedo, 29.0, glass_spec(0.4)


def type_toiletry():
    B = np.array([-3.4, 0.0, 2.2])

    def R(y):
        return np.where(y < 11.5, 3.1, 3.1 + (1.35 - 3.1) * ss(11.5, 13.5, y)) + 0.25 * ((y > 13.5) & (y < 14.8)) - 0.85 * (y > 14.8)

    def pump(q):
        body = lathe(q, B[0], B[2], R, 0, 16.4) - 0.1
        head = box(q, (B[0], 16.9, B[2]), (1.0, 0.55, 1.0), 0.3)
        nozzle = seg(q, (B[0], 17.0, B[2]), (B[0] + 2.9, 17.0, B[2] - 1.0), 0.32)
        return np.minimum.reduce([body, head, nozzle])

    def tube(q):
        x = q[:, 0]
        t = np.clip((x + 1.0) / 13.0, 0, 1)
        hw = 1.65 + 0.85 * t
        ht = 1.65 * (1 - t) ** 0.7 + 0.12
        yy, zz = q[:, 1] - ht, q[:, 2] + 5.6
        r = np.minimum(ht, hw) * 0.95
        qy, qz = np.abs(yy) - (ht - r), np.abs(zz) - (hw - r)
        d2 = np.hypot(np.maximum(qy, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qy, qz), 0) - r
        d = np.maximum(d2, np.maximum(-1.0 - x, x - 12.6)) * 0.85
        capd = seg(q, (-3.2, 1.65, -5.6), (-0.9, 1.65, -5.6), 1.5) - 0.05
        return np.minimum(d, capd)

    def sdf(q):
        return np.minimum(pump(q), tube(q))

    def albedo(q, n):
        x, y = q[:, 0], q[:, 1]
        a = np.full(len(q), 0.82)
        isp = pump(q) < tube(q)
        lab = isp & (y > 3.0) & (y < 9.5)
        a = np.where(lab, 0.94, a)
        a = np.where(lab & (np.abs(y - 8.4) < 0.5), 0.45, a)
        a = np.where(isp & (y > 13.4), 0.25, a)
        tb = ~isp
        a = np.where(tb & (np.abs(x - 6.5) < 1.0), 0.45, a)  # a band, no lettering
        a = np.where(tb & (x > 11.6), 0.7 - 0.35 * (np.mod(x * 4, 1) < 0.3), a)  # crimp
        a = np.where(tb & (x < -0.9), 0.28, a)  # cap
        return a

    return sdf, albedo, 24.0, glass_spec(0.5)


TOWELS = [(0.0, 0.0, 0.55), (0.5, 0.25, 0.86), (-0.4, -0.15, 0.68), (0.3, 0.1, 0.9)]


def type_textile():
    T = 1.9

    def parts(q):
        ds = []
        for i, (dx, yaw, _) in enumerate(TOWELS):
            l = roty(q, (dx, 0.0), yaw * 0.25) - np.array([0, T * (2 * i + 1) + 0.02 * i, 0])
            ds.append(box(l, (0, 0, 0), (8.4, T, 5.6), T * 0.92) + 0.06 * (P.fbm(q[:, 0] * 2, q[:, 1] * 2, q[:, 2] * 2, 2) - 0.5))
        return np.stack(ds)

    def sdf(q):
        return parts(q).min(0) * 0.9

    def albedo(q, n):
        ds = parts(q)
        i = ds.argmin(0)
        base = np.array([t[2] for t in TOWELS])[i]
        x = q[:, 0]
        terry = 0.08 * (P.fbm(q[:, 0] * 6, q[:, 1] * 6, q[:, 2] * 6, 2) - 0.5)
        hem = (np.abs(np.abs(x) - 6.6) < 0.55)
        return np.where(hem, base - 0.32, base + terry)

    return sdf, albedo, 18.0


def type_kitchenware():
    PC = np.array([-2.5, 0.0, 2.5])
    PL = np.array([-5.5, 0.0, -8.8])

    def pan(q):
        outer = cyl(q, PC[0], PC[2], 6.6, 0, 7.2, 0.5)
        inner = cyl(q, PC[0], PC[2], 6.2, 0.6, 9.0, 0.3)
        handle = seg(q, PC + np.array([6.3, 6.0, -2.0]), PC + np.array([14.0, 7.4, -7.0]), 0.62) - 0.12
        return np.minimum(np.maximum(outer, -inner), handle)

    def plate(q):
        l = q - PL
        rho = np.hypot(l[:, 0], l[:, 2])
        top = 0.5 + 0.55 * ss(4.8, 8.6, rho)
        return np.maximum.reduce([rho - 8.8, (l[:, 1] - top) * 0.8, 0.15 - l[:, 1]]) - 0.06

    def sdf(q):
        return np.minimum(pan(q), plate(q))

    def albedo(q, n):
        ispl = plate(q) < pan(q)
        rho = np.hypot(q[:, 0] - PL[0], q[:, 2] - PL[2])
        a = np.full(len(q), 0.58)
        rhop = np.hypot(q[:, 0] - PC[0], q[:, 2] - PC[2])
        a = np.where((rhop < 6.25) & (q[:, 1] < 6.9), 0.4, a)  # pan interior
        a = np.where(np.linalg.norm(q - (PC + np.array([10.0, 6.7, -4.5])), axis=-1) < 4.6, 0.18, a)  # handle
        a = np.where(ispl, np.where(np.abs(rho - 7.4) < 0.3, 0.4, 0.93), a)
        return a

    def spec(q, n):
        return np.where(plate(q) < pan(q), 0.5, 1.2)

    return sdf, albedo, 25.0, spec


def type_appliance():
    def R(y):
        return 5.7 - 0.9 * ss(1.4, 19.0, y)

    def parts(q):
        base = cyl(q, 0, 0, 6.5, 0, 1.4, 0.4)
        body = lathe(q, 0, 0, R, 1.3, 19.0) - 0.25
        lid = cyl(q, 0, 0, 3.4, 18.8, 19.9, 0.4)
        knob = cyl(q, 0, 0, 1.0, 19.6, 20.9, 0.3)
        hx = -1.0  # handle on the screen-right (−x) side
        handle = np.minimum.reduce([
            seg(q, (hx * 8.6, 4.0, 0), (hx * 8.4, 17.6, 0), 1.0),
            seg(q, (hx * 4.6, 17.8, 0), (hx * 8.6, 17.8, 0), 1.0),
            seg(q, (hx * 5.3, 4.0, 0), (hx * 8.7, 4.0, 0), 1.0),
        ]) - 0.1
        spout = ellipsoid(roty(q, (4.9, 0.0), 0.0) - np.array([0, 17.3, 0]), (2.0, 1.4, 1.5))
        spout = np.maximum(spout, -(q[:, 0] - 4.0))
        return base, body, lid, knob, handle, spout

    def sdf(q):
        base, body, lid, knob, handle, spout = parts(q)
        return np.minimum.reduce([base, smin(body, spout, 0.6), lid, knob, handle])

    def albedo(q, n):
        base, body, lid, knob, handle, spout = parts(q)
        y = q[:, 1]
        a = np.full(len(q), 0.92)
        a = np.where(base < 0.05, 0.25, a)
        a = np.where(handle < 0.05, 0.3, a)
        a = np.where((knob < 0.05) | (lid < 0.05) & (y > 19.4), 0.35, a)
        win = side_toward_cam(n, 0.985) & (y > 4.0) & (y < 15.5) & (body < 0.05)
        a = np.where(win, np.where(np.mod(y, 2.0) < 0.15, 0.7, 0.18), a)  # water window, level marks
        return a

    return sdf, albedo, 22.0, glass_spec(0.7)


def type_chair():
    # modelled in cm at full size; drawn at a fixed scale (see SCALE_OVERRIDE)
    def parts(q):
        seat = box(q, (0, 45, 0), (21, 2.2, 20), 1.2)
        legs = np.minimum.reduce([seg(q, (sx * 18.5, 0, sz * 17), (sx * 17.5, 44, sz * 16.5), 2.0) for sx in (-1, 1) for sz in (-1, 1)])
        posts = np.minimum.reduce([seg(q, (sx * 17.5, 45, 16.5), (sx * 18.5, 90, 20.5), 2.1) for sx in (-1, 1)])
        rail = box(q, (0, 85, 19.8), (19, 4.2, 1.5), 0.8)
        spindles = np.minimum.reduce([seg(q, (x, 46, 17.2), (x, 81, 19.4), 1.2) for x in (-9.0, 0.0, 9.0)])
        stretch = np.minimum.reduce([seg(q, (sx * 18.2, 15, -16.5), (sx * 18.2, 15, 16.5), 1.3) for sx in (-1, 1)])
        stretch = np.minimum(stretch, seg(q, (-18, 13, 0), (18, 13, 0), 1.3))
        return seat, np.minimum.reduce([legs, posts, rail, spindles, stretch])

    def sdf(q):
        seat, frame = parts(q)
        return np.minimum(seat, frame)

    def albedo(q, n):
        seat, frame = parts(q)
        grain = 0.08 * (np.mod(q[:, 0] * 0.5 + 2 * P.fbm(q[:, 0] * 0.1, q[:, 1] * 0.02, q[:, 2] * 0.1, 2), 1) < 0.3)
        a = np.where(seat < frame, 0.6 - grain, 0.5)
        return a

    return sdf, albedo, 90.0


def type_tools():
    def parts(q):
        tb = box(q, (0, 5.8, 1.5), (13.5, 5.8, 6.2), 0.6)
        handle = np.minimum.reduce([seg(q, (-6, 11.4, 1.5), (-6, 14.2, 1.5), 0.6), seg(q, (6, 11.4, 1.5), (6, 14.2, 1.5), 0.6), seg(q, (-6, 14.2, 1.5), (6, 14.2, 1.5), 0.75)])
        # hammer on the table in front, its T-shape square to the camera; screwdriver on the lid
        h_handle = seg(q, (-4.5, 0.9, -10.6), (9.5, 0.9, -12.0), 0.9)
        h_head = np.minimum(seg(q, (-5.9, 1.35, -14.4), (-5.5, 1.35, -9.2), 1.35), cone(q, (-5.5, 1.35, -9.2), (-5.1, 0.6, -6.6), 1.1, 0.35)[0])
        sd_handle = seg(q, (-8.5, 12.9, -1.0), (-3.0, 12.9, -1.6), 1.2) - 0.1
        sd_shaft = seg(q, (-3.0, 12.9, -1.6), (5.5, 12.9, -2.4), 0.36)
        return tb, handle, np.minimum(h_handle, 1e9), h_head, sd_handle, sd_shaft

    def sdf(q):
        return np.minimum.reduce(list(parts(q)))

    def albedo(q, n):
        ps = np.stack(parts(q))
        i = ps.argmin(0)
        a = np.array([0.5, 0.22, 0.48, 0.16, 0.22, 0.72])[i]
        a = np.where((i == 0) & (np.abs(q[:, 1] - 8.4) < 0.18), 0.15, a)  # lid line
        a = np.where((i == 0) & side_toward_cam(n, 0.8) & (np.abs(q[:, 1] - 8.4) < 1.0) & (np.abs(q[:, 0]) < 1.4), 0.75, a)  # catch
        a = np.where((i == 4) & (np.mod(q[:, 0] * 1.3, 1) < 0.3), 0.5, a)  # grip ribs
        return a

    def spec(q, n):
        ps = np.stack(parts(q))
        i = ps.argmin(0)
        return np.where((i == 3) | (i == 5), 1.2, 0.3)

    return sdf, albedo, 35.0, spec


TICKETS = [((-1.2, 0.0, 1.0), 0.18, 0.0), ((1.4, 0.06, -1.4), -0.22, 1.0)]


def ticket_local(q, c, yaw):
    return roty(q, (c[0], c[2]), yaw) - np.array([0, c[1], 0])


def ticket_lift(u):
    return 0.06 + 0.9 * np.clip((u - 3.8) / 3.4, 0, 1) ** 2  # the stub curls up off the table


def type_ticket():
    def one(q, c, yaw):
        l = ticket_local(q, c, yaw)
        u, v = l[:, 0], l[:, 2]
        notch = np.minimum(np.hypot(u - 3.6, v - 3.0), np.hypot(u - 3.6, v + 3.0)) - 0.35
        d = np.maximum.reduce([np.abs(l[:, 1] - ticket_lift(u)) - 0.05, np.abs(u) - 7.2, np.abs(v) - 3.0, -notch])
        return d * 0.7

    def sdf(q):
        return np.minimum.reduce([one(q, c, yaw) for c, yaw, _ in TICKETS])

    def albedo(q, n):
        ds = np.stack([one(q, c, yaw) for c, yaw, _ in TICKETS])
        k = ds.argmin(0)
        a = np.full(len(q), 0.95)
        for j, (c, yaw, _) in enumerate(TICKETS):
            l = ticket_local(q, c, yaw)
            u, v = l[:, 0], l[:, 2]
            m = k == j
            band = v < -1.9
            perf = (np.abs(u - 3.6) < 0.09) & (np.mod(v, 0.5) < 0.25)
            lines = (u > -6.3) & (u < 2.3) & (v > -1.3) & (v < 2.2) & (np.mod(v + 1.3, 0.85) < 0.32) & (u < np.where(np.mod(v * 1.17, 1.0) < 0.5, 1.6, -0.6))
            barcode = (u > 4.3) & (u < 6.5) & (np.abs(v) < 1.9) & (P.h3(np.floor(u * 7), 0, 0) > 0.45)
            t = np.where(band, 0.3, np.where(perf, 0.25, np.where(lines, 0.5, np.where(barcode, 0.15, 0.95))))
            a = np.where(m, t, a)
        return a

    return sdf, albedo, 12.5


def type_bike():
    # modelled in cm at full size, drawn at a fixed scale; tubes thickened so it reads small
    YAW = math.atan2(CAM_DIR[2], CAM_DIR[0]) + math.radians(12)
    RW, TYRE = 33.0, 4.0
    BB = (0.0, 32.0)
    SC = (-13.0, 80.0)
    HT, HB = (42.0, 84.0), (46.0, 68.0)
    RA, FA = (-53.0, RW + TYRE), (55.0, RW + TYRE)

    def lq(q):
        return roty(q, (0.0, 0.0), YAW)

    def wheel(l, cx, cy):
        x, y, z = l[:, 0] - cx, l[:, 1] - cy, l[:, 2]
        r = np.hypot(x, y)
        tyre = np.hypot(r - RW, z) - TYRE
        th = np.arctan2(y, x)
        step = TAU / 12
        dth = th - np.round(th / step) * step
        spokes = np.maximum(np.hypot(r * np.sin(dth), z) - 0.9, r - RW)
        hub = seg(l, (cx, cy, -4), (cx, cy, 4), 2.6)
        return np.minimum.reduce([tyre, spokes, hub])

    def parts(l):
        def t(a, b, r):
            return seg(l, (a[0], a[1], 0), (b[0], b[1], 0), r)

        wheels = np.minimum(wheel(l, *RA), wheel(l, *FA))
        frame = np.minimum.reduce([t(BB, SC, 2.8), t(SC, HT, 2.6), t(BB, HB, 3.0), t(HB, HT, 3.1), t(BB, RA, 2.0), t(SC, RA, 1.8), t(HB, FA, 2.2)])
        post = t(SC, (-16.0, 92.0), 1.8)
        saddle = ellipsoid(l - np.array([-14.0, 94.5, 0.0]), (12.0, 2.6, 5.5))
        stem = t(HT, (38.0, 93.0), 1.8)
        bars = seg(l, (40.0, 93.0, -22.0), (40.0, 93.0, 22.0), 1.7)
        ring = np.hypot(np.hypot(l[:, 0] - BB[0], l[:, 1] - BB[1]) - 10.0, l[:, 2] + 5.0) - 1.2
        crank = seg(l, (BB[0], BB[1], -7.0), (BB[0] + 7.0, BB[1] - 15.0, -7.0), 1.4)
        pedal = box(l, (BB[0] + 7.0, BB[1] - 15.0, -11.0), (4.5, 1.2, 3.5), 0.5)
        stand = seg(l, (-14.0, 30.0, 4.0), (-24.0, 0.8, 16.0), 1.4)
        return wheels, np.minimum.reduce([frame, post, stem, bars, crank, stand]), saddle, np.minimum(ring, pedal)

    def sdf(q):
        return np.minimum.reduce(list(parts(lq(q))))

    def albedo(q, n):
        l = lq(q)
        ps = np.stack(parts(l))
        i = ps.argmin(0)
        a = np.array([0.2, 0.5, 0.18, 0.3])[i]
        # tyre tread dark, rim lighter
        for cx, cy in (RA, FA):
            r = np.hypot(l[:, 0] - cx, l[:, 1] - cy)
            a = np.where((i == 0) & (np.abs(r - RW) < 2.2) & (r < RW - 1.0), 0.65, a)
            a = np.where((i == 0) & (r < RW - 3.5), 0.55, a)
        return a

    return sdf, albedo, 170.0, glass_spec(0.6)


def type_car():
    # modelled in decimetres (a 4 m hatchback is 40 long), front at −x
    WX = (-11.2, 10.8)

    def parts(q):
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        body = box(q, (-0.6, 4.9, 0), (16.6, 3.3, 8.4), 2.2)
        arches = np.minimum.reduce([seg(q, (wx, 3.3, -9.5), (wx, 3.3, 9.5), 4.0) for wx in WX])
        body = np.maximum(body, -arches)
        cab = box(q, (3.0, 10.0, 0), (12.2, 3.2, 7.3), 1.9)
        ws = (-(x + 7.4)) * 0.72 + (y - 7.6) * 0.69  # raked windscreen
        rh = (x - 15.6) * 0.97 + (y - 7.6) * 0.24  # near-upright hatch
        cab = np.maximum.reduce([cab, ws, rh])
        shell = smin(body, cab, 0.7)
        wheels = np.minimum.reduce([seg(q, (wx, 3.3, sz * 8.4), (wx, 3.3, sz * 6.5), 3.3) for wx in WX for sz in (-1, 1)]) - 0.15
        return shell, wheels

    def sdf(q):
        shell, wheels = parts(q)
        return np.minimum(shell, wheels)

    def albedo(q, n):
        shell, wheels = parts(q)
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        a = np.full(len(q), 0.74)
        glass = (y > 8.4) & (y < 12.6) & (n[:, 1] < 0.85)
        pillar = ((np.abs(x - 1.0) < 0.55) | (np.abs(x - 10.4) < 0.9)) & (np.abs(n[:, 2]) > 0.6)
        a = np.where(glass & ~pillar, 0.14, a)
        front = x < -16.6
        lamps = front & (np.abs(z) > 4.3) & (np.abs(z) < 7.4) & (np.abs(y - 6.1) < 0.9)
        grille = front & (np.abs(z) < 3.6) & (np.abs(y - 4.7) < 0.8)
        a = np.where(lamps, 0.95, np.where(grille, 0.18, a))
        a = np.where((y < 2.9) & (shell < wheels), 0.35, a)  # bumpers, sills
        a = np.where((np.abs(x + 2.0) < 0.12) & (y > 2.8) & (y < 8.2) & (np.abs(n[:, 2]) > 0.6), 0.3, a)  # door line
        a = np.where((np.abs(x - 0.0) < 0.9) & (np.abs(y - 7.2) < 0.2) & (np.abs(n[:, 2]) > 0.6), 0.25, a)  # handle
        wh = wheels < shell
        hub = np.hypot(x - np.where(x < 0, WX[0], WX[1]), y - 3.3) < 1.9
        a = np.where(wh, np.where(hub & (np.abs(n[:, 2]) > 0.8), 0.62, 0.12), a)
        return a

    def spec(q, n):
        return np.where(q[:, 1] > 8.4, 1.2, 0.8)

    return sdf, albedo, 40.0, spec


TYPES = {
    "bottle": type_bottle,
    "pint": type_pint,
    "tin": type_tin,
    "box": type_box,
    "packet": type_packet,
    "jar": type_jar,
    "carton": type_carton,
    "fruit": type_fruit,
    "veg": type_veg,
    "meat": type_meat,
    "meal": type_meal,
    "toiletry": type_toiletry,
    "textile": type_textile,
    "kitchenware": type_kitchenware,
    "appliance": type_appliance,
    "chair": type_chair,
    "tools": type_tools,
    "ticket": type_ticket,
    "bike": type_bike,
    "car": type_car,
}

# big things are modelled at real size but drawn at a fixed scale so they fit the same frame
SCALE_OVERRIDE = {"type-chair": 0.25, "type-bike": 0.155, "type-car": 0.7}


ITEMS = {
    "bananas": lambda: item_bananas(),
    "butter": lambda: item_butter(),
    "eggs": lambda: item_eggs(),
    "instant-coffee": lambda: item_instant_coffee(),
    "restaurant-coffee": lambda: item_restaurant_coffee(),
    "semi-skimmed-milk": lambda: item_milk("striped"),
    "whole-milk": lambda: item_milk("solid"),
    "white-potatoes": lambda: item_potatoes(),
    "white-bread": lambda: item_bread("white"),
    "wholemeal-bread": lambda: item_bread("wholemeal"),
}
FEATURED = list(ITEMS)
ITEMS.update({f"type-{k}": v for k, v in TYPES.items()})

# per-item placement so each sits centred under the shared camera (cm, after scaling)
OFFSET = {
    "bananas": (1.5, 0.0, -0.5),
    "butter": (1.0, 0.0, 1.0),
    "eggs": (0.0, 0.0, -0.5),
    "instant-coffee": (0.0, 0.0, 2.0),
    "restaurant-coffee": (0.0, 0.0, 0.5),
    "semi-skimmed-milk": (0.0, 0.0, 0.0),
    "whole-milk": (0.0, 0.0, 0.0),
    "white-potatoes": (0.0, 0.0, 0.0),
    "white-bread": (0.0, 0.0, -3.0),
    "wholemeal-bread": (0.0, 0.0, -3.0),
}


def build(name, out, seed, res):
    made = ITEMS[name]()
    sdf, albedo, size = made[:3]
    spec = made[3] if len(made) > 3 else None
    s = SCALE_OVERRIDE.get(name) or display_scale(size)
    sdf_s, alb_s, spec_s = scaled(sdf, albedo, s, spec)
    off = np.array(OFFSET.get(name, (0, 0, 0)), float)

    def sdf_o(p):
        return sdf_s(p - off)

    def alb_o(p, n):
        return alb_s(p - off, n)

    spec_o = None if spec_s is None else (lambda p, n: spec_s(p - off, n))
    canvas = 1.4
    w, h = int(P.W * res * canvas), int(P.H * res * canvas)
    tone, obj = render(sdf_o, alb_o, w, h, spec_o, canvas)
    compose(tone, obj, out / f"b-{name}.png", seed, canvas)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(ITEMS))
    ap.add_argument("--size", default="1000x1000")
    ap.add_argument("--res", type=float, default=0.6, help="render resolution as a fraction of --size")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--preview", action="store_true", help="two-colour PNG instead of an alpha mask")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE, P.MASK, P.PREFIX = True, not a.preview, ""
    P.W, P.H = (int(v) for v in a.size.lower().split("x"))
    names = []
    for key in a.only.split(","):
        key = key.strip()
        names += FEATURED if key == "featured" else [f"type-{t}" for t in TYPES] if key == "types" else [key if key in ITEMS else f"type-{key}"]
    for name in names:
        build(name.strip(), a.out, a.seed, a.res)


if __name__ == "__main__":
    main()
