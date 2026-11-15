import { Suspense } from "react";
import { BrandRoot } from "../BrandRoot";
import type { SectorConfig } from "../sector-pages";
import { EnergyView } from "./EnergyCanvas";
import type { EnergySectorData } from "./load";
import type { Wire } from "@/lib/wire";

/** Energy & Industry page: BrandRoot → SectorPage → Explorer, with Ready domain canvases. */
export function EnergySector({
  config,
  titles = {},
  data,
}: {
  config: SectorConfig;
  titles?: Record<string, string>;
  /** The selected domain's packs, packed by column (`packTree`); EnergyView unpacks. */
  data: Wire<EnergySectorData>;
}) {
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <EnergyView config={config} titles={titles} data={data} />
      </Suspense>
    </BrandRoot>
  );
}
