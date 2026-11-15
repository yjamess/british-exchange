# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26"]
# ///
"""Work-section specimen plates — one matched set for Economy › Employment › What Britain Does for Work.

One plate per SIC 2007 section (A–T, the ONS JOBS02 industry groups), each the kit the work
is done with, on the same floor, camera and light as the manufacturing set (manufacturing-types.py):

  farming       a tractor                                   (A · farming, forestry and fishing)
  mining        a pithead headframe with its winding wheel  (B · mining and quarrying)
  factory       a north-light factory with three roof bays  (C · manufacturing)
  power         a lattice pylon with three crossarms        (D · electricity and gas)
  water         a water tower beside a wheelie bin          (E · water and waste)
  construction  a tower crane on its base block             (F · construction)
  retail        a shop shelving unit stocked with goods     (G · retail and wholesale)
  transport     an articulated lorry                        (H · transport and storage)
  hospitality   a laid table with a teapot and two cups     (I · hotels and restaurants)
  telecoms      a telecom mast with panels and a dish       (J · information and communication)
  finance       a safe with a dial beside a strongbox       (K · finance and insurance)
  property      a front door in a brick wall with a sale board (L · property)
  science       a microscope                                (M · professional and scientific)
  admin         a filing cabinet with one drawer open       (N · administrative and support)
  civic         a stone portico with four columns           (O · public administration and defence)
  education     a blackboard on an easel beside books       (P · education)
  health        a hospital bed with a raised head           (Q · health and social work)
  recreation    a football goal with a ball                 (R · arts and recreation)
  services      a washing machine beside a laundry basket   (S · other services)
  household     a bucket with a mop and a broom             (T · households as employers)

Illustrative specimens only — plate area is NOT jobs or share. Numbers live in the UI.
No people, no logos, no crowns, no real brands.

Usage:
  uv run work-sections.py OUT_DIR [--only tractor,health] [--size 1000x1000] [--preview]
Writes OUT_DIR/w-<id>.png (mask for <Plate>).
"""

from __future__ import annotations

import argparse
import importlib.util
import math
from pathlib import Path

import numpy as np

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("manufacturing_types", _HERE / "manufacturing-types.py")
assert _spec and _spec.loader
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)
E, P = M.E, M.P

TAU = 2 * math.pi
box, cyl, sstep = M.box, M.cyl, M.sstep
cyl_x, cyl_z, cap = M.cyl_x, M.cyl_z, M.cap
floor_albedo = M.floor_albedo


# ───────────────────────── helpers ─────────────────────────


def cone(p, cx, cz, y0, y1, r0, r1):
    """Frustum from radius r0 at y0 to r1 at y1."""
    rr = np.hypot(p[:, 0] - cx, p[:, 2] - cz)
    rad = r0 + (r1 - r0) * np.clip((p[:, 1] - y0) / (y1 - y0), 0, 1)
    return np.maximum(rr - rad, np.maximum(y0 - p[:, 1], p[:, 1] - y1)) * 0.85


def gable(p, cx, y_base, half_w, height, half_len, cz=0.0):
    """Triangular prism along z: ridge at (cx, y_base + height)."""
    u = np.abs(p[:, 0] - cx)
    roof = p[:, 1] - (y_base + height * (1 - u / half_w))
    return np.maximum.reduce([roof, y_base - p[:, 1], u - half_w, np.abs(p[:, 2] - cz) - half_len]) * 0.7


def sawtooth(p, x0, y_base, width, height, half_len):
    """North-light bay: vertical glazed face at x0, slope falling towards x0 + width."""
    u = p[:, 0] - x0
    roof = p[:, 1] - (y_base + height * (1 - u / width))
    return np.maximum.reduce([roof, y_base - p[:, 1], -u, u - width, np.abs(p[:, 2]) - half_len]) * 0.7


def rot_y(p, ang, cx=0.0, cz=0.0):
    c, s = math.cos(ang), math.sin(ang)
    x, z = p[:, 0] - cx, p[:, 2] - cz
    q = p.copy()
    q[:, 0] = c * x - s * z + cx
    q[:, 2] = s * x + c * z + cz
    return q


def rot_z(p, ang, cx=0.0, cy=0.0):
    c, s = math.cos(ang), math.sin(ang)
    x, y = p[:, 0] - cx, p[:, 1] - cy
    q = p.copy()
    q[:, 0] = c * x - s * y + cx
    q[:, 1] = s * x + c * y + cy
    return q


def ring_z(p, cx, cy, r_out, r_in, z0, z1):
    """Washer along z."""
    return np.maximum(cyl_z(p, cx, cy, r_out, z0, z1), -cyl_z(p, cx, cy, r_in, z0 - 1, z1 + 1))


def ring_x(p, cy, cz, r_out, r_in, x0, x1):
    return np.maximum(cyl_x(p, cy, cz, r_out, x0, x1), -cyl_x(p, cy, cz, r_in, x0 - 1, x1 + 1))


def up_of(p):
    return p[:, 1] > 0.03


def stripes(v, period, duty=0.12):
    return np.mod(v / period, 1) < duty


# ───────────────────────── scenes ─────────────────────────


def scene_farming():
    """A tractor, three-quarter on: bonnet, cab, big rear wheels, small front wheels, exhaust."""
    ang = -0.55

    def q(p):
        return rot_y(p, ang)

    def sdf(p0):
        p = q(p0)
        floor = p0[:, 1]
        chassis = box(p, (0.0, 1.9, 0.0), (3.1, 0.5, 1.05))
        bonnet = box(p, (-1.6, 2.75, 0.0), (1.6, 0.5, 0.85))
        grille = box(p, (-3.15, 2.5, 0.0), (0.12, 0.6, 0.75))
        cab = box(p, (1.4, 4.1, 0.0), (1.3, 1.1, 1.0))
        roof = box(p, (1.4, 5.3, 0.0), (1.45, 0.14, 1.15))
        rear = np.minimum(cyl_z(p, 1.5, 2.05, 2.05, 1.05, 1.75), cyl_z(p, 1.5, 2.05, 2.05, -1.75, -1.05))
        front = np.minimum(cyl_z(p, -2.2, 1.2, 1.2, 0.85, 1.35), cyl_z(p, -2.2, 1.2, 1.2, -1.35, -0.85))
        hubs = np.minimum(cyl_z(p, 1.5, 2.05, 0.55, 1.0, 1.85), cyl_z(p, -2.2, 1.2, 0.35, 0.8, 1.45))
        axle = cyl_z(p, 1.5, 2.05, 0.3, -1.1, 1.1)
        exhaust = cap((-0.6, 3.2, 0.7), (-0.6, 6.0, 0.7), 0.13)(p)
        return np.minimum.reduce([floor, chassis, bonnet, grille, cab, roof, rear, front, hubs, axle, exhaust])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = q(p0)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        up = up_of(p0)
        a = np.where(up, 0.58, a)
        wheel = up & (np.abs(z) > 0.95) & ((np.hypot(x - 1.5, y - 2.05) < 2.1) | (np.hypot(x + 2.2, y - 1.2) < 1.25))
        tread = stripes(np.arctan2(y - 2.05, x - 1.5), TAU / 18, 0.4) | stripes(np.arctan2(y - 1.2, x + 2.2), TAU / 12, 0.4)
        a = np.where(wheel, 0.32 + 0.12 * tread, a)
        hub = wheel & ((np.hypot(x - 1.5, y - 2.05) < 0.6) | (np.hypot(x + 2.2, y - 1.2) < 0.4))
        a = np.where(hub, 0.7, a)
        glass = up & (y > 3.2) & (y < 5.1) & (np.abs(x - 1.4) < 1.25) & (np.abs(n[:, 1]) < 0.5)
        a = np.where(glass, 0.9, a)
        a = np.where(up & (x < -3.0) & (y < 3.1), 0.4 + 0.3 * stripes(y, 0.22, 0.5), a)  # grille
        a = np.where(up & (y > 3.0) & (y < 3.3) & (x < 0.0), 0.35, a)  # bonnet seam
        return a

    return sdf, albedo


