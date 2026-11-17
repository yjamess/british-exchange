# Kickoff — Validation · Economy Domain 04 Buffer + Debt

**Owner:** Validation  
**Handover:** `docs/handover-economy-04-household-deepen.md`  
**Skill:** `.cursor/skills/validation-agent/SKILL.md`  
**Paths:** `src/validation/`, `data/qa/` — do not rewrite curated Economy data

## Series

| Indicator | Source | Path |
|-----------|--------|------|
| `household-financial-wealth` | ONS WAS financial wealth xlsx | `data/economy/household-financial-wealth/` |
| `consumer-credit-outstanding` | BoE LPMBI2O · LPMVZRJ · LPMB4TS | `data/economy/consumer-credit-outstanding/` |

## Checks

1. Spot Round 8 median net £10,400 and key percentiles/bands vs workbook; GB geography; accreditation-suspended caveat present.
2. DGD8 must not be treated as Buffer in Notes/manifest.
3. BoE: Sep 2026 total 261,200; cards + other = total; provisional = latest month; SA £m.
4. Link-only Housing property wealth / MLAR / mortgage rate not re-ingested under economy.
5. Manifest checksums + connector entrypoints.

## Output

- `data/qa/qa_report_economy_04_buffer_debt_2026-11-15.md`
- Optional script under `src/validation/`
- Registry → Ready only on pass

## Do not

- Frontend; mark LCF Cost/Ledger Ready; silent curated edits; work-plan edits
