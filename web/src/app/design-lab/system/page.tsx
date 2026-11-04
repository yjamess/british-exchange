import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { loadHousing } from "@/brand/housing/load";
import { SectorSystem } from "@/brand/sector/System";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sector design system · British Exchange",
};

export default async function SystemPage() {
  return (
    <BrandRoot>
      <SectorSystem data={await loadHousing()} />
    </BrandRoot>
  );
}
