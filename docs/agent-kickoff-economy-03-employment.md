# Kickoff — Economy Domain 03 Employment & Labour Market

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** B · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`

**Question (provisional):** How many people are in work, and how many sit outside the labour market?

## Non-negotiables

Follow the shared template. Extra for 03:

- **Link, do not fork** Energy Jobs Ready series: manufacturing employment, BRES regional manufacturing jobs, manufacturing productivity. Economy owns **national** LFS rates only.
- Geography: UK 16–64 SA for LF24 / LF2S — declare clearly vs GB AWE (Domain 02).
- No frontend / no Ready flip on the rail until Validation + Orchestrator G3 for this domain.

## Candidate inventory

| Indicator | Series | Path | Notes |
|-----------|--------|------|-------|
| `employment-rate` | LF24 / LMS | `data/economy/employment-rate/` | Pin exists — re-check vs live ONS |
| `economic-inactivity-rate` | LF2S / LMS | `data/economy/economic-inactivity-rate/` | Pin exists — re-check vs live ONS |

Connectors: `economy.connectors.employment_rate`, `economic_inactivity_rate` (via labour_prices_series specs).

**Link only (Energy):** `manufacturing-employment`, BRES regional manufacturing jobs, manufacturing productivity / hours / per job.

## G2 deliverables

1. Re-pin / re-check LF24 + LF2S vs latest ONS LMS; checksums + validation notes.
2. Independent Validation QA → Orchestrator Ready flip (if not already Ready with QA on file).
3. Gap list: unemployment rate companion, hours worked, regional LFS — planned-not-ready unless scoped.
4. Mature Notion plan: flagship **Who is in work**; Follow edges to Energy Jobs + Domain 02 wages.
5. Handover with recommended G3 views (requirements only — Explorer shell, no React in G2).

## Do not

- Re-ingest manufacturing employment under `data/economy/`.
- Build `/economy?domain=employment` canvas before Wave B G3 authorisation.
- Pair with GB AWE without a geography-break chip in the requirements.
