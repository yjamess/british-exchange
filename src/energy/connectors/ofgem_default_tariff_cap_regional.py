"""Ofgem default-tariff cap — regional £/year from pinned Annex 9 (GB charge regions).

Approach (plain language):
1. Reuse the same periods.json + Annex 9 pins as ``ofgem-default-tariff-cap``.
2. Parse sheet ``1a Levelised DTC`` regional rows under Other Payment Method.
3. Emit electricity single-rate, gas, and dual-fuel (implied) for each of the 14 regions.
4. GB average is already in the national series — this package is regions only.

Best practices:
- pathlib.Path (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
"""

from __future__ import annotations

import json
import shutil
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
from energy.connectors.ofgem_default_tariff_cap import (
    LANDING_URL,
    PAYMENT_METHOD,
    _typical_consumption_mwh,
)

INDICATOR_ID = "ofgem-default-tariff-cap-regional"
PACKAGE = ENERGY_DATA / INDICATOR_ID
NATIONAL_PACKAGE = ENERGY_DATA / "ofgem-default-tariff-cap"
GB_GEOGRAPHY_CODE = "K03000001"

# Stop markers when walking the Other Payment Method block.
STOP_LABELS = {"Standard Credit", "PPM", "Other Payment Method"}
SKIP_LABELS = {
    "",
    "Nil",
    "GB average",
    "GB average, inc VAT",
}


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


def _region_rows(ws: Worksheet, payment_header: str) -> list[tuple[str, float, float, float]]:
    """Return (region, elec, gas, dual) under a payment block — inc VAT regional £/year.

    Annex 9 regional rows are ex VAT. The block also publishes "GB average" (ex VAT) and
    "GB average, inc VAT"; their ratio is the VAT factor Ofgem applied for that fuel and period
    (5% normally, 0% for electricity from October 2026 to March 2027). Using the published ratio
    keeps regional values consistent with Ofgem's own inc-VAT figures.
    """
    in_block = False
    out: list[tuple[str, float, float, float]] = []
    gb_ex: tuple[float, float, float] | None = None
    gb_inc: tuple[float, float, float] | None = None
    for row in ws.iter_rows(max_col=12, values_only=True):
        label = "" if row[1] is None else str(row[1]).strip()
        if label == payment_header:
            in_block = True
            continue
        if not in_block:
            continue
        if label in STOP_LABELS and label != payment_header:
            break
        try:
            vals = (float(row[3]), float(row[7]), float(row[9]))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue
        low = " ".join(label.lower().split())
        if low.startswith("gb average"):
            if "inc vat" in low:
                gb_inc = vals
            else:
                gb_ex = vals
            continue
        if label in SKIP_LABELS or label.startswith("GB average") or not label:
            continue
        out.append((label, *vals))
    if not out:
        raise ValueError(f"No regional rows under {payment_header!r} in 1a Levelised DTC")
    if gb_ex is None or gb_inc is None:
        raise ValueError(f"GB average rows missing under {payment_header!r}; cannot derive VAT factor")
    factors = tuple(inc / ex if ex else 1.0 for inc, ex in zip(gb_inc, gb_ex))
    return [(label, e * factors[0], g * factors[1], d * factors[2]) for label, e, g, d in out]


def _sync_pins_from_national() -> Path:
    """Copy periods.json + raw Annex pins into this package (hard links / copy)."""
    PACKAGE.mkdir(parents=True, exist_ok=True)
    periods_src = NATIONAL_PACKAGE / "periods.json"
    if not periods_src.is_file():
        raise FileNotFoundError(f"National Ofgem periods missing: {periods_src}")
    periods_dst = PACKAGE / "periods.json"
    shutil.copy2(periods_src, periods_dst)
    periods = _load_periods(periods_dst)
    for period in periods:
        for rel in (period.annex9_relpath, period.pdf_relpath):
            src = NATIONAL_PACKAGE / rel
            dst = PACKAGE / rel
            if not src.is_file():
                raise FileNotFoundError(f"Missing national pin: {src}")
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.is_file() or sha256_file(dst) != sha256_file(src):
                shutil.copy2(src, dst)
    return periods_dst


