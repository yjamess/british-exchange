"""Net additional homes counted from the start of a Parliament — MHCLG's own progress estimates.

Two published HTML tables (no spreadsheet carries them):

- category=parliament-2024 — "Housing supply: indicators of new supply, England:
  April to June 2026" (accredited official statistics, 24 September 2026), table of
  net additional dwellings since 9 July 2024 (the 1.5 million homes milestone),
  England and regions.
- category=parliament-2019 — DLUHC "Measuring progress towards one million homes"
  (24 May 2024), Table 1, counting from 17 December 2019. A departmental note, not
  an official statistic.

Series:
- net-additions-in-period — each column as published (a financial year outturn, or
  an EPC-based estimate for a part period).
- progress-since-start-of-parliament — the running total as published. For 2024 this
  is the single "9 July 2024 to <cut-off>" column; for 2019 the "Overall progress" row.

observation_status: "final" for outturn net additions, "estimated" for EPC-based
columns (rounded by the publisher; replaced by outturn when published).

Raw evidence is the GOV.UK Content API JSON of each page, pinned as fetched.
"""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from html import unescape
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

INDICATOR_ID = "parliament-housing-milestones"
UNIT = "dwellings (net additional)"

PAGE_2024 = (
    "https://www.gov.uk/government/statistics/housing-supply-indicators-of-new-supply-england-april-to-june-2026/"
    "housing-supply-indicators-of-new-supply-england-april-to-june-2026"
)
PAGE_2019 = (
    "https://www.gov.uk/government/publications/measuring-progress-towards-one-million-homes/"
    "measuring-progress-towards-one-million-homes"
)
RAW_2024 = "raw/2026-11-10/indicators_of_new_supply_2026_q2.json"
RAW_2019 = "raw/2026-11-10/measuring_progress_one_million_homes.json"
PINS: tuple[tuple[str, str, str], ...] = (
    (RAW_2024, PAGE_2024.replace("www.gov.uk/", "www.gov.uk/api/content/"), "2026-09-24"),
    (RAW_2019, PAGE_2019.replace("www.gov.uk/", "www.gov.uk/api/content/"), "2024-05-24"),
)
VERSION_2024 = "MHCLG, Housing supply: indicators of new supply, England: April to June 2026 (24 September 2026)"
VERSION_2019 = "DLUHC, Measuring progress towards one million homes (24 May 2024)"

REGIONS: dict[str, str] = {
    "England": "E92000001",
    "North East": "E12000001",
    "North West": "E12000002",
    "Yorkshire and the Humber": "E12000003",
    "East Midlands": "E12000004",
    "West Midlands": "E12000005",
    "East of England": "E12000006",
    "London": "E12000007",
    "South East": "E12000008",
    "South West": "E12000009",
}
MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July", "August",
     "September", "October", "November", "December"], start=1)}


def _day(text: str) -> date:
    d, m, y = text.split()
    return date(int(y), MONTHS[m], int(d))


def period_of(label: str) -> tuple[date, date]:
    """Column label -> (start, end). Unknown labels fail rather than guess."""
    text = re.sub(r"\s+", " ", label).strip()
    if m := re.fullmatch(r"(\d{4})-(\d{2}|\d{4})", text):  # 2024-25 or 2020-2021
        start = int(m.group(1))
        if int(m.group(2)[-2:]) != (start + 1) % 100:
            raise ValueError(f"bad financial year {label!r}")
        return date(start, 4, 1), date(start + 1, 3, 31)
    if m := re.fullmatch(r"(\d{1,2} \w+ \d{4}) to (\d{1,2} \w+ \d{4})", text):
        return _day(m.group(1)), _day(m.group(2))
    if m := re.fullmatch(r"(\d{4}) Q2 to (\d{4}) Q1", text):  # financial-year quarters
        return date(int(m.group(1)), 4, 1), date(int(m.group(2)), 3, 31)
    if m := re.fullmatch(r"Latest delivery update \(up to (\d{1,2} \w+ \d{4})\)", text):
        end = _day(m.group(1))
        return date(end.year if end.month >= 4 else end.year - 1, 4, 1), end
    raise ValueError(f"unknown period label {label!r}")


def html_tables(body: str) -> list[list[list[str]]]:
    tables = []
    for t in re.findall(r"<table.*?</table>", body, re.S):
        rows = []
        for tr in re.findall(r"<tr.*?</tr>", t, re.S):
            cells = [
                re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", "", c))).strip()
                for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)
            ]
            rows.append(cells)
        tables.append(rows)
    return tables


def _num(text: str) -> float | None:
    t = text.replace(",", "").strip()
    return float(t) if re.fullmatch(r"-?\d+(\.\d+)?", t) else None


def _status(method: str) -> str:
    return "final" if method.lower().startswith("outturn") else "estimated"


def _obs(cat: str, series: str, start: date, end: date, geo: str, label: str, value: float,
         status: str, version: str, method: str) -> Observation:
    return Observation(
        indicator_id=INDICATOR_ID,
        period_start=start.isoformat(),
        period_end=end.isoformat(),
        geography_code=geo,
        geography_label=label,
        value=value,
        unit=UNIT,
        observation_status=status,  # type: ignore[arg-type]
        source_version=version,
        notes=f"series={series}; category={cat}; method={method}",
    )