def scene_mining():
    """A pithead headframe: two A-frame legs, a sheave wheel at the top and the winding house."""
    top = (0.0, 9.0, 0.0)

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        legs = np.minimum.reduce(
            [
                cap((-2.6, 0, -1.6), (-0.7, 9.0, -0.5), 0.22)(p),
                cap((-2.6, 0, 1.6), (-0.7, 9.0, 0.5), 0.22)(p),
                cap((2.6, 0, -1.6), (0.7, 9.0, -0.5), 0.22)(p),
                cap((2.6, 0, 1.6), (0.7, 9.0, 0.5), 0.22)(p),
            ]
        )
        back = cap((-4.8, 0, 0.0), (-0.9, 8.6, 0.0), 0.2)(p)
        braces = np.minimum.reduce(
            [
                cap((-2.0, 3.0, -1.25), (-2.0, 3.0, 1.25), 0.12)(p),
                cap((2.0, 3.0, -1.25), (2.0, 3.0, 1.25), 0.12)(p),
                cap((-1.4, 6.0, -0.9), (-1.4, 6.0, 0.9), 0.12)(p),
                cap((1.4, 6.0, -0.9), (1.4, 6.0, 0.9), 0.12)(p),
                cap((-2.0, 3.0, -1.25), (2.0, 3.0, -1.25), 0.12)(p),
                cap((-1.4, 6.0, -0.9), (1.4, 6.0, -0.9), 0.12)(p),
                cap((-2.0, 3.0, 1.25), (2.0, 3.0, 1.25), 0.12)(p),
                cap((-2.0, 3.0, -1.25), (1.4, 6.0, -0.9), 0.1)(p),
                cap((2.0, 3.0, 1.25), (-1.4, 6.0, 0.9), 0.1)(p),
            ]
        )
        deck = box(p, (0.0, 9.1, 0.0), (1.3, 0.14, 1.1))
        wheel = ring_z(p, 0.0, 10.2, 1.25, 1.0, -0.22, 0.22)
        hub = cyl_z(p, 0.0, 10.2, 0.28, -0.3, 0.3)
        spokes = np.full(len(p), 1e9)
        for k in range(6):
            a = k * TAU / 12
            spokes = np.minimum(spokes, cap((1.1 * math.cos(a), 10.2 + 1.1 * math.sin(a), 0), (-1.1 * math.cos(a), 10.2 - 1.1 * math.sin(a), 0), 0.07)(p))
        rope = np.minimum(cap((0.0, 11.3, 0.0), (-4.7, 0.6, 0.0), 0.05)(p), cap((1.15, 10.2, 0.0), (1.15, 0.0, 0.0), 0.05)(p))
        house = box(p, (-4.6, 1.3, 0.0), (1.4, 1.3, 1.9))
        house_roof = gable(p, -4.6, 2.6, 1.6, 0.9, 2.1)
        cage = box(p, (1.15, 1.2, 0.0), (0.55, 1.1, 0.55))
        return np.minimum.reduce([floor, legs, back, braces, deck, wheel, hub, spokes, rope, house, house_roof, cage])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.5, a)
        house = up & (x < -3.1) & (y < 3.6)
        a = np.where(house, 0.86 - 0.18 * stripes(y, 0.32, 0.18), a)
        a = np.where(house & (n[:, 1] > 0.5), 0.6 - 0.2 * stripes(x, 0.3, 0.3), a)
        a = np.where(up & (np.hypot(x, y - 10.2) < 1.3), 0.42, a)
        a = np.where(up & (np.abs(x - 1.15) < 0.6) & (y < 2.35), 0.6 - 0.3 * stripes(y, 0.3, 0.25), a)
        return a

    return sdf, albedo


def scene_factory():
    """A north-light factory: a long shed with three sawtooth roof bays and a chimney."""
    half_len = 3.4

    def sdf(p):
        floor = p[:, 1]
        shed = box(p, (0.0, 1.6, 0.0), (5.0, 1.6, half_len))
        bays = np.full(len(p), 1e9)
        for k in range(3):
            bays = np.minimum(bays, sawtooth(p, -5.0 + k * 3.33, 3.2, 3.33, 1.5, half_len))
        chimney = cyl(p, (-3.6, 2.4), 0.45, 0.0, 8.4)
        band = cyl(p, (-3.6, 2.4), 0.55, 7.8, 8.4)
        door = box(p, (2.4, 1.1, -half_len - 0.05), (0.9, 1.1, 0.08))
        tank = cyl_x(p, 1.1, -4.6, 0.9, -1.0, 2.4)
        tank_legs = np.minimum(cyl(p, (-0.6, -4.6), 0.12, 0, 0.6), cyl(p, (2.0, -4.6), 0.12, 0, 0.6))
        return np.minimum.reduce([floor, shed, bays, chimney, band, door, tank, tank_legs])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.85, a)
        brick = up & (y < 3.25) & (np.abs(x) < 5.1) & (np.abs(n[:, 1]) < 0.5)
        course = stripes(y, 0.3, 0.14)
        header = stripes(x + 0.3 * (np.mod(np.floor(y / 0.3), 2)), 0.72, 0.1) | stripes(z + 0.3 * (np.mod(np.floor(y / 0.3), 2)), 0.72, 0.1)
        a = np.where(brick, 0.78 - 0.16 * (course | header), a)
        glazed = up & (y > 3.25) & (np.abs(n[:, 0]) > 0.9)
        a = np.where(glazed, 0.95 - 0.5 * (stripes(y, 0.42, 0.14) | stripes(z, 0.6, 0.12)), a)
        slope = up & (y > 3.25) & (n[:, 1] > 0.3) & (np.abs(x) < 5.1)
        a = np.where(slope, 0.62 - 0.1 * stripes(z, 0.55, 0.12), a)
        a = np.where(up & (np.hypot(x + 3.6, z - 2.4) < 0.6) & (y > 3.3), 0.7 - 0.14 * stripes(y, 0.3, 0.14), a)
        a = np.where(up & (np.abs(x - 2.4) < 0.9) & (y < 2.2) & (z < -half_len), 0.45 + 0.25 * stripes(x, 0.3, 0.5), a)
        a = np.where(up & (z < -3.6) & (y < 2.2), 0.6, a)
        return a

    return sdf, albedo


def scene_power():
    """A lattice transmission pylon with three crossarms and hanging insulators."""
    H = 10.6
    base = 1.9
    topw = 0.55

    def leg(sx, sz):
        return cap((sx * base, 0, sz * base), (sx * topw, H, sz * topw), 0.14)

    def sdf(p):
        floor = p[:, 1]
        legs = np.minimum.reduce([leg(1, 1)(p), leg(1, -1)(p), leg(-1, 1)(p), leg(-1, -1)(p)])
        braces = np.full(len(p), 1e9)
        for k in range(7):
            y0, y1 = k * 1.45, (k + 1) * 1.45
            w0 = base + (topw - base) * y0 / H
            w1 = base + (topw - base) * y1 / H
            for sx, sz in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
                # diagonal on each face
                braces = np.minimum(braces, cap((sx * w0, y0, sz * w0), (-sx * w1, y1, sz * w1), 0.055)(p))
                braces = np.minimum(braces, cap((sx * w0, y0, sz * w0), (sx * w1, y1, -sz * w1), 0.055)(p))
            for sx in (1, -1):
                braces = np.minimum(braces, cap((sx * w1, y1, -w1), (sx * w1, y1, w1), 0.055)(p))
                braces = np.minimum(braces, cap((-w1, y1, sx * w1), (w1, y1, sx * w1), 0.055)(p))
        arms = np.full(len(p), 1e9)
        ins = np.full(len(p), 1e9)
        for y, hw in ((5.2, 4.3), (7.2, 3.5), (9.2, 2.8)):
            arms = np.minimum(arms, box(p, (0, y, 0), (hw, 0.16, 0.35)))
            w = base + (topw - base) * y / H
            for sx in (1, -1):
                arms = np.minimum(arms, cap((sx * hw, y + 0.16, 0), (sx * w, y + 1.3, 0), 0.07)(p))
                arms = np.minimum(arms, cap((sx * hw, y - 0.16, 0), (sx * w, y - 1.2, 0), 0.07)(p))
                ins = np.minimum(ins, cap((sx * (hw - 0.4), y - 0.16, 0), (sx * (hw - 0.4), y - 1.5, 0), 0.13)(p))
        peak = cap((0, H, 0), (0, H + 1.2, 0), 0.1)(p)
        feet = np.full(len(p), 1e9)
        for sx, sz in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            feet = np.minimum(feet, box(p, (sx * base, 0.2, sz * base), (0.4, 0.2, 0.4)))
        return np.minimum.reduce([floor, legs, braces, arms, ins, peak, feet])

    def albedo(p, n, t):
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.46, a)
        a = np.where(up & (p[:, 1] < 0.45), 0.82, a)
        ins = up & (np.abs(np.abs(p[:, 0]) - 3.9) < 0.2) | (np.abs(np.abs(p[:, 0]) - 3.1) < 0.2) | (np.abs(np.abs(p[:, 0]) - 2.4) < 0.2)
        a = np.where(up & ins & (np.abs(p[:, 2]) < 0.2), 0.78 - 0.3 * stripes(p[:, 1], 0.22, 0.4), a)
        return a

    return sdf, albedo


def scene_water():
    """A water tower on four legs with a conical roof, a ladder and a wheelie bin beside it."""
    tcx, tcz = -0.6, 0.6

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        tank = cyl(p, (tcx, tcz), 2.5, 4.8, 7.8)
        hoop = np.minimum(cyl(p, (tcx, tcz), 2.58, 5.0, 5.2), cyl(p, (tcx, tcz), 2.58, 7.4, 7.6))
        roof = cone(p, tcx, tcz, 7.8, 9.3, 2.65, 0.25)
        legs = np.full(len(p), 1e9)
        for a in (0.4, 0.4 + TAU / 4, 0.4 + TAU / 2, 0.4 + 3 * TAU / 4):
            legs = np.minimum(legs, cap((tcx + 2.8 * math.cos(a), 0, tcz + 2.8 * math.sin(a)), (tcx + 1.9 * math.cos(a), 5.0, tcz + 1.9 * math.sin(a)), 0.18)(p))
        for a in (0.4, 0.4 + TAU / 4, 0.4 + TAU / 2, 0.4 + 3 * TAU / 4):
            b = a + TAU / 4
            legs = np.minimum(legs, cap((tcx + 2.35 * math.cos(a), 2.5, tcz + 2.35 * math.sin(a)), (tcx + 2.35 * math.cos(b), 2.5, tcz + 2.35 * math.sin(b)), 0.09)(p))
        pipe = cyl(p, (tcx, tcz), 0.3, 0, 4.9)
        ladder = np.minimum(cap((tcx - 0.35, 0, tcz - 2.6), (tcx - 0.35, 7.9, tcz - 2.6), 0.07)(p), cap((tcx + 0.35, 0, tcz - 2.6), (tcx + 0.35, 7.9, tcz - 2.6), 0.07)(p))
        rungs = np.full(len(p), 1e9)
        for k in range(16):
            rungs = np.minimum(rungs, cap((tcx - 0.35, 0.5 + k * 0.47, tcz - 2.6), (tcx + 0.35, 0.5 + k * 0.47, tcz - 2.6), 0.05)(p))
        bq = rot_y(p, 0.5, 4.2, -2.6)
        bin_body = box(bq, (4.2, 1.3, -2.6), (0.75, 1.1, 0.75))
        bin_lid = box(bq, (4.2, 2.5, -2.6), (0.82, 0.12, 0.82))
        wheels = np.minimum(cyl_x(bq, 0.3, -1.9, 0.3, 3.55, 3.75), cyl_x(bq, 0.3, -1.9, 0.3, 4.65, 4.85))
        return np.minimum.reduce([floor, tank, hoop, roof, legs, pipe, ladder, rungs, bin_body, bin_lid, wheels])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.5, a)
        tank = up & (np.hypot(x - tcx, z - tcz) < 2.7) & (y > 4.7) & (y < 7.9)
        a = np.where(tank, 0.84 - 0.14 * stripes(np.arctan2(z - tcz, x - tcx), TAU / 14, 0.1), a)
        a = np.where(up & (y > 7.85) & (np.hypot(x - tcx, z - tcz) < 2.8), 0.62 - 0.12 * stripes(np.arctan2(z - tcz, x - tcx), TAU / 20, 0.15), a)
        a = np.where(up & (x > 3.0) & (y < 2.7), 0.6, a)
        a = np.where(up & (x > 3.0) & (y > 2.3) & (y < 2.7), 0.45, a)
        return a

    return sdf, albedo


