/**
 * The Useful Energy Experiment — model (client-safe).
 *
 * Source: ECUK Whole energy flow tables (DESNZ, Official Statistics in Development), pinned and
 * parsed by `src/energy/connectors/useful_energy_flow.py` into `assumed_efficiencies.json`.
 *
 * Coverage the controls must respect:
 *   W2  useful / rejected by sector, 2017–latest
 *   W3  useful / rejected by sector × end use, latest year only
 *   Assumed Efficiencies  coefficients by sector × end use × fuel/technology, latest year only
 *   W1  ambient heat (all of it is domestic heat pumps: equals the heat-pump rows exactly in the latest year)
 *
 * The publisher's identity (Note 3), reproduced exactly by every published row:
 *   useful = consumption × efficiency
 *   rejected = max(0, consumption − useful)
 *   ambient heat = max(0, useful − consumption)   (heat pumps, efficiency > 1 — Note 2)
 * Because it reproduces, a user scenario can recalculate it transparently. Scenario outputs are
 * never DESNZ statistics and are labelled so wherever they appear.
 */

import type { AssumedEfficienciesPack, AssumedEfficiencyRow } from "./consumption-model";

export type UsefulSector = "domestic" | "services" | "industry" | "transport";
export type UsefulScope = UsefulSector | "all";
export type Assume = "published" | "scenario";

export const USEFUL_SECTORS: { id: UsefulSector; label: string }[] = [
  { id: "domestic", label: "Domestic" },
  { id: "services", label: "Services" },
  { id: "industry", label: "Industry" },
  { id: "transport", label: "Transport" },
];

export const sectorLabel = (id: UsefulScope) => (id === "all" ? "All sectors" : USEFUL_SECTORS.find((s) => s.id === id)!.label);

export type EffRow = AssumedEfficiencyRow & { fuel?: string | null; heading?: string };

export type UsefulPack = AssumedEfficienciesPack & {
  rows: EffRow[];
  by_sector_year?: { year: number; sector: string; kind: "useful" | "rejected"; ktoe: number }[];
  by_end_use?: { sector: string; end_use: string; useful_ktoe: number; rejected_ktoe: number; total_ktoe: number; year: number }[];
  counterfactual?: {
    sector: string;
    useful_now: number;
    rejected_now: number;
    useful_2017_efficiency: number;
    rejected_2017_efficiency: number;
    year: number;
  }[];
  notes?: Record<string, string>;
  identity?: { rule: string; max_abs_error_ktoe: number; reproducible: boolean; failures: string[] };
};

/** One band in the split flow: energy in, and where it goes. */
export type FlowItem = {
  id: string;
  label: string;
  consumption: number;
  useful: number;
  rejected: number;
  /** Ambient heat counted in useful (heat pumps). Not recorded consumption. */
  ambient: number;
  /** Published values for the same item, when the item is a scenario. */
  published?: { useful: number; rejected: number; ambient: number };
};

export type Overrides = Record<string, number>;

/** Row ids are positions in the pinned pack (stable for one release). */
export const rowId = (i: number) => String(i);

export function split(consumption: number, efficiency: number) {
  const useful = consumption * efficiency;
  return { useful, rejected: Math.max(0, consumption - useful), ambient: Math.max(0, useful - consumption) };
}

/** Coefficient bounds a scenario may use: up to 1 for conversions, a COP range for heat pumps. */
export function bounds(r: EffRow): [number, number] {
  return r.efficiency > 1 ? [1, 6] : [0, 1];
}

export function parseOverrides(raw: string | null): Overrides {
  const out: Overrides = {};
  for (const part of (raw ?? "").split(",")) {
    const [id, v] = part.split(":");
    const n = Number(v);
    if (id && Number.isFinite(n)) out[id] = n;
  }
  return out;
}

export const formatOverrides = (o: Overrides) =>
  Object.entries(o)
    .map(([k, v]) => `${k}:${Number(v.toFixed(3))}`)
    .join(",");

export function latestYear(pack: UsefulPack | null): number {
  return pack?.year ?? 2025;
}

export function yearsOf(pack: UsefulPack | null): number[] {
  return [...new Set((pack?.by_sector_year ?? []).map((r) => r.year))].sort((a, b) => a - b);
}

export function endUsesOf(pack: UsefulPack | null, sector: UsefulScope): string[] {
  if (!pack || sector === "all") return [];
  return (pack.by_end_use ?? []).filter((r) => r.sector === sector).map((r) => r.end_use);
}

/** Coefficient rows in scope, with their pack index. */
export function scopeRows(pack: UsefulPack | null, sector: UsefulScope, endUse: string): { id: string; row: EffRow }[] {
  if (!pack) return [];
  return pack.rows
    .map((row, i) => ({ id: rowId(i), row }))
    .filter(({ row }) => (sector === "all" || row.sector === sector) && (endUse === "all" || row.end_use.toLowerCase() === endUse.toLowerCase()))
    .filter(({ row }) => (row.consumption_ktoe ?? 0) > 0);
}

function fromRows(rows: { id: string; row: EffRow }[], o: Overrides) {
  let consumption = 0;
  let useful = 0;
  let rejected = 0;
  let ambient = 0;
  for (const { id, row } of rows) {
    const c = row.consumption_ktoe ?? 0;
    const sp = split(c, o[id] ?? row.efficiency);
    consumption += c;
    useful += sp.useful;
    rejected += sp.rejected;
    ambient += sp.ambient;
  }
  return { consumption, useful, rejected, ambient };
}

