import { fetchIndicator, fetchObservations, type Observation } from "@/lib/api";
import { toT } from "../../../../data";
import { STATUS, type EvidencePayload, type EvidenceSource, type Status } from "./evidence";

/**
 * Server loader for the Inside-the-home evidence table (/api/housing/quality).
 * Reads each EHS indicator once, parses dimensions from typed fields + notes, keeps every
 * published cell (including suppressed / not-collected ones, so gaps stay honest), and encodes
 * the table compactly. No estimation, no derived cells.
 */

export const QUALITY_INDICATORS = [
  "ehs-decent-homes",
  "ehs-category-1-hazards",
  "ehs-damp-surveyor",
  "ehs-damp-mould-reported",
  "ehs-energy-efficiency-bands",
  "ehs-insulation",
  "ehs-heating",
  "ehs-overcrowding",
  "ehs-under-occupation",
  "ehs-energy-improvement",
] as const;

const FLAG_KEYS = ["covid-modelled", "hybrid-sample", "floor-area-modelled", "sap-version", "method", "base", "sample-base"];

function notesMap(notes: string | null | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of (notes ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) m.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return m;
}

/** Server-side memo: the table changes only when indicators are reloaded; 10 minutes keeps it fresh. */
const TTL_MS = 10 * 60 * 1000;
let memo: { at: number; payload: Promise<EvidencePayload> } | null = null;

export function loadQualityEvidence(): Promise<EvidencePayload> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.payload;
  const payload = buildQualityEvidence().catch((e) => {
    memo = null;
    throw e;
  });
  memo = { at: Date.now(), payload };
  return payload;
}

async function buildQualityEvidence(): Promise<EvidencePayload> {
  const dict: EvidencePayload["dict"] = {
    ind: [],
    series: [],
    tenure: [],
    bk: [],
    cat: [],
    area: [],
    areaLabel: [],
    label: [""],
    flags: [""],
    grouping: [""],
  };
  const idx = (arr: string[], v: string) => {
    const i = arr.indexOf(v);
    if (i >= 0) return i;
    arr.push(v);
    return arr.length - 1;
  };
  const areaIdx = (code: string, label: string) => {
    const i = dict.area.indexOf(code);
    if (i >= 0) return i;
    dict.area.push(code);
    dict.areaLabel.push(label);
    return dict.area.length - 1;
  };

  const cells: EvidencePayload["cells"] = [];
  const sources: Record<string, EvidenceSource> = {};

  const packs = await Promise.all(
    QUALITY_INDICATORS.map(async (id) => {
      try {
        const [meta, obs] = await Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })]);
        return { id, meta, rows: obs.observations as Observation[] };
      } catch {
        return null;
      }
    }),
  );

  for (const pack of packs) {
    if (!pack) continue;
    const { id, meta, rows } = pack;
    const last = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
    sources[id] = {
      id,
      title: meta.title,
      publisher: meta.publisher,
      sourceUrl: meta.source_url,
      release: last?.source_version ?? "",
      unit: meta.unit,
    };
    for (const r of rows) {
      const n = notesMap(r.notes);
      const series = r.dimensions?.series || n.get("series") || "";
      const tenure = r.dimensions?.demographic || n.get("tenure") || "all-tenures";
      const bk = n.get("breakdown") || "none";
      const catRaw = r.dimensions?.category || n.get("category") || "";
      const cat = catRaw.includes(":") ? catRaw.split(":").slice(1).join(":") : catRaw;
      const status = (STATUS.includes(r.observation_status as Status) ? r.observation_status : r.value == null ? "missing" : "final") as Status;
      const flags = FLAG_KEYS.filter((k) => n.has(k))
        .map((k) => `${k}=${n.get(k)}`)
        .join("|");
      const sample = Number(n.get("row-sample-unweighted") ?? "") || 0;
      cells.push([
        idx(dict.ind, id),
        idx(dict.series, series),
        idx(dict.tenure, tenure),
        idx(dict.bk, bk),
        idx(dict.cat, cat),
        areaIdx(r.geography_code || "E92000001", r.geography_label || "England"),
        Math.round(toT(r.period_start) * 100),
        r.value,
        STATUS.indexOf(status),
        sample,
        idx(dict.label, n.get("survey-year-label") ?? ""),
        idx(dict.flags, flags),
        idx(dict.grouping, n.get("type-grouping") ?? ""),
      ]);
    }
  }
  return { dict, cells, sources };
}
