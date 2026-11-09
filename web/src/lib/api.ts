/** Browser client for the Britain Exchange FastAPI. */

export type ChartMeta = {
  indicator_id: string;
  display_title: string;
  series_id: string;
  publisher: string;
  source_url: string;
  geography: string;
  frequency: string;
  frequency_normalized: string;
  unit: string;
  caveats: string;
  definition: string;
  measure_family: string;
  england_only: boolean;
  is_cpi: boolean;
  is_cpih: boolean;
  is_gva_cvm_weight: boolean;
  is_rail_ppm: boolean;
  allows_industry_aggregate: boolean | null;
  chart_kind?: string;
  compatibility_warnings?: string[];
};

export type IndicatorMeta = {
  indicator_id: string;
  title: string;
  sector: string;
  publisher: string;
  source_url: string;
  series_id: string;
  geography: string;
  frequency: string;
  unit: string;
  definition: string;
  licence: string;
  caveats: string;
  revision_notes: string;
  notion_registry_url: string;
  chart?: ChartMeta;
};

export type ObservationDimensions = {
  fuel: string;
  water_company: string;
  water_company_name: string;
  demographic: string;
  series: string;
  category: string;
};

export type Observation = {
  indicator_id: string;
  period_start: string;
  period_end: string;
  geography_code: string;
  geography_label: string;
  value: number | null;
  unit: string;
  observation_status: string;
  source_version: string;
  notes: string;
  aggregation_role?: string;
  dimensions?: ObservationDimensions;
  release_id?: number;
};

export type ObservationsResponse = {
  indicator_id: string;
  source_url: string;
  unit: string;
  frequency: string;
  count: number;
  returned: number;
  excluded_aggregate_rows: number;
  aggregate_fuels: string[];
  available_dimensions: Record<string, unknown>;
  chart: ChartMeta;
  observations: Observation[];
};

/** One row of `GET /indicators` — the catalogue listing. */
export type IndicatorListItem = {
  indicator_id: string;
  title: string;
  sector: string;
  publisher: string;
  unit: string;
  frequency: string;
  geography: string;
  series_id: string;
  caveats: string;
  source_url: string;
  notion_registry_url: string;
  agent_owner: string;
  licence: string;
  definition: string;
  /** Earliest period_start (ISO date), "" when empty. */
  coverage_start: string;
  /** Latest period_end (ISO date), "" when empty. */
  coverage_end: string;
  observation_count: number;
  /** Size of the series CSV in bytes (files store); absent from the Postgres listing. */
  csv_bytes?: number | null;
  /** Latest official release date among pinned raw evidence (ISO date). */
  release_date: string;
  /** Latest retrieval timestamp among pinned raw evidence (ISO). */
  retrieved_at: string;
};

export async function fetchIndicators(): Promise<IndicatorListItem[]> {
  const res = await fetch(`${apiBase()}/indicators`, apiInit());
  if (!res.ok) {
    throw new Error(`Failed to load indicators: ${res.status}`);
  }
  return res.json() as Promise<IndicatorListItem[]>;
}

/** The site's one download link for a series' CSV (proxied, so it works off this machine). */
export const csvHref = (indicatorId: string) => `/api/data/${indicatorId}`;

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
}

/**
 * Fail when the local API is down or wedged.
 * Housing loads dozens of indicators at once. A short limit aborts the largest
 * series (regional prices, UK HPI) while the rest are still in flight, and
 * Next logs that abort as "Failed to set fetch cache". One request alone is
 * well under a second; the limit has to cover the whole parallel burst.
 */
const API_TIMEOUT_MS = 120_000;

function apiInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(API_TIMEOUT_MS),
  };
}

export async function fetchIndicator(id: string): Promise<IndicatorMeta> {
  const res = await fetch(`${apiBase()}/indicators/${id}`, apiInit());
  if (!res.ok) {
    throw new Error(`Failed to load indicator ${id}: ${res.status}`);
  }
  return res.json() as Promise<IndicatorMeta>;
}

export async function fetchObservations(
  id: string,
  params: Record<string, string> = {},
): Promise<ObservationsResponse> {
  const qs = new URLSearchParams(params);
  const url = `${apiBase()}/indicators/${id}/observations${qs.size ? `?${qs}` : ""}`;
  const res = await fetch(url, apiInit());
  if (!res.ok) {
    throw new Error(`Failed to load observations for ${id}: ${res.status}`);
  }
  return res.json() as Promise<ObservationsResponse>;
}
