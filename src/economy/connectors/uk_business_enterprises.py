"""ONS UK Business 2026 — VAT/PAYE registered enterprises by industry and region."""

from __future__ import annotations

import hashlib
import re
import shutil
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "uk-business-enterprises"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.ons.gov.uk/businessindustryandtrade/business/activitysizeandlocation/"
    "datasets/ukbusinessactivitysizeandlocation"
)
FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/businessindustryandtrade/business/"
    "activitysizeandlocation/datasets/ukbusinessactivitysizeandlocation/2026/"
    "ukbusinessworkbook2026.xlsx"
)
OFFICIAL_RELEASE = "2026-09-24"
SNAPSHOT_YEAR = 2026


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48] or "x"


class UkBusinessEnterprisesConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="UK business enterprises",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=LANDING,
            series_id="UK-business-2026",
            geography="United Kingdom + nations/regions",
            frequency="annual",
            unit="VAT and/or PAYE enterprise count",
            definition=(
                "Count of VAT and/or PAYE registered enterprises from the IDBR "
                "snapshot (UK Business: activity, size and location 2026). "
                "Not the full unregistered business population."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.uk_business_enterprises",
            curated_path="curated/observations.csv",
            update_cadence="annual (ONS UK Business)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Parse Table 1 (broad industry × geography) UK and region rows; "
                "series=industry slug; category=industry."
            ),
            revision_notes=f"UK Business 2026 published {OFFICIAL_RELEASE}.",
            caveats=(
                "Registered enterprises only. Enterprise location is head office / "
                "main site — not local units."
            ),
            related_indicator_ids=["business-demography"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/ukbusinessworkbook2026.xlsx"
        dest = self.data_root / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        local = Path("/tmp/bx-trade09/ukbusiness.xlsx")
        if local.is_file():
            shutil.copy2(local, dest)
            status, ctype = 200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:
            req = urllib.request.Request(FILE_URL, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as resp:
                dest.write_bytes(resp.read())
                status = int(getattr(resp, "status", 200) or 200)
                ctype = resp.headers.get("Content-Type", "application/octet-stream")
        return [
            RawEvidence(
                path=relative,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                content_type=ctype,
                official_release_date=OFFICIAL_RELEASE,
                http_status=status,
                source_url=FILE_URL,
            )
        ]

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        path = self.data_root / evidence[0].path
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb["Table 1"]
        rows = list(ws.iter_rows(values_only=True))
        header = None
        for row in rows[:10]:
            if row and any(isinstance(c, str) and "Agriculture" in c for c in row[1:5]):
                header = row
                break
        if header is None:
            wb.close()
            raise ValueError("UK Business Table 1 industry header not found")
        industries: list[tuple[int, str, str]] = []
        for col, label in enumerate(header[1:], start=1):
            if not isinstance(label, str) or not label.strip():
                continue
            industries.append((col, _slug(label.split(":")[-1].strip() or label), label.strip()))

        out: list[Observation] = []
        start, end = f"{SNAPSHOT_YEAR}-01-01", f"{SNAPSHOT_YEAR}-12-31"
        for row in rows:
            if not row or row[0] is None:
                continue
            cell = str(row[0]).strip()
            if ":" not in cell:
                continue
            code, name = [p.strip() for p in cell.split(":", 1)]
            # Keep UK, GB, nations and English regions (E12*)
            if not (
                code.startswith(("K0", "E92", "W92", "S92", "N92", "E12"))
                or code in {"K02000001", "K03000001"}
            ):
                continue
            for col, slug, label in industries:
                raw = row[col] if col < len(row) else None
                if raw is None or raw == "":
                    continue
                try:
                    value = float(raw)
                except (TypeError, ValueError):
                    continue
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code=code,
                        geography_label=name,
                        value=value,
                        unit="enterprise count",
                        observation_status="final",
                        source_version=f"ONS UK Business {SNAPSHOT_YEAR} ({OFFICIAL_RELEASE})",
                        notes=(
                            f"series={slug}; category={slug}; industry={slug}; "
                            f"label={label}; annual; vat-paye"
                        ),
                    )
                )
        wb.close()
        if not out:
            raise ValueError("No UK business enterprise observations")
        return out


def main() -> None:
    connector = UkBusinessEnterprisesConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    m, c = connector.write_hand_off(evidence, observations)
    (connector.data_root / "README.md").write_text(
        "# UK business enterprises\n\n"
        "```bash\nuv run python -m economy.connectors.uk_business_enterprises\n```\n",
        encoding="utf-8",
    )
    (connector.data_root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(INDICATOR_ID, len(observations), m)


if __name__ == "__main__":
    main()
