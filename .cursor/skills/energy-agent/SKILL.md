---
name: energy-agent
description: >-
  Discover and ingest DESNZ / GOV.UK energy open data into a reproducible
  dataset under data/energy. Use when the user or orchestrator assigns Energy
  agent work, DESNZ sources, or energy ingestion.
---

# Energy agent skill

## Goal

Deliver the **Energy & Industry** Notion sector hand-off: normalised, validated, reproducible datasets for The Britain Exchange API. First proof: registry row *Electricity generation by source* (DESNZ).

## Notion anchors

- Sector page: https://app.notion.com/p/40d6547176858194bc18cec7be0a812d
- Registry: https://app.notion.com/p/8780d864ff89472cac966464c4db7558
- Contract: `docs/brief.md`

## Workflow

1. **Registry** — One row per indicator; fill Source URL, Series ID, Geography, Frequency, Licence; status Inbox → Scoping → Sourcing.
2. **Discover** — Prefer DESNZ Energy Trends / official CSV/API over HTML scrape.
3. **Ingest** — Connector under `src/energy/`; raw + curated under `data/energy/`; preserve checksum + retrieval timestamp.
4. **Manifest** — `manifest.yaml` (or JSON) with canonical indicator ID, series ID, definitions, publisher links, licence, units, time basis.
5. **Self-check** — Sample vs official tables; write notes for Validation (do not mark Ready yourself).
6. **Handoff** — Registry → Validation; list paths in work plan. Package: manifest, raw/, curated/, connector, validation notes, README.

## Beginner defaults

- Use `uv run` ([uv docs](https://docs.astral.sh/uv/)).
- Prefer `pathlib.Path` ([pathlib](https://docs.python.org/3/library/pathlib.html)).
- Fail loudly on HTTP errors; never silently overwrite a cited raw snapshot.

## Done means

A new engineer can reproduce the series and verify a sample against the official release. Research-only is not complete.
