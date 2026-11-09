import type { FieldFn, FieldGrid } from "./DitherField";
import { BRITAIN } from "./glyphs.britain";
import { fbm3 } from "./noise";

/**
 * Glyph field: one dotted shape that morphs from the country to each sector and back.
 *
 * Each glyph is rasterised once per grid size and turned into a signed distance field
 * (cells; negative inside). The field holds a shape, then morphs by interpolating the two
 * distance fields, so edges flow rather than cross-fade. Tone from density only.
 */

export type Glyph = {
  id: string;
  /** Caption, e.g. "Housing & Land". */
  label: string;
  /** SVG path in a `w × h` box (evenodd), or a single character set in Caslon. */
  d?: string;
  text?: string;
  w: number;
  h: number;
};

export const GLYPHS: Glyph[] = [
  { id: "uk", label: "United Kingdom", d: BRITAIN.d, w: BRITAIN.width, h: BRITAIN.height },
  {
    id: "housing-land",
    label: "Housing & Land",
    d: "M50 6L96 46H84V94H16V46H4ZM40 94V64H60V94Z",
    w: 100,
    h: 100,
  },
  { id: "economy-public-finance", label: "Economy & Public Finance", text: "£", w: 100, h: 100 },
  {
    id: "energy-industry",
    label: "Energy & Industry",
    d: "M60 2L14 58H44L34 98L86 38H56Z",
    w: 100,
    h: 100,
  },
  {
    id: "people-society",
    label: "People & Society",
    d:
      "M34 12A13 13 0 1 0 34.1 12ZM8 94V66C8 50 18 42 34 42C50 42 60 50 60 66V94Z" +
      "M70 24A11 11 0 1 0 70.1 24ZM64 94V68C64 56 66 50 72 48C86 48 94 56 94 68V94Z",
    w: 100,
    h: 100,
  },
  {
    id: "government-politics",
    label: "Government & Politics",
    d: "M50 4L96 28H4ZM8 32H92V40H8ZM14 44H26V82H14ZM36 44H48V82H36ZM56 44H68V82H56ZM78 44H90V82H78ZM4 86H96V96H4Z",
    w: 100,
    h: 100,
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    d: "M2 30H98V96H2ZM16 96V78A34 34 0 0 1 84 78V96Z",
    w: 100,
    h: 100,
  },
  {
    id: "regions-places",
    label: "Regions & Places",
    d: "M50 98C40 84 14 60 14 38A36 36 0 0 1 86 38C86 60 60 84 50 98ZM50 24A14 14 0 1 0 50.1 24Z",
    w: 100,
    h: 100,
  },
  {
    id: "history-change",
    label: "History & Change",
    d: "M16 2H84V12H78C78 34 60 42 58 50C60 58 78 66 78 88H84V98H16V88H22C22 66 40 58 42 50C40 42 22 34 22 12H16Z",
    w: 100,
    h: 100,
  },
];

const SS = 3; // supersampling for the coverage raster

/** Where the glyph sits, as fractions of the field. It is fitted inside and pinned to the box's bottom-right. */
export type GlyphBox = { left: number; top: number; right: number; bottom: number };
const CENTRED: GlyphBox = { left: 0.1, top: 0.1, right: 0.9, bottom: 0.9 };

