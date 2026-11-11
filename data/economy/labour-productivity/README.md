# labour-productivity

**Owner:** Economy agent  
**Status:** Validation-ready after 2026-11-11 re-pin (bytes unchanged vs 2026-11-03; not Ready — set only by Validation / Orchestrator)  
**Registry:** https://app.notion.com/40d65471768581268b4cd6d2d5ea6042  
**indicator_id:** `labour-productivity`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **LZVB** |
| Dataset | **PRDY** |
| Landing | https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/lzvb/prdy |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly |
| Unit | Index 2023=100, SA, output per hour worked (whole economy) |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m economy.connectors.labour_productivity
```

## Pin (2026-11-11 re-pin)

- Raw: `raw/2026-11-11/lzvb_prdy.json`, SHA-256 `0203bfc8991c4e3162ea6e7183859f7e522a78978a508a99bbb70cb06b816f89` (identical to 2026-11-03)
- Release date: 2026-08-17. ONS next release: **2026-11-17**.
- Rows: 221 (1971 Q1 → 2026 Q1). Latest: 2026 Q1 = 100.1.

## Vintage caveat

No newer vintage exists yet. The 2026-11-17 release may revise history and move the index base, so re-pin and check the series title then. See `docs/handover-economy-05-repin-2026-11-11.md`.

## Hand-off

Validation-ready. Economy does **not** set registry Ready.
