"use client";

/**
 * Energy Domain 07 — Power Networks.
 * Live: Border · Queue · Invisible Grid (SSEN pilot) · Monthly imports (view id `night`) · Data.
 * Cable capacity lives on Imports › Connectors (legacy `view=capacity` redirects there — see legacy-views.ts).
 * Never invent spare capacity. GB ≠ UK. Flows GWh ≠ capacity MW. Pilot ≠ national DNO.
 */

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { NetworkTopologyMap, lineInArea } from "../charts/NetworkTopologyMap";
import {
  ControlRow,
  EmptyStage,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  ResetButton,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
} from "../template";
import { EnergyStageFollow } from "../connections";
import { ENERGY_SOURCE } from "./citations";
import type { YearPack } from "./packs";
import {
  INTERCONNECTOR_FLOWS,
  INTERCONNECTOR_FLOWS_ID,
  SSEN_AREAS,
  SSEN_ATLAS_ID,
  SSEN_LAYERS,
  SSEN_LINE_CLASSES,
  TEC_BASES,
  TEC_GATES,
  TEC_REGISTER_ID,
  TEC_STATUSES,
  YEAR_MIX_ID,
  filterSsenLines,
  filterSsenSubstations,
  filterTecLines,
  fmtGWh,
  fmtMw,
  fmtTwh,
  gbImportsFuelSeries,
  gbImportsFuelYearTotal,
  interconnectorBuiltCapacityRanks,
  interconnectorCapacityPinDate,
  interconnectorCorridorYearTable,
  interconnectorSeries,
  interconnectorYearSum,
  parseTecLines,
  tecLargestLines,
  tecPinLabel,
  tecRankByFamily,
  tecRankByGate,
  tecRankByStatus,
  tecTotalMw,
  tecUniqueProjects,
  yearsOf,
  type InterconnectorFlow,
  type NetworksPack,
  type SsenArea,
  type SsenLayer,
  type SsenLineClass,
  type TecBasis,
  type TecGate,
  type TecStatus,
} from "./networks-model";
import { AnnualSeriesTable } from "./SeriesDataTables";
import s from "./generation.module.css";

import { NETWORKS_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...NETWORKS_VIEWS];

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function asFlow(v: string | null): InterconnectorFlow {
  return INTERCONNECTOR_FLOWS.includes(v as InterconnectorFlow)
    ? (v as InterconnectorFlow)
    : "Net imports";
}

function asGate(v: string | null): TecGate {
  return TEC_GATES.includes(v as TecGate) ? (v as TecGate) : "all";
}

function asStatus(v: string | null): TecStatus {
  return TEC_STATUSES.includes(v as TecStatus) ? (v as TecStatus) : "all";
}

function asBasis(v: string | null): TecBasis {
  return TEC_BASES.includes(v as TecBasis) ? (v as TecBasis) : "contractual";
}

function gateLabel(g: TecGate): string {
  if (g === "all") return "All gates";
  if (g === "1") return "Gate 1";
  if (g === "2") return "Gate 2";
  return "Unassigned";
}

function basisLabel(b: TecBasis): string {
  return b === "built" ? "Built (latest snapshot)" : "Contractual Effective From";
}

function asArea(v: string | null): SsenArea {
  return SSEN_AREAS.includes(v as SsenArea) ? (v as SsenArea) : "all";
}

function asLayer(v: string | null): SsenLayer {
  return SSEN_LAYERS.includes(v as SsenLayer) ? (v as SsenLayer) : "both";
}

function asLineClass(v: string | null): SsenLineClass {
  return SSEN_LINE_CLASSES.includes(v as SsenLineClass) ? (v as SsenLineClass) : "all";
}

function areaLabel(a: SsenArea): string {
  if (a === "SEPD") return "SEPD · southern England";
  if (a === "SHEPD") return "SHEPD · north of Scotland";
  return "SEPD + SHEPD";
}

function layerLabel(l: SsenLayer): string {
  if (l === "substations") return "Substations";
  if (l === "lines") return "Overhead lines";
  return "Substations + lines";
}

