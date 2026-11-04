import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { HousingExplorer } from "@/brand/housing/HousingExplorer";
import { loadHousing } from "@/brand/housing/load";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Housing & Land · British Exchange",
  description: "UK house prices, regional prices, rents, affordability, new supply and dwelling tenure, from the official series.",
};

/** Housing & Land — v1 explorer (one ink, plates, instrument charts). */
export default async function HousingPage() {
  return (
    <BrandRoot>
      <HousingExplorer data={await loadHousing()} />
    </BrandRoot>
  );
}