def parse_2024(body: str) -> list[Observation]:
    table = next(t for t in html_tables(body) if t and t[0] and t[0][0] == "Area")
    header = table[0]
    method_row = next(r for r in table if r and r[0].startswith("Method"))
    cumulative = next(i for i, h in enumerate(header) if h.startswith("9 July 2024 to "))
    out: list[Observation] = []
    for row in table[1:]:
        if not row or row[0] not in REGIONS:
            continue  # "Unknown" area and the method row
        for i in range(1, len(header)):
            value = _num(row[i]) if i < len(row) else None
            if value is None:
                continue
            start, end = period_of(header[i])
            method = method_row[i]
            series = "progress-since-start-of-parliament" if i == cumulative else "net-additions-in-period"
            out.append(_obs("parliament-2024", series, start, end, REGIONS[row[0]], row[0], value,
                            _status(method), VERSION_2024, method))
    if not out:
        raise ValueError("2024 milestone table parsed no rows")
    return out


def parse_2019(body: str) -> list[Observation]:
    table = next(t for t in html_tables(body) if t and t[0] and t[0][0] == "Period")
    header = table[0]
    rows = {r[0]: r for r in table[1:] if r}
    period_row = rows["Net additions during relevant period"]
    progress_row = rows["Overall progress towards 1m homes"]
    method_row = next(r for k, r in rows.items() if k.startswith("Method"))
    out: list[Observation] = []
    any_estimated = False  # a running total is only final if every period in it is outturn
    for i in range(1, len(header)):
        start, end = period_of(header[i])
        method = method_row[i]
        status = _status(method)
        any_estimated = any_estimated or status == "estimated"
        for series, row in (("net-additions-in-period", period_row), ("progress-since-start-of-parliament", progress_row)):
            value = _num(row[i])
            if value is not None:
                row_status = "estimated" if series.startswith("progress") and any_estimated else status
                out.append(_obs("parliament-2019", series, start, end, "E92000001", "England", value,
                                row_status, VERSION_2019, method))
    if not out:
        raise ValueError("2019 milestone table parsed no rows")
    return out


class ParliamentHousingMilestonesConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch(self) -> list[RawEvidence]:
        return [self.fetch_url(url, rel, official_release_date=released).evidence for rel, url, released in PINS]

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        out = []
        for rel, url, released in PINS:
            path = self.data_root / rel
            if not path.is_file():
                raise FileNotFoundError(path)
            out.append(RawEvidence(path=rel, retrieved_at=datetime.now(timezone.utc).isoformat(),
                                   checksum_sha256=sha256_file(path), content_type="application/json",
                                   official_release_date=released, source_url=url))
        return out

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        body = lambda rel: json.loads((self.data_root / rel).read_text(encoding="utf-8"))["details"]["body"]
        obs = parse_2024(body(RAW_2024)) + parse_2019(body(RAW_2019))
        obs.sort(key=lambda o: (o.notes.split("category=")[1], o.period_start, o.geography_code, o.notes))
        return obs

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Homes added since the start of Parliament",
            sector="housing-land",
            publisher="MHCLG (DLUHC for the 2019 Parliament)",
            source_url=PAGE_2024,
            series_id="Indicators of new supply Apr-Jun 2026, Parliament table; Measuring progress towards one million homes, Table 1",
            geography="England (E92000001); English regions for category=parliament-2024",
            frequency="ad_hoc",
            unit=UNIT,
            definition=(
                "Net additional homes in England counted from the day a Parliament first met, as the "
                "government measures its housing pledges. category=parliament-2024 counts from "
                "9 July 2024 (the 1.5 million homes milestone); category=parliament-2019 counts from "
                "17 December 2019 (the one million homes manifesto pledge). net-additions-in-period is "
                "each published period; progress-since-start-of-parliament is the published running total."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.parliament_housing_milestones",
            curated_path="curated/observations.csv",
            update_cadence="quarterly with Housing supply: indicators of new supply (2024 Parliament); 2019 note is final",
            raw_evidence=list(evidence),
            transformations=(
                "Parse the HTML tables from the GOV.UK Content API body. Column labels map to dates "
                "explicitly (unknown labels fail). Values copied as published; nothing is apportioned here."
            ),
            caveats=(
                "Periods after the latest annual net additions release are EPC-based estimates "
                "(new-build EPC lodgements less a demolitions allowance), rounded by the publisher and "
                "replaced by outturn later; they are marked estimated. Part years at the start of a "
                "Parliament are split by the publisher using weekly EPC lodgements. The 2024-25 column "
                "of the 2024 table is the whole financial year, including weeks before 9 July 2024. "
                "The 2019 table is a departmental note (May 2024), not an official statistic, and was "
                "not updated after the Parliament ended. Rounded period values may not sum to the total."
            ),
            revision_notes="Pinned Content API JSON of both pages, retrieved 2026-11-10.",
            related_indicator_ids=["net-additional-dwellings", "epc-domestic-lodgements"],
        )


def main() -> None:
    connector = ParliamentHousingMilestonesConnector()
    evidence = connector.fetch() if not (connector.data_root / RAW_2024).is_file() else connector.evidence_from_pinned_raw()
    observations = connector.transform(evidence)
    _, curated = connector.write_hand_off(evidence, observations)
    print(f"{INDICATOR_ID}: {len(observations)} observations -> {curated}")


if __name__ == "__main__":
    main()
