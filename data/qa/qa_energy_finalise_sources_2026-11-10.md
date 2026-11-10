# Energy finalise — source and cloud verification

Date: 2026-11-10. Owner: Orchestrator / Validation.

## Source checks

Reproduce offline: `uv run python src/validation/qa_energy_finalise_2026_11_10.py`.

- Raw SHA-256 matches manifest for all six observation packages; curated keys unique; no unit-separator character in curated fields.
- Nominal earnings: all 320 months match the pinned ONS KAI7 JSON exactly. Monthly weekly pay, not household income; annual bill comparison requires 12 months and annualises mean weekly pay × 52. Source marks these revisable/provisional; this check does not relabel them final.
- Major power producer fuel prices: all 405 numeric cells match DESNZ QEP 3.2.1 columns D/F/G across published quarters within 0.000051 p/kWh (connector rounds to four decimal places). Source missing markers remain absent. Generator inputs, not household tariffs or day-ahead prices.
- Reserves, fossil dependency, low-carbon share and gas storage retain their existing dedicated publisher QA reports; this pass rechecks file integrity and keys, not fresh publisher releases.

## Weights

- Source: ONS DIOP pinned `data/energy/manufacturing-iop-by-division/raw/2026-11-07/diop.csv`.
- Raw SHA-256: `9ccd31271f98f97340a62f6ac207c8fbf2ef83f5c0a2c11d054e612b7a76e7a0`.
- Reproduction: `weights_from_raw(raw_path)` from the existing source connector yields exactly the pack's 1,110 observations; additive subsection/division checks pass.
- Independent Section C weight samples (KM44): 1997 = 775.3; 2023 = 634.8; 2024 = 697.4, each equal to the raw CSV cell.
- Unit is parts per thousand of all production, not manufacturing shares or index levels; branch shares divide by Section C. Do not add subsection and division representations together.
- Cloud Storage fetch with `_read_disk` disabled succeeded; 633,248 bytes, SHA-256 `aec8c61453d33a14bf9590b1bc86e7c132d43fd5557a316c05ac7b1a8fcdb2c6`, exact local match. Retained local pin; no duplicate Postgres observations created for this pack.

## Cloud load and API

Storage cutover was recorded complete before this load. Pre-load database measurement: 520,623,795 bytes. Six requested indicators did not exist. Loaded in one transaction using existing loader functions, without applying migrations or rewriting existing releases:

| Indicator | Current release | Rows |
|---|---:|---:|
| fossil-fuel-dependency | 174 | 142 |
| low-carbon-energy-share | 175 | 142 |
| major-power-producer-fuel-prices | 176 | 405 |
| natural-gas-storage | 177 | 54 |
| uk-oil-gas-reserves | 178 | 387 |
| nominal-earnings | 179 | 320 |

FastAPI TestClient against production Supabase: metadata and observations HTTP 200 for all six; `store=postgres`; row counts match; joined `notes` strings retained. Local catalogue fallback patched to fail. Generation/jobs/output destination series also HTTP 200. Machine-readable results: `data/qa/energy_finalise_cloud_2026-11-10.json`.

This proves cloud-backed API delivery using current local API code. It does not prove Railway is running that code, nor browser rendering or mobile layout. No source pins deleted. No sector-final claim.

## HTTP smoke checks

Running local API `/indicators/nominal-earnings/observations?limit=1`: HTTP 200, store=postgres, count=320, notes present. Next `/energy?domain=fossil&view=reserves`: HTTP 200, rendered recoverable-reserves content, no reserves-unavailable message. These are HTTP/SSR checks, not visual sign-off. Browser access host unavailable. Web TypeScript and 38 focused/existing tests pass after Follow changes.
