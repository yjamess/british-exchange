"use client";

/**
 * Useful Energy Experiment — split bars.
 *
 * RankBars grammar: one row per item, one shared scale, draw-on motion.
 * Each bar is energy going in, split useful (solid ink) / lost (45° pen hatch).
 * Heat from surroundings extends useful as sparse vertical stipple. Scenario
 * mode marks the published useful cut with a dashed rule (RankBars reference).
 */

import { useRef } from "react";
import { setOf, useDrawOn } from "../instrument/motion";
import i from "../instrument/instrument.module.css";
import type { FlowItem } from "./useful-model";
import s from "./splitFlow.module.css";

function fig(v: number): string {
  return v.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

export function SplitFlow({
  items,
  label,
  scaleMax,
  scenario,
}: {
  items: FlowItem[];
  label: string;
  /** Largest bar on this scale (fixed per scope so years compare). */
  scaleMax: number;
  scenario: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const k = useDrawOn(ref, {
    ms: 1100,
    replayKey: items.map((r) => `${r.id}:${r.useful.toFixed(0)}:${r.rejected.toFixed(0)}`).join("|"),
  });
  const max = Math.max(scaleMax, ...items.map((r) => r.useful + r.rejected), 1);
  const pct = (v: number) => `${(v / max) * 100}%`;
  const hasAmbient = items.some((r) => r.ambient > 0);

  return (
    <figure ref={ref} className={`${i.rank} ${s.flow}`} aria-label={label}>
      {items.map((r, j) => {
        const grow = setOf(k, j, items.length);
        const converted = r.useful - r.ambient;
        const total = r.useful + r.rejected;
        const lostShare = total > 0 ? (r.rejected / total) * 100 : 0;
        const pubAt = r.published ? r.published.useful : null;
        return (
          <div
            key={r.id}
            className={i.rankRow}
            title={`${r.label}: ${fig(r.useful)} useful, ${fig(r.rejected)} lost (${lostShare.toFixed(0)}%)${
              r.ambient > 0 ? `; ${fig(r.ambient)} from surroundings` : ""
            }`}
          >
            <span>{r.label}</span>
            <span className={i.rankTrack}>
              <span className={s.bar} style={{ width: `calc(${pct(total)} * ${grow})` }}>
                <span className={s.useful} style={{ width: `${total > 0 ? (converted / total) * 100 : 0}%` }} />
                {r.ambient > 0 && (
                  <span className={s.ambient} style={{ width: `${(r.ambient / total) * 100}%` }} />
                )}
                <span className={s.lost} style={{ width: `${total > 0 ? (r.rejected / total) * 100 : 0}%` }} />
              </span>
              {pubAt != null && <em style={{ left: pct(pubAt) }} aria-hidden="true" />}
            </span>
            <b className="bo-fig">{fig(total)}</b>
          </div>
        );
      })}

      <ul className={s.key} aria-label="Bar marks">
        <li>
          <i className={s.useful} aria-hidden="true" />
          <span>Useful energy</span>
        </li>
        <li>
          <i className={s.lost} aria-hidden="true" />
          <span>Lost energy</span>
        </li>
        {hasAmbient && (
          <li>
            <i className={s.ambient} aria-hidden="true" />
            <span>Heat from surroundings</span>
          </li>
        )}
        {scenario && (
          <li>
            <i className={s.publishedKey} aria-hidden="true" />
            <span>Published estimate</span>
          </li>
        )}
      </ul>
    </figure>
  );
}
