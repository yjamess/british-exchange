# QA — private-rental-prices

Independent check vs ONS Private rent and house prices, UK (21 Oct 2026 release).
Sample: UK Sep 2026 average rent £1,406; annual change +3.8%.

| Status | Check |
|--------|-------|
| PASS | agent_owner=housing |
| PASS | manifest unit mentions GBP |
| PASS | rows=541299 |
| PASS | UK average rent 2026-09-01=1406.0 (expect 2026-09-01 £1406) |
| PASS | latest UK rent marked provisional |
| PASS | UK annual change 3.805% (expect ~3.8%) |
| PASS | distinct geographies=349 |
| PASS | bedroom kinds=['bedrooms-1', 'bedrooms-2', 'bedrooms-3', 'bedrooms-4-plus'] |

