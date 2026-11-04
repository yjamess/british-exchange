/**
 * Housing & Land — server loader. Shapes API observations into brand series.
 * Rules: never mix geographies, dimensions or snapshot conventions in one line;
 * carry observation_status through as `provisional`.
 */

import { fetchIndicator, fetchObservations, type IndicatorMeta, type Observation } from "@/lib/api";
import { toT, type Pt } from "../data";

export type Profile = {
  id: string;
  title: string;
  publisher: string;
  seriesId: string;
  geography: string;
  scope: string;
  frequency: string;
  unit: string;
  sourceUrl: string;
  first: string;
  last: string;
  count: number;
  provisional: number;
};

export type HousingData = {
  price: Pt[];
  regions: { code: string; name: string; points: Pt[] }[];
  afford: Pt[];
  rent: Pt[];
  completions: Pt[];
  tenure: { years: number[]; owner: number[]; privateRented: number[]; social: number[] };
  types: { id: string; label: string; points: Pt[] }[];
  newVsExisting: { id: string; label: string; points: Pt[] }[];
  sales: Pt[];
  profiles: Profile[];
};

const scopeOf = (geo: string) => geo.split(/[(;—,]/)[0]!.trim();

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

function profile(meta: IndicatorMeta, rows: Observation[]): Profile {
  const valued = rows.filter((r) => r.value !== null);
  return {
    id: meta.indicator_id,
    title: meta.title,
    publisher: meta.publisher,
    seriesId: meta.series_id,
    geography: meta.geography,
    scope: scopeOf(meta.geography),
    frequency: meta.frequency,
    unit: meta.unit,
    sourceUrl: meta.source_url,
    first: valued[0]?.period_start ?? "",
    last: valued[valued.length - 1]?.period_start ?? "",
    count: valued.length,
    provisional: valued.filter((r) => r.observation_status === "provisional").length,
  };
}

const series = (rows: Observation[], key: string) => rows.filter((r) => r.dimensions?.series === key);

export async function loadHousing(): Promise<HousingData> {
  const [price, regional, afford, rent, completions, stock, hpi] = await Promise.all([
    load("uk-average-house-price"),
    load("house-prices-by-region"),
    load("house-price-to-earnings-ratio"),
    load("private-rental-price-index"),
    load("housing-completions"),
    load("dwelling-stock-by-tenure"),
    load("uk-hpi-measures"),
  ]);

  // Regions: monthly, from 1995 (the first year every geography is present)
  const regionMap = new Map<string, { name: string; rows: Observation[] }>();
  for (const r of regional?.rows ?? []) {
    if (!regionMap.has(r.geography_code)) regionMap.set(r.geography_code, { name: r.geography_label.replace(" Region", ""), rows: [] });
    regionMap.get(r.geography_code)!.rows.push(r);
  }
  const regions = [...regionMap.entries()].map(([code, v]) => ({
    code,
    name: v.name,
    points: toPts(v.rows).filter((p) => p.t >= 1995),
  }));

  // Tenure: England, 31 March snapshot only (1991–), shares of all dwellings
  const snap = (r: Observation) => /snapshot=31 March/.test(r.notes ?? "");
  const tenureRows = (stock?.rows ?? []).filter((r) => r.value !== null && snap(r));
  const byYear = new Map<number, Record<string, number>>();
  for (const r of tenureRows) {
    const y = Number(r.period_start.slice(0, 4));
    const k = r.dimensions?.demographic ?? "";
    byYear.set(y, { ...(byYear.get(y) ?? {}), [k]: r.value as number });
  }
  const years = [...byYear.keys()].sort((a, b) => a - b).filter((y) => {
    const v = byYear.get(y)!;
    return v["owner-occupied"] && v["private-rented"] && v["local-authority"] && v["private-registered-provider"];
  });
  const share = (y: number) => {
    const v = byYear.get(y)!;
    const social = (v["local-authority"] ?? 0) + (v["private-registered-provider"] ?? 0) + (v["other-public-sector"] ?? 0);
    const total = (v["owner-occupied"] ?? 0) + (v["private-rented"] ?? 0) + social;
    return { owner: v["owner-occupied"]! / total, pr: v["private-rented"]! / total, social: social / total };
  };

  const hpiRows = hpi?.rows ?? [];
  const TYPES: [string, string][] = [
    ["detached", "Detached"],
    ["semi-detached", "Semi-detached"],
    ["terraced", "Terraced"],
    ["flat", "Flat"],
  ];

  const profiles = [price, regional, hpi, rent, afford, completions, stock]
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((x) => profile(x.meta, x.rows));

  return {
    price: toPts(price?.rows ?? []),
    regions,
    afford: toPts(afford?.rows ?? []),
    rent: toPts(rent?.rows ?? []),
    completions: toPts(completions?.rows ?? []),
    tenure: {
      years,
      owner: years.map((y) => share(y).owner),
      privateRented: years.map((y) => share(y).pr),
      social: years.map((y) => share(y).social),
    },
    types: TYPES.map(([id, label]) => ({ id, label, points: toPts(series(hpiRows, id)) })),
    newVsExisting: [
      { id: "new-build", label: "New build", points: toPts(series(hpiRows, "new-build")) },
      { id: "existing", label: "Existing", points: toPts(series(hpiRows, "existing")) },
    ],
    sales: toPts(series(hpiRows, "sales-volume")),
    profiles,
  };
}
