# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Manufacturing branch specimen plates — matched set for Domain 08 (Production Anatomy).

One plate per SIC broad branch, each the thing the branch makes, on the same floor,
camera and light as every other specimen in the set:

  food         a pyramid of food tins                          (CA · food, drink and tobacco)
  textiles     a bolt of cloth and cones of yarn               (CB · textiles, clothing and leather)
  paper        paper reels, one standing, one lying            (CC · wood, paper and printing)
  refinery     a distillation column with platforms            (CD · coke and refined petroleum)
  chemicals    a reactor vessel on legs                        (CE · chemicals)
  pharma       a tray of crimp-capped vials                    (CF · pharmaceuticals)
  rubber       a tyre beside a stack of bricks                 (CG · rubber, plastics, non-metallic minerals)
  metals       a stack of rolled steel I-beams                 (CH · basic metals and metal products)
  electronics  a circuit board with chips and a heatsink       (CI · computers and electronics)
  electrical   a finned electric motor                         (CJ · electrical equipment)
  machinery    a centre lathe                                  (CK · machinery)
  transport    a turbofan engine on its transport stand        (CL · transport equipment)
  furniture    a Windsor chair                                 (CM · other manufacturing and repair)

Illustrative specimens only — plate area is NOT output or share. Numbers live in the UI.
Renderer, tone curve, halftone and registration crosses are shared with energy-tech-types.py.

Usage:
  uv run manufacturing-types.py OUT_DIR [--only pharma,metals,transport] [--size 1000x1000] [--preview]
