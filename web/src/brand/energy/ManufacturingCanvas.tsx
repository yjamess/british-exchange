"use client";

/**
 * Energy Domain 08 — Manufacturing.
 * Notion flagship = Production Anatomy (subsector catalogue) — Gate 3 until Ready cuts.
 * Study C interim: national Anatomy card with measure switch + Output vs Jobs supporting.
 * Index ≠ % GVA ≠ jobs ≠ productivity — never one unmarked axis.
 */

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { TimeChart } from "../instrument/TimeChart";
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
import { ENERGY_SOURCE } from "./citations";
import {
  ANATOMY_MEASURES,
  EMPLOYMENT_ID,
  OUTPUT_INDEX_ID,
  OUTPUT_PER_HOUR_ID,
  SHARE_GVA_ID,
  employmentSeries,
  employmentYearMean,
  fmtIndex,
  fmtJobsThousands,
  fmtSharePct,
  outputIndexSeries,
  outputIndexYearMean,
  pctChange,
  productivitySeries,
  productivityYearMean,
  shareSeries,
  shareValueInYear,
  yearsOf,
  type AnatomyMeasure,
  type ManufacturingPack,
} from "./manufacturing-model";
import { AnnualSeriesTable } from "./SeriesDataTables";
import s from "./generation.module.css";

const VIEWS: ExplorerView[] = [
  { id: "anatomy", label: "The Production Anatomy" },
  { id: "output-jobs", label: "Output vs Jobs" },
  { id: "data", label: "Data" },
];

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function asMeasure(v: string | null): AnatomyMeasure {
  return ANATOMY_MEASURES.includes(v as AnatomyMeasure) ? (v as AnatomyMeasure) : "volume";
}

function AnatomyLedger({
  year,
  volume,
  share,
  jobs,
  productivity,
  firstYear,
  volumeChange,
}: {
  year: number;
  volume: number | null;
  share: number | null;
  jobs: number | null;
  productivity: number | null;
  firstYear: number;
  volumeChange: number | null;
}) {
  return (
    <article className={s.ledger} aria-label={`Production Anatomy, ${year}`}>
      <header className={s.ledgerHead}>
        <p className={s.receiptMeta}>United Kingdom · SIC 2007 section C · Manufacturing</p>
        <h3>The Production Anatomy</h3>
        <p className={s.receiptMeta}>
          {year} · Study C interim · subsector catalogue deferred
        </p>
      </header>

      <div className={s.ledgerGrid} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className={s.ledgerCell}>
          <strong>Volume index</strong>
          <span className={s.receiptFig}>{volume != null ? fmtIndex(volume) : "—"}</span>
          <span>
            Index of Production · mean of months
            {volumeChange != null
              ? ` · ${volumeChange > 0 ? "+" : volumeChange < 0 ? "−" : ""}${Math.abs(volumeChange).toFixed(0)}% since ${firstYear}`
              : ""}
          </span>
        </div>
        <div className={s.ledgerCell}>
          <strong>Economy share</strong>
          <span className={s.receiptFig}>{share != null ? fmtSharePct(share) : "—"}</span>
          <span>% of GVA · not an additive slice of the index</span>
        </div>
        <div className={s.ledgerCell}>
          <strong>Workforce jobs</strong>
          <span className={s.receiptFig}>{jobs != null ? fmtJobsThousands(jobs) : "—"}</span>
          <span>Thousands · seasonally adjusted · mean of quarters</span>
        </div>
        <div className={s.ledgerCell}>
          <strong>Output per hour</strong>
          <span className={s.receiptFig}>
            {productivity != null ? fmtIndex(productivity) : "—"}
          </span>
          <span>Index 2023 = 100 · seasonally adjusted · not volume ÷ jobs</span>
        </div>
      </div>

      <p className={s.receiptNote}>
        Four national measures for one year — each with its own unit. Notion flagship remains a subsector
        Production Anatomy catalogue once Ready IoP/GVA cuts exist. This card is section C only.
      </p>
    </article>
  );
}

