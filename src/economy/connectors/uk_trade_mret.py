"""ONS UK Trade (MRET) — multi-series BoP SA monthly trade ledger.

Approach (beginner-friendly):
1. Download each locked CDID from the MRET timeseries ``/data`` JSON.
2. Keep only the ``months`` array (annual/quarterly stay in raw).
3. Write one curated package with ``series=<CDID>`` and ``category=<flow>-<component>-<basis>``
   so the API can filter typed dimensions (see ``britain_exchange.dimensions``).

Identity check (valued months): exports − imports ≈ balance for each
component × price basis (tolerance £1m for rounding).

Refs: pathlib · typing · PEP 8 naming.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import (
    Observation,
    mark_latest_months_provisional,
    write_observations_csv,
)
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import (
    OnsSeriesSpec,
    month_bounds,
    parse_month_name,
    parse_value,
    release_date_iso,
    source_version,
)

INDICATOR_ID = "uk-trade-mret"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
# CP headlines live under BoP; several CVM totals are published under the GDP
# timeseries path with dataset still labelled MRET.
BOP_TS = (
    "https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/timeseries"
)
GDP_TS = "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries"


@dataclass(frozen=True, slots=True)
class TradeSeries:
    """One MRET CDID mapped into the Trade Ledger."""

    cdid: str
    flow: str  # exports | imports | balance
    component: str  # total | goods | services
    basis: str  # cp | cvm
    label: str
    path_root: str = BOP_TS  # landing URL root for this CDID


# Locked headline matrix — current prices and CVM, SA, £ million.
TRADE_SERIES: tuple[TradeSeries, ...] = (
    TradeSeries("IKBH", "exports", "total", "cp", "Total exports CP SA"),
    TradeSeries("IKBI", "imports", "total", "cp", "Total imports CP SA"),
    TradeSeries("IKBJ", "balance", "total", "cp", "Total balance CP SA"),
    TradeSeries("IKBK", "exports", "total", "cvm", "Total exports CVM SA", GDP_TS),
    TradeSeries("IKBL", "imports", "total", "cvm", "Total imports CVM SA", GDP_TS),
    TradeSeries("IKBM", "balance", "total", "cvm", "Total balance CVM SA", GDP_TS),
    TradeSeries("BOKG", "exports", "goods", "cp", "Goods exports CP SA"),
    TradeSeries("BOKH", "imports", "goods", "cp", "Goods imports CP SA"),
    TradeSeries("BOKI", "balance", "goods", "cp", "Goods balance CP SA"),
    TradeSeries("BQKQ", "exports", "goods", "cvm", "Goods exports CVM SA", GDP_TS),
    TradeSeries("BQKO", "imports", "goods", "cvm", "Goods imports CVM SA", GDP_TS),
    TradeSeries("CTVS", "balance", "goods", "cvm", "Goods balance CVM SA"),
    TradeSeries("IKBB", "exports", "services", "cp", "Services exports CP SA"),
    TradeSeries("IKBC", "imports", "services", "cp", "Services imports CP SA"),
    TradeSeries("IKBD", "balance", "services", "cp", "Services balance CP SA"),
    TradeSeries("IKBE", "exports", "services", "cvm", "Services exports CVM SA", GDP_TS),
    TradeSeries("IKBF", "imports", "services", "cvm", "Services imports CVM SA", GDP_TS),
    TradeSeries("IKBG", "balance", "services", "cvm", "Services balance CVM SA"),
)


def _landing(series: TradeSeries) -> str:
    return f"{series.path_root}/{series.cdid.lower()}/mret"


def _category(series: TradeSeries) -> str:
    return f"{series.flow}-{series.component}-{series.basis}"


def _download(url: str, dest: Path) -> tuple[int, str]:
    """Fetch URL to dest; return (http_status, content_type)."""
    import urllib.request

    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        status = int(getattr(resp, "status", 200) or 200)
        content_type = resp.headers.get("Content-Type", "application/json")
        dest.write_bytes(resp.read())
    return status, content_type


def _sha256(path: Path) -> str:
    import hashlib

    return hashlib.sha256(path.read_bytes()).hexdigest()


def _parse_months(payload: dict, series: TradeSeries) -> list[Observation]:
    description = payload.get("description")
    if not isinstance(description, dict):
        raise ValueError(f"{series.cdid}: missing description")
    cdid = str(description.get("cdid") or "").upper()
    if cdid and cdid != series.cdid:
        raise ValueError(f"Expected {series.cdid}, got {cdid!r}")
    rows = payload.get("months")
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"{series.cdid}: missing months array")

    version = source_version(description, series.cdid, "MRET")
    unit = (
        "£ million chained volume, SA"
        if series.basis == "cvm"
        else "£ million current prices, SA"
    )
    out: list[Observation] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f"Bad month row: {row!r}")
        year = int(str(row["year"]))
        month = parse_month_name(str(row["month"]))
        period_start, period_end = month_bounds(year, month)
        value, status = parse_value(row.get("value"))
        out.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period_start,
                period_end=period_end,
                geography_code="K02000001",
                geography_label="United Kingdom",
                value=value,
                unit=unit,
                observation_status=status,
                source_version=version,
                notes=(
                    f"series={series.cdid}; category={_category(series)}; "
                    f"flow={series.flow}; component={series.component}; "
                    f"basis={series.basis}; month={month:02d}; monthly; "
                    f"label={series.label}"
                ),
            )
        )
    out.sort(key=lambda o: o.period_start)
    return out


def _check_balance_identity(observations: list[Observation]) -> list[str]:
    """Exports − imports should match balance (±£1m) for each component×basis."""
    by_key: dict[tuple[str, str, str], dict[str, float]] = {}
    for obs in observations:
        if obs.value is None or obs.observation_status == "missing":
            continue
        parts = {
            p.split("=", 1)[0].strip(): p.split("=", 1)[1].strip()
            for p in obs.notes.split(";")
            if "=" in p
        }
        flow = parts.get("flow", "")
        component = parts.get("component", "")
        basis = parts.get("basis", "")
        key = (obs.period_start, component, basis)
        by_key.setdefault(key, {})[flow] = float(obs.value)

    warnings: list[str] = []
    checked = 0
    for (period, component, basis), flows in by_key.items():
        if not {"exports", "imports", "balance"} <= set(flows):
            continue
        expected = flows["exports"] - flows["imports"]
        actual = flows["balance"]
        if abs(expected - actual) > 1.0:
            warnings.append(
                f"{period} {component}/{basis}: "
                f"exports−imports={expected:.1f} vs balance={actual:.1f}"
            )
        checked += 1
    if checked == 0:
        raise ValueError("Balance identity: no complete export/import/balance triples")
    return warnings


class UkTradeMretConnector(Connector):
    """Multi-CDID MRET Trade Ledger connector."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        release_dates = [e.official_release_date for e in evidence if e.official_release_date]
        release = max(release_dates) if release_dates else ""
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="UK trade — balance of payments (MRET)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=(
                "https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/"
                "datasets/tradeingoodsmretsallbopeu2013timeseriesspreadsheet/current"
            ),
            series_id="MRET multi-CDID",
            geography="United Kingdom (K02000001); excl. Crown dependencies",
            frequency="monthly",
            unit="£ million, SA (CP and CVM series)",
            definition=(
                "UK Balance of Payments trade in goods and services: exports, "
                "imports and balance for total / goods / services, current "
                "prices and chained-volume measures, seasonally adjusted. "
                "Eighteen MRET CDIDs (IKBH–IKBG family). Precious-metals "
                "treatment: headlines include non-monetary gold; use sibling "
                "uk-trade-ex-precious-metals for underlying balances."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.uk_trade_mret",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS UK Trade / MRET)",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Download each CDID /data JSON. Keep months only. Map "
                "year+month → ISO bounds. Notes: series=<CDID>; "
                "category=<flow>-<component>-<basis>. Latest month provisional."
            ),
            revision_notes=(
                f"MRET revises with UK Trade releases. Pin date {release or 'unknown'}. "
                "Never splice HMRC customs figures into this BoP series."
            ),
            caveats=(
                "BoP change-of-ownership basis. Monthly services partly "
                "interpolated from quarterly. CVM components need not sum "
                "outside the reference year. Headlines include precious metals."
            ),
            related_indicator_ids=["uk-trade-ex-precious-metals", "business-investment"],
            open_questions=[],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> list[RawEvidence]:
        day = retrieved_on or datetime.now(timezone.utc).date()
        evidence: list[RawEvidence] = []
        for series in TRADE_SERIES:
            relative = f"raw/{day.isoformat()}/{series.cdid.lower()}_mret.json"
            dest = self.data_root / relative
            url = f"{_landing(series)}/data"
            status, content_type = _download(url, dest)
            payload = json.loads(dest.read_text(encoding="utf-8"))
            release = ""
            if isinstance(payload, dict) and isinstance(payload.get("description"), dict):
                release = release_date_iso(payload["description"])
            evidence.append(
                RawEvidence(
                    path=relative,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=_sha256(dest),
                    content_type=content_type,
                    official_release_date=release,
                    http_status=status,
                    source_url=url,
                )
            )
        return evidence

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        by_cdid = {Path(e.path).name.split("_")[0].upper(): e for e in evidence}
        observations: list[Observation] = []
        for series in TRADE_SERIES:
            ev = by_cdid.get(series.cdid)
            if ev is None:
                raise ValueError(f"Missing raw evidence for {series.cdid}")
            payload = json.loads((self.data_root / ev.path).read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                raise ValueError(f"Bad JSON for {series.cdid}")
            observations.extend(_parse_months(payload, series))
        observations = mark_latest_months_provisional(
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
        warnings = _check_balance_identity(observations)
        if warnings:
            # Soft warn into notes file later; hard-fail only if many mismatches.
            if len(warnings) > 12:
                raise ValueError(
                    "Balance identity failed on >12 months:\n" + "\n".join(warnings[:20])
                )
        self._identity_warnings = warnings
        return observations

    def write_validation_notes(self, observations: list[Observation]) -> Path:
        path = self.data_root / "validation_notes.md"
        warnings = getattr(self, "_identity_warnings", [])
        valued = [o for o in observations if o.value is not None]
        lines = [
            "# Validation notes — uk-trade-mret",
            "",
            f"- Observations: **{len(observations)}** ({len(valued)} valued)",
            f"- Series count: **{len(TRADE_SERIES)}** CDIDs",
            f"- Balance identity mismatches (±£1m): **{len(warnings)}**",
            "",
        ]
        if warnings[:10]:
            lines.append("## Sample mismatches")
            lines.extend(f"- {w}" for w in warnings[:10])
            lines.append("")
        path.write_text("\n".join(lines), encoding="utf-8")
        return path


def main() -> None:
    connector = UkTradeMretConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    notes_path = connector.write_validation_notes(observations)
    readme = connector.data_root / "README.md"
    readme.write_text(
        "# UK trade — MRET (BoP SA)\n\n"
        "Eighteen monthly CDIDs: total / goods / services × exports / imports / "
        "balance × CP / CVM. Sibling `uk-trade-ex-precious-metals` for underlying "
        "balances. Reproduce:\n\n"
        "```bash\nuv run python -m economy.connectors.uk_trade_mret\n```\n",
        encoding="utf-8",
    )
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"observations: {len(observations)}")
    print(f"raw files: {len(evidence)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"notes: {notes_path}")
    if observations:
        print(
            f"range: {observations[0].period_start} → {observations[-1].period_start}"
        )


if __name__ == "__main__":
    main()
