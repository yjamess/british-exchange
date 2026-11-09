/**
 * The Dissected Bill — illustrative bill helpers (client-safe).
 *
 * An illustrative bill = standing charge (DESNZ average fixed cost, £/year) + unit rate (DESNZ average
 * variable unit price, £/kWh) × the reader's chosen use. Both rates are published by region, payment
 * method and calendar year; the bill itself is an Exchange calculation from them.
 *
 * Coverage notes the controls respect:
 *   • Region names changed (city areas → regions: electricity 2013, gas 2018). DESNZ also publishes
 *     the PES (electricity) / LDZ (gas) area on every row, which is continuous across the change;
 *     that published key is the region used here (Scotland spelt two ways is the only variation).
 *   • Rates are not split by Fixed / Variable tariff; the published typical bill is.
 *   • Economy 7 has a published typical bill only (no rates loaded).
 */

import type { Observation } from "@/lib/api";
import { DEFAULT_BILL_REGION, noteMap, type BillFuel, type PaymentId } from "./prices-model";

export type BillShow = "bill" | "unit" | "real" | "burden";
export const BILL_SHOWS: { id: BillShow; label: string }[] = [
  { id: "bill", label: "Typical bill" },
  { id: "unit", label: "Unit rate" },
  { id: "real", label: "Real cost" },
  { id: "burden", label: "Share of pay" },
];

/** Usage choices (kWh a year). The DESNZ typical use is always included. */
export const USAGE_OPTIONS: Record<BillFuel, number[]> = {
  electricity: [1500, 2000, 2500, 2700, 3000, 3400, 4000, 5000, 6000],
  gas: [5000, 7500, 9500, 11200, 12000, 15000, 20000],
  economy7: [4800],
};

const AREA_ALIAS: Record<string, string> = { "Northern Scotland": "North Scotland", "Southern Scotland": "South Scotland" };

/** The publisher's continuous area for a row: PES (electricity) or LDZ (gas), else the region label. */
export function areaOf(notes: string | null | undefined): string {
  const n = noteMap(notes ?? "");
  const a = n.pes || n.ldz || n.region || "";
  return AREA_ALIAS[a] ?? a;
}

export function regionsForYear(rows: Observation[], year: number, payment: PaymentId): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (!r.period_start.startsWith(String(year)) || r.value == null) continue;
    if (noteMap(r.notes ?? "").payment === payment) set.add(areaOf(r.notes));
  }
  set.delete("");
  return [...set].sort((a, b) => (a === DEFAULT_BILL_REGION ? -1 : b === DEFAULT_BILL_REGION ? 1 : a.localeCompare(b)));
}

function rate(rows: Observation[], year: number, payment: PaymentId, measure: "unit_price" | "fixed_cost", area: string): number | null {
  const r = rows.find((o) => {
    if (!o.period_start.startsWith(String(year)) || o.value == null) return false;
    const n = noteMap(o.notes ?? "");
    return n.payment === payment && n.measure === measure && areaOf(o.notes) === area;
  });
  return r?.value != null && Number.isFinite(Number(r.value)) ? Number(r.value) : null;
}

/** Published unit rate (£/kWh) and standing charge (£/year) for an area, and the bill at `kwh`. */
export function ratesFor(rows: Observation[], year: number, payment: PaymentId, kwh: number, area: string) {
  const unitPrice = rate(rows, year, payment, "unit_price", area);
  const fixedCost = rate(rows, year, payment, "fixed_cost", area);
  return { unitPrice, fixedCost, reconstructed: unitPrice != null && fixedCost != null ? fixedCost + unitPrice * kwh : null };
}

/** One published rate as an annual series for an area (unit price in p/kWh; fixed cost in £/year). */
export function rateSeries(rows: Observation[], area: string, payment: PaymentId, measure: "unit_price" | "fixed_cost") {
  return rows
    .filter((r) => {
      if (r.value == null || !Number.isFinite(Number(r.value))) return false;
      const n = noteMap(r.notes ?? "");
      return areaOf(r.notes) === area && n.payment === payment && n.measure === measure;
    })
    .map((r) => ({ t: Number(r.period_start.slice(0, 4)), v: Number(r.value) * (measure === "unit_price" ? 100 : 1) }))
    .sort((a, b) => a.t - b.t);
}

