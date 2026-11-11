# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10", "numpy>=1.26", "scipy>=1.11"]
# ///
"""UK circulating coins as halftone specimens (Economy › Inflation › What £1 buys).

One matched set: top-down, one scale (px per mm), so the coins compare at true relative size.
Real outlines and diameters (Royal Mint specifications): 12-sided bimetallic £1, round
bimetallic £2, equilateral-curve heptagonal 50p and 20p, round 10p / 5p, copper 2p / 1p.

Faces are the King Charles III definitive reverses, reproduced under the owner's Royal Mint
permission (2026-11-11; docs/permissions/royal-mint-coins.md): halftone one-ink treatment
approved, traced from Royal Mint reference photographs (data/icon-refs/coins/), each design
whole and unaltered. The obverse (the King's portrait) is not used. Designs: £2 national
flowers, £1 bees, 50p Atlantic salmon, 20p puffin, 10p capercaillie, 5p oak leaves and acorns,
2p red squirrel, 1p hazel dormouse — each with its own denomination and interlocking-C panel.

Metals read by tone through the screen: cupronickel light, nickel-brass mid, copper dark.
Struck contours print as solid line over the screen so lettering survives: dark on silver /
brass, knocked out light on copper.

Usage:
  uv run coin-types.py OUT_DIR [--only 1p,2p,...] [--pxmm 24] [--ref data/icon-refs/coins/raw] [--preview]
Writes c-coin-<id>.png masks (ink as alpha) for <Plate src fit="contain">.
Fetch references first: uv run data/icon-refs/coins/fetch_refs.py
"""

from __future__ import annotations

import argparse
import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_closing, binary_dilation, gaussian_filter, gaussian_gradient_magnitude, label
from scipy.ndimage import sum as nd_sum

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("halftone_plates", _HERE / "halftone-plates.py")
assert _spec and _spec.loader
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

CUPRONICKEL = 0.92
NICKEL_BRASS = 0.72
COPPER = 0.46

# Face treatment (tuned for legibility at ~100–160 CSS px wide): rim band drawn here, the rest is
# the traced reverse. FINE / BROAD are the two relief scales (mm), GAIN their weight in tone.
RIM_MM = 0.45
FINE_MM = 0.35
BROAD_MM = 2.2
FINE_GAIN = 0.5
BROAD_GAIN = 0.55
EDGE_GAIN = 1.0
DENOISE_MM = 0.04
EDGE_MM = 0.1
GRAIN = 0.04
# solid contour lines: smoothing (mm) and threshold on the photograph's fine relief
LINE_MM = 0.03
LINE_AT = 0.035
BRASS_LINE_EASE = 0.5
COPPER_SHADOW_AT = 0.05  # copper shadows ink too, so the figure keeps its form
# struck lines: signed weight per metal (−1 dark line, +1 light line)
SILVER_LINE = -1.0
BRASS_LINE = -1.0
COPPER_LINE = 0.4

# Face treatments. "line": light coins, solid struck contours (the first issue).
# "dark" (A): denser screen everywhere, struck edges and the denomination knocked out to paper.
# "light" (B): light coins, denomination printed as solid heavier ink, the C ground quietened.
VARIANTS: dict[str, dict] = {
    "line": dict(metal={CUPRONICKEL: CUPRONICKEL, NICKEL_BRASS: NICKEL_BRASS, COPPER: COPPER}, letters=None, numeral_mm=0, word_mm=0, ground=1.0, light_lines=False),
    "dark": dict(metal={CUPRONICKEL: 0.6, NICKEL_BRASS: 0.44, COPPER: 0.3}, letters="paper", numeral_mm=0.07, word_mm=0.04, ground=0.15, light_lines=True),
    "light": dict(metal={CUPRONICKEL: CUPRONICKEL, NICKEL_BRASS: NICKEL_BRASS, COPPER: COPPER}, letters="ink", numeral_mm=0.06, word_mm=0.03, ground=0.15, light_lines=False),
}


def _disk(r: int) -> np.ndarray:
    r = max(0, int(r))
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    return x * x + y * y <= r * r


