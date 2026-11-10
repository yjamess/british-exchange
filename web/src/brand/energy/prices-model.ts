/**
 * Domain 03 — Energy Prices & Costs helpers (client-safe).
 * Notes carry payment/tariff (bills) and size band (industrial) as key=value pairs.
 * Electricity bills @ 3,400 kWh; gas bills @ 11,200 kWh — never mix fuels on one unmarked series.
 * Real-terms bills link Economy CPIH (do not fork under data/energy). Ofgem cap is a separate GB
 * benchmark — not a DESNZ average bill and not Northern Ireland.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import { toT, type Pt } from "../data";

export const DOMESTIC_BILLS_ID = "domestic-electricity-bills";
export const DOMESTIC_GAS_BILLS_ID = "domestic-gas-bills";
export const DOMESTIC_ECONOMY7_ID = "domestic-economy7-electricity-bills";
export const DOMESTIC_UNIT_STANDING_ID = "domestic-electricity-unit-standing";
export const DOMESTIC_GAS_UNIT_STANDING_ID = "domestic-gas-unit-standing";
export const INDUSTRIAL_PRICES_ID = "industrial-electricity-prices";
export const OFGEM_CAP_ID = "ofgem-default-tariff-cap";
export const OFGEM_CAP_REGIONAL_ID = "ofgem-default-tariff-cap-regional";
export const MPP_FUEL_PRICES_ID = "major-power-producer-fuel-prices";
/** Economy-owned; Energy links these ids — never duplicate under data/energy. */
export const CPIH_INDEX_ID = "cpih-index";
export const REAL_EARNINGS_ID = "real-earnings";
/** Economy-owned cash-terms AWE (KAI7): the right denominator for a cash bill. */
export const NOMINAL_EARNINGS_ID = "nominal-earnings";

/** Default region for Dissected Bill layers (QEP 2.2.4 / 2.3.4). */
export const DEFAULT_BILL_REGION = "United Kingdom";

export const PAYMENTS = ["Overall", "Direct debit", "Standard credit", "Prepayment"] as const;
export type PaymentId = (typeof PAYMENTS)[number];

export const TARIFFS = ["All", "Fixed", "Variable"] as const;
export type TariffId = (typeof TARIFFS)[number];

/** Dissected Bill fuel cut — URL param `bill_fuel` (not generation `fuel`). */
export const BILL_FUELS = ["electricity", "gas", "economy7"] as const;
export type BillFuel = (typeof BILL_FUELS)[number];

export const BILL_KWH: Record<BillFuel, number> = {
  electricity: 3400,
  gas: 11200,
  economy7: 4800,
};

export const BILL_FUEL_LABEL: Record<BillFuel, string> = {
  electricity: "Electricity",
  gas: "Gas",
  economy7: "Economy 7 electricity",
};

/** Geography tab sources — DESNZ reconstruct vs Ofgem Annex 9 (room for more later). */
export const REGION_SOURCES = ["desnz", "ofgem"] as const;
export type RegionSource = (typeof REGION_SOURCES)[number];

export const REGION_SOURCE_LABEL: Record<RegionSource, string> = {
  desnz: "DESNZ rates",
  ofgem: "Ofgem price cap",
};

/**
 * Price-publisher labels that share a name with an ONS English region on RegionMap.
 * Display alignment only — PES / LDZ / Ofgem charge-restriction areas are not ONS English regions.
 * Labels that span nations or do not match (Scotland, Wales, NI, Mersey & Wales, Southern, Midlands) stay off the map.
 */
export const ENGLAND_CODE_BY_PRICE_LABEL: Record<string, string> = {
  "North East": "E12000001",
  Northern: "E12000001",
  "North West": "E12000002",
  Yorkshire: "E12000003",
  "East Midlands": "E12000004",
  "West Midlands": "E12000005",
  Eastern: "E12000006",
  London: "E12000007",
  "South East": "E12000008",
  "South West": "E12000009",
  "Southern Western": "E12000009",
};

