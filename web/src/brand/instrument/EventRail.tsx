"use client";

/**
 * EventRail — dated events on the same time axis as the TimeCharts beneath it (pass the same
 * `time` as their `sharedTime`, and the same `kind`/series count so the margins match).
 * Each event is a tick and a year; the selected one is filled ink. Overlapping labels drop to
 * the next lane. Events are context for the series, never data points in them.
 * Keyboard: Tab to the rail, ←/→ move between events in date order, Enter/Space select.
 */

import { useRef, type KeyboardEvent } from "react";
import { useWidth } from "../useWidth";
import { chartMargins } from "./TimeChart";
import s from "./instrument.module.css";

export type RailMark = { id: string; t: number; label: string; title: string; kind?: string };

const LANE_GAP = 34;
/** Label rows before marks fall back to ticks (still selectable; the selected mark is always labelled). */
const MAX_LANES = 3;

export function EventRail({
  marks,
  time,
  selected,
  onSelect,
  label,
  kind = "line",
  seriesCount = 1,
}: {
  marks: RailMark[];
  time: [number, number];
  selected: string | null;
  onSelect: (id: string) => void;
  label: string;
  kind?: "line" | "bars" | "stack";
  seriesCount?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>(760);
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const M = chartMargins(width, kind, seriesCount);
  const W = width - M.l - M.r;
  const x = (t: number) => M.l + ((t - time[0]) / Math.max(1e-9, time[1] - time[0])) * W;

  const ordered = [...marks].filter((m) => m.t >= time[0] && m.t <= time[1]).sort((a, b) => a.t - b.t);
  const lanes: number[] = [];
  // The selected mark claims its label first, so it is never reduced to a tick.
  const sel = ordered.find((m) => m.id === selected);
  const claim = (px: number) => {
    let lane = lanes.findIndex((end) => px - end >= LANE_GAP);
    if (lane < 0 && lanes.length < MAX_LANES) lane = lanes.length;
    if (lane >= 0) lanes[lane] = px;
    return lane;
  };
  const selLane = sel ? claim(x(sel.t)) : -1;
  const placed = ordered.map((m) => {
    const px = x(m.t);
    const lane = m.id === sel?.id ? selLane : claim(px);
    return { ...m, px, lane };
  });
  const height = 22 + Math.max(1, lanes.length) * 22;

  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? placed.length - 1 : null;
    if (next == null) return;
    e.preventDefault();
    const m = placed[Math.max(0, Math.min(placed.length - 1, next))];
    if (m) buttons.current.get(m.id)?.focus();
  };

  return (
    <div ref={ref} className={s.rail} style={{ height }} role="group" aria-label={label}>
      <span className={s.railAxis} style={{ left: M.l, width: W }} aria-hidden="true" />
      {placed.map((m, i) => (
        <button
          key={m.id}
          ref={(el) => {
            if (el) buttons.current.set(m.id, el);
            else buttons.current.delete(m.id);
          }}
          type="button"
          className={s.railMark}
          data-kind={m.kind}
          style={{ left: m.px, top: 0 }}
          aria-pressed={m.id === selected}
          aria-label={`${m.title}, ${m.label}`}
          title={m.title}
          onClick={() => onSelect(m.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          <i aria-hidden="true" style={{ height: m.lane >= 0 ? 14 + m.lane * 22 : 10 }} />
          {m.lane >= 0 && <span style={{ top: 16 + m.lane * 22 }}>{m.label}</span>}
        </button>
      ))}
    </div>
  );
}
