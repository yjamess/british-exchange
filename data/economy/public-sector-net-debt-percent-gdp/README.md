# public-sector-net-debt-percent-gdp

**Owner:** Economy agent  
**Status:** Validation (Economy self-QA only; independent Validation pending — **not Ready**)  
**Registry:** https://app.notion.com/p/41565471768581e6ad97d6c10b9a5a1a  
**Domain plan:** https://app.notion.com/p/414654717685811cb155f725cba481a3 (08 · Public Debt & Government Finances)  
**indicator_id:** `public-sector-net-debt-percent-gdp`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **HF6X** |
| Dataset | **PUSF** |
| ONS title | PS: Net Debt (excluding public sector banks) as a % of GDP: NSA |
| ONS unit field | `%` |
| Unit (manifest) | % of GDP, NSA (ex public sector banks) |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly (stock ratio at end of month) |
| Licence | OGL v3.0 |

**Official ONS ratio — not derived.** Do not rebuild it from `real-gdp` (ABMI): ABMI is chained volume, seasonally adjusted, quarterly; PSND is current prices. ONS divides PSND by nominal GDP over a centred 12-month window (6 months either side, monthly GDP = quarterly ÷ 3) and uses OBR forecasts for the latest quarters.

## Layout

```txt
data/economy/public-sector-net-debt-percent-gdp/
  manifest.yaml
  raw/2026-11-11/hf6x_pusf.json   (gitignored locally; re-fetch via connector)
  curated/observations.csv
  validation_notes.md
  README.md
src/economy/connectors/public_sector_net_debt_percent_gdp.py
src/economy/connectors/fiscal_series.py   (spec: PUBLIC_SECTOR_NET_DEBT_PERCENT_GDP)
```

## Reproduce

```bash
uv run python -m economy.connectors.public_sector_net_debt_percent_gdp
```

## Pin (2026-11-11)

| Item | Value |
|------|-------|
| Official release | 2026-10-20 (next: 20 Nov 2026) |
| Rows | 403 monthly, 1993-03-01 → 2026-09-01, 0 missing |
| Latest | 2026-09 = **94.0** % of GDP (2026-08 = 93.6) |
| Raw SHA-256 | `9e36441224589270407925629a6fbf4ec0428f485a8f328983fa255ada23f4e5` |
| Curated SHA-256 | `d8dcf7c9479fc2f1155ae2a198793d26b0401ccc3fc89287cb16d5ac9c165baa` |

## Related indicators

`public-sector-net-debt` (HF6W, numerator, £bn), `public-sector-net-borrowing` (DZLS), `public-sector-debt-interest` (NMFX). Each of those manifests links back here.

## Caveats

- **Revision risk is high for the latest ~6 months** (forecast GDP in the denominator). Keep `provisional`; any UI must flag the tail.
- Months and quarters/years: only the `months` array is curated; 207 quarterly and 51 annual rows stay in raw.
- Ratio, not £ — never plot on an axis with HF6W (£bn) or DZLS/NMFX (£m).
- Peak in series: 97.8 % (2020-09 and 2020-10); ONS does not publish a series break note in the JSON.

## Hand-off

Registry → Validation. Ready only after independent Validation files a PASS in `data/qa/`. See `validation_notes.md` and `docs/handover-economy-08-hf6x.md`.
