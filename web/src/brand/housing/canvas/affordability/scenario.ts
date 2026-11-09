/**
 * Affordability scenario math — modelled budget, not a lender decision.
 * Standard annuity mortgage repayment; not a lender affordability test.
 * Official docs: mortgage payment as P·r(1+r)^n / ((1+r)^n − 1)
 * (see e.g. Bank of England / textbook amortisation).
 * Default interest rate should be overridden with BoE IUMBV34 when available.
 */

export type ScenarioInput = {
  /** Gross annual household earnings (£). */
  annualEarnings: number;
  /** Deposit as % of purchase price (0–100 exclusive of 100). */
  depositPercent: number;
  /** Nominal annual interest rate (%). */
  annualRatePercent: number;
  /** Mortgage term in whole years. */
  termYears: number;
  /** Assumed loan-to-income multiple (illustrative). */
  loanToIncome: number;
  /**
   * Share of gross annual earnings assumed saved toward the deposit (0–1).
   * Used only for the “years to save” estimate.
   */
  savingsRate?: number;
};

export type ScenarioResult = {
  maxLoan: number;
  deposit: number;
  maxBudget: number;
  monthlyRepayment: number;
  /** Monthly repayment as % of monthly gross earnings. */
  repaymentBurdenPercent: number;
  /** Years to accumulate the deposit at savingsRate of gross earnings. */
  yearsToSaveDeposit: number | null;
  savingsRate: number;
};

export const SCENARIO_BOUNDS = {
  annualEarnings: { min: 15_000, max: 250_000, step: 1_000 },
  depositPercent: { min: 5, max: 40, step: 1 },
  annualRatePercent: { min: 0.5, max: 12, step: 0.1 },
  termYears: { min: 10, max: 40, step: 1 },
  loanToIncome: { min: 2.5, max: 5.5, step: 0.1 },
} as const;

/** Fallback defaults when BoE rate / ASHE earnings are offline. */
export const SCENARIO_DEFAULTS: ScenarioInput = {
  annualEarnings: 45_000,
  depositPercent: 10,
  annualRatePercent: 4.5,
  termYears: 25,
  loanToIncome: 4.5,
  savingsRate: 0.1,
};

/** Round BoE quoted % to the slider step (0.1). */
export function rateFromBoE(percent: number): number {
  const step = SCENARIO_BOUNDS.annualRatePercent.step;
  const rounded = Math.round(percent / step) * step;
  return Math.min(
    SCENARIO_BOUNDS.annualRatePercent.max,
    Math.max(SCENARIO_BOUNDS.annualRatePercent.min, Number(rounded.toFixed(1))),
  );
}

/** Build defaults with an optional live BoE 2yr-fixed rate as the starting rate. */
export function scenarioDefaults(opts?: { boeRatePercent?: number | null }): ScenarioInput {
  const rate =
    opts?.boeRatePercent != null && Number.isFinite(opts.boeRatePercent)
      ? rateFromBoE(opts.boeRatePercent)
      : SCENARIO_DEFAULTS.annualRatePercent;
  return { ...SCENARIO_DEFAULTS, annualRatePercent: rate };
}

/** Clamp and sanitise inputs so the annuity never divides by zero. */
export function normaliseScenario(raw: Partial<ScenarioInput>): ScenarioInput {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const earnings = Number.isFinite(raw.annualEarnings)
    ? clamp(raw.annualEarnings!, SCENARIO_BOUNDS.annualEarnings.min, SCENARIO_BOUNDS.annualEarnings.max)
    : SCENARIO_DEFAULTS.annualEarnings;
  const depositPercent = Number.isFinite(raw.depositPercent)
    ? clamp(raw.depositPercent!, SCENARIO_BOUNDS.depositPercent.min, SCENARIO_BOUNDS.depositPercent.max)
    : SCENARIO_DEFAULTS.depositPercent;
  const annualRatePercent = Number.isFinite(raw.annualRatePercent)
    ? clamp(raw.annualRatePercent!, SCENARIO_BOUNDS.annualRatePercent.min, SCENARIO_BOUNDS.annualRatePercent.max)
    : SCENARIO_DEFAULTS.annualRatePercent;
  const termYears = Number.isFinite(raw.termYears)
    ? Math.round(clamp(raw.termYears!, SCENARIO_BOUNDS.termYears.min, SCENARIO_BOUNDS.termYears.max))
    : SCENARIO_DEFAULTS.termYears;
  const loanToIncome = Number.isFinite(raw.loanToIncome)
    ? clamp(raw.loanToIncome!, SCENARIO_BOUNDS.loanToIncome.min, SCENARIO_BOUNDS.loanToIncome.max)
    : SCENARIO_DEFAULTS.loanToIncome;
  const savingsRate =
    raw.savingsRate != null && Number.isFinite(raw.savingsRate)
      ? clamp(raw.savingsRate, 0.01, 0.5)
      : (SCENARIO_DEFAULTS.savingsRate ?? 0.1);
  return { annualEarnings: earnings, depositPercent, annualRatePercent, termYears, loanToIncome, savingsRate };
}

/** Monthly repayment on principal `loan` at `annualRatePercent` over `termYears`. */
export function monthlyRepayment(loan: number, annualRatePercent: number, termYears: number): number {
  if (!(loan > 0) || !(termYears > 0)) return 0;
  const n = termYears * 12;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return loan / n;
  const growth = (1 + r) ** n;
  return (loan * r * growth) / (growth - 1);
}

/**
 * Build an indicative budget from earnings × LTI and a deposit % of purchase price.
 * maxBudget = maxLoan / (1 − depositPercent/100).
 */
export function runScenario(raw: Partial<ScenarioInput>): ScenarioResult {
  const input = normaliseScenario(raw);
  const maxLoan = input.annualEarnings * input.loanToIncome;
  const depositShare = input.depositPercent / 100;
  const maxBudget = depositShare >= 1 ? maxLoan : maxLoan / (1 - depositShare);
  const deposit = maxBudget - maxLoan;
  const payment = monthlyRepayment(maxLoan, input.annualRatePercent, input.termYears);
  const monthlyGross = input.annualEarnings / 12;
  const repaymentBurdenPercent = monthlyGross > 0 ? (payment / monthlyGross) * 100 : 0;
  const annualSave = input.annualEarnings * input.savingsRate!;
  const yearsToSaveDeposit = annualSave > 0 ? deposit / annualSave : null;
  return {
    maxLoan,
    deposit,
    maxBudget,
    monthlyRepayment: payment,
    repaymentBurdenPercent,
    yearsToSaveDeposit,
    savingsRate: input.savingsRate!,
  };
}

/** Price ÷ earnings — same shape as an official PTE ratio, but DERIVED here. */
export function yearsOfEarnings(price: number, annualEarnings: number): number | null {
  if (!(price > 0) || !(annualEarnings > 0)) return null;
  return price / annualEarnings;
}