# id: diameter mm (width across for heptagons), shape, outer metal, inner metal (bimetal) or None,
#     design (the King Charles III reverse, for the record)
COINS: dict[str, dict] = {
    "2pound": dict(d=28.4, shape="round", outer=NICKEL_BRASS, inner=CUPRONICKEL, design="National flowers: rose, thistle, daffodil, shamrock", milled=True),
    "1pound": dict(d=23.43, shape=("poly", 12), outer=NICKEL_BRASS, inner=CUPRONICKEL, design="Bees"),
    "50p": dict(d=27.3, shape=("reuleaux", 7), outer=CUPRONICKEL, inner=None, design="Atlantic salmon"),
    "20p": dict(d=21.4, shape=("reuleaux", 7), outer=CUPRONICKEL, inner=None, design="Puffin"),
    "10p": dict(d=24.5, shape="round", outer=CUPRONICKEL, inner=None, design="Capercaillie", milled=True),
    "5p": dict(d=18.0, shape="round", outer=CUPRONICKEL, inner=None, design="Oak leaves and acorns", milled=True),
    "2p": dict(d=25.9, shape="round", outer=COPPER, inner=None, design="Red squirrel"),
    "1p": dict(d=20.3, shape="round", outer=COPPER, inner=None, design="Hazel dormouse"),
}


def shape_mask(n: int, d_px: float, shape, milled: bool = False, pxmm: float = 24.0, dx: float = 0.0, dy: float = 0.0) -> np.ndarray:
    """Bool mask of the coin outline on an n×n grid, centred (offset by dx, dy), width d_px.
    `milled`: reeded edge seen from above — fine teeth about every 0.55 mm."""
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    c = (n - 1) / 2
    x, y = x - c - dx, y - c - dy
    if shape == "round":
        r = d_px / 2
        if milled:
            teeth = round(math.pi * d_px / (0.55 * pxmm))
            r = r - 0.12 * pxmm * (0.5 + 0.5 * np.cos(teeth * np.arctan2(y, x)))
        return np.hypot(x, y) <= r
    kind, k = shape
    if kind == "poly":
        # regular k-gon, flat top; d = across corners ≈ published diameter
        R = d_px / 2
        apothem = R * math.cos(math.pi / k)
        ok = np.ones_like(x, bool)
        for i in range(k):
            a = 2 * math.pi * (i + 0.5) / k - math.pi / 2
            ok &= x * math.cos(a) + y * math.sin(a) <= apothem
        return ok
    # Reuleaux k-gon (odd k): width d_px; inside every circle of radius d centred on a vertex
    R = d_px / (2 * math.cos(math.pi / (2 * k)))
    ok = np.ones_like(x, bool)
    for i in range(k):
        a = 2 * math.pi * i / k - math.pi / 2
        vx, vy = R * math.cos(a), R * math.sin(a)
        ok &= np.hypot(x - vx, y - vy) <= d_px
    # shift so the curved polygon is centred on its width
    return ok


def erode(m: np.ndarray, px: int) -> np.ndarray:
    px = max(3, px | 1)
    img = Image.fromarray((m * 255).astype(np.uint8))
    # repeated small MinFilter keeps it fast for big radii
    step = 9
    while px > 1:
        s = min(step, px)
        s = s if s % 2 else s - 1
        if s < 3:
            break
        img = img.filter(ImageFilter.MinFilter(s))
        px -= s - 1
    return np.asarray(img) > 127


