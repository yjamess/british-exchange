# tme-del-ame

**Owner:** Economy agent
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready
**indicator_id:** `tme-del-ame`
**Source:** PSS July 2026 Table 1.1, £ million, United Kingdom, financial year

Identity: Total DEL + Departmental AME + Other AME = **this table's TME**.
That denominator is not monthly EBFT and not TES.

## Reproduce

```bash
uv run python -m economy.connectors.tme_del_ame
```

## What is curated

| Series | Role | Keep? |
|--------|------|-------|
| Total DEL | control total | Yes. The published row |
| Departmental AME | control total | Yes |
| Other AME | control total | Yes. Do not drop it, even when negative |
| Table TME | denominator `hmt-table-tme` | Yes. This table only |
| Resource DEL, capital DEL | excluded | No. They do not add up to Total DEL |

## Identity

| Financial year | Total DEL | Departmental AME | Other AME | Sum | Table TME |
|----------------|----------:|-----------------:|----------:|----:|----------:|
| 2021-22 | 534,892 | 673,115 | -167,119 | 1,040,888 | 1,040,888 |
| 2022-23 | 541,362 | 407,356 | 211,974 | 1,160,692 | 1,160,692 |
| 2023-24 | 558,434 | 542,776 | 129,597 | 1,230,807 | 1,230,807 |
| 2024-25 | 595,892 | 605,568 | 88,552 | 1,290,012 | 1,290,012 |
| 2025-26 | 639,807 | 622,645 | 97,670 | 1,360,122 | 1,360,122 |

## Do not rebuild Total DEL

2024-25 resource DEL 469,578 + capital DEL 111,587 = 581,165, not published Total DEL 595,892.

## Financial year versus monthly EBFT

Ready pin `data/economy/total-managed-expenditure/curated/observations.csv` (PSF release 2026-10-20).
Sums below are derived April–March totals of monthly EBFT, not an official financial-year series.

| Financial year | Sum of monthly EBFT | HMT table TME | Difference |
|----------------|--------------------:|--------------:|-----------:|
| 2021-22 | 1,051,427 | 1,040,888 | 10,539 |
| 2022-23 | 1,178,953 | 1,160,692 | 18,261 |
| 2023-24 | 1,258,195 | 1,230,807 | 27,388 |
| 2024-25 | 1,294,828 | 1,290,012 | 4,816 |
| 2025-26 | 1,365,598 | 1,360,122 | 5,476 |

Do not rescale this package onto `total-managed-expenditure`.

## Raw

- File: `raw/2026-11-15/July_PSS_2026_Chapter_1.xlsx`
- SHA-256: `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe`
- Release date on the pin: 2026-07-29

2025-26 is `estimated` (first outturn estimate). 2021-22 to 2024-25 are `final`.
2021-22 Other AME is negative. That is the published sign.

Docs: `docs/handover-economy-07-function-pin.md`
