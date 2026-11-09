import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnergySector } from "@/brand/energy/EnergySector";
import {
  loadAtlas,
  loadCapacity,
  loadConsumption,
  loadGeneration,
  loadLongRun,
  loadFossils,
  loadImports,
  loadManufacturing,
  loadPrices,
  loadNetworks,
  loadRenewables,
  loadYearMix,
} from "@/brand/energy/load";
import { SECTOR_PAGES } from "@/brand/sector-pages";
import { SectorTemplate } from "@/brand/template";
import { fetchIndicators } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sector: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const config = SECTOR_PAGES[(await params).sector];
  return config ? { title: `${config.label} · British Exchange`, description: config.headline.join(" ") } : {};
}

/** Every sector except Housing, from configuration (web/src/brand/sector-pages.ts). Energy draws Domain 01. */
export default async function SectorRoute({ params }: Params) {
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
    const [
      generation,
      capacity,
      longRun,
      yearMix,
      atlas,
      consumption,
      prices,
      fossils,
      imports,
      manufacturing,
      renewables,
      networks,
    ] = await Promise.all([
      loadGeneration(),
      loadCapacity(),
      loadLongRun(),
      loadYearMix(),
      loadAtlas(),
      loadConsumption(),
      loadPrices(),
      loadFossils(),
      loadImports(),
      loadManufacturing(),
      loadRenewables(),
      loadNetworks(),
    ]);
    return (
      <EnergySector
        config={config}
        titles={titles}
        generation={generation}
        capacity={capacity}
        longRun={longRun}
        yearMix={yearMix}
        atlas={atlas}
        consumption={consumption}
        prices={prices}
        fossils={fossils}
        imports={imports}
        manufacturing={manufacturing}
        renewables={renewables}
        networks={networks}
      />
    );
  }
  return <SectorTemplate config={config} titles={titles} />;
}
