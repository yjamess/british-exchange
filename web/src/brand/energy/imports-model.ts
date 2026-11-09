/**
 * Domain 05 — Energy Imports & Security helpers (client-safe).
 * Flagship Study D: Lifelines Map = measured partner / terminal ranks (no invented routes).
 * Supporting: Resilience · Connectors (ET 5.6 GWh) · Gross trade.
 * Net ≠ gross. GWh ≠ ktoe ≠ thousand tonnes. Dependency ≠ resilience score.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import { toT, type Pt } from "../data";

export const IMPORT_DEPENDENCY_ID = "energy-import-dependency";
export const IMPORTS_EXPORTS_ID = "energy-imports-and-exports";
export const INTERCONNECTOR_FLOWS_ID = "electricity-interconnector-flows";
export const INTERCONNECTOR_CAPACITY_ID = "electricity-interconnector-capacity";
export const NATURAL_GAS_STORAGE_ID = "natural-gas-storage";
export const OIL_IMPORTS_BY_COUNTRY_ID = "oil-imports-by-country";
export const GAS_TRADE_BY_PARTNER_ID = "gas-trade-by-partner";
export const LNG_IMPORTS_BY_TERMINAL_ID = "lng-imports-by-terminal";
export const FOSSIL_FUEL_DEPENDENCY_ID = "fossil-fuel-dependency";
export const LOW_CARBON_ENERGY_SHARE_ID = "low-carbon-energy-share";

export const LIFELINE_FUELS = ["oil", "gas", "lng"] as const;
export type LifelineFuel = (typeof LIFELINE_FUELS)[number];

export const LIFELINE_FLOWS = ["Imports", "Exports", "Net imports"] as const;
export type LifelineFlow = (typeof LIFELINE_FLOWS)[number];

export const GAS_MODES = ["Pipeline", "LNG", "Combined"] as const;
export type GasMode = (typeof GAS_MODES)[number];

/** Default RankBars window on Lifelines; full list via URL `list=all`. */
export const LIFELINE_RANK_TOP = 10;

export const LIFELINE_LIST_MODES = ["top", "all"] as const;
export type LifelineListMode = (typeof LIFELINE_LIST_MODES)[number];

export const BASES = ["annual", "quarterly"] as const;
export type DependencyBasis = (typeof BASES)[number];

/** ET 5.6 corridors (France-UK is publisher aggregate of three links). */
export const INTERCONNECTOR_CORRIDORS = [
  "UK-total",
  "France-UK",
  "Netherlands-UK",
  "Belgium-UK",
  "Norway-UK",
  "Denmark-UK",
  "Ireland-NI",
  "Ireland-Wales",
] as const;
export type InterconnectorCorridor = (typeof INTERCONNECTOR_CORRIDORS)[number];

export const INTERCONNECTOR_FLOWS = ["Imports", "Exports", "Net imports"] as const;
export type InterconnectorFlow = (typeof INTERCONNECTOR_FLOWS)[number];

export type SeriesPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  sourceVersion: string;
  retrievedNote: string;
};

export type ImportsPack = {
  dependency: SeriesPack | null;
  trade: SeriesPack | null;
  interconnectors: SeriesPack | null;
  interconnectorCapacity: SeriesPack | null;
  oilPartners: SeriesPack | null;
  gasPartners: SeriesPack | null;
  lngTerminals: SeriesPack | null;
  fossilDependency: SeriesPack | null;
  lowCarbonShare: SeriesPack | null;
  gasStorage: SeriesPack | null;
};

