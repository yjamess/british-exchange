import { Suspense } from "react";
import { BrandRoot } from "../BrandRoot";
import type { SectorConfig } from "../sector-pages";
import { EnergyView } from "./EnergyCanvas";
import type { AtlasPack, CapacityPack, GenerationPack, YearPack } from "./packs";
import type { LongRunPack } from "./long-run";
import type { ConsumptionPack } from "./consumption-model";
import type { PricesPack } from "./prices-model";
import type { FossilsPack } from "./fossils-model";
import type { ImportsPack } from "./imports-model";
import type { ManufacturingPack } from "./manufacturing-model";
import type { RenewablesPack } from "./renewables-model";
import type { NetworksPack } from "./networks-model";

/** Energy & Industry page: BrandRoot → SectorPage → Explorer, with Ready domain canvases. */
export function EnergySector({
  config,
  titles = {},
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
  titles?: Record<string, string>;
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
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <EnergyView
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
      </Suspense>
    </BrandRoot>
  );
}
