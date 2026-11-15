"use client";

/**
 * Tax 02 — The Tax Machine.
 *
 * One engraved rule of gross income, £0 to £140,000, the same for every tax year and place so
 * the reader sees the rules move rather than the scale. Income-tax bands are measured segments
 * on the rule: the part of a band the chosen income reaches is filled with that band's pen
 * pattern, the part it never reaches is an outline, and the personal allowance (no tax) is a
 * dashed outline. Beneath each band the tax it takes is drawn as a block on the same pounds
 * scale. Employee National Insurance is a second rule — a separate stage, never blended.
 *
 * The same rule stacked one row per tax year is the time machine: a frozen threshold is a
 * segment edge that stops moving. The frozen-threshold study adds the observed earnings path
 * as a pointer walking up those rows, with open rings where the thresholds would have been had
 * they risen with earnings.
 *
 * One ink. Every length is a published pound figure on one fixed scale.
 */

import { useId, useMemo, useState, type MouseEvent } from "react";
import { useWidth } from "../useWidth";
import { useTweened } from "../instrument/motion";
import { ReadoutCard, type ReadoutRow } from "../instrument/ReadoutCard";
import s from "./taxMachine.module.css";
import {
  bandPattern,
  formatGbp,
  type BandPattern,
  type TaxMachineResult,
} from "./tax-machine-model";
import type { YearRow } from "./tax-timemachine-model";
import type { FiscalDragProfile } from "./types";

export const AXIS_MAX = 140_000;
const PAD = { left: 8, right: 8 };

function fmtK(v: number): string {
  return v === 0 ? "£0" : `£${Math.round(v / 1000)}k`;
}
function fmtWhole(v: number): string {
  return `£${Math.round(v).toLocaleString("en-GB")}`;
}

/* ——— shared marks ——— */

