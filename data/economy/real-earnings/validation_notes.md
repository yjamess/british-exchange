# real-earnings (A2FC) — validation notes (Economy G2, not a Validation sign-off)

**Checked:** 2026-11-11 by Economy domain 02 subagent. **Status claim:** none — Validation agent still owns Ready.

| Check | Result |
|-------|--------|
| Live ONS `/data` JSON vs pin | `months` array identical: 320 points, 2000 JAN – 2026 AUG (494), 0 value differences |
| Raw checksum | live bytes sha256 `27a063a1b31cdcd3660407617943255f8954cb09e0724782ca06eac913a2dd4e` = manifest `raw_evidence[0]` |
| Raw file on disk | Was **missing** (manifest pointed at `raw/2026-11-03/a2fc_emp.json`, no `raw/` dir). Restored 2026-11-11 from a fresh ONS download; bytes are identical to the recorded checksum. `raw/` is gitignored (Storage archive owns it). |
| ONS release | 2026-10-19; next release 17 November 2026 |
| ONS title | "AWE: Whole Economy Real Terms Level (£): Seasonally Adjusted Regular Pay" |

## Deflator (what "real" means here)

ONS does not state the deflator in the series JSON. Empirical test against pinned series (all 320 months): `KAI7 ÷ (CPIH L522 / 100)` fits A2FC with mean abs error £1.36 (max £3.69); `KAI7 ÷ (CPI D7BT / 100)` fits worse (mean £3.85, max £11.01). So A2FC is a CPIH-based real series at 2015 prices (CPIH 2015=100). It is **not exactly reproducible** from the pinned L522 (vintage and rounding differences) — never re-derive A2FC from KAI7 and a different index and call it the same series; use A2FC as published, or label any own-deflated line explicitly.

## Geography

Same as `nominal-earnings`: AWE is Great Britain; curated rows are labelled UK (`K02000001`). See `nominal-earnings/validation_notes.md`.

## Registry

Registry row (Notion) is already "Ready" from the earlier full-catalogue wave, with an unticked checklist and empty Evidence/output. Not changed here.
