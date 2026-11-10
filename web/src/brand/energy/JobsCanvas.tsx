"use client";

/**
 * Energy Domain 09 — Jobs & Productivity.
 * Flagship: The Labour Landscape (national).
 * Productivity machine: official per-hour / per-job + hours component.
 * Regional employee jobs live on Manufacturing › Places (legacy `view=atlas` redirects there —
 * see legacy-views.ts); this domain only keeps the regional table on Data.
 * Never IoP÷jobs; employee jobs ≠ workforce jobs.
 */

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { RankBars, TimeChart } from "../instrument/TimeChart";
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
  ASHE_EARNINGS_ID,
  EMPLOYMENT_ID,
  OUTPUT_PER_HOUR_ID,
  OUTPUT_PER_JOB_ID,
  PAY_MEASURES,
  PAY_SHEETS,
  PRODUCTIVITY_HOURS_ID,
  PRODUCTIVITY_MEASURES,
  asheDivisionChangeRanks,
  asheDivisionRanks,
  ashePayRows,
  asheSectionChange,
  asheSectionMedian,
  bresRankForYear,
  bresYearsOf,
  employmentSeries,
  employmentYearMean,
  fmtBresThousands,
  fmtGbp,
  fmtIndex,
  fmtJobsThousands,
  fmtPctChange,
  outputIndexSeries,
  outputIndexYearMean,
  outputPerJobSeries,
  outputPerJobYearMean,
  productivityHoursSeries,
  productivityHoursYearMean,
  productivitySeries,
  productivityYearMean,
  completeMonthlyYears,
  completeQuarterlyYears,
  yearsOf,
  type JobsPack,
  type PayMeasure,
  type PaySheet,
  type ProductivityMeasure,
} from "./jobs-model";
import s from "./generation.module.css";
import { INDUSTRIAL_WORK_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...INDUSTRIAL_WORK_VIEWS];

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

