"use client";

/**
 * Domain 05 — The Housing Supply Machine (flagship).
 *
 * A measured section through a place's dwelling stock for one financial year, drawn from
 * MHCLG Live Table 118 (unrounded). The publisher's identity (LT118 note 1):
 *
 *   net additions = new build + net conversions + net change of use + net other gains
 *                   − demolitions + adjustment to Census   (+ a small residual, note 6)
 *
 * Every bay is a published count on one fixed vertical scale per place (all years), so
 * moving the year or comparing two years is an honest reading. Losses hang below the running
 * level and are labelled as subtractions. The Census adjustment is drawn dashed: it is a
 * statistical reconciliation, not buildings. Any gap between the published terms and the
 * published net is printed as unreconciled — never absorbed.
 *
 * Datum = all-dwellings stock at 31 March (Live Table 109c), shown behind a break line
 * because it is ~100× the drawing's height.
 *
 * URL state (owned by HousingExplorer): place (region code; England = none), to (FY start
 * year — shared with other domains' period), vs (comparison year), part (selected term),
 * panel (section | ledger). Controls live in HousingExplorer ControlRows, not in the body.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyStage } from "../../..";
import { fmt, niceTicks } from "../../../data";
import { useWidth } from "../../../useWidth";
import type { HousingV1, SupplyLedgerYear } from "../../load";
import s from "./supplyMachine.module.css";

export type MachinePanel = "section" | "ledger";

export type SupplyMachineState = {
  place: string;
  /** FY start year (2024 = 2024–25); null = latest. */
  year: number | null;
  /** Comparison FY start year; null = off. */
  vs: number | null;
  part: TermId | null;
  panel: MachinePanel;
};

type Props = {
  machine: HousingV1["supplyMachine"];
  state: SupplyMachineState;
  onChange: (next: Partial<SupplyMachineState>) => void;
};

export const MACHINE_PANEL_OPTIONS: { value: MachinePanel; label: string }[] = [
  { value: "section", label: "Diagram" },
  { value: "ledger", label: "Table" },
];

const yearOfRow = (r: SupplyLedgerYear) => Math.floor(r.t + 1e-6);

export function supplyPlaceOptions(machine: HousingV1["supplyMachine"]): { value: string; label: string }[] {
  return machine.places.map((p) => ({ value: p.code, label: p.label }));
}

export function supplyYearOptions(
  machine: HousingV1["supplyMachine"],
  place: string,
): { value: string; label: string }[] {
  const rows = machine.byPlace[place] ?? [];
  return [...rows].reverse().map((r) => ({
    value: String(yearOfRow(r)),
    label: r.status === "provisional" ? `${r.fy} provisional` : r.fy,
  }));
}

export function supplyVsOptions(
  machine: HousingV1["supplyMachine"],
  place: string,
  year: number | null,
): { value: string; label: string }[] {
  const rows = machine.byPlace[place] ?? [];
  const y = year ?? (rows.length ? yearOfRow(rows[rows.length - 1]!) : null);
  return [
    { value: "", label: "No comparison" },
    ...rows
      .filter((r) => y == null || yearOfRow(r) !== y)
      .map((r) => ({ value: String(yearOfRow(r)), label: r.fy })),
  ];
}

