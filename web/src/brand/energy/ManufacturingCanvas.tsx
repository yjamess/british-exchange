"use client";

/**
 * Energy Domain 08 — Manufacturing.
 * Tabs: Anatomy · Output vs Jobs · Places · Data.
 * Index ≠ % GVA ≠ jobs ≠ productivity — never one unmarked axis.
 */

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { ChangeRows, RankBars, TimeChart } from "../instrument/TimeChart";
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
import {
  ANATOMY_MEASURES,
  BRES_BY_DIVISION_REGION_ID,
  BRES_EMPLOYEE_JOBS_ID,
  EMPLOYMENT_ID,
  IOP_BY_DIVISION_ID,
  IOP_LEVELS,
  OUTPUT_INDEX_ID,
  bresChangeRanks,
  bresDivisionRowsForBranch,
  bresRankForYear,
  bresRegionCount,
  bresUkSum,
  bresYearsOf,
  branchShare,
  branchShareSeries,
  branchWeight,
  compositionFor,
  employmentSeries,
  employmentYearMean,
  fmtBresThousands,
  fmtIndex,
  fmtJobsThousands,
  fmtShareOfMfg,
  fmtSharePct,
  iopBranchPctChange,
  iopBranchSeries,
  iopBranchYearMean,
  iopChangeRanks,
  completeMonthlyYears,
  completeQuarterlyYears,
  iopYearsOf,
  listIopBranches,
  outputIndexSeries,
  outputIndexYearMean,
  productivitySeries,
  shareSeries,
  shareValueInYear,
  weightYearsOf,
  yearsOf,
  type AnatomyMeasure,
  type IopLevel,
  type ManufacturingPack,
} from "./manufacturing-model";
import { AnnualSeriesTable } from "./SeriesDataTables";
import { MANUFACTURING_PLATES, Plate } from "../Plate";
import s from "./generation.module.css";

import { MANUFACTURING_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...MANUFACTURING_VIEWS];

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function asMeasure(v: string | null): AnatomyMeasure {
  return ANATOMY_MEASURES.includes(v as AnatomyMeasure) ? (v as AnatomyMeasure) : "share";
}

function asLevel(v: string | null): IopLevel {
  return IOP_LEVELS.includes(v as IopLevel) ? (v as IopLevel) : "subsection";
}

function levelLabel(level: IopLevel): string {
  return level === "subsection" ? "Broad branches" : "Detailed branches";
}

function measureLabel(m: AnatomyMeasure): string {
  return m === "share" ? "Share of manufacturing" : "Volume change";
}

function fmtPctChange(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
}

