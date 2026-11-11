# Handover — Economy Domain 08 · HF6X (debt % of GDP)

**Gate:** G2 (evidence only — no frontend) · **Owner:** Economy · **Date:** 2026-11-11
**Follows:** [handover-economy-08-debt.md](handover-economy-08-debt.md) (closes its blocker B3)
**Notion plan:** [08 · Public Debt & Government Finances](https://app.notion.com/p/414654717685811cb155f725cba481a3)
**Registry row:** [Public sector net debt (% of GDP)](https://app.notion.com/p/41565471768581e6ad97d6c10b9a5a1a) — status **Validation**

**Status line:** Ingested and self-checked. **Not Ready.** Independent Validation has not run.

## Decision

Orchestrator locked 2026-11-11: use the official ONS series HF6X. Do **not** derive the ratio from `real-gdp` (ABMI, chained volume SA) — PSND is nominal.

## Indicator

| Field | Value |
|-------|-------|
| `indicator_id` | `public-sector-net-debt-percent-gdp` |
| Series | HF6X / PUSF — "PS: Net Debt (excluding public sector banks) as a % of GDP: NSA" |
| Unit | `% of GDP, NSA (ex public sector banks)` (ONS unit field `%`) |
| Frequency / span | monthly, 1993-03 → 2026-09, 403 rows, 0 missing |
| Latest | 2026-09 = **94.0** (2026-08 = 93.6), release 2026-10-20, next 20 Nov 2026 |
| Raw SHA-256 | `9e36441224589270407925629a6fbf4ec0428f485a8f328983fa255ada23f4e5` |
| Curated SHA-256 | `d8dcf7c9479fc2f1155ae2a198793d26b0401ccc3fc89287cb16d5ac9c165baa` |
| Package | `data/economy/public-sector-net-debt-percent-gdp/` (manifest, raw, curated, README, validation_notes) |
| Connector | `src/economy/connectors/public_sector_net_debt_percent_gdp.py`; spec `PUBLIC_SECTOR_NET_DEBT_PERCENT_GDP` in `fiscal_series.py` |
| Reproduce | `uv run python -m economy.connectors.public_sector_net_debt_percent_gdp` |

## Links added

`public-sector-net-debt` (HF6W), `public-sector-net-borrowing` (DZLS) and `public-sector-debt-interest` (NMFX) now list HF6X in `related_indicator_ids`. This is done through a `_debt_family_related()` helper in `fiscal_series.py`, so `tax-receipts` and `total-managed-expenditure` stay unchanged (HF6X is a debt-family link only).

I re-ran those three connectors to regenerate their manifests. Their raw SHA-256 and curated CSV SHA-256 are **unchanged**; only `retrieved_at` and raw path (`raw/2026-11-11/…`) moved. This also puts the raw JSON on disk for them, which closes blocker B2 for those packages. Their dated `validation_report.md` files still cite `raw/2026-11-03/…`; I left them as the historical self-QA record.

## Caveats

- **High revision risk for the latest ~6 months.** ONS's centred 12-month nominal GDP denominator uses OBR forecast quarters. Keep `provisional`; any UI must flag the tail.
- Ratio in per cent of GDP — never share an axis with HF6W (£bn) or DZLS/NMFX (£m).
- Older ONS tables label HF6X "PSND ex BoE"; this row follows the live title "excluding public sector banks".
- Peak 97.8% (2020-09, 2020-10).
- Only the `months` array is curated; 207 quarterly and 51 annual rows stay in raw.
- No reconciliation HF6X × GDP ≈ HF6W was done (needs BKTL nominal GDP, not ingested) — left to Validation.
- Postgres/Supabase load not checked or done (Orchestrator, AGENTS.md cloud rule).

## Remaining blockers (for Orchestrator)

| # | Item | Owner |
|---|------|-------|
| B1 | Independent Validation for HF6X (and HF6W/DZLS/NMFX); registry stays Validation | Validation |
| B4 | Amend kickoff wording that pairs %GDP with `real-gdp` | Orchestrator |
| B5 | Postgres load for the four Domain 08 series | Orchestrator |
| New | Re-pin all four after the 2026-11-20 release; record HF6X tail revision size | Economy / Validation |

## Files touched

- Created: `data/economy/public-sector-net-debt-percent-gdp/**`, `src/economy/connectors/public_sector_net_debt_percent_gdp.py`, this file.
- Edited: `src/economy/connectors/fiscal_series.py`, `src/economy/connectors/__init__.py`; manifests and READMEs of the three sibling packages (related links, raw path).
- Notion: new registry row; Domain 08 page updated.
- Not touched: `web/`, Energy / other sectors, curated CSVs of sibling packages, `data/qa/`.
