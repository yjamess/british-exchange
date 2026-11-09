/**
 * The Changing Appetite — long-run UK final energy demand (ECUK Table C1, 1970–).
 *
 * Two lenses on the same published table:
 *   sector — Industry, Transport, Domestic, Services & other (fuel=Total per sector)
 *   fuel   — carriers within one scope (all final users or one sector), C1 fuel columns grouped
 * Three measures: absolute ktoe, share of the scope total, index on a stated base year.
 *
 * Turning points are of two kinds and say which they are:
 *   from the data — crossovers and the peak, computed from C1 every render (never hard-coded years)
 *   context      — dated events from outside ECUK, shown beside the observed change, never as its cause
 */

import type { Observation } from "@/lib/api";
import { noteMap, type SectorId } from "./consumption-model";

export type AppetiteLens = "sector" | "fuel";
export type AppetiteMeasure = "absolute" | "share" | "index";

/** Screen = dot screen of the colour; hatch = 45° hatching (a colour reused for a related carrier). */
export type Print = "screen" | "hatch";

export type AppetiteSeries = {
  id: string;
  label: string;
  color: string;
  print: Print;
  /** Published C1 fuel columns rolled into this group (fuel lens), for Notes. */
  sources?: string[];
  values: number[];
};

export type AppetiteData = {
  years: number[];
  series: AppetiteSeries[];
  /** Published scope Total (C1 fuel=Total), the denominator for share. */
  total: number[];
  scopeLabel: string;
};

export const APPETITE_SECTORS: { id: Exclude<SectorId, "all-final">; label: string; color: string }[] = [
  { id: "industry", label: "Industry", color: "var(--bo-chart-3)" },
  { id: "transport", label: "Transport", color: "var(--bo-chart-2)" },
  { id: "domestic", label: "Domestic", color: "var(--bo-chart-1)" },
  { id: "services", label: "Services & other", color: "var(--bo-chart-4)" },
];

export const SCOPE_LABEL: Record<SectorId, string> = {
  "all-final": "All final users",
  industry: "Industry",
  transport: "Transport",
  domestic: "Domestic",
  services: "Services & other",
};

/**
 * Fuel groups. Seven carriers, five chart colours: manufactured gas reuses plum (coal-derived, like
 * solid fuels) and heat reuses Union, both hatched so they never read as the same carrier.
 */
export const FUEL_GROUPS: { id: string; label: string; color: string; print: Print; match: (fuel: string) => boolean }[] = [
  { id: "petroleum", label: "Petroleum", color: "var(--bo-chart-2)", print: "screen", match: (f) => /petroleum/i.test(f) },
  { id: "natural-gas", label: "Natural gas", color: "var(--bo-chart-3)", print: "screen", match: (f) => /natural gas/i.test(f) },
  { id: "electricity", label: "Electricity", color: "var(--bo-chart-1)", print: "screen", match: (f) => /electricity/i.test(f) },
  {
    id: "solid",
    label: "Coal & solid fuels",
    color: "var(--bo-chart-5)",
    print: "screen",
    match: (f) => /(^|- )coal$|^coal$|coke and breeze|other solid fuels/i.test(f),
  },
  { id: "manufactured-gas", label: "Town & coke oven gas", color: "var(--bo-chart-5)", print: "hatch", match: (f) => /town gas|coke oven gas/i.test(f) },
  { id: "bioenergy", label: "Bioenergy & waste", color: "var(--bo-chart-4)", print: "screen", match: (f) => /bioenergy/i.test(f) },
  { id: "heat", label: "Heat sold", color: "var(--bo-chart-3)", print: "hatch", match: (f) => /^heat$/i.test(f) },
];

type Cell = { sector: string; fuel: string; year: number; v: number };

function cells(rows: Observation[]): Cell[] {
  const out: Cell[] = [];
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    const n = noteMap(r.notes);
    if (!n.sector || !n.fuel) continue;
    out.push({ sector: n.sector, fuel: n.fuel, year: Number(r.period_start.slice(0, 4)), v: r.value as number });
  }
  return out;
}

/** Absolute ktoe for the chosen lens and scope. Sector lens always uses all final users. */
export function appetiteData(rows: Observation[], lens: AppetiteLens, scope: SectorId): AppetiteData {
  const all = cells(rows);
  const years = [...new Set(all.map((c) => c.year))].sort((a, b) => a - b);
  const at = new Map(years.map((y, i) => [y, i]));
  const zero = () => years.map(() => 0);

  const scopeId: SectorId = lens === "sector" ? "all-final" : scope;
  const total = zero();
  for (const c of all) if (c.sector === scopeId && c.fuel === "Total") total[at.get(c.year)!] = c.v;

  if (lens === "sector") {
    const series = APPETITE_SECTORS.map((s) => {
      const values = zero();
      for (const c of all) if (c.sector === s.id && c.fuel === "Total") values[at.get(c.year)!] = c.v;
      return { id: s.id, label: s.label, color: s.color, print: "screen" as Print, values };
    });
    return { years, series, total, scopeLabel: SCOPE_LABEL["all-final"] };
  }

  const series = FUEL_GROUPS.map((g) => ({ id: g.id, label: g.label, color: g.color, print: g.print, sources: [] as string[], values: zero() }));
  for (const c of all) {
    if (c.sector !== scopeId || c.fuel === "Total") continue;
    const i = FUEL_GROUPS.findIndex((g) => g.match(c.fuel));
    if (i < 0) continue;
    series[i]!.values[at.get(c.year)!]! += c.v;
    if (!series[i]!.sources.includes(c.fuel)) series[i]!.sources.push(c.fuel);
  }
  return {
    years,
    series: series.filter((s) => s.values.some((v) => v > 0)),
    total,
    scopeLabel: SCOPE_LABEL[scopeId],
  };
}

