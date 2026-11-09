import { fbm3 } from "./noise";
import type { FieldFn } from "./DitherField";

/**
 * Light ground — a sparse, slowly drifting dot grain for page backgrounds.
 * Light by density, never opacity: tone is capped at `max`, so at most ~max×16 of every
 * 16 Bayer cells ink (0.2 → about 3 in 16). Decorative only: render aria-hidden, keep copy
 * and charts on solid paper above it. Not a measurement — never label it as data.
 */
export function groundField({
  max = 0.2,
  scale = 0.0035,
  speed = 0.012,
}: {
  /** Highest tone (0–1). Keep ≤ 0.25 for a background. */
  max?: number;
  /** Feature size: smaller = broader, calmer patches. */
  scale?: number;
  /** Drift speed. */
  speed?: number;
} = {}): FieldFn {
  return (t, g) => {
    const tone = new Float32Array(g.cols * g.rows);
    const z = t * speed * 0.8;
    for (let y = 0; y < g.rows; y++) {
      const wy = y * g.ch * scale - t * speed * 0.6;
      for (let x = 0; x < g.cols; x++) {
        const b = fbm3(x * g.cw * scale + t * speed, wy, z); // ~0..0.875
        const v = (b - 0.28) / 0.42;
        tone[y * g.cols + x] = (v <= 0 ? 0 : v >= 1 ? 1 : v) * max;
      }
    }
    return { tone };
  };
}
