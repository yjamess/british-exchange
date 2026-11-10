"use client";

/**
 * Domain 04 — An Anatomy of British Homes.
 * Census 2021 TS044 accommodation type — HOUSEHOLDS, not dwellings.
 * Geography control lives in HousingExplorer.
 */

import { useMemo, useState } from "react";
import { EmptyStage } from "../../..";
import { fmt } from "../../../data";
import { DWELLING_PLATES, Plate } from "../../../Plate";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

type Props = {
  types: HousingV1["dwellingTypes"];
  placeId: string | null;
};

const TYPE_STYLE: Record<string, string> = {
  detached: "detached",
  "semi-detached": "semi",
  terraced: "terraced",
  "purpose-built-flat": "flat",
  other: "other",
};

export function typesPlaceOptions(
  types: HousingV1["dwellingTypes"],
): { value: string; label: string }[] {
  return types.places.map((p) => ({ value: p.id, label: p.label }));
}

export function typesFoot(
  types: HousingV1["dwellingTypes"],
  placeId: string | null,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const place =
    types.places.find((p) => p.id === placeId) ?? types.places[0] ?? null;
  return {
    definition:
      "How households live — detached, semi-detached, terraced, flats and other — Census 2021. Counts are households on Census Day, not MHCLG dwelling stock.",
    method: [
      place ? `Geography. ${place.label}.` : "",
      "Drawn to one scale: the same camera, ground and light for every type. Bars compare shares on a common scale.",
      "Do not compare household counts directly to Live Table 104 dwellings.",
    ].filter(Boolean),
    source: place
      ? `ONS · Census 2021 · TS044 · ${place.label} · 21 March 2021`
      : "ONS · Census 2021 · TS044 · England and Wales",
    dataHref: "/data#dwelling-types",
  };
}

export function TypesView({ types, placeId }: Props) {
  const places = types.places;
  const [focus, setFocus] = useState<string | null>(null);

  const place = places.find((p) => p.id === placeId) ?? places[0] ?? null;

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

  if (places.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Census accommodation-type series is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={s.root}>
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
    </div>
  );
}
