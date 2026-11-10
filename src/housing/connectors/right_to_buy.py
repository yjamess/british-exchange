"""MHCLG Right to Buy sales and replacements, England (two indicators, one source).

Source collection: Live tables on social housing sales (MHCLG).

``right-to-buy-sales-and-replacements`` (England and regions, financial years):
1. LT 691b_R: all Right to Buy sales of local authority stock, 1980-81 onward
   (series=all-right-to-buy-sales). This is the publisher's definitive total.
2. Right to Buy sales open data: eligible sales under the 2012 receipts pooling
   rules, 2006-07 onward (series=eligible-sales; category=all|right-to-buy|
   shared-ownership|other|unknown-type). Local authority rows are summed to
   region (RGN25CD) and England.
3. Right to Buy replacements open data, 2012-13 onward:
   series=replacements (new build starts plus acquisitions, the publisher's
   replacement measure), replacement-new-build-starts, replacement-acquisitions,
   replacement-starts-or-acquisitions-unsplit, replacement-completions;
   category=all|local-authorities|homes-england-gla.

``right-to-buy-one-for-one`` (England, financial years 2012-13 to 2024-25):
Figure 7 of the 2024-25 release (the last release to report the national
one-for-one target, withdrawn after the July 2025 consultation response):
baseline sales, annual sales, annual and cumulative additional sales, the
three-year-lagged replacement target, cumulative replacements, and a derived
replacement-ratio (cumulative replacements / target; target 1).

Caveats: England only. Eligible sales are a subset of all Right to Buy sales.
Homes England stopped separately recording receipt-funded starts in 2023-24,
so replacements from 2023-24 may be undercounted.
"""

from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

COLLECTION = "https://www.gov.uk/government/statistical-data-sets/live-tables-on-social-housing-sales"
ENGLAND = ("E92000001", "England")
ODS = "application/vnd.oasis.opendocument.spreadsheet"

# ---------------------------------------------------------------- pinned raw files

RAW_691 = "raw/2026-11-10/LT_691.ods"
RAW_693 = "raw/2026-11-10/LT_693.ods"
RAW_SALES = "raw/2026-11-10/Right_to_Buy_sales_open_data.csv"
RAW_REPL = "raw/2026-11-10/Right_to_Buy_replacements_open_data.csv"
RAW_FIG = "raw/2026-11-10/Graph_Tables_2024-25.ods"

SALES_PINS: tuple[tuple[str, str, str, str], ...] = (
    # (relative path, url, content type, official release date)
    (RAW_691, "https://assets.publishing.service.gov.uk/media/6a708a741f66ec7b77ed4662/LT_691.ods", ODS, "2026-08-06"),
    (RAW_693, "https://assets.publishing.service.gov.uk/media/6a703c4d8319ab05f7caa303/LT_693.ods", ODS, "2026-08-06"),
    (
        RAW_SALES,
        "https://assets.publishing.service.gov.uk/media/6a703ce18319ab05f7caa304/Right_to_Buy_sales_open_data.csv",
        "text/csv",
        "2026-08-06",
    ),
    (
        RAW_REPL,
        "https://assets.publishing.service.gov.uk/media/6a703d1f8319ab05f7caa305/Right_to_Buy_replacements_open_data.csv",
        "text/csv",
        "2026-08-06",
    ),
)
TARGET_PINS: tuple[tuple[str, str, str, str], ...] = (
    (
        RAW_FIG,
        "https://assets.publishing.service.gov.uk/media/68a34ede32d2c63f869343b6/Graph_Tables.ods",
        ODS,
        "2025-08-21",
    ),
)

SALES_VERSION = "Right to Buy sales and replacements, England: 2025 to 2026 (6 August 2026)"
TARGET_VERSION = "Right to Buy sales and replacements, England: 2024 to 2025, Figure 7 (21 August 2025)"

SALE_TYPES: dict[str, str] = {
    "Right to Buy": "right-to-buy",
    "Shared Ownership": "shared-ownership",
    "Other Eligible Sales": "other",
    "Unknown": "unknown-type",
}
REPL_SERIES: dict[str, str] = {
    "Starts": "replacement-new-build-starts",
    "Acquisitions": "replacement-acquisitions",
    "Unknown Starts or Acquisitions": "replacement-starts-or-acquisitions-unsplit",
    "Completions": "replacement-completions",
}
PROVIDERS: dict[str, str] = {"LA": "local-authorities", "HE/GLA": "homes-england-gla"}


