/**
 * Station atlas wave 2 — regional concentration and openings / closures.
 * Live map points carry region + operational / commission years.
 * Closed-plant history comes from DESNZ "List of Electricity Generators"
 * (experimental companion in the Electricity since 1920 workbook).
 */

import type { AtlasPoint } from "./packs";
import { isMapped, normalizeRegion, stationGroup } from "./station-model";

export type StationHistoryRecord = {
  id: string;
  name: string;
  region: string | null;
  commissioned: string | null;
  closureOrPlanned: string | null;
  capacityMw: number | null;
  fuel: string | null;
};

export type StationHistoryPack = {
  sheet: string;
  caveat: string;
  sourceVersion: string;
  records: StationHistoryRecord[];
};

export type AtlasReading = "stations" | "regions" | "openings";

export { normalizeRegion };

function yearOf(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const y = typeof raw === "number" ? raw : Number(String(raw).slice(0, 4));
  return Number.isFinite(y) && y >= 1800 && y <= 2100 ? y : null;
}

/**
 * Capacity buckets that may be summed on their own but never into one fleet total:
 * - `generation` — REPD renewable generators (excluding storage)
 * - `storage`    — REPD batteries / pumped storage etc. (power that moves energy in time)
 * - `thermal`    — DUKES 5.11 fossil and nuclear major power producers
 * The two registers differ in dates and coverage, and storage MW is not additional generation.
 */
export type CapacityBucket = "generation" | "storage" | "thermal";

export const CAPACITY_BUCKETS: { id: CapacityBucket; label: string; register: string }[] = [
  { id: "generation", label: "Renewables", register: "Planning register" },
  { id: "storage", label: "Storage", register: "Planning register" },
  { id: "thermal", label: "Fossil and nuclear", register: "Power producers register" },
];

export function capacityBucket(p: AtlasPoint): CapacityBucket {
  const group = stationGroup(p);
  if (group === "storage") return "storage";
  return group === "renewable" ? "generation" : "thermal";
}

/** Installed GW and site count for one bucket only. */
export function bucketTotals(points: AtlasPoint[], bucket: CapacityBucket): { gw: number; sites: number } {
  let mw = 0;
  let sites = 0;
  for (const p of points) {
    if (capacityBucket(p) !== bucket) continue;
    mw += p.mw;
    sites += 1;
  }
  return { gw: mw / 1000, sites };
}

/**
 * Installed GW by region for the mapped selection. Pass points from a single
 * capacity bucket (see `capacityBucket`) — rows from different buckets must not be mixed.
 */
export function regionCapacityRows(points: AtlasPoint[]): { id: string; label: string; v: number; sites: number }[] {
  const acc = new Map<string, { mw: number; sites: number }>();
  for (const p of points) {
    if (!isMapped(p)) continue;
    const id = normalizeRegion(p.region);
    const cur = acc.get(id) ?? { mw: 0, sites: 0 };
    cur.mw += p.mw;
    cur.sites += 1;
    acc.set(id, cur);
  }
  return [...acc.entries()]
    .map(([id, { mw, sites }]) => ({ id, label: id, v: mw / 1000, sites }))
    .sort((a, b) => b.v - a.v);
}

export type DecadeFlow = {
  decade: number;
  openedMw: number;
  closedMw: number;
  openedN: number;
  closedN: number;
};

/** Decade openings / closures from the experimental historical register (MW). */
export function historyDecadeFlows(records: StationHistoryRecord[]): DecadeFlow[] {
  const by = new Map<number, DecadeFlow>();
  const bump = (decade: number) => {
    let row = by.get(decade);
    if (!row) {
      row = { decade, openedMw: 0, closedMw: 0, openedN: 0, closedN: 0 };
      by.set(decade, row);
    }
    return row;
  };
  for (const r of records) {
    const open = yearOf(r.commissioned);
    const close = yearOf(r.closureOrPlanned);
    const mw = r.capacityMw ?? 0;
    if (open != null) {
      const row = bump(Math.floor(open / 10) * 10);
      row.openedN += 1;
      row.openedMw += mw;
    }
    if (close != null) {
      const row = bump(Math.floor(close / 10) * 10);
      row.closedN += 1;
      row.closedMw += mw;
    }
  }
  return [...by.values()].sort((a, b) => a.decade - b.decade);
}

/** Largest closures (by MW) with a known closure / planned year. */
export function largestClosures(records: StationHistoryRecord[], limit = 8): StationHistoryRecord[] {
  return records
    .filter((r) => yearOf(r.closureOrPlanned) != null && (r.capacityMw ?? 0) > 0)
    .toSorted((a, b) => (b.capacityMw ?? 0) - (a.capacityMw ?? 0))
    .slice(0, limit);
}

/** Live-register openings by decade (REPD operational year + DUKES commission year). No closures. */
export function liveOpeningsByDecade(points: AtlasPoint[]): { decade: number; mw: number; n: number }[] {
  const by = new Map<number, { mw: number; n: number }>();
  for (const p of points) {
    if (!isMapped(p) || stationGroup(p) === "storage") continue;
    const y = yearOf(p.yearCommissioned) ?? yearOf(p.operationalDate);
    if (y == null) continue;
    const d = Math.floor(y / 10) * 10;
    const cur = by.get(d) ?? { mw: 0, n: 0 };
    cur.mw += p.mw;
    cur.n += 1;
    by.set(d, cur);
  }
  return [...by.entries()]
    .map(([decade, { mw, n }]) => ({ decade, mw, n }))
    .sort((a, b) => a.decade - b.decade);
}

export function fmtGw(v: number): string {
  if (v >= 10) return `${v.toFixed(1)} GW`;
  if (v >= 1) return `${v.toFixed(2)} GW`;
  return `${(v * 1000).toFixed(0)} MW`;
}
