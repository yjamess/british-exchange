# dmo-gilt-future-redemptions

**Status:** Validation **pass** 2026-11-14 (`data/qa/qa_report_economy_08_dmo_d8b_d1a_2026-11-14.md`); cloud load / Ready for UI still Orchestrator.  
**Report:** DMO D8B · Future Redemptions  
**Matrix:** `docs/economy-08-debt-instruments-source-matrix.md`  
**Owner:** economy · **Licence:** Open Government Licence v3.0 (via [DMO terms](https://www.dmo.gov.uk/terms-of-use/)) · **Publisher:** UK DMO

| File | As-of | Notes |
|------|-------|-------|
| `raw/Future Redemptions Nov 14 2026.xls` | Data date 14 Nov 2026 | FY × conventional / IL / total £m; **net of government holdings** |
| `curated/observations.csv` | same | 141 rows = 47 financial years (2027-2028 … 2073-2074) × 3 series |
| `manifest.yaml` | same | Shared contract manifest with checksum + caveats |

First FY row: 2027-2028 — conventional **£152,286m**, index-linked **£15,164m**, total **£167,450m**. SHA-256 in `raw/SHA256SUMS` (the connector re-checks it on every run).

## Curated shape

One observation per FY per series. `period_start` = 1 April, `period_end` = 31 March, unit `£ million`, geography UK (`K02000001`), status `provisional`.
Notes are `key=value; …`: `series=conventional|index_linked|total; kind=…; fy=2027-2028; table=D8B; basis=net_of_government_holdings`.

## Caveats (read before using)

- **Starts at FY 2027-28.** This export omits the remainder of the current financial year (2026-27). Gilts maturing before April 2027 still appear in `dmo-gilts-in-issue` — do not chart D8B alone as if nothing redeems until 2027-28.
- **Net of government holdings** (market-hands amounts). DMO notes holdings data update only after month-end, so net figures may briefly overstate.
- **Index-linked uplift is only partly in redemptions** — the remainder falls in the CGNCR in the redeeming year. IL redemptions therefore do **not** tally with uplifted nominal in issue (`dmo-gilts-in-issue`).
- **Not a sales / issuance forecast.** The profile changes as gilts are issued.
- **Not PSND (HF6W)** and not a schedule for all public-sector debt (gilts only).

## Reproduce

Raw is a manual browser pin (DMO captcha) — the connector never downloads and never edits raw.

```bash
uv run python -m economy.connectors.dmo_gilt_future_redemptions
```

Module: `src/economy/connectors/dmo_gilt_future_redemptions.py` (shared helpers in `dmo_common.py`).
