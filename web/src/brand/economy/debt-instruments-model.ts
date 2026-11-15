/**
 * Domain 08 · debt instruments — Anatomy, Who owns the debt, Repayment calendar.
 *
 * Approach: each Ready pack is a flat list of observations whose meaning lives in the
 * `notes` string (`key=value; key=value`) and, from the API, in `dimensions.series`.
 * These helpers read those fields once and return plain, typed rows for the charts.
 *
 * Four different measures live here and must never be added together:
 *   A. DMO debt portfolio — uplifted nominal (face value including index-linked uplift)
 *   B. ONS gilt holdings by sector — market value
 *   C. DMO D8B redemptions — net of government holdings
 *   D. Public sector net debt (HF6W) — lives in debt-model.ts, never mixed with A–C
 *
 * Best practice: keep parsing in one tested place, not in the component
 * (https://docs.python.org/3/howto/regex.html — same idea as the Python connectors).
 */

import type { Observation } from "@/lib/api";
import { fmtT, toT, type Pt } from "../data";
import { finalObs } from "./debt-model";

/** Read `key=value` from a notes string (`; `-separated). */
export function noteField(notes: string, key: string): string | null {
  const m = notes.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return m?.[1]?.trim() ?? null;
}

/** `series` from the API dimensions, falling back to the notes. */
export function seriesOf(row: Observation): string {
  return row.dimensions?.series || noteField(row.notes ?? "", "series") || "";
}

function hasValue(r: Observation): r is Observation & { value: number } {
  return r.value != null && Number.isFinite(r.value);
}

/** ISO date → "Q3 2025". Works for quarter starts (07-01) and quarter ends (09-30). */
export function labelQuarterIso(iso: string): string {
  return fmtT(toT(iso), "quarterly");
}

/** ISO date → "13 Nov 2026". */
export function labelDateIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "£2,731bn" for large stocks, "£89.5bn" for small ones. Input already in £ billion. */
export function fmtBn(v: number): string {
  const abs = Math.abs(v);
  return abs >= 100 ? `£${Math.round(v).toLocaleString("en-GB")}bn` : `£${v.toFixed(1)}bn`;
}

/** Input in £ million → "£152.3bn". */
export function fmtMillionAsBn(v: number): string {
  return fmtBn(v / 1000);
}

export function fmtSharePct(v: number): string {
  return `${v.toFixed(1)}%`;
}

/* ——— A. Anatomy · DMO debt portfolio ——— */

export type PortfolioBasis = "net" | "gross";

export const PORTFOLIO_BASIS_OPTIONS: { value: PortfolioBasis; label: string }[] = [
  { value: "net", label: "Held outside government" },
  { value: "gross", label: "All in issue" },
];

export function asPortfolioBasis(raw: string | null): PortfolioBasis {
  return raw === "gross" ? "gross" : "net";
}

export const PORTFOLIO_PARTS = [
  { id: "conventional-gilts", label: "Conventional gilts" },
  { id: "index-linked-gilts", label: "Index-linked gilts" },
  { id: "treasury-bills", label: "Treasury bills" },
] as const;

export type PortfolioPart = {
  id: string;
  label: string;
  /** £ billion, uplifted nominal. */
  value: number;
  /** Share of the published portfolio total. */
  sharePct: number;
};

/** Final uplifted-nominal rows only — market-value rows in the same pack are not used here. */
function upliftedRows(rows: Observation[]): (Observation & { value: number })[] {
  return finalObs(rows)
    .filter((r) => noteField(r.notes ?? "", "valuation") === "uplifted-nominal")
    .filter(hasValue);
}

/** Distinct quarter ends, oldest first. */
export function portfolioPeriods(rows: Observation[]): string[] {
  return [...new Set(upliftedRows(rows).map((r) => r.period_start))].sort();
}

function portfolioValue(
  rows: (Observation & { value: number })[],
  period: string,
  basis: PortfolioBasis,
  instrument: string,
): number | null {
  const hit = rows.find(
    (r) =>
      r.period_start === period &&
      noteField(r.notes ?? "", "basis") === basis &&
      noteField(r.notes ?? "", "instrument") === instrument,
  );
  return hit ? hit.value : null;
}

