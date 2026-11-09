/**
 * Shared choropleth band helpers — one electric ink; tone from density only.
 * Used by RegionMap and housing AreaMap / legends.
 */

/** Assign a value to a band index from ascending thresholds (null → missing). */
export function band(value: number | null, thresholds: number[]): number | null {
  return value == null ? null : thresholds.filter((t) => value >= t).length;
}

/**
 * Halftone band screen — shared by map fills and legend swatches.
 * 45° screen, same language as chart area fills. Signal = selection mark only.
 */
export const BAND_CELL = 6;
/** Dot radii for bands 0–6 — sparse → near-solid. All `var(--bo-ink)`. */
export const BAND_RADII = [0.7, 1.05, 1.4, 1.8, 2.2, 2.55, 2.9] as const;
