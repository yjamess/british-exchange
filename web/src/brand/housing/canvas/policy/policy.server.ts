import { fetchIndicator, fetchObservations, fetchPackJson, type Observation } from "@/lib/api";
import { toT } from "../../../data";
import { normaliseEvents } from "./events";
import type {
  ArchiveRegistry,
  EventRegistry,
  PlateRegistry,
  PledgeRegistry,
  PolicyPayload,
  SeriesSource,
  TrackConfig,
  TrackPayload,
  TrackRegistry,
} from "./types";

/**
 * Server loader for Domain 10 (/api/housing/policy). Registry files come from the
 * Exchange API packs surface (Supabase Storage / local disk via FastAPI). Plotted
 * points come from Ready observations. A missing pack comes back as null; the view says so.
 */

async function readJson<T>(packId: string): Promise<T | null> {
  try {
    return await fetchPackJson<T>(packId);
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
    lines: cfg.lines.map((l) => ({
      id: l.id,
      label: l.label,
      points: points(data.rows.filter((o) => matches(o, l.match))),
    })),
    source: data.source,
  };
}

const TTL_MS = 10 * 60 * 1000;
const BUILD_TIMEOUT_MS = 45 * 1000;
let memo: { at: number; payload: Promise<PolicyPayload> } | null = null;

export function loadPolicy(): Promise<PolicyPayload> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.payload;
  cache.clear();
  // A stalled upstream fetch must not pin every request to one stuck promise for the TTL.
  const deadline = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("policy build timed out")), BUILD_TIMEOUT_MS));
  const payload = Promise.race([build(), deadline]).catch((e) => {
    memo = null;
    throw e;
  });
  memo = { at: Date.now(), payload };
  return payload;
}

async function build(): Promise<PolicyPayload> {
  const [registry, tracksFile, pledges, archive, plates] = await Promise.all([
    readJson<EventRegistry>("housing.policy-events"),
    readJson<TrackRegistry>("housing.policy-tracks"),
    readJson<PledgeRegistry>("housing.policy-pledges"),
    readJson<ArchiveRegistry>("housing.policy-archive"),
    readJson<PlateRegistry>("housing.policy-plates"),
  ]);
  const tracks = await Promise.all((tracksFile?.tracks ?? []).map(track));
  const delivery: PolicyPayload["delivery"] = {};
  await Promise.all(
    (pledges?.pledges ?? []).map(async (p) => {
      if (!p.match) return;
      const data = await indicator(p.match.indicator_id);
      if (!data) return;
      const m: Match = {
        geography_code: p.match.geography_code,
        series: p.match.series,
        ...(p.match.dimensions ?? {}),
      };
      delivery[p.id] = { points: points(data.rows.filter((o) => matches(o, m))), source: data.source };
    }),
  );
  return {
    events: normaliseEvents(registry?.events ?? []),
    eras: registry?.eras ?? [],
    relationships: registry?.relationships ?? [],
    retrieved_at: registry?.retrieved_at ?? "",
    note: registry?.note ?? "",
    trackNote: tracksFile?.note ?? null,
    tracks,
    pledges,
    archive,
    plates,
    delivery,
  };
}
