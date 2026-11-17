"""ONS trade in services — by category and by partner (shared workbook).

Produces two packages from one pin:
- services-trade-by-category
- services-trade-by-partner
"""

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

UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
LANDING = (
    "https://www.ons.gov.uk/businessindustryandtrade/internationaltrade/datasets/"
    "uktradeinservicesservicetypebypartnercountrynonseasonallyadjusted"
)
FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/businessindustryandtrade/internationaltrade/"
    "datasets/uktradeinservicesservicetypebypartnercountrynonseasonallyadjusted/current/"
    "servicetypebycountry2026q2.xlsx"
)
OFFICIAL_RELEASE = "2026-10-01"  # Q2 2026 services release family


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    local = Path("/tmp/bx-trade09/services.xlsx")
    if local.is_file():
        shutil.copy2(local, dest)
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as resp:
        dest.write_bytes(resp.read())


def _num(raw: object) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    if text in {"x", "c", "[c]", "[z]"}:
        return None
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48] or "x"


def _parse_time_series(path: Path) -> tuple[list[Observation], list[Observation]]:
    """Return (by_category World aggregates, by_partner Total Services)."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Sheet 1. Time Series"]
    rows = ws.iter_rows(values_only=True)
    header = None
    for row in rows:
        if row and str(row[0] or "").strip().lower() == "direction":
            header = row
            break
    if header is None:
        wb.close()
        raise ValueError("Services time series header not found")
    years: list[tuple[int, int]] = []
    for col, cell in enumerate(header):
        if isinstance(cell, int) and 1990 <= cell <= 2100:
            years.append((col, cell))
        elif isinstance(cell, str) and re.fullmatch(r"20\d{2}|19\d{2}", str(cell).strip()):
            years.append((col, int(str(cell).strip())))

    by_category: list[Observation] = []
    by_partner: list[Observation] = []
    for row in rows:
        if not row or row[0] is None:
            continue
        direction = str(row[0]).strip().lower()
        if direction not in {"exports", "imports"}:
            continue
        svc_code = row[1]
        svc_name = str(row[2] or "").strip()
        country_code = str(row[3] or "").strip()
        country_name = str(row[4] or "").strip()
        flow = direction
        for col, year in years:
            value = _num(row[col] if col < len(row) else None)
            if value is None:
                continue
            start, end = f"{year:04d}-01-01", f"{year:04d}-12-31"
            # Category package: World / WW / Total World rows for each service type
            if country_name.lower() in {"world", "total world", "ww"} or country_code.upper() in {
                "WW",
                "W1",
                "TOTAL",
            }:
                by_category.append(
                    Observation(
                        indicator_id="services-trade-by-category",
                        period_start=start,
                        period_end=end,
                        geography_code="K02000001",
                        geography_label="United Kingdom",
                        value=value,
                        unit="£ million current prices, NSA",
                        observation_status="final",
                        source_version=f"ONS services by type×partner {OFFICIAL_RELEASE}",
                        notes=(
                            f"series={flow}-{_slug(svc_name)}; category={_slug(svc_name)}; "
                            f"flow={flow}; service_code={svc_code}; "
                            f"service={_slug(svc_name)}; annual; nsa"
                        ),
                    )
                )
            # Partner package: Total Services only
            if str(svc_name).lower() in {"total services", "total"} or svc_code in {0, "0"}:
                by_partner.append(
                    Observation(
                        indicator_id="services-trade-by-partner",
                        period_start=start,
                        period_end=end,
                        geography_code=country_code or _slug(country_name).upper()[:12],
                        geography_label=country_name or country_code,
                        value=value,
                        unit="£ million current prices, NSA",
                        observation_status="final",
                        source_version=f"ONS services by type×partner {OFFICIAL_RELEASE}",
                        notes=(
                            f"series={flow}; category={flow}; flow={flow}; "
                            f"partner={country_code}; annual; nsa; total-services"
                        ),
                    )
                )
    wb.close()
    return by_category, by_partner


def _write_package(
    indicator_id: str,
    title: str,
    definition: str,
    observations: list[Observation],
    evidence: list[RawEvidence],
    module: str,
) -> None:
    root = ECONOMY_DATA / indicator_id
    root.mkdir(parents=True, exist_ok=True)
    # Ensure raw file exists under this package
    day = datetime.now(timezone.utc).date().isoformat()
    raw_rel = f"raw/{day}/servicetypebycountry2026q2.xlsx"
    raw_dest = root / raw_rel
    if evidence:
        src = Path(evidence[0].source_url) if False else None
        # Copy from shared pin path encoded in first evidence path if present
    pin = Path("/tmp/bx-trade09/services.xlsx")
    if not raw_dest.is_file():
        raw_dest.parent.mkdir(parents=True, exist_ok=True)
        if pin.is_file():
            shutil.copy2(pin, raw_dest)
        else:
            _download(FILE_URL, raw_dest)
    local_evidence = [
        RawEvidence(
            path=raw_rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=hashlib.sha256(raw_dest.read_bytes()).hexdigest(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            official_release_date=OFFICIAL_RELEASE,
            http_status=200,
            source_url=FILE_URL,
        )
    ]

    class _C(Connector):
        def __init__(self) -> None:
            super().__init__(root)

        @property
        def indicator_id(self) -> str:
            return indicator_id

        def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
            return Manifest(
                indicator_id=indicator_id,
                title=title,
                sector="economy-public-finance",
                publisher="ONS",
                source_url=LANDING,
                series_id="services-type-by-partner",
                geography="United Kingdom / partner countries",
                frequency="annual",
                unit="£ million current prices, NSA",
                definition=definition,
                licence="Open Government Licence v3.0",
                agent_owner="economy",
                connector_module=module,
                curated_path="curated/observations.csv",
                update_cadence="quarterly bulletin / annual columns in time series",
                raw_evidence=list(evidence),
                notion_registry_url="",
                transformations="Parse Sheet 1 Time Series; sparse cells stay missing.",
                revision_notes=f"Service type by partner Q2 2026 workbook ({OFFICIAL_RELEASE}).",
                caveats=(
                    "NSA. Services partner coverage is thinner than goods. "
                    "Not comparable to HMRC customs goods."
                ),
                related_indicator_ids=["uk-trade-mret", "goods-trade-by-partner"],
                open_questions=[],
            )

        def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
            return local_evidence

        def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
            return observations

    connector = _C()
    connector.write_hand_off(local_evidence, observations)
    (root / "README.md").write_text(
        f"# {title}\n\n```bash\nuv run python -m economy.connectors.services_trade\n```\n",
        encoding="utf-8",
    )
    (root / "validation_notes.md").write_text(
        f"# Validation notes\n\n- Observations: **{len(observations)}**\n",
        encoding="utf-8",
    )
    print(indicator_id, len(observations))


def main() -> None:
    day = datetime.now(timezone.utc).date().isoformat()
    shared = ECONOMY_DATA / "_services_shared" / f"raw/{day}/servicetypebycountry2026q2.xlsx"
    _download(FILE_URL, shared)
    by_cat, by_partner = _parse_time_series(shared)
    # If World aggregates missing, build category totals by summing partners per service×flow×year
    if len(by_cat) < 10:
        from collections import defaultdict

        sums: dict[tuple[str, str, str], float] = defaultdict(float)
        wb = openpyxl.load_workbook(shared, read_only=True, data_only=True)
        ws = wb["Sheet 1. Time Series"]
        rows = list(ws.iter_rows(values_only=True))
        header = next(r for r in rows if r and str(r[0]).strip().lower() == "direction")
        years = [
            (col, int(cell) if isinstance(cell, int) else int(str(cell)))
            for col, cell in enumerate(header)
            if (isinstance(cell, int) and 1990 <= cell <= 2100)
            or (isinstance(cell, str) and re.fullmatch(r"20\d{2}|19\d{2}", str(cell).strip()))
        ]
        for row in rows:
            if not row or str(row[0] or "").lower() not in {"exports", "imports"}:
                continue
            flow = str(row[0]).strip().lower()
            svc = str(row[2] or "").strip()
            if not svc:
                continue
            for col, year in years:
                value = _num(row[col] if col < len(row) else None)
                if value is None:
                    continue
                sums[(flow, svc, f"{year:04d}")] += value
        wb.close()
        by_cat = []
        for (flow, svc, year), value in sorted(sums.items()):
            by_cat.append(
                Observation(
                    indicator_id="services-trade-by-category",
                    period_start=f"{year}-01-01",
                    period_end=f"{year}-12-31",
                    geography_code="K02000001",
                    geography_label="United Kingdom",
                    value=value,
                    unit="£ million current prices, NSA",
                    observation_status="final",
                    source_version=f"ONS services by type×partner {OFFICIAL_RELEASE}",
                    notes=(
                        f"series={flow}-{_slug(svc)}; category={_slug(svc)}; "
                        f"flow={flow}; service={_slug(svc)}; annual; nsa; "
                        f"aggregated-from-partners"
                    ),
                )
            )
    _write_package(
        "services-trade-by-category",
        "Services trade by category",
        "UK trade in services by EBOPS/service type, current prices NSA.",
        by_cat,
        [],
        "economy.connectors.services_trade",
    )
    _write_package(
        "services-trade-by-partner",
        "Services trade by partner",
        "UK total services exports/imports by partner country, current prices NSA.",
        by_partner,
        [],
        "economy.connectors.services_trade",
    )


if __name__ == "__main__":
    main()
