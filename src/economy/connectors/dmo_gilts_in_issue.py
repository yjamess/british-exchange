"""DMO D1A — Gilts in Issue (one row per gilt, working-day snapshot).

Approach (plain language)
-------------------------
The DMO workbook lists every gilt in issue on one date, in blocks:

* Conventional gilts, grouped by maturity bucket (Ultra-Short / Short / Medium / Long).
  One amount: ``Total Amount in Issue (£ million nominal)``.
* Index-linked gilts, in two blocks (3-month and 8-month indexation lag). Two
  amounts: nominal, and nominal **including index-linked uplift**.

The captcha-protected ``.xls`` is pinned by hand under ``raw/``; this connector
only reads it. We find each block by scanning for its header row (not by fixed
row numbers, so a longer gilt list will not break it) and treat any row whose
second cell looks like an ISIN as a gilt.

Output per gilt: ``series=nominal`` (all gilts) and, for index-linked gilts
only, ``series=uplifted_nominal``. Nothing is invented — conventional gilts
have no uplifted figure in the source, so none is emitted.

Self-check: conventional nominal + index-linked uplifted nominal should equal the
publisher's headline (£2,939.04bn) to within its 2-decimal-billion rounding.

Honesty: nominal / uplifted nominal, a single working-day snapshot; not PSND;
not market-value ownership.

Run: ``uv run python -m economy.connectors.dmo_gilts_in_issue``
Refs: https://xlrd.readthedocs.io/ · https://docs.python.org/3/library/re.html
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Sequence

from xlrd.sheet import Sheet

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.dmo_common import (
    LICENCE,
    UK_CODE,
    UK_LABEL,
    excel_date_to_iso,
    open_sheet,
    parse_number,
    pinned_evidence,
)

INDICATOR_ID = "dmo-gilts-in-issue"
RAW_FILENAME = "Gilts in Issue Nov 14 2026.xls"
PINNED_ON = "2026-11-14"
SOURCE_URL = "https://www.dmo.gov.uk/data/pdfdatareport?reportCode=D1A"
UNIT_NOMINAL = "£ million nominal"
UNIT_UPLIFTED = "£ million nominal (including index-linked uplift)"

_ISIN = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}\d$")
_AS_OF = re.compile(r"GILTS IN ISSUE ON (\d{1,2} [A-Z]+ \d{4})", re.IGNORECASE)
_HEADLINE = re.compile(r"=\s*£\s*([\d,]+(?:\.\d+)?)\s*billion", re.IGNORECASE)
_LAG = re.compile(r"(\d+)-month", re.IGNORECASE)
HEADLINE_TOLERANCE_GBP_M = 5.0  # headline is published to £0.01bn = £10m resolution


@dataclass(frozen=True, slots=True)
class Gilt:
    """One gilt row as read from the workbook (values in £ million)."""

    name: str
    isin: str
    kind: str  # conventional | index_linked
    bucket: str  # ultra-short|short|medium|long for conventional; "" for IL
    lag_months: str  # "3" | "8" for IL; "" for conventional
    maturity: str
    first_issue: str
    nominal: float
    base_rpi: float | None
    uplifted_nominal: float | None


def _clean(cell: object) -> str:
    return " ".join(str(cell).split())


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _parse_as_of(sheet: Sheet) -> str:
    """Snapshot date from the title row, e.g. 'GILTS IN ISSUE ON 13 NOVEMBER 2026'."""
    for cell in sheet.row_values(0):
        match = _AS_OF.search(str(cell))
        if match:
            return datetime.strptime(match.group(1).title(), "%d %B %Y").date().isoformat()
    raise ValueError(f"No 'GILTS IN ISSUE ON <date>' title in row 0: {sheet.row_values(0)!r}")


def _parse_data_date(sheet: Sheet) -> str:
    """Report 'Data Date: 14-Nov-2026' (row 0) as ISO date."""
    text = _clean(sheet.cell_value(0, 0))
    match = re.search(r"(\d{1,2}-[A-Za-z]{3}-\d{4})", text)
    if not match:
        raise ValueError(f"No data date in {text!r}")
    return datetime.strptime(match.group(1), "%d-%b-%Y").date().isoformat()


def _parse_headline_gbp_m(sheet: Sheet) -> float:
    """Published headline total in £ million (title says £ billion)."""
    for row in range(min(sheet.nrows, 15)):
        match = _HEADLINE.search(str(sheet.cell_value(row, 0)))
        if match:
            return float(match.group(1).replace(",", "")) * 1000.0
    raise ValueError("Headline 'Total Amount Outstanding … £x billion' not found")


def parse_gilts(sheet: Sheet, datemode: int) -> list[Gilt]:
    """Walk the sheet top to bottom, tracking which block we are in."""
    gilts: list[Gilt] = []
    kind = ""
    lag = ""
    bucket = ""
    for row_idx in range(sheet.nrows):
        row = sheet.row_values(row_idx)
        first, second = _clean(row[0]), _clean(row[1])
        low = first.lower()
        if low.startswith("conventional gilts") and second.lower().startswith("isin"):
            kind, lag, bucket = "conventional", "", ""
            continue
        if low.startswith("index-linked gilts") and second.lower().startswith("isin"):
            kind, bucket = "index_linked", ""
            lag_match = _LAG.search(first)
            if not lag_match:
                raise ValueError(f"Row {row_idx}: IL block without indexation lag: {first!r}")
            lag = lag_match.group(1)
            continue
        if not kind:
            continue
        if _ISIN.match(second):
            nominal = parse_number(row[6])
            base_rpi = uplifted = None
            if kind == "index_linked":
                base_rpi = parse_number(row[7])
                uplifted = parse_number(row[8])
            gilts.append(
                Gilt(
                    name=first,
                    isin=second,
                    kind=kind,
                    bucket=bucket,
                    lag_months=lag,
                    maturity=excel_date_to_iso(float(row[2]), datemode),
                    first_issue=excel_date_to_iso(float(row[3]), datemode),
                    nominal=nominal,
                    base_rpi=base_rpi,
                    uplifted_nominal=uplifted,
                )
            )
        elif first and not second and kind == "conventional" and low in {
            "ultra-short",
            "short",
            "medium",
            "long",
        }:
            bucket = _slug(first)
        elif first.lower().startswith("note"):
            break  # footnotes: stop scanning
    return gilts


def _note(g: Gilt, series: str) -> str:
    """Structured ``key=value; …`` notes (names contain no ';' or '=' — checked)."""
    parts = [
        f"series={series}",
        f"kind={g.kind}",
        f"isin={g.isin}",
        f"name={g.name}",
        f"maturity={g.maturity}",
        f"first_issue={g.first_issue}",
    ]
    if g.bucket:
        parts.append(f"bucket={g.bucket}")
    if g.lag_months:
        parts.append(f"lag_months={g.lag_months}")
    if g.base_rpi is not None:
        parts.append(f"base_rpi={g.base_rpi:g}")
    parts.append("table=D1A")
    return "; ".join(parts)


class DmoGiltsInIssueConnector(Connector):
    """Read the pinned D1A workbook; curate one row per gilt per amount series."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def fetch(self) -> list[RawEvidence]:
        """No download (captcha). Verify the pinned file and describe it."""
        sheet, _ = open_sheet(self.data_root / "raw" / RAW_FILENAME)
        return [
            pinned_evidence(
                self.data_root,
                RAW_FILENAME,
                retrieved_on=PINNED_ON,
                official_release_date=_parse_data_date(sheet),
                source_url=SOURCE_URL,
            )
        ]

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Gilts in issue by gilt (DMO D1A)",
            sector="economy-public-finance",
            publisher="UK Debt Management Office (DMO)",
            source_url=SOURCE_URL,
            series_id="D1A",
            geography="United Kingdom (K02000001); UK central government gilts",
            frequency="ad_hoc",
            unit=f"{UNIT_NOMINAL}; uplifted series: {UNIT_UPLIFTED}",
            definition=(
                "DMO report D1A: every gilt in issue on one working day, with amount in "
                "issue (£ million nominal) and, for index-linked gilts, the amount "
                "including index-linked uplift. period_start = period_end = as-of date. "
                "Notes carry series=nominal|uplifted_nominal; kind=conventional|"
                "index_linked; isin=; name=; maturity=; bucket= (conventional); "
                "lag_months=3|8 and base_rpi= (index-linked)."
            ),
            licence=LICENCE,
            agent_owner="economy",
            connector_module="economy.connectors.dmo_gilts_in_issue",
            curated_path="curated/observations.csv",
            update_cadence=(
                "updated by DMO after each gilt operation, redemption and monthly RPI; "
                "re-pin the browser-downloaded .xls for a fresh snapshot"
            ),
            raw_evidence=list(evidence),
            transformations=(
                "Read Sheet1 of the pinned .xls with xlrd. Locate the conventional and "
                "index-linked header rows by text; rows whose 2nd cell is an ISIN are "
                "gilts. One series=nominal row per gilt; index-linked gilts also get "
                "series=uplifted_nominal. Self-check vs headline £2,939.04bn written to "
                "curated/headline_check.json. No aggregates are curated."
            ),
            revision_notes=(
                "As-of 2026-11-13 (data-date 2026-11-14). Amounts change with every "
                "operation; the index-linked uplift changes monthly with RPI. The 3-month "
                "lag uplift uses the index ratio for the business day after the report day."
            ),
            caveats=(
                "Nominal (face) and uplifted-nominal amounts — not market value and not "
                "who owns gilts. A single working-day snapshot, not a time series. Not "
                "PSND (HF6W); gilts only (no Treasury bills, NS&I, or other public-sector "
                "debt). Includes gilts held by official holders (DMO/CRND) — gross, unlike "
                "D8B redemptions which are net of government holdings. Conventional gilts "
                "have no uplifted figure. Do not sum nominal across kinds as a debt total."
            ),
            related_indicator_ids=[
                "dmo-gilt-future-redemptions",
                "cg-cash-debt-reconciliation",
                "public-sector-net-debt",
            ],
            open_questions=[
                "Validation: spot-check gilt count and headline vs DMO D1A PDF/XML export.",
                "Raw is a browser pin (captcha); agree re-pin cadence with Orchestrator.",
            ],
            notion_registry_url="",
            schema_version="1.0",
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if len(evidence) != 1:
            raise ValueError("Expected exactly one raw file for D1A")
        sheet, datemode = open_sheet(self.data_root / evidence[0].path)
        as_of = _parse_as_of(sheet)
        source_version = f"DMO D1A in issue {as_of} (data-date {evidence[0].official_release_date})"
        gilts = parse_gilts(sheet, datemode)
        if not gilts:
            raise ValueError("No gilts parsed from D1A")
        isins = [g.isin for g in gilts]
        if len(isins) != len(set(isins)):
            raise ValueError("Duplicate ISIN in D1A parse")
        for g in gilts:
            if ";" in g.name or "=" in g.name:
                raise ValueError(f"Gilt name would break key=value notes: {g.name!r}")

        out: list[Observation] = []

        def add(g: Gilt, series: str, value: float, unit: str) -> None:
            out.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=as_of,
                    period_end=as_of,
                    geography_code=UK_CODE,
                    geography_label=UK_LABEL,
                    value=value,
                    unit=unit,
                    observation_status="final",
                    source_version=source_version,
                    notes=_note(g, series),
                )
            )

        for g in gilts:
            add(g, "nominal", g.nominal, UNIT_NOMINAL)
            if g.uplifted_nominal is not None:
                add(g, "uplifted_nominal", g.uplifted_nominal, UNIT_UPLIFTED)
        return out

    def write_hand_off(
        self,
        evidence: Sequence[RawEvidence],
        observations: Sequence[Observation],
        **kwargs: str,
    ) -> tuple[Path, Path]:
        """Base hand-off plus a small headline reconciliation file."""
        paths = super().write_hand_off(evidence, observations, **kwargs)
        sheet, _ = open_sheet(self.data_root / evidence[0].path)
        check = headline_check(observations, _parse_headline_gbp_m(sheet))
        (self.data_root / "curated" / "headline_check.json").write_text(
            json.dumps(check, indent=2) + "\n", encoding="utf-8"
        )
        if not check["pass"]:
            raise ValueError(f"Headline check failed: {check}")
        return paths


