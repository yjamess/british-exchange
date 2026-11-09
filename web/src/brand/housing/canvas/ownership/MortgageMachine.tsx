"use client";

/**
 * Domain 09 — The mortgage machine.
 * Stocks, flows and the quoted rate stay on separate charts.
 * The Affordability repayment scenario is not plotted here: that figure is illustrative.
 */

import { useEffect, useState } from "react";
import { fmt, fmtT, type Pt } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import { MenuControl } from "../../../template/Explorer";
import type { HousingV1 } from "../../load";
import type { InsideFoot } from "../quality/InsideHomes";
import s from "./ownership.module.css";

type MeasureId = "stock" | "advances" | "approvals" | "rate";

type Props = {
  ownership: HousingV1["ownership"];
  mortgageRate: Pt[];
  onFoot?: (foot: InsideFoot) => void;
};

const FOOT: Record<MeasureId, { source: string; coverage: string; caveat: string; dataHref: string }> = {
  stock: {
    source: "FCA · PRA · MLAR · September 2026",
    coverage: "Not seasonally adjusted. Balances and arrears are stocks at quarter end. Published in £ million, shown here in billions.",
    caveat: "The loan book is not added to approvals. An illustrative monthly repayment is not drawn.",
    dataHref: "/data#residential-mortgage-book",
  },
  advances: {
    source: "FCA · PRA · MLAR · September 2026",
    coverage: "Not seasonally adjusted. Advances and commitments are flows during the quarter. Published in £ million, shown here in billions.",
    caveat:
      "House purchase, first-time buyers, buy-to-let and remortgage are shares of a flow. First-time buyers sit inside house purchase. Buy-to-let cuts across purposes. They are not a stack that sums to 100 percent.",
    dataHref: "/data#residential-mortgage-book",
  },
  approvals: {
    source: "Bank of England · Money and Credit · September 2026 · LPMVTVX · LPMB4B3",
    coverage: "Monthly flows, seasonally adjusted.",
    caveat: "A count of approvals is not pounds of lending.",
    dataHref: "/data#mortgage-approvals",
  },
  rate: {
    source: "Bank of England · quoted household interest rates · IUMBV34",
    coverage: "Reused from the Economy series. Not copied into a second pipeline.",
    caveat: "This is an advertised rate, not the rate on the outstanding stock, and not the Affordability repayment scenario.",
    dataHref: "/data#mortgage-rate-2yr-fixed",
  },
};

const MEASURES: { id: MeasureId; label: string }[] = [
  { id: "stock", label: "Loan book" },
  { id: "advances", label: "Advances" },
  { id: "approvals", label: "Approvals" },
  { id: "rate", label: "Quoted rate" },
];

function billion(v: number): string {
  return `£${(v / 1000).toLocaleString("en-GB", { maximumFractionDigits: 0 })}bn`;
}

export function MortgageMachine({ ownership, mortgageRate, onFoot }: Props) {
  const [focus, setFocus] = useState<MeasureId>("stock");
  const o = ownership;

  const stockSeries = [
    { id: "balances", label: "Balances outstanding", points: o.balancesOutstanding },
    { id: "arrears", label: "Arrears balances", points: o.arrearsBalances },
  ];
  const advanceSeries = [
    { id: "advances", label: "Gross advances", points: o.grossAdvances },
    { id: "commitments", label: "New commitments", points: o.newCommitments },
  ];
  const approvalSeries = [
    { id: "purchase", label: "House purchase", points: o.housePurchaseApprovals },
    { id: "remortgage", label: "Remortgage, different lender", points: o.remortgageApprovals },
  ];
  const rateSeries = [{ id: "rate", label: "2-year fixed, 75% LTV", points: mortgageRate }];
  const active =
    focus === "stock"
      ? stockSeries
      : focus === "advances"
        ? advanceSeries
        : focus === "approvals"
          ? approvalSeries
          : rateSeries;
  const loaded = active.some((series) => series.points.length > 0);
  const chart = !loaded ? (
    <p className={s.note}>This series is not loaded.</p>
  ) : focus === "stock" ? (
    <TimeChart cadence="quarterly" format={billion} label="Outstanding residential mortgage balances and arrears balances" series={stockSeries} />
  ) : focus === "advances" ? (
    <TimeChart cadence="quarterly" format={billion} label="Gross advances and new commitments" series={advanceSeries} />
  ) : focus === "approvals" ? (
    <TimeChart cadence="monthly" format={fmt.count} label="House-purchase and remortgage approvals" series={approvalSeries} />
  ) : (
    <TimeChart cadence="monthly" format={(v) => fmt.pct(v, 2)} label="Quoted 2-year fixed mortgage rate, 75 percent loan to value" series={rateSeries} />
  );

  const foot = FOOT[focus];
  const advanceWhen = o.grossAdvances.at(-1);
  const advancePeriod = advanceWhen ? fmtT(advanceWhen.t, "quarterly") : "";

  useEffect(() => {
    onFoot?.({
      source: foot.source,
      coverage: foot.coverage,
      caveats: [foot.caveat],
      dataHref: foot.dataHref,
    });
  }, [onFoot, foot]);

  return (
    <div className={s.root}>
      <p className={s.lede}>New lending, the stock of debt, and the quoted rate. Each chart is one kind of measure.</p>
      <MenuControl
        label="Measure"
        value={focus}
        options={MEASURES.map((item) => ({ value: item.id, label: item.label }))}
        onChange={setFocus}
      />
      {chart}
      {focus === "advances" && o.advanceShares.length > 0 && (
        <p className={s.note}>
          {advancePeriod ? `${advancePeriod} · ` : ""}
          {o.advanceShares.map((row) => `${row.label} ${fmt.pct(row.v, 1)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
