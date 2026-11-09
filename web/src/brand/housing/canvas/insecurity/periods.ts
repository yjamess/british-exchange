/**
 * Domain 08 period helpers. H-CLIC flows start on the first day of a quarter; TA stocks are
 * dated the last day of it. Both map to one quarter key so a stock is read at the end of the
 * selected flow quarter — never added to it.
 */

import type { Pt } from "../../../data";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const END_DAY = [31, 30, 30, 31];

/** Quarter key: year × 4 + quarter index (0–3). */
export const qKey = (t: number) => Math.floor(t * 4 + 1e-6);

export const atQuarter = (pts: Pt[], key: number): number | null =>
  pts.find((p) => qKey(p.t) === key)?.v ?? null;

/** "Jan–Mar 2026" — a flow period. */
export function flowLabel(key: number): string {
  const y = Math.floor(key / 4);
  const q = key - y * 4;
  return `${MON[q * 3]}–${MON[q * 3 + 2]} ${y}`;
}

/** "31 Mar 2026" — the stock date at the end of the same quarter. */
export function stockLabel(key: number): string {
  const y = Math.floor(key / 4);
  const q = key - y * 4;
  return `${END_DAY[q]} ${MON[q * 3 + 2]} ${y}`;
}

/** "2026Q1" ⇄ key, for the URL. */
export const keyParam = (key: number) => `${Math.floor(key / 4)}Q${(key % 4) + 1}`;
export function parseKeyParam(raw: string | null): number | null {
  const m = /^(\d{4})Q([1-4])$/.exec(raw ?? "");
  return m ? Number(m[1]) * 4 + Number(m[2]) - 1 : null;
}

/** "2024–25" for a financial year starting in `y`. */
export const fyLabel = (y: number) => `${y}–${String((y + 1) % 100).padStart(2, "0")}`;
