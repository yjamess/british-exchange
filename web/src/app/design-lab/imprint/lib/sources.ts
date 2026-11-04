/**
 * Tonal "sources" — shaded subjects drawn onto a canvas.
 *
 * One drawing feeds two renderers:
 *   - AsciiField reads luminance × alpha (transparent = empty field)
 *   - Halftone reads luminance against a 50% grey base
 *     (white → cream highlight dots, black → ink shadow dots, clear → stamp colour)
 *
 * So draw subjects with a real tonal range: lit faces near white, turned
 * faces mid-grey, crevices black. Leave the background transparent.
 */

import { UK_PATH, UK_VIEWBOX, projectUK } from "@/lib/ukOutline";

export type SourceId =
  | "uk"
  | "crown"
  | "coin"
  | "towers"
  | "terraces"
  | "viaduct"
  | "numeral"
  | "series"
  | "dissolve";

export type SourceOptions = {
  /** Text for the numeral source. */
  text?: string;
  /** Resolved CSS font-family for display type (Caslon). */
  displayFont?: string;
  /** Padding fraction around the subject (0–0.4). */
  pad?: number;
  /** Anchor the subject horizontally: 0 left · 0.5 centre · 1 right. */
  alignX?: number;
  /** Evenly spaced values (e.g. one per year) for the series source. */
  series?: number[];
  /** Plot the series on a log scale (long-run growth). */
  logScale?: boolean;
};

type Ctx = CanvasRenderingContext2D;

