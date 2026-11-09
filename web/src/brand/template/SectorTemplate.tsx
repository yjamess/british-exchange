import { Suspense } from "react";
import { BrandRoot } from "../BrandRoot";
import type { SectorConfig } from "../sector-pages";
import { SectorView } from "./SectorCanvas";

/**
 * A whole sector page from configuration: BrandRoot → SectorPage (mast, hero plate, name strip)
 * → SectorCanvas (Explorer rail, head, stage). `titles` maps catalogue ids to series titles.
 * Housing is built by hand on the same pieces; every other sector starts here.
 */
export function SectorTemplate({ config, titles = {} }: { config: SectorConfig; titles?: Record<string, string> }) {
  return (
    <BrandRoot>
      <Suspense fallback={null}>
        <SectorView config={config} titles={titles} />
      </Suspense>
    </BrandRoot>
  );
}
