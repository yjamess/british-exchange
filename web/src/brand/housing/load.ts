/**
 * Housing & Land — server loader (v1).
 * Pulls every Ready housing series from the Exchange API and shapes them for the explorer.
 * Rules: never mix geographies or snapshot conventions in one line; carry provisional status;
 * derived measures (rent annual change, rolling-year completions) are computed here and labelled.
 */

import { fetchIndicator, fetchObservations, type IndicatorMeta, type Observation } from "@/lib/api";
import { toT, type Pt } from "../data";

export type Source = {
  id: string;
  title: string;
  publisher: string;
  seriesId: string;
  unit: string;
  geography: string;
  frequency: string;
  sourceUrl: string;
  release: string;
  first: string;
  last: string;
  count: number;
  provisional: number;
};

export type Line = { id: string; label: string; points: Pt[] };

export type HousingV1 = {
  sources: Record<string, Source>;
  price: Pt[];
  types: Line[];
  newExisting: Line[];
  sales: Pt[];
  regions: { code: string; name: string; points: Pt[] }[];
  ukRegional: Pt[];
  rentIndex: Pt[];
  rentChange: Pt[];
  afford: Pt[];
  completions: Pt[];
  completionsYear: Pt[];
  tenure: { years: number[]; owner: number[]; privateRented: number[]; social: number[]; total: number[] };
  allDwellings: Pt[];
  ridges: { names: string[]; quarters: string[]; values: number[][] };
};

function toPts(rows: Observation[]): Pt[] {
  const by = new Map<number, Pt>();
  for (const r of rows) {
    if (r.value === null) continue;
    const t = toT(r.period_start);
    by.set(t, { t, v: r.value, provisional: r.observation_status === "provisional" || undefined });
  }
  return [...by.values()].sort((a, b) => a.t - b.t);
}

async function load(id: string) {
  try {
    const [meta, obs] = await Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })]);
    return { meta, rows: obs.observations };
  } catch {
    return null;
  }
}

function source(meta: IndicatorMeta, rows: Observation[]): Source {
  const valued = rows.filter((r) => r.value !== null).sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: meta.indicator_id,
    title: meta.title,
    publisher: meta.publisher,
    seriesId: meta.series_id,
    unit: meta.unit,
    geography: meta.geography.split(/[(;—]/)[0]!.trim(),
    frequency: meta.frequency,
    sourceUrl: meta.source_url,
    release: valued[valued.length - 1]?.source_version ?? "",
    first: valued[0]?.period_start ?? "",
    last: valued[valued.length - 1]?.period_start ?? "",
    count: valued.length,
    provisional: valued.filter((r) => r.observation_status === "provisional").length,
  };
}

const seriesRows = (rows: Observation[], key: string) => rows.filter((r) => r.dimensions?.series === key);

/** 12-month % change of a monthly index; only where the same month a year earlier exists. */
function annualChange(index: Pt[]): Pt[] {
  const by = new Map(index.map((p) => [Math.round(p.t * 12), p]));
  return index.flatMap((p) => {
    const prev = by.get(Math.round(p.t * 12) - 12);
    if (!prev) return [];
    return [{ t: p.t, v: (p.v / prev.v - 1) * 100, provisional: p.provisional || prev.provisional || undefined }];
  });
}

/** Sum of four consecutive quarters (rolling year), only where all four exist. */
function rollingYear(q: Pt[]): Pt[] {
  const by = new Map(q.map((p) => [Math.round(p.t * 4), p]));
  return q.flatMap((p) => {
    const k = Math.round(p.t * 4);
    const four = [k, k - 1, k - 2, k - 3].map((i) => by.get(i));
    if (four.some((x) => !x)) return [];
    return [{ t: p.t, v: four.reduce((s, x) => s + x!.v, 0), provisional: four.some((x) => x!.provisional) || undefined }];
  });
}

