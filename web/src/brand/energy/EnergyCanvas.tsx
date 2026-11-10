"use client";

/**
 * Energy & Industry explorer — shared SectorPage + Explorer shell.
 * Ready domains: generation…manufacturing, industrial-work, policy.
 */

import { EMPTY_POLICY_PLEDGES_PACK, type PolicyPledgesPack } from "./policy-pledges";
import { useSearchParams } from "next/navigation";
import { ArrivalFrom, readArrival } from "../connections";
import { primaryPackLoaded, type EnergyDomainId } from "./domain-sources";
import { useEnergyNavigation } from "./navigation";
import {
  ENERGY_DOMAIN_VIEWS,
  STAGE_EMPTY,
  domainStageState,
  domainUiStatus,
} from "./views";
import { REF_ICON_PLATES } from "../Plate";
import type { SectorConfig } from "../sector-pages";
import {
  EmptyStage,
  Explorer,
  ExplorerHead,
  SourceLine,
  Stage,
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
import { EMPTY_POLICY_EVENTS_PACK, type PolicyEventsPack } from "./policy-events";
import { EMPTY_SHOCK_EVENTS_PACK, type ShockEventsPack } from "./imports-shock-events";

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
  manufacturing = {
    output: null,
    share: null,
    employment: null,
    productivity: null,
    iopByDivision: null,
    iopWeights: null,
    outputPerJob: null,
    productivityHours: null,
    asheEarnings: null,
    bresByRegion: null,
    bresByDivisionRegion: null,
  },
  renewables = { loadFactors: null, pipeline: null, plantLoadFactors: null },
  networks = {
    interconnectors: null,
    interconnectorCapacity: null,
    tec: null,
    ssenAtlas: null,
    ssenCounts: null,
  },
  policyEvents = EMPTY_POLICY_EVENTS_PACK,
  policyPledges = EMPTY_POLICY_PLEDGES_PACK,
  shockEvents = EMPTY_SHOCK_EVENTS_PACK,
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
  policyEvents?: PolicyEventsPack;
  policyPledges?: PolicyPledgesPack;
  shockEvents?: ShockEventsPack;
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
        policyEvents={policyEvents}
        policyPledges={policyPledges}
        shockEvents={shockEvents}
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
  manufacturing = {
    output: null,
    share: null,
    employment: null,
    productivity: null,
    iopByDivision: null,
    iopWeights: null,
    outputPerJob: null,
    productivityHours: null,
    asheEarnings: null,
    bresByRegion: null,
    bresByDivisionRegion: null,
  },
  renewables = { loadFactors: null, pipeline: null, plantLoadFactors: null },
  networks = {
    interconnectors: null,
    interconnectorCapacity: null,
    tec: null,
    ssenAtlas: null,
    ssenCounts: null,
  },
  policyEvents = EMPTY_POLICY_EVENTS_PACK,
  policyPledges = EMPTY_POLICY_PLEDGES_PACK,
  shockEvents = EMPTY_SHOCK_EVENTS_PACK,
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
  policyEvents?: PolicyEventsPack;
  policyPledges?: PolicyPledgesPack;
  shockEvents?: ShockEventsPack;
}) {
  const params = useSearchParams();
  const ids = config.domains.map((d) => d.id);
  const fromUrl = params.get("domain");
  // URL is the source of truth. Domain hops use the shared navigation utility
  // (push + portable year only). In-domain controls use replaceState via sync().
  const active = fromUrl && ids.includes(fromUrl) ? fromUrl : "generation";
  const activeDomain = (ENERGY_DOMAIN_VIEWS[active as EnergyDomainId]
    ? (active as EnergyDomainId)
    : "generation") satisfies EnergyDomainId;
  const { goDomain } = useEnergyNavigation(activeDomain);

  const select = (id: string) => {
    if (id === active) return;
    const next = ENERGY_DOMAIN_VIEWS[id as EnergyDomainId] ? (id as EnergyDomainId) : null;
    if (!next) return;
    goDomain(next);
  };

  const domains: ExplorerDomain[] = config.domains.map((d) => ({
    id: d.id,
    title: d.title,
    short: d.short,
    question: d.question,
    plate: d.plate ? REF_ICON_PLATES[d.plate] : undefined,
    // Catalogue/UI status from views/* — never inferred from this request’s packs.
    status: ENERGY_DOMAIN_VIEWS[d.id as EnergyDomainId]
      ? domainUiStatus(d.id as EnergyDomainId)
      : "preparation",
  }));
  const domain = config.domains.find((d) => d.id === active) ?? config.domains[0]!;

  const loaded = primaryPackLoaded(activeDomain, {
    generation,
    longRun,
    consumption,
    prices,
    fossils,
    imports,
    renewables,
    capacity,
    networks,
    manufacturing,
  });
  const stageState = domainStageState(activeDomain, loaded);

  const arrival = readArrival(params);

  return (
    <Explorer sector={config.label} indexLabel={config.indexLabel} domains={domains} active={active} onSelectDomain={select}>
      <ArrivalFrom from={arrival.from} returnHref={arrival.returnHref} />
      {stageState === "preparation" ? (
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
            <EmptyStage label={STAGE_EMPTY.preparation.label}>{STAGE_EMPTY.preparation.hint}</EmptyStage>

          </Stage>
        </>
      ) : active === "generation" ? (
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
        <ImportsCanvas pack={imports} shockEvents={shockEvents} />
      ) : active === "low-carbon" ? (
        <RenewablesCanvas
          pack={renewables}
          generation={generation}
          capacity={capacity}
          policyEvents={policyEvents}
        />
      ) : active === "networks" ? (
        <NetworksCanvas pack={networks} />
      ) : active === "manufacturing" ? (
        <ManufacturingCanvas pack={manufacturing} />
      ) : active === "industrial-work" ? (
        <JobsCanvas pack={jobsPackFromManufacturing(manufacturing)} />
      ) : active === "policy" ? (
        <PolicyCanvas policyEvents={policyEvents} policyPledges={policyPledges} />
      ) : (
        <>
          <ExplorerHead />
          <Stage title={domain.title}>
            <EmptyStage label={STAGE_EMPTY.preparation.label}>{STAGE_EMPTY.preparation.hint}</EmptyStage>
          </Stage>
        </>
      )}
    </Explorer>
  );
}
