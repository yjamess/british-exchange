"""English Housing Survey 2024–25 age cohorts — housing cost as a share of income.

Annex Table 2.7 (ages 16–34) and Annex Table 4.4 (ages 65 or over) publish the
mean and median share of gross household income spent on a mortgage, private
rent or social rent. Chapter 3, ages 35–64, does not publish this measure.

ODS is a zip of XML. The standard library reads it; we do not add a spreadsheet
package for two tables. https://docs.python.org/3/library/zipfile.html

Run from the repo root:

    uv run python -m housing.connectors.ehs_housing_costs_by_age
"""

from __future__ import annotations

import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

from britain_exchange.checksum import sha256_file
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data/housing/ehs-housing-costs-by-age"
RAW = DATA / "raw"
OUT = DATA / "curated/costs-by-age.json"

PUBLICATION = "https://www.gov.uk/government/statistics/english-housing-survey-2024-to-2025-age-cohorts"
COLLECTION = "https://www.gov.uk/government/collections/english-housing-survey"
RELEASED = "2026-05-14"

TABLE = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
TEXT = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"

# One blank column separates each block. Indexes are into the parsed row,
# whose first cell is empty because the sheet label sits in column B.
TENURE_IDS = ("mortgage", "private-rent", "social-rent")
TENURE_LABELS = {
    "mortgage": "Buying with a mortgage",
    "private-rent": "Private rent",
    "social-rent": "Social rent",
}
BLOCKS = {
    "latest-mean": (2, 3, 4),
    "latest-median": (6, 7, 8),
    "earlier-mean": (10, 11, 12),
    "earlier-median": (14, 15, 16),
    "latest-sample": (18, 19, 20),
    "earlier-sample": (22, 23, 24),
}
SECTIONS = {
    "region": "region",
    "weekly household income quintile": "income",
    "dependent children": "children",
}

WORKBOOKS = (
    {
        "file": "EHS_24-25_Age_Cohorts_Chapter_2_Annex_Tables.ods",
        "url": "https://assets.publishing.service.gov.uk/media/6a0200538cc72d2f863ea775/EHS_24-25_Age_Cohorts_Chapter_2_Annex_Tables.ods",
        "sheet": "AT_2_7",
        "age": "16 to 34",
        "table": "Annex Table 2.7",
    },
    {
        "file": "EHS_24-25_Age_Cohorts_Chapter_4_Annex_Tables.ods",
        "url": "https://assets.publishing.service.gov.uk/media/6a01fff64fb0713aa63ea75d/EHS_24-25_Age_Cohorts_Chapter_4_Annex_Tables.ods",
        "sheet": "AT_4_4",
        "age": "65 and over",
        "table": "Annex Table 4.4",
    },
)


def _cell_text(cell: ET.Element) -> str:
    parts: list[str] = []
    for node in cell.iter(f"{TEXT}p"):
        if node.text:
            parts.append(node.text)
        for child in list(node):
            if child.text:
                parts.append(child.text)
            if child.tail:
                parts.append(child.tail)
    return " ".join(parts).strip()


def _row_values(row: ET.Element) -> list[str]:
    """Keep the single blank separator columns. Drop the unused sheet width."""
    values: list[str] = []
    for cell in row.findall(f"{TABLE}table-cell"):
        repeated = int(cell.get(f"{TABLE}number-columns-repeated") or "1")
        text = _cell_text(cell)
        if text == "" and repeated > 3:
            values.append("")
        else:
            values.extend([text] * min(repeated, 30))
    while values and values[-1] == "":
        values.pop()
    return values


