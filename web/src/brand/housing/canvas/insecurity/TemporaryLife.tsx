"use client";

/**
 * Domain 08 — A Temporary Life.
 *
 * A duration ruler: the horizontal axis is lived time in temporary accommodation, drawn to
 * scale from 0 to 5 years. Each band of MHCLG TA4 spans its true width on the ruler and is
 * filled with dots (1 dot = 100 households), so the area of each band is its household count
 * and the long bands are visibly long. "5 years or more" is open-ended and drawn over one
 * nominal year behind a dashed break.
 *
 * Everything here is a stock on one date. A stock over-represents long stays compared with
 * all the households who pass through in a year; entries and exits are not loaded.
 *
 * URL state (owned by HousingExplorer): ta (accommodation type id).
 */

import { useMemo } from "react";
import { ChipToggles, ControlRow, DualScramble, DUAL_DIGITS } from "../../..";
import { fmt } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./insecurity.module.css";

type Ins = HousingV1["insecurity"];

type Props = {
  insecurity: Ins;
  type: string | null;
  onType: (id: string | null) => void;
};

const PER_DOT = 100;
const CELL = 6;
const YEAR_PX = 150;
const X0 = 24;
/** Ruler position of each TA4 band, in years. The last band is open-ended. */
const SPANS: Record<string, [number, number]> = {
  "under-6-months": [0, 0.5],
  "6-months-to-1-year": [0.5, 1],
  "1-to-2-years": [1, 2],
  "2-to-5-years": [2, 5],
  "5-or-more-years": [5, 6],
};
const BAND_SHORT: Record<string, string> = {
  "under-6-months": "< 6 months",
  "6-months-to-1-year": "6–12 months",
  "1-to-2-years": "1–2 years",
  "2-to-5-years": "2–5 years",
  "5-or-more-years": "5 years or more",
};
const LONG = new Set(["1-to-2-years", "2-to-5-years", "5-or-more-years"]);