const g = (v: number, a = 1) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgba(${c},${c},${c},${a})`;
};

/** Fit a design box into the canvas (contain) and set the transform. */
function fit(ctx: Ctx, w: number, h: number, bw: number, bh: number, opts: SourceOptions) {
  const pad = opts.pad ?? 0.08;
  const s = Math.min((w * (1 - pad * 2)) / bw, (h * (1 - pad * 2)) / bh);
  const ax = opts.alignX ?? 0.5;
  const tx = (w - bw * s) * ax;
  const ty = (h - bh * s) / 2;
  ctx.setTransform(s, 0, 0, s, tx, ty);
  return s;
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, number][]) {
  const gr = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, v]) => gr.addColorStop(o, g(v)));
  return gr;
}

function rad(ctx: Ctx, x: number, y: number, r0: number, x1: number, y1: number, r1: number, stops: [number, number, number?][]) {
  const gr = ctx.createRadialGradient(x, y, r0, x1, y1, r1);
  stops.forEach(([o, v, a]) => gr.addColorStop(o, g(v, a ?? 1)));
  return gr;
}

/* ——— United Kingdom: settlement-weighted density ——— */
const CITIES: [number, number, number][] = [
  // lon, lat, weight
  [-0.12, 51.5, 1.0], // London
  [-1.9, 52.48, 0.6], // Birmingham
  [-2.24, 53.48, 0.65], // Manchester
  [-2.98, 53.41, 0.45], // Liverpool
  [-1.55, 53.8, 0.5], // Leeds
  [-1.47, 53.38, 0.4], // Sheffield
  [-1.61, 54.97, 0.42], // Newcastle
  [-2.59, 51.45, 0.45], // Bristol
  [-3.18, 51.48, 0.45], // Cardiff
  [-4.25, 55.86, 0.55], // Glasgow
  [-3.19, 55.95, 0.48], // Edinburgh
  [-5.93, 54.6, 0.45], // Belfast
  [-1.15, 52.95, 0.38], // Nottingham
  [-2.1, 57.15, 0.3], // Aberdeen
  [1.3, 52.63, 0.28], // Norwich
  [-4.14, 50.37, 0.28], // Plymouth
];

function drawUK(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  fit(ctx, w, h, UK_VIEWBOX.width, UK_VIEWBOX.height, { pad: 0.04, ...o });
  const p = new Path2D(UK_PATH);
  // Base land tone — lighter in the south-east, quieter in the Highlands
  ctx.fillStyle = lin(ctx, 0, 0, 0, UK_VIEWBOX.height, [
    [0, 0.46],
    [0.45, 0.52],
    [1, 0.62],
  ]);
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.globalCompositeOperation = "lighter";
  for (const [lon, lat, wt] of CITIES) {
    const [x, y] = projectUK(lon, lat);
    const r = 30 + wt * 70;
    ctx.fillStyle = rad(ctx, x, y, 0, x, y, r, [
      [0, wt * 0.55],
      [0.4, wt * 0.22],
      [1, 0],
    ]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  // Coastline lift — a thin bright edge reads as a drawn contour
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = g(0.82);
  ctx.stroke(p);
}

/* ——— Crown ——— */
function drawCrown(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  fit(ctx, w, h, 200, 190, { pad: 0.1, ...o });
  // Cap (velvet) — dark, rounded
  ctx.fillStyle = rad(ctx, 100, 90, 4, 100, 110, 80, [
    [0, 0.42],
    [1, 0.12],
  ]);
  ctx.beginPath();
  ctx.ellipse(100, 120, 64, 52, 0, Math.PI, 0);
  ctx.fill();
  // Arches
  const arch = (x0: number, cx: number, cy: number, x1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, 132);
    ctx.quadraticCurveTo(cx, cy, x1, 54);
    ctx.lineWidth = 13;
    ctx.strokeStyle = lin(ctx, x0, 132, x1, 54, [
      [0, 0.55],
      [0.6, 0.95],
      [1, 0.7],
    ]);
    ctx.stroke();
  };
  arch(36, 40, 60, 100);
  arch(164, 160, 60, 100);
  arch(76, 80, 70, 100);
  arch(124, 120, 70, 100);
  // Band
  ctx.fillStyle = lin(ctx, 0, 128, 0, 162, [
    [0, 1],
    [0.45, 0.82],
    [1, 0.4],
  ]);
  ctx.beginPath();
  ctx.moveTo(28, 128);
  ctx.quadraticCurveTo(100, 142, 172, 128);
  ctx.lineTo(172, 160);
  ctx.quadraticCurveTo(100, 174, 28, 160);
  ctx.closePath();
  ctx.fill();
  // Jewels on the band
  for (const [x, r] of [
    [52, 7],
    [100, 9],
    [148, 7],
  ] as const) {
    const y = 148 + (x === 100 ? 4 : 0);
    ctx.fillStyle = g(0.05);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g(0.9);
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pearls along the band edge
  for (let i = 0; i <= 14; i += 1) {
    const x = 30 + i * 10;
    const t = (x - 100) / 72;
    const y = 128 + 10 * (1 - t * t) + 1;
    ctx.fillStyle = rad(ctx, x - 1, y - 1, 0, x, y, 4, [
      [0, 1],
      [1, 0.5],
    ]);
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Monde (orb) and cross
  ctx.fillStyle = rad(ctx, 94, 38, 2, 100, 44, 16, [
    [0, 1],
    [0.6, 0.7],
    [1, 0.35],
  ]);
  ctx.beginPath();
  ctx.arc(100, 44, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g(0.92);
  ctx.fillRect(96, 6, 8, 26);
  ctx.fillRect(88, 14, 24, 8);
}

/* ——— Coin with £ ——— */
function drawCoin(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  fit(ctx, w, h, 200, 200, { pad: 0.1, ...o });
  // Rim
  ctx.fillStyle = rad(ctx, 70, 60, 10, 100, 100, 100, [
    [0, 1],
    [0.7, 0.62],
    [1, 0.3],
  ]);
  ctx.beginPath();
  ctx.arc(100, 100, 98, 0, Math.PI * 2);
  ctx.fill();
  // Milled edge
  ctx.save();
  ctx.translate(100, 100);
  for (let i = 0; i < 120; i += 1) {
    ctx.rotate((Math.PI * 2) / 120);
    ctx.fillStyle = g(i % 2 ? 0.2 : 0.85);
    ctx.fillRect(-1, -98, 2, 7);
  }
  ctx.restore();
  // Field (recessed)
  ctx.fillStyle = rad(ctx, 130, 140, 10, 100, 100, 84, [
    [0, 0.34],
    [1, 0.14],
  ]);
  ctx.beginPath();
  ctx.arc(100, 100, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = g(0.12);
  ctx.stroke();
  // Embossed £
  const font = o.displayFont ?? "Georgia, serif";
  ctx.font = `120px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = g(0.02);
  ctx.fillText("£", 105, 111);
  ctx.fillStyle = lin(ctx, 60, 50, 140, 150, [
    [0, 1],
    [1, 0.7],
  ]);
  ctx.fillText("£", 100, 106);
}

