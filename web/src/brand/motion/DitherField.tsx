"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { fbm3 } from "./noise";

/**
 * Large ASCII-style motion field. Tone comes only from mark density — never opacity.
 *
 * - mark "dots":     square dots on a strict grid, thresholded by a 4×4 Bayer matrix (ordered dither)
 * - mark "numerals": digits ordered by ink coverage; fields may type real values via `glyphs`
 *
 * A field is a pure function (t, grid) => brightness per cell in [0, 1]. Built-ins: cloud, globe,
 * ridges(series). Data fields must use real series from the Exchange API.
 * Colour = `currentColor` (set `color` on a token surface). Pauses off-screen, ≤24 fps, DPR ≤ 2,
 * one still frame under prefers-reduced-motion.
 */

export type FieldGrid = {
  cols: number;
  rows: number;
  /** cell width / height in CSS px */
  cw: number;
  ch: number;
  width: number;
  height: number;
};

export type FieldFrame = {
  /** brightness per cell, row-major, 0..1 */
  tone: Float32Array;
  /** optional numeral override per cell ("0"-"9" char codes, 0 = none); numerals mark only */
  glyphs?: Uint8Array;
};

export type FieldFn = (t: number, grid: FieldGrid, mark: DitherMark) => FieldFrame;
export type DitherMark = "dots" | "numerals";

const RAMP = " 1734259608"; // numerals ordered light → dense
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Drifting domain-warped cloud. */
export const cloudField: FieldFn = (t, g, mark) => {
  const tone = new Float32Array(g.cols * g.rows);
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      const wx = x * g.cw * 0.0075;
      const wy = y * g.ch * 0.0075;
      const warp = fbm3(wx * 0.6 + t * 0.03, wy * 0.6, t * 0.02) * 2.2;
      const b = fbm3(wx + warp + t * 0.05, wy - t * 0.02, t * 0.04);
      tone[y * g.cols + x] = mark === "dots" ? clamp01((b - 0.38) / 0.3) : clamp01((b - 0.4) / 0.34) ** 1.5;
    }
  }
  return { tone };
};

/** Turning globe with graticule and drifting records. */
export const globeField: FieldFn = (t, g) => {
  const tone = new Float32Array(g.cols * g.rows);
  const R = Math.min(g.width, g.height) * 0.36;
  const cx = g.width * 0.58;
  const cy = g.height * 0.5;
  const rot = t * 0.22;
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      const nx = (x * g.cw + g.cw / 2 - cx) / R;
      const ny = (y * g.ch + g.ch / 2 - cy) / R;
      const r2 = nx * nx + ny * ny;
      let b = 0;
      if (r2 < 1) {
        const nz = Math.sqrt(1 - r2);
        const lon = Math.atan2(nx, nz) + rot;
        const lat = Math.asin(ny);
        const grat = Math.abs(Math.sin(lon * 6)) < 0.08 || Math.abs(Math.sin(lat * 6)) < 0.06 ? 0.45 : 0;
        const land = Math.max(0, fbm3(Math.cos(lon) * 1.5 + 5, Math.sin(lon) * 1.5 + 3, lat * 2.1) - 0.44) * 3.6;
        b = Math.min(1, (0.2 + land + grat) * (0.55 + 0.9 * Math.max(0, -nx * 0.45 - ny * 0.4 + nz * 0.8)));
      } else {
        const f = fbm3(x * 0.09 - t * 0.5, y * 0.16, t * 0.1);
        if (f > 0.62) b = (f - 0.62) * 2.4;
      }
      tone[y * g.cols + x] = b;
    }
  }
  return { tone };
};

/**
 * Stacked ridges from real series (back → front), with a playhead that reveals time.
 * `series[i][k]` = value of series i at period k (shared scale). Numerals type each crest
 * with the value at that period, divided by `digitsDivisor` (e.g. 1000 → £ thousands).
 */