export const MPP_MEASURES = ["gas_mpp_p_kwh", "coal_p_kwh", "oil_p_kwh"] as const;
export type MppMeasure = (typeof MPP_MEASURES)[number];

export const MPP_MEASURE_LABEL: Record<MppMeasure, string> = {
  gas_mpp_p_kwh: "Natural gas (generators)",
  coal_p_kwh: "Coal (generators)",
  oil_p_kwh: "Oil (generators)",
};

/** Cash vs CPIH-deflated illustrative bills (URL `bill_measure`). */
export const BILL_MEASURES = ["cash", "real"] as const;
export type BillMeasure = (typeof BILL_MEASURES)[number];

/** Ofgem Annex 9 GB-average measures (URL `cap_measure`). */
export const OFGEM_MEASURES = ["elec_single", "gas", "dual_fuel"] as const;
export type OfgemMeasure = (typeof OFGEM_MEASURES)[number];

export const OFGEM_MEASURE_LABEL: Record<OfgemMeasure, string> = {
  elec_single: "Electricity (single-rate)",
  gas: "Gas",
  dual_fuel: "Dual fuel",
};

/** Published industrial size bands in QEP 3.1.2 (excl. CCL). */
export const INDUSTRIAL_BANDS = [
  "Average",
  "Small",
  "Medium",
  "Large",
  "Large of which Moderately large",
  "Large of which Extra large",
] as const;
export type IndustrialBand = (typeof INDUSTRIAL_BANDS)[number];

export type SeriesPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  sourceVersion: string;
  retrievedNote: string;
};

export type PricesPack = {
  /** Ofgem Annex 9 cap components (curated JSON; see bill-model CapComponentsPack). */
  capComponents?: import("./bill-model").CapComponentsPack | null;
  domestic: SeriesPack | null;
  gas: SeriesPack | null;
  economy7: SeriesPack | null;
  /** QEP 2.2.4 electricity unit + fixed costs (layers). */
  layers: SeriesPack | null;
  /** QEP 2.3.4 gas unit + fixed costs (layers). */
  gasLayers: SeriesPack | null;
  industrial: SeriesPack | null;
  ofgem: SeriesPack | null;
  ofgemRegional: SeriesPack | null;
  wholesale: SeriesPack | null;
  cpih: SeriesPack | null;
  earnings: SeriesPack | null;
};

