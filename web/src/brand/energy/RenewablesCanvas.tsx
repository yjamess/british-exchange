"use client";

/**
 * Energy Domain 06 — Renewables & Nuclear.
 * Field Guide (flagship) · Capacity ≠ Output · Pipeline · Buildout Chronology.
 * Nuclear is low-carbon, not renewable. Renewable LF = DUKES 6.3; nuclear LF = DUKES 5.10.
 */

import { useCallback, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { EventRail } from "../instrument/EventRail";
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
import type { CapacityPack, GenerationPack } from "./packs";
import {
  EMPTY_POLICY_EVENTS_PACK,
  markYear,
  orderedPolicyEvents,
  type PolicyEventsPack,
} from "./policy-events";
import {
  CAPACITY_ID,
  FIELD_TECHS,
  LOAD_BASES,
  LOAD_FACTORS_ID,
  PIPELINE_ID,
  PLANT_LOAD_FACTORS_ID,
  asGuideMeasure,
  asPipelineLane,
  asPipelineStageId,
  capacityMwInYear,
  capacitySeries,
  fieldTechById,
  fmtGw,
  fmtLoadPct,
  fmtTwh,
  generationSeries,
  generationTwhInYear,
  loadFactorInYear,
  loadFactorSeries,
  parsePipelineRows,
  pipelineLaneTotal,
  pipelinePinLabel,
  pipelineStageRanks,
  pipelineStageTotal,
  pipelineTechRanks,
  plantLoadFactorInYear,
  plantLoadFactorSeries,
  stagesForLane,
  yearsOf,
  type FieldTechId,
  type GuideMeasure,
  type LoadBasis,
  type PipelineLane,
  type RenewablesPack,
} from "./renewables-model";
import { AnnualSeriesTable } from "./SeriesDataTables";
import { buildGuideSlices, RenewablesFieldGuide } from "./RenewablesFieldGuide";
import s from "./generation.module.css";

import { LOW_CARBON_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...LOW_CARBON_VIEWS];

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function asTech(v: string | null): FieldTechId {
  return FIELD_TECHS.some((t) => t.id === v) ? (v as FieldTechId) : "offshore-wind";
}

function asBasis(v: string | null): LoadBasis {
  return LOAD_BASES.includes(v as LoadBasis) ? (v as LoadBasis) : "average_boe_capacity";
}

function asPipelineTech(v: string | null): FieldTechId | "all" {
  if (v === "all" || v == null || v === "") return "all";
  return asTech(v);
}

function PipelineArchiveTable({
  rows,
}: {
  rows: { status: string; technology: string; mw: number }[];
}) {
  const titleId = useId();
  const sorted = [...rows].sort((a, b) => b.mw - a.mw);
  if (!sorted.length) {
    return (
      <EmptyStage label="Pipeline unavailable">No planned or under-construction projects are available right now.</EmptyStage>
    );
  }
  return (
    <div className={t.tableGroup}>
      <p className={t.stageTitle} id={titleId}>
        Planning pipeline · status × technology · MW
      </p>
      <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Technology</th>
              <th scope="col">MW</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={`${r.status}|${r.technology}`}>
                <th scope="row">{r.status}</th>
                <td>{r.technology}</td>
                <td>
                  {r.mw.toLocaleString("en-GB", {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RenewablesCanvas({
  pack,
  generation,
  capacity,
  policyEvents = EMPTY_POLICY_EVENTS_PACK,
}: {
  pack: RenewablesPack;
  generation: GenerationPack | null;
  capacity: CapacityPack | null;
  policyEvents?: PolicyEventsPack;
}) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("low-carbon");
  const lfRows = pack.loadFactors?.observations ?? [];
  const plantLfRows = pack.plantLoadFactors?.observations ?? [];
  const pipelineObs = pack.pipeline?.observations ?? [];
  const pipelineRows = parsePipelineRows(pipelineObs);
  const genRows = generation?.observations ?? [];
  const capRows = capacity?.observations ?? [];

  const [view, setView] = useState(() =>
    VIEWS.some((v) => v.id === searchParams.get("view")) ? searchParams.get("view")! : "guide",
  );
  const [techId, setTechId] = useState<FieldTechId>(() => asTech(searchParams.get("tech")));
  const [basis, setBasis] = useState<LoadBasis>(() => asBasis(searchParams.get("lf_basis")));
  const [measure, setMeasure] = useState<GuideMeasure>(() =>
    asGuideMeasure(searchParams.get("measure")),
  );
  const [lane, setLane] = useState<PipelineLane>(() => asPipelineLane(searchParams.get("lane")));
  const [stageId, setStageId] = useState(() =>
    asPipelineStageId(searchParams.get("stage"), asPipelineLane(searchParams.get("lane"))),
  );
  const [pipeTech, setPipeTech] = useState<FieldTechId | "all">(() =>
    asPipelineTech(searchParams.get("pipe_tech")),
  );

  const tech = fieldTechById(techId);
  const lfSeries = loadFactorSeries(lfRows, tech, basis);
  const plantLfSeries = plantLoadFactorSeries(plantLfRows);
  const genSeries = generationSeries(genRows, tech);
  const capSeries = capacitySeries(capRows, tech);

  // Prefer years with capacity or load factor — generation can run ahead on part-year quarters.
  const capacityYears = capSeries.points.map((p) => p.t);
  const loadYears = tech.nuclear
    ? plantLfSeries.points.map((p) => p.t)
    : lfSeries.points.map((p) => p.t);
  // Menu + default from capacity / load factor only — generation can run ahead on part years.
  const yearPool = [
    ...new Set([
      ...capacityYears,
      ...loadYears,
    ]),
  ].sort((a, b) => a - b);
  const latest =
    [...capacityYears].sort((a, b) => a - b).at(-1) ??
    [...loadYears].sort((a, b) => a - b).at(-1) ??
    yearPool.at(-1) ??
    2025;
  const earliest = yearPool[0] ?? 2008;

  const [year, setYear] = useState(() =>
    clampYear(Number(searchParams.get("year") || latest), yearPool.length ? yearPool : [latest], latest),
  );
  const [eventId, setEventId] = useState<string | null>(() => searchParams.get("event"));

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        year: number;
        tech: FieldTechId;
        lf_basis: LoadBasis;
        measure: GuideMeasure;
        lane: PipelineLane;
        stage: string;
        pipe_tech: FieldTechId | "all";
        event: string | null;
      }>,
    ) => {
      const next = {
        view,
        year,
        tech: techId,
        lf_basis: basis,
        measure,
        lane,
        stage: stageId,
        pipe_tech: pipeTech,
        event: eventId,
        ...patch,
      };
      if (patch.lane != null && patch.stage == null) {
        next.stage = asPipelineStageId(null, next.lane);
      }
      setView(next.view);
      setYear(next.year);
      setTechId(next.tech);
      setBasis(next.lf_basis);
      setMeasure(next.measure);
      setLane(next.lane);
      setStageId(asPipelineStageId(next.stage, next.lane));
      setPipeTech(next.pipe_tech);
      setEventId(next.event);
      writeUrl({
        view: next.view,
        year: next.year,
        tech: next.tech,
        lf_basis: next.lf_basis,
        measure: next.measure,
        lane: next.lane,
        stage: next.stage,
        pipe_tech: next.pipe_tech,
        event: next.event || null,
      });
    },
    [view, year, techId, basis, measure, lane, stageId, pipeTech, eventId, writeUrl],
  );

  const y = clampYear(year, yearPool.length ? yearPool : [latest], latest);
  const capacityMw = capacityMwInYear(capRows, tech, y);
  const genY = generationTwhInYear(genRows, tech, y);
  const loadY = tech.nuclear
    ? plantLoadFactorInYear(plantLfRows, y)
    : loadFactorInYear(lfRows, tech, y, basis);

  const lfReady = Boolean(pack.loadFactors?.observations.length);
  const plantLfReady = Boolean(pack.plantLoadFactors?.observations.length);
  const pipelineReady = Boolean(pipelineRows.length);
  const capReady = Boolean(capRows.length);
  const genReady = Boolean(genRows.length);

  const pinLabel = pipelinePinLabel(pipelineObs);
  const stages = stagesForLane(lane);
  const stage =
    stages.find((st) => st.id === stageId) ?? stages[0] ?? PIPELINE_ACTIVE_FALLBACK;
  const pipeFilter: FieldTechId | "all" =
    pipeTech !== "all" && fieldTechById(pipeTech).nuclear ? "all" : pipeTech;
  const stageRanks = pipelineStageRanks(pipelineRows, lane, pipeFilter).map((r) => ({
    ...r,
    active: r.id === stage.id,
  }));
  const techRanks = pipelineTechRanks(pipelineRows, stage, pipeFilter);
  const laneTotal = pipelineLaneTotal(pipelineRows, lane, pipeFilter);
  const stageTotal = pipelineStageTotal(pipelineRows, stage, pipeFilter);
  const buildingTotal = pipelineStageTotal(
    pipelineRows,
    stagesForLane("active").find((st) => st.id === "building")!,
    pipeFilter,
  );

  const guideSlices = useMemo(
    () =>
      buildGuideSlices(
        y,
        (id) => capacityMwInYear(capRows, fieldTechById(id), y),
        (id) => {
          const g = generationTwhInYear(genRows, fieldTechById(id), y);
          return g?.value ?? null;
        },
        (id) => {
          const ft = fieldTechById(id);
          return ft.nuclear
            ? plantLoadFactorInYear(plantLfRows, y)
            : loadFactorInYear(lfRows, ft, y, basis);
        },
        pipelineRows,
      ),
    [y, capRows, genRows, lfRows, plantLfRows, basis, pipelineRows],
  );

  const capacityFigures: ExplorerFigure[] = [
    {
      label: `${y} capacity`,
      value: capacityMw != null ? fmtGw(capacityMw) : "—",
      note: tech.nuclear ? "Nuclear fleet · sum of reactors" : "Installed capacity",
    },
    {
      label: `${y} generation`,
      value: genY != null ? fmtTwh(genY.value) : "—",
      note: genY?.provisional
        ? `Sum of ${genY.quarters} quarters · provisional or incomplete`
        : "Annual sum of quarters",
    },
    {
      label: `${y} load factor`,
      value: loadY != null ? fmtLoadPct(loadY) : "—",
      note: tech.nuclear
        ? "Nuclear stations"
        : "Average capacity basis",
    },
  ];

  const pipelineFigures: ExplorerFigure[] = [
    {
      label: lane === "active" ? "Active pipeline" : "Not proceeding",
      value: laneTotal > 0 ? fmtGw(laneTotal) : "—",
      note: pinLabel,
    },
    {
      label: stage.label,
      value: stageTotal > 0 ? fmtGw(stageTotal) : "—",
      note: "Selected stage · MW",
    },
    {
      label: "Building",
      value: buildingTotal > 0 ? fmtGw(buildingTotal) : "—",
      note: "Under construction · active lane",
    },
  ];

  const guideFigures: ExplorerFigure[] = [
    {
      label: `${y} · ${tech.label}`,
      value: capacityMw != null ? fmtGw(capacityMw) : "—",
      note: "Installed capacity",
    },
    {
      label: "Generation",
      value: genY != null ? fmtTwh(genY.value) : "—",
      note: "Annual",
    },
    {
      label: "Load factor",
      value: loadY != null ? fmtLoadPct(loadY) : "—",
      note: tech.nuclear ? "Nuclear stations" : "Published load factor",
    },
  ];

  const earlyCap = capacityMwInYear(capRows, tech, earliest);
  const buildoutFigures: ExplorerFigure[] = [
    {
      label: `${earliest} capacity`,
      value: earlyCap != null ? fmtGw(earlyCap) : "—",
      note: tech.label,
    },
    {
      label: `${y} capacity`,
      value: capacityMw != null ? fmtGw(capacityMw) : "—",
      note: "Selected year",
    },
    {
      label: `${y} generation`,
      value: genY != null ? fmtTwh(genY.value) : "—",
      note: "Annual",
    },
  ];

  const yearOptions = (yearPool.length ? yearPool : [latest]).map((yy) => ({
    value: String(yy),
    label: String(yy),
  }));

  const dialSeries = tech.nuclear
    ? plantLfSeries.points.length
      ? plantLfSeries
      : genSeries
    : lfSeries.points.length
      ? lfSeries
      : genSeries;
  const dialIsLoad =
    (tech.nuclear && dialSeries.id.startsWith("plant-lf")) ||
    (!tech.nuclear && dialSeries.id.startsWith("lf-"));
  const dialFormat = dialIsLoad ? (v: number) => fmtLoadPct(v) : (v: number) => fmtTwh(v);
  const dialCadence = "annual" as const;

  const buildoutMarks = orderedPolicyEvents(policyEvents.events).flatMap((e) => {
    const yr = markYear(e);
    if (yr == null || yr < earliest || yr > latest) return [];
    const topics = e.topics ?? [];
    if (!topics.some((t) => ["electricity", "energy", "renewables", "climate", "nuclear"].includes(t))) {
      return [];
    }
    return [{ id: e.id, t: yr, label: String(yr), title: e.title }];
  });
  const showTechControl = view !== "pipeline" && view !== "guide";
  const showPipeTechControl = view === "pipeline";
  const showYear = view === "capacity" || view === "guide" || view === "buildout";
  const showBasis =
    (view === "capacity" || view === "guide" || view === "data") && !tech.nuclear && lfReady;

  // Reset = only the settings this tab exposes (controls or plate/event selection) that differ
  // from the tab's real default. Defaults come from the same `as*(null)` parsers that read the
  // URL, so "no params" and "reset" can never disagree. Empty patch → no Reset button.
  const resetPatch: Parameters<typeof sync>[0] = {};
  const defaultTech = asTech(null);
  if (view !== "pipeline" && techId !== defaultTech) resetPatch.tech = defaultTech;
  if (showYear && y !== latest) resetPatch.year = latest;
  if (view === "guide" && measure !== asGuideMeasure(null)) resetPatch.measure = asGuideMeasure(null);
  if (showBasis && basis !== asBasis(null)) resetPatch.lf_basis = asBasis(null);
  if (view === "buildout" && eventId) resetPatch.event = null;
  if (view === "pipeline") {
    const defaultLane = asPipelineLane(null);
    if (lane !== defaultLane) resetPatch.lane = defaultLane;
    // Stage default is the first stage of the lane being shown.
    const defaultStage = asPipelineStageId(null, resetPatch.lane ?? lane);
    if (stageId !== defaultStage || resetPatch.lane) resetPatch.stage = defaultStage;
    if (pipeTech !== asPipelineTech(null)) resetPatch.pipe_tech = asPipelineTech(null);
  }
  const showReset = Object.keys(resetPatch).length > 0;
  const stripFigures =
    view === "pipeline"
      ? pipelineFigures
      : view === "guide"
        ? guideFigures
        : view === "buildout"
          ? buildoutFigures
          : capacityFigures;

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {(view === "capacity" ||
        view === "pipeline" ||
        view === "guide" ||
        view === "buildout") && <FigureStrip figures={stripFigures} />}

      <ControlRow>
        {showTechControl && (
          <MenuControl
            label="Technology"
            value={techId}
            options={FIELD_TECHS.map((ft) => ({
              value: ft.id,
              label: ft.nuclear ? `${ft.label} · low-carbon` : ft.label,
            }))}
            onChange={(v) => sync({ tech: v as FieldTechId })}
          />
        )}
        {showPipeTechControl && (
          <MenuControl
            label="Technology"
            value={pipeFilter}
            options={[
              { value: "all", label: "All technologies" },
              ...FIELD_TECHS.filter((ft) => !ft.nuclear).map((ft) => ({
                value: ft.id,
                label: ft.label,
              })),
            ]}
            onChange={(v) => sync({ pipe_tech: v as FieldTechId | "all" })}
          />
        )}
        {view === "guide" && (
          <MenuControl
            label="Measure"
            value={measure}
            options={[
              { value: "built", label: "Built · MW" },
              { value: "generating", label: "Generating · TWh" },
              { value: "running", label: "Running · %" },
            ]}
            onChange={(v) => sync({ measure: v as GuideMeasure })}
          />
        )}
        {showYear && (
          <MenuControl
            label="Year"
            value={String(y)}
            options={yearOptions}
            onChange={(v) => sync({ year: Number(v) })}
          />
        )}
        {showBasis && (
          <MenuControl
            label="Load-factor basis"
            value={basis}
            options={[
              { value: "average_boe_capacity", label: "Average BoE capacity" },
              { value: "unchanged_configuration", label: "Unchanged configuration" },
            ]}
            onChange={(v) => sync({ lf_basis: v as LoadBasis })}
          />
        )}
        {view === "pipeline" && (
          <MenuControl
            label="Lane"
            value={lane}
            options={[
              { value: "active", label: "Active pipeline" },
              { value: "closed", label: "Not proceeding" },
            ]}
            onChange={(v) => sync({ lane: v as PipelineLane })}
          />
        )}
        {view === "pipeline" && (
          <MenuControl
            label="Stage"
            value={stage.id}
            options={stages.map((st) => ({ value: st.id, label: st.label }))}
            onChange={(v) => sync({ stage: v })}
          />
        )}
        {showReset && <ResetButton onClick={() => sync(resetPatch)} />}
      </ControlRow>

      <Stage
        title={
          view === "data"
            ? "Data · Renewables and nuclear"
            : view === "pipeline"
              ? `Project pipeline · ${stage.label} · ${pinLabel}`
              : view === "guide"
                ? `Energy field guide · ${y}`
                : view === "buildout"
                  ? `Buildout chronology · ${tech.label} · ${earliest}–${latest}`
                  : `Capacity and output · ${tech.label} · ${y}`
        }
        meta={
          view === "data"
            ? `${tech.label} · UK · observation tables`
            : view === "pipeline"
              ? "Planning capacity · MW · not generation · not nuclear"
              : view === "guide"
                ? "Illustrative plates · measured MW · TWh · % · not to plate scale"
                : view === "buildout"
                  ? "Installed capacity and generation over time · UK"
                  : tech.nuclear
                    ? "Low-carbon · MW · TWh · %"
                    : `MW · TWh · % · ${earliest}–${latest}`
        }
        follow={
          view === "capacity" || view === "data" ? null : (
            <EnergyStageFollow
              domain="low-carbon"
              view={view}
              selection={{ tech: techId, year: y }}
              label={`Low-carbon · ${tech.label}`}
            />
          )
        }
        foot={
          <FigureRecord
            source={
              view === "pipeline"
                ? ENERGY_SOURCE.renewablesPipeline
                : tech.nuclear
                  ? ENERGY_SOURCE.renewablesFieldNuclear
                  : ENERGY_SOURCE.renewablesField
            }
            definition={
              view === "data"
                ? [
                    `Archive tables for ${tech.label}: installed capacity, annual generation${
                      tech.nuclear ? ", and plant load factor" : ", and load factor"
                    }.`,
                    "Pipeline archive lists non-operational REPD capacity by status and technology.",
                  ]
                : view === "pipeline"
                  ? [
                      "Planning capacity still in the Renewable Energy Planning Database, grouped into stages. Operational plant is not in this series.",
                      "Active pipeline is submitted, consented and building. Not proceeding holds refused, withdrawn, expired, abandoned and decommissioned capacity.",
                    ]
                  : view === "guide"
                    ? [
                        "Specimen plates for each technology with sourced capacity, generation and load factor. Plate drawings are illustrative forms — their area is not a measure.",
                        "Nuclear is low-carbon electricity, not a renewable energy source. Built / Generating / Running switch the comparison mark on every card.",
                      ]
                    : view === "buildout"
                      ? [
                          "How installed capacity and annual generation for one technology have changed over the published years.",
                          "Policy marks are context from the Industrial Policy register — not effects of those decisions alone.",
                        ]
                      : [
                          "Field card for one technology: installed capacity (MW), annual generation (TWh), and load factor (%).",
                          "Nuclear is low-carbon electricity, not a renewable energy source. Its load factor comes from DUKES 5.10, not from the renewable table.",
                        ]
            }
            method={
              view === "data"
                ? [
                    "Capacity from DUKES 5.12. Generation is the calendar-year sum of Energy Trends 5.1 quarters.",
                    tech.nuclear
                      ? "Nuclear load factor from DUKES 5.10 major power producers (nuclear stations)."
                      : "Renewable load factors from DUKES 6.3; two published bases.",
                    "Pipeline sums Installed Capacity (MWelec) for non-operational Development Status values in the REPD extract.",
                  ]
                : view === "pipeline"
                  ? [
                      "Sums Installed Capacity (MWelec) from the same REPD quarterly extract as the operational atlas, excluding Operational.",
                      "Stages group publisher status labels; MW is planning capacity, not generation and not built capacity on the field card.",
                      "REPD covers projects at or above its published size threshold. Nuclear is not in REPD.",
                    ]
                  : view === "guide"
                    ? [
                        "Capacity from DUKES 5.12; generation from Energy Trends 5.1; renewable load factors from DUKES 6.3; nuclear load factor from DUKES 5.10.",
                        "Active planning MW sums the non-operational REPD active lane for mapped technologies. Specimens share one camera; drawing size is never MW.",
                      ]
                    : view === "buildout"
                      ? [
                          "Annual capacity from DUKES 5.12 (nuclear = sum of reactor-type rows). Annual generation is the calendar-year sum of Energy Trends 5.1 quarters.",
                          "EventRail marks use Royal Assent or programme start years from Ready industrial-policy events that mention electricity, renewables or climate.",
                        ]
                      : [
                          "Capacity from DUKES table 5.12 (nuclear = sum of reactor-type rows). Generation = calendar-year sum of Energy Trends table 5.1 quarters.",
                          tech.nuclear
                            ? "Nuclear load factor from DUKES table 5.10.B (nuclear stations, major power producers). Not from DUKES 6.3 or REPD."
                            : "Load factors from DUKES table 6.3 only; two published bases — do not invent a third. Parent aggregates are not selectable here.",
                          "Proposed capacity is not installed capacity, and neither is generation. Place maps stay on Electricity Generation.",
                        ]
            }
            dataHref={
              view === "pipeline"
                ? `/data?record=${PIPELINE_ID}`
                : view === "capacity"
                  ? `/data?record=${CAPACITY_ID}`
                  : tech.nuclear
                    ? `/data?record=${PLANT_LOAD_FACTORS_ID}`
                    : `/data?record=${LOAD_FACTORS_ID}`
            }
          />
        }
      >
        {view === "data" ? (
          !capReady && !genReady && !lfReady && !plantLfReady && !pipelineReady ? (
            <EmptyStage label="Low-carbon series unavailable">
              Capacity, generation, load factor and pipeline figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <AnnualSeriesTable
                title={`${tech.label} · installed capacity`}
                unit="MW"
                points={capSeries.points}
                format={(v) =>
                  v.toLocaleString("en-GB", { maximumFractionDigits: 0 })
                }
                emptyLabel="Capacity unavailable"
              />
              <AnnualSeriesTable
                title={`${tech.label} · generation`}
                unit="TWh"
                points={genSeries.points}
                format={(v) => fmtTwh(v).replace(/\s*TWh$/, "")}
                emptyLabel="Generation unavailable"
              />
              {!tech.nuclear ? (
                <AnnualSeriesTable
                  title={`${tech.label} · load factor`}
                  unit="%"
                  points={lfSeries.points}
                  format={(v) => v.toFixed(1)}
                  emptyLabel="Load factor unavailable"
                />
              ) : (
                <AnnualSeriesTable
                  title="Nuclear stations · plant load factor"
                  unit="%"
                  points={plantLfSeries.points}
                  format={(v) => v.toFixed(1)}
                  emptyLabel="Plant load factor unavailable"
                />
              )}
              <PipelineArchiveTable rows={pipelineRows} />
            </div>
          )
        ) : view === "pipeline" ? (
          !pipelineReady ? (
            <EmptyStage label="Pipeline unavailable">
              Planned and under-construction project figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  {lane === "active" ? "Active stages" : "Not proceeding"} · MW · {pinLabel}
                </h3>
                {stageRanks.length === 0 ? (
                  <EmptyStage label="No capacity in this lane">
                    Try another technology filter or the other lane.
                  </EmptyStage>
                ) : (
                  <RankBars
                    label={`${lane === "active" ? "Active" : "Closed"} pipeline stages`}
                    rows={stageRanks}
                    format={(v) => fmtGw(v)}
                    onSelect={(id) => sync({ stage: id })}
                  />
                )}
              </section>

              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Technologies · {stage.label} · MW
                </h3>
                {techRanks.length === 0 ? (
                  <EmptyStage label="No technologies in this stage">
                    Pick another stage or clear the technology filter.
                  </EmptyStage>
                ) : (
                  <RankBars
                    label={`Technologies in ${stage.label}`}
                    rows={techRanks}
                    format={(v) => fmtGw(v)}
                  />
                )}
              </section>
            </div>
          )
        ) : view === "guide" ? (
          !capReady && !genReady && !lfReady && !plantLfReady ? (
            <EmptyStage label="Low-carbon series unavailable">
              Capacity, generation and load factor figures are not available right now.
            </EmptyStage>
          ) : (
            <RenewablesFieldGuide
              year={y}
              measure={measure}
              techId={techId}
              slices={guideSlices}
              onSelect={(id) => sync({ tech: id })}
            />
          )
        ) : view === "buildout" ? (
          !capReady && !genReady ? (
            <EmptyStage label="Buildout series unavailable">
              Capacity and generation figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Policy context · {earliest}–{latest}
                </h3>
                {buildoutMarks.length === 0 ? (
                  <EmptyStage label="No policy marks in this span">
                    Industrial policy events outside this period stay on the Policy domain.
                  </EmptyStage>
                ) : (
                  <EventRail
                    label="Industrial policy marks on the buildout span"
                    marks={buildoutMarks}
                    time={[earliest, latest]}
                    selected={eventId}
                    onSelect={(id) => sync({ event: id === eventId ? null : id })}
                  />
                )}
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Installed capacity · MW · {earliest}–{latest}
                </h3>
                {capSeries.points.length === 0 ? (
                  <EmptyStage label="No capacity points">
                    Try another technology.
                  </EmptyStage>
                ) : (
                  <TimeChart
                    label={capSeries.label}
                    series={[capSeries]}
                    cadence="annual"
                    kind="line"
                    format={(v) => fmtGw(v)}
                    rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  />
                )}
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Annual generation · TWh · {earliest}–{latest}
                </h3>
                {genSeries.points.length === 0 ? (
                  <EmptyStage label="No generation points">
                    Try another technology.
                  </EmptyStage>
                ) : (
                  <TimeChart
                    label={genSeries.label}
                    series={[genSeries]}
                    cadence="annual"
                    kind="line"
                    format={(v) => fmtTwh(v)}
                    rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  />
                )}
              </section>
            </div>
          )
        ) : !capReady && !genReady && !lfReady && !plantLfReady ? (
          <EmptyStage label="Low-carbon series unavailable">
            Capacity, generation and load factor figures are not available right now.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Historical dial ·{" "}
                {dialIsLoad ? `load factor · %` : `generation · TWh`} · {earliest}–{latest}
              </h3>
              {dialSeries.points.length === 0 ? (
                <EmptyStage label="No dial points for this technology">
                  Try another technology or year. Unchanged-configuration rows start later for some fuels.
                </EmptyStage>
              ) : (
                <TimeChart
                  label={dialSeries.label}
                  series={[dialSeries]}
                  cadence={dialCadence}
                  kind="line"
                  format={dialFormat}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
          </div>
        )}
      </Stage>
    </>
  );
}

const PIPELINE_ACTIVE_FALLBACK = {
  id: "building",
  label: "Building",
  statuses: ["Under Construction"],
};
