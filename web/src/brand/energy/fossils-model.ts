/**
 * Domain 04 — Oil, Gas & Fossil Fuels helpers (client-safe).
 * Oil and coal stay in million tonnes. Gas is shown in bcm for a public reader
 * (DESNZ publishes national gas as GWh; fields as thousand m³). Primary energy
 * and trade stay in Mtoe — that is energy content, not gas volume.
 * NSTA field maps and PPRS are separate — never sum incomplete fields into DESNZ totals.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import type { Pt } from "../data";

export const CRUDE_OIL_ID = "crude-oil-production";
export const DOMESTIC_GAS_ID = "domestic-gas-production";
export const PRIMARY_PRODUCTION_ID = "primary-energy-production";
export const HISTORICAL_COAL_ID = "historical-coal-production";
export const NSTA_FIELDS_ID = "nsta-ukcs-fields";
export const NSTA_LICENCES_ID = "nsta-ukcs-licences";
export const NSTA_FIELD_PRODUCTION_ID = "nsta-field-production";
export const UK_RESERVES_ID = "uk-oil-gas-reserves";
export const OIL_IMPORTS_ID = "oil-imports-by-country";
export const IMPORTS_EXPORTS_ID = "energy-imports-and-exports";
export const IMPORT_DEPENDENCY_ID = "energy-import-dependency";

/** Fossil fuel bands on primary energy (Mtoe). Petroleum ≠ crude Mt; Natural gas Mtoe ≠ gas bcm. */
export const FOSSIL_PRIMARY_FUELS = ["Coal", "Petroleum", "Natural gas"] as const;
export type FossilPrimaryFuel = (typeof FOSSIL_PRIMARY_FUELS)[number];

/**
 * Plain labels for the oil-equivalent chart (publisher still uses Petroleum / Natural gas in notes).
 * ET 1.1 "Petroleum" production is crude oil and NGLs (natural gas liquids), not refined oil products.
 */
export const FOSSIL_PRIMARY_LABEL: Record<FossilPrimaryFuel, string> = {
  Coal: "Coal",
  Petroleum: "Crude oil and NGLs",
  "Natural gas": "Gas",
};

/**
 * Approximate DESNZ gross calorific conversion: ~11.0 kWh per m³ → 11 000 GWh per bcm.
 * Used only to show national gas beside field gas in one unit. Notes must say so.
 * @see https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes
 */
export const GAS_GWH_PER_BCM = 11_000;

/** National monthly GWh → bcm for display. */
export function gwhToBcm(gwh: number): number {
  return gwh / GAS_GWH_PER_BCM;
}

/** Field gas thousand m³ (ksm³) → bcm. */
export function ksm3ToBcm(ksm3: number): number {
  return ksm3 / 1_000_000;
}

export type SeriesPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  sourceVersion: string;
  retrievedNote: string;
};

export type FieldPoint = {
  id: string;
  name: string;
  nameShort: string;
  fieldType: string;
  status: string;
  operator: string;
  licence: string;
  discYear: number | null;
  prodYear: number | null;
  lon: number;
  lat: number;
};

export type FieldAnnual = {
  fieldName: string;
  year: number;
  oilTonnes: number;
  gasToPipelineKsm3: number;
  dryGasKsm3: number;
  associatedGasKsm3: number;
  condensateTonnes: number;
  months: number;
  location: string;
  region: string;
};

export type FossilsPack = {
  crude: SeriesPack | null;
  gas: SeriesPack | null;
  primary: SeriesPack | null;
  coal: SeriesPack | null;
  fields: FieldPoint[];
  fieldProduction: FieldAnnual[];
  fieldProductionNational: SeriesPack | null;
  reserves: SeriesPack | null;
  oilImports: SeriesPack | null;
  trade: SeriesPack | null;
  dependency: SeriesPack | null;
  /** GB land outline for the field map (same path as the station atlas). */
  outline?: string;
  outlineAttribution?: string;
  attribution: string;
};

