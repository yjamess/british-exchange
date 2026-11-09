"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Lightweight ASCII/Bayer density strip for UI accents (nav rows, marks).
 * Tone comes only from mark density — never opacity. Colour = currentColor.
 * Drive with `progress` (0–1); under prefers-reduced-motion, snaps to 0 or 1.
 *
 * Prefer this over mounting a full DitherField per row.
 */

export type DensityMark = "dots" | "glyphs";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const GLYPHS = " ··:+=*#%@";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function DensityStrip({
  progress,
  mark = "dots",
  pitch = 4,
  className = "",
  style,
  label,
}: {
  /** 0 = empty, 1 = full density. */
  progress: number;
  mark?: DensityMark;
  /** Cell size in CSS px. */
  pitch?: number;
  className?: string;
  style?: CSSProperties;
  /** Decorative by default; set when the strip carries meaning. */
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(1, parent.clientWidth);
      const cssH = Math.max(1, parent.clientHeight);
      const w = Math.round(cssW * dpr);
      const h = Math.round(cssH * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const p = reducedRef.current ? (progress >= 0.5 ? 1 : 0) : clamp01(progress);
      const cell = Math.max(2, pitch) * dpr;
      const cols = Math.max(1, Math.floor(w / cell));
      const rows = Math.max(1, Math.floor(h / cell));
      const color = getComputedStyle(canvas).color || "#0618F5";

      ctx.clearRect(0, 0, w, h);
      if (p <= 0) return;

      ctx.fillStyle = color;

      if (mark === "glyphs") {
        const fontPx = Math.max(8, cell * 0.9);
        ctx.font = `${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            // Left-weighted fill so hover reads as a scan from the rule.
            const nx = x / Math.max(1, cols - 1);
            const local = clamp01((p - nx * 0.85) / 0.35);
            if (local <= 0) continue;
            const gi = Math.min(GLYPHS.length - 1, Math.floor(local * (GLYPHS.length - 1)));
            const ch = GLYPHS[gi]!;
            if (ch === " ") continue;
            ctx.fillText(ch, (x + 0.5) * cell, (y + 0.5) * cell);
          }
        }
        return;
      }

      // Ordered Bayer dots — density rises with progress, left-biased.
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = x / Math.max(1, cols - 1);
          const local = clamp01((p - nx * 0.75) / 0.4);
          if (local <= 0) continue;
          const thr = BAYER[(y % 4) * 4 + (x % 4)]!;
          if (local <= thr) continue;
          const size = cell * (0.35 + 0.45 * local);
          const cx = (x + 0.5) * cell;
          const cy = (y + 0.5) * cell;
          ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [progress, mark, pitch]);

  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
      {...a11y}
    />
  );
}
