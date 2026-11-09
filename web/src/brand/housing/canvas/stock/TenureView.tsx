"use client";

/**
 * Domain 04 — Tenure over time.
 * Brand ShareArea: one ink, bands told apart by print pattern (solid / hatch / stipple),
 * not by hue. Shares of owner-occupied + private rented + social rented dwellings.
 */

import { useMemo } from "react";
import { ShareArea, type Band } from "../../../charts/ShareArea";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

type Props = {
  tenure: HousingV1["tenure"];
};

export function TenureView({ tenure }: Props) {
  const bands: Band[] = useMemo(() => {
    const { years, owner, privateRented, social } = tenure;
    if (years.length === 0) return [];
    const totals = years.map((_, i) => (owner[i] ?? 0) + (privateRented[i] ?? 0) + (social[i] ?? 0));
    const share = (vals: number[]) =>
      vals.map((v, i) => {
        const t = totals[i] ?? 0;
        return t > 0 ? v / t : 0;
      });
    // Bottom → top: social (solid), private (hatch), owner (stipple) — largest band often on top.
    return [
      { id: "social", label: "Social rented", pattern: "solid" as const, values: share(social) },
      { id: "private", label: "Private rented", pattern: "hatch" as const, values: share(privateRented) },
      { id: "owner", label: "Owner-occupied", pattern: "stipple" as const, values: share(owner) },
    ];
  }, [tenure]);

  if (tenure.years.length < 2 || bands.length === 0) {
    return (
      <p className={s.lede}>
        Dwelling stock by tenure is not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        How England’s dwelling stock has shifted between owner-occupied, private rented and social
        rented homes. Shares are of these three groups (Live Table 104). Unit = dwellings, not
        households.
      </p>
      <ShareArea
        years={tenure.years}
        bands={bands}
        height={380}
        label="Dwelling stock by tenure, England — share over time"
      />
    </div>
  );
}
