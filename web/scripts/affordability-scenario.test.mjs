import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const input = await readFile(new URL("../src/brand/housing/canvas/affordability/scenario.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(input, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const s = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("zero-rate repayment is principal / months", () => {
  assert.equal(s.monthlyRepayment(120_000, 0, 10), 1000);
});

test("4.5% 25y on £202.5k loan is a stable annuity (~£1,125)", () => {
  // Max loan at £45k × 4.5 LTI = £202,500
  const m = s.monthlyRepayment(202_500, 4.5, 25);
  assert.ok(m > 1100 && m < 1150, `got ${m}`);
});

test("runScenario: budget = loan / (1 − deposit%)", () => {
  const r = s.runScenario({
    annualEarnings: 40_000,
    depositPercent: 20,
    annualRatePercent: 4,
    termYears: 25,
    loanToIncome: 4,
  });
  assert.equal(r.maxLoan, 160_000);
  assert.ok(Math.abs(r.maxBudget - 200_000) < 1e-6);
  assert.ok(Math.abs(r.deposit - 40_000) < 1e-6);
  assert.ok(r.monthlyRepayment > 0);
  assert.ok(r.yearsToSaveDeposit != null && r.yearsToSaveDeposit > 0);
});

test("normaliseScenario clamps out-of-range inputs", () => {
  const n = s.normaliseScenario({ annualEarnings: 1, depositPercent: 90, termYears: 99, loanToIncome: 99 });
  assert.equal(n.annualEarnings, s.SCENARIO_BOUNDS.annualEarnings.min);
  assert.equal(n.depositPercent, s.SCENARIO_BOUNDS.depositPercent.max);
  assert.equal(n.termYears, s.SCENARIO_BOUNDS.termYears.max);
  assert.equal(n.loanToIncome, s.SCENARIO_BOUNDS.loanToIncome.max);
});

test("yearsOfEarnings matches price / pay", () => {
  assert.equal(s.yearsOfEarnings(300_000, 40_000), 7.5);
  assert.equal(s.yearsOfEarnings(0, 40_000), null);
});