def headline_check(observations: Sequence[Observation], headline_gbp_m: float) -> dict[str, object]:
    """Compare curated sums with the publisher's headline (diagnostic, not a new total)."""
    conventional = sum(
        o.value or 0.0 for o in observations if "series=nominal" in o.notes and "kind=conventional" in o.notes
    )
    il_uplifted = sum(o.value or 0.0 for o in observations if "series=uplifted_nominal" in o.notes)
    il_nominal = sum(
        o.value or 0.0 for o in observations if "series=nominal" in o.notes and "kind=index_linked" in o.notes
    )
    combined = conventional + il_uplifted
    diff = combined - headline_gbp_m
    return {
        "rule": "sum(conventional nominal) + sum(index-linked uplifted nominal) ≈ headline",
        "headline_gbp_million": headline_gbp_m,
        "conventional_nominal_gbp_million": round(conventional, 3),
        "index_linked_nominal_gbp_million": round(il_nominal, 3),
        "index_linked_uplifted_nominal_gbp_million": round(il_uplifted, 3),
        "sum_conventional_plus_il_uplifted_gbp_million": round(combined, 3),
        "diff_gbp_million": round(diff, 3),
        "tolerance_gbp_million": HEADLINE_TOLERANCE_GBP_M,
        "pass": abs(diff) <= HEADLINE_TOLERANCE_GBP_M,
        "note": "Diagnostic only. This is a gilt-book total, not PSND (HF6W).",
    }


def main() -> None:
    connector = DmoGiltsInIssueConnector()
    evidence = connector.fetch()
    observations = connector.transform(evidence)
    manifest_path, curated_path = connector.write_hand_off(evidence, observations)
    n_nominal = sum("series=nominal" in o.notes for o in observations)
    n_il = sum("series=uplifted_nominal" in o.notes for o in observations)
    n_conv = sum("series=nominal" in o.notes and "kind=conventional" in o.notes for o in observations)
    print(f"raw verified: {evidence[0].path} sha256={evidence[0].checksum_sha256[:12]}…")
    print(f"observations: {len(observations)} (gilts={n_nominal}: conventional={n_conv}, "
          f"index_linked={n_nominal - n_conv}; uplifted rows={n_il})")
    print(f"manifest: {manifest_path}\ncurated:  {curated_path}")


if __name__ == "__main__":
    main()
