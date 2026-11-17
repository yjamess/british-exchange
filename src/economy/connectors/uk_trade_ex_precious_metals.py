"""ONS UK Trade excluding precious metals (MRET) — underlying balances.

Companion to ``uk-trade-mret``. Bulletin narratives often quote trade
**excluding** non-monetary gold / precious metals because gold can dominate
period-to-period moves.

CDIDs (SA £m): FSID total balance ex-PM CP; FSIE goods balance ex-PM CP;
FSIC precious-metals balance CP; CVM JIL2 / JIM3 / JIN4 where published.
"""

from __future__ import annotations

import hashlib
import json
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import (
    Observation,
    mark_latest_months_provisional,
)
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import (
    month_bounds,
    parse_month_name,
    parse_value,
    release_date_iso,
    source_version,
)

INDICATOR_ID = "uk-trade-ex-precious-metals"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
MRET_BASE = (
    "https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/"
    "timeseries"
)


@dataclass(frozen=True, slots=True)
class ExPmSeries:
    cdid: str
    category: str
    label: str
    basis: str  # cp | cvm


SERIES: tuple[ExPmSeries, ...] = (
    ExPmSeries("FSID", "total-balance-ex-pm", "Total trade balance ex precious metals CP SA", "cp"),
    ExPmSeries("FSIE", "goods-balance-ex-pm", "Goods balance ex precious metals CP SA", "cp"),
    ExPmSeries("FSIC", "precious-metals-balance", "Precious metals balance CP SA", "cp"),
    ExPmSeries("JIL2", "total-balance-ex-pm", "Total trade balance ex precious metals CVM SA", "cvm"),
    ExPmSeries("JIM3", "goods-balance-ex-pm", "Goods balance ex precious metals CVM SA", "cvm"),
    ExPmSeries("JIN4", "precious-metals-balance", "Precious metals balance CVM SA", "cvm"),
)


def _download(url: str, dest: Path) -> tuple[int, str]:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        status = int(getattr(resp, "status", 200) or 200)
        content_type = resp.headers.get("Content-Type", "application/json")
        dest.write_bytes(resp.read())
    return status, content_type


def _parse(payload: dict, series: ExPmSeries) -> list[Observation]:
    description = payload.get("description")
    if not isinstance(description, dict):
        raise ValueError(f"{series.cdid}: missing description")
    cdid = str(description.get("cdid") or "").upper()
    if cdid and cdid != series.cdid:
        raise ValueError(f"Expected {series.cdid}, got {cdid!r}")
    rows = payload.get("months")
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"{series.cdid}: no months — may be quarterly-only")
    version = source_version(description, series.cdid, "MRET")
    unit = (
        "£ million chained volume, SA"
        if series.basis == "cvm"
        else "£ million current prices, SA"
    )
    out: list[Observation] = []
    for row in rows:
        year = int(str(row["year"]))
        month = parse_month_name(str(row["month"]))
        start, end = month_bounds(year, month)
        value, status = parse_value(row.get("value"))
        out.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code="K02000001",
                geography_label="United Kingdom",
                value=value,
                unit=unit,
                observation_status=status,
                source_version=version,
                notes=(
                    f"series={series.cdid}; category={series.category}; "
                    f"basis={series.basis}; month={month:02d}; monthly; "
                    f"label={series.label}"
                ),
            )
        )
    return sorted(out, key=lambda o: o.period_start)


class UkTradeExPreciousMetalsConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        releases = [e.official_release_date for e in evidence if e.official_release_date]
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="UK trade excluding precious metals",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=f"{MRET_BASE}/fsid/mret",
            series_id="FSID/FSIE/FSIC + CVM",
            geography="United Kingdom (K02000001); excl. Crown dependencies",
            frequency="monthly",
            unit="£ million, SA (CP and CVM)",
            definition=(
                "Trade balances excluding non-monetary gold / precious metals, "
                "plus the precious-metals balance itself. Use beside "
                "uk-trade-mret headlines — gold can swing the headline balance."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.uk_trade_ex_precious_metals",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS UK Trade / MRET)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Download MRET /data JSON per CDID; months only; "
                "series=<CDID>; category=<slug>; latest month provisional."
            ),
            revision_notes=(
                f"Releases with MRET. Latest pin release "
                f"{max(releases) if releases else 'unknown'}."
            ),
            caveats=(
                "Underlying (ex-PM) balances are preferred for narrative; "
                "headlines still include precious metals. Not HMRC customs."
            ),
            related_indicator_ids=["uk-trade-mret"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        evidence: list[RawEvidence] = []
        skipped: list[str] = []
        for series in SERIES:
            relative = f"raw/{day.isoformat()}/{series.cdid.lower()}_mret.json"
            dest = self.data_root / relative
            url = f"{MRET_BASE}/{series.cdid.lower()}/mret/data"
            try:
                status, content_type = _download(url, dest)
            except Exception as exc:  # noqa: BLE001 — record and continue
                skipped.append(f"{series.cdid}: {exc}")
                continue
            payload = json.loads(dest.read_text(encoding="utf-8"))
            release = ""
            if isinstance(payload, dict) and isinstance(payload.get("description"), dict):
                release = release_date_iso(payload["description"])
            # Skip CDIDs with no monthly array (may 404 or quarterly-only).
            if not isinstance(payload.get("months"), list) or not payload["months"]:
                skipped.append(f"{series.cdid}: no months array")
                continue
            evidence.append(
                RawEvidence(
                    path=relative,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                    content_type=content_type,
                    official_release_date=release,
                    http_status=status,
                    source_url=url,
                )
            )
        self._skipped = skipped
        if not evidence:
            raise ValueError("No ex-PM series downloaded with monthly data:\n" + "\n".join(skipped))
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        by_cdid = {Path(e.path).name.split("_")[0].upper(): e for e in evidence}
        observations: list[Observation] = []
        for series in SERIES:
            ev = by_cdid.get(series.cdid)
            if ev is None:
                continue
            payload = json.loads((self.data_root / ev.path).read_text(encoding="utf-8"))
            observations.extend(_parse(payload, series))
        return mark_latest_months_provisional(
            observations,
            months=1,
            group_key=lambda o: next(
                (
                    p.split("=", 1)[1].strip()
                    for p in o.notes.split(";")
                    if p.strip().startswith("series=")
                ),
                o.geography_code,
            ),
        )


def main() -> None:
    connector = UkTradeExPreciousMetalsConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    skipped = getattr(connector, "_skipped", [])
    (connector.data_root / "README.md").write_text(
        "# UK trade excluding precious metals\n\n"
        "Companion to `uk-trade-mret`. Reproduce:\n\n"
        "```bash\nuv run python -m economy.connectors.uk_trade_ex_precious_metals\n```\n",
        encoding="utf-8",
    )
    notes = connector.data_root / "validation_notes.md"
    notes.write_text(
        "# Validation notes — uk-trade-ex-precious-metals\n\n"
        f"- Observations: **{len(observations)}**\n"
        f"- CDIDs pinned: **{len(evidence)}**\n"
        f"- Skipped: {skipped or 'none'}\n",
        encoding="utf-8",
    )
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"observations: {len(observations)}")
    print(f"raw files: {len(evidence)}")
    print(f"skipped: {skipped}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
