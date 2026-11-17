# Kickoff — Validation · Economy Domain 04 RHDI / living standards

**Owner:** Validation  
**Blocked until:** Economy handoff `docs/handover-economy-04-household.md` lists Validation-ready packages  
**Skill:** `.cursor/skills/validation-agent/SKILL.md`  
**Paths:** `src/validation/`, `data/qa/` only — do not rewrite curated Economy data

## Series under check (expected)

| Indicator | CDID | Path |
|-----------|------|------|
| `real-household-disposable-income` | DG2R | `data/economy/real-household-disposable-income/` |
| `real-household-disposable-income-per-head` | CRXX | `data/economy/real-household-disposable-income-per-head/` |
| (+ any Phase 1 companions Economy ships) | — | per handover |

## Checks

1. Spot latest published UKEA / sector accounts values vs curated CSV.
2. Geography UK; SA; CVM reference year stated; S.14 vs NPISH labelled.
3. Provisional policy = latest period only.
4. Aggregates vs per-head consistency Notes (do not require invented reconciliation).
5. Manifest checksums + licence + connector entrypoint.

## Output

- `data/qa/qa_report_economy_04_rhdi_YYYY-MM-DD.md`
- Pass/fail counts; registry Ready recommendation only on pass
- No frontend; no silent curated edits

## Do not

- Mark Housing affordability or Domain 06 ETB as Domain 04 Ready via this QA
- Treat mortgage-rate as a living-standards pin