export function ManufacturingCanvas({ pack }: { pack: ManufacturingPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const outputRows = pack.output?.observations ?? [];
  const shareRows = pack.share?.observations ?? [];
  const employmentRows = pack.employment?.observations ?? [];
  const productivityRows = pack.productivity?.observations ?? [];

  const outputSeries = outputIndexSeries(outputRows);
  const shareLine = shareSeries(shareRows);
  const jobsLine = employmentSeries(employmentRows);
  const prodLine = productivitySeries(productivityRows);

  const outputYears = yearsOf(outputRows);
  const shareYears = yearsOf(shareRows);
  const latest = outputYears.at(-1) ?? shareYears.at(-1) ?? 2025;
  const earliest = outputYears[0] ?? 1948;

  const [view, setView] = useState(() =>
    VIEWS.some((v) => v.id === searchParams.get("view"))
      ? searchParams.get("view")!
      : searchParams.get("view") === "structure"
        ? "output-jobs"
        : "anatomy",
  );
  const [year, setYear] = useState(() =>
    clampYear(Number(searchParams.get("year") || latest), outputYears.length ? outputYears : [latest], latest),
  );
  const [measure, setMeasure] = useState<AnatomyMeasure>(() => asMeasure(searchParams.get("measure")));

  const sync = useCallback(
    (patch: Partial<{ view: string; year: number; measure: AnatomyMeasure }>) => {
      const next = { view, year, measure, ...patch };
      setView(next.view);
      setYear(next.year);
      setMeasure(next.measure);
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "manufacturing");
      u.set("view", next.view === "structure" ? "output-jobs" : next.view);
      u.set("year", String(next.year));
      u.set("measure", next.measure);
      for (const key of [
        "compare",
        "fuel",
        "from",
        "to",
        "sector",
        "payment",
        "tariff",
        "band",
        "bill_fuel",
        "basis",
        "flow",
        "tech",
        "lf_basis",
        "useful",
        "end_use",
        "geo_sector",
        "place",
        "end_scope",
        "cross_end",
        "region",
        "geo_measure",
        "base",
        "eff_end_use",
      ]) {
        u.delete(key);
      }
      window.history.replaceState(null, "", `${pathname}?${u}`);
    },
    [view, year, measure, pathname],
  );

  const activeView = view === "structure" ? "output-jobs" : view;
  const y = clampYear(year, outputYears.length ? outputYears : [latest], latest);
  const yearOutput = outputIndexYearMean(outputRows, y);
  const yearShare = shareValueInYear(shareRows, y);
  const yearJobs = employmentYearMean(employmentRows, y);
  const yearProd = productivityYearMean(productivityRows, y);

  const firstYear = outputYears[0] ?? earliest;
  const firstOutput = outputIndexYearMean(outputRows, firstYear);
  const change =
    yearOutput != null && firstOutput != null ? pctChange(firstOutput, yearOutput) : null;

  const outputReady = Boolean(pack.output?.observations.length);
  const shareReady = Boolean(pack.share?.observations.length);
  const jobsReady = Boolean(pack.employment?.observations.length);
  const prodReady = Boolean(pack.productivity?.observations.length);

  const dial =
    measure === "share"
      ? { series: shareLine, cadence: "annual" as const, format: fmtSharePct, label: "GVA share" }
      : measure === "jobs"
        ? {
            series: jobsLine,
            cadence: "quarterly" as const,
            format: fmtJobsThousands,
            label: "Workforce jobs",
          }
        : measure === "productivity"
          ? {
              series: prodLine,
              cadence: "quarterly" as const,
              format: fmtIndex,
              label: "Output per hour",
            }
          : {
              series: outputSeries,
              cadence: "monthly" as const,
              format: fmtIndex,
              label: "Volume index",
            };

  const figures: ExplorerFigure[] =
    activeView === "output-jobs"
      ? [
          {
            label: `${y} volume index`,
            value: yearOutput != null ? fmtIndex(yearOutput) : "—",
            note: "Index of Production · mean of months",
          },
          {
            label: `${y} workforce jobs`,
            value: yearJobs != null ? fmtJobsThousands(yearJobs) : "—",
            note: "Thousands · seasonally adjusted · mean of quarters",
          },
          {
            label: "Compared how",
            value: "Separate",
            note: "Index ≠ headcount — never one axis",
          },
        ]
      : [
          {
            label: `${y} volume`,
            value: yearOutput != null ? fmtIndex(yearOutput) : "—",
            note: "Index of Production · manufacturing",
          },
          {
            label: `${y} GVA share`,
            value: yearShare != null ? fmtSharePct(yearShare) : "—",
            note: "Economy share · separate unit",
          },
          {
            label: `${y} jobs`,
            value: yearJobs != null ? fmtJobsThousands(yearJobs) : "—",
            note: "Workforce jobs · thousands",
          },
        ];

  const yearOptions = (outputYears.length ? outputYears : [latest]).map((yy) => ({
    value: String(yy),
    label: String(yy),
  }));

  return (
    <>
      <ExplorerHead
        views={VIEWS}
        view={activeView}
        onView={(id) => sync({ view: id })}
      />
      {(activeView === "anatomy" || activeView === "output-jobs") && (
        <FigureStrip figures={figures} />
      )}

      {activeView !== "data" && (
        <ControlRow>
          {outputReady && (
            <MenuControl
              label="Year"
              value={String(y)}
              options={yearOptions}
              onChange={(v) => sync({ year: Number(v) })}
            />
          )}
          {activeView === "anatomy" && (
            <MenuControl
              label="Dial measure"
              value={measure}
              options={[
                { value: "volume", label: "Volume index" },
                { value: "share", label: "Economy share" },
                { value: "jobs", label: "Workforce jobs" },
                { value: "productivity", label: "Output per hour" },
              ]}
              onChange={(v) => sync({ measure: v as AnatomyMeasure })}
            />
          )}
          <ResetButton
            onClick={() => sync({ year: latest, measure: "volume" })}
          />
        </ControlRow>
      )}

      <Stage
        title={
          activeView === "data"
            ? "Data · Manufacturing"
            : activeView === "output-jobs"
              ? `Output vs Jobs · national manufacturing · ${y}`
              : `The Production Anatomy · ${y}`
        }
        meta={
          activeView === "output-jobs"
            ? "Volume index · jobs thousands — separate charts"
            : activeView === "data"
              ? "UK · section C · observation tables"
              : `UK · section C · Study C interim · dial · ${dial.label}`
        }
        foot={
          <FigureRecord
            source={
              activeView === "output-jobs"
                ? ENERGY_SOURCE.manufacturingLandscape
                : ENERGY_SOURCE.manufacturingIop
            }
            definition={
              activeView === "output-jobs"
                ? [
                    "Matched national trajectories: manufacturing volume index beside workforce jobs.",
                    "Productivity stays on the Anatomy card — do not invent volume ÷ jobs on this view.",
                  ]
                : activeView === "data"
                  ? [
                      "Archive tables for national manufacturing volume, economy share, jobs and output per hour.",
                      "Follow Data for catalogue records. Subsector catalogue remains Gate 3.",
                    ]
                  : [
                      "Production Anatomy card: volume index, economy share, jobs and output per hour for one year — four units, four sources.",
                      "Study C interim until a Ready subsector catalogue can power the full Notion flagship.",
                    ]
            }
            method={
              activeView === "output-jobs"
                ? [
                    "Volume: monthly Index of Production; year figure = mean of months. Jobs: quarterly seasonally adjusted thousands; year figure = mean of quarters.",
                    "Charts stay on separate axes. National manufacturing section only.",
                  ]
                : activeView === "data"
                  ? [
                      "Volume and productivity points are as published (monthly / quarterly). Share is annual. Jobs are quarterly thousands.",
                      "Four units stay separate — never one unmarked axis.",
                    ]
                  : [
                      "Volume: ONS Index of Production. Share: ONS current-weight share of the economy. Jobs: ONS workforce jobs. Productivity: ONS output per hour (2023 = 100) — official, not derived from volume ÷ jobs.",
                      "Dial switches which Ready series is plotted historically; the ledger always shows all four for the selected year.",
                      "Do not sum index points into GVA shares or treat a factory illustration as output.",
                    ]
            }
            dataHref={
              activeView === "output-jobs"
                ? `/data?record=${EMPLOYMENT_ID}`
                : `/data?record=${OUTPUT_INDEX_ID}`
            }
          />
        }
      >
        {activeView === "data" ? (
          !outputReady && !shareLine.points.length && !jobsReady && !prodLine.points.length ? (
            <EmptyStage label="Manufacturing series unavailable">
              National manufacturing packages did not load.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <AnnualSeriesTable
                title="Manufacturing volume index"
                unit="index"
                points={outputSeries.points}
                format={(v) => fmtIndex(v)}
                emptyLabel="Volume index unavailable"
              />
              <AnnualSeriesTable
                title="Manufacturing share of the economy"
                unit="%"
                points={shareLine.points}
                format={(v) => fmtSharePct(v).replace("%", "")}
                emptyLabel="Share unavailable"
              />
              <AnnualSeriesTable
                title="Manufacturing workforce jobs"
                unit="thousands"
                points={jobsLine.points}
                format={(v) =>
                  v.toLocaleString("en-GB", { maximumFractionDigits: 0 })
                }
                emptyLabel="Employment unavailable"
              />
              <AnnualSeriesTable
                title="Manufacturing output per hour"
                unit="index · 2023 = 100"
                points={prodLine.points}
                format={(v) => fmtIndex(v)}
                emptyLabel="Productivity unavailable"
              />
            </div>
          )
        ) : activeView === "output-jobs" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Volume · Index of Production · {outputYears[0] ?? "—"}–{outputYears.at(-1) ?? "—"}
              </h3>
              {!outputReady || outputSeries.points.length === 0 ? (
                <EmptyStage label="Output index unavailable">
                  Load <code>{OUTPUT_INDEX_ID}</code>.
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
              <h3 className={t.stageTitle}>Jobs · thousands · SA</h3>
              {!jobsReady || jobsLine.points.length === 0 ? (
                <EmptyStage label="Employment series unavailable">
                  Load <code>{EMPLOYMENT_ID}</code>.
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
              <p className={s.links}>
                Separate axes on purpose. Productivity lives on{" "}
                <a href={`/energy?domain=manufacturing&view=anatomy&year=${y}&measure=productivity`}>
                  The Production Anatomy
                </a>
                .
              </p>
            </section>
          </div>
        ) : !outputReady && !shareReady && !jobsReady ? (
          <EmptyStage label="Manufacturing series unavailable">
            Load Ready national manufacturing packages under <code>data/energy/</code>.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <AnatomyLedger
                year={y}
                volume={yearOutput}
                share={yearShare}
                jobs={yearJobs}
                productivity={yearProd}
                firstYear={firstYear}
                volumeChange={change}
              />
            </section>

            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Historical dial · {dial.label} · {earliest}–{latest}
              </h3>
              {dial.series.points.length === 0 ? (
                <EmptyStage label="No points for this dial measure">
                  Try Volume index, or load the matching Ready series.
                </EmptyStage>
              ) : (
                <TimeChart
                  label={dial.series.label}
                  series={[dial.series]}
                  cadence={dial.cadence}
                  kind="line"
                  format={(v) => dial.format(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
              <p className={s.links}>
                Dial follows one Ready series at a time. Ledger above keeps all four measures visible for{" "}
                {y}.
              </p>
            </section>

            <section className={s.panel}>
              <h3 className={t.stageTitle}>Exact figures · {y}</h3>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Volume index</td>
                    <td>{yearOutput != null ? fmtIndex(yearOutput) : "—"}</td>
                    <td>index</td>
                    <td>
                      <a href={`/data?record=${OUTPUT_INDEX_ID}`}>Manufacturing output index</a>
                    </td>
                  </tr>
                  <tr>
                    <td>Economy share</td>
                    <td>{yearShare != null ? fmtSharePct(yearShare) : "—"}</td>
                    <td>% GVA</td>
                    <td>
                      <a href={`/data?record=${SHARE_GVA_ID}`}>Manufacturing share of GVA</a>
                    </td>
                  </tr>
                  <tr>
                    <td>Workforce jobs</td>
                    <td>{yearJobs != null ? fmtJobsThousands(yearJobs) : "—"}</td>
                    <td>thousands</td>
                    <td>
                      <a href={`/data?record=${EMPLOYMENT_ID}`}>Manufacturing employment</a>
                    </td>
                  </tr>
                  <tr>
                    <td>Output per hour</td>
                    <td>{yearProd != null ? fmtIndex(yearProd) : "—"}</td>
                    <td>index 2023=100</td>
                    <td>
                      <a href={`/data?record=${OUTPUT_PER_HOUR_ID}`}>Manufacturing output per hour</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {!shareReady || !prodReady ? (
              <p className={s.links}>
                {!shareReady ? "GVA share not loaded. " : ""}
                {!prodReady ? "Output per hour not loaded. " : ""}
              </p>
            ) : null}

          </div>
        )}
      </Stage>
    </>
  );
}
