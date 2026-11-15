# Kickoff — Economy Domain 03 Employment & Labour Market

**Template:** [agent-kickoff-economy-domain.md](agent-kickoff-economy-domain.md)  
**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Control:** [Economy Sector Control](https://app.notion.com/p/414654717685811caf11f9bfb7b3ef83)  
**Overlap:** [economy-overlap-matrix.md](economy-overlap-matrix.md)  
**Wave:** B · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-14 (deep brief locked on Notion; prior thin kickoff 2026-11-11 superseded)

**Question (provisional):** Who is in work in Britain, who is inactive, and how has the labour market changed?

**Flagship (locked on Notion):** **The British Workforce** — working-age population composition (employed / unemployed / inactive) with history. Distinctive second instrument: **Outside the Workforce** (inactivity reasons).

## Non-negotiables

Follow the shared template. Extra for 03:

- **Link, do not fork** Energy Jobs Ready series: `manufacturing-employment`, BRES regional manufacturing jobs, manufacturing productivity / hours / per job. Economy owns **national** LFS (and related whole-economy labour) series only.
- Geography: UK 16–64 SA for LF24 / LF2S — declare clearly vs GB AWE (Domain 02).
- **Rates ≠ counts.** Employment rate and inactivity rate share a population denominator; unemployment rate is a share of the economically active. Do **not** add LF24 + LF2S + unemployment rate as if they compose the working-age population. Flagship composition needs matched official **counts** (or a reconciled count package) for the same age, geography, period and SA/NSA basis.
- Document LFS response / reweighting / survey-quality caveats on every pin; do not overinterpret small monthly moves.
- **No frontend** / no Ready flip on the rail until Validation + Orchestrator G3 for this domain. REF_ICON `economyEmployment` already placed — canvas still gated.

## Candidate inventory (existing pins)

| Indicator | Series | Path | Notes |
|-----------|--------|------|-------|
| `employment-rate` | LF24 / LMS | `data/economy/employment-rate/` | Pin 2026-11-03 · release 2026-10-19 — **re-pin** vs latest LMS |
| `economic-inactivity-rate` | LF2S / LMS | `data/economy/economic-inactivity-rate/` | Same vintage — **re-pin** with LF24 |

Connectors: `economy.connectors.employment_rate`, `economic_inactivity_rate` (via `labour_prices_series` specs).

**Link only (Energy):** `manufacturing-employment`, `bres-manufacturing-employee-jobs-by-region`, manufacturing productivity / hours / per job.

## Six experiences (Notion — evidence readiness)

| Experience | Role | G2 expectation |
|------------|------|----------------|
| **The British Workforce** | Flagship composition + history | Inventory + validate count/rate reconciliation; pin what is Ready |
| **Outside the Workforce** | Inactivity reasons | Source discovery; pin only if official reason series found |
| **What Britain Does for Work** | Industry / occupation | Planned-not-ready unless Workforce Jobs / SIC evidence scoped; **link** Energy manufacturing |
| **The Working Week** | Hours / part-time / underemployment | Planned-not-ready unless hours series scoped |
| **The Demand for Labour** | Vacancies | Planned-not-ready unless Vacancy Survey scoped |
| **The Geography of Employment** | Regional / local | Planned-not-ready; coordinate ownership with Regions before ingest |

## Phase 0 — G2 evidence gate (this kickoff)

1. Confirm boundaries vs Energy Jobs, Domain 02 Wages, Domain 05 Growth, Regions.
2. Inventory official labour-force **counts and rates** (employed, unemployed, inactive, economically active) with CDID/table IDs, geography, age, SA/NSA, frequency.
3. Re-pin LF24 + LF2S vs latest ONS LMS; checksums + validation notes. Fix `observation_status` to latest-month provisional only if still all-provisional (same pattern as CPI/AWE/PSF).
4. Propose companion pins required for flagship composition (e.g. unemployment rate **and/or** level counts). Create registry rows before ingest. Do not invent derived composition from incompatible rates.
5. Gap list for experiences 2–6: source URL, CDID if known, blocked vs scoped — label **planned-not-ready** where evidence is missing.
6. Mature Notion plan checkboxes / experience states; document LFS caveats.
7. Four handover artefacts → `docs/handover-economy-03-employment.md` (recommended G3 views as **requirements only**).

## Do not

- Re-ingest manufacturing employment / BRES under `data/economy/`.
- Build `/economy?domain=employment` canvas before Wave B G3 authorisation.
- Pair with GB AWE without a geography-break chip in the requirements.
- Treat claimant counts as ILO unemployment.
- Fabricate person-flows between employed / unemployed / inactive from two aggregate snapshots.
- Claim national LFS rates measure manufacturing jobs.