/**
 * Items for the split flow.
 *   all sectors      → four sectors (W2 for any year; coefficients reproduce W2 in the latest year)
 *   one sector       → its end uses (latest year), or the sector alone in earlier years
 *   one end use      → its fuel / technology rows (latest year)
 * In the latest year every item is computed from the coefficient rows, so a scenario and the
 * published estimate share one calculation.
 */
export function flowItems(
  pack: UsefulPack | null,
  ambientByYear: Map<number, number>,
  sector: UsefulScope,
  endUse: string,
  year: number,
  assume: Assume,
  o: Overrides,
): FlowItem[] {
  if (!pack) return [];
  const latest = latestYear(pack);
  const scenario = assume === "scenario";
  const withPublished = (item: FlowItem, rows: { id: string; row: EffRow }[]) => {
    if (!scenario) return item;
    const p = fromRows(rows, {});
    return { ...item, published: { useful: p.useful, rejected: p.rejected, ambient: p.ambient } };
  };

  if (year !== latest) {
    // Earlier years: W2 sector totals only. Domestic useful includes W1 ambient heat (Note 2).
    const w2 = (pack.by_sector_year ?? []).filter((r) => r.year === year);
    const sectors = sector === "all" ? USEFUL_SECTORS : USEFUL_SECTORS.filter((s) => s.id === sector);
    return sectors.map((s) => {
      const useful = w2.find((r) => r.sector === s.id && r.kind === "useful")?.ktoe ?? 0;
      const rejected = w2.find((r) => r.sector === s.id && r.kind === "rejected")?.ktoe ?? 0;
      const ambient = s.id === "domestic" ? (ambientByYear.get(year) ?? 0) : 0;
      return { id: s.id, label: s.label, consumption: useful + rejected - ambient, useful, rejected, ambient };
    });
  }

  if (sector === "all") {
    return USEFUL_SECTORS.map((s) => {
      const rows = scopeRows(pack, s.id, "all");
      return withPublished({ id: s.id, label: s.label, ...fromRows(rows, scenario ? o : {}) }, rows);
    });
  }

  if (endUse === "all") {
    return endUsesOf(pack, sector).map((e) => {
      const rows = scopeRows(pack, sector, e);
      return withPublished({ id: e, label: e, ...fromRows(rows, scenario ? o : {}) }, rows);
    });
  }

  return scopeRows(pack, sector, endUse).map(({ id, row }) => {
    const label = row.heading && row.heading !== row.end_use ? `${row.heading} · ${row.fuel_or_tech}` : row.fuel && row.fuel !== row.fuel_or_tech ? `${row.fuel} · ${row.fuel_or_tech}` : row.fuel_or_tech;
    const sp = split(row.consumption_ktoe ?? 0, scenario ? (o[id] ?? row.efficiency) : row.efficiency);
    const item: FlowItem = { id, label, consumption: row.consumption_ktoe ?? 0, ...sp };
    return withPublished(item, [{ id, row }]);
  });
}

export function totals(items: FlowItem[]) {
  return items.reduce(
    (a, i) => ({
      consumption: a.consumption + i.consumption,
      useful: a.useful + i.useful,
      rejected: a.rejected + i.rejected,
      ambient: a.ambient + i.ambient,
    }),
    { consumption: 0, useful: 0, rejected: 0, ambient: 0 },
  );
}

/** Rejected as a share of energy accounted for (useful + rejected), as DESNZ's "proportion rejected". */
export const rejectedShare = (t: { useful: number; rejected: number }) => (t.useful + t.rejected > 0 ? (t.rejected / (t.useful + t.rejected)) * 100 : 0);

/**
 * Sensitivity: change in the scope's rejected share (percentage points) if one coefficient is 10%
 * higher (capped at its bound), all others as published or as in the scenario. Exchange calculation.
 */
export function sensitivity(pack: UsefulPack | null, sector: UsefulScope, endUse: string, o: Overrides) {
  const rows = scopeRows(pack, sector, endUse);
  const base = fromRows(rows, o);
  const baseShare = rejectedShare(base);
  return rows
    .map(({ id, row }) => {
      const e = o[id] ?? row.efficiency;
      const [, hi] = bounds(row);
      const e2 = Math.min(hi, e * 1.1);
      const next = fromRows(rows, { ...o, [id]: e2 });
      const parts = sector === "all" ? [sectorLabel(row.sector as UsefulSector), row.end_use, row.fuel_or_tech] : endUse === "all" ? [row.end_use, row.fuel_or_tech] : [row.fuel_or_tech];
      const label = parts.filter((p, k) => p && p !== parts[k - 1]).join(" · ");
      return { id, label, delta: rejectedShare(next) - baseShare, from: e, to: e2 };
    })
    .filter((r) => Math.abs(r.delta) >= 0.05)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** The same end use named in another sector (W3), for comparison when comparable. */
export function sameEndUseElsewhere(pack: UsefulPack | null, sector: UsefulScope, endUse: string) {
  if (!pack || sector === "all" || endUse === "all") return [];
  return (pack.by_end_use ?? []).filter((r) => r.end_use.toLowerCase() === endUse.toLowerCase());
}

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;
export const fmtCoef = (v: number) => `${(v * 100).toFixed(v * 100 < 10 ? 1 : 0)}%`;
