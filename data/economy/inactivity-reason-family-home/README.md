# inactivity-reason-family-home (LF65)

**Owner:** Economy · Outside the Workforce reason pack (EC-G2-03b / EC-03-CSV)  
**Registry:** https://app.notion.com/p/4186547176858117929ad54d550d7709

## Raw evidence

| Kind | Path | Role |
|------|------|------|
| JSON | `raw/2026-11-14/lf65_lms.json` | **Primary ingest** — connector reads ONS timeseries `/data` |
| CSV | `raw/2026-11-14/lf65_lms.csv` | Owner browser download of the ONS timeseries CSV (Downloads name: *Econ Inactivity Reasons Looking After Family UK 16-64.csv*). Evidence pin only — not used by the connector. |

CSV header release date: **20-10-2026**. JSON pin metadata uses **2026-10-19**. Monthly values match curated (spot-check 2026-11-14).

## Reproduce

```bash
uv run python -m economy.connectors.inactivity_reason_family_home
```
