/**
 * Housing & Land — proposal built entirely from brand foundations (src/brand).
 * Lives in the lab so the current /housing stays untouched until adopted.
 */

import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { HousingOverview } from "@/brand/housing/HousingOverview";
import { loadHousing } from "@/brand/housing/load";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Housing & Land · Lab · British Exchange",
  description: "Lab mirror of live /housing — Instrument + Imprint proof.",
};

/** Lab mirror of the live Housing proof. Prefer /housing for the locked system. */
export default async function HousingProposalPage() {
  return (
    <BrandRoot>
      <HousingOverview data={await loadHousing()} />
    </BrandRoot>
  );
}