def fy_bounds(label: str) -> tuple[str, str]:
    """'2012-13' -> ('2012-04-01', '2013-03-31'). Rejects labels whose years disagree."""
    text = label.strip()
    start = int(text[:4])
    if len(text) != 7 or text[4] != "-" or int(text[5:7]) != (start + 1) % 100:
        raise ValueError(f"not a financial-year label: {label!r}")
    return f"{start:04d}-04-01", f"{start + 1:04d}-03-31"


def _num(raw: str) -> float | None:
    text = raw.strip().replace(",", "")
    if not text or text.startswith("["):
        return None
    return float(text)


def _evidence(root: Path, pins: Sequence[tuple[str, str, str, str]]) -> list[RawEvidence]:
    out: list[RawEvidence] = []
    for rel, url, ctype, released in pins:
        path = root / rel
        if not path.is_file():
            raise FileNotFoundError(path)
        out.append(
            RawEvidence(
                path=rel,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=sha256_file(path),
                content_type=ctype,
                official_release_date=released,
                source_url=url,
            )
        )
    return out


def _obs(indicator: str, fy: str, geo: tuple[str, str], value: float, unit: str, version: str, notes: str) -> Observation:
    start, end = fy_bounds(fy)
    return Observation(
        indicator_id=indicator,
        period_start=start,
        period_end=end,
        geography_code=geo[0],
        geography_label=geo[1],
        value=round(value, 4),
        unit=unit,
        observation_status="final",
        source_version=version,
        notes=notes,
    )


# ---------------------------------------------------------------- sales and replacements

SALES_ID = "right-to-buy-sales-and-replacements"
SALES_UNIT = "dwellings"


def parse_lt691b(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "LT_691b_R")
    header_idx = next(i for i, r in enumerate(rows) if r and r[0].strip() == "Region Code")
    header = rows[header_idx]
    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].strip():
            continue
        geo = (row[0].strip(), row[1].strip())
        for idx, label in enumerate(header[2:], start=2):
            if not label.strip():
                continue
            value = _num(row[idx]) if idx < len(row) else None
            if value is None:
                continue
            out.append(
                _obs(
                    SALES_ID, label, geo, value, SALES_UNIT, SALES_VERSION,
                    "series=all-right-to-buy-sales; category=all; source=MHCLG LT 691b; "
                    "local authority stock; financial-year",
                )
            )
    if not out:
        raise ValueError("LT_691b_R parsed no rows")
    return out


def _rollup(rows: list[dict[str, str]], key_fn) -> dict[tuple, float]:
    """Sum Units to (fy, geo_code, geo_label, *key) for region and England."""
    totals: dict[tuple, float] = defaultdict(float)
    for r in rows:
        keys = key_fn(r)
        if keys is None:
            continue
        units = float(r["Units"])
        for geo in ((r["RGN25CD"], r["RGN25NM"]), ENGLAND):
            for key in keys:
                totals[(r["Year"], geo[0], geo[1], *key)] += units
    return totals


def parse_sales_open_data(path: Path) -> list[Observation]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))

    def keys(r: dict[str, str]):
        kind = SALE_TYPES.get(r["Eligible_Sale_Type_2"])
        if kind is None:
            raise ValueError(f"unknown sale type {r['Eligible_Sale_Type_2']!r}")
        return [(kind,), ("all",)]

    out = [
        _obs(
            SALES_ID, fy, (code, label), value, SALES_UNIT, SALES_VERSION,
            f"series=eligible-sales; category={kind}; source=MHCLG Right to Buy sales open data; "
            "eligible for receipts pooling; shared ownership counted in part-dwellings; financial-year",
        )
        for (fy, code, label, kind), value in sorted(_rollup(rows, keys).items())
    ]
    if not out:
        raise ValueError("sales open data parsed no rows")
    return out


