"""HM Land Registry CCOD/OCOD counts: completeness, privacy and month history."""

from __future__ import annotations

import csv
import io
import zipfile
from pathlib import Path

import pytest

from housing.connectors.corporate_ownership import (
    _country,
    count_file,
    merge_months,
    observations_for,
)

HEADER = [
    "Title Number", "Tenure", "Property Address", "District", "County", "Region", "Postcode",
    "Multiple Address Indicator", "Price Paid",
    *[
        f"{field} ({i})"
        for i in range(1, 5)
        for field in (
            "Proprietor Name", "Company Registration No.", "Proprietorship Category",
            "Country Incorporated",
        )
    ],
    "Date Proprietor Added", "Additional Proprietor Indicator",
]
LADS = {
    "westminster": ("E09000033", "Westminster"),
    "cardiff": ("W06000015", "Cardiff"),
    "rhonddacynontaf": ("W06000016", "Rhondda Cynon Taf"),
}


def _row(title: str, tenure: str, district: str, name: str, number: str, country: str = "") -> list[str]:
    row = dict.fromkeys(HEADER, "")
    row.update({
        "Title Number": title,
        "Tenure": tenure,
        "Property Address": f"1 Secret Street, {district}",
        "District": district,
        "Proprietor Name (1)": name,
        "Company Registration No. (1)": number,
        "Proprietorship Category (1)": "Limited Company or Public Limited Company",
        "Country Incorporated (1)": country,
    })
    return [row[h] for h in HEADER]


def _zip(tmp_path: Path, rows: list[list[str]], trailer: int) -> Path:
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_ALL)
    writer.writerow(HEADER)
    writer.writerows(rows)
    writer.writerow(["Row Count:", str(trailer)])
    path = tmp_path / "OCOD_FULL_2026_11.zip"
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("OCOD_FULL_2026_11.csv", buf.getvalue())
    return path


ROWS = [
    _row("NGL1", "Freehold", "CITY OF WESTMINSTER", "SECRET HOLDINGS LIMITED", "", "JERSEY"),
    _row("NGL2", "Leasehold", "CITY OF WESTMINSTER", "SECRET HOLDINGS LIMITED", "", "ISLE OF MAN"),
    _row("CYM3", "Freehold", "RHONDDA CYNON TAFF", "VALLEY CO LTD", "", "JERSEY"),
]


def test_counts_match_trailer(tmp_path: Path) -> None:
    tally = count_file(_zip(tmp_path, ROWS, 3), "overseas-company")
    assert tally.titles == 3
    assert tally.by_tenure == {"Freehold": 2, "Leasehold": 1}


def test_short_file_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="trailer says 4"):
        count_file(_zip(tmp_path, ROWS, 4), "overseas-company")


def test_output_carries_no_names_addresses_or_titles(tmp_path: Path) -> None:
    tally = count_file(_zip(tmp_path, ROWS, 3), "overseas-company")
    obs = observations_for([tally], LADS, year=2026, month=11, source_version="test")
    text = " ".join(f"{o.geography_label} {o.notes}" for o in obs).upper()
    for secret in ("SECRET", "VALLEY CO", "NGL1", "CYM3", "STREET"):
        assert secret not in text
    by_place = {o.geography_code: o.value for o in obs if o.notes == "series=owner-origin; category=overseas-company"}
    assert by_place == {"K04000001": 3, "E09000033": 2, "W06000016": 1}


def test_unknown_district_stops_the_run(tmp_path: Path) -> None:
    rows = [*ROWS, _row("X1", "Freehold", "ATLANTIS", "A LTD", "", "JERSEY")]
    tally = count_file(_zip(tmp_path, rows, 4), "overseas-company")
    with pytest.raises(ValueError, match="ATLANTIS"):
        observations_for([tally], LADS, year=2026, month=11, source_version="test")


def test_new_month_is_appended_not_replacing_history(tmp_path: Path) -> None:
    tally = count_file(_zip(tmp_path, ROWS, 3), "overseas-company")
    oct_ = observations_for([tally], LADS, year=2026, month=10, source_version="oct")
    nov = observations_for([tally], LADS, year=2026, month=11, source_version="nov")
    nov_again = observations_for([tally], LADS, year=2026, month=11, source_version="nov2")
    merged = merge_months(merge_months(oct_, nov), nov_again)
    assert merged[0].period_start == "2026-11-01"
    assert {o.source_version for o in merged} == {"oct", "nov2"}
    assert len(merged) == len(oct_) + len(nov_again)


def test_country_labels_read_naturally() -> None:
    assert _country("ISLE OF MAN") == "Isle of Man"
    assert _country("TRINIDAD AND TOBAGO") == "Trinidad and Tobago"
    assert _country("JERSEY") == "Jersey"