/* ——— Cooling towers (Energy) ——— */
function drawTowers(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  fit(ctx, w, h, 220, 220, { pad: 0.04, ...o });
  // Steam — soft, bright clouds
  const puffs: [number, number, number, number][] = [
    [70, 70, 34, 0.95],
    [92, 48, 30, 0.9],
    [58, 40, 24, 0.75],
    [150, 82, 26, 0.85],
    [168, 60, 22, 0.75],
    [120, 30, 28, 0.6],
  ];
  for (const [x, y, r, v] of puffs) {
    ctx.fillStyle = rad(ctx, x - r * 0.3, y - r * 0.3, 0, x, y, r, [
      [0, v],
      [0.6, v * 0.8, 0.85],
      [1, v * 0.6, 0],
    ]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tower = (cx: number, base: number, top: number, wb: number, wt: number, wm: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - wb, base);
    ctx.quadraticCurveTo(cx - wm, (base + top) / 2 + 10, cx - wt, top);
    ctx.lineTo(cx + wt, top);
    ctx.quadraticCurveTo(cx + wm, (base + top) / 2 + 10, cx + wb, base);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, cx - wb, 0, cx + wb, 0, [
      [0, 0.95],
      [0.35, 0.8],
      [0.75, 0.32],
      [1, 0.12],
    ]);
    ctx.fill();
    // Rim shadow
    ctx.fillStyle = g(0.1);
    ctx.beginPath();
    ctx.ellipse(cx, top, wt, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  tower(150, 205, 104, 34, 20, 16);
  tower(72, 205, 92, 42, 25, 20);
  // Chimney
  ctx.fillStyle = lin(ctx, 196, 0, 206, 0, [
    [0, 0.9],
    [1, 0.25],
  ]);
  ctx.fillRect(196, 70, 9, 135);
  // Ground
  ctx.fillStyle = lin(ctx, 0, 200, 0, 220, [
    [0, 0.2],
    [1, 0.05],
  ]);
  ctx.fillRect(0, 202, 220, 18);
}

/* ——— Terraced houses (Housing) ——— */
function drawTerraces(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  fit(ctx, w, h, 220, 200, { pad: 0.04, ...o });
  const n = 4;
  const hw = 52;
  const x0 = 6;
  for (let i = 0; i < n; i += 1) {
    const x = x0 + i * hw;
    // Facade brick tone, lit from the left
    ctx.fillStyle = lin(ctx, x, 0, x + hw, 0, [
      [0, 0.78],
      [1, 0.58],
    ]);
    ctx.fillRect(x, 78, hw, 112);
    // Party wall shadow
    ctx.fillStyle = g(0.25);
    ctx.fillRect(x + hw - 2, 78, 2, 112);
    // Bay window
    ctx.fillStyle = g(0.95);
    ctx.fillRect(x + 6, 128, 24, 40);
    ctx.fillStyle = g(0.08);
    ctx.fillRect(x + 9, 132, 8, 32);
    ctx.fillRect(x + 19, 132, 8, 32);
    // Upper sash
    ctx.fillStyle = g(0.95);
    ctx.fillRect(x + 8, 92, 20, 26);
    ctx.fillStyle = g(0.1);
    ctx.fillRect(x + 11, 95, 14, 9);
    ctx.fillRect(x + 11, 106, 14, 9);
    // Arched door
    ctx.fillStyle = g(0.06);
    ctx.beginPath();
    ctx.moveTo(x + 36, 190);
    ctx.lineTo(x + 36, 146);
    ctx.arc(x + 42, 146, 6, Math.PI, 0);
    ctx.lineTo(x + 48, 190);
    ctx.fill();
    ctx.fillStyle = g(1);
    ctx.fillRect(x + 35, 138, 14, 2);
    // Chimney stack on the party wall
    ctx.fillStyle = lin(ctx, x + hw - 10, 0, x + hw + 10, 0, [
      [0, 0.85],
      [1, 0.4],
    ]);
    ctx.fillRect(x + hw - 9, 36, 18, 26);
    ctx.fillStyle = g(0.95);
    for (const px of [x + hw - 6, x + hw + 2]) ctx.fillRect(px, 28, 5, 9);
  }
  // Continuous slate roof
  ctx.fillStyle = lin(ctx, 0, 52, 0, 80, [
    [0, 0.2],
    [1, 0.45],
  ]);
  ctx.beginPath();
  ctx.moveTo(x0 - 4, 80);
  ctx.lineTo(x0 + 10, 54);
  ctx.lineTo(x0 + n * hw - 10, 54);
  ctx.lineTo(x0 + n * hw + 4, 80);
  ctx.closePath();
  ctx.fill();
  // Pavement
  ctx.fillStyle = g(0.3);
  ctx.fillRect(0, 190, 220, 10);
}

/* ——— Railway viaduct (Infrastructure) ——— */
function drawViaduct(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  fit(ctx, w, h, 240, 180, { pad: 0.03, ...o });
  // Train on the deck
  ctx.fillStyle = lin(ctx, 0, 48, 0, 72, [
    [0, 0.98],
    [1, 0.6],
  ]);
  ctx.fillRect(40, 50, 150, 20);
  ctx.fillStyle = g(0.08);
  for (let x = 46; x < 186; x += 12) ctx.fillRect(x, 54, 7, 6);
  ctx.fillStyle = g(0.15);
  ctx.fillRect(40, 70, 150, 2);
  // Deck
  ctx.fillStyle = lin(ctx, 0, 72, 0, 86, [
    [0, 0.9],
    [1, 0.55],
  ]);
  ctx.fillRect(0, 72, 240, 14);
  // Piers + arches
  const span = 40;
  for (let i = 0; i < 6; i += 1) {
    const x = i * span;
    ctx.fillStyle = lin(ctx, x, 0, x + span, 0, [
      [0, 0.72],
      [0.5, 0.6],
      [1, 0.48],
    ]);
    ctx.fillRect(x, 86, span, 94);
    // Arch void — cut clean through to the field
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x + 7, 180);
    ctx.lineTo(x + 7, 118);
    ctx.arc(x + span / 2, 118, span / 2 - 7, Math.PI, 0);
    ctx.lineTo(x + span - 7, 180);
    ctx.fill();
    ctx.restore();
    // Voussoir ring
    ctx.strokeStyle = g(0.95);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + span / 2, 118, span / 2 - 6, Math.PI, 0);
    ctx.stroke();
  }
}

