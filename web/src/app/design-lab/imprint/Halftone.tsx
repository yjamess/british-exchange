"use client";

/**
 * Halftone — stamp illustration as print, not ASCII.
 *
 * Two screens over a flat stamp colour, like a two-pass riso:
 *   cream highlight dots at 45°, ink shadow dots at 15°, ink slightly
 *   mis-registered. Low-frequency noise thins the dots (xerox wear) and
 *   a speckle pass adds paper grain. Static — rendered once per size.
 */

import { useEffect, useRef } from "react";
import { cssFontVar, renderSource, type SourceId, type SourceOptions } from "./lib/sources";

type Props = {
  source: SourceId;
  sourceOptions?: SourceOptions;
  field: string;
  ink: string;
  highlight: string;
  /** Screen pitch in CSS px. */
  pitch?: number;
  className?: string;
};

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

export function Halftone({ source, sourceOptions, field, ink, highlight, pitch = 3.2, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optsKey = JSON.stringify(sourceOptions ?? {});

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let disposed = false;
    let display = "Georgia, serif";

    function paint() {
      const rect = wrap!.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;

      const img = renderSource(source, w, h, { ...sourceOptions, displayFont: display });
      const d = img.data;
      const tone = (x: number, y: number) => {
        const px = Math.max(0, Math.min(img.width - 1, Math.floor(x)));
        const py = Math.max(0, Math.min(img.height - 1, Math.floor(y)));
        const k = (py * img.width + px) * 4;
        const a = d[k + 3]! / 255;
        return 0.5 + (d[k]! / 255 - 0.5) * a;
      };

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = field;
      ctx!.fillRect(0, 0, w, h);

      const screen = (angleDeg: number, color: string, pick: (v: number) => number, off: [number, number], gain: number) => {
        const a = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const cx = w / 2;
        const cy = h / 2;
        const reach = Math.hypot(w, h) / 2 + pitch;
        ctx!.beginPath();
        for (let u = -reach; u <= reach; u += pitch) {
          for (let v = -reach; v <= reach; v += pitch) {
            const x = cx + u * cos - v * sin;
            const y = cy + u * sin + v * cos;
            if (x < -pitch || y < -pitch || x > w + pitch || y > h + pitch) continue;
            let t = pick(tone(x, y));
            if (t <= 0.02) continue;
            // Xerox wear — patches where the plate printed thin
            t *= 0.78 + 0.36 * noise(x * 0.018, y * 0.018);
            const r = pitch * 0.64 * Math.sqrt(Math.min(1, t)) * gain;
            if (r < 0.18) continue;
            ctx!.moveTo(x + off[0] + r, y + off[1]);
            ctx!.arc(x + off[0], y + off[1], r, 0, Math.PI * 2);
          }
        }
        ctx!.fillStyle = color;
        ctx!.fill();
      };

      screen(45, highlight, (v) => (v - 0.5) * 2, [0, 0], 1.05);
      screen(15, ink, (v) => (0.5 - v) * 2, [0.7, -0.45], 1);

      // Paper grain: fine speckle in ink and cream
      const count = Math.round((w * h) / 9);
      for (let i = 0; i < count; i += 1) {
        const x = hash2(i, 11) * w;
        const y = hash2(i, 37) * h;
        const s = hash2(i, 71);
        ctx!.globalAlpha = s > 0.5 ? 0.12 : 0.1;
        ctx!.fillStyle = s > 0.5 ? ink : highlight;
        ctx!.fillRect(x, y, s > 0.92 ? 1.1 : 0.6, s > 0.92 ? 1.1 : 0.6);
      }
      ctx!.globalAlpha = 1;
    }

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => !disposed && paint());
    });

    (async () => {
      display = cssFontVar("--font-display", display);
      try {
        await document.fonts.load(`100px ${display}`);
      } catch {
        /* ignore */
      }
      if (disposed) return;
      paint();
      ro.observe(wrap);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(resizeRaf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, optsKey, field, ink, highlight, pitch]);

  return (
    <div ref={wrapRef} className={className} style={{ position: "absolute", inset: 0, overflow: "hidden" }} aria-hidden="true">
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
