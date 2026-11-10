import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EnergySector } from "@/brand/energy/EnergySector";
import { legacyEnergyRedirect } from "@/brand/energy/legacy-views";
import { loadEnergy } from "@/brand/energy/load";
import { resolveEnergyDomain } from "@/brand/energy/domain-sources";
import { SECTOR_PAGES } from "@/brand/sector-pages";
import { SectorTemplate } from "@/brand/template";
import { fetchIndicators } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sector: string }> };
type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const config = SECTOR_PAGES[(await params).sector];
  return config ? { title: `${config.label} · British Exchange`, description: config.headline.join(" ") } : {};
}

/** Every sector except Housing, from configuration (web/src/brand/sector-pages.ts). Energy draws Domain 01. */
export default async function SectorRoute({ params, searchParams }: Params & Search) {
  const sector = (await params).sector;
  const config = SECTOR_PAGES[sector];
  if (!config) notFound();
  // Series titles for the domain lists; the page still renders (ids only) if the API is down.
  let titles: Record<string, string> = {};
  try {
    titles = Object.fromEntries((await fetchIndicators()).map((i) => [i.indicator_id, i.title]));
  } catch {
    titles = {};
  }
  if (sector === "energy") {
    const query = await searchParams;
    // Retired duplicate tabs (Jobs Atlas, Networks Capacity) go to the tab that kept the UI.
    const moved = legacyEnergyRedirect(query);
    if (moved) redirect(moved);
    // Same pattern as Housing: hydrate only the selected domain's declared packs.
    const domain = resolveEnergyDomain(query.domain);
    const data = await loadEnergy(domain);
    return (
      <EnergySector
        config={config}
        titles={titles}
        generation={data.generation}
        capacity={data.capacity}
        longRun={data.longRun}
        yearMix={data.yearMix}
        atlas={data.atlas}
        consumption={data.consumption}
        prices={data.prices}
        fossils={data.fossils}
        imports={data.imports}
        manufacturing={data.manufacturing}
        renewables={data.renewables}
        networks={data.networks}
        policyEvents={data.policyEvents}
        shockEvents={data.shockEvents}
      />
    );
  }
  return <SectorTemplate config={config} titles={titles} />;
}
