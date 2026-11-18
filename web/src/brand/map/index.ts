/**
 * Shared map instruments — InkMap (MapLibre + PMTiles), region/area/world choropleths,
 * legend, stepped tones.
 * Prefer `import { RegionMap, WorldChoropleth, MapLegend } from "@/brand"` (or `@/brand/map`).
 */

export {
  RegionMap,
  REGION_SHAPES,
  UK_NATION_SHAPES,
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
export { band, equalBreaks, toneColor, TONE_STEPS, TONE_DARK_FROM, BAND_CELL, BAND_RADII } from "./model";
export { InkMap, MapCredit, type InkMapHandle } from "./InkMap";
export { PLACES, placeBounds, type Place } from "./places";
export { siteIcons, loadDeck, squareSide, SOLID_BELOW_PX, SITE_PRINTS, type SitePrint, type SiteIcons } from "./sites";
export { BEFORE_DATA, UK_BOUNDS, ENGLAND_BOUNDS, placeNames, toneMatch, type Ink } from "./ink";
