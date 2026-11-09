"""DESNZ ET 1.3 — UK fossil fuel dependency (ratio).

Sibling of energy-import-dependency: same pinned workbook, column
'Fossil fuel dependency [note 6]'. Separate indicator — never a security score.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.paths import ENERGY_DATA

from energy.connectors.et13_dependency_sheets import (
    EXPECTED_CHECKSUM,
    OFFICIAL_RELEASE_DATE,
    PINNED_ASSET_URL,
    PINNED_RAW_RELATIVE,
    SOURCE_LANDING_URL,
    SOURCE_VERSION,
    parse_et13_ratio_column,
)

INDICATOR_ID = "fossil-fuel-dependency"
SIBLING_RAW = ENERGY_DATA / "energy-import-dependency" / PINNED_RAW_RELATIVE


class FossilFuelDependencyConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ENERGY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def ensure_pinned_raw(self) -> Path:
        target = self.data_root / PINNED_RAW_RELATIVE
        if not target.is_file():
            if not SIBLING_RAW.is_file():
                raise FileNotFoundError(
                    f"Pinned raw missing at {target} and sibling {SIBLING_RAW}."
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(SIBLING_RAW, target)
        checksum = sha256_file(target)
        if checksum != EXPECTED_CHECKSUM:
            raise RuntimeError(
                f"Pinned raw checksum mismatch for {target}: "
                f"got {checksum}, expected {EXPECTED_CHECKSUM}"
            )
        return target

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Fossil fuel dependency",
            sector="energy-industry",
            publisher="DESNZ",
            source_url=SOURCE_LANDING_URL,
            series_id="ET 1.3 (Fossil fuel dependency [note 6], ratio, annual + quarterly)",
            geography="UK (K02000001)",
            frequency="annual+quarterly",
            unit="ratio",
            definition=(
                "UK fossil fuel dependency from Energy Trends ET 1.3 sheets "
                "'Annual dependency & low carbon' and 'Quarter dependency & low carbon', "
                "column 'Fossil fuel dependency [note 6]'. Workbook ratios "
                "(e.g. 0.88 ≈ 88%). Notes: measure=fossil_fuel_dependency; "
                "basis=annual|quarterly. Not a resilience or security score."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="energy",
            connector_module="energy.connectors.fossil_fuel_dependency",
            curated_path="curated/observations.csv",
            update_cadence=(
                "Quarterly — Energy Trends ET 1.3, last Thursday of Mar/Jun/Sep/Dec"
            ),
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                f"Parse Fossil fuel dependency [note 6] from {SOURCE_VERSION} Annual and "
                "Quarter dependency sheets. Preserve Excel decimal ratios. "
                "Same workbook as energy-import-dependency and low-carbon-energy-share."
            ),
            caveats=(
                "Ratio as stored by DESNZ (not percentage points). Distinct from import "
                "dependency and low carbon share — never combine into one security index. "
                "GOV.UK asset URLs change each release."
            ),
            revision_notes=(
                "ET_1.3_SEP_26 published 29 Sep 2026; Q2 2026 provisional on quarter sheet."
            ),
            related_indicator_ids=[
                "energy-import-dependency",
                "low-carbon-energy-share",
                "energy-imports-and-exports",
            ],
            open_questions=["Storage / diversity measures remain separate Gate 3 series."],
        )

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.ensure_pinned_raw()
        return RawEvidence(
            path=PINNED_RAW_RELATIVE,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
            official_release_date=OFFICIAL_RELEASE_DATE,
            http_status=None,
            source_url=PINNED_ASSET_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]):
        if not evidence:
            raise ValueError("transform() requires at least one RawEvidence entry")
        workbook = self.data_root / evidence[0].path
        if not workbook.is_file():
            raise FileNotFoundError(f"Raw workbook not found: {workbook}")
        return parse_et13_ratio_column(
            workbook,
            indicator_id=self.indicator_id,
            measure="fossil_fuel_dependency",
        )


def main() -> None:
    connector = FossilFuelDependencyConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    annual = sum(1 for o in observations if "basis=annual" in o.notes)
    quarterly = sum(1 for o in observations if "basis=quarterly" in o.notes)
    print(f"indicator_id: {connector.indicator_id}")
    print(f"raw: {evidence.path} sha256={evidence.checksum_sha256}")
    print(f"observations: {len(observations)} (annual={annual}, quarterly={quarterly})")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