/** Coverage raster of one glyph, fitted into `box` and pinned to its bottom-right. 1 = inside. */
function rasterise(glyph: Glyph, g: FieldGrid, font: string, box: GlyphBox): Uint8Array {
  const cols = g.cols;
  const rows = g.rows;
  const cv = document.createElement("canvas");
  cv.width = cols * SS;
  cv.height = rows * SS;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const inside = new Uint8Array(cols * rows);
  if (!ctx) return inside;
  const bw = cv.width * (box.right - box.left);
  const bh = cv.height * (box.bottom - box.top);
  const scale = Math.min(bw / glyph.w, bh / glyph.h);
  const centred = box === CENTRED;
  const ox = cv.width * box.right - glyph.w * scale - (centred ? (bw - glyph.w * scale) / 2 : 0);
  const oy = cv.height * box.bottom - glyph.h * scale - (centred ? (bh - glyph.h * scale) / 2 : 0);
  ctx.fillStyle = "#000";
  if (glyph.d) {
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.fill(new Path2D(glyph.d), "evenodd");
  } else if (glyph.text) {
    const size = glyph.h * scale * 1.18;
    ctx.font = `400 ${size}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const m = ctx.measureText(glyph.text);
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    ctx.fillText(glyph.text, ox + (glyph.w * scale) / 2, oy + (glyph.h * scale) / 2 + (asc - desc) / 2);
  }
  const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) hit += px[((y * SS + sy) * cv.width + x * SS + sx) * 4 + 3] > 127 ? 1 : 0;
      inside[y * cols + x] = hit * 2 >= SS * SS ? 1 : 0;
    }
  return inside;
}

/** Two-pass chamfer distance to the nearest cell where `mask` is 1. */
function chamfer(mask: Uint8Array, cols: number, rows: number): Float32Array {
  const D = 1;
  const E = Math.SQRT2;
  const BIG = 1e6;
  const d = new Float32Array(cols * rows);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : BIG;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + D);
      if (y > 0) {
        v = Math.min(v, d[i - cols] + D);
        if (x > 0) v = Math.min(v, d[i - cols - 1] + E);
        if (x < cols - 1) v = Math.min(v, d[i - cols + 1] + E);
      }
      d[i] = v;
    }
  for (let y = rows - 1; y >= 0; y--)
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      let v = d[i];
      if (x < cols - 1) v = Math.min(v, d[i + 1] + D);
      if (y < rows - 1) {
        v = Math.min(v, d[i + cols] + D);
        if (x < cols - 1) v = Math.min(v, d[i + cols + 1] + E);
        if (x > 0) v = Math.min(v, d[i + cols - 1] + E);
      }
      d[i] = v;
    }
  return d;
}

/** Signed distance in cells: negative inside, positive outside. */
function signedDistance(inside: Uint8Array, cols: number, rows: number): Float32Array {
  const outside = new Uint8Array(inside.length);
  for (let i = 0; i < inside.length; i++) outside[i] = inside[i] ? 0 : 1;
  const toIn = chamfer(inside, cols, rows);
  const toOut = chamfer(outside, cols, rows);
  const sd = new Float32Array(inside.length);
  for (let i = 0; i < sd.length; i++) sd[i] = inside[i] ? -(toOut[i] - 0.5) : toIn[i] - 0.5;
  return sd;
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The footer field. `hold` seconds on each glyph, `morph` seconds between them.
 * `onGlyph(i)` fires when the shown glyph changes (at the midpoint of a morph).
 *
 * `box` places the glyph (fractions of the field, pinned bottom-right); omit it to centre.
 * Only the shape is drawn: no halo or drift, so the ground around it stays solid.
 */
export function glyphField({
  glyphs = GLYPHS,
  hold = 3.2,
  morph = 1.9,
  box,
  onGlyph,
}: {
  glyphs?: Glyph[];
  hold?: number;
  morph?: number;
  /** A box, or a function of the grid (so a phone can get a larger glyph). */
  box?: GlyphBox | ((g: FieldGrid) => GlyphBox);
  onGlyph?: (index: number) => void;
} = {}): FieldFn {
  let key = "";
  let sdfs: Float32Array[] = [];
  let shown = -1;
  const period = hold + morph;
  let place: GlyphBox = CENTRED;
  return (t, g) => {
    // Re-rasterise on resize, and once webfonts land (the £ is set in Caslon).
    const k = `${g.cols}x${g.rows}:${typeof document !== "undefined" ? document.fonts?.status : ""}`;
    if (k !== key) {
      key = k;
      place = (typeof box === "function" ? box(g) : box) ?? CENTRED;
      const font =
        (typeof document !== "undefined" &&
          getComputedStyle(document.querySelector(".bo") ?? document.body).getPropertyValue("--bo-f-head")) ||
        "Georgia, serif";
      sdfs = glyphs.map((gl) => signedDistance(rasterise(gl, g, font, place), g.cols, g.rows));
    }
    const n = glyphs.length;
    const step = Math.floor(t / period);
    const local = t - step * period;
    const a = step % n;
    const b = (step + 1) % n;
    const e = local < hold ? 0 : smooth((local - hold) / morph);
    const current = e < 0.5 ? a : b;
    if (current !== shown) {
      shown = current;
      onGlyph?.(current);
    }
    const A = sdfs[a];
    const B = sdfs[b];
    const swell = Math.sin(Math.PI * e); // edges loosen mid-morph, settle at rest
    const tone = new Float32Array(g.cols * g.rows);
    for (let y = 0; y < g.rows; y++)
      for (let x = 0; x < g.cols; x++) {
        const i = y * g.cols + x;
        const grain = fbm3(x * 0.09, y * 0.09, t * 0.35);
        const d = A[i] + (B[i] - A[i]) * e + (grain - 0.5) * 8 * swell;
        let v = 0;
        if (d < -1.2) {
          // Body: a slow diagonal engraving drifting through a breathing screen.
          const hatch = 0.5 + 0.5 * Math.sin(x * 0.9 + y * 0.55 - t * 2.2);
          v = 0.32 + 0.14 * grain + 0.52 * hatch;
        } else if (d < 0.6) {
          v = 1; // the drawn edge
        } else if (swell > 0.02) {
          // Mid-turn the shape throws dots outward; they fall back as it settles. At rest: nothing.
          const reach = 3 + 18 * swell;
          if (d < reach) {
            const spark = fbm3(x * 0.35, y * 0.35, t * 1.5);
            if (spark > 0.56) v = (0.35 + 0.65 * (1 - d / reach)) * Math.min(1, swell * 1.4);
          }
        }
        tone[i] = clamp01(v);
      }
    return { tone };
  };
}
