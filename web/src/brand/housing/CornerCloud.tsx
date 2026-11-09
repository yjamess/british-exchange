"use client";

import { DitherField, type FieldFn } from "../motion";
import { fbm3 } from "../motion/noise";
import s from "./cornerCloud.module.css";

/**
 * Corner cloud — the ASCII dither cloud in mustard, bottom right of the explorer canvas,
 * behind the content (chart frame and controls stay on solid paper above it).
 * Each cycle a new cloud gathers in patches, drifts and reshapes, then breaks up again.
 * Fades are density only (cells drop out in noise order), never opacity.
 */

const CYCLE = 16; // seconds per cloud
const IN = 4.5; // gather
const OUT = 4.5; // break up
const DRIFT = 0.55; // field time per second: slow, continuous reshaping
const GAIN = 1.45; // denser ink: lifts mid-tones so the body of the cloud fills in

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Dissolve order per cell: low-frequency noise so cells leave and arrive in patches. */
let order: { cols: number; rows: number; s: Float32Array } | null = null;
function dissolveOrder(cols: number, rows: number, cw: number, ch: number): Float32Array {
  if (order && order.cols === cols && order.rows === rows) return order.s;
  const a = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) a[y * cols + x] = clamp01((fbm3(x * cw * 0.02 + 40, y * ch * 0.02 + 11, 3.3) - 0.25) / 0.45);
  order = { cols, rows, s: a };
  return a;
}

const breathingCloud: FieldFn = (t, g, mark) => {
  const cycle = Math.floor(t / CYCLE);
  const lt = t - cycle * CYCLE;
  // a different cloud each cycle, drifting slowly so frames change little from one to the next
  const ft = t * DRIFT + cycle * 37;
  const tone = new Float32Array(g.cols * g.rows);
  const kin = smooth(clamp01(lt / IN));
  const kout = smooth(clamp01((lt - (CYCLE - OUT)) / OUT));
  const sOrder = dissolveOrder(g.cols, g.rows, g.cw, g.ch);
  for (let y = 0; y < g.rows; y++) {
    const fy = y / Math.max(1, g.rows - 1); // 0 top → 1 bottom
    for (let x = 0; x < g.cols; x++) {
      const i = y * g.cols + x;
      const fx = x / Math.max(1, g.cols - 1); // 0 left → 1 right
      // anchored in the bottom-right corner: dense there, thinning toward the top-left
      const dx = 1 - fx;
      const dy = 1 - fy;
      const corner = smooth(clamp01((1 - Math.sqrt(dx * dx + dy * dy)) * 1.8));
      if (corner <= 0) continue;
      const sc = sOrder[i];
      // wide, eased dissolve bands so patches thin out gradually rather than pop
      const env = Math.min(smooth(clamp01(kin * 2 - (1 - sc))), smooth(clamp01((1 - kout) * 2 - sc)));
      if (env <= 0) continue;
      // the shared cloud field (domain-warped fbm), computed only where it can show
      const wx = x * g.cw * 0.0075;
      const wy = y * g.ch * 0.0075;
      const warp = fbm3(wx * 0.6 + ft * 0.03, wy * 0.6, ft * 0.02) * 2.2;
      const b = fbm3(wx + warp + ft * 0.05, wy - ft * 0.02, ft * 0.04);
      const base = mark === "dots" ? clamp01((b - 0.38) / 0.3) : clamp01((b - 0.4) / 0.34) ** 1.5;
      tone[i] = clamp01(base * GAIN) * corner * env;
    }
  }
  return { tone };
};

export function CornerCloud({ className = "" }: { className?: string }) {
  return (
    <div className={`${s.corner} ${className}`} data-corner-cloud="" aria-hidden>
      <DitherField field={breathingCloud} pitch={3} lens={false} />
    </div>
  );
}