export async function loadHousing(): Promise<HousingV1> {
  const [price, regional, afford, rent, completions, stock, hpi] = await Promise.all([
    load("uk-average-house-price"),
    load("house-prices-by-region"),
    load("house-price-to-earnings-ratio"),
    load("private-rental-price-index"),
    load("housing-completions"),
    load("dwelling-stock-by-tenure"),
    load("uk-hpi-measures"),
  ]);

  const sources: Record<string, Source> = {};
  for (const x of [price, regional, hpi, rent, afford, completions, stock]) if (x) sources[x.meta.indicator_id] = source(x.meta, x.rows);

  // Regions: monthly from Jan 1995, the first month every nation/region is present.
  const AGG = new Set(["K02000001", "E92000001"]);
  const regionMap = new Map<string, { name: string; rows: Observation[] }>();
  const ukRows: Observation[] = [];
  for (const r of regional?.rows ?? []) {
    if (r.geography_code === "K02000001") ukRows.push(r);
    if (AGG.has(r.geography_code)) continue;
    if (!regionMap.has(r.geography_code)) regionMap.set(r.geography_code, { name: r.geography_label.replace(" Region", ""), rows: [] });
    regionMap.get(r.geography_code)!.rows.push(r);
  }
  const regions = [...regionMap.entries()]
    .map(([code, v]) => ({ code, name: v.name, points: toPts(v.rows).filter((p) => p.t >= 1995) }))
    .sort((a, b) => (b.points.at(-1)?.v ?? 0) - (a.points.at(-1)?.v ?? 0));

  // Hero ridges: quarterly samples (Jan/Apr/Jul/Oct), highest-priced region at the back.
  const qTimes = (regions[0]?.points ?? []).filter((p) => Math.round(p.t * 12) % 3 === 0).map((p) => p.t);
  const ridgeValues = regions.map((r) => {
    const by = new Map(r.points.map((p) => [Math.round(p.t * 12), p.v]));
    return qTimes.map((t) => by.get(Math.round(t * 12)) ?? 0);
  });

  // Tenure: England, 31 March snapshot; complete years only.
  const snap = (r: Observation) => /snapshot=31 March/.test(r.notes ?? "");
  const byYear = new Map<number, Record<string, number>>();
  for (const r of (stock?.rows ?? []).filter((r) => r.value !== null && snap(r))) {
    const y = Number(r.period_start.slice(0, 4));
    byYear.set(y, { ...(byYear.get(y) ?? {}), [r.dimensions?.demographic ?? ""]: r.value as number });
  }
  const years = [...byYear.keys()]
    .sort((a, b) => a - b)
    .filter((y) => {
      const v = byYear.get(y)!;
      return v["owner-occupied"] && v["private-rented"] && v["local-authority"] && v["private-registered-provider"];
    });
  const social = (v: Record<string, number>) => (v["local-authority"] ?? 0) + (v["private-registered-provider"] ?? 0) + (v["other-public-sector"] ?? 0);
  const allDwellings = [...byYear.entries()]
    .filter(([, v]) => v["all-dwellings"])
    .map(([y, v]) => ({ t: y, v: v["all-dwellings"]! }))
    .sort((a, b) => a.t - b.t);

  const hpiRows = hpi?.rows ?? [];
  const rentIndex = toPts(rent?.rows ?? []);
  const completionsQ = toPts(completions?.rows ?? []);

  return {
    sources,
    price: toPts(price?.rows ?? []),
    types: [
      ["detached", "Detached"],
      ["semi-detached", "Semi-detached"],
      ["terraced", "Terraced"],
      ["flat", "Flat or maisonette"],
    ].map(([id, label]) => ({ id: id!, label: label!, points: toPts(seriesRows(hpiRows, id!)) })),
    newExisting: [
      { id: "new-build", label: "New build", points: toPts(seriesRows(hpiRows, "new-build")) },
      { id: "existing", label: "Existing homes", points: toPts(seriesRows(hpiRows, "existing")) },
    ],
    sales: toPts(seriesRows(hpiRows, "sales-volume")),
    regions,
    ukRegional: toPts(ukRows).filter((p) => p.t >= 1995),
    rentIndex,
    rentChange: annualChange(rentIndex),
    afford: toPts(afford?.rows ?? []),
    completions: completionsQ,
    completionsYear: rollingYear(completionsQ),
    tenure: {
      years,
      owner: years.map((y) => byYear.get(y)!["owner-occupied"]!),
      privateRented: years.map((y) => byYear.get(y)!["private-rented"]!),
      social: years.map((y) => social(byYear.get(y)!)),
      total: years.map((y) => byYear.get(y)!["all-dwellings"] ?? 0),
    },
    allDwellings,
    ridges: {
      names: regions.map((r) => r.name),
      quarters: qTimes.map((t) => `${Math.floor(t)}-${String(Math.round((t % 1) * 12) + 1).padStart(2, "0")}`),
      values: ridgeValues,
    },
  };
}
