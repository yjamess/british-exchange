"use client";

/**
 * Domain 09 — The mortgage machine.
 * Loan book (stock) ≠ advances (flow) at one shared £bn dot scale, then history charts.
 * Never add stock to flow. Affordability’s repayment scenario is not plotted here.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtT, type Pt } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./ownership.module.css";
import gen from "../../../energy/generation.module.css";

type Own = HousingV1["ownership"];

type Props = {
  ownership: Own;
  mortgageRate: Pt[];
};

const PER_DOT_M = 1000; // £ million → 1 dot = £1 billion
const COLS = 30;
const CELL = 9;

type Fill = "solid" | "screen" | "open";

function DotGrid({
  parts,
  label,
}: {
  parts: { n: number; fill: Fill }[];
  label: string;
}) {
  const total = parts.reduce((a, p) => a + p.n, 0);
  const rows = Math.max(1, Math.ceil(total / COLS));
  const W = COLS * CELL;
  const H = rows * CELL;
  const dots = [];
  let i = 0;
  for (const p of parts) {
    for (let k = 0; k < p.n; k++, i++) {
      const cx = (i % COLS) * CELL + CELL / 2;
      const cy = Math.floor(i / COLS) * CELL + CELL / 2;
      dots.push(
        p.fill === "open" ? (
          <circle key={i} cx={cx} cy={cy} r={2.9} fill="var(--bo-paper)" stroke="var(--bo-ink)" strokeWidth={1} />
        ) : p.fill === "screen" ? (
          <g key={i}>
            <circle cx={cx} cy={cy} r={3.4} fill="none" stroke="var(--bo-ink)" strokeWidth={0.8} />
            <circle cx={cx} cy={cy} r={1.3} fill="var(--bo-ink)" />
          </g>
        ) : (
          <circle key={i} cx={cx} cy={cy} r={3.4} fill="var(--bo-ink)" />
        ),
      );
    }
  }
  return (
    <svg className={s.dotGrid} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ maxWidth: W * 1.4 }}>
      {dots}
    </svg>
  );
}

function billion(v: number): string {
  return `£${(v / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}bn`;
}

function chartBillion(v: number): string {
  return `£${(v / 1000).toLocaleString("en-GB", { maximumFractionDigits: 0 })}bn`;
}

function latestSharedQuarter(stock: Pt[], flow: Pt[]): number | null {
  const flows = new Set(flow.map((p) => p.t));
  const shared = stock.map((p) => p.t).filter((t) => flows.has(t)).sort((a, b) => a - b);
  return shared.length ? shared[shared.length - 1]! : null;
}

export function mortgageFoot(ownership: Own): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const t = latestSharedQuarter(ownership.balancesOutstanding, ownership.grossAdvances);
  const period = t != null ? fmtT(t, "quarterly") : null;
  return {
    definition:
      "The loan book is money still owed at quarter end. Gross advances are new lending during the quarter. They measure different things.",
    method: [
      "Drawn at the same scale (1 dot = £1 billion, rounded) so sizes can be compared — never added together.",
      "Arrears are part of the stock, not a second loan book.",
      "House purchase and remortgage are shares of the advance flow. First-time buyers and buy to let are both part of house purchase, so these are drawn as lines, never a stack, and never added to house purchase.",
      "Loan-to-value bands do sum to 100 percent of each quarter's advances, so they are stacked.",
      "Approvals are counts of loans agreed, not pounds. The quoted rate is an advertised rate, not the rate on the outstanding stock.",
    ],
    source:
      period != null
        ? `FCA · PRA · MLAR · residential mortgages · UK · ${period}`
        : "FCA · PRA · MLAR · residential mortgages · UK",
    dataHref: "/data#residential-mortgage-book",
  };
}

export function MortgageMachine({ ownership, mortgageRate }: Props) {
  const o = ownership;
  const tShared = useMemo(
    () => latestSharedQuarter(o.balancesOutstanding, o.grossAdvances),
    [o.balancesOutstanding, o.grossAdvances],
  );
  const stockPt = tShared != null ? o.balancesOutstanding.find((p) => p.t === tShared) ?? null : null;
  const advancePt = tShared != null ? o.grossAdvances.find((p) => p.t === tShared) ?? null : null;
  const arrearsPt = tShared != null ? o.arrearsBalances.find((p) => p.t === tShared) ?? null : null;
  const commitmentsPt = tShared != null ? o.newCommitments.find((p) => p.t === tShared) ?? null : null;
  const period = tShared != null ? fmtT(tShared, "quarterly") : "";

  const stockSeries = useMemo(
    () => [
      { id: "balances", label: "Balances outstanding", points: o.balancesOutstanding },
      { id: "arrears", label: "Arrears balances", points: o.arrearsBalances },
    ],
    [o.balancesOutstanding, o.arrearsBalances],
  );
  const advanceSeries = useMemo(
    () => [
      { id: "advances", label: "Gross advances", points: o.grossAdvances },
      { id: "commitments", label: "New commitments", points: o.newCommitments },
    ],
    [o.grossAdvances, o.newCommitments],
  );
  const approvalSeries = useMemo(
    () => [
      { id: "purchase", label: "House purchase", points: o.housePurchaseApprovals },
      { id: "remortgage", label: "Remortgage, different lender", points: o.remortgageApprovals },
    ],
    [o.housePurchaseApprovals, o.remortgageApprovals],
  );
  const rateSeries = useMemo(
    () => [{ id: "rate", label: "2-year fixed, 75% LTV", points: mortgageRate }],
    [mortgageRate],
  );

  if (tShared == null || stockPt == null || advancePt == null) {
    return (
      <EmptyStage label="In preparation">
        Outstanding balances and gross advances are not loaded for a matching quarter yet. No estimated figures.
      </EmptyStage>
    );
  }

  const rd = (v: number) => Math.max(0, Math.round(v / PER_DOT_M));
  const stock = stockPt.v;
  const advances = advancePt.v;
  const arrears = arrearsPt?.v ?? null;
  const performing = arrears != null ? Math.max(0, stock - arrears) : stock;

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Loan book and advances · UK · {period}</h3>
        <div className={s.inventory}>
          <section className={s.section} aria-label="Loan book">
            <p className={s.name}>Outstanding loan book · end of {period}</p>
            <p className={s.big}>
              <span className="bo-fig">{billion(stock)}</span>
              <span>still owed on residential mortgages</span>
            </p>
            <DotGrid
              parts={
                arrears != null
                  ? [
                      { n: rd(performing), fill: "solid" },
                      { n: rd(arrears), fill: "screen" },
                    ]
                  : [{ n: rd(stock), fill: "solid" }]
              }
              label={`${billion(stock)} outstanding at end of ${period}. One dot per £1 billion.`}
            />
            {arrears != null && (
              <ul className={s.key} aria-label="Loan book key">
                <li>
                  <span className={s.keySwatch} data-fill="solid" aria-hidden /> Performing {billion(performing)}
                </li>
                <li>
                  <span className={s.keySwatch} data-fill="screen" aria-hidden /> In arrears {billion(arrears)}
                </li>
              </ul>
            )}
          </section>

          <span className={s.neq} aria-label="is not the same as">
            ≠
          </span>

          <section className={s.section} aria-label="Gross advances">
            <p className={s.name}>Gross advances · during {period}</p>
            <p className={s.big}>
              <span className="bo-fig">{billion(advances)}</span>
              <span>new lending in the quarter</span>
            </p>
            <DotGrid
              parts={[{ n: rd(advances), fill: "solid" }]}
              label={`${billion(advances)} gross advances in ${period}. One dot per £1 billion.`}
            />
            {commitmentsPt != null && (
              <p className={s.metaLine}>New commitments in the same quarter · {billion(commitmentsPt.v)}</p>
            )}
          </section>
        </div>
      </section>

      {o.advanceShares.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Share of gross advances · {period}</h3>
          <RankBars
            label={`Purpose shares of gross advances, ${period}`}
            format={(v) => fmt.pct(v, 1)}
            rows={o.advanceShares.map((row) => ({
              id: row.id,
              label: row.label,
              v: row.v,
            }))}
          />
        </section>
      )}

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Loan book over time · stock at quarter end</h3>
        <TimeChart
          series={stockSeries}
          cadence="quarterly"
          format={chartBillion}
          height={220}
          label="Outstanding residential mortgage balances and arrears balances"
        />
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Advances over time · flows in the quarter</h3>
        <TimeChart
          series={advanceSeries}
          cadence="quarterly"
          format={chartBillion}
          height={220}
          label="Gross advances and new commitments"
        />
      </section>

      {o.purposeHistory.some((series) => series.points.length > 0) && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>What new lending was for · percent of gross advances</h3>
          <TimeChart
            series={o.purposeHistory}
            cadence="quarterly"
            format={(v) => fmt.pct(v, 1)}
            height={220}
            label="House purchase, first-time buyer, remortgage and buy-to-let shares of gross advances"
          />
        </section>
      )}

      {o.ltvHistory.some((series) => series.points.length > 0) && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>New lending by loan-to-value · percent of gross advances</h3>
          <TimeChart
            series={o.ltvHistory}
            kind="stack"
            cadence="quarterly"
            format={(v) => fmt.pct(v, 0)}
            height={220}
            label="Gross advances by loan-to-value band, share of each quarter"
          />
        </section>
      )}

      {approvalSeries.some((series) => series.points.length > 0) && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Approvals over time · monthly counts</h3>
          <TimeChart
            series={approvalSeries}
            cadence="monthly"
            format={fmt.count}
            height={220}
            label="House-purchase and remortgage approvals"
          />
        </section>
      )}

      {mortgageRate.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Quoted rate · 2-year fixed, 75% LTV</h3>
          <TimeChart
            series={rateSeries}
            cadence="monthly"
            format={(v) => fmt.pct(v, 2)}
            height={220}
            label="Quoted 2-year fixed mortgage rate, 75 percent loan to value"
          />
        </section>
      )}
    </div>
  );
}
