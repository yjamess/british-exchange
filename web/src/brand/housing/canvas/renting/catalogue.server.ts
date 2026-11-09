/**
 * PIPR place packs for Housing › Renting.
 *
 * Live data comes from the FastAPI / Postgres spine
 * (`/housing/rent/...`), not from a local curated CSV. Bulky
 * observations.csv stays in the Supabase archive for re-ingest only.
 */

import { apiBase } from "@/lib/api";
import type { Atlas } from "../../atlas/model";

export type RentLevel = "uk" | "nation" | "region" | "local";

export type RentPlace = { code: string; name: string; level: RentLevel };

export type AreaPack = {
  code: string;
  name: string;
  level: RentLevel;
  months: string[];
  series: Record<string, (number | null)[]>;
  provisional: Record<string, boolean[]>;
};

async function rentFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Rent API ${path} failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function rentPlaces(): Promise<RentPlace[]> {
  return rentFetch<RentPlace[]>("/housing/rent/places");
}

export async function rentArea(code: string): Promise<AreaPack | null> {
  const res = await fetch(`${apiBase()}/housing/rent/areas/${encodeURIComponent(code)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Rent API area failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  return res.json() as Promise<AreaPack>;
}

/** One measure for every place, in the same shape as the rent atlas the map already draws. */
export async function rentMap(category: string, measure: string): Promise<Atlas> {
  const qs = new URLSearchParams({
    category: category || "all",
    measure: measure || "average-rent",
  });
  return rentFetch<Atlas>(`/housing/rent/map?${qs}`);
}
