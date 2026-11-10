"use client";

/**
 * The Dissected Bill — typographic receipt (the tab's one custom instrument).
 *
 * Left: the receipt. Each line is a published price × your use, set in mono with a dot leader to
 * its figure, the formula beneath, and a ruled total.
 * Right: a hover/focus detail pane that explains the active line (catalogue link lives there —
 * line names do not navigate away). Measured £ strips stay parked until there are periods worth
 * comparing side by side.
 *
 * One ink, Housing's prints on the line swatches (solid · stipple · sparse · hatch · cross ·
 * engrave · open). Hover or focus a line and it takes the selection mark (solid ink).
 */

import { useState } from "react";
import { fmtGbpBill, fmtGbpPrecise } from "./prices-model";
import r from "./billReceipt.module.css";

export type Print = "solid" | "stipple" | "sparse" | "hatch" | "cross" | "engrave" | "open";

export type BillLine = {
  id: string;
  label: string;
  /** Short formula under the receipt line. */
  detail?: string;
  /** Plain-language what/how for the side pane (falls back to detail). */
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
  /** Optional plain-language note (e.g. Economy 7) — hover opens the detail pane. */
  note?: { id: string; label: string; about: string; href?: string } | null;
  lines: BillLine[];
  total: number | null;
  totalDetail: string;
  memos: BillMemo[];
  /** Kept for call-site compatibility; measured strips are parked for now. */
  reference?: { label: string; value: number } | null;
  cap: { period: string; lines: BillLine[]; total: number; href: string } | null;
};

type DetailItem = {
  id: string;
  label: string;
  detail?: string;
  about?: string;
  value: number | null;
  href?: string;
  print?: Print;
};

export function BillReceipt({ meta, note, lines, total, totalDetail, memos, cap }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const capLines = cap?.lines ?? [];
  const catalogue: DetailItem[] = [
    ...(note
      ? [{ id: note.id, label: note.label, about: note.about, value: null, href: note.href } satisfies DetailItem]
      : []),
    ...lines,
    ...memos,
    ...capLines,
    ...(cap
      ? [
          {
            id: "cap-heading",
            label: "What the Ofgem price cap pays for",
            about:
              "Ofgem’s default tariff cap for Great Britain, split into the published cost layers for its typical use. This is a separate benchmark from the DESNZ bill above — not the same figure.",
            value: cap.total,
            href: cap.href,
          } satisfies DetailItem,
        ]
      : []),
  ];
  const activeItem = active ? (catalogue.find((item) => item.id === active) ?? null) : null;

  const hover = (id: string | null) => () => setActive(id);
  const line = (l: BillLine) => (
    <li
      key={l.id}
      className={r.line}
      data-on={active === l.id || undefined}
      tabIndex={0}
      onPointerEnter={hover(l.id)}
      onPointerLeave={hover(null)}
      onFocus={hover(l.id)}
      onBlur={hover(null)}
    >
      <span className={r.swatch} data-print={l.print} aria-hidden="true" />
      <span className={r.name}>{l.label}</span>
      <span className={r.leader} aria-hidden="true" />
      <b className={r.fig}>{l.value != null ? fmtGbpPrecise(l.value) : "—"}</b>
      {l.detail && <span className={r.detail}>{l.detail}</span>}
    </li>
  );

  return (
    <div className={r.root}>
      <div className={r.grid}>
        <div className={r.receipt} aria-label={meta ? `Bill · ${meta}` : "Bill"}>
          {meta ? (
            <header className={r.head}>
              <p className={r.kicker}>{meta}</p>
            </header>
          ) : null}

          {note ? (
            <p
              className={r.note}
              data-on={active === note.id || undefined}
              tabIndex={0}
              onPointerEnter={hover(note.id)}
              onPointerLeave={hover(null)}
              onFocus={hover(note.id)}
              onBlur={hover(null)}
            >
              {note.label}
            </p>
          ) : null}

          <ul className={r.lines}>{lines.map(line)}</ul>
          <div className={r.total}>
            <span className={r.name}>Bill for the year</span>
            <span className={r.leader} aria-hidden="true" />
            <b className={r.totalFig}>{total != null ? fmtGbpBill(total) : "—"}</b>
            <span className={r.detail}>{totalDetail}</span>
          </div>

          {memos.length > 0 && (
            <ul className={r.memos}>
              {memos.map((m) => (
                <li
                  key={m.id}
                  className={r.memo}
                  data-on={active === m.id || undefined}
                  tabIndex={0}
                  onPointerEnter={hover(m.id)}
                  onPointerLeave={hover(null)}
                  onFocus={hover(m.id)}
                  onBlur={hover(null)}
                >
                  <span className={r.name}>{m.label}</span>
                  <span className={r.leader} aria-hidden="true" />
                  <b className={r.fig}>{m.value != null ? fmtGbpBill(m.value) : "—"}</b>
                  <span className={r.detail}>{m.detail}</span>
                </li>
              ))}
            </ul>
          )}

          {cap && (
            <>
              <header
                className={r.subhead}
                data-on={active === "cap-heading" || undefined}
                tabIndex={0}
                onPointerEnter={hover("cap-heading")}
                onPointerLeave={hover(null)}
                onFocus={hover("cap-heading")}
                onBlur={hover(null)}
              >
                <p className={r.kicker}>What the Ofgem price cap pays for</p>
                <p className={r.kicker}>Great Britain · {cap.period} · its typical use</p>
              </header>
              <ul className={r.lines}>{capLines.map(line)}</ul>
              <div className={r.total}>
                <span className={r.name}>Price cap for the year</span>
                <span className={r.leader} aria-hidden="true" />
                <b className={r.totalFig}>{fmtGbpBill(cap.total)}</b>
              </div>
            </>
          )}
        </div>

        <aside className={r.pane} aria-live="polite">
          {activeItem ? (
            <>
              <p className={r.paneKicker}>Selected line</p>
              <p className={r.paneTitle}>{activeItem.label}</p>
              {activeItem.value != null && <p className={r.paneFig}>{fmtGbpPrecise(activeItem.value)}</p>}
              <p className={r.paneBody}>
                {activeItem.about ?? activeItem.detail ?? "No further detail for this line."}
              </p>
              {activeItem.href && (
                <p className={r.paneAction}>
                  <a href={activeItem.href}>Open catalogue record</a>
                </p>
              )}
            </>
          ) : (
            <>
              <p className={r.paneKicker}>Bill for the year</p>
              {total != null && <p className={r.paneFig}>{fmtGbpPrecise(total)}</p>}
              <p className={r.paneBody}>{totalDetail}</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
