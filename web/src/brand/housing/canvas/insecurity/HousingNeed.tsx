"use client";

/**
 * Domain 08 — Waiting for a Home.
 *
 * An inventory at one dot scale (1 dot = 1,000): households on local authority housing
 * registers on 31 March (Live Table 600, a stock) beside new social housing lettings made in
 * the financial year ending that day (CORE, a flow), split by rent type. The two are different
 * measures of different things. The Exchange never divides one by the other: there is no
 * queue, and no individual waiting time can be inferred from them.
 *
 * URL state (owned by HousingExplorer): yr (31 March year of the register).
 */

import { useMemo } from "react";
import { ControlRow, DualScramble, DUAL_DIGITS, MenuControl } from "../../..";
import { fmt, fmtFY } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import { fyLabel } from "./periods";
import s from "./insecurity.module.css";

type Ins = HousingV1["insecurity"];

type Props = {
  insecurity: Ins;
  year: number | null;
  onYear: (y: number | null) => void;
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

export function HousingNeed({ insecurity, year, onYear }: Props) {
  const registerByYear = useMemo(
    () => new Map(insecurity.waitingList.map((p) => [Math.floor(p.t + 1e-6), p.v])),
    [insecurity.waitingList],
  );
  // Register on 31 March Y pairs with lettings in financial year (Y−1)–Y.
  const years = useMemo(
    () =>
      insecurity.lettingsBreakdown
        .map((l) => l.t + 1)
        .filter((y) => registerByYear.has(y))
        .sort((a, b) => a - b),
    [insecurity.lettingsBreakdown, registerByYear],
  );
  const latest = years[years.length - 1] ?? null;
  const y = year != null && years.includes(year) ? year : latest;
  const register = y != null ? (registerByYear.get(y) ?? null) : null;
  const lets = y != null ? insecurity.lettingsBreakdown.find((l) => l.t === y - 1) ?? null : null;
  const concealed = insecurity.headlines.concealedFamilies;

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
      <p className={s.lede}>
        Housing register and lettings tables are not loaded for a matching year yet. The Exchange
        does not show estimates.
      </p>
    );
  }

  const rd = (v: number) => Math.round(v / PER_DOT);

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Social housing need is recorded in two ways that are easy to confuse. A housing register
        counts households listed on one date. Lettings count new tenancies made over a year. They
        are drawn below at the same dot scale so their sizes can be compared, but one cannot be
        divided by the other to give anyone&apos;s waiting time.
      </p>

      <ControlRow label="Housing need controls">
        <MenuControl
          label="Register on 31 March · lettings in the year to that date"
          value={String(y)}
          options={[...years].reverse().map((v) => ({ value: String(v), label: `${v} · lettings ${fyLabel(v - 1)}` }))}
          onChange={(v) => {
            const next = Number(v);
            onYear(next === latest ? null : next);
          }}
        />
      </ControlRow>

      <div className={s.inventory}>
        <section className={s.section} aria-label="Housing registers">
          <p className="bo-label">Stock · 31 March {y} · England</p>
          <p className={s.name}>On housing registers</p>
          <p className={s.big}>
            <span className="bo-fig">
              <DualScramble text={fmt.count(register)} chars={DUAL_DIGITS} trigger="manual" duration={0.6} />
            </span>
            <span>households listed with local authorities</span>
          </p>
          <DotGrid
            parts={[{ n: rd(register), fill: "solid" }]}
            label={`${fmt.count(register)} households on housing registers, 31 March ${y}. One dot per 1,000.`}
          />
        </section>

        <span className={s.neq} aria-label="is not comparable to">
          ≠
        </span>

        <section className={s.section} aria-label="New social lettings">
          <p className="bo-label">Flow · April {y - 1} to March {y} · England</p>
          <p className={s.name}>New social lettings</p>
          <p className={s.big}>
            <span className="bo-fig">
              <DualScramble text={fmt.count(lets.total)} chars={DUAL_DIGITS} trigger="manual" duration={0.6} />
            </span>
            <span>new tenancies made during {fyLabel(y - 1)}</span>
          </p>
          <DotGrid
            parts={[
              { n: rd(lets.social), fill: "solid" },
              { n: rd(lets.affordable), fill: "screen" },
              { n: rd(lets.intermediate), fill: "open" },
            ]}
            label={`${fmt.count(lets.total)} new social lettings in ${fyLabel(y - 1)}: ${fmt.count(lets.social)} social rent, ${fmt.count(lets.affordable)} affordable rent, ${fmt.count(lets.intermediate)} intermediate rent. One dot per 1,000.`}
          />
          <ul className={s.key}>
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
          <p className={s.note}>
            General needs {fmt.count(lets.generalNeeds)} · supported housing {fmt.count(lets.supported)}
          </p>
        </section>
      </div>
      <p className={s.note}>1 dot = 1,000, rounded for drawing. Exact figures are printed.</p>

      <div className={s.split}>
        <section className={s.section} aria-label="Registers over time">
          <p className="bo-label">Registers over time · stock on 31 March</p>
          <TimeChart
            series={registerSeries}
            cadence="annual"
            format={fmt.count}
            axisFormat={fmt.countCompact}
            height={220}
            label="Households on local authority housing registers in England"
          />
          <p className={s.note}>
            Changes in who councils allow onto registers, especially after the Localism Act 2011,
            explain part of the movement. The series is not a pure measure of need.
          </p>
        </section>
        <section className={s.section} aria-label="Lettings over time">
          <p className="bo-label">Lettings over time · financial years</p>
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

      <section className={s.section} aria-label="What these measures mean">
        <p className="bo-label">Reading the two measures</p>
        <dl className={s.facts}>
          <div>
            <dt className="bo-label">Register</dt>
            <dd>
              A count of applications held on one day. Some households are listed with more than one
              authority, some stay listed after their needs change, and eligibility rules differ by
              council.
            </dd>
          </div>
          <div>
            <dt className="bo-label">Lettings</dt>
            <dd>
              New tenancies started in the year. Some go to existing social tenants moving home, and
              some go to households who were never on a register.
            </dd>
          </div>
          <div>
            <dt className="bo-label">Not a wait</dt>
            <dd>
              Dividing the register by lettings does not give a waiting time for any household.
              Priority bands, local stock and choice-based lettings decide who is housed and when.
            </dd>
          </div>
          {concealed != null && (
            <div>
              <dt className="bo-label">Hidden need</dt>
              <dd>
                Outside both counts. The 2021 Census recorded {fmt.count(concealed)} concealed
                families in England: families living inside another household. That is one strand
                of evidence. It is not a full count of sofa surfing, and not a register.
              </dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
