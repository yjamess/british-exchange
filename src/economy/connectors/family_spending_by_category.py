"""ONS Family Spending — weekly £ by headline expenditure group (all households).

Approach (plain language):
1. Download Family Spending workbook 1 (FYE 2025, released 11 Jun 2026).
2. Curate **Table 4.1** — average weekly £ at **FYE 2025 prices** for headline
   groups (sequential codes 1–13, 1–12 subtotal, total) for every published
   year column, including both 2006 weighting versions.
3. Do not mix in Table 4.3 current prices, and do not copy CPI COICOP inflation.

Reproduce::

    uv run python -m economy.connectors.family_spending_by_category
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.family_spending_common import (
    BULLETIN_URL,
    CLASSIFICATION_SLUGS,
    FYE_2025_END,
    FYE_2025_START,
    HEADLINE_CODES,
    OFFICIAL_RELEASE_DATE,
    PIN_DATE,
    SOURCE_VERSION,
    UK_GEOGRAPHY_CODE,
    UK_GEOGRAPHY_LABEL,
    WB1_FILE_URL,
    WB1_LANDING_URL,
    clean_category_label,
    headline_code_from_cell,
    is_continued_label,
    lookup_notes,
    notes,
    parse_published_number,
    year_columns_from_header_row,
)
from economy.connectors.ons_workbook import download_ons_file

INDICATOR_ID = "family-spending-by-category"
RAW_RELATIVE = f"raw/{PIN_DATE}/workbook1detailedexpenditureandtrends.xlsx"

# Bulletin / Table 4.1 FYE 2025 (2024-25) all-household spots, £/week real.
SELF_QA_SPOTS: dict[str, float] = {
    "total_2024_25": 676.6,
    "food_2024_25": 73.7,
    "housing_2024_25": 118.4,
    "transport_2024_25": 96.4,
    "food_2001_02": 82.7,
    "total_2001_02": 756.2,
}


def _parse_table_4_1(ws) -> list[Observation]:
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 21:
        raise ValueError("Table 4.1 is shorter than expected")
    year_cols = year_columns_from_header_row(rows[6])
    if len(year_cols) < 20:
        raise ValueError(f"Table 4.1 year header incomplete: {len(year_cols)} cols")

    collected: dict[str, dict[str, Observation]] = {}
    seen_total = False
    for row in rows[18:]:
        if not row:
            continue
        code = headline_code_from_cell(row[0])
        label_cell = row[1] if len(row) > 1 else None
        if code is None:
            continue
        if is_continued_label(label_cell):
            continue
        # Second "Total expenditure" is per person — skip it.
        if code == "total" and seen_total:
            continue
        if code == "total":
            seen_total = True
        label = clean_category_label(label_cell, code)
        slug = CLASSIFICATION_SLUGS[code]
        for col_idx, spec in year_cols:
            parsed = parse_published_number(row[col_idx] if col_idx < len(row) else None)
            if parsed is None:
                continue
            value, small = parsed
            extra = {"caution": "small_sample"} if small else {}
            obs = Observation(
                indicator_id=INDICATOR_ID,
                period_start=spec["period_start"],
                period_end=spec["period_end"],
                geography_code=UK_GEOGRAPHY_CODE,
                geography_label=UK_GEOGRAPHY_LABEL,
                value=value,
                unit="£ per week (household average, FYE 2025 prices)",
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=notes(
                    table="4.1",
                    measure="weekly_gbp_real",
                    classification=slug,
                    classification_code=code,
                    classification_label=label,
                    population="all_households",
                    price_basis="fye_2025_prices",
                    year_label=spec["year_label"],
                    year_variant=spec["year_variant"],
                    grain=spec["grain"],
                    published_header=spec["published_header"],
                    **extra,
                ),
            )
            collected.setdefault(code, {})[f"{spec['period_start']}|{spec['year_variant']}"] = obs

    missing = [c for c in HEADLINE_CODES if c not in collected]
    if missing:
        raise ValueError(f"Table 4.1 missing headline codes: {missing}")
    observations: list[Observation] = []
    for code in HEADLINE_CODES:
        observations.extend(collected[code].values())
    return observations


def _lookup(
    observations: Sequence[Observation],
    *,
    classification: str,
    period_start: str,
    year_variant: str | None = None,
) -> float:
    for obs in observations:
        parts = lookup_notes(obs.notes)
        if parts.get("classification") != classification:
            continue
        if obs.period_start != period_start:
            continue
        if year_variant is not None and parts.get("year_variant") != year_variant:
            continue
        if obs.value is None:
            raise ValueError(f"Null value {classification} {period_start}")
        return float(obs.value)
    raise KeyError(f"No obs classification={classification} start={period_start}")


def run_self_qa(observations: Sequence[Observation]) -> dict[str, object]:
    checks: list[dict[str, object]] = []

    def check(name: str, actual: float, expected: float, tol: float = 0.051) -> None:
        checks.append(
            {
                "name": name,
                "actual": actual,
                "expected": expected,
                "pass": abs(actual - expected) <= tol,
            }
        )

    check(
        "total_2024_25",
        _lookup(observations, classification="total", period_start=FYE_2025_START),
        SELF_QA_SPOTS["total_2024_25"],
    )
    check(
        "food_2024_25",
        _lookup(observations, classification="food", period_start=FYE_2025_START),
        SELF_QA_SPOTS["food_2024_25"],
    )
    check(
        "housing_2024_25",
        _lookup(observations, classification="housing_fuel_power", period_start=FYE_2025_START),
        SELF_QA_SPOTS["housing_2024_25"],
    )
    check(
        "transport_2024_25",
        _lookup(observations, classification="transport", period_start=FYE_2025_START),
        SELF_QA_SPOTS["transport_2024_25"],
    )
    check(
        "food_2001_02",
        _lookup(observations, classification="food", period_start="2001-04-01"),
        SELF_QA_SPOTS["food_2001_02"],
    )
    check(
        "total_2001_02",
        _lookup(observations, classification="total", period_start="2001-04-01"),
        SELF_QA_SPOTS["total_2001_02"],
    )

    n_2006 = sum(
        1
        for o in observations
        if o.period_start == "2006-01-01" and lookup_notes(o.notes).get("classification") == "total"
    )
    checks.append(
        {
            "name": "two_calendar_2006_totals",
            "actual": n_2006,
            "expected": 2,
            "pass": n_2006 == 2,
        }
    )

    n_codes_latest = sum(
        1
        for o in observations
        if o.period_start == FYE_2025_START and o.period_end == FYE_2025_END
    )
    checks.append(
        {
            "name": "latest_year_headline_count",
            "actual": n_codes_latest,
            "expected": 15,
            "pass": n_codes_latest == 15,
        }
    )
    years_per_code = {
        code: sum(1 for o in observations if lookup_notes(o.notes).get("classification_code") == code)
        for code in HEADLINE_CODES
    }
    uniform = len(set(years_per_code.values())) == 1
    checks.append(
        {
            "name": "uniform_year_coverage",
            "actual": years_per_code,
            "expected": "same year count for every headline code",
            "pass": uniform and next(iter(years_per_code.values())) >= 24,
        }
    )

    passed = sum(1 for c in checks if c["pass"])
    failed = [c["name"] for c in checks if not c["pass"]]
    return {
        "indicator_id": INDICATOR_ID,
        "retrieved_pin_date": PIN_DATE,
        "official_release_date": OFFICIAL_RELEASE_DATE,
        "table": "Workbook 1 Table 4.1",
        "checks": checks,
        "summary": {"pass": passed, "fail": len(failed), "failed_names": failed},
        "n_observations": len(observations),
    }


class FamilySpendingByCategoryConnector(Connector):
    """LCF / Family Spending headline weekly £, all households, real history."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Family spending by category (LCF weekly £, all households)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=WB1_LANDING_URL,
            series_id="Family Spending workbook 1 · Table 4.1 · FYE 2025",
            geography="United Kingdom (K02000001); private households (LCF)",
            frequency="annual (financial year; calendar years 2006–2014)",
            unit="£ per week (household average, FYE 2025 prices)",
            definition=(
                "ONS Family Spending / Living Costs and Food Survey. Table 4.1 "
                "average weekly household expenditure on sequential headline "
                "groups 1–13 (food through other items), the 1–12 subtotal, and "
                "total expenditure, all households, UK. Values are deflated to "
                "FYE 2025 prices using COICOP-specific CPI deflators (publisher "
                "note 1). Housing (net), fuel and power excludes mortgage "
                "interest, Council Tax and Northern Ireland rates (those sit in "
                "group 13 / other items). Survey means — not a median household "
                "and not a CPI inflation basket."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.family_spending_by_category",
            curated_path="curated/observations.csv",
            update_cadence="annual (Family Spending release)",
            raw_evidence=list(evidence),
            transformations=(
                f"Download workbook 1 FYE 2025 ({WB1_FILE_URL}). Parse Table 4.1 "
                "headline rows only. Emit one observation per group × published "
                "year column. Keep both 2006 weighting versions as separate "
                "year_variant values. Skip the per-person total row."
            ),
            revision_notes=(
                "Workbook 1 FYE 2023/FYE 2024 Table A1 standard errors were "
                "corrected on 11 Jun 2026; Table 4.1 levels in this pin are the "
                "FYE 2025 edition. Re-pin the edition workbook and compare checksums."
            ),
            caveats=(
                "LCF private households only. Small samples; lower-level items "
                "are noisier than headline groups. Categories are not comparable "
                "with publications before 2001-02. Communication changes from "
                "FYE 2019. COVID collection/weighting in 2020-21. HFS weighting "
                "from 2022-23; Census 2021 weights from FYE 2024. Two 2006 "
                "columns use different census bases. Not ETB, not UKEA RHDI, not "
                "CPI/CPIH. Domain 01 owns inflation; Housing/Energy own bills."
            ),
            related_indicator_ids=[
                "family-spending-by-income",
                "effects-of-taxes-and-benefits",
                "real-household-disposable-income",
                "cpi-inflation",
                "cpih-inflation",
            ],
            open_questions=[
                "Pin Table 4.3 current-price companion as a labelled alternate?",
                "Add Table A1 standard errors as a quality companion?",
            ],
            notion_registry_url=(
                "https://app.notion.com/41965471768581afbe16d4cdb396d7de"
            ),
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("No raw evidence")
        path = self.data_root / evidence[0].path
        wb = openpyxl.load_workbook(path, data_only=True)
        try:
            return _parse_table_4_1(wb["4.1"])
        finally:
            wb.close()

    def run(self) -> tuple[Path, Path, dict[str, object]]:
        target = self.data_root / RAW_RELATIVE
        if target.is_file() and target.stat().st_size > 10_000:
            evidence = RawEvidence(
                path=RAW_RELATIVE,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=sha256_file(target),
                content_type=(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ),
                official_release_date=OFFICIAL_RELEASE_DATE,
                http_status=200,
                source_url=WB1_FILE_URL,
            )
        else:
            evidence = download_ons_file(
                WB1_FILE_URL,
                target,
                relative_path=RAW_RELATIVE,
                official_release_date=OFFICIAL_RELEASE_DATE,
            )

        observations = self.transform([evidence])
        qa = run_self_qa(observations)
        if qa["summary"]["fail"]:  # type: ignore[index]
            raise RuntimeError(f"Self-QA failed: {qa['summary']}")

        manifest_path, curated_path = self.write_hand_off([evidence], observations)
        curated_dir = self.data_root / "curated"
        curated_dir.mkdir(parents=True, exist_ok=True)
        (curated_dir / "self_qa.json").write_text(
            json.dumps(qa, indent=2) + "\n", encoding="utf-8"
        )
        sums_path = self.data_root / f"raw/{PIN_DATE}/SHA256SUMS"
        sums_path.write_text(
            f"{evidence.checksum_sha256}  {Path(evidence.path).name}\n",
            encoding="utf-8",
        )
        _write_readme(self.data_root, evidence, qa, len(observations))
        _write_source_register(self.data_root)
        return manifest_path, curated_path, qa


def _write_readme(
    data_root: Path, evidence: RawEvidence, qa: dict[str, object], n: int
) -> None:
    summary = qa["summary"]  # type: ignore[index]
    text = f"""# family-spending-by-category

**Owner:** Economy agent
**Status:** Validation-ready (Domain 04 Cost of Living / Ledger composition) — **not Ready**
**Registry:** https://app.notion.com/p/41965471768581afbe16d4cdb396d7de
**indicator_id:** `family-spending-by-category`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS Family Spending / LCF |
| Table | Workbook 1 **Table 4.1** |
| Landing | {WB1_LANDING_URL} |
| Bulletin | {BULLETIN_URL} |
| Geography | UK (`K02000001`), private households |
| Unit | £ per week household average, **FYE 2025 prices** |
| Population | All households (means) |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m economy.connectors.family_spending_by_category
```

## Pin ({PIN_DATE})

- Raw: `{evidence.path}`, SHA-256 `{evidence.checksum_sha256}`
- Official release: **{OFFICIAL_RELEASE_DATE}**
- Curated rows: **{n}**
- Self-QA: {summary['pass']} pass / {summary['fail']} fail
- Latest (FYE 2025) total weekly expenditure: **£676.60** (Table 4.1 stores 676.6)

## Honest limits

- Real (deflated) weekly £ — not current-price Table 4.3, not CPI inflation.
- Housing (net) excludes mortgage interest, Council Tax and NI rates.
- LCF ≠ ETB ≠ UKEA RHDI. Do not draw one household budget.
- Two 2006 columns are different weighting versions, not a revision of one year.

## Related

- `family-spending-by-income` (Workbook 1 Tables 3.1E5 / 3.2E5, two-adult OECD)
- Domain 06 `effects-of-taxes-and-benefits` — **adjacent** income/tax context only
"""
    (data_root / "README.md").write_text(text, encoding="utf-8")


def _write_source_register(data_root: Path) -> None:
    rows = """table_id,title,years,geography,units,equivalisation,licence,notes
Table 4.1,Household expenditure COICOP headline groups at FYE 2025 prices,FYE 2002–FYE 2025 (calendar 2006–2014),UK,£/week household mean real,n/a (all households),OGL v3.0,Curated — Cost of Living history
Table 4.2,Headline groups as % of total at FYE 2025 prices,same,UK,percent of total,n/a,OGL v3.0,Inventory — shares also on 3.2E5 for quintiles
Table 4.3,Headline groups at current prices,same,UK,£/week current,n/a,OGL v3.0,Not curated this pin (would duplicate 4.1 latest)
Table A1,Detailed expenditure with SEs,FYE 2025,UK,£/week current,n/a,OGL v3.0,Inventory; SE correction 11 Jun 2026 on prior editions
"""
    (data_root / "source_register.csv").write_text(rows, encoding="utf-8")


def main() -> None:
    connector = FamilySpendingByCategoryConnector()
    manifest_path, curated_path, qa = connector.run()
    summary = qa["summary"]
    print(f"Wrote {manifest_path}")
    print(f"Wrote {curated_path}")
    print(f"Observations: {qa['n_observations']}")
    print(f"Self-QA: {summary['pass']} pass / {summary['fail']} fail")


if __name__ == "__main__":
    main()
