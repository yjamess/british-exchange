/**
 * Housing atlas / map packs — server only.
 * Curated JSON comes from the Exchange API packs surface (disk or Supabase Storage),
 * not from Next.js node:fs.
 */

import { cache } from "react";
import { fetchIndicator, fetchObservations, fetchPackJson, type Observation } from "@/lib/api";
import type { Atlas, Evidence, Geometry, LandUseShare, MapShape, TopicRow, Topics } from "./model";

type RawAtlas = Omit<Atlas, "areas" | "measure"> & {
  areas: (Omit<Atlas["areas"][number], "values"> & { values: Record<string, (number | null)[]> })[];
};
type StaticTopics = Omit<Topics, "greenBelt" | "landUse" | "planning" | "sources"> & {
  sources: Pick<Topics["sources"], "tenure" | "completions" | "rent" | "affordability">;
};

const ATLAS_MEASURE_PACK: Record<string, string> = {
  average: "housing.atlas-average",
  detached: "housing.atlas-detached",
  "semi-detached": "housing.atlas-semi-detached",
  terraced: "housing.atlas-terraced",
  flat: "housing.atlas-flat",
  "new-build": "housing.atlas-new-build",
  existing: "housing.atlas-existing",
  "sales-volume": "housing.atlas-sales-volume",
};

const loadRaw = cache(() => fetchPackJson<RawAtlas>("housing.atlas"));

/**
 * Prefer a per-measure slim file (~1MB) over parsing the multi-measure archive (~7MB).
 * Slim files are generated offline; fall back to slicing the archive if missing.
 */
export async function loadAtlas(measure = "average"): Promise<Atlas> {
  const selected = ATLAS_MEASURE_PACK[measure] ? measure : "average";
  try {
    return await fetchPackJson<Atlas>(ATLAS_MEASURE_PACK[selected]!);
  } catch {
    const raw = await loadRaw();
    return {
      ...raw,
      measure: selected,
      areas: raw.areas.map((area) => ({
        ...area,
        values: area.values[selected] ?? raw.months.map(() => null),
      })),
    };
  }
}

/** PIPR average monthly rent by geography — same Atlas shape as HPI for AreaMap reuse. */
const loadRentRaw = cache(() => fetchPackJson<RawAtlas>("housing.rent-atlas"));
export async function loadRentAtlas(measure = "average-rent"): Promise<Atlas> {
  const raw = await loadRentRaw();
  const selected = raw.measures.some((m) => m.id === measure) ? measure : "average-rent";
  return {
    ...raw,
    measure: selected,
    areas: raw.areas.map((area) => ({
      ...area,
      values: area.values[selected] ?? raw.months.map(() => null),
    })),
  };
}

/** AFF1 workplace median price-to-earnings by LA / region (annual). */
const loadAffordRaw = cache(() => fetchPackJson<RawAtlas>("housing.afford-atlas"));

/**
 * Spread of AFF1 median price-to-earnings across English local authorities, per year:
 * 10th and 90th percentile (linear interpolation). Derived by the Exchange from AFF1 Table 5c.
 */
export type AffordSpread = { lo: { t: number; v: number }[]; hi: { t: number; v: number }[]; areas: number };
export async function loadAffordSpread(): Promise<AffordSpread | null> {
  try {
    const raw = await loadAffordRaw();
    // English local authorities only (E06 unitary, E07 district, E08 metropolitan, E09 London borough)
    const las = raw.areas.filter((a) => /^E0[6-9]/.test(a.code) && a.level === "local");
    const series = las.map((a) => a.values["pte-median"] ?? []);
    const q = (xs: number[], p: number) => {
      const i = (xs.length - 1) * p;
      const lo = Math.floor(i);
      return xs[lo]! + (xs[Math.min(xs.length - 1, lo + 1)]! - xs[lo]!) * (i - lo);
    };
    const lo: AffordSpread["lo"] = [];
    const hi: AffordSpread["hi"] = [];
    raw.months.forEach((m, k) => {
      const xs = series.map((v) => v[k]).filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
      if (xs.length < 20) return;
      const t = Number(m.slice(0, 4)) + (Number(m.slice(5, 7)) - 1) / 12;
      lo.push({ t, v: Number(q(xs, 0.1).toFixed(2)) });
      hi.push({ t, v: Number(q(xs, 0.9).toFixed(2)) });
    });
    return lo.length ? { lo, hi, areas: las.length } : null;
  } catch {
    return null;
  }
}
export async function loadAffordAtlas(measure = "pte-median"): Promise<Atlas> {
  const raw = await loadAffordRaw();
  const selected = raw.measures.some((m) => m.id === measure) ? measure : "pte-median";
  return {
    ...raw,
    measure: selected,
    areas: raw.areas.map((area) => ({
      ...area,
      values: area.values[selected] ?? raw.months.map(() => null),
    })),
  };
}

const noteSeries = (row: Observation) => row.dimensions?.series || (/series=([^;]+)/.exec(row.notes ?? "")?.[1] ?? "");
const toTopicRows = (rows: Observation[]): TopicRow[] =>
  rows
    .filter((r) => r.value !== null)
    .map((r) => ({ period: r.period_start.slice(0, 10), value: r.value, status: r.observation_status }))
    .sort((a, b) => a.period.localeCompare(b.period));

