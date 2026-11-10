"use client";

/**
 * Domain 08 — Cost of Insecurity.
 * RO4 homelessness / temporary accommodation spend (England annual flow).
 * Money is not a household stock; never divide spend by TA households.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtFY, type Pt } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./insecurity.module.css";
import gen from "../../../energy/generation.module.css";

type Ins = HousingV1["insecurity"];

type Props = {
  insecurity: Ins;
  /** Financial year start calendar year (e.g. 2024 → 2024–25). */
  year: number | null;
};

/** £ thousand → pounds for brand money formatters. */
const pounds = (thousands: number) => thousands * 1000;
const money = (thousands: number) => fmt.gbpCompact(pounds(thousands));
const moneyAxis = (thousands: number) => fmt.gbpCompact(pounds(thousands));

/** March-end TA stock points (period month ≈ March). */
function marchStocks(points: Pt[]): Pt[] {
  return points.filter((p) => {
    const y = Math.floor(p.t + 1e-6);
    const m = Math.round((p.t - y) * 12);
    return m === 2;
  });
}

export function costYearOptions(insecurity: Ins): { value: string; label: string; year: number }[] {
  return [...insecurity.spendNet]
    .sort((a, b) => b.t - a.t)
    .map((p) => {
      const year = Math.floor(p.t + 1e-6);
      return { value: String(year), label: fmtFY(p.t), year };
    });
}

export function costFoot(
  insecurity: Ins,
  year: number | null,
): { definition: string; method: string[]; source: string; dataHref?: string } {
  const opts = costYearOptions(insecurity);
  const y = year ?? opts[0]?.year ?? null;
  const label = y != null ? fmtFY(y + 0.25) : "the latest financial year";
  return {
    definition:
      "What English councils spent on homelessness and temporary accommodation in a financial year — an annual money flow, not a count of households.",
    method: [
      "Figures are Revenue Outturn (RO4) England totals in £ thousand, non-IAS19. Gross is total expenditure; net is after income.",
      "Reporting categories inside temporary accommodation changed between years — compare the total homelessness line across years, not a single type.",
      "Do not divide spend by the temporary-accommodation household stock. Money and households are different measures.",
      y != null ? `Composition year shown: ${label}.` : "",
    ].filter(Boolean),
    source: `MHCLG · Revenue Outturn · homelessness services · England · ${label}`,
    dataHref: "/data?record=temporary-accommodation-spend",
  };
}

export function CostOfInsecurity({ insecurity, year }: Props) {
  const opts = costYearOptions(insecurity);
  const activeYear = year ?? opts[0]?.year ?? null;
  const net = insecurity.spendNet.find((p) => Math.floor(p.t + 1e-6) === activeYear) ?? insecurity.spendNet.at(-1);
  const gross =
    insecurity.spendGross.find((p) => Math.floor(p.t + 1e-6) === activeYear) ?? insecurity.spendGross.at(-1);

  const composition = useMemo(() => {
    if (activeYear == null) return [];
    return insecurity.spendByLine
      .map((line) => {
        const pt = line.points.find((p) => Math.floor(p.t + 1e-6) === activeYear);
        return pt ? { id: line.id, label: line.label, v: pt.v } : null;
      })
      .filter((row): row is { id: string; label: string; v: number } => row != null && Number.isFinite(row.v))
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  }, [insecurity.spendByLine, activeYear]);

  const history = useMemo(
    () => [
      { id: "net", label: "Net current expenditure", points: insecurity.spendNet },
      { id: "gross", label: "Gross expenditure", points: insecurity.spendGross },
    ],
    [insecurity.spendNet, insecurity.spendGross],
  );

  const marchHouseholds = useMemo(() => marchStocks(insecurity.taHouseholds), [insecurity.taHouseholds]);

  if (!net) {
    return (
      <EmptyStage label="In preparation">
        Temporary accommodation spending figures are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const fy = fmtFY(net.t);

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Council homelessness spend · England · {fy}</h3>
        <p className={s.big}>
          <span className="bo-fig">{money(net.v)}</span>
          <span>net current expenditure</span>
        </p>
        {gross != null && (
          <p className={s.metaLine}>
            Gross expenditure {money(gross.v)} before income. Figures are £ thousand in the source,
            shown here in pounds.
          </p>
        )}
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Where the money went · England · {fy} · net</h3>
        {composition.length > 0 ? (
          <RankBars
            label={`Net homelessness expenditure by published line · England · ${fy}`}
            rows={composition}
            format={money}
          />
        ) : (
          <EmptyStage label="Not loaded">Composition lines are not loaded for this year.</EmptyStage>
        )}
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Over time · England · annual money flow</h3>
        <TimeChart
          series={history}
          cadence="annual"
          format={money}
          axisFormat={moneyAxis}
          height={260}
          periodLabel={fmtFY}
          label="England homelessness expenditure, net and gross, financial years"
        />
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Households in temporary accommodation · England · 31 March stock</h3>
        <p className={s.metaLine}>
          Stock at the end of each financial year, shown beside the spend — not a cost per household.
        </p>
        {marchHouseholds.length > 0 ? (
          <TimeChart
            series={[{ id: "ta-march", label: "Households on 31 March", points: marchHouseholds }]}
            cadence="annual"
            format={fmt.count}
            axisFormat={fmt.countCompact}
            height={220}
            label="Households in temporary accommodation in England on 31 March"
          />
        ) : (
          <EmptyStage label="Not loaded">March-end temporary accommodation stocks are not loaded.</EmptyStage>
        )}
      </section>
    </div>
  );
}
