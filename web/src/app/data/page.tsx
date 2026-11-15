import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { DataCatalogue } from "@/brand/catalogue/DataCatalogue";
import { exploreIndex, topicWords } from "@/brand/catalogue/explore";
import { fetchIndicators, type IndicatorListItem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Data · British Exchange",
  description:
    "Every dataset on the British Exchange: what it measures, where it comes from, how fresh it is, and where to explore it. Search in everyday words.",
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
  // Where each dataset is explored, and its domain words for search — derived on the server from
  // what each visualisation declares it draws (brand/catalogue/explore.ts).
  const ids = items.map((i) => i.indicator_id);
  const explore = exploreIndex(ids);
  const topics = topicWords(ids);
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <DataCatalogue items={items} error={error} explore={explore} topics={topics} />
      </Suspense>
    </BrandRoot>
  );
}
