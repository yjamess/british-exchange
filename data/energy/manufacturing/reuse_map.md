# Reuse map — Manufacturing (Domain 08) Gate 1

**Locked question:** What does Britain manufacture today, how has the composition of output changed, and where does production take place?

**Notion:** [Manufacturing](https://app.notion.com/p/41065471768581afa032dec7299a7cfb)  
**Wave:** B3 · Energy (Industry lane) · 2026-11-07  
**Rule:** Link Ready packages — do **not** re-ingest or rewrite curated CSVs.

## Ready series to REUSE

| Notion §1 / §5 need | indicator_id | Package | Series | Geography | Frequency | Status |
|---------------------|--------------|---------|--------|-----------|-----------|--------|
| Manufacturing Index of Production (headline volume) | `manufacturing-output-index` | `data/energy/manufacturing-output-index/` | ONS K22A / DIOP | UK | monthly | **Ready** + QA |
| Manufacturing share of economy (GVA weight) | `manufacturing-share-of-gva` | `data/energy/manufacturing-share-of-gva/` | ONS L4NT / WGDP | UK | annual | **Ready** + QA |
| Manufacturing employment (jobs, for Output vs Jobs) | `manufacturing-employment` | `data/energy/manufacturing-employment/` | ONS JWR7 / LMS | UK | quarterly | **Ready** + QA |

### Registry links

- Output index: https://app.notion.com/40d65471768581af8d35fbee740cd16f
- Share of GVA: https://app.notion.com/40d65471768581fa917ad614140dd2b3
- Employment: https://app.notion.com/40d65471768581e3a829d4cad506e0bc

### QA already filed

- `data/qa/qa_report_manufacturing_output_index_2026-11-03.md`
- `data/qa/qa_report_manufacturing_share_of_gva_2026-11-03.md`
- `data/qa/qa_report_manufacturing_employment_2026-11-03.md`

## Gate 2 Manufacturing UI verdict

**YES — Ready trio is enough for a national Gate 2 vertical slice.**

Rationale:

1. Gate 2 asks for a small source-validated dataset + first working Production Anatomy experience with Volume index / GVA / economy-share controls and an Output vs Jobs companion path.
2. The trio supplies those three national measures with reproducible connectors, pinned raw evidence, and Validation QA.
3. Honest limits for Gate 2 UI: **national SIC section C only** — no subsector IoP mix, no regional atlas, no product ledger. Those stay Gate 3 (see `source_register.csv`). Do not imply indexed IoP levels are additive industry shares.

## Cross-domain (link, do not fork)

| Need | Owner | Action |
|------|-------|--------|
| Jobs & Productivity flagship / productivity machine | Domain 09 inventory | See `data/energy/jobs-productivity/` |
| Whole-economy output per hour | Economy `labour-productivity` (LZVB) | Contextual link only |
| Long-run manufacturing employment | History catalogue | Link `manufacturing-employment`; never re-ingest History pipelines |
| Industrial electricity prices | Prices Ready | Journey 2 contextual |

## Explicit non-overlap

- Do not edit `manufacturing-*/curated` or Ready manifests except via Orchestrator-approved Validation fixes.
- Jobs must not silently reuse History long-run employment connectors.
- Regions owns regional GVA geography packages — Manufacturing links, does not fork.
