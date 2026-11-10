/**
 * Shared map instruments — English-region + world choropleths, legend, halftone bands.
 * Prefer `import { RegionMap, WorldChoropleth, MapLegend } from "@/brand"` (or `@/brand/map`).
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
export { MapLegend, type MapLegendProps } from "./MapLegend";
export { BandScreenDefs, LegendBandDefs } from "./BandScreen";
export { band, equalBreaks, BAND_CELL, BAND_RADII } from "./model";
