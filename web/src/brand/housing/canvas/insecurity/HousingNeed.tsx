"use client";

/**
 * Domain 08 — Waiting for a Home.
 * Register vs lettings at one shared dot scale, then history charts.
 * Year control lives in HousingExplorer. Never imply a waiting time from register ÷ lettings.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtFY } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import { fyLabel } from "./periods";
import s from "./insecurity.module.css";
import gen from "../../../energy/generation.module.css";

type Ins = HousingV1["insecurity"];

type Props = {
  insecurity: Ins;
  year: number | null;
};

const PER_DOT = 1000;
const COLS = 30;
const CELL = 9;

type Fill = "solid" | "screen" | "open";

function DotGrid({
  parts,
  label,
}: {
  parts: { n: number; fill: Fill }[];
  label: string;
}) {
  const total = parts.reduce((a, p) => a + p.n, 0);
  const rows = Math.max(1, Math.ceil(total / COLS));
  const W = COLS * CELL;
  const H = rows * CELL;
  const dots = [];
  let i = 0;
  for (const p of parts) {
    for (let k = 0; k < p.n; k++, i++) {
      const cx = (i % COLS) * CELL + CELL / 2;
      const cy = Math.floor(i / COLS) * CELL + CELL / 2;
      dots.push(
        p.fill === "open" ? (
          <circle key={i} cx={cx} cy={cy} r={2.9} fill="var(--bo-paper)" stroke="var(--bo-ink)" strokeWidth={1} />
        ) : p.fill === "screen" ? (
          <g key={i}>
            <circle cx={cx} cy={cy} r={3.4} fill="none" stroke="var(--bo-ink)" strokeWidth={0.8} />
            <circle cx={cx} cy={cy} r={1.3} fill="var(--bo-ink)" />
          </g>
        ) : (
          <circle key={i} cx={cx} cy={cy} r={3.4} fill="var(--bo-ink)" />
        ),
      );
    }
  }
  return (
    <svg className={s.dotGrid} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ maxWidth: W * 1.4 }}>
      {dots}
    </svg>
  );
}

export function needYearOptions(insecurity: Ins): { value: string; label: string; year: number }[] {
  const registerByYear = new Map(insecurity.waitingList.map((p) => [Math.floor(p.t + 1e-6), p.v]));
  return insecurity.lettingsBreakdown
    .map((l) => l.t + 1)
    .filter((y) => registerByYear.has(y))
    .sort((a, b) => b - a)
    .map((y) => ({
      value: String(y),
      label: `31 Mar ${y} · lettings ${fyLabel(y - 1)}`,
      year: y,
    }));
}

export function needFoot(insecurity: Ins, year: number | null): {
  definition: string;
  method: string[];
  source: string;
} {
  const opts = needYearOptions(insecurity);
  const latest = opts[0]?.year ?? null;
  const y = year != null && opts.some((o) => o.year === year) ? year : latest;
  const concealed = insecurity.headlines.concealedFamilies;
  return {
    definition:
      "Housing registers are a stock on 31 March. New social lettings are a flow over the financial year ending that day. They measure different things.",
    method: [
      "Drawn at the same scale (1 dot = 1,000 households, rounded) so sizes can be compared — never divided into a waiting time.",
      "Register changes partly reflect who councils allow onto lists.",
      "Some lettings go to existing social tenants; some go to households never on a register.",
      concealed != null
        ? `Census 2021 recorded ${fmt.count(concealed)} concealed families in England — need outside both counts.`
        : "",
    ].filter(Boolean),
    source:
      y != null
        ? `MHCLG · housing registers · social housing lettings · England · 31 March ${y}`
        : "MHCLG · housing registers · social housing lettings · England",
  };
}

export function HousingNeed({ insecurity, year }: Props) {
  const registerByYear = useMemo(
    () => new Map(insecurity.waitingList.map((p) => [Math.floor(p.t + 1e-6), p.v])),
    [insecurity.waitingList],
  );
  const years = useMemo(
    () =>
      insecurity.lettingsBreakdown
        .map((l) => l.t + 1)
        .filter((yr) => registerByYear.has(yr))
        .sort((a, b) => a - b),
    [insecurity.lettingsBreakdown, registerByYear],
  );
  const latest = years[years.length - 1] ?? null;
  const y = year != null && years.includes(year) ? year : latest;
  const register = y != null ? (registerByYear.get(y) ?? null) : null;
  const lets = y != null ? insecurity.lettingsBreakdown.find((l) => l.t === y - 1) ?? null : null;

  const registerSeries = useMemo(
    () => [{ id: "register", label: "Households on registers", points: insecurity.waitingList }],
    [insecurity.waitingList],
  );
  const lettingsSeries = useMemo(
    () => [{ id: "lettings", label: "New social lettings", points: insecurity.lettings }],
    [insecurity.lettings],
  );

  if (y == null || register == null || !lets) {
    return (
      <EmptyStage label="In preparation">
        Housing register and lettings figures are not loaded for a matching year yet. No estimated figures.
      </EmptyStage>
    );
  }

  const rd = (v: number) => Math.round(v / PER_DOT);

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Register and lettings · England · {y}</h3>
        <div className={s.inventory}>
          <section className={s.section} aria-label="Housing registers">
            <p className={s.name}>On housing registers · 31 March {y}</p>
            <p className={s.big}>
              <span className="bo-fig">{fmt.count(register)}</span>
              <span>households listed with local authorities</span>
            </p>
            <DotGrid
              parts={[{ n: rd(register), fill: "solid" }]}
              label={`${fmt.count(register)} households on housing registers, 31 March ${y}. One dot per 1,000.`}
            />
          </section>

          <span className={s.neq} aria-label="is not the same as">
            ≠
          </span>

          <section className={s.section} aria-label="New social lettings">
            <p className={s.name}>New social lettings · {fyLabel(y - 1)}</p>
            <p className={s.big}>
              <span className="bo-fig">{fmt.count(lets.total)}</span>
              <span>new tenancies in the year</span>
            </p>
            <DotGrid
              parts={[
                { n: rd(lets.social), fill: "solid" },
                { n: rd(lets.affordable), fill: "screen" },
                { n: rd(lets.intermediate), fill: "open" },
              ]}
              label={`${fmt.count(lets.total)} new social lettings in ${fyLabel(y - 1)}. One dot per 1,000.`}
            />
            <ul className={s.key} aria-label="Lettings key">
              <li>
                <span className={s.keySwatch} data-fill="solid" aria-hidden /> Social rent {fmt.count(lets.social)}
              </li>
              <li>
                <span className={s.keySwatch} data-fill="screen" aria-hidden /> Affordable rent {fmt.count(lets.affordable)}
              </li>
              <li>
                <span className={s.keySwatch} data-fill="open" aria-hidden /> Intermediate rent {fmt.count(lets.intermediate)}
              </li>
            </ul>
            <p className={s.metaLine}>
              General needs {fmt.count(lets.generalNeeds)} · supported housing {fmt.count(lets.supported)}
            </p>
          </section>
        </div>
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Registers over time · stock on 31 March</h3>
        <TimeChart
          series={registerSeries}
          cadence="annual"
          format={fmt.count}
          axisFormat={fmt.countCompact}
          height={220}
          label="Households on local authority housing registers in England"
        />
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Lettings over time · financial years</h3>
        <TimeChart
          series={lettingsSeries}
          cadence="annual"
          periodLabel={fmtFY}
          format={fmt.count}
          axisFormat={fmt.countCompact}
          height={220}
          label="New social housing lettings in England, financial years"
        />
      </section>
    </div>
  );
}
