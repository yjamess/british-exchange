import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchIndicator, fetchObservations, type Observation } from "@/lib/api";
import { toT } from "../../../data";
import type { ArchiveRegistry, PlateRegistry, PledgeRegistry, PolicyPayload, SeriesSource, TrackConfig, TrackPayload, TrackRegistry } from "./types";

/**
 * Server loader for Domain 10 (/api/housing/policy). Reads the registry files in
 * data/housing/policy-events (tracks, pledges, archive) and fetches every plotted point from the
 * Exchange API. Nothing is computed beyond selecting the published rows a file names.
 * A file that has not been written yet comes back as null; the view says so.
 */

const DIR = path.join(process.cwd(), "..", "data", "housing", "policy-events");

async function readJson<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(DIR, name), "utf8")) as T;
  } catch {
    return null;
  }
}

type Match = Record<string, string | undefined>;

function matches(o: Observation, match: Match): boolean {
  return Object.entries(match).every(([k, v]) => {
    if (v == null || v === "") return true;
    if (k === "geography_code") return o.geography_code === v;
    const dims = (o.dimensions ?? {}) as Record<string, string | undefined>;
    return (dims[k] ?? "") === v;
  });
}

const points = (rows: Observation[]) =>
  rows
    .filter((o) => o.value != null)
    .map((o) => ({ t: toT(o.period_start), v: o.value as number, period: o.period_start }))
    .sort((a, b) => a.t - b.t);

const cache = new Map<string, Promise<{ rows: Observation[]; source: SeriesSource } | null>>();
function indicator(id: string) {
  let hit = cache.get(id);
  if (!hit) {
    hit = Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })])
      .then(([meta, obs]) => {
        const rows = obs.observations as Observation[];
        const last = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
        return {
          rows,
          source: {
            id,
            title: meta.title,
            publisher: meta.publisher,
            sourceUrl: meta.source_url,
            release: last?.source_version ?? "",
            unit: meta.unit,
          },
        };
      })
      .catch(() => {
        cache.delete(id);
        return null;
      });
    cache.set(id, hit);
  }
  return hit;
}

async function track(cfg: TrackConfig): Promise<TrackPayload> {
  const data = await indicator(cfg.indicator_id);
  if (!data) return { ...cfg, available: false, lines: [], source: null };
  return {
    ...cfg,
    available: true,
    lines: cfg.lines.map((l) => ({ id: l.id, label: l.label, points: points(data.rows.filter((o) => matches(o, l.match))) })),
    source: data.source,
  };
}

const TTL_MS = 10 * 60 * 1000;
let memo: { at: number; payload: Promise<PolicyPayload> } | null = null;

export function loadPolicy(): Promise<PolicyPayload> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.payload;
  cache.clear();
  const payload = build().catch((e) => {
    memo = null;
    throw e;
  });
  memo = { at: Date.now(), payload };
  return payload;
}

async function build(): Promise<PolicyPayload> {
  const [tracksFile, pledges, archive, plates] = await Promise.all([
    readJson<TrackRegistry>("tracks.json"),
    readJson<PledgeRegistry>("pledges.json"),
    readJson<ArchiveRegistry>("archive.json"),
    readJson<PlateRegistry>("plates.json"),
  ]);
  const tracks = await Promise.all((tracksFile?.tracks ?? []).map(track));
  const delivery: PolicyPayload["delivery"] = {};
  await Promise.all(
    (pledges?.pledges ?? []).map(async (p) => {
      if (!p.match) return;
      const data = await indicator(p.match.indicator_id);
      if (!data) return;
      const m: Match = { geography_code: p.match.geography_code, series: p.match.series, ...(p.match.dimensions ?? {}) };
      delivery[p.id] = { points: points(data.rows.filter((o) => matches(o, m))), source: data.source };
    }),
  );
  return { trackNote: tracksFile?.note ?? null, tracks, pledges, archive, plates, delivery };
}
