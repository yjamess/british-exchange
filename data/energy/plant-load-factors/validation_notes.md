# Validation notes — `plant-load-factors`

**Prepared:** 2026-11-07 · Energy agent (Gate 3 B3)  
**Status:** **Ready** (Orchestrator after Validation pass — `data/qa/qa_report_plant_load_factors_2026-11-07.md`)

## Reproduce

```bash
uv run python -m energy.connectors.plant_load_factors
```

## Evidence

| Item | Value |
|------|--------|
| Raw | `raw/2026-11-07/DUKES_5.10.xlsx` |
| sha256 | `ee622e8e5bf7ad6643f348f62090a5e76ef03e7e854537448dc323d359ef9c7d` |
| Asset URL | https://assets.publishing.service.gov.uk/media/6a6a364b0ddb7e4831c629f2/DUKES_5.10.xlsx |
| Official release | 2026-07-30 |
| Curated rows | 300 (299 valued, 1 missing `[x]`) |
| Years | 1996–2025 |
| Connector | `energy.connectors.plant_load_factors` |

## Sample checks (Energy self-check vs pinned Excel sheet `5.10.B and 5.10.C`)

| Year | Generator | Series | Excel | Curated |
|------|-----------|--------|------:|--------:|
| 2025 | Nuclear stations | load_factor | 64.04 | 64.04 |
| 2025 | Nuclear stations | thermal_efficiency | 39.19 | 39.19 |
| 2025 | Combined cycle gas turbine stations | load_factor | (sheet) | match sheet |
| 1997 | of which coal-fired stations [note 7] | load_factor | 48.4 | 48.4 |
| 1996 | of which coal-fired stations [note 7] | load_factor | `[x]` | null / missing |

## Method notes

- Tables 5.10.B and 5.10.C only; **5.10.A** (simultaneous maximum load met, MW) not ingested.
- MPP scope (DUKES note 1). Renewables-as-such LF remain on DUKES 6.3.
- Retain `All plant` / `System load factor` rows — do not sum children into parents in UI.

## Out of scope

- Marking Ready
- Rewriting `renewable-electricity-load-factors`
- UI
