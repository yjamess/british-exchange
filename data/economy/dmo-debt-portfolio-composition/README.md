# dmo-debt-portfolio-composition — debt portfolio by instrument (DMO Quarterly Review)

**Status:** Ingested + **Validation pass with warnings** (2026-11-14) — `data/qa/qa_report_economy_08_debt_ownership_2026-11-14.md`
(P1–P10 pass; P11 warn: only quarters printed in one QR, no back-fill). Orchestrator owns Ready / cloud load; no UI before Review.
**Owner:** Economy · **Licence:** Crown copyright / OGL v3.0 via [DMO terms](https://www.dmo.gov.uk/terms-of-use/)
**Matrix:** `docs/economy-08-debt-instruments-source-matrix.md` §1.2

## What is curated

`curated/observations.csv` — **48 rows**, £ billion, parsed from QR Oct–Dec 2025 pages 1–2 (`pypdf`):

| Table | Valuation | As-of dates | Rows |
|-------|-----------|-------------|------|
| Debt portfolio statistics | `uplifted-nominal` | 31 Mar, 30 Jun, 30 Sep, 31 Dec 2025 | 2 bases × 4 instruments × 4 = 32 |
| Market Value Statistics | `market-value` | 30 Sep, 31 Dec 2025 | 2 × 4 × 2 = 16 |

Notes: `series=<valuation>-<basis>-<instrument>; valuation=; basis=gross|net; instrument=total|conventional-gilts|index-linked-gilts|treasury-bills`.
`net` excludes gilts held by the DMO. Stock at a date ⇒ `period_start == period_end`.

Self-check (`curated/portfolio_self_check.json`, all pass): total == conventional + index-linked + T-bills (±£0.02bn);
net ≤ gross. Spot check vs QR: 31 Dec 2025 gross uplifted nominal £2,908.65bn (conventional £2,125.59bn, IL £693.56bn,
T-bills £89.50bn); market value gross £2,484.57bn.

## Honest notes

- **Never sum across valuations.** Uplifted nominal ≠ market value ≠ nominal in issue (D1A) ≠ PSND (HF6W).
- **Not ownership.** Who holds the gilts is `gilt-holdings-by-sector` (same PDF, separate indicator).
- Excludes the £500m UK Sovereign Sukuk. T-bills are **debt-management** only (cash-management T-bills excluded from the QR since June 2016).
- Conventional gilts include green gilts (£49.6bn Dec 2025, QR footnote 4) — not split out.
- Average maturity, yield and duration rows in the QR are **not** curated (different units; out of scope).
- Only the dates printed in this QR. Longer quarterly history lives in the DMO data section — open item.
- **Revisions:** all rows are `final` *as printed in this QR*. DMO can revise earlier quarters (QR footnote 3 on
  T-bill history) and a newer QR may restate them. Same wording applies to the ONS-sourced sibling `gilt-holdings-by-sector`.
- **Release date:** `official_release_date` is left blank; the PDF text does not state its publication date
  (file metadata: created 2026-03-13, not proof). Open question in the manifest.
- Pinned from the QR PDF in browser (DMO bot wall); not downloaded by the connector.

## Raw evidence

`raw/dmo_quarterly_review_2025_q4.pdf` — SHA-256 in `raw/SHA256SUMS` (verified every run).
https://www.dmo.gov.uk/media/wysdetq0/oct-dec-2025.pdf

## Reproduce

```bash
uv run python -m economy.connectors.dmo_debt_portfolio_composition
uv run pytest tests/test_dmo_gilt_connectors.py
```

Connector: `src/economy/connectors/dmo_debt_portfolio_composition.py` (parser in `dmo_quarterly_review.py`).
