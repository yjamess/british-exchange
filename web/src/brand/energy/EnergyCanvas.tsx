"use client";

/**
 * Energy & Industry explorer — shared SectorPage + Explorer shell.
 * Ready domains: generation…manufacturing, industrial-work, policy.
 */

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { REF_ICON_PLATES } from "../Plate";
import type { SectorConfig } from "../sector-pages";
import {
  EmptyStage,
  Explorer,
  ExplorerHead,
  SourceLine,
  Stage,
  explorerClasses as x,
  type ExplorerDomain,
} from "../template";
import { SectorPage } from "../template/SectorPage";
import c from "../template/sectorCanvas.module.css";
import { GenerationCanvas } from "./GenerationCanvas";
import { ConsumptionCanvas } from "./ConsumptionCanvas";
import { PricesCanvas } from "./PricesCanvas";
import { FossilsCanvas } from "./FossilsCanvas";
import { ImportsCanvas } from "./ImportsCanvas";
import { ManufacturingCanvas } from "./ManufacturingCanvas";
import { JobsCanvas } from "./JobsCanvas";
import { PolicyCanvas } from "./PolicyCanvas";
import { RenewablesCanvas } from "./RenewablesCanvas";
import { NetworksCanvas } from "./NetworksCanvas";
import type { AtlasPack, CapacityPack, GenerationPack, YearPack } from "./packs";
import type { LongRunPack } from "./long-run";
import type { ConsumptionPack } from "./consumption-model";
import type { PricesPack } from "./prices-model";
import type { FossilsPack } from "./fossils-model";
import type { ImportsPack } from "./imports-model";
import type { ManufacturingPack } from "./manufacturing-model";
import type { RenewablesPack } from "./renewables-model";
import type { NetworksPack } from "./networks-model";
import { jobsPackFromManufacturing } from "./jobs-model";

export function EnergyView({
  config,
  titles,
  generation,
  capacity,
  longRun = null,
  yearMix = null,
  atlas = null,
  consumption = {
    final: null,
    flow: null,
    endUse: null,
    crossEndUse: null,
    geography: null,
    efficiencies: null,
  },
  prices = {
    domestic: null,
    gas: null,
    economy7: null,
    layers: null,
    gasLayers: null,
    industrial: null,
    ofgem: null,
    ofgemRegional: null,
    wholesale: null,
    cpih: null,
    earnings: null,
  },
  fossils = {
    crude: null,
    gas: null,
    primary: null,
    coal: null,
    fields: [],
    fieldProduction: [],
    fieldProductionNational: null,
    reserves: null,
    oilImports: null,
    trade: null,
    dependency: null,
    attribution: "",
  },
  imports = {
    dependency: null,
    trade: null,
    interconnectors: null,
    interconnectorCapacity: null,
    oilPartners: null,
    gasPartners: null,
    lngTerminals: null,
    fossilDependency: null,
    lowCarbonShare: null,
    gasStorage: null,
  },
  manufacturing = { output: null, share: null, employment: null, productivity: null },
  renewables = { loadFactors: null, pipeline: null, plantLoadFactors: null },
  networks = { interconnectors: null },
}: {
  config: SectorConfig;
  titles: Record<string, string>;
  generation: GenerationPack | null;
  capacity: CapacityPack | null;
  longRun?: LongRunPack | null;
  yearMix?: YearPack | null;
  atlas?: AtlasPack | null;
  consumption?: ConsumptionPack;
  prices?: PricesPack;
  fossils?: FossilsPack;
  imports?: ImportsPack;
  manufacturing?: ManufacturingPack;
  renewables?: RenewablesPack;
  networks?: NetworksPack;
}) {
  const hero = useSearchParams().get("domain") ? "band" : "full";
  return (
    <SectorPage name={config.name} label={config.label} hero={hero} plate={{ ...config.plate, treatment: "print" }}>
      <EnergyCanvas
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
    </SectorPage>
  );
}