async function loadLandTopics(): Promise<Pick<Topics, "greenBelt" | "landUse" | "planning" | "sources">> {
  const empty = {
    greenBelt: [] as TopicRow[],
    landUse: [] as LandUseShare[],
    planning: [] as TopicRow[],
    sources: {} as Topics["sources"],
  };
  try {
    const [gbMeta, gbObs, luMeta, luObs, plMeta, plObs] = await Promise.all([
      fetchIndicator("green-belt-area"),
      fetchObservations("green-belt-area", { limit: "5000" }),
      fetchIndicator("land-use-stock"),
      fetchObservations("land-use-stock", { limit: "500" }),
      fetchIndicator("planning-decisions-granted"),
      fetchObservations("planning-decisions-granted", { limit: "2000" }),
    ]);
    const evidence = (
      meta: typeof gbMeta,
      rows: Observation[],
      unit: string,
      geography: string,
    ): Evidence & { unit: string; geography: string } => {
      const last = [...rows].filter((r) => r.value !== null).sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
      return {
        publisher: meta.publisher,
        url: meta.source_url,
        release: last?.source_version ?? meta.title,
        unit,
        geography,
      };
    };
    const greenBeltRows = gbObs.observations.filter(
      (r) => r.geography_code === "E92000001" && noteSeries(r) === "england-total",
    );
    const greenBelt = toTopicRows(greenBeltRows);
    const LAND: [string, string][] = [
      ["developed", "Developed"],
      ["non-developed", "Non-developed"],
      ["agriculture", "Agriculture"],
      ["forestry-open-land-water", "Forestry, open land & water"],
      ["residential-gardens", "Residential gardens"],
    ];
    const landUse: LandUseShare[] = LAND.map(([id, label]) => {
      const share = luObs.observations.find((r) => noteSeries(r) === id && /measure=share/.test(r.notes ?? ""));
      const hectares = luObs.observations.find((r) => noteSeries(r) === id && /measure=hectares/.test(r.notes ?? ""));
      return { id, label, share: share?.value ?? null, hectares: hectares?.value ?? null };
    });
    const planning = toTopicRows(plObs.observations);
    return {
      greenBelt,
      landUse,
      planning,
      sources: {
        ...({} as Topics["sources"]),
        greenBelt: evidence(gbMeta, greenBeltRows, gbMeta.unit, "England"),
        landUse: evidence(luMeta, luObs.observations, luMeta.unit, "England"),
        planning: evidence(plMeta, plObs.observations, plMeta.unit, "England"),
      },
    };
  } catch {
    return empty;
  }
}

export const loadTopics = cache(async (): Promise<Topics> => {
  const [base, land] = await Promise.all([
    fetchPackJson<StaticTopics>("housing.atlas-topics"),
    loadLandTopics(),
  ]);
  return {
    ...base,
    greenBelt: land.greenBelt,
    landUse: land.landUse,
    planning: land.planning,
    sources: { ...base.sources, ...land.sources },
  };
});

type Position = [number, number];
type Feature = {
  properties: { code: string; name: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Position[][] | Position[][][] };
};
/**
 * Equirectangular display with longitude scaled at 55°N; shapes are not spatial query inputs.
 * Prefer pre-projected `boundaries-display.json` (no GeoJSON parse / project on each cold start).
 */
export const loadGeometry = cache(async (): Promise<Geometry> => {
  try {
    const display = await fetchPackJson<{ shapes: MapShape[]; source: Evidence }>(
      "regions.boundaries-display",
    );
    return { shapes: display.shapes, source: display.source };
  } catch {
    const [geo, source] = await Promise.all([
      fetchPackJson<{ features: Feature[] }>("regions.gb-boundaries"),
      fetchPackJson<Evidence>("regions.gb-boundaries-source"),
    ]);
    const polygons = (f: Feature): Position[][][] =>
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as Position[][]]
        : (f.geometry.coordinates as Position[][][]);
    const project = ([lon, lat]: Position): Position => [lon * Math.cos((55 * Math.PI) / 180), -lat];
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const feature of geo.features)
      for (const polygon of polygons(feature))
        for (const ring of polygon)
          for (const point of ring) {
            const [x, y] = project(point);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
    const scale = Math.min(700 / (maxX - minX), 840 / (maxY - minY));
    const px = (point: Position): Position => {
      const [x, y] = project(point);
      return [30 + (700 - (maxX - minX) * scale) / 2 + (x - minX) * scale, 20 + (y - minY) * scale];
    };
    const shapes: MapShape[] = geo.features.map((feature) => {
      let left = Infinity,
        right = -Infinity,
        top = Infinity,
        bottom = -Infinity;
      const d = polygons(feature)
        .map((polygon) =>
          polygon
            .map(
              (ring) =>
                ring
                  .map((point, index) => {
                    const [x, y] = px(point);
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                    top = Math.min(top, y);
                    bottom = Math.max(bottom, y);
                    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
                  })
                  .join("") + "Z",
            )
            .join(""),
        )
        .join("");
      return { code: feature.properties.code, name: feature.properties.name, path: d, bounds: [left, top, right, bottom] };
    });
    return { shapes, source };
  }
});

/** Every searchable place: local authorities with boundaries, plus regions, nations and the UK. */
export const loadPlaces = cache(async () => {
  const [geometry, raw] = await Promise.all([loadGeometry(), loadRaw()]);
  const local = geometry.shapes.map((shape) => ({ code: shape.code, name: shape.name, level: "local" as const }));
  const wider = raw.areas
    .filter((area) => area.level !== "local")
    .map((area) => ({ code: area.code, name: area.name.replace(/ Region$/, ""), level: area.level }));
  return [...wider, ...local];
});
