import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { fetchIndicator, fetchObservations } from "@/lib/api";
import { tesFunctionStack } from "@/brand/economy/spending-function-model";
import { PaletteLab } from "./PaletteLab";

export const metadata: Metadata = { title: "Colour studies · Design lab" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const [observations, metadata] = await Promise.allSettled([
    fetchObservations("tes-by-function", { limit: "10000" }), fetchIndicator("tes-by-function"),
  ]);
  const series = observations.status === "fulfilled" ? tesFunctionStack(observations.value.observations, "absolute") : [];
  const meta = metadata.status === "fulfilled" ? metadata.value : null;
  return <BrandRoot><PaletteLab series={series} sourceUrl={meta?.source_url} /></BrandRoot>;
}
