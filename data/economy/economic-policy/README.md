# Economic policy — Domain 10

**Domain:** Economy & Public Finance · 10 Economic policy  
**Question (provisional):** Which decisions shaped Britain's economy, why were they introduced, what changed, and what evidence exists about their consequences?  
**Flagship:** The economic decision ledger  
**Status:** Gate 2 deepen in progress (2026-11-17). Twenty-six checked records with evidence dossiers; Housing/Energy cross-links; Budget measures with OBR costings; gap pins for 1992 objective, interim OBR, 1946 appointed day, UC GB full-service availability, LPC and HM Treasury. Domain **not** complete until Validation + Gate 4.

Register for Acts, instruments, programmes and institutions. None of them is a statistical observation, so there is no `observations.csv`. The shared shape is `britain_exchange.policy_event`; this file is the first to use its optional evidence record (`policy_area`, `repealed_date`, `dossier`).

## Files

| File | Purpose |
|------|---------|
| `events.json` | Checked decisions (load-checked by `policy_event`). Eras, events, relationships |
| `pledges.json` | Promise vs delivery register (same shape as Energy / Housing). Draft; nothing scored yet |
| `GATE1_COMPOSITION.md` | Three studies → one locked for Gate 2 |
| `source_register.csv` | Candidate decisions and documents, with the gate each belongs to |
| `reuse_map.md` | Cross-sector links and forbidden conflations |

Source standards and the schema: [docs/economy-10-policy-source-standards.md](../../../docs/economy-10-policy-source-standards.md).

## Ten policy areas (`policy_area`)

fiscal · monetary · institutions · trade · industrial · labour-market · welfare · housing-land · financial-regulation · crisis-response

Housing-and-land and industrial decisions are referenced from the Housing and Energy registers by id (`dossier.related`), never copied.

## Where the mark goes

Same rule as Housing: Royal Assent for an Act, made date for an instrument, `start_date` with a `date_note` for a programme or institution. `announcement_date` is a policy statement (the 6 May 1997 Bank of England announcement sits on the 1998 Act). `repealed_date` is the day a repeal came into force. Royal Assent is not the day a duty starts.

## Three kinds of evidence, kept apart

| Kind | Where |
|------|-------|
| What policymakers said | `dossier.background` · `objectives` · `mechanism` · `measures` |
| What was done | `commencements` · `dossier.implementation` · `financial` |
| What others concluded | `dossier.evaluations` (publisher, date, URL, finding) |
| Observed series | `linked_indicators` — context only, never an effect |

## Load check

```bash
uv run python -c "from pathlib import Path; from britain_exchange.policy_event import load_policy_registry; load_policy_registry(Path('data/economy/economic-policy/events.json'))"
uv run python -m pytest tests/test_economy_policy_events.py -q
```

## Cloud

Packs `economy.policy-events` and `economy.policy-pledges` (`britain_exchange.packs`), pushed to Storage with `archive_data push --keep-local data/economy/economic-policy/events.json` (and `pledges.json`). The local files stay in git because the tests and the validator read them; the UI never reads this folder.

## Still open / deferred

- More Budget / Finance Act measure rows (small set shipped: emergency Budget June 2010 · Autumn Budget 2024 · Autumn Budget 2025)
- Managed-migration UC orders beyond GB full-service availability (12 Dec 2018 DWP update) — not collapsed into one “national roll-out” day
- Symmetric-target scoring rule filed at `docs/economy-10-symmetric-target-scoring-rule.md` — pledges still unscored
- Monetary decisions (Bank Rate, QE) as a series — belongs to a Ready indicator, not this register
- Further committee / academic evaluations
- Independent Validation QA on dates vs sources → `data/qa/`

## Forbidden

- Causal arrows from a decision to inflation, growth, jobs or borrowing
- Copying Housing or Energy records into this file
- A pledge scored against a series that counts something else