def load_reverse(ref_dir: Path, key: str, n: int, m: np.ndarray, shape) -> tuple[np.ndarray, np.ndarray]:
    """The real reverse, traced from its reference photograph (REF/<key>.jpg, white ground):
    the photographed coin is found, scaled by area onto our true outline and centred on it.
    Returns (luminance 0..1, brass-ness 0..1) on the n×n grid. The image is only ever read as
    pixels (downloads are untrusted data)."""
    path = ref_dir / f"{key}.jpg"
    if not path.exists():
        raise SystemExit(f"missing reference {path} — run data/icon-refs/coins/fetch_refs.py")
    img = Image.open(path).convert("RGB")
    a = np.asarray(img, np.float32) / 255
    # the coin: anything off the white ground, filled row by row (every outline is convex)
    off = a.min(2) < 0.94
    fill = np.zeros_like(off)
    for y in np.nonzero(off.any(1))[0]:
        xs = np.nonzero(off[y])[0]
        fill[y, xs[0] : xs[-1] + 1] = True
    ys, xs = np.nonzero(fill)
    pcx, pcy, parea = xs.mean(), ys.mean(), float(fill.sum())
    my, mx = np.nonzero(m)
    mcx, mcy, marea = mx.mean(), my.mean(), float(m.sum())
    s = math.sqrt(marea / parea)  # photo px → plate px
    w, h = img.size
    small = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.Resampling.LANCZOS)
    fsmall = Image.fromarray((fill * 255).astype(np.uint8)).resize(small.size, Image.Resampling.BILINEAR)

    def place(im: Image.Image, deg: float, fill_c) -> Image.Image:
        # rotate the photograph about its coin centre, then set that centre on the outline's
        cx, cy = pcx * s, pcy * s
        t = math.radians(deg)
        ca, sa = math.cos(t), math.sin(t)
        # output (x, y) → input: p = c_photo + R(-deg) · (x - c_plate)
        return im.transform(
            (n, n),
            Image.Transform.AFFINE,
            (ca, -sa, cx - ca * mcx + sa * mcy, sa, ca, cy - sa * mcx - ca * mcy),
            resample=Image.Resampling.BICUBIC,
            fillcolor=fill_c,
        )

    # photographs are rarely square to the outline: turn the coin until it sits on our outline
    best = (0.0, -1.0)
    span = {"poly": 15.0, "reuleaux": 25.7}.get(shape[0], 0.0) if isinstance(shape, tuple) else 0.0
    for deg in np.arange(-span, span + 0.01, 0.5):
        fm = np.asarray(place(fsmall, float(deg), 0), np.float32) > 127
        iou = (fm & m).sum() / max(1, (fm | m).sum())
        if iou > best[1]:
            best = (float(deg), float(iou))
    placed = place(small, best[0], (255, 255, 255))
    print(f"  {key}: reference turned {best[0]:+.1f}°, outline overlap {best[1]:.3f}")
    r = np.asarray(placed, np.float32) / 255
    lum = r @ np.array([0.299, 0.587, 0.114], np.float32)
    mxc, mnc = r.max(2), r.min(2)
    sat = (mxc - mnc) / np.maximum(mxc, 1e-3)
    return lum, sat


def blur(a: np.ndarray, sigma: float) -> np.ndarray:
    """Gaussian blur of a float array."""
    return gaussian_filter(np.asarray(a, np.float32), sigma, mode="nearest")


# The denomination (numeral, then its word) in the left panel, as fractions of the coin's
# bounding box (x0, x1, y0, y1), measured from the reference photographs.
LETTER_BOXES: dict[str, tuple[tuple[float, float, float, float], ...]] = {
    "2pound": ((0.12, 0.295, 0.335, 0.555), (0.06, 0.36, 0.59, 0.66)),
    "1pound": ((0.185, 0.28, 0.30, 0.565), (0.07, 0.39, 0.565, 0.645)),
    "50p": ((0.06, 0.34, 0.39, 0.585), (0.08, 0.31, 0.585, 0.66)),
    "20p": ((0.03, 0.33, 0.35, 0.56), (0.03, 0.33, 0.56, 0.65)),
    "10p": ((0.075, 0.32, 0.35, 0.565), (0.08, 0.34, 0.575, 0.665)),
    "5p": ((0.125, 0.295, 0.325, 0.57), (0.07, 0.39, 0.58, 0.67)),
    "2p": ((0.09, 0.295, 0.33, 0.57), (0.06, 0.32, 0.605, 0.69)),
    "1p": ((0.18, 0.255, 0.30, 0.565), (0.04, 0.36, 0.585, 0.67)),
}
GLYPH_EDGE = 0.06  # gradient magnitude (per plate px) that marks a struck bevel
NUMERAL_MIN_MM2 = 0.45  # the numeral outline is one long stroke; the ground breaks into bits
GLYPH_MIN_MM2 = 0.06  # specks smaller than this are ground, not lettering
GLYPH_SHARE = 0.5  # share of an edge that must break the lattice
GLYPH_ODD = 0.05  # lattice mismatch above which an edge belongs to the lettering, not the ground