def _sheet_rows(path: Path, sheet_name: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as package:
        root = ET.fromstring(package.read("content.xml"))
    for sheet in root.findall(f".//{TABLE}table"):
        if sheet.get(f"{TABLE}name") == sheet_name:
            return [_row_values(row) for row in sheet.findall(f"{TABLE}table-row")]
    raise ValueError(f"{path.name} has no sheet {sheet_name}")


def _number(raw: str) -> float | None:
    cleaned = raw.replace(",", "").replace("%", "").strip()
    if cleaned.lower() in {"", "u", ":", "..", "-", "–"}:
        return None
    return float(cleaned)


def _cell(row: list[str], index: int, *, whole: bool) -> float | None:
    if index >= len(row):
        return None
    value = _number(row[index])
    if value is None:
        return None
    return float(int(value)) if whole else value


def _parse_sheet(path: Path, spec: dict[str, str]) -> dict[str, object]:
    rows = _sheet_rows(path, spec["sheet"])
    header = next((row for row in rows if len(row) > 4 and row[2] == "all mortgagors"), None)
    if header is None or header[3] != "private renters" or header[4] != "all social renters":
        raise ValueError(f"{spec['sheet']} tenure header moved; refusing to guess columns")

    base = next((row[1] for row in rows if len(row) > 1 and row[1].startswith("all households")), "")
    group = ""
    parsed: list[dict[str, object]] = []
    for row in rows:
        label = row[1] if len(row) > 1 else ""
        if label in SECTIONS:
            group = SECTIONS[label]
            continue
        if not label or label.startswith("Annex") or label.startswith("Notes") or label.startswith("Source"):
            continue
        if label[0].isdigit() and ")" in label[:3]:
            continue
        if len(row) < 25 or row[2] in {"", "all mortgagors"}:
            continue
        row_group = "total" if label == "all households" else group
        if not row_group:
            continue
        tenures: list[dict[str, object]] = []
        for offset, tenure_id in enumerate(TENURE_IDS):
            tenures.append(
                {
                    "id": tenure_id,
                    "label": TENURE_LABELS[tenure_id],
                    "latest": {
                        "mean": _cell(row, BLOCKS["latest-mean"][offset], whole=False),
                        "median": _cell(row, BLOCKS["latest-median"][offset], whole=False),
                        "sample": _cell(row, BLOCKS["latest-sample"][offset], whole=True),
                    },
                    "earlier": {
                        "mean": _cell(row, BLOCKS["earlier-mean"][offset], whole=False),
                        "median": _cell(row, BLOCKS["earlier-median"][offset], whole=False),
                        "sample": _cell(row, BLOCKS["earlier-sample"][offset], whole=True),
                    },
                }
            )
        parsed.append({"group": row_group, "place": label, "tenures": tenures})
    if not any(row["place"] == "all households" for row in parsed):
        raise ValueError(f"{spec['sheet']} has no England 'all households' row")
    return {
        "age": spec["age"],
        "table": spec["table"],
        "base": base,
        "rows": parsed,
    }


def _england_mean(payload: dict[str, object], age: str, tenure_id: str) -> float | None:
    cohorts = payload["cohorts"]
    if not isinstance(cohorts, list):
        return None
    for cohort in cohorts:
        if cohort["age"] != age:
            continue
        for row in cohort["rows"]:
            if row["place"] != "all households":
                continue
            for tenure in row["tenures"]:
                if tenure["id"] == tenure_id:
                    mean = tenure["latest"]["mean"]
                    return float(mean) if isinstance(mean, (int, float)) else None
    return None


def build_payload() -> dict[str, object]:
    cohorts = [_parse_sheet(RAW / spec["file"], spec) for spec in WORKBOOKS]
    payload: dict[str, object] = {
        "publisher": "Ministry of Housing, Communities and Local Government",
        "series": "EHS 2024-25 age cohorts, Annex Tables 2.7 and 4.4",
        "title": "Housing costs as a share of income by age",
        "geography": "England",
        "url": PUBLICATION,
        "collectionUrl": COLLECTION,
        "unit": "percent of gross household income",
        "release": "14 May 2026",
        "latestYear": "2024-25",
        "earlierYear": "2014-15",
        "note": (
            "Share of gross household income spent on the mortgage or the rent, "
            "including housing support and excluding service charges. Shared owners "
            "are excluded. A blank cell was published as unreliable (u) or was not "
            "available. Ages 35 to 64 are not in these tables."
        ),
        "unpublishedAges": [
            {
                "age": "35 to 64",
                "reason": (
                    "Chapter 3 of the 2024-25 age-cohorts annex does not publish "
                    "housing costs as a share of income."
                ),
            }
        ],
        "cohorts": cohorts,
    }
    # Pinned cells from the England 'all households' rows. A column shift fails here.
    expected = {("16 to 34", "private-rent"): 36.4, ("65 and over", "mortgage"): 16.2}
    for (age, tenure_id), want in expected.items():
        got = _england_mean(payload, age, tenure_id)
        if got != want:
            raise ValueError(f"England {age} {tenure_id} mean is {got}, expected {want}")
    return payload


def _evidence() -> list[RawEvidence]:
    retrieved = datetime.now(timezone.utc).isoformat()
    evidence: list[RawEvidence] = []
    for spec in WORKBOOKS:
        path = RAW / spec["file"]
        if not path.is_file():
            raise FileNotFoundError(f"Pin the workbook at {path}")
        evidence.append(
            RawEvidence(
                path=f"raw/{spec['file']}",
                retrieved_at=retrieved,
                checksum_sha256=sha256_file(path),
                content_type="application/vnd.oasis.opendocument.spreadsheet",
                official_release_date=RELEASED,
                source_url=spec["url"],
            )
        )
    return evidence


def main() -> None:
    payload = build_payload()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    manifest = Manifest(
        indicator_id="ehs-housing-costs-by-age",
        title="Housing costs as a share of income by age",
        sector="housing-land",
        publisher="Ministry of Housing, Communities and Local Government",
        source_url=PUBLICATION,
        series_id="EHS 2024-25 age cohorts AT2.7 and AT4.4",
        geography="England",
        frequency="annual",
        unit="percent of gross household income",
        definition=(
            "Mean and median share of gross household income spent on a mortgage, "
            "private rent or social rent, for household reference persons aged "
            "16 to 34 and 65 or over. Survey years 2024-25 and 2014-15."
        ),
        licence="Open Government Licence v3.0",
        agent_owner="housing",
        connector_module="housing.connectors.ehs_housing_costs_by_age",
        curated_path="curated/costs-by-age.json",
        update_cadence="annual, with the English Housing Survey age-cohorts release",
        raw_evidence=_evidence(),
        transformations=(
            "Read Annex Tables 2.7 and 4.4. Keep region, income, children and "
            "England total rows. Map the six published blocks (mean, median, sample "
            "for 2024-25 and 2014-15) onto mortgage, private rent and social rent."
        ),
        caveats=(
            "Ages 35 to 64 are unpublished in this release. Cells marked u are "
            "withheld. Means sit above medians where the lowest income fifth spends "
            "a much larger share. This is not a house-price-to-earnings ratio."
        ),
        revision_notes="Pinned 5 November 2026 from the 14 May 2026 publication.",
    )
    manifest_path = save_manifest(DATA / "manifest.yaml", manifest)
    cohorts = payload["cohorts"]
    count = len(cohorts) if isinstance(cohorts, list) else 0
    print(f"wrote {OUT.relative_to(ROOT)} cohorts={count}")
    print(f"manifest: {manifest_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
