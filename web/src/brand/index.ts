/**
 * British Exchange brand kit — the one import for v1 pages: `import { … } from "@/brand"`.
 * Identity: docs/visual-identity.md · Tokens: brand.css (under .bo, applied by BrandRoot).
 *
 *   Root & type   BrandRoot, brandFonts
 *   Imagery       Plate + PLATES / DWELLING_PLATES / TENURE_PLATES / ENERGY_TECH_PLATES / MANUFACTURING_PLATES / REF_ICON_PLATES / ICON_PLATES / SCENE_ICON_PLATES
 *   Template      SectorPage, Explorer (+ head, figures, controls, stage, source, table, coverage), PlateBand, FieldBand
 *   Menus         PrintSelect (Base UI) — via MenuControl / PeriodControl in the template
 *   Motion        DualScramble, ScrambleGroup, HalftoneMotion, DitherField (+ fields), DensityStrip, groundField
 *   Charts        TimeChart, RankBars, SeriesLegend, EventRail
 *   Policy        DecisionLedger, CatalogueDossier, ExactRegister, PromiseVerdict
 *   Maps          RegionMap, WorldChoropleth, MapLegend, BandScreenDefs, LegendBandDefs
 *   Data          fmt, fmtT, toT and series helpers
 *
 * Legacy (v0.2) lives in sector/ and charts/ and is not exported here. Lab-only experiments
 * (ui/InstrumentSelect, motion/FlickerFigure) are not part of the template.
 */

export { BrandRoot } from "./BrandRoot";
export { brandFonts } from "./fonts";

export {
  Plate,
  PLATES,
  DWELLING_PLATES,
  TENURE_PLATES,
  ENERGY_TECH_PLATES,
  MANUFACTURING_PLATES,
  REF_ICON_PLATES,
  ICON_PLATES,
  SCENE_ICON_PLATES,
  type PlateName,
  type PlateTreatment,
  type PlateShape,
  type RefIconPlateName,
  type IconPlateName,
  type SceneIconPlateName,
} from "./Plate";

export * from "./template";

export { PrintSelect, type PrintOption } from "./PrintSelect";

export {
  DualScramble,
  ScrambleGroup,
  DUAL_CHARS,
  DUAL_DIGITS,
  type ScrambleTrigger,
  HalftoneMotion,
  ATLASES,
  type MotionAtlas,
  type HalftoneMode,
  DitherField,
  cloudField,
  globeField,
  ridgesField,
  type FieldFn,
  type FieldGrid,
  type FieldFrame,
  type DitherMark,
  DensityStrip,
  type DensityMark,
  groundField,
  glyphField,
  GLYPHS,
  type Glyph,
} from "./motion";

export { TimeChart, RankBars, chartMargins, type ChartSeries, type ChartRule, type Cadence } from "./instrument/TimeChart";
export { SeriesLegend, type SeriesLegendItem } from "./instrument/SeriesLegend";
export { EventRail, type RailMark } from "./instrument/EventRail";

export {
  DecisionLedger,
  CatalogueDossier,
  ExactRegister,
  PromiseVerdict,
  type PromiseVerdictProps,
  type LedgerEvent,
  type LedgerSource,
  type LedgerContextLink,
} from "./policy";

export {
  RegionMap,
  REGION_SHAPES,
  WorldChoropleth,
  WORLD_COUNTRY_SHAPES,
  MapLegend,
  BandScreenDefs,
  LegendBandDefs,
  band,
  equalBreaks,
  BAND_CELL,
  BAND_RADII,
  type RegionDatum,
  type RegionShape,
  type WorldCountryDatum,
  type WorldCountryShape,
  type MapLegendProps,
} from "./map";

export {
  fmt,
  fmtT,
  toT,
  MONTHS,
  valueAgo,
  changePct,
  niceTicks,
  yearTicks,
  extent,
  nearest,
  type Pt,
  type Series,
} from "./data";
export { SiteFooter } from "./footer/SiteFooter";
