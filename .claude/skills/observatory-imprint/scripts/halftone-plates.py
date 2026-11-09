# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Technical penmanship plates for British Exchange.

Each plate renders a real British subject in 3D (signed-distance raymarching),
screens it through a coarse 45° halftone in one electric-blue ink with grain,
then knocks technical-drawing annotation (construction lines, dimensions,
labels) out of the halftone in XOR, so line work reads on both ink and paper.

Usage:
  uv run halftone-plates.py OUT_DIR [--only towers,turbine,block,pylons,globe] [--seed N]
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

INK = (6, 24, 245)  # sampled from the reference
PAPER = (255, 255, 255)
FONT = "/System/Library/Fonts/Menlo.ttc"
W, H = 1060, 1768  # reference proportions (portrait); --size overrides
BARE = False  # --bare: keep line work, drop all text and label tags
MASK = False  # --mask: export ink as alpha on transparent, so CSS can print it in any colour pair
PREFIX = ""
DATA = Path(".")  # --data: folder with API observation JSON for data-generated plates


# ───────────────────────── maths ─────────────────────────
def nrm(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def h3(i, j, k):
    s = np.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
    return s - np.floor(s)


def vnoise(x, y, z):
    xi, yi, zi = np.floor(x), np.floor(y), np.floor(z)
    xf, yf, zf = x - xi, y - yi, z - zi
    u, v, w = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf), zf * zf * (3 - 2 * zf)
    def c(a, b, d):
        return h3(xi + a, yi + b, zi + d)
    x00 = c(0, 0, 0) * (1 - u) + c(1, 0, 0) * u
    x10 = c(0, 1, 0) * (1 - u) + c(1, 1, 0) * u
    x01 = c(0, 0, 1) * (1 - u) + c(1, 0, 1) * u
    x11 = c(0, 1, 1) * (1 - u) + c(1, 1, 1) * u
    return (x00 * (1 - v) + x10 * v) * (1 - w) + (x01 * (1 - v) + x11 * v) * w


def fbm(x, y, z, octaves=4):
    s, a, f = 0.0, 0.5, 1.0
    for _ in range(octaves):
        s = s + a * vnoise(x * f, y * f, z * f)
        a *= 0.5
        f *= 2.03
    return s  # ~0..1


def sd_box(p, c, b):
    q = np.abs(p - c) - b
    return np.linalg.norm(np.maximum(q, 0), axis=-1) + np.minimum(np.max(q, axis=-1), 0)


def sd_sphere(p, c, r):
    return np.linalg.norm(p - c, axis=-1) - r


def sd_capsule(p, a, b, r):
    pa, ba = p - a, b - a
    h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    return np.linalg.norm(pa - h[:, None] * ba, axis=-1) - r


# ───────────────────────── camera + raymarch ─────────────────────────
class Cam:
    def __init__(self, pos, look, fov, w, h):
        self.pos = np.array(pos, float)
        self.f = nrm(np.array(look, float) - self.pos)
        self.r = nrm(np.cross(self.f, [0, 1, 0]))
        self.u = np.cross(self.r, self.f)
        self.t = math.tan(math.radians(fov) / 2)
        self.w, self.h = w, h

    def rays(self):
        a = self.w / self.h
        xs = ((np.arange(self.w) + 0.5) / self.w * 2 - 1) * a * self.t
        ys = (1 - (np.arange(self.h) + 0.5) / self.h * 2) * self.t
        d = self.f + xs[None, :, None] * self.r + ys[:, None, None] * self.u
        return nrm(d.reshape(-1, 3))

    def project(self, P, W_out, H_out):
        v = np.atleast_2d(np.array(P, float)) - self.pos
        z = v @ self.f
        x = (v @ self.r) / (z * self.t * (self.w / self.h))
        y = (v @ self.u) / (z * self.t)
        return np.stack([(x + 1) / 2 * W_out, (1 - y) / 2 * H_out], -1), z


def march(sdf, ro, rd, steps=140, far=400.0, k=0.85):
    n = rd.shape[0]
    t = np.zeros(n)
    hit = np.zeros(n, bool)
    alive = np.ones(n, bool)
    for _ in range(steps):
        idx = np.nonzero(alive)[0]
        if idx.size == 0:
            break
        d = sdf(ro + rd[idx] * t[idx, None])
        t[idx] += d * k
        h = d < 1e-3 * (1 + t[idx])
        hit[idx[h]] = True
        alive[idx[h | (t[idx] > far)]] = False
    return t, hit


def normals(sdf, p, e=1e-3):
    ex, ey, ez = np.array([e, 0, 0]), np.array([0, e, 0]), np.array([0, 0, e])
    return nrm(np.stack([sdf(p + ex) - sdf(p - ex), sdf(p + ey) - sdf(p - ey), sdf(p + ez) - sdf(p - ez)], -1))


def shadow(sdf, p, L, steps=56, k=10.0, tmax=120.0):
    res = np.ones(len(p))
    t = np.full(len(p), 0.05)
    for _ in range(steps):
        d = sdf(p + L * t[:, None])
        res = np.minimum(res, k * d / t)
        t += np.clip(d, 0.03, 4.0)
        if (t > tmax).all():
            break
    return np.clip(res, 0, 1)


def ao(sdf, p, n, scale):
    o = np.zeros(len(p))
    for i in range(1, 6):
        hh = scale * i
        o += (hh - sdf(p + n * hh)) * 0.5 ** i
    return np.clip(1 - 2.5 * o / scale, 0, 1)


def render(sdf, cam, light, sky, albedo, ao_scale=0.3, fog=0.0, spec=None, amb=0.28, sun=0.95):
    rd = cam.rays()
    t, hit = march(sdf, cam.pos, rd)
    out = sky(rd)
    p = cam.pos + rd[hit] * t[hit, None]
    n = normals(sdf, p)
    L = nrm(np.array(light, float))
    dif = np.clip(n @ L, 0, 1)
    sh = shadow(sdf, p + n * 0.02, L)
    oc = ao(sdf, p, n, ao_scale)
    alb = albedo(p, n)
    col = alb * (amb * oc + sun * dif * sh)
    if spec is not None:
        r = rd[hit] - 2 * (rd[hit] * n).sum(-1, keepdims=True) * n
        col = col + spec(p) * np.clip(r @ L, 0, 1) ** 60 * sh
    if fog:
        f = 1 - np.exp(-t[hit] * fog)
        col = col * (1 - f) + out[hit] * f
    out[hit] = col
    return out.reshape(cam.h, cam.w), t.reshape(cam.h, cam.w), hit.reshape(cam.h, cam.w)


