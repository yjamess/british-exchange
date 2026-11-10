/**
 * Shared choropleth band helpers — one electric ink; tone from density only.
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
