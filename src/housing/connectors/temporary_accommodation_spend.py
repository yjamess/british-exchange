"""MHCLG RO4 — local authority homelessness expenditure (Domain 08).

Approach:
1. Pin the Revenue Outturn multi-year CSV (England rows only).
2. Read the published England row (ONS code E92000001) for each financial
   year with non-empty homelessness totals. Do not re-sum authorities.
3. Emit net and gross current expenditure (£ thousand) for temporary
   accommodation types and for total homelessness.

These are annual flows of money, not stocks of households.

Ref: https://www.gov.uk/government/statistics/local-authority-revenue-expenditure-and-financing-england-revenue-outturn-multi-year-data-set
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import httpx

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, ObservationStatus
from britain_exchange.paths import HOUSING_DATA

PIN_DIR = "raw/2026-11-10"
STAGING_FILE = "Revenue_Outturn_time_series_data_v4.csv"
PINNED_URL = (
    "https://assets.publishing.service.gov.uk/media/"
    "6ab26ffffe72ed1e2b02ee74/Revenue_Outturn_time_series_data_v4.csv"
)
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistics/"
    "local-authority-revenue-expenditure-and-financing-england-"
    "revenue-outturn-multi-year-data-set"
)
OFFICIAL_RELEASE_DATE = "2026-06-11"
SOURCE_VERSION = "RO4 housing services — Revenue Outturn multi-year v4"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
USER_AGENT = "BritishExchange/1.0 (housing; temporary-accommodation-spend)"

# series slug → (gross column, net column) on the multi-year CSV.
# Gross = total expenditure (_tot_exp); net = net current expenditure.
# Hostels and non-HRA use the published column names (slightly irregular).
SERIES_COLUMNS: tuple[tuple[str, str, str], ...] = (
    (
        "nightly-paid",
        "RO4_housgfcfhml_ngt_prv_mng_acc_tot_exp",
        "RO4_housgfcfhml_ngt_prv_mng_acc_net_cur_exp",
    ),
    (
        "private-leased",
        "RO4_housgfcfhml_prv_acc_lsd_tot_exp",
        "RO4_housgfcfhml_prv_acc_lsd_net_cur_exp",
    ),
    (
        "hostels",
        "RO4_housgfcfhml_hst_incl_rcpt_run_tot_exp",
        "RO4_housgfcfhml_hst_incl_rcpt_net_cur_exp",
    ),
    (
        "bed-and-breakfast",
        "RO4_housgfcfhml_bb_htls_tot_exp",
        "RO4_housgfcfhml_bb_htls_net_cur_exp",
    ),
    (
        "la-or-ha-stock",
        "RO4_housgfcfhml_la_ha_stk_tot_exp",
        "RO4_housgfcfhml_la_ha_stk_net_cur_exp",
    ),
    (
        "other-temporary",
        "RO4_housgfcfhml_any_oth_temp_acc_tot_exp",
        "RO4_housgfcfhml_any_oth_temp_acc_net_cur_exp",
    ),
    (
        "ta-administration",
        "RO4_housgfcfhml_tmp_acc_adm_tot_exp",
        "RO4_housgfcfhml_tmp_acc_adm_net_cur_exp",
    ),
    (
        "homelessness-reduction-act",
        "RO4_housgfcfhml_hml_rdct_act_tot_exp",
        "RO4_housgfcfhml_hml_rdct_act_net_cur_exp",
    ),
    (
        "non-homelessness-reduction-act",
        "RO4_housgfcfhml_non_hml_rdct_act_tot_exp",
        "RO4_housgfcfhml_non_hml_rdct_act_run_net_cur_exp",
    ),
    (
        "homelessness-total",
        "RO4_housgfcfhml_hml_tot_tot_exp",
        "RO4_housgfcfhml_hml_tot_net_cur_exp",
    ),
)


def _parse_number(raw: str) -> tuple[float | None, ObservationStatus]:
    text = raw.strip().replace(",", "")
    if text in {"", "[x]", "[z]", "[n]", "[Y]", ".."}:
        return None, "missing"
    try:
        return float(text), "final"
    except ValueError:
        return None, "missing"


def _year_ending_to_period(year_ending: str) -> tuple[str, str]:
    """year_ending like 202503 → FY 2024-04-01 … 2025-03-31."""
    text = year_ending.strip()
    if len(text) != 6 or not text.isdigit() or not text.endswith("03"):
        raise ValueError(f"unexpected year_ending {year_ending!r}")
    end_year = int(text[:4])
    return f"{end_year - 1}-04-01", f"{end_year}-03-31"


def parse_england_spend(path: Path) -> list[Observation]:
    out: list[Observation] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if (row.get("ONS_code") or "").strip() != ENGLAND_CODE:
                continue
            year_ending = (row.get("year_ending") or "").strip()
            total_net_raw = (row.get("RO4_housgfcfhml_hml_tot_net_cur_exp") or "").strip()
            if not total_net_raw:
                # Earlier years have England rows but empty homelessness cells.
                continue
            period_start, period_end = _year_ending_to_period(year_ending)
            for slug, gross_col, net_col in SERIES_COLUMNS:
                for suffix, col in (("gross", gross_col), ("net", net_col)):
                    value, status = _parse_number(row.get(col) or "")
                    series = f"{slug}-{suffix}"
                    out.append(
                        Observation(
                            indicator_id="temporary-accommodation-spend",
                            period_start=period_start,
                            period_end=period_end,
                            geography_code=ENGLAND_CODE,
                            geography_label=ENGLAND_LABEL,
                            value=value,
                            unit="gbp-thousands",
                            observation_status=status,
                            source_version=SOURCE_VERSION,
                            notes=(
                                f"series={series}; measure=flow; "
                                "basis=non-IAS19; unit=gbp-thousands"
                            ),
                        )
                    )
    if not out:
        raise ValueError("No England RO4 homelessness observations found")
    return out


class TemporaryAccommodationSpendConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / "temporary-accommodation-spend"))

    @property
    def indicator_id(self) -> str:
        return "temporary-accommodation-spend"

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Temporary accommodation and homelessness expenditure (RO4)",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id="RO4 housing services — homelessness lines",
            geography="England (E92000001)",
            frequency="annual financial year (flow)",
            unit="£ thousand",
            definition=(
                "Local authority General Fund net and gross current expenditure "
                "on homelessness and temporary accommodation, England total as "
                "published on the Revenue Outturn multi-year dataset."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.temporary_accommodation_spend",
            curated_path="curated/observations.csv",
            update_cadence="annual",
            raw_evidence=list(evidence),
            transformations=(
                "Read the published England row for each financial year with "
                "non-empty homelessness totals. Do not re-sum local authorities. "
                "Series are TA type and total homelessness, gross and net."
            ),
            caveats=(
                "Annual money flow, not a stock of households. £ thousand, "
                "non-IAS19. Do not add to household counts. Reporting categories "
                "inside temporary accommodation changed between years — compare "
                "the total homelessness line, not a single TA type, across years. "
                "Do not divide spend by the temporary-accommodation household stock."
            ),
            revision_notes=(
                "Domain 08 Cost of Insecurity 2026-11-10. Multi-year England "
                "series from Revenue Outturn time series v4 (FY ending 2021–2026)."
            ),
            related_indicator_ids=["temporary-accommodation-households"],
            notion_registry_url="https://app.notion.com/p/40e6547176858114b855d16ddb6e41fb",
        )

    def pin_csv(self) -> Path:
        dest_dir = self.data_root / PIN_DIR
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / STAGING_FILE
        if dest.is_file():
            return dest
        with httpx.Client(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            timeout=120.0,
        ) as client:
            response = client.get(PINNED_URL)
            response.raise_for_status()
            dest.write_bytes(response.content)
        return dest

    def evidence_from_pinned(self) -> RawEvidence:
        path = self.pin_csv()
        rel = f"{PIN_DIR}/{STAGING_FILE}"
        return RawEvidence(
            path=rel,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="text/csv",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        return parse_england_spend(self.data_root / evidence[0].path)


def main() -> None:
    connector = TemporaryAccommodationSpendConnector()
    evidence = connector.evidence_from_pinned()
    observations = connector.transform([evidence])
    connector.write_hand_off([evidence], observations)
    by_year: dict[str, dict[str, float | None]] = {}
    for obs in observations:
        if obs.value is None:
            continue
        series = next(
            (part.removeprefix("series=") for part in obs.notes.split("; ") if part.startswith("series=")),
            "",
        )
        if series in {"homelessness-total-net", "homelessness-total-gross"}:
            by_year.setdefault(obs.period_end, {})[series] = obs.value
    print(f"temporary-accommodation-spend: obs={len(observations)}")
    for period_end in sorted(by_year):
        row = by_year[period_end]
        print(
            f"  FY ending {period_end}: "
            f"net={row.get('homelessness-total-net')} "
            f"gross={row.get('homelessness-total-gross')} £000"
        )


if __name__ == "__main__":
    main()
