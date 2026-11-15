# dmo-government-holdings — official government gilt holdings (DMO D4L)

**Status:** Ingested + **Validation pass with warnings** (2026-11-14) — `data/qa/qa_report_economy_08_debt_ownership_2026-11-14.md`
(D1–D12 pass; D13 warn: index-linked basis is evidence-based, DMO confirmation pending). Orchestrator owns Ready / cloud load; no UI before Review.
**Owner:** Economy · **Licence:** OGL v3.0 (DMO terms) · **Matrix:** `docs/economy-08-debt-instruments-source-matrix.md` §2.3

> **Official holdings — NOT "Who owns the debt".** This is gilts held by the government itself
> (CRND + DMO), at **nominal** value. For sector ownership use `gilt-holdings-by-sector`.

**Naming:** the matrix used the provisional id `dmo-government-gilt-holdings`. The raw pin folder was already
`dmo-government-holdings`, so that is the indicator_id (folder = id). Orchestrator may update the matrix/registry.

## What is curated

`curated/observations.csv` — **777 rows** = 3 series × 259 month-ends (**Apr 2005 – Oct 2026**), £ million nominal:

| `series=` | Meaning |
|-----------|---------|
| `total` | all gilts held by CRND + DMO |
| `conventional` | conventional gilts (includes the two Annuities rows) |
| `index-linked` | gilts whose name contains "Index-linked" |

Notes: `series=…; holder=CRND+DMO; valuation=nominal; excludes=BoE,local-authorities,public-corporations;
aggregation=sum-of-gilt-rows`.

`curated/latest_snapshot_by_gilt.csv` — **103 gilts with a non-zero holding at 31 Oct 2026** (ISIN, name, kind, £m).
This is a *side file*, deliberately **not** in observations, so per-gilt rows can never be summed into the series by accident.

`curated/parse_check.json` — counts and latest totals.

## Choice documented: time series + latest snapshot

The file's history is clean (every FY block parses, no gaps, no negatives, no duplicate ISIN-months), so the monthly
aggregate series is included in full. The latest per-gilt snapshot is kept for context. The latest month (Oct 2026)
is `provisional`.

## Honest notes

- **Our sums, not DMO totals.** The file has no total row; totals are Exchange-derived sums of gilt rows.
- **Excludes** Bank of England, local authorities and public corporations (file note 1). So the Bank of England's
  APF gilts (~£390bn+ at market value in the ONS table) are **absent** here.
- **Nominal ≠ market value.** The file does not state whether index-linked rows are inflation-uplifted, but Validation
  (check D11b) found they are **nominal (not uplifted)**: D4L index-linked is ~£2.1bn at Dec 2025, the QR gross-minus-net
  (uplifted) gap is ~£5.03bn, and D4L × the D1A per-ISIN uplift ratio gives ~£5.17bn (within a few %). **DMO confirmation is
  still pending** (manifest open question), so never add D4L index-linked to uplifted-nominal totals.
  Conventional D4L ties to the QR gap to within £0.01bn at four quarter-ends.
- Header says "EXCLUDING REPO". Month columns are treated as month-end holdings (matrix: month-end; DMO publishes ~10 working days after).
- Blank cells (gilt not yet issued / beyond the published months) are skipped; `0.0` is kept as a real zero.
- Browser export pinned 14 Nov 2026 (data date 14 Nov 2026) — DMO's bot challenge blocks scripted download.
  Evidence `retrieved_at` is the pinned file's modified time.

## Raw evidence

`raw/Government Holdings of Gilts Nov 14 2026.xls` — SHA-256 in `raw/SHA256SUMS` (verified on every run; a mismatch aborts).
Source: https://www.dmo.gov.uk/data/gilt-market/government-holdings/ (D4L).

## Reproduce

```bash
uv run python -m economy.connectors.dmo_government_holdings
uv run pytest tests/test_dmo_gilt_connectors.py
```

Connector: `src/economy/connectors/dmo_government_holdings.py` (+ `dmo_pins.py`).
