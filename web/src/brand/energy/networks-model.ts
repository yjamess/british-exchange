/**
 * Domain 07 — Power Networks helpers (client-safe).
 * Study C interim: border anatomy (ET 5.6 GWh) + GB NESO Imports fuel context.
 * Invisible Grid topology deferred. GB ≠ UK. Flows ≠ capacity MW.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import type { Pt } from "../data";
import {
  INTERCONNECTOR_CORRIDORS,
  INTERCONNECTOR_FLOWS,
  INTERCONNECTOR_FLOWS_ID,
  fmtGWh,
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
  INTERCONNECTOR_CORRIDORS,
  INTERCONNECTOR_FLOWS,
  INTERCONNECTOR_FLOWS_ID,
  fmtGWh,
  interconnectorCorridorYearTable,
  interconnectorSeries,
  interconnectorYearSum,
  yearsOf,
  type InterconnectorCorridor,
  type InterconnectorFlow,
  type SeriesPack,
};

export const YEAR_MIX_ID = "gb-generation-mix-half-hourly";

export type NetworksPack = {
  interconnectors: SeriesPack | null;
};

/** Monthly NESO Imports fuel line (TWh) for Britain After Dark lite — GB only. */
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