function lineClassLabel(c: SsenLineClass): string {
  if (c === "ehv-plus") return "EHV+ only";
  if (c === "ehv") return "EHV only";
  return "EHV + EHV+";
}

export function NetworksCanvas({
  pack,
  yearMix = null,
}: {
  pack: NetworksPack;
  yearMix?: YearPack | null;
}) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("networks");
  const icRows = pack.interconnectors?.observations ?? [];
  const icCapRows = pack.interconnectorCapacity?.observations ?? [];
  const tecRows = pack.tec?.observations ?? [];
  const yearRows = yearMix?.observations ?? [];

  const [view, setView] = useState(() =>
    VIEWS.some((v) => v.id === searchParams.get("view")) ? searchParams.get("view")! : "border",
  );
  const [year, setYear] = useState(() => Number(searchParams.get("year")) || 0);
  const [icFlow, setIcFlow] = useState<InterconnectorFlow>(() => asFlow(searchParams.get("flow")));
  const [gate, setGate] = useState<TecGate>(() => asGate(searchParams.get("gate")));
  const [status, setStatus] = useState<TecStatus>(() => asStatus(searchParams.get("status")));
  const [basis, setBasis] = useState<TecBasis>(() => asBasis(searchParams.get("basis")));
  const [area, setArea] = useState<SsenArea>(() => asArea(searchParams.get("area")));
  const [layer, setLayer] = useState<SsenLayer>(() => asLayer(searchParams.get("layer")));
  const [lineClass, setLineClass] = useState<SsenLineClass>(() => asLineClass(searchParams.get("lines")));
  const [siteId, setSiteId] = useState<string | null>(() => searchParams.get("site"));

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        year: number;
        flow: InterconnectorFlow;
        gate: TecGate;
        status: TecStatus;
        basis: TecBasis;
        area: SsenArea;
        layer: SsenLayer;
        lines: SsenLineClass;
        site: string | null;
      }>,
    ) => {
      const next = {
        view,
        year,
        flow: icFlow,
        gate,
        status,
        basis,
        area,
        layer,
        lines: lineClass,
        site: siteId,
        ...patch,
      };
      setView(next.view);
      setYear(next.year);
      setIcFlow(next.flow);
      setGate(next.gate);
      setStatus(next.status);
      setBasis(next.basis);
      setArea(next.area);
      setLayer(next.layer);
      setLineClass(next.lines);
      setSiteId(next.site);
      writeUrl({
        view: next.view,
        year: next.year,
        flow: next.flow,
        gate: next.gate === "all" ? null : next.gate,
        status: next.status === "all" ? null : next.status,
        basis: next.basis === "contractual" ? null : next.basis,
        area: next.area === "all" ? null : next.area,
        layer: next.layer === "both" ? null : next.layer,
        lines: next.lines === "all" ? null : next.lines,
        site: next.site,
      });
    },
    [view, year, icFlow, gate, status, basis, area, layer, lineClass, siteId, writeUrl],
  );

  const icYears = yearsOf(icRows);
  const nightYears = useMemo(() => {
    const ys = new Set<number>();
    for (const p of gbImportsFuelSeries(yearRows).points) ys.add(Math.floor(p.t));
    return [...ys].sort((a, b) => a - b);
  }, [yearRows]);
  const latest =
    view === "night" && nightYears.length
      ? nightYears.at(-1)!
      : icYears.length
        ? icYears.at(-1)!
        : new Date().getUTCFullYear();
  const yearPool =
    view === "night" && nightYears.length ? nightYears : icYears.length ? icYears : [latest];
  const y = clampYear(year || latest, yearPool, latest);
  const earliest = yearPool[0] ?? latest;

  const icReady = Boolean(pack.interconnectors?.observations.length);
  const icCapReady = Boolean(pack.interconnectorCapacity?.observations.length);
  const tecReady = Boolean(pack.tec?.observations.length);
  const nightReady = Boolean(yearMix?.observations.length);
  const gridReady = Boolean(pack.ssenAtlas?.substations.length || pack.ssenAtlas?.lines.length);

  const gridSubs = useMemo(
    () => filterSsenSubstations(pack.ssenAtlas?.substations ?? [], area),
    [pack.ssenAtlas, area],
  );
  const gridLines = useMemo(
    () => filterSsenLines(pack.ssenAtlas?.lines ?? [], area, lineClass, lineInArea),
    [pack.ssenAtlas, area, lineClass],
  );
  const mapSubs = layer === "lines" ? [] : gridSubs;
  const mapLines = layer === "substations" ? [] : gridLines;
  const selectedSite = siteId ? gridSubs.find((p) => p.id === siteId) ?? null : null;

  const icUk = interconnectorYearSum(icRows, y, "UK-total", icFlow);
  const icUkSeries = interconnectorSeries(icRows, "UK-total", icFlow);
  const icTable = interconnectorCorridorYearTable(icRows, y, icFlow);
  const top = icTable[0] ?? null;
  const importsLine = gbImportsFuelSeries(yearRows);
  const nightTotal = gbImportsFuelYearTotal(yearRows, y);

  const tecLinesAll = useMemo(() => parseTecLines(tecRows), [tecRows]);
  const tecLines = useMemo(
    () => filterTecLines(tecLinesAll, basis, gate, status),
    [tecLinesAll, basis, gate, status],
  );
  const tecByFamily = useMemo(() => tecRankByFamily(tecLines), [tecLines]);
  const tecByGate = useMemo(() => tecRankByGate(tecLines), [tecLines]);
  const tecByStatus = useMemo(() => tecRankByStatus(tecLines), [tecLines]);
  const tecTop = useMemo(() => tecLargestLines(tecLines, 25), [tecLines]);
  const tecPin = tecPinLabel(tecRows);
  const tecProjects = tecUniqueProjects(tecLines);
  const tecMw = tecTotalMw(tecLines);

  const icCapRanks = useMemo(() => interconnectorBuiltCapacityRanks(icCapRows), [icCapRows]);
  const icCapPin = interconnectorCapacityPinDate(icCapRows);

  const figures: ExplorerFigure[] =
    view === "night"
      ? [
          {
            label: `${y} Imports fuel`,
            value: nightTotal != null ? fmtTwh(nightTotal) : "—",
            note: "GB · NESO monthly sum",
          },
          {
            label: "Geography",
            value: "GB",
            note: "Not the UK corridor figures",
          },
          {
            label: "Unit",
            value: "TWh",
            note: "From half-hourly MW",
          },
        ]
      : view === "queue"
        ? [
            {
              label: "Projects",
              value: tecProjects.toLocaleString("en-GB"),
              note: basisLabel(basis),
            },
            {
              label: "Register lines · MW",
              value: fmtMw(tecMw),
              note: "Sum of lines · may include multiple lines per project",
            },
            {
              label: "Selection",
              value: gateLabel(gate),
              note: status === "all" ? "All statuses" : status,
            },
          ]
        : view === "grid"
          ? [
              {
                label: "Substations",
                value: mapSubs.length.toLocaleString("en-GB"),
                note: areaLabel(area),
              },
              {
                label: "Overhead lines",
                value: mapLines.length.toLocaleString("en-GB"),
                note: lineClassLabel(lineClass),
              },
              {
                label: "Coverage",
                value: "SSEN pilot",
                note: pack.ssenAtlas?.as_of ? `Pin ${pack.ssenAtlas.as_of}` : "Not national DNO",
              },
            ]
          : [
              {
                label: `${y} UK-total`,
                value: icUk != null ? fmtGWh(icUk.value) : "—",
                note: icUk?.provisional ? `${icFlow} · provisional / incomplete` : icFlow,
              },
              {
                label: "Largest corridor",
                value: top?.corridor ?? "—",
                note: top ? fmtGWh(top.value) : "Absolute flow",
              },
              {
                label: "Unit",
                value: "GWh",
                note: "Not MW capacity · not all-fuels ktoe",
              },
            ];

  const yearOptions = yearPool.map((yy) => ({ value: String(yy), label: String(yy) }));
  const queueDirty = gate !== "all" || status !== "all" || basis !== "contractual";
  const borderDirty = y !== latest || icFlow !== "Net imports";
  const gridDirty = area !== "all" || layer !== "both" || lineClass !== "all" || Boolean(siteId);

  const stageTitle =
    view === "data"
      ? "Data · Power networks"
      : view === "night"
        ? `GB imports · monthly TWh · ${y}`
        : view === "queue"
          ? `Connections queue · ${gateLabel(gate)} · ${basisLabel(basis)}`
          : view === "grid"
            ? `Invisible grid · SSEN pilot · ${areaLabel(area)}`
            : `Border anatomy · ${icFlow} · ${y}`;

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {view !== "data" && <FigureStrip figures={figures} />}

      {view !== "data" &&
        ((view === "border" || view === "night") && (icReady || nightReady) ||
          (view === "queue" && tecReady) ||
          (view === "grid" && gridReady) ||
          ((view === "border" || view === "night") && borderDirty) ||
          (view === "queue" && queueDirty) ||
          (view === "grid" && gridDirty)) && (
        <ControlRow>
          {(view === "border" || view === "night") && (icReady || nightReady) && (
            <MenuControl
              label="Year"
              value={String(y)}
              options={yearOptions}
              onChange={(v) => sync({ year: Number(v) })}
            />
          )}
          {view === "border" && icReady && (
            <MenuControl
              label="Flow"
              value={icFlow}
              options={INTERCONNECTOR_FLOWS.map((f) => ({ value: f, label: f }))}
              onChange={(v) => sync({ flow: v as InterconnectorFlow })}
            />
          )}
          {view === "queue" && tecReady && (
            <>
              <MenuControl
                label="Basis"
                value={basis}
                options={TEC_BASES.map((b) => ({ value: b, label: basisLabel(b) }))}
                onChange={(v) => sync({ basis: v as TecBasis })}
              />
              <MenuControl
                label="Gate"
                value={gate}
                options={TEC_GATES.map((g) => ({ value: g, label: gateLabel(g) }))}
                onChange={(v) => sync({ gate: v as TecGate })}
              />
              <MenuControl
                label="Status"
                value={status}
                options={TEC_STATUSES.map((st) => ({
                  value: st,
                  label: st === "all" ? "All statuses" : st,
                }))}
                onChange={(v) => sync({ status: v as TecStatus })}
              />
            </>
          )}
          {view === "grid" && gridReady && (
            <>
              <MenuControl
                label="Area"
                value={area}
                options={SSEN_AREAS.map((a) => ({ value: a, label: areaLabel(a) }))}
                onChange={(v) => sync({ area: v as SsenArea, site: null })}
              />
              <MenuControl
                label="Layer"
                value={layer}
                options={SSEN_LAYERS.map((l) => ({ value: l, label: layerLabel(l) }))}
                onChange={(v) => sync({ layer: v as SsenLayer })}
              />
              <MenuControl
                label="Lines"
                value={lineClass}
                options={SSEN_LINE_CLASSES.map((c) => ({ value: c, label: lineClassLabel(c) }))}
                onChange={(v) => sync({ lines: v as SsenLineClass })}
              />
            </>
          )}
          {((view === "border" || view === "night") && borderDirty) ||
          (view === "queue" && queueDirty) ||
          (view === "grid" && gridDirty) ? (
            <ResetButton
              onClick={() =>
                sync({
                  year: latest,
                  flow: "Net imports",
                  gate: "all",
                  status: "all",
                  basis: "contractual",
                  area: "all",
                  layer: "both",
                  lines: "all",
                  site: null,
                })
              }
            />
          ) : null}
        </ControlRow>
      )}

      <Stage
        title={stageTitle}
        follow={
          <EnergyStageFollow
            domain="networks"
            view={view}
            selection={{ year: y }}
            label={`Networks · ${view}`}
          />
        }
        foot={
          <FigureRecord
            source={
              view === "night"
                ? ENERGY_SOURCE.networksNight
                : view === "queue"
                  ? ENERGY_SOURCE.networksQueue
                  : view === "grid"
                    ? ENERGY_SOURCE.networksGrid
                    : ENERGY_SOURCE.networksBorder
            }
            definition={
              view === "night"
                ? [
                    "GB imports, monthly: the Imports fuel line of the NESO Great Britain generation mix, as monthly totals (TWh) summed from half-hourly operational data.",
                    "This is not UK ET 5.6 corridor trade, not distribution topology, and not a night-time reading: it has no time-of-day detail.",
                  ]
                : view === "queue"
                  ? [
                      "Connections Queue: NESO Transmission Entry Capacity register lines for Great Britain.",
                      "Figures are contracted MW on the register — not speculative connection dates, not a DNO map, and not local spare capacity.",
                    ]
                  : view === "grid"
                    ? [
                        "Invisible Grid pilot: SSEN Distribution Existing Primary, Grid/Bulk Supply and Switching substations with EHV/EHV+ overhead lines.",
                        "SEPD (southern England) and SHEPD (north of Scotland) only — not a national DNO map, not underground cables, and not spare capacity.",
                      ]
                    : view === "data"
                      ? [
                          "Archive tables for UK interconnector flows, the TEC queue, cable capacity, SSEN pilot counts, and GB Imports fuel.",
                          "National multi-DNO topology remains deferred until further licensed layers are Ready.",
                        ]
                      : [
                          "Border anatomy: DESNZ ET 5.6 quarterly electricity Imports, Exports and Net imports by interconnector corridor (GWh).",
                          "France-UK is the published sum of three links. Flows are trade, not contracted TEC capacity — cable capacity lives on Imports › Connectors.",
                        ]
            }
            method={
              view === "night"
                ? [
                    "Geography is Great Britain. Northern Ireland is outside NESO GB mix.",
                    "Monthly TWh = sum of half-hourly MWh in that calendar month ÷ 1e6. Pair with Border only as contextual evidence.",
                  ]
                : view === "queue"
                  ? [
                      "Contractual basis uses MW Effective From and MW Increase/Decrease. Built basis uses connected MW at the register pin date.",
                      "MW totals sum register lines. One project can appear on more than one line — do not treat the sum as unique project capacity without dedupe.",
                      "Gate may be unassigned until agreements are countersigned. Geography is GB only.",
                    ]
                  : view === "grid"
                    ? [
                        "Coordinates are WGS84. Substation positions convert from Ordnance Survey National Grid metres in the operator pin.",
                        "Display atlas omits HV 11 kV overhead segments (still in the archived raw pin). Area filter for lines uses latitude as a place proxy because the line pin has no owner field.",
                        "Attribution: © SSEN Distribution. Britain's coast outline is place context only.",
                      ]
                    : view === "data"
                      ? [
                          "UK interconnector year figures sum valued quarters for the selected flow.",
                          "TEC, cable-capacity and SSEN tables are register or operator pins, not time series.",
                        ]
                      : [
                          "Corridor and flow live in observation notes. Year figures sum valued quarters.",
                          "Pre-commissioning missing cells stay blank. Do not treat these GWh as spare capacity or as a UK distribution map.",
                        ]
            }
            dataHref={
              view === "night"
                ? `/data?record=${YEAR_MIX_ID}`
                : view === "queue"
                  ? `/data?record=${TEC_REGISTER_ID}`
                  : view === "grid"
                    ? `/data?record=${SSEN_ATLAS_ID}`
                    : `/data?record=${INTERCONNECTOR_FLOWS_ID}`
            }
          />
        }
      >
        {view === "data" ? (
          !icReady && !nightReady && !tecReady && !icCapReady && !gridReady ? (
            <EmptyStage label="Network series unavailable">
              Border flows, queue, capacity, SSEN pilot and GB mix figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <AnnualSeriesTable
                title={`UK interconnector · ${icFlow}`}
                unit="GWh · annual sum of quarters"
                points={icUkSeries.points}
                format={(v) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                emptyLabel="Interconnector flows unavailable"
                cadence="annual"
              />
              <AnnualSeriesTable
                title="GB Imports fuel"
                unit="TWh · monthly"
                points={importsLine.points}
                format={(v) => fmtTwh(v).replace(/\s*TWh$/, "")}
                emptyLabel="GB generation mix unavailable"
                cadence="monthly"
              />
              {icCapRanks.length > 0 ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Built interconnector capacity · MW
                    {icCapPin ? ` · as of ${icCapPin}` : ""}
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Project</th>
                          <th scope="col">Import capacity</th>
                          <th scope="col">Export capacity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {icCapRanks.map((r) => (
                          <tr key={r.id}>
                            <th scope="row">{r.label}</th>
                            <td>{fmtMw(r.value)}</td>
                            <td>{r.exportMw != null ? fmtMw(r.exportMw) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {tecTop.length > 0 ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Transmission entry capacity · largest lines in current filters · MW
                    {tecPin ? ` · as of ${tecPin}` : ""}
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Project</th>
                          <th scope="col">Technology</th>
                          <th scope="col">Gate</th>
                          <th scope="col">Status</th>
                          <th scope="col">MW</th>
                          <th scope="col">Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tecTop.map((line) => (
                          <tr key={line.id}>
                            <th scope="row">{line.projectNumber}</th>
                            <td>{line.plantFamily}</td>
                            <td>{gateLabel(line.gate as TecGate)}</td>
                            <td>{line.status}</td>
                            <td>{fmtMw(line.mw)}</td>
                            <td>{line.period}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {(pack.ssenCounts?.observations.length ?? 0) > 0 ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    SSEN distribution network atlas · feature counts
                    {pack.ssenAtlas?.as_of ? ` · as of ${pack.ssenAtlas.as_of}` : ""}
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Measure</th>
                          <th scope="col">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pack.ssenCounts!.observations.map((row, i) => {
                          const kind =
                            (row.notes ?? "")
                              .split("; ")
                              .find((p) => p.startsWith("kind="))
                              ?.slice(5) ?? `row ${i + 1}`;
                          return (
                            <tr key={`${kind}-${i}`}>
                              <th scope="row">{kind.replaceAll("_", " ")}</th>
                              <td>{Number(row.value).toLocaleString("en-GB")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )
        ) : view === "grid" ? (
          !gridReady ? (
            <EmptyStage label="Invisible Grid pilot unavailable">
              SSEN distribution network atlas figures are not available right now.
            </EmptyStage>
          ) : mapSubs.length === 0 && mapLines.length === 0 ? (
            <EmptyStage label="No network features for this selection">
              Try another area, layer or line class.
            </EmptyStage>
          ) : (
            <div className={s.atlasLayout}>
              <div className={s.atlasMap}>
                <NetworkTopologyMap
                  substations={mapSubs}
                  lines={mapLines}
                  label="SSEN Invisible Grid pilot"
                  outline={pack.outline}
                  selectedId={selectedSite?.id ?? null}
                  onSelect={(id) => sync({ site: id })}
                />
              </div>
              <aside className={s.stationPanel} aria-label="Substation evidence">
                {selectedSite ? (
                  <>
                    <button type="button" className={t.textButton} onClick={() => sync({ site: null })}>
                      Clear selection
                    </button>
                    <p className="bo-label">
                      {selectedSite.type} · {selectedSite.owner}
                      {selectedSite.operating_area ? ` · ${selectedSite.operating_area}` : ""}
                    </p>
                    <h3 className={s.stationName}>
                      {selectedSite.locality || selectedSite.number || selectedSite.id}
                    </h3>
                    <dl className={s.stationMeta}>
                      {selectedSite.number ? (
                        <div>
                          <dt className="bo-label">Number</dt>
                          <dd className="bo-fig">{selectedSite.number}</dd>
                        </div>
                      ) : null}
                      {selectedSite.class ? (
                        <div>
                          <dt className="bo-label">Class</dt>
                          <dd>{selectedSite.class}</dd>
                        </div>
                      ) : null}
                      {selectedSite.data_confidence ? (
                        <div>
                          <dt className="bo-label">Data confidence</dt>
                          <dd>{selectedSite.data_confidence}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="bo-label">Coordinates</dt>
                        <dd className="bo-fig">
                          {Math.abs(selectedSite.lat).toFixed(4)}°{selectedSite.lat >= 0 ? "N" : "S"}{" "}
                          {Math.abs(selectedSite.lon).toFixed(4)}°{selectedSite.lon >= 0 ? "E" : "W"}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <>
                    <p className="bo-label">SSEN pilot</p>
                    <h3 className={s.stationName}>Select a substation</h3>
                  </>
                )}
              </aside>
            </div>
          )
        ) : view === "night" ? (
          <div className={s.stack}>
            {!nightReady ? (
              <EmptyStage label="GB generation mix unavailable">
                Half-hourly GB mix figures are not available right now.
              </EmptyStage>
            ) : (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Imports fuel · monthly TWh · GB · {nightYears[0] ?? "—"}–{nightYears.at(-1) ?? "—"}
                </h3>
                <TimeChart
                  label="NESO GB Imports fuel · monthly"
                  series={[importsLine]}
                  cadence="monthly"
                  kind="line"
                  format={(v) => fmtTwh(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              </section>
            )}
          </div>
        ) : view === "queue" ? (
          !tecReady ? (
            <EmptyStage label="Connections queue unavailable">
              Transmission entry capacity figures are not available right now.
            </EmptyStage>
          ) : tecLines.length === 0 ? (
            <EmptyStage label="No register lines for this selection">
              Try another gate, status or basis.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>By technology · MW · register lines</h3>
                <RankBars
                  label="Transmission entry capacity by technology family"
                  rows={tecByFamily.map((r) => ({ id: r.id, label: r.label, v: r.v }))}
                  format={(v) => fmtMw(v)}
                />
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>By gate · MW · register lines</h3>
                <RankBars
                  label="Transmission entry capacity by gate"
                  rows={tecByGate.map((r) => ({ id: r.id, label: r.label, v: r.v }))}
                  format={(v) => fmtMw(v)}
                />
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>By project status · MW · register lines</h3>
                <RankBars
                  label="Transmission entry capacity by project status"
                  rows={tecByStatus.map((r) => ({ id: r.id, label: r.label, v: r.v }))}
                  format={(v) => fmtMw(v)}
                />
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>Largest lines · MW</h3>
                <div className={t.tableWrap}>
                  <table className={t.table}>
                    <thead>
                      <tr>
                        <th scope="col">Project</th>
                        <th scope="col">Technology</th>
                        <th scope="col">Gate</th>
                        <th scope="col">Status</th>
                        <th scope="col">MW</th>
                        <th scope="col">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tecTop.map((line) => (
                        <tr key={line.id}>
                          <th scope="row">{line.projectNumber}</th>
                          <td>{line.plantFamily}</td>
                          <td>{gateLabel(line.gate as TecGate)}</td>
                          <td>{line.status}</td>
                          <td>{fmtMw(line.mw)}</td>
                          <td>{line.period}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )
        ) : !icReady ? (
          <EmptyStage label="Interconnector flows unavailable">
            Border flow figures are not available right now.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Historical dial · UK-total · {icFlow} · GWh · {icYears[0]}–{icYears.at(-1)}
              </h3>
              {icUkSeries.points.length === 0 ? (
                <EmptyStage label="No UK-total points">Try another flow.</EmptyStage>
              ) : (
                <TimeChart
                  label={`UK-total · ${icFlow}`}
                  series={[icUkSeries]}
                  cadence="quarterly"
                  kind="line"
                  format={(v) => fmtGWh(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>

            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Corridors · {icFlow} · {y}
              </h3>
              {icTable.length === 0 ? (
                <EmptyStage label="No corridor totals for this year">
                  Pre-commissioning quarters are often missing; pick a later year.
                </EmptyStage>
              ) : (
                <RankBars
                  label={`Corridors · ${icFlow} · ${y}`}
                  rows={icTable.map((row) => ({
                    id: row.corridor,
                    label: row.corridor,
                    v: icFlow === "Net imports" ? row.value : Math.abs(row.value),
                  }))}
                  format={(v) => fmtGWh(v)}
                />
              )}
            </section>
          </div>
        )}
      </Stage>
    </>
  );
}
