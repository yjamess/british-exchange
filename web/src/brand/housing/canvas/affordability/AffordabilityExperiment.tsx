"use client";

/**
 * Domain 03 — affordability experiment (flagship).
 * Interactive budget: slide earnings, deposit, rate, term and borrowing multiple.
 * Price benchmark lives in the outer ControlRow; Notes carry method.
 */

import { useId, useMemo } from "react";
import { fmt, fmtT, type Pt } from "../../../data";
import {
  SCENARIO_BOUNDS,
  SCENARIO_DEFAULTS,
  normaliseScenario,
  runScenario,
  yearsOfEarnings,
  type ScenarioInput,
} from "./scenario";
import s from "./affordability.module.css";

export type AffordabilityScenarioParams = {
  earn: string;
  dep: string;
  rate: string;
  term: string;
  lti: string;
};

export function parseScenarioParams(
  p: AffordabilityScenarioParams,
  defaults: ScenarioInput = SCENARIO_DEFAULTS,
): ScenarioInput {
  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return normaliseScenario({
    annualEarnings: p.earn ? num(p.earn, defaults.annualEarnings) : defaults.annualEarnings,
    depositPercent: p.dep ? num(p.dep, defaults.depositPercent) : defaults.depositPercent,
    annualRatePercent: p.rate ? num(p.rate, defaults.annualRatePercent) : defaults.annualRatePercent,
    termYears: p.term ? num(p.term, defaults.termYears) : defaults.termYears,
    loanToIncome: p.lti ? num(p.lti, defaults.loanToIncome) : defaults.loanToIncome,
  });
}

/** Only emit URL values that differ from defaults (keeps shared links short). */
export function scenarioToQuery(
  input: ScenarioInput,
  defaults: ScenarioInput = SCENARIO_DEFAULTS,
): Record<string, string | null> {
  const d = defaults;
  return {
    earn: input.annualEarnings === d.annualEarnings ? null : String(Math.round(input.annualEarnings)),
    dep: input.depositPercent === d.depositPercent ? null : String(input.depositPercent),
    rate: input.annualRatePercent === d.annualRatePercent ? null : String(input.annualRatePercent),
    term: input.termYears === d.termYears ? null : String(input.termYears),
    lti: input.loanToIncome === d.loanToIncome ? null : String(input.loanToIncome),
  };
}

export type PriceBenchmark = { code: string; name: string; points: Pt[] };

export function experimentFoot(args: {
  rateSourceNote?: string | null;
  depositPercent: number;
  benchmarkName?: string;
}): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const loanToValue = 100 - args.depositPercent;
  const rateMatch =
    loanToValue === 75
      ? "This deposit is 25%, so the loan is 75% of the price, which is the product that rate describes."
      : `This deposit is ${args.depositPercent}%, so the loan is ${loanToValue}% of the price. The quoted rate is for a 75% loan. A different loan-to-value usually costs a different rate.`;
  return {
    definition:
      "Purchase budget from the earnings, deposit, rate, term and loan-to-income multiple you set, set beside official England years of pay.",
    method: [
      "Loan = gross annual earnings × the loan-to-income multiple. Purchase budget = loan ÷ (1 − deposit). Monthly repayment is a fixed-rate annuity.",
      "Fees, stamp duty, debts and living costs are not included.",
      "England years of pay is the official middle house price divided by typical wages where people work. Your years of pay uses the price benchmark and the earnings you set. Those are not the same measure.",
      rateMatch,
      args.rateSourceNote ?? "",
      args.benchmarkName ? `Price mark uses ${args.benchmarkName}.` : "",
    ].filter(Boolean),
    source: "ONS · AFF1 · UK HPI · Bank of England quoted household interest rates",
    dataHref: "/data#house-price-to-earnings-ratio",
  };
}

type Props = {
  input: ScenarioInput;
  onChange: (next: ScenarioInput) => void;
  onReset: () => void;
  afford: Pt[];
  /** House-price series the budget is set against. United Kingdom, or one nation or region. */
  benchmarks: PriceBenchmark[];
  benchmarkCode: string;
  /** Live defaults (e.g. BoE rate); used for Reset + “adjusted” detection. */
  defaults?: ScenarioInput;
  /** Short note under the rate slider when BoE is the default. */
  rateSourceNote?: string | null;
};