export function portfolioSlice(
  rows: Observation[],
  period: string,
  basis: PortfolioBasis,
): { total: number | null; parts: PortfolioPart[] } {
  const ok = upliftedRows(rows);
  const total = portfolioValue(ok, period, basis, "total");
  const parts: PortfolioPart[] = [];
  for (const p of PORTFOLIO_PARTS) {
    const value = portfolioValue(ok, period, basis, p.id);
    if (value == null) continue;
    parts.push({
      id: p.id,
      label: p.label,
      value,
      sharePct: total ? (value / total) * 100 : 0,
    });
  }
  return { total, parts };
}

/** One line per instrument across quarters (feeds the stacked composition chart). */
export function portfolioSeries(
  rows: Observation[],
  basis: PortfolioBasis,
): { id: string; label: string; points: Pt[] }[] {
  const ok = upliftedRows(rows);
  const periods = portfolioPeriods(rows);
  return PORTFOLIO_PARTS.map((p) => ({
    id: p.id,
    label: p.label,
    points: periods.flatMap((period) => {
      const v = portfolioValue(ok, period, basis, p.id);
      return v == null ? [] : [{ t: toT(period), v }];
    }),
  })).filter((s) => s.points.length > 0);
}

/* ——— A. Anatomy detail · DMO gilts in issue (D1A) ——— */

const BAND_LABEL: Record<string, string> = {
  "ultra-short": "Conventional · ultra-short",
  short: "Conventional · short",
  medium: "Conventional · medium",
  long: "Conventional · long",
};

export type GiltBand = { id: string; label: string; v: number; count: number };

/**
 * Gilts in issue as one snapshot: conventional gilts by DMO maturity band (nominal) and
 * index-linked gilts (nominal including inflation uplift). £ billion.
 */
export function giltBands(rows: Observation[]): {
  asOf: string | null;
  totalBn: number | null;
  bands: GiltBand[];
} {
  const ok = finalObs(rows).filter(hasValue);
  if (!ok.length) return { asOf: null, totalBn: null, bands: [] };
  const acc = new Map<string, { v: number; count: number }>();
  const add = (id: string, v: number) => {
    const cur = acc.get(id) ?? { v: 0, count: 0 };
    acc.set(id, { v: cur.v + v, count: cur.count + 1 });
  };
  for (const r of ok) {
    const notes = r.notes ?? "";
    const kind = noteField(notes, "kind");
    const series = seriesOf(r);
    if (kind === "conventional" && series === "nominal") {
      const bucket = noteField(notes, "bucket");
      if (bucket && BAND_LABEL[bucket]) add(bucket, r.value / 1000);
    } else if (kind === "index_linked" && series === "uplifted_nominal") {
      add("index-linked", r.value / 1000);
    }
  }
  const order = ["ultra-short", "short", "medium", "long", "index-linked"];
  const bands: GiltBand[] = order
    .filter((id) => acc.has(id))
    .map((id) => ({
      id,
      label: id === "index-linked" ? "Index-linked gilts" : BAND_LABEL[id]!,
      v: acc.get(id)!.v,
      count: acc.get(id)!.count,
    }));
  const totalBn = bands.reduce((sum, b) => sum + b.v, 0);
  return { asOf: ok[0]!.period_start, totalBn: bands.length ? totalBn : null, bands };
}

/* ——— B. Who owns the debt · ONS sector gilt holdings (market value) ——— */

/** The published sector names are long; shorten two for the name column, keep the rest as published. */
const SECTOR_LABEL: Record<string, string> = {
  "other-financial-pnfc": "Other financial and non-financial companies",
  "households-npish": "Households and non-profit bodies",
  "bank-of-england-apf": "Bank of England (asset purchase facility)",
};

export type OwnershipPeriod = { period: string; provisional: boolean };

export type OwnerRow = {
  id: string;
  label: string;
  /** £ million, market value. */
  value: number;
  sharePct: number;
};

function ownershipRows(rows: Observation[]): (Observation & { value: number })[] {
  return rows.filter(hasValue);
}

/** Every quarter in the pack, oldest first. A quarter is provisional if any of its rows is. */
export function ownershipPeriods(rows: Observation[]): OwnershipPeriod[] {
  const byPeriod = new Map<string, boolean>();
  for (const r of ownershipRows(rows)) {
    byPeriod.set(r.period_start, (byPeriod.get(r.period_start) ?? false) || r.observation_status !== "final");
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, provisional]) => ({ period, provisional }));
}

