# housebuilding-completions-long-run

Permanent new-build dwellings completed per calendar year, by tenure. Time Machine track for Housing Domain 10.

- England (E92000001): MHCLG Live Table 244, 1946–2025, refreshed quarterly.
- United Kingdom (K02000001): MHCLG Live Table 241, 1949–2018, discontinued July 2019 (frozen).
- `series=` `all-completions` | `private-enterprise` | `housing-association` | `local-authority` (same slugs as `housing-completions`).

Rebuild: `uv run python -m housing.connectors.housebuilding_completions_long_run`

## Validation notes

- Tenures sum to the total within rounding to the nearest 10.
- LT244 annual totals match the LT213 quarterly series (`housing-completions`) for 1978–79 and 1990–2025. For 1980–89 LT244 is higher by 1.8k–11k a year, and the source does not explain why. Keep tracks separate.
- New-build only. This is not net additional dwellings.
- QA: `data/qa/qa_housing_completions_long_run_2026_11_05.md`

## Open questions

- After 2018, UK totals come from ONS and the devolved administrations. Nothing is spliced here.
