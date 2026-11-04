"use client";

/**
 * AsciiField — large, moving character fields shaped by a tonal source.
 *
 * Canvas, not <pre>: a pre-tinted glyph atlas + drawImage per cell keeps
 * ~15k cells at 30fps. Motion layers:
 *   decode   — characters scramble then resolve on first view
 *   flow     — slow value-noise drifts density through the shape
 *   shimmer  — a few cells flick one step up/down the ramp
 *   lens     — pointer pulls density up and tints the core in accent
 * Pauses off-screen; renders a single still frame under reduced motion.
 */

import { useEffect, useRef } from "react";
import { cssFontVar, renderSource, type SourceId, type SourceOptions } from "./lib/sources";

export type Ramp = "density" | "phrase" | "dots" | "blocks";

const RAMPS: Record<Exclude<Ramp, "phrase" | "dots">, string> = {
  density: " .·:-=+*%#@",
  blocks: " ·░▒▓█",
};

type Props = {
  source: SourceId;
  sourceOptions?: SourceOptions;
  ramp?: Ramp;
  /** Repeating text for ramp="phrase". */
  phrase?: string;
  fg: string;
  accent: string;
  bg: string;
  /** Glyph size in CSS px. */
  cell?: number;
  motion?: boolean;
  lens?: boolean;
  /** 0–1: sparse dot texture in empty field. */
  ground?: number;
  /** Ref-3 style inverted tiles near the shape's dense core. */
  invert?: boolean;
  /** Flow amplitude (0–0.5). */
  flow?: number;
  className?: string;
  label?: string;
};

/* ——— Deterministic noise ——— */
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