/** Sector rows for one quarter, largest first. The published total is kept apart — never a bar. */
export function ownershipSlice(
  rows: Observation[],
  period: string,
): { total: number | null; sectors: OwnerRow[] } {
  const at = ownershipRows(rows).filter((r) => r.period_start === period);
  const total = at.find((r) => seriesOf(r) === "total")?.value ?? null;
  const sectors: OwnerRow[] = [];
  for (const r of at) {
    const id = seriesOf(r);
    if (!id || id === "total") continue;
    sectors.push({
      id,
      label: SECTOR_LABEL[id] ?? noteField(r.notes ?? "", "sector_label") ?? id,
      value: r.value,
      sharePct: total ? (r.value / total) * 100 : 0,
    });
  }
  sectors.sort((a, b) => b.value - a.value);
  return { total, sectors };
}

/** Share of the total, from one quarter to another, for every sector present in both. */
export function ownershipShareChange(
  rows: Observation[],
  from: string,
  to: string,
): { id: string; label: string; from: number; to: number }[] {
  const a = ownershipSlice(rows, from);
  const b = ownershipSlice(rows, to);
  return b.sectors.flatMap((s) => {
    const prev = a.sectors.find((x) => x.id === s.id);
    return prev ? [{ id: s.id, label: s.label, from: prev.sharePct, to: s.sharePct }] : [];
  });
}

/* ——— C. Repayment calendar · DMO D8B future redemptions ——— */

export type RedemptionKind = "conventional" | "index_linked" | "total";

/**
 * Financial-year points for one redemption kind, £ million.
 * D8B is a living profile and every row is published as provisional, so provisional
 * points are kept (the chart draws them dotted) instead of being filtered away.
 */
export function redemptionPoints(rows: Observation[], kind: RedemptionKind): Pt[] {
  return rows
    .filter(hasValue)
    .filter((r) => seriesOf(r) === kind)
    .map((r) => ({ t: toT(r.period_start), v: r.value, provisional: r.observation_status !== "final" }))
    .sort((a, b) => a.t - b.t);
}

export type RedemptionReading = {
  firstFy: Pt | null;
  /** Sum of the first five financial years (Exchange-derived). */
  nextFiveSum: number | null;
  nextFiveFrom: number | null;
  nextFiveTo: number | null;
};

export function redemptionReading(total: Pt[]): RedemptionReading {
  if (!total.length) {
    return { firstFy: null, nextFiveSum: null, nextFiveFrom: null, nextFiveTo: null };
  }
  const five = total.slice(0, 5);
  const contiguous = five.length === 5 && five.every((p, i) => i === 0 || Math.abs(p.t - five[i - 1]!.t - 1) < 0.01);
  return {
    firstFy: total[0]!,
    nextFiveSum: contiguous ? five.reduce((s, p) => s + p.v, 0) : null,
    nextFiveFrom: contiguous ? five[0]!.t : null,
    nextFiveTo: contiguous ? five[4]!.t : null,
  };
}

/** The financial year as published: "2027–28". `t` is the 1 April the year starts. */
export function fyLabel(t: number): string {
  const y = Math.floor(t + 1e-6);
  return `${y}–${String((y + 1) % 100).padStart(2, "0")}`;
}

/* ——— Official holdings (Data tab only) ——— */

/** Month rows for CRND + DMO holdings, final only: month → { conventional, index-linked, total } in £m. */
export function holdingsByMonth(
  rows: Observation[],
): { period: string; conventional: number | null; indexLinked: number | null; total: number | null }[] {
  const months = new Map<string, { conventional: number | null; indexLinked: number | null; total: number | null }>();
  for (const r of finalObs(rows)) {
    const cur = months.get(r.period_start) ?? { conventional: null, indexLinked: null, total: null };
    const s = seriesOf(r);
    if (s === "conventional") cur.conventional = r.value;
    else if (s === "index-linked") cur.indexLinked = r.value;
    else if (s === "total") cur.total = r.value;
    months.set(r.period_start, cur);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([period, v]) => ({ period, ...v }));
}
