"""DMO D4L — official government holdings of gilts (nominal, CRND + DMO).

Approach (plain language)
-------------------------
D4L lists, gilt by gilt and month by month, how many £ million (nominal) of each gilt are
held by the government itself — the Commissioners for the Reduction of the National Debt
(CRND) and the DMO. The Excel export stacks one block per financial year (FY 2005-06 …).

This connector:

1. Verifies the browser-pinned ``.xls`` against ``raw/SHA256SUMS``.
2. Walks every FY block, reading ISIN rows and the month columns named in that block's header.
3. Sums gilts per month into three monthly series: ``total``, ``conventional`` and
   ``index-linked`` (the file has no published total row, so the sum is *ours*).
4. Writes the **latest month-end per-gilt snapshot** to a side file for context.

Not "Who owns the debt": D4L **excludes** the Bank of England, local authorities and public
corporations, and counts **nominal** (not market) value. See ``gilt-holdings-by-sector``.

Run: ``uv run python -m economy.connectors.dmo_government_holdings``
"""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Sequence

import xlrd

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation, mark_latest_months_provisional
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.dmo_pins import pinned_evidence
from economy.connectors.ons_timeseries import month_bounds

INDICATOR_ID = "dmo-government-holdings"
RAW_NAME = "Government Holdings of Gilts Nov 14 2026.xls"
SOURCE_URL = "https://www.dmo.gov.uk/data/gilt-market/government-holdings/"
UNIT = "£ million, nominal"

_MONTH_HEADER = re.compile(r"^([A-Za-z]{3})-\s*(\d{4})$")
_DATA_DATE = re.compile(r"Data Date:\s*(\d{1,2})-([A-Za-z]{3})-(\d{4})")
_MON = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1
)}  # fmt: skip

SERIES_LABELS = {
    "total": "All gilts held by CRND + DMO",
    "conventional": "Conventional gilts (incl. annuities)",
    "index-linked": "Index-linked gilts",
}


@dataclass(frozen=True, slots=True)
class GiltMonth:
    """One gilt's holding at one month-end, as printed."""

    isin: str
    name: str
    year: int
    month: int
    nominal_gbp_mn: float

    @property
    def kind(self) -> str:
        return "index-linked" if "index-linked" in self.name.lower() else "conventional"


def parse_workbook(path: Path) -> tuple[list[GiltMonth], date]:
    """Read every FY block of the D4L sheet. Returns (cells, data_date)."""
    sheet = xlrd.open_workbook(str(path)).sheet_by_index(0)
    data_date_match = _DATA_DATE.search(str(sheet.cell_value(0, 0)))
    if data_date_match is None:
        raise ValueError("'Data Date:' stamp not found in cell A1")
    d, mon, y = data_date_match.groups()
    data_date = date(int(y), _MON[mon], int(d))

    cells: list[GiltMonth] = []
    months: list[tuple[int, int]] = []  # (year, month) for columns 2.. of the current block
    blocks = 0
    for r in range(sheet.nrows):
        row = sheet.row_values(r)
        first = str(row[0]).strip()
        second = str(row[1]).strip()
        if first.startswith("Financial Year -"):
            months = []
            blocks += 1
            continue
        # Month header row: blank A/B, then "Apr-\r2005" style labels.
        if not first and not second and str(row[2]).strip():
            labels = [str(c).replace("\r", "").replace("\n", "").strip() for c in row[2:]]
            parsed = [_MONTH_HEADER.match(lbl) for lbl in labels if lbl]
            if not all(parsed):
                raise ValueError(f"Row {r + 1}: unexpected month header {labels!r}")
            months = [(int(m.group(2)), _MON[m.group(1)]) for m in parsed if m]
            continue
        if second.startswith("GB"):
            if not months:
                raise ValueError(f"Row {r + 1}: gilt row before a month header")
            for (year, month), raw in zip(months, row[2 : 2 + len(months)], strict=True):
                if raw == "":
                    continue  # not yet issued / outside the block's published months
                if not isinstance(raw, float):
                    raise ValueError(f"Row {r + 1}: non-numeric holding {raw!r}")
                if raw < 0:
                    raise ValueError(f"Row {r + 1}: negative holding {raw}")
                cells.append(GiltMonth(second, first, year, month, raw))
    if blocks == 0 or not cells:
        raise ValueError("No financial-year blocks / gilt rows parsed")
    return cells, data_date