/** Value of one series in one year under a measure. */
export function measured(d: AppetiteData, s: AppetiteSeries, i: number, measure: AppetiteMeasure, baseIndex: number): number {
  const v = s.values[i] ?? 0;
  if (measure === "share") return d.total[i] ? (v / d.total[i]!) * 100 : 0;
  if (measure === "index") {
    const b = s.values[baseIndex] ?? 0;
    return b > 0 ? (v / b) * 100 : NaN; // a carrier absent in the base year has no index
  }
  return v;
}

export function fmtKtoe(v: number): string {
  const a = Math.abs(v);
  if (a >= 10000) return `${(v / 1000).toFixed(1)} Mtoe`;
  return `${Math.round(v).toLocaleString("en-GB")} ktoe`;
}

export function fmtMeasure(measure: AppetiteMeasure): (v: number) => string {
  if (measure === "share") return (v) => `${v.toFixed(1)}%`;
  if (measure === "index") return (v) => (Number.isFinite(v) ? v.toFixed(0) : "—");
  return fmtKtoe;
}

/* ——— Turning points ——— */

export type TurningKind = "Efficiency" | "Structure" | "Disruption" | "Technology";

export type TurningPoint = {
  year: number;
  kind: TurningKind;
  title: string;
  /** Context from outside ECUK. Absent for points computed from the data. */
  context?: string;
  /** "data" = computed from C1; "context" = dated outside event placed beside the observation. */
  basis: "data" | "context";
};

/** Dated outside events. Wording places them beside the data; it never says they caused a change. */
const CONTEXT: TurningPoint[] = [
  { year: 1974, kind: "Disruption", basis: "context", title: "First oil shock", context: "OPEC oil embargo from October 1973; crude prices roughly quadrupled." },
  { year: 1980, kind: "Disruption", basis: "context", title: "Second oil shock and recession", context: "Oil prices rose sharply after the 1979 Iranian revolution; UK recession 1980–81." },
  { year: 1984, kind: "Disruption", basis: "context", title: "Miners' strike", context: "National coal strike, March 1984 to March 1985." },
  { year: 2002, kind: "Efficiency", basis: "context", title: "Energy Efficiency Commitment", context: "Supplier obligation to install household efficiency measures, from April 2002." },
  { year: 2005, kind: "Efficiency", basis: "context", title: "Condensing boilers required", context: "Most new and replacement gas boilers in England and Wales had to be condensing from April 2005." },
  { year: 2009, kind: "Disruption", basis: "context", title: "Financial crisis recession", context: "UK recession from 2008 into 2009." },
  { year: 2020, kind: "Disruption", basis: "context", title: "COVID-19 restrictions", context: "First national lockdown from 23 March 2020." },
  { year: 2022, kind: "Disruption", basis: "context", title: "Energy price crisis", context: "Wholesale gas prices surged after Russia's invasion of Ukraine in February 2022." },
];

/** Crossovers and the peak, computed from all-final C1 data so they move if the release revises. */
function fromData(rows: Observation[]): TurningPoint[] {
  const out: TurningPoint[] = [];
  const sectors = appetiteData(rows, "sector", "all-final");
  const fuels = appetiteData(rows, "fuel", "all-final");
  const { years } = sectors;
  if (!years.length) return out;

  // Largest final user changes hands.
  let lead = "";
  years.forEach((y, i) => {
    const top = sectors.series.reduce((a, b) => ((b.values[i] ?? 0) > (a.values[i] ?? 0) ? b : a));
    if (lead && top.id !== lead) out.push({ year: y, kind: "Structure", basis: "data", title: `${top.label} becomes the largest final user` });
    lead = top.id;
  });

  // First year one carrier passes another (only pairs that tell the demand story).
  const pass = (a: string, b: string, title: string, kind: TurningKind) => {
    const A = fuels.series.find((s) => s.id === a);
    const B = fuels.series.find((s) => s.id === b);
    if (!A || !B) return;
    const i = years.findIndex((_, k) => (A.values[k] ?? 0) > (B.values[k] ?? 0) && (k === 0 || (A.values[k - 1] ?? 0) <= (B.values[k - 1] ?? 0)));
    if (i > 0) out.push({ year: years[i]!, kind, basis: "data", title });
  };
  pass("natural-gas", "manufactured-gas", "Natural gas passes town gas", "Technology");
  pass("natural-gas", "solid", "Natural gas passes coal & solid fuels", "Technology");
  pass("electricity", "solid", "Electricity passes coal & solid fuels", "Technology");

  // Peak final demand.
  const peak = years.reduce((best, y, i) => ((sectors.total[i] ?? 0) > (sectors.total[years.indexOf(best)] ?? 0) ? y : best), years[0]!);
  out.push({ year: peak, kind: "Structure", basis: "data", title: "Final energy demand peaks" });

  return out;
}

export function turningPoints(rows: Observation[]): TurningPoint[] {
  const years = new Set(appetiteData(rows, "sector", "all-final").years);
  return [...fromData(rows), ...CONTEXT.filter((c) => years.has(c.year))].sort((a, b) => a.year - b.year || (a.basis === "data" ? -1 : 1));
}
