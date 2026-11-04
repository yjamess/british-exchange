# British Exchange — Agent Team

Source of truth: [Notion — British Exchange](https://app.notion.com/p/406654717685802987ffce671c6844e8). Local brief: [docs/brief.md](docs/brief.md). Registry: [Dataset & Indicator Registry](https://app.notion.com/p/8780d864ff89472cac966464c4db7558). **UI identity:** [docs/visual-identity.md](docs/visual-identity.md) — Instrument + Imprint; live kit `web/src/brand/` (not a per-sector redesign).

| Agent | Responsibility | Output | Owns paths |
|-------|----------------|--------|------------|
| **Orchestrator** | Assigns tasks, prevents duplication, checks progress; owns shared contract; unlocks extra sectors after Energy Ready proven | Work plan, reviews, `britain_exchange` package | `docs/`, `AGENTS.md`, `.cursor/rules/`, `src/britain_exchange/` |
| **Energy** | Energy & Industry (DESNZ + ONS manufacturing on that sector page) | Reproducible energy dataset + registry updates | `src/energy/`, `data/energy/` |
| **Economy** | Economy & Public Finance (ONS, OBR, HMT, BoE) | Reproducible economic dataset + registry updates | `src/economy/`, `data/economy/` |
| **Housing** | Housing & Land | Reproducible housing dataset + registry updates | `src/housing/`, `data/housing/` |
| **People** | People & Society | Reproducible people dataset + registry updates | `src/people/`, `data/people/` |
| **Government** | Government & Politics | Reproducible government dataset + registry updates | `src/government/`, `data/government/` |
| **Infrastructure** | Infrastructure | Reproducible infrastructure dataset + registry updates | `src/infrastructure/`, `data/infrastructure/` |
| **Regions** | Regions & Places | Reproducible regions dataset + registry updates | `src/regions/`, `data/regions/` |
| **History** | History & Change (prefer linking existing Economy/Energy series; no duplicate pipelines) | Reproducible history dataset + registry updates | `src/history/`, `data/history/` |
| **Validation** | Independent numerical and methodological checks | QA report | `src/validation/`, `data/qa/` |

Shared import: `from britain_exchange import Connector, Manifest, Observation` — see [docs/connector-contract.md](docs/connector-contract.md).

## Handoff protocol

1. Orchestrator updates `docs/work-plan.md` with numbered tasks and owners.
2. Energy / Economy work only on owned paths; they do not edit each other's code or data.
3. Every candidate indicator is **one registry row** (Notion). Status: Inbox → Scoping → Sourcing → Ingesting → Validation → Ready (or Blocked).
4. When a dataset is ready for QA, owner lists: source URLs, retrieval date, script entrypoint, output paths, checksums; registry → Validation.
5. Validation files findings in `data/qa/`; does not silently rewrite source data. Ready only after sample QA vs official releases.
6. Orchestrator reviews QA and assigns fix tasks back to Energy or Economy.
7. Extra sector agents (Housing…) may run only after at least one Energy Ready series exists (proven). Orchestrator may run a full-catalogue wave without per-indicator user approval.

## Shared data contract

Every agent return must include: manifest, raw evidence (checksum + timestamps), clean typed observations, reproducible Python connector (or documented procedure), validation notes, and hand-off paths. Full rules: `docs/brief.md`.

Recommended layout (map into owned `src/` + `data/` trees):

```txt
sector-name/
  manifest.yaml
  source_register.csv
  raw/
  curated/
  connector.py
  validation_report.md
  README.md
```

## Shared conventions

- Python 3.13+, project managed with `uv` ([uv docs](https://docs.astral.sh/uv/)).
- Prefer small scripts with clear `main()` and type hints ([PEP 8](https://peps.python.org/pep-0008/), [typing docs](https://docs.python.org/3/library/typing.html)).
- Prefer official DESNZ / GOV.UK, ONS, OBR, HMT, BoE APIs or published open data over scraped HTML.
- One source may feed many indicators; connector belongs to the source; registry row describes the indicator — no duplicate pipelines.
- Do not commit secrets; use env vars for DB credentials.

## Visual identity (all sector UI)

- Follow [docs/visual-identity.md](docs/visual-identity.md). Tokens live in `web/src/brand/brand.css` under `.bo`.
- Wrap live sector pages with `BrandRoot`. Imprint (stamps, ASCII, penwork) only at page thresholds; charts stay instrument line-work.
- Do not invent a parallel palette under `web/src/styles/tokens.css` or `(sectors)/` for new pages. Lab (`web/src/app/design-lab/`) is experimental only.
- Sector pigment (`--bo-sector`) is imprint-only — never chart series colour.