export function ManufacturingCanvas({ pack }: { pack: ManufacturingPack }) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("manufacturing");
  const outputRows = pack.output?.observations ?? [];
  const shareRows = pack.share?.observations ?? [];
  const employmentRows = pack.employment?.observations ?? [];
  const productivityRows = pack.productivity?.observations ?? [];
  const iopRows = pack.iopByDivision?.observations ?? [];
  const weightRows = pack.iopWeights?.observations ?? [];
  const bresRows = pack.bresByRegion?.observations ?? [];
  const bresDivisionRows = pack.bresByDivisionRegion?.observations ?? [];

  const outputSeries = outputIndexSeries(outputRows);
  const shareLine = shareSeries(shareRows);
  const jobsLine = employmentSeries(employmentRows);
  const prodLine = productivitySeries(productivityRows);

  const outputYears = completeMonthlyYears(outputRows);
  const shareYears = yearsOf(shareRows).filter((y) => shareValueInYear(shareRows, y) != null);
  const nationalLatest = outputYears.at(-1) ?? shareYears.at(-1) ?? 2025;

  const [view, setView] = useState(() =>
    VIEWS.some((v) => v.id === searchParams.get("view"))
      ? searchParams.get("view")!
      : searchParams.get("view") === "structure" ||
          searchParams.get("view") === "composition" ||
          searchParams.get("view") === "ledger"
        ? searchParams.get("view") === "structure"
          ? "output-jobs"
          : "anatomy"
        : "anatomy",
  );
  const [year, setYear] = useState(() => Number(searchParams.get("year")) || 0);
  /** 0 = the default From year for the current measure. */
  const [fromYear, setFromYear] = useState(() => Number(searchParams.get("from")) || 0);
  const [measure, setMeasure] = useState<AnatomyMeasure>(() => asMeasure(searchParams.get("measure")));
  const [level, setLevel] = useState<IopLevel>(() => asLevel(searchParams.get("level")));
  const [industry, setIndustry] = useState(() => searchParams.get("industry") || "all");

  const branches = useMemo(() => listIopBranches(iopRows, level), [iopRows, level]);
  const iopYears = useMemo(() => iopYearsOf(iopRows, level), [iopRows, level]);
  const weightYears = useMemo(() => weightYearsOf(weightRows), [weightRows]);
  const bresYearsAll = useMemo(() => bresYearsOf(bresRows), [bresRows]);

  const activeView = view === "structure" ? "output-jobs" : view;
  const weightsReady = weightYears.length > 0;
  const shareMode = activeView === "anatomy" && measure === "share" && weightsReady;
  const selectedBranch = industry === "all" ? null : branches.find((b) => b.id === industry) ?? null;

  const placesRows = useMemo(() => {
    if (!selectedBranch || !bresDivisionRows.length) return bresRows;
    return bresDivisionRowsForBranch(bresDivisionRows, selectedBranch);
  }, [selectedBranch, bresDivisionRows, bresRows]);
  const bresYears = useMemo(() => bresYearsOf(placesRows), [placesRows]);
  const placesBranchMode = Boolean(selectedBranch && activeView === "places");

  const pool =
    activeView === "places"
      ? bresYears
      : shareMode
        ? weightYears
        : activeView === "output-jobs"
          ? outputYears
          : iopYears;
  const yearPool = pool.length ? pool : [nationalLatest];
  const latest = yearPool.at(-1) ?? nationalLatest;
  const defaultFrom = shareMode
    ? (yearPool[0] ?? latest)
    : yearPool.includes(2019)
      ? 2019
      : yearPool.includes(2015)
        ? 2015
        : (yearPool[0] ?? latest);
  const y = clampYear(year || latest, yearPool, latest);
  const fromY = clampYear(fromYear || defaultFrom, yearPool, defaultFrom);

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        year: number;
        from: number;
        measure: AnatomyMeasure;
        level: IopLevel;
        industry: string;
      }>,
    ) => {
      const next = {
        view: activeView,
        year: y,
        from: fromYear,
        measure,
        level,
        industry,
        ...patch,
      };
      const nextView =
        next.view === "structure" || next.view === "composition" || next.view === "ledger"
          ? next.view === "structure"
            ? "output-jobs"
            : "anatomy"
          : next.view;
      const nextIndustry = patch.level && patch.level !== level ? "all" : next.industry;
      setView(nextView);
      setYear(next.year);
      setFromYear(next.from);
      setMeasure(next.measure);
      setLevel(next.level);
      setIndustry(nextIndustry);
      writeUrl({
        view: nextView,
        year: next.year,
        from: next.from && next.from !== defaultFrom ? next.from : null,
        measure: next.measure === "share" ? null : next.measure,
        level: next.level === "subsection" ? null : next.level,
        industry: nextIndustry === "all" ? null : nextIndustry,
      });
    },
    [activeView, y, fromYear, measure, level, industry, defaultFrom, writeUrl],
  );

  const yearOutput = outputIndexYearMean(outputRows, y);
  const yearShare = shareValueInYear(shareRows, y);
  const yearJobs = employmentYearMean(employmentRows, y);

  const outputReady = Boolean(pack.output?.observations.length);
  const jobsReady = Boolean(pack.employment?.observations.length);
  const iopReady = Boolean(iopRows.length);
  const bresReady = Boolean(bresRows.length);
  const bresDivisionReady = Boolean(bresDivisionRows.length);

  /* ——— Composition (share of manufacturing) ——— */
  const toCells = useMemo(
    () => (shareMode ? compositionFor(weightRows, branches, y) : []),
    [shareMode, weightRows, branches, y],
  );
  const fromCells = useMemo(
    () => (shareMode ? compositionFor(weightRows, branches, fromY) : []),
    [shareMode, weightRows, branches, fromY],
  );
  const shareChanges = useMemo(() => {
    const was = new Map(fromCells.map((c) => [c.id, c.share]));
    return toCells
      .filter((c) => was.has(c.id))
      .map((c) => ({ id: c.id, label: `${c.sic} · ${c.label}`, from: was.get(c.id)!, to: c.share }))
      .sort((a, b) => b.to - a.to);
  }, [toCells, fromCells]);
  const largest = toCells.reduce<(typeof toCells)[number] | null>(
    (best, c) => (best == null || c.share > best.share ? c : best),
    null,
  );
  const byShift = [...shareChanges].sort((a, b) => b.to - b.from - (a.to - a.from));
  const gain = byShift[0] ?? null;
  const fall = byShift.at(-1) ?? null;

  /* ——— Volume index ——— */
  const branchSeries = selectedBranch ? iopBranchSeries(iopRows, selectedBranch) : null;
  const branchShareLine = selectedBranch && weightsReady ? branchShareSeries(weightRows, selectedBranch) : null;
  const branchYear = selectedBranch ? iopBranchYearMean(iopRows, selectedBranch.id, y) : null;
  const branchChange = selectedBranch ? iopBranchPctChange(iopRows, selectedBranch.id, fromY, y) : null;
  const changeRanks = useMemo(() => iopChangeRanks(iopRows, level, fromY, y), [iopRows, level, fromY, y]);
  const byGrowth = [...changeRanks].sort((a, b) => b.v - a.v);
  const fastest = byGrowth[0] ?? null;
  const slowest = byGrowth.at(-1) ?? null;
  const iopFirst = iopYears[0] ?? 1997;
  const iopLast = iopYears.at(-1) ?? latest;

  const bresRanks = useMemo(() => bresRankForYear(placesRows, y), [placesRows, y]);
  const bresChanges = useMemo(() => bresChangeRanks(placesRows, fromY, y), [placesRows, fromY, y]);
  const bresSum = bresUkSum(placesRows, y);
  const bresRegions = bresRegionCount(placesRows, y);

  const shortName = (label: string) => label.replace(/^Manufacture of /, "");
  const shareOf = (id: string, yy: number) => branchShare(weightRows, id, yy);

  const figures: ExplorerFigure[] =
    activeView === "places"
      ? [
          {
            label: `${y} employee jobs`,
            value: bresSum != null ? fmtBresThousands(bresSum) : "—",
            note: placesBranchMode
              ? `${selectedBranch!.sic} · sum of published GB regions`
              : "Thousands · sum of published regions",
          },
          {
            label: "Regions",
            value: String(bresRegions),
            note: placesBranchMode
              ? "Great Britain · no Northern Ireland in Nomis open access"
              : y >= 2024
                ? "2024 provisional · no Northern Ireland"
                : "UK countries and English regions",
          },
          {
            label: "Compared",
            value: `${fromY}→${y}`,
            note: placesBranchMode
              ? `${selectedBranch!.sic} · employee jobs in both years`
              : "Employee jobs in both years",
          },
        ]
      : activeView === "output-jobs"
        ? [
            {
              label: `${y} volume index`,
              value: yearOutput != null ? fmtIndex(yearOutput) : "—",
              note: "Average of months",
            },
            {
              label: `${y} workforce jobs`,
              value: yearJobs != null ? fmtJobsThousands(yearJobs) : "—",
              note: "Thousands · average of quarters",
            },
            {
              label: `${y} share of the economy`,
              value: yearShare != null ? fmtSharePct(yearShare) : "—",
              note: "Manufacturing, % of gross value added",
            },
          ]
        : shareMode && selectedBranch
          ? [
              {
                label: `Share · ${y}`,
                value: (() => {
                  const v = shareOf(selectedBranch.id, y);
                  return v != null ? fmtShareOfMfg(v) : "—";
                })(),
                note: `${selectedBranch.sic} · of manufacturing`,
              },
              {
                label: `Share · ${fromY}`,
                value: (() => {
                  const v = shareOf(selectedBranch.id, fromY);
                  return v != null ? fmtShareOfMfg(v) : "—";
                })(),
                note: `${selectedBranch.sic} · of manufacturing`,
              },
              {
                label: `Volume · ${fromY}→${y}`,
                value: branchChange != null ? fmtPctChange(branchChange) : "—",
                note: "Change in the branch's own output",
              },
            ]
          : shareMode
            ? [
                {
                  label: `Largest · ${y}`,
                  value: largest ? fmtShareOfMfg(largest.share) : "—",
                  note: largest ? `${largest.sic} · ${shortName(largest.label)}` : "",
                },
                {
                  label: `Biggest gain · ${fromY}→${y}`,
                  value: gain ? `${fmtShareOfMfg(gain.from)}→${fmtShareOfMfg(gain.to)}` : "—",
                  note: gain ? shortName(gain.label) : "",
                },
                {
                  label: `Biggest fall · ${fromY}→${y}`,
                  value: fall ? `${fmtShareOfMfg(fall.from)}→${fmtShareOfMfg(fall.to)}` : "—",
                  note: fall ? shortName(fall.label) : "",
                },
              ]
            : selectedBranch
              ? [
                  {
                    label: `${y} volume index`,
                    value: branchYear != null ? fmtIndex(branchYear) : "—",
                    note: `${selectedBranch.sic} · average of months`,
                  },
                  {
                    label: `Volume · ${fromY}→${y}`,
                    value: branchChange != null ? fmtPctChange(branchChange) : "—",
                    note: "Change in the branch's own output",
                  },
                  {
                    label: `${y} all manufacturing`,
                    value: yearOutput != null ? fmtIndex(yearOutput) : "—",
                    note: "Volume index",
                  },
                ]
              : [
                  {
                    label: `${y} all manufacturing`,
                    value: yearOutput != null ? fmtIndex(yearOutput) : "—",
                    note: "Volume index · average of months",
                  },
                  {
                    label: `Fastest growth · ${fromY}→${y}`,
                    value: fastest ? fmtPctChange(fastest.v) : "—",
                    note: fastest ? shortName(fastest.label) : "",
                  },
                  {
                    label: `Steepest fall · ${fromY}→${y}`,
                    value: slowest ? fmtPctChange(slowest.v) : "—",
                    note: slowest ? shortName(slowest.label) : "",
                  },
                ];

  const yearOptions = yearPool.map((yy) => ({ value: String(yy), label: String(yy) }));
  const fromOptions = yearOptions.filter((o) => Number(o.value) <= y);
  const industryOptions = [
    { value: "all", label: "All manufacturing" },
    ...branches.map((b) => ({ value: b.id, label: `${b.sic} · ${b.label}` })),
  ];

  const dirty =
    y !== latest ||
    fromY !== defaultFrom ||
    ((activeView === "anatomy" || activeView === "places") &&
      (level !== "subsection" || industry !== "all")) ||
    (activeView === "anatomy" && measure !== "share");

  const anatomyTitle = selectedBranch
    ? `The production anatomy · ${selectedBranch.sic} · ${selectedBranch.label} · ${fromY}→${y}`
    : `The production anatomy · ${measureLabel(shareMode ? "share" : "volume").toLowerCase()} · ${fromY}→${y}`;

  const placesTitle = selectedBranch
    ? `Where ${selectedBranch.sic} jobs are · regions · ${fromY}→${y}`
    : `Where manufacturing jobs are · regions · ${fromY}→${y}`;

  return (
    <>
      <ExplorerHead views={VIEWS} view={activeView} onView={(id) => sync({ view: id })} />
      {activeView !== "data" && <FigureStrip figures={figures} />}

      {activeView !== "data" && (
        <ControlRow>
          {activeView === "anatomy" && iopReady && (
            <>
              <MenuControl
                label="Measure"
                value={shareMode ? "share" : "volume"}
                options={[
                  ...(weightsReady ? [{ value: "share", label: measureLabel("share") }] : []),
                  { value: "volume", label: measureLabel("volume") },
                ]}
                onChange={(v) => sync({ measure: v as AnatomyMeasure, from: 0 })}
              />
              <MenuControl
                label="Branches"
                value={level}
                options={IOP_LEVELS.map((l) => ({ value: l, label: levelLabel(l) }))}
                onChange={(v) => sync({ level: v as IopLevel })}
              />
              <MenuControl
                label="Industry"
                value={selectedBranch?.id ?? "all"}
                options={industryOptions}
                onChange={(v) => sync({ industry: v })}
              />
            </>
          )}
          {activeView === "places" && (bresReady || bresDivisionReady) && (
            <>
              {iopReady && bresDivisionReady ? (
                <>
                  <MenuControl
                    label="Branches"
                    value={level}
                    options={IOP_LEVELS.map((l) => ({ value: l, label: levelLabel(l) }))}
                    onChange={(v) => sync({ level: v as IopLevel })}
                  />
                  <MenuControl
                    label="Industry"
                    value={selectedBranch?.id ?? "all"}
                    options={industryOptions}
                    onChange={(v) => sync({ industry: v })}
                  />
                </>
              ) : null}
              <MenuControl
                label="From"
                value={String(fromY)}
                options={fromOptions.length ? fromOptions : yearOptions}
                onChange={(v) => sync({ from: Number(v) })}
              />
            </>
          )}
          {activeView === "anatomy" && iopReady && (
            <MenuControl
              label="From"
              value={String(fromY)}
              options={fromOptions.length ? fromOptions : yearOptions}
              onChange={(v) => sync({ from: Number(v) })}
            />
          )}
          {(activeView === "places"
            ? bresReady || bresDivisionReady
            : activeView === "output-jobs"
              ? outputReady || jobsReady
              : iopReady || outputReady) && (
            <MenuControl
              label="Year"
              value={String(y)}
              options={yearOptions}
              onChange={(v) => sync({ year: Number(v) })}
            />
          )}
          {dirty ? (
            <ResetButton
              onClick={() =>
                sync({ year: latest, from: 0, level: "subsection", industry: "all", measure: "share" })
              }
            />
          ) : null}
        </ControlRow>
      )}

      <Stage
        title={
          activeView === "data"
            ? "Data · Manufacturing"
            : activeView === "output-jobs"
              ? `Output and jobs · all manufacturing · ${y}`
              : activeView === "places"
                ? placesTitle
                : anatomyTitle
        }
        meta={
          activeView === "output-jobs"
            ? "UK · volume index · thousands of jobs · % of the economy"
            : activeView === "places"
              ? placesBranchMode
                ? "Great Britain regions · thousands of employee jobs · one branch"
                : "UK countries and English regions · thousands of employee jobs"
              : activeView === "data"
                ? "UK · branches, all manufacturing and regions"
                : shareMode
                  ? "UK · share of manufacturing · ONS production weights"
                  : "UK · volume index · each branch against itself"
        }
        follow={
          <EnergyStageFollow
            domain="manufacturing"
            view={activeView}
            selection={{ year: y, industry: selectedBranch?.id ?? null }}
            label={`Manufacturing · ${activeView}`}
          />
        }
        foot={
          <FigureRecord
            source={
              activeView === "output-jobs"
                ? ENERGY_SOURCE.manufacturingLandscape
                : activeView === "places"
                  ? placesBranchMode
                    ? ENERGY_SOURCE.manufacturingBresDivision
                    : ENERGY_SOURCE.manufacturingBres
                  : activeView === "anatomy"
                    ? ENERGY_SOURCE.manufacturingIopBranches
                    : ENERGY_SOURCE.manufacturingIop
            }
            definition={
              activeView === "output-jobs"
                ? [
                    "All of manufacturing, three ways: how much it makes (volume index), how many people work in it, and its share of the economy.",
                    "Each is a separate ONS series with its own unit, so each has its own chart.",
                  ]
                : activeView === "places"
                  ? placesBranchMode
                    ? [
                        `Employee jobs in ${selectedBranch!.sic} (${selectedBranch!.label}) by GB region from Nomis open-access BRES.`,
                        "Counts workplaces for that branch, not plants on a map. Broad branches sum their detailed divisions.",
                      ]
                    : [
                        "Manufacturing employee jobs by UK region from BRES Table 4, for one year and between two years.",
                        "Counts where people are employed, not where factories are. Pick an industry to see one branch’s places.",
                      ]
                  : activeView === "data"
                    ? [
                        "Tables for manufacturing branches (volume index and production weights), all manufacturing, and regional jobs.",
                      ]
                    : shareMode
                      ? [
                          "Each branch's share of manufacturing, from the weights ONS uses to build the Index of Production.",
                          "Shares at one level add up to all of manufacturing, so each strip is the whole and the two strips can be compared.",
                        ]
                      : [
                          "Each branch's volume index, compared between two years.",
                          "An index tracks a branch against itself, not its size, so branches are compared by how much they moved.",
                        ]
            }
            method={
              activeView === "output-jobs"
                ? [
                    "Volume: monthly Index of Production; year figure = average of months. Jobs: quarterly, seasonally adjusted; year figure = average of quarters.",
                    "Share of the economy: manufacturing's ONS weight in gross value added, annual.",
                  ]
                : activeView === "places"
                  ? placesBranchMode
                    ? [
                        "Nomis NM_189_1 Employees · SIC divisions × GB regions. Values stored as thousands of employee jobs.",
                        "Great Britain only — Northern Ireland is not in the open-access extract. Rounded counts.",
                      ]
                    : [
                        "Thousands of employee jobs as published in BRES Table 4 (Manufacturing · Total employees).",
                        "2024 is provisional and has no Northern Ireland figure. Branch cuts use Nomis open access.",
                      ]
                  : activeView === "data"
                    ? [
                        "Branch tables show annual averages of the monthly index, and ONS weights in parts per thousand of all production.",
                        "Regional jobs: Table 4 for all manufacturing; Nomis for division × region.",
                      ]
                    : shareMode
                      ? [
                          "Share = branch weight ÷ manufacturing weight in the same year. ONS publishes weights in parts per thousand of all production (mining, manufacturing, energy and water).",
                          "Weights reflect value added, not volume: a branch can grow in volume while its share falls.",
                          "ONS publishes beverages and tobacco (divisions 11 and 12) as one branch.",
                        ]
                      : [
                          "Year figures are averages of the published months.",
                          "ONS publishes beverages and tobacco (divisions 11 and 12) as one branch.",
                        ]
            }
            dataHref={
              activeView === "output-jobs"
                ? `/data?record=${EMPLOYMENT_ID}`
                : activeView === "places"
                  ? placesBranchMode
                    ? `/data?record=${BRES_BY_DIVISION_REGION_ID}`
                    : `/data?record=${BRES_EMPLOYEE_JOBS_ID}`
                  : activeView === "anatomy"
                    ? `/data?record=${IOP_BY_DIVISION_ID}`
                    : `/data?record=${OUTPUT_INDEX_ID}`
            }
          />
        }
      >
        {activeView === "data" ? (
          !outputReady &&
          !shareLine.points.length &&
          !jobsReady &&
          !prodLine.points.length &&
          !iopReady &&
          !bresReady ? (
            <EmptyStage label="Manufacturing series unavailable">
              National manufacturing figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              {iopReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Volume index by branch · annual average · {y}
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Industry code</th>
                          <th scope="col">Branch</th>
                          <th scope="col">Level</th>
                          <th scope="col">{y}</th>
                          <th scope="col">{fromY}→{y}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listIopBranches(iopRows, "subsection").map((b) => {
                          const v = iopBranchYearMean(iopRows, b.id, y);
                          const ch = iopBranchPctChange(iopRows, b.id, fromY, y);
                          return (
                            <tr key={`sub-${b.id}`}>
                              <th scope="row">{b.sic}</th>
                              <td>{b.label}</td>
                              <td>Broad</td>
                              <td>{v != null ? fmtIndex(v) : "—"}</td>
                              <td>{ch != null ? fmtPctChange(ch) : "—"}</td>
                            </tr>
                          );
                        })}
                        {listIopBranches(iopRows, "division").map((b) => {
                          const v = iopBranchYearMean(iopRows, b.id, y);
                          const ch = iopBranchPctChange(iopRows, b.id, fromY, y);
                          return (
                            <tr key={`div-${b.id}`}>
                              <th scope="row">{b.sic}</th>
                              <td>{b.label}</td>
                              <td>Detailed</td>
                              <td>{v != null ? fmtIndex(v) : "—"}</td>
                              <td>{ch != null ? fmtPctChange(ch) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {weightsReady ? (
                (() => {
                  const wy = clampYear(y, weightYears, weightYears.at(-1)!);
                  const wf = clampYear(fromY, weightYears, weightYears[0]!);
                  const rows = [
                    ...listIopBranches(iopRows, "subsection").map((b) => ({ b, lvl: "Broad" })),
                    ...listIopBranches(iopRows, "division").map((b) => ({ b, lvl: "Detailed" })),
                  ];
                  return (
                    <div className={t.tableGroup}>
                      <p className={t.stageTitle}>
                        Production weights by branch · parts per thousand of all production · {wy}
                      </p>
                      <div className={t.tableWrap}>
                        <table className={t.table}>
                          <thead>
                            <tr>
                              <th scope="col">Industry code</th>
                              <th scope="col">Branch</th>
                              <th scope="col">Level</th>
                              <th scope="col">Weight {wy}</th>
                              <th scope="col">Share of manufacturing {wf}</th>
                              <th scope="col">Share of manufacturing {wy}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(({ b, lvl }) => {
                              const w = branchWeight(weightRows, b.id, wy);
                              const a = branchShare(weightRows, b.id, wf);
                              const z = branchShare(weightRows, b.id, wy);
                              return (
                                <tr key={`w-${lvl}-${b.id}`}>
                                  <th scope="row">{b.sic}</th>
                                  <td>{b.label}</td>
                                  <td>{lvl}</td>
                                  <td>{w != null ? fmtIndex(w) : "—"}</td>
                                  <td>{a != null ? fmtShareOfMfg(a) : "—"}</td>
                                  <td>{z != null ? fmtShareOfMfg(z) : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              ) : null}
              {bresReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Manufacturing employee jobs by region · thousands ·{" "}
                    {bresYearsAll.includes(y) ? y : (bresYearsAll.at(-1) ?? y)}
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Region</th>
                          <th scope="col">
                            {bresYearsAll.includes(y) ? y : (bresYearsAll.at(-1) ?? y)}
                          </th>
                          <th scope="col">
                            {fromY}→{bresYearsAll.includes(y) ? y : (bresYearsAll.at(-1) ?? y)}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(bresYearsAll.includes(y)
                          ? bresRankForYear(bresRows, y)
                          : bresRankForYear(bresRows, bresYearsAll.at(-1) ?? y)
                        ).map((r) => {
                          const toYear = bresYearsAll.includes(y) ? y : (bresYearsAll.at(-1) ?? y);
                          const ch = bresChangeRanks(bresRows, fromY, toYear).find(
                            (c) => c.id === r.id,
                          );
                          return (
                            <tr key={r.id}>
                              <th scope="row">{r.label}</th>
                              <td>{fmtBresThousands(r.v)}</td>
                              <td>{ch != null ? fmtPctChange(ch.v) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {bresDivisionReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Employee jobs by division and region · sample year{" "}
                    {bresYearsOf(bresDivisionRows).includes(y)
                      ? y
                      : (bresYearsOf(bresDivisionRows).at(-1) ?? y)}{" "}
                    · chemicals
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Region</th>
                          <th scope="col">Chemicals employee jobs (thousands)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bresRankForYear(
                          bresDivisionRowsForBranch(bresDivisionRows, {
                            id: "sic-20",
                            sic: "20",
                            label: "Chemicals",
                            classification: "division",
                          }),
                          bresYearsOf(bresDivisionRows).includes(y)
                            ? y
                            : (bresYearsOf(bresDivisionRows).at(-1) ?? y),
                        ).map((r) => (
                          <tr key={`d20-${r.id}`}>
                            <th scope="row">{r.label}</th>
                            <td>{fmtBresThousands(r.v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              <AnnualSeriesTable
                title="Manufacturing volume index · all manufacturing"
                unit="index"
                points={outputSeries.points}
                format={(v) => fmtIndex(v)}
                emptyLabel="Volume index unavailable"
                cadence="monthly"
              />
              <AnnualSeriesTable
                title="Manufacturing share of the economy"
                unit="%"
                points={shareLine.points}
                format={(v) => fmtSharePct(v).replace("%", "")}
                emptyLabel="Share unavailable"
                cadence="annual"
              />
              <AnnualSeriesTable
                title="Manufacturing workforce jobs"
                unit="thousands"
                points={jobsLine.points}
                format={(v) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                emptyLabel="Employment unavailable"
                cadence="quarterly"
              />
              <AnnualSeriesTable
                title="Manufacturing output per hour"
                unit="index · 2023 = 100"
                points={prodLine.points}
                format={(v) => fmtIndex(v)}
                emptyLabel="Productivity unavailable"
                cadence="quarterly"
              />
            </div>
          )
        ) : activeView === "places" ? (
          !(placesBranchMode ? placesRows.length : bresReady) ? (
            <EmptyStage label="Regional employee jobs unavailable">
              {placesBranchMode
                ? "Jobs by industry and region are not available for this industry."
                : "Manufacturing employee jobs by region are not available right now."}
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Employee jobs · thousands · {y}
                  {placesBranchMode
                    ? ` · ${selectedBranch!.sic}`
                    : y >= 2024
                      ? " · NI not published"
                      : ""}
                </h3>
                {bresRanks.length === 0 ? (
                  <EmptyStage label="No regions for this year">
                    Try another Year in the control row.
                  </EmptyStage>
                ) : (
                  <RankBars
                    label={
                      placesBranchMode
                        ? `${selectedBranch!.sic} employee jobs · ${y}`
                        : `Manufacturing employee jobs · ${y}`
                    }
                    rows={bresRanks}
                    format={fmtBresThousands}
                  />
                )}
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Change · {fromY}→{y} · employee jobs
                  {placesBranchMode ? ` · ${selectedBranch!.sic}` : ""}
                </h3>
                {bresChanges.length === 0 ? (
                  <EmptyStage label="No overlapping region years">
                    Try another From year
                    {placesBranchMode ? "." : " — 2024 has no Northern Ireland row."}
                  </EmptyStage>
                ) : (
                  <ChangeRows
                    label={`Employee jobs · ${fromY} to ${y}`}
                    fromLabel={String(fromY)}
                    toLabel={String(y)}
                    rows={bresChanges.map((r) => ({
                      id: r.id,
                      label: `${r.label} · ${fmtPctChange(r.v)}`,
                      from: r.from,
                      to: r.to,
                    }))}
                    format={fmtBresThousands}
                  />
                )}
              </section>
            </div>
          )
        ) : activeView === "output-jobs" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Volume index · {outputYears[0] ?? "—"}–{outputYears.at(-1) ?? "—"}
              </h3>
              {!outputReady || outputSeries.points.length === 0 ? (
                <EmptyStage label="Output index unavailable">
                  Manufacturing volume figures are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Manufacturing output index"
                  series={[outputSeries]}
                  cadence="monthly"
                  kind="line"
                  format={(v) => fmtIndex(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>Workforce jobs · thousands · seasonally adjusted</h3>
              {!jobsReady || jobsLine.points.length === 0 ? (
                <EmptyStage label="Employment series unavailable">
                  Workforce jobs figures are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Manufacturing workforce jobs"
                  series={[jobsLine]}
                  cadence="quarterly"
                  kind="line"
                  format={(v) => fmtJobsThousands(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Share of the economy · % of gross value added · {shareYears[0] ?? "—"}–
                {shareYears.at(-1) ?? "—"}
              </h3>
              {shareLine.points.length === 0 ? (
                <EmptyStage label="Economy share unavailable">
                  Manufacturing share of the economy is not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Manufacturing share of the economy"
                  series={[shareLine]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtSharePct(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
          </div>
        ) : !iopReady ? (
          <EmptyStage label="Manufacturing branches unavailable">
            Manufacturing branch figures are not available right now.
          </EmptyStage>
        ) : shareMode ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Share of manufacturing · {levelLabel(level).toLowerCase()} · {y}
              </h3>
              {toCells.length === 0 ? (
                <EmptyStage label="No weights for this year">Try another Year.</EmptyStage>
              ) : level === "subsection" ? (
                (() => {
                  const cards = [...toCells].sort((a, b) => b.share - a.share);
                  const max = Math.max(...cards.map((c) => c.share), 1e-6);
                  const was = new Map(fromCells.map((c) => [c.id, c.share]));
                  return (
                    <ul className={s.specimens} aria-label={`Share of manufacturing by branch · ${y}`}>
                      {cards.map((c) => {
                        const plate = MANUFACTURING_PLATES[c.sic as keyof typeof MANUFACTURING_PLATES];
                        const before = was.get(c.id);
                        const on = selectedBranch?.id === c.id;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              className={s.specimen}
                              data-selected={on ? "true" : undefined}
                              aria-pressed={on}
                              aria-label={`${c.sic} ${c.label}: ${fmtShareOfMfg(c.share)} of manufacturing in ${y}${
                                before != null ? `, ${fmtShareOfMfg(before)} in ${fromY}` : ""
                              }`}
                              onClick={() => sync({ industry: on ? "all" : c.id })}
                            >
                              {plate ? (
                                <Plate src={plate.src} fit="contain" className={s.specimenPlate} />
                              ) : (
                                <span className={s.specimenPlate} aria-hidden="true" />
                              )}
                              <span className={`bo-label ${s.specimenName}`}>
                                {c.sic} · {c.label}
                              </span>
                              <span className={`bo-fig ${s.specimenShare}`}>{fmtShareOfMfg(c.share)}</span>
                              <span className={s.specimenBar} aria-hidden="true">
                                <i style={{ width: `${(c.share / max) * 100}%` }} />
                              </span>
                              <span className={s.specimenCount}>
                                {before != null && fromY !== y ? `${fmtShareOfMfg(before)} in ${fromY}` : "of manufacturing"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()
              ) : (
                <RankBars
                  label={`Share of manufacturing by branch · ${y}`}
                  rows={[...toCells]
                    .sort((a, b) => b.share - a.share)
                    .map((c) => ({
                      id: c.id,
                      label: `${c.sic} · ${c.label}`,
                      v: c.share,
                      active: selectedBranch?.id === c.id,
                    }))}
                  format={fmtShareOfMfg}
                  onSelect={(id) => sync({ industry: selectedBranch?.id === id ? "all" : id })}
                />
              )}
            </section>
            {selectedBranch ? (
              <>
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    Share of manufacturing · {selectedBranch.sic} · {weightYears[0]}–{weightYears.at(-1)}
                  </h3>
                  {!branchShareLine || branchShareLine.points.length === 0 ? (
                    <EmptyStage label="No weights for this branch">Try another industry.</EmptyStage>
                  ) : (
                    <TimeChart
                      label={branchShareLine.label}
                      series={[branchShareLine]}
                      cadence="annual"
                      kind="line"
                      marks
                      format={(v) => fmtShareOfMfg(v)}
                      rules={[
                        { id: "from", t: fromY, label: String(fromY), active: false },
                        { id: "year", t: y, label: String(y), active: true },
                      ]}
                    />
                  )}
                </section>
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    Volume index · {selectedBranch.sic} · {iopFirst}–{iopLast}
                  </h3>
                  {!branchSeries || branchSeries.points.length === 0 ? (
                    <EmptyStage label="No volume figures for this branch">Try another industry.</EmptyStage>
                  ) : (
                    <TimeChart
                      label={branchSeries.label}
                      series={[branchSeries]}
                      cadence="monthly"
                      kind="line"
                      format={(v) => fmtIndex(v)}
                      rules={[
                        { id: "from", t: fromY, label: String(fromY), active: false },
                        { id: "year", t: y, label: String(y), active: true },
                      ]}
                    />
                  )}
                </section>
              </>
            ) : (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Share of manufacturing · {fromY}→{y} · largest first
                </h3>
                {shareChanges.length === 0 ? (
                  <EmptyStage label="No branches in both years">Try another From year.</EmptyStage>
                ) : (
                  <ChangeRows
                    label={`Share of manufacturing · ${fromY} to ${y}`}
                    fromLabel={String(fromY)}
                    toLabel={String(y)}
                    rows={shareChanges}
                    format={fmtShareOfMfg}
                  />
                )}
              </section>
            )}
          </div>
        ) : (
          <div className={s.stack}>
            {selectedBranch ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Volume index · {selectedBranch.sic} · {iopFirst}–{iopLast}
                </h3>
                {!branchSeries || branchSeries.points.length === 0 ? (
                  <EmptyStage label="No volume figures for this branch">Try another industry.</EmptyStage>
                ) : (
                  <TimeChart
                    label={branchSeries.label}
                    series={[branchSeries]}
                    cadence="monthly"
                    kind="line"
                    format={(v) => fmtIndex(v)}
                    rules={[
                      { id: "from", t: fromY, label: String(fromY), active: false },
                      { id: "year", t: y, label: String(y), active: true },
                    ]}
                  />
                )}
              </section>
            ) : (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Volume index · {fromY}→{y} · {levelLabel(level).toLowerCase()}
                </h3>
                {changeRanks.length === 0 ? (
                  <EmptyStage label="No branches in both years">Try another From year.</EmptyStage>
                ) : (
                  <ChangeRows
                    label={`Volume index · ${fromY} to ${y}`}
                    fromLabel={String(fromY)}
                    toLabel={String(y)}
                    rows={changeRanks.map((r) => ({
                      id: r.id,
                      label: `${r.label} · ${fmtPctChange(r.v)}`,
                      from: r.from,
                      to: r.to,
                    }))}
                    format={fmtIndex}
                  />
                )}
              </section>
            )}
          </div>
        )}
      </Stage>
    </>
  );
}