export function supplyMachineFoot(
  machine: HousingV1["supplyMachine"],
  state: SupplyMachineState,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const place = machine.places.find((p) => p.code === state.place) ?? machine.places[0] ?? null;
  const rows = place ? (machine.byPlace[place.code] ?? []) : [];
  const years = rows.map(yearOfRow);
  const year = state.year != null && years.includes(state.year) ? state.year : (years[years.length - 1] ?? null);
  const row = year != null ? (rows.find((r) => yearOfRow(r) === year) ?? null) : null;
  const residual = row?.residual ?? 0;
  const gap =
    row != null
      ? (row.net ?? 0) -
        TERMS.filter((t) => t.id !== "net").reduce((sum, t) => sum + (contribution(row, t) ?? 0), 0) -
        residual
      : 0;
  const check = row ? unreconciledNote(row, gap) : null;
  const publisher = row
    ? row.notes.filter((n) => NOTE_TEXT[n] && NOTE_TEXT[n] !== check && !(n === "[note 6]" && residual === 0))
    : [];
  return {
    definition:
      "Net additional dwellings is the change in the dwelling stock in a financial year. New build is only one term; conversions, change of use, demolitions and the Census adjustment also count.",
    method: [
      "Identity (Live Table 118 note 1): net = new build + net conversions + net change of use + net other gains − demolitions + Census adjustment (+ residual, note 6).",
      "The section uses one vertical scale per place across every year so comparisons are honest. Demolitions hang below the running level. Census is dashed: a statistical reconciliation, not buildings.",
      "A gap between the published terms and the published net is printed as unreconciled — never absorbed.",
      check ?? "",
      ...publisher.map((n) => NOTE_TEXT[n]!),
    ].filter(Boolean),
    source: row
      ? `MHCLG · Live Table 118 · ${place?.label ?? "England"} · ${row.fy}${row.status === "provisional" ? " · provisional" : ""}`
      : "MHCLG · Live Table 118 · England and English regions",
    dataHref: "/data#net-additional-dwellings",
  };
}

export type TermId = "new-build" | "conversions" | "change-of-use" | "other-gains" | "demolitions" | "census" | "net";

type Texture = "stipple" | "hatch" | "cross" | "sparse" | "void" | "dashed" | "engrave";

type Term = {
  id: TermId;
  n: string;
  label: string;
  /** Publisher row name in LT118. */
  row: string;
  short: string[];
  /** One word under the bay when the column is too narrow for two lines. */
  axis: string;
  /** Operator printed before the term in the equation row. */
  op: "+" | "−" | "=";
  /** +1 adds the published value; −1 subtracts it (demolitions). */
  sign: 1 | -1;
  field: keyof SupplyLedgerYear;
  texture: Texture;
  definition: string;
};

const TERMS: Term[] = [
  {
    id: "new-build",
    n: "01",
    label: "New build",
    row: "New build",
    short: ["New", "build"],
    axis: "Build",
    op: "+",
    sign: 1,
    field: "newBuild",
    texture: "stipple",
    definition:
      "Newly built dwellings completed in the year, from the Net Supply of Housing return. It is collected over a longer window than quarterly housebuilding completions (Live Table 213), so the two do not match (note 3).",
  },
  {
    id: "conversions",
    n: "02",
    label: "Net conversions",
    row: "Net conversions",
    short: ["Conver-", "sions"],
    axis: "Convert",
    op: "+",
    sign: 1,
    field: "conversions",
    texture: "hatch",
    definition:
      "Dwellings gained minus dwellings lost when existing homes are subdivided or merged, such as a house split into flats or flats returned to a house. It is a net figure and can be negative.",
  },
  {
    id: "change-of-use",
    n: "03",
    label: "Net change of use",
    row: "Net change of use",
    short: ["Change", "of use"],
    axis: "Use",
    op: "+",
    sign: 1,
    field: "changeOfUse",
    texture: "cross",
    definition:
      "Dwellings gained minus lost when buildings move between non-residential and residential use (offices, shops, agricultural buildings), including homes made under permitted development rights.",
  },
  {
    id: "other-gains",
    n: "04",
    label: "Net other gains and losses",
    row: "Net other gains and losses",
    short: ["Other", "gains"],
    axis: "Other",
    op: "+",
    sign: 1,
    field: "otherGains",
    texture: "sparse",
    definition:
      "Other recorded gains and losses returned by local authorities, such as caravans, houseboats and mobile homes. It is a net figure and can be negative.",
  },
  {
    id: "demolitions",
    n: "05",
    label: "Demolitions",
    row: "Demolitions",
    short: ["Demol-", "itions"],
    axis: "Demol.",
    op: "−",
    sign: -1,
    field: "demolitions",
    texture: "void",
    definition:
      "Dwellings demolished in the year. Published as a positive count and subtracted from the total (note 4). Drawn as a void cut downward from the running level.",
  },
  {
    id: "census",
    n: "06",
    label: "Adjustment to Census",
    row: "Adjustment to Census 2011 / 2021",
    short: ["Census", "adj."],
    axis: "Census",
    op: "+",
    sign: 1,
    field: "census",
    texture: "dashed",
    definition:
      "A statistical reconciliation, not a physical change. MHCLG spreads the gap between its annual estimates and the 2011 and 2021 Census dwelling counts evenly across the years between censuses. Marked not applicable from 2021–22.",
  },
  {
    id: "net",
    n: "07",
    label: "Net additional dwellings",
    row: "Net additions",
    short: ["Net", "additions"],
    axis: "Net",
    op: "=",
    sign: 1,
    field: "net",
    texture: "engrave",
    definition:
      "The net change in the dwelling stock between 1 April and 31 March: new build plus net conversions, net change of use and net other gains, minus demolitions, plus the adjustment to Census (note 1).",
  },
];
const PARTS = TERMS.filter((t) => t.id !== "net");