export function ridgesField(
  series: number[][],
  {
    periodsPerSecond = 6,
    digitsDivisor = 1000,
    onPeriod,
    hold = false,
    bounds = { left: 0.04, right: 0.96, top: 0.3, bottom: 0.9 },
  }: {
    periodsPerSecond?: number;
    digitsDivisor?: number;
    onPeriod?: (k: number) => void;
    /** Reveal once and stay complete, instead of looping. */
    hold?: boolean;
    /** Plot area as fractions of the field (keeps ridges clear of overlaid panels). */
    bounds?: { left: number; right: number; top: number; bottom: number };
  } = {},
): FieldFn {
  const R = series.length;
  const Q = series[0]?.length ?? 0;
  const vmax = Math.max(...series.flat());
  return (t, g, mark) => {
    const tone = new Float32Array(g.cols * g.rows);
    const glyphs = mark === "numerals" ? new Uint8Array(g.cols * g.rows) : undefined;
    const step = Math.floor(t * periodsPerSecond);
    const kShow = hold ? Math.min(step, Q - 1) : Math.min(step % (Q + 18), Q - 1);
    onPeriod?.(kShow);
    const x0 = Math.floor(g.cols * bounds.left);
    const x1 = Math.floor(g.cols * bounds.right);
    const top = g.rows * bounds.top;
    const bot = g.rows * bounds.bottom;
    const gap = (bot - top) / Math.max(1, R - 1);
    const amp = Math.min(gap * 5, top - 2);
    for (let x = x0; x < x1; x++) {
      const k = Math.round(((x - x0) / Math.max(1, x1 - x0 - 1)) * (Q - 1));
      if (k > kShow) {
        for (let r = 0; r < R; r++) {
          const yb = Math.round(top + r * gap);
          if (yb < g.rows && x % 4 === 0) tone[yb * g.cols + x] = 0.1;
        }
        continue;
      }
      for (let r = 0; r < R; r++) {
        const base = top + r * gap;
        const y0 = Math.max(0, Math.round(base - (series[r][k] / vmax) * amp));
        for (let y = y0; y <= Math.min(g.rows - 1, Math.round(base)); y++) tone[y * g.cols + x] = 0;
        if (mark === "dots") {
          const band = [1, 0.7, 0.5, 0.34, 0.2, 0.1];
          for (let j = 0; j < band.length && y0 + j < g.rows; j++) tone[(y0 + j) * g.cols + x] = band[j];
        } else if (glyphs) {
          tone[y0 * g.cols + x] = 0.95;
          const digits = String(Math.round(series[r][k] / digitsDivisor));
          glyphs[y0 * g.cols + x] = digits.charCodeAt((x - x0) % digits.length);
        }
      }
    }
    return { tone, glyphs };
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function DitherField({
  field = cloudField,
  mark = "dots",
  pitch = 5,
  lens = true,
  fps = 24,
  label,
  className = "",
  style,
}: {
  field?: FieldFn;
  mark?: DitherMark;
  /** Dot pitch in CSS px (dots mark). Numerals use a 6×10 cell. */
  pitch?: number;
  /** Pointer acts as a lens that raises density nearby. */
  lens?: boolean;
  fps?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const [cw, ch] = mark === "dots" ? [pitch, pitch] : [6, 10];
    let grid: FieldGrid = { cols: 0, rows: 0, cw, ch, width: 0, height: 0 };
    let dpr = 1;
    let sprite: HTMLCanvasElement | null = null;
    let color = "#000";
    let visible = true;
    let raf = 0;
    let last = 0;
    const mouse = { x: -1e4, y: -1e4 };

    const build = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      grid = { cols: Math.ceil(r.width / cw), rows: Math.ceil(r.height / ch), cw, ch, width: r.width, height: r.height };
      color = getComputedStyle(cv).color;
      if (mark === "numerals") {
        const font = getComputedStyle(cv).getPropertyValue("--bo-f-data") || "ui-monospace, monospace";
        sprite = document.createElement("canvas");
        const sw = Math.ceil(cw * dpr);
        sprite.width = sw * 10;
        sprite.height = Math.ceil(ch * dpr);
        const s = sprite.getContext("2d");
        if (s) {
          s.fillStyle = color;
          s.font = `500 ${Math.round(9 * dpr)}px ${font}`;
          s.textAlign = "center";
          s.textBaseline = "middle";
          for (let d = 0; d < 10; d++) s.fillText(String(d), (d + 0.5) * sw, sprite.height / 2);
        }
      }
    };

    const draw = (now = performance.now()) => {
      if (!grid.cols) return;
      const t = reduced ? 4 : now / 1000;
      const { tone, glyphs } = field(t, grid, mark);
      if (lens && mouse.x > -1e3) {
        for (let y = 0; y < grid.rows; y++)
          for (let x = 0; x < grid.cols; x++) {
            const d = Math.hypot(x * cw - mouse.x, y * ch - mouse.y);
            if (d < 140) tone[y * grid.cols + x] = Math.min(1, tone[y * grid.cols + x] + (1 - d / 140) * 0.5);
          }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (mark === "dots") {
        const p = cw * dpr;
        const size = Math.max(1, Math.round(2 * dpr));
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let y = 0; y < grid.rows; y++)
          for (let x = 0; x < grid.cols; x++) {
            if (tone[y * grid.cols + x] <= BAYER[(y & 3) * 4 + (x & 3)]) continue;
            ctx.rect(Math.round(x * p), Math.round(y * p), size, size);
          }
        ctx.fill();
        return;
      }
      if (!sprite) return;
      const sw = Math.ceil(cw * dpr);
      const sh = sprite.height;
      for (let y = 0; y < grid.rows; y++)
        for (let x = 0; x < grid.cols; x++) {
          const i = y * grid.cols + x;
          const b = tone[i];
          if (b < 0.04) continue;
          const g = glyphs?.[i];
          const ch0 = g ? String.fromCharCode(g) : RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.round(b * (RAMP.length - 1))))];
          ctx.drawImage(sprite, Number(ch0) * sw, 0, sw, sh, Math.round(x * cw * dpr), Math.round(y * ch * dpr), sw, sh);
        }
    };

    build();
    draw();
    const ro = new ResizeObserver(() => {
      build();
      draw();
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(cv);
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const leave = () => {
      mouse.x = mouse.y = -1e4;
    };
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerleave", leave);
    const loop = (now: number) => {
      if (visible && !reduced && now - last > 1000 / fps) {
        last = now;
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    document.fonts?.ready.then(() => {
      build();
      draw();
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerleave", leave);
    };
  }, [field, mark, pitch, lens, fps]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
