"""Who owns the gilts? ONS sector holdings at market value, via the DMO Quarterly Review.

Approach (plain language)
-------------------------
The Office for National Statistics (ONS) estimates which sector holds UK government
gilts (overseas, pension funds, the Bank of England's APF, …) at **market value**.
The DMO republishes that ONS table every quarter in its Quarterly Review (QR) PDF.
We could not find a machine-readable ONS series (CDID) for it, so this connector:

1. Verifies the pinned QR PDF against ``SHA256SUMS`` and copies it into this
   indicator's own ``raw/`` folder (so the package is self-contained).
2. Extracts the PDF text with ``pypdf`` and parses the holdings table.
3. Checks the table's own arithmetic (sectors sum to TOTAL; printed % matches).
4. Writes one observation per sector × quarter, plus a TOTAL row per quarter.

This indicator is **not** nominal gilt stock, **not** public-sector net debt (HF6W) and
**not** the DMO's official holdings (D4L — see ``dmo-government-holdings``).

Best practices: pathlib, type hints, fail loudly instead of guessing
(https://docs.python.org/3/library/pathlib.html, PEP 8).

Run: ``uv run python -m economy.connectors.gilt_holdings_by_sector``
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.dmo_pins import pinned_evidence
from economy.connectors.dmo_quarterly_review import (
    SectorHoldingsTable,
    find_page,
    page_texts,
    parse_sector_holdings,
)
from economy.connectors.ons_timeseries import quarter_bounds

INDICATOR_ID = "gilt-holdings-by-sector"
PIN_DATE = "2026-11-14"  # date the QR PDF was pinned (see data/economy/.../raw/SHA256SUMS)
QR_LABEL = "DMO Quarterly Review Oct-Dec 2025 (ONS Source)"
QR_URL = "https://www.dmo.gov.uk/media/wysdetq0/oct-dec-2025.pdf"
HUB_URL = "https://www.dmo.gov.uk/data/gilt-market/"
PDF_NAME = "dmo_quarterly_review_2025_q4.pdf"
# The PDF is pinned once, under the composition indicator (same publication).
SHARED_PIN = ECONOMY_DATA / "dmo-debt-portfolio-composition" / "raw" / PDF_NAME

UNIT = "£ million, market value"

# QR printed label → sector slug. Unknown labels raise: ONS has renamed sectors before
# (e.g. "Banks and building societies" → "Monetary financial institutions" in 2011).
SECTORS: dict[str, str] = {
    "Overseas": "overseas",
    "Insurance companies and pension funds": "insurance-pension-funds",
    "Bank of England (Asset Purchase Facility)": "bank-of-england-apf",
    "Other financial institutions and private non-financial corporations": (
        "other-financial-pnfc"
    ),
    "Monetary financial institutions": "monetary-financial-institutions",
    "Households and non-profit institutions serving households": "households-npish",
    "Local authorities and public corporations": "local-authorities-public-corporations",
}

# Rounding tolerances for the table self-check (QR: "Figures may not sum due to rounding").
SUM_TOLERANCE_GBP_MN = 7  # seven independently rounded sector figures
SHARE_TOLERANCE_PCT = 0.051  # printed to 1 decimal place


def _quarter_key(year: int, quarter: int) -> str:
    return f"{year}-Q{quarter}"


def check_table(table: SectorHoldingsTable) -> dict[str, Any]:
    """Verify the QR table's own arithmetic. Raises ``ValueError`` on failure."""
    if {r.sector_label for r in table.rows} != set(SECTORS):
        raise ValueError(
            f"Sector labels changed: {sorted(r.sector_label for r in table.rows)}"
        )
    sums: list[dict[str, Any]] = []
    for idx, (year, quarter) in enumerate(table.quarters):
        sector_sum = sum(r.values_gbp_mn[idx] for r in table.rows)
        total = table.total_gbp_mn[idx]
        diff = sector_sum - total
        sums.append(
            {
                "quarter": _quarter_key(year, quarter),
                "sum_of_sectors": sector_sum,
                "published_total": total,
                "diff": diff,
                "ok": abs(diff) <= SUM_TOLERANCE_GBP_MN,
            }
        )
    last = len(table.quarters) - 1
    total_last = table.total_gbp_mn[last]
    shares: list[dict[str, Any]] = []
    for row in table.rows:
        computed = 100 * row.values_gbp_mn[last] / total_last
        shares.append(
            {
                "sector": SECTORS[row.sector_label],
                "published_pct": row.latest_share_pct,
                "computed_pct": round(computed, 3),
                "ok": abs(computed - row.latest_share_pct) <= SHARE_TOLERANCE_PCT,
            }
        )
    report = {
        "rule": "sum(sectors) == TOTAL (±rounding) per quarter; printed % == value/TOTAL",
        "sum_checks": sums,
        "share_checks": shares,
        "pass": all(s["ok"] for s in sums) and all(s["ok"] for s in shares),
    }
    if not report["pass"]:
        raise ValueError(f"QR holdings table failed self-check: {json.dumps(report, indent=2)}")
    return report


