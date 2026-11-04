import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { HousingOverview } from "@/brand/housing/HousingOverview";
import { loadHousing } from "@/brand/housing/load";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Housing & Land · British Exchange",
  description:
    "The places we live. The prices we pay. Explore UK housing prices, rents, affordability and supply.",
};

/** Housing = sector one proof of the shared Instrument + Imprint shell. */
export default async function HousingPage() {
  return (
    <BrandRoot>
      <HousingOverview data={await loadHousing()} />
    </BrandRoot>
  );
}