export function noteMap(notes: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (notes ?? "").split(";")) {
    const t = part.trim();
    const i = t.indexOf("=");
    if (i <= 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

export function yearsOf(rows: Observation[]): number[] {
  return [
    ...new Set(rows.map((r) => Number(r.period_start.slice(0, 4))).filter((y) => Number.isFinite(y))),
  ].sort((a, b) => a - b);
}

/** Indigenous crude Total (one row per year) → Mt line. */
export function crudeOilSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "crude-indigenous-total",
    label: "UK crude oil",
    points: sorted
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: Number(r.period_start.slice(0, 4)),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function crudeValueInYear(rows: Observation[], year: number): number | null {
  const row = rows.find((r) => r.period_start.startsWith(String(year)) && r.value != null);
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

export function coalMtSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const sorted = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: "historical-coal-mt",
    label: "UK coal",
    points: sorted
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: Number(r.period_start.slice(0, 4)),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function coalValueInYear(rows: Observation[], year: number): number | null {
  const row = rows.find((r) => r.period_start.startsWith(String(year)) && r.value != null);
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

/**
 * Sum monthly GWh into calendar-year totals, converted to bcm for this domain.
 * Incomplete latest years stay, marked provisional.
 */
export function gasAnnualSeries(rows: Observation[]): {
  id: string;
  label: string;
  points: Pt[];
  monthsByYear: Record<number, number>;
} {
  const byYear = new Map<number, { sum: number; months: number; provisional: boolean }>();
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const y = Number(r.period_start.slice(0, 4));
    if (!Number.isFinite(y)) continue;
    const cur = byYear.get(y) ?? { sum: 0, months: 0, provisional: false };
    cur.sum += Number(r.value);
    cur.months += 1;
    if (r.observation_status === "provisional") cur.provisional = true;
    byYear.set(y, cur);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const monthsByYear: Record<number, number> = {};
  const points: Pt[] = years.map((y) => {
    const cur = byYear.get(y)!;
    monthsByYear[y] = cur.months;
    return {
      t: y,
      v: gwhToBcm(cur.sum),
      provisional: cur.provisional || cur.months < 12,
    };
  });
  return {
    id: "gas-gross-annual-bcm",
    label: "UK gas production",
    points,
    monthsByYear,
  };
}

/** Calendar-year UK gas in bcm (converted from published GWh). */
export function gasAnnualValue(rows: Observation[], year: number): number | null {
  const series = gasAnnualSeries(rows);
  const pt = series.points.find((p) => p.t === year);
  return pt?.v ?? null;
}

/** Keep only years in [from, to] so stacked charts share one time window. */
export function clipSeriesToYears<S extends { points: Pt[] }>(series: S, from: number, to: number): S {
  return {
    ...series,
    points: series.points.filter((p) => p.t >= from && p.t <= to),
  };
}

/** Latest shared start year across series (ignores empty). */
export function sharedStartYear(seriesList: { points: Pt[] }[]): number | null {
  const starts = seriesList.map((s) => s.points[0]?.t).filter((y): y is number => y != null);
  return starts.length ? Math.max(...starts) : null;
}

function primaryFuelRows(rows: Observation[], fuel: FossilPrimaryFuel): Observation[] {
  return rows.filter((r) => noteMap(r.notes ?? "").fuel === fuel);
}

/** Annual sum of monthly Mtoe for Coal / Petroleum / Natural gas (stack). Never includes Total. */
export function primaryFossilStack(rows: Observation[]): { id: string; label: string; points: Pt[] }[] {
  return FOSSIL_PRIMARY_FUELS.map((fuel) => {
    const byYear = new Map<number, { sum: number; months: number; provisional: boolean }>();
    for (const r of primaryFuelRows(rows, fuel)) {
      if (r.value == null || !Number.isFinite(Number(r.value))) continue;
      const y = Number(r.period_start.slice(0, 4));
      if (!Number.isFinite(y)) continue;
      const cur = byYear.get(y) ?? { sum: 0, months: 0, provisional: false };
      cur.sum += Number(r.value);
      cur.months += 1;
      if (r.observation_status === "provisional") cur.provisional = true;
      byYear.set(y, cur);
    }
    const years = [...byYear.keys()].sort((a, b) => a - b);
    return {
      id: `primary-${fuel}`,
      label: FOSSIL_PRIMARY_LABEL[fuel],
      points: years.map((y) => {
        const cur = byYear.get(y)!;
        return {
          t: y,
          v: cur.sum,
          provisional: cur.provisional || cur.months < 12,
        };
      }),
    };
  });
}

export function primaryFuelYearTotal(
  rows: Observation[],
  fuel: FossilPrimaryFuel,
  year: number,
): number | null {
  const series = primaryFossilStack(rows).find((s) => s.id === `primary-${fuel}`);
  const pt = series?.points.find((p) => p.t === year);
  return pt?.v ?? null;
}

/** Sum of fossil primary fuels (Mtoe) for Production Gap. */
export function primaryFossilTotalSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const stack = primaryFossilStack(rows);
  const years = [
    ...new Set(stack.flatMap((s) => s.points.map((p) => p.t))),
  ].sort((a, b) => a - b);
  return {
    id: "primary-fossil-total",
    label: "UK fossil fuel production",
    points: years.map((y) => {
      let sum = 0;
      let provisional = false;
      let any = false;
      for (const s of stack) {
        const pt = s.points.find((p) => p.t === y);
        if (!pt) continue;
        any = true;
        sum += pt.v;
        if (pt.provisional) provisional = true;
      }
      return { t: y, v: sum, provisional: provisional || !any };
    }),
  };
}

/** Calendar-year sum of quarterly ET 1.3 ktoe → Mtoe (absolute; Exports published negative). */
export function tradeAnnualMtoe(
  rows: Observation[],
  flow: "Imports" | "Exports",
): { id: string; label: string; points: Pt[] } {
  const byYear = new Map<number, { sum: number; quarters: number; provisional: boolean }>();
  for (const r of rows) {
    if (noteMap(r.notes ?? "").flow !== flow) continue;
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const y = Number(r.period_start.slice(0, 4));
    if (!Number.isFinite(y)) continue;
    const cur = byYear.get(y) ?? { sum: 0, quarters: 0, provisional: false };
    cur.sum += Math.abs(Number(r.value));
    cur.quarters += 1;
    if (r.observation_status === "provisional") cur.provisional = true;
    byYear.set(y, cur);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  return {
    id: `trade-${flow.toLowerCase()}-mtoe`,
    label: flow === "Imports" ? "Energy imports" : "Energy exports",
    points: years.map((y) => {
      const cur = byYear.get(y)!;
      return {
        t: y,
        v: cur.sum / 1000, // ktoe → Mtoe
        provisional: cur.provisional || cur.quarters < 4,
      };
    }),
  };
}

/** DUKES 3.7 Total oil imports (thousand tonnes) → Mt. */
export function oilImportsMtSeries(rows: Observation[]): { id: string; label: string; points: Pt[] } {
  const points: Pt[] = [];
  for (const r of rows) {
    const n = noteMap(r.notes ?? "");
    if (n.kind !== "aggregate" || n.partner !== "Total imports") continue;
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    points.push({
      t: Number(r.period_start.slice(0, 4)),
      v: Number(r.value) / 1000,
      provisional: r.observation_status === "provisional",
    });
  }
  points.sort((a, b) => a.t - b.t);
  return { id: "oil-imports-total-mt", label: "Oil imports", points };
}

export function reservesMeasureSeries(
  rows: Observation[],
  measure: string,
): { id: string; label: string; points: Pt[] } {
  const labels: Record<string, string> = {
    oil_2p_mt: "Oil still counted as recoverable",
    oil_1p_mt: "Oil still counted as recoverable · proven only",
    oil_production_mt: "Oil extracted that year",
    gas_2p_bcm: "Gas still counted as recoverable",
    oil_2c_mt: "Oil contingent resources",
  };
  const points: Pt[] = [];
  for (const r of rows) {
    const n = noteMap(r.notes ?? "");
    if (n.measure !== measure) continue;
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    points.push({
      t: Number(r.period_start.slice(0, 4)),
      v: Number(r.value),
      provisional: r.observation_status === "provisional",
    });
  }
  points.sort((a, b) => a.t - b.t);
  return {
    id: measure,
    label: labels[measure] ?? measure,
    // Energy charts do not plot provisional points.
    points: points.filter((p) => !p.provisional),
  };
}

export type FieldStatusGroup = "producing" | "ceased" | "other";

export function fieldStatusGroup(status: string): FieldStatusGroup {
  const s = status.toUpperCase();
  if (s === "PRODUCING") return "producing";
  if (s.includes("CEASED") || s === "POST-COP") return "ceased";
  return "other";
}

export function fieldStatusLabel(group: FieldStatusGroup): string {
  return group === "producing" ? "Producing" : group === "ceased" ? "Production ceased" : "Other status";
}

export function isCeasedField(f: FieldPoint): boolean {
  return fieldStatusGroup(f.status) === "ceased";
}

/** Fields visible in a Time Machine year: known production start ≤ year (or unknown start kept). */
export function fieldsAsOfYear(fields: FieldPoint[], year: number): FieldPoint[] {
  return fields.filter((f) => f.prodYear == null || f.prodYear <= year);
}

/**
 * Gas-to-pipeline rows that cannot be real: more than 5 billion m³ in a year from one field
 * and over 20× the gas that field produced (dry + associated). Hub fields that send other
 * fields' gas stay well under this. Suppressed on screen, never corrected or summed.
 */
export function isSuppressedGas(r: FieldAnnual): boolean {
  const produced = r.dryGasKsm3 + r.associatedGasKsm3;
  return r.gasToPipelineKsm3 > 5e6 && r.gasToPipelineKsm3 > 20 * produced;
}

/**
 * One field's reported production by year. Oil in thousand tonnes; gas to pipeline in
 * million m³ (ksm³ ÷ 1000). Part-year rows (months < 12) are provisional (dotted).
 */
export function fieldProductionSeries(
  rows: FieldAnnual[],
  fieldName: string,
  measure: "oil" | "gas",
): { id: string; label: string; points: Pt[] } {
  const filtered = rows.filter((r) => r.fieldName === fieldName).sort((a, b) => a.year - b.year);
  return {
    id: `field-${measure}-${fieldName}`,
    label: measure === "oil" ? "Oil" : "Gas",
    points: filtered
      .map((r) => ({
        t: r.year,
        v: measure === "oil" ? r.oilTonnes / 1000 : ksm3ToBcm(r.gasToPipelineKsm3),
        provisional: r.months < 12,
      }))
      .filter((p, i) => Number.isFinite(p.v) && !(measure === "gas" && isSuppressedGas(filtered[i]!))),
  };
}

/* ── North Sea Time Machine: dated field states ─────────────────────────── */

export type AtlasFuel = "all" | "oil" | "gas";
export type AtlasScale = "field" | "fuel" | "national";

export const ATLAS_FUELS: { value: AtlasFuel; label: string }[] = [
  { value: "all", label: "Oil and gas" },
  { value: "oil", label: "Oil" },
  { value: "gas", label: "Gas" },
];

export const ATLAS_SCALES: { value: AtlasScale; label: string }[] = [
  { value: "field", label: "Field" },
  { value: "fuel", label: "Fuel" },
  { value: "national", label: "National total" },
];

export function asAtlasFuel(v: string | null): AtlasFuel {
  return v === "oil" || v === "gas" ? v : "all";
}

export function asAtlasScale(v: string | null): AtlasScale {
  return v === "fuel" || v === "national" ? v : "field";
}

/** Oil fields for oil; gas and condensate fields for gas. */
export function fieldMatchesFuel(f: FieldPoint, fuel: AtlasFuel): boolean {
  if (fuel === "all") return true;
  const t = f.fieldType.toUpperCase();
  return fuel === "oil" ? t === "OIL" : t === "GAS" || t === "COND";
}

export type FieldTimeline = {
  /** First and last year with any oil or gas reported. */
  first: number | null;
  last: number | null;
  byYear: Map<number, FieldAnnual>;
  /** Every production row is onshore (e.g. Wytch Farm). */
  onshore: boolean;
};

function hasOutput(r: FieldAnnual): boolean {
  return r.oilTonnes > 0 || r.gasToPipelineKsm3 > 0;
}

export function fieldTimelines(rows: FieldAnnual[]): Map<string, FieldTimeline> {
  const out = new Map<string, FieldTimeline>();
  for (const r of rows) {
    let tl = out.get(r.fieldName);
    if (!tl) {
      tl = { first: null, last: null, byYear: new Map(), onshore: true };
      out.set(r.fieldName, tl);
    }
    tl.byYear.set(r.year, r);
    if (r.location !== "Onshore") tl.onshore = false;
    if (hasOutput(r)) {
      tl.first = tl.first == null ? r.year : Math.min(tl.first, r.year);
      tl.last = tl.last == null ? r.year : Math.max(tl.last, r.year);
    }
  }
  return out;
}

/** Field-years whose gas-to-pipeline figure is suppressed (see isSuppressedGas). */
export function suppressedGasRows(rows: FieldAnnual[]): FieldAnnual[] {
  return rows.filter((r) => r.location === "Offshore" && isSuppressedGas(r));
}

/** Years covered by the field production records (first → last year published). */
export function productionArchiveSpan(rows: FieldAnnual[]): { first: number; last: number } | null {
  if (rows.length === 0) return null;
  let first = Infinity;
  let last = -Infinity;
  for (const r of rows) {
    first = Math.min(first, r.year);
    last = Math.max(last, r.year);
  }
  return { first, last };
}

/** Published production start, else first year with reported production. */
export function fieldStartYear(f: FieldPoint, tl: FieldTimeline | undefined): number | null {
  return f.prodYear ?? tl?.first ?? null;
}

export type FieldYearState = "reported" | "quiet" | "after" | "archive" | "undated";

export const FIELD_YEAR_STATES: FieldYearState[] = ["reported", "quiet", "after", "archive", "undated"];

export function fieldYearStateLabel(state: FieldYearState, year: number): string {
  switch (state) {
    case "reported":
      return `Production reported in ${year}`;
    case "quiet":
      return `Started · none reported in ${year}`;
    case "after":
      return "After last reported production";
    case "archive":
      return "Started · before production records";
    case "undated":
      return "Start date not published";
  }
}

/** Short key labels for the field map (plain words, one line). */
export function fieldYearStateKeyLabel(state: FieldYearState, year: number): string {
  switch (state) {
    case "reported":
      return `Reported in ${year}`;
    case "quiet":
      return `Quiet in ${year}`;
    case "after":
      return "After last report";
    case "archive":
      return "Before records";
    case "undated":
      return "No start date";
  }
}

/**
 * What the records say about a field in one year. `null` = not started by that year.
 * Never infers a closure date: "after" means only that no later production is reported.
 */
export function fieldYearState(
  f: FieldPoint,
  tl: FieldTimeline | undefined,
  year: number,
  archive: { first: number; last: number } | null,
): FieldYearState | null {
  const start = fieldStartYear(f, tl);
  if (start == null) return "undated";
  if (start > year) return null;
  if (archive && year < archive.first) return "archive";
  const row = tl?.byYear.get(year);
  if (row && hasOutput(row)) return "reported";
  if (tl?.last != null && year > tl.last) return "after";
  return "quiet";
}

/** Value used for the production glyph: oil tonnes or gas ksm³ in one year. */
export function fieldFuelValue(row: FieldAnnual | undefined, fuel: Exclude<AtlasFuel, "all">): number {
  if (!row || (fuel === "gas" && isSuppressedGas(row))) return 0;
  return fuel === "oil" ? row.oilTonnes : row.gasToPipelineKsm3;
}

/** Largest single field-year for a fuel (offshore) — the fixed glyph scale for every year. */
export function fieldFuelMax(rows: FieldAnnual[], fuel: Exclude<AtlasFuel, "all">): number {
  let max = 0;
  for (const r of rows) {
    if (r.location !== "Offshore") continue;
    max = Math.max(max, fieldFuelValue(r, fuel));
  }
  return max;
}

/**
 * Sum of offshore fields' reported production per year. Oil in Mt, gas to pipeline in bcm.
 * A year whose rows all cover fewer than 12 months is provisional. Not a national total.
 */
export function offshoreFieldSumSeries(
  rows: FieldAnnual[],
  fuel: Exclude<AtlasFuel, "all">,
): { id: string; label: string; points: Pt[] } {
  const by = new Map<number, { sum: number; months: number }>();
  const suppressed = new Set<number>();
  for (const r of rows) {
    if (r.location !== "Offshore") continue;
    if (fuel === "gas" && isSuppressedGas(r)) suppressed.add(r.year);
    const cur = by.get(r.year) ?? { sum: 0, months: 0 };
    cur.sum += fieldFuelValue(r, fuel);
    cur.months = Math.max(cur.months, r.months);
    by.set(r.year, cur);
  }
  return {
    id: `offshore-fields-${fuel}`,
    label: fuel === "oil" ? "Oil from offshore fields" : "Gas from offshore fields",
    points: [...by.entries()]
      .filter(([t]) => !suppressed.has(t))
      .sort((a, b) => a[0] - b[0])
      .map(([t, { sum, months }]) => ({
        t,
        v: fuel === "oil" ? sum / 1e6 : ksm3ToBcm(sum),
        provisional: months < 12,
      })),
  };
}

export function fmtKt(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} Mt`;
  if (Math.abs(v) >= 10) return `${v.toFixed(0)} kt`;
  return `${v.toFixed(1)} kt`;
}

export function fmtMcm(v: number): string {
  if (Math.abs(v) >= 100_000) return `${(v / 1000).toFixed(0)} bn m³`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} bn m³`;
  if (Math.abs(v) >= 10) return `${v.toFixed(0)} mn m³`;
  return `${v.toFixed(1)} mn m³`;
}

/** Closure chronology: ceased fields with a known production-start year, by decade. */
export function closureDecadeCounts(fields: FieldPoint[]): { id: string; label: string; points: Pt[] } {
  const ceased = fields.filter(isCeasedField);
  const byDecade = new Map<number, number>();
  for (const f of ceased) {
    const y = f.prodYear;
    if (y == null) continue;
    const decade = Math.floor(y / 10) * 10;
    byDecade.set(decade, (byDecade.get(decade) ?? 0) + 1);
  }
  const decades = [...byDecade.keys()].sort((a, b) => a - b);
  return {
    id: "closures-by-decade",
    label: "Fields that later ceased · by production-start decade",
    points: decades.map((d) => ({ t: d, v: byDecade.get(d) ?? 0 })),
  };
}

export function fmtMt(v: number): string {
  if (Math.abs(v) >= 100) return `${v.toFixed(0)} Mt`;
  if (Math.abs(v) >= 10) return `${v.toFixed(1)} Mt`;
  return `${v.toFixed(2)} Mt`;
}

export function fmtGWh(v: number): string {
  if (Math.abs(v) >= 100_000) return `${(v / 1000).toFixed(0)} TWh`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(1)} TWh`;
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })} GWh`;
}

export function fmtMtoe(v: number): string {
  if (Math.abs(v) >= 100) return `${v.toFixed(0)} Mtoe`;
  if (Math.abs(v) >= 10) return `${v.toFixed(1)} Mtoe`;
  return `${v.toFixed(2)} Mtoe`;
}

export function fmtBcm(v: number): string {
  if (Math.abs(v) >= 100) return `${v.toFixed(0)} bcm`;
  if (Math.abs(v) >= 10) return `${v.toFixed(1)} bcm`;
  return `${v.toFixed(2)} bcm`;
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}
