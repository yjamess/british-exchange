"use client";

/**
 * Domain 04 — Changing Housing Fabric (flagship).
 * Specimen cards for owner-occupied, private rented and social rented
 * dwelling stock in England. Year control lives in HousingExplorer.
 * Shares are computed from MHCLG Live Table 104 counts (dwellings, not households).
 */

import { useMemo, useState } from "react";
import { EmptyStage } from "../../..";
import { fmt } from "../../../data";
import { Plate, TENURE_PLATES } from "../../../Plate";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

type Props = {
  tenure: HousingV1["tenure"];
  year: number | null;
};

type Slice = {
  id: keyof typeof TENURE_PLATES;
  label: string;
  count: number;
  share: number;
  plate: (typeof TENURE_PLATES)[keyof typeof TENURE_PLATES];
};

export function fabricYearOptions(tenure: HousingV1["tenure"]): { value: string; label: string }[] {
  return [...tenure.years].reverse().map((y) => ({ value: String(y), label: String(y) }));
}

export function fabricFoot(
  tenure: HousingV1["tenure"],
  year: number | null,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const years = tenure.years;
  const idx =
    year != null && years.includes(year) ? years.indexOf(year) : Math.max(0, years.length - 1);
  const y = years[idx] ?? null;
  const owner = tenure.owner[idx] ?? 0;
  const privateRented = tenure.privateRented[idx] ?? 0;
  const social = tenure.social[idx] ?? 0;
  const parts = owner + privateRented + social;
  const total = tenure.total[idx] ?? null;
  return {
    definition:
      "England’s dwellings by tenure — owner-occupied, private rented, and social rented. Shares are of these three groups.",
    method: [
      y != null ? `As at 31 March ${y}.` : "",
      "Unit = dwellings, not households or people.",
      total != null && Math.abs(total - parts) > 1
        ? `Official all-dwellings total ${fmt.count(total)}; three-group sum ${fmt.count(parts)} (rounding / residual).`
        : "The official all-dwellings total sits beside the three-group sum when they differ by rounding.",
    ].filter(Boolean),
    source: y != null ? `MHCLG · Live Table 104 · England · 31 March ${y}` : "MHCLG · Live Table 104 · England",
    dataHref: "/data#dwelling-stock-by-tenure",
  };
}

export function ChangingHousingFabric({ tenure, year }: Props) {
  const years = tenure.years;
  const [focus, setFocus] = useState<Slice["id"] | null>(null);

  const idx =
    year != null && years.includes(year) ? years.indexOf(year) : Math.max(0, years.length - 1);
  const y = years[idx] ?? null;

  const slices: Slice[] = useMemo(() => {
    if (y == null || years.length === 0) return [];
    const owner = tenure.owner[idx] ?? 0;
    const privateRented = tenure.privateRented[idx] ?? 0;
    const social = tenure.social[idx] ?? 0;
    const sum = owner + privateRented + social;
    if (!(sum > 0)) return [];
    return [
      { id: "owner", label: "Owner-occupied", count: owner, share: owner / sum, plate: TENURE_PLATES.owner },
      {
        id: "private",
        label: "Private rented",
        count: privateRented,
        share: privateRented / sum,
        plate: TENURE_PLATES.private,
      },
      { id: "social", label: "Social rented", count: social, share: social / sum, plate: TENURE_PLATES.social },
    ];
  }, [tenure, idx, y, years.length]);

  const maxShare = Math.max(...slices.map((x) => x.share), 0);

  if (years.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Dwelling stock by tenure is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={s.root}>
      <ul
        className={`${s.specimens} ${s.specimensTenure}`}
        aria-label={
          y != null
            ? `Dwelling tenure composition, England, 31 March ${y}`
            : "Dwelling tenure composition"
        }
      >
        {slices.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              className={s.specimen}
              data-active={focus === slice.id || !focus ? "true" : "false"}
              data-selected={focus === slice.id ? "true" : undefined}
              onClick={() => setFocus((cur) => (cur === slice.id ? null : slice.id))}
              aria-pressed={focus === slice.id}
              aria-label={`${slice.label}: ${fmt.pct(slice.share * 100, 1)} of dwellings, ${fmt.count(slice.count)}`}
            >
              <Plate src={slice.plate.src} fit="contain" className={s.specimenPlate} />
              <span className={`bo-label ${s.specimenName}`}>{slice.label}</span>
              <span className={`bo-fig ${s.specimenShare}`}>{fmt.pct(slice.share * 100, 1)}</span>
              <span className={s.specimenBar} aria-hidden="true">
                <i style={{ width: `${maxShare > 0 ? (slice.share / maxShare) * 100 : 0}%` }} />
              </span>
              <span className={s.specimenCount}>{fmt.countCompact(slice.count)} dwellings</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
