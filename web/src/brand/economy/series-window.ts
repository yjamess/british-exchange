/**
 * Window TimeChart points from a calendar year (Generation / Wages pattern).
 * Use in outer ControlRow "From" menus — never invent years the series does not hold.
 */

export type ChartPt = { t: number; v: number };

/** Points from the first month/quarter of `fromYear` onwards (inclusive). */
export function pointsFrom<T extends ChartPt>(points: T[], fromYear: number): T[] {
  return points.filter((p) => p.t >= fromYear);
}

/** Calendar years covered by a series, ascending. */
export function seriesYears(points: ChartPt[]): number[] {
  const years = new Set<number>();
  for (const p of points) years.add(Math.floor(p.t));
  return [...years].sort((a, b) => a - b);
}

/** Menu options for a From-year control (drop the last year so the window has room to run). */
export function fromYearOptions(points: ChartPt[]): { value: string; label: string }[] {
  const years = seriesYears(points);
  const usable = years.length > 1 ? years.slice(0, -1) : years;
  return usable.map((y) => ({ value: String(y), label: String(y) }));
}

/** Coerce a raw URL year against available From options; default = earliest. */
export function coerceFromYear(raw: string | null | undefined, points: ChartPt[]): number {
  const opts = fromYearOptions(points);
  if (!opts.length) return Math.floor(points[0]?.t ?? 2000);
  const n = Number(raw);
  if (opts.some((o) => o.value === String(n))) return n;
  return Number(opts[0]!.value);
}
