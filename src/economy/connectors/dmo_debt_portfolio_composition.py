"""DMO debt portfolio composition (gilts + debt-management T-bills) from the Quarterly Review.

Approach (plain language)
-------------------------
The DMO Quarterly Review (QR) opens with two tables of the *debt portfolio*:

* page 1 — **uplifted nominal** value (face value, with index-linked gilts uplifted by
  inflation), at four quarter-ends, **gross** and **net** (net excludes gilts the DMO holds);
* page 2 — **market value**, two quarter-ends, gross and net.

Each table splits the portfolio into conventional gilts, index-linked gilts and Treasury
bills (debt-management only). We parse the pinned PDF with ``pypdf`` and keep every cell as
one observation, with ``key=value`` notes so nobody has to guess which valuation or basis a
number is on. Totals are checked against the sum of their parts.

This is **instrument composition**, not *who owns the debt* — that is
``gilt-holdings-by-sector``.

Run: ``uv run python -m economy.connectors.dmo_debt_portfolio_composition``
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.dmo_pins import pinned_evidence
from economy.connectors.dmo_quarterly_review import (
    PortfolioPoint,
    find_page,
    page_texts,
    parse_market_value_portfolio,
    parse_uplifted_nominal_portfolio,
)

INDICATOR_ID = "dmo-debt-portfolio-composition"
QR_LABEL = "DMO Quarterly Review Oct-Dec 2025"
QR_URL = "https://www.dmo.gov.uk/media/wysdetq0/oct-dec-2025.pdf"
PDF_NAME = "dmo_quarterly_review_2025_q4.pdf"

UNITS = {
    "uplifted-nominal": "£ billion, uplifted nominal",
    "market-value": "£ billion, market value",
}
# Components are printed to 2 dp in £bn, so allow 2 × 0.01 rounding.
PARTS_TOLERANCE_GBN = 0.02


def check_points(points: Sequence[PortfolioPoint]) -> dict[str, Any]:
    """total == conventional + index-linked + T-bills for every valuation/basis/date; net ≤ gross."""
    groups: dict[tuple[str, str, date], dict[str, float]] = {}
    for p in points:
        groups.setdefault((p.valuation, p.basis, p.as_of), {})[p.instrument] = p.value_gbn
    checks: list[dict[str, Any]] = []
    for (valuation, basis, as_of), parts in sorted(groups.items()):
        total = parts["total"]
        summed = sum(v for k, v in parts.items() if k != "total")
        checks.append(
            {
                "valuation": valuation,
                "basis": basis,
                "as_of": as_of.isoformat(),
                "total": total,
                "sum_of_parts": round(summed, 2),
                "ok": abs(total - summed) <= PARTS_TOLERANCE_GBN,
            }
        )
    net_le_gross = all(
        groups[(v, "net", d)]["total"] <= groups[(v, "gross", d)]["total"]
        for (v, b, d) in groups
        if b == "gross"
    )
    report = {
        "rule": "total == sum(instruments) within £0.02bn; net total <= gross total",
        "parts_checks": checks,
        "net_le_gross": net_le_gross,
        "pass": all(c["ok"] for c in checks) and net_le_gross,
    }
    if not report["pass"]:
        raise ValueError(f"Portfolio self-check failed: {json.dumps(report, indent=2)}")
    return report


class DmoDebtPortfolioCompositionConnector(Connector):
    """Curate the QR debt-portfolio composition tables (uplifted nominal + market value)."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch(self) -> list[RawEvidence]:
        """No download (DMO is behind a bot wall): verify the browser-pinned PDF."""
        return [
            pinned_evidence(
                self.data_root / "raw" / PDF_NAME,
                self.data_root,
                source_url=QR_URL,
                content_type="application/pdf",
            )
        ]

    def _points(self, evidence: Sequence[RawEvidence]) -> list[PortfolioPoint]:
        pdf = next(self.data_root / e.path for e in evidence if e.path.endswith(".pdf"))
        texts = page_texts(pdf)
        _, p_nominal = find_page(texts, "Debt portfolio statistics", "Uplifted nominal value")
        _, p_market = find_page(texts, "Debt Portfolio - Market Value Statistics")
        return parse_uplifted_nominal_portfolio(p_nominal) + parse_market_value_portfolio(p_market)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        points = self._points(evidence)
        check_points(points)
        out = [
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=p.as_of.isoformat(),  # a stock at a date: start == end
                period_end=p.as_of.isoformat(),
                geography_code="K02000001",
                geography_label="United Kingdom",
                value=p.value_gbn,
                unit=UNITS[p.valuation],
                observation_status="final",
                source_version=QR_LABEL,
                notes=(
                    f"series={p.valuation}-{p.basis}-{p.instrument}; "
                    f"valuation={p.valuation}; basis={p.basis}; "
                    f"instrument={p.instrument}; instrument_label={p.instrument_label}; "
                    "publisher=DMO; table=QR debt portfolio"
                ),
            )
            for p in points
        ]
        out.sort(key=lambda o: (o.period_start, o.notes))
        return out

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Debt portfolio composition (gilts and Treasury bills)",
            sector="economy-public-finance",
            publisher="DMO",
            source_url=QR_URL,
            series_id="DMO Quarterly Review — debt portfolio statistics",
            geography="United Kingdom (K02000001); central government debt portfolio",
            frequency="quarterly",
            unit="£ billion (uplifted nominal or market value — see notes valuation=)",
            definition=(
                "DMO debt portfolio by instrument: conventional gilts, index-linked gilts "
                "and Treasury bills issued for debt-management purposes. Uplifted nominal "
                "(index-linked gilts include inflation uplift) at four quarter-ends and "
                "market value at two, each on a gross basis and a net basis (net excludes "
                "gilts held by the DMO)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.dmo_debt_portfolio_composition",
            curated_path="curated/observations.csv",
            update_cadence="quarterly (DMO Quarterly Review)",
            raw_evidence=list(evidence),
            transformations=(
                "pypdf text extraction of QR pages 1-2; regex row parse; every printed £bn "
                "cell kept as one observation. series=<valuation>-<basis>-<instrument>; "
                "valuation=uplifted-nominal|market-value; basis=gross|net; instrument=total|"
                "conventional-gilts|index-linked-gilts|treasury-bills. Self-check: total == "
                "sum of instruments (±£0.02bn); net ≤ gross."
            ),
            revision_notes=(
                "Pinned QR: Oct-Dec 2025. Only the quarter-ends printed in that QR are "
                "curated (uplifted nominal Mar/Jun/Sep/Dec 2025; market value Sep/Dec 2025). "
                "The DMO website holds the full quarterly history (data section). Method "
                "note: all rows are 'final' in this QR vintage, but DMO can revise earlier "
                "quarters (QR footnote 3 on T-bill history) and a newer QR may restate "
                "them; 'final' means 'as printed in this QR', not 'never revised'."
            ),
            caveats=(
                "Uplifted nominal ≠ market value ≠ nominal in issue (D1A) ≠ PSND (HF6W); "
                "never sum across valuations. Excludes the £500m UK Sovereign Sukuk. T-bills "
                "are debt-management only (cash-management T-bills excluded from QR "
                "statistics since June 2016). Conventional gilts include green gilts "
                "(£49.6bn at Dec 2025 per QR footnote 4). Average maturity, yields and "
                "duration printed in the QR are NOT curated here. Earlier quarters in the "
                "QR may still be revised by DMO (see revision_notes)."
            ),
            status_note=(
                "Validation pass with warnings (qa_report_economy_08_debt_ownership_"
                "2026-11-14.md): 48/48 cells equal the QR PDF. Warnings: only the quarters "
                "printed in one QR, official_release_date unknown."
            ),
            related_indicator_ids=[
                "gilt-holdings-by-sector",
                "dmo-gilts-in-issue",
                "dmo-government-holdings",
                "dmo-gilt-future-redemptions",
                "public-sector-net-debt",
            ],
            open_questions=[
                "Back-fill earlier quarters from older QRs or the DMO quarterly debt portfolio history.",
                "Validation: spot-check against the QR PDF.",
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
        check_path = self.data_root / "curated" / "portfolio_self_check.json"
        check_path.write_text(
            json.dumps(check_points(self._points(evidence)), indent=2) + "\n",
            encoding="utf-8",
        )
        return manifest_path, curated_path


def main() -> None:
    connector = DmoDebtPortfolioCompositionConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch()
    obs = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, obs)
    print(f"observations: {len(obs)}")
    print(f"  manifest: {manifest_path}")
    print(f"  curated:  {curated_path}")


if __name__ == "__main__":
    main()