def parse_replacements_open_data(path: Path) -> list[Observation]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))

    def keys(r: dict[str, str]):
        series = REPL_SERIES.get(r["Replacement_Type_2"])
        provider = PROVIDERS.get(r["Provider"])
        if series is None or provider is None:
            raise ValueError(f"unknown replacement row {r['Provider']!r} {r['Replacement_Type_2']!r}")
        out = [(series, provider), (series, "all")]
        if r["Replacement_Type_1"] == "Starts and Acquisitions":
            out += [("replacements", provider), ("replacements", "all")]
        return out

    out = [
        _obs(
            SALES_ID, fy, (code, label), value, SALES_UNIT, SALES_VERSION,
            f"series={series}; category={provider}; source=MHCLG Right to Buy replacements open data; "
            "funded from Right to Buy receipts; financial-year",
        )
        for (fy, code, label, series, provider), value in sorted(_rollup(rows, keys).items())
    ]
    if not out:
        raise ValueError("replacements open data parsed no rows")
    return out


class RightToBuySalesReplacementsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / SALES_ID))

    @property
    def indicator_id(self) -> str:
        return SALES_ID

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        return _evidence(self.data_root, SALES_PINS)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        root = self.data_root
        obs = (
            parse_lt691b(root / RAW_691)
            + parse_sales_open_data(root / RAW_SALES)
            + parse_replacements_open_data(root / RAW_REPL)
        )
        obs.sort(key=lambda o: (o.period_start, o.geography_code, o.notes))
        return obs

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=SALES_ID,
            title="Right to Buy sales and replacements",
            sector="housing-land",
            publisher="MHCLG",
            source_url=COLLECTION,
            series_id="LT 691b; Right to Buy sales open data; Right to Buy replacements open data",
            geography="England (E92000001) and English regions (RGN25CD) — not UK",
            frequency="annual",
            unit=SALES_UNIT,
            definition=(
                "Right to Buy sales of local authority homes in England, and the replacement homes "
                "funded from Right to Buy receipts. series=all-right-to-buy-sales is every Right to Buy "
                "sale of council stock since 1980-81 (LT 691b). series=eligible-sales counts sales "
                "eligible for receipts pooling since 2006-07, split by sale type in category. "
                "series=replacements is new-build starts plus acquisitions funded from receipts (the "
                "publisher's replacement measure); the replacement-* series give starts, acquisitions, "
                "unsplit starts-or-acquisitions and new-build completions. category on replacement "
                "series names the provider: local-authorities, homes-england-gla or all."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.right_to_buy",
            curated_path="curated/observations.csv",
            update_cadence="annual (August Right to Buy sales and replacements release; LT 691b with the February sales and demolitions release)",
            raw_evidence=list(evidence),
            transformations=(
                "LT_691b_R parsed as published (regions + England). Sales and replacements open data "
                "summed from local authority rows to RGN25CD region and England. Replacements = rows "
                "with Replacement_Type_1 'Starts and Acquisitions'. LT_693.ods is pinned for QA only."
            ),
            caveats=(
                "England only. Eligible sales exclude sales outside a Housing Revenue Account and "
                "include some shared ownership and other discounted sales; they are not all Right to "
                "Buy sales. Shared ownership sales count as part-dwellings, so values can have decimals. "
                "Open data reconciles some differences and may not match LT 691a exactly. LT 691b ends "
                "at 2024-25. Homes England has not separately recorded receipt-funded starts since "
                "2023-24, so replacements from 2023-24 may be undercounted. Replacements are funded "
                "over up to five years (three before April 2021) and do not match sales in the same "
                "year. Unsplit starts-or-acquisitions are reported before 2017-18."
            ),
            revision_notes="Pinned 2025-26 release files (published 6 August 2026), retrieved 2026-11-10.",
            related_indicator_ids=["right-to-buy-one-for-one", "dwelling-stock-by-tenure", "affordable-housing-supply"],
        )


# ---------------------------------------------------------------- one-for-one target

TARGET_ID = "right-to-buy-one-for-one"
FIG7_COLUMNS: dict[str, tuple[str, str]] = {
    "Baseline": ("baseline-sales", "dwellings"),
    "Annual sales": ("annual-sales", "dwellings"),
    "Annual additional sales": ("annual-additional-sales", "dwellings"),
    "Cumulative additional sales": ("cumulative-additional-sales", "dwellings"),
    "One-for-one replacement target": ("replacement-target", "dwellings"),
    "Cumulative replacements": ("cumulative-replacements", "dwellings"),
}
RATIO_UNIT = "replacement-per-additional-sale"


