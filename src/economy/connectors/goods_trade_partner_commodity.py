"""HMRC OTS — goods trade by partner country × SITC section (1-digit).

What this delivers
------------------
For each partner country, calendar year, and flow (exports / imports): the value
of UK goods trade broken down by SITC *section* (codes 0–9). That is the product
mix Trading World needs for partner dossiers.

Source
------
HMRC UK Trade Info OData API — Overseas Trade Statistics (customs / physical
movement). Open access, no auth:
https://www.uktradeinfo.com/api-documentation/
https://api.uktradeinfo.com/OTS

Approach (beginner-friendly)
----------------------------
1. Download Country and SITC lookups once (ISO alpha-2 + section labels).
2. For each year × flow, ask the API to *aggregate on the server*:
   ``groupby((CountryId, SITC/Sitc1Code), sum(Value))`` over the months in that
   year. That returns ~2k rows instead of millions of CN8 lines.
3. Convert sterling pounds → £ million; write Observation rows + a Storage pack.

Honesty
-------
- HMRC OTS ≠ ONS Balance of Payments (seasonally adjusted). Do not splice them.
- SITC section (1-digit) only — not CN8 × country microdata.
- The latest calendar year is year-to-date until December is published.

Run
---
uv run python -m economy.connectors.goods_trade_partner_commodity
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import Observation, write_observations_csv
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "goods-trade-partner-commodity"
PACK_ID = "economy.goods-trade-partner-commodity"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
API = "https://api.uktradeinfo.com"
LANDING = "https://www.uktradeinfo.com/api-documentation/"
BULK_HELP = "https://www.uktradeinfo.com/trade-data/help-with-using-our-data/"

# FlowTypeId: 1 EU imports, 2 EU exports, 3 Non-EU imports, 4 Non-EU exports.
FLOW_IDS: dict[str, tuple[int, int]] = {
    "exports": (2, 4),
    "imports": (1, 3),
}

# First year to keep in the curated pack (API goes back further).
YEAR_START = 2023

# Human labels for SITC sections (prefer API Sitc1Desc; these are fallbacks).
SITC1_FALLBACK: dict[str, str] = {
    "0": "Food and live animals",
    "1": "Beverages and tobacco",
    "2": "Crude materials, inedible, except fuels",
    "3": "Mineral fuels, lubricants and related materials",
    "4": "Animal and vegetable oils, fats and waxes",
    "5": "Chemicals and related products",
    "6": "Manufactured goods classified chiefly by material",
    "7": "Machinery and transport equipment",
    "8": "Miscellaneous manufactured articles",
    "9": "Commodities and transactions not classified elsewhere",
}


def _get_json(url: str, *, retries: int = 4) -> dict[str, Any]:
    """GET JSON with a polite retry — the API rate-limits heavy traffic."""
    last_err: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            headers={"User-Agent": UA, "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            last_err = err
            # 429 / 503 — back off; other 5xx too.
            if err.code in {429, 500, 502, 503, 504} and attempt + 1 < retries:
                time.sleep(2 ** attempt)
                continue
            raise
        except TimeoutError as err:
            last_err = err
            if attempt + 1 < retries:
                time.sleep(2 ** attempt)
                continue
            raise
    raise RuntimeError(f"Failed GET {url}: {last_err}")


def _odata(path: str, params: dict[str, str]) -> dict[str, Any]:
    return _get_json(f"{API}/{path}?{urllib.parse.urlencode(params)}")


def _month_id(year: int, month: int) -> int:
    return year * 100 + month


def _discover_latest_month(year: int = date.today().year) -> tuple[int, int]:
    """Return (year, month) of the newest OTS month with Non-EU export data."""
    for y in (year, year - 1):
        for m in range(12, 0, -1):
            mid = _month_id(y, m)
            apply = (
                f"filter(MonthId eq {mid} and FlowTypeId eq 4)/"
                "aggregate(Value with sum as Value)"
            )
            data = _odata("OTS", {"$apply": apply, "$top": "1"})
            rows = data.get("value") or []
            if rows and rows[0].get("Value"):
                return y, m
    raise RuntimeError("Could not discover latest OTS month from the API")


def _period_bounds(year: int, *, last_month: int) -> tuple[str, str]:
    """Calendar-year (or YTD) period as ISO dates."""
    start = f"{year:04d}-01-01"
    # End of last_month (simple day table; Feb 28 is fine for period labels).
    days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
        days[1] = 29
    end = f"{year:04d}-{last_month:02d}-{days[last_month - 1]:02d}"
    return start, end


def _clean_label(raw: str, sitc1: str) -> str:
    text = (raw or "").strip()
    if not text:
        return SITC1_FALLBACK.get(sitc1, f"SITC {sitc1}")
    # API uses telegraphic abbreviations — tidy the worst ones.
    text = text.replace("nes", "n.e.s.")
    text = text.replace("class'd", "classified")
    text = text.replace("Commodities/transactions not class'd elsewhere in SITC",
                        SITC1_FALLBACK["9"])
    return text


class GoodsTradePartnerCommodityConnector(Connector):
    """Fetch HMRC OTS partner × SITC1 aggregates into a reproducible package."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID), timeout_s=180.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Goods trade by partner and SITC section",
            sector="economy-public-finance",
            publisher="HMRC",
            source_url=LANDING,
            series_id="OTS-Country-SITC1",
            geography="United Kingdom · partner countries (ISO 3166-1 alpha-2)",
            frequency="annual",
            unit="£ million current prices (customs / OTS)",
            definition=(
                "UK overseas trade in goods by partner country and SITC one-digit "
                "section, imports and exports. Values are HMRC Overseas Trade "
                "Statistics (physical movement / customs declarations), aggregated "
                "from monthly OTS via the UK Trade Info API."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.goods_trade_partner_commodity",
            curated_path="curated/observations.csv",
            update_cadence="monthly (after HMRC OTS release)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "OData $apply groupby CountryId × SITC/Sitc1Code with sum(Value); "
                "map CountryId→ISO2; Value GBP→£m; write annual observations + "
                "Storage pack partner_commodity_annual.json."
            ),
            revision_notes=(
                "HMRC revises recent months. Re-run after each OTS release. "
                f"See also {BULK_HELP}."
            ),
            caveats=(
                "OTS ≠ ONS BoP SA partner totals (goods-trade-by-partner). "
                "SITC section only — not CN8×country. Suppressions remain in the "
                "underlying microdata; section totals can still move with revisions."
            ),
            related_indicator_ids=[
                "goods-trade-by-partner",
                "goods-trade-by-commodity",
                "goods-trade-by-uk-region",
            ],
            open_questions=[
                "Whether Trading World plates should use SITC1 or finer SITC2.",
            ],
        )

    def fetch_lookups(self, raw_dir: Path) -> tuple[Path, Path]:
        countries = _odata("Country", {"$format": "json"})
        sitc = _odata("SITC", {"$select": "Sitc1Code,Sitc1Desc", "$format": "json"})
        c_path = raw_dir / "countries.json"
        s_path = raw_dir / "sitc.json"
        c_path.write_text(json.dumps(countries, indent=2), encoding="utf-8")
        s_path.write_text(json.dumps(sitc, indent=2), encoding="utf-8")
        return c_path, s_path

    def fetch_year_flow(
        self,
        *,
        year: int,
        flow: str,
        first_month: int,
        last_month: int,
        dest: Path,
    ) -> Path:
        """One server-side aggregate for a year × flow → raw JSON file."""
        eu_id, non_eu_id = FLOW_IDS[flow]
        start = _month_id(year, first_month)
        end = _month_id(year, last_month)
        apply = (
            f"filter(MonthId ge {start} and MonthId le {end} and "
            f"(FlowTypeId eq {eu_id} or FlowTypeId eq {non_eu_id}))/"
            "groupby((CountryId,SITC/Sitc1Code),aggregate(Value with sum as Value))"
        )
        data = _odata("OTS", {"$apply": apply, "$count": "true"})
        dest.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "year": year,
            "flow": flow,
            "month_id_start": start,
            "month_id_end": end,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "odata_count": data.get("@odata.count"),
            "value": data.get("value") or [],
        }
        dest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return dest

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        raw_dir = self.data_root / "raw" / day.isoformat()
        raw_dir.mkdir(parents=True, exist_ok=True)

        latest_year, latest_month = _discover_latest_month()
        meta = {
            "latest_year": latest_year,
            "latest_month": latest_month,
            "year_start": YEAR_START,
            "api": API,
            "landing": LANDING,
        }
        (raw_dir / "run_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

        c_path, s_path = self.fetch_lookups(raw_dir)
        evidence: list[RawEvidence] = []
        for path in (raw_dir / "run_meta.json", c_path, s_path):
            rel = str(path.relative_to(self.data_root))
            evidence.append(
                RawEvidence(
                    path=rel,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=sha256_file(path),
                    content_type="application/json",
                    official_release_date=f"{latest_year}-{latest_month:02d}",
                    http_status=200,
                    source_url=API,
                )
            )

        ots_dir = raw_dir / "ots"
        years = list(range(YEAR_START, latest_year + 1))
        for year in years:
            last_m = latest_month if year == latest_year else 12
            for flow in ("exports", "imports"):
                dest = ots_dir / f"{year}_{flow}.json"
                print(f"  fetching {year} {flow} (months 01–{last_m:02d}) …", flush=True)
                self.fetch_year_flow(
                    year=year,
                    flow=flow,
                    first_month=1,
                    last_month=last_m,
                    dest=dest,
                )
                # Be polite to the 60 req/min ceiling.
                time.sleep(1.0)
                rel = str(dest.relative_to(self.data_root))
                evidence.append(
                    RawEvidence(
                        path=rel,
                        retrieved_at=datetime.now(timezone.utc).isoformat(),
                        checksum_sha256=sha256_file(dest),
                        content_type="application/json",
                        official_release_date=f"{latest_year}-{latest_month:02d}",
                        http_status=200,
                        source_url=f"{API}/OTS",
                    )
                )
        return evidence

    def _country_map(self, countries_path: Path) -> dict[int, tuple[str, str]]:
        """CountryId → (ISO2, name). Skip non-ISO rows (aggregates)."""
        data = json.loads(countries_path.read_text(encoding="utf-8"))
        out: dict[int, tuple[str, str]] = {}
        for row in data.get("value") or []:
            code = (row.get("CountryCodeAlpha") or "").strip().upper()
            name = (row.get("CountryName") or "").strip()
            cid = row.get("CountryId")
            if cid is None or len(code) != 2 or not code.isalpha():
                continue
            if code == "GB":
                # UK self-trade / residual — not a partner for this pack.
                continue
            out[int(cid)] = (code, name or code)
        return out

    def _sitc1_labels(self, sitc_path: Path) -> dict[str, str]:
        data = json.loads(sitc_path.read_text(encoding="utf-8"))
        out = dict(SITC1_FALLBACK)
        for row in data.get("value") or []:
            code = str(row.get("Sitc1Code") or "").strip()
            desc = (row.get("Sitc1Desc") or "").strip()
            if code:
                out[code] = _clean_label(desc, code)
        return out

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("No raw evidence — run fetch_latest first")
        # Locate the raw day folder from any evidence path.
        sample = Path(evidence[0].path)
        # evidence paths are relative to data_root, e.g. raw/2026-11-16/countries.json
        raw_day = (self.data_root / sample).parent
        if raw_day.name == "ots":
            raw_day = raw_day.parent
        countries_path = raw_day / "countries.json"
        sitc_path = raw_day / "sitc.json"
        meta = json.loads((raw_day / "run_meta.json").read_text(encoding="utf-8"))
        latest_year = int(meta["latest_year"])
        latest_month = int(meta["latest_month"])
        release = f"HMRC OTS {latest_year}-{latest_month:02d}"

        country_map = self._country_map(countries_path)
        sitc_labels = self._sitc1_labels(sitc_path)

        observations: list[Observation] = []
        # Pack structure: by_year[year][flow][iso2] = ranked section rows
        pack_years: dict[str, dict[str, dict[str, list[dict[str, Any]]]]] = {}
        coverage: dict[str, dict[str, Any]] = {}

        ots_dir = raw_day / "ots"
        for path in sorted(ots_dir.glob("*_*.json")):
            blob = json.loads(path.read_text(encoding="utf-8"))
            year = int(blob["year"])
            flow = blob["flow"]
            last_m = latest_month if year == latest_year else 12
            period_start, period_end = _period_bounds(year, last_month=last_m)
            partial = last_m < 12
            coverage[str(year)] = {
                "months": last_m,
                "first": period_start,
                "last": period_end,
                "partial": partial,
            }
            year_key = str(year)
            pack_years.setdefault(year_key, {"exports": {}, "imports": {}})
            # Accumulate per country then rank.
            by_country: dict[str, list[dict[str, Any]]] = defaultdict(list)
            status = "provisional" if partial else "final"

            for row in blob.get("value") or []:
                cid = row.get("CountryId")
                if cid not in country_map:
                    continue
                iso2, label = country_map[cid]
                sitc_obj = row.get("SITC") or {}
                sitc1 = str(sitc_obj.get("Sitc1Code") or "").strip()
                if sitc1 not in sitc_labels and sitc1 not in SITC1_FALLBACK:
                    continue
                gbp = float(row.get("Value") or 0.0)
                if not (gbp > 0):
                    continue
                value_m = round(gbp / 1_000_000.0, 3)
                section_label = sitc_labels.get(sitc1, SITC1_FALLBACK.get(sitc1, sitc1))
                notes = (
                    f"flow={flow}; sitc1={sitc1}; label={section_label}; "
                    f"classification=sitc1; basis=customs-ots"
                    + ("; coverage=ytd" if partial else "")
                )
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=period_start,
                        period_end=period_end,
                        geography_code=iso2,
                        geography_label=label,
                        value=value_m,
                        unit="£ million (OTS customs)",
                        observation_status=status,  # type: ignore[arg-type]
                        source_version=release,
                        notes=notes,
                    )
                )
                by_country[iso2].append(
                    {
                        "sitc1": sitc1,
                        "label": section_label,
                        "value": value_m,
                    }
                )

            for iso2, rows in by_country.items():
                rows.sort(key=lambda r: -r["value"])
                pack_years[year_key][flow][iso2] = rows

        # Write Storage pack beside observations.
        pack = {
            "id": PACK_ID,
            "title": "Goods trade by partner × SITC section",
            "honesty": (
                "HMRC Overseas Trade Statistics (customs). Partner × SITC one-digit "
                "section. Not ONS BoP SA; not CN8×country. Latest year may be "
                "year-to-date until December is published."
            ),
            "source": "HMRC UK Trade Info API /OTS",
            "source_version": release,
            "unit": "£ million",
            "classification": "SITC1",
            "sitc1_labels": sitc_labels,
            "years": sorted(pack_years),
            "coverage": coverage,
            "by_year": pack_years,
            "built_at": datetime.now(timezone.utc).isoformat(),
        }
        pack_path = self.data_root / "curated" / "partner_commodity_annual.json"
        pack_path.parent.mkdir(parents=True, exist_ok=True)
        pack_path.write_text(json.dumps(pack, indent=2), encoding="utf-8")
        print(f"  wrote pack {pack_path} ({len(observations)} observation rows)", flush=True)
        return observations


