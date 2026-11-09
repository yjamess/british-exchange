import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { loadHousing } from "@/brand/housing/load";
import { HousingCanvasLab } from "./HousingCanvasLab";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Housing canvas · Design lab",
  description: "Lab: photo-plate index rail + instrument-frame canvas for Housing & Land. Not production.",
};

/** Lab — direction A: index rail (photo plates) + instrument frame. Real Exchange series. */
export default async function Page() {
  const data = await loadHousing();
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <HousingCanvasLab data={data} />
      </Suspense>
    </BrandRoot>
  );
}
