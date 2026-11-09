"""Ofgem default-tariff (price) cap — pin-per-period GB archive.

Approach (plain language):
1. There is **no** single official historic CSV of cap levels.
2. For each charge-restriction period, pin Ofgem's Annex 9 levelised XLSX
   (+ Energy price cap levels PDF) under ``raw/<retrieval-date>/<period-slug>/``.
3. Curate GB-average, VAT-inclusive **benchmark** £/year from sheet
   ``1a Levelised DTC`` / Other Payment Method (direct debit) for:
   electricity single-rate, gas, and dual-fuel (implied).
4. Disclose typical consumption (TDCV) from sheet ``1c`` — these are **not**
   DESNZ QEP 2.2.1 / 2.3.1 bill assumptions.

Geography is **Great Britain only** (not Northern Ireland).

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
- Fail loudly if pinned Annex 9 is missing or GB rows move.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ENERGY_DATA

INDICATOR_ID = "ofgem-default-tariff-cap"
PACKAGE = ENERGY_DATA / "ofgem-default-tariff-cap"
LANDING_URL = (
    "https://www.ofgem.gov.uk/energy-regulation/domestic-and-non-domestic/"
    "energy-pricing-rules/energy-price-cap/energy-price-cap-default-tariff-levels"
)
GB_GEOGRAPHY_CODE = "K03000001"
GB_GEOGRAPHY_LABEL = "Great Britain"
PAYMENT_METHOD = "Other Payment Method"  # Ofgem label ≈ direct debit / non-SC/PPM


@dataclass(frozen=True, slots=True)
class PeriodPin:
    slug: str
    period_start: str
    period_end: str
    label: str
    annex9_relpath: str
    pdf_relpath: str
    page_url: str


def _load_periods(path: Path) -> list[PeriodPin]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [PeriodPin(**row) for row in raw["periods"]]


def _find_gb_inc_vat(ws: Worksheet, payment_header: str) -> dict[str, float]:
    """Parse ``1a Levelised DTC`` for GB average, inc VAT under a payment block."""
    in_block = False
    for row in ws.iter_rows(max_col=12, values_only=True):
        label = "" if row[1] is None else str(row[1]).strip()
        if label == payment_header:
            in_block = True
            continue
        if in_block and label.startswith("GB average, inc VAT"):
            return {
                "elec_single_benchmark": float(row[3]),  # type: ignore[arg-type]
                "gas_benchmark": float(row[7]),  # type: ignore[arg-type]
                "dual_benchmark": float(row[9]),  # type: ignore[arg-type]
            }
        if in_block and label in {
            "Standard Credit",
            "PPM",
            "Other Payment Method",
        }:
            break
    raise ValueError(
        f"Could not find 'GB average, inc VAT' under {payment_header!r} in 1a Levelised DTC"
    )


def _pick_tdcv_mwh(row: tuple[object, ...], *, period_start: str) -> float | None:
    """Pick the TDCV column that applies to the charge-restriction period.

    Annex 9 sheet ``1c`` may carry:
    - col C: default / "latest" display (can lag the period's true TDCV)
    - col D: Jan–Jun 2026 revised benchmarks
    - col E: July 2026 onwards revised benchmarks

    Prefer the period-dated column when present so Jul–Sep footnotes match the
    TDCV that underpins that period's ``1a`` levels (Validation C7).
    """

    def as_float(raw: object) -> float | None:
        if raw is None or isinstance(raw, str):
            return None
        return float(raw)

    july = as_float(row[4]) if len(row) > 4 else None
    jan = as_float(row[3]) if len(row) > 3 else None
    default = as_float(row[2]) if len(row) > 2 else None
    if period_start >= "2026-07-01" and july is not None:
        return july
    if period_start >= "2026-01-01" and jan is not None:
        return jan
    return default


def _typical_consumption_mwh(
    ws: Worksheet, *, period_start: str
) -> dict[str, float | None]:
    """Read period-dated TDCV from ``1c Consumption adjusted levels``."""
    out: dict[str, float | None] = {
        "elec_single_mwh": None,
        "elec_multi_mwh": None,
        "gas_mwh": None,
    }
    for row in ws.iter_rows(min_row=6, max_row=12, max_col=5, values_only=True):
        label = ("" if row[1] is None else str(row[1])).strip().lower()
        value = _pick_tdcv_mwh(row, period_start=period_start)
        if value is None:
            continue
        if "single" in label:
            out["elec_single_mwh"] = value
        elif "multi" in label:
            out["elec_multi_mwh"] = value
        elif label.startswith("gas"):
            out["gas_mwh"] = value
    if out["elec_single_mwh"] is None or out["gas_mwh"] is None:
        raise ValueError("Could not read typical consumption from sheet 1c")
    return out


def _period_label_from_sheet(ws: Worksheet) -> str | None:
    for row in ws.iter_rows(min_row=1, max_row=10, max_col=4, values_only=True):
        if row[1] and "Charge Restriction Period" in str(row[1]):
            return None if row[2] is None else str(row[2]).strip()
    return None


_MONTH_START: dict[str, str] = {
    "jan": "01-01",
    "january": "01-01",
    "apr": "04-01",
    "april": "04-01",
    "jul": "07-01",
    "july": "07-01",
    "oct": "10-01",
    "october": "10-01",
}

_MONTH_END: dict[str, tuple[str, str]] = {
    "mar": ("03", "31"),
    "march": ("03", "31"),
    "jun": ("06", "30"),
    "june": ("06", "30"),
    "sep": ("09", "30"),
    "sept": ("09", "30"),
    "september": ("09", "30"),
    "dec": ("12", "31"),
    "december": ("12", "31"),
}


def _parse_cap_period_label(label: str) -> tuple[str, str] | None:
    """Parse labels like 'Apr 2017 - Sep 2017' or 'Oct 2026 - Dec 2026' → ISO bounds."""
    text = " ".join(str(label).strip().split())
    if " - " not in text:
        return None
    left, right = text.split(" - ", 1)
    left_parts = left.split()
    right_parts = right.split()
    if len(left_parts) < 2 or len(right_parts) < 2:
        return None
    start_mon = left_parts[0].casefold()
    start_year = left_parts[1]
    end_mon = right_parts[0].casefold()
    end_year = right_parts[1]
    if start_mon not in _MONTH_START or end_mon not in _MONTH_END:
        return None
    end_m, end_d = _MONTH_END[end_mon]
    try:
        sy = int(start_year)
        ey = int(end_year)
    except ValueError:
        return None
    return (
        f"{sy:04d}-{_MONTH_START[start_mon]}",
        f"{ey:04d}-{end_m}-{end_d}",
    )


def parse_annex9_historical_elec_single(workbook_path: Path) -> list[Observation]:
    """GB-average electricity single-rate Total inc VAT from sheet 1b (Other Payment).

    Annex 9 reconstructs indicative levelised history — use for full timeline of
    ``measure=elec_single``; gas/dual still come from per-period 1a pins.
    """
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        ws = wb["1b Historical level tables"]
        # Header periods sit on the Typical consumption row under Other Payment Method.
        header_row = None
        total_row = None
        in_other = False
        in_elec = False
        in_typical = False
        for idx, row in enumerate(ws.iter_rows(max_col=40, values_only=True), start=1):
            label = "" if row[1] is None else str(row[1]).strip()
            if label == "Other Payment Method":
                in_other = True
                in_elec = False
                in_typical = False
                continue
            if label in {"Standard Credit", "PPM"}:
                if in_other and header_row is not None and total_row is not None:
                    break
                in_other = False
                continue
            if not in_other:
                continue
            if label.startswith("Electricity: Single-Rate"):
                in_elec = True
                continue
            if in_elec and label == "Typical consumption":
                in_typical = True
                header_row = row
                continue
            if in_elec and in_typical and label == "Total inc VAT":
                total_row = row
                break
        if header_row is None or total_row is None:
            raise ValueError("Could not find Other Payment / Electricity / Typical Total inc VAT in 1b")

        observations: list[Observation] = []
        # Col B = label; periods start at col C (0-based index 2).
        for idx in range(2, max(len(header_row), len(total_row))):
            period_label = header_row[idx] if idx < len(header_row) else None
            value = total_row[idx] if idx < len(total_row) else None
            if period_label is None:
                continue
            if str(period_label).strip() == "Typical consumption":
                break
            bounds = _parse_cap_period_label(str(period_label))
            if bounds is None or not isinstance(value, (int, float)):
                continue
            start, end = bounds
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=GB_GEOGRAPHY_CODE,
                    geography_label=GB_GEOGRAPHY_LABEL,
                    value=round(float(value), 2),
                    unit="GBP/year",
                    observation_status="final",
                    source_version="ofgem-annex9-1b-historical",
                    notes=(
                        f"{period_label}; measure=elec_single; payment={PAYMENT_METHOD}; "
                        "GB average inc VAT; source=1b Historical level tables; "
                        "indicative levelised reconstruction"
                    ),
                )
            )
        if not observations:
            raise ValueError("No historical elec_single points parsed from Annex 9 sheet 1b")
        return observations
    finally:
        wb.close()


_MONTH_START: dict[str, str] = {
    "jan": "01-01",
    "january": "01-01",
    "apr": "04-01",
    "april": "04-01",
    "jul": "07-01",
    "july": "07-01",
    "oct": "10-01",
    "october": "10-01",
}

_MONTH_END: dict[str, tuple[str, str]] = {
    "mar": ("03", "31"),
    "march": ("03", "31"),
    "jun": ("06", "30"),
    "june": ("06", "30"),
    "sep": ("09", "30"),
    "sept": ("09", "30"),
    "september": ("09", "30"),
    "dec": ("12", "31"),
    "december": ("12", "31"),
}


def _parse_cap_period_label(label: str) -> tuple[str, str] | None:
    """Parse labels like 'Apr 2017 - Sep 2017' or 'Oct 2026 - Dec 2026' → ISO bounds."""
    text = " ".join(str(label).strip().split())
    if " - " not in text:
        return None
    left, right = text.split(" - ", 1)
    left_parts = left.split()
    right_parts = right.split()
    if len(left_parts) < 2 or len(right_parts) < 2:
        return None
    start_mon = left_parts[0].casefold()
    start_year = left_parts[1]
    end_mon = right_parts[0].casefold()
    end_year = right_parts[1]
    if start_mon not in _MONTH_START or end_mon not in _MONTH_END:
        return None
    end_m, end_d = _MONTH_END[end_mon]
    try:
        sy = int(start_year)
        ey = int(end_year)
    except ValueError:
        return None
    return (
        f"{sy:04d}-{_MONTH_START[start_mon]}",
        f"{ey:04d}-{end_m}-{end_d}",
    )


def parse_annex9_historical_elec_single(workbook_path: Path) -> list[Observation]:
    """GB-average electricity single-rate Total inc VAT from sheet 1b (Other Payment).

    Annex 9 reconstructs indicative levelised history — use for full timeline of
    ``measure=elec_single``; gas/dual still come from per-period 1a pins.
    """
    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    try:
        ws = wb["1b Historical level tables"]
        # Header periods sit on the Typical consumption row under Other Payment Method.
        header_row = None
        total_row = None
        in_other = False
        in_elec = False
        in_typical = False
        for idx, row in enumerate(ws.iter_rows(max_col=40, values_only=True), start=1):
            label = "" if row[1] is None else str(row[1]).strip()
            if label == "Other Payment Method":
                in_other = True
                in_elec = False
                in_typical = False
                continue
            if label in {"Standard Credit", "PPM"}:
                if in_other and header_row is not None and total_row is not None:
                    break
                in_other = False
                continue
            if not in_other:
                continue
            if label.startswith("Electricity: Single-Rate"):
                in_elec = True
                continue
            if in_elec and label == "Typical consumption":
                in_typical = True
                header_row = row
                continue
            if in_elec and in_typical and label == "Total inc VAT":
                total_row = row
                break
        if header_row is None or total_row is None:
            raise ValueError("Could not find Other Payment / Electricity / Typical Total inc VAT in 1b")

        observations: list[Observation] = []
        # Col B = label; periods start at col C (0-based index 2).
        for idx in range(2, max(len(header_row), len(total_row))):
            period_label = header_row[idx] if idx < len(header_row) else None
            value = total_row[idx] if idx < len(total_row) else None
            if period_label is None:
                continue
            if str(period_label).strip() == "Typical consumption":
                break
            bounds = _parse_cap_period_label(str(period_label))
            if bounds is None or not isinstance(value, (int, float)):
                continue
            start, end = bounds
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=start,
                    period_end=end,
                    geography_code=GB_GEOGRAPHY_CODE,
                    geography_label=GB_GEOGRAPHY_LABEL,
                    value=round(float(value), 2),
                    unit="GBP/year",
                    observation_status="final",
                    source_version="ofgem-annex9-1b-historical",
                    notes=(
                        f"{period_label}; measure=elec_single; payment={PAYMENT_METHOD}; "
                        "GB average inc VAT; source=1b Historical level tables; "
                        "indicative levelised reconstruction"
                    ),
                )
            )
        if not observations:
            raise ValueError("No historical elec_single points parsed from Annex 9 sheet 1b")
        return observations
    finally:
        wb.close()


class OfgemDefaultTariffCapConnector(Connector):
    """Curate GB price-cap £/year from pinned Ofgem Annex 9 workbooks."""

    def __init__(self, *, periods_path: Path | None = None) -> None:
        super().__init__(PACKAGE)
        self.periods_path = periods_path or (PACKAGE / "periods.json")

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Ofgem default tariff (price) cap — GB typical £/year",
            sector="energy-industry",
            publisher="Ofgem",
            source_url=LANDING_URL,
            series_id="Ofgem Annex 9 levelised default tariff cap (GB average, inc VAT)",
            geography="Great Britain (K03000001); not Northern Ireland",
            frequency="quarterly",
            unit="GBP per year (benchmark / typical consumption)",
            definition=(
                "Great Britain default tariff (price) cap levels for a typical domestic "
                "consumer, curated from Ofgem's per-period Annex 9 Levelisation Allowance "
                "model (sheet 1a Levelised DTC). Values are GB-average, VAT-inclusive "
                "benchmark £/year under Other Payment Method (≈ direct debit), for "
                "electricity single-rate, gas, and dual-fuel (implied). Not DESNZ average "
                "bills (QEP 2.2.1 / 2.3.1) and not Northern Ireland."
            ),
            licence="Ofgem published materials — Crown copyright / Ofgem terms on each asset",
            agent_owner="energy",
            connector_module="energy.connectors.ofgem_default_tariff_cap",
            curated_path="curated/observations.csv",
            update_cadence="Each new charge restriction period (pin PDF + Annex 9, re-run)",
            raw_evidence=list(evidence),
            transformations=(
                "Electricity single-rate: parse Annex 9 sheet 1b Historical level tables "
                "(Other Payment Method · Typical consumption · Total inc VAT) for the full "
                "indicative timeline. Gas and dual-fuel: per-period 1a GB average,inc VAT "
                "from pinned Annex 9 workbooks. Record TDCV from sheet 1c on pin rows."
            ),
            revision_notes=(
                "Sheet 1b is an indicative levelised reconstruction. TDCV revised Jan 2026 "
                "and Jul 2026 — compare periods carefully."
            ),
            caveats=(
                "GB only — not NI. Cap ≠ actual average bills. Benchmark uses Ofgem TDCV, "
                "not DESNZ 3,400 / 11,200 kWh assumptions. Regional caps live in "
                "ofgem-default-tariff-cap-regional. Gas/dual history limited to pinned periods."
            ),
            related_indicator_ids=[
                "domestic-electricity-bills",
                "domestic-gas-bills",
                "domestic-gas-unit-standing",
                "cpih-index",
                "ofgem-default-tariff-cap-regional",
            ],
            open_questions=[
                "Gas / dual-fuel full history still needs earlier Annex 9 period pins "
                "(1b currently publishes electricity single-rate historical totals).",
                "Optional: Standard Credit / PPM payment methods from same Annex 9.",
            ],
            schema_version="1.0",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        """Turn pinned Annex 9 evidence into curated GB observations."""
        periods = _load_periods(self.periods_path)
        by_path = {item.path: item for item in evidence}
        observations: list[Observation] = []

        # Full electricity single-rate history from the newest Annex 9 sheet 1b.
        latest_annex = self.data_root / periods[-1].annex9_relpath
        if periods[-1].annex9_relpath not in by_path:
            raise ValueError(f"Evidence missing for Annex 9 pin {periods[-1].annex9_relpath}")
        historical_elec = parse_annex9_historical_elec_single(latest_annex)
        observations.extend(historical_elec)
        hist_keys = {(o.period_start, o.period_end) for o in historical_elec}

        for period in periods:
            if period.annex9_relpath not in by_path:
                raise ValueError(
                    f"Evidence missing for Annex 9 pin {period.annex9_relpath}"
                )
            annex = self.data_root / period.annex9_relpath
            wb = openpyxl.load_workbook(annex, data_only=True, read_only=True)
            sheet_a = wb["1a Levelised DTC"]
            sheet_c = wb["1c Consumption adjusted levels"]
            sheet_label = _period_label_from_sheet(sheet_a) or period.label
            caps = _find_gb_inc_vat(sheet_a, PAYMENT_METHOD)
            cons = _typical_consumption_mwh(sheet_c, period_start=period.period_start)
            version = f"ofgem-annex9-{period.slug}"

            measures: list[tuple[str, float, str]] = [
                (
                    "elec_single",
                    caps["elec_single_benchmark"],
                    f"Electricity single-rate; TDCV {cons['elec_single_mwh']} MWh",
                ),
                (
                    "gas",
                    caps["gas_benchmark"],
                    f"Gas; TDCV {cons['gas_mwh']} MWh",
                ),
                (
                    "dual_fuel",
                    caps["dual_benchmark"],
                    (
                        f"Dual fuel (implied); TDCV elec {cons['elec_single_mwh']} MWh "
                        f"+ gas {cons['gas_mwh']} MWh"
                    ),
                ),
            ]
            for measure, value, detail in measures:
                # Prefer 1b historical for overlapping elec_single periods.
                if measure == "elec_single" and (period.period_start, period.period_end) in hist_keys:
                    continue
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=period.period_start,
                        period_end=period.period_end,
                        geography_code=GB_GEOGRAPHY_CODE,
                        geography_label=GB_GEOGRAPHY_LABEL,
                        value=round(value, 2),
                        unit="GBP/year",
                        observation_status="final",
                        source_version=version,
                        notes=(
                            f"{sheet_label}; measure={measure}; payment={PAYMENT_METHOD}; "
                            f"GB average inc VAT benchmark; {detail}"
                        ),
                    )
                )
        return observations

    def evidence_from_pins(self) -> list[RawEvidence]:
        """Build RawEvidence rows from periods.json pins already on disk."""
        periods = _load_periods(self.periods_path)
        retrieved_at = datetime.now(timezone.utc).isoformat()
        evidence: list[RawEvidence] = []
        for period in periods:
            for rel, content_type in (
                (
                    period.annex9_relpath,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ),
                (period.pdf_relpath, "application/pdf"),
            ):
                path = self.data_root / rel
                if not path.is_file():
                    raise FileNotFoundError(f"Missing pinned asset: {path}")
                evidence.append(
                    RawEvidence(
                        path=rel,
                        retrieved_at=retrieved_at,
                        checksum_sha256=sha256_file(path),
                        content_type=content_type,
                        official_release_date=period.period_start,
                        http_status=200,
                        source_url=period.page_url or LANDING_URL,
                    )
                )
        return evidence

    def write_periods_csv(self) -> Path:
        periods = _load_periods(self.periods_path)
        out = self.data_root / "periods.csv"
        with out.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "slug",
                    "period_start",
                    "period_end",
                    "label",
                    "annex9_relpath",
                    "pdf_relpath",
                    "page_url",
                ],
            )
            writer.writeheader()
            for period in periods:
                writer.writerow(
                    {
                        "slug": period.slug,
                        "period_start": period.period_start,
                        "period_end": period.period_end,
                        "label": period.label,
                        "annex9_relpath": period.annex9_relpath,
                        "pdf_relpath": period.pdf_relpath,
                        "page_url": period.page_url,
                    }
                )
        return out


def main() -> None:
    connector = OfgemDefaultTariffCapConnector()
    evidence = connector.evidence_from_pins()
    observations = connector.transform(evidence)
    connector.write_periods_csv()
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    dual = [o for o in observations if "measure=dual_fuel" in o.notes]
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"periods: {len(dual)}")
    for obs in dual:
        print(f"  {obs.period_start} → dual_fuel £{obs.value}/year")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path} ({len(observations)} rows)")


if __name__ == "__main__":
    main()
