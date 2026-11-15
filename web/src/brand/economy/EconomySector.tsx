import { Suspense } from "react";
import { BrandRoot } from "../BrandRoot";
import type { SectorConfig } from "../sector-pages";
import { EconomyView } from "./EconomyCanvas";
import type { EconomyData } from "./load";
import type { Wire } from "@/lib/wire";

/** Economy & Public Finance page: BrandRoot → SectorPage → Explorer (Wave A G3). */
export function EconomySector({
  config,
  titles = {},
  data,
}: {
  config: SectorConfig;
  titles?: Record<string, string>;
  /** The selected domain's packs, packed by column (`packTree`); EconomyView unpacks. */
  data: Wire<EconomyData>;
}) {
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <EconomyView config={config} titles={titles} data={data} />
      </Suspense>
    </BrandRoot>
  );
}