def scene_construction():
    """A tower crane: base block, mast, cab, jib with trolley, counter-jib with weights, hook."""
    ang = -0.35

    def sdf(p0):
        p = rot_y(p0, ang)
        floor = p0[:, 1]
        base = box(p, (0.0, 0.45, 0.0), (1.9, 0.45, 1.9))
        mast = np.full(len(p), 1e9)
        for sx, sz in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            mast = np.minimum(mast, cap((sx * 0.55, 0.9, sz * 0.55), (sx * 0.55, 9.0, sz * 0.55), 0.09)(p))
        for k in range(9):
            y = 0.9 + k * 0.9
            for sx in (1, -1):
                mast = np.minimum(mast, cap((sx * 0.55, y, -0.55), (sx * 0.55, y, 0.55), 0.05)(p))
                mast = np.minimum(mast, cap((-0.55, y, sx * 0.55), (0.55, y, sx * 0.55), 0.05)(p))
                mast = np.minimum(mast, cap((sx * 0.55, y, -0.55), (-sx * 0.55, y + 0.9, -0.55), 0.045)(p))
                mast = np.minimum(mast, cap((-0.55, y, sx * 0.55), (0.55, y + 0.9, sx * 0.55), 0.045)(p))
        slew = cyl(p, (0, 0), 0.75, 9.0, 9.4)
        cab = box(p, (0.3, 10.0, -1.0), (0.6, 0.55, 0.45))
        jib = np.full(len(p), 1e9)
        for sz in (1, -1):
            jib = np.minimum(jib, cap((-3.6, 9.5, sz * 0.32), (7.2, 9.5, sz * 0.32), 0.07)(p))
        jib = np.minimum(jib, cap((-3.6, 10.2, 0), (7.2, 10.2, 0), 0.07)(p))
        for k in range(14):
            x = -3.4 + k * 0.78
            jib = np.minimum(jib, cap((x, 9.5, -0.32), (x + 0.39, 10.2, 0), 0.04)(p))
            jib = np.minimum(jib, cap((x + 0.39, 10.2, 0), (x + 0.78, 9.5, 0.32), 0.04)(p))
            jib = np.minimum(jib, cap((x, 9.5, -0.32), (x, 9.5, 0.32), 0.04)(p))
        apex = cap((0, 9.4, 0), (0, 12.6, 0), 0.08)(p)
        ties = np.minimum(cap((0, 12.6, 0), (7.0, 10.2, 0), 0.04)(p), cap((0, 12.6, 0), (-3.4, 10.2, 0), 0.04)(p))
        weights = box(p, (-3.0, 9.0, 0.0), (0.7, 0.42, 0.55))
        trolley = box(p, (4.8, 9.3, 0.0), (0.35, 0.18, 0.4))
        cable = cap((4.8, 9.1, 0), (4.8, 4.6, 0), 0.03)(p)
        block = box(p, (4.8, 4.4, 0), (0.25, 0.3, 0.12))
        hook = np.maximum(ring_z(p, 4.8, 3.6, 0.5, 0.32, -0.08, 0.08), p[:, 0] - 5.0)
        return np.minimum.reduce([floor, base, mast, slew, cab, jib, apex, ties, weights, trolley, cable, block, hook])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot_y(p0, ang)
        up = up_of(p0)
        a = np.where(up, 0.5, a)
        a = np.where(up & (p[:, 1] < 0.95), 0.85, a)
        a = np.where(up & (np.abs(p[:, 0] + 3.0) < 0.75) & (np.abs(p[:, 1] - 9.0) < 0.45), 0.8 - 0.3 * stripes(p[:, 0], 0.35, 0.15), a)
        a = np.where(up & (np.abs(p[:, 0] - 0.3) < 0.65) & (p[:, 1] > 9.4) & (p[:, 1] < 10.6) & (p[:, 2] < -0.5), 0.9, a)
        return a

    return sdf, albedo


def scene_retail():
    """A shop shelving unit (gondola) stocked with tins, boxes and bottles."""
    hw, depth = 3.4, 0.9
    shelf_ys = (1.1, 2.4, 3.7, 5.0)

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        back = box(p, (0, 3.0, depth), (hw, 3.0, 0.08))
        plinth = box(p, (0, 0.3, depth / 2), (hw, 0.3, depth / 2 + 0.05))
        sides = np.minimum(box(p, (-hw, 3.0, depth / 2), (0.08, 3.0, depth / 2 + 0.05)), box(p, (hw, 3.0, depth / 2), (0.08, 3.0, depth / 2 + 0.05)))
        top = box(p, (0, 6.0, depth / 2), (hw + 0.1, 0.08, depth / 2 + 0.1))
        shelves = np.full(len(p), 1e9)
        for sy in shelf_ys:
            shelves = np.minimum(shelves, box(p, (0, sy, depth / 2), (hw, 0.06, depth / 2)))
        goods = np.full(len(p), 1e9)
        # bottom shelf: boxes
        for k in range(6):
            goods = np.minimum(goods, box(p, (-2.9 + k * 1.15, 0.6 + 0.6, 0.45), (0.5, 0.6, 0.35)))
        # shelf 1: tins
        for k in range(9):
            goods = np.minimum(goods, cyl(p, (-3.0 + k * 0.75, 0.42), 0.32, 1.16, 1.95))
        # shelf 2: bottles
        for k in range(8):
            cx = -2.9 + k * 0.83
            goods = np.minimum(goods, cyl(p, (cx, 0.45), 0.3, 2.46, 3.1))
            goods = np.minimum(goods, cone(p, cx, 0.45, 3.1, 3.5, 0.3, 0.12))
            goods = np.minimum(goods, cyl(p, (cx, 0.45), 0.12, 3.5, 3.65))
        # shelf 3: cartons
        for k in range(7):
            goods = np.minimum(goods, box(p, (-2.85 + k * 0.95, 3.76 + 0.5, 0.45), (0.4, 0.5, 0.3)))
        # top shelf: packets
        for k in range(10):
            goods = np.minimum(goods, box(p, (-3.0 + k * 0.67, 5.06 + 0.42, 0.5), (0.26, 0.42, 0.2)))
        basket = box(p, (-4.8, 0.6, -1.6), (0.9, 0.6, 0.7))
        return np.minimum.reduce([floor, back, plinth, sides, top, shelves, goods, basket])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.86, a)
        a = np.where(up & (z > depth - 0.1), 0.72 - 0.12 * stripes(x, 0.5, 0.1), a)  # pegboard back
        a = np.where(up & (y < 0.62), 0.5, a)
        band = np.full(len(p), False)
        for sy in shelf_ys:
            band |= np.abs(y - sy) < 0.07
        a = np.where(up & band & (z < depth - 0.1), 0.45, a)  # shelf edge strips
        a = np.where(up & (y > 1.1) & (y < 2.0) & (z < 0.8) & (np.abs(n[:, 1]) < 0.5), 0.6 - 0.14 * (np.abs(y - 1.55) < 0.14), a)
        a = np.where(up & (y > 2.4) & (y < 3.7) & (z < 0.8), 0.78 - 0.2 * ((y > 2.7) & (y < 3.0)), a)
        a = np.where(up & (y > 3.7) & (y < 4.9) & (z < 0.8) & (np.abs(n[:, 1]) < 0.5), 0.8 - 0.25 * stripes(x, 0.95, 0.4), a)
        a = np.where(up & (y > 5.0) & (y < 5.95) & (z < 0.8) & (np.abs(n[:, 1]) < 0.5), 0.7 - 0.2 * stripes(y, 0.3, 0.3), a)
        a = np.where(up & (x < -3.8) & (y < 1.3), 0.6 - 0.2 * (stripes(x, 0.25, 0.4) ^ stripes(z, 0.25, 0.4)), a)
        return a

    return sdf, albedo


