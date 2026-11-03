/** Browser client for the Britain Exchange FastAPI (local file-backed v0). */

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
};

export type ObservationsResponse = {
  indicator_id: string;
  source_url: string;
  unit: string;
  count: number;
  returned: number;
  excluded_aggregate_rows: number;
  aggregate_fuels: string[];
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
