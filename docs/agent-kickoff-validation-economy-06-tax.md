# Validation kickoff — Economy 06 · tax-receipts AHHY (EC-VAL-06)

**Owner:** Validation · **Date:** 2026-11-14  
**Domain:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Handover:** [handover-economy-06-tax.md](handover-economy-06-tax.md)

## Scope

Independent QA only — do **not** rewrite curated files. File findings under `data/qa/`.

| Indicator | CDID | Spot |
|-----------|------|------|
| `tax-receipts` | AHHY / PUSF | 2026-09 = 88,127 £m NSA |

### Checks

| ID | Check |
|----|-------|
| C1 | Raw path + checksum match manifest |
| C2 | Series AHHY; UK; £m NSA |
| C3 | Caveats document AHHY ≠ HMRC cash |
| C4 | Exactly one provisional (latest) month |
| C5 | Spots 1997-04 / 2012-01 / 2026-09 vs raw |
| C6 | Official release recorded |
| C7 | Period levels only (not FYTD as curated) |

## Out of scope

Frontend; tax-type components; tax/GDP; Tax Machine; cloud load (Orchestrator after Ready).

## Done means

QA report `data/qa/qa_report_economy_06_tax_receipts_2026-11-14.md`; recommend Ready on pass.
