# Kickoff — Economy Domain 06 · Anatomy of Revenue **pin**

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Discovery (done):** [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md) · [handover-economy-06-anatomy.md](handover-economy-06-anatomy.md)  
**Prior discovery kickoff:** [agent-kickoff-economy-06-anatomy.md](agent-kickoff-economy-06-anatomy.md)  
**Work plan:** `EC-G2-06B-PIN`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15 · Orchestrator opened pin after `path-found-ons-nab`  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Can we pin a tax-type composition that honestly sums to AHHY (public-sector taxes + NICs)?

**Experience:** **Anatomy of Revenue** — currently EmptyStage; UI is Orchestrator after Validation PASS.

## Locked identity (ONS Appendix D / NAB)

```
MF6P + AIIH + NMHM + AHGR = AHHY
```

| CDID | Role | Sep 2026 (£m) spot |
|------|------|---------------------|
| **MF6P** | Total central government taxes | 66,282 |
| **AIIH** | Social contributions (mainly NICs) | 17,414 |
| **NMHM** | Council tax | 4,494 |
| **AHGR** | Other local government taxes | −63 |
| **AHHY** | Total (existing Ready pin `tax-receipts`) | 88,127 |

**Do not** use JW2O as the Anatomy total. **Do not** mix HMRC cash / PSA7D under AHHY.

## Non-negotiables

- **No frontend** (`web/` stays untouched).
- Accruals / NAB only for this package.
- **AHGR:** PUSF `/data` was 404 — pin from Appendix D workbook Time Series (document source). Prefer residual `AHHY − (MF6P+AIIH+NMHM)` only if workbook series unavailable, and label it Exchange residual with Notes.
- Reuse existing `tax-receipts` (AHHY) as the total — do not fork a second AHHY pipeline.
- Latest month provisional-only status (PSF pattern), matching `tax-receipts`.
- Self-QA must prove the identity on ≥3 months.

## Deliverable package

**Indicator id (locked):** `tax-receipts-composition`

Preferred shape: **one** curated multi-series package under `data/economy/tax-receipts-composition/` with a category/component dimension for MF6P, AIIH, NMHM, AHGR (plain labels in Notes for UI later). Connector under `src/economy/connectors/`.

Also pin raw:

1. Appendix D XLSX (ONS current dataset) + checksum  
2. PUSF `/data` JSON for MF6P, AIIH, NMHM (and AHGR if API recovers)  
3. Manifest, README, `validation_report.md`, checksums

### Optional same pass (if cheap)

CG drill heads that sit **under** MF6P (not a second total): LIBR, NZGF, CPRN — as additional categories with Notes that they partition MF6P / NMCU / NMBY, not AHHY directly. Skip if it risks delaying the four-head identity.

## Handover

Write/update `docs/handover-economy-06-anatomy-pin.md` with:

- Paths, checksums, row counts, spot months  
- Identity proof table  
- AHGR sourcing note  
- Validation ask **`EC-VAL-06B`** (checks from discovery handover V1–V5)  
- Registry: create Inbox/Validation rows (or Ready only after Orchestrator flips post-QA) — Status **Validation** until independent PASS  

## Do not

- HMRC cash ingest  
- Mark Ready without Validation  
- Invent residuals that hide a broken identity  
- Edit `tax-receipts` curated except to **read** for AHHY cross-check  

## Done means

Reproducible package + self-QA pass on identity + Validation-ready handover. Orchestrator schedules `EC-VAL-06B` then G3 Anatomy UI.
