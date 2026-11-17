# Validation kickoff — Economy Domain 10 Economic Policy

**Opened:** 2026-11-17  
**Role:** Validation  
**Skill:** `.cursor/skills/validation-agent/SKILL.md`  
**Orchestrator track:** [agent-kickoff-orchestrator-economy-10.md](agent-kickoff-orchestrator-economy-10.md)  
**Standards:** [economy-10-policy-source-standards.md](economy-10-policy-source-standards.md)

## Mission

Independent check of the Economy policy register dates and evidence against the cited primary/official sources. File findings under `data/qa/`. Do **not** silently rewrite `events.json` or `pledges.json`.

## Inputs (Ready for QA)

| Item | Path / id |
|------|-----------|
| Events register | `data/economy/economic-policy/events.json` · pack `economy.policy-events` |
| Pledges | `data/economy/economic-policy/pledges.json` · pack `economy.policy-pledges` |
| Deepen script | `src/economy/connectors/deepen_economy_policy_2026_11_17.py` |
| Loader tests | `tests/test_economy_policy_events.py` |
| Retrieval date | `2026-11-17` |

## Sample checks (minimum)

1. **Assent / mark dates** for seeded Acts vs legislation.gov.uk introductory text.
2. **Commencements** for WRA 2012 under-occupancy (SI 2012/2946, SI 2012/3040) and BoE Act 1946 appointed day (BoE Annual Report 1947 / DMO — Order not on legislation.gov.uk).
3. **Interim OBR** start = 17 May 2010 (GOV.UK press notice).
4. **1992 inflation objective** — BoE QB Summer 2005 (8 Oct) + Hansard Autumn Statement 12 Nov 1992.
5. **UC GB availability** — DWP page update 12 Dec 2018 (full service everywhere GB), not managed-migration completion.
6. **Budget financial[]** figures vs OBR EFO Oct 2024 / Nov 2025 executive summaries (employer NICs £25.7bn; threshold freeze £8.0bn; etc.).
7. **Cross-register** `dossier.related` ids resolve in Housing / Energy files; no copied Housing/Energy event bodies.
8. **Pledges** — all `scorable: false`; inflation points at symmetric-rule doc; no PSNFL/net-debt conflation.

## Output

- `data/qa/qa_economy_domain10_policy_YYYY-MM-DD.md` — PASS / FAIL / BLOCKED per check; quote source mismatches.
- Hand findings back to Orchestrator 10. Do not mark Domain 10 complete.

## Forbidden

- Editing register JSON to “fix” a date without Orchestrator task
- Causal language in QA notes
- Touching `InvestmentCanvas` / Domain 09 packs