export function Patterns({ uid }: { uid: string }) {
  return (
    <defs>
      <pattern id={`${uid}-stipple`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx="2" cy="2" r="0.85" className={s.inkFill} />
      </pattern>
      <pattern id={`${uid}-sparse`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx="3.5" cy="3.5" r="0.9" className={s.inkFill} />
      </pattern>
      <pattern id={`${uid}-hatch`} width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4.5" className={s.penLine} />
      </pattern>
      <pattern id={`${uid}-cross`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" className={s.penLine} />
        <line x1="0" y1="0" x2="6" y2="0" className={s.penLine} />
      </pattern>
      <pattern id={`${uid}-engrave`} width="8" height="4" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0.5" x2="8" y2="0.5" className={s.penLine} />
      </pattern>
    </defs>
  );
}

export function fillFor(uid: string, p: BandPattern): string {
  return p === "solid" ? "var(--bo-ink)" : `url(#${uid}-${p})`;
}

export function Swatch({ uid, pattern, open }: { uid: string; pattern?: BandPattern; open?: boolean }) {
  return (
    <svg width="16" height="10" aria-hidden="true">
      {open ? (
        <rect x="0.5" y="0.5" width="15" height="9" className={s.segAllowance} />
      ) : (
        <rect x="0.5" y="0.5" width="15" height="9" fill={fillFor(uid, pattern ?? "solid")} className={s.seg} />
      )}
    </svg>
  );
}

type Scale = { x: (v: number) => number; left: number; right: number; w: number };

type ReadRow = ReadoutRow;

/** Statutory income tax on `gross` from a row's bands (edges already in gross pounds). */
function rowIncomeTax(row: YearRow, gross: number): number {
  let total = 0;
  for (const b of row.bands) {
    const to = b.toGross ?? Infinity;
    const slice = Math.max(0, Math.min(gross, to) - b.fromGross);
    total += (slice * b.ratePercent) / 100;
  }
  return Math.round(total * 100) / 100;
}

function fmtRange(from: number, to: number | null): string {
  return to == null ? `${fmtWhole(from)} and above` : `${fmtWhole(from)}–${fmtWhole(to)}`;
}


export function useRowHover(width: number) {
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);
  const onMove = (i: number) => (e: MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    const px = rect ? e.clientX - rect.left : 0;
    setHover({ i, x: Math.max(0, Math.min(px + 14, width - 340)) });
  };
  const onLeave = () => setHover(null);
  return { hover, onMove, onLeave };
}

function useScale(width: number): Scale {
  const w = Math.max(200, width - PAD.left - PAD.right);
  const x = (v: number) => PAD.left + (Math.min(AXIS_MAX, Math.max(0, v)) / AXIS_MAX) * w;
  return { x, left: PAD.left, right: PAD.left + w, w };
}

function Axis({ sc, y, narrow }: { sc: Scale; y: number; narrow: boolean }) {
  const major = narrow ? 40_000 : 20_000;
  const ticks: number[] = [];
  for (let v = 0; v <= AXIS_MAX; v += 10_000) ticks.push(v);
  return (
    <g>
      <line x1={sc.left} x2={sc.right} y1={y} y2={y} className={s.rule} />
      {ticks.map((v) => {
        const isMajor = v % major === 0;
        return (
          <g key={v}>
            <line x1={sc.x(v)} x2={sc.x(v)} y1={y} y2={y + (isMajor ? 8 : 5)} className={isMajor ? s.tick : s.tickMinor} />
            {isMajor ? (
              <text x={sc.x(v)} y={y + 20} textAnchor={v === 0 ? "start" : v === AXIS_MAX ? "end" : "middle"} className={s.tickText}>
                {fmtK(v)}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/** A band on the rule: filled to `reach`, outline beyond, running off the edge when open. */
function Segment({
  uid,
  sc,
  y,
  h,
  from,
  to,
  reach,
  pattern,
}: {
  uid: string;
  sc: Scale;
  y: number;
  h: number;
  from: number;
  to: number | null;
  reach: number;
  pattern: BandPattern;
}) {
  const open = to == null;
  const end = open ? AXIS_MAX : to;
  const x0 = sc.x(from);
  const x1 = sc.x(end);
  const xr = sc.x(Math.min(end, Math.max(from, reach)));
  return (
    <g>
      {xr - x0 > 0 ? <rect x={x0} y={y} width={xr - x0} height={h} fill={fillFor(uid, pattern)} className={s.seg} /> : null}
      {x1 - xr > 0 ? <rect x={xr} y={y} width={x1 - xr} height={h} className={s.segEmpty} /> : null}
      {open ? (
        // the band runs on past the rule: open end, no closing stroke
        <>
          <rect x={x1 - 1} y={y - 0.5} width={3} height={h + 1} fill="var(--bo-paper)" stroke="none" />
          <line x1={x1 + 1} x2={x1 + 1} y1={y} y2={y + h} className={s.segOpen} />
        </>
      ) : null}
    </g>
  );
}

function Allowance({ sc, y, h, to }: { sc: Scale; y: number; h: number; to: number }) {
  const x0 = sc.x(0);
  const x1 = sc.x(to);
  return x1 - x0 > 0 ? <rect x={x0} y={y} width={x1 - x0} height={h} className={s.segAllowance} /> : null;
}

/* ——— 1 · This year's rules: two strips ——— */

const RULE_H = 112;
const SEG_Y = 26;
const SEG_H = 18;
const RULE_Y = 54;
const TAX_Y = 90;
const TAX_H = 10;

export function TaxRuleStrips({
  result,
  nicsNote,
  label,
}: {
  result: TaxMachineResult;
  /** Shown instead of the National Insurance strip when the year has no single pinned rule. */
  nicsNote?: string;
  label: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const sc = useScale(width);
  const narrow = width < 560;

  const target = useMemo(() => {
    const t: Record<string, number> = { g: result.gross };
    result.bandSlices.forEach((b, i) => (t[`b${i}`] = b.tax));
    for (let i = result.bandSlices.length; i < 6; i++) t[`b${i}`] = 0;
    result.nicSlices.forEach((n, i) => (t[`n${i}`] = n.tax));
    for (let i = result.nicSlices.length; i < 2; i++) t[`n${i}`] = 0;
    return t;
  }, [result]);
  const tw = useTweened(target) ?? target;
  const gx = sc.x(tw.g ?? result.gross);
  const grossLabelEnd = gx > sc.left + sc.w * 0.7;

  const aria = `${label}. Gross ${formatGbp(result.gross)}: income tax ${formatGbp(result.incomeTax)}${
    result.employeeNics != null ? `, employee National Insurance ${formatGbp(result.employeeNics)}` : ""
  }.`;

  const Pointer = () => (
    <g>
      <line x1={gx} x2={gx} y1={SEG_Y - 8} y2={TAX_Y + TAX_H + 2} className={s.pointerLine} />
      <circle cx={gx} cy={RULE_Y} r={5} className={s.pointer} />
      <text x={gx + (grossLabelEnd ? -8 : 8)} y={SEG_Y - 10} textAnchor={grossLabelEnd ? "end" : "start"} className={s.label}>
        Gross {fmtWhole(result.gross)}
      </text>
    </g>
  );

  return (
    <div ref={wrapRef} className={s.root} role="group" aria-label={aria}>
      {/* Income tax */}
      <div className={s.strip}>
        <div className={s.stripHead}>
          <span className={`bo-label ${s.stripTitle}`}>Income tax</span>
          <span className={s.stripFig}>
            {formatGbp(result.incomeTax)}
            <small>{result.incomeTax > 0 ? `${((result.incomeTax / result.gross) * 100).toFixed(1)}% of gross` : "none due"}</small>
          </span>
        </div>
        <svg className={s.svg} viewBox={`0 0 ${width} ${RULE_H}`} width={width} height={RULE_H} aria-hidden="true">
          <Patterns uid={uid} />
          <Allowance sc={sc} y={SEG_Y} h={SEG_H} to={result.allowance} />
          {result.bandSlices.map((b) => (
            <Segment key={b.bandId} uid={uid} sc={sc} y={SEG_Y} h={SEG_H} from={b.fromGross} to={b.toGross} reach={result.gross} pattern={bandPattern(b.bandId)} />
          ))}
          <Axis sc={sc} y={RULE_Y} narrow={narrow} />
          {result.bandSlices.map((b, i) => {
            const tax = tw[`b${i}`] ?? b.tax;
            const w = (tax / AXIS_MAX) * sc.w;
            return w > 0 ? (
              <rect key={b.bandId} x={sc.x(b.fromGross)} y={TAX_Y} width={w} height={TAX_H} fill={fillFor(uid, bandPattern(b.bandId))} className={s.taxBar} />
            ) : null;
          })}
          <Pointer />
        </svg>
        <ul className={s.key} aria-label="Key">
          <li>
            <Swatch uid={uid} open />
            <span>Personal allowance · 0%</span>
            <b className="bo-num">{fmtWhole(result.allowance)}</b>
          </li>
          {result.bandSlices.map((b) => (
            <li key={b.bandId}>
              <Swatch uid={uid} pattern={bandPattern(b.bandId)} />
              <span>
                {b.label} · {b.ratePercent}%
              </span>
              <b className="bo-num">{b.tax > 0 ? formatGbp(b.tax) : "—"}</b>
            </li>
          ))}
        </ul>
      </div>

      {/* Employee National Insurance — separate stage */}
      <div className={s.strip}>
        <div className={s.stripHead}>
          <span className={`bo-label ${s.stripTitle}`}>Employee National Insurance · Class 1</span>
          {result.employeeNics != null ? (
            <span className={s.stripFig}>
              {formatGbp(result.employeeNics)}
              <small>{result.employeeNics > 0 ? `${((result.employeeNics / result.gross) * 100).toFixed(1)}% of gross` : "none due"}</small>
            </span>
          ) : (
            <span className={s.stripFig}>
              —<small>{nicsNote ?? "Not pinned for this tax year"}</small>
            </span>
          )}
        </div>
        {result.employeeNics != null ? (
          <>
            <svg className={s.svg} viewBox={`0 0 ${width} ${RULE_H}`} width={width} height={RULE_H} aria-hidden="true">
              <Patterns uid={uid} />
              {result.nicSlices[0] ? <Allowance sc={sc} y={SEG_Y} h={SEG_H} to={result.nicSlices[0].fromGross} /> : null}
              {result.nicSlices.map((n, i) => (
                <Segment key={n.id} uid={uid} sc={sc} y={SEG_Y} h={SEG_H} from={n.fromGross} to={n.toGross} reach={result.gross} pattern={i === 0 ? "solid" : "hatch"} />
              ))}
              <Axis sc={sc} y={RULE_Y} narrow={narrow} />
              {result.nicSlices.map((n, i) => {
                const tax = tw[`n${i}`] ?? n.tax;
                const w = (tax / AXIS_MAX) * sc.w;
                return w > 0 ? (
                  <rect key={n.id} x={sc.x(n.fromGross)} y={TAX_Y} width={w} height={TAX_H} fill={fillFor(uid, i === 0 ? "solid" : "hatch")} className={s.taxBar} />
                ) : null;
              })}
              <Pointer />
            </svg>
            <ul className={s.key} aria-label="Key">
              <li>
                <Swatch uid={uid} open />
                <span>Below primary threshold · 0%</span>
                <b className="bo-num">{result.nicSlices[0] ? fmtWhole(result.nicSlices[0].fromGross) : "—"}</b>
              </li>
              {result.nicSlices.map((n, i) => (
                <li key={n.id}>
                  <Swatch uid={uid} pattern={i === 0 ? "solid" : "hatch"} />
                  <span>
                    {n.label} · {n.ratePercent}%
                  </span>
                  <b className="bo-num">{n.tax > 0 ? formatGbp(n.tax) : "—"}</b>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ——— 2 · How the rules changed: one row per tax year ——— */

const ROW_H = 26;
const ROW_SEG_H = 14;
const ROWS_TOP = 22;
const ROWS_AXIS_GAP = 10;

export function TaxYearRows({
  rows,
  gross,
  label,
  gutter = 64,
}: {
  rows: YearRow[];
  /** Chosen gross income: fills every year's bands up to it. */
  gross: number;
  label: string;
  gutter?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const narrow = width < 560;
  const g = narrow ? 52 : gutter;
  const sc = useScale(width - g);
  const shift = (v: number) => sc.x(v) + g;
  const scG: Scale = { x: shift, left: sc.left + g, right: sc.right + g, w: sc.w };

  const target = useMemo(() => ({ g: gross }), [gross]);
  const tw = useTweened(target) ?? target;
  const gx = shift(tw.g ?? gross);
  const grossLabelEnd = gx > scG.left + scG.w * 0.7;

  const axisY = ROWS_TOP + rows.length * ROW_H + ROWS_AXIS_GAP;
  const height = axisY + 28;

  const keyBands = useMemo(() => {
    const seen = new Map<string, { label: string; pattern: BandPattern }>();
    for (const r of rows) for (const b of r.bands) if (!seen.has(b.bandId)) seen.set(b.bandId, { label: b.label, pattern: bandPattern(b.bandId) });
    return [...seen.values()];
  }, [rows]);

  const first = rows[0]?.taxYearLabel ?? "";
  const last = rows[rows.length - 1]?.taxYearLabel ?? "";
  const aria = `${label}. Income-tax bands on a gross-income rule, one row per tax year from ${first} to ${last}, with ${fmtWhole(gross)} marked.`;
  const { hover, onMove, onLeave } = useRowHover(width);
  const hoverRow = hover ? rows[hover.i] : null;
  const readRows: ReadRow[] = hoverRow
    ? hoverRow.gap
      ? [{ label: "Bands", value: "not pinned" }]
      : [
          { label: "Personal allowance", value: hoverRow.personalAllowance != null ? fmtWhole(hoverRow.personalAllowance) : "—" },
          ...hoverRow.bands.map((b) => ({ label: `${b.label} · ${b.ratePercent}%`, value: fmtRange(b.fromGross, b.toGross) })),
          { label: `Income tax on ${fmtWhole(gross)}`, value: formatGbp(rowIncomeTax(hoverRow, gross)) },
          ...(hoverRow.nicPt != null && hoverRow.nicUel != null
            ? [{ label: "National Insurance thresholds", value: `${fmtWhole(hoverRow.nicPt)} · ${fmtWhole(hoverRow.nicUel)}` }]
            : [{ label: "National Insurance", value: "rates changed mid-year" }]),
        ]
    : [];

  return (
    <div ref={wrapRef} className={s.root} role="group" aria-label={aria}>
      <div className={s.strip}>
        <svg className={s.svg} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" onMouseLeave={onLeave}>
          <Patterns uid={uid} />
          {rows.map((r, i) => {
            const y = ROWS_TOP + i * ROW_H;
            const segY = y + (ROW_H - ROW_SEG_H) / 2 - 2;
            return (
              <g key={r.taxYear} onMouseMove={onMove(i)}>
                <rect x={0} y={y} width={width} height={ROW_H} className={s.rowHit} />
                <text x={g - 8} y={segY + ROW_SEG_H - 3} textAnchor="end" className={s.rowLabel}>
                  {r.taxYearLabel}
                </text>
                {r.gap ? (
                  <>
                    <line x1={scG.left} x2={scG.right} y1={segY + ROW_SEG_H / 2} y2={segY + ROW_SEG_H / 2} className={s.gapRow} />
                    <text x={scG.left + 6} y={segY + ROW_SEG_H - 3} className={s.rowNote}>
                      not pinned
                    </text>
                  </>
                ) : (
                  <>
                    {r.personalAllowance != null ? <Allowance sc={scG} y={segY} h={ROW_SEG_H} to={r.personalAllowance} /> : null}
                    {r.bands.map((b) => (
                      <Segment key={b.bandId} uid={uid} sc={scG} y={segY} h={ROW_SEG_H} from={b.fromGross} to={b.toGross} reach={gross} pattern={bandPattern(b.bandId)} />
                    ))}
                    {r.nicPt != null ? <line x1={shift(r.nicPt)} x2={shift(r.nicPt)} y1={segY + ROW_SEG_H + 2} y2={segY + ROW_SEG_H + 7} className={s.nicTick} /> : null}
                    {r.nicUel != null ? <line x1={shift(r.nicUel)} x2={shift(r.nicUel)} y1={segY + ROW_SEG_H + 2} y2={segY + ROW_SEG_H + 7} className={s.nicTick} /> : null}
                    {r.mirrored && !(rows[i - 1]?.mirrored) ? (
                      <text x={scG.right - 4} y={segY + ROW_SEG_H - 3} textAnchor="end" className={s.rowNote}>
                        same as England, Wales &amp; NI
                      </text>
                    ) : null}
                  </>
                )}
              </g>
            );
          })}
          <Axis sc={scG} y={axisY} narrow={narrow} />
          <line x1={gx} x2={gx} y1={ROWS_TOP - 6} y2={axisY} className={s.pointerLine} />
          <circle cx={gx} cy={axisY} r={5} className={s.pointer} />
          <text x={gx + (grossLabelEnd ? -8 : 8)} y={ROWS_TOP - 8} textAnchor={grossLabelEnd ? "end" : "start"} className={s.label}>
            Gross {fmtWhole(gross)}
          </text>
        </svg>
        {hover && hoverRow ? (
          <ReadoutCard head={hoverRow.taxYearLabel} rows={readRows} style={{ top: 6, left: hover.x }} />
        ) : null}
        <ul className={s.key} aria-label="Key">
          <li>
            <Swatch uid={uid} open />
            <span>Personal allowance</span>
          </li>
          {keyBands.map((b) => (
            <li key={b.label}>
              <Swatch uid={uid} pattern={b.pattern} />
              <span>{b.label}</span>
            </li>
          ))}
          <li>
            <svg width="16" height="10" aria-hidden="true">
              <line x1="5" x2="5" y1="1" y2="9" className={s.nicTick} />
              <line x1="11" x2="11" y1="1" y2="9" className={s.nicTick} />
            </svg>
            <span>National Insurance thresholds</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ——— 3 · Frozen thresholds: the earnings path walks up the rows ——— */

export function TaxDragRows({
  profile,
  rows,
  label,
  gutter = 64,
}: {
  profile: FiscalDragProfile;
  /** Archive rows for the profile's place, one per profile year, in order. */
  rows: YearRow[];
  label: string;
  gutter?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const narrow = width < 560;
  const g = narrow ? 52 : gutter;
  const sc = useScale(width - g);
  const shift = (v: number) => sc.x(v) + g;
  const scG: Scale = { x: shift, left: sc.left + g, right: sc.right + g, w: sc.w };

  const years = useMemo(() => [...profile.years].sort((a, b) => a.tax_year.localeCompare(b.tax_year)), [profile]);
  const byYear = useMemo(() => new Map(rows.map((r) => [r.taxYear, r])), [rows]);
  const hasCf = years.some((y) => y.counterfactual_thresholds_indexed_to_awe != null);

  const axisY = ROWS_TOP + years.length * ROW_H + ROWS_AXIS_GAP;
  const height = axisY + 28;

  const keyBands = useMemo(() => {
    const seen = new Map<string, { label: string; pattern: BandPattern }>();
    for (const r of rows) for (const b of r.bands) if (!seen.has(b.bandId)) seen.set(b.bandId, { label: b.label, pattern: bandPattern(b.bandId) });
    return [...seen.values()];
  }, [rows]);

  const firstY = years[0];
  const lastY = years[years.length - 1];
  const aria = `${label}. Earnings path from ${firstY ? fmtWhole(firstY.awe_annualised_x52_gbp) : ""} to ${lastY ? fmtWhole(lastY.awe_annualised_x52_gbp) : ""} drawn across each year's income-tax bands.`;
  const { hover, onMove, onLeave } = useRowHover(width);
  const hoverYear = hover ? years[hover.i] : null;
  const readRows: ReadRow[] = hoverYear
    ? (() => {
        const cf = hoverYear.counterfactual_thresholds_indexed_to_awe;
        const out: ReadRow[] = [
          { label: "Average earnings that year", value: fmtWhole(hoverYear.awe_annualised_x52_gbp) },
          { label: "Personal allowance", value: fmtWhole(hoverYear.actual_statutory.personal_allowance_applied_gbp) },
          { label: "Income tax", value: formatGbp(hoverYear.actual_statutory.income_tax_gbp) },
          { label: "Effective rate", value: `${hoverYear.actual_statutory.effective_income_tax_rate_percent.toFixed(2)}%` },
        ];
        if (cf) {
          out.push(
            { label: "Allowance if it rose with earnings", value: fmtWhole(cf.personal_allowance_gbp) },
            { label: "Basic-rate limit if it rose with earnings", value: fmtWhole(cf.personal_allowance_gbp + cf.basic_upper_after_allowance_gbp) },
            { label: "Income tax then", value: formatGbp(cf.liability.income_tax_gbp) },
            { label: "Extra tax from the freeze", value: formatGbp(cf.extra_tax_vs_counterfactual_gbp) },
          );
        }
        return out;
      })()
    : [];

  return (
    <div ref={wrapRef} className={s.root} role="group" aria-label={aria}>
      <div className={s.strip}>
        <svg className={s.svg} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" onMouseLeave={onLeave}>
          <Patterns uid={uid} />
          {years.map((y, i) => {
            const r = byYear.get(y.tax_year);
            const rowY = ROWS_TOP + i * ROW_H;
            const segY = rowY + (ROW_H - ROW_SEG_H) / 2 - 2;
            const gross = y.awe_annualised_x52_gbp;
            const cf = y.counterfactual_thresholds_indexed_to_awe;
            return (
              <g key={y.tax_year} onMouseMove={onMove(i)}>
                <rect x={0} y={rowY} width={width} height={ROW_H} className={s.rowHit} />
                <text x={g - 8} y={segY + ROW_SEG_H - 3} textAnchor="end" className={s.rowLabel}>
                  {y.tax_year.replace("-", "–")}
                </text>
                {!r || r.gap ? (
                  <line x1={scG.left} x2={scG.right} y1={segY + ROW_SEG_H / 2} y2={segY + ROW_SEG_H / 2} className={s.gapRow} />
                ) : (
                  <>
                    {r.personalAllowance != null ? <Allowance sc={scG} y={segY} h={ROW_SEG_H} to={r.personalAllowance} /> : null}
                    {r.bands.map((b) => (
                      <Segment key={b.bandId} uid={uid} sc={scG} y={segY} h={ROW_SEG_H} from={b.fromGross} to={b.toGross} reach={gross} pattern={bandPattern(b.bandId)} />
                    ))}
                  </>
                )}
                {cf ? (
                  <>
                    <line x1={shift(cf.personal_allowance_gbp)} x2={shift(cf.personal_allowance_gbp)} y1={segY + ROW_SEG_H + 2} y2={segY + ROW_SEG_H + 8} className={s.cfTick} />
                    <line
                      x1={shift(cf.personal_allowance_gbp + cf.basic_upper_after_allowance_gbp)}
                      x2={shift(cf.personal_allowance_gbp + cf.basic_upper_after_allowance_gbp)}
                      y1={segY + ROW_SEG_H + 2}
                      y2={segY + ROW_SEG_H + 8}
                      className={s.cfTick}
                    />
                  </>
                ) : null}
                {/* the year's average earnings: a solid mark through the row */}
                <line x1={shift(gross)} x2={shift(gross)} y1={segY - 3} y2={segY + ROW_SEG_H + 3} className={s.earnMark} />
              </g>
            );
          })}
          {firstY && lastY ? (
            <text x={scG.left} y={ROWS_TOP - 8} className={s.label}>
              Average earnings {fmtWhole(firstY.awe_annualised_x52_gbp)} to {fmtWhole(lastY.awe_annualised_x52_gbp)}
            </text>
          ) : null}
          <Axis sc={scG} y={axisY} narrow={narrow} />
        </svg>
        <ul className={s.key} aria-label="Key">
          <li>
            <Swatch uid={uid} open />
            <span>Personal allowance</span>
          </li>
          {keyBands.map((b) => (
            <li key={b.label}>
              <Swatch uid={uid} pattern={b.pattern} />
              <span>{b.label}</span>
            </li>
          ))}
          <li>
            <svg width="16" height="10" aria-hidden="true">
              <line x1="8" x2="8" y1="0" y2="10" className={s.earnMark} />
            </svg>
            <span>Average earnings that year</span>
          </li>
          {hasCf ? (
            <li>
              <svg width="16" height="10" aria-hidden="true">
                <line x1="5" x2="5" y1="1" y2="9" className={s.cfTick} />
                <line x1="11" x2="11" y1="1" y2="9" className={s.cfTick} />
              </svg>
              <span>Thresholds had they risen with earnings</span>
            </li>
          ) : null}
        </ul>
        {hover && hoverYear ? (
          <ReadoutCard head={hoverYear.tax_year.replace("-", "–")} rows={readRows} style={{ top: 6, left: hover.x }} />
        ) : null}
      </div>
    </div>
  );
}
