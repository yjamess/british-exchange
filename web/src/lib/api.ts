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

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
}

export async function fetchIndicator(id: string): Promise<IndicatorMeta> {
  const res = await fetch(`${apiBase()}/indicators/${id}`, { cache: "no-store" });
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
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load observations for ${id}: ${res.status}`);
  }
  return res.json() as Promise<ObservationsResponse>;
}