export type BillLayers = {
  unitPrice: number | null;
  fixedCost: number | null;
  reconstructed: number | null;
  region: string;
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

/** Domestic bill rows for one payment × tariff cut (default Overall / All). */
export function domesticBillRows(
  rows: Observation[],
  payment: PaymentId = "Overall",
  tariff: TariffId = "All",
): Observation[] {
  return rows
    .filter((r) => {
      const n = noteMap(r.notes ?? "");
      return n.payment === payment && n.tariff === tariff;
    })
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

export function domesticBillSeries(
  rows: Observation[],
  payment: PaymentId,
  tariff: TariffId,
): { id: string; label: string; points: Pt[] } {
  const filtered = domesticBillRows(rows, payment, tariff);
  return {
    id: `bill-${payment}-${tariff}`,
    label: `${payment} · ${tariff}`,
    points: filtered
      .filter((r) => r.value != null && Number.isFinite(r.value))
      .map((r) => ({
        t: Number(r.period_start.slice(0, 4)),
        v: r.value as number,
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function industrialBandRows(rows: Observation[], band: IndustrialBand): Observation[] {
  return rows
    .filter((r) => noteMap(r.notes ?? "").band === band)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

/** Quarterly industrial p/kWh series for one size band. */
export function industrialPriceSeries(
  rows: Observation[],
  band: IndustrialBand,
): { id: string; label: string; points: Pt[] } {
  const filtered = industrialBandRows(rows, band);
  return {
    id: `ind-${band}`,
    label: `${band} · quarterly · before Climate Change Levy`,
    points: filtered
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

/** Mean of published quarters in a calendar year (for figure strip / year readout). */
export function industrialYearAverage(rows: Observation[], band: IndustrialBand, year: number): number | null {
  const qs = industrialBandRows(rows, band).filter(
    (r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)),
  );
  if (!qs.length) return null;
  return qs.reduce((s, r) => s + Number(r.value), 0) / qs.length;
}

/** Unit (£/kWh) or fixed (£/year) row for one year × payment × region. */
export function layerValue(
  rows: Observation[],
  year: number,
  payment: PaymentId,
  measure: "unit_price" | "fixed_cost",
  region: string = DEFAULT_BILL_REGION,
): number | null {
  const row = rows.find((r) => {
    if (!r.period_start.startsWith(String(year)) || r.value == null) return false;
    const n = noteMap(r.notes ?? "");
    return n.payment === payment && n.measure === measure && n.region === region;
  });
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

export function billLayersFor(
  rows: Observation[],
  year: number,
  payment: PaymentId,
  kwh: number,
  region: string = DEFAULT_BILL_REGION,
): BillLayers {
  const unitPrice = layerValue(rows, year, payment, "unit_price", region);
  const fixedCost = layerValue(rows, year, payment, "fixed_cost", region);
  const reconstructed =
    unitPrice != null && fixedCost != null ? fixedCost + unitPrice * kwh : null;
  return { unitPrice, fixedCost, reconstructed, region };
}

export function layerRegions(rows: Observation[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const region = noteMap(r.notes ?? "").region;
    if (region) set.add(region);
  }
  return [...set].sort((a, b) => {
    if (a === DEFAULT_BILL_REGION) return -1;
    if (b === DEFAULT_BILL_REGION) return 1;
    return a.localeCompare(b);
  });
}

export function fmtGbpBill(v: number): string {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtGbpPrecise(v: number): string {
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Publisher stores £/kWh; display as p/kWh for familiar receipt reading. */
export function fmtUnitRateGbpPerKwh(v: number): string {
  return `${(v * 100).toFixed(2)} p/kWh`;
}

export function fmtPenceKwh(v: number): string {
  return `${v.toFixed(2)} p/kWh`;
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}

/** Mean of published CPIH months in a calendar year. */
export function cpihAnnualAverage(rows: Observation[], year: number): number | null {
  const vals = rows
    .filter((r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)))
    .map((r) => Number(r.value));
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Latest calendar year with a full (or partial) CPIH average — used as the real-terms pound base. */
export function latestCpihYear(rows: Observation[]): { year: number; value: number } | null {
  const years = yearsOf(rows);
  for (let i = years.length - 1; i >= 0; i--) {
    const year = years[i]!;
    const value = cpihAnnualAverage(rows, year);
    if (value != null && value > 0) return { year, value };
  }
  return null;
}

/**
 * Restate an annual cash bill series in the pounds of the latest CPIH year.
 * Exchange calculation from ONS CPIH (L522) — not a DESNZ published real-terms bill.
 */
export function realBillSeries(
  cash: { id: string; label: string; points: Pt[] },
  cpihRows: Observation[],
): { id: string; label: string; points: Pt[]; baseYear: number | null } {
  const base = latestCpihYear(cpihRows);
  if (!base) return { id: `${cash.id}-real`, label: `${cash.label} (real)`, points: [], baseYear: null };
  const points: Pt[] = [];
  for (const p of cash.points) {
    const year = Math.round(p.t);
    const c = cpihAnnualAverage(cpihRows, year);
    if (c == null || c === 0) continue;
    points.push({ t: p.t, v: p.v * (base.value / c), provisional: p.provisional });
  }
  return {
    id: `${cash.id}-real`,
    label: `${cash.label} · ${base.year} pounds`,
    points,
    baseYear: base.year,
  };
}

export function ofgemMeasureRows(rows: Observation[], measure: OfgemMeasure): Observation[] {
  return rows
    .filter((r) => noteMap(r.notes ?? "").measure === measure)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

/** Quarterly Ofgem GB-average default tariff cap (£/year typical use). */
export function ofgemCapSeries(
  rows: Observation[],
  measure: OfgemMeasure,
): { id: string; label: string; points: Pt[] } {
  const filtered = ofgemMeasureRows(rows, measure);
  return {
    id: `ofgem-${measure}`,
    label: OFGEM_MEASURE_LABEL[measure],
    points: filtered
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function ofgemLatest(
  rows: Observation[],
  measure: OfgemMeasure,
): Observation | null {
  const filtered = ofgemMeasureRows(rows, measure);
  return filtered.at(-1) ?? null;
}

/** Industrial p/kWh as one point per calendar year (mean of quarters) — for indexed Cost Shock only. */
export function industrialAnnualPoints(rows: Observation[], band: IndustrialBand): Pt[] {
  const years = yearsOf(industrialBandRows(rows, band));
  const out: Pt[] = [];
  for (const year of years) {
    const avg = industrialYearAverage(rows, band, year);
    if (avg == null) continue;
    out.push({ t: year, v: avg });
  }
  return out;
}

/** Rebase points so the first overlapping base year equals 100. */
export function indexPoints(points: Pt[], baseYear: number): Pt[] {
  const base = points.find((p) => Math.round(p.t) === baseYear);
  if (!base || base.v === 0) return [];
  return points.map((p) => ({
    t: p.t,
    v: (p.v / base.v) * 100,
    provisional: p.provisional,
  }));
}

/**
 * Cost Shock: domestic electricity bill, domestic gas bill, and industrial electricity
 * as separate index series (100 = shared base year). Not one unmarked cash axis.
 */
export function costShockSeries(
  electricityRows: Observation[],
  gasRows: Observation[],
  industrialRows: Observation[],
  payment: PaymentId,
  tariff: TariffId,
  band: IndustrialBand,
): { series: { id: string; label: string; points: Pt[] }[]; baseYear: number | null } {
  const elec = domesticBillSeries(electricityRows, payment, tariff).points;
  const gas = domesticBillSeries(gasRows, payment, tariff).points;
  const ind = industrialAnnualPoints(industrialRows, band);
  const elecYears = new Set(elec.map((p) => Math.round(p.t)));
  const gasYears = new Set(gas.map((p) => Math.round(p.t)));
  const indYears = new Set(ind.map((p) => Math.round(p.t)));
  const shared = [...elecYears]
    .filter((y) => gasYears.has(y) && indYears.has(y))
    .sort((a, b) => a - b);
  const baseYear = shared[0] ?? null;
  if (baseYear == null) return { series: [], baseYear: null };
  return {
    baseYear,
    series: [
      {
        id: "shock-elec",
        label: "Domestic electricity bill (cash)",
        points: indexPoints(elec, baseYear),
      },
      {
        id: "shock-gas",
        label: "Domestic gas bill (cash)",
        points: indexPoints(gas, baseYear),
      },
      {
        id: "shock-ind",
        label: `Industry electricity (cash, ${band.replace("Large of which ", "")})`,
        points: indexPoints(ind, baseYear),
      },
    ].filter((s) => s.points.length > 0),
  };
}

/**
 * Regional reconstructed illustrative bills from unit + standing (payment × year).
 * DESNZ PES / LDZ-aligned regions — not Ofgem price-cap regions. UK used as RankBars reference.
 */
export function regionalBillRanks(
  rows: Observation[],
  year: number,
  payment: PaymentId,
  kwh: number,
): {
  rows: { id: string; label: string; v: number; active?: boolean }[];
  reference: { label: string; v: number } | null;
} {
  const regions = layerRegions(rows).filter((r) => r !== DEFAULT_BILL_REGION);
  const ranked: { id: string; label: string; v: number }[] = [];
  for (const region of regions) {
    const layers = billLayersFor(rows, year, payment, kwh, region);
    if (layers.reconstructed == null) continue;
    ranked.push({ id: region, label: region, v: layers.reconstructed });
  }
  ranked.sort((a, b) => b.v - a.v);
  const uk = billLayersFor(rows, year, payment, kwh, DEFAULT_BILL_REGION);
  return {
    rows: ranked,
    reference:
      uk.reconstructed != null
        ? { label: DEFAULT_BILL_REGION, v: uk.reconstructed }
        : null,
  };
}

/** Years where both unit and standing exist for at least one non-UK region. */
export function regionalBillYears(rows: Observation[], payment: PaymentId): number[] {
  const years = yearsOf(rows);
  return years.filter((year) => {
    const { rows: ranks } = regionalBillRanks(rows, year, payment, 3400);
    return ranks.length > 0;
  });
}

/** Ofgem Annex 9 regional £/year ranks for one period × measure. */
export function ofgemRegionalRanks(
  rows: Observation[],
  periodStart: string,
  measure: OfgemMeasure,
): { rows: { id: string; label: string; v: number; active?: boolean }[]; reference: null } {
  const ranked = rows
    .filter((r) => {
      if (r.period_start !== periodStart || r.value == null) return false;
      return noteMap(r.notes ?? "").measure === measure;
    })
    .map((r) => ({
      id: r.geography_label,
      label: r.geography_label,
      v: Number(r.value),
    }))
    .sort((a, b) => b.v - a.v);
  return { rows: ranked, reference: null };
}

export function ofgemRegionalPeriods(rows: Observation[]): string[] {
  return [...new Set(rows.map((r) => r.period_start))].sort();
}

export type PriceRegionRank = { id: string; label: string; v: number; active?: boolean };

/** Choropleth rows for RegionMap — one English code per matching price label. */
export function englandMapFromPriceRanks(
  rows: PriceRegionRank[],
  format: (v: number) => string,
): { code: string; value: number | null; display: string }[] {
  const out: { code: string; value: number | null; display: string }[] = [];
  const used = new Set<string>();
  for (const r of rows) {
    const code = ENGLAND_CODE_BY_PRICE_LABEL[r.label];
    if (!code || used.has(code)) continue;
    used.add(code);
    out.push({ code, value: r.v, display: format(r.v) });
  }
  return out;
}

/** Reverse: map click → price-region id for the current ranked set. */
export function priceIdForEnglandCode(code: string, rows: PriceRegionRank[]): string | null {
  const labels = Object.entries(ENGLAND_CODE_BY_PRICE_LABEL)
    .filter(([, c]) => c === code)
    .map(([label]) => label);
  return rows.find((r) => labels.includes(r.label))?.id ?? null;
}

export function englandCodeForPriceId(id: string, rows: PriceRegionRank[]): string | null {
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  return ENGLAND_CODE_BY_PRICE_LABEL[row.label] ?? null;
}

/** Mean weekly real earnings in a calendar year → annualised £ (×52). Exchange scenario. */
export function earningsAnnualForYear(rows: Observation[], year: number): number | null {
  const vals = rows
    .filter((r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)))
    .map((r) => Number(r.value));
  if (!vals.length) return null;
  const weekly = vals.reduce((s, v) => s + v, 0) / vals.length;
  return weekly * 52;
}

export function incomeBurdenPct(billGbp: number, annualEarnings: number): number | null {
  if (!Number.isFinite(billGbp) || !Number.isFinite(annualEarnings) || annualEarnings <= 0) return null;
  return (billGbp / annualEarnings) * 100;
}

export function mppFuelSeries(
  rows: Observation[],
  measure: MppMeasure,
): { id: string; label: string; points: Pt[] } {
  const filtered = rows
    .filter((r) => noteMap(r.notes ?? "").measure === measure)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: `mpp-${measure}`,
    label: MPP_MEASURE_LABEL[measure],
    points: filtered
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function fmtPct1(v: number): string {
  return `${v.toFixed(1)}%`;
}
