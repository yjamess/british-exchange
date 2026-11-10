/**
 * Domain 02 — Energy Consumption helpers (client-safe).
 * Parse structured notes from ECUK C1 / W1 curated rows.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import type { Pt } from "../data";

export const FINAL_CONSUMPTION_ID = "final-energy-consumption-by-sector";
export const PRIMARY_FLOW_ID = "primary-energy-flow-allocation";
export const DOMESTIC_END_USE_ID = "domestic-end-use";
export const CROSS_SECTOR_END_USE_ID = "cross-sector-end-use";
export const SUBNATIONAL_ID = "subnational-final-consumption";
export const CROSS_SECTOR_FROM = 2021;

export type GeographyPlace = {
  code: string;
  label: string;
  sectors: Record<string, Record<string, number>>;
};

export type AuthorityPlace = GeographyPlace & { la: string };

/** Mid-year usually resident population by GSS code (People pack). */
export type PopulationPlace = {
  code: string;
  label: string;
  geography: string;
  population: Record<string, number>;
};

export type PopulationPack = {
  indicator_id: string;
  unit: string;
  years: number[];
  places: PopulationPlace[];
  note: string;
};

export type GeographyPack = {
  meta: IndicatorMeta | null;
  years: number[];
  places: GeographyPlace[];
  authorities: AuthorityPlace[];
  note: string;
  authoritiesNote: string;
  /** Linked People mid-year population for per-resident intensity. */
  population: PopulationPack | null;
};

export type AssumedEfficiencyRow = {
  sector: string;
  end_use: string;
  fuel_or_tech: string;
  consumption_ktoe: number | null;
  efficiency: number;
  useful_ktoe: number | null;
  rejected_ktoe: number | null;
  year: number;
};

export type AssumedEfficienciesPack = {
  source: string;
  status: string;
  year: number;
  sector_scope: string;
  rows: AssumedEfficiencyRow[];
  note: string;
};

export type ConsumptionPack = {
  final: { meta: IndicatorMeta; observations: Observation[] } | null;
  flow: { meta: IndicatorMeta; observations: Observation[] } | null;
  endUse: { meta: IndicatorMeta; observations: Observation[] } | null;
  crossEndUse: { meta: IndicatorMeta; observations: Observation[] } | null;
  geography: GeographyPack | null;
  efficiencies: AssumedEfficienciesPack | null;
};

export type SectorId = "industry" | "transport" | "domestic" | "services" | "all-final";

export const SECTORS: { id: SectorId; label: string; stack: boolean }[] = [
  { id: "industry", label: "Industry", stack: true },
  { id: "transport", label: "Transport", stack: true },
  { id: "domestic", label: "Domestic", stack: true },
  { id: "services", label: "Services & other", stack: true },
  { id: "all-final", label: "All final users", stack: false },
];

/** W1 stages shown on the Metabolism strip (exclude nested useful/rejected totals). */
export const FLOW_STAGES = [
  "Primary energy",
  "Transfers",
  "Transformation",
  "Energy industry use",
  "Losses",
  "Non-energy use",
  "Final consumption",
] as const;

/**
 * Useful / rejected columns published on Table W1 from 2017 (Official Statistics in
 * Development; coefficients on Assumed Efficiencies). Not measured household/factory losses.
 */
export const USEFUL_FROM = 2017;

export const USEFUL_STAGES = [
  "Ambient heat",
  "Final consumption - useful",
  "Final consumption - rejected",
  "Total Useful",
  "Total Rejected",
] as const;

export function noteMap(notes: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (notes ?? "").split(";")) {
    const chunk = part.trim();
    if (!chunk.includes("=")) continue;
    const [k, ...rest] = chunk.split("=");
    const key = (k ?? "").trim().toLowerCase();
    const value = rest.join("=").trim();
    if (key && !(key in out)) out[key] = value;
  }
  return out;
}