export function AffordabilityExperiment({
  input,
  onChange,
  onReset,
  afford,
  benchmarks,
  benchmarkCode,
  defaults = SCENARIO_DEFAULTS,
  rateSourceNote = null,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const result = useMemo(() => runScenario(input), [input]);
  const benchmark = benchmarks.find((place) => place.code === benchmarkCode) ?? benchmarks[0];
  const priceSeries = benchmark?.points ?? [];
  const official = afford[afford.length - 1];
  const price = priceSeries[priceSeries.length - 1];
  const derivedYears = price ? yearsOfEarnings(price.v, input.annualEarnings) : null;
  const canAffordMark = price ? result.maxBudget >= price.v : null;

  const depositPct = result.maxBudget > 0 ? (result.deposit / result.maxBudget) * 100 : 0;
  const loanPct = 100 - depositPct;
  const priceMarkPct = price && result.maxBudget > 0 ? Math.min(100, (price.v / result.maxBudget) * 100) : null;

  const set = <K extends keyof ScenarioInput>(key: K, value: number) => {
    onChange(normaliseScenario({ ...input, [key]: value }));
  };

  const adjusted =
    input.annualEarnings !== defaults.annualEarnings ||
    input.depositPercent !== defaults.depositPercent ||
    input.annualRatePercent !== defaults.annualRatePercent ||
    input.termYears !== defaults.termYears ||
    input.loanToIncome !== defaults.loanToIncome;

  return (
    <div className={s.root}>
      <div className={s.stack}>
        <div className={s.grid}>
          <div className={s.controls} role="group" aria-label="Affordability controls">
            <div className={s.controlHead}>
              <p className="bo-label">Your inputs</p>
              {adjusted && (
                <button type="button" className={s.reset} onClick={onReset}>
                  Reset
                </button>
              )}
            </div>

            <label className={s.field} htmlFor={`${uid}-earn`}>
              <span className="bo-label">Gross household earnings · £ / year</span>
              <input
                id={`${uid}-earn`}
                type="range"
                min={SCENARIO_BOUNDS.annualEarnings.min}
                max={SCENARIO_BOUNDS.annualEarnings.max}
                step={SCENARIO_BOUNDS.annualEarnings.step}
                value={input.annualEarnings}
                onChange={(e) => set("annualEarnings", Number(e.target.value))}
              />
              <output className={`bo-fig ${s.out}`}>{fmt.gbp(input.annualEarnings)}</output>
            </label>

            <label className={s.field} htmlFor={`${uid}-dep`}>
              <span className="bo-label">Deposit · % of purchase price</span>
              <input
                id={`${uid}-dep`}
                type="range"
                min={SCENARIO_BOUNDS.depositPercent.min}
                max={SCENARIO_BOUNDS.depositPercent.max}
                step={SCENARIO_BOUNDS.depositPercent.step}
                value={input.depositPercent}
                onChange={(e) => set("depositPercent", Number(e.target.value))}
              />
              <output className={`bo-fig ${s.out}`}>{input.depositPercent}%</output>
            </label>

            <label className={s.field} htmlFor={`${uid}-rate`}>
              <span className="bo-label">Interest rate · % a year</span>
              <input
                id={`${uid}-rate`}
                type="range"
                min={SCENARIO_BOUNDS.annualRatePercent.min}
                max={SCENARIO_BOUNDS.annualRatePercent.max}
                step={SCENARIO_BOUNDS.annualRatePercent.step}
                value={input.annualRatePercent}
                onChange={(e) => set("annualRatePercent", Number(e.target.value))}
              />
              <output className={`bo-fig ${s.out}`}>{input.annualRatePercent.toFixed(1)}%</output>
              {rateSourceNote && <span className={s.note}>{rateSourceNote}</span>}
            </label>

            <label className={s.field} htmlFor={`${uid}-term`}>
              <span className="bo-label">Term · years</span>
              <input
                id={`${uid}-term`}
                type="range"
                min={SCENARIO_BOUNDS.termYears.min}
                max={SCENARIO_BOUNDS.termYears.max}
                step={SCENARIO_BOUNDS.termYears.step}
                value={input.termYears}
                onChange={(e) => set("termYears", Number(e.target.value))}
              />
              <output className={`bo-fig ${s.out}`}>{input.termYears}</output>
            </label>

            <label className={s.field} htmlFor={`${uid}-lti`}>
              <span className="bo-label">Loan-to-income multiple</span>
              <input
                id={`${uid}-lti`}
                type="range"
                min={SCENARIO_BOUNDS.loanToIncome.min}
                max={SCENARIO_BOUNDS.loanToIncome.max}
                step={SCENARIO_BOUNDS.loanToIncome.step}
                value={input.loanToIncome}
                onChange={(e) => set("loanToIncome", Number(e.target.value))}
              />
              <output className={`bo-fig ${s.out}`}>{input.loanToIncome.toFixed(1)}×</output>
            </label>
          </div>

          <div className={s.readout}>
            <div className={s.instrument} aria-label="Cost of a home">
              <p className="bo-label">Purchase budget</p>
              <p className={`bo-fig ${s.budget}`}>{fmt.gbp(result.maxBudget)}</p>
              <div
                className={s.bar}
                role="img"
                aria-label={`Deposit ${fmt.gbp(result.deposit)}, loan ${fmt.gbp(result.maxLoan)}`}
              >
                <span className={s.segDeposit} style={{ width: `${depositPct}%` }} title="Deposit" />
                <span className={s.segLoan} style={{ width: `${loanPct}%` }} title="Loan" />
                {priceMarkPct != null && (
                  <span
                    className={s.priceMark}
                    style={{ left: `${priceMarkPct}%` }}
                    title={`${benchmark?.name ?? "Average"} ${fmt.gbp(price!.v)}`}
                  />
                )}
              </div>
              <ul className={s.legend}>
                <li>
                  <span className={s.swatchDeposit} aria-hidden="true" />
                  Deposit {fmt.gbp(result.deposit)}
                </li>
                <li>
                  <span className={s.swatchLoan} aria-hidden="true" />
                  Loan {fmt.gbp(result.maxLoan)}
                </li>
                {price && (
                  <li>
                    <span className={s.swatchMark} aria-hidden="true" />
                    {benchmark?.name ?? "Average"} {fmt.gbp(price.v)}
                  </li>
                )}
              </ul>
            </div>

            <dl className={s.metrics}>
              <div>
                <dt>Monthly repayment</dt>
                <dd className="bo-fig">{fmt.gbp(result.monthlyRepayment)}</dd>
                <dd className={s.note}>{result.repaymentBurdenPercent.toFixed(0)}% of monthly gross earnings</dd>
              </div>
              <div>
                <dt>Years to save deposit</dt>
                <dd className="bo-fig">
                  {result.yearsToSaveDeposit != null ? `${result.yearsToSaveDeposit.toFixed(1)} yrs` : "—"}
                </dd>
                <dd className={s.note}>At {(result.savingsRate * 100).toFixed(0)}% of gross earnings saved each year</dd>
              </div>
              <div>
                <dt>Your years of pay · {benchmark?.name ?? "price benchmark"}</dt>
                <dd className="bo-fig">{derivedYears != null ? fmt.ratio(derivedYears) : "—"}</dd>
                <dd className={s.note}>
                  {benchmark?.name ?? "Benchmark"} average price ÷ your earnings
                  {canAffordMark != null
                    ? canAffordMark
                      ? " · budget covers that average"
                      : " · budget below that average"
                    : ""}
                </dd>
              </div>
              <div>
                <dt>England years of pay · ONS</dt>
                <dd className="bo-fig">{official ? fmt.ratio(official.v) : "—"}</dd>
                <dd className={s.note}>
                  {official
                    ? `Workplace-based median · ${fmtT(official.t, "annual")}`
                    : "Awaiting house-price-to-earnings-ratio"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
