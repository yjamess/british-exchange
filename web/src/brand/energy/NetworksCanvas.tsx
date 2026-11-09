"use client";

/**
 * Energy Domain 07 — Power Networks.
 * Notion flagship = The Invisible Grid (topology map) — Gate 3+ until Ready spatial.
 * Study C interim: border anatomy (ET 5.6) + Britain After Dark lite (GB NESO Imports).
 * Never invent spare capacity or pretend a schematic is an exact map. GB ≠ UK.
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
import type { YearPack } from "./packs";
import {
  INTERCONNECTOR_FLOWS,
  INTERCONNECTOR_FLOWS_ID,
  YEAR_MIX_ID,
  fmtGWh,
  fmtTwh,
  gbImportsFuelSeries,
  gbImportsFuelYearTotal,
  interconnectorCorridorYearTable,
  interconnectorSeries,
  interconnectorYearSum,
  yearsOf,
  type InterconnectorFlow,
  type NetworksPack,
} from "./networks-model";
import { AnnualSeriesTable } from "./SeriesDataTables";
import s from "./generation.module.css";

const VIEWS: ExplorerView[] = [
  { id: "border", label: "Border anatomy" },
  { id: "night", label: "Britain After Dark · lite" },
  { id: "data", label: "Data" },
];

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

function BorderLedger({
  year,
  flow,
  ukTotal,
  topCorridor,
  topValue,
}: {
  year: number;
  flow: InterconnectorFlow;
  ukTotal: { value: number; quarters: number; provisional: boolean } | null;
  topCorridor: string | null;
  topValue: number | null;
}) {
  return (
    <article className={s.ledger} aria-label={`Interconnector border anatomy, ${year}`}>
      <header className={s.ledgerHead}>
        <p className={s.receiptMeta}>United Kingdom · DESNZ ET 5.6 · electricity GWh</p>
        <h3>Border anatomy</h3>
        <p className={s.receiptMeta}>
          {year} · Study C interim · Invisible Grid map deferred (no topology layer)
        </p>
      </header>

      <div className={s.ledgerGrid}>
        <div className={s.ledgerCell}>
          <strong>UK-total · {flow}</strong>
          <span className={s.receiptFig}>{ukTotal != null ? fmtGWh(ukTotal.value) : "—"}</span>
          <span>
            {ukTotal
              ? `${ukTotal.quarters} quarter${ukTotal.quarters === 1 ? "" : "s"}${
                  ukTotal.provisional ? " · provisional/incomplete" : ""
                }`
              : "Measured corridor trade · not nameplate MW"}
          </span>
        </div>
        <div className={s.ledgerCell}>
          <strong>Largest corridor</strong>
          <span className={s.receiptFig}>{topCorridor ?? "—"}</span>
          <span>{topValue != null ? fmtGWh(topValue) : "By absolute flow this year"}</span>
        </div>
        <div className={s.ledgerCell}>
          <strong>What this is not</strong>
          <span className={s.receiptFig}>Not a map</span>
          <span>No substations, spare capacity, or invented constraint heat</span>
        </div>
      </div>

      <p className={s.receiptNote}>
        France-UK is the published sum of three links (IFA + IFA2 + ElecLink). Flows are GWh trade, not
        contracted TEC capacity. Notion flagship remains The Invisible Grid once licensed topology and
        constraint evidence are Ready.
      </p>
    </article>
  );
}

export function NetworksCanvas({
  pack,
  yearMix = null,
}: {
  pack: NetworksPack;
  yearMix?: YearPack | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const icRows = pack.interconnectors?.observations ?? [];
  const yearRows = yearMix?.observations ?? [];

  const [view, setView] = useState(() =>
    VIEWS.some((v) => v.id === searchParams.get("view")) ? searchParams.get("view")! : "border",
  );
  const [icFlow, setIcFlow] = useState<InterconnectorFlow>(() => asFlow(searchParams.get("flow")));

  const icYears = yearsOf(icRows);
  const importsLine = gbImportsFuelSeries(yearRows);
  const nightYears = [
    ...new Set(importsLine.points.map((p) => Math.floor(p.t)).filter((y) => Number.isFinite(y))),
  ].sort((a, b) => a - b);
  const latest = icYears.at(-1) ?? nightYears.at(-1) ?? yearMix?.year ?? 2025;
  const earliest = icYears[0] ?? nightYears[0] ?? 1998;

  const [year, setYear] = useState(() =>
    clampYear(Number(searchParams.get("year") || latest), icYears.length ? icYears : [latest], latest),
  );

  const sync = useCallback(
    (patch: Partial<{ view: string; year: number; flow: InterconnectorFlow }>) => {
      const next = { view, year, flow: icFlow, ...patch };
      setView(next.view);
      setYear(next.year);
      setIcFlow(next.flow);
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "networks");
      u.set("view", next.view);
      u.set("year", String(next.year));
      u.set("flow", next.flow);
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
        "basis",
        "bill_fuel",
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
    [view, year, icFlow, pathname],
  );

  const yearPool =
    view === "night" && nightYears.length ? nightYears : icYears.length ? icYears : [latest];
  const y = clampYear(year, yearPool, latest);
  const icUk = interconnectorYearSum(icRows, y, "UK-total", icFlow);
  const icUkSeries = interconnectorSeries(icRows, "UK-total", icFlow);
  const icTable = interconnectorCorridorYearTable(icRows, y, icFlow);
  const top = icTable[0] ?? null;
  const nightYearTwh = gbImportsFuelYearTotal(yearRows, y);

  const icReady = Boolean(pack.interconnectors?.observations.length);
  const nightReady = Boolean(importsLine.points.length);

  const figures: ExplorerFigure[] =
    view === "night"
      ? [
          {
            label: `${y} GB Imports fuel`,
            value: nightYearTwh != null ? fmtTwh(nightYearTwh) : "—",
            note: "NESO half-hourly → monthly · GB · not UK ET 5.6",
          },
          {
            label: "Geography",
            value: "GB",
            note: "England, Scotland, Wales — NI excluded",
          },
          {
            label: "Pair with",
            value: "Border",
            note: "UK corridor GWh is a different Official Statistic",
          },
        ]
      : [
          {
            label: `${y} UK · ${icFlow}`,
            value: icUk != null ? fmtGWh(icUk.value) : "—",
            note: "ET 5.6 · year sum of quarters",
          },
          {
            label: "Top corridor",
            value: top ? top.corridor : "—",
            note: top ? fmtGWh(top.value) : "Absolute flow",
          },
          {
            label: "Unit",
            value: "GWh",
            note: "Not MW capacity · not all-fuels ktoe",
          },
        ];

  const yearOptions = yearPool.map((yy) => ({ value: String(yy), label: String(yy) }));

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {(view === "border" || view === "night") && <FigureStrip figures={figures} />}

      {view !== "data" && (
        <ControlRow>
          {(icReady || nightReady) && (
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
          <ResetButton
            onClick={() => sync({ year: latest, flow: "Net imports" })}
          />
        </ControlRow>
      )}

      <Stage
        title={
          view === "data"
            ? "Data · Power Networks"
            : view === "night"
              ? `Britain After Dark · lite · GB Imports fuel · ${y}`
              : `Border anatomy · ${icFlow} · ${y}`
        }
        meta={
          view === "night"
            ? "GB · NESO · monthly TWh from half-hourly · not a constraint map"
            : view === "data"
              ? `UK border · ${icFlow} · GB Imports fuel archive`
              : `UK · ET 5.6 · ${earliest}–${latest} · Study C interim`
        }
        foot={
          <FigureRecord
            source={
              view === "night"
                ? ENERGY_SOURCE.networksNight
                : ENERGY_SOURCE.networksBorder
            }
            definition={
              view === "night"
                ? [
                    "Britain After Dark lite: monthly GB generation mix Imports fuel (TWh), derived from NESO half-hourly operational data.",
                    "This is not UK ET 5.6 corridor trade, not distribution topology, and not a night-time constraint map.",
                  ]
                : view === "data"
                  ? [
                      "Archive tables for UK interconnector annual totals (ET 5.6) and GB Imports fuel (NESO monthly).",
                      "Follow Data for catalogue records. Invisible Grid topology remains Gate 3.",
                    ]
                  : [
                      "Border anatomy: DESNZ ET 5.6 quarterly electricity Imports, Exports and Net imports by interconnector corridor (GWh).",
                      "Study C interim for The Invisible Grid — measured border flows until licensed network topology and constraint evidence are Ready.",
                    ]
            }
            method={
              view === "night"
                ? [
                    "Geography is Great Britain. Northern Ireland is outside NESO GB mix.",
                    "Monthly TWh = sum of half-hourly MWh in that calendar month ÷ 1e6. Pair with Border view only as contextual evidence.",
                  ]
                : view === "data"
                  ? [
                      "UK interconnector year figures sum valued quarters for the selected flow.",
                      "GB Imports fuel is monthly TWh from NESO half-hourly operational data.",
                    ]
                  : [
                      "Corridor and flow live in observation notes. Year figures sum valued quarters.",
                      "France-UK = IFA+IFA2+ElecLink. Pre-commissioning missing cells stay blank; early publisher zeros may precede Note commissioning dates.",
                      "Do not treat these GWh as spare capacity or as a UK distribution map.",
                    ]
            }
            dataHref={
              view === "night"
                ? `/data?record=${YEAR_MIX_ID}`
                : `/data?record=${INTERCONNECTOR_FLOWS_ID}`
            }
          />
        }
      >
        {view === "data" ? (
          !icReady && !nightReady ? (
            <EmptyStage label="Network series unavailable">
              Interconnector flows and GB generation mix did not load.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <AnnualSeriesTable
                title={`UK interconnector · ${icFlow}`}
                unit="GWh · annual sum of quarters"
                points={icUkSeries.points}
                format={(v) =>
                  v.toLocaleString("en-GB", { maximumFractionDigits: 0 })
                }
                emptyLabel="Interconnector flows unavailable"
              />
              <AnnualSeriesTable
                title="GB Imports fuel"
                unit="TWh · monthly"
                points={importsLine.points}
                format={(v) => fmtTwh(v).replace(/\s*TWh$/, "")}
                emptyLabel="GB generation mix unavailable"
              />
            </div>
          )
        ) : view === "night" ? (
          <div className={s.stack}>
            {!nightReady ? (
              <EmptyStage label="GB generation mix unavailable">
                Load <code>{YEAR_MIX_ID}</code> (already Ready on Generation · Year).
              </EmptyStage>
            ) : (
              <>
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    Imports fuel · monthly TWh · GB · {nightYears[0] ?? "—"}–
                    {nightYears.at(-1) ?? "—"}
                  </h3>
                  <TimeChart
                    label="NESO GB Imports fuel · monthly"
                    series={[importsLine]}
                    cadence="monthly"
                    kind="line"
                    format={(v) => fmtTwh(v)}
                    rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  />
                  <p className={s.links}>
                    Operational GB context only. For UK corridor Official Statistics open{" "}
                    <a href={`/energy?domain=networks&view=border&year=${y}`}>Border anatomy</a>.
                  </p>
                </section>
              </>
            )}
          </div>
        ) : !icReady ? (
          <EmptyStage label="Interconnector flows unavailable">
            Load <code>{INTERCONNECTOR_FLOWS_ID}</code> (Ready — do not re-ingest).
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <BorderLedger
                year={y}
                flow={icFlow}
                ukTotal={icUk}
                topCorridor={top?.corridor ?? null}
                topValue={top?.value ?? null}
              />
            </section>

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
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Corridor</th>
                      <th>{icFlow}</th>
                      <th>Quarters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {icTable.map((row) => (
                      <tr key={row.corridor}>
                        <td>{row.corridor}</td>
                        <td>
                          {fmtGWh(row.value)}
                          {row.provisional ? " · prov." : ""}
                        </td>
                        <td>{row.quarters}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </Stage>
    </>
  );
}
