/**
 * Client-safe Energy Domain 01 pack types and chart helpers.
 * Keep node:fs / path out of this file — GenerationCanvas is a client component.
 * Server loaders live in load.ts (see Next.js client/server boundary docs).
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import type { Pt } from "../data";
import type { StationHistoryPack } from "./atlas-model";
import type { YearFuel } from "./generation-model";

export type { StationHistoryPack, StationHistoryRecord, AtlasReading } from "./atlas-model";

export type GenerationPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  mix: YearFuel[];
  sourceVersion: string;
  retrievedNote: string;
};

export type CapacityPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  /** Calendar years present (ascending). */
  years: number[];
  sourceVersion: string;
};

/** NESO GB operational year — monthly MWh derived from half-hourly MW. */
export type YearPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  /** Calendar year of the pin (currently one year). */
  year: number;
  sourceVersion: string;
};

/** Map point shared by REPD (renewables) and DUKES 5.11 (fossil/nuclear). */
export type AtlasPoint = {
  id: string;
  name: string;
  mw: number;
  family: "renewable" | "fossil" | "nuclear";
  technology?: string;
  primaryFuel?: string;
  region?: string;
  country?: string;
  operator?: string;
  /** REPD operational date (ISO date or year). */
  operationalDate?: string;
  /** DUKES year commissioned. */
  yearCommissioned?: number;
  lon: number;
  lat: number;
};

/**
 * Station atlas: REPD operational renewables (tiles + points) plus DUKES 5.11
 * fossil/nuclear major power producers. Not every licensed generator.
 */
export type AtlasPack = {
  /** ONS contextual boundaries in the station map projection; not spatial joins. */
  outline?: string;
  outlineAttribution?: string;
  meta: IndicatorMeta;
  observations: Observation[];
  offshoreMw: number;
  operationalSites: number;
  sitesWithCoordinates: number;
  tiles: { code: string; name: string; mw: number }[];
  largestSites: {
    ref: string;
    name: string;
    technology: string;
    mw: number;
    region: string;
    country: string;
    operator: string;
  }[];
  /** REPD WGS84 points (OSGB→WGS84). */
  renewablePoints: AtlasPoint[];
  /** DUKES 5.11 fossil + nuclear (GB/Wales/Scotland; NI omitted from map). */
  stations: {
    meta: IndicatorMeta | null;
    stationCount: number;
    withCoordinates: number;
    skippedNorthernIreland: number;
    largest: {
      id: string;
      name: string;
      technology: string;
      primaryFuel: string;
      family: "fossil" | "nuclear";
      mw: number;
      region: string;
      country: string;
    }[];
    points: AtlasPoint[];
    sourceVersion: string;
  } | null;
  /**
   * DESNZ experimental List of Electricity Generators (companion sheet in Electricity since 1920).
   * Closures and planned closures — not joined to live REPD/DUKES points.
   */
  history: StationHistoryPack | null;
  sourceVersion: string;
};

/** RankBars rows for REPD technology capacity (GW). */
export function atlasTechRows(
  observations: Observation[],
): { id: string; label: string; v: number }[] {
  return observations
    .filter((r) => r.value != null && Number.isFinite(r.value))
    .map((r) => {
      const label = (r.notes ?? "").replace(/^technology=/, "").trim() || "Unknown";
      return { id: label, label, v: (r.value as number) / 1000 };
    })
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
}

/** RankBars rows for one year of installed capacity (GW). */
export function capacityRowsForYear(
  observations: Observation[],
  year: number,
): { id: string; label: string; v: number }[] {
  return observations
    .filter((r) => r.period_start.startsWith(String(year)) && r.value != null && Number.isFinite(r.value))
    .map((r) => {
      const raw = (r.notes ?? "").replace(/^fuel=/, "").trim();
      // DUKES footnotes like "[note 4]" are source metadata, not chart labels.
      const label = raw.replace(/\s*\[note\s+\d+\]/gi, "").trim() || raw;
      return { id: raw, label, v: (r.value as number) / 1000 };
    })
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
}

/** Map NESO fuel labels into a small stack for TimeChart (monthly fractional year). */
const YEAR_STACK_GROUPS: { id: string; label: string; fuels: string[] }[] = [
  { id: "fossil", label: "Gas & coal", fuels: ["Gas", "Coal"] },
  { id: "nuclear", label: "Nuclear", fuels: ["Nuclear"] },
  { id: "wind", label: "Wind", fuels: ["Wind (metered)", "Wind (embedded)"] },
  { id: "other-renewables", label: "Solar, hydro & biomass", fuels: ["Solar", "Hydro", "Biomass"] },
  { id: "trade-other", label: "Imports, storage & other", fuels: ["Imports", "Storage", "Other"] },
];

function monthFuelMap(observations: Observation[]): { months: string[]; byMonthFuel: Map<string, number> } {
  const byMonthFuel = new Map<string, number>();
  for (const r of observations) {
    if (r.value == null || !Number.isFinite(r.value)) continue;
    const fuel = (r.notes ?? "").replace(/^fuel=/, "").trim();
    const key = `${r.period_start.slice(0, 7)}|${fuel}`;
    byMonthFuel.set(key, (byMonthFuel.get(key) ?? 0) + (r.value as number));
  }
  const months = [...new Set([...byMonthFuel.keys()].map((k) => k.split("|")[0]!))].sort();
  return { months, byMonthFuel };
}

function monthT(ym: string): number {
  const [ys, ms] = ym.split("-").map(Number);
  return (ys ?? 0) + ((ms ?? 1) - 1) / 12;
}

/** Monthly stack series in TWh (MWh ÷ 1e6) for share stacks. */
export function yearMonthlyStack(
  observations: Observation[],
): { id: string; label: string; points: Pt[] }[] {
  const { months, byMonthFuel } = monthFuelMap(observations);
  return YEAR_STACK_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    points: months.map((ym) => {
      let mwh = 0;
      for (const fuel of g.fuels) mwh += byMonthFuel.get(`${ym}|${fuel}`) ?? 0;
      return { t: monthT(ym), v: mwh / 1e6 };
    }),
  }));
}

/**
 * Absolute monthly TWh lines for A Year in Power (seasonality).
 * Prefer lines over share-stacks so the Y axis stays in TWh, not 0–1.
 */
export function yearMonthlyLines(
  observations: Observation[],
): { id: string; label: string; points: Pt[] }[] {
  const { months, byMonthFuel } = monthFuelMap(observations);
  // Keep ≤5 series so TimeChart end labels stay readable.
  const lines: { id: string; label: string; fuels: string[] }[] = [
    { id: "gas", label: "Gas", fuels: ["Gas"] },
    { id: "wind", label: "Wind", fuels: ["Wind (metered)", "Wind (embedded)"] },
    { id: "nuclear", label: "Nuclear", fuels: ["Nuclear"] },
    { id: "solar", label: "Solar", fuels: ["Solar"] },
    { id: "imports", label: "Imports", fuels: ["Imports"] },
  ];
  return lines.map((g) => ({
    id: g.id,
    label: g.label,
    points: months.map((ym) => {
      let mwh = 0;
      for (const fuel of g.fuels) mwh += byMonthFuel.get(`${ym}|${fuel}`) ?? 0;
      return { t: monthT(ym), v: mwh / 1e6 };
    }),
  }));
}
