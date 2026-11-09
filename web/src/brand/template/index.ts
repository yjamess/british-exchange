/**
 * Brand template — the canonical sector page. Compose:
 *   <BrandRoot> → <SectorPage> → <Explorer> (ExplorerHead · FigureStrip · ControlRow · Stage · Coverage)
 * See web/src/brand/README.md and docs/visual-identity.md.
 */
export { SectorPage, type SectorStat } from "./SectorPage";
export { PlateBand, FieldBand } from "./Threshold";
export {
  Explorer,
  ExplorerHead,
  FigureStrip,
  ControlRow,
  Control,
  MenuControl,
  MultiMenuControl,
  placesSummary,
  ChipToggles,
  SearchControl,
  PeriodControl,
  TextButton,
  ResetButton,
  Stage,
  EmptyStage,
  FigureRecord,
  shortPublisher,
  SourceLine,
  DataTable,
  Coverage,
  useExplorer,
  explorerClasses,
  type ExplorerDomain,
  type ExplorerView,
  type ExplorerFigure,
  type ExplorerSource,
  type SourceRow,
  type ChipOption,
} from "./Explorer";
export { SectorTemplate } from "./SectorTemplate";
export { SectorCanvas, SectorView } from "./SectorCanvas";