const TERM_IDS = new Set<string>(TERMS.map((t) => t.id));
export const isTermId = (v: string | null): v is TermId => v != null && TERM_IDS.has(v);

const NOTE_TEXT: Record<string, string> = {
  "[note 2]": "2006–07 and 2007–08 breakdowns were partly estimated for regions submitting a joint return (note 2).",
  "[note 6]": "Earlier years are less reliable, so a small residual remains between the components and the total (note 6).",
};

const signed = (v: number) => (Math.abs(v) < 0.5 ? "0" : `${v < 0 ? "−" : "+"}${fmt.count(Math.abs(v))}`);
const signedCompact = (v: number) => `${v < 0 ? "−" : "+"}${fmt.countCompact(Math.abs(v))}`;

/** Signed contribution of a term in a year (demolitions negative); null if not published. */
function contribution(r: SupplyLedgerYear, term: Term): number | null {
  const raw = r[term.field] as number | null;
  return raw == null ? null : raw * term.sign;
}

type Bay = { term: Term; v: number | null; from: number; to: number };

/** Run the identity: each part starts where the last ended; net stands on the datum. */
function section(vals: Record<TermId, number | null>): { bays: Bay[]; sum: number } {
  let level = 0;
  const bays: Bay[] = [];
  for (const term of PARTS) {
    const v = vals[term.id];
    const from = level;
    level += v ?? 0;
    bays.push({ term, v, from, to: level });
  }
  const net = vals.net;
  bays.push({ term: TERMS[TERMS.length - 1]!, v: net, from: 0, to: net ?? 0 });
  return { bays, sum: level };
}

function valuesOf(r: SupplyLedgerYear): Record<TermId, number | null> {
  return Object.fromEntries(TERMS.map((t) => [t.id, contribution(r, t)])) as Record<TermId, number | null>;
}

