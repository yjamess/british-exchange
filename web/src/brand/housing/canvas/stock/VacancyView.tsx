"use client";

/**
 * Domain 04 — Britain's Unoccupied Homes.
 * Council-tax vacants (Live Table 615): all vacants and long-term (>6 months).
 * Not second homes; not census occupancy.
 */

import { useMemo } from "react";
import { fmt, fmtT } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

type Props = {
  vacancy: HousingV1["vacancy"];
  secondHomes: HousingV1["secondHomes"];
};

export function VacancyView({ vacancy, secondHomes }: Props) {
  const series = useMemo(
    () => [
      { id: "all", label: "All vacants", points: vacancy.all },
      { id: "long", label: "Long-term vacants", points: vacancy.longTerm },
    ],
    [vacancy],
  );

  const latestAll = vacancy.all.at(-1);
  const latestLong = vacancy.longTerm.at(-1);
  const rate = vacancy.rateEngland.at(-1);
  const latestSecond = secondHomes.total.at(-1);
  const secondSeries = useMemo(
    () => [{ id: "second", label: "Second homes", points: secondHomes.total }],
    [secondHomes.total],
  );

  if (vacancy.all.length === 0) {
    return (
      <p className={s.lede}>
        Vacant-dwellings series is not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Empty properties recorded for council tax in England — all vacants and those empty more
        than six months (long-term). Second homes are a different council-tax class, shown below:
        furnished, with nobody living there as a main home. Neither count is the census.
      </p>

      <dl className={s.metrics}>
        <div>
          <dt>All vacants · latest</dt>
          <dd className="bo-fig">{latestAll ? fmt.count(latestAll.v) : "—"}</dd>
          <dd className={s.note}>
            England · October council-tax snapshot
            {latestAll ? ` · ${Math.floor(latestAll.t)}` : ""}
          </dd>
        </div>
        <div>
          <dt>Long-term vacants</dt>
          <dd className="bo-fig">{latestLong ? fmt.count(latestLong.v) : "—"}</dd>
          <dd className={s.note}>Empty more than six months</dd>
        </div>
        <div>
          <dt>Vacancy rate · derived</dt>
          <dd className="bo-fig">{rate ? fmt.pct(rate.v, 2) : "—"}</dd>
          <dd className={s.note}>
            {rate
              ? `${fmtT(rate.t)} vacants ÷ 31 March ${Math.floor(rate.t + 1e-6)} dwellings`
              : "October vacants ÷ 31 March dwellings, same calendar year"}
          </dd>
        </div>
        <div>
          <dt>Statistical unit</dt>
          <dd className="bo-fig">Dwellings</dd>
          <dd className={s.note}>Council Taxbase classifications</dd>
        </div>
      </dl>

      <div className={s.block}>
        <p className="bo-label">England · vacant dwellings over time</p>
        <TimeChart
          series={series}
          cadence="annual"
          format={fmt.count}
          axisFormat={fmt.countCompact}
          height={320}
          label="Vacant dwellings in England, all and long-term"
        />
      </div>

      {secondHomes.total.length > 0 && (
        <div className={s.block}>
          <p className="bo-label">England · second homes · Council Taxbase</p>
          <p className={s.note}>
            {latestSecond
              ? `${fmt.count(latestSecond.v)} in ${fmtT(latestSecond.t)}. `
              : ""}
            Furnished dwellings with nobody living in them as a main home. Holiday lets on business
            rates are excluded. Not added into the vacancy rate.
          </p>
          <TimeChart
            series={secondSeries}
            cadence="annual"
            format={fmt.count}
            axisFormat={fmt.countCompact}
            height={220}
            label="Second homes in England"
          />
        </div>
      )}

      {vacancy.regionAll.length > 0 && (
        <div className={s.block}>
          <p className="bo-label">English regions · all vacants · latest year</p>
          <RankBars
            label="All vacant dwellings by English region, latest October"
            rows={vacancy.regionAll}
            format={fmt.count}
          />
        </div>
      )}

    </div>
  );
}
