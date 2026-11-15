# inactivity-reason-temp-sick (LF67)

**Owner:** Economy · Outside the Workforce reason pack (EC-G2-03b / EC-03-CSV)  
**Registry:** https://app.notion.com/p/41865471768581e2aec5c0318c86518d

## Raw evidence

| Kind | Path | Role |
|------|------|------|
| JSON | `raw/2026-11-14/lf67_lms.json` | **Primary ingest** — connector reads ONS timeseries `/data` |
| CSV | `raw/2026-11-14/lf67_lms.csv` | Owner browser download of the ONS timeseries CSV (Downloads name: *Econ Inactivity Reasons Temp Sick UK 16-64.csv*). Evidence pin only — not used by the connector. |

CSV header release date: **20-10-2026**. JSON pin metadata uses **2026-10-19**. Monthly values match curated (spot-check 2026-11-14).

## Reproduce

```bash
uv run python -m economy.connectors.inactivity_reason_temp_sick
```
