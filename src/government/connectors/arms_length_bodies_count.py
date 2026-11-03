"""Arm's-length bodies count — Cabinet Office Public Bodies Directory.

Approach:
1. Pin Public Bodies Directory 2023/24 workbook.
2. Read Headlines ``Number Of ALBs`` (authoritative total; Data sheet packs groups).
3. Emit one annual observation for FY 2023/24.
"""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import GOVERNMENT_DATA
from government.connectors._util import evidence_from_file

INDICATOR_ID = "arms-length-bodies-count"
UK_CODE, UK_LABEL = "K02000001", "United Kingdom"
PINNED = "raw/2026-11-03/Public_Bodies_Directory_2023_24.xlsx"
SOURCE_LANDING = "https://www.gov.uk/government/publications/public-bodies-2024"
SOURCE_ASSET = (
    "https://assets.publishing.service.gov.uk/media/"
    "697897e25da1fd4ddea98bda/2025-05-29_Public_Bodies_Directory_2023_24.xlsx"
)
UNIT = "count of ALBs"
SOURCE_VERSION = "Public Bodies Directory 2023/24"


def _read_headlines_pairs(path: Path) -> list[tuple[str, float]]:
    """Parse Headlines sheet via ZIP/XML (workbook has broken drawing links)."""
    import zipfile
    from xml.etree import ElementTree as ET

    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with zipfile.ZipFile(path) as archive:
        # Resolve Headlines sheet path from workbook.xml
        wb = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = wb.findall("m:sheets/m:sheet", ns)
        headlines = next(
            (s for s in sheets if s.attrib.get("name") == "Headlines"),
            None,
        )
        if headlines is None:
            raise ValueError("Headlines sheet missing from workbook.xml")
        rel_id = headlines.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_ns = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
        target = next(
            r.attrib["Target"]
            for r in rels.findall("r:Relationship", rel_ns)
            if r.attrib.get("Id") == rel_id
        )
        sheet_path = "xl/" + target.lstrip("/")
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            sst = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for si in sst.findall("m:si", ns):
                texts = [t.text or "" for t in si.findall(".//m:t", ns)]
                shared.append("".join(texts))
        root = ET.fromstring(archive.read(sheet_path))

    def cell_value(cell: ET.Element) -> str | float | None:
        cell_type = cell.attrib.get("t")
        value_el = cell.find("m:v", ns)
        if value_el is None or value_el.text is None:
            return None
        if cell_type == "s":
            return shared[int(value_el.text)]
        try:
            return float(value_el.text)
        except ValueError:
            return value_el.text

    pairs: list[tuple[str, float]] = []
    for row in root.findall("m:sheetData/m:row", ns):
        cells = {c.attrib.get("r", "")[:1]: cell_value(c) for c in row.findall("m:c", ns)}
        # Columns A/B on Headlines
        label = cells.get("A")
        value = cells.get("B")
        if isinstance(label, str) and isinstance(value, (int, float)):
            pairs.append((label, float(value)))
    return pairs


def parse_alb_count(path: Path) -> list[Observation]:
    value = None
    for label, raw in _read_headlines_pairs(path):
        if " ".join(label.split()).casefold() == "number of albs":
            value = float(raw)
            break
    if value is None:
        raise ValueError("Number Of ALBs not found on Headlines sheet")
    return [
        Observation(
            indicator_id=INDICATOR_ID,
            period_start="2023-04-01",
            period_end="2024-03-31",
            geography_code=UK_CODE,
            geography_label=UK_LABEL,
            value=value,
            unit=UNIT,
            observation_status="final",
            source_version=SOURCE_VERSION,
            notes="series=Public Bodies Directory; classification=Cabinet Office ALB",
        )
    ]


class ArmsLengthBodiesCountConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (GOVERNMENT_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Arm's-length bodies count",
            sector="government-politics",
            publisher="Cabinet Office",
            source_url=SOURCE_LANDING,
            series_id="Public Bodies Directory — Number Of ALBs",
            geography="United Kingdom (K02000001)",
            frequency="annual",
            unit=UNIT,
            definition=(
                "Count of UK government Arm's-Length Bodies (executive agencies, "
                "NDPBs, non-ministerial departments) as reported in the Cabinet "
                "Office Public Bodies Directory Headlines table."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="government",
            connector_module="government.connectors.arms_length_bodies_count",
            curated_path="curated/observations.csv",
            update_cadence="annual (Public Bodies / ALB Landscape Analysis)",
            raw_evidence=list(evidence),
            notion_registry_url="https://app.notion.com/40d6547176858168bdd5f0ea9dc794f3",
            transformations=(
                "Read Headlines sheet Variable=Number Of ALBs. Do not re-sum Data "
                "rows (some bodies are packed with overall_body_numbers>1)."
            ),
            caveats=(
                "Classification and scope change over time; historical Public Bodies "
                "releases are not strictly comparable. Single FY point in this pin."
            ),
            revision_notes="Directory published May 2025 / updated Jan 2026; FY 2023/24.",
            open_questions=["Backfill prior Public Bodies editions for a longer series."],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        return evidence_from_file(
            self.data_root,
            PINNED,
            source_url=SOURCE_ASSET,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date="2025-05-29",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_alb_count(self.data_root / evidence[0].path)


def main() -> None:
    connector = ArmsLengthBodiesCountConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    print(f"indicator_id: {connector.indicator_id} value={observations[0].value}")
    print(manifest_path, curated_path)


if __name__ == "__main__":
    main()