export function yearsOf(rows: Observation[]): number[] {
  return [
    ...new Set(rows.map((r) => Number(r.period_start.slice(0, 4))).filter((y) => Number.isFinite(y))),
  ].sort((a, b) => a - b);
}

export type AppetiteMeasure = "absolute" | "share" | "index";

/** Sector totals (fuel=Total) as stack/line series — absolute ktoe, share of all-final, or index. */
export function sectorStack(
  rows: Observation[],
  measure: AppetiteMeasure,
  indexBaseYear = 1970,
): { id: string; label: string; points: Pt[] }[] {
  const by: Map<string, number> = new Map();
  const allFinal = new Map<number, number>();
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    const n = noteMap(r.notes);
    if (n.fuel !== "Total") continue;
    const y = Number(r.period_start.slice(0, 4));
    const sector = n.sector as SectorId | undefined;
    if (!sector) continue;
    if (sector === "all-final") allFinal.set(y, r.value as number);
    by.set(`${sector}|${y}`, r.value as number);
  }
  const years = [...allFinal.keys()].sort((a, b) => a - b);
  return SECTORS.filter((s) => s.stack).map((s) => {
    const base = by.get(`${s.id}|${indexBaseYear}`) || 0;
    return {
      id: s.id,
      label: s.label,
      points: years.map((y) => {
        const v = by.get(`${s.id}|${y}`) ?? 0;
        const den = allFinal.get(y) || 1;
        let out = v;
        if (measure === "share") out = v / den;
        else if (measure === "index") out = base > 0 ? (v / base) * 100 : 0;
        return { t: y, v: out };
      }),
    };
  });
}

/** Then/Now sector totals (fuel=Total) for two years — absolute ktoe. */
export function sectorThenNow(
  rows: Observation[],
  yearA: number,
  yearB: number,
): { id: string; label: string; a: number; b: number; delta: number }[] {
  const val = (sector: SectorId, year: number) => {
    const hit = rows.find((r) => {
      if (r.value == null || !Number.isFinite(r.value)) return false;
      if (!r.period_start.startsWith(String(year))) return false;
      const n = noteMap(r.notes);
      return n.sector === sector && n.fuel === "Total";
    });
    return (hit?.value as number) ?? 0;
  };
  return SECTORS.filter((s) => s.stack).map((s) => {
    const a = val(s.id, yearA);
    const b = val(s.id, yearB);
    return { id: s.id, label: s.label, a, b, delta: b - a };
  });
}

/** Fuel rows for one sector × year (exclude Total), ktoe descending. */
export function fuelRowsFor(
  rows: Observation[],
  sector: SectorId,
  year: number,
): { id: string; label: string; v: number }[] {
  return rows
    .filter((r) => {
      if (r.value == null || !Number.isFinite(r.value)) return false;
      if (!r.period_start.startsWith(String(year))) return false;
      const n = noteMap(r.notes);
      return n.sector === sector && n.fuel !== "Total" && (r.value as number) > 0;
    })
    .map((r) => {
      const fuel = noteMap(r.notes).fuel || "Unknown";
      return { id: fuel, label: fuel, v: r.value as number };
    })
    .sort((a, b) => b.v - a.v);
}

