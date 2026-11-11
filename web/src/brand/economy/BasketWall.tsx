"use client";

/**
 * The British Basket — a wall of shelf price tags (brief 04; the tab's one custom instrument).
 * Each tag: the item's halftone specimen, its price now, what it was, the change, and a
 * quantity stepper. An item in your basket takes the solid ink price band (selection = solid
 * ink + paper type). The months are named once, in the till strip pinned under the wall, which
 * also carries the running total — so the total is always on screen while you fill the basket.
 * Prices settle with the split-flap FlickerFigure; while the months play they update plainly.
 */

import { FlickerFigure } from "../motion";
import { Plate } from "../Plate";
import { fmtPrice } from "./inflation-model";
import { monthLabel, type BasketTag } from "./basket";
import w from "./basketWall.module.css";

function pct(a: number, b: number): string {
  const c = (b / a - 1) * 100;
  return `${c >= 0 ? "+" : "−"}${Math.abs(c).toFixed(0)}%`;
}

function Tag({
  tag,
  playing,
  onStep,
}: {
  tag: BasketTag;
  playing: boolean;
  onStep: (d: number) => void;
}) {
  const now = tag.to != null ? fmtPrice(tag.to) : "—";
  return (
    <li className={w.tag} data-in={tag.qty > 0 ? "true" : "false"}>
      <Plate src={tag.plate} fit="contain" className={w.picture} />
      <div className={w.head}>
        <p className={w.name}>{tag.label}</p>
        {tag.size ? <p className={`bo-label ${w.size}`}>{tag.size}</p> : null}
      </div>
      <div className={w.band}>
        <p className={`bo-fig ${w.now}`}>{playing ? now : <FlickerFigure value={now} duration={0.8} />}</p>
        <p className={`bo-fig ${w.change}`}>
          {tag.from != null && tag.to != null ? pct(tag.from, tag.to) : ""}
        </p>
        <p className={w.was}>
          {tag.from != null ? (
            <>
              was <span className="bo-fig">{fmtPrice(tag.from)}</span>
            </>
          ) : tag.firstMonth ? (
            `Priced from ${monthLabel(tag.firstMonth)}`
          ) : (
            "No price"
          )}
        </p>
      </div>
      <div className={w.stepper} role="group" aria-label={`${tag.label} quantity`}>
        <button type="button" onClick={() => onStep(-1)} disabled={tag.qty === 0} aria-label={`One fewer ${tag.label}`}>
          −
        </button>
        <output className="bo-fig" aria-live="polite">
          {tag.qty}
        </output>
        <button type="button" onClick={() => onStep(1)} disabled={tag.qty >= 12} aria-label={`One more ${tag.label}`}>
          +
        </button>
      </div>
    </li>
  );
}

export function BasketWall({
  tags,
  from,
  to,
  playing,
  onStep,
  totals,
  matched,
  empty,
}: {
  tags: BasketTag[];
  from: string;
  to: string;
  playing: boolean;
  onStep: (slug: string, d: number) => void;
  totals: { from: number; to: number; items: number; left: string[] };
  /** Items matching the current Show + search (the wall draws at most `tags.length`). */
  matched: number;
  /** Shown when nothing matches. */
  empty: string;
}) {
  const change = totals.items && totals.from > 0 ? pct(totals.from, totals.to) : "—";
  return (
    <div className={w.root}>
      {tags.length ? (
        <ul className={w.wall} aria-label="Everyday basket price tags">
          {tags.map((t) => (
            <Tag key={t.slug} tag={t} playing={playing} onStep={(d) => onStep(t.slug, d)} />
          ))}
        </ul>
      ) : (
        <p className={w.empty}>{empty}</p>
      )}
      {matched > tags.length ? (
        <p className={`bo-label ${w.more}`}>
          Showing {tags.length} of {matched} · search to narrow
        </p>
      ) : null}
      <div className={`bo-on-ink ${w.till}`} role="status" aria-live={playing ? "off" : "polite"}>
        <p className={w.tillCell}>
          <span className="bo-label">Your basket</span>
          <span className="bo-fig">
            {totals.items} item{totals.items === 1 ? "" : "s"}
          </span>
        </p>
        <p className={w.tillCell}>
          <span className="bo-label">{monthLabel(from)}</span>
          <span className="bo-fig">{totals.items ? fmtPrice(totals.from) : "—"}</span>
        </p>
        <p className={w.tillCell}>
          <span className="bo-label">{monthLabel(to)}</span>
          <span className="bo-fig">{totals.items ? fmtPrice(totals.to) : "—"}</span>
        </p>
        <p className={w.tillCell}>
          <span className="bo-label">Change</span>
          <span className="bo-fig">{change}</span>
        </p>
        {totals.left.length ? (
          <p className={`bo-label ${w.tillNote}`}>
            Leaves out {totals.left.join(", ").toLowerCase()}: no price in {monthLabel(from)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
