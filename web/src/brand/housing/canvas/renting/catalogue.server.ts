/**
 * Read the curated PIPR file once and keep it in memory.
 *
 * The housing page already holds the United Kingdom series. A chosen local
 * authority, nation or region is read from this same file, so the chart is
 * that place's observations rather than the UK figure with a new label.
 *
 * The CSV is the curated output of the housing connector. This module does
 * not invent values for months the file leaves blank.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Atlas, Area } from "../../atlas/model";

export type RentLevel = "uk" | "nation" | "region" | "local";

export type RentPlace = { code: string; name: string; level: RentLevel };

export type AreaPack = {
  code: string;
  name: string;
  level: RentLevel;
  months: string[];
  series: Record<string, (number | null)[]>;
  provisional: Record<string, boolean[]>;
};

type Cell = { v: number | null; provisional: boolean };

type Store = {
  months: string[];
  places: RentPlace[];
  /** code → series key → month → cell */
  byArea: Map<string, Map<string, Map<string, Cell>>>;
  names: Map<string, string>;
  release: string;
  publisher: string;
  sourceUrl: string;
};

let pending: Promise<Store> | null = null;

const dataRoot = path.resolve(process.cwd(), "../data/housing/private-rental-prices");

function levelOf(code: string): RentLevel {
  if (code === "K02000001") return "uk";
  if (/^[EWSN]920000/.test(code)) return "nation";
  if (code.startsWith("E12")) return "region";
  return "local";
}

/** One CSV row. Fields may be quoted because some names contain commas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

function seriesKey(notes: string): string | null {
  const series = /series=([^;]+)/.exec(notes)?.[1];
  if (!series) return null;
  const kind = /kind=([^;]+)/.exec(notes)?.[1];
  if (kind) return series === "average-rent" ? `${kind}|average-rent` : null;
  if (series === "average-rent" || series === "annual-change" || series === "index") return `all|${series}`;
  return null;
}

function manifestField(text: string, key: string): string {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(text);
  return match?.[1]?.replaceAll(/^['"]|['"]$/g, "").trim() ?? "";
}

async function loadStore(): Promise<Store> {
  const [csvText, manifest] = await Promise.all([
    readFile(path.join(dataRoot, "curated/observations.csv"), "utf8"),
    readFile(path.join(dataRoot, "manifest.yaml"), "utf8").catch(() => ""),
  ]);
  const lines = csvText.split(/\r?\n/).filter((line) => line.length > 0);
  const header = parseCsvLine(lines[0] ?? "");
  const col = (name: string) => header.indexOf(name);
  const iPeriod = col("period_start");
  const iCode = col("geography_code");
  const iName = col("geography_label");
  const iValue = col("value");
  const iStatus = col("observation_status");
  const iNotes = col("notes");
  const iVersion = col("source_version");
  if ([iPeriod, iCode, iName, iValue, iStatus, iNotes].some((index) => index < 0)) {
    throw new Error("PIPR observations.csv is missing an expected column.");
  }

  const byArea = new Map<string, Map<string, Map<string, Cell>>>();
  const names = new Map<string, string>();
  const monthSet = new Set<string>();
  let release = "";

  for (let i = 1; i < lines.length; i += 1) {
    const fields = parseCsvLine(lines[i]!);
    const notes = fields[iNotes] ?? "";
    const key = seriesKey(notes);
    if (!key) continue;
    const code = fields[iCode] ?? "";
    const period = (fields[iPeriod] ?? "").slice(0, 10);
    if (!code || !period) continue;
    monthSet.add(period);
    if (!names.has(code)) names.set(code, fields[iName] || code);
    if (!release && iVersion >= 0) release = fields[iVersion] ?? "";
    let area = byArea.get(code);
    if (!area) {
      area = new Map();
      byArea.set(code, area);
    }
    let series = area.get(key);
    if (!series) {
      series = new Map();
      area.set(key, series);
    }
    const raw = (fields[iValue] ?? "").trim();
    const value = raw === "" ? null : Number(raw);
    series.set(period, {
      v: value != null && Number.isFinite(value) ? value : null,
      provisional: (fields[iStatus] ?? "") === "provisional",
    });
  }

  const months = [...monthSet].sort();
  const places = [...names.entries()]
    .map(([code, name]) => ({ code, name, level: levelOf(code) }))
    .sort((a, b) => {
      const order = { uk: 0, nation: 1, region: 2, local: 3 };
      return order[a.level] - order[b.level] || a.name.localeCompare(b.name);
    });

  return {
    months,
    places,
    byArea,
    names,
    release,
    publisher: manifestField(manifest, "publisher") || "ONS",
    sourceUrl: manifestField(manifest, "source_url"),
  };
}

function store(): Promise<Store> {
  if (!pending) {
    pending = loadStore().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

function align(area: Map<string, Map<string, Cell>> | undefined, months: string[], key: string): {
  values: (number | null)[];
  provisional: boolean[];
} {
  const series = area?.get(key);
  const values: (number | null)[] = [];
  const provisional: boolean[] = [];
  for (const month of months) {
    const cell = series?.get(month);
    values.push(cell?.v ?? null);
    provisional.push(Boolean(cell?.provisional));
  }
  return { values, provisional };
}

export async function rentPlaces(): Promise<RentPlace[]> {
  return (await store()).places;
}

export async function rentArea(code: string): Promise<AreaPack | null> {
  const data = await store();
  const area = data.byArea.get(code);
  if (!area) return null;
  const series: AreaPack["series"] = {};
  const provisional: AreaPack["provisional"] = {};
  for (const key of area.keys()) {
    const aligned = align(area, data.months, key);
    series[key] = aligned.values;
    provisional[key] = aligned.provisional;
  }
  return {
    code,
    name: data.names.get(code) ?? code,
    level: levelOf(code),
    months: data.months,
    series,
    provisional,
  };
}

const MEASURE_LABEL: Record<string, { label: string; unit: string }> = {
  "average-rent": { label: "Average monthly rent", unit: "GBP" },
  "annual-change": { label: "Annual change", unit: "percent" },
  index: { label: "Index", unit: "index" },
};

/** One measure for every place, in the same shape as the rent atlas the map already draws. */
export async function rentMap(category: string, measure: string): Promise<Atlas> {
  const data = await store();
  const key = `${category || "all"}|${measure}`;
  const meta = MEASURE_LABEL[measure] ?? { label: measure, unit: "" };
  const areas: Area[] = data.places.map((place) => ({
    code: place.code,
    name: place.name,
    level: place.level,
    values: align(data.byArea.get(place.code), data.months, key).values,
  }));
  return {
    months: data.months,
    measures: [{ id: measure, label: meta.label, unit: meta.unit }],
    measure,
    areas,
    source: {
      publisher: data.publisher,
      url: data.sourceUrl,
      release: data.release,
    },
    caveats: [
      "Price Index of Private Rents. Not an advertised asking rent.",
      "Latest two months are provisional. Scotland and Northern Ireland are mainly new lets.",
    ],
  };
}