export function flowRowsFor(
  rows: Observation[],
  year: number,
): { id: string; label: string; v: number }[] {
  const wanted = new Set<string>(FLOW_STAGES);
  return rows
    .filter((r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(r.value))
    .map((r) => {
      const stage = noteMap(r.notes).stage || "";
      return { id: stage, label: stage, v: r.value as number };
    })
    .filter((r) => wanted.has(r.id) && r.v !== 0)
    .sort((a, b) => FLOW_STAGES.indexOf(a.id as (typeof FLOW_STAGES)[number]) - FLOW_STAGES.indexOf(b.id as (typeof FLOW_STAGES)[number]));
}

/** Modelled useful / rejected bands from W1 (≥2017). Empty when year is earlier or cells are missing. */
export function usefulRowsFor(
  rows: Observation[],
  year: number,
): { id: string; label: string; v: number }[] {
  if (year < USEFUL_FROM) return [];
  const wanted = new Set<string>(USEFUL_STAGES);
  return rows
    .filter((r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(r.value))
    .map((r) => {
      const stage = noteMap(r.notes).stage || "";
      return { id: stage, label: stage, v: r.value as number };
    })
    .filter((r) => wanted.has(r.id) && r.v !== 0)
    .sort(
      (a, b) =>
        USEFUL_STAGES.indexOf(a.id as (typeof USEFUL_STAGES)[number]) -
        USEFUL_STAGES.indexOf(b.id as (typeof USEFUL_STAGES)[number]),
    );
}

export function fmtKtoe(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} Mtoe`;
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })} ktoe`;
}

/** Domestic end-use totals (fuel=Total), excluding the domestic aggregate column. */
export const DOMESTIC_END_USES = [
  "space heating",
  "water heating",
  "cooking",
  "lighting",
  "appliances",
] as const;

export type DomesticEndUseId = (typeof DOMESTIC_END_USES)[number];

/** Stack of domestic end-use totals over time (ktoe). */
export function endUseStack(rows: Observation[]): { id: string; label: string; points: Pt[] }[] {
  const by = new Map<string, number>();
  const years = new Set<number>();
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    const n = noteMap(r.notes);
    if (n.fuel !== "Total") continue;
    if (!DOMESTIC_END_USES.includes(n.end_use as DomesticEndUseId)) continue;
    const y = Number(r.period_start.slice(0, 4));
    years.add(y);
    by.set(`${n.end_use}|${y}`, r.value as number);
  }
  const sorted = [...years].sort((a, b) => a - b);
  return DOMESTIC_END_USES.map((id) => ({
    id,
    label: id.replace(/\b\w/g, (c) => c.toUpperCase()),
    points: sorted.map((y) => ({ t: y, v: by.get(`${id}|${y}`) ?? 0 })),
  }));
}

/** U1 cross-sector end-use totals (sector=total) as a stack, 2021– only. */
export function crossEndUseStack(rows: Observation[]): { id: string; label: string; points: Pt[] }[] {
  const by = new Map<string, number>();
  const years = new Set<number>();
  const ends = new Set<string>();
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    const n = noteMap(r.notes);
    if (n.sector !== "total") continue;
    const y = Number(r.period_start.slice(0, 4));
    const end = n.end_use;
    if (!end) continue;
    years.add(y);
    ends.add(end);
    by.set(`${end}|${y}`, r.value as number);
  }
  const sortedY = [...years].sort((a, b) => a - b);
  return [...ends].sort().map((end) => ({
    id: end,
    label: end,
    points: sortedY.map((y) => ({ t: y, v: by.get(`${end}|${y}`) ?? 0 })),
  }));
}

/** U1 sector split for one end use × year (exclude total). */
export function crossEndUseSectorRows(
  rows: Observation[],
  endUse: string,
  year: number,
): { id: string; label: string; v: number }[] {
  return rows
    .filter((r) => {
      if (r.value == null || !Number.isFinite(r.value)) return false;
      if (!r.period_start.startsWith(String(year))) return false;
      const n = noteMap(r.notes);
      return n.end_use === endUse && n.sector !== "total" && (r.value as number) > 0;
    })
    .map((r) => {
      const sector = noteMap(r.notes).sector || "unknown";
      return { id: sector, label: sector, v: r.value as number };
    })
    .sort((a, b) => b.v - a.v);
}

