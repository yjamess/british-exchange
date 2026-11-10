# Validation notes — bres-manufacturing-jobs-by-division-region

Self-check before Validation agent:

- Row count: 6 years × 11 GB regions × 24 SIC divisions = **1584** (exact).
- Unit: Nomis `OBS_VALUE` headcount ÷ 1000 → thousands of employee jobs.
- Spot: North West · SIC 20 · 2023 ≈ 21.0 thousand (Nomis rounded).
- Geography: TYPE480 only — **no Northern Ireland**.
- Status: 2019–2023 `final`; 2024 `provisional`.
- Do not expect division sums to equal BRES Table 4 Manufacturing totals (rounding / suppressions).

Registry: hand to Validation when ready for Ready status.
