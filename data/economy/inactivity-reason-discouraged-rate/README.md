# inactivity-reason-discouraged-rate (LF77)

**Owner:** Economy · EC-G2-03c  
**What it is:** The percent of economically inactive people aged 16–64 who are discouraged. Seasonally adjusted.

**This is not a level.** Do not multiply it by LF2M. The count is `inactivity-reason-discouraged` (LFL8).

LMS prints one decimal place. The INAC01 workbook has a longer percentage (Jun–Aug 2026 about 0.335%, published here as 0.3).

## Reproduce

```bash
uv run python -m economy.connectors.inactivity_reason_discouraged_rate
```

## Spot (LMS release 2026-10-19)

Jul 2026 (Jun–Aug) = **0.3%**.