export function AsciiField({
  source,
  sourceOptions,
  ramp = "density",
  phrase = "BRITAIN EXCHANGE · ",
  fg,
  accent,
  bg,
  cell = 11,
  motion = true,
  lens = true,
  ground = 0,
  invert = false,
  flow = 0.2,
  className,
  label,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optsKey = JSON.stringify(sourceOptions ?? {});

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = motion && !reduce;
    let disposed = false;
    let raf = 0;
    let visible = true;
    let last = 0;
    let start = 0;

    // Layout state
    let dpr = 1;
    let cw = 0;
    let ch = 0;
    let cols = 0;
    let rows = 0;
    let ox = 0;
    let oy = 0;
    let base = new Float32Array(0);
    let seed = new Float32Array(0);
    let chars = "";
    let glyphIndex = new Map<string, number>();
    let atlases: HTMLCanvasElement[] = [];
    const pointer = { x: -1e4, y: -1e4, active: false };

    const rampChars = ramp === "phrase" || ramp === "dots" ? RAMPS.density : RAMPS[ramp];
    let mono = "ui-monospace, monospace";

    function buildAtlas(color: string): HTMLCanvasElement {
      const a = document.createElement("canvas");
      const gw = Math.ceil(cw * dpr);
      const gh = Math.ceil(ch * dpr);
      a.width = gw * chars.length;
      a.height = gh;
      const c = a.getContext("2d")!;
      c.font = `${cell * dpr}px ${mono}`;
      c.textBaseline = "middle";
      c.textAlign = "center";
      c.fillStyle = color;
      for (let i = 0; i < chars.length; i += 1) {
        c.fillText(chars[i]!, i * gw + gw / 2, gh / 2 + dpr * 0.5);
      }
      return a;
    }

    function layout(display: string) {
      const rect = wrap!.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;

      ctx!.font = `${cell}px ${mono}`;
      cw = ctx!.measureText("M").width || cell * 0.6;
      ch = cell * 1.16;
      cols = Math.floor(w / cw);
      rows = Math.floor(h / ch);
      ox = (w - cols * cw) / 2;
      oy = (h - rows * ch) / 2;

      // Sample the tonal source once per layout
      const img = renderSource(source, w, h, { ...sourceOptions, displayFont: display });
      base = new Float32Array(cols * rows);
      seed = new Float32Array(cols * rows);
      const d = img.data;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          // Average a small 2×2 tap for smoother edges
          let acc = 0;
          for (const [fx, fy] of [
            [0.3, 0.3],
            [0.7, 0.3],
            [0.3, 0.7],
            [0.7, 0.7],
          ]) {
            const px = Math.min(img.width - 1, Math.floor(ox + (c + fx!) * cw));
            const py = Math.min(img.height - 1, Math.floor(oy + (r + fy!) * ch));
            const k = (py * img.width + px) * 4;
            acc += (d[k]! / 255) * (d[k + 3]! / 255);
          }
          const i = r * cols + c;
          base[i] = Math.pow(acc / 4, 0.72);
          seed[i] = hash2(c * 13 + 7, r * 29 + 3);
        }
      }

      const set = new Set((rampChars + phrase).split(""));
      chars = [...set].join("");
      glyphIndex = new Map([...chars].map((g, i) => [g, i]));
      atlases = [buildAtlas(fg), buildAtlas(accent), buildAtlas(bg)];
    }

    function draw(now: number) {
      const t = animate ? now / 1000 : 4;
      const p = animate ? Math.min(1, (now - start) / 1600) : 1;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const gw = Math.ceil(cw * dpr);
      const gh = Math.ceil(ch * dpr);
      const n = rampChars.length;
      const pc = (pointer.x - ox) / cw;
      const pr = (pointer.y - oy) / ch;
      const R = 10;
      const aspect = ch / cw;
      const tick = Math.floor(t * 6);
      const plen = phrase.length;

      for (let r = 0; r < rows; r += 1) {
        const y = (oy + r * ch) * dpr;
        for (let c = 0; c < cols; c += 1) {
          const i = r * cols + c;
          const b = base[i]!;
          const s = seed[i]!;
          const x = (ox + c * cw) * dpr;

          // Lens
          let lensK = 0;
          if (lens && pointer.active) {
            const dx = c - pc;
            const dy = (r - pr) * aspect * 0.9;
            const dist = Math.sqrt(dx * dx + dy * dy) / R;
            if (dist < 1) lensK = (1 - dist) * (1 - dist);
          }

          // Empty field
          if (b < 0.03) {
            if (ground > 0) {
              const gn = noise(c * 0.09 + t * 0.04, r * 0.14 - t * 0.02);
              if (s < ground * gn * gn + lensK * 0.25) {
                ctx!.globalAlpha = 0.18 + lensK * 0.5;
                const gi = glyphIndex.get(lensK > 0.3 ? ":" : "·") ?? 0;
                ctx!.drawImage(atlases[0]!, gi * gw, 0, gw, gh, x, y, gw, gh);
              }
            }
            continue;
          }

          // Decode intro: scramble until this cell's reveal threshold
          const thresh = s * 0.65 + (r / rows) * 0.35;
          if (p < thresh) {
            if (s > 0.5) {
              const gi = Math.floor(hash2(i, tick) * n);
              ctx!.globalAlpha = 0.32;
              const gch = rampChars[Math.max(1, gi)]!;
              ctx!.drawImage(atlases[0]!, (glyphIndex.get(gch) ?? 0) * gw, 0, gw, gh, x, y, gw, gh);
            }
            continue;
          }

          // Flow + shimmer
          let v = b;
          if (animate) {
            const nz = noise(c * 0.06 + t * 0.12, r * 0.09 - t * 0.08) * 0.65 + noise(c * 0.21 - t * 0.3, r * 0.27 + t * 0.2) * 0.35;
            v += (nz - 0.5) * flow * 2 * Math.min(1, b * 3);
          }
          v += lensK * 0.55;
          v = Math.max(0, Math.min(0.999, v));

          const useAccent = lensK > 0.45 && b > 0.06;
          // Inverted tiles travel in short horizontal runs (pairs of cells)
          const invertCell = invert && v > 0.7 && noise((c >> 1) * 0.3 + t * 0.45, r * 0.5) > 0.66;

          if (ramp === "dots") {
            const size = Math.sqrt(v) * Math.min(cw, ch) * 0.92 * dpr;
            ctx!.globalAlpha = 0.35 + v * 0.65;
            ctx!.fillStyle = useAccent ? accent : fg;
            ctx!.fillRect(x + (gw - size) / 2, y + (gh - size) / 2, size, size);
            continue;
          }

          let gi: number;
          if (ramp === "phrase") {
            if (v < 0.12) continue;
            const chr = phrase[(r * 7 + c) % plen]!;
            if (chr === " ") continue;
            gi = glyphIndex.get(chr) ?? 0;
            ctx!.globalAlpha = Math.min(1, 0.12 + v * 1.05);
          } else {
            let k = Math.floor(v * n);
            if (animate && hash2(i * 3, tick) < 0.035) k += hash2(i, tick) > 0.5 ? 1 : -1;
            k = Math.max(0, Math.min(n - 1, k));
            if (k === 0) continue;
            gi = glyphIndex.get(rampChars[k]!) ?? 0;
            ctx!.globalAlpha = 0.55 + v * 0.45;
          }

          if (invertCell) {
            ctx!.globalAlpha = 0.92;
            ctx!.fillStyle = fg;
            ctx!.fillRect(x, y, gw, gh);
            ctx!.drawImage(atlases[2]!, gi * gw, 0, gw, gh, x, y, gw, gh);
            continue;
          }
          ctx!.drawImage(atlases[useAccent ? 1 : 0]!, gi * gw, 0, gw, gh, x, y, gw, gh);
        }
      }
      ctx!.globalAlpha = 1;
    }

    function loop(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (now - last < 33) return;
      last = now;
      draw(now);
    }

    let resizeRaf = 0;
    let displayFont = "Georgia, serif";
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (disposed) return;
        layout(displayFont);
        if (!animate) draw(0);
      });
    });
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    });

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
      if (!animate) draw(0);
    };
    const onLeave = () => {
      pointer.active = false;
      if (!animate) draw(0);
    };

    (async () => {
      mono = cssFontVar("--font-mono", mono);
      displayFont = cssFontVar("--font-display", displayFont);
      try {
        await Promise.all([document.fonts.load(`${cell}px ${mono}`), document.fonts.load(`100px ${displayFont}`)]);
      } catch {
        /* fall back to whatever is available */
      }
      if (disposed) return;
      layout(displayFont);
      start = performance.now();
      ro.observe(wrap);
      io.observe(wrap);
      if (lens) {
        wrap.addEventListener("pointermove", onMove);
        wrap.addEventListener("pointerleave", onLeave);
      }
      if (animate) raf = requestAnimationFrame(loop);
      else draw(0);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, optsKey, ramp, phrase, fg, accent, bg, cell, motion, lens, ground, invert, flow]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
    </div>
  );
}
