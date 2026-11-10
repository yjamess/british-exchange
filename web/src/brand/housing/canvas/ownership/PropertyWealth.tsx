"use client";

/**
 * Domain 09 — The distribution of property wealth.
 * Age filter lives in HousingExplorer. Notes carry method.
 */

import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, type Pt } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";

type Own = HousingV1["ownership"];

const BANDS: { id: string; label: string }[] = [
  { id: "do-not-own", label: "Do not own" },
  { id: "under-50", label: "Under £50,000" },
  { id: "50-to-125", label: "£50,000 to £125,000" },
  { id: "125-to-250", label: "£125,000 to £250,000" },
  { id: "250-to-375", label: "£250,000 to £375,000" },
  { id: "375-to-500", label: "£375,000 to £500,000" },
  { id: "500-or-more", label: "£500,000 or more" },
];

function pounds(v: number): string {
  return fmt.gbp(v);
}

function billions(v: number): string {
  return `£${Math.round(v).toLocaleString("en-GB")}bn`;
}

export function wealthAgeOptions(ownership: Own): { value: string; label: string }[] {
  return ownership.ageDistribution.map((row) => ({ value: row.id, label: row.label }));
}

export function wealthFoot(ownership: Own, ageId: string): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const age =
    ownership.ageDistribution.find((row) => row.id === ageId) ??
    ownership.ageDistribution.find((row) => row.id === "age-all-persons") ??
    ownership.ageDistribution[0];
  return {
    definition:
      "Net property wealth is a household’s self-valuation of property, minus mortgage debt. Each bar is the share of people in that wealth band.",
    method: [
      "Children are included because the survey classifies everyone by the household.",
      age ? `Age band shown: ${age.label}.` : "",
      "Accreditation of the April 2020 to March 2022 round was suspended on 13 June 2025. Percentages can miss 100 because of rounding.",
      "The lower percentile line sits on £0 for every round: households without property are in the distribution. A dashed join is a gap between two-year windows, not an observed month.",
      "The aggregate is a stock of self-valued equity in £ billion. It is not the FCA loan book, and it is not a record of gifts, inheritance or a property changing hands.",
    ].filter(Boolean),
    source: "ONS · Wealth and Assets Survey · Table 3.19 · Table 3.9 · Great Britain",
    dataHref: "/data#household-net-property-wealth",
  };
}

export function PropertyWealth({ ownership, ageId }: { ownership: Own; ageId: string }) {
  const rows = ownership.ageDistribution;
  const age =
    rows.find((row) => row.id === ageId) ?? rows.find((row) => row.id === "age-all-persons") ?? rows[0];

  const percentileSeries: { id: string; label: string; points: Pt[] }[] = [
    { id: "p25", label: "25th percentile", points: ownership.p25AllHouseholds },
    { id: "p50", label: "Median", points: ownership.medianAllHouseholds },
    { id: "p75", label: "75th percentile", points: ownership.p75AllHouseholds },
  ];

  if (rows.length === 0 || !age) {
    return (
      <EmptyStage label="In preparation">
        The Wealth and Assets Survey table is not loaded. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          Share of {age.label.toLowerCase()} by household net property wealth · April 2020 to March 2022
        </h3>
        <RankBars
          label={`Share of ${age.label.toLowerCase()} by household net property wealth, April 2020 to March 2022`}
          format={(v) => fmt.pct(v, 0)}
          rows={BANDS.map((item) => ({
            id: item.id,
            label: item.label,
            v: age.bands.find((part) => part.id === item.id)?.v ?? 0,
          }))}
        />
      </section>

      {ownership.medianAllHouseholds.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>All households · across survey rounds</h3>
          <TimeChart
            cadence="annual"
            gaps="dashed"
            format={pounds}
            zero
            label="Net property wealth percentiles, all households"
            series={percentileSeries}
          />
        </section>
      )}

      {ownership.aggregateNet.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Survey aggregate</h3>
          <TimeChart
            cadence="annual"
            gaps="dashed"
            format={billions}
            label="Aggregate household net property wealth"
            series={[{ id: "aggregate", label: "Aggregate net", points: ownership.aggregateNet }]}
          />
        </section>
      )}
    </div>
  );
}