def main() -> None:
    """Fetch → transform → write curated CSV + manifest + Storage pack."""
    connector = GoodsTradePartnerCommodityConnector()
    print(f"Ingesting {INDICATOR_ID} from HMRC OTS API …", flush=True)
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    curated = connector.data_root / "curated" / "observations.csv"
    write_observations_csv(curated, observations)
    manifest = connector.build_manifest(evidence)
    save_manifest(connector.data_root / "manifest.yaml", manifest)

    readme = connector.data_root / "README.md"
    readme.write_text(
        f"""# {INDICATOR_ID}

UK goods **imports and exports by partner country × SITC section (0–9)**.

## Source

- Publisher: HMRC Overseas Trade Statistics (customs / physical movement)
- API: [{LANDING}]({LANDING}) · `GET {API}/OTS`
- Aggregation: OData `$apply=groupby((CountryId,SITC/Sitc1Code), sum(Value))`

## Run

```bash
uv run python -m economy.connectors.goods_trade_partner_commodity
uv run python -m britain_exchange.archive_data push \\
  data/economy/{INDICATOR_ID}/curated/partner_commodity_annual.json --keep-local
```

## Outputs

| Path | Contents |
|------|----------|
| `curated/observations.csv` | Typed Observation rows (£m, ISO2, sitc1 in notes) |
| `curated/partner_commodity_annual.json` | Storage pack `{PACK_ID}` for Trading World |
| `curated/partners_annual.json` | Separate ONS BoP partner *totals* pack (other connector) |

## Honesty

- **OTS ≠ ONS BoP.** Partner totals on the map stay on BoP SA; product mix here is customs.
- SITC **section** only — not full CN8 × country.
- Latest calendar year is year-to-date until December publishes.
""",
        encoding="utf-8",
    )

    qa = connector.data_root / "validation_notes.md"
    # Spot-check Turkey 2025 exports machinery (SITC 7) from pack.
    pack = json.loads(
        (connector.data_root / "curated" / "partner_commodity_annual.json").read_text(
            encoding="utf-8"
        )
    )
    tr = (pack.get("by_year") or {}).get("2025", {}).get("exports", {}).get("TR", [])
    tr_top = tr[0] if tr else {}
    qa.write_text(
        f"""# Validation notes — {INDICATOR_ID}

**Status:** Ingested · awaiting Validation agent QA before Ready.

## Checks for Validation

1. **Turkey 2025 exports top section** — connector spot: sitc1=`{tr_top.get("sitc1")}` · {tr_top.get("label")} · £{tr_top.get("value")}m. Re-query API for CountryId 52, 202501–202512, FlowTypeId 2|4, groupby Sitc1Code; convert GBP÷1e6.
2. **France 2025 food (SITC 0) exports** — should be ~£2.3bn order of magnitude (API Jan–Dec 2025 Non-EU+EU).
3. **Coverage** — years {pack.get("years")}; latest coverage `{pack.get("coverage")}`.
4. **No GB partner rows**; ISO2 only.
5. **Do not compare cell-by-cell to ONS BoP partner totals** — different basis.

## Source pin

- API docs: {LANDING}
- Release month in pack: {pack.get("source_version")}
""",
        encoding="utf-8",
    )
    print(f"Done · {len(observations)} rows → {curated}", flush=True)


if __name__ == "__main__":
    main()