/* ——— Display numeral / word ——— */
function drawNumeral(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  const text = o.text ?? "48";
  const font = o.displayFont ?? "Georgia, serif";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pad = o.pad ?? 0.06;
  ctx.font = `100px ${font}`;
  const m = ctx.measureText(text);
  const tw = m.width;
  const th = (m.actualBoundingBoxAscent || 72) + (m.actualBoundingBoxDescent || 0);
  const s = Math.min((w * (1 - pad * 2)) / tw, (h * (1 - pad * 2)) / th);
  const size = 100 * s;
  ctx.font = `${size}px ${font}`;
  ctx.textBaseline = "alphabetic";
  const asc = (m.actualBoundingBoxAscent || 72) * s;
  const desc = (m.actualBoundingBoxDescent || 0) * s;
  const ax = o.alignX ?? 0.5;
  const x = (w - tw * s) * ax;
  const y = (h - (asc + desc)) / 2 + asc;
  ctx.fillStyle = lin(ctx, 0, y - asc, 0, y + desc, [
    [0, 1],
    [0.55, 0.82],
    [1, 0.5],
  ]);
  ctx.fillText(text, x, y);
}

/* ——— Series: area under the curve, brightness = that year's growth ——— */
function drawSeries(ctx: Ctx, w: number, h: number, o: SourceOptions) {
  const raw = o.series ?? [];
  if (raw.length < 2) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vals = o.logScale ? raw.map((v) => Math.log(Math.max(v, 1e-9))) : raw;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const top = h * (o.pad ?? 0.08);
  const bottom = h;
  const X = (i: number) => (i / (vals.length - 1)) * w;
  const Y = (v: number) => bottom - ((v - min) / (max - min || 1)) * (bottom - top) * 0.92 - (bottom - top) * 0.04;

  const area = new Path2D();
  area.moveTo(0, bottom);
  vals.forEach((v, i) => area.lineTo(X(i), Y(v)));
  area.lineTo(w, bottom);
  area.closePath();

  ctx.save();
  ctx.clip(area);
  const colW = w / (vals.length - 1);
  for (let i = 0; i < vals.length; i += 1) {
    const growth = i === 0 ? 0 : o.logScale ? vals[i]! - vals[i - 1]! : (vals[i]! - vals[i - 1]!) / (Math.abs(vals[i - 1]!) || 1);
    const lum = Math.max(0.14, Math.min(1, 0.52 + growth * 7));
    ctx.fillStyle = g(lum);
    ctx.fillRect(X(i) - colW / 2, 0, colW + 0.5, h);
  }
  // Depth: thin towards the baseline
  ctx.globalCompositeOperation = "destination-out";
  const fade = ctx.createLinearGradient(0, top, 0, bottom);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // The curve itself, drawn bright
  ctx.beginPath();
  vals.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.lineWidth = 3;
  ctx.strokeStyle = g(1);
  ctx.stroke();
}

