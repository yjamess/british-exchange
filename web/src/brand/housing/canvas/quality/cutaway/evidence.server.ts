import { fetchIndicator, fetchObservations, type IndicatorMeta, type Observation } from "@/lib/api";
import { toT } from "../../../../data";
import { EPC_LA_ID, EPC_NATIONAL_ID, STATUS, type EvidencePayload, type EvidenceSource, type Status } from "./evidence";

/**
 * Server loader for Domain 07 (/api/housing/quality).
 * EHS survey tables load in full (each under the API 10k cap). The EPC certificate
 * register is larger: national/region rows load by series; local-authority rows load
 * for recent quarters only (period_start filter) so the map stays under the cap.
 * No estimation — every cell is a published figure.
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


const EPC_SERIES = [
  "lodgements-total",
  "band-a",
  "band-b",
  "band-c",
  "band-d",
  "band-e",
  "band-f",
  "band-g",
  "band-not-recorded",
] as const;

/** Quarters of LA lodgements kept for the Geography map + short place trends. */
const EPC_LA_QUARTERS = 8;

const FLAG_KEYS = [
  "covid-modelled",
  "hybrid-sample",
  "floor-area-modelled",
  "sap-version",
  "method",
  "base",
  "sample-base",
  "geography-level",
  "observation-type",
  "table",
  "period-type",
];

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

  const ingest = (id: string, meta: IndicatorMeta, rows: Observation[]) => {
    if (rows.length === 0) return;
    const last = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
    if (!sources[id]) {
      sources[id] = {
        id,
        title: meta.title,
        publisher: meta.publisher,
        sourceUrl: meta.source_url,
        release: last?.source_version ?? "",
        unit: meta.unit,
      };
    } else if (last?.source_version) {
      sources[id]!.release = last.source_version;
    }
    for (const r of rows) {
      const n = notesMap(r.notes);
      const series = r.dimensions?.series || n.get("series") || "";
      const tenure = r.dimensions?.demographic || n.get("tenure") || "all-tenures";
      const bk = n.get("breakdown") || "none";
      const catRaw = r.dimensions?.category || n.get("category") || "";
      const cat = catRaw.includes(":") ? catRaw.split(":").slice(1).join(":") : catRaw;
      const status = (
        STATUS.includes(r.observation_status as Status) ? r.observation_status : r.value == null ? "missing" : "final"
      ) as Status;
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
        idx(dict.label, n.get("survey-year-label") ?? periodLabel(r.period_start)),
        idx(dict.flags, flags),
        idx(dict.grouping, n.get("type-grouping") ?? ""),
      ]);
    }
  };

  // Sequential packs — parallel fan-out exhausts the Supabase session pool (15).
  for (const id of QUALITY_INDICATORS) {
    try {
      const [meta, obs] = await Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })]);
      ingest(id, meta, obs.observations as Observation[]);
    } catch {
      // Missing EHS package — other indicators still load.
    }
  }

  await loadEpcRegister(ingest);

  return { dict, cells, sources };
}

const Q_LABEL = ["Q1", "Q2", "Q3", "Q4"] as const;
function periodLabel(iso: string): string {
  const month = Number(iso.slice(5, 7));
  if (!month) return iso.slice(0, 4);
  const q = Q_LABEL[Math.floor((month - 1) / 3)] ?? "";
  return `${q} ${iso.slice(0, 4)}`;
}

async function loadEpcRegister(
  ingest: (id: string, meta: IndicatorMeta, rows: Observation[]) => void,
): Promise<void> {
  try {
    const [nationalMeta, laMeta] = await Promise.all([
      fetchIndicator(EPC_NATIONAL_ID),
      fetchIndicator(EPC_LA_ID),
    ]);

    const nationalRows: Observation[] = [];
    for (const series of EPC_SERIES) {
      const obs = await fetchObservations(EPC_NATIONAL_ID, { series, limit: "10000" });
      nationalRows.push(...(obs.observations as Observation[]));
    }
    ingest(EPC_NATIONAL_ID, nationalMeta, nationalRows);

    const periods = [...new Set(nationalRows.map((r) => r.period_start).filter(Boolean))].sort();
    const recent = periods.slice(-EPC_LA_QUARTERS);
    if (recent.length === 0) return;

    for (const period of recent) {
      const obs = await fetchObservations(EPC_LA_ID, {
        series: "lodgements-total",
        period_start: period,
        limit: "10000",
      });
      ingest(EPC_LA_ID, laMeta, obs.observations as Observation[]);
    }
    const latest = recent[recent.length - 1]!;
    for (const series of ["band-a", "band-b", "band-c"] as const) {
      const obs = await fetchObservations(EPC_LA_ID, {
        series,
        period_start: latest,
        limit: "10000",
      });
      ingest(EPC_LA_ID, laMeta, obs.observations as Observation[]);
    }
  } catch {
    // EPC optional for survey views — Geography shows EmptyStage when missing.
  }
}
