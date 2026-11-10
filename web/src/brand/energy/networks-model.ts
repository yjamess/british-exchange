/**
 * Domain 07 — Power Networks helpers (client-safe).
 * Border anatomy (ET 5.6 GWh) · Connections Queue (NESO TEC) · cable capacity MW
 * · GB monthly imports · Invisible Grid SSEN pilot. GB ≠ UK. Flows ≠ capacity MW.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import type { Pt } from "../data";
import {
  INTERCONNECTOR_CAPACITY_ID,
  INTERCONNECTOR_CORRIDORS,
  INTERCONNECTOR_FLOWS,
  INTERCONNECTOR_FLOWS_ID,
  fmtGWh,
  fmtMw,
  interconnectorAnnualSeries,
  interconnectorBuiltCapacityRanks,
  interconnectorCapacityPinDate,
  interconnectorCorridorYearTable,
  interconnectorSeries,
  interconnectorYearSum,
  noteMap,
  yearsOf,
  type InterconnectorCorridor,
  type InterconnectorFlow,
  type SeriesPack,
} from "./imports-model";
import { yearMonthlyLines } from "./packs";

export {
  INTERCONNECTOR_CAPACITY_ID,
  INTERCONNECTOR_CORRIDORS,
  INTERCONNECTOR_FLOWS,
  INTERCONNECTOR_FLOWS_ID,
  fmtGWh,
  fmtMw,
  interconnectorAnnualSeries,
  interconnectorBuiltCapacityRanks,
  interconnectorCapacityPinDate,
  interconnectorCorridorYearTable,
  interconnectorSeries,
  interconnectorYearSum,
  yearsOf,
  type InterconnectorCorridor,
  type InterconnectorFlow,
  type SeriesPack,
};

export const YEAR_MIX_ID = "gb-generation-mix-half-hourly";
export const TEC_REGISTER_ID = "transmission-entry-capacity-register";
export const SSEN_ATLAS_ID = "ssen-distribution-network-atlas";

export type SsenSubstation = {
  id: string;
  owner: string;
  type: string;
  class: string;
  number: string;
  operating_area: string;
  locality: string;
  data_confidence: string;
  lon: number;
  lat: number;
};

export type SsenLine = {
  id: string;
  circuit_id: string;
  circuit_nrn: string;
  voltage: string;
  network_type: "EHV" | "EHV+" | string;
  coordinates: [number, number][];
};

export type SsenAtlasPack = {
  indicator_id: string;
  publisher: string;
  as_of: string;
  crs: string;
  licence: string;
  attribution: string;
  geography: string;
  honesty: string[];
  counts: {
    substations_raw: number;
    ohl_segments_raw: number;
    atlas_substations: number;
    atlas_ohl_segments: number;
    owners?: Record<string, number>;
    ohl_network_types?: Record<string, number>;
  };
  substations: SsenSubstation[];
  lines: SsenLine[];
};

export const SSEN_AREAS = ["all", "SEPD", "SHEPD"] as const;
export type SsenArea = (typeof SSEN_AREAS)[number];

export const SSEN_LAYERS = ["both", "substations", "lines"] as const;
export type SsenLayer = (typeof SSEN_LAYERS)[number];

export const SSEN_LINE_CLASSES = ["all", "ehv-plus", "ehv"] as const;
export type SsenLineClass = (typeof SSEN_LINE_CLASSES)[number];

export type NetworksPack = {
  interconnectors: SeriesPack | null;
  /** Same Ready NESO Interconnector Register as Imports › Connectors — link, do not fork. */
  interconnectorCapacity: SeriesPack | null;
  /** NESO TEC Register — Connections Queue. */
  tec: SeriesPack | null;
  /** SSEN SEPD+SHEPD Invisible Grid pilot atlas (Storage pack). */
  ssenAtlas: SsenAtlasPack | null;
  /** Count series for the same indicator (Postgres). */
  ssenCounts: SeriesPack | null;
  /** GB land outline for map place context — not an indicator. */
  outline?: string;
  outlineAttribution?: string;
};

export function filterSsenSubstations(
  rows: SsenSubstation[],
  area: SsenArea,
): SsenSubstation[] {
  if (area === "all") return rows;
  return rows.filter((r) => r.owner === area);
}

export function filterSsenLines(
  rows: SsenLine[],
  area: SsenArea,
  lineClass: SsenLineClass,
  lineInArea: (line: SsenLine, area: SsenArea) => boolean,
): SsenLine[] {
  return rows.filter((line) => {
    if (lineClass === "ehv-plus" && line.network_type !== "EHV+") return false;
    if (lineClass === "ehv" && line.network_type !== "EHV") return false;
    return lineInArea(line, area);
  });
}

export const TEC_GATES = ["all", "1", "2", "unassigned"] as const;
export type TecGate = (typeof TEC_GATES)[number];

export const TEC_STATUSES = [
  "all",
  "Scoping",
  "Awaiting Consents",
  "Consents Approved",
  "Under Construction/Commissioning",
  "Built",
] as const;
export type TecStatus = (typeof TEC_STATUSES)[number];

export const TEC_BASES = ["contractual", "built"] as const;
export type TecBasis = (typeof TEC_BASES)[number];

export type TecLine = {
  id: string;
  projectNumber: string;
  plantType: string;
  plantFamily: string;
  gate: string;
  status: string;
  mw: number;
  period: string;
  hostTo: string;
  dateBasis: string;
};