def scene_transport():
    """An articulated lorry: cab, container trailer, six wheel pairs."""
    ang = -0.42

    def sdf(p0):
        p = rot_y(p0, ang)
        floor = p0[:, 1]
        cab = box(p, (-5.0, 2.9, 0.0), (1.25, 1.55, 1.3))
        cab_roof = box(p, (-5.0, 4.55, 0.0), (1.3, 0.12, 1.35))
        bumper = box(p, (-6.3, 1.5, 0.0), (0.12, 0.45, 1.3))
        chassis = box(p, (0.3, 1.55, 0.0), (6.4, 0.2, 0.9))
        trailer = box(p, (1.2, 3.65, 0.0), (5.0, 1.75, 1.32))
        wheels = np.full(len(p), 1e9)
        for wx in (-5.2, -2.3, -1.3, 3.6, 4.6, 5.6):
            for sz in (1, -1):
                wheels = np.minimum(wheels, cyl_z(p, wx, 0.78, 0.78, sz * 0.95, sz * 1.35))
                wheels = np.minimum(wheels, cyl_z(p, wx, 0.78, 0.3, sz * 0.9, sz * 1.42))
        tank = cyl_x(p, 1.2, -1.15, 0.38, -3.9, -2.7)
        exhaust = cap((-3.6, 1.6, 1.25), (-3.6, 4.9, 1.25), 0.12)(p)
        return np.minimum.reduce([floor, cab, cab_roof, bumper, chassis, trailer, wheels, tank, exhaust])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot_y(p0, ang)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        up = up_of(p0)
        a = np.where(up, 0.4, a)
        trailer = up & (x > -3.8) & (y > 1.85)
        corr = stripes(x, 0.36, 0.5)
        a = np.where(trailer, 0.86 - 0.12 * corr, a)
        a = np.where(trailer & (np.abs(n[:, 1]) > 0.8), 0.78, a)
        a = np.where(trailer & (x > 6.1), 0.7 - 0.15 * stripes(y, 0.9, 0.08), a)
        cab = up & (x < -3.7) & (y > 1.3)
        a = np.where(cab, 0.62, a)
        glass = cab & (y > 3.1) & (y < 4.4) & ((x < -6.2) | (np.abs(z) > 1.28))
        a = np.where(glass, 0.9, a)
        wheel = up & (y < 1.6) & (np.abs(z) > 0.92)
        a = np.where(wheel, 0.3, a)
        a = np.where(wheel & (np.abs(z) > 1.36), 0.75, a)
        return a

    return sdf, albedo


def scene_hospitality():
    """A laid table: cloth, teapot, two cups on saucers, a plate and a cake stand."""
    ty = 2.7

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        top = cyl(p, (0, 0), 3.1, ty - 0.12, ty)
        pedestal = cyl(p, (0, 0), 0.28, 0.2, ty - 0.12)
        foot = cone(p, 0, 0, 0.0, 0.3, 1.4, 0.6)
        pot_c = np.array([-1.1, ty + 0.95, 0.9])
        pot = P.sd_sphere(p, pot_c, 1.0)
        pot = np.maximum(pot, pot_c[1] - 0.75 - y)
        lid = np.minimum(cyl(p, (-1.1, 0.9), 0.55, ty + 1.85, ty + 2.05), P.sd_sphere(p, np.array([-1.1, ty + 2.2, 0.9]), 0.16))
        spout = cap((-0.4, ty + 0.9, 0.3), (0.7, ty + 1.9, -0.3), 0.14)(p)
        handle = np.minimum(cap((-2.0, ty + 1.5, 1.3), (-2.6, ty + 1.3, 1.6), 0.1)(p), cap((-2.6, ty + 1.3, 1.6), (-2.0, ty + 0.5, 1.4), 0.1)(p))
        cups = np.full(len(p), 1e9)
        for cx, cz in ((1.5, 0.9), (0.9, -1.7)):
            cups = np.minimum(cups, cyl(p, (cx, cz), 0.75, ty, ty + 0.06))
            cups = np.minimum(cups, np.maximum(cone(p, cx, cz, ty + 0.06, ty + 0.62, 0.3, 0.42), -cone(p, cx, cz, ty + 0.16, ty + 0.7, 0.24, 0.36)))
            cups = np.minimum(cups, cap((cx + 0.42, ty + 0.5, cz), (cx + 0.6, ty + 0.3, cz), 0.06)(p))
        plate = cyl(p, (-1.4, -1.5), 0.9, ty, ty + 0.07)
        stand = np.minimum.reduce([cyl(p, (2.0, -0.4), 0.2, ty, ty + 1.5), cyl(p, (2.0, -0.4), 0.9, ty + 0.7, ty + 0.78), cyl(p, (2.0, -0.4), 0.65, ty + 1.45, ty + 1.52)])
        return np.minimum.reduce([floor, top, pedestal, foot, pot, lid, spout, handle, cups, plate, stand])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.86, a)
        cloth = up & (y > ty - 0.15) & (y < ty + 0.02) & (np.hypot(x, z) < 3.15)
        a = np.where(cloth, 0.92 - 0.14 * (stripes(x, 0.7, 0.5) ^ stripes(z, 0.7, 0.5)), a)
        a = np.where(up & (y < ty - 0.15), 0.52, a)
        pot = up & (np.hypot(x + 1.1, z - 0.9) < 1.1) & (y > ty + 0.1)
        a = np.where(pot, 0.66 - 0.12 * (np.abs(y - (ty + 1.0)) < 0.12), a)
        a = np.where(up & (y > ty + 0.05) & ~pot & (y < ty + 1.6), 0.95, a)
        return a

    return sdf, albedo


def scene_telecoms():
    """A telecom mast: triangular lattice, headframe with three panel antennas and a dish, cabinet at base."""
    H = 10.8

    def sdf(p):
        floor = p[:, 1]
        pts = [(1.1 * math.cos(a), 1.1 * math.sin(a)) for a in (0.3, 0.3 + TAU / 3, 0.3 + 2 * TAU / 3)]
        tps = [(0.45 * math.cos(a), 0.45 * math.sin(a)) for a in (0.3, 0.3 + TAU / 3, 0.3 + 2 * TAU / 3)]
        legs = np.full(len(p), 1e9)
        for (bx, bz), (tx, tz) in zip(pts, tps):
            legs = np.minimum(legs, cap((bx, 0, bz), (tx, H, tz), 0.1)(p))
        braces = np.full(len(p), 1e9)
        for k in range(12):
            y0, y1 = k * 0.9, (k + 1) * 0.9
            f0, f1 = y0 / H, y1 / H
            for i in range(3):
                j = (i + 1) % 3
                a0 = (pts[i][0] * (1 - f0) + tps[i][0] * f0, y0, pts[i][1] * (1 - f0) + tps[i][1] * f0)
                b0 = (pts[j][0] * (1 - f0) + tps[j][0] * f0, y0, pts[j][1] * (1 - f0) + tps[j][1] * f0)
                b1 = (pts[j][0] * (1 - f1) + tps[j][0] * f1, y1, pts[j][1] * (1 - f1) + tps[j][1] * f1)
                braces = np.minimum(braces, cap(a0, b0, 0.04)(p))
                braces = np.minimum(braces, cap(a0, b1, 0.04)(p))
        head = cyl(p, (0, 0), 0.9, H - 0.2, H + 0.1)
        panels = np.full(len(p), 1e9)
        for a in (0.3 + TAU / 6, 0.3 + TAU / 2, 0.3 + 5 * TAU / 6):
            q = rot_y(p, -a)
            panels = np.minimum(panels, box(q, (1.35, H - 0.4, 0.0), (0.12, 1.25, 0.28)))
            panels = np.minimum(panels, cap((0.9 * math.cos(a), H - 0.2, 0.9 * math.sin(a)), (1.3 * math.cos(a), H - 0.2, 1.3 * math.sin(a)), 0.05)(p))
        dc = np.array([-1.6, 7.6, -1.3])
        dish = np.maximum(P.sd_sphere(p, dc, 1.15), -P.sd_sphere(p, dc + np.array([-0.35, 0.0, -0.35]), 1.15))
        dish = np.maximum(dish, -(p - dc) @ np.array([-0.707, 0.0, -0.707]) - 0.35)
        dish_arm = cap((-0.5, 7.4, -0.5), (-1.3, 7.6, -1.0), 0.08)(p)
        feed = cap((-1.6, 7.6, -1.3), (-2.3, 7.6, -2.0), 0.05)(p)
        cabinet = box(p, (3.0, 0.9, -1.2), (0.9, 0.9, 0.55))
        slab = box(p, (0, 0.15, 0), (2.0, 0.15, 2.0))
        return np.minimum.reduce([floor, legs, braces, head, panels, dish, dish_arm, feed, cabinet, slab])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.48, a)
        a = np.where(up & (y < 0.32) & (np.abs(x) < 2.1), 0.84, a)
        a = np.where(up & (y > H - 1.7) & (np.hypot(x, z) > 1.1), 0.9, a)
        a = np.where(up & (np.hypot(x + 1.6, z + 1.3) < 1.3) & (np.abs(y - 7.6) < 1.2), 0.9, a)
        a = np.where(up & (x > 2.0) & (y < 1.9), 0.72 - 0.2 * (np.abs(y - 1.0) < 0.05), a)
        return a

    return sdf, albedo