/** Restrained numeric tween (≈0.5s ease-in-out); instant with reduced motion. */
function useTween(target: number[], ms = 520): number[] {
  const [cur, setCur] = useState(target);
  const curRef = useRef(target);
  const key = target.join("|");
  useEffect(() => {
    const start = curRef.current;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || start.length !== target.length) {
      curRef.current = target;
      setCur(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const next = target.map((v, i) => start[i]! + (v - start[i]!) * e);
      curRef.current = next;
      setCur(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key encodes target
  }, [key, ms]);
  return cur;
}

function unreconciledNote(r: SupplyLedgerYear, gap: number): string {
  if (Math.abs(gap) < 0.5) return "The published terms reproduce the published net exactly.";
  if (r.notes.includes("[note 2]")) return NOTE_TEXT["[note 2]"]!;
  return "Rounding inside the publisher's unrounded table.";
}

/* ——— Drawing ——— */

function Patterns({ uid }: { uid: string }) {
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
      <pattern id={`${uid}-ground`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" className={s.groundLine} />
      </pattern>
    </defs>
  );
}

function BayShape({
  uid,
  bay,
  x,
  w,
  y,
  plain,
  selected,
  outline,
}: {
  uid: string;
  bay: Bay;
  x: number;
  w: number;
  y: (v: number) => number;
  /** Isolation: another term is selected, so this one drops its engraving. */
  plain: boolean;
  selected: boolean;
  /** Comparison year A: outline only. */
  outline: boolean;
}) {
  if (bay.v == null) {
    // Not applicable / not published: a dashed level tick only.
    const yl = y(bay.from);
    return <line x1={x} x2={x + w} y1={yl} y2={yl} className={s.naTick} />;
  }
  const y0 = y(Math.max(bay.from, bay.to));
  const y1 = y(Math.min(bay.from, bay.to));
  const h = Math.max(0.75, y1 - y0);
  const t = bay.term.texture;
  const cls = [s.bay, selected ? s.bayOn : "", outline ? s.bayA : ""].join(" ");
  const fill =
    outline || plain || t === "void" || t === "dashed" ? "none" : `url(#${uid}-${t})`;
  return (
    <g>
      {t === "void" && !outline && <rect x={x} y={y0} width={w} height={h} className={s.voidGround} />}
      <rect x={x} y={y0} width={w} height={h} fill={fill} className={`${cls} ${t === "dashed" ? s.bayDashed : ""}`} />
      {t === "void" && !outline && h > 3 && (
        <g className={s.voidCross}>
          <line x1={x} y1={y0} x2={x + w} y2={y0 + h} />
          <line x1={x + w} y1={y0} x2={x} y2={y0 + h} />
        </g>
      )}
    </g>
  );
}

function Section({
  uid,
  width,
  b,
  a,
  rowB,
  rowA,
  scale,
  part,
  onPart,
  placeLabel,
}: {
  uid: string;
  width: number;
  b: { bays: Bay[]; sum: number };
  a: { bays: Bay[]; sum: number } | null;
  rowB: SupplyLedgerYear;
  rowA: SupplyLedgerYear | null;
  scale: { min: number; max: number };
  part: TermId | null;
  onPart: (id: TermId) => void;
  placeLabel: string;
}) {
  const H = width < 640 ? 420 : 520;
  const padL = 56;
  const padR = 20;
  const top = 36;
  const base = H - 78;
  const span = Math.max(1, scale.max - scale.min);
  const y = (v: number) => top + ((scale.max - v) / span) * (base - top);
  const y0 = y(0);
  const plotW = width - padL - padR;
  const netGap = width >= 720 ? 18 : 8;
  const colW = (plotW - netGap) / TERMS.length;
  const colX = (i: number) => padL + i * colW + (i === TERMS.length - 1 ? netGap : 0);
  const bayW = Math.min(56, Math.max(8, colW * 0.55));
  const showWords = colW >= 72;
  const showOps = colW >= 64;

  // Scale bar: vertical, architectural (alternating segments), from the datum up.
  const ticks = niceTicks(0, scale.max, width < 640 ? 3 : 4).filter((t) => t >= 0 && t <= scale.max);
  const step = ticks.length > 1 ? ticks[1]! - ticks[0]! : scale.max;
  const segs = ticks.length > 1 ? ticks.slice(0, -1) : [];
  const sbX = padL - (width < 640 ? 34 : 46);

  return (
    <svg
      className={s.svg}
      width={width}
      height={H}
      viewBox={`0 0 ${width} ${H}`}
      role="img"
      aria-label={`Section through ${placeLabel}'s dwelling stock, ${rowB.fy}: net additions ${rowB.net != null ? fmt.count(rowB.net) : "not published"}. Full figures are on the ledger.`}
    >
      <Patterns uid={uid} />

      {/* Scale bar */}
      <g aria-hidden="true">
        <text x={sbX - 2} y={top - 26} className={s.micro}>
          SCALE
        </text>
        {segs.map((t, i) => (
          <rect
            key={t}
            x={sbX}
            y={y(t + step)}
            width={5}
            height={y(t) - y(t + step)}
            className={i % 2 === 0 ? s.scaleOn : s.scaleOff}
          />
        ))}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sbX - 3} x2={sbX + 5} y1={y(t)} y2={y(t)} className={s.ink} />
            <text x={sbX + 9} y={y(t) + 3.5} className={s.micro}>
              {fmt.countCompact(t)}
            </text>
          </g>
        ))}
      </g>

      {/* Faint level lines at scale ticks */}
      <g aria-hidden="true">
        {ticks
          .filter((t) => t > 0)
          .map((t) => (
            <line key={t} x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className={s.level} />
          ))}
      </g>

      {/* Datum: ground line + section hatching + break symbol (stock below not to scale) */}
      <g aria-hidden="true">
        <rect x={padL - 6} y={y0} width={width - padL - padR + 12} height={9} fill={`url(#${uid}-ground)`} />
        <line x1={padL - 6} x2={width - padR + 6} y1={y0} y2={y0} className={s.datum} />
        <path
          d={`M ${padL - 10} ${y0 + 13} l 4 -6 l 4 4 l 4 -6 l 4 4`}
          className={s.breakLine}
        />
      </g>

      {/* Bays */}
      {TERMS.map((term, i) => {
        const bb = b.bays[i]!;
        const ab = a?.bays[i] ?? null;
        const cx = colX(i) + colW / 2;
        const xB = a ? cx + 2 : cx - bayW / 2;
        const wB = a ? Math.max(4, bayW / 2 - 2) : bayW;
        const xA = cx - bayW / 2;
        const wA = Math.max(4, bayW / 2 - 2);
        const selected = part === term.id;
        const plain = part != null && !selected;
        const vB = bb.v;
        const labelAbove = (vB ?? 0) >= 0;
        const hiV = Math.max(bb.from, bb.to, ...(ab?.v != null ? [ab.from, ab.to] : []));
        const loV = Math.min(bb.from, bb.to, ...(ab?.v != null ? [ab.from, ab.to] : []));
        const yLab = vB == null ? y(bb.from) - 8 : labelAbove ? y(hiV) - 8 : y(loV) + 15;
        const next = b.bays[i + 1];
        const isNet = term.id === "net";
        const pub = (rowB[term.field] as number | null) ?? null;
        const label = vB == null ? "n/a" : isNet ? fmt.count(vB) : colW >= 88 ? signed(vB) : signedCompact(vB);
        const labelW = label.length * 6.4 + 6;
        const showLabel = labelW < colW - 2;
        return (
          <g key={term.id}>
            {/* Waterfall connector to the next bay (dashed = reference level) */}
            {next && !isNet && (
              <line
                x1={xB + wB}
                x2={colX(i + 1) + colW / 2 - (a ? -2 : bayW / 2)}
                y1={y(bb.to)}
                y2={y(bb.to)}
                className={s.connector}
                aria-hidden="true"
              />
            )}
            {ab && <BayShape uid={uid} bay={ab} x={xA} w={wA} y={y} plain selected={false} outline />}
            <BayShape uid={uid} bay={bb} x={xB} w={wB} y={y} plain={plain} selected={selected} outline={false} />

            {showLabel && (
              <g aria-hidden="true">
                {selected && <rect x={cx - labelW / 2} y={yLab - 11} width={labelW} height={15} className={s.tag} />}
                <text x={cx} y={yLab} textAnchor="middle" className={selected ? s.valOn : s.val}>
                  {label}
                </text>
              </g>
            )}

            {/* Base: number, and the word when the column is wide enough to hold it. */}
            <g aria-hidden="true">
              <text x={cx} y={base + 18} textAnchor="middle" className={selected ? s.numOn : s.num}>
                {term.n}
              </text>
              {showWords && (
                <text x={cx} y={base + 32} textAnchor="middle" className={s.micro}>
                  {term.axis}
                </text>
              )}
              {showOps && i > 0 && (
                <text x={colX(i) - (isNet ? netGap / 2 : 0)} y={base + 18} textAnchor="middle" className={s.op}>
                  {term.op}
                </text>
              )}
              {a && colW >= 40 && (
                <>
                  <text x={xA + wA / 2} y={base + (showWords ? 46 : 32)} textAnchor="middle" className={s.ab}>
                    A
                  </text>
                  <text x={xB + wB / 2} y={base + (showWords ? 46 : 32)} textAnchor="middle" className={s.ab}>
                    B
                  </text>
                </>
              )}
            </g>

            {/* Hit area: the whole column */}
            <g
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${term.label}: ${pub == null ? "not applicable" : `${term.sign < 0 ? "minus " : ""}${fmt.count(Math.abs(pub))} dwellings`}, ${rowB.fy}`}
                className={s.hit}
                onClick={() => onPart(term.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPart(term.id);
                  }
                }}
              >
                <rect x={colX(i) + 2} y={top - 30} width={colW - 4} height={base - top + 76} />
              </g>
          </g>
        );
      })}

      {/* Closing gap between the run of terms and the published net (residual / unreconciled) */}
      {Math.abs((rowB.net ?? b.sum) - b.sum) >= 0.5 && (
        <g aria-hidden="true">
          <line
            x1={colX(TERMS.length - 1) - netGap / 2}
            x2={colX(TERMS.length - 1) - netGap / 2}
            y1={y(b.sum)}
            y2={y(rowB.net ?? b.sum)}
            className={s.inkHeavy}
          />
        </g>
      )}
    </svg>
  );
}

/* ——— Main ——— */

export function SupplyMachine({ machine, state, onChange }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>(900);
  const uid = "sm";
  const panel = state.panel;

  const place = machine.places.find((p) => p.code === state.place) ?? machine.places[0] ?? null;
  const placeCode = place?.code ?? null;
  const rows = useMemo(() => (placeCode ? (machine.byPlace[placeCode] ?? []) : []), [machine.byPlace, placeCode]);
  const years = rows.map(yearOfRow);
  const year = state.year != null && years.includes(state.year) ? state.year : (years[years.length - 1] ?? 0);
  const vs = state.vs != null && years.includes(state.vs) && state.vs !== year ? state.vs : null;
  const rowB = rows.find((r) => yearOfRow(r) === year) ?? null;
  const rowA = vs != null ? (rows.find((r) => yearOfRow(r) === vs) ?? null) : null;
  const part = state.part;

  // One fixed scale per place across every year — moving the year is an honest comparison.
  const scale = useMemo(() => {
    let max = 1;
    let min = 0;
    for (const r of rows) {
      const { bays } = section(valuesOf(r));
      for (const bay of bays) {
        max = Math.max(max, bay.from, bay.to);
        min = Math.min(min, bay.from, bay.to);
      }
    }
    return { min: min < 0 ? min * 1.1 : 0, max: max * 1.08 };
  }, [rows]);

  const target = (r: SupplyLedgerYear | null) => TERMS.map((t) => (r ? (contribution(r, t) ?? 0) : 0));
  const twB = useTween(target(rowB));
  const twA = useTween(target(rowA ?? rowB));

  if (!place || !rowB) {
    return (
      <EmptyStage label="In preparation">
        MHCLG Live Table 118 is not available from the API yet. No estimated figures.
      </EmptyStage>
    );
  }

  // Tweened geometry; nulls (not applicable) stay null so they draw as a dashed tick.
  const tweened = (tw: number[], r: SupplyLedgerYear) =>
    Object.fromEntries(TERMS.map((t, i) => [t.id, contribution(r, t) == null ? null : tw[i]!])) as Record<TermId, number | null>;
  const secB = section(tweened(twB, rowB));
  const secA = rowA ? section(tweened(twA, rowA)) : null;

  const exactB = section(valuesOf(rowB));
  const exactA = rowA ? section(valuesOf(rowA)) : null;
  const residual = (r: SupplyLedgerYear) => r.residual ?? 0;
  const gapOf = (r: SupplyLedgerYear, sum: number) => (r.net ?? 0) - sum - residual(r);

  const gapB = gapOf(rowB, exactB.sum);
  const closing = (rowB.net ?? 0) - exactB.sum;

  return (
    <div className={s.root}>
      {panel === "section" && (
        <div className={s.sheet}>
          <div ref={wrapRef} className={s.drawing}>
            <Section
              uid={uid}
              width={width}
              b={secB}
              a={secA}
              rowB={rowB}
              rowA={rowA}
              scale={scale}
              part={part}
              onPart={(id) => onChange({ part: part === id ? null : id })}
              placeLabel={place.label}
            />
            {Math.abs(closing) >= 0.5 && (
              <p className={s.datumNote}>
                <span className="bo-label">Closing gap</span>
                <span>
                  The run of terms ends {signed(-closing)} from the published net (the heavy tick before 07): residual{" "}
                  {signed(residual(rowB))}
                  {Math.abs(gapB) >= 0.5 ? `, unreconciled ${signed(gapB)}` : ""}. See the ledger.
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {panel === "ledger" && (
        <div className={s.ledgerWrap}>
          <table className={s.ledger}>
            <caption>
              <span className="bo-label">Ledger</span> {place.label}, {rowB.fy}
              {rowA ? ` against ${rowA.fy}` : ""}. Dwellings, MHCLG Live Table 118 (unrounded).
            </caption>
            <thead>
              <tr>
                <th scope="col">Term</th>
                <th scope="col" className={s.num}>
                  {rowB.fy}
                  {rowB.status === "provisional" ? " provisional" : ""}
                </th>
                {rowA && (
                  <>
                    <th scope="col" className={s.num}>
                      {rowA.fy}
                      {rowA.status === "provisional" ? " provisional" : ""}
                    </th>
                    <th scope="col" className={s.num}>
                      Change
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {PARTS.map((t) => {
                const v = contribution(rowB, t);
                const va = rowA ? contribution(rowA, t) : null;
                return (
                  <tr key={t.id} data-on={part === t.id || undefined}>
                    <th scope="row">
                      <button
                        type="button"
                        className={s.rowButton}
                        aria-pressed={part === t.id}
                        onClick={() => onChange({ part: part === t.id ? null : t.id })}
                      >
                        <span className={s.op2}>{t.op}</span>{" "}
                        {t.id === "census" && rowB.censusLabel ? rowB.censusLabel : t.label}
                      </button>
                    </th>
                    <td className={s.num}>{v == null ? "n/a" : signed(v)}</td>
                    {rowA && (
                      <>
                        <td className={s.num}>{va == null ? "n/a" : signed(va)}</td>
                        <td className={s.num}>{v == null || va == null ? "—" : signed(v - va)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              <tr>
                <th scope="row">
                  <span className={s.op2}>+</span> Residual (note 6)
                </th>
                <td className={s.num}>{rowB.residual == null ? "n/a" : signed(rowB.residual)}</td>
                {rowA && (
                  <>
                    <td className={s.num}>{rowA.residual == null ? "n/a" : signed(rowA.residual)}</td>
                    <td className={s.num}>—</td>
                  </>
                )}
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Sum of published terms</th>
                <td className={s.num}>{fmt.count(exactB.sum + residual(rowB))}</td>
                {rowA && exactA && (
                  <>
                    <td className={s.num}>{fmt.count(exactA.sum + residual(rowA))}</td>
                    <td className={s.num}>{signed(exactB.sum + residual(rowB) - exactA.sum - residual(rowA))}</td>
                  </>
                )}
              </tr>
              <tr className={s.netRow}>
                <th scope="row">
                  <span className={s.op2}>=</span> Net additional dwellings, published
                </th>
                <td className={s.num}>{rowB.net == null ? "—" : fmt.count(rowB.net)}</td>
                {rowA && (
                  <>
                    <td className={s.num}>{rowA.net == null ? "—" : fmt.count(rowA.net)}</td>
                    <td className={s.num}>
                      {rowB.net == null || rowA.net == null ? "—" : signed(rowB.net - rowA.net)}
                    </td>
                  </>
                )}
              </tr>
              <tr>
                <th scope="row">Unreconciled</th>
                <td className={s.num}>{signed(gapOf(rowB, exactB.sum))}</td>
                {rowA && exactA && (
                  <>
                    <td className={s.num}>{signed(gapOf(rowA, exactA.sum))}</td>
                    <td className={s.num} />
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