/** Fuel split for one domestic end use × year (exclude Total / missing). */
export function endUseFuelRows(
  rows: Observation[],
  endUse: DomesticEndUseId,
  year: number,
): { id: string; label: string; v: number }[] {
  return rows
    .filter((r) => {
      if (r.value == null || !Number.isFinite(r.value)) return false;
      if (!r.period_start.startsWith(String(year))) return false;
      const n = noteMap(r.notes);
      return n.end_use === endUse && n.fuel !== "Total" && (r.value as number) > 0;
    })
    .map((r) => {
      const fuel = noteMap(r.notes).fuel || "Unknown";
      return { id: fuel, label: fuel, v: r.value as number };
    })
    .sort((a, b) => b.v - a.v);
}

/**
 * Resolve mid-year population for a GSS code and energy calendar year.
 * Prefer the matching mid-year; else fall back to mid-2024 (regions) and
 * return which denominator year was used so Notes can say so.
 */
export function populationFor(
  pack: PopulationPack | null | undefined,
  code: string,
  year: number,
): { persons: number; denomYear: number } | null {
  if (!pack) return null;
  const place = pack.places.find((p) => p.code === code);
  if (!place) return null;
  const exact = place.population[String(year)];
  if (typeof exact === "number" && exact > 0) return { persons: exact, denomYear: year };
  const fallback = place.population["2024"];
  if (typeof fallback === "number" && fallback > 0) return { persons: fallback, denomYear: 2024 };
  return null;
}

/** ktoe → toe per resident. */
export function toePerResident(ktoe: number, persons: number): number {
  return (ktoe * 1000) / persons;
}

/** English regions + devolved nations for RankBars (exclude UK/GB aggregates). */
export function geographyRankRows(
  places: GeographyPlace[],
  year: number,
  sector: string,
  population?: PopulationPack | null,
  intensity = false,
): { id: string; label: string; v: number; denomYear?: number }[] {
  const skip = new Set(["K02000001", "K03000001", "K04000001", "E92000001"]);
  return places
    .filter((p) => !skip.has(p.code))
    .map((p) => {
      const ktoe = p.sectors[sector]?.[String(year)] ?? 0;
      if (!intensity) {
        return { id: p.code, label: p.label.replace(/ \(inc unallocated\)/i, ""), v: ktoe };
      }
      const pop = populationFor(population, p.code, year);
      if (!pop || ktoe <= 0) return { id: p.code, label: p.label.replace(/ \(inc unallocated\)/i, ""), v: 0 };
      return {
        id: p.code,
        label: p.label.replace(/ \(inc unallocated\)/i, ""),
        v: toePerResident(ktoe, pop.persons),
        denomYear: pop.denomYear,
      };
    })
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
}

/**
 * Parent nation / English region from an authority label like
 * `Leeds (Yorkshire and The Humber)` → `E12000003`.
 */
export function regionCodeForAuthorityLabel(
  label: string,
  places: GeographyPlace[],
): string {
  const m = /\(([^)]+)\)\s*$/.exec(label);
  if (!m) return "";
  const name = m[1]!.trim().toLowerCase();
  const byName = new Map(
    places.map((p) => [
      p.label.replace(/ \(inc unallocated\)/i, "").trim().toLowerCase(),
      p.code,
    ]),
  );
  return byName.get(name) ?? "";
}

/** Top local authorities for a year × All-fuels sector (totals or intensity). */
export function authorityRankRows(
  places: AuthorityPlace[],
  year: number,
  sector: string,
  limit = 20,
  population?: PopulationPack | null,
  intensity = false,
): { id: string; label: string; v: number; denomYear?: number }[] {
  return places
    .filter((p) => p.la !== "Unallocated")
    .map((p) => {
      const ktoe = p.sectors[sector]?.[String(year)] ?? 0;
      if (!intensity) {
        return { id: p.code, label: p.label, v: ktoe };
      }
      const pop = populationFor(population, p.code, year);
      if (!pop || ktoe <= 0) return { id: p.code, label: p.label, v: 0 };
      return {
        id: p.code,
        label: p.label,
        v: toePerResident(ktoe, pop.persons),
        denomYear: pop.denomYear,
      };
    })
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, limit);
}
