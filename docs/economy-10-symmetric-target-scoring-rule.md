# Economy Domain 10 — symmetric-target pledge scoring rule

**Date:** 2026-11-17 · **Owner:** Orchestrator (Domain 10)  
**Status:** Filed — **not** implemented in the scorer. Pledges stay unscored until an owner accepts this rule and the scorer gains a two-sided path.

## Problem

The Exchange pledge scorer today counts periods **at or above** a floor, or **at or below** a ceiling. That fits one-sided targets (surplus, debt falling, welfare under a cap).

The inflation remit is **symmetric**: the Government sets a point target (currently 2% CPI). Being above and being below are both misses. The Bank's 1 percentage-point open letter threshold is a **reporting** trigger, not a pass mark for “met”.

Until a two-sided rule is written and coded, the inflation pledge stays listed with `scorable: false`.

## Proposed rule (for owner acceptance)

For a pledge whose `target` is a **symmetric point** (example: inflation = 2):

1. **Match required.** Same series, unit, geography and period grain as the target statement (CPI 12-month rate for the current remit).
2. **Tolerance band.** A month (or period) counts as **met** only when  
   `|observed − target| ≤ τ`  
   where `τ` is written on the pledge (default proposal: `τ = 0` — exact hit only — unless the remit itself defines a different tolerance for “on target”).
3. **Letter threshold is not τ.** If the remit requires an open letter when inflation is more than 1pp from target, that 1pp band must **not** be reused as the scoring pass mark unless the owner explicitly chooses that (and records it on the pledge).
4. **Aggregation.** Score is the share (or count) of periods met over the pledged window. No causal language: a met period is not evidence that policy caused the outcome.
5. **Forecast vs outturn.** Charter-style rules assessed on OBR forecasts stay unscored until the Exchange holds the forecast series the Charter names, or the rule is rewritten to use outturn with an owner note.

## Inflation pledge until then

`inflation-target-2-percent` remains:

- `scorable: false`
- `not_scored_reason` points at the missing two-sided rule
- CPI shown as **context** only

## Exit

- [ ] Owner accepts or amends τ and letter-band treatment
- [ ] Scorer implements the two-sided path
- [ ] Validation checks one known period against ONS CPI
- [ ] Only then set `scorable: true` on matching pledges