def panel_split(lum: np.ndarray, field: np.ndarray, pxmm: float) -> int:
    """Column of the vertical rule between the denomination panel and the design."""
    n = lum.shape[0]
    xx = np.arange(n)[None, :].repeat(n, 0)
    gx = np.abs(np.gradient(blur(lum, 0.05 * pxmm), axis=1))
    band = (xx > n * 0.22) & (xx < n * 0.5) & field
    # the rule runs the full height: take each column's median, so a letter stem can't win
    with np.errstate(all="ignore"):
        col = np.nanmedian(np.where(band, gx, np.nan), axis=0)
    return int(np.nanargmax(np.nan_to_num(col, nan=-1.0)))


def lattice_odd(lum: np.ndarray, panel: np.ndarray, pxmm: float) -> np.ndarray:
    """How unlike the interlocking-C ground each panel pixel is: the ground repeats on a lattice
    (found by autocorrelation), the lettering does not. Third-smallest |difference| to the 8 lattice
    neighbours, lightly blurred."""
    n = lum.shape[0]
    g = blur(lum, 0.04 * pxmm) - blur(lum, 0.6 * pxmm)
    G = np.where(panel, g - g[panel].mean(), 0)
    F = np.fft.fft2(G)
    ac = np.fft.fftshift(np.real(np.fft.ifft2(F * np.conj(F))))
    c = n // 2

    def peak(dy: int, dx: int, r: int = 8) -> np.ndarray:
        win = ac[c + dy - r : c + dy + r + 1, c + dx - r : c + dx + r + 1]
        iy, ix = np.unravel_index(np.argmax(win), win.shape)
        return np.array([dy - r + iy, dx - r + ix])

    v1, v2 = peak(int(2.33 * pxmm), 0), peak(0, int(2.96 * pxmm))  # ≈ the pattern's repeat
    gp = np.where(panel, g, np.nan)
    diffs = []
    for sv in (v1, -v1, v2, -v2, v1 + v2, -(v1 + v2), v1 - v2, v2 - v1):
        dy, dx = int(sv[0]), int(sv[1])
        sh = np.full_like(gp, np.nan)
        sh[max(0, dy) : n + min(0, dy), max(0, dx) : n + min(0, dx)] = gp[max(0, -dy) : n + min(0, -dy), max(0, -dx) : n + min(0, -dx)]
        diffs.append(np.abs(gp - sh))
    d = np.sort(np.where(np.isnan(np.stack(diffs)), np.inf, np.stack(diffs)), axis=0)
    # third-best match: a straight stem matches itself one step along its own axis (two
    # neighbours), the ground matches in every direction
    avail = np.isfinite(d).sum(0)
    k = np.clip(np.minimum(2, avail - 1), 0, 7)
    best = np.take_along_axis(d, k[None], 0)[0]
    best = np.where(np.isfinite(best) & panel, best, 0)
    return blur(best, 0.12 * pxmm)


