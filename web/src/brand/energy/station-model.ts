import type { AtlasPoint } from './packs';
import type { YearFuel } from './generation-model';
import type { FuelId } from './fuels';

export type StationGroup = 'renewable' | 'storage' | 'fossil' | 'nuclear';
export const MAP_WIDTH = 540;
export const MAP_HEIGHT = 660;

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
  return [270 + (lon + 3.15) * Math.cos(55 * Math.PI / 180) * scale, 20 + (61.2 - lat) * scale];
}
export function isMapped(p: AtlasPoint): boolean {
  return Number.isFinite(p.mw) && p.mw > 0 && Number.isFinite(p.lon) && Number.isFinite(p.lat) && p.lon >= -8.8 && p.lon <= 3 && p.lat >= 49.5 && p.lat <= 61.2;
}
export function stationGroup(p: AtlasPoint): StationGroup {
  return /battery|storage|flywheel/i.test(p.technology ?? '') ? 'storage' : p.family;
}
export function stationTechnology(p: AtlasPoint): string { return p.primaryFuel || p.technology || 'Unspecified'; }
export function stationKey(p: AtlasPoint): string { return `${p.family === 'renewable' ? 'repd' : 'dukes'}:${p.id}`; }
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
