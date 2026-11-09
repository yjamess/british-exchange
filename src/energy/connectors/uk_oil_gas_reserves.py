"""NSTA historic UK oil and gas reserves / contingent resources.

Approach (plain language):
1. Download the NSTA “Historic estimates of Oil and Gas Reserves and Contingent
   Resources 1973 To 2024” workbook.
2. Pin under data/energy/uk-oil-gas-reserves/raw/ with sha256.
3. Curate annual observations for oil/gas 1P/2P/3P reserves and 2C contingent
   resources, plus annual oil production from the same sheet for the glossary.

Column convention in the Accessible sheet (verified against NSTA end-2023/24
report ranges): Proved = 1P, Probable = 2P, Possible = 3P (totals, not increments).

Best practices:
- pathlib (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from openpyxl import load_workbook

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "uk-oil-gas-reserves"
SOURCE_LANDING_URL = (
    "https://www.nstauthority.co.uk/news-publications/reserves-and-resources-as-at-end-2024/"
)
XLSX_URL = (
    "https://www.nstauthority.co.uk/media/vtehs1wu/"
    "historic-estimates-of-oil-and-gas-reserves-and-contingent-resources-1973-to-2024.xlsx"
)
NSTA_ATTRIBUTION = (
    "Contains information provided by the North Sea Transition Authority "
    "and/or other third parties."
)
LICENCE = (
    "NSTA User Agreement (Open User Licence) — see "
    "data/energy/oil-gas-fossil-fuels/licence/README.md; attribution required"
)
SOURCE_VERSION_PREFIX = "NSTA_Historic_Reserves_1973_2024"

# 0-based column indexes on the Accessible sheet (row 5 labels).
COL = {
    "year": 0,
    "oil_1p": 1,
    "oil_2p": 2,
    "oil_3p": 3,
    "oil_2c": 10,
    "gas_1p": 13,
    "gas_2p": 14,
    "gas_3p": 15,
    "gas_2c": 22,
    "oil_production_mt": 25,
}


def _snapshot_day() -> date:
    return datetime.now(timezone.utc).date()


def _raw_relative(day: date) -> str:
    return f"raw/{day.isoformat()}/historic_reserves_1973_2024.xlsx"


def _cell_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:  # NaN
        return None
    return number


def parse_workbook(path: Path, *, as_of: date) -> list[Observation]:
    """Parse Accessible sheet into typed observations."""
    workbook = load_workbook(path, data_only=True, read_only=True)
    if "Accessible" not in workbook.sheetnames:
        raise ValueError(f"Expected sheet 'Accessible' in {path}")
    sheet = workbook["Accessible"]
    source_version = f"{SOURCE_VERSION_PREFIX}_{as_of.isoformat()}"
    observations: list[Observation] = []

    series_specs: list[tuple[str, str, str, str]] = [
        ("oil_1p", "oil_1p_mt", "million tonnes", "Oil reserves · 1P (proved)"),
        ("oil_2p", "oil_2p_mt", "million tonnes", "Oil reserves · 2P (proved + probable)"),
        ("oil_3p", "oil_3p_mt", "million tonnes", "Oil reserves · 3P"),
        ("oil_2c", "oil_2c_mt", "million tonnes", "Oil contingent resources · 2C"),
        ("gas_1p", "gas_1p_bcm", "billion cubic metres", "Gas reserves · 1P (proved)"),
        ("gas_2p", "gas_2p_bcm", "billion cubic metres", "Gas reserves · 2P"),
        ("gas_3p", "gas_3p_bcm", "billion cubic metres", "Gas reserves · 3P"),
        ("gas_2c", "gas_2c_bcm", "billion cubic metres", "Gas contingent resources · 2C"),
        (
            "oil_production_mt",
            "oil_production_mt",
            "million tonnes",
            "Oil production (same workbook — not reserves)",
        ),
    ]

    for row in sheet.iter_rows(min_row=7, values_only=True):
        year_raw = row[COL["year"]] if row else None
        try:
            year = int(year_raw)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue
        if year < 1970 or year > 2100:
            continue
        period_start = f"{year}-01-01"
        period_end = f"{year}-12-31"
        for col_key, measure, unit, _label in series_specs:
            value = _cell_float(row[COL[col_key]] if len(row) > COL[col_key] else None)
            if value is None:
                continue
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=period_start,
                    period_end=period_end,
                    geography_code="UKCS",
                    geography_label="United Kingdom Continental Shelf",
                    value=value,
                    unit=unit,
                    observation_status="final",
                    source_version=source_version,
                    notes=(
                        f"measure={measure}; fuel={'Oil' if measure.startswith('oil') else 'Gas'}; "
                        "kind=reserves_glossary; "
                        "proved=1P; probable_column=2P_total; possible_column=3P_total"
                    ),
                )
            )

    workbook.close()
    if not observations:
        raise ValueError(f"No reserves observations parsed from {path}")
    return observations


class UkOilGasReservesConnector(Connector):
    """Download + curate NSTA historic reserves workbook."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root, timeout_s=120.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="UK oil and gas reserves and contingent resources",
            sector="energy-industry",
            publisher="North Sea Transition Authority",
            source_url=SOURCE_LANDING_URL,
            series_id="Historic estimates of Oil and Gas Reserves and Contingent Resources 1973–2024",
            geography="UK Continental Shelf (NSTA reserves classification)",
            frequency="annual",
            unit="million tonnes (oil) / billion cubic metres (gas)",
            definition=(
                "Annual NSTA historic estimates of remaining oil and gas reserves "
                "(1P/2P/3P) and contingent resources (2C), plus annual oil production "
                "from the same Accessible sheet for glossary comparison. "
                f"{NSTA_ATTRIBUTION}"
            ),
            licence=LICENCE,
            agent_owner="energy",
            connector_module="energy.connectors.uk_oil_gas_reserves",
            curated_path="curated/observations.csv",
            update_cadence="Annual with NSTA Reserves and Resources report",
            raw_evidence=list(evidence),
            transformations=(
                "Download NSTA historic xlsx. Parse Accessible sheet: oil Proved/"
                "Probable/Possible/2C and gas Proved/Probable/Possible/2C plus oil "
                "production. Treat Probable/Possible columns as 2P/3P totals (not "
                "incremental). Long-format observations with measure= in notes."
            ),
            caveats=(
                "Reserves are remaining recoverable estimates — not annual extraction. "
                "Do not equate 2P reserves with indigenous production. Classification "
                "changes (notably around 2015) break long-run comparability. "
                f"{NSTA_ATTRIBUTION}"
            ),
            related_indicator_ids=["crude-oil-production", "nsta-field-production"],
            open_questions=[],
            notion_registry_url="",
        )

    def fetch_latest(self) -> RawEvidence:
        day = _snapshot_day()
        relative = _raw_relative(day)
        result = self.fetch_url(
            XLSX_URL,
            relative,
            official_release_date=day.isoformat(),
        )
        return result.evidence

    def evidence_from_pinned_raw(self, relative_path: str | None = None) -> RawEvidence:
        if relative_path is None:
            pins = sorted(
                (self.data_root / "raw").glob("*/historic_reserves_1973_2024.xlsx")
            )
            if not pins:
                raise FileNotFoundError("No pinned reserves workbook; run with --fetch")
            path = pins[-1]
            relative_path = str(path.relative_to(self.data_root))
        else:
            path = self.data_root / relative_path
        if not path.is_file():
            raise FileNotFoundError(f"Pinned reserves workbook missing: {path}")
        day = path.parent.name
        return RawEvidence(
            path=relative_path,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=day,
            http_status=200,
            source_url=XLSX_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        path = self.data_root / evidence[0].path
        as_of = date.fromisoformat(path.parent.name)
        return parse_workbook(path, as_of=as_of)


def main(argv: Sequence[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--raw", default=None)
    args = parser.parse_args(list(argv) if argv is not None else None)

    connector = UkOilGasReservesConnector()
    evidence = connector.fetch_latest() if args.fetch else connector.evidence_from_pinned_raw(args.raw)
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
