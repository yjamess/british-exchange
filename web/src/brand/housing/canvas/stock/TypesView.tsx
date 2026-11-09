"use client";

/**
 * Domain 04 — An Anatomy of British Homes (Gate 2).
 * Census 2021 TS044 accommodation type — HOUSEHOLDS, not dwellings.
 * Each type is a specimen card: its generated plate (one matched set, true relative scale),
 * share, household count, and a share bar on a common scale.
 */

import { useId, useMemo, useState } from "react";
import { fmt } from "../../../data";
import { DWELLING_PLATES, Plate } from "../../../Plate";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

type Props = {
  types: HousingV1["dwellingTypes"];
};

const TYPE_STYLE: Record<string, string> = {
  detached: "detached",
  "semi-detached": "semi",
  terraced: "terraced",
  "purpose-built-flat": "flat",
  other: "other",
};

export function TypesView({ types }: Props) {
  const uid = useId().replace(/:/g, "");
  const places = types.places;
  const [placeIdx, setPlaceIdx] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);

  const safeIdx = places.length === 0 ? 0 : Math.min(placeIdx, places.length - 1);
  const place = places[safeIdx] ?? null;

  const slices = useMemo(() => {
    if (!place) return [];
    const sum = place.parts.reduce((a, p) => a + p.count, 0);
    if (!(sum > 0)) return [];
    return place.parts.map((p) => ({
      ...p,
      share: p.count / sum,
      style: TYPE_STYLE[p.id] ?? "other",
    }));
  }, [place]);

  const focused = focus ? slices.find((x) => x.id === focus) : null;
  const total = place?.total ?? slices.reduce((a, x) => a + x.count, 0);

  if (places.length === 0) {
    return (
      <p className={s.lede}>
        Census accommodation-type series is not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        How households live — detached, semi-detached, terraced, flats and other — Census 2021.
        Counts are households on Census Day, not MHCLG dwelling stock.
      </p>

      <div className={s.yearRow}>
        <label className={s.yearField} htmlFor={`${uid}-place`}>
          <span className="bo-label">Geography</span>
          <select
            id={`${uid}-place`}
            className={s.placeSelect}
            value={safeIdx}
            onChange={(e) => {
              setPlaceIdx(Number(e.target.value));
              setFocus(null);
            }}
          >
            {places.map((p, i) => (
              <option key={p.id} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <output className={`bo-fig ${s.yearOut}`}>2021</output>
        </label>
      </div>

      <ul
        className={s.specimens}
        aria-label={
          place
            ? `Household accommodation type, ${place.label}, Census 2021`
            : "Household accommodation type"
        }
      >
        {slices.map((slice) => {
          const plate = DWELLING_PLATES[slice.id as keyof typeof DWELLING_PLATES];
          const maxShare = Math.max(...slices.map((x) => x.share));
          return (
            <li key={slice.id}>
              <button
                type="button"
                className={s.specimen}
                data-active={focus === slice.id || !focus ? "true" : "false"}
                data-selected={focus === slice.id ? "true" : undefined}
                onClick={() => setFocus((cur) => (cur === slice.id ? null : slice.id))}
                aria-pressed={focus === slice.id}
                aria-label={`${slice.label}: ${fmt.pct(slice.share * 100, 1)} of households, ${fmt.count(slice.count)}`}
              >
                {plate ? (
                  <Plate src={plate.src} fit="contain" className={s.specimenPlate} />
                ) : (
                  <span className={s.specimenPlate} aria-hidden="true" />
                )}
                <span className={`bo-label ${s.specimenName}`}>{slice.label}</span>
                <span className={`bo-fig ${s.specimenShare}`}>{fmt.pct(slice.share * 100, 1)}</span>
                <span className={s.specimenBar} aria-hidden="true">
                  <i style={{ width: `${(slice.share / maxShare) * 100}%` }} />
                </span>
                <span className={s.specimenCount}>{fmt.countCompact(slice.count)} households</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className={s.specimenNote}>
        Drawn to one scale: the same camera, ground and light for every type. Bars compare shares on a common scale.
      </p>

      <dl className={s.metrics}>
        <div>
          <dt>Selected type</dt>
          <dd className="bo-fig">{focused ? focused.label : "All shown types"}</dd>
          <dd className={s.note}>
            {focused
              ? `${fmt.count(focused.count)} households · ${fmt.pct(focused.share * 100, 1)}`
              : "Select a band for the count behind the share"}
          </dd>
        </div>
        <div>
          <dt>All households · official</dt>
          <dd className="bo-fig">{total ? fmt.countCompact(total) : "—"}</dd>
          <dd className={s.note}>Census 2021 TS044 total · {place?.label ?? ""}</dd>
        </div>
        <div>
          <dt>Statistical unit</dt>
          <dd className="bo-fig">Households</dd>
          <dd className={s.note}>Not dwellings — do not compare directly to Live Table 104</dd>
        </div>
        <div>
          <dt>Census Day</dt>
          <dd className="bo-fig">21 Mar 2021</dd>
          <dd className={s.note}>England and Wales census</dd>
        </div>
      </dl>

    </div>
  );
}
