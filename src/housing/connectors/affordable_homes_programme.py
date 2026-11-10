"""Affordable Homes Programme delivery by financial year, England (Homes England + GLA).

Sources:
- Homes England, Housing Statistics June 2026, Table 1 (starts on site and
  completions by programme and tenure; England excluding London except
  programmes Homes England manages for the GLA), full financial-year blocks.
- Greater London Authority, affordable housing statistics (general programmes,
  to end of June 2026), Table 1 (starts and completions by financial year and
  programme), full financial-year blocks only.

Series: series=starts|completions (total affordable homes).
Category:
- ahp-2021-26                 Homes England + GLA, England (the programme total)
- ahp-2021-26-homes-england   Homes England (outside London)
- ahp-2021-26-gla             GLA lines grouped under "AH: 2021-26 programme"
- soahp-2016-21-homes-england Homes England's part of AHP 2016-23 (outside London)

London AHP 2016-23 is not built: the GLA table names its programmes differently
across years ("Homes for Londoners 2016-21", "AH: 2016-23 programme" with
sub-lines) and its lines do not sum to the programme totals MHCLG publishes.

Checks (fail on mismatch is not enforced; see QA): AHP 2021-26 completions to
March 2025 equal the MHCLG annual report 2024-25 (33,072 = 32,201 HE + 871 GLA).
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

INDICATOR_ID = "affordable-homes-programme-delivery"
UNIT = "dwellings (affordable homes)"
ENGLAND = ("E92000001", "England")

RAW_HE = "raw/2026-11-10/Housing_Statistics_tables_June_2026.ods"
RAW_GLA = "raw/2026-11-10/GLA_stats_general_programmes_Q1_2026-27.xlsx"
RAW_AR = "raw/2026-11-10/ahp_annual_report_2024-25.json"
AR_PAGE = (
    "https://www.gov.uk/government/publications/the-affordable-homes-programme-annual-report-2024-to-2025/"
    "the-affordable-homes-programme-annual-report-2024-to-2025"
)
PINS: tuple[tuple[str, str, str, str], ...] = (
    (
        RAW_HE,
        "https://assets.publishing.service.gov.uk/media/6a3bd88ceaee00074150f38b/Housing_Statistics_tables_June_2026.ods",
        "application/vnd.oasis.opendocument.spreadsheet",
        "2026-06-25",
    ),
    (
        RAW_GLA,
        "https://www.london.gov.uk/media/113767/download?attachment",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "2026-08-11",
    ),
    (RAW_AR, AR_PAGE.replace("www.gov.uk/", "www.gov.uk/api/content/"), "application/json", "2026-01-07"),
)
HE_VERSION = "Homes England Housing Statistics June 2026 (25 June 2026)"
AR_VERSION = "MHCLG, The Affordable Homes Programme annual report 2024 to 2025 (7 January 2026)"
GLA_VERSION = "GLA affordable housing statistics, general programmes, to end of June 2026 (11 August 2026)"

HE_PROGRAMMES: tuple[tuple[str, str], ...] = (
    ("Affordable Homes Programme 2021-26", "ahp-2021-26-homes-england"),
    ("Shared Ownership and Affordable Homes Programme 2016-21", "soahp-2016-21-homes-england"),
)


def fy_bounds(label: str) -> tuple[str, str]:
    """'2021/22' or '2021-22' -> ('2021-04-01', '2022-03-31')."""
    m = re.fullmatch(r"(\d{4})[/-](\d{2})", label.strip())
    if not m or int(m.group(2)) != (int(m.group(1)) + 1) % 100:
        raise ValueError(f"not a financial-year label: {label!r}")
    start = int(m.group(1))
    return f"{start:04d}-04-01", f"{start + 1:04d}-03-31"


def _num(raw: object) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace(",", "")
    if not text or text in {"..", "-", "x", "[x]"}:
        return None
    return float(text)


def parse_homes_england(path: Path) -> dict[tuple[str, str, str], float]:
    """(fy, category, series) -> value from full financial-year blocks of Table 1."""
    rows = read_ods_sheet(path, "Table_1")
    header = next(r for r in rows if sum("Total Affordable" in c for c in r) == 2)
    cols = [i for i, c in enumerate(header) if "Total Affordable" in c]
    starts_col, completions_col = cols
    out: dict[tuple[str, str, str], float] = {}
    fy: str | None = None
    for r in rows:
        first = r[0].strip() if r else ""
        label = r[1].strip() if len(r) > 1 else ""
        if re.fullmatch(r"\d{4}/\d{2}", first):  # half-year block opens (April to September)
            fy = None
            continue
        if re.fullmatch(r"\d{4}/\d{2}", label):  # full-year block
            fy = label
            continue
        if label.startswith(("April", "October")):
            fy = None
            continue
        if fy is None:
            continue
        for prefix, category in HE_PROGRAMMES:
            if label.startswith(prefix):
                for col, series in ((starts_col, "starts"), (completions_col, "completions")):
                    value = _num(r[col]) if col < len(r) else None
                    if value is not None:
                        out[(fy, category, series)] = value
    if not out:
        raise ValueError("Homes England Table 1 parsed no programme rows")
    return out


def parse_gla(path: Path) -> dict[tuple[str, str, str], float]:
    """(fy, 'ahp-2021-26-gla', series) -> value, summing lines under 'AH: 2021-26 programme'."""
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb["Table 1 - Programme & Tenure"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    header = next(r for r in rows if any(isinstance(c, str) and "Total Affordable Starts" in c for c in r))
    starts_col = next(i for i, c in enumerate(header) if isinstance(c, str) and "Total Affordable Starts" in c)
    completions_col = next(
        i for i, c in enumerate(header) if isinstance(c, str) and "Total Affordable Completions" in c
    )
    out: dict[tuple[str, str, str], float] = defaultdict(float)
    fy: str | None = None
    in_group = False
    for r in rows:
        first = str(r[0]).strip() if r and r[0] is not None else ""
        label = str(r[1]).strip() if len(r) > 1 and r[1] is not None else ""
        if re.fullmatch(r"\d{4}-\d{2}", first):
            # Only full financial years ("April 2025 - March 2026"); the partial current year is skipped.
            fy = first if re.match(r"April \d{4} - March \d{4}", label) else None
            in_group = False
            continue
        if fy is None:
            continue
        if label.startswith("AH:") or label.startswith("Other programmes") or label.endswith("Total"):
            in_group = label.replace(" ", "").startswith("AH:2021-26programme")
            continue
        if in_group and label:
            for col, series in ((starts_col, "starts"), (completions_col, "completions")):
                value = _num(r[col])
                if value is not None:
                    out[(fy.replace("-", "/"), "ahp-2021-26-gla", series)] += value
    if not out:
        raise ValueError("GLA Table 1 parsed no AHP 2021-26 rows")
    return dict(out)


# ---------------------------------------------------------------- annual report (cumulative)

AR_REGIONS: dict[str, tuple[str, str]] = {
    "North East": ("E12000001", "North East"),
    "North West": ("E12000002", "North West"),
    "Yorkshire and The Humber": ("E12000003", "Yorkshire and The Humber"),
    "East Midlands": ("E12000004", "East Midlands"),
    "West Midlands": ("E12000005", "West Midlands"),
    "East of England": ("E12000006", "East of England"),
    "South East": ("E12000008", "South East"),
    "South West": ("E12000009", "South West"),
}
AR_PROGRAMMES: tuple[tuple[str, str, str], ...] = (
    # (section heading, category, programme start)
    ("The Affordable Homes Programme for 2021 to 2026", "ahp-2021-26", "2021-04-01"),
    ("The Affordable Homes Programme for 2016 to 2023", "ahp-2016-23", "2016-04-01"),
)
AR_AS_AT = "2025-03-31"


def _clean(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _tables(fragment: str) -> list[list[list[str]]]:
    return [
        [[_clean(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)] for tr in re.findall(r"<tr.*?</tr>", tb, re.S)]
        for tb in re.findall(r"<table.*?</table>", fragment, re.S)
    ]


def _int(text: str) -> float:
    m = re.match(r"([\d,]+)", text.strip())
    if not m:
        raise ValueError(f"not a number: {text!r}")
    return float(m.group(1).replace(",", ""))


def parse_annual_report(path: Path) -> list[Observation]:
    """Cumulative starts and completions to 31 March 2025, per programme (England, London, HE regions)."""
    body = json.loads(path.read_text(encoding="utf-8"))["details"]["body"]
    out: list[Observation] = []

    def obs(series: str, category: str, start: str, geo: tuple[str, str], value: float, where: str) -> None:
        out.append(
            Observation(
                indicator_id=INDICATOR_ID, period_start=start, period_end=AR_AS_AT,
                geography_code=geo[0], geography_label=geo[1], value=value, unit=UNIT,
                observation_status="final", source_version=AR_VERSION,
                notes=f"series={series}; category={category}; agency={where}; cumulative to 31 March 2025; total affordable homes",
            )
        )

    for i, (heading, category, start) in enumerate(AR_PROGRAMMES):
        begin = body.index(heading)
        ends = [body.find(h, begin + 1) for h, _, _ in AR_PROGRAMMES if body.find(h, begin + 1) > begin]
        ends.append(body.find("Further information on programme delivery", begin))
        section = body[begin : min(e for e in ends if e > begin)]
        text = _clean(section)
        tables = _tables(section)
        totals = [t for t in tables if t and t[0][:2] == ["Type", "Homes"]]
        regional = next(t for t in tables if t and t[0] == ["Region", "Starts", "Completions"])
        if len(totals) != 3:
            raise ValueError(f"{category}: expected England, London and Homes England tenure tables")
        england_c, london_c, he_c = (_int(t[-1][1]) for t in totals)
        m = re.search(r"had delivered ([\d,]+) starts", text)
        if not m:
            raise ValueError(f"{category}: England starts sentence not found")
        obs("cumulative-starts", category, start, ("E92000001", "England"), _int(m.group(1)), "Homes England + GLA")
        obs("cumulative-completions", category, start, ("E92000001", "England"), england_c, "Homes England + GLA")
        obs("cumulative-completions", category, start, ("E12000007", "London"), london_c, "GLA")
        he_s = he_c_check = 0.0
        for row in regional[1:]:
            if row[0] == "Totals":
                if _int(row[1]) != he_s or _int(row[2]) != he_c_check or _int(row[2]) != he_c:
                    raise ValueError(f"{category}: Homes England regional rows do not sum to totals")
                continue
            geo = AR_REGIONS[row[0]]
            obs("cumulative-starts", category, start, geo, _int(row[1]), "Homes England")
            obs("cumulative-completions", category, start, geo, _int(row[2]), "Homes England")
            he_s += _int(row[1])
            he_c_check += _int(row[2])
        if abs(london_c + he_c - england_c) > 1:
            raise ValueError(f"{category}: London {london_c} + HE {he_c} != England {england_c}")
    return out


def build_observations(he: dict, gla: dict) -> list[Observation]:
    values = {**he, **gla}
    combined: dict[tuple[str, str], float] = defaultdict(float)
    for (fy, category, series), v in values.items():
        if category in ("ahp-2021-26-homes-england", "ahp-2021-26-gla"):
            combined[(fy, series)] += v
    for (fy, series), v in combined.items():
        values[(fy, "ahp-2021-26", series)] = v

    out: list[Observation] = []
    for (fy, category, series), v in sorted(values.items()):
        start, end = fy_bounds(fy)
        agency = {
            "ahp-2021-26": "Homes England + GLA",
            "ahp-2021-26-homes-england": "Homes England",
            "ahp-2021-26-gla": "GLA",
            "soahp-2016-21-homes-england": "Homes England",
        }[category]
        version = GLA_VERSION if category == "ahp-2021-26-gla" else HE_VERSION
        if category == "ahp-2021-26":
            version = f"{HE_VERSION}; {GLA_VERSION}"
        out.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code=ENGLAND[0],
                geography_label=ENGLAND[1],
                value=v,
                unit=UNIT,
                observation_status="final",
                source_version=version,
                notes=(
                    f"series={series}; category={category}; agency={agency}; "
                    "total affordable homes; financial-year"
                ),
            )
        )
    return out


class AffordableHomesProgrammeConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        out: list[RawEvidence] = []
        for rel, url, ctype, released in PINS:
            path = self.data_root / rel
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

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        he = parse_homes_england(self.data_root / RAW_HE)
        gla = parse_gla(self.data_root / RAW_GLA)
        return build_observations(he, gla) + parse_annual_report(self.data_root / RAW_AR)

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Affordable Homes Programme delivery",
            sector="housing-land",
            publisher="Homes England; Greater London Authority; MHCLG",
            source_url="https://www.gov.uk/government/collections/housing-statistics",
            series_id="Homes England Housing Statistics Table 1; GLA affordable housing statistics Table 1; MHCLG AHP annual report 2024-25",
            geography="England (E92000001); Homes England categories are England outside London",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Affordable homes started on site and completed each financial year with funding from "
                "the Affordable Homes Programme. category=ahp-2021-26 adds Homes England (outside "
                "London) and the GLA (London) for the 2021 to 2026 programme; the agency categories "
                "give each part. category=soahp-2016-21-homes-england is Homes England's part of the "
                "2016 to 2023 programme (named Shared Ownership and Affordable Homes Programme "
                "2016-21), outside London only. series=cumulative-starts|cumulative-completions are the "
                "programme totals to 31 March 2025 from the MHCLG annual report (England, London, and "
                "Homes England regions), for category=ahp-2016-23 and ahp-2021-26."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.affordable_homes_programme",
            curated_path="curated/observations.csv",
            update_cadence="Homes England twice a year (June, December); GLA quarterly",
            raw_evidence=list(evidence),
            transformations=(
                "Homes England: full financial-year blocks of Table 1, Total Affordable starts and "
                "completions for the two programmes. GLA: full financial-year blocks of Table 1, "
                "summing every line under 'AH: 2021-26 programme'; the partial current year is "
                "skipped. ahp-2021-26 = Homes England + GLA by year. Annual report: tables and the England "
                "starts sentence parsed from the GOV.UK Content API body; London + Homes England must equal "
                "England, and regions must sum to the Homes England totals."
            ),
            caveats=(
                "Programme homes only: this is a subset of all affordable housing supply and differs "
                "from Live Table 1000. The GLA reports no 2021 to 2026 programme lines before "
                "2023-24, so earlier England totals are Homes England only. Homes England starts to "
                "March 2025 are 942 below the MHCLG annual report (76,265 vs 77,207); completions "
                "match it exactly. London's 2016 to 2023 programme is not included because the GLA "
                "lines cannot be mapped to the programme total. Starts and completions are different "
                "milestones: completions continue after the start deadline (March 2026, with limited "
                "exceptions) to March 2029 outside London."
            ),
            revision_notes="Pinned Homes England June 2026 tables and GLA Q1 2026-27 general programmes file, retrieved 2026-11-10.",
            related_indicator_ids=["affordable-housing-supply"],
            open_questions=[
                "London AHP 2016-23 delivery by year: needs a GLA programme mapping that reconciles with the MHCLG total (116,782 starts).",
            ],
        )


def main() -> None:
    connector = AffordableHomesProgrammeConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform(evidence)
    _, curated = connector.write_hand_off(evidence, observations)
    print(f"{INDICATOR_ID}: {len(observations)} observations -> {curated}")


if __name__ == "__main__":
    main()
