import { Suspense } from "react";
import { BrandRoot } from "../BrandRoot";
import type { SectorConfig } from "../sector-pages";
import { EconomyView } from "./EconomyCanvas";
import type { DebtPack, GrowthPack, InflationPack, WagesPack } from "./types";

/** Economy & Public Finance page: BrandRoot → SectorPage → Explorer (Wave A G3). */
export function EconomySector({
  config,
  titles = {},
  inflation,
  wages,
  debt,
  growth,
}: {
  config: SectorConfig;
  titles?: Record<string, string>;
  inflation: InflationPack;
  wages: WagesPack;
  debt: DebtPack;
  growth: GrowthPack;
}) {
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <EconomyView
          config={config}
          titles={titles}
          inflation={inflation}
          wages={wages}
          debt={debt}
          growth={growth}
        />
      </Suspense>
    </BrandRoot>
  );
}