const PLANT_FAMILY_RULES: { match: RegExp; family: string }[] = [
  { match: /^Energy Storage System$/i, family: "Storage" },
  { match: /^Wind Offshore$/i, family: "Offshore wind" },
  { match: /^Wind Onshore$/i, family: "Onshore wind" },
  { match: /^PV Array/i, family: "Solar" },
  { match: /^CCGT/i, family: "Gas" },
  { match: /^Hydro/i, family: "Hydro" },
  { match: /^Nuclear/i, family: "Nuclear" },
  { match: /^Demand/i, family: "Demand" },
];

export function tecPlantFamily(plantType: string): string {
  const t = plantType.trim();
  if (!t) return "Other";
  if (t.includes(";")) return "Mixed technologies";
  for (const rule of PLANT_FAMILY_RULES) {
    if (rule.match.test(t)) return rule.family;
  }
  return "Other";
}

export function parseTecLines(rows: Observation[]): TecLine[] {
  const out: TecLine[] = [];
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    const projectNumber = n.project_number || n.project_id || r.period_start;
    out.push({
      id: `${projectNumber}|${r.period_start}|${n.date_basis ?? ""}|${r.value}`,
      projectNumber,
      plantType: n.plant_type || "—",
      plantFamily: tecPlantFamily(n.plant_type || ""),
      gate: n.gate || "unassigned",
      status: n.project_status || "—",
      mw: Number(r.value),
      period: r.period_start,
      hostTo: n.host_to || "—",
      dateBasis: n.date_basis || "",
    });
  }
  return out;
}

export function filterTecLines(
  lines: TecLine[],
  basis: TecBasis,
  gate: TecGate,
  status: TecStatus,
): TecLine[] {
  const wantBasis =
    basis === "built" ? "built_connected_pin_snapshot" : "mw_effective_from_contractual";
  return lines.filter((line) => {
    if (line.dateBasis !== wantBasis) return false;
    if (gate !== "all" && line.gate !== gate) return false;
    if (status !== "all" && line.status !== status) return false;
    return true;
  });
}

export function tecRankByFamily(
  lines: TecLine[],
): { id: string; label: string; v: number; projects: number }[] {
  const map = new Map<string, { mw: number; projects: Set<string> }>();
  for (const line of lines) {
    const cur = map.get(line.plantFamily) ?? { mw: 0, projects: new Set() };
    cur.mw += line.mw;
    cur.projects.add(line.projectNumber);
    map.set(line.plantFamily, cur);
  }
  return [...map.entries()]
    .map(([family, cur]) => ({
      id: family.toLowerCase().replace(/\s+/g, "-"),
      label: `${family} · ${cur.projects.size.toLocaleString("en-GB")} projects`,
      v: cur.mw,
      projects: cur.projects.size,
    }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

export function tecRankByGate(
  lines: TecLine[],
): { id: string; label: string; v: number }[] {
  const map = new Map<string, number>();
  for (const line of lines) {
    map.set(line.gate, (map.get(line.gate) ?? 0) + line.mw);
  }
  const labelFor = (g: string) =>
    g === "1" ? "Gate 1" : g === "2" ? "Gate 2" : g === "unassigned" ? "Unassigned" : g;
  return [...map.entries()]
    .map(([gate, mw]) => ({ id: gate, label: labelFor(gate), v: mw }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

export function tecRankByStatus(
  lines: TecLine[],
): { id: string; label: string; v: number }[] {
  const map = new Map<string, number>();
  for (const line of lines) {
    map.set(line.status, (map.get(line.status) ?? 0) + line.mw);
  }
  return [...map.entries()]
    .map(([status, mw]) => ({ id: status, label: status, v: mw }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

export function tecLargestLines(lines: TecLine[], limit = 25): TecLine[] {
  return [...lines].sort((a, b) => Math.abs(b.mw) - Math.abs(a.mw)).slice(0, limit);
}

export function tecPinLabel(rows: Observation[]): string | null {
  const built = rows.find((r) => noteMap(r.notes ?? "").date_basis === "built_connected_pin_snapshot");
  return built?.period_start ?? null;
}

export function tecUniqueProjects(lines: TecLine[]): number {
  return new Set(lines.map((l) => l.projectNumber)).size;
}

export function tecTotalMw(lines: TecLine[]): number {
  return lines.reduce((s, l) => s + l.mw, 0);
}

/** Monthly NESO Imports fuel line (TWh) for the Monthly imports view (id `night`) — GB only. */
export function gbImportsFuelSeries(
  observations: Observation[],
): { id: string; label: string; points: Pt[] } {
  const line = yearMonthlyLines(observations).find((s) => s.id === "imports");
  return (
    line ?? {
      id: "imports",
      label: "Imports",
      points: [],
    }
  );
}

export function gbImportsFuelYearTotal(
  observations: Observation[],
  year: number,
): number | null {
  const series = gbImportsFuelSeries(observations);
  const pts = series.points.filter((p) => Math.floor(p.t) === year);
  if (!pts.length) return null;
  return pts.reduce((s, p) => s + p.v, 0);
}

export function fmtTwh(v: number): string {
  if (Math.abs(v) >= 100) return `${v.toFixed(0)} TWh`;
  if (Math.abs(v) >= 10) return `${v.toFixed(1)} TWh`;
  return `${v.toFixed(2)} TWh`;
}

export function corridorLabel(corridor: string): string {
  return corridor;
}

export function noteFuel(notes: string): string {
  return noteMap(notes).fuel ?? "";
}

export type { IndicatorMeta };
