/**
 * Shared map instruments — English-region + world choropleths, halftone bands.
 * Prefer `import { RegionMap, WorldChoropleth } from "@/brand"` (or `@/brand/map`).
 */

export {
  RegionMap,
  REGION_SHAPES,
  type RegionDatum,
  type RegionShape,
} from "./RegionMap";
export {
  WorldChoropleth,
  WORLD_COUNTRY_SHAPES,
  type WorldCountryDatum,
  type WorldCountryShape,
} from "./WorldChoropleth";
export { BandScreenDefs, LegendBandDefs } from "./BandScreen";
export { band, BAND_CELL, BAND_RADII } from "./model";
