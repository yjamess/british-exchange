/**
 * Everyday basket loader — cloud only (Exchange API).
 *
 * The pin holds 326 items × 85 months (~26k rows), over the API's 10k-row cap, so never load it
 * whole. Instead:
 *   - every January 2018 → 2025 (one request each, ~326 rows): the catalogue (label, size, group
 *     from row notes) and the January prices the year menus compare;
 *   - full monthly series for the featured items (one request each), so Play the months runs.
 * Monthly series for any other item are fetched in the browser when it joins the basket.
 */

import { fetchIndicator, fetchObservations, type Observation } from "@/lib/api";
import { BASKET_ITEMS } from "./inflation-model";
import type { SeriesPack } from "./types";

export const BASKET_ID = "everyday-basket-average-prices";
const FIRST_YEAR = 2018;
const LAST_YEAR = 2025;

async function rows(params: Record<string, string>): Promise<Observation[]> {
  const res = await fetchObservations(BASKET_ID, { limit: "10000", ...params });
  return res.observations;
}

export async function loadBasketPack(): Promise<SeriesPack | null> {
  try {
    const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
    const [meta, ...parts] = await Promise.all([
      fetchIndicator(BASKET_ID),
      ...years.map((y) => rows({ period_start: `${y}-01-01` })),
      ...BASKET_ITEMS.map((i) => rows({ category: i.slug })),
    ]);
    const seen = new Set<string>();
    const observations: Observation[] = [];
    for (const r of parts.flat()) {
      const key = `${r.dimensions?.category ?? ""}|${r.period_start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      observations.push(r);
    }
    observations.sort((a, b) => a.period_start.localeCompare(b.period_start));
    const sourceVersion = observations.find((r) => r.source_version)?.source_version ?? "";
    return { meta, observations, sourceVersion };
  } catch (err) {
    console.error("economy loadBasketPack failed", err);
    return null;
  }
}

/** Browser: one item's full monthly series, when it joins the basket. */
export async function fetchBasketItem(slug: string): Promise<Observation[]> {
  return rows({ category: slug });
}
