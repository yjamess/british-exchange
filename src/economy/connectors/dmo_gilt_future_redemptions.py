"""DMO D8B — Future Redemptions (gilts, by financial year).

Approach (plain language)
-------------------------
The DMO publishes a table: for each future financial year, how many £ million
of conventional and index-linked gilts will redeem, plus a total. The site is
behind a captcha, so the ``.xls`` is **pinned by hand** under ``raw/`` and this
connector only *reads* it (never rewrites it).

For each financial year we emit three observations (``series=conventional``,
``series=index_linked``, ``series=total``). Values stay exactly as published;
we do not add, derive or rebalance anything. A self-check only confirms that
the publisher's own conventional + index-linked columns equal its total.

Honesty: figures are net of government holdings, only part of the index-linked
uplift appears in redemptions, this is not a sales forecast, and it is not PSND.

Run: ``uv run python -m economy.connectors.dmo_gilt_future_redemptions``
Refs: https://xlrd.readthedocs.io/ · https://docs.python.org/3/library/re.html
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.dmo_common import (
    DMO_TERMS_URL,
    LICENCE,
    UK_CODE,
    UK_LABEL,
    excel_date_to_iso,
    open_sheet,
    parse_number,
    pinned_evidence,
)

INDICATOR_ID = "dmo-gilt-future-redemptions"
RAW_FILENAME = "Future Redemptions Nov 14 2026.xls"
PINNED_ON = "2026-11-14"
SOURCE_URL = "https://www.dmo.gov.uk/data/pdfdatareport?reportCode=D8B"
UNIT = "£ million"

_FY_PATTERN = re.compile(r"^(\d{4})-(\d{4})$")
# Column index -> series key (header text is multi-line; map by position, then verify).
_SERIES_COLUMNS: tuple[tuple[int, str, str], ...] = (
    (1, "conventional", "conventional"),
    (2, "index_linked", "index-linked"),
    (3, "total", "total"),
)


def _clean(cell: object) -> str:
    """Collapse whitespace/newlines in a header or label cell."""
    return " ".join(str(cell).split())


def _financial_year_bounds(label: str) -> tuple[str, str]:
    """``'2027-2028'`` -> ``('2027-04-01', '2028-03-31')`` (FY runs 1 Apr–31 Mar)."""
    match = _FY_PATTERN.match(label)
    if not match:
        raise ValueError(f"Not a financial-year label: {label!r}")
    start_year, end_year = int(match.group(1)), int(match.group(2))
    if end_year != start_year + 1:
        raise ValueError(f"Financial year must span consecutive years: {label!r}")
    return f"{start_year}-04-01", f"{end_year}-03-31"


class DmoGiltFutureRedemptionsConnector(Connector):
    """Read the pinned D8B workbook; curate FY × {conventional, index_linked, total}."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def _data_date(self) -> str:
        """Report 'Data Date' (row 0) as ISO date."""
        sheet, datemode = open_sheet(self.data_root / "raw" / RAW_FILENAME)
        label, serial = sheet.cell_value(0, 0), sheet.cell_value(0, 1)
        if "data date" not in str(label).lower() or not isinstance(serial, float):
            raise ValueError(f"Unexpected D8B title row: {sheet.row_values(0)!r}")
        return excel_date_to_iso(serial, datemode)

    def fetch(self) -> list[RawEvidence]:
        """No download (captcha). Verify the pinned file and describe it."""
        return [
            pinned_evidence(
                self.data_root,
                RAW_FILENAME,
                retrieved_on=PINNED_ON,
                official_release_date=self._data_date(),
                source_url=SOURCE_URL,
            )
        ]

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Gilt future redemptions by financial year (DMO D8B)",
            sector="economy-public-finance",
            publisher="UK Debt Management Office (DMO)",
            source_url=SOURCE_URL,
            series_id="D8B",
            geography="United Kingdom (K02000001); UK central government gilts",
            frequency="ad_hoc",
            unit=UNIT,
            definition=(
                "DMO report D8B: amount of conventional and index-linked gilts due to "
                "redeem in each future financial year (1 April–31 March), £ million, "
                "net of government holdings. Notes carry series=conventional|"
                "index_linked|total and fy=YYYY-YYYY."
            ),
            licence=LICENCE,
            agent_owner="economy",
            connector_module="economy.connectors.dmo_gilt_future_redemptions",
            curated_path="curated/observations.csv",
            update_cadence=(
                "living profile — DMO updates as gilts are issued/redeem; re-pin the "
                "browser-downloaded .xls when a fresh snapshot is needed"
            ),
            raw_evidence=list(evidence),
            transformations=(
                "Read Sheet1 of the pinned .xls with xlrd. Header row 1, FY rows from "
                "row 2 until the first blank label. Comma-formatted strings parsed to "
                "numbers. One observation per FY per series; period = FY start to FY "
                "end. Values unchanged from the publisher; no derived totals. Self-"
                "check: conventional + index_linked == published total (£1m rounding)."
            ),
            revision_notes=(
                "Snapshot data-date 2026-11-14. The profile changes with every new "
                "issue and redemption. Rows marked provisional because DMO notes "
                "government-holdings data are only updated after month-end, so net "
                "figures may temporarily overstate before the monthly update."
            ),
            caveats=(
                "Net of government holdings (market-hands amounts). Index-linked "
                "redemptions include only part of the inflation uplift; the rest sits "
                "in the CGNCR in the redeeming year, so IL redemptions do NOT tally "
                "with uplifted nominal in issue (see dmo-gilts-in-issue). Not a gilt "
                "sales / issuance forecast. Not PSND (HF6W) and not a repayment "
                "schedule for all public-sector debt. Gilts only: no Treasury bills, "
                "NS&I or non-gilt debt. This D8B export starts at FY 2027-28 and omits "
                "the remainder of the current financial year (2026-27); gilts maturing "
                "before April 2027 still appear in dmo-gilts-in-issue — do not chart "
                "D8B alone as if nothing redeems until 2027-28."
            ),
            related_indicator_ids=[
                "dmo-gilts-in-issue",
                "cg-cash-debt-reconciliation",
                "public-sector-net-debt",
            ],
            open_questions=[
                "Validation: spot-check FY totals against the DMO D8B PDF/XML export.",
                "Raw is a browser pin (captcha); agree re-pin cadence with Orchestrator.",
            ],
            notion_registry_url="",
            schema_version="1.0",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if len(evidence) != 1:
            raise ValueError("Expected exactly one raw file for D8B")
        item = evidence[0]
        sheet, _ = open_sheet(self.data_root / item.path)
        release = item.official_release_date
        source_version = f"DMO D8B data-date {release}"

        header = [_clean(c).lower() for c in sheet.row_values(1)]
        if not (
            header[0].startswith("financial year")
            and "conventional" in header[1]
            and "index" in header[2]
            and "total" in header[3]
        ):
            raise ValueError(f"Unexpected D8B header row: {header!r}")

        observations: list[Observation] = []
        for row_idx in range(2, sheet.nrows):
            label = _clean(sheet.cell_value(row_idx, 0))
            if not label:
                break  # blank row ends the FY table; footnotes follow
            start, end = _financial_year_bounds(label)
            values = {key: parse_number(sheet.cell_value(row_idx, col)) for col, key, _ in _SERIES_COLUMNS}
            if abs(values["conventional"] + values["index_linked"] - values["total"]) > 1.0:
                raise ValueError(
                    f"{label}: conventional + index-linked != total ({values}); "
                    "publisher row is inconsistent — investigate before curating."
                )
            for _, key, text in _SERIES_COLUMNS:
                observations.append(
                    Observation(
                        indicator_id=INDICATOR_ID,
                        period_start=start,
                        period_end=end,
                        geography_code=UK_CODE,
                        geography_label=UK_LABEL,
                        value=values[key],
                        unit=UNIT,
                        observation_status="provisional",
                        source_version=source_version,
                        notes=(
                            f"series={key}; kind={key}; fy={label}; table=D8B; "
                            f"basis=net_of_government_holdings; label={text} redemptions"
                        ),
                    )
                )
        if not observations:
            raise ValueError("No D8B financial-year rows parsed")
        return observations


def main() -> None:
    connector = DmoGiltFutureRedemptionsConnector()
    evidence = connector.fetch()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    fys = sorted({o.period_start for o in observations})
    print(f"raw verified: {evidence[0].path} sha256={evidence[0].checksum_sha256[:12]}…")
    print(f"observations: {len(observations)} ({len(fys)} financial years × 3 series)")
    print(f"first FY: {fys[0]} … last FY: {fys[-1]}")
    print(f"manifest: {manifest_path}\ncurated:  {curated_path}")


if __name__ == "__main__":
    main()
