"use client";

/**
 * Trading World · EU and the rest of the world over time.
 * One stage panel (shared TimeChart) — calendar-year totals of goods (monthly ONS BoP, EU27 = B5,
 * Non-EU = D5) or services (annual ONS services by partner). Partial years are left out.
 */

import { useMemo } from "react";
import { TimeChart } from "../instrument/TimeChart";
import { EmptyStage, explorerClasses as t } from "../template";
import s from "../energy/generation.module.css";
import type { InvestmentPack } from "./types";
import { calendarYearSeries, fmtGbpM, notePart } from "./investment-model";

const BLOCS = [
  { code: "B5", label: "European Union (27)" },
  { code: "D5", label: "Rest of the world" },
] as const;

export function TradeBlocTrend({
  pack,
  trade,
  flow,
}: {
  pack: InvestmentPack;
  trade: "goods" | "services";
  flow: "exports" | "imports";
}) {
  const series = useMemo(() => {
    const rows =
      trade === "goods"
        ? [...(pack.goodsEu?.observations ?? []), ...(pack.goodsNonEu?.observations ?? [])]
        : (pack.servicesPartner?.observations ?? []);
    const lines = calendarYearSeries(
      rows,
      trade === "goods" ? 12 : 1,
      (r) => r.geography_code,
      (r) =>
        notePart(r.notes ?? "", "flow") === flow &&
        BLOCS.some((b) => b.code === r.geography_code) &&
        (trade === "goods" ? notePart(r.notes ?? "", "basis") !== "cvm" : true),
    );
    return BLOCS.map((b) => ({ id: b.code, label: b.label, points: lines.get(b.code) ?? [] }));
  }, [pack.goodsEu, pack.goodsNonEu, pack.servicesPartner, trade, flow]);

  return (
    <section className={s.panel}>
      <h3 className={t.stageTitle}>
        {trade === "goods" ? "Goods" : "Services"} {flow} · European Union and rest of the world ·
        calendar years · £m
      </h3>
      {series.every((l) => l.points.length < 2) ? (
        <EmptyStage label="No history">No EU and non-EU totals for this selection.</EmptyStage>
      ) : (
        <TimeChart
          label={`${trade} ${flow} · EU and rest of the world`}
          cadence="annual"
          format={fmtGbpM}
          marks={trade === "services"}
          series={series}
          showTable={false}
        />
      )}
    </section>
  );
}