# ───────────────────────── halftone + annotation ─────────────────────────
def halftone(tone: np.ndarray, cell=5.2, angle=45.0, grain=0.07, seed=0) -> np.ndarray:
    """tone: luminance 0..1 at output size. Returns bool ink mask (True = blue)."""
    rng = np.random.default_rng(seed)
    h, w = tone.shape
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    a = math.radians(angle)
    u = (x * math.cos(a) + y * math.sin(a)) * 2 * math.pi / cell
    v = (-x * math.sin(a) + y * math.cos(a)) * 2 * math.pi / cell
    screen = 0.5 + 0.25 * (np.cos(u) + np.cos(v))
    cov = 1 - tone
    low = np.asarray(Image.fromarray((rng.random((h // 24 + 2, w // 24 + 2)) * 255).astype(np.uint8)).resize((w, h), Image.Resampling.BICUBIC), np.float32) / 255
    cov = cov + rng.normal(0, grain, cov.shape) + (low - 0.5) * 0.12
    ink = screen < cov
    # ink spread and breakup, like a worn print screen
    img = Image.fromarray((ink * 255).astype(np.uint8)).filter(__import__("PIL.ImageFilter", fromlist=["x"]).GaussianBlur(0.7))
    ink = np.asarray(img) > 120 + rng.normal(0, 18, (h, w))
    return ink


class Notes:
    """Technical drawing overlay, knocked out of the halftone (XOR)."""

    def __init__(self, w, h):
        self.img = Image.new("1", (w, h), 0)
        self.d = ImageDraw.Draw(self.img)
        self.box = Image.new("1", (w, h), 0)
        self.bd = ImageDraw.Draw(self.box)
        self.txt = Image.new("1", (w, h), 0)
        self.td = ImageDraw.Draw(self.txt)
        self.f = ImageFont.truetype(FONT, 17)
        self.fs = ImageFont.truetype(FONT, 13)
        self.w, self.h = w, h

    def line(self, a, b, w=2, dash=None):
        if not dash:
            self.d.line([tuple(a), tuple(b)], fill=1, width=w)
            return
        a, b = np.array(a, float), np.array(b, float)
        L = np.linalg.norm(b - a)
        on, off = dash
        s = 0.0
        while s < L:
            e = min(L, s + on)
            self.d.line([tuple(a + (b - a) * s / L), tuple(a + (b - a) * e / L)], fill=1, width=w)
            s += on + off

    def circle(self, c, r, w=2):
        self.d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=1, width=w)

    def cross(self, c, s=14, w=2):
        self.line((c[0] - s, c[1]), (c[0] + s, c[1]), w)
        self.line((c[0], c[1] - s), (c[0], c[1] + s), w)

    def text(self, xy, s, small=False, anchor="la"):
        if BARE:
            return
        f = self.fs if small else self.f
        x0, y0, x1, y1 = self.td.textbbox(xy, s, font=f, anchor=anchor)
        self.bd.rectangle([x0 - 6, y0 - 5, x1 + 6, y1 + 5], fill=1)
        self.td.text(xy, s, fill=1, font=f, anchor=anchor)

    def dim_v(self, x, y0, y1, label):
        self.line((x, y0), (x, y1))
        for y, s in ((y0, 1), (y1, -1)):
            self.line((x - 9, y), (x + 9, y))
            self.d.polygon([(x, y), (x - 6, y + 14 * s), (x + 6, y + 14 * s)], fill=1)
        self.text((x + 14, (y0 + y1) / 2), label, anchor="lm")

    def dim_h(self, y, x0, x1, label):
        self.line((x0, y), (x1, y))
        for x, s in ((x0, 1), (x1, -1)):
            self.line((x, y - 9), (x, y + 9))
            self.d.polygon([(x, y), (x + 14 * s, y - 6), (x + 14 * s, y + 6)], fill=1)
        self.text(((x0 + x1) / 2, y - 14), label, anchor="mb")

    def leader(self, a, b, label):
        self.line(a, b)
        self.d.ellipse([a[0] - 4, a[1] - 4, a[0] + 4, a[1] + 4], fill=1)
        right = b[0] >= a[0]
        c = (b[0] + (60 if right else -60), b[1])
        self.line(b, c)
        self.text((c[0] + (8 if right else -8), c[1]), label, anchor="lm" if right else "rm")

    def ruler(self, x, y0, y1, every=20):
        self.line((x, y0), (x, y1))
        for k, y in enumerate(range(int(y0), int(y1), every)):
            self.line((x, y), (x + (14 if k % 5 == 0 else 6), y))

    def block(self, lines, xy=(44, None)):
        x = xy[0]
        y = xy[1] if xy[1] is not None else self.h - 44 - 26 * len(lines)
        self.line((x, y - 14), (x + 360, y - 14))
        for i, s in enumerate(lines):
            self.text((x, y + i * 26), s, small=i > 0)

    def mask(self):
        return np.asarray(self.img, bool)

    def apply(self, ink):
        ink = ink ^ self.mask()
        ink[np.asarray(self.box, bool)] = True
        ink[np.asarray(self.txt, bool)] = False
        return ink


def compose(tone_small: np.ndarray, notes: Notes, path: Path, seed: int, size=None, gamma=1.0, lo=0.0, hi=1.0, cell=5.2):
    size = size or (W, H)
    path = path.with_name(PREFIX + path.name)
    tone = np.asarray(Image.fromarray((np.clip(tone_small, 0, 1) * 255).astype(np.uint8)).resize(size, Image.Resampling.LANCZOS), np.float32) / 255
    tone = np.clip((tone - lo) / (hi - lo), 0, 1) ** gamma
    ink = notes.apply(halftone(tone, cell=cell, seed=seed))
    rgb = np.where(ink[..., None], np.array(INK, np.uint8), np.array(PAPER, np.uint8))
    if MASK:
        a = np.zeros((*ink.shape, 2), np.uint8)
        a[..., 0] = 255
        a[..., 1] = ink * 255
        Image.fromarray(a, "LA").save(path, optimize=True)
    else:
        Image.fromarray(rgb).quantize(colors=2).save(path, optimize=True)
    print(f"saved {path}")


# ───────────────────────── plates ─────────────────────────
def plate_towers(out: Path, seed: int):
    w, h = W // 2, H // 2
    towers = [((0.0, 0.0, 0.0), 1.0), ((-9.5, 0.0, 9.0), 1.0), ((10.0, 0.0, 15.0), 0.95)]

    def tower(p, c, s):
        q = (p - np.array(c)) / s
        rr = np.hypot(q[:, 0], q[:, 2])
        y = q[:, 1]
        r = 3.15 * np.sqrt(1 + ((y - 8.2) / 5.6) ** 2)
        side = np.abs(rr - r) - 0.12  # thin shell, hollow top
        return np.maximum(side * 0.55, np.maximum(-y, y - 11.6)) * s

    def sdf(p):
        d = p[:, 1] + 0.25 - 0.35 * fbm(p[:, 0] * 0.08, 0, p[:, 2] * 0.08, 3)
        for c, s in towers:
            d = np.minimum(d, tower(p, c, s))
        return d

    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        cl = fbm(rd[:, 0] * 3 + 4, rd[:, 1] * 6, rd[:, 2] * 3, 5)
        return np.clip(0.9 - el * 0.55 + (cl - 0.5) * 0.5, 0, 1)

    def albedo(p, n):
        ground = p[:, 1] < 0.4
        ang = np.arctan2(p[:, 2], p[:, 0])
        bands = 0.78 + 0.05 * np.sin(ang * 90) + 0.12 * (fbm(ang * 6, p[:, 1] * 0.9, 0, 4) - 0.5)
        field = 0.5 + 0.18 * np.sin(p[:, 0] * 1.6 + p[:, 2] * 0.3) * (fbm(p[:, 0] * 0.2, 0, p[:, 2] * 0.2, 2))
        return np.where(ground, field, bands)

    cam = Cam((-7, 2.2, -46), (1.0, 10.5, 6), 44, w, h)
    tone, _, _ = render(sdf, cam, (-0.8, 0.55, -0.35), sky, albedo, ao_scale=0.6, fog=0.012)
    # steam from the near tower
    (top, _) = cam.project([(0, 11.6, 0)], w, h)
    tx, ty = top[0]
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    rise = np.clip((ty - yy) / h, 0, 1)
    spread = 40 + rise * w * 0.9
    env = np.exp(-(((xx - tx - rise * w * 0.35) / spread) ** 2)) * (yy < ty + 6)
    puff = fbm(xx * 0.012 - rise * 2, yy * 0.012, 3.3, 5)
    dens = np.clip(env * (puff * 1.7 - 0.45) * (0.4 + rise * 2.2), 0, 0.92)
    tone = tone * (1 - dens) + 0.98 * dens

    N = Notes(W, H)
    s = W / w
    (base, _) = cam.project([(0, 0, 0)], W, H)
    (topF, _) = cam.project([(0, 11.6, 0)], W, H)
    (waistL, _) = cam.project([(-3.15, 8.2, 0)], W, H)
    (waistR, _) = cam.project([(3.15, 8.2, 0)], W, H)
    cx = base[0][0]
    N.line((cx, 90), (cx, H - 230), dash=(16, 10))
    N.dim_v(W - 120, topF[0][1], base[0][1], "H 114 m")
    N.dim_h(waistL[0][1] - 40, waistL[0][0], waistR[0][0], "Ø 63 m THROAT")
    N.cross((cx, topF[0][1]))
    N.ruler(30, 120, H - 260)
    N.text((44, 40), "FIG. 02", )
    N.text((W - 44, 40), "ENERGY & INDUSTRY", anchor="ra")
    N.block(["COOLING TOWERS, HYPERBOLOID SHELL", "GENERATION · COAL CLOSED 30 SEP 2024", "SOURCE · DESNZ ENERGY TRENDS 5.1"])
    compose(tone, N, out / "01-cooling-towers.png", seed, lo=0.05, hi=0.95, gamma=1.25)


def plate_turbine(out: Path, seed: int, rot_deg: float = 17.0, tone_only: bool = False):
    w, h = W // 2, H // 2
    hub = np.array([0.0, 26.0, 0.0])
    blade_len, rot = 19.0, math.radians(rot_deg)

    def turbine(p, base, scale):
        q = (p - base) / scale
        tower = np.maximum(np.hypot(q[:, 0], q[:, 2]) - (0.95 - 0.016 * q[:, 1]), np.maximum(-q[:, 1] - 2, q[:, 1] - 26))
        nac = sd_box(q, np.array([0, 26.3, 1.4]), np.array([1.0, 1.05, 2.6]))
        hb = sd_sphere(q, np.array([0, 26.2, -1.5]), 1.15)
        d = np.minimum(np.minimum(tower, nac), hb)
        for k in range(3):
            a = rot + k * 2 * math.pi / 3
            r = q - np.array([0, 26.2, -1.9])
            x = r[:, 0] * math.cos(-a) - r[:, 1] * math.sin(-a)
            y = r[:, 0] * math.sin(-a) + r[:, 1] * math.cos(-a)
            loc = np.stack([x, y, r[:, 2]], -1)
            width = 0.85 - 0.6 * np.clip(y / blade_len, 0, 1)
            qd = np.abs(loc - np.array([0, blade_len / 2 + 0.6, 0])) - np.stack([width, np.full_like(width, blade_len / 2), np.full_like(width, 0.12)], -1)
            bl = np.linalg.norm(np.maximum(qd, 0), axis=-1) + np.minimum(qd.max(-1), 0)
            d = np.minimum(d, bl * 0.8)
        return d * scale

    farms = [(np.array([0.0, 0, 0]), 1.0), (np.array([-38.0, 0, 70]), 1.0), (np.array([34.0, 0, 120]), 1.0), (np.array([-80.0, 0, 160]), 1.0)]

    def sea(p):
        return p[:, 1] + 0.6 * (fbm(p[:, 0] * 0.09, 0, p[:, 2] * 0.18, 4) - 0.5)

    def sdf(p):
        d = sea(p)
        for b, s in farms:
            d = np.minimum(d, turbine(p, b, s))
        return d

    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        cl = fbm(rd[:, 0] * 2 + 9, rd[:, 1] * 9, rd[:, 2] * 2, 5)
        return np.clip(0.95 - el * 0.7 + (cl - 0.5) * 0.45, 0, 1)

    def albedo(p, n):
        return np.where(p[:, 1] < 0.6, 0.2, 0.86)

    def spec(p):
        return np.where(p[:, 1] < 0.6, 2.4, 0.15)

    cam = Cam((10, 3.5, -46), (-2, 19, 0), 58, w, h)
    tone, _, _ = render(sdf, cam, (-0.5, 0.35, 0.8), sky, albedo, ao_scale=0.8, fog=0.006, spec=spec, amb=0.35)
    if tone_only:
        return tone

    N = Notes(W, H)
    (hp, _) = cam.project([hub + [0, 0, -1.9]], W, H)
    (bp, _) = cam.project([(0, 0, 0)], W, H)
    c = hp[0]
    rr = np.linalg.norm(cam.project([hub + [0, blade_len + 0.6, -1.9]], W, H)[0][0] - c)
    N.circle(c, rr, 2)
    N.circle(c, rr * 0.18, 2)
    N.line((c[0] - rr - 40, c[1]), (c[0] + rr + 40, c[1]), dash=(14, 8))
    N.line((c[0], c[1] - rr - 40), (c[0], bp[0][1]), dash=(14, 8))
    N.dim_v(W - 110, c[1], bp[0][1], "HUB 150 m")
    N.leader((c[0] - rr * 0.7, c[1] - rr * 0.7), (c[0] - rr * 0.55, c[1] - rr * 0.95), "ROTOR Ø 236 m")
    N.text((44, 40), "FIG. 03")
    N.text((W - 44, 40), "OFFSHORE · NORTH SEA", anchor="ra")
    N.block(["OFFSHORE WIND, 14.7 MW CLASS", "SHARE OF UK GENERATION · QUARTERLY", "SOURCE · DESNZ ENERGY TRENDS 6.1"])
    compose(tone, N, out / "02-offshore-turbine.png", seed, lo=0.02, hi=0.95, gamma=1.15)


def plate_block(out: Path, seed: int):
    w, h = W // 2, H // 2
    FH = 1.0  # floor height

    def sdf(p):
        ground = p[:, 1]
        core = sd_box(p, np.array([0, 15.5, 0]), np.array([4.0, 15.5, 2.2]))
        y = p[:, 1].copy()
        yr = np.mod(y, FH) - FH / 2
        slab = sd_box(np.stack([p[:, 0], yr, p[:, 2]], -1), np.array([0, 0, 0]), np.array([4.1, 0.045, 2.3]))
        slab = np.maximum(slab, np.maximum(-p[:, 1] + 1.0, p[:, 1] - 31))
        stair = sd_box(p, np.array([5.6, 16.5, 0.3]), np.array([1.2, 16.5, 1.2]))
        bridge = np.min(np.stack([sd_box(p, np.array([4.6, b, 0.3]), np.array([1.2, 0.25, 0.6])) for b in (9.5, 18.5, 27.5)]), 0)
        terr = sd_box(p, np.array([-13, 1.3, -9]), np.array([6, 1.3, 1.6]))
        roof = np.maximum(sd_box(p, np.array([-13, 3.0, -9]), np.array([6, 0.7, 1.6])), (np.abs(p[:, 2] + 9) * 0.6 + (p[:, 1] - 3.0) * 0.8) - 0.75)
        return np.min(np.stack([ground, core, slab, stair, bridge, terr, roof]), 0)

    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        cl = fbm(rd[:, 0] * 2.4 + 2, rd[:, 1] * 5, rd[:, 2] * 2.4, 5)
        return np.clip(0.92 - el * 0.45 + (cl - 0.5) * 0.55, 0, 1)

    def albedo(p, n):
        face_z = np.abs(n[:, 2]) > 0.7
        face_x = np.abs(n[:, 0]) > 0.7
        u = np.where(face_z, p[:, 0], p[:, 2])
        fy = np.mod(p[:, 1], FH) / FH
        win = (np.mod(u * 1.25, 1) > 0.18) & (fy > 0.25) & (fy < 0.85)
        lit = h3(np.floor(u * 1.25), np.floor(p[:, 1] / FH), 7) > 0.82
        concrete = 0.72 + 0.12 * (fbm(p[:, 0] * 2, p[:, 1] * 2, p[:, 2] * 2, 3) - 0.5)
        body = (np.abs(p[:, 0]) < 4.05) & (np.abs(p[:, 2]) < 2.25) & (p[:, 1] > 1) & (p[:, 1] < 31) & (face_z | face_x)
        a = np.where(body & win, np.where(lit, 0.95, 0.12), concrete)
        a = np.where(p[:, 1] < 0.05, 0.42 + 0.1 * fbm(p[:, 0], 0, p[:, 2], 2), a)
        return a

    cam = Cam((-24, 1.6, -40), (1.0, 15.5, 0), 52, w, h)
    tone, _, _ = render(sdf, cam, (0.7, 0.6, -0.55), sky, albedo, ao_scale=0.25, fog=0.004, amb=0.32)

    N = Notes(W, H)
    (tp, _) = cam.project([(4, 31, -2.2)], W, H)
    (bp, _) = cam.project([(4, 0, -2.2)], W, H)
    (sp, _) = cam.project([(5.6, 33, 0.3)], W, H)
    N.dim_v(W - 300, tp[0][1], bp[0][1], "31 STOREYS · 98 m")
    N.leader(sp[0], (sp[0][0] + 60, sp[0][1] - 90), "SERVICE TOWER")
    N.ruler(30, 120, H - 260, every=24)
    for y in np.linspace(tp[0][1], bp[0][1], 7)[1:-1]:
        N.line((W - 140, y), (W - 96, y))
    N.text((44, 40), "FIG. 04")
    N.text((W - 44, 40), "HOUSING & LAND", anchor="ra")
    N.block(["TOWER BLOCK, BRUTALIST, 1972", "DWELLINGS BY TENURE · SOCIAL RENT", "SOURCE · MHCLG LIVE TABLE 104"])
    compose(tone, N, out / "03-tower-block.png", seed, lo=0.04, hi=0.96, gamma=1.2)


def plate_globe(out: Path, seed: int):
    w, h = W // 2, H // 2

    def sdf(p):
        return sd_sphere(p, np.array([0, 0, 0]), 1.0)

    rng = np.random.default_rng(seed)
    stars = rng.random((w * h)) > 0.9965

    def sky(rd):
        return np.where(stars[: len(rd)], 0.95, 0.03)

    def albedo(p, n):
        land = fbm(n[:, 0] * 2.2 + 3, n[:, 1] * 2.2, n[:, 2] * 2.2, 5)
        lat = np.degrees(np.arcsin(np.clip(n[:, 1], -1, 1)))
        lon = np.degrees(np.arctan2(n[:, 0], n[:, 2]))
        grat = (np.abs(np.mod(lat + 2, 15) - 2) < 0.5) | (np.abs(np.mod(lon + 2, 15) - 2) < 0.5)
        a = np.where(land > 0.53, 0.82 + 0.15 * (land - 0.53), 0.18)
        return np.where(grat, 0.98, a)

    cam = Cam((1.1, 0.7, -5.6), (0, 0, 0), 46, w, h)
    tone, _, _ = render(sdf, cam, (-0.9, 0.5, -0.35), sky, albedo, ao_scale=0.05, amb=0.12, sun=1.05)

    N = Notes(W, H)
    nodes = ["ONS", "DESNZ", "HMRC", "BOE", "OBR", "MHCLG", "DFT", "LAND REG", "NESO", "CENSUS"]
    rings = [(1.25, 0.45, 0.2), (1.45, -0.6, 1.1), (1.7, 0.2, 2.3)]
    k = 0
    for R, tilt, spin in rings:
        th = np.linspace(0, 2 * np.pi, 400)
        P = np.stack([R * np.cos(th), R * np.sin(th) * math.sin(tilt), R * np.sin(th) * math.cos(tilt)], -1)
        c, s = math.cos(spin), math.sin(spin)
        P = P @ np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])
        xy, z = cam.project(P, W, H)
        # hidden when the ray from the camera meets the unit sphere before reaching the point
        v = P - cam.pos
        dist = np.linalg.norm(v, axis=-1)
        dv = v / dist[:, None]
        b = (cam.pos[None, :] * dv).sum(-1)
        disc = b * b - (cam.pos @ cam.pos - 1.0)
        t_hit = -b - np.sqrt(np.maximum(disc, 0))
        behind = (disc > 0) & (t_hit > 0) & (t_hit < dist)
        for i in range(len(th) - 1):
            if behind[i]:
                if i % 4 == 0:
                    N.line(xy[i], xy[i + 1], 2)
            else:
                N.line(xy[i], xy[i + 1], 2)
        for j in range(0, 400, 400 // 4):
            if behind[j] or not (60 < xy[j][0] < W - 160 and 120 < xy[j][1] < H - 220):
                continue
            p = xy[j]
            N.d.ellipse([p[0] - 7, p[1] - 7, p[0] + 7, p[1] + 7], fill=1)
            N.text((p[0] + 14, p[1] - 4), nodes[k % len(nodes)], small=True, anchor="lm")
            k += 1
    (cc, _) = cam.project([(0, 0, 0)], W, H)
    N.cross(cc[0], 22)
    N.circle(cc[0], 18)
    N.text((44, 40), "FIG. 01")
    N.text((W - 44, 40), "THE EXCHANGE", anchor="ra")
    N.block(["ONE COUNTRY, MANY SOURCES", "10 PUBLISHERS · 1 CONNECTED RECORD", "BRITISH EXCHANGE · REGISTRY"])
    compose(tone, N, out / "04-globe-ecosystem.png", seed, lo=0.0, hi=0.92, gamma=1.0)


def plate_pylons(out: Path, seed: int):
    """Pylon line drawn as pure technical line work over a halftone field and sky."""
    LW, LH = 1768, 1060
    w, h = LW // 2, LH // 2
    cam = Cam((-62, 5, -95), (30, 24, 90), 46, w, h)
    rd = cam.rays()
    el = np.clip(rd[:, 1], -1, 1)
    cl = fbm(rd[:, 0] * 2 + 1, rd[:, 1] * 7, rd[:, 2] * 2, 5)
    skyv = np.clip(0.93 - np.clip(el, 0, 1) * 0.6 + (cl - 0.5) * 0.5, 0, 1)
    t = np.where(rd[:, 1] < -1e-3, -cam.pos[1] / np.minimum(rd[:, 1], -1e-3), 1e9)
    gp = cam.pos + rd * t[:, None]
    furrow = 0.5 + 0.22 * np.sin(gp[:, 0] * 0.9 + gp[:, 2] * 0.15) * np.exp(-t / 160)
    field = furrow * (0.75 + 0.5 * fbm(gp[:, 0] * 0.03, 0, gp[:, 2] * 0.03, 3)) * np.exp(-t / 900) + (1 - np.exp(-t / 900)) * 0.85
    tone = np.where(rd[:, 1] < -1e-3, field, skyv).reshape(h, w)

    def pylon_segments():
        S = []
        legs = [(-4, -4), (4, -4), (4, 4), (-4, 4)]
        def leg(y):
            k = 4 - 2.6 * min(y, 30) / 30 if y <= 30 else 1.4 - 0.4 * (y - 30) / 20
            return [(sx / 4 * k, y, sz / 4 * k) for sx, sz in legs]
        levels = [0, 6, 12, 18, 24, 30, 36, 42, 50]
        for a, b in zip(levels, levels[1:]):
            A, B = leg(a), leg(b)
            for i in range(4):
                S.append((A[i], B[i]))
                S.append((A[i], B[(i + 1) % 4]))
                S.append((A[(i + 1) % 4], B[i]))
            for i in range(4):
                S.append((B[i], B[(i + 1) % 4]))
        for y, L in ((32, 10), (39, 8.5), (46, 7)):
            for s in (-1, 1):
                S.append(((s * 1.3, y, -1.2), (s * L, y, 0)))
                S.append(((s * 1.3, y, 1.2), (s * L, y, 0)))
                S.append(((s * 1.3, y - 2.5, 0), (s * L, y, 0)))
                S.append(((s * L, y, 0), (s * L, y - 3.2, 0)))
        S.append(((0, 50, 0), (0, 54, 0)))
        return S

    N = Notes(LW, LH)
    base = pylon_segments()
    positions = [(0, 0, 0), (34, 0, 70), (68, 0, 140), (102, 0, 210), (136, 0, 280)]
    tips = []
    for idx, (ox, oy, oz) in enumerate(positions):
        segs = np.array([[a, b] for a, b in base], float) + np.array([ox, oy, oz])
        xy, z = cam.project(segs.reshape(-1, 3), LW, LH)
        xy = xy.reshape(-1, 2, 2)
        lw = 3 if idx == 0 else 2
        for a, b in xy:
            N.line(a, b, lw)
        tips.append([(ox + s * L, y - 3.2, oz) for y, L in ((32, 10), (39, 8.5), (46, 7)) for s in (-1, 1)])
    for i in range(len(tips) - 1):
        for a, b in zip(tips[i], tips[i + 1]):
            a, b = np.array(a), np.array(b)
            ts = np.linspace(0, 1, 40)
            P = a + (b - a) * ts[:, None]
            P[:, 1] -= 6 * 4 * ts * (1 - ts)
            xy, _ = cam.project(P, LW, LH)
            for k in range(len(xy) - 1):
                N.line(xy[k], xy[k + 1], 2)
    (top, _) = cam.project([(0, 54, 0)], LW, LH)
    (bot, _) = cam.project([(0, 0, 0)], LW, LH)
    N.dim_v(top[0][0] - 130, top[0][1], bot[0][1], "50 m")
    N.line((0, bot[0][1]), (LW, bot[0][1]), dash=(18, 12))
    N.text((44, 40), "FIG. 05")
    N.text((LW - 44, 40), "INFRASTRUCTURE · 400 kV", anchor="ra")
    N.block(["TRANSMISSION LINE, LATTICE TOWERS", "GRID DEMAND · HALF-HOURLY", "SOURCE · NESO DATA PORTAL"])
    compose(tone, N, out / "05-pylon-line.png", seed, size=(LW, LH), lo=0.05, hi=0.95, gamma=1.3)


def turbine_frames(out: Path, seed: int, n: int = 24, cols: int = 4):
    """Tone frames of one 120° rotor cycle (3 blades, so it loops), packed into a grayscale atlas
    for live halftoning in the browser (WebGL). Frame size = W/2 x H/2."""
    frames = []
    for k in range(n):
        t = plate_turbine(out, seed, rot_deg=17.0 + 120.0 * k / n, tone_only=True)
        frames.append(np.clip((t - 0.02) / 0.93, 0, 1) ** 1.15)
        print(f"frame {k + 1}/{n}")
    fh, fw = frames[0].shape
    rows = math.ceil(n / cols)
    atlas = np.ones((rows * fh, cols * fw), np.float32)
    for k, f in enumerate(frames):
        r_, c_ = divmod(k, cols)
        atlas[r_ * fh:(r_ + 1) * fh, c_ * fw:(c_ + 1) * fw] = f
    path = out / f"{PREFIX}turbine-atlas-{cols}x{rows}-{fw}x{fh}.jpg"
    Image.fromarray((atlas * 255).astype(np.uint8), "L").save(path, quality=88, optimize=True)
    print(f"saved {path}")


def plate_regions(out: Path, seed: int):
    """Data-generated: one engraved ridge per UK region/nation, height = real monthly UK HPI average
    price, Jan 1995 - latest. Source: HM Land Registry / ONS UK HPI (house-prices-by-region)."""
    import collections
    import json
    obs = json.load(open(DATA / "house-prices-by-region.json"))["observations"]
    order = ["London", "South East", "East of England", "South West", "West Midlands Region", "East Midlands",
             "North West", "Wales", "Yorkshire and The Humber", "Scotland", "North East", "Northern Ireland"]
    ser = collections.defaultdict(dict)
    for o in obs:
        if o["geography_label"] in order and o["period_start"] >= "1995-01":
            ser[o["geography_label"]][o["period_start"][:7]] = float(o["value"])
    months = sorted(set.intersection(*[set(ser[g]) for g in order]))
    M = np.array([[ser[g][m] for m in months] for g in order])
    vmax = M.max()
    w, h = W, H
    yy = np.arange(h, dtype=np.float32)[:, None]
    tone = np.broadcast_to(0.95 - 0.1 * yy / h, (h, w)).copy()
    top, bot = h * 0.32, h * 0.84
    n = len(order)
    gap = (bot - top) / (n - 1)
    amp = min(gap * 5.0, top - h * 0.06)
    x0, x1 = w * 0.06, w * 0.94
    X = np.arange(w, dtype=np.float32)
    t = (X - x0) / (x1 - x0)
    inside = (t >= 0) & (t <= 1)
    crests = []
    for i, row in enumerate(M):
        y0 = top + i * gap
        prof = np.where(inside, np.interp(np.clip(t, 0, 1) * (len(months) - 1), np.arange(len(months)), row), 0.0)
        yp = y0 - prof / vmax * amp
        depth = (yy - yp[None, :]) / gap
        m = (depth >= 0) & (depth <= (n - i) + 1.2) & inside[None, :]
        shade = 0.9 - 0.62 * np.clip(depth / 1.7, 0, 1)
        tone = np.where(m, shade, tone)
        crests.append(yp)
    N = Notes(w, h)
    step = 3
    for i, yp in enumerate(crests):
        xa, xb = int(np.ceil(x0)), int(x1)
        pts = [(float(x), float(yp[x])) for x in range(xa, xb, step)] + [(float(xb), float(yp[xb]))]
        N.line((xa, yp[xa]), (xa, top + i * gap + gap * 0.0))
        N.d.line(pts, fill=1, width=2 if i else 3)
        xe = int(x1)
        N.d.ellipse([xe - 6, yp[xe] - 6, xe + 6, yp[xe] + 6], fill=1)  # latest observation, plotted
    ay = h * 0.93
    N.line((x0, ay), (x1, ay))
    for k, m in enumerate(months):
        if m.endswith("-01"):
            x = x0 + k / (len(months) - 1) * (x1 - x0)
            major = int(m[:4]) % 5 == 0
            N.line((x, ay), (x, ay + (18 if major else 8)))
    for cx, cy in ((40, 40), (w - 40, 40), (40, h - 40), (w - 40, h - 40)):
        N.cross((cx, cy), 12)
    compose(tone, N, out / "06-regions-house-prices.png", seed, size=(w, h), lo=0.0, hi=1.0, gamma=1.1)
    print("months", months[0], "->", months[-1], "regions", n, "max", vmax)


def plate_plots(out: Path, seed: int):
    """Housing & Land: Land Registry–style cadastral plots in axonometric elevation.
    Parcel walls, one developed footprint, a road strip — the land beneath tenure and price."""
    w, h = W // 2, H // 2
    # Regular estate grid (cx, cz, half-x, half-z). Road runs along z ≈ 0.
    parcels = [
        (-22, -12, 8, 5.5), (-5, -12, 7.5, 5.5), (12, -12, 8, 5.5), (29, -12, 7, 5.5),
        (-22, 12, 8, 5.5), (-5, 12, 7.5, 5.5), (12, 12, 8, 5.5), (29, 12, 7, 5.5),
    ]
    developed = (12, 12, 8, 5.5)

    def sdf(p):
        ground = p[:, 1]
        # Raised carriageway through the estate
        road = sd_box(p, np.array([4.0, 0.08, 0.0]), np.array([42.0, 0.08, 2.4]))
        kerb = np.maximum(
            sd_box(p, np.array([4.0, 0.18, 0.0]), np.array([42.0, 0.18, 2.55])),
            -sd_box(p, np.array([4.0, 0.3, 0.0]), np.array([42.5, 0.4, 2.25])),
        )
        walls = []
        for cx, cz, hx, hz in parcels:
            outer = sd_box(p, np.array([cx, 0.7, cz]), np.array([hx, 0.7, hz]))
            inner = sd_box(p, np.array([cx, 0.9, cz]), np.array([hx - 0.28, 1.0, hz - 0.28]))
            walls.append(np.maximum(outer, -inner))
        cx, cz, hx, hz = developed
        house = sd_box(p, np.array([cx, 1.8, cz]), np.array([hx * 0.42, 1.8, hz * 0.38]))
        roof = np.maximum(
            (np.abs(p[:, 2] - cz) * 0.7 + (p[:, 1] - 3.4) * 0.9) - 1.0,
            np.maximum(np.abs(p[:, 0] - cx) - hx * 0.48, np.abs(p[:, 2] - cz) - hz * 0.45),
        )
        roof = np.maximum(roof, 3.0 - p[:, 1])
        return np.min(np.stack([ground, road, kerb, house, roof, *walls]), 0)

    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        return np.clip(0.94 - el * 0.55, 0, 1)

    def albedo(p, n):
        y = p[:, 1]
        a = np.full(len(p), 0.52)
        # Road
        a = np.where((y < 0.2) & (np.abs(p[:, 2]) < 2.5), 0.82, a)
        # Gardens inside parcels
        a = np.where((y < 0.05) & (np.abs(p[:, 2]) > 3.0), 0.46 + 0.08 * fbm(p[:, 0] * 0.4, 0, p[:, 2] * 0.4, 2), a)
        # Parcel walls — dark ink edges
        wallish = (y > 0.15) & (y < 1.45) & (np.abs(n[:, 1]) < 0.5)
        a = np.where(wallish, 0.18, a)
        # House
        body = (y > 0.2) & (y < 3.6) & (np.abs(n[:, 1]) < 0.55)
        a = np.where(body, 0.58, a)
        a = np.where((y > 3.2) & (n[:, 1] > 0.25), 0.32, a)
        return a

    # Shallower FOV, subject centred — avoids fisheye “broken” edges
    cam = Cam((-38, 34, -40), (4, 0.4, 0), 38, w, h)
    tone, _, _ = render(sdf, cam, (-0.35, 0.9, -0.3), sky, albedo, ao_scale=0.28, fog=0.0015, amb=0.4, sun=1.05)

    N = Notes(W, H)
    # Corner registration only — no edge ruler (breaks full-bleed crops)
    for cx, cy in ((48, 48), (W - 48, 48), (48, H - 48), (W - 48, H - 48)):
        N.cross((cx, cy), 14)
    (a0, _) = cam.project([(-22, 0, -12)], W, H)
    (a1, _) = cam.project([(-5, 0, -12)], W, H)
    N.dim_h(min(H - 80, a0[0][1] + 36), a0[0][0], a1[0][0], "PLOT")
    N.text((44, 40), "FIG. 08")
    N.text((W - 44, 40), "HOUSING & LAND", anchor="ra")
    N.block(["CADASTRAL PLOTS, LAND REGISTRY STYLE", "LAND USE · GREEN BELT · PLANNING", "SOURCE · MHCLG LAND USE, GREEN BELT"])
    compose(tone, N, out / "08-land-plots.png", seed, lo=0.05, hi=0.95, gamma=1.15)


def plate_terrace(out: Path, seed: int):
    """Housing & Land: a Victorian terrace (bays, chimneys, slate) with garden trees and
    hedged fields rising behind it. Wide, for full-bleed page backgrounds."""
    w, h = W // 2, H // 2
    HW, X0, X1 = 4.6, -36.0, 140.0  # house width, terrace extent along the street (x)
    XC, XH = (X0 + X1) / 2, (X1 - X0) / 2
    KR = 3.0 / 3.9  # roof pitch
    def hills(x, z):
        s = np.clip((z - 18) / 80, 0, 1)
        s = s * s * (3 - 2 * s)
        return s * (8 + 38 * fbm(x * 0.011 + 3, 0, z * 0.012, 3))

    rng_t = np.random.default_rng(11)
    trunk_spots = [(-14, 13, 3.4), (-2, 15, 4.0), (12, 12.5, 3.2), (27, 14, 3.8), (44, 13, 3.4), (63, 15, 3.8), (84, 13, 3.4),
                   (95, 46, 5.0), (40, 72, 6.0), (-20, 60, 5.0), (130, 92, 6.5), (70, 58, 4.5), (5, 95, 6.0), (-40, 40, 4.5),
                   (100, 52, 4.0), (-12, 64, 4.2), (150, 80, 5.5), (60, 110, 7.0), (-50, 90, 6.0)]
    trunks_xyz, blobs = [], []
    for tx, tz, r in trunk_spots:
        lift = float(hills(np.array([tx], float), np.array([tz], float))[0])
        ty = lift + r * (1.7 if tz < 20 else 0.9)
        trunks_xyz.append((tx, tz, lift, ty))
        for _ in range(6):  # lumpy crown from several overlapping spheres
            o = rng_t.normal(0, 0.55, 3) * r
            blobs.append((tx + o[0], ty + abs(o[1]) * 0.6 + r * 0.4, tz + o[2], r * rng_t.uniform(0.5, 0.8)))
    trees = np.array(blobs, float)

    def tree_dist(p):
        """Min distance to the crown spheres, one sphere at a time (a full N×blobs×3 array swaps)."""
        d = np.full(len(p), np.inf)
        for cx, cy, cz, r in trees:
            np.minimum(d, np.sqrt((p[:, 0] - cx) ** 2 + (p[:, 1] - cy) ** 2 + (p[:, 2] - cz) ** 2) - r, out=d)
        return d

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        ground = (y - hills(x, z)) * 0.55
        inx = np.abs(x - XC) - XH
        walls = sd_box(p, np.array([XC, 3.0, 3.5]), np.array([XH, 3.0, 3.5]))
        roof = np.maximum.reduce([(y - 9.0 + KR * np.abs(z - 3.5)) / math.hypot(1, KR), 6.0 - y, inx - 0.2])
        u = np.mod(x - X0, HW * 2) - HW  # chimney stacks on every other party wall
        chim = np.maximum(sd_box(np.stack([u, y, z], -1), np.array([0, 9.6, 3.5]), np.array([0.5, 1.5, 0.85])), inx)
        pots = np.maximum(sd_box(np.stack([np.abs(u) - 0.25, y, np.abs(z - 3.5) - 0.42], -1), np.array([0, 11.35, 0]), np.array([0.13, 0.3, 0.13])), inx)
        b = np.mod(x - X0, HW) - HW * 0.36  # bay window, door to the side
        bq = np.stack([b, y, z], -1)
        bay = np.maximum(sd_box(bq, np.array([0, 1.75, -0.55]), np.array([1.05, 1.75, 0.6])), inx)
        bay_roof = np.maximum(sd_box(bq, np.array([0, 3.6, -0.6]), np.array([1.15, 0.12, 0.7])), inx)
        garden_wall = np.maximum(sd_box(p, np.array([XC, 0.4, -3.4]), np.array([XH, 0.4, 0.14])), -sd_box(np.stack([np.mod(x - X0, HW) - HW * 0.82, y, z], -1), np.array([0, 0.4, -3.4]), np.array([0.5, 1.0, 0.5])))
        back_fence = sd_box(p, np.array([XC, 0.9, 16.5]), np.array([XH, 0.9, 0.06]))
        dt = tree_dist(p)
        canopy = (dt + 1.4 * (fbm(x * 0.55, y * 0.55, z * 0.55, 3) - 0.5)) * 0.55
        trunks = np.min(np.stack([sd_capsule(p, np.array([tx, y0 - 1.0, tz]), np.array([tx, ty, tz]), 0.4) for tx, tz, y0, ty in trunks_xyz]), 0)
        return np.min(np.stack([ground, walls, roof, chim, pots, bay, bay_roof, garden_wall, back_fence, canopy, trunks]), 0)

    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        cl = fbm(rd[:, 0] * 2.2 + 5, rd[:, 1] * 7, rd[:, 2] * 2.2, 5)
        return np.clip(0.97 - el * 0.5 + (cl - 0.5) * 0.6, 0, 1)

    def albedo(p, n):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        intr = (x > X0 - 0.3) & (x < X1 + 0.3)
        u = np.mod(x - X0, HW)
        front = (n[:, 2] < -0.7)
        # brick: courses and a little colour noise
        brick = 0.6 + 0.08 * (np.mod(y * 4, 1) < 0.14) * -1 + 0.1 * (fbm(x * 3, y * 6, z * 3, 2) - 0.5)
        up_win = front & (z < 0.1) & (y > 3.9) & (y < 5.5) & (((u > 0.55) & (u < 1.95)) | ((u > 2.7) & (u < 4.0)))
        door = front & (z < 0.1) & (y < 2.5) & (u > 3.25) & (u < 4.05)
        bayglass = (z < -0.05) & (y > 0.75) & (y < 2.9) & (z > -1.2) & (np.abs(np.mod(x - X0, HW) - HW * 0.36) < 1.1)
        bars = (np.mod(x * 2.4, 1) < 0.12) | (np.mod(y * 1.6, 1) < 0.1)
        glass = np.where(bars, 0.75, 0.1)
        wall = np.where(up_win | bayglass, glass, np.where(door, 0.22, brick))
        slate = 0.38 + 0.07 * (np.mod((9 - y) * 3.2, 1) < 0.2) + 0.05 * (fbm(x * 2, y, z * 2, 2) - 0.5)
        roofy = intr & (y > 6.02) & (y < 9.05) & (np.abs(n[:, 1]) > 0.3)
        a = np.where(roofy, slate, wall)
        # canopy and trunks
        foliage = 0.32 + 0.35 * fbm(x * 1.4, y * 1.4, z * 1.4, 3)
        dt = tree_dist(p)
        a = np.where(dt < 1.2, foliage, a)
        # ground: street, pavement, gardens, patchwork fields with hedgerows
        fx, fz = x / 26 + 0.6 * fbm(x * 0.02, 1, z * 0.02, 2), z / 19 + 0.6 * fbm(x * 0.02, 2, z * 0.02, 2)
        cell = h3(np.floor(fx), np.floor(fz), 3)
        furrow = 0.5 + 0.5 * np.sin((x * np.cos(cell * 6) + z * np.sin(cell * 6)) * 2.2)
        field = 0.5 + 0.3 * cell - 0.12 * furrow * (cell > 0.45)
        hedge = (np.minimum(np.mod(fx, 1), 1 - np.mod(fx, 1)) < 0.03) | (np.minimum(np.mod(fz, 1), 1 - np.mod(fz, 1)) < 0.04)
        land = np.where(hedge, 0.18, field)
        land = np.where(z < 16.5, 0.55 + 0.15 * (fbm(x, 0, z, 2) - 0.5), land)  # back gardens
        land = np.where(z < 7.2, 0.6, land)
        land = np.where(z < -3.6, np.where(z < -6.2, 0.92, 0.84 - 0.2 * (np.mod(x * 0.8, 1) < 0.06)), land)  # pavement / road
        land = np.where((z < -6.2) & (z > -16) & (np.abs(z + 11) < 0.12) & (np.mod(x * 0.25, 1) < 0.5), 0.98, land)
        isground = (y < hills(x, z) + 0.05) & (dt > 1.2)
        return np.where(isground, land, a)

    # Pulled back so a long terrace reads at hero scale (not a close facade crop).
    cam = Cam((-22, 20, -68), (36, 1.5, 14), 46, w, h)
    tone, _, _ = render(sdf, cam, (-0.55, 0.62, -0.5), sky, albedo, ao_scale=0.35, fog=0.0035, amb=0.4, sun=1.05)

    N = Notes(W, H)
    vp, _ = cam.project([cam.pos + np.array([1e5, 0, 0])], W, H)
    vp = vp[0]
    for P in ((X0, 9.0, 3.5), (X0, 6.0, -0.15), (X0, 0.0, -0.15), (X0, 0.8, -3.4)):
        a, _ = cam.project([P], W, H)
        N.line(a[0], vp, w=2, dash=(18, 10))
    N.line((0, vp[1]), (W, vp[1]), w=2, dash=(6, 10))
    N.cross(vp, 18)
    N.circle(vp, 26)
    h0, _ = cam.project([(X0 + HW * 2, 0, -0.15)], W, H)
    h1, _ = cam.project([(X0 + HW * 3, 0, -0.15)], W, H)
    N.dim_h(h0[0][1] + 60, h0[0][0], h1[0][0], "4.6 m PLOT")
    r0, _ = cam.project([(X0 + HW * 3, 11.0, 3.5)], W, H)
    r1, _ = cam.project([(X0 + HW * 3, 0.0, 3.5)], W, H)
    N.dim_v(r0[0][0] - 50, r0[0][1], r1[0][1], "2 STOREYS")
    N.ruler(30, 120, H - 160, every=22)
    N.text((44, 40), "FIG. 07")
    N.text((W - 44, 40), "HOUSING & LAND", anchor="ra")
    N.block(["VICTORIAN TERRACE, BAY FRONTED, c.1890", "HOUSE PRICES, RENTS, SUPPLY, TENURE", "SOURCE · HM LAND REGISTRY, ONS, MHCLG"])
    compose(tone, N, out / "07-terrace.png", seed, lo=0.03, hi=0.97, gamma=1.15)


def plate_street(out: Path, seed: int):
    """Housing & Land: a raised aerial of a curving interwar estate. Pairs of hipped-roof
    semis with two-storey bays, drives between pairs, long back gardens meeting back to back,
    parked cars and garden trees. The ordinary British street the housing data describes."""
    w, h = W // 2, H // 2
    P, RP = 13.0, 100.0  # plot pair pitch along the street; street-to-street pitch
    BEND = 0.0009  # gentle curve in the street (domain warp)

    def local(p):
        """Street-local coords: u along the pair, s = distance from road centre, ids per pair."""
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        zw = z - BEND * (x - 20) ** 2
        j = np.floor((zw + RP / 2) / RP)
        zr = zw - j * RP
        side = np.where(zr >= 0, 1.0, -1.0)
        s = np.abs(zr)
        xo = x + side * P * 0.25  # stagger the two sides of the street
        i = np.floor((xo + P / 2) / P)
        u = xo - i * P
        hsh = h3(i, j * 2 + side, 5.0)
        return u, y, s, hsh, i, j, side

    def semis(u, y, s, hsh):
        dz = (hsh - 0.5) * 1.6  # set-back varies a little pair to pair
        zc = 15.0 + dz
        a, b = 4.3, 4.0
        q = np.stack([u, y, s], -1)
        body = sd_box(q, np.stack([np.zeros_like(u), np.full_like(u, 2.8), zc], -1), np.array([a, 2.8, b]))
        # hipped roof with eaves overhang
        ra, rb, k, y0 = a + 0.45, b + 0.45, 0.85, 5.55
        rise = np.minimum(ra - np.abs(u), rb - np.abs(s - zc))
        roof = np.maximum((y - y0 - k * rise) / math.hypot(1, k), y0 - y)
        # two-storey canted bays, one per house, on the street front
        bq = np.stack([np.abs(u) - 2.3, y, s - (zc - b - 0.55)], -1)
        bay = sd_box(bq, np.array([0, 2.6, 0]), np.array([1.15, 2.6, 0.6]))
        bay = np.maximum(bay, (np.abs(bq[:, 0]) * 0.7 - bq[:, 2] * 0.7) - 0.85)  # cant the corners
        bay_cap = np.maximum((y - 5.2 - 0.9 * (0.6 + bq[:, 2])) / 1.35, np.maximum(4.9 - y, sd_box(bq, np.array([0, 5.3, 0]), np.array([1.3, 0.8, 0.75]))))
        chim = sd_box(q, np.stack([np.zeros_like(u), np.full_like(u, 8.2), zc + 0.8], -1), np.array([0.55, 1.4, 0.9]))
        porch = sd_box(np.stack([np.abs(u) - 3.75, y, s], -1), np.stack([np.zeros_like(u), np.full_like(u, 1.4), zc - b - 0.6], -1), np.array([0.45, 1.4, 0.6]))
        return np.minimum.reduce([body, roof, bay, bay_cap, chim, porch]), zc

    def sdf(p):
        u, y, s, hsh, i, j, side = local(p)
        house, zc = semis(u, y, s, hsh)
        # garden fences: party fence down the middle of each pair, side fences at the drives
        back = (s > zc + 4.0) & (s < 49.8)
        fu = np.minimum(np.abs(u), np.abs(np.abs(u) - P / 2))
        fence = np.where(back, np.sqrt(np.maximum(fu - 0.05, 0) ** 2 + np.maximum(np.abs(y - 0.6) - 0.6, 0) ** 2), 1e3)
        rear = np.sqrt(np.maximum(np.abs(s - 49.9) - 0.05, 0) ** 2 + np.maximum(np.abs(y - 0.6) - 0.6, 0) ** 2)
        hedge = np.sqrt(np.maximum(np.abs(s - 8.2) - 0.35, 0) ** 2 + np.maximum(np.abs(y - 0.5) - 0.5, 0) ** 2)
        hedge = np.where(np.abs(np.abs(u) - P / 2) < 1.7, 1e3, hedge)  # gaps for the drives
        # Trees and cars are hashed per half-plot. Evaluate each against its own half and the
        # neighbouring halves too, so a ray crossing an empty plot cannot overshoot into one.
        sg = np.where(u >= 0, 1.0, -1.0)

        def tree(uu, ii, hs):
            tu = hs * (3.0 + 0.5 * h3(ii, j * 2 + hs, side + 3.0))
            tz = 24.0 + 20.0 * h3(ii * 2 + hs, j, side + 9.0)
            tr = 1.5 + 0.8 * h3(ii + 7, j, hs + side)
            cy = tr + 2.4
            crown = np.minimum.reduce([
                np.sqrt((uu - tu) ** 2 + (y - cy) ** 2 + (s - tz) ** 2) - tr,
                np.sqrt((uu - tu * 0.8) ** 2 + (y - cy - tr * 0.45) ** 2 + (s - tz + tr * 0.4) ** 2) - tr * 0.72,
                np.sqrt((uu - tu * 1.1) ** 2 + (y - cy + tr * 0.1) ** 2 + (s - tz - tr * 0.5) ** 2) - tr * 0.7,
            ])
            trunk = np.maximum(np.sqrt((uu - tu) ** 2 + (s - tz) ** 2) - 0.3, y - cy)
            return np.where(h3(ii, j * 3 + hs, side + 2.0) > 0.42, np.minimum(crown, trunk), 1e3)

        def car(uu, ii):
            cu = uu - (h3(ii, j * 2 + side, 5.0) - 0.5) * 5
            cq = np.stack([cu, y, s], -1)
            d = np.minimum(sd_box(cq, np.array([0, 0.6, 3.3]), np.array([2.1, 0.45, 0.85])) - 0.12,
                           sd_box(cq, np.array([0.2, 1.25, 3.3]), np.array([1.1, 0.3, 0.75])) - 0.1)
            return np.where(h3(ii, j, side + 4.0) > 0.4, d, 1e3)

        trees = np.minimum.reduce([tree(u, i, sg), tree(u, i, -sg), tree(u - sg * P, i + sg, -sg)])
        cars = np.minimum(car(u, i), car(u - sg * P, i + sg))
        return np.minimum.reduce([y, house, fence, rear, hedge, trees, cars]) * 0.9

    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        cl = fbm(rd[:, 0] * 2.2 + 5, rd[:, 1] * 7, rd[:, 2] * 2.2, 5)
        return np.clip(0.97 - el * 0.5 + (cl - 0.5) * 0.6, 0, 1)

    def albedo(p, n):
        u, y, s, hsh, i, j, side = local(p)
        zc = 15.0 + (hsh - 0.5) * 1.6
        up = n[:, 1]
        # ground plan: road, kerb, pavement, front gardens, drives, back lawns
        g = np.full(len(p), 0.5)
        lawn = 0.5 + 0.14 * (fbm(p[:, 0] * 0.3, 0, p[:, 2] * 0.3, 3) - 0.5)
        stripes = 0.03 * (np.mod(s * 0.6, 2) < 1)
        g = np.where(s < 49.9, lawn - 0.14 + stripes, g)
        g = np.where((s > zc + 4.0) & (s < zc + 7.0), 0.78 - 0.08 * (np.mod(u * 1.2, 1) < 0.08), g)  # patios
        g = np.where((s < zc - 4.0) & (s > 8.6), 0.55 + 0.1 * (fbm(u * 0.6, 3, s * 0.6, 2) - 0.5), g)  # front gardens
        drive = np.abs(np.abs(u) - P / 2) < 1.7
        g = np.where(drive & (s < zc + 6.0) & (s > 6.0), 0.84, g)
        g = np.where(s < 8.6, 0.9, g)  # pavement
        g = np.where(s < 6.0, 0.7, g)  # kerb line
        g = np.where(s < 5.75, 0.78 + 0.06 * (fbm(p[:, 0] * 0.15, 1, p[:, 2] * 0.15, 2) - 0.5), g)  # carriageway
        g = np.where((s < 0.12) & (np.mod(p[:, 0] * 0.25, 1) < 0.45), 0.97, g)  # centre line
        # house: render walls, bay glass, dark tiled roofs
        wall = 0.74 + 0.06 * (fbm(p[:, 0] * 2, y * 2, p[:, 2] * 2, 2) - 0.5)
        front = n[:, 2] * np.where(side > 0, 1, -1)
        win = (np.mod(y, 2.8) > 1.1) & (np.mod(y, 2.8) < 2.3) & (y < 5.2) & (np.abs(up) < 0.4)
        bays = win & (np.abs(np.abs(u) - 2.3) < 1.0) & (s < zc - 3.9)
        side_win = win & (np.mod(u * 0.9 + s * 0.9, 2.2) < 1.0)
        glass = np.where(np.mod(u * 3, 1) < 0.12, 0.7, 0.12)
        a = np.where(bays | side_win, glass, wall)
        a = np.where((front < -0.6) & (np.abs(np.abs(u) - 3.75) < 0.4) & (y < 2.2), 0.2, a)  # doors in the porches
        tiles = 0.3 + 0.07 * (np.mod(y * 4.0, 1) < 0.22) + 0.06 * (fbm(p[:, 0] * 1.5, y, p[:, 2] * 1.5, 2) - 0.5) + 0.08 * (hsh - 0.5)
        a = np.where((y > 5.5) & (up > 0.2), tiles, a)
        a = np.where((y > 6.9) & (np.abs(u) < 0.6) & (np.abs(s - zc - 0.8) < 1.0), 0.55, a)  # chimney
        # garden furniture: fences, hedges, trees, cars
        fu = np.minimum(np.abs(u), np.abs(np.abs(u) - P / 2))
        a = np.where((y > 0.05) & (y < 1.25) & (((fu < 0.2) & (s > zc + 4)) | (np.abs(s - 49.9) < 0.2)), 0.3, a)
        a = np.where((y > 0.05) & (y < 1.05) & (np.abs(s - 8.2) < 0.5), 0.3 + 0.2 * fbm(p[:, 0], y * 2, p[:, 2], 2), a)
        leaf = 0.16 + 0.46 * fbm(p[:, 0] * 1.6, y * 1.6, p[:, 2] * 1.6, 4)
        intree = (s > 20) & (s < 49.7) & (y > 0.9)
        a = np.where(intree, leaf, a)
        incar = (s < 4.4) & (s > 2.2) & (y > 0.08)
        a = np.where(incar, np.where(up > 0.5, 0.35 + 0.4 * h3(i, j, 7.0), 0.18), a)
        # far hits stop a little above the plane (march tolerance grows with distance)
        isground = (y < 0.05 + 0.0015 * np.linalg.norm(p - cam.pos, axis=-1)) & (up > 0.9)
        return np.where(isground, g, a)

    cam = Cam((-46, 58, -78), (34, 0, 22), 40, w, h)
    tone, _, _ = render(sdf, cam, (-0.5, 0.75, -0.45), sky, albedo, ao_scale=0.5, fog=0.005, amb=0.42, sun=1.0)
    tone = np.nan_to_num(tone, nan=0.8)  # the odd degenerate normal at a sharp crease

    N = Notes(W, H)
    for cx, cy in ((48, 48), (W - 48, 48), (48, H - 48), (W - 48, H - 48)):
        N.cross((cx, cy), 14)
    # construction: the road centreline, followed along its curve
    pts, _ = cam.project([(x, 0.0, BEND * (x - 20) ** 2) for x in np.linspace(-40, 140, 40)], W, H)
    for k in range(len(pts) - 1):
        if k % 2 == 0:
            N.line(pts[k], pts[k + 1], w=2)
    # one pair dimensioned: the frontage of a plot
    f0, _ = cam.project([(P * 2 - P / 2 - P * 0.25, 0.0, 8.6 + BEND * (P * 2 - 20) ** 2)], W, H)
    f1, _ = cam.project([(P * 3 - P / 2 - P * 0.25, 0.0, 8.6 + BEND * (P * 3 - 20) ** 2)], W, H)
    N.line(f0[0], f1[0], w=2)
    for f in (f0[0], f1[0]):
        N.line((f[0], f[1] - 10), (f[0], f[1] + 10))
    # coordinate mark on one roof
    c, _ = cam.project([(P * 4 - P * 0.25, 9.0, -15.0 + BEND * (P * 4 - 20) ** 2)], W, H)
    N.circle(c[0], 30)
    N.cross(c[0], 44)
    N.text((44, 40), "FIG. 09")
    N.text((W - 44, 40), "HOUSING & LAND", anchor="ra")
    N.block(["INTERWAR SEMIS, HIPPED ROOF, c.1935", "HOUSE PRICES, RENTS, SUPPLY, TENURE", "SOURCE · HM LAND REGISTRY, ONS, MHCLG"])
    compose(tone, N, out / "09-street.png", seed, lo=0.06, hi=0.97, gamma=1.4)


def plate_cutaway(out: Path, seed: int):
    """Energy Consumption — Inside Britain's Energy Use: sectional cutaway of a British
    two-storey house. Front-right quarter removed so floors, stair, boiler cupboard,
    radiator, kitchen block and loft cylinder read as end-use zones. Not a survey
    dwelling; navigation atmosphere for ECUK U3 (space heating, water, cooking,
    lighting, appliances)."""
    w, h = W // 2, H // 2
    HW, HH, HD = 4.2, 3.05, 3.6  # half-width, eaves height, half-depth
    KR = 0.72  # roof pitch

    def cut_mask(p):
        # Keep the left / back of the shell; remove the front-right quarter.
        return (p[:, 0] + p[:, 2] * 0.35) > 0.55

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        ground = y * 0.55
        # Outer walls and pitched roof
        walls = sd_box(p, np.array([0.0, HH, 0.0]), np.array([HW, HH, HD]))
        roof = np.maximum.reduce(
            [
                (y - (2 * HH) + KR * np.abs(z)) / math.hypot(1, KR),
                HW + 0.15 - np.abs(x),
                -y + HH * 0.95,
            ]
        )
        chim = sd_box(p, np.array([-HW * 0.55, 2 * HH + 0.9, -0.4]), np.array([0.35, 0.9, 0.35]))
        shell = np.minimum.reduce([walls, roof, chim])
        # Hollow the living volume, then add floors / fittings inside the cutaway.
        cavity = sd_box(p, np.array([0.0, HH * 0.95, 0.0]), np.array([HW - 0.22, HH * 0.92, HD - 0.22]))
        shell = np.maximum(shell, -cavity)
        # Floor slabs (ground, first, loft joists)
        fl0 = sd_box(p, np.array([0.0, 0.12, 0.0]), np.array([HW - 0.15, 0.1, HD - 0.15]))
        fl1 = sd_box(p, np.array([0.0, HH + 0.08, 0.0]), np.array([HW - 0.15, 0.08, HD - 0.15]))
        fl2 = sd_box(p, np.array([0.0, 2 * HH - 0.15, 0.0]), np.array([HW - 0.35, 0.06, HD - 0.45]))
        # Stair run (back-left)
        stair = sd_box(p, np.array([-HW + 1.1, HH * 0.55, HD - 1.0]), np.array([0.55, HH * 0.55, 0.9]))
        # Space heating: radiator on the cut face + boiler cupboard
        rad = sd_box(p, np.array([HW - 0.55, 0.85, -0.2]), np.array([0.08, 0.55, 1.1]))
        boiler = sd_box(p, np.array([-HW + 0.7, 0.95, -HD + 0.85]), np.array([0.45, 0.85, 0.4]))
        # Water heating: loft cylinder
        cylinder = sd_capsule(
            p,
            np.array([HW * 0.35, 2 * HH + 0.35, -0.6]),
            np.array([HW * 0.35, 2 * HH + 1.55, -0.6]),
            0.38,
        )
        # Cooking: kitchen block
        kitchen = sd_box(p, np.array([-0.2, 0.55, -HD + 0.7]), np.array([1.4, 0.45, 0.45]))
        hob = sd_box(p, np.array([-0.2, 1.05, -HD + 0.7]), np.array([0.55, 0.06, 0.35]))
        # Lighting / appliances: pendant + fridge volume
        pendant = sd_capsule(p, np.array([0.8, HH - 0.15, 0.4]), np.array([0.8, HH - 0.85, 0.4]), 0.08)
        fridge = sd_box(p, np.array([HW - 1.0, 0.95, -HD + 0.85]), np.array([0.4, 0.9, 0.35]))
        interior = np.minimum.reduce(
            [fl0, fl1, fl2, stair, rad, boiler, cylinder, kitchen, hob, pendant, fridge]
        )
        # Only show interior in the cutaway volume; solid shell elsewhere.
        cut = cut_mask(p)
        body = np.where(cut, np.minimum(shell, interior), shell)
        # Soften the cut plane as a thin section edge
        plane = np.abs(x + z * 0.35 - 0.55) - 0.04
        plane = np.maximum(plane, np.abs(y - HH) - HH - 0.2)
        return np.minimum(np.minimum(body, np.where(cut, plane + 0.5, 1e3)), ground)

    def sky(rd):
        el = np.clip(rd[:, 1], 0, 1)
        cl = fbm(rd[:, 0] * 2.0 + 1, rd[:, 1] * 6, rd[:, 2] * 2.0, 4)
        return np.clip(0.96 - el * 0.48 + (cl - 0.5) * 0.45, 0, 1)

    def albedo(p, n):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        brick = 0.58 + 0.1 * (np.mod(y * 4.2, 1) < 0.14) * -1 + 0.08 * (fbm(x * 3, y * 5, z * 3, 2) - 0.5)
        plaster = 0.88 + 0.04 * (fbm(x * 2, y * 2, z * 2, 2) - 0.5)
        slate = 0.36 + 0.06 * (np.mod((2 * HH + 1 - y) * 3, 1) < 0.22)
        metal = 0.25 + 0.15 * (np.abs(n[:, 1]) < 0.3)
        wood = 0.45 + 0.12 * (fbm(x * 8, y * 2, z * 2, 2) - 0.5)
        cut = cut_mask(p)
        outer = (np.abs(n[:, 0]) > 0.55) | (np.abs(n[:, 2]) > 0.55)
        roofy = (y > 2 * HH - 0.4) & (np.abs(n[:, 1]) > 0.25)
        a = np.where(roofy, slate, np.where(outer & ~cut, brick, plaster))
        # Fittings read darker so end-use zones separate from walls
        near_boiler = (x < -HW + 1.4) & (z < -HD + 1.5) & (y < 2.0)
        near_rad = (x > HW - 1.0) & (y < 1.6) & (y > 0.2)
        near_cyl = (y > 2 * HH) & (np.abs(x - HW * 0.35) < 0.7)
        near_kit = (z < -HD + 1.4) & (y < 1.3) & (np.abs(x + 0.2) < 1.6)
        a = np.where(near_boiler | near_rad | near_cyl, metal, a)
        a = np.where(near_kit, wood, a)
        a = np.where(y < 0.05, 0.62, a)
        return a

    cam = Cam((11.5, 5.8, -14.5), (-0.4, HH * 0.85, -0.2), 42, w, h)
    tone, _, _ = render(sdf, cam, (-0.45, 0.7, -0.4), sky, albedo, ao_scale=0.4, fog=0.004, amb=0.38, sun=1.05)

    N = Notes(W, H)
    # Leaders toward end-use zones (screen space from projected anchors)
    anchors = {
        "HEAT": (HW - 0.5, 0.9, -0.2),
        "WATER": (HW * 0.35, 2 * HH + 0.9, -0.6),
        "COOK": (-0.2, 0.7, -HD + 0.7),
        "LIGHT": (0.8, HH - 0.5, 0.4),
        "APPL": (HW - 1.0, 1.0, -HD + 0.85),
    }
    for label, P in anchors.items():
        xy, _ = cam.project([P], W, H)
        tip = xy[0]
        N.leader(tip, (tip[0] + 70, tip[1] - 55), label)
    N.dim_v(80, cam.project([(0, 2 * HH, 0)], W, H)[0][0][1], cam.project([(0, 0, 0)], W, H)[0][0][1], "2 STOREYS")
    N.ruler(30, 100, H - 140, every=20)
    N.text((44, 40), "FIG. 16")
    N.text((W - 44, 40), "ENERGY · END USE", anchor="ra")
    N.block(
        [
            "DOMESTIC CUTAWAY · ECUK U3 ZONES",
            "SPACE HEATING · WATER · COOKING · LIGHTING · APPLIANCES",
            "SOURCE · DESNZ ENERGY CONSUMPTION IN THE UK",
        ]
    )
    compose(tone, N, out / "16-energy-cutaway.png", seed, lo=0.04, hi=0.97, gamma=1.12)


PLATES = {
    "street": plate_street,
    "plots": plate_plots,
    "terrace": plate_terrace,
    "cutaway": plate_cutaway,
    "frames": turbine_frames,
    "regions": plate_regions,
    "globe": plate_globe,
    "towers": plate_towers,
    "turbine": plate_turbine,
    "block": plate_block,
    "pylons": plate_pylons,
}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(PLATES))
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--bare", action="store_true", help="line work only, no text or label tags")
    ap.add_argument("--mask", action="store_true", help="export ink as alpha (transparent PNG)")
    ap.add_argument("--size", help="WxH output size for portrait-framed plates, e.g. 2400x1350")
    ap.add_argument("--prefix", default="", help="filename prefix")
    ap.add_argument("--data", type=Path, default=Path("."), help="folder of API observation JSON")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    global W, H, BARE, MASK, PREFIX, DATA
    BARE, MASK, PREFIX, DATA = a.bare, a.mask, a.prefix, a.data
    if a.size:
        W, H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        PLATES[name.strip()](a.out, a.seed)


if __name__ == "__main__":
    main()
