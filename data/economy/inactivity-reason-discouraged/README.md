# inactivity-reason-discouraged (LFL8)

**Owner:** Economy · EC-G2-03c  
**What it is:** UK people aged 16–64 who are economically inactive because they are discouraged (they are not looking, because they believe no jobs are available). Seasonally adjusted. **Thousands.**

The LMS page title does not repeat “16–64” or “SA”. Those words come from INAC01 SA: LFL8 is the dataset identifier on the all-persons **reason level** column, next to LF63, LF65, LF67, LF69, LF6B and LF6D.

This number is the published level. It is not LF77 × LF2M. LF77 is the percent companion. LF8B is only the people who want a job (smaller).

## Reproduce

```bash
uv run python -m economy.connectors.inactivity_reason_discouraged
```

## Spot (LMS release 2026-10-19)

Jul 2026 (Jun–Aug) = **30** thousand. Provisional = latest month only.

With the six earlier reason levels, the sum is **9,090** against LF2M **9,091**. See `data/economy/inactivity-reason-pack/reconciliation_notes.md`.