def scene_finance():
    """A safe on feet with a dial and a three-spoke handle, beside a small strongbox."""
    ang = 0.35

    def sdf(p0):
        p = rot_y(p0, ang)
        floor = p0[:, 1]
        body = box(p, (0.0, 2.75, 0.3), (2.1, 2.4, 1.8))
        door = box(p, (0.0, 2.75, -1.6), (1.75, 2.05, 0.14))
        hinges = np.minimum(cyl(p, (2.0, -1.65), 0.16, 1.0, 1.8), cyl(p, (2.0, -1.65), 0.16, 3.7, 4.5))
        dial = cyl_z(p, -0.75, 3.3, 0.55, -2.0, -1.74)
        dial_knob = cyl_z(p, -0.75, 3.3, 0.2, -2.15, -2.0)
        hub = cyl_z(p, 0.65, 2.4, 0.22, -2.0, -1.74)
        spokes = np.full(len(p), 1e9)
        for a in (TAU / 4, TAU / 4 + TAU / 3, TAU / 4 + 2 * TAU / 3):
            spokes = np.minimum(spokes, cap((0.65, 2.4, -1.9), (0.65 + 0.7 * math.cos(a), 2.4 + 0.7 * math.sin(a), -1.9), 0.07)(p))
            spokes = np.minimum(spokes, P.sd_sphere(p, np.array([0.65 + 0.7 * math.cos(a), 2.4 + 0.7 * math.sin(a), -1.9]), 0.12))
        feet = np.full(len(p), 1e9)
        for sx, sz in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            feet = np.minimum(feet, cyl(p, (sx * 1.7, 0.3 + sz * 1.4), 0.25, 0, 0.4))
        sb = rot_y(p, 0.4, 3.9, -2.4)
        strongbox = box(sb, (3.9, 0.6, -2.4), (1.0, 0.6, 0.7))
        sb_lid = box(sb, (3.9, 1.3, -2.4), (1.04, 0.12, 0.74))
        sb_handle = cap((3.6, 1.42, -2.4), (4.2, 1.42, -2.4), 0.08)(sb)
        return np.minimum.reduce([floor, body, door, hinges, dial, dial_knob, hub, spokes, feet, strongbox, sb_lid, sb_handle])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot_y(p0, ang)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        up = up_of(p0)
        a = np.where(up, 0.46, a)
        a = np.where(up & (z < -1.5) & (np.abs(x) < 1.8) & (np.abs(y - 2.75) < 2.1), 0.56, a)
        a = np.where(up & (z < -1.7) & (np.hypot(x + 0.75, y - 3.3) < 0.56), 0.9 - 0.5 * stripes(np.arctan2(y - 3.3, x + 0.75), TAU / 40, 0.35), a)
        a = np.where(up & (np.abs(x) < 2.15) & (y > 0.3) & (np.abs(y - 2.75) < 2.45) & (z > -1.5) & (np.abs(y - 2.75) > 2.2), 0.4, a)  # top/bottom band
        a = np.where(up & (x > 2.8), 0.62 - 0.14 * stripes(y, 0.35, 0.18), a)
        return a

    return sdf, albedo


def scene_property():
    """A front door with a fanlight in a brick wall, two steps, and an estate agent's board on a post."""

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        wall = box(p, (-0.4, 3.2, 1.9), (3.9, 3.2, 0.45))
        reveal = box(p, (-1.0, 2.6, 1.6), (1.15, 2.6, 0.5))
        wall = np.maximum(wall, -reveal)
        frame = box(p, (-1.0, 2.55, 1.52), (1.15, 2.55, 0.1))
        frame = np.maximum(frame, -box(p, (-1.0, 2.5, 1.5), (0.98, 2.45, 0.3)))
        door = box(p, (-1.0, 2.05, 1.62), (0.98, 2.0, 0.08))
        mullion = box(p, (-1.0, 4.08, 1.55), (1.0, 0.07, 0.14))
        panels = np.full(len(p), 1e9)
        for py in (0.9, 2.4):
            for px in (-1.5, -0.5):
                panels = np.minimum(panels, box(p, (px, py, 1.53), (0.32, 0.5, 0.03)))
        knob = P.sd_sphere(p, np.array([-0.25, 2.05, 1.45]), 0.12)
        letterbox = box(p, (-1.0, 1.75, 1.52), (0.35, 0.07, 0.04))
        steps = np.minimum(box(p, (-1.0, 0.15, 1.1), (1.5, 0.15, 0.5)), box(p, (-1.0, 0.4, 1.4), (1.3, 0.1, 0.25)))
        post = cap((3.4, 0, -1.2), (3.4, 6.2, -1.2), 0.11)(p)
        board = box(p, (3.4, 5.1, -1.2), (0.05, 0.85, 1.3))
        return np.minimum.reduce([floor, wall, frame, door, mullion, panels, knob, letterbox, steps, post, board])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.88, a)
        brick = up & (z > 1.4) & (np.abs(n[:, 2]) > 0.5) & (y < 6.45) & ((np.abs(x + 1.0) > 1.15) | (y > 5.2))
        course = stripes(y, 0.3, 0.14)
        header = stripes(x + 0.36 * (np.mod(np.floor(y / 0.3), 2)), 0.72, 0.1)
        a = np.where(brick, 0.74 - 0.18 * (course | header), a)
        door = up & (np.abs(x + 1.0) < 1.0) & (y < 4.05) & (z < 1.75) & (z > 1.4)
        a = np.where(door, 0.5, a)
        a = np.where(up & (np.abs(x + 1.0) < 1.05) & (y > 4.12) & (y < 5.0) & (z < 1.75) & (z > 1.4), 0.92 - 0.4 * stripes(x, 0.5, 0.1), a)
        a = np.where(up & (y < 0.55) & (np.abs(x + 1.0) < 1.6) & (z < 1.7), 0.8, a)
        a = np.where(up & (x > 3.3) & (y > 4.2) & (np.abs(n[:, 0]) > 0.8), 0.95 - 0.55 * (stripes(y, 0.55, 0.3) & (np.abs(z + 1.2) < 1.0) & (y > 4.4) & (y < 5.8)), a)
        return a

    return sdf, albedo


def scene_science():
    """A microscope: horseshoe base, arm, stage with clips, tube, eyepiece, turret with three objectives, focus knobs."""
    ang = 0.4

    def sdf(p0):
        p = rot_y(p0, ang)
        floor = p0[:, 1]
        base = box(p, (0.0, 0.32, 0.0), (2.1, 0.32, 1.5))
        base_front = cyl(p, (0.0, -0.6), 1.35, 0, 0.64)
        pillar = cap((0.8, 0.6, 0.9), (0.8, 2.8, 0.9), 0.42)(p)
        arm = np.minimum(cap((0.8, 2.8, 0.9), (0.9, 6.4, 0.4), 0.42)(p), cap((0.9, 6.4, 0.4), (0.1, 7.4, -0.4), 0.38)(p))
        stage = box(p, (-0.2, 3.5, -0.3), (1.45, 0.1, 1.2))
        clips = np.minimum(cap((-0.9, 3.6, -0.6), (0.2, 3.6, -0.6), 0.05)(p), cap((-0.9, 3.6, 0.2), (0.2, 3.6, 0.2), 0.05)(p))
        slide = box(p, (-0.3, 3.63, -0.2), (0.9, 0.03, 0.4))
        turret = cone(p, -0.3, -0.3, 4.35, 4.75, 0.55, 0.35)
        objectives = np.full(len(p), 1e9)
        for a in (TAU / 4, TAU / 4 + TAU / 3, TAU / 4 + 2 * TAU / 3):
            ox, oz = -0.3 + 0.38 * math.cos(a), -0.3 + 0.38 * math.sin(a)
            objectives = np.minimum(objectives, cone(p, ox, oz, 3.75 + (0.25 if a != TAU / 4 else 0.0), 4.4, 0.13, 0.2))
        tube = cap((-0.3, 4.7, -0.3), (-0.3, 7.6, -0.3), 0.36)(p)
        tube_head = cap((-0.3, 7.6, -0.3), (-1.4, 8.8, -0.3), 0.33)(p)
        eyepiece = cap((-1.4, 8.8, -0.3), (-1.9, 9.35, -0.3), 0.26)(p)
        knobs = np.minimum(cyl_z(p, 0.85, 2.4, 0.42, 0.25, 1.6), cyl_z(p, 0.85, 2.4, 0.26, 1.6, 1.9))
        mirror = np.maximum(cyl_z(p, -0.3, 1.9, 0.55, -0.4, -0.3), -1e9)
        lamp = cyl(p, (-0.3, -0.3), 0.45, 0.64, 1.0)
        return np.minimum.reduce([floor, base, base_front, pillar, arm, stage, clips, slide, turret, objectives, tube, tube_head, eyepiece, knobs, lamp])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot_y(p0, ang)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        up = up_of(p0)
        a = np.where(up, 0.42, a)
        a = np.where(up & (np.hypot(x + 0.3, z + 0.3) < 0.4) & (y > 4.7) & (y < 7.7), 0.78, a)
        a = np.where(up & (np.abs(y - 3.5) < 0.12) & (np.abs(n[:, 1]) > 0.8), 0.3, a)
        a = np.where(up & (np.abs(y - 3.63) < 0.05) & (np.abs(x + 0.3) < 0.9), 0.95, a)
        a = np.where(up & (np.hypot(x - 0.85, y - 2.4) < 0.45) & (np.abs(z) > 0.2), 0.75 - 0.3 * stripes(np.arctan2(y - 2.4, x - 0.85), TAU / 24, 0.4), a)
        a = np.where(up & (y < 0.66), 0.5, a)
        return a

    return sdf, albedo


