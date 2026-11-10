"use client";

/**
 * Domain 04 — Tenure over time.
 * Brand ShareArea: one ink, bands told apart by print pattern (solid / hatch / stipple).
 * Shares of owner-occupied + private rented + social rented dwellings.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { ShareArea, type Band } from "../../../charts/ShareArea";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";

type Props = {
  tenure: HousingV1["tenure"];
};

export function tenureFoot(tenure: HousingV1["tenure"]): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const first = tenure.years[0];
  const last = tenure.years[tenure.years.length - 1];
  return {
    definition:
      "How England’s dwelling stock has shifted between owner-occupied, private rented and social rented homes.",
    method: [
      first != null && last != null ? `Coverage. England · ${first}–${last}.` : "",
      "Shares are of these three groups (Live Table 104).",
      "Unit = dwellings, not households.",
    ].filter(Boolean),
    source:
      first != null && last != null
        ? `MHCLG · Live Table 104 · England · ${first}–${last}`
        : "MHCLG · Live Table 104 · England",
    dataHref: "/data#dwelling-stock-by-tenure",
  };
}

export function TenureView({ tenure }: Props) {
  const bands: Band[] = useMemo(() => {
    const { years, owner, privateRented, social } = tenure;
    if (years.length === 0) return [];
    const totals = years.map((_, i) => (owner[i] ?? 0) + (privateRented[i] ?? 0) + (social[i] ?? 0));
    const share = (vals: number[]) =>
      vals.map((v, i) => {
        const tot = totals[i] ?? 0;
        return tot > 0 ? v / tot : 0;
      });
    return [
      { id: "social", label: "Social rented", pattern: "solid" as const, values: share(social) },
      { id: "private", label: "Private rented", pattern: "hatch" as const, values: share(privateRented) },
      { id: "owner", label: "Owner-occupied", pattern: "stipple" as const, values: share(owner) },
    ];
  }, [tenure]);

  if (tenure.years.length < 2 || bands.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Dwelling stock by tenure is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Dwelling stock by tenure · England · share over time</h3>
        <ShareArea
          years={tenure.years}
          bands={bands}
          height={380}
          label="Dwelling stock by tenure, England — share over time"
        />
      </section>
    </div>
  );
}
