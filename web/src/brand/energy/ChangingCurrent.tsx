"use client";

/**
 * Changing Current — Britain's electricity mix, 1920–2025.
 *
 * All fuels: every fuel as a labelled line on one scale; the year follows the pointer.
 * One fuel: the shared TimeChart.
 */

import { TimeChart } from "../instrument/TimeChart";
import type { YearFuel } from "./generation-model";
import { LONG_RUN_SOURCE, fmtPct, fmtTWh, longFuel, value, type Coverage, type Layout, type LongFuelId, type LongYear, type Measure } from "./long-run";
import { historyReading } from "./generation-reading";
import { MixLines } from "./MixViews";
import s from "./changing.module.css";

export type CurrentState = {
  measure: Measure;
  layout: Layout;
  year: number;
  group: LongFuelId | null;
  reading: string | null;
};

const fmtV = (measure: Measure) => (measure === "share" ? fmtPct : fmtTWh);

/** Single-fuel line: same instrument language, shorter so a peaked-then-flat series does not sit in a tall empty frame. */
const FUEL_CHART_H = 280;

export function ChangingCurrent({
  mix,
  state,
  onChange,
}: {
  mix: LongYear[];
  /** Optional; ET breakdown now lives on the Data view (call sites may still pass it). */
  detail?: YearFuel[];
  related: Record<string, Coverage>;
  state: CurrentState;
  onChange: (patch: Partial<CurrentState>) => void;
}) {
  const fuel = state.group ? longFuel(state.group) : null;
  const connection = fuel && ["coal", "gas", "oil"].includes(fuel.id)
    ? { href: `/energy?domain=fossil&fuel=${fuel.id}&year=${state.year}`, label: "Explore fuel production and trade", note: "Related context; production and trade are different measures from generation." }
    : fuel && ["nuclear", "renewables"].includes(fuel.id)
      ? { href: "/energy?domain=low-carbon", label: "Explore low-carbon energy", note: "Related context with its own fuel categories and coverage." }
      : null;
  return (
    <div className={s.root}>
      <p className={s.note}>{historyReading(mix, state.year, state.group, state.measure)}</p>
      {fuel ? (
        <>
          <TimeChart
            showTable={false}
            label={`${fuel.label}: UK electricity generation over time`}
            series={[{ id: fuel.id, label: fuel.label, points: mix.map(row => ({
              t: row.year, v: value(row, fuel.id, state.measure),
            })) }]}
            cadence="annual"
            zero
            height={FUEL_CHART_H}
            format={fmtV(state.measure)}
            periodLabel={t => String(Math.round(t))}
            rules={[{ id: "selected-year", t: state.year, label: String(state.year), active: true }]}
          />
          <p className={s.note}>{fuel.includes} Choose All fuels above to return to the whole mix.
            {connection && <> <a href={connection.href}>{connection.label}</a>. {connection.note}</>}
          </p>
        </>
      ) : (
        <>
          <MixLines mix={mix} measure={state.measure} year={state.year} onYear={(year) => onChange({ year })} />
          <p className={s.note}>
            Each fuel on one scale; rings mark the first year a fuel became the largest source.{" "}
            Move across the chart to change the year (drag on touch screens; arrow keys when focused). DESNZ estimates before {LONG_RUN_SOURCE.firstReported}.
          </p>
        </>
      )}
    </div>
  );
}
