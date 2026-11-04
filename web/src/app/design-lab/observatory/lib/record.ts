/**
 * Server-side loaders for Lab 03. Everything the page draws is derived
 * from these real series — no decorative data.
 */

import { fetchIndicator, fetchObservations, type IndicatorMeta, type Observation } from "@/lib/api";

export type Point = { year: number; v: number };

export type SeriesRecord = {
  id: string;
  title: string;
  sector: string;
  publisher: string;
  seriesId: string;
  unit: string;
  geography: string;
  sourceUrl: string;
  points: Point[];
};

export type Figure = {
  id: string;
  title: string;
  value: string;
  period: string;
  publisher: string;
  seriesId: string;
  unit: string;
  geography: string;
  frequency: string;
  sourceUrl: string;
  /** Recent history for the guilloché signature (normalised later). */
  recent: number[];
};

/** Pick the dominant (dimensions × geography) slice so we never mix categories. */
function dominantSlice(rows: Observation[]): Observation[] {
  const key = (r: Observation) => `${r.geography_code}|${JSON.stringify(r.dimensions ?? null)}`;
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  // Prefer the UK total when present
  const uk = [...counts.keys()].filter((k) => k.startsWith("K02000001|"));
  const pool = uk.length ? uk : [...counts.keys()];
  const best = pool.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];
  return rows.filter((r) => key(r) === best);
}

/** Annual mean of the dominant slice. */
function annualise(rows: Observation[]): Point[] {
  const by = new Map<number, number[]>();
  for (const r of dominantSlice(rows.filter((x) => x.value !== null))) {
    const y = Number(r.period_start.slice(0, 4));
    if (!by.has(y)) by.set(y, []);
    by.get(y)!.push(r.value as number);
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, vs]) => ({ year, v: vs.reduce((a, b) => a + b, 0) / vs.length }));
}

function toRecord(meta: IndicatorMeta, rows: Observation[]): SeriesRecord {
  return {
    id: meta.indicator_id,
    title: meta.title,
    sector: meta.sector,
    publisher: meta.publisher,
    seriesId: meta.series_id,
    unit: meta.unit,
    geography: meta.geography,
    sourceUrl: meta.source_url,
    points: annualise(rows),
  };
}

export async function loadSeries(id: string): Promise<SeriesRecord | null> {
  try {
    const [meta, obs] = await Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })]);
    return toRecord(meta, obs.observations);
  } catch {
    return null;
  }
}

/** Every series in the catalogue, annualised — the "frontier" field. */
export async function loadCatalogue(): Promise<SeriesRecord[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/indicators`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const list = (await res.json()) as { indicator_id: string }[];
    const all = await Promise.all(list.map((r) => loadSeries(r.indicator_id)));
    return all.filter((r): r is SeriesRecord => !!r && r.points.length >= 3);
  } catch {
    return [];
  }
}

/** Unit-aware formatting for headline figures (avoids the index/% ambiguity). */
export function formatFigure(v: number, unit: string): string {
  const u = unit.toLowerCase();
  if (u.startsWith("%") || u.startsWith("percent")) return `${v.toFixed(1)}%`;
  if (u.startsWith("£ billion")) return v >= 1000 ? `£${(v / 1000).toFixed(2)}tn` : `£${v.toFixed(0)}bn`;
  if (u.startsWith("persons")) return `${(v / 1e6).toFixed(1)}m`;
  if (u.startsWith("million tonnes")) return `${v.toFixed(1)}Mt`;
  if (u.startsWith("ratio")) return `${v.toFixed(1)}×`;
  return v.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function loadFigure(id: string): Promise<Figure | null> {
  try {
    const [meta, obs] = await Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })]);
    const rows = dominantSlice(obs.observations.filter((r) => r.value !== null));
    const last = rows[rows.length - 1];
    if (!last || last.value === null) return null;
    const [y, m] = last.period_start.split("-");
    return {
      id,
      title: meta.title,
      value: formatFigure(last.value, meta.unit),
      period: meta.frequency === "annual" ? y! : `${MONTHS[Number(m) - 1]} ${y}`,
      publisher: meta.publisher,
      seriesId: meta.series_id,
      unit: meta.unit,
      geography: meta.geography,
      frequency: meta.frequency,
      sourceUrl: meta.source_url,
      recent: rows.slice(-180).map((r) => r.value as number),
    };
  } catch {
    return null;
  }
}
