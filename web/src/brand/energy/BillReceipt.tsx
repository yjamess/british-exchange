"use client";

/**
 * The Dissected Bill — typographic receipt (the tab's one custom instrument).
 *
 * Left: your bill. Each line is a published price × your use, set in mono with a dot leader to its
 * figure, the formula beneath, and a ruled total. Right: the same total split into what pays for it
 * (cost groups from Ofgem's price cap), so both columns end on one figure. Stacks on narrow stages.
 *
 * One ink, Housing's prints on the line swatches (solid · stipple · sparse · hatch · cross ·
 * engrave · open). Definitions and method live in the stage Notes foot, not in the receipt.
 */

import { fmtGbpBill } from "./prices-model";
import r from "./billReceipt.module.css";

export type Print = "solid" | "stipple" | "sparse" | "hatch" | "cross" | "engrave" | "open";

export type BillLine = {
  id: string;
  label: string;
  /** Short formula under the receipt line. */
  detail?: string;
  /** Kept for call sites; explanations live in the Notes foot. */
  about?: string;
  value: number | null;
  href?: string;
  print: Print;
};
export type BillMemo = {
  id: string;
  label: string;
  detail: string;
  about?: string;
  value: number | null;
  href?: string;
};

type Props = {
  /** Quiet receipt masthead (payment · use). Do not repeat the stage bar’s fuel · place · year. */
  meta?: string;
  /** Optional plain-language note (e.g. Economy 7). */
  note?: { id: string; label: string; about?: string; href?: string } | null;
  lines: BillLine[];
  total: number | null;
  totalDetail: string;
  memos: BillMemo[];
  /** The same total split into cost groups. Null when no split exists for this choice. */
  split: { title: string; detail: string; total: number; lines: BillLine[] } | null;
};

function Line({ l }: { l: BillLine }) {
  return (
    <li className={r.line}>
      <span className={r.swatch} data-print={l.print} aria-hidden="true" />
      <span className={r.name}>{l.label}</span>
      <span className={r.leader} aria-hidden="true" />
      <b className={r.fig}>{l.value != null ? fmtGbpBill(l.value) : "—"}</b>
      {l.detail && <span className={r.detail}>{l.detail}</span>}
    </li>
  );
}

function Total({ label, value, detail }: { label: string; value: number | null; detail?: string }) {
  return (
    <div className={r.total}>
      <span className={r.name}>{label}</span>
      <span className={r.leader} aria-hidden="true" />
      <b className={r.totalFig}>{value != null ? fmtGbpBill(value) : "—"}</b>
      {detail && <span className={r.detail}>{detail}</span>}
    </div>
  );
}

export function BillReceipt({ meta, note, lines, total, totalDetail, memos, split }: Props) {
  return (
    <div className={r.root}>
      <div className={r.grid}>
        <div className={r.receipt} aria-label={meta ? `Your bill · ${meta}` : "Your bill"}>
          <header className={r.head}>
            <p className={r.kicker}>Your bill{meta ? ` · ${meta}` : ""}</p>
          </header>

          {note ? <p className={r.note}>{note.label}</p> : null}

          <ul className={r.lines}>
            {lines.map((l) => (
              <Line key={l.id} l={l} />
            ))}
          </ul>
          <Total label="Bill for the year" value={total} detail={totalDetail} />

          {memos.length > 0 && (
            <ul className={r.memos}>
              {memos.map((m) => (
                <li key={m.id} className={r.memo}>
                  <span className={r.name}>{m.label}</span>
                  <span className={r.leader} aria-hidden="true" />
                  <b className={r.fig}>{m.value != null ? fmtGbpBill(m.value) : "—"}</b>
                  <span className={r.detail}>{m.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {split && (
          <div className={r.receipt} aria-label={split.title}>
            <header className={r.head}>
              <p className={r.kicker}>{split.title}</p>
              <p className={r.kicker}>{split.detail}</p>
            </header>
            <ul className={r.lines}>
              {split.lines.map((l) => (
                <Line key={l.id} l={l} />
              ))}
            </ul>
            <Total label="Bill for the year" value={split.total} />
          </div>
        )}
      </div>
    </div>
  );
}
