---
name: economy-agent
description: >-
  Discover and ingest ONS / OBR / HMT / BoE economic open data into a reproducible
  dataset under data/economy. Use when the user or orchestrator assigns Economy
  domain work. Through Gate 2: datasets + Notion only — no frontend.
---

# Economy agent skill

## Goal

Deliver one **Economy & Public Finance** research domain hand-off: verified sources, reproducible connectors under `data/economy`, registry rows, and a Notion domain plan. Stop at evidence — do not ship React until the Orchestrator Review Gate.

## Notion anchors

- Sector: https://app.notion.com/p/40d65471768581419ceaefe6dec32ba2
- **Control desk:** https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83
- Registry: https://app.notion.com/p/8780d864ff89472cac966464c4db7558
- Kickoff template: `docs/agent-kickoff-economy-domain.md`
- Overlap matrix: `docs/economy-overlap-matrix.md`
- Contract: `docs/brief.md` · `docs/connector-contract.md`

## Workflow (domain-scoped)

1. **Read** Control Page + overlap matrix + your domain Notion plan + kickoff.
2. **Registry** — One row per indicator; **reuse** Energy/Housing canonical IDs when overlapping — no duplicate pipelines.
3. **Discover** — Prefer ONS timeseries / developer API, OBR, HMT OSCAR, BoE database over scrape.
4. **Ingest** — Connector under `src/economy/`; raw + curated under `data/economy/<indicator-id>/`.
5. **Manifest** — Shared contract (indicator ID, series ID, units, geography, licence, checksums).
6. **Notion plan** — Mature the domain page: questions, coverage, flagship, distinctive graphics labelled planned-not-ready if unsupported, tech requirements.
7. **Handoff** — Four artefacts (foundation, research scope, Notion plan, handover file list). Registry → Validation before Ready.

## Hard rule — no UI before Review Gate

- Do **not** create or edit production Economy explorer canvases (`web/src/brand/economy/**`).
- Do **not** expand `web/src/brand/sector-pages.ts` Economy domains to match the ten-domain map.
- You **may** document recommended views and one signature instrument as requirements on the Notion plan.
- Visual elevation studies are Orchestrator-owned (`/design-lab/economy-elevation`).

## Beginner defaults

- Use `uv run` ([uv docs](https://docs.astral.sh/uv/)).
- Prefer `pathlib.Path` ([pathlib](https://docs.python.org/3/library/pathlib.html)).
- Declare UK/GB/England, SA/NSA, nominal/real, and base years explicitly ([PEP 8](https://peps.python.org/pep-0008/) naming; type hints per [typing docs](https://docs.python.org/3/library/typing.html)).

## Done means (G2)

Reproducible package + Validation-ready notes + completed Notion plan + handover — **not** research alone, and **not** a frontend.
