"use client";

/**
 * A tonal emoji screened to one ink — the imprint crown's method in the v1 palette.
 * 45° dot screen; dot area follows tone (shadow = large dots, lit face = small dots), with a
 * little low-frequency wear so it reads as print, not a vector. Ink is the element's CSS colour.
 *
 * mode "print": dots = darkness (electric on paper).
 * mode "negative": dots = lightness (paper on electric). The ground comes from CSS.
 */

import { useEffect, useRef } from "react";
import { renderTonal, type TonalId } from "./tonal";

function hash2(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

type Props = {
  id: TonalId;
  size: number;
  mode?: "print" | "negative";
  /** Dots across the subject; pitch = size / cells, never under 1.1 CSS px. */
  cells?: number;
  title?: string;
  className?: string;
};

export function ScreenEmoji({ id, size, mode = "print", cells = 44, title, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ink = getComputedStyle(canvas).color;

    // Sample the source at 2× the screen resolution and average under each cell centre.
    const res = Math.round(size * 2);
    const img = renderTonal(id, res, res);
    const d = img.data;
    const k = res / size;
    const tone = (x: number, y: number) => {
      const px = Math.max(0, Math.min(res - 1, Math.floor(x * k)));
      const py = Math.max(0, Math.min(res - 1, Math.floor(y * k)));
      const i = (py * res + px) * 4;
      const a = d[i + 3]! / 255;
      const lum = d[i]! / 255;
      if (a < 0.04) return 0;
      const v = mode === "print" ? 1 - lum : lum;
      // On paper a lit face would print almost nothing; keep a fine floor so forms hold their edge.
      return a * (mode === "print" ? 0.2 + 0.8 * v : 0.08 + 0.92 * v);
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const pitch = Math.max(1.1, size / cells);
    const ang = Math.PI / 4;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const c = size / 2;
    const reach = size * 0.75 + pitch;
    ctx.beginPath();
    for (let u = -reach; u <= reach; u += pitch) {
      for (let v = -reach; v <= reach; v += pitch) {
        const x = c + u * cos - v * sin;
        const y = c + u * sin + v * cos;
        if (x < 0 || y < 0 || x > size || y > size) continue;
        let t = tone(x, y);
        if (t <= 0.03) continue;
        t *= 0.84 + 0.28 * noise(x * (6 / size) * 4, y * (6 / size) * 4);
        const r = pitch * 0.66 * Math.sqrt(Math.min(1, t));
        if (r < 0.16) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = ink;
    ctx.fill();
  }, [id, size, mode, cells]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size, display: "block" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
