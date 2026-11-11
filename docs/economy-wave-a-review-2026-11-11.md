# Economy Wave A — Orchestrator review (2026-11-11)

**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Agents:** [01](f35727d0-931e-4705-becd-d4c0ddc513ae) · [02](87dd07d1-9b87-4500-bed8-cca746d33af1) · [05](6d77b94a-a6d1-4cb0-a7b7-0c3a9b079d61) · [08](70d3ae0e-bda8-4aa8-9fb5-9be0fb58f6b7)

## Verdict

| Domain | Handover | Four artefacts | Pin checksums vs live ONS | UI / Ready claim | Orchestrator status |
|--------|----------|----------------|---------------------------|------------------|---------------------|
| 01 Inflation | [handover-economy-01-inflation.md](handover-economy-01-inflation.md) | Yes | Match (Oct 20 vintage) | None | **G2 closed** — Ready |
| 02 Wages | [handover-economy-02-wages.md](handover-economy-02-wages.md) | Yes | Match (Oct 19 vintage) | None | **G2 closed** — Ready (GB labelled) |
| 05 Growth | [handover-economy-05-growth.md](handover-economy-05-growth.md) | Yes | QNA 2026-09-29 pin | None | **G2 closed** — Ready (IHXW zeros → missing) |
| 08 Debt | [handover-economy-08-debt.md](handover-economy-08-debt.md) | Yes | Match (Oct 20 vintage) | None | **G2 closed** — Ready (+ HF6X) |

**Wave A G2 = closed (2026-11-11).** Production `/economy` scaffold stays frozen until Review Gate + G3. **Wave B stays blocked until G3 complete.**

---

## Decisions locked (Orchestrator)

1. **`business-investment` primary home = Domain 09.** Domain 05 Follows only.
2. **Debt % of GDP:** official ONS **HF6X** under Domain 08. Do **not** derive from `real-gdp`.
3. **AWE geography:** override applied — `K03000001` / Great Britain on `nominal-earnings` and `real-earnings`. Energy Prices joins by year (safe). UI must still say GB, never UK.
4. **CPIH annual rate (L55O):** Ready.
5. **GDP source:** ABMI / IHXW / NPEL on **QNA** (PN2 frozen).
6. **IHXW placeholders:** `zero_as_missing_before=1955-01-01` — 36 pre-1955 zeros → missing.

---

## Ready series (Wave A)

| Domain | Indicator IDs |
|--------|----------------|
| 01 | `cpi-inflation`, `cpi-index`, `cpih-index`, `cpih-inflation` (L55O) |
| 02 | `nominal-earnings`, `real-earnings` |
| 05 | `real-gdp`, `real-gdp-per-head`, `labour-productivity` (+ `business-investment` Ready, primary 09) |
| 08 | `public-sector-net-debt`, `public-sector-net-borrowing`, `public-sector-debt-interest`, `public-sector-net-debt-percent-gdp` (HF6X) |

QA: `data/qa/qa_report_cpi_index_2026-11-11.md` · `…_public_sector_debt_trio_…` · `…_cpih_inflation_…` · `…_public_sector_net_debt_percent_gdp_…` · `…_economy_growth_qna_…` · `…_economy_earnings_…`

---

## Re-pin calendar (does not reopen G2)

| When | Series |
|------|--------|
| After 12 Nov GDP | ABMI, IHXW, NPEL |
| After 17 Nov | LZVB, KAI7, A2FC |
| After 18/20 Nov CPI | D7G7 / L522 light re-check |

---

## Next orchestration steps

1. ~~**Review Gate**~~ — locked: [economy-visual-contract.md](economy-visual-contract.md).  
2. ~~**G3**~~ — Inflation · Wages · Growth · Debt live; Wave A Ready series cloud-loaded.  
3. **Optional G4** structural audit on `/economy`.  
4. **Wave B** evidence kickoffs (03 · 06 · 07) — UI still after Wave B G2+G3.

**Wave A G3 = closed (2026-11-11).**