class GiltHoldingsBySectorConnector(Connector):
    """Pin the QR PDF; curate ONS sector gilt holdings (market value, £mn)."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    # ---- fetch -----------------------------------------------------------------

    def fetch(self) -> list[RawEvidence]:
        """Copy the shared, checksum-verified QR PDF into this indicator's raw folder."""
        pinned = pinned_evidence(
            SHARED_PIN,
            ECONOMY_DATA / "dmo-debt-portfolio-composition",
            source_url=QR_URL,
            content_type="application/pdf",
        )
        dest = self.data_root / "raw" / PIN_DATE / PDF_NAME
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SHARED_PIN, dest)
        # Record the verified checksum beside the copy, then re-verify the copy on disk.
        (dest.parent / "SHA256SUMS").write_text(
            f"{pinned.checksum_sha256}  {PDF_NAME}\n", encoding="utf-8"
        )
        return [
            pinned_evidence(
                dest,
                self.data_root,
                source_url=QR_URL,
                content_type="application/pdf",
            )
        ]

    # ---- transform -------------------------------------------------------------

    def _read_table(self, evidence: Sequence[RawEvidence]) -> SectorHoldingsTable:
        pdf = next(self.data_root / e.path for e in evidence if e.path.endswith(".pdf"))
        texts = page_texts(pdf)
        _, page = find_page(texts, "Gilt holdings (£mn, market values)")
        return parse_sector_holdings(page)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        table = self._read_table(evidence)
        check_table(table)

        rows: list[tuple[str, str, str, tuple[int, int, int, int]]] = [
            (SECTORS[r.sector_label], r.sector_label, "sector", r.values_gbp_mn)
            for r in table.rows
        ]
        rows.append(("total", "TOTAL", "total", table.total_gbp_mn))

        out: list[Observation] = []
        for slug, label, component, values in rows:
            for (year, quarter), value in zip(table.quarters, values, strict=True):
                start, end = quarter_bounds(year, quarter)
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code="K02000001",
                        geography_label="United Kingdom",
                        value=float(value),
                        unit=UNIT,
                        observation_status="final",
                        source_version=QR_LABEL,
                        notes=(
                            f"series={slug}; sector={slug}; sector_label={label}; "
                            f"component={component}; valuation=market-value; "
                            "publisher=ONS; channel=DMO Quarterly Review"
                        ),
                    )
                )
        # ONS revises recent quarters; flag only the latest quarter per series as provisional.
        out = mark_latest_months_provisional(
            out,
            months=1,
            group_key=lambda o: o.notes.split(";", 1)[0],
        )
        out.sort(key=lambda o: (o.period_start, o.notes))
        return out

    # ---- manifest + hand-off ---------------------------------------------------

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Who owns the debt? Gilt holdings by sector (market value)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=QR_URL,
            series_id="ONS gilt holdings by sector (DMO QR table; CDIDs not located)",
            geography="United Kingdom (K02000001); holders of UK government gilts",
            frequency="quarterly",
            unit="£ million, market value",
            definition=(
                "ONS estimate of who holds UK government gilts, by institutional sector, "
                "valued at market prices (£ million, end of quarter). Seven published "
                "sectors plus TOTAL; the Bank of England appears as its Asset Purchase "
                "Facility; monetary financial institutions exclude the Bank of England. "
                "ONS is the publisher of the numbers; the DMO Quarterly Review is the "
                "republication channel."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.gilt_holdings_by_sector",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (DMO Quarterly Review, ~6 weeks after quarter end)",
            raw_evidence=list(evidence),
            transformations=(
                "pypdf text extraction of the QR 'Gilt and Treasury Bill Holdings' page; "
                "regex row parse (label + four quarterly £mn values + latest-quarter %); "
                "self-check sum(sectors)==TOTAL within rounding and printed % vs computed. "
                "One row per sector×quarter plus TOTAL. notes: series=<sector slug>; "
                "sector=…; component=sector|total; valuation=market-value. Latest quarter "
                "per series marked provisional."
            ),
            revision_notes=(
                "ONS: 'These figures can be revised retrospectively.' Each QR restates "
                "recent quarters; re-pin newer QRs and let the latest QR win for overlaps. "
                "Pinned QR: Oct-Dec 2025 (quarters Q4 2024 – Q3 2025). Method note: only the "
                "latest quarter per series is flagged provisional, but ONS can revise any "
                "earlier quarter in the QR too, so 'final' on Q4 2024 – Q2 2025 means "
                "'final in this QR vintage', not 'will never change'. Any display should "
                "say figures may be revised retrospectively."
            ),
            caveats=(
                "MARKET VALUE, not nominal: ≠ gilts in issue (D1A), ≠ uplifted-nominal "
                "debt portfolio, ≠ public-sector net debt (HF6W), ≠ DMO/CRND official "
                "holdings (D4L). Overseas % is a share of gilt market value, not of PSND. "
                "'Other financial institutions and PNFC' is a large mixed residual "
                "(funds, dealers, hedge funds). Sector names have changed over time; "
                "Bank of England's discontinued 2002 sector table is NOT used. ONS figures "
                "can be revised retrospectively; earlier quarters in the QR may still "
                "revise (see revision_notes)."
            ),
            status_note=(
                "Validation pass with warnings (qa_report_economy_08_debt_ownership_"
                "2026-11-14.md): 32/32 cells equal the QR PDF. Warnings: 4-quarter depth, "
                "no ONS CDIDs, official_release_date unknown."
            ),
            related_indicator_ids=[
                "dmo-government-holdings",
                "dmo-debt-portfolio-composition",
                "dmo-gilts-in-issue",
                "public-sector-net-debt",
            ],
            open_questions=[
                "Locate ONS UKEA / sector-account CDIDs for these holdings to replace the PDF parse.",
                "Pin newer QRs (Jan-Mar, Apr-Jun, Jul-Sep 2026) to extend the series past Q3 2025.",
                "Validation: spot-check against the QR PDF and an independent ONS release.",
                "Confirm the QR Oct-Dec 2025 publication date and fill raw_evidence."
                "official_release_date (not stated in the PDF text; PDF file metadata "
                "says created 2026-03-13, which is not proof of the release date).",
            ],
            notion_registry_url="",
            schema_version="1.0",
        )

    def write_hand_off(
        self,
        evidence: Sequence[RawEvidence],
        observations: Sequence[Observation],
        **kwargs: Any,
    ) -> tuple[Path, Path]:
        manifest_path, curated_path = super().write_hand_off(evidence, observations, **kwargs)
        check_path = self.data_root / "curated" / "table_self_check.json"
        check_path.write_text(
            json.dumps(check_table(self._read_table(evidence)), indent=2) + "\n",
            encoding="utf-8",
        )
        register = self.data_root / "source_register.csv"
        register.write_text(
            "role,publisher,channel,url,format,valuation,notes\n"
            f"primary,ONS,DMO Quarterly Review,{QR_URL},PDF,market value £mn,"
            '"pypdf text parse; ONS CDIDs not located"\n'
            f"hub,DMO,Gilt market data,{HUB_URL},HTML,,landing page\n",
            encoding="utf-8",
        )
        return manifest_path, curated_path


def main() -> None:
    connector = GiltHoldingsBySectorConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch()
    obs = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, obs)
    print(f"observations: {len(obs)}")
    print(f"  manifest: {manifest_path}")
    print(f"  curated:  {curated_path}")


if __name__ == "__main__":
    main()
