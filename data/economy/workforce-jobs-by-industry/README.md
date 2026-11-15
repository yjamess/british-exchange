# workforce-jobs-by-industry (JOBS02 WFJ SA)

**Owner:** Economy · EC-G2-03c  
**What it is:** UK workforce **jobs** by SIC 2007 section, seasonally adjusted, thousands. Levels only. No shares of the total.

Jobs are not people in employment. Section C is the same published series as Energy `manufacturing-employment` (JWR7). This folder is not a second manufacturing indicator and does not copy `data/energy/`.

## Reproduce

```bash
uv run python -m economy.connectors.workforce_jobs_by_industry
```

## Spot (release 2026-09-15, quarter 2026 Q2)

| Series | Thousands of jobs |
|--------|-------------------|
| All jobs (`series=total`) | 36,734 |
| Manufacturing (`series=C`) | 2,460 |
| Sum of A–T | 36,733 |

The 1 thousand gap is rounding. It is not stored as its own series. All jobs matches Economy `workforce-jobs` (DYDC). Manufacturing matches Energy JWR7.

The Sep 2026 workbook labels 2019 Q1 as `Mar 193` and 2020 Q1 as `Mar 204`. The connector maps those two labels from their neighbours. `source_label` keeps the original text. The numbers are unchanged.

Employee jobs, self-employment jobs, and the not-seasonally-adjusted sheets are still in the workbook and are not curated. Occupation (EMP04) is people by SOC, not this jobs table.
