/**
 * Domain 09 — Jobs & Productivity helpers (client-safe).
 * Study C interim: national Jobs vs Output + Productivity Machine.
 * Reuses Manufacturing Ready series — jobs ≠ volume index ≠ output-per-hour.
 */

import type { SeriesPack } from "./manufacturing-model";

export {
  EMPLOYMENT_ID,
  OUTPUT_INDEX_ID,
  OUTPUT_PER_HOUR_ID,
  employmentSeries,
  employmentYearMean,
  fmtIndex,
  fmtJobsThousands,
  outputIndexSeries,
  outputIndexYearMean,
  pctChange,
  productivitySeries,
  productivityYearMean,
  yearsOf,
} from "./manufacturing-model";

/** Jobs pack = Manufacturing trio without GVA share (Manufacturing owns share). */
export type JobsPack = {
  employment: SeriesPack | null;
  output: SeriesPack | null;
  productivity: SeriesPack | null;
};

export function jobsPackFromManufacturing(m: {
  employment: SeriesPack | null;
  output: SeriesPack | null;
  productivity: SeriesPack | null;
}): JobsPack {
  return {
    employment: m.employment,
    output: m.output,
    productivity: m.productivity,
  };
}
