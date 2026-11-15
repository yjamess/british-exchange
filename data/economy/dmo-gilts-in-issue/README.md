# dmo-gilts-in-issue

**Status:** Validation **pass** 2026-11-14 (`data/qa/qa_report_economy_08_dmo_d8b_d1a_2026-11-14.md`); cloud load / Ready for UI still Orchestrator.  
**Report:** DMO D1A · Gilts in Issue  
**Matrix:** `docs/economy-08-debt-instruments-source-matrix.md`  
**Owner:** economy · **Licence:** Open Government Licence v3.0 (via [DMO terms](https://www.dmo.gov.uk/terms-of-use/)) · **Publisher:** UK DMO

| File | As-of | Notes |
|------|-------|-------|
| `raw/Gilts in Issue Nov 14 2026.xls` | Data date 14 Nov 2026; gilts in issue on **13 Nov 2026** | 131 sheet rows; headline outstanding incl. IL uplift **£2,939.04bn** nominal |
| `curated/observations.csv` | 2026-11-13 | 138 rows: 104 gilts (70 conventional, 34 index-linked) → 104 `nominal` + 34 `uplifted_nominal` |
| `curated/headline_check.json` | same | Diagnostic: conventional nominal + IL uplifted nominal = £2,939,042.99m vs headline £2,939,040m (diff £2.99m, inside the £5m rounding tolerance) |
| `manifest.yaml` | same | Shared contract manifest with checksum + caveats |

SHA-256 in `raw/SHA256SUMS` (the connector re-checks it on every run).

## Curated shape

One row per gilt per amount series; `period_start` = `period_end` = as-of date `2026-11-13`; geography UK (`K02000001`); status `final`.
Notes are `key=value; …`:

- `series=nominal` — all 104 gilts, unit `£ million nominal`.
- `series=uplifted_nominal` — index-linked gilts only (34), unit `£ million nominal (including index-linked uplift)`. Conventional gilts have no uplifted figure in the source, so none is emitted.
- Always: `kind=conventional|index_linked; isin=…; name=…; maturity=…; first_issue=…; table=D1A`.
- Conventional: `bucket=ultra-short|short|medium|long`. Index-linked: `lag_months=3|8; base_rpi=…`.

No aggregates are curated; do not add nominal across kinds as a debt total.

## Caveats (read before using)

- **Nominal / uplifted nominal** (face value), **not market value** and **not who owns gilts**.
- **Working-day snapshot**, not a time series. Amounts change after every operation; IL uplift changes monthly with RPI.
- **Not PSND (HF6W)**; gilts only (no T-bills, NS&I, other public-sector debt).
- **Gross** of official holdings — unlike D8B redemptions, which are net of government holdings.

## Reproduce

Raw is a manual browser pin (DMO captcha) — the connector never downloads and never edits raw.

```bash
uv run python -m economy.connectors.dmo_gilts_in_issue
```

Module: `src/economy/connectors/dmo_gilts_in_issue.py` (shared helpers in `dmo_common.py`).