Writes OUT_DIR/m-<id>.png (mask for <Plate>).
"""

from __future__ import annotations

import argparse
import importlib.util
import math
from pathlib import Path

import numpy as np

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("energy_tech_types", _HERE / "energy-tech-types.py")
assert _spec and _spec.loader
E = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(E)
P = E.P  # halftone-plates module

TAU = 2 * math.pi
box, cyl, sstep = E.box, E.cyl, E.sstep


class Geo(E.Geo):
    """Energy specimen geometry with a finer, shorter soft-shadow pass: these objects are
    ~12 units across, so 56 steps over 120 units bands the floor into streaks."""

    def __init__(self, sdf, cam):
        self.cam = cam
        rd = cam.rays()
        t, hit = P.march(sdf, cam.pos, rd, steps=220)
        self.rd, self.hit = rd, hit
        p = cam.pos + rd[hit] * t[hit, None]
        n = P.normals(sdf, p)
        self.p, self.n = p, n
        self.dif = np.clip(n @ E.LIGHT, 0, 1)
        self.sh = P.shadow(sdf, p + n * 0.03, E.LIGHT, steps=128, k=8.0, tmax=30.0)
        self.oc = P.ao(sdf, p, n, 0.45)

# One camera, one floor for the whole set (same framing for every specimen).
CAM = ((-21.0, 13.5, -27.0), (0.0, 2.8, 0.5), 27)
FLOOR_R0, FLOOR_R1 = 6.5, 10.5


def floor_albedo(p):
    x, z = p[:, 0], p[:, 2]
    a = 0.95 + 0.02 * (P.fbm(x * 0.35, 0, z * 0.35, 2) - 0.5)
    return a


def to_paper_fn(cx=0.0, cz=0.5):
    def fn(p):
        d = np.hypot(p[:, 0] - cx, p[:, 2] - cz)
        # Floor fades to paper; any far hit (grazing floor the march did not settle) is paper too.
        return np.maximum(sstep(FLOOR_R0, FLOOR_R1, d) * (p[:, 1] < 0.2), sstep(FLOOR_R1, FLOOR_R1 + 1.0, d))

    return fn


def cyl_z(p, cx, cy, r, z0, z1):
    """Capped cylinder along z."""
    d = np.hypot(p[:, 0] - cx, p[:, 1] - cy) - r
    return np.maximum(d, np.maximum(z0 - p[:, 2], p[:, 2] - z1))


# ───────────────────────── scenes ─────────────────────────


def scene_pharma():
    """4 × 3 tray of 10 ml vials: glass body, neck, aluminium crimp cap."""
    xs = [-3.3, -1.1, 1.1, 3.3]
    zs = [-2.2, 0.0, 2.2]
    centres = [(x, z) for x in xs for z in zs]
    tray_y = 0.35

    def sdf(p):
        floor = p[:, 1]
        tray = box(p, (0, tray_y / 2, 0), (5.0, tray_y / 2, 3.7))
        d = np.minimum(floor, tray)
        y0 = tray_y
        for cx, cz in centres:
            body = cyl(p, (cx, cz), 0.72, y0, y0 + 3.9)
            shoulder = cyl(p, (cx, cz), 0.42, y0 + 3.9, y0 + 4.35)
            cap = cyl(p, (cx, cz), 0.56, y0 + 4.35, y0 + 4.95)
            d = np.minimum.reduce([d, body, shoulder, cap])
        return d

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        on_tray = (y > 0.02) & (np.abs(x) < 5.05) & (np.abs(z) < 3.75) & (y <= tray_y + 0.02)
        a = np.where(on_tray, 0.8, a)
        r = np.full(len(p), 1e9)
        for cx, cz in centres:
            r = np.minimum(r, np.hypot(x - cx, z - cz))
        vial = (r < 0.8) & (y > tray_y + 0.01)
        cap = vial & (y > tray_y + 4.35)
        glass = vial & ~cap
        # Glass: near white with a printed label band; cap: mid-tone crimped metal.
        label = glass & (y > tray_y + 1.0) & (y < tray_y + 2.6)
        a = np.where(glass, 1.0, a)
        a = np.where(label, 0.78 - 0.14 * (np.mod(y * 5.0, 1) < 0.16), a)
        a = np.where(cap, 0.6, a)
        return a

    return sdf, albedo


def i_beam(p, cx, cy, half_len, depth=2.6, flange=2.2, tf=0.32, tw=0.24):
    """I-beam lying along x, web vertical, centred at (cx, cy) in the x/y plane, z = 0 axis."""
    top = box(p, (cx, cy + depth / 2 - tf / 2, 0), (half_len, tf / 2, flange / 2))
    bot = box(p, (cx, cy - depth / 2 + tf / 2, 0), (half_len, tf / 2, flange / 2))
    web = box(p, (cx, cy, 0), (half_len, depth / 2 - tf, tw / 2))
    return np.minimum.reduce([top, bot, web])


def scene_metals():
    """Rolled steel I-beams stacked on timber bearers: three below, two above (offset)."""
    L = 6.2
    depth = 2.6
    bearer_h = 0.45

    def shifted(p, dz):
        q = p.copy()
        q[:, 2] = q[:, 2] - dz
        return q

    def sdf(p):
        floor = p[:, 1]
        bearers = np.minimum(
            box(p, (-4.0, bearer_h / 2, 0), (0.45, bearer_h / 2, 4.6)),
            box(p, (4.0, bearer_h / 2, 0), (0.45, bearer_h / 2, 4.6)),
        )
        d = np.minimum(floor, bearers)
        y1 = bearer_h + depth / 2
        for dz in (-2.6, 0.0, 2.6):
            d = np.minimum(d, i_beam(shifted(p, dz), 0.0, y1, L))
        y2 = bearer_h + depth + depth / 2
        for dz in (-1.3, 1.3):
            d = np.minimum(d, i_beam(shifted(p, dz), 0.6, y2, L - 0.4))
        return d

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        bearer = (y > 0.02) & (y <= bearer_h + 0.01) & (np.abs(np.abs(x) - 4.0) < 0.5)
        a = np.where(bearer, 0.7 - 0.1 * (np.mod(z * 2.2, 1) < 0.12), a)
        steel = (y > bearer_h + 0.01) & (np.abs(x) < L + 0.7)
        scale = 0.74 + 0.08 * (P.fbm(x * 0.9, y * 0.9, z * 0.9, 3) - 0.5)
        # Sawn ends read lighter: the I section is the specimen's signature.
        end = np.abs(n[:, 0]) > 0.9
        a = np.where(steel, np.where(end, 1.0, scale), a)
        return a

    return sdf, albedo


def scene_transport():
    """Turbofan on a transport stand: nacelle, fan and spinner, core and exhaust cone."""
    cy = 4.3  # engine axis height
    R = 2.9  # nacelle inner radius
    z_lip, z_aft = -3.6, 2.4
    blades = 20

    def rot(p):
        """Engine is modelled along z; turn it so the axis runs along x (intake to −x)."""
        return np.stack([-p[:, 2], p[:, 1], p[:, 0] - 1.0], -1)  # centre the engine in frame

    def sdf(p0):
        p = rot(p0)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        r = np.hypot(x, y - cy)
        # Nacelle shell with a rounded lip.
        shell = np.maximum(np.abs(r - (R + 0.22)) - 0.22, np.maximum(z_lip - z, z - z_aft))
        lip = np.hypot(r - (R + 0.22), z - z_lip) - 0.24
        nacelle = np.minimum(shell, lip)
        # Fan disc of blades (sector repeat around the axis), set back from the lip.
        zf = z_lip + 1.1
        ang = np.arctan2(y - cy, x)
        sector = TAU / blades
        a_loc = np.mod(ang + sector / 2, sector) - sector / 2
        twist = 0.35 * (r / R)
        blade = np.maximum.reduce(
            [
                np.abs(r * np.sin(a_loc + twist * 0.0)) - 0.11,
                r - (R - 0.06),
                0.8 - r,
                np.abs(z - zf - twist * 0.6 * np.sign(a_loc)) - 0.32,
            ]
        )
        spinner = P.sd_sphere(p, np.array([0.0, cy, zf - 0.2]), 0.95)
        spinner = np.maximum(spinner, z - zf - 0.5)
        hub = cyl_z(p, 0.0, cy, 0.95, zf - 0.2, zf + 0.6)
        # Core casing and exhaust cone behind the nacelle.
        core_r = 1.75 - 0.18 * np.clip(z - z_aft, 0, 3)
        core = np.maximum(r - core_r, np.maximum(z_aft - 1.0 - z, z - (z_aft + 2.6)))
        plug_r = 0.9 - 0.42 * np.clip(z - (z_aft + 2.6), 0, 2.1)
        plug = np.maximum(r - plug_r, np.maximum((z_aft + 2.6) - z, z - (z_aft + 4.7)))
        # Transport stand: two cradles and a base frame.
        cradles = np.minimum(
            box(p, (0, (cy - R - 0.4) / 2 + 0.35, -1.6), (2.2, (cy - R - 0.4) / 2, 0.22)),
            box(p, (0, (cy - R - 0.4) / 2 + 0.35, 1.6), (2.2, (cy - R - 0.4) / 2, 0.22)),
        )
        base = np.minimum(
            box(p, (-2.0, 0.18, 0.2), (0.2, 0.18, 4.6)),
            box(p, (2.0, 0.18, 0.2), (0.2, 0.18, 4.6)),
        )
        d = np.minimum.reduce([floor, nacelle, blade * 0.7, spinner, hub, core, plug, cradles, base])
        return d

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot(p0)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        r = np.hypot(x, y - cy)
        up = y > 0.02
        nac = up & (r > R - 0.05) & (z < z_aft + 0.05)
        seams = (np.abs(z - (z_lip + 2.0)) < 0.06) | (np.abs(z - (z_lip + 4.4)) < 0.06)
        a = np.where(nac, 0.72 - 0.3 * seams, a)
        inside = up & (r < R - 0.05) & (z < z_aft)
        a = np.where(inside, 0.55, a)  # fan face
        spin = up & (r < 1.0) & (z < z_lip + 1.6)
        a = np.where(spin, 0.82 - 0.4 * (np.hypot(x, y - cy) < 0.12), a)
        core = up & (z >= z_aft - 1.0) & (r < 1.9)
        a = np.where(core, 0.58 - 0.08 * (np.mod(z * 2.0, 1) < 0.1), a)
        stand = up & (y < cy - R - 0.0) & ~(r > R - 0.05)
        a = np.where(stand & (y > 0.02), 0.5, a)
        return a

    return sdf, albedo


def cyl_x(p, cy, cz, r, x0, x1):
    """Capped cylinder along x."""
    d = np.hypot(p[:, 1] - cy, p[:, 2] - cz) - r
    return np.maximum(d, np.maximum(x0 - p[:, 0], p[:, 0] - x1))


def cap(a, b, r):
    a, b = np.array(a, float), np.array(b, float)
    return lambda p: P.sd_capsule(p, a, b, r)


def nearest(p, centres):
    r = np.full(len(p), 1e9)
    for cx, cz in centres:
        r = np.minimum(r, np.hypot(p[:, 0] - cx, p[:, 2] - cz))
    return r


def scene_food():
    """A pyramid of food tins: nine below, four above, one on top (CA · food, drink, tobacco)."""
    R, H = 0.95, 2.1
    rows = [
        (0.0, [(x, z) for x in (-2.0, 0.0, 2.0) for z in (-2.0, 0.0, 2.0)]),
        (H, [(x, z) for x in (-1.0, 1.0) for z in (-1.0, 1.0)]),
        (2 * H, [(0.0, 0.0)]),
    ]

    def sdf(p):
        d = p[:, 1]
        for y0, cs in rows:
            for cx, cz in cs:
                d = np.minimum(d, cyl(p, (cx, cz), R, y0 + 0.02, y0 + H - 0.02))
        return d

    def albedo(p, n, t):
        y = p[:, 1]
        a = floor_albedo(p)
        tin = y > 0.03
        ly = np.mod(y, H)
        rim = (ly < 0.16) | (ly > H - 0.16)
        label = (ly > 0.45) & (ly < H - 0.45)
        top = n[:, 1] > 0.9
        a = np.where(tin, 0.86, a)
        a = np.where(tin & label & ~top, 0.62 - 0.14 * (np.abs(ly - H / 2) < 0.12), a)
        a = np.where(tin & rim & ~top, 0.72, a)
        a = np.where(tin & top, 0.9 - 0.2 * (np.mod(np.hypot(*[p[:, 0] - np.round(p[:, 0]), p[:, 2] - np.round(p[:, 2])]) * 5, 1) < 0.15), a)
        return a

    return sdf, albedo


def scene_textiles():
    """A bolt of cloth on a cradle with three cones of yarn (CB · textiles, clothing, leather)."""
    cy = 2.4

    def sdf(p):
        floor = p[:, 1]
        bolt = cyl_x(p, cy, 0.6, 1.9, -4.2, 4.2)
        core = cyl_x(p, cy, 0.6, 0.45, -4.8, 4.8)
        cradle = np.minimum(
            box(p, (-3.2, 0.5, 0.6), (0.25, 0.5, 1.4)),
            box(p, (3.2, 0.5, 0.6), (0.25, 0.5, 1.4)),
        )
        cones = floor
        for cx in (-2.6, 0.0, 2.6):
            c = np.array([cx, 0.0, -3.4])
            q = p - c
            rr = np.hypot(q[:, 0], q[:, 2])
            rad = 1.0 - 0.32 * np.clip(q[:, 1] / 2.6, 0, 1)
            cone = np.maximum(rr - rad, np.maximum(-q[:, 1], q[:, 1] - 2.6)) * 0.9
            cones = np.minimum(cones, cone)
        return np.minimum.reduce([floor, bolt, core, cradle, cones])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        r = np.hypot(y - cy, z - 0.6)
        bolt = (np.abs(x) < 4.25) & (r > 0.5) & (y > 0.05)
        weave = (np.mod(x * 3.0, 1) < 0.5) ^ (np.mod(np.arctan2(y - cy, z - 0.6) * 9, 1) < 0.5)
        end = np.abs(n[:, 0]) > 0.9
        a = np.where(bolt, np.where(end, 0.92 - 0.25 * (np.mod(r * 7, 1) < 0.18), 0.8 - 0.1 * weave), a)
        a = np.where((np.abs(x) > 4.25) & (r < 0.5) & (y > 0.05), 0.5, a)
        cone = (z < -2.2) & (y > 0.03)
        a = np.where(cone, 0.84 - 0.18 * (np.mod(y * 9, 1) < 0.2), a)
        a = np.where((np.abs(np.abs(x) - 3.2) < 0.3) & (y < 1.05) & (y > 0.03) & ~cone, 0.6, a)
        return a

    return sdf, albedo


def scene_paper():
    """Two paper reels: one standing, one lying in front (CC · wood, paper, printing)."""

    def sdf(p):
        floor = p[:, 1]
        stand = np.maximum(cyl(p, (-1.4, 1.2), 3.0, 0.02, 4.6), -cyl(p, (-1.4, 1.2), 0.5, -1, 6))
        lie = np.maximum(
            np.maximum(np.hypot(p[:, 1] - 1.9, p[:, 0] - 2.6) - 1.9, np.maximum(-4.0 - p[:, 2], p[:, 2] - (-0.6))),
            -(np.hypot(p[:, 1] - 1.9, p[:, 0] - 2.6) - 0.4),
        )
        return np.minimum.reduce([floor, stand, lie])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = y > 0.03
        topface = up & (n[:, 1] > 0.9)
        r1 = np.hypot(x + 1.4, z - 1.2)
        a = np.where(up, 0.88, a)
        a = np.where(topface, 0.96 - 0.22 * (np.mod(r1 * 6, 1) < 0.1), a)
        endface = up & (np.abs(n[:, 2]) > 0.9) & (z < -0.5)
        r2 = np.hypot(x - 2.6, y - 1.9)
        a = np.where(endface, 0.96 - 0.22 * (np.mod(r2 * 6, 1) < 0.1), a)
        a = np.where(up & ((r1 < 0.55) | (r2 < 0.45)), 0.45, a)
        return a

    return sdf, albedo


def scene_refinery():
    """A distillation column with platforms and a smaller column beside it (CD · refined petroleum)."""

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        col = cyl(p, (-0.6, 0.4), 1.25, 0, 9.2)
        head = P.sd_sphere(p, np.array([-0.6, 9.2, 0.4]), 1.25)
        small = cyl(p, (2.6, -1.0), 0.8, 0, 5.6)
        shead = P.sd_sphere(p, np.array([2.6, 5.6, -1.0]), 0.8)
        d = np.minimum.reduce([floor, col, head, small, shead])
        for yy in (2.6, 5.2, 7.8):
            ring = np.maximum(np.abs(np.hypot(x + 0.6, z - 0.4) - 1.55) - 0.28, np.abs(y - yy) - 0.07)
            d = np.minimum(d, ring)
        pipe = np.hypot(y - 4.8, z + 0.3) - 0.22
        pipe = np.maximum(pipe, np.maximum(-0.6 - x, x - 2.6))
        base = box(p, (0.6, 0.25, -0.2), (3.4, 0.25, 2.4))
        return np.minimum.reduce([d, pipe, base])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = y > 0.52
        a = np.where((y > 0.03) & (y <= 0.52), 0.66, a)
        bands = np.mod(y * 1.1, 1) < 0.06
        a = np.where(up, 0.84 - 0.18 * bands, a)
        ring = up & (np.abs(np.mod(y + 0.1, 2.6) - 0.1) < 0.12) & (np.hypot(x + 0.6, z - 0.4) > 1.3)
        a = np.where(ring, 0.6, a)
        return a

    return sdf, albedo


def scene_chemicals():
    """A jacketed reactor vessel on legs with nozzles and agitator drive (CE · chemicals)."""
    R, y0, y1 = 2.3, 2.2, 6.4

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        rr = np.hypot(x, z)
        shell = np.maximum(rr - R, np.maximum(y0 - y, y - y1))
        top = np.maximum(np.hypot(rr / R, (y - y1) / 1.1) - 1.0, y1 - y) * 1.0
        bot = np.maximum(np.hypot(rr / R, (y - y0) / 1.1) - 1.0, y - y0) * 1.0
        legs = floor
        for k in range(4):
            a = TAU * k / 4 + TAU / 8
            legs = np.minimum(legs, cyl(p, (math.cos(a) * 2.0, math.sin(a) * 2.0), 0.22, 0, y0 + 0.6))
        drive = cyl(p, (0, 0), 0.55, y1 + 0.9, y1 + 2.4)
        noz = np.minimum(cyl(p, (1.2, -0.6), 0.28, y1 + 0.4, y1 + 1.5), cyl(p, (-1.0, -1.0), 0.32, y1 + 0.4, y1 + 1.4))
        lug = box(p, (0, 4.2, 0), (2.55, 0.12, 2.55))
        lug = np.maximum(lug, rr - 2.6)
        return np.minimum.reduce([floor, shell, top * 1.0, bot, legs, drive, noz, lug])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = y > 0.03
        rr = np.hypot(x, z)
        a = np.where(up, 0.86, a)
        a = np.where(up & (rr > 1.0) & (np.abs(np.mod(y - 2.2, 1.4)) < 0.05) & (y > y0) & (y < y1), 0.55, a)
        a = np.where(up & (y > y1 + 0.85), 0.55, a)
        a = np.where(up & (y < y0 - 0.4) & (rr > 1.6), 0.5, a)
        return a

    return sdf, albedo


def scene_rubber():
    """An upright tyre beside a stack of bricks (CG · rubber, plastics, non-metallic minerals)."""
    Rt, rt, cy = 2.3, 1.05, 3.35

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        q = np.hypot(x + 1.6, y - cy)
        tyre = np.maximum(np.hypot(q - Rt, (z - 0.8) / 1.0) - rt, -(q - 1.25))
        tyre = np.maximum(tyre, np.abs(z - 0.8) - 1.0)
        bricks = floor
        for i in range(3):
            for j in range(2):
                for k in range(3):
                    cx = 2.4 + (j - 0.5) * 2.0 + (0.5 if i % 2 else 0.0) * 0.0
                    bricks = np.minimum(
                        bricks,
                        box(p, (cx, 0.36 + i * 0.72, -1.4 + k * 1.05), (0.95, 0.33, 0.48)),
                    )
        return np.minimum.reduce([floor, tyre, bricks])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        q = np.hypot(x + 1.6, y - cy)
        tyre = (q > 1.2) & (q < Rt + rt + 0.1) & (np.abs(z - 0.8) < 1.1) & (y > 0.03)
        ang = np.arctan2(y - cy, x + 1.6)
        tread = (q > Rt + 0.55) & (np.mod(ang * 18 + (z - 0.8) * 1.4, 1) < 0.3)
        a = np.where(tyre, np.where(tread, 0.3, 0.46), a)
        a = np.where(tyre & (q < 1.6), 0.7, a)
        brick = (x > 1.2) & (y > 0.03) & ~tyre
        mortar = (np.mod(y, 0.72) < 0.06)
        a = np.where(brick, np.where(mortar, 0.9, 0.62 + 0.08 * (P.fbm(x * 3, y * 3, z * 3, 2) - 0.5)), a)
        return a

    return sdf, albedo


def scene_electronics():
    """A circuit board on standoffs: chips, capacitors and a finned heatsink (CI · computers, electronics)."""
    by = 0.9

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        board = box(p, (0, by, 0), (4.6, 0.09, 3.4))
        posts = floor
        for sx in (-4.1, 4.1):
            for sz in (-2.9, 2.9):
                posts = np.minimum(posts, cyl(p, (sx, sz), 0.16, 0, by))
        chips = np.minimum.reduce(
            [
                box(p, (-2.0, by + 0.2, 1.2), (1.1, 0.12, 1.1)),
                box(p, (1.0, by + 0.16, 1.9), (1.4, 0.08, 0.5)),
                box(p, (1.0, by + 0.16, 0.8), (1.4, 0.08, 0.35)),
                box(p, (-2.6, by + 0.16, -1.9), (0.5, 0.08, 0.9)),
            ]
        )
        hs_base = box(p, (2.0, by + 0.2, -1.2), (1.3, 0.12, 1.3))
        fins = box(p, (2.0, by + 0.95, -1.2), (1.3, 0.7, 1.3))
        fins = np.maximum(fins, np.abs(np.mod(x - 2.0 + 0.13, 0.26) - 0.13) - 0.05)
        caps = floor
        for cx, cz in ((-0.4, -0.6), (-0.4, -1.6), (0.4, -2.6), (-1.2, -2.6)):
            caps = np.minimum(caps, cyl(p, (cx, cz), 0.32, by, by + 1.0))
        return np.minimum.reduce([floor, board, posts, chips, hs_base, fins * 0.9, caps])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        onb = (y > by - 0.1) & (y < by + 0.1) & (np.abs(x) < 4.65) & (np.abs(z) < 3.45)
        trace = (np.mod(x * 2.5, 1) < 0.08) & (np.mod(z * 0.7, 1) < 0.6) | (np.mod(z * 2.5, 1) < 0.08) & (np.mod(x * 0.6, 1) < 0.5)
        a = np.where(onb, 0.88 - 0.2 * trace, a)
        above = y > by + 0.1
        a = np.where(above, 0.5, a)  # chip packages read darker than the board
        hs = above & (np.abs(x - 2.0) < 1.35) & (np.abs(z + 1.2) < 1.35)
        a = np.where(hs, 0.95 - 0.35 * (np.abs(n[:, 0]) > 0.9), a)
        capm = above & (np.hypot(x + 0.4, z + 0.6) < 0.4) | above & (np.hypot(x + 0.4, z + 1.6) < 0.4) | above & (np.hypot(x - 0.4, z + 2.6) < 0.4) | above & (np.hypot(x + 1.2, z + 2.6) < 0.4)
        a = np.where(capm, 0.8 - 0.3 * (n[:, 1] > 0.9), a)
        a = np.where((y > 0.03) & (y < by - 0.1), 0.6, a)
        return a

    return sdf, albedo


def scene_electrical():
    """A finned induction motor on its feet with terminal box and shaft (CJ · electrical equipment)."""
    cy, R = 2.6, 2.0

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        rr = np.hypot(y - cy, z)
        ang = np.arctan2(y - cy, z)
        fin = 0.22 * np.clip(np.cos(ang * 22) * 3 - 2, 0, 1)
        body = np.maximum(rr - (R + fin), np.abs(x) - 3.0) * 0.8
        endbell = np.maximum(rr - (R - 0.15), np.abs(x) - 3.5)
        fan_cover = np.maximum(rr - (R - 0.05), np.maximum(-3.5 - x, x + 2.9)) if False else floor
        shaft = cyl_x(p, cy, 0.0, 0.32, 3.4, 5.2)
        key = box(p, (4.6, cy + 0.32, 0), (0.5, 0.06, 0.08))
        feet = np.minimum(box(p, (-1.9, 0.35, 0), (0.5, 0.35, 2.0)), box(p, (1.9, 0.35, 0), (0.5, 0.35, 2.0)))
        tbox = box(p, (0.0, cy + R + 0.45, 0.0), (0.9, 0.5, 0.75))
        return np.minimum.reduce([floor, body, endbell, shaft, key, feet, tbox, fan_cover])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = y > 0.03
        a = np.where(up, 0.72, a)
        end = up & (np.abs(n[:, 0]) > 0.9) & (np.abs(x) > 2.9)
        rr = np.hypot(y - cy, z)
        a = np.where(end, 0.86 - 0.25 * (np.mod(rr * 4, 1) < 0.12), a)
        a = np.where(up & (x > 3.4), 0.9, a)
        a = np.where(up & (y > cy + R - 0.05) & (np.abs(x) < 0.95), 0.84, a)
        return a

    return sdf, albedo


def scene_machinery():
    """A centre lathe: bed on two pedestals, headstock, chuck, carriage and tailstock (CK · machinery)."""

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        peds = np.minimum(box(p, (-3.9, 1.1, 0), (1.0, 1.1, 1.1)), box(p, (3.9, 1.1, 0), (0.8, 1.1, 1.1)))
        bed = box(p, (0, 2.55, 0), (5.2, 0.35, 1.0))
        ways = np.minimum(box(p, (0, 3.0, -0.6), (5.2, 0.1, 0.18)), box(p, (0, 3.0, 0.6), (5.2, 0.1, 0.18)))
        head = box(p, (-4.0, 4.1, 0), (1.2, 1.1, 1.0))
        chuck = cyl_x(p, 4.1, 0.0, 0.85, -2.8, -2.2)
        jaws = box(p, (-2.05, 4.1, 0), (0.18, 0.95, 0.12))
        work = cyl_x(p, 4.1, 0.0, 0.3, -2.2, 1.6)
        carriage = box(p, (0.2, 3.4, 0), (0.7, 0.32, 1.25))
        post = box(p, (0.2, 3.95, -0.3), (0.3, 0.25, 0.3))
        tail = box(p, (3.6, 3.75, 0), (0.75, 0.75, 0.7))
        quill = cyl_x(p, 4.1, 0.0, 0.25, 2.2, 2.9)
        return np.minimum.reduce([floor, peds, bed, ways, head, chuck, jaws, work, carriage, post, tail, quill])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = y > 0.03
        a = np.where(up, 0.66, a)
        a = np.where(up & (y > 2.85) & (y < 3.15), 0.9, a)  # bright ways
        a = np.where(up & (np.hypot(y - 4.1, z) < 0.35) & (x > -2.2) & (x < 2.95), 0.92, a)  # work + quill
        a = np.where(up & (x > -2.85) & (x < -2.15) & (np.hypot(y - 4.1, z) < 0.9), 0.8, a)
        a = np.where(up & (y < 2.2) & (np.mod(y, 0.55) < 0.05), 0.5, a)
        return a

    return sdf, albedo


def scene_furniture():
    """A Windsor chair: saddle seat, splayed legs, stretchers, spindle back (CM · other manufacturing and repair)."""
    sy = 2.9

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        seat = np.maximum(np.hypot(x / 2.2, (z - 0.2) / 2.0) - 1.0, np.abs(y - sy) - 0.18) * 0.9
        d = np.minimum(floor, seat)
        legs = [((-1.4, -1.2), (-1.8, -1.6)), ((1.4, -1.2), (1.8, -1.6)), ((-1.3, 1.3), (-1.7, 1.9)), ((1.3, 1.3), (1.7, 1.9))]
        for (tx, tz), (bx, bz) in legs:
            d = np.minimum(d, cap((bx, 0.0, bz), (tx, sy - 0.1, tz), 0.17)(p))
        d = np.minimum(d, cap((-1.7, 1.0, -0.2), (1.7, 1.0, -0.2), 0.11)(p))
        d = np.minimum(d, cap((-1.6, 1.0, -1.3), (-1.6, 1.0, 1.6), 0.1)(p))
        d = np.minimum(d, cap((1.6, 1.0, -1.3), (1.6, 1.0, 1.6), 0.1)(p))
        # Bow back and spindles
        bow_y, bow_z = sy + 3.0, 1.9
        bow = np.maximum(np.abs(np.hypot(x / 1.8, (y - sy) / 3.0) - 1.0) - 0.06, np.abs(z - bow_z) - 0.14)
        bow = np.maximum(bow, sy - y) * 0.8
        d = np.minimum(d, bow)
        for sx in (-1.0, -0.5, 0.0, 0.5, 1.0):
            top = sy + 3.0 * math.sqrt(max(0.0, 1 - (sx / 1.8) ** 2))
            d = np.minimum(d, cap((sx, sy, 1.6), (sx, top - 0.05, bow_z), 0.08)(p))
        _ = bow_y
        return d

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = y > 0.03
        grain = 0.08 * (np.mod((x + 0.3 * P.fbm(x * 0.6, y * 0.6, z * 0.6, 2)) * 5, 1) < 0.25)
        a = np.where(up, 0.68 - grain, a)
        a = np.where(up & (np.abs(y - sy) < 0.2) & (n[:, 1] > 0.8), 0.8 - grain, a)
        return a

    return sdf, albedo


# SIC broad branch → scene (CA–CM). Plate files are m-<scene>.png.
SCENES = {
    "food": scene_food,  # CA
    "textiles": scene_textiles,  # CB
    "paper": scene_paper,  # CC
    "refinery": scene_refinery,  # CD
    "chemicals": scene_chemicals,  # CE
    "pharma": scene_pharma,  # CF
    "rubber": scene_rubber,  # CG
    "metals": scene_metals,  # CH
    "electronics": scene_electronics,  # CI
    "electrical": scene_electrical,  # CJ
    "machinery": scene_machinery,  # CK
    "transport": scene_transport,  # CL
    "furniture": scene_furniture,  # CM
}


def build(name: str, out: Path, seed: int) -> None:
    sdf, albedo = SCENES[name]()
    w, h = P.W // 2, P.H // 2
    cam = P.Cam(CAM[0], CAM[1], CAM[2], w, h)
    geo = Geo(sdf, cam)
    tone = geo.shade(albedo, 0.0)
    tone = np.nan_to_num(tone, nan=1.0)
    tone = geo.to_paper(tone, to_paper_fn())
    E.write_plate(tone, out / f"m-{name}.png", seed)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(SCENES))
    ap.add_argument("--size", default="1000x1000")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--preview", action="store_true", help="two-colour PNG instead of a mask")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE, P.MASK, P.PREFIX = True, not a.preview, ""
    P.W, P.H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        build(name.strip(), a.out, a.seed)


if __name__ == "__main__":
    main()
