# gilt-holdings-by-sector — Who owns the debt?

**Status:** Ingested + **Validation pass with warnings** (2026-11-14) — `data/qa/qa_report_economy_08_debt_ownership_2026-11-14.md`
(G1–G10 pass; G11 warn: 4-quarter depth, no ONS CDIDs, release date unknown). Orchestrator owns Ready / cloud load; no UI before Review.
**Owner:** Economy · **Licence:** OGL v3.0 · **Matrix:** `docs/economy-08-debt-instruments-source-matrix.md` §2.1

## What it is

ONS estimates of who holds UK government **gilts**, by sector, at **market value** (£ million,
end of quarter). Seven published sectors + TOTAL.

| `series=` | QR label |
|-----------|----------|
| `overseas` | Overseas |
| `insurance-pension-funds` | Insurance companies and pension funds |
| `bank-of-england-apf` | Bank of England (Asset Purchase Facility) |
| `other-financial-pnfc` | Other financial institutions and private non-financial corporations |
| `monetary-financial-institutions` | Monetary financial institutions (excludes BoE) |
| `households-npish` | Households and non-profit institutions serving households |
| `local-authorities-public-corporations` | Local authorities and public corporations |
| `total` | TOTAL |

Curated: **32 rows** = 8 series × 4 quarters (**Q4 2024 – Q3 2025**), `curated/observations.csv`.
Notes are `key=value; …` (`series=`, `sector=`, `sector_label=`, `component=sector|total`,
`valuation=market-value`, `publisher=ONS`, `channel=DMO Quarterly Review`).

## Honest source notes

- **Publisher of the numbers is ONS.** The channel is the DMO Quarterly Review (QR) Oct–Dec 2025 PDF
  (page 3, "Gilt and Treasury Bill Holdings", "Source: ONS").
- **No ONS machine-readable series (CDID) was located** in a time-boxed search (UKEA / national
  accounts sector accounts). So this is a **PDF text parse** (`pypdf`), not hand-keyed. Replacing it with
  ONS CDIDs is an open question — it would also give a longer history.
- **Only four quarters** are in the pinned QR. Newer QRs exist (public mention of Q1 2026 holdings);
  they are not pinned here. To extend: pin the next QR PDF(s) under `data/economy/dmo-debt-portfolio-composition/raw/`
  (+ `SHA256SUMS`) and generalise the connector to merge PDFs (later QR wins for overlapping quarters).
- **Revisions:** ONS says "These figures can be revised retrospectively." The latest quarter per series is
  marked `provisional`. Earlier quarters (Q4 2024 – Q2 2025) are `final` **only in the sense of "final in this QR
  vintage"**: ONS can still revise them, and a newer QR may restate them. Any display must say figures may be
  revised retrospectively. (Method note chosen over marking all four quarters provisional, so the flag still
  distinguishes the newest quarter; curated values and statuses are unchanged.)
- **Release date:** `official_release_date` is left blank on purpose. The QR PDF text does not state its
  publication date (PDF file metadata says created 2026-03-13, which is not proof of release). Open question
  in the manifest.
- Percentages printed in the QR (latest quarter only) are *not* stored; they are re-computed and compared
  in `curated/table_self_check.json`.
- Bank of England's **2002-discontinued** sector table is **not** used.

## What this is NOT

- **Market value ≠ nominal.** ≠ gilts in issue (DMO D1A), ≠ uplifted-nominal debt portfolio.
- **≠ public-sector net debt (HF6W).** Overseas 33% is a share of gilt *market value*, not of PSND.
- **≠ DMO official holdings (D4L)** — that is `dmo-government-holdings` (nominal, CRND+DMO only; excludes BoE).
- "Other financial institutions and PNFC" is a big mixed residual (funds, dealers, hedge funds).

## Raw evidence

`raw/2026-11-14/dmo_quarterly_review_2025_q4.pdf` — a checksum-verified copy of the pin in
`data/economy/dmo-debt-portfolio-composition/raw/` (same publication, one download, SHA-256 in `raw/2026-11-14/SHA256SUMS`).
URL: https://www.dmo.gov.uk/media/wysdetq0/oct-dec-2025.pdf

## Self-check (all pass)

`curated/table_self_check.json`: sectors sum to TOTAL (diff 0 for all four quarters); printed % within rounding.

**Spot check vs QR (Q3 2025, £mn):** Overseas 709,279 · Insurance & pension funds 449,107 · BoE APF 393,760 ·
Other fin + PNFC 356,371 · MFI 212,170 · Households & NPISH 2,950 · LA & public corps 995 · **Total 2,124,632**.
Matches the matrix sample.

## Reproduce

```bash
uv run python -m economy.connectors.gilt_holdings_by_sector
uv run pytest tests/test_dmo_gilt_connectors.py
```

Connector: `src/economy/connectors/gilt_holdings_by_sector.py` (parser in `dmo_quarterly_review.py`).
