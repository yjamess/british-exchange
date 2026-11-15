import type { CSSProperties, ReactNode } from "react";
import s from "./readoutCard.module.css";

export type ReadoutRow = {
  id?: string;
  label: ReactNode;
  value: ReactNode;
  /** Matching series mark; text always uses the brand reading ink. */
  tone?: string;
  pattern?: "solid" | "hatch" | "stipple" | "paper";
};

/** Shared inspection card, based on the Tax Machine: heading, then labelled values.
 * Render inside a positioned plot; the chart owns pointer/keyboard state and placement.
 * A single value still gets a label. Never add invented metrics to fill the card.
 */
export function ReadoutCard({ head, rows, style, placement = "floating" }: {
  head: ReactNode;
  rows: readonly ReadoutRow[];
  style?: CSSProperties;
  /** Map records and scenario summaries use the same card in normal document flow. */
  placement?: "floating" | "inline";
}) {
  return (
    <div className={s.card} data-placement={placement} style={style} aria-live="polite" aria-atomic="true">
      <span className={s.head}>{head}</span>
      {rows.map((row, i) => (
        <span key={row.id ?? i} className={s.row}>
          <span className={s.name}>
            {(row.tone || row.pattern) && <i aria-hidden="true" data-pattern={row.pattern} style={row.tone ? { background: row.tone } : undefined} />}
            {row.label}
          </span>
          <b className="bo-num">{row.value}</b>
        </span>
      ))}
    </div>
  );
}
