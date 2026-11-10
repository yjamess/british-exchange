import { stationNationalGenerationHref } from "../connections/energy";
import type { AtlasPoint } from './packs';
import type { YearFuel } from './generation-model';
import type { FuelId } from './fuels';

export type StationGroup = 'renewable' | 'storage' | 'fossil' | 'nuclear';
/** Owning register — part of the stable station identity (never id alone). */
export type StationRegister = "repd" | "dukes";

export const MAP_WIDTH = 540;
export const MAP_HEIGHT = 660;

/**
 * Stable reference for a power station, independent of Atlas UI state.
 * Encode in URLs as `station=<register>:<id>` (see `formatStationKey`).
 */
export type StationRef = {
  register: StationRegister;
  id: string;
};

/**
 * Geography as published on the register.
 *
 * `regionLabel` is useful for filtering and captions. It is **not** sufficient
 * for precise spatial or administrative joins — those need validated ONS /
 * geography codes or geometry (kept null until available).
 */
export type StationGeography = {
  regionLabel: string | null;
  countryLabel: string | null;
  /** Mapped coordinates when the register supplies them; not an admin boundary. */
  lon: number | null;
  lat: number | null;
  /** Reserved for future validated joins — always null today. */
  geographyCode: null;
  geometryId: null;
};

/**
 * Portable selection context: identity, technology, capacity, dates, geography
 * honesty, and the existing national-generation connection (not site output).
 * Resolve from atlas points + URL key anywhere — not only inside AtlasStage.
 */
export type StationSelection = {
  ref: StationRef;
  key: string;
  name: string;
  technology: string;
  group: StationGroup;
  capacityMw: number;
  geography: StationGeography;
  /** Operational (REPD) or commissioned (DUKES) year/date from the owning register. */
  opened: string | null;
  operator: string | null;
  /**
   * Contextual connection already used by the Atlas evidence panel:
   * national Energy Trends generation for an explicit technology match.
   * Never site-level MWh.
   */
  nationalGeneration: {
    fuel: FuelId;
    year: number;
    twh: number;
    share: number | null;
    provisional: boolean;
    /** Shareable in-app destination for the national series. */
    href: string;
  } | null;
};

/** Canonical English region / nation labels for ranking and filters. */
const REGION_ALIAS: Record<string, string> = {
  east: "East of England",
  eastern: "East of England",
  "east of england": "East of England",
  "yorkshire and the humber": "Yorkshire and Humber",
  "yorkshire and humber": "Yorkshire and Humber",
  "north west": "North West",
  "west midlands": "West Midlands",
  "east midlands": "East Midlands",
  "south east": "South East",
  "south west": "South West",
  "north east": "North East",
  london: "London",
  scotland: "Scotland",
  wales: "Wales",
  "northern ireland": "Northern Ireland",
  offshore: "Offshore",
};

export function normalizeRegion(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Unspecified";
  const key = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return REGION_ALIAS[key] ?? raw.trim().replace(/\s+/g, " ");
}
// Equirectangular projection, longitude scaled at 55°N; fixed across every filter.
export function stationPosition(lon: number, lat: number): [number, number] {
  const scale = 54;
  // Round to 1/100 px: server and browser print long floats differently, which breaks hydration.
  const r = (v: number) => Math.round(v * 100) / 100;
  return [r(270 + (lon + 3.15) * Math.cos(55 * Math.PI / 180) * scale), r(20 + (61.2 - lat) * scale)];
}
export function isMapped(p: AtlasPoint): boolean {
  return Number.isFinite(p.mw) && p.mw > 0 && Number.isFinite(p.lon) && Number.isFinite(p.lat) && p.lon >= -8.8 && p.lon <= 3 && p.lat >= 49.5 && p.lat <= 61.2;
}
export function stationGroup(p: AtlasPoint): StationGroup {
  return /battery|storage|flywheel/i.test(p.technology ?? '') ? 'storage' : p.family;
}
export function stationTechnology(p: AtlasPoint): string { return p.primaryFuel || p.technology || 'Unspecified'; }

export function stationRegister(p: AtlasPoint): StationRegister {
  return p.family === "renewable" ? "repd" : "dukes";
}

export function stationKey(p: AtlasPoint): string {
  return formatStationKey({ register: stationRegister(p), id: p.id });
}

export function formatStationKey(ref: StationRef): string {
  return `${ref.register}:${ref.id}`;
}

/** Parse `station=` from the URL. Rejects bare ids without a register namespace. */
export function parseStationKey(raw: string | null | undefined): StationRef | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const m = /^(repd|dukes):(.+)$/i.exec(trimmed);
  if (!m) return null;
  const id = m[2]!.trim();
  if (!id) return null;
  return { register: m[1]!.toLowerCase() as StationRegister, id };
}

