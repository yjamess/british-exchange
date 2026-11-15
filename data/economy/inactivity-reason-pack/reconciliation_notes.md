# Outside the Workforce — reason pack reconciliation (Economy EC-G2-03b)

**Checked:** 2026-11-14 · LMS release **2026-10-19** · period **2026-07** (Jun–Aug)

| Reason | CDID | Thousands |
|--------|------|-----------|
| Students | LF63 | 2,453 |
| Looking after family/home | LF65 | 1,559 |
| Temporary sick | LF67 | 186 |
| Long-term sick | LF69 | 2,738 |
| Retired | LF6B | 1,080 |
| Other | LF6D | 1,044 |
| **Sum** | | **9,060** |
| Inactive total | LF2M | **9,091** |
| Residual | | **31** |

Residual ≈ published discouraged-worker share (LF77 ≈ 0.3% of inactive ≈ 27 thousand) plus rounding. **Do not** invent a discouraged level from LF77 × LF2M. No all-persons 000s SA discouraged twin found (LF8B is wants-job subset only).

INAC01 SA: https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity/datasets/economicinactivitybyreasonseasonallyadjustedinac01sa

**CSV pins (EC-03-CSV, 2026-11-14):** owner browser-download ONS timeseries CSVs registered as second `raw_evidence` beside each JSON pin (`lf63`/`lf65`/`lf67`/`lf69`/`lf6b`/`lf6d` `_lms.csv`); spot-check monthly values vs curated/JSON **pass** (incl. 2026-07 pack levels above). Connector still ingests JSON `/data` only.

## Update 2026-11-15 (EC-G2-03c) — discouraged level found

INAC01 SA People, dataset-identifier row, column **Discouraged workers** in the reason-**levels** block is CDID **LFL8** (not LF77, not LF8B). LMS title is only “Discouraged workers level people: 000s”; age, UK and SA come from that INAC01 SA column, which sits beside LF63–LF6D.

| Series | CDID | Jul 2026 (Jun–Aug) |
|--------|------|---------------------|
| Six reasons above | | 9,060 |
| Discouraged level | LFL8 | **30** |
| **Sum** | | **9,090** |
| Inactive total | LF2M | **9,091** |
| Residual | | **1** (rounding) |
| Discouraged percent | LF77 | **0.3** (not a level) |

INAC01 workbook cell for Jun–Aug 2026 discouraged is **30,484.7 people**, which the LMS timeseries rounds to **30** thousand. LF77 on that row is about **0.335%**, which LMS publishes as **0.3**. Multiplying 0.3% × LF2M is about 27 and is **not** the published level. Do not do that multiplication.

LF8B (wants-a-job subset, thousands SA) is **19** in Jul 2026. It is not the all-persons reason level.

Pin: `data/economy/inactivity-reason-discouraged/` (LFL8) and `data/economy/inactivity-reason-discouraged-rate/` (LF77, percent only).
