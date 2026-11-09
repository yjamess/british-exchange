"use client";

/**
 * Energy Domain 09 — Jobs & Productivity.
 * Notion flagship = The Labour Landscape (place atlas) — Gate 3 until BRES Ready.
 * Study C interim: national Jobs vs Output ledger + Productivity Machine.
 * Jobs ≠ volume index ≠ output-per-hour — never one unmarked axis; never IoP÷jobs.
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
  EMPLOYMENT_ID,
  OUTPUT_INDEX_ID,
  OUTPUT_PER_HOUR_ID,
  employmentSeries,
  employmentYearMean,
  fmtIndex,
  fmtJobsThousands,
  outputIndexSeries,
  outputIndexYearMean,
  pctChange,
  productivitySeries,
  productivityYearMean,
  yearsOf,
  type JobsPack,
} from "./jobs-model";
import s from "./generation.module.css";

const VIEWS: ExplorerView[] = [
  { id: "landscape", label: "The Labour Landscape" },
  { id: "productivity", label: "Productivity Machine" },
  { id: "data", label: "Data" },
];

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function LandscapeLedger({
  year,
  jobs,
  volume,
  productivity,
  firstYear,
  jobsChange,
  volumeChange,
}: {
  year: number;
  jobs: number | null;
  volume: number | null;
  productivity: number | null;
  firstYear: number;
  jobsChange: number | null;
  volumeChange: number | null;
}) {
  return (
    <article className={s.ledger} aria-label={`Labour Landscape national card, ${year}`}>
      <header className={s.ledgerHead}>
        <p className={s.receiptMeta}>United Kingdom · SIC 2007 section C · Manufacturing</p>
        <h3>The Labour Landscape</h3>
        <p className={s.receiptMeta}>
          {year} · Study C interim · national totals · place atlas deferred
        </p>
      </header>

      <div className={s.ledgerGrid} style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className={s.ledgerCell}>
          <strong>Workforce jobs</strong>
          <span className={s.receiptFig}>{jobs != null ? fmtJobsThousands(jobs) : "—"}</span>
          <span>
            Thousands · SA · mean of quarters
            {jobsChange != null
              ? ` · ${jobsChange > 0 ? "+" : jobsChange < 0 ? "−" : ""}${Math.abs(jobsChange).toFixed(0)}% since ${firstYear}`
              : ""}
          </span>
        </div>
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
          <strong>Output per hour</strong>
          <span className={s.receiptFig}>
            {productivity != null ? fmtIndex(productivity) : "—"}
          </span>
          <span>Index 2023 = 100 · official series · not volume ÷ jobs</span>
        </div>
      </div>

      <p className={s.receiptNote}>
        Job losses do not prove output losses. Output gains do not prove job gains. Each measure has its
        own unit and source. Notion flagship remains a place atlas once BRES × geography is Ready.
      </p>
    </article>
  );
}

function FormulaPanel() {
  return (
    <article className={s.ledger} aria-label="Productivity formula diagram">
      <header className={s.ledgerHead}>
        <p className={s.receiptMeta}>Mechanical diagram · not a data chart</p>
        <h3>How output per hour is defined</h3>
      </header>
      <div className={s.ledgerGrid} style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        <div className={s.ledgerCell}>
          <strong>Output</strong>
          <span className={s.receiptFig}>GVA / volume</span>
          <span>ONS productivity numerator</span>
        </div>
        <div className={s.ledgerCell} style={{ alignItems: "center", justifyContent: "center" }}>
          <span className={s.receiptFig}>÷</span>
        </div>
        <div className={s.ledgerCell}>
          <strong>Hours</strong>
          <span className={s.receiptFig}>Hours worked</span>
          <span>Hours worked · further detail in Gate 3</span>
        </div>
        <div className={s.ledgerCell} style={{ alignItems: "center", justifyContent: "center" }}>
          <span className={s.receiptFig}>=</span>
        </div>
        <div className={s.ledgerCell}>
          <strong>Output per hour</strong>
          <span className={s.receiptFig}>Index</span>
          <span>2023 = 100 · seasonally adjusted · series below</span>
        </div>
      </div>
      <p className={s.receiptNote}>
        This diagram explains the official concept. We do not invent hours from workforce jobs, and we do
        not plot volume ÷ jobs as productivity. Whole-economy labour productivity sits in Economy.
      </p>
    </article>
  );
}

export function JobsCanvas({ pack }: { pack: JobsPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const employmentRows = pack.employment?.observations ?? [];
  const outputRows = pack.output?.observations ?? [];
  const productivityRows = pack.productivity?.observations ?? [];

  const jobsLine = employmentSeries(employmentRows);
  const outputSeries = outputIndexSeries(outputRows);
  const prodLine = productivitySeries(productivityRows);

  const jobYears = yearsOf(employmentRows);
  const outputYears = yearsOf(outputRows);
  const yearUnion = [...new Set([...jobYears, ...outputYears])].sort((a, b) => a - b);
  const latest = yearUnion.at(-1) ?? 2025;
  const earliest = yearUnion[0] ?? 1997;

  const [view, setView] = useState(() =>
    VIEWS.some((v) => v.id === searchParams.get("view"))
      ? searchParams.get("view")!
      : searchParams.get("view") === "jobs-output"
        ? "landscape"
        : "landscape",
  );
  const [year, setYear] = useState(() =>
    clampYear(Number(searchParams.get("year") || latest), yearUnion.length ? yearUnion : [latest], latest),
  );

  const sync = useCallback(
    (patch: Partial<{ view: string; year: number }>) => {
      const next = { view, year, ...patch };
      setView(next.view);
      setYear(next.year);
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "industrial-work");
      u.set("view", next.view === "jobs-output" ? "landscape" : next.view);
      u.set("year", String(next.year));
      for (const key of [
        "measure",
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
    [view, year, pathname],
  );

  const activeView = view === "jobs-output" ? "landscape" : view;
  const y = clampYear(year, yearUnion.length ? yearUnion : [latest], latest);
  const yearJobs = employmentYearMean(employmentRows, y);
  const yearOutput = outputIndexYearMean(outputRows, y);
  const yearProd = productivityYearMean(productivityRows, y);

  const firstJobsYear = jobYears[0] ?? earliest;
  const firstOutputYear = outputYears[0] ?? earliest;
  const firstJobs = employmentYearMean(employmentRows, firstJobsYear);
  const firstOutput = outputIndexYearMean(outputRows, firstOutputYear);
  const jobsChange =
    yearJobs != null && firstJobs != null ? pctChange(firstJobs, yearJobs) : null;
  const volumeChange =
    yearOutput != null && firstOutput != null ? pctChange(firstOutput, yearOutput) : null;

  const jobsReady = Boolean(pack.employment?.observations.length);
  const outputReady = Boolean(pack.output?.observations.length);
  const prodReady = Boolean(pack.productivity?.observations.length);

  const figures: ExplorerFigure[] =
    activeView === "productivity"
      ? [
          {
            label: `${y} output per hour`,
            value: yearProd != null ? fmtIndex(yearProd) : "—",
            note: "2023 = 100 · seasonally adjusted · mean of quarters",
          },
          {
            label: `${y} workforce jobs`,
            value: yearJobs != null ? fmtJobsThousands(yearJobs) : "—",
            note: "Context only · not the denominator",
          },
          {
            label: "Formula",
            value: "Official",
            note: "Not volume ÷ jobs · not whole-economy",
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
            note: "Separate productivity series",
          },
        ];

  const yearOptions = (yearUnion.length ? yearUnion : [latest]).map((yy) => ({
    value: String(yy),
    label: String(yy),
  }));

  return (
    <>
      <ExplorerHead views={VIEWS} view={activeView} onView={(id) => sync({ view: id })} />
      {(activeView === "landscape" || activeView === "productivity") && (
        <FigureStrip figures={figures} />
      )}

      {activeView !== "data" && (
        <ControlRow>
          <MenuControl
            label="Year"
            value={String(y)}
            options={yearOptions}
            onChange={(v) => sync({ year: Number(v) })}
          />
          <ResetButton onClick={() => sync({ year: latest })} />
        </ControlRow>
      )}

      <Stage
        title={
          activeView === "data"
            ? "Data · Jobs & Productivity"
            : activeView === "productivity"
              ? `Productivity Machine · ${y}`
              : `The Labour Landscape · ${y}`
        }
        meta={
          activeView === "productivity"
            ? "Official output per hour · formula diagram · not volume ÷ jobs"
            : activeView === "data"
              ? "Ready series · ONS · place atlas deferred"
              : "UK · section C · Study C interim · national totals"
        }
        foot={
          <FigureRecord
            source={
              activeView === "productivity"
                ? ENERGY_SOURCE.jobsProductivity
                : ENERGY_SOURCE.jobsLandscape
            }
            definition={
              activeView === "productivity"
                ? [
                    "Productivity Machine: official manufacturing output-per-hour index with a labelled formula diagram.",
                    "Hours worked are not reconstructed from workforce jobs. Whole-economy labour productivity sits in Economy.",
                  ]
                : activeView === "data"
                  ? "Catalogue records for Ready Domain 09 national series (shared with Manufacturing)."
                  : [
                      "Study C interim for The Labour Landscape — national Jobs vs Output until regional employment geography is Ready.",
                      "Jobs and volume stay on separate charts. A falling jobs line beside a rising volume line is a comparison, not a causal story.",
                    ]
            }
            method={
              activeView === "productivity"
                ? [
                    "ONS manufacturing output per hour: quarterly index (2023 = 100, seasonally adjusted); year figure = mean of quarters.",
                    "Formula panel is explanatory only — not a plotted hours series.",
                  ]
                : activeView === "data"
                  ? [
                      "Open each catalogue record for definition, caveats, download and release provenance.",
                      "Employment Atlas, Industrial Lives and ASHE earnings remain Gate 3 — Domain 09 is not complete.",
                    ]
                  : [
                      "Jobs: ONS workforce jobs, quarterly seasonally adjusted thousands; year = mean of quarters. Volume: Index of Production, monthly; year = mean of months.",
                      "Productivity: official ONS output-per-hour series — never Index of Production divided by jobs. National manufacturing section only; no place marks.",
                    ]
            }
            dataHref={
              activeView === "data"
                ? "/data"
                : activeView === "productivity"
                  ? `/data?record=${OUTPUT_PER_HOUR_ID}`
                  : `/data?record=${EMPLOYMENT_ID}`
            }
          />
        }
      >
        {activeView === "data" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>Catalogue records</h3>
              <ul className={s.follow}>
                <li>
                  <a href={`/data?record=${EMPLOYMENT_ID}`}>Manufacturing employment</a>
                  <span>
                    ONS workforce jobs · quarterly thousands · seasonally adjusted
                  </span>
                </li>
                <li>
                  <a href={`/data?record=${OUTPUT_INDEX_ID}`}>Manufacturing output index</a>
                  <span>
                    ONS Index of Production · Jobs vs Output pairing · monthly volume index
                  </span>
                </li>
                <li>
                  <a href={`/data?record=${OUTPUT_PER_HOUR_ID}`}>Manufacturing output per hour</a>
                  <span>
                    ONS labour productivity · quarterly index · 2023 = 100 · seasonally adjusted
                  </span>
                </li>
              </ul>
              <p className={s.links}>
                Employment Atlas, Industrial Lives, ASHE earnings and hours components remain Gate 3 —
                Domain 09 is not complete. History long-run employment is a catalogue link only — never
                forked here.
              </p>
            </section>
          </div>
        ) : activeView === "productivity" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <FormulaPanel />
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Output per hour · {yearsOf(productivityRows)[0] ?? "—"}–
                {yearsOf(productivityRows).at(-1) ?? "—"}
              </h3>
              {!prodReady || prodLine.points.length === 0 ? (
                <EmptyStage label="Productivity series unavailable">
                  Load <code>{OUTPUT_PER_HOUR_ID}</code>.
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
              <p className={s.links}>
                Index 2023 = 100, seasonally adjusted. Distinct from Economy whole-economy productivity. See{" "}
                <a href={`/data?record=${OUTPUT_PER_HOUR_ID}`}>Output per hour</a>.
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
                    <td>Output per hour</td>
                    <td>{yearProd != null ? fmtIndex(yearProd) : "—"}</td>
                    <td>index 2023=100</td>
                    <td>
                      <a href={`/data?record=${OUTPUT_PER_HOUR_ID}`}>Output per hour</a>
                    </td>
                  </tr>
                  <tr>
                    <td>Workforce jobs (context)</td>
                    <td>{yearJobs != null ? fmtJobsThousands(yearJobs) : "—"}</td>
                    <td>thousands</td>
                    <td>
                      <a href={`/data?record=${EMPLOYMENT_ID}`}>Manufacturing employment</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
        ) : !jobsReady && !outputReady ? (
          <EmptyStage label="Jobs series unavailable">
            Load Ready <code>{EMPLOYMENT_ID}</code> and <code>{OUTPUT_INDEX_ID}</code>.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <LandscapeLedger
                year={y}
                jobs={yearJobs}
                volume={yearOutput}
                productivity={yearProd}
                firstYear={Math.min(firstJobsYear, firstOutputYear)}
                jobsChange={jobsChange}
                volumeChange={volumeChange}
              />
            </section>

            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Jobs · thousands · SA · {jobYears[0] ?? "—"}–{jobYears.at(-1) ?? "—"}
              </h3>
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
            </section>

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
                  label="Manufacturing output index (IoP C)"
                  series={[outputSeries]}
                  cadence="monthly"
                  kind="line"
                  format={(v) => fmtIndex(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
              <p className={s.links}>
                Separate axes on purpose. Quarterly jobs vs monthly volume — disclosed frequency difference.
                Productivity lives on{" "}
                <a href={`/energy?domain=industrial-work&view=productivity&year=${y}`}>
                  Productivity Machine
                </a>
                .
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
                    <td>Workforce jobs</td>
                    <td>{yearJobs != null ? fmtJobsThousands(yearJobs) : "—"}</td>
                    <td>thousands</td>
                    <td>
                      <a href={`/data?record=${EMPLOYMENT_ID}`}>Manufacturing employment</a>
                    </td>
                  </tr>
                  <tr>
                    <td>Volume index</td>
                    <td>{yearOutput != null ? fmtIndex(yearOutput) : "—"}</td>
                    <td>index</td>
                    <td>
                      <a href={`/data?record=${OUTPUT_INDEX_ID}`}>Manufacturing output index</a>
                    </td>
                  </tr>
                  <tr>
                    <td>Output per hour</td>
                    <td>{yearProd != null ? fmtIndex(yearProd) : "—"}</td>
                    <td>index 2023=100</td>
                    <td>
                      <a href={`/data?record=${OUTPUT_PER_HOUR_ID}`}>Output per hour</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {!prodReady ? (
              <p className={s.links}>Output per hour not loaded — Productivity Machine will be empty.</p>
            ) : null}

          </div>
        )}
      </Stage>
    </>
  );
}