def scene_admin():
    """A four-drawer filing cabinet with the second drawer pulled out and folders in it, beside an archive box."""
    ang = 0.3

    def sdf(p0):
        p = rot_y(p0, ang)
        floor = p0[:, 1]
        body = box(p, (0.0, 3.15, 0.3), (1.35, 3.05, 1.35))
        hollow = box(p, (0.0, 4.55, -0.3), (1.2, 0.68, 1.4))
        body = np.maximum(body, -hollow)
        fronts = np.full(len(p), 1e9)
        for k, fy in enumerate((0.95, 2.35, 4.55, 5.75)):
            if k == 2:
                continue
            fronts = np.minimum(fronts, box(p, (0.0, fy, -1.1), (1.2, 0.62, 0.08)))
            fronts = np.minimum(fronts, box(p, (0.0, fy + 0.35, -1.2), (0.45, 0.05, 0.06)))
            fronts = np.minimum(fronts, cap((-0.35, fy - 0.1, -1.22), (0.35, fy - 0.1, -1.22), 0.07)(p))
        drawer_z = -2.9
        drawer = box(p, (0.0, 4.45, drawer_z + 1.3), (1.18, 0.55, 1.3))
        drawer = np.maximum(drawer, -box(p, (0.0, 4.6, drawer_z + 1.3), (1.05, 0.55, 1.2)))
        front = box(p, (0.0, 4.55, drawer_z - 0.05), (1.2, 0.62, 0.08))
        front = np.minimum(front, box(p, (0.0, 4.9, drawer_z - 0.15), (0.45, 0.05, 0.06)))
        front = np.minimum(front, cap((-0.35, 4.45, drawer_z - 0.17), (0.35, 4.45, drawer_z - 0.17), 0.07)(p))
        folders = np.full(len(p), 1e9)
        for k in range(10):
            fz = drawer_z + 0.25 + k * 0.23
            tab = 0.35 if k % 3 == 0 else 0.0
            folders = np.minimum(folders, box(p, (0.0 - 0.4 * (k % 3 - 1) * 0.0, 4.65, fz), (1.0, 0.6 + tab * 0.0, 0.03)))
            if k % 3 == 0:
                folders = np.minimum(folders, box(p, (-0.6 + 0.6 * ((k // 3) % 3), 5.35, fz), (0.3, 0.14, 0.03)))
        plinth = box(p, (0.0, 0.1, 0.3), (1.3, 0.1, 1.3))
        bx = rot_y(p, 0.5, 3.5, -1.6)
        archive = box(bx, (3.5, 0.75, -1.6), (1.1, 0.75, 0.8))
        archive_lid = box(bx, (3.5, 1.55, -1.6), (1.14, 0.08, 0.84))
        return np.minimum.reduce([floor, body, fronts, drawer, front, folders, plinth, archive, archive_lid])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot_y(p0, ang)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        up = up_of(p0)
        a = np.where(up, 0.66, a)
        a = np.where(up & (z < -1.0) & (np.abs(x) < 1.25) & (np.abs(n[:, 2]) > 0.6), 0.76, a)
        a = np.where(up & (y > 3.95) & (y < 5.5) & (z > -2.8) & (z < -0.4) & (np.abs(x) < 1.05), 0.9 - 0.1 * stripes(z, 0.23, 0.5), a)
        a = np.where(up & (y > 5.2) & (y < 5.5) & (z > -2.9) & (z < -0.4) & (np.abs(x) < 1.0), 0.95, a)
        a = np.where(up & (x > 2.2) & (y < 1.7), 0.8 - 0.25 * (np.abs(y - 1.1) < 0.18) * (np.abs(n[:, 1]) < 0.5), a)
        a = np.where(up & (x > 2.2) & (y > 1.45), 0.7, a)
        return a

    return sdf, albedo


def scene_civic():
    """A stone portico: steps, plinth, four fluted columns with capitals, entablature, pediment, door behind."""

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        steps = np.minimum.reduce([box(p, (0, 0.2, -1.1), (5.4, 0.2, 3.5)), box(p, (0, 0.6, -0.7), (5.0, 0.2, 3.1)), box(p, (0, 1.0, -0.3), (4.7, 0.2, 2.7))])
        cols = np.full(len(p), 1e9)
        for cx in (-3.3, -1.1, 1.1, 3.3):
            cols = np.minimum(cols, cyl(p, (cx, -1.6), 0.46, 1.2, 6.3))
            cols = np.minimum(cols, box(p, (cx, 1.3, -1.6), (0.6, 0.12, 0.6)))
            cols = np.minimum(cols, box(p, (cx, 6.45, -1.6), (0.62, 0.16, 0.62)))
            cols = np.minimum(cols, cone(p, cx, -1.6, 6.05, 6.32, 0.46, 0.58))
        entab = box(p, (0, 7.05, 0.0), (4.5, 0.45, 2.4))
        pediment = gable(p, 0.0, 7.5, 4.7, 1.7, 2.5)
        back_wall = box(p, (0, 3.8, 1.9), (4.3, 2.8, 0.5))
        doorway = box(p, (0, 3.0, 1.4), (1.0, 2.0, 0.3))
        back_wall = np.maximum(back_wall, -doorway)
        door = box(p, (0, 3.0, 1.75), (1.0, 2.0, 0.1))
        return np.minimum.reduce([floor, steps, cols, entab, pediment, back_wall, door])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.9, a)
        col = up & (y > 1.4) & (y < 6.0) & (z < -0.9)
        flute = np.full(len(p), False)
        for cx in (-3.3, -1.1, 1.1, 3.3):
            flute |= (np.hypot(x - cx, z + 1.6) < 0.5) & stripes(np.arctan2(z + 1.6, x - cx), TAU / 20, 0.35)
        a = np.where(col & flute, 0.74, a)
        a = np.where(up & (np.abs(y - 7.05) < 0.45) & (np.abs(n[:, 1]) < 0.5), 0.86 - 0.2 * (np.abs(y - 6.75) < 0.05) - 0.12 * stripes(x, 0.5, 0.1) * (y > 6.9), a)
        a = np.where(up & (y > 7.5) & (np.abs(n[:, 2]) > 0.9) & (z < 0), 0.95, a)
        a = np.where(up & (np.abs(x) < 1.0) & (y < 5.0) & (z > 1.3) & (z < 1.9), 0.4, a)
        a = np.where(up & (z > 1.35) & ~((np.abs(x) < 1.0) & (y < 5.0)) & (y < 6.6), 0.8 - 0.16 * (stripes(y, 0.5, 0.1) | stripes(x + 0.5 * np.mod(np.floor(y / 0.5), 2), 1.2, 0.06)), a)
        a = np.where(up & (y < 1.25) & (n[:, 1] > 0.8), 0.95, a)
        return a

    return sdf, albedo


def scene_education():
    """A blackboard on a folding easel, a stack of books with an apple on top, and a globe."""
    tilt = 0.14

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        q = p.copy()
        q[:, 2] = q[:, 2] - tilt * (q[:, 1] - 2.2)
        board = box(q, (-0.6, 4.3, 0.6), (2.6, 2.0, 0.08))
        frame = np.maximum(box(q, (-0.6, 4.3, 0.6), (2.75, 2.15, 0.12)), -box(q, (-0.6, 4.3, 0.6), (2.6, 2.0, 0.3)))
        ledge = box(q, (-0.6, 2.1, 0.45), (2.75, 0.07, 0.22))
        legs = np.minimum.reduce(
            [
                cap((-3.0, 0, 1.0), (-2.6, 6.6, 0.0), 0.11)(p),
                cap((1.8, 0, 1.0), (1.4, 6.6, 0.0), 0.11)(p),
                cap((-0.6, 0, -1.9), (-0.6, 6.4, 0.0), 0.11)(p),
                cap((-2.9, 1.5, 0.8), (1.7, 1.5, 0.8), 0.07)(p),
            ]
        )
        chalk = cap((-1.8, 2.22, 0.3), (-1.4, 2.22, 0.3), 0.05)(p)
        duster = box(p, (0.4, 2.3, 0.3), (0.3, 0.12, 0.14))
        books = np.full(len(p), 1e9)
        for k, (bx, bz, hw, hl, h) in enumerate(((3.6, -2.4, 1.0, 0.75, 0.26), (3.5, -2.5, 0.9, 0.7, 0.22), (3.7, -2.3, 0.95, 0.72, 0.3), (3.55, -2.45, 0.85, 0.65, 0.2))):
            y0 = sum(b[4] * 2 for b in (((3.6, -2.4, 1.0, 0.75, 0.26), (3.5, -2.5, 0.9, 0.7, 0.22), (3.7, -2.3, 0.95, 0.72, 0.3), (3.55, -2.45, 0.85, 0.65, 0.2))[:k]))
            books = np.minimum(books, box(rot_y(p, 0.15 * k, bx, bz), (bx, y0 + h, bz), (hw, h, hl)))
        apple = P.sd_sphere(p, np.array([3.6, 2.45, -2.4]), 0.42)
        stalk = cap((3.6, 2.8, -2.4), (3.7, 3.15, -2.45), 0.03)(p)
        globe = np.minimum(P.sd_sphere(p, np.array([-3.9, 1.65, -2.2]), 0.85), np.minimum(cyl(p, (-3.9, -2.2), 0.42, 0, 0.12), cap((-3.9, 0.1, -2.2), (-3.9, 0.8, -2.2), 0.07)(p)))
        arc = np.maximum(np.abs(P.sd_sphere(p, np.array([-3.9, 1.65, -2.2]), 0.98)) - 0.05, np.abs(rot_z(p, 0.4, -3.9, 1.65)[:, 2] + 2.2) - 0.08)
        arc = np.maximum(arc, -(rot_z(p, 0.4, -3.9, 1.65)[:, 0] + 3.9))
        return np.minimum.reduce([floor, board, frame, ledge, legs, chalk, duster, books, apple, stalk, globe, arc])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.6, a)
        q = p.copy()
        q[:, 2] = q[:, 2] - tilt * (q[:, 1] - 2.2)
        board = up & (np.abs(q[:, 0] + 0.6) < 2.6) & (np.abs(q[:, 1] - 4.3) < 2.0) & (q[:, 2] < 0.62)
        a = np.where(board, 0.22, a)
        a = np.where(board & stripes(q[:, 1] - 0.2 * np.sin(q[:, 0] * 2.0), 0.9, 0.08) & (np.abs(q[:, 0] + 0.6) < 2.0), 0.85, a)  # chalk lines
        a = np.where(up & (x > 2.5) & (y < 2.1), 0.8 - 0.25 * stripes(y, 0.5, 0.2), a)
        a = np.where(up & (np.hypot(x - 3.6, y - 2.45, ) < 0.45) & (z < -1.9), 0.55, a)
        a = np.where(up & (np.hypot(x + 3.9, y - 1.65) < 0.9) & (z < -1.3), 0.9 - 0.25 * (P.fbm(x * 1.4, y * 1.4, z * 1.4, 3) > 0.52), a)
        return a

    return sdf, albedo


def scene_health():
    """A hospital bed: frame on castors, mattress with a raised head section, side rails, drip stand."""
    ang = 0.3

    def sdf(p0):
        p = rot_y(p0, ang)
        floor = p0[:, 1]
        frame = box(p, (0.0, 1.45, 0.0), (3.4, 0.12, 1.45))
        legs = np.full(len(p), 1e9)
        for sx, sz in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            legs = np.minimum(legs, cap((sx * 2.9, 0.3, sz * 1.25), (sx * 2.9, 1.4, sz * 1.25), 0.1)(p))
            legs = np.minimum(legs, P.sd_sphere(p, np.array([sx * 2.9, 0.25, sz * 1.25]), 0.25))
        under = box(p, (0.0, 0.9, 0.0), (2.6, 0.2, 1.1))
        foot_sec = box(p, (0.9, 1.78, 0.0), (2.4, 0.22, 1.35))
        hq = rot_z(p, -0.55, -1.5, 1.57)
        head_sec = box(hq, (-2.6, 1.78, 0.0), (1.1, 0.22, 1.35))
        pillow = box(hq, (-3.1, 2.1, 0.0), (0.5, 0.14, 0.9))
        head_board = box(p, (-3.7, 2.3, 0.0), (0.1, 0.9, 1.5))
        foot_board = box(p, (3.5, 2.1, 0.0), (0.1, 0.7, 1.5))
        rails = np.full(len(p), 1e9)
        for sz in (1, -1):
            rails = np.minimum(rails, cap((-0.6, 2.5, sz * 1.55), (2.4, 2.5, sz * 1.55), 0.06)(p))
            rails = np.minimum(rails, cap((-0.6, 2.05, sz * 1.55), (2.4, 2.05, sz * 1.55), 0.06)(p))
            for rx in (-0.6, 0.4, 1.4, 2.4):
                rails = np.minimum(rails, cap((rx, 1.6, sz * 1.55), (rx, 2.5, sz * 1.55), 0.05)(p))
        stand = np.minimum.reduce([cap((-4.4, 0.1, -1.9), (-4.4, 7.2, -1.9), 0.06)(p), cyl(p, (-4.4, -1.9), 0.55, 0, 0.1), cap((-4.8, 7.2, -1.9), (-4.0, 7.2, -1.9), 0.04)(p), cap((-4.4, 6.9, -1.9), (-4.4, 7.5, -1.9), 0.04)(p)])
        bag = box(p, (-4.8, 6.3, -1.9), (0.22, 0.5, 0.08))
        return np.minimum.reduce([floor, frame, legs, under, foot_sec, head_sec, pillow, head_board, foot_board, rails, stand, bag])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot_y(p0, ang)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        up = up_of(p0)
        a = np.where(up, 0.5, a)
        matt = up & (y > 1.58) & (np.abs(z) < 1.4) & (x > -3.5) & (x < 3.4)
        a = np.where(matt, 0.92, a)
        a = np.where(matt & (n[:, 1] > 0.5) & stripes(x, 0.6, 0.06), 0.72, a)  # blanket seams
        a = np.where(up & (y < 1.5) & (y > 1.3), 0.4, a)
        a = np.where(up & (x < -4.2) & (y > 5.7) & (y < 6.9), 0.95, a)
        return a

    return sdf, albedo


def scene_recreation():
    """A football goal with its back frame and a ball at the penalty spot."""

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        posts = np.minimum(cap((-4.3, 0, 0.0), (-4.3, 3.0, 0.0), 0.1)(p), cap((4.3, 0, 0.0), (4.3, 3.0, 0.0), 0.1)(p))
        bar = cap((-4.3, 2.6, 0.0), (4.3, 3.0, 0.0), 0.1)(p)
        back = np.minimum.reduce(
            [
                cap((-4.3, 0, 2.6), (-4.3, 1.0, 2.6), 0.06)(p),
                cap((4.3, 0, 2.6), (4.3, 1.0, 2.6), 0.06)(p),
                cap((-4.3, 1.0, 2.6), (4.3, 1.0, 2.6), 0.06)(p),
                cap((-4.3, 3.0, 0.0), (-4.3, 1.0, 2.6), 0.06)(p),
                cap((4.3, 3.0, 0.0), (4.3, 1.0, 2.6), 0.06)(p),
                cap((-4.3, 0, 0.0), (-4.3, 0, 2.6), 0.06)(p),
                cap((4.3, 0, 0.0), (4.3, 0, 2.6), 0.06)(p),
            ]
        )
        net = np.full(len(p), 1e9)
        for k in range(1, 12):
            fx = -4.3 + k * 0.72
            net = np.minimum(net, cap((fx, 3.0, 0.0), (fx, 1.0, 2.6), 0.015)(p))
            net = np.minimum(net, cap((fx, 1.0, 2.6), (fx, 0.0, 2.6), 0.015)(p))
        for k in range(1, 5):
            f = k / 5
            net = np.minimum(net, cap((-4.3, 3.0 - 2.0 * f, 2.6 * f), (4.3, 3.0 - 2.0 * f, 2.6 * f), 0.015)(p))
        for k in range(1, 3):
            net = np.minimum(net, cap((-4.3, 1.0 - 0.33 * k, 2.6), (4.3, 1.0 - 0.33 * k, 2.6), 0.015)(p))
        ball = P.sd_sphere(p, np.array([-0.8, 0.55, -4.3]), 0.55)
        spot = cyl(p, (-0.8, -4.3), 0.12, 0, 0.02)
        line = box(p, (0, 0.01, -1.4), (6.5, 0.01, 0.06))
        return np.minimum.reduce([floor, posts, bar, back, net, ball, spot, line])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p) | (np.abs(z + 1.4) < 0.07)
        a = np.where(up, 0.95, a)
        ball = (np.hypot(x + 0.8, z + 4.3) < 0.6) & (y > 0.03)
        panel = P.fbm(x * 3.0, y * 3.0, z * 3.0, 2) > 0.56
        a = np.where(ball, 0.95 - 0.6 * panel, a)
        a = np.where(up & (y > 0.05) & ~ball & ((np.abs(np.abs(x) - 4.3) < 0.12) | (np.abs(y - 3.0) < 0.12)) & (z < 0.2), 0.95, a)
        a = np.where(up & (y > 0.05) & ~ball & (z > 0.1), 0.6, a)
        return a

    return sdf, albedo


def scene_services():
    """A front-loading washing machine with its porthole door, beside a laundry basket with folded towels."""
    ang = 0.3

    def sdf(p0):
        p = rot_y(p0, ang)
        floor = p0[:, 1]
        body = box(p, (0.0, 1.85, 0.2), (1.45, 1.75, 1.45))
        top = box(p, (0.0, 3.68, 0.2), (1.5, 0.08, 1.5))
        door_ring = ring_z(p, 0.0, 1.75, 1.05, 0.85, -1.5, -1.25)
        porthole = cyl_z(p, 0.0, 1.75, 0.85, -1.45, -1.1)
        drum = np.maximum(cyl_z(p, 0.0, 1.75, 0.8, -1.2, -0.3), -cyl_z(p, 0.0, 1.75, 0.72, -1.3, -0.4))
        body = np.maximum(body, -cyl_z(p, 0.0, 1.75, 0.82, -1.6, -0.3))
        panel = box(p, (0.0, 3.25, -1.3), (1.3, 0.22, 0.06))
        dial = cyl_z(p, 0.9, 3.25, 0.16, -1.42, -1.3)
        drawer = box(p, (-0.8, 3.25, -1.34), (0.4, 0.14, 0.04))
        feet = np.full(len(p), 1e9)
        for sx, sz in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            feet = np.minimum(feet, cyl(p, (sx * 1.2, 0.2 + sz * 1.2), 0.12, 0, 0.12))
        bq = rot_y(p, 0.4, 3.4, -1.4)
        basket = np.maximum(cone(bq, 3.4, -1.4, 0.0, 2.0, 0.95, 1.2), -cone(bq, 3.4, -1.4, 0.1, 2.1, 0.85, 1.1))
        towels = np.full(len(p), 1e9)
        for k in range(4):
            towels = np.minimum(towels, box(bq, (3.4, 1.9 + 0.3 * k + 0.15, -1.4), (0.9 - 0.05 * k, 0.15, 0.7 - 0.05 * k)))
        handles = np.minimum(cap((2.3, 1.7, -1.4), (2.0, 2.1, -1.4), 0.06)(bq), cap((4.5, 1.7, -1.4), (4.8, 2.1, -1.4), 0.06)(bq))
        return np.minimum.reduce([floor, body, top, door_ring, porthole, drum, panel, dial, drawer, feet, basket, towels, handles])

    def albedo(p0, n, t):
        a = floor_albedo(p0)
        p = rot_y(p0, ang)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        up = up_of(p0)
        a = np.where(up, 0.9, a)
        port = up & (np.hypot(x, y - 1.75) < 0.86) & (z < -1.0)
        a = np.where(port, 0.5, a)
        a = np.where(up & (np.hypot(x, y - 1.75) < 0.72) & (z > -1.3) & (z < -0.3), 0.62 - 0.2 * stripes(z, 0.2, 0.4), a)
        a = np.where(up & (np.hypot(x, y - 1.75) > 0.85) & (np.hypot(x, y - 1.75) < 1.06) & (z < -1.2), 0.42, a)
        a = np.where(up & (np.abs(y - 3.25) < 0.22) & (z < -1.2) & (np.abs(x) < 1.3), 0.72, a)
        a = np.where(up & (x > 2.1) & (y < 2.05), 0.78 - 0.22 * (stripes(y, 0.28, 0.5) ^ stripes(np.arctan2(z + 1.4, x - 3.4), TAU / 36, 0.5)), a)
        a = np.where(up & (x > 2.1) & (y > 2.05), 0.95 - 0.3 * (np.mod(y - 1.9, 0.3) < 0.05), a)
        return a

    return sdf, albedo


def scene_household():
    """A galvanised bucket with a mop leaning in it, a broom lying beside, and a feather duster."""

    def sdf(p):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        floor = y
        bucket = np.maximum(cone(p, 0.6, 0.4, 0.0, 2.3, 1.05, 1.35), -cone(p, 0.6, 0.4, 0.15, 2.4, 0.95, 1.25))
        rim = np.maximum(cone(p, 0.6, 0.4, 2.15, 2.35, 1.4, 1.42), -cone(p, 0.6, 0.4, 2.0, 2.5, 1.2, 1.22))
        handle = np.full(len(p), 1e9)
        for k in range(16):
            a0 = math.pi * k / 16
            a1 = math.pi * (k + 1) / 16
            handle = np.minimum(handle, cap((0.6 + 1.4 * math.cos(a0), 2.3 + 1.4 * math.sin(a0) * 0.9, 0.4 + 0.1 * math.sin(a0)), (0.6 + 1.4 * math.cos(a1), 2.3 + 1.4 * math.sin(a1) * 0.9, 0.4 + 0.1 * math.sin(a1)), 0.05)(p))
        mop_handle = cap((0.9, 0.3, -0.2), (-2.4, 7.4, 1.8), 0.09)(p)
        mop_head = np.full(len(p), 1e9)
        for k in range(10):
            a = TAU * k / 10
            mop_head = np.minimum(mop_head, cap((0.95, 0.6, -0.2), (0.95 + 0.45 * math.cos(a), 0.15, -0.2 + 0.45 * math.sin(a)), 0.09)(p))
        br = rot_y(p, 0.35)
        broom_handle = cap((-4.6, 0.2, -2.8), (3.6, 0.2, -2.8), 0.09)(br)
        broom_head = box(br, (4.0, 0.3, -2.8), (0.3, 0.14, 1.1))
        bristles = np.full(len(p), 1e9)
        for k in range(9):
            bz = -3.8 + k * 0.25
            bristles = np.minimum(bristles, box(br, (4.45, 0.16, bz), (0.3, 0.16, 0.09)))
        duster = cap((2.6, 0.12, 2.6), (4.4, 0.12, 1.4), 0.07)(p)
        sponge = box(p, (-2.4, 0.3, -1.6), (0.7, 0.3, 0.45))
        return np.minimum.reduce([floor, bucket, rim, handle, mop_handle, mop_head, broom_handle, broom_head, bristles, duster, sponge])

    def albedo(p, n, t):
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        a = floor_albedo(p)
        up = up_of(p)
        a = np.where(up, 0.6, a)
        bucket = up & (np.hypot(x - 0.6, z - 0.4) < 1.45) & (y < 2.4) & (np.abs(n[:, 1]) < 0.6)
        a = np.where(bucket, 0.82 - 0.12 * stripes(y, 0.45, 0.12), a)
        a = np.where(up & (y > 2.0) & (np.hypot(x - 0.6, z - 0.4) < 1.45) & (np.hypot(x - 0.6, z - 0.4) > 1.15), 0.7, a)
        a = np.where(up & (np.hypot(x - 0.95, z + 0.2) < 0.55) & (y < 0.75), 0.95 - 0.2 * stripes(np.arctan2(z + 0.2, x - 0.95), TAU / 10, 0.5), a)
        a = np.where(up & (y < 0.5) & (x > 2.0), 0.75 - 0.25 * stripes(z, 0.25, 0.4), a)
        a = np.where(up & (np.abs(x + 2.4) < 0.75) & (np.abs(z + 1.6) < 0.5) & (y < 0.65), 0.78 - 0.2 * (y > 0.45), a)
        return a

    return sdf, albedo


# SIC section → scene (A–T). Plate files are w-<scene>.png.
SCENES = {
    "farming": scene_farming,  # A
    "mining": scene_mining,  # B
    "factory": scene_factory,  # C
    "power": scene_power,  # D
    "water": scene_water,  # E
    "construction": scene_construction,  # F
    "retail": scene_retail,  # G
    "transport": scene_transport,  # H
    "hospitality": scene_hospitality,  # I
    "telecoms": scene_telecoms,  # J
    "finance": scene_finance,  # K
    "property": scene_property,  # L
    "science": scene_science,  # M
    "admin": scene_admin,  # N
    "civic": scene_civic,  # O
    "education": scene_education,  # P
    "health": scene_health,  # Q
    "recreation": scene_recreation,  # R
    "services": scene_services,  # S
    "household": scene_household,  # T
}


SHADOW_REACH = 5.0


class ScaledGeo(M.Geo):
    """Manufacturing geometry with a short shadow reach (see SHADOW_REACH) and the march budget
    raised for scaled-down scenes, whose distance field advances in smaller steps."""

    def __init__(self, sdf, cam, k):
        self.cam = cam
        rd = cam.rays()
        t, hit = P.march(sdf, cam.pos, rd, steps=int(220 / min(k, 1.0)) + 40)
        self.rd, self.hit = rd, hit
        p = cam.pos + rd[hit] * t[hit, None]
        n = P.normals(sdf, p)
        self.p, self.n = p, n
        self.dif = np.clip(n @ E.LIGHT, 0, 1)
        # Shadows only from nearby geometry: a tall specimen grounds itself with the shadow at its
        # base, and does not throw its top across the whole floor patch.
        self.sh = P.shadow(sdf, p + n * 0.03, E.LIGHT, steps=128, k=8.0, tmax=SHADOW_REACH)
        self.oc = P.ao(sdf, p, n, 0.45)


# Every specimen is fitted to the same budget: at most this tall and this wide (in scene units)
# so the set reads at one size in the wall. Scale is uniform, so proportions and the camera are untouched.
FIT_HEIGHT, FIT_RADIUS = 7.0, 5.2


def fit_scale(sdf) -> float:
    """Uniform scale that brings the specimen (everything above the floor) inside the budget."""
    xs = np.arange(-9, 9, 0.3)
    ys = np.arange(0.1, 14, 0.3)
    X, Y, Z = np.meshgrid(xs, ys, xs, indexing="ij")
    p = np.stack([X.ravel(), Y.ravel(), Z.ravel()], -1)
    q = p[sdf(p) < 0.05]
    if not len(q):
        return 1.0
    height = float(q[:, 1].max())
    radius = float(np.hypot(q[:, 0], q[:, 2]).max())
    return float(np.clip(min(FIT_HEIGHT / height, FIT_RADIUS / radius), 0.55, 1.5))


def build(name: str, out: Path, seed: int, scale: float | None = None) -> None:
    sdf0, albedo0 = SCENES[name]()
    k = scale if scale else fit_scale(sdf0)
    print(f"{name}: scale {k:.2f}", flush=True)

    def sdf(p):
        return sdf0(p / k) * k

    def albedo(p, n, t):
        # Hits settle a hair above the floor; divided by the scale that hair would clear the scenes'
        # "above the floor" tests and paint the far floor in the specimen's own tone. Snap it down.
        q = p / k
        q[:, 1] = np.where(p[:, 1] < 0.06, 0.0, q[:, 1])
        return albedo0(q, n, t)

    w, h = P.W // 2, P.H // 2
    cam = P.Cam(M.CAM[0], M.CAM[1], M.CAM[2], w, h)
    geo = ScaledGeo(sdf, cam, k)
    tone = geo.shade(albedo, 0.0)
    tone = np.nan_to_num(tone, nan=1.0)
    # The floor patch shrinks with the specimen so the ground reads the same in every plate.
    r0, r1 = M.FLOOR_R0 * k, M.FLOOR_R1 * k

    def to_paper(p):
        d = np.hypot(p[:, 0], p[:, 2] - 0.5 * k)
        return np.maximum(sstep(r0, r1, d) * (p[:, 1] < 0.2), sstep(r1, r1 + 1.0, d))

    tone = geo.to_paper(tone, to_paper)
    E.write_plate(tone, out / f"w-{name}.png", seed)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(SCENES))
    ap.add_argument("--size", default="1000x1000")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--preview", action="store_true", help="two-colour PNG instead of a mask")
    ap.add_argument("--scale", type=float, default=None, help="override the fitted scale (tests only)")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE, P.MASK, P.PREFIX = True, not a.preview, ""
    P.W, P.H = (int(v) for v in a.size.lower().split("x"))
    for name in a.only.split(","):
        build(name.strip(), a.out, a.seed, a.scale)


if __name__ == "__main__":
    main()
