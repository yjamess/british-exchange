import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { DataCatalogue } from "@/brand/catalogue/DataCatalogue";
import { fetchIndicators, type IndicatorListItem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Data · British Exchange",
  description:
    "Every series on the British Exchange: publisher, coverage, release and licence, by sector. Search, filter and sort the catalogue.",
};

/** The canonical data page: one catalogue for every sector (replaces per-sector dataset pages). */
export default async function DataPage() {
  let items: IndicatorListItem[] = [];
  let error: string | null = null;
  try {
    items = await fetchIndicators();
  } catch (err) {
    error = err instanceof Error ? err.message : "The data service did not answer.";
  }
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <DataCatalogue items={items} error={error} />
      </Suspense>
    </BrandRoot>
  );
}