/* ——— Dissolve: dense at the top, breaking into columns below ——— */
function drawDissolve(ctx: Ctx, w: number, h: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const step = 6;
  for (let x = 0, i = 0; x < w; x += step, i += 1) {
    const wave = 0.5 + 0.25 * Math.sin(i * 0.11) + 0.15 * Math.sin(i * 0.37 + 1.3);
    const r = (((i * 2654435761) >>> 0) % 1000) / 1000;
    const len = h * Math.max(0.15, Math.min(1, wave * 0.8 + r * 0.45));
    const gr = ctx.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, g(1));
    gr.addColorStop(0.35, g(0.9));
    gr.addColorStop(1, g(0.15, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(x, 0, step, len);
  }
}

const DRAW: Record<SourceId, (ctx: Ctx, w: number, h: number, o: SourceOptions) => void> = {
  uk: drawUK,
  crown: drawCrown,
  coin: drawCoin,
  towers: drawTowers,
  terraces: drawTerraces,
  viaduct: drawViaduct,
  numeral: drawNumeral,
  series: drawSeries,
  dissolve: drawDissolve,
};

/** Render a source to an offscreen canvas and return its RGBA pixels. */
export function renderSource(id: SourceId, w: number, h: number, opts: SourceOptions = {}): ImageData {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.clearRect(0, 0, c.width, c.height);
  DRAW[id](ctx, c.width, c.height, opts);
  return ctx.getImageData(0, 0, c.width, c.height);
}

/** Read a CSS custom property holding a font stack (next/font sets these on <body>). */
export function cssFontVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}
