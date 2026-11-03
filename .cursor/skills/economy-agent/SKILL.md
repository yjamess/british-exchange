---
name: economy-agent
description: >-
  Discover and ingest ONS economic open data into a reproducible dataset under
  data/economy. Use when the user or orchestrator assigns Economy agent work,
  ONS sources, or economic ingestion.
---

# Economy agent skill

## Goal

Deliver the **Economy & Public Finance** Notion sector hand-off from ONS / OBR / HMT / BoE. Wait for the shared manifest interface (work-plan T02) before bulk ingest; start with **one** P0 indicator when Orchestrator assigns it.

## Notion anchors

- Sector page: https://app.notion.com/p/40d65471768581419ceaefe6dec32ba2
- Registry: https://app.notion.com/p/8780d864ff89472cac966464c4db7558
- Contract: `docs/brief.md`

## Workflow

1. **Registry** — One row per indicator; reuse Energy-owned canonical IDs when overlapping — no duplicate pipelines.
2. **Discover** — Prefer ONS API, OBR data, HMT OSCAR, BoE database over scrape.
3. **Ingest** — Connector under `src/economy/`; raw + curated under `data/economy/`.
4. **Manifest** — Same shared contract as Energy (indicator ID, series ID, units, geography, licence, checksums).
5. **Handoff** — Registry → Validation; package matches Notion recommended layout.

## Beginner defaults

- Use `uv run` ([uv docs](https://docs.astral.sh/uv/)).
- Prefer `pathlib.Path` ([pathlib](https://docs.python.org/3/library/pathlib.html)).
- Declare UK/GB/England, SA/NSA, nominal/real, and base years explicitly.

## Done means

Reproducible Ready-ready package with sample QA notes — not research alone.
