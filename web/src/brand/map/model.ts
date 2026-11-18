/**
 * Shared choropleth band helpers — one electric ink; stepped solid tones (see TONE_STEPS).
 * Used by RegionMap, WorldChoropleth, MapLegend, and housing AreaMap.
 */

/** Assign a value to a band index from ascending thresholds (null → missing). */
export function band(value: number | null, thresholds: number[]): number | null {
  return value == null ? null : thresholds.filter((t) => value >= t).length;
}

/**
 * Six equal breaks across the observed range → seven density bands (BAND_RADII).
 * Same binning RegionMap / WorldChoropleth use for fills and MapLegend labels.
 */
export function equalBreaks(values: number[]): number[] {
  if (values.length === 0) return [0, 1, 2, 3, 4, 5];
  const sorted = [...values].sort((a, b) => a - b);
  const lo = sorted[0]!;
  const hi = sorted[sorted.length - 1]!;
  if (hi <= lo) return [lo, lo, lo, lo, lo, lo];
  const step = (hi - lo) / 6;
  return Array.from({ length: 6 }, (_, i) => lo + step * (i + 1));
}

/**
 * Halftone band screen — shared by map fills and legend swatches.
 * 45° screen, same language as chart area fills.
 */
export const BAND_CELL = 6;
/** Dot radii for bands 0–6 — sparse → near-solid. All `var(--bo-ink)`. */
export const BAND_RADII = [0.7, 1.05, 1.4, 1.8, 2.2, 2.55, 2.9] as const;

/**
 * Map fills (v1.1, owner-approved 2026-11-17): seven **stepped solid tones**, paper → ink.
 * Solid mixes of the one ink toward paper — not opacity, not a second hue. Same family as the
 * stepped tones in two-way grids (WhoCanAfford). Dark steps (≥ 4) carry paper type.
 * BAND_RADII / BAND_CELL stay exported for any non-map screen that still needs dots.
 */
export const TONE_STEPS = [0.07, 0.17, 0.3, 0.45, 0.6, 0.78, 1] as const;

/** CSS colour for a band (`--bo-tone-0…6` in brand.css) — SVG fills and legend swatches. */
export function toneColor(bandIndex: number): string {
  return `var(--bo-tone-${Math.max(0, Math.min(TONE_STEPS.length - 1, bandIndex))})`;
}

/** Band index at which a label on the fill should print in paper. */
export const TONE_DARK_FROM = 4;