function EnergyCanvas({
  config,
  titles,
  generation,
  capacity,
  longRun = null,
  yearMix = null,
  atlas = null,
  consumption = {
    final: null,
    flow: null,
    endUse: null,
    crossEndUse: null,
    geography: null,
    efficiencies: null,
  },
  prices = {
    domestic: null,
    gas: null,
    economy7: null,
    layers: null,
    gasLayers: null,
    industrial: null,
    ofgem: null,
    ofgemRegional: null,
    wholesale: null,
    cpih: null,
    earnings: null,
  },
  fossils = {
    crude: null,
    gas: null,
    primary: null,
    coal: null,
    fields: [],
    fieldProduction: [],
    fieldProductionNational: null,
    reserves: null,
    oilImports: null,
    trade: null,
    dependency: null,
    attribution: "",
  },
  imports = {
    dependency: null,
    trade: null,
    interconnectors: null,
    interconnectorCapacity: null,
    oilPartners: null,
    gasPartners: null,
    lngTerminals: null,
    fossilDependency: null,
    lowCarbonShare: null,
    gasStorage: null,
  },
  manufacturing = { output: null, share: null, employment: null, productivity: null },
  renewables = { loadFactors: null, pipeline: null, plantLoadFactors: null },
  networks = { interconnectors: null },
}: {
  config: SectorConfig;
  titles: Record<string, string>;
  generation: GenerationPack | null;
  capacity: CapacityPack | null;
  longRun?: LongRunPack | null;
  yearMix?: YearPack | null;
  atlas?: AtlasPack | null;
  consumption?: ConsumptionPack;
  prices?: PricesPack;
  fossils?: FossilsPack;
  imports?: ImportsPack;
  manufacturing?: ManufacturingPack;
  renewables?: RenewablesPack;
  networks?: NetworksPack;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const ids = config.domains.map((d) => d.id);
  const fromUrl = params.get("domain");
  const [active, setActive] = useState(fromUrl && ids.includes(fromUrl) ? fromUrl : "generation");

  const select = useCallback(
    (id: string) => {
      setActive(id);
      const u = new URLSearchParams(window.location.search);
      u.set("domain", id);
      if (
        id !== "generation" &&
        id !== "consumption" &&
        id !== "prices" &&
        id !== "fossil" &&
        id !== "imports" &&
        id !== "manufacturing" &&
        id !== "industrial-work" &&
        id !== "policy" &&
        id !== "low-carbon" &&
        id !== "networks"
      ) {
        u.delete("view");
        u.delete("measure");
        u.delete("year");
        u.delete("event");
        u.delete("compare");
        u.delete("fuel");
        u.delete("from");
        u.delete("to");
        u.delete("sector");
        u.delete("payment");
        u.delete("tariff");
        u.delete("band");
        u.delete("basis");
        u.delete("bill_fuel");
      }
      if (
        id === "prices" ||
        id === "fossil" ||
        id === "imports" ||
        id === "manufacturing" ||
        id === "industrial-work" ||
        id === "policy" ||
        id === "low-carbon" ||
        id === "networks"
      ) {
        // Manufacturing Study C keeps `measure` (volume/share/jobs/productivity dial).
        if (id !== "manufacturing") u.delete("measure");
        // Policy Decision Ledger and Imports Shock & Response both use `?event=`.
        if (id !== "policy" && id !== "imports") u.delete("event");
        u.delete("compare");
        u.delete("fuel");
        u.delete("from");
        u.delete("to");
        u.delete("sector");
        u.delete("useful");
        u.delete("end_use");
        u.delete("geo_sector");
        u.delete("place");
        u.delete("end_scope");
        u.delete("cross_end");
        u.delete("region");
        u.delete("geo_measure");
        u.delete("base");
        u.delete("eff_end_use");
      }
      if (
        id === "fossil" ||
        id === "imports" ||
        id === "manufacturing" ||
        id === "industrial-work" ||
        id === "policy" ||
        id === "low-carbon" ||
        id === "networks"
      ) {
        u.delete("payment");
        u.delete("tariff");
        u.delete("band");
        u.delete("bill_fuel");
      }
      if (id !== "imports") u.delete("basis");
      if (id !== "imports" && id !== "networks") u.delete("flow");
      if (id !== "prices") u.delete("bill_fuel");
      if (id !== "low-carbon") {
        u.delete("tech");
        u.delete("lf_basis");
      }
      window.history.replaceState(null, "", `${pathname}?${u}`);
    },
    [pathname],
  );

  const consumptionReady = Boolean(consumption.final?.observations.length);
  const pricesReady = Boolean(prices.domestic?.observations.length);
  const fossilsReady = Boolean(
    fossils.crude?.observations.length || fossils.fields.length || fossils.reserves?.observations.length,
  );
  const importsReady = Boolean(imports.dependency?.observations.length);
  const manufacturingReady = Boolean(manufacturing.output?.observations.length);
  const jobsReady = Boolean(manufacturing.employment?.observations.length);
  const renewablesReady = Boolean(
    renewables.loadFactors?.observations.length ||
      renewables.pipeline?.observations.length ||
      renewables.plantLoadFactors?.observations.length ||
      capacity?.observations.length,
  );
  const networksReady = Boolean(networks.interconnectors?.observations.length);
  const domains: ExplorerDomain[] = config.domains.map((d) => ({
    id: d.id,
    title: d.title,
    short: d.short,
    question: d.question,
    plate: d.plate ? REF_ICON_PLATES[d.plate] : undefined,
    status:
      (d.id === "generation" && generation) ||
      (d.id === "consumption" && consumptionReady) ||
      (d.id === "prices" && pricesReady) ||
      (d.id === "fossil" && fossilsReady) ||
      (d.id === "imports" && importsReady) ||
      (d.id === "low-carbon" && renewablesReady) ||
      (d.id === "networks" && networksReady) ||
      (d.id === "manufacturing" && manufacturingReady) ||
      (d.id === "industrial-work" && jobsReady) ||
      d.id === "policy"
        ? "ready"
        : "preparation",
  }));
  const domain = config.domains.find((d) => d.id === active) ?? config.domains[0]!;

  return (
    <Explorer sector={config.label} indexLabel={config.indexLabel} domains={domains} active={active} onSelectDomain={select}>
      {active === "generation" ? (
        <GenerationCanvas
          pack={generation}
          capacity={capacity}
          longRun={longRun}
          yearMix={yearMix}
          atlas={atlas}
        />
      ) : active === "consumption" ? (
        <ConsumptionCanvas pack={consumption} />
      ) : active === "prices" ? (
        <PricesCanvas pack={prices} />
      ) : active === "fossil" ? (
        <FossilsCanvas pack={fossils} />
      ) : active === "imports" ? (
        <ImportsCanvas pack={imports} />
      ) : active === "low-carbon" ? (
        <RenewablesCanvas pack={renewables} generation={generation} capacity={capacity} />
      ) : active === "networks" ? (
        <NetworksCanvas pack={networks} yearMix={yearMix} />
      ) : active === "manufacturing" ? (
        <ManufacturingCanvas pack={manufacturing} />
      ) : active === "industrial-work" ? (
        <JobsCanvas pack={jobsPackFromManufacturing(manufacturing)} />
      ) : active === "policy" ? (
        <PolicyCanvas />
      ) : (
        <>
          <ExplorerHead />
          <Stage
            title={domain.title}
            foot={
              <SourceLine
                rows={[
                  {
                    label: "Data",
                    text: domain.series.length
                      ? `${domain.series.length} series in the catalogue for this domain`
                      : "No series in the catalogue for this domain yet",
                    href: `/data#${config.sectorId}`,
                    linkLabel: `All ${config.label} series`,
                  },
                ]}
              />
            }
          >
            <div className={x.empty}>
              <p className="bo-label">In preparation</p>
              <p>
                {domain.series.length
                  ? "This stage is being drawn after Electricity Generation Gate 2. Catalogue series for this domain:"
                  : "This stage is being drawn. Its series are being sourced for the catalogue."}
              </p>
              <ul className={c.series}>
                {domain.series.map((id) => (
                  <li key={id}>
                    <a href={`/data?record=${id}`}>{titles[id] ?? id}</a>
                    <span className="bo-label">{id}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Stage>
        </>
      )}
    </Explorer>
  );
}
