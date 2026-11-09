"use client";

/**
 * Domain 04 — Changing Housing Fabric (flagship).
 * Specimen cards for owner-occupied, private rented and social rented
 * dwelling stock in England — same layout language as dwelling types.
 * Shares are computed from MHCLG Live Table 104 counts (dwellings, not households).
 */

import { useId, useMemo, useState } from "react";
import { fmt } from "../../../data";
import { Plate, TENURE_PLATES } from "../../../Plate";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

type Props = {
  tenure: HousingV1["tenure"];
};

type Slice = {
  id: keyof typeof TENURE_PLATES;
  label: string;
  count: number;
  share: number;
  plate: (typeof TENURE_PLATES)[keyof typeof TENURE_PLATES];
};

export function ChangingHousingFabric({ tenure }: Props) {
  const uid = useId().replace(/:/g, "");
  const years = tenure.years;
  const [yearIdx, setYearIdx] = useState(() => Math.max(0, years.length - 1));
  const [focus, setFocus] = useState<Slice["id"] | null>(null);

  const safeIdx = years.length === 0 ? 0 : Math.min(yearIdx, years.length - 1);
  const year = years[safeIdx] ?? null;

  const slices: Slice[] = useMemo(() => {
    if (year == null || years.length === 0) return [];
    const owner = tenure.owner[safeIdx] ?? 0;
    const privateRented = tenure.privateRented[safeIdx] ?? 0;
    const social = tenure.social[safeIdx] ?? 0;
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
  }, [tenure, safeIdx, year, years.length]);

  const totalOfficial = year != null ? tenure.total[safeIdx] : null;
  const totalParts = slices.reduce((a, x) => a + x.count, 0);
  const focused = focus ? slices.find((x) => x.id === focus) : null;
  const maxShare = Math.max(...slices.map((x) => x.share), 0);

  if (years.length === 0) {
    return (
      <p className={s.lede}>
        Dwelling stock by tenure is not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        England’s dwellings by tenure — owner-occupied, private rented, and social rented. Shares are
        of these three groups; the official all-dwellings total sits below when it differs by rounding.
      </p>

      <div className={s.yearRow}>
        <label className={s.yearField} htmlFor={`${uid}-year`}>
          <span className="bo-label">As at 31 March</span>
          <input
            id={`${uid}-year`}
            type="range"
            min={0}
            max={years.length - 1}
            step={1}
            value={safeIdx}
            onChange={(e) => setYearIdx(Number(e.target.value))}
            aria-valuetext={year != null ? String(year) : undefined}
          />
          <output className={`bo-fig ${s.yearOut}`}>{year}</output>
        </label>
        <div className={s.yearEnds} aria-hidden="true">
          <span>{years[0]}</span>
          <span>{years[years.length - 1]}</span>
        </div>
      </div>

      <ul
        className={`${s.specimens} ${s.specimensTenure}`}
        aria-label={
          year != null
            ? `Dwelling tenure composition, England, 31 March ${year}`
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
      <dl className={s.metrics}>
        <div>
          <dt>Selected tenure</dt>
          <dd className="bo-fig">{focused ? focused.label : "All three groups"}</dd>
          <dd className={s.note}>
            {focused
              ? `${fmt.count(focused.count)} dwellings · ${fmt.pct(focused.share * 100, 1)} of the three-group total`
              : "Select a specimen for the count behind the share"}
          </dd>
        </div>
        <div>
          <dt>Three-group total</dt>
          <dd className="bo-fig">{fmt.countCompact(totalParts)}</dd>
          <dd className={s.note}>Owner + private rented + social (derived sum of parts)</dd>
        </div>
        <div>
          <dt>All dwellings · official</dt>
          <dd className="bo-fig">{totalOfficial ? fmt.countCompact(totalOfficial) : "—"}</dd>
          <dd className={s.note}>
            Live Table 104 all-dwellings
            {totalOfficial && Math.abs(totalOfficial - totalParts) > 1
              ? ` · parts differ by ${fmt.count(Math.abs(totalOfficial - totalParts))} (rounding / residual)`
              : ""}
          </dd>
        </div>
        <div>
          <dt>Statistical unit</dt>
          <dd className="bo-fig">Dwellings</dd>
          <dd className={s.note}>Not households or people — do not read as occupancy</dd>
        </div>
      </dl>
    </div>
  );
}
