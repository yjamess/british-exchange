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
import { RankBars } from "../instrument/TimeChart";
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
import { energySource } from "./source";
import {
  SSEN_AREAS,
  SSEN_ATLAS_ID,
  SSEN_LAYERS,
  SSEN_LINE_CLASSES,
  TEC_BASES,
  TEC_GATES,
  TEC_REGISTER_ID,
  TEC_STATUSES,
  filterSsenLines,
  filterSsenSubstations,
  filterTecLines,
  fmtMw,
  parseTecLines,
  tecLargestLines,
  tecPinLabel,
  tecRankByFamily,
  tecRankByGate,
  tecRankByStatus,
  tecTotalMw,
  tecUniqueProjects,
  type NetworksPack,
  type SsenArea,
  type SsenLayer,
  type SsenLineClass,
  type TecBasis,
  type TecGate,
  type TecStatus,
} from "./networks-model";
import s from "./generation.module.css";

import { NETWORKS_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...NETWORKS_VIEWS];



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
  return b === "built" ? "Built and connected" : "Contracted connection date";
}

/** ISO date → "5 November 2026". */
const fmtDay = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

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
  if (a === "SEPD") return "Southern England";
  if (a === "SHEPD") return "North of Scotland";
  return "Southern England and north of Scotland";
}

function layerLabel(l: SsenLayer): string {
  if (l === "substations") return "Substations";
  if (l === "lines") return "Overhead lines";
  return "Substations + lines";
}

function lineClassLabel(c: SsenLineClass): string {
  if (c === "ehv-plus") return "132 kV and above";
  if (c === "ehv") return "33 kV to 66 kV";
  return "All high-voltage lines";
}

export function NetworksCanvas({
  pack,
}: {
  pack: NetworksPack;
}) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("networks");
  const tecRows = pack.tec?.observations ?? [];

  const [view, setView] = useState(() =>
    VIEWS.some((v) => v.id === searchParams.get("view")) ? searchParams.get("view")! : "queue",
  );
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
      setGate(next.gate);
      setStatus(next.status);
      setBasis(next.basis);
      setArea(next.area);
      setLayer(next.layer);
      setLineClass(next.lines);
      setSiteId(next.site);
      writeUrl({
        view: next.view,
        gate: next.gate === "all" ? null : next.gate,
        status: next.status === "all" ? null : next.status,
        basis: next.basis === "contractual" ? null : next.basis,
        area: next.area === "all" ? null : next.area,
        layer: next.layer === "both" ? null : next.layer,
        lines: next.lines === "all" ? null : next.lines,
        site: next.site,
      });
    },
    [view, gate, status, basis, area, layer, lineClass, siteId, writeUrl],
  );

  const tecReady = Boolean(pack.tec?.observations.length);
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

  const figures: ExplorerFigure[] =
    view === "queue"
        ? [
            {
              label: "Projects",
              value: tecProjects.toLocaleString("en-GB"),
              note: basisLabel(basis),
            },
            {
              label: "Capacity in the queue",
              value: fmtMw(tecMw),
              note: "Some projects hold more than one connection",
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
                label: "Network operator",
                value: "SSEN",
                note: pack.ssenAtlas?.as_of ? `One operator so far · as of ${fmtDay(pack.ssenAtlas.as_of)}` : "One operator so far",
              },
            ]
          : [];

  const queueDirty = gate !== "all" || status !== "all" || basis !== "contractual";
  const gridDirty = area !== "all" || layer !== "both" || lineClass !== "all" || Boolean(siteId);

  const stageTitle =
    view === "data"
      ? "Data · Power networks"
      : view === "grid"
        ? `Invisible grid · SSEN network · ${areaLabel(area)}`
        : `Connections queue · ${gateLabel(gate)} · ${basisLabel(basis)}`;

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {view !== "data" && <FigureStrip figures={figures} />}

      {view !== "data" &&
        ((view === "queue" && tecReady) ||
          (view === "grid" && gridReady) ||
          (view === "queue" && queueDirty) ||
          (view === "grid" && gridDirty)) && (
        <ControlRow>
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
          {(view === "queue" && queueDirty) ||
          (view === "grid" && gridDirty) ? (
            <ResetButton
              onClick={() =>
                sync({
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
            selection={{}}
            label={`Networks · ${view}`}
          />
        }
        foot={
          <FigureRecord
            source={energySource("networks", view, view === "grid" ? ENERGY_SOURCE.networksGrid : ENERGY_SOURCE.networksQueue)}
            definition={
              view === "grid"
                ? [
                    "SSEN Distribution substations (primary, grid and bulk supply, and switching) and its higher-voltage overhead lines.",
                    "One network operator so far, covering southern England and the north of Scotland. Not a national map, not underground cables, and not spare capacity.",
                  ]
                : view === "data"
                  ? ["Tables for the connections queue and the SSEN network counts. Cable flows and capacity are on Energy imports › Connectors."]
                  : [
                      "Projects waiting to connect to the electricity transmission network in Great Britain, from NESO's connections register.",
                      "Figures are contracted megawatts on the register, not forecast connection dates and not local spare capacity.",
                    ]
            }
            method={
              view === "grid"
                ? [
                    "Substation positions are converted from Ordnance Survey grid references in the operator's release.",
                    "The map leaves out 11 kV overhead lines. Lines are assigned to an area by latitude, because the release does not name the owning licence area.",
                    "© SSEN Distribution. The coastline is drawn for place only.",
                  ]
                : view === "data"
                  ? ["The queue and network tables are registers at a date, not time series."]
                  : [
                      "Contracted connection date uses the megawatts and dates agreed in each contract. Built and connected uses capacity already connected at the register date.",
                      "Megawatt totals add up every connection in the register. A project can hold more than one connection, so the total is not the capacity of distinct projects.",
                      "A project's gate can be unassigned until its agreement is signed. Great Britain only.",
                    ]
            }
            dataHref={view === "grid" ? `/data?record=${SSEN_ATLAS_ID}` : `/data?record=${TEC_REGISTER_ID}`}
          />
        }
      >
        {view === "data" ? (
          !tecReady && !gridReady ? (
            <EmptyStage label="Network series unavailable">
              Network figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              {tecTop.length > 0 ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Connections queue · largest projects · MW
                    {tecPin ? ` · as of ${fmtDay(tecPin)}` : ""}
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
                    {pack.ssenAtlas?.as_of ? ` · as of ${fmtDay(pack.ssenAtlas.as_of)}` : ""}
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
                    <p className="bo-label">SSEN network</p>
                    <h3 className={s.stationName}>Select a substation</h3>
                  </>
                )}
              </aside>
            </div>
          )
        ) : view === "queue" ? (
          !tecReady ? (
            <EmptyStage label="Connections queue unavailable">
              Transmission entry capacity figures are not available right now.
            </EmptyStage>
          ) : tecLines.length === 0 ? (
            <EmptyStage label="No projects for this selection">
              Try another gate, status or basis.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>By technology · MW</h3>
                <RankBars
                  label="Transmission entry capacity by technology family"
                  rows={tecByFamily.map((r) => ({ id: r.id, label: r.label, v: r.v }))}
                  format={(v) => fmtMw(v)}
                />
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>By gate · MW</h3>
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
        ) : null}
      </Stage>
    </>
  );
}