export function JobsCanvas({ pack }: { pack: JobsPack }) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("industrial-work");
  const employmentRows = pack.employment?.observations ?? [];
  const outputRows = pack.output?.observations ?? [];
  const productivityRows = pack.productivity?.observations ?? [];
  const perJobRows = pack.outputPerJob?.observations ?? [];
  const hoursRows = pack.productivityHours?.observations ?? [];
  const asheRows = pack.asheEarnings?.observations ?? [];
  const bresRows = pack.bresByRegion?.observations ?? [];

  const jobsLine = employmentSeries(employmentRows);
  const outputSeries = outputIndexSeries(outputRows);
  const prodLine = productivitySeries(productivityRows);
  const perJobLine = outputPerJobSeries(perJobRows);
  const hoursLine = productivityHoursSeries(hoursRows);

  const jobYears = completeQuarterlyYears(employmentRows);
  const outputYears = completeMonthlyYears(outputRows);
  const bresYearsAll = useMemo(() => bresYearsOf(bresRows), [bresRows]);
  const landscapeYears = jobYears.filter((yy) => outputYears.includes(yy));
  const latestNational = landscapeYears.at(-1) ?? 2025;

  const [view, setView] = useState(() => {
    const v = searchParams.get("view");
    if (v === "jobs-output") return "landscape";
    return VIEWS.some((x) => x.id === v) ? v! : "landscape";
  });
  const [year, setYear] = useState(() => Number(searchParams.get("year") || latestNational));
  const [measure, setMeasure] = useState<ProductivityMeasure>(() =>
    PRODUCTIVITY_MEASURES.includes(searchParams.get("measure") as ProductivityMeasure)
      ? (searchParams.get("measure") as ProductivityMeasure)
      : "hour",
  );
  const [payMeasure, setPayMeasure] = useState<PayMeasure>(() =>
    PAY_MEASURES.includes(searchParams.get("pay_measure") as PayMeasure)
      ? (searchParams.get("pay_measure") as PayMeasure)
      : "weekly_gross",
  );
  const [paySheet, setPaySheet] = useState<PaySheet>(() =>
    PAY_SHEETS.includes(searchParams.get("sheet") as PaySheet)
      ? (searchParams.get("sheet") as PaySheet)
      : "Full-Time",
  );

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        year: number;
        measure: ProductivityMeasure;
        pay_measure: PayMeasure;
        sheet: PaySheet;
      }>,
    ) => {
      const next = {
        view,
        year,
        measure,
        pay_measure: payMeasure,
        sheet: paySheet,
        ...patch,
      };
      const nextView = next.view === "jobs-output" ? "landscape" : next.view;
      setView(nextView);
      setYear(next.year);
      setMeasure(next.measure);
      setPayMeasure(next.pay_measure);
      setPaySheet(next.sheet);
      writeUrl({
        view: nextView,
        year: nextView === "pay" ? null : next.year,
        measure: nextView === "productivity" ? next.measure : null,
        pay_measure: nextView === "pay" ? next.pay_measure : null,
        sheet: nextView === "pay" ? next.sheet : null,
      });
    },
    [view, year, measure, payMeasure, paySheet, writeUrl],
  );

  const activeView = view === "jobs-output" ? "landscape" : view;

  const productivityYears = completeQuarterlyYears(measure === "job" ? perJobRows : productivityRows);
  const activeYears = activeView === "productivity" ? productivityYears : landscapeYears;
  const latest = activeYears.at(-1) ?? latestNational;
  const y = clampYear(year, activeYears, latest);

  const yearJobs = employmentYearMean(employmentRows, y);
  const yearOutput = outputIndexYearMean(outputRows, y);
  const yearProd = productivityYearMean(productivityRows, y);
  const yearPerJob = outputPerJobYearMean(perJobRows, y);
  const yearHours = productivityHoursYearMean(hoursRows, y);
  const activeProd = measure === "job" ? yearPerJob : yearProd;

  const jobsReady = Boolean(pack.employment?.observations.length);
  const outputReady = Boolean(pack.output?.observations.length);
  const prodReady = Boolean(pack.productivity?.observations.length);
  const perJobReady = Boolean(pack.outputPerJob?.observations.length);
  const hoursReady = Boolean(pack.productivityHours?.observations.length);
  const asheReady = Boolean(pack.asheEarnings?.observations.length);
  const bresReady = Boolean(pack.bresByRegion?.observations.length);

  const payCut = useMemo(
    () => ashePayRows(asheRows, payMeasure, paySheet),
    [asheRows, payMeasure, paySheet],
  );
  const paySection = asheSectionMedian(payCut);
  const paySectionCh = asheSectionChange(payCut);
  const payRanks = useMemo(() => asheDivisionRanks(payCut), [payCut]);
  const payChanges = useMemo(() => asheDivisionChangeRanks(payCut), [payCut]);

  const figures: ExplorerFigure[] =
    activeView === "pay"
      ? [
          {
            label: payMeasure === "hourly_ex_ot" ? "Manufacturing median hourly" : "Manufacturing median weekly",
            value: paySection != null ? fmtGbp(paySection, payMeasure) : "—",
            note: `${paySheet === "Full-Time" ? "Full-time" : "All employees"} · all manufacturing · cash · 2025`,
          },
          {
            label: "Year-on-year",
            value: paySectionCh != null ? fmtPctChange(paySectionCh) : "—",
            note: "Published annual percentage change",
          },
          {
            label: "Branches shown",
            value: String(payRanks.length || "—"),
            note: "Industries with a published median",
          },
        ]
      : activeView === "productivity"
      ? [
          {
            label: measure === "job" ? `${y} output per job` : `${y} output per hour`,
            value: activeProd != null ? fmtIndex(activeProd) : "—",
            note: "2023 = 100 · seasonally adjusted · mean of quarters",
          },
          {
            label: `${y} hours index`,
            value: yearHours != null ? fmtIndex(yearHours) : "—",
            note: "Hours worked · 2023 = 100",
          },
          {
            label: `${y} workforce jobs`,
            value: yearJobs != null ? fmtJobsThousands(yearJobs) : "—",
            note: "Thousands · average of quarters",
          },
        ]
      : [
          {
            label: `${y} workforce jobs`,
            value: yearJobs != null ? fmtJobsThousands(yearJobs) : "—",
            note: "Thousands · seasonally adjusted · mean of quarters",
          },
          {
            label: `${y} volume index`,
            value: yearOutput != null ? fmtIndex(yearOutput) : "—",
            note: "Index of Production · mean of months",
          },
          {
            label: `${y} output / hour`,
            value: yearProd != null ? fmtIndex(yearProd) : "—",
            note: "2023 = 100 · average of quarters",
          },
        ];

  const yearOptions = activeYears.map((yy) => ({ value: String(yy), label: String(yy) }));

  const dirty =
    (activeView !== "pay" && y !== latest) ||
    (activeView === "productivity" && measure !== "hour") ||
    (activeView === "pay" && (payMeasure !== "weekly_gross" || paySheet !== "Full-Time"));

  return (
    <>
      <ExplorerHead views={VIEWS} view={activeView} onView={(id) => sync({ view: id })} />
      {activeView !== "data" && <FigureStrip figures={figures} />}

      {activeView !== "data" && (
        <ControlRow>
          {activeView === "productivity" && (
            <MenuControl
              label="Measure"
              value={measure}
              options={[
                { value: "hour", label: "Output per hour" },
                { value: "job", label: "Output per job" },
              ]}
              onChange={(v) => sync({ measure: v as ProductivityMeasure })}
            />
          )}
          {activeView === "pay" && asheReady && (
            <>
              <MenuControl
                label="Pay"
                value={payMeasure}
                options={[
                  { value: "weekly_gross", label: "Weekly · gross" },
                  { value: "hourly_ex_ot", label: "Hourly · excluding overtime" },
                ]}
                onChange={(v) => sync({ pay_measure: v as PayMeasure })}
              />
              <MenuControl
                label="Employees"
                value={paySheet}
                options={[
                  { value: "Full-Time", label: "Full-time" },
                  { value: "All", label: "All employees" },
                ]}
                onChange={(v) => sync({ sheet: v as PaySheet })}
              />
            </>
          )}
          {activeView !== "pay" && yearOptions.length > 1 ? (
            <MenuControl
              label="Year"
              value={String(y)}
              options={yearOptions}
              onChange={(v) => sync({ year: Number(v) })}
            />
          ) : null}
          {dirty ? (
            <ResetButton
              onClick={() =>
                sync({
                  year: latest,
                  measure: "hour",
                  pay_measure: "weekly_gross",
                  sheet: "Full-Time",
                })
              }
            />
          ) : null}
        </ControlRow>
      )}

      <Stage
        title={
          activeView === "data"
            ? "Data · Jobs & Productivity"
            : activeView === "productivity"
              ? `Productivity machine · ${y}`
              : activeView === "pay"
                ? `Manufacturing pay · 2025 · ${paySheet === "Full-Time" ? "full-time" : "all employees"}`
                : `The labour landscape · ${y}`
        }
        meta={
          activeView === "productivity"
            ? measure === "job"
              ? "Official output per job · hours component · not output divided by jobs"
              : "Official output per hour · hours component · not output divided by jobs"
            : activeView === "pay"
              ? payMeasure === "hourly_ex_ot"
                ? "UK · median hourly pay excluding overtime · cash pounds"
                : "UK · median weekly gross pay · cash pounds"
              : activeView === "data"
                ? "Observation tables · ONS"
                : "UK · manufacturing · jobs · volume · productivity"
        }
        follow={
          <EnergyStageFollow
            domain="industrial-work"
            view={activeView}
            selection={{ year: y }}
            label={`Jobs · ${activeView}`}
          />
        }
        foot={
          <FigureRecord
            source={energySource("industrial-work", activeView, activeView === "productivity"
                ? ENERGY_SOURCE.jobsProductivity
                : activeView === "pay"
                  ? ENERGY_SOURCE.jobsPay
                  : ENERGY_SOURCE.jobsLandscape)}
            definition={
              activeView === "productivity"
                ? [
                    "Productivity machine: official manufacturing output-per-hour or output-per-job index, with the published hours component.",
                    "Hours worked are not reconstructed from workforce jobs. Whole-economy labour productivity sits in Economy.",
                  ]
                : activeView === "pay"
                    ? [
                        "ASHE median earnings for manufacturing as a whole and by two-digit industry — cash pounds for one April pay period.",
                        "Median is the preferred average. Full-time and all-employee figures are different populations.",
                      ]
                  : activeView === "data"
                    ? [
                        "Tables for manufacturing workforce jobs, volume, productivity indexes, hours, pay and regional employee jobs.",
                      ]
                    : [
                        "National manufacturing jobs set beside volume and output per hour — three separate ONS series.",
                        "Place ranks live on Manufacturing › Places. Job losses do not prove output losses.",
                      ]
            }
            method={
              activeView === "productivity"
                ? [
                    "ONS PRDY: quarterly indexes (2023 = 100, seasonally adjusted); year figure = mean of quarters.",
                    "Output per hour is published directly by ONS, not derived as volume ÷ jobs; the hours chart is the official DK3V index, not Workforce Jobs.",
                  ]
                : activeView === "pay"
                    ? [
                        "ONS ASHE Table 4 (2025 revised). Weekly = gross; hourly = excluding overtime. Year-on-year is the annual percentage change as ONS publishes it; prior-year pounds are not published in this pin and are not back-calculated.",
                        "Suppressed industries are omitted. This pin is one year — not a long cash time series. Real pounds would need Economy CPIH and a clear label.",
                      ]
                  : activeView === "data"
                    ? [
                        "Year figures for quarterly series are means of quarters; volume uses means of months.",
                        "Regional jobs: Table 4 for all manufacturing; Nomis for division × region. Pay: ASHE Table 4 medians.",
                      ]
                    : [
                        "Jobs: ONS workforce jobs, quarterly seasonally adjusted thousands; year = mean of quarters. Volume: Index of Production, monthly; year = mean of months.",
                        "Productivity: official ONS output-per-hour series — never Index of Production divided by jobs.",
                      ]
            }
            dataHref={
              activeView === "data"
                ? "/data"
                : activeView === "productivity"
                  ? measure === "job"
                    ? `/data?record=${OUTPUT_PER_JOB_ID}`
                    : `/data?record=${OUTPUT_PER_HOUR_ID}`
                  : activeView === "pay"
                    ? `/data?record=${ASHE_EARNINGS_ID}`
                    : `/data?record=${EMPLOYMENT_ID}`
            }
          />
        }
      >
        {activeView === "data" ? (
          !jobsReady && !outputReady && !prodReady && !bresReady && !asheReady ? (
            <EmptyStage label="Jobs series unavailable">
              Manufacturing employment figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              {jobsReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>Workforce jobs · thousands · seasonally adjusted · year means</p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col">Jobs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobYears.map((yy) => {
                          const v = employmentYearMean(employmentRows, yy);
                          return (
                            <tr key={yy}>
                              <th scope="row">{yy}</th>
                              <td>{v != null ? fmtJobsThousands(v) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {outputReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>Volume index · year means</p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col">Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outputYears.map((yy) => {
                          const v = outputIndexYearMean(outputRows, yy);
                          return (
                            <tr key={yy}>
                              <th scope="row">{yy}</th>
                              <td>{v != null ? fmtIndex(v) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {prodReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>Output per hour · 2023 = 100 · year means</p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col">Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearsOf(productivityRows).map((yy) => {
                          const v = productivityYearMean(productivityRows, yy);
                          return (
                            <tr key={yy}>
                              <th scope="row">{yy}</th>
                              <td>{v != null ? fmtIndex(v) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {perJobReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>Output per job · 2023 = 100 · year means</p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col">Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearsOf(perJobRows).map((yy) => {
                          const v = outputPerJobYearMean(perJobRows, yy);
                          return (
                            <tr key={yy}>
                              <th scope="row">{yy}</th>
                              <td>{v != null ? fmtIndex(v) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {hoursReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>Productivity hours · 2023 = 100 · year means</p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col">Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearsOf(hoursRows).map((yy) => {
                          const v = productivityHoursYearMean(hoursRows, yy);
                          return (
                            <tr key={yy}>
                              <th scope="row">{yy}</th>
                              <td>{v != null ? fmtIndex(v) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {bresReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Employee jobs by region · thousands ·{" "}
                    {bresYearsAll.includes(y) ? y : (bresYearsAll.at(-1) ?? y)}
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Region</th>
                          <th scope="col">Jobs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bresRankForYear(
                          bresRows,
                          bresYearsAll.includes(y) ? y : (bresYearsAll.at(-1) ?? y),
                        ).map((r) => (
                          <tr key={r.id}>
                            <th scope="row">{r.label}</th>
                            <td>{fmtBresThousands(r.v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {asheReady ? (
                <div className={t.tableGroup}>
                  <p className={t.stageTitle}>
                    Median pay · full-time · weekly gross · 2025
                  </p>
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th scope="col">Industry code</th>
                          <th scope="col">Industry</th>
                          <th scope="col">Median £</th>
                          <th scope="col">Year-on-year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ashePayRows(asheRows, "weekly_gross", "Full-Time").map((r) => (
                          <tr key={r.sic}>
                            <th scope="row">{r.sic}</th>
                            <td>{r.label}</td>
                            <td>{fmtGbp(r.median, "weekly_gross")}</td>
                            <td>
                              {r.annualPctChange != null ? fmtPctChange(r.annualPctChange) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )
        ) : activeView === "pay" ? (
          !asheReady || payCut.length === 0 ? (
            <EmptyStage label="Manufacturing pay unavailable">
              Manufacturing earnings figures are not available right now.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Median pay by manufacturing branch ·{" "}
                  {payMeasure === "hourly_ex_ot" ? "hourly" : "weekly"} · 2025
                </h3>
                {payRanks.length === 0 ? (
                  <EmptyStage label="No branch medians for this cut">
                    Try Full-time or another pay measure.
                  </EmptyStage>
                ) : (
                  <RankBars
                    label={
                      payMeasure === "hourly_ex_ot"
                        ? `Median hourly pay · ${paySheet} · 2025`
                        : `Median weekly pay · ${paySheet} · 2025`
                    }
                    rows={payRanks}
                    format={(v) => fmtGbp(v, payMeasure)}
                  />
                )}
              </section>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Year-on-year change in the median · published %
                </h3>
                {payChanges.length === 0 ? (
                  <EmptyStage label="No published annual changes">
                    Suppressed or missing percentage changes for this cut.
                  </EmptyStage>
                ) : (
                  <RankBars
                    label={`Median pay · annual change · ${paySheet} · 2025`}
                    rows={payChanges}
                    format={fmtPctChange}
                  />
                )}
              </section>
            </div>
          )
        ) : activeView === "productivity" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                {measure === "job" ? "Output per job" : "Output per hour"} ·{" "}
                {measure === "job"
                  ? `${yearsOf(perJobRows)[0] ?? "—"}–${yearsOf(perJobRows).at(-1) ?? "—"}`
                  : `${yearsOf(productivityRows)[0] ?? "—"}–${yearsOf(productivityRows).at(-1) ?? "—"}`}
              </h3>
              {measure === "job" ? (
                !perJobReady || perJobLine.points.length === 0 ? (
                  <EmptyStage label="Output per job unavailable">
                    Manufacturing output per job is not available right now.
                  </EmptyStage>
                ) : (
                  <TimeChart
                    label="Manufacturing output per job"
                    series={[perJobLine]}
                    cadence="quarterly"
                    kind="line"
                    format={(v) => fmtIndex(v)}
                    rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  />
                )
              ) : !prodReady || prodLine.points.length === 0 ? (
                <EmptyStage label="Productivity series unavailable">
                  Manufacturing output per hour is not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Manufacturing output per hour"
                  series={[prodLine]}
                  cadence="quarterly"
                  kind="line"
                  format={(v) => fmtIndex(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Hours · productivity hours index ·{" "}
                {yearsOf(hoursRows)[0] ?? "—"}–{yearsOf(hoursRows).at(-1) ?? "—"}
              </h3>
              {!hoursReady || hoursLine.points.length === 0 ? (
                <EmptyStage label="Hours series unavailable">
                  Manufacturing productivity hours are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Manufacturing productivity hours"
                  series={[hoursLine]}
                  cadence="quarterly"
                  kind="line"
                  format={(v) => fmtIndex(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
          </div>
        ) : !jobsReady && !outputReady ? (
          <EmptyStage label="Jobs series unavailable">
            Manufacturing employment and output figures are not available right now.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Jobs · thousands · seasonally adjusted · {jobYears[0] ?? "—"}–{jobYears.at(-1) ?? "—"}
              </h3>
              {!jobsReady || jobsLine.points.length === 0 ? (
                <EmptyStage label="Employment series unavailable">
                  Manufacturing employment is not available right now.
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
                Output · production index · {outputYears[0] ?? "—"}–{outputYears.at(-1) ?? "—"}
              </h3>
              {!outputReady || outputSeries.points.length === 0 ? (
                <EmptyStage label="Output index unavailable">
                  Manufacturing output is not available right now.
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
          </div>
        )}
      </Stage>
    </>
  );
}