/** ET 1.3 ratio series (import dependency / fossil / low carbon) for Resilience Test. */
export function ratioSeries(
  rows: Observation[],
  basis: DependencyBasis,
  id: string,
  label: string,
): { id: string; label: string; points: Pt[] } {
  const filtered = rows
    .filter((r) => noteMap(r.notes ?? "").basis === basis)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id,
    label,
    points: filtered
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: basis === "annual" ? Number(r.period_start.slice(0, 4)) : toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function ratioValueInYear(
  rows: Observation[],
  year: number,
  basis: DependencyBasis = "annual",
): number | null {
  if (basis === "annual") {
    const row = rows.find(
      (r) =>
        noteMap(r.notes ?? "").basis === "annual" &&
        r.period_start.startsWith(String(year)) &&
        r.value != null,
    );
    return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
  }
  const qs = rows.filter(
    (r) =>
      noteMap(r.notes ?? "").basis === "quarterly" &&
      r.period_start.startsWith(String(year)) &&
      r.value != null &&
      Number.isFinite(Number(r.value)),
  );
  if (!qs.length) return null;
  return qs.reduce((s, r) => s + Number(r.value), 0) / qs.length;
}

export type LifelineRow = {
  id: string;
  label: string;
  value: number;
  kind: "partner" | "terminal" | "aggregate";
  provisional: boolean;
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

function dependencyRows(rows: Observation[], basis: DependencyBasis): Observation[] {
  return rows
    .filter((r) => noteMap(r.notes ?? "").basis === basis)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

/**
 * Import dependency over time.
 * Values stay as DESNZ ratios in the series; format with fmtDependencyPct (×100 for display only).
 */
export function dependencySeries(
  rows: Observation[],
  basis: DependencyBasis = "annual",
): { id: string; label: string; points: Pt[] } {
  const filtered = dependencyRows(rows, basis);
  return {
    id: `dependency-${basis}`,
    label: basis === "annual" ? "Import dependency (annual)" : "Import dependency (quarterly)",
    points: filtered
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: basis === "annual" ? Number(r.period_start.slice(0, 4)) : toT(r.period_start),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function dependencyValueInYear(
  rows: Observation[],
  year: number,
  basis: DependencyBasis = "annual",
): number | null {
  if (basis === "annual") {
    const row = dependencyRows(rows, "annual").find(
      (r) => r.period_start.startsWith(String(year)) && r.value != null,
    );
    return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
  }
  const qs = dependencyRows(rows, "quarterly").filter(
    (r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)),
  );
  if (!qs.length) return null;
  return qs.reduce((s, r) => s + Number(r.value), 0) / qs.length;
}

function tradeFlowRows(rows: Observation[], flow: "Imports" | "Exports"): Observation[] {
  return rows
    .filter((r) => noteMap(r.notes ?? "").flow === flow)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

/**
 * Gross Imports and Exports for charts.
 * DESNZ publishes Exports as negative; we flip to positive for reading (Notes say so).
 */
export function tradeGrossSeries(rows: Observation[]): { id: string; label: string; points: Pt[] }[] {
  return (["Imports", "Exports"] as const).map((flow) => {
    const filtered = tradeFlowRows(rows, flow);
    const flip = flow === "Exports";
    return {
      id: `trade-${flow.toLowerCase()}`,
      label: flow === "Exports" ? "Exports" : "Imports",
      points: filtered
        .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
        .map((r) => ({
          t: toT(r.period_start),
          v: flip ? Math.abs(Number(r.value)) : Number(r.value),
          provisional: r.observation_status === "provisional",
        })),
    };
  });
}

/** Calendar-year sum of quarterly ktoe for one flow (incomplete years kept). */
export function tradeAnnualSum(
  rows: Observation[],
  flow: "Imports" | "Exports",
  year: number,
): { value: number; quarters: number; provisional: boolean } | null {
  const qs = tradeFlowRows(rows, flow).filter(
    (r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(Number(r.value)),
  );
  if (!qs.length) return null;
  const value = qs.reduce((s, r) => s + Number(r.value), 0);
  const provisional = qs.some((r) => r.observation_status === "provisional") || qs.length < 4;
  return { value, quarters: qs.length, provisional };
}

/** Display only: ratio × 100 as percentage points (stored unit remains ratio). */
export function fmtDependencyPct(ratio: number): string {
  const pct = ratio * 100;
  const sign = pct > 0 ? "" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export function fmtKtoe(v: number): string {
  const abs = Math.abs(v);
  const body =
    abs >= 1000
      ? abs.toLocaleString("en-GB", { maximumFractionDigits: 0 })
      : abs.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  return v < 0 ? `−${body} ktoe` : `${body} ktoe`;
}

export function fmtGWh(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const twh = abs / 1000;
    const body =
      twh >= 10
        ? twh.toLocaleString("en-GB", { maximumFractionDigits: 1 })
        : twh.toLocaleString("en-GB", { maximumFractionDigits: 2 });
    return v < 0 ? `−${body} TWh` : `${body} TWh`;
  }
  const body = abs.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  return v < 0 ? `−${body} GWh` : `${body} GWh`;
}

export function fmtMw(v: number): string {
  const abs = Math.abs(v);
  const body =
    abs >= 10
      ? abs.toLocaleString("en-GB", { maximumFractionDigits: 0 })
      : abs.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  return v < 0 ? `−${body} MW` : `${body} MW`;
}

/** Built interconnectors: current firm import TEC (MW) at the register pin. */
export function interconnectorBuiltCapacityRanks(
  rows: Observation[],
): { id: string; label: string; value: number; exportMw: number | null }[] {
  const out: { id: string; label: string; value: number; exportMw: number | null }[] = [];
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    if (n.date_basis !== "built_current_pin_snapshot") continue;
    if (n.project_status !== "Built") continue;
    const label = n.project ?? "Unknown";
    const exportRaw = n.mw_export_current;
    const exportMw =
      exportRaw != null && exportRaw !== "" && Number.isFinite(Number(exportRaw))
        ? Number(exportRaw)
        : null;
    out.push({
      id: slugLabel(label),
      label,
      value: Number(r.value),
      exportMw,
    });
  }
  out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return out;
}

export function interconnectorCapacityPinDate(rows: Observation[]): string | null {
  const built = rows.find((r) => {
    const n = noteMap(r.notes ?? "");
    return n.date_basis === "built_current_pin_snapshot";
  });
  return built?.period_start ?? null;
}

export type GasStorageMeasure = "stock" | "stock_change" | "storage_capacity";

/** Annual DUKES 4.4a series for one storage measure (GWh). */
export function gasStorageSeries(
  rows: Observation[],
  measure: GasStorageMeasure,
  id: string,
  label: string,
): { id: string; label: string; points: Pt[] } {
  const filtered = rows
    .filter((r) => noteMap(r.notes ?? "").measure === measure)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id,
    label,
    points: filtered
      .filter((r) => r.value != null && Number.isFinite(Number(r.value)))
      .map((r) => ({
        t: Number(r.period_start.slice(0, 4)),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      })),
  };
}

export function gasStorageValueInYear(
  rows: Observation[],
  year: number,
  measure: GasStorageMeasure,
): number | null {
  const row = rows.find(
    (r) =>
      noteMap(r.notes ?? "").measure === measure &&
      r.period_start.startsWith(String(year)) &&
      r.value != null &&
      Number.isFinite(Number(r.value)),
  );
  return row?.value != null ? Number(row.value) : null;
}

function interconnectorRows(
  rows: Observation[],
  corridor: InterconnectorCorridor,
  flow: InterconnectorFlow,
): Observation[] {
  return rows
    .filter((r) => {
      const n = noteMap(r.notes ?? "");
      return n.corridor === corridor && n.flow === flow && r.value != null && Number.isFinite(Number(r.value));
    })
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

/** Quarterly UK-total (or corridor) flow series in GWh. */
export function interconnectorSeries(
  rows: Observation[],
  corridor: InterconnectorCorridor = "UK-total",
  flow: InterconnectorFlow = "Net imports",
): { id: string; label: string; points: Pt[] } {
  const filtered = interconnectorRows(rows, corridor, flow);
  return {
    id: `ic-${corridor}-${flow}`,
    label: `${corridor} · ${flow}`,
    points: filtered.map((r) => ({
      t: toT(r.period_start),
      v: Number(r.value),
      provisional: r.observation_status === "provisional",
    })),
  };
}

/** Sum of valued quarters in a calendar year for one corridor × flow. */
export function interconnectorYearSum(
  rows: Observation[],
  year: number,
  corridor: InterconnectorCorridor,
  flow: InterconnectorFlow,
): { value: number; quarters: number; provisional: boolean } | null {
  const qs = interconnectorRows(rows, corridor, flow).filter((r) =>
    r.period_start.startsWith(String(year)),
  );
  if (!qs.length) return null;
  const value = qs.reduce((s, r) => s + Number(r.value), 0);
  const provisional = qs.some((r) => r.observation_status === "provisional") || qs.length < 4;
  return { value, quarters: qs.length, provisional };
}

/** Per-corridor year sums for a flow (skip empty corridors). */
export function interconnectorCorridorYearTable(
  rows: Observation[],
  year: number,
  flow: InterconnectorFlow = "Net imports",
): { corridor: InterconnectorCorridor; value: number; quarters: number; provisional: boolean }[] {
  const out: { corridor: InterconnectorCorridor; value: number; quarters: number; provisional: boolean }[] =
    [];
  for (const corridor of INTERCONNECTOR_CORRIDORS) {
    if (corridor === "UK-total") continue;
    const sum = interconnectorYearSum(rows, year, corridor, flow);
    if (sum) out.push({ corridor, ...sum });
  }
  return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

export function slugLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function flowsForFuel(fuel: LifelineFuel): LifelineFlow[] {
  if (fuel === "oil" || fuel === "lng") return ["Imports"];
  return ["Imports", "Exports", "Net imports"];
}

export function fmtThousandTonnes(v: number): string {
  const abs = Math.abs(v);
  const body =
    abs >= 100
      ? abs.toLocaleString("en-GB", { maximumFractionDigits: 0 })
      : abs.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  return v < 0 ? `−${body} kt` : `${body} kt`;
}

export function fmtLifeline(fuel: LifelineFuel, v: number): string {
  return fuel === "oil" ? fmtThousandTonnes(v) : fmtGWh(v);
}

function yearRows(rows: Observation[], year: number): Observation[] {
  return rows.filter((r) => r.period_start.startsWith(String(year)));
}

/** Oil DUKES 3.7 — partner countries for one year (thousand tonnes). */
export function oilPartnerRanks(rows: Observation[], year: number): {
  partners: LifelineRow[];
  total: LifelineRow | null;
} {
  const partners: LifelineRow[] = [];
  let total: LifelineRow | null = null;
  for (const r of yearRows(rows, year)) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    const label = n.partner;
    if (!label) continue;
    const value = Number(r.value);
    const provisional = r.observation_status === "provisional";
    if (n.kind === "aggregate") {
      if (label === "Total imports") {
        total = { id: "total", label, value, kind: "aggregate", provisional };
      }
      continue;
    }
    if (n.kind !== "partner") continue;
    partners.push({
      id: slugLabel(label),
      label,
      value,
      kind: "partner",
      provisional,
    });
  }
  partners.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { partners, total };
}

/**
 * Gas DUKES 4.5a — partner ranks for Imports/Exports.
 * Net imports is publisher aggregate only (no partner ranks).
 * Combined mode sums Pipeline + LNG partner rows by name.
 */
export function gasPartnerRanks(
  rows: Observation[],
  year: number,
  flow: LifelineFlow,
  mode: GasMode,
): { partners: LifelineRow[]; total: LifelineRow | null; netOnly: boolean } {
  if (flow === "Net imports") {
    const net = yearRows(rows, year).find((r) => {
      const n = noteMap(r.notes ?? "");
      return n.flow === "Net imports" && n.kind === "aggregate" && r.value != null;
    });
    return {
      partners: [],
      total:
        net && net.value != null
          ? {
              id: "net",
              label: "Net imports",
              value: Number(net.value),
              kind: "aggregate",
              provisional: net.observation_status === "provisional",
            }
          : null,
      netOnly: true,
    };
  }

  const byPartner = new Map<string, LifelineRow>();
  let total: LifelineRow | null = null;

  for (const r of yearRows(rows, year)) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    if (n.flow !== flow) continue;
    const value = Number(r.value);
    const provisional = r.observation_status === "provisional";

    if (n.kind === "aggregate") {
      if (mode === "Combined" && n.mode === "Total" && n.partner === "Total imports" && flow === "Imports") {
        total = { id: "total", label: "Total imports", value, kind: "aggregate", provisional };
      } else if (mode === "Pipeline" && n.mode === "Pipeline" && (n.partner === "Total pipeline" || n.partner === "Total exports")) {
        total = { id: "total", label: n.partner, value, kind: "aggregate", provisional };
      } else if (mode === "LNG" && n.mode === "LNG" && n.partner === "Total LNG" && flow === "Imports") {
        total = { id: "total", label: "Total LNG", value, kind: "aggregate", provisional };
      } else if (flow === "Exports" && n.partner === "Total exports") {
        total = { id: "total", label: "Total exports", value, kind: "aggregate", provisional };
      }
      continue;
    }

    if (n.kind !== "partner" || !n.partner) continue;
    if (mode === "Pipeline" && n.mode !== "Pipeline") continue;
    if (mode === "LNG" && n.mode !== "LNG") continue;
    if (mode === "Combined" && n.mode !== "Pipeline" && n.mode !== "LNG") continue;

    const id = slugLabel(n.partner);
    const prev = byPartner.get(id);
    if (prev) {
      byPartner.set(id, {
        ...prev,
        value: prev.value + value,
        provisional: prev.provisional || provisional,
      });
    } else {
      byPartner.set(id, {
        id,
        label: n.partner,
        value,
        kind: "partner",
        provisional,
      });
    }
  }

  const partners = [...byPartner.values()].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { partners, total, netOnly: false };
}

/** LNG DUKES 4.6 — named UK terminals (keep zeros for idle / pre-commissioning years). */
export function lngTerminalRanks(rows: Observation[], year: number): {
  terminals: LifelineRow[];
  total: LifelineRow | null;
} {
  const terminals: LifelineRow[] = [];
  let total: LifelineRow | null = null;
  for (const r of yearRows(rows, year)) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    const label = n.terminal;
    if (!label) continue;
    const value = Number(r.value);
    const provisional = r.observation_status === "provisional";
    if (n.kind === "aggregate") {
      total = { id: "total", label, value, kind: "aggregate", provisional };
      continue;
    }
    if (n.kind !== "terminal") continue;
    terminals.push({
      id: slugLabel(label),
      label,
      value,
      kind: "terminal",
      provisional,
    });
  }
  terminals.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { terminals, total };
}

/** History for one oil partner (or Total imports aggregate). */
export function oilPartnerSeries(
  rows: Observation[],
  partnerId: string,
): { id: string; label: string; points: Pt[] } | null {
  const wantTotal = partnerId === "total";
  const points: Pt[] = [];
  let label = wantTotal ? "Total imports" : partnerId;
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    if (wantTotal) {
      if (n.kind !== "aggregate" || n.partner !== "Total imports") continue;
    } else {
      if (n.kind !== "partner" || slugLabel(n.partner ?? "") !== partnerId) continue;
      label = n.partner ?? label;
    }
    points.push({
      t: Number(r.period_start.slice(0, 4)),
      v: Number(r.value),
      provisional: r.observation_status === "provisional",
    });
  }
  if (!points.length) return null;
  points.sort((a, b) => a.t - b.t);
  return { id: `oil-${partnerId}`, label, points };
}

/** History for one gas partner under a flow × mode cut. */
export function gasPartnerSeries(
  rows: Observation[],
  partnerId: string,
  flow: LifelineFlow,
  mode: GasMode,
): { id: string; label: string; points: Pt[] } | null {
  if (flow === "Net imports") {
    const points: Pt[] = [];
    for (const r of rows) {
      if (r.value == null || !Number.isFinite(Number(r.value))) continue;
      const n = noteMap(r.notes ?? "");
      if (n.flow !== "Net imports" || n.kind !== "aggregate") continue;
      points.push({
        t: Number(r.period_start.slice(0, 4)),
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
      });
    }
    if (!points.length) return null;
    points.sort((a, b) => a.t - b.t);
    return { id: "gas-net", label: "Net imports", points };
  }

  const byYear = new Map<number, { v: number; provisional: boolean; label: string }>();
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    if (n.flow !== flow) continue;
    const year = Number(r.period_start.slice(0, 4));
    if (partnerId === "total") {
      const ok =
        (mode === "Combined" && n.kind === "aggregate" && n.mode === "Total" && n.partner === "Total imports") ||
        (mode === "Pipeline" && n.kind === "aggregate" && n.mode === "Pipeline" && (n.partner === "Total pipeline" || n.partner === "Total exports")) ||
        (mode === "LNG" && n.kind === "aggregate" && n.mode === "LNG" && n.partner === "Total LNG") ||
        (flow === "Exports" && n.kind === "aggregate" && n.partner === "Total exports");
      if (!ok) continue;
      byYear.set(year, {
        v: Number(r.value),
        provisional: r.observation_status === "provisional",
        label: n.partner ?? "Total",
      });
      continue;
    }
    if (n.kind !== "partner" || slugLabel(n.partner ?? "") !== partnerId) continue;
    if (mode === "Pipeline" && n.mode !== "Pipeline") continue;
    if (mode === "LNG" && n.mode !== "LNG") continue;
    if (mode === "Combined" && n.mode !== "Pipeline" && n.mode !== "LNG") continue;
    const prev = byYear.get(year);
    const v = Number(r.value);
    const provisional = r.observation_status === "provisional";
    if (prev) {
      byYear.set(year, {
        v: prev.v + v,
        provisional: prev.provisional || provisional,
        label: n.partner ?? prev.label,
      });
    } else {
      byYear.set(year, { v, provisional, label: n.partner ?? partnerId });
    }
  }
  if (!byYear.size) return null;
  const label = [...byYear.values()][0]?.label ?? partnerId;
  const points = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, x]) => ({ t, v: x.v, provisional: x.provisional }));
  return { id: `gas-${partnerId}`, label, points };
}

export function lngTerminalSeries(
  rows: Observation[],
  terminalId: string,
): { id: string; label: string; points: Pt[] } | null {
  const wantTotal = terminalId === "total";
  const points: Pt[] = [];
  let label = wantTotal ? "Total LNG imports" : terminalId;
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    if (wantTotal) {
      if (n.kind !== "aggregate") continue;
    } else {
      if (n.kind !== "terminal" || slugLabel(n.terminal ?? "") !== terminalId) continue;
      label = n.terminal ?? label;
    }
    if (wantTotal) label = n.terminal ?? label;
    points.push({
      t: Number(r.period_start.slice(0, 4)),
      v: Number(r.value),
      provisional: r.observation_status === "provisional",
    });
  }
  if (!points.length) return null;
  points.sort((a, b) => a.t - b.t);
  return { id: `lng-${terminalId}`, label, points };
}

export function lifelineYears(
  fuel: LifelineFuel,
  oil: Observation[],
  gas: Observation[],
  lng: Observation[],
): number[] {
  if (fuel === "oil") return yearsOf(oil);
  if (fuel === "gas") return yearsOf(gas);
  return yearsOf(lng);
}
