# QA report — Manufacturing share of GVA — 2026-11-03

**Agent:** Validation (Energy self-QA hand-off)  
**Overall verdict:** **pass-with-warns**

## Scope

- Manifest: `data/energy/manufacturing-share-of-gva/manifest.yaml`
- Curated: `data/energy/manufacturing-share-of-gva/curated/observations.csv` (30 rows)
- Raw: `data/energy/manufacturing-share-of-gva/raw/2026-11-03/l4nt_wgdp.json`
- Registry: https://app.notion.com/40d65471768581fa917ad614140dd2b3

## Freeze

| Item | Value |
|------|-------|
| SHA-256 | `f4554888ae2b87ebceefb92ef06409461fb003717585a7d08ef50138af14b468` |
| Series | L4NT / WGDP (C Manufacturing Weights:CVM) |
| Rows | 30 annual (1997 → 2026) |
| Transform | curated % = ONS weight (ppt) ÷ 10 |
| Spots | 1997=16.58%; 2011=10.36%; 2024=8.65% |

## Checks

| ID | Result | Notes |
|----|--------|-------|
| C1–C6 | pass | checksum, manifest, schema, uniqueness, weight/10 recompute, section C title |
| C7 | warn | 2024–2026 held at 86.5 ppt (8.65%) — Blue Book forward fill |

## Method note

GDP(O) **CVM industry weights**, not current-price GVA shares. Open question remains for a CP ratio later.

## Blockers

none

## Repro

```bash
uv run python -m validation.qa_manufacturing_share_of_gva_2026_11_03
```
