# Industrial Policy — Domain 10

**Domain:** [Industrial Policy](https://app.notion.com/p/41065471768581dca8fbf13058c8dce5)  
**Question (locked):** Which public decisions, incentives, institutions and investments shaped Britain's energy and industrial trajectory, and what can the evidence actually establish?  
**Flagship:** The Decision Ledger  
**Status:** Gate 2 Study C shipped (2026-11-07). Domain **not** complete.

## Methodological boundary (Notion §5)

- Announcement ≠ Royal Assent ≠ commencement ≠ funding allocation ≠ realised spend.
- Before/after overlap with an indicator is **context**, not effect.
- Shared shape: `src/britain_exchange/policy_event.py` — events are **not** `Observation`s.
- Do **not** fork Economy pipelines; link registry IDs.

## Files

| File | Purpose |
|------|---------|
| `events.json` | Checked Act / programme seed (load-checked) |
| `GATE1_COMPOSITION.md` | Three studies → Study C accordion locked |
| `source_register.csv` | Candidate Acts, strategies, quantitative links |
| `reuse_map.md` | Cross-domain links and forbidden conflations |

## Load check

```bash
uv run python -c "from pathlib import Path; from britain_exchange.policy_event import load_policy_registry; load_policy_registry(Path('data/energy/industrial-policy/events.json'))"
```

## UI

`/energy?domain=policy` — expandable electric titles; `&event=` opens one dossier.

## Forbidden

- Inventing causal arrows from policy → jobs/GDP.
- Claiming Domain 10 complete.
- Mixing housing Acts into this ledger.
