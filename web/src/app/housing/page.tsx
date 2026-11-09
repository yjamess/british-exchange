import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { HousingPage, type PricesMapPayload } from "@/brand/housing/HousingPage";
import { loadHousing } from "@/brand/housing/load";
import { loadAffordAtlas, loadAffordSpread, loadAtlas, loadGeometry, loadRentAtlas } from "@/brand/housing/atlas/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Housing & Land · British Exchange",
  description:
    "An exploration of British housing, its geography, economics and history — prices, affordability, stock, land and supply from official series.",
};

const DOMAINS = new Set([
  "prices",
  "renting",
  "affordability",
  "stock",
  "supply",
  "land",
  "quality",
  "insecurity",
  "ownership",
  "policy",
]);

type DomainId =
  | "prices"
  | "renting"
  | "affordability"
  | "stock"
  | "supply"
  | "land"
  | "quality"
  | "insecurity"
  | "ownership"
  | "policy";

/**
 * Only hydrate the atlas the current Map view needs.
 * Shipping HPI (≈7MB) + rent + afford + geometry on every Housing request
 * was the main reason pages felt slow on a fine connection.
 */
async function loadMapPack(
  domain: DomainId,
  view: string | undefined,
  hpi: string,
): Promise<{ pricesMap: PricesMapPayload | null; rentMap: PricesMapPayload | null; affordMap: PricesMapPayload | null }> {
  const empty = { pricesMap: null, rentMap: null, affordMap: null };
  if (view !== "map") return empty;
  try {
    if (domain === "prices") {
      const [atlas, geometry] = await Promise.all([loadAtlas(hpi), loadGeometry()]);
      return { ...empty, pricesMap: { atlas, geometry } };
    }
    if (domain === "renting") {
      const [atlas, geometry] = await Promise.all([loadRentAtlas("average-rent"), loadGeometry()]);
      return { ...empty, rentMap: { atlas, geometry } };
    }
    if (domain === "affordability") {
      const [atlas, geometry] = await Promise.all([loadAffordAtlas("pte-median"), loadGeometry()]);
      return { ...empty, affordMap: { atlas, geometry } };
    }
  } catch {
    return empty;
  }
  return empty;
}

/** Housing & Land — Gate 2 editorial page (Notion product scope). */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = typeof params.domain === "string" ? params.domain : "prices";
  const initialDomain = (DOMAINS.has(raw) ? raw : "prices") as DomainId;
  const view = typeof params.view === "string" ? params.view : undefined;
  const hpi =
    typeof params.type === "string" &&
    ["average", "detached", "semi-detached", "terraced", "flat", "new-build", "existing", "sales-volume"].includes(params.type)
      ? params.type
      : "average";

  const [base, maps, affordSpread] = await Promise.all([
    loadHousing(initialDomain),
    loadMapPack(initialDomain, view, hpi),
    // small (≈2KB, from a cached file): England LA spread for the affordability Ratio view
    initialDomain === "affordability" ? loadAffordSpread() : Promise.resolve(null),
  ]);
  const data = { ...base, affordSpread };

  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <HousingPage
          data={data}
          initialDomain={initialDomain}
          pricesMap={maps.pricesMap}
          rentMap={maps.rentMap}
          affordMap={maps.affordMap}
        />
      </Suspense>
    </BrandRoot>
  );
}