def monthly_series(cells: Sequence[GiltMonth]) -> dict[tuple[int, int], dict[str, float]]:
    """Sum gilts per month → {(year, month): {total, conventional, index-linked}}."""
    acc: dict[tuple[int, int], dict[str, float]] = defaultdict(
        lambda: {"conventional": 0.0, "index-linked": 0.0}
    )
    seen: set[tuple[str, int, int]] = set()
    for c in cells:
        key = (c.isin, c.year, c.month)
        if key in seen:
            raise ValueError(f"Duplicate ISIN-month in D4L file: {key}")
        seen.add(key)
        acc[(c.year, c.month)][c.kind] += c.nominal_gbp_mn
    return {
        ym: {**parts, "total": parts["conventional"] + parts["index-linked"]}
        for ym, parts in sorted(acc.items())
    }


class DmoGovernmentHoldingsConnector(Connector):
    """Curate D4L official holdings: monthly totals + latest per-gilt snapshot."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch(self) -> list[RawEvidence]:
        """No download (DMO is behind a bot wall): verify the browser-pinned Excel."""
        path = self.data_root / "raw" / RAW_NAME
        _, data_date = parse_workbook(path)
        return [
            pinned_evidence(
                path,
                self.data_root,
                source_url=SOURCE_URL,
                content_type="application/vnd.ms-excel",
                official_release_date=data_date.isoformat(),
            )
        ]

    def _cells(self, evidence: Sequence[RawEvidence]) -> tuple[list[GiltMonth], date]:
        path = next(self.data_root / e.path for e in evidence if e.path.endswith(".xls"))
        return parse_workbook(path)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        cells, data_date = self._cells(evidence)
        series = monthly_series(cells)
        label = f"DMO D4L export, data date {data_date.isoformat()}"
        out: list[Observation] = []
        for (year, month), values in series.items():
            start, end = month_bounds(year, month)
            for slug in ("total", "conventional", "index-linked"):
                out.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code="K02000001",
                        geography_label="United Kingdom",
                        value=round(values[slug], 8),
                        unit=UNIT,
                        observation_status="final",
                        source_version=label,
                        notes=(
                            f"series={slug}; holder=CRND+DMO; "
                            f"series_label={SERIES_LABELS[slug]}; valuation=nominal; "
                            "excludes=BoE,local-authorities,public-corporations; "
                            "aggregation=sum-of-gilt-rows (not a DMO-published total)"
                        ),
                    )
                )
        out = mark_latest_months_provisional(
            out, months=1, group_key=lambda o: o.notes.split(";", 1)[0]
        )
        out.sort(key=lambda o: (o.period_start, o.notes))
        return out

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Official government holdings of gilts (DMO D4L)",
            sector="economy-public-finance",
            publisher="DMO",
            source_url=SOURCE_URL,
            series_id="D4L",
            geography="United Kingdom (K02000001); gilts held by CRND and the DMO",
            frequency="monthly",
            unit="£ million, nominal",
            definition=(
                "Nominal value (£ million, excluding repo) of gilts held by the Commissioners "
                "for the Reduction of the National Debt (CRND) and the DMO, month-end, "
                "summed across gilts into total / conventional / index-linked. OFFICIAL "
                "holdings — NOT who owns the debt. Excludes the Bank of England, local "
                "authorities and public corporations."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.dmo_government_holdings",
            curated_path="curated/observations.csv",
            update_cadence="monthly (month-end, ~10 working days after)",
            raw_evidence=list(evidence),
            transformations=(
                "Parse every 'Financial Year' block of the D4L .xls (ISIN rows × month "
                "columns named by each block's header). Blank cells skipped. Sum gilts per "
                "month: total, conventional, index-linked (name contains 'Index-linked'). "
                "notes: series=<total|conventional|index-linked>; holder=CRND+DMO; "
                "valuation=nominal. Latest month per series marked provisional. Latest "
                "per-gilt month-end snapshot in curated/latest_snapshot_by_gilt.csv "
                "(side file, not observations)."
            ),
            revision_notes=(
                "Browser export pinned 14 Nov 2026 (data date 14 Nov 2026; latest month "
                "column Oct 2026). Re-pin monthly. Earlier months may be restated by DMO."
            ),
            caveats=(
                "NOMINAL, official holdings only: ≠ ONS market-value sector holdings "
                "(gilt-holdings-by-sector), ≠ gilts in issue, ≠ PSND (HF6W). The file "
                "does not state whether index-linked rows are inflation-uplifted. "
                "Validation evidence (D11b) says they are NOMINAL (not uplifted): D4L "
                "index-linked is ~£2.1bn while the QR gross-minus-net gap is ~£5.0bn "
                "uplifted, and D4L x the D1A uplift ratio lands within ~3% of that gap. "
                "DMO has not confirmed this, so never add D4L index-linked to uplifted "
                "totals. Bank of England APF gilts are NOT in this series. Totals are "
                "Exchange-derived sums of gilt rows (the file has no total row), not a "
                "DMO-published figure."
            ),
            status_note=(
                "Validation pass with warnings (qa_report_economy_08_debt_ownership_"
                "2026-11-14.md): 777/777 values re-summed from the raw xls; conventional "
                "ties to QR gross-minus-net within £0.01bn. Warning: index-linked basis "
                "is evidence-based (nominal), DMO confirmation pending."
            ),
            related_indicator_ids=[
                "gilt-holdings-by-sector",
                "dmo-gilts-in-issue",
                "dmo-debt-portfolio-composition",
                "dmo-gilt-future-redemptions",
            ],
            open_questions=[
                "Ask DMO to confirm index-linked D4L figures are nominal (Validation D11b "
                "evidence says nominal, not uplifted; unconfirmed).",
                "Validation: spot-check a month against the DMO D4L web table / D1A.",
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
        cells, data_date = self._cells(evidence)
        latest = max((c.year, c.month) for c in cells)
        snapshot = sorted(
            (c for c in cells if (c.year, c.month) == latest and c.nominal_gbp_mn > 0),
            key=lambda c: (c.kind, -c.nominal_gbp_mn),
        )
        as_of = month_bounds(*latest)[1]
        snap_path = self.data_root / "curated" / "latest_snapshot_by_gilt.csv"
        with snap_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["as_of_month_end", "isin", "gilt_name", "kind", "nominal_gbp_mn"])
            for c in snapshot:
                writer.writerow([as_of, c.isin, c.name, c.kind, f"{c.nominal_gbp_mn:.8f}"])
        check = {
            "data_date": data_date.isoformat(),
            "latest_month_end": as_of,
            "months": len(monthly_series(cells)),
            "gilt_month_cells": len(cells),
            "snapshot_gilts_held": len(snapshot),
            "latest_totals_gbp_mn": monthly_series(cells)[latest],
        }
        (self.data_root / "curated" / "parse_check.json").write_text(
            json.dumps(check, indent=2) + "\n", encoding="utf-8"
        )
        (self.data_root / "source_register.csv").write_text(
            "role,publisher,report,url,format,valuation,notes\n"
            f"primary,DMO,D4L Government Holdings of Gilts,{SOURCE_URL},XLS (browser export),"
            'nominal £m,"CRND + DMO only; excludes BoE, LA, public corporations"\n',
            encoding="utf-8",
        )
        return manifest_path, curated_path


def main() -> None:
    connector = DmoGovernmentHoldingsConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch()
    obs = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, obs)
    print(f"observations: {len(obs)}")
    print(f"  manifest: {manifest_path}")
    print(f"  curated:  {curated_path}")


if __name__ == "__main__":
    main()