export function findStationPoint(points: readonly AtlasPoint[], rawKey: string | null | undefined): AtlasPoint | null {
  const ref = parseStationKey(rawKey);
  if (!ref) return null;
  const key = formatStationKey(ref);
  return points.find((p) => stationKey(p) === key) ?? null;
}
export function filterStations(
  points: AtlasPoint[],
  family: string,
  technology: string,
  search: string,
  region = "",
): AtlasPoint[] {
  const q = search.trim().toLocaleLowerCase("en-GB");
  const regionNeedle = region.trim().toLocaleLowerCase("en-GB");
  return points.filter((p) => {
    if (!isMapped(p)) return false;
    if (family !== "all" && stationGroup(p) !== family) return false;
    if (technology && stationTechnology(p) !== technology) return false;
    if (regionNeedle && normalizeRegion(p.region).toLocaleLowerCase("en-GB") !== regionNeedle) return false;
    if (!q) return true;
    const hay = [p.name, stationTechnology(p), p.region, p.country, p.operator, p.primaryFuel]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("en-GB");
    return hay.includes(q);
  });
}

/** Place label for the map caption / panel (region · country). */
export function stationPlace(p: AtlasPoint): string {
  const parts = [p.region, p.country && p.country !== p.region ? p.country : null].filter(Boolean);
  return parts.join(' · ');
}

/** Operational / commissioned year from the register that owns the point. */
export function stationOpened(p: AtlasPoint): string | null {
  if (p.yearCommissioned != null && Number.isFinite(p.yearCommissioned)) return String(p.yearCommissioned);
  if (p.operationalDate) {
    const y = Number(String(p.operationalDate).slice(0, 4));
    return Number.isFinite(y) ? String(y) : p.operationalDate;
  }
  return null;
}
/** Only explicit technology matches. No capacity factors or inferred station output. */
export function generationContext(p: AtlasPoint, mix: YearFuel[]) {
  const tech = stationTechnology(p).toLowerCase();
  let fuel: FuelId | null = null;
  if (stationGroup(p) === 'storage') return null;
  if (tech === 'natural gas') fuel = 'gas';
  else if (p.family === 'nuclear') fuel = 'nuclear';
  else if (tech === 'wind offshore') fuel = 'offshore-wind';
  else if (tech === 'wind onshore') fuel = 'onshore-wind';
  else if (tech === 'solar photovoltaics') fuel = 'solar';
  else if (tech === 'small hydro' || tech === 'large hydro') fuel = 'hydro';
  else if (tech === 'coal') fuel = 'coal';
  if (!fuel) return null;
  const row = [...mix].filter(r => !r.partial).sort((a,b) => b.year-a.year)[0];
  if (!row || !Number.isFinite(row.byFuel[fuel])) return null;
  return { fuel, year: row.year, twh: row.byFuel[fuel], share: row.total > 0 ? row.byFuel[fuel] / row.total * 100 : null, provisional: row.provisional };
}

/**
 * Build a portable selection from register points + optional national mix.
 * Call from Atlas, deep links, or future connection handlers — same shape everywhere.
 */
export function resolveStationSelection(
  points: readonly AtlasPoint[],
  rawKey: string | null | undefined,
  mix: YearFuel[] = [],
): StationSelection | null {
  const point = findStationPoint(points, rawKey);
  if (!point) return null;
  const ref = { register: stationRegister(point), id: point.id };
  const ctx = mix.length ? generationContext(point, mix) : null;
  const regionLabel = point.region?.trim() ? normalizeRegion(point.region) : null;
  const countryLabel = point.country?.trim() && point.country !== point.region ? point.country.trim() : null;
  return {
    ref,
    key: formatStationKey(ref),
    name: point.name,
    technology: stationTechnology(point),
    group: stationGroup(point),
    capacityMw: point.mw,
    geography: {
      regionLabel: regionLabel === "Unspecified" ? null : regionLabel,
      countryLabel,
      lon: Number.isFinite(point.lon) ? point.lon : null,
      lat: Number.isFinite(point.lat) ? point.lat : null,
      geographyCode: null,
      geometryId: null,
    },
    opened: stationOpened(point),
    operator: point.operator?.trim() || null,
    nationalGeneration: ctx
      ? {
          fuel: ctx.fuel,
          year: ctx.year,
          twh: ctx.twh,
          share: ctx.share,
          provisional: ctx.provisional,
          href:
            stationNationalGenerationHref(ctx.fuel, ctx.year) ??
            `/energy?domain=generation&view=data&dataset=quarterly&fuel=${ctx.fuel}&year=${ctx.year}`,
        }
      : null,
  };
}
