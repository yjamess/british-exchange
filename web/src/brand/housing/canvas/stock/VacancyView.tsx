"use client";

/**
 * Domain 04 — Britain's Unoccupied Homes.
 * Council-tax vacants (Live Table 615): all vacants and long-term (>6 months).
 * Not second homes; not census occupancy.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtT } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";

type Props = {
  vacancy: HousingV1["vacancy"];
  secondHomes: HousingV1["secondHomes"];
};

export function vacancyFoot(
  vacancy: HousingV1["vacancy"],
  secondHomes: HousingV1["secondHomes"],
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const latestAll = vacancy.all.at(-1);
  const rate = vacancy.rateEngland.at(-1);
  const latestSecond = secondHomes.total.at(-1);
  return {
    definition:
      "Empty properties recorded for council tax in England — all vacants and those empty more than six months (long-term). Second homes are a different council-tax class.",
    method: [
      latestAll
        ? `Latest all vacants: ${fmt.count(latestAll.v)} · October ${Math.floor(latestAll.t)}.`
        : "",
      rate
        ? `Vacancy rate ${fmt.pct(rate.v, 2)} = October vacants ÷ 31 March ${Math.floor(rate.t + 1e-6)} dwellings.`
        : "Vacancy rate = October vacants ÷ 31 March dwellings, same calendar year.",
      latestSecond
        ? `Second homes ${fmt.count(latestSecond.v)} in ${fmtT(latestSecond.t)} — furnished, nobody living there as a main home. Not added into the vacancy rate.`
        : "Second homes are not added into the vacancy rate.",
      "Neither count is the census.",
    ].filter(Boolean),
    source: "MHCLG · Live Table 615 · Council Taxbase Table 4 · England",
    dataHref: "/data#vacant-dwellings",
  };
}

export function VacancyView({ vacancy, secondHomes }: Props) {
  const series = useMemo(
    () => [
      { id: "all", label: "All vacants", points: vacancy.all },
      { id: "long", label: "Long-term vacants", points: vacancy.longTerm },
    ],
    [vacancy],
  );
  const secondSeries = useMemo(
    () => [{ id: "second", label: "Second homes", points: secondHomes.total }],
    [secondHomes.total],
  );

  if (vacancy.all.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Vacant-dwellings series is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>England · vacant dwellings over time</h3>
        <TimeChart
          series={series}
          cadence="annual"
          format={fmt.count}
          axisFormat={fmt.countCompact}
          height={320}
          label="Vacant dwellings in England, all and long-term"
          showTable={false}
        />
      </section>

      {secondHomes.total.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>England · second homes · Council Taxbase</h3>
          <TimeChart
            series={secondSeries}
            cadence="annual"
            format={fmt.count}
            axisFormat={fmt.countCompact}
            height={220}
            label="Second homes in England"
            showTable={false}
          />
        </section>
      )}

      {vacancy.regionAll.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>English regions · all vacants · latest year</h3>
          <RankBars
            label="All vacant dwellings by English region, latest October"
            rows={vacancy.regionAll}
            format={fmt.count}
          />
        </section>
      )}
    </div>
  );
}