class OfgemDefaultTariffCapRegionalConnector(Connector):
    """Regional Ofgem default tariff cap £/year from pinned Annex 9."""

    def __init__(self) -> None:
        super().__init__(PACKAGE)
        self.periods_path = PACKAGE / "periods.json"

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Ofgem default tariff (price) cap — GB regions",
            sector="energy-industry",
            publisher="Ofgem",
            source_url=LANDING_URL,
            series_id="Ofgem Annex 9 levelised DTC by charge-restriction region (inc VAT)",
            geography="Great Britain charge-restriction regions; not Northern Ireland",
            frequency="quarterly",
            unit="GBP per year (benchmark / typical consumption)",
            definition=(
                "Regional default tariff (price) cap levels for a typical domestic "
                "consumer from Ofgem Annex 9 sheet 1a Levelised DTC under Other Payment "
                "Method. Regional rows are published ex VAT; curated values apply Ofgem's own VAT ratio "
                "for consumer-comparable £/year. Not DESNZ regional average bills and not NI."
            ),
            licence="Ofgem published materials — Crown copyright / Ofgem terms on each asset",
            agent_owner="energy",
            connector_module="energy.connectors.ofgem_default_tariff_cap_regional",
            curated_path="curated/observations.csv",
            update_cadence="Each new charge restriction period (re-pin Annex 9 with national package)",
            raw_evidence=list(evidence),
            related_indicator_ids=["ofgem-default-tariff-cap", "domestic-electricity-unit-standing"],
            transformations=(
                "Sync pins from ofgem-default-tariff-cap. Parse 1a Levelised DTC regional "
                "rows under Other Payment Method; emit elec_single, gas, dual_fuel × region. "
                "Multiply ex-VAT regional £ by the published GB inc-VAT ÷ ex-VAT ratio for that fuel and period."
            ),
            caveats=(
                "GB charge-restriction regions only — not NI. Cap ≠ DESNZ QEP regional "
                "average bills. TDCV differs from DESNZ 3,400 / 11,200 kWh. Pin archive "
                "coverage follows the national package (recent periods until history pins grow)."
            ),
            revision_notes="Shares Annex 9 pins with ofgem-default-tariff-cap.",
            open_questions=["Extend regional history as more Annex 9 periods are pinned."],
            schema_version="1.0",
        )

    def evidence_from_pins(self) -> list[RawEvidence]:
        _sync_pins_from_national()
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

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        periods = _load_periods(self.periods_path)
        by_path = {item.path: item for item in evidence}
        observations: list[Observation] = []
        for period in periods:
            if period.annex9_relpath not in by_path:
                raise ValueError(f"Evidence missing for {period.annex9_relpath}")
            annex = self.data_root / period.annex9_relpath
            wb = openpyxl.load_workbook(annex, data_only=True, read_only=True)
            sheet_a = wb["1a Levelised DTC"]
            sheet_c = wb["1c Consumption adjusted levels"]
            regions = _region_rows(sheet_a, PAYMENT_METHOD)
            cons = _typical_consumption_mwh(sheet_c, period_start=period.period_start)
            version = f"ofgem-annex9-regional-{period.slug}"
            for region, elec, gas, dual in regions:
                for measure, value, detail in (
                    (
                        "elec_single",
                        elec,
                        f"Electricity single-rate; TDCV {cons['elec_single_mwh']} MWh",
                    ),
                    ("gas", gas, f"Gas; TDCV {cons['gas_mwh']} MWh"),
                    (
                        "dual_fuel",
                        dual,
                        (
                            f"Dual fuel (implied); TDCV elec {cons['elec_single_mwh']} MWh "
                            f"+ gas {cons['gas_mwh']} MWh"
                        ),
                    ),
                ):
                    observations.append(
                        Observation(
                            indicator_id=INDICATOR_ID,
                            period_start=period.period_start,
                            period_end=period.period_end,
                            geography_code=GB_GEOGRAPHY_CODE,
                            geography_label=region,
                            value=round(value, 2),
                            unit="GBP/year",
                            observation_status="final",
                            source_version=version,
                            notes=(
                                f"{period.label}; measure={measure}; payment={PAYMENT_METHOD}; "
                                f"region={region}; inc VAT (Ofgem GB inc/ex VAT ratio); {detail}"
                            ),
                        )
                    )
        return observations


def main() -> None:
    connector = OfgemDefaultTariffCapRegionalConnector()
    evidence = connector.evidence_from_pins()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    regions = sorted({o.geography_label for o in observations})
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"observations: {len(observations)}")
    print(f"regions: {len(regions)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")


if __name__ == "__main__":
    main()
