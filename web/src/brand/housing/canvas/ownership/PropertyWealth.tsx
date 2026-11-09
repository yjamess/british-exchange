"use client";

/**
 * Domain 09 — The distribution of property wealth.
 * Shares of people by the net property wealth of the household they live in.
 * A transfer of wealth between generations is not drawn: the survey is not a chain of homes.
 */

import { useEffect, useState } from "react";
import { fmt, type Pt } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import { MenuControl } from "../../../template/Explorer";
import type { HousingV1 } from "../../load";
import type { InsideFoot } from "../quality/InsideHomes";
import s from "./ownership.module.css";

type Props = { ownership: HousingV1["ownership"]; onFoot?: (foot: InsideFoot) => void };

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

export function PropertyWealth({ ownership, onFoot }: Props) {
  const rows = ownership.ageDistribution;
  const [ageId, setAgeId] = useState("age-all-persons");
  const age = rows.find((row) => row.id === ageId) ?? rows.find((row) => row.id === "age-all-persons") ?? rows[0];

  const percentileSeries: { id: string; label: string; points: Pt[] }[] = [
    { id: "p25", label: "25th percentile", points: ownership.p25AllHouseholds },
    { id: "p50", label: "Median", points: ownership.medianAllHouseholds },
    { id: "p75", label: "75th percentile", points: ownership.p75AllHouseholds },
  ];

  const ageLabel = age?.label ?? "";

  useEffect(() => {
    onFoot?.({
      source: "Office for National Statistics · Wealth and Assets Survey · Table 3.19 · Table 3.9",
      coverage: ["Great Britain · April 2020 to March 2022 · percent of people", ageLabel].filter(Boolean).join(" · "),
      definition: [
        "Net property wealth is a household’s self-valuation of property, minus mortgage debt.",
        "Each bar is the share of people in that wealth band. Children are included because the survey classifies everyone by the household.",
      ],
      caveats: [
        "Accreditation of the April 2020 to March 2022 round was suspended on 13 June 2025. Percentages can miss 100 because of rounding.",
        "The lower percentile line sits on £0 for every round: households without property are in the distribution. A dashed join is a gap between two-year windows, not an observed month. The July and April rounds overlap in 2014 to 2016 because ONS changed the survey year. Both published windows are kept.",
        "The aggregate is a stock of self-valued equity in £ billion. It is not the FCA loan book, and it is not a record of gifts, inheritance or a property changing hands.",
      ],
      dataHref: "/data#household-net-property-wealth",
    });
  }, [onFoot, ageLabel]);

  return (
    <div className={s.root}>
      <p className={s.lede}>Where household net property wealth sits, not the average.</p>

      {rows.length === 0 || !age ? (
        <p className={s.note}>The Wealth and Assets Survey table is not loaded.</p>
      ) : (
        <>
          <MenuControl
            label="Age"
            value={age.id}
            options={rows.map((row) => ({ value: row.id, label: row.label }))}
            onChange={setAgeId}
          />
          <RankBars
            label={`Share of ${age.label.toLowerCase()} by household net property wealth, April 2020 to March 2022`}
            format={(v) => fmt.pct(v, 0)}
            rows={BANDS.map((item) => ({
              id: item.id,
              label: item.label,
              v: age.bands.find((part) => part.id === item.id)?.v ?? 0,
            }))}
          />
        </>
      )}
      {ownership.medianAllHouseholds.length > 0 && (
        <>
          <h3 className={s.sectionTitle}>All households, across survey rounds</h3>
          <TimeChart
            cadence="annual"
            gaps="dashed"
            format={pounds}
            zero
            label="Net property wealth percentiles, all households"
            series={percentileSeries}
          />
        </>
      )}

      {ownership.aggregateNet.length > 0 && (
        <>
          <h3 className={s.sectionTitle}>Survey aggregate</h3>
          <TimeChart
            cadence="annual"
            gaps="dashed"
            format={billions}
            label="Aggregate household net property wealth"
            series={[{ id: "aggregate", label: "Aggregate net", points: ownership.aggregateNet }]}
          />
        </>
      )}
    </div>
  );
}
