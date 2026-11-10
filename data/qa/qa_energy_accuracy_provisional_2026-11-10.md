# QA — Energy accuracy · ONS provisional window · 2026-11-10

**Owner:** Validation (sample) · connectors Energy · UI Orchestrator  
**Rule:** charts never plot provisional; connectors mark only a recent revision window.

## Checks

| Series | Final | Provisional | Missing | Pass |
|--------|------:|------------:|--------:|:----:|
| manufacturing-output-index | 932 | 12 | 0 | yes (was all-provisional) |
| manufacturing-employment | 189 | 4 | 0 | yes |
| manufacturing-output-per-hour | 125 | 4 | 0 | yes |
| manufacturing-iop-by-division | 21876 | 432 | 11676 | yes |

## Method

- `parse_numeric` → `final`; `mark_latest_months_provisional` (12 monthly / 4 quarterly).
- UI `finalObs` / `finalPts` drop provisional before TimeChart / year means.
- IoP `annual_means.json` only includes years with 12 final months.

## Verdict

Pass for provisional window sample. Browser spot-check of chart tips still recommended.
