import { BrandRoot } from "@/brand/BrandRoot";
import { loadLongRun } from "@/brand/energy/load";
import { GenerationViews } from "./GenerationViews";

export const metadata = { title: "Generation views · British Exchange design lab" };

/** Design lab: alternative ways to draw the 1920–2025 UK generation mix. Real DESNZ long-run data. */
export default async function Page() {
  const pack = await loadLongRun();
  return (
    <BrandRoot>
      <GenerationViews mix={pack?.mix ?? []} />
    </BrandRoot>
  );
}
