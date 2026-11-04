/**
 * Brand data helpers — shared by charts and figures (client-safe).
 * Time is a fractional year: 2026-08 → 2026 + 7/12.
 */

export type Pt = { t: number; v: number; provisional?: boolean };

export type Series = {
  id: string;
  label: string;
  points: Pt[];
  /** primary = ink · signal = the one highlight · context = ink tint */
  role?: "primary" | "signal" | "context";
};

export const toT = (iso: string): number => {
  const [y, m] = iso.split("-").map(Number);
  return (y ?? 0) + ((m ?? 1) - 1) / 12;
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2026.583 → "Aug 2026" (monthly) or "2026" (annual) */
export function fmtT(t: number, cadence: "monthly" | "quarterly" | "annual" = "monthly"): string {
  const y = Math.floor(t + 1e-6);
  const m = Math.round((t - y) * 12);
  if (cadence === "annual") return String(y);
  if (cadence === "quarterly") return `Q${Math.floor(m / 3) + 1} ${y}`;
  return `${MONTHS[m] ?? ""} ${y}`;
}

/* ——— Number formats: unit-aware, never raw floats ——— */
export const fmt = {
  gbp(v: number): string {
    return `£${Math.round(v).toLocaleString("en-GB")}`;
  },
  gbpCompact(v: number): string {
    if (Math.abs(v) >= 1e6) return `£${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}m`;
    if (Math.abs(v) >= 1e3) return `£${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1).replace(/\.0$/, "")}k`;
    return `£${Math.round(v)}`;
  },
  pct(v: number, dp = 1): string {
    return `${v.toFixed(dp)}%`;
  },
  pctSigned(v: number, dp = 1): string {
    return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}%`;
  },
  ratio(v: number): string {
    return `${v.toFixed(1)}×`;
  },
  count(v: number): string {
    return Math.round(v).toLocaleString("en-GB");
  },
  countCompact(v: number): string {
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}m`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
    return String(Math.round(v));
  },
};

/** Value `months` earlier on a monthly series (exact month match). */
export function valueAgo(points: Pt[], months: number): Pt | null {
  const last = points[points.length - 1];
  if (!last) return null;
  const target = last.t - months / 12;
  return points.find((p) => Math.abs(p.t - target) < 1 / 48) ?? null;
}

export function changePct(points: Pt[], months: number): number | null {
  const last = points[points.length - 1];
  const prev = valueAgo(points, months);
  if (!last || !prev || prev.v === 0) return null;
  return (last.v / prev.v - 1) * 100;
}

/** "Nice" axis ticks (1, 2, 2.5, 5 × 10ⁿ). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min];
  const span = max - min;
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/** Year ticks at a sensible stride for the span. */
export function yearTicks(t0: number, t1: number, maxTicks = 8): number[] {
  const span = t1 - t0;
  const stride = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= maxTicks) ?? 100;
  const out: number[] = [];
  for (let y = Math.ceil(t0 / stride) * stride; y <= t1; y += stride) out.push(y);
  return out;
}

export function extent(values: number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

/** Nearest point by time. */
export function nearest(points: Pt[], t: number): Pt | null {
  let best: Pt | null = null;
  let d = Infinity;
  for (const p of points) {
    const dd = Math.abs(p.t - t);
    if (dd < d) {
      d = dd;
      best = p;
    }
  }
  return best;
}
