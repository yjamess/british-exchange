"""ONS Family Spending — expenditure by equivalised disposable-income quintile.

Approach (plain language):
1. Download Family Spending workbooks 1 and 2 (FYE 2025, 11 Jun 2026).
2. Curate **Workbook 1 Table 3.1E5** (weekly £) and **Table 3.2E5** (% of
   total) for headline groups × equivalised disposable-income quintile.
3. Use the **left-hand block only**: updated OECD-modified scale with a
   **two-adult reference**. The right-hand 1-adult-reference block is left
   in the raw workbook for comparison, not curated.
4. Workbook 2 is pinned as the income-landing source. It does **not** contain
   all-households equivalised quintiles (only 1-adult / 2-adult non-retired
   Tables 3.3E / 3.7E) — those subset tables are inventory, not this series.

Reproduce::

    uv run python -m economy.connectors.family_spending_by_income
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
    QUINTILE_BANDS,
    QUINTILE_VALUE_COLS,
    SOURCE_VERSION,
    UK_GEOGRAPHY_CODE,
    UK_GEOGRAPHY_LABEL,
    WB1_FILE_URL,
    WB1_LANDING_URL,
    WB2_FILE_URL,
    WB2_LANDING_URL,
    clean_category_label,
    headline_code_from_cell,
    is_continued_label,
    lookup_notes,
    notes,
    parse_published_number,
)
from economy.connectors.ons_workbook import download_ons_file

INDICATOR_ID = "family-spending-by-income"
WB1_RAW = f"raw/{PIN_DATE}/workbook1detailedexpenditureandtrends.xlsx"
WB2_RAW = f"raw/{PIN_DATE}/workbook2expenditurebyincome.xlsx"

XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

SELF_QA_SPOTS: dict[str, float] = {
    "total_lowest": 407.30,
    "total_highest": 1083.60,
    "total_all": 676.60,
    "food_all": 73.70,
    "food_lowest": 61.80,
    "housing_lowest": 104.70,
    "housing_share_lowest": 25.7,
    "housing_share_all": 17.5,
    "food_share_lowest": 15.2,
    "food_share_all": 10.9,
}


def _parse_quintile_table(
    ws,
    *,
    table: str,
    measure: str,
    unit: str,
) -> list[Observation]:
    """Parse the left (2-adult OECD) block of Table 3.1E5 or 3.2E5."""
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise ValueError(f"Table {table} is empty")
    title = " ".join(str(c) for c in rows[1][:8] if c) + " " + str(rows[2][0] or "")
    if "2-adult" not in title.lower() and "two" not in title.lower():
        # Title can wrap; row 3 col A has the scale line.
        scale_line = str(rows[2][0] or "")
        if "2-adult" not in scale_line.lower():
            raise ValueError(f"Table {table} left block is not 2-adult OECD: {title!r}")

    collected: dict[str, list[Observation]] = {}
    for row in rows:
        if not row:
            continue
        code = headline_code_from_cell(row[0])
        label_cell = row[1] if len(row) > 1 else None
        if code is None or is_continued_label(label_cell):
            continue
        label = clean_category_label(label_cell, code)
        slug = CLASSIFICATION_SLUGS[code]
        band_obs: list[Observation] = []
        for band, col in zip(QUINTILE_BANDS, QUINTILE_VALUE_COLS, strict=True):
            band_slug, band_label = band
            col_idx = col - 1  # iter_rows is 0-based
            parsed = parse_published_number(row[col_idx] if col_idx < len(row) else None)
            if parsed is None:
                continue
            value, small = parsed
            extra = {"caution": "small_sample"} if small else {}
            band_obs.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=FYE_2025_START,
                    period_end=FYE_2025_END,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit=unit,
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=notes(
                        table=table,
                        measure=measure,
                        classification=slug,
                        classification_code=code,
                        classification_label=label,
                        band=band_slug,
                        band_label=band_label,
                        ranking="equivalised_disposable_income_quintile",
                        population="all_households",
                        equivalisation="modified_OECD_two_adult_reference",
                        **extra,
                    ),
                )
            )
        if len(band_obs) != 6:
            raise ValueError(
                f"Table {table} code {code} expected 6 published bands, got {len(band_obs)}"
            )
        collected[code] = band_obs

    missing = [c for c in HEADLINE_CODES if c not in collected]
    if missing:
        raise ValueError(f"Table {table} missing headline codes: {missing}")
    observations: list[Observation] = []
    for code in HEADLINE_CODES:
        observations.extend(collected[code])
    return observations


def _lookup(
    observations: Sequence[Observation],
    *,
    table: str,
    classification: str,
    band: str,
) -> float:
    for obs in observations:
        parts = lookup_notes(obs.notes)
        if parts.get("table") != table:
            continue
        if parts.get("classification") != classification:
            continue
        if parts.get("band") != band:
            continue
        if obs.value is None:
            raise ValueError(f"Null {table}/{classification}/{band}")
        return float(obs.value)
    raise KeyError(f"No obs table={table} classification={classification} band={band}")


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
        "total_lowest",
        _lookup(observations, table="3.1E5", classification="total", band="lowest"),
        SELF_QA_SPOTS["total_lowest"],
    )
    check(
        "total_highest",
        _lookup(observations, table="3.1E5", classification="total", band="highest"),
        SELF_QA_SPOTS["total_highest"],
    )
    check(
        "total_all",
        _lookup(observations, table="3.1E5", classification="total", band="all"),
        SELF_QA_SPOTS["total_all"],
    )
    check(
        "food_all",
        _lookup(observations, table="3.1E5", classification="food", band="all"),
        SELF_QA_SPOTS["food_all"],
    )
    check(
        "food_lowest",
        _lookup(observations, table="3.1E5", classification="food", band="lowest"),
        SELF_QA_SPOTS["food_lowest"],
    )
    check(
        "housing_lowest",
        _lookup(observations, table="3.1E5", classification="housing_fuel_power", band="lowest"),
        SELF_QA_SPOTS["housing_lowest"],
    )
    check(
        "housing_share_lowest",
        _lookup(observations, table="3.2E5", classification="housing_fuel_power", band="lowest"),
        SELF_QA_SPOTS["housing_share_lowest"],
    )
    check(
        "housing_share_all",
        _lookup(observations, table="3.2E5", classification="housing_fuel_power", band="all"),
        SELF_QA_SPOTS["housing_share_all"],
    )
    check(
        "food_share_lowest",
        _lookup(observations, table="3.2E5", classification="food", band="lowest"),
        SELF_QA_SPOTS["food_share_lowest"],
    )
    check(
        "food_share_all",
        _lookup(observations, table="3.2E5", classification="food", band="all"),
        SELF_QA_SPOTS["food_share_all"],
    )

    ratio = (
        _lookup(observations, table="3.1E5", classification="total", band="highest")
        / _lookup(observations, table="3.1E5", classification="total", band="lowest")
    )
    checks.append(
        {
            "name": "highest_to_lowest_total_ratio_bulletin_2_7",
            "actual": round(ratio, 2),
            "expected": 2.66,
            "pass": abs(ratio - 2.66) <= 0.02,
        }
    )

    n_gbp = sum(1 for o in observations if "table=3.1E5" in o.notes)
    n_share = sum(1 for o in observations if "table=3.2E5" in o.notes)
    checks.append(
        {
            "name": "row_counts",
            "actual": {"gbp": n_gbp, "share": n_share, "total": len(observations)},
            "expected": {"gbp": 90, "share": 90, "total": 180},
            "pass": n_gbp == 90 and n_share == 90 and len(observations) == 180,
        }
    )

    one_adult = [o.notes for o in observations if "one_adult" in o.notes or "1-adult" in o.notes]
    checks.append(
        {
            "name": "no_one_adult_reference_rows",
            "actual": len(one_adult),
            "expected": 0,
            "pass": len(one_adult) == 0,
        }
    )

    passed = sum(1 for c in checks if c["pass"])
    failed = [c["name"] for c in checks if not c["pass"]]
    return {
        "indicator_id": INDICATOR_ID,
        "retrieved_pin_date": PIN_DATE,
        "official_release_date": OFFICIAL_RELEASE_DATE,
        "equivalisation": "modified OECD, two-adult reference (FYE 2025 left block)",
        "tables": ["3.1E5", "3.2E5"],
        "checks": checks,
        "summary": {"pass": passed, "fail": len(failed), "failed_names": failed},
        "n_observations": len(observations),
    }


def _reuse_or_download(url: str, target: Path, relative: str) -> RawEvidence:
    if target.is_file() and target.stat().st_size > 10_000:
        return RawEvidence(
            path=relative,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(target),
            content_type=XLSX_TYPE,
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=200,
            source_url=url,
        )
    return download_ons_file(
        url,
        target,
        relative_path=relative,
        official_release_date=OFFICIAL_RELEASE_DATE,
    )


class FamilySpendingByIncomeConnector(Connector):
    """LCF expenditure by equivalised disposable-income quintile (2-adult OECD)."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Family spending by equivalised disposable-income quintile",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=WB2_LANDING_URL,
            series_id="Family Spending workbook 1 Tables 3.1E5 + 3.2E5 (2-adult OECD)",
            geography="United Kingdom (K02000001); private households (LCF)",
            frequency="annual (financial year)",
            unit="£ per week (household average) | percent of total expenditure",
            definition=(
                "ONS Family Spending FYE 2025. Curates Workbook 1 Table 3.1E5 "
                "(average weekly £) and Table 3.2E5 (percent of total expenditure) "
                "for sequential headline groups 1–13, the 1–12 subtotal, and total, "
                "by equivalised disposable-income quintile for all households. "
                "Ranking uses the modified OECD scale with a two-adult reference "
                "household (FYE 2025 methodology update; left-hand published block). "
                "£ figures are unequivalised household means. Workbook 2 is the "
                "income-landing pin; all-households equivalised quintiles live in "
                "workbook 1, not workbook 2."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.family_spending_by_income",
            curated_path="curated/observations.csv",
            update_cadence="annual (Family Spending release)",
            raw_evidence=list(evidence),
            transformations=(
                f"Download workbook 2 ({WB2_FILE_URL}) and workbook 1 "
                f"({WB1_FILE_URL}). Parse Table 3.1E5 and 3.2E5 left blocks "
                "(columns Lowest…All). Headline rows only. Skip the right-hand "
                "1-adult-reference comparison block. Do not curate WB2 Tables "
                "3.3E/3.7E (non-retired 1-adult / 2-adult subsets)."
            ),
            revision_notes=(
                "FYE 2025 changed equivalisation from a one-adult to a two-adult "
                "OECD reference. Do not splice pre-FYE 2025 equivalised tables "
                "without a labelled break. Workbook 1 SEs for FYE 2023–24 Table A1 "
                "were corrected 11 Jun 2026; this pin is the FYE 2025 edition."
            ),
            caveats=(
                "LCF private households; sample 5,000 households in FYE 2025. "
                "Quintile averages are not any household’s budget. Housing (net) "
                "excludes mortgage interest, Council Tax and NI rates. Do not "
                "reconcile these £ with Domain 06 ETB incomes/taxes or UKEA RHDI "
                "/ DGD8 into one ledger. ETB may be shown adjacent only."
            ),
            related_indicator_ids=[
                "family-spending-by-category",
                "effects-of-taxes-and-benefits",
                "real-household-disposable-income",
                "household-saving-ratio",
            ],
            open_questions=[
                "Add Workbook 2 Tables 3.3E/3.7E as labelled household-type slices?",
                "Pin the 1-adult-reference right block as a methodology companion?",
            ],
            notion_registry_url=(
                "https://app.notion.com/41965471768581c39c5cf435f88e080a"
            ),
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        wb1 = next((e for e in evidence if e.path.endswith("workbook1detailedexpenditureandtrends.xlsx")), None)
        if wb1 is None:
            raise ValueError("Workbook 1 raw evidence missing")
        path = self.data_root / wb1.path
        wb = openpyxl.load_workbook(path, data_only=True)
        try:
            gbp = _parse_quintile_table(
                wb["3.1E5"],
                table="3.1E5",
                measure="weekly_gbp",
                unit="£ per week (household average)",
            )
            shares = _parse_quintile_table(
                wb["3.2E5"],
                table="3.2E5",
                measure="share_of_total_expenditure",
                unit="percent of total expenditure",
            )
        finally:
            wb.close()
        return gbp + shares

    def run(self) -> tuple[Path, Path, dict[str, object]]:
        ev_wb2 = _reuse_or_download(WB2_FILE_URL, self.data_root / WB2_RAW, WB2_RAW)
        ev_wb1 = _reuse_or_download(WB1_FILE_URL, self.data_root / WB1_RAW, WB1_RAW)
        evidence = [ev_wb2, ev_wb1]
        observations = self.transform(evidence)
        qa = run_self_qa(observations)
        if qa["summary"]["fail"]:  # type: ignore[index]
            raise RuntimeError(f"Self-QA failed: {qa['summary']}")

        manifest_path, curated_path = self.write_hand_off(evidence, observations)
        curated_dir = self.data_root / "curated"
        curated_dir.mkdir(parents=True, exist_ok=True)
        (curated_dir / "self_qa.json").write_text(
            json.dumps(qa, indent=2) + "\n", encoding="utf-8"
        )
        sums = self.data_root / f"raw/{PIN_DATE}/SHA256SUMS"
        sums.write_text(
            "\n".join(f"{e.checksum_sha256}  {Path(e.path).name}" for e in evidence) + "\n",
            encoding="utf-8",
        )
        _write_readme(self.data_root, evidence, qa, len(observations))
        _write_source_register(self.data_root)
        return manifest_path, curated_path, qa


def _write_readme(
    data_root: Path, evidence: Sequence[RawEvidence], qa: dict[str, object], n: int
) -> None:
    summary = qa["summary"]  # type: ignore[index]
    hashes = "\n".join(f"- `{e.path}` SHA-256 `{e.checksum_sha256}`" for e in evidence)
    text = f"""# family-spending-by-income

**Owner:** Economy agent
**Status:** Validation-ready (Domain 04 Cost of Living / Ledger) — **not Ready**
**Registry:** https://app.notion.com/p/41965471768581c39c5cf435f88e080a
**indicator_id:** `family-spending-by-income`

## Equivalisation (FYE 2025)

From FYE 2025, ONS ranks households by **modified OECD** equivalised disposable
income using a **two-adult reference** household. This replaces the previous
one-adult reference. Tables 3.1E5 and 3.2E5 publish both methods side by side;
this package curates the **left-hand 2-adult** block only.

Workbook 2 (expenditure by income) does not contain all-households equivalised
quintiles. Those cells are in **Workbook 1 Tables 3.1E5 / 3.2E5**. Workbook 2
is still pinned (landing source) and inventoried.

## Reproduce

```bash
uv run python -m economy.connectors.family_spending_by_income
```

## Pin ({PIN_DATE})

{hashes}
- Official release: **{OFFICIAL_RELEASE_DATE}**
- Curated rows: **{n}** (90 weekly £ + 90 shares)
- Self-QA: {summary['pass']} pass / {summary['fail']} fail
- Spots: all-household total **£676.60**; lowest quintile **£407.30**; highest **£1,083.60**

## Ledger (honest adjacent view)

UI may show this LCF composition **next to** Domain 06 `effects-of-taxes-and-benefits`
(income-group tax context). **Never** add LCF weekly £ to ETB £/year taxes/benefits
or UKEA RHDI / DGD8 as if they were one household budget. Different surveys,
periods (FYE 2025 vs ETB FYE 2024), and income concepts.

## Related

- Landing WB2: {WB2_LANDING_URL}
- Tables WB1: {WB1_LANDING_URL}
- Bulletin: {BULLETIN_URL}
"""
    (data_root / "README.md").write_text(text, encoding="utf-8")


def _write_source_register(data_root: Path) -> None:
    rows = """table_id,workbook,title,years,geography,units,equivalisation,licence,notes
3.1E5,WB1,Headline weekly £ by equivalised disposable-income quintile,FYE 2025,UK,£/week household mean,modified OECD two-adult (left block),OGL v3.0,Curated
3.2E5,WB1,Headline % of total expenditure by equivalised disposable-income quintile,FYE 2025,UK,percent of total,modified OECD two-adult (left block),OGL v3.0,Curated published shares — not a derived essentials basket
3.1E5 right,WB1,Same table one-adult OECD reference,FYE 2025,UK,£/week,modified OECD one-adult,OGL v3.0,Not curated — methodology comparison only
A7,WB2,High-level £ by disposable income decile (not equivalised),FYE 2025,UK,£/week,none,OGL v3.0,Inventory — unequivalised deciles
3.3E,WB2,1 adult non-retired by equivalised quintile,FYE 2025,UK,£/week,modified OECD two-adult,OGL v3.0,Subset population — not this series
3.7E,WB2,2 adult non-retired by equivalised quintile,FYE 2025,UK,£/week,modified OECD two-adult,OGL v3.0,Subset population — not this series
"""
    (data_root / "source_register.csv").write_text(rows, encoding="utf-8")


def main() -> None:
    connector = FamilySpendingByIncomeConnector()
    manifest_path, curated_path, qa = connector.run()
    summary = qa["summary"]
    print(f"Wrote {manifest_path}")
    print(f"Wrote {curated_path}")
    print(f"Observations: {qa['n_observations']}")
    print(f"Self-QA: {summary['pass']} pass / {summary['fail']} fail")


if __name__ == "__main__":
    main()