def parse_figure7(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, "Figure_7")
    header_idx = next(i for i, r in enumerate(rows) if r and r[0].strip() == "Year")
    header = [c.strip() for c in rows[header_idx]]
    missing = set(FIG7_COLUMNS) - set(header)
    if missing:
        raise ValueError(f"Figure_7 missing columns {sorted(missing)}")
    out: list[Observation] = []
    for row in rows[header_idx + 1 :]:
        if not row or not row[0].strip().isdigit():
            continue
        end_year = int(row[0])  # Figure 7 labels a financial year by its end year: 2013 = 2012-13
        fy = f"{end_year - 1}-{end_year % 100:02d}"
        values: dict[str, float] = {}
        for col, (series, unit) in FIG7_COLUMNS.items():
            idx = header.index(col)
            value = _num(row[idx]) if idx < len(row) else None
            if value is None:
                continue
            values[series] = value
            out.append(
                _obs(
                    TARGET_ID, fy, ENGLAND, value, unit, TARGET_VERSION,
                    f"series={series}; category=published; source=MHCLG Right to Buy release 2024-25 Figure 7; "
                    "cumulative from 2012-13; financial-year",
                )
            )
        target = values.get("replacement-target")
        if target:
            out.append(
                _obs(
                    TARGET_ID, fy, ENGLAND, values["cumulative-replacements"] / target, RATIO_UNIT,
                    TARGET_VERSION,
                    "series=replacement-ratio; category=derived; source=MHCLG Right to Buy release 2024-25 "
                    "Figure 7; derived=cumulative-replacements/replacement-target; target=1; financial-year",
                )
            )
    if not out:
        raise ValueError("Figure_7 parsed no rows")
    return out


class RightToBuyOneForOneConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / TARGET_ID))

    @property
    def indicator_id(self) -> str:
        return TARGET_ID

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        return _evidence(self.data_root, TARGET_PINS)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        obs = parse_figure7(self.data_root / RAW_FIG)
        obs.sort(key=lambda o: (o.period_start, o.notes))
        return obs

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=TARGET_ID,
            title="Right to Buy one-for-one replacement",
            sector="housing-land",
            publisher="MHCLG",
            source_url=(
                "https://www.gov.uk/government/statistics/right-to-buy-sales-and-replacements-england-2024-to-2025"
            ),
            series_id="Right to Buy sales and replacements 2024-25, Figure 7 (one-for-one replacement target)",
            geography="England (E92000001) — not UK",
            frequency="annual",
            unit="dwellings (replacement-ratio: replacements per additional sale)",
            definition=(
                "The national one-for-one replacement measure as published by MHCLG. Additional sales are "
                "Right to Buy sales above a pre-2012 baseline forecast. The replacement target in a year is "
                "the cumulative additional sales up to three years earlier. Cumulative replacements are "
                "receipt-funded new-build starts plus acquisitions since April 2012. series=replacement-ratio "
                "is cumulative replacements divided by the target (1 means the target is met)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.right_to_buy",
            curated_path="curated/observations.csv",
            update_cadence="none — MHCLG stopped reporting the target after the 2 July 2025 consultation response",
            raw_evidence=list(evidence),
            transformations=(
                "Parse Figure_7 of the 2024-25 graph tables. Year label is the financial-year end "
                "(2013 = 2012-13). replacement-ratio is derived here from two published columns; "
                "every other value is copied as published."
            ),
            caveats=(
                "England only, national target (not per council). The series ends at 2024-25 because "
                "MHCLG stopped reporting the target from the 2025-26 release; it is not extended here. "
                "Homes England has not separately recorded receipt-funded starts since 2023-24, so "
                "replacements from 2023-24 may be undercounted. The replacement window was three years "
                "for the target as published, although councils have had five years to spend receipts "
                "since April 2021. replacement-ratio is derived and is context for the pledge, not "
                "evidence of what caused the gap."
            ),
            revision_notes="Pinned Graph_Tables.ods from the 21 August 2025 release, retrieved 2026-11-10.",
            related_indicator_ids=[SALES_ID],
        )


def main() -> None:
    for connector in (RightToBuySalesReplacementsConnector(), RightToBuyOneForOneConnector()):
        evidence = connector.evidence_from_pinned_raw()
        observations = connector.transform(evidence)
        manifest_path, curated_path = connector.write_hand_off(evidence, observations)
        print(f"{connector.indicator_id}: {len(observations)} observations -> {curated_path}")


if __name__ == "__main__":
    main()
