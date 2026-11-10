"use client";

/**
 * Domain 03 — Who can afford Britain?
 * Official ONS purchase affordability (household disposable income vs house prices).
 */

import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import type { HousingV1 } from "../../load";
import { ChangeRows } from "../../../instrument/TimeChart";
import gen from "../../../energy/generation.module.css";
import s from "./affordability.module.css";

const ORDER = ["10th", "20th", "30th", "40th", "50th", "60th", "70th", "80th", "90th"];

/** Stepped tones, light → dark. Dark steps carry paper type. */
const STEPS: { max: number; label: string; tone: string; dark?: boolean }[] = [
  { max: 4, label: "Under 4×", tone: "var(--bo-ink-10)" },
  { max: 6, label: "4–6×", tone: "var(--bo-ink-20)" },
  { max: 8, label: "6–8×", tone: "var(--bo-ink-40)" },
  { max: 12, label: "8–12×", tone: "var(--bo-ink-80)", dark: true },
  { max: Infinity, label: "12× or more", tone: "var(--bo-ink)", dark: true },
];
const stepOf = (v: number) => STEPS.find((st) => v < st.max) ?? STEPS[STEPS.length - 1]!;

/** Financial year label from a fractional year (1998.25 → "1998–99"). */
const fy = (t: number) => {
  const y = Math.floor(t);
  return `${y}–${String(y + 1).slice(2)}`;
};

type Props = {
  regions: HousingV1["purchaseAffordRegions"];
  grid: HousingV1["purchaseAffordGrid"];
};

export function householdsFoot(
  regions: HousingV1["purchaseAffordRegions"],
  grid: HousingV1["purchaseAffordGrid"],
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const withData = regions.filter((r) => r.points.length > 1);
  const lastT = withData[0]?.points.at(-1)?.t;
  return {
    definition:
      "Years of household disposable income needed to buy a home — official ONS purchase-affordability ratios (price ÷ income). Not the AFF1 workplace-earnings years-of-pay series.",
    method: [
      "The years are financial years, April to March: 2023–24, not the calendar year 2023.",
      lastT != null ? `Latest financial year on the grid: ${fy(lastT)}.` : "",
      grid.length > 0
        ? "Read across a heat-map row: a household at that income percentile, and how many years of its disposable income each price percentile costs."
        : "",
    ].filter(Boolean),
    source: "ONS · Housing purchase affordability · England and nations / English regions",
    dataHref: "/data#housing-purchase-affordability",
  };
}

export function WhoCanAfford({ regions, grid }: Props) {
  const withData = regions.filter((r) => r.points.length > 1);
  const england = withData.find((r) => r.id === "E92000001");
  const rows = withData
    .filter((r) => r.id !== "E92000001")
    .map((r) => ({ id: r.id, label: r.label, from: r.points[0]!.v, to: r.points.at(-1)!.v }))
    .sort((a, b) => b.to - a.to);
  const firstT = withData[0]?.points[0]?.t;
  const lastT = withData[0]?.points.at(-1)?.t;

  const byKey = new Map(grid.map((g) => [`${g.income}|${g.price}`, g.value]));

  if (withData.length === 0 && grid.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Purchase-affordability series is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const ratio = (v: number) => `${v.toFixed(1)}×`;

  return (
    <div className={gen.stack}>
      {rows.length > 0 && firstT !== undefined && lastT !== undefined && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            Median income to median price · {fy(firstT)} to {fy(lastT)}
          </h3>
          <ChangeRows
            label={`Median housing purchase affordability by nation and English region, ${fy(firstT)} and ${fy(lastT)}`}
            rows={rows}
            reference={
              england
                ? { label: "England", from: england.points[0]!.v, to: england.points.at(-1)!.v }
                : undefined
            }
            fromLabel={fy(firstT)}
            toLabel={`${fy(lastT)} · latest`}
            format={ratio}
            axisFormat={(v) => `${v.toFixed(0)}×`}
          />
        </section>
      )}

      {grid.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            England · income percentile × house-price percentile ·{" "}
            {lastT !== undefined ? fy(lastT) : "latest year"}
          </h3>
          <div className={s.heatWrap}>
            <p className={s.heatAxisX}>House price percentile →</p>
            <p className={s.heatAxisY}>Household income percentile →</p>
            <div
              className={s.heat}
              role="table"
              aria-label="England purchase affordability by income and house-price percentile"
            >
              <div className={s.heatCorner} aria-hidden="true" />
              {ORDER.map((p) => (
                <div key={`h-${p}`} className={s.heatHead} role="columnheader">
                  {p}
                </div>
              ))}
              {ORDER.map((income) => (
                <div key={`row-${income}`} className={s.heatRow} role="row">
                  <div className={s.heatSide} role="rowheader">
                    {income}
                  </div>
                  {ORDER.map((price) => {
                    const v = byKey.get(`${income}|${price}`);
                    const st = v != null ? stepOf(v) : null;
                    const median = income === "50th" && price === "50th";
                    return (
                      <div
                        key={`${income}-${price}`}
                        role="cell"
                        className={`${s.heatCell} ${median ? s.heatMedian : ""}`}
                        data-dark={st?.dark ? "true" : undefined}
                        style={{ background: st?.tone ?? "var(--bo-paper)" }}
                        title={v != null ? `Income ${income} · price ${price}: ${fmt.ratio(v)}` : "No data"}
                      >
                        {v != null ? v.toFixed(1) : "—"}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <ul className={s.heatKey} aria-label="Key">
            {STEPS.map((st) => (
              <li key={st.label}>
                <i style={{ background: st.tone }} aria-hidden="true" />
                {st.label}
              </li>
            ))}
            <li>
              <i className={s.heatKeyMedian} aria-hidden="true" />
              Median income, median price
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
