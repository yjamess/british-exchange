# QA — Economy Domain 09 Tranche A (UK Trade MRET)

**Date:** 2026-11-16  
**Packages:** `uk-trade-mret` · `uk-trade-ex-precious-metals`  
**Result:** **PASS** (8 pass / 0 fail)

| Check | Result | Detail |
| --- | --- | --- |
| `mret-row-count` | pass | n=6546 |
| `expm-row-count` | pass | n=2142 |
| `balance-identity-2026-09` | pass | exports=83382.0 imports=88516.0 balance=-5134.0 |
| `live-ikbh-2026-09` | pass | live=83382.0 curated=83382.0 |
| `raw-ikbh-present` | pass | files=1 |
| `pinned-ikbh-matches-curated` | pass | pinned=83382.0 curated=83382.0 sha=0bea61c519c9 |
| `expm-fsid-latest` | pass | FSID Sep26=-4250.0 |
| `eighteen-cdids` | pass | cdids=['BOKG', 'BOKH', 'BOKI', 'BQKO', 'BQKQ', 'CTVS', 'IKBB', 'IKBC', 'IKBD', 'IKBE', 'IKBF', 'IKBG', 'IKBH', 'IKBI', 'IKBJ', 'IKBK', 'IKBL', 'IKBM'] |

## Notes

- BoP SA £m; not HMRC customs.
- Headlines include precious metals; FSID/FSIE are underlying companions.
- Balance identity exports−imports=balance held for Sep 2026 and connector self-check (0 mismatches).

