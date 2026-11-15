/**
 * Cash to debt — central government cash borrowed → change in central government net debt.
 *
 * Source: ONS Public Sector Finances Appendix A table REC3, pinned as one multi-series pack
 * (`cg-cash-debt-reconciliation`; `source_version` = `PUSF/<CDID>`). The published identity
 * is cash requirement (M98R) + named adjustments = change in net debt (MW4W), exact monthly
 * from April 2000 (Validation pass 2026-11-14). Central government only — this is not public
 * sector net borrowing or public sector net debt, and must never be labelled as such.
 */

import type { Observation } from "@/lib/api";
import { toT, type Pt } from "../data";
import { rolling12mSum } from "./debt-model";

export const BRIDGE_CASH = "M98R";
export const BRIDGE_CHANGE = "MW4W";

/** Adjustment lines in plain words, in the published table order. */
export const BRIDGE_ADJUSTMENTS: { code: string; label: string }[] = [
  { code: "MW7L", label: "Inflation added to index-linked gilts" },
  { code: "LSIW", label: "Gilts sold above or below face value" },
  { code: "E3VL", label: "Other gilt adjustments" },
  { code: "N42C", label: "National Savings and tax instruments" },
  { code: "N42E", label: "Debt Management Account" },
  { code: "E3VY", label: "Other sterling debt" },
  { code: "N42A", label: "Revaluing the official reserves" },
  { code: "E3VX", label: "IMF reserve assets" },
  { code: "N42F", label: "Other foreign-currency revaluation" },
  { code: "E3VZ", label: "Other cash and liquid assets" },
  { code: "E3VM", label: "Reclassified and imputed debts" },
  { code: "N42H", label: "Other" },
];

export const BRIDGE_LABEL: Record<string, string> = {
  [BRIDGE_CASH]: "Cash borrowed",
  [BRIDGE_CHANGE]: "Change in debt",
  ...Object.fromEntries(BRIDGE_ADJUSTMENTS.map((a) => [a.code, a.label])),
};

/** Monthly identity is trusted from this month (earlier months have official gaps). */
export const BRIDGE_TRUST_FROM = "2000-04-01";

function code(r: Observation): string {
  const i = r.source_version.lastIndexOf("/");
  return i >= 0 ? r.source_version.slice(i + 1) : r.source_version;
}

/** Final, valued rows for one CDID, sorted by month. */
export function bridgeRows(rows: Observation[], cdid: string): Observation[] {
  return rows
    .filter(
      (r) =>
        code(r) === cdid &&
        r.value != null &&
        Number.isFinite(r.value) &&
        r.observation_status === "final" &&
        r.period_start >= BRIDGE_TRUST_FROM,
    )
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
}

export type BridgePeriod = { value: string; label: string; from: string; to: string };

/** Financial year starting April `y` → [from, to] month starts. */
function fyBounds(y: number): [string, string] {
  return [`${y}-04-01`, `${y + 1}-03-01`];
}

/** Add `n` months to an ISO month start. */
function addMonths(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const ny = y + Math.floor(m / 12);
  const nm = ((m % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, "0")}-01`;
}

/**
 * Periods on offer: the last twelve final months, then each complete financial year
 * (every month present for both cash and change in debt), latest first.
 */
export function bridgePeriods(rows: Observation[]): BridgePeriod[] {
  const cash = bridgeRows(rows, BRIDGE_CASH);
  const chg = bridgeRows(rows, BRIDGE_CHANGE);
  if (cash.length < 12 || chg.length < 12) return [];
  const have = new Set(cash.map((r) => r.period_start));
  const haveChg = new Set(chg.map((r) => r.period_start));
  const months = (from: string) => Array.from({ length: 12 }, (_, i) => addMonths(from, i));
  const complete = (from: string) => months(from).every((m) => have.has(m) && haveChg.has(m));

  const out: BridgePeriod[] = [];
  const last = cash[cash.length - 1]!.period_start;
  const lastFrom = addMonths(last, -11);
  if (chg.some((r) => r.period_start === last) && complete(lastFrom)) {
    out.push({
      value: "last12",
      label: `Last twelve months · to ${monthLabel(last)}`,
      from: lastFrom,
      to: last,
    });
  }
  const firstYear = Number(cash[0]!.period_start.slice(0, 4));
  const lastYear = Number(last.slice(0, 4));
  for (let y = lastYear; y >= firstYear; y--) {
    const [from, to] = fyBounds(y);
    if (complete(from)) out.push({ value: `fy${y}`, label: fyLabel(y), from, to });
  }
  return out;
}

export function fyLabel(y: number): string {
  return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
}

function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

export type BridgeSlice = {
  cash: number;
  change: number;
  /** Non-zero adjustment lines, largest first; sums to change − cash. */
  adjustments: { id: string; label: string; v: number }[];
  /** Residual left after the named lines — zero on trusted months. */
  residual: number;
};

function sumBetween(rows: Observation[], from: string, to: string): number {
  return rows
    .filter((r) => r.period_start >= from && r.period_start <= to)
    .reduce((a, r) => a + (r.value as number), 0);
}

export function bridgeSlice(rows: Observation[], period: BridgePeriod): BridgeSlice {
  const cash = sumBetween(bridgeRows(rows, BRIDGE_CASH), period.from, period.to);
  const change = sumBetween(bridgeRows(rows, BRIDGE_CHANGE), period.from, period.to);
  const adjustments = BRIDGE_ADJUSTMENTS.map((a) => ({
    id: a.code,
    label: a.label,
    v: sumBetween(bridgeRows(rows, a.code), period.from, period.to),
  }))
    .filter((a) => Math.abs(a.v) >= 5)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const residual = change - cash - adjustments.reduce((s, a) => s + a.v, 0);
  return { cash, change, adjustments, residual };
}

/** Trailing 12-month sums for the two headline lines (£ million). */
export function bridgeRoll(rows: Observation[], cdid: string): Pt[] {
  return rolling12mSum(bridgeRows(rows, cdid));
}

/** Monthly points for one line (£ million). */
export function bridgePoints(rows: Observation[], cdid: string): Pt[] {
  return bridgeRows(rows, cdid).map((r) => ({ t: toT(r.period_start), v: r.value as number }));
}