/* ——— Ofgem price cap: what it pays for (Annex 9, sheet 1b) ——— */

export type CapComponentRow = {
  payment: "other" | "standard_credit" | "prepayment";
  fuel: "elec_single" | "elec_multi" | "gas" | "dual_fuel";
  level: "nil" | "typical";
  period: string;
  period_start: string | null;
  component: string;
  label: string;
  gbp: number | null;
};

export type CapComponentsPack = { source: string; unit: string; note: string; rows: CapComponentRow[] };

/** Plain groups, as in Ofgem's public breakdown of the cap. Every published component lands in one. */
const GROUPS: { id: string; label: string; codes: string[] }[] = [
  { id: "wholesale", label: "Wholesale energy", codes: ["DF", "CM"] },
  { id: "network", label: "Network costs", codes: ["NC"] },
  { id: "policy", label: "Policy costs", codes: ["PC"] },
  { id: "operating", label: "Running the supplier", codes: ["OC", "CO", "SMNCC", "IC", "PAAC", "PAP", "DRC", "AA", "Levelisation"] },
  { id: "margin", label: "Supplier margin and headroom", codes: ["EBIT", "HAP"] },
];

export const CAP_PAYMENT: Record<PaymentId, CapComponentRow["payment"]> = {
  Overall: "other",
  "Direct debit": "other",
  "Standard credit": "standard_credit",
  Prepayment: "prepayment",
};

export const CAP_FUEL: Record<BillFuel, CapComponentRow["fuel"]> = {
  electricity: "elec_single",
  gas: "gas",
  economy7: "elec_multi",
};

/** The cap's breakdown for the last period starting in `year`, grouped; VAT as its own line. */
export function capBreakdown(pack: CapComponentsPack | null, year: number, fuel: BillFuel, payment: PaymentId) {
  if (!pack) return null;
  const rows = pack.rows.filter(
    (r) => r.level === "typical" && r.fuel === CAP_FUEL[fuel] && r.payment === CAP_PAYMENT[payment] && r.period_start?.startsWith(String(year)),
  );
  const periods = [...new Set(rows.map((r) => r.period_start!))].sort();
  const start = periods.at(-1);
  if (!start) return null;
  const at = rows.filter((r) => r.period_start === start);
  const get = (code: string) => at.find((r) => r.component === code)?.gbp ?? null;
  const exVat = get("Total_GB average");
  const incVat = get("Total inc VAT");
  if (exVat == null || incVat == null) return null;
  const lines = GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    value: g.codes.reduce((a, c) => a + (get(c) ?? 0), 0),
  })).filter((l) => Math.abs(l.value) >= 0.005);
  return { period: at[0]!.period, lines, vat: incVat - exVat, total: incVat };
}

/* ——— Bills as a share of pay ——— */

/** Mean of the year's monthly average weekly pay (cash) × 52; null unless all 12 months are published. */
export function annualPay(rows: Observation[], year: number): number | null {
  const vals = rows
    .filter((r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)))
    .map((r) => Number(r.value));
  return vals.length === 12 ? (vals.reduce((a, v) => a + v, 0) / 12) * 52 : null;
}

export function payShareSeries(billPoints: { t: number; v: number }[], payRows: Observation[]) {
  return billPoints.flatMap((p) => {
    const pay = annualPay(payRows, Math.round(p.t));
    return pay ? [{ t: p.t, v: (p.v / pay) * 100 }] : [];
  });
}

/** Typical-use figure parsed from Ofgem notes, e.g. "TDCV 2.5 MWh" → 2500. */
export function ofgemTypicalKwh(notes: string | null | undefined): number | null {
  const m = /TDCV\s+(?:elec\s+)?([\d.]+)\s*MWh/i.exec(notes ?? "");
  return m ? Math.round(Number(m[1]) * 1000) : null;
}

export const fmtPence = (p: number) => `${p.toFixed(2)}p`;
export const fmtKwh = (k: number) => `${k.toLocaleString("en-GB")} kWh`;