const SHORT_LABEL: Record<string, string> = {
  "all-types": "All types",
  "nightly-paid": "Nightly paid",
  "la-ha-stock": "LA / HA stock",
  "private-sector": "Private sector",
  bb: "Bed and breakfast",
  hostels: "Hostels",
  other: "Other",
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (iso: string) =>
  iso ? `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "the latest date";

export function TemporaryLife({ insecurity, type, onType }: Props) {
  const matrix = insecurity.taDurationMatrix;
  const row = matrix.find((m) => m.id === type) ?? matrix[0];
  const date = dateLabel(insecurity.taDurationDate);
  const children = insecurity.headlines.taChildren;

  // Fixed dot scale across types: the tallest column of "all types" sets the drawing height.
  const height = useMemo(() => {
    const all = matrix[0];
    if (!all) return 120;
    const tallest = Math.max(
      ...all.bands.map((b) => {
        const [a, z] = SPANS[b.id]!;
        const cols = Math.max(1, Math.floor(((z - a) * YEAR_PX) / CELL));
        return Math.ceil(Math.round(b.v / PER_DOT) / cols) * CELL;
      }),
    );
    return tallest + 8;
  }, [matrix]);

  const series = useMemo(
    () => [
      { id: "households", label: "Households in TA", points: insecurity.taHouseholds },
      { id: "children", label: "Households with children", points: insecurity.taWithChildren },
    ],
    [insecurity.taHouseholds, insecurity.taWithChildren],
  );

  if (!row) {
    return (
      <p className={s.lede}>
        Length-of-stay tables (TA4) are not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  const longCount = row.bands.filter((b) => LONG.has(b.id)).reduce((acc, b) => acc + b.v, 0);
  const fiveplus = row.bands.find((b) => b.id === "5-or-more-years")?.v ?? null;
  const longShare = row.total > 0 ? (longCount / row.total) * 100 : null;

  const top = 64;
  const base = top + height;
  const W = X0 * 2 + YEAR_PX * 6;
  const H = base + 60;
  const xOf = (years: number) => X0 + years * YEAR_PX;

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Time in temporary accommodation is lived time. The ruler below is drawn to scale in months
        and years. Each closed band spans its true length of stay. The last band, five years or
        more, has no end date, so its width is one nominal year and is drawn open. Entries and
        exits across the year are not loaded.
      </p>

      <ControlRow label="Temporary accommodation controls">
        <ChipToggles
          label="Accommodation type · England"
          options={matrix.map((m) => ({ value: m.id, label: `${SHORT_LABEL[m.id] ?? m.label} · ${fmt.countCompact(m.total)}` }))}
          selected={[row.id]}
          onToggle={(id) => onType(id === "all-types" ? null : id)}
        />
      </ControlRow>

      <div className={s.plate}>
        <div className={s.plateMain}>
          <p className="bo-label" style={{ margin: "0 0 var(--bo-s3)" }}>
            Length of stay so far · {row.label} · stock on {date}
          </p>
          <svg
            className={s.svg}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Length of stay in temporary accommodation, ${row.label}, England, ${date}. ${row.bands
              .map((b) =>
                b.id === "5-or-more-years"
                  ? `${b.label}, open-ended, drawn over one nominal year: ${fmt.count(b.v)} households`
                  : `${b.label}: ${fmt.count(b.v)} households`,
              )
              .join("; ")}.`}
          >
            <path className={s.bracket} d={`M ${xOf(1)} ${top - 18} V ${top - 26} H ${xOf(6)} V ${top - 18}`} aria-hidden />
            <text x={xOf(1)} y={top - 34} className={s.bandName} aria-hidden>
              A year or more · {fmt.count(longCount)} households
            </text>

            {row.bands.map((b) => {
              const [a, z] = SPANS[b.id]!;
              const x0 = xOf(a);
              const cols = Math.max(1, Math.floor(((z - a) * YEAR_PX) / CELL));
              const n = Math.round(b.v / PER_DOT);
              const rows = Math.ceil(n / cols);
              const dots = [];
              for (let i = 0; i < n; i++) {
                dots.push(
                  <circle
                    key={i}
                    cx={x0 + (i % cols) * CELL + CELL / 2}
                    cy={base - Math.floor(i / cols) * CELL - CELL / 2}
                    r={LONG.has(b.id) ? 2.1 : 1.6}
                    className={s.dot}
                  />,
                );
              }
              const open = b.id === "5-or-more-years";
              return (
                <g key={b.id} aria-hidden>
                  {open && (
                    <rect
                      x={x0}
                      y={top}
                      width={xOf(z) - x0}
                      height={base - top}
                      className={s.openBand}
                    >
                      <title>Five years or more. Open-ended. The width is one nominal year, not a measured sixth year.</title>
                    </rect>
                  )}
                  {dots}
                  <text x={x0 + 2} y={Math.min(base - rows * CELL - 8, base - 8)} className={s.bandCount}>
                    {fmt.countCompact(b.v)}
                  </text>
                  {open && (
                    <text x={x0 + 4} y={top - 8} className={s.openLabel}>
                      Open-ended
                    </text>
                  )}
                </g>
              );
            })}

            <line x1={xOf(0)} x2={xOf(5)} y1={base + 6} y2={base + 6} className={s.rulerTick} aria-hidden />
            <line x1={xOf(5)} x2={xOf(6)} y1={base + 6} y2={base + 6} className={s.bandBreak} aria-hidden />
            {Array.from({ length: 61 }, (_, m) => (
              <line
                key={m}
                x1={xOf(m / 12)}
                x2={xOf(m / 12)}
                y1={base + 6}
                y2={base + (m % 12 === 0 ? 16 : m % 6 === 0 ? 12 : 9)}
                className={m % 6 === 0 ? s.rulerTick : s.rulerMinor}
                aria-hidden
              />
            ))}
            {[0, 1, 2, 3, 4, 5].map((y) => (
              <text key={y} x={xOf(y)} y={base + 30} className={s.rulerLabel} textAnchor={y === 0 ? "start" : "middle"} aria-hidden>
                {y === 0 ? "Arrived" : `${y} year${y > 1 ? "s" : ""}`}
              </text>
            ))}
            <text x={xOf(6)} y={base + 30} className={s.rulerLabel} textAnchor="end" aria-hidden>
              5 years or more
            </text>
            {row.bands.map((b) => (
              <text key={b.id} x={xOf(SPANS[b.id]![0]) + 2} y={base + 52} className={s.bandName} aria-hidden>
                {BAND_SHORT[b.id] ?? b.label}
              </text>
            ))}
          </svg>
          <ul className={s.key} aria-label="Ruler key">
            <li>
              <span className={s.keySwatch} data-fill="solid" aria-hidden /> 1 dot = {PER_DOT} households
            </li>
            <li>
              <span className={s.keyLine} aria-hidden /> Band width = time span on the ruler
            </li>
            <li>
              <span className={s.keyLine} data-dashed="true" aria-hidden /> Five years or more is open-ended. Its box is one nominal year, not a sixth year.
            </li>
          </ul>
        </div>
        <aside className={s.panel} aria-live="polite">
          <p className="bo-label">A year or more · {row.label}</p>
          <p className={s.big}>
            <span className="bo-fig">
              <DualScramble text={fmt.count(longCount)} chars={DUAL_DIGITS} trigger="manual" duration={0.6} />
            </span>
            <span>households{longShare != null ? ` · ${longShare.toFixed(0)}% of ${fmt.count(row.total)}` : ""}</span>
          </p>
          {fiveplus != null && (
            <p className={s.body}>
              <span className="bo-fig">{fmt.count(fiveplus)}</span> had been in temporary accommodation for five years or more.
            </p>
          )}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <caption>TA4 · stock on {date}</caption>
              <thead>
                <tr>
                  <th scope="col">Time so far</th>
                  <th scope="col" className={s.num}>
                    Households
                  </th>
                  <th scope="col" className={s.num}>
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {row.bands.map((b) => (
                  <tr key={b.id}>
                    <th scope="row">{b.id === "5-or-more-years" ? `${b.label} · open-ended` : b.label}</th>
                    <td className={s.num}>{fmt.count(b.v)}</td>
                    <td className={s.num}>{row.total > 0 ? `${((b.v / row.total) * 100).toFixed(0)}%` : "—"}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Total</th>
                  <td className={s.num}>{fmt.count(row.total)}</td>
                  <td className={s.num}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>
      </div>

      <div className={s.split}>
        <section className={s.section} aria-label="Who is living in temporary accommodation">
          <p className="bo-label">Who · England · stock on {date}</p>
          {children != null && (
            <p className={s.big}>
              <span className="bo-fig">{fmt.count(children)}</span>
              <span>children living in these households</span>
            </p>
          )}
          <ul className={s.rows}>
            {insecurity.taHouseholdComposition.map((c) => (
              <li key={c.id} className={s.row}>
                <span className={s.rowName}>{c.label}</span>
                <span className={s.rowValue}>{fmt.count(c.v)}</span>
                <span className={s.rowMeta}>households · TA2</span>
              </li>
            ))}
          </ul>
          <p className={s.note}>
            Household types overlap: households with dependent children include both one-adult and
            two-adult households. They are not added together.
          </p>
        </section>
        <section className={s.section} aria-label="Temporary accommodation over time">
          <p className="bo-label">Over time · England · stock at each quarter end</p>
          <TimeChart
            series={series}
            cadence="quarterly"
            format={fmt.count}
            axisFormat={fmt.countCompact}
            height={260}
            label="Households in temporary accommodation in England, total and with children"
          />
        </section>
      </div>

      <p className={s.note}>
        Everything on this page counts households in temporary accommodation on one date and how
        long each had been there so far. It does not show how long a stay will last when it ends. A
        one-day count over-represents long stays compared with all the households who pass through
        in a year, because short stays turn over quickly. Entries to and exits from temporary
        accommodation are not loaded, so they are not shown. Average days by accommodation type
        (TA7) are published by local authority and appear under Displacement.
      </p>
    </div>
  );
}