def lettering(lum: np.ndarray, m: np.ndarray, field: np.ndarray, key: str, pxmm: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Traced denomination (numeral + word) as the outline of its struck bevels, and the panel.
    Edges inside the measured boxes are kept when they break the ground's lattice.
    Returns (numeral outline, word outline, panel)."""
    n = lum.shape[0]
    split = panel_split(lum, field, pxmm)
    xx = np.arange(n)[None, :].repeat(n, 0)
    panel = field & (xx < split - 0.3 * pxmm)
    odd = lattice_odd(lum, panel, pxmm)
    gm = gaussian_gradient_magnitude(lum, 0.6)
    ys, xs = np.nonzero(m)
    X0, X1, Y0, Y1 = xs.min(), xs.max(), ys.min(), ys.max()
    W, H = X1 - X0, Y1 - Y0
    outs = [np.zeros((n, n), bool), np.zeros((n, n), bool)]
    for bi, (bx0, bx1, by0, by1) in enumerate(LETTER_BOXES[key]):
        x0, x1, y0, y1 = int(X0 + bx0 * W), int(X0 + bx1 * W), int(Y0 + by0 * H), int(Y0 + by1 * H)
        o = binary_closing(gm[y0:y1, x0:x1] > GLYPH_EDGE, iterations=1)
        lab, nl = label(o)
        if nl == 0:
            continue
        idx = np.arange(1, nl + 1)
        size = np.asarray(nd_sum(o, lab, idx))
        hit = np.asarray(nd_sum(odd[y0:y1, x0:x1] > GLYPH_ODD, lab, idx)) / np.maximum(size, 1)
        edge_ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        inside = ~np.isin(idx, edge_ids)  # the boxes have a margin: lettering never meets it
        keep = (hit >= GLYPH_SHARE) & (size >= (NUMERAL_MIN_MM2 if bi == 0 else GLYPH_MIN_MM2) * pxmm**2) & inside
        outs[bi][y0:y1, x0:x1] |= np.isin(lab, idx[keep])
    return outs[0] & panel, outs[1] & panel, panel


def coin_tone(coin: dict, key: str, pxmm: float, seed: int, ref_dir: Path, variant: str = "line") -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Tone (0..1), print area, solid contour lines (ink), knocked-out contour lines (paper)."""
    d_px = coin["d"] * pxmm
    n = int(math.ceil(d_px * 1.1)) | 1
    milled = bool(coin.get("milled"))
    m = shape_mask(n, d_px, coin["shape"], milled, pxmm)
    # the coin lies on the page: soft shadow to the lower right
    sh = shape_mask(n, d_px, coin["shape"], False, pxmm, dx=0.55 * pxmm, dy=0.75 * pxmm)
    shadow = np.asarray(Image.fromarray((sh * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.45 * pxmm)), np.float32) / 255
    rim_w = int(RIM_MM * pxmm)
    field = erode(m, rim_w * 2)
    lum, sat = load_reverse(ref_dir, key, n, shape_mask(n, d_px, coin["shape"], False, pxmm), coin["shape"])
    v = VARIANTS[variant]
    # metal (albedo): one metal, or brass ring / cupronickel centre read off the photograph's colour
    metal = v["metal"]
    outer, inner = metal[coin["outer"]], metal.get(coin["inner"]) if coin["inner"] is not None else None
    alb = np.full((n, n), outer, np.float32)
    brass = np.zeros((n, n), np.float32)
    if inner is not None:
        brass = np.clip((blur(sat * m, 0.5 * pxmm) - 0.06) / 0.08, 0, 1)
        alb = inner + (outer - inner) * brass
    numeral, word, panel = lettering(lum, m, field, key, pxmm) if v["letters"] else (np.zeros((n, n), bool),) * 3
    numeral = binary_dilation(numeral, structure=_disk(round(v["numeral_mm"] * pxmm)))
    word = binary_dilation(word, structure=_disk(round(v["word_mm"] * pxmm)))
    letters = (numeral | word) & field
    if inner is not None:  # the bimetal joint crosses the numeral; it is not part of the glyph
        joint = np.abs(brass - 0.5) < 0.35
        letters &= ~binary_dilation(joint, structure=_disk(round(0.1 * pxmm)))
    ground = panel & ~binary_dilation(letters, structure=_disk(round(0.15 * pxmm)))  # the C pattern
    # relief from the photograph: the struck design is what differs from its own surroundings.
    # Two scales — fine (lettering, feather, fur) and broad (the figure's modelling) — keep the
    # design whole while the screen holds it; the photographed lighting does the shading.
    lum = blur(lum, DENOISE_MM * pxmm)  # the photograph's frosting and JPEG grain are not design
    fine = lum - blur(lum, FINE_MM * pxmm)
    broad = lum - blur(lum, BROAD_MM * pxmm)
    relief = FINE_GAIN * fine + BROAD_GAIN * broad
    # line emphasis survives the screen: dark on silver / brass, light on copper
    edge = blur(np.abs(fine), EDGE_MM * pxmm)
    if coin["outer"] == COPPER:
        sign = np.full((n, n), COPPER_LINE, np.float32)
    else:
        sign = np.full((n, n), SILVER_LINE, np.float32)
        if coin["inner"] is not None:
            sign = SILVER_LINE + (BRASS_LINE - SILVER_LINE) * brass
        elif coin["outer"] == NICKEL_BRASS:
            sign[:] = BRASS_LINE
    line = EDGE_GAIN * sign * edge
    if v["light_lines"]:  # dark coin: struck edges catch the light
        line = EDGE_GAIN * COPPER_LINE * edge
    # the C ground recedes so the denomination stands clear of it
    quiet = np.where(ground, v["ground"], 1.0).astype(np.float32)
    quiet = blur(quiet, 0.1 * pxmm)
    face = alb + (relief + line) * quiet
    # Struck contours print as solid line over the screen (a dot screen drops strokes thinner
    # than a cell — lettering first). The shadowed side of each raised edge in the photograph is
    # the contour: inked on silver / brass; on copper the lit side is knocked out to paper.
    shade = blur(fine, LINE_MM * pxmm)
    inner_field = erode(field, int(0.2 * pxmm) * 2)
    if coin["outer"] == COPPER or v["light_lines"]:
        lines = (shade > LINE_AT) & inner_field
        # the deepest shadows still ink, so the figure keeps its form on the dark metal
        lines_ink = (shade < -COPPER_SHADOW_AT) & inner_field & ~lines
    else:
        # brass photographs flatter than cupronickel: lower the bar on the ring
        at = LINE_AT * (1 - BRASS_LINE_EASE * brass) if coin["inner"] is not None else LINE_AT
        lines_ink = (shade < -at) & inner_field
        lines = np.zeros_like(lines_ink)
    # the ground's own struck lines go quiet too; the denomination prints solid
    if v["ground"] < 1:
        lines_ink &= ~ground
        lines &= ~ground
    if v["letters"] == "ink":
        lines_ink |= letters
        lines &= ~letters
    elif v["letters"] == "paper":
        lines |= letters
        lines_ink &= ~letters
    # rim: plain raised band lit from the upper left, as before
    h = np.where(m, 1.0, 0.0)
    h = np.where(field, 0.35, h)
    hs = np.asarray(Image.fromarray((np.clip(h, 0, 2) * 120).astype(np.uint8)).filter(ImageFilter.GaussianBlur(pxmm * 0.12)), np.float32) / 120
    gy, gx = np.gradient(hs)
    k = 2.2 * 16 / pxmm * 4
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(hs)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    L = np.array([-0.55, -0.6, 0.58])
    L = L / np.linalg.norm(L)
    diff = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / ln, 0, 1)
    rim = alb * (0.28 + 0.9 * diff) + diff**24 * 0.25
    # brushed metal grain
    rng = np.random.default_rng(seed)
    grain = np.asarray(
        Image.fromarray((rng.random((n // 6 + 2, n // 6 + 2)) * 255).astype(np.uint8)).resize((n, n), Image.Resampling.BICUBIC),
        np.float32,
    ) / 255
    tone = np.where(field, face, rim) + (grain - 0.5) * 0.04
    # edge stroke so silver coins hold their outline on paper
    stroke = m & ~erode(m, int(0.25 * pxmm) * 2)
    tone = np.where(stroke, 0.18, tone)
    tone = np.where(m, np.clip(tone, 0.04, 0.94), 1.0 - 0.32 * shadow)
    return tone, m | (shadow > 0.08), lines_ink, lines


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--only", default=",".join(COINS))
    ap.add_argument("--pxmm", type=float, default=24.0)
    ap.add_argument("--cell", type=float, default=4.4)
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--preview", action="store_true", help="two-colour PNG instead of a mask")
    ap.add_argument("--variant", choices=list(VARIANTS), default="light", help="face treatment (light = shipped, owner pick 2026-11-11)")
    ap.add_argument("--ref", type=Path, default=Path("data/icon-refs/coins/raw"), help="reference photographs <id>.jpg")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    P.BARE = True
    P.MASK = not a.preview
    P.PREFIX = ""
    for key in a.only.split(","):
        key = key.strip()
        coin = COINS[key]
        tone, m, line_ink, line_paper = coin_tone(coin, key, a.pxmm, a.seed, a.ref, a.variant)
        ink = P.halftone(tone, cell=a.cell, grain=GRAIN, seed=a.seed)
        ink = ((ink | line_ink) & ~line_paper) & m  # nothing prints off the coin
        path = a.out / f"c-coin-{key}.png"
        if P.MASK:
            la = np.zeros((*ink.shape, 2), np.uint8)
            la[..., 0] = 255
            la[..., 1] = ink * 255
            Image.fromarray(la, "LA").save(path, optimize=True)
        else:
            rgb = np.where(ink[..., None], np.array(P.INK, np.uint8), np.array(P.PAPER, np.uint8))
            Image.fromarray(rgb).save(path, optimize=True)
        print(f"saved {path}")


if __name__ == "__main__":
    main()
