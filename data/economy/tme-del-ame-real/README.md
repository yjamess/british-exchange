# tme-del-ame-real

**Owner:** Economy agent
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready
**indicator_id:** `tme-del-ame-real`
**Source:** PSS July 2026 Table 1.2, £ million, **2025-26 prices**, United Kingdom, financial year

Identity: Total DEL + Departmental AME + Other AME = **this table's real TME**.
That denominator is not monthly EBFT, and it is not a deflated EBFT series.

Real-terms figures are the nominal figures adjusted to 2025-26 price levels using GDP deflators from the Office for National Statistics (released 30 June 2026).
PESA plan years are not in these pins. Where PESA prints plan years, it also uses OBR GDP deflator forecasts from the 3 March 2026 Economic and fiscal outlook. That forecast deflator is not applied here.

## Reproduce

```bash
uv run python -m economy.connectors.tme_del_ame_real
```

## What is curated

| Series | Role | Keep? |
|--------|------|-------|
| Total DEL | control total | Yes. The published row |
| Departmental AME | control total | Yes |
| Other AME | control total | Yes. Do not drop it, even when negative |
| Table TME | denominator `hmt-table-tme` | Yes. This real table only |
| Resource DEL, capital DEL | excluded | No. They do not add up to Total DEL |

## Identity

| Financial year | Total DEL | Departmental AME | Other AME | Sum | Table TME |
|----------------|----------:|-----------------:|----------:|----:|----------:|
| 2021-22 | 648,705 | 816,338 | -202,678 | 1,262,365 | 1,262,365 |
| 2022-23 | 613,433 | 461,587 | 240,194 | 1,315,214 | 1,315,214 |
| 2023-24 | 601,148 | 584,293 | 139,510 | 1,324,951 | 1,324,951 |
| 2024-25 | 616,422 | 626,432 | 91,603 | 1,334,457 | 1,334,457 |
| 2025-26 | 639,807 | 622,645 | 97,670 | 1,360,122 | 1,360,122 |

## Price base — 2025-26 real equals nominal

Resource DEL 496,670 equals Table 1.1 and the kickoff spot 496,670.
Total DEL 639,807, Departmental AME 622,645, Other AME 97,670, table TME 1,360,122.
Earlier years are higher than the nominal pin because they are restated in 2025-26 prices.

## Do not rebuild Total DEL

2024-25 resource DEL 485,757 + capital DEL 115,432 = 601,189, not published Total DEL 616,422.

## Not a real monthly EBFT

These rows are official HMT real-terms financial-year tables. They are not monthly EBFT divided by CPIH or by the GDP deflator. Do not treat real HMT table TME as a real monthly EBFT series.
The nominal gap between HMT table TME and summed monthly EBFT is documented on `tme-del-ame`.
This package does not divide that monthly series by a deflator.

## Raw

- File: `raw/2026-11-15/July_PSS_2026_Chapter_1.xlsx`
- SHA-256: `ff40d00e69d7b5cb2db4504e24ba774dd09b181ac676d0518ab0e16581305dbe`
- Release date on the pin: 2026-07-29

2025-26 is `estimated` (first outturn estimate). 2021-22 to 2024-25 are `final`.
2021-22 Other AME is negative. That is the published sign.

Docs: `docs/handover-economy-07-real-pin.md`
