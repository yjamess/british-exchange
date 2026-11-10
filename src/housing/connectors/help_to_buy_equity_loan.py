"""MHCLG Help to Buy: Equity Loan — legal completions and loan values, England.

Approach:
1. Pin Help_to_Buy_Tables.ods from the final release (data to 31 May 2023,
   published 16 November 2023; the scheme closed on 31 May 2023).
2. Parse Table 2 (monthly): year header rows followed by month rows, with the
   2013-2021 scheme in columns C-E and the 2021-2023 scheme in columns G-I.
3. Emit series=completions|equity-loan-value|property-value with
   category=scheme-2013-2021|scheme-2021-2023|all. "all" sums the two schemes in
   months where either reports (they overlapped in April-May 2021).
4. Parse Release Table 2 (quarterly first-time buyers, England): same three
   measures with category=first-time-buyer and frequency notes=quarterly.

Caveat: England only. One completion is one purchase supported by an equity loan.
Legacy FirstBuy completions after 1 April 2013 are excluded by the publisher.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone
from calendar import monthrange
from pathlib import Path
from typing import Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

INDICATOR_ID = "help-to-buy-equity-loan"
PINNED_RAW = "raw/2026-11-10/Help_to_Buy_Tables.ods"
PINNED_URL = "https://assets.publishing.service.gov.uk/media/654a1cb43ff5770013a88154/Help_to_Buy_Tables.ods"
SOURCE_LANDING = "https://www.gov.uk/government/statistics/help-to-buy-equity-loan-scheme-data-to-31-may-2023"
OFFICIAL_RELEASE_DATE = "2023-11-16"
SOURCE_VERSION = "Help to Buy (equity loan scheme): data to 31 May 2023 (final release, 16 November 2023)"
ENGLAND = ("E92000001", "England")
SHEET = "Table_2_-_Monthly"
FTB_SHEET = "Release_Table_2"
QUARTER_START_MONTH = {"Q1": 1, "Q2": 4, "Q3": 7, "Q4": 10}

MONTHS = {
    name: i
    for i, name in enumerate(
        ["January", "February", "March", "April", "May", "June", "July", "August",
         "September", "October", "November", "December"],
        start=1,
    )
}
# (first column index, scheme slug)
SCHEMES: tuple[tuple[int, str], ...] = ((2, "scheme-2013-2021"), (6, "scheme-2021-2023"))
MEASURES: tuple[tuple[int, str, str], ...] = (
    (0, "completions", "legal completions"),
    (1, "equity-loan-value", "GBP million"),
    (2, "property-value", "GBP million"),
)
FTB_MEASURES: tuple[tuple[int, str, str], ...] = (
    (2, "completions", "legal completions"),
    (3, "equity-loan-value", "GBP million"),
    (4, "property-value", "GBP million"),
)


def _clean(label: str) -> str:
    return label.replace("(R)", "").strip()


def _num(raw: str) -> float | None:
    text = raw.strip().replace(",", "")
    if not text:
        return None
    return float(text)


def parse_table2(path: Path) -> list[Observation]:
    rows = read_ods_sheet(path, SHEET)
    year: int | None = None
    values: dict[tuple[str, str, str], float] = {}  # (yyyy-mm, measure, scheme) -> value
    annual: dict[tuple[int, str, str], float] = {}
    cumulative: dict[tuple[str, str], float] = {}
    for row in rows:
        if len(row) < 3:
            continue
        label = _clean(row[1])
        if label.isdigit() and len(label) == 4:
            year = int(label)
            for col, scheme in SCHEMES:
                for offset, measure, _ in MEASURES:
                    v = _num(row[col + offset]) if col + offset < len(row) else None
                    if v is not None:
                        annual[(year, measure, scheme)] = v
            continue
        if label.startswith("Cumulative Total"):
            for col, scheme in SCHEMES:
                for offset, measure, _ in MEASURES:
                    v = _num(row[col + offset])
                    if v is not None:
                        cumulative[(measure, scheme)] = v
            break
        if label in MONTHS and year is not None:
            ym = f"{year:04d}-{MONTHS[label]:02d}"
            for col, scheme in SCHEMES:
                for offset, measure, _ in MEASURES:
                    v = _num(row[col + offset]) if col + offset < len(row) else None
                    if v is not None:
                        values[(ym, measure, scheme)] = v

    if not values:
        raise ValueError("Table 2 parsed no monthly rows")
    _check_totals(values, annual, cumulative)

    combined: dict[tuple[str, str], float] = defaultdict(float)
    for (ym, measure, _), v in values.items():
        combined[(ym, measure)] += v
    units = {m: u for _, m, u in MEASURES}

    out: list[Observation] = []
    rows_out = [(ym, m, s, v) for (ym, m, s), v in values.items()]
    rows_out += [(ym, m, "all", v) for (ym, m), v in combined.items()]
    for ym, measure, scheme, v in rows_out:
        y, mo = int(ym[:4]), int(ym[5:])
        out.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=date(y, mo, 1).isoformat(),
                period_end=date(y, mo, monthrange(y, mo)[1]).isoformat(),
                geography_code=ENGLAND[0],
                geography_label=ENGLAND[1],
                value=round(v, 2),
                unit=units[measure],
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=(
                    f"series={measure}; category={scheme}; source=MHCLG Help to Buy Table 2; "
                    "monthly; geography=England only"
                ),
            )
        )
    out.sort(key=lambda o: (o.period_start, o.notes))
    return out


def parse_release_table2_ftb(path: Path) -> list[Observation]:
    """England quarterly first-time-buyer completions and values (Release Table 2)."""
    rows = read_ods_sheet(path, FTB_SHEET)
    year: int | None = None
    quarterly: list[tuple[int, int, dict[str, float]]] = []
    annual: dict[int, dict[str, float]] = {}
    cumulative: dict[str, float] | None = None
    for row in rows:
        if len(row) < 5:
            continue
        label = _clean(row[1])
        if not label:
            continue
        # Year totals: "2013", "2021 (R)"
        year_m = label[:4] if label[:4].isdigit() else ""
        if year_m and (len(label) == 4 or label[4:5] in {" ", "("}):
            year = int(year_m)
            vals = {m: v for col, m, _ in FTB_MEASURES if (v := _num(row[col] if col < len(row) else "")) is not None}
            if vals:
                annual[year] = vals
            continue
        q_m = label[:2]
        if q_m in QUARTER_START_MONTH and year is not None:
            vals = {m: v for col, m, _ in FTB_MEASURES if (v := _num(row[col] if col < len(row) else "")) is not None}
            if vals:
                quarterly.append((year, QUARTER_START_MONTH[q_m], vals))
            continue
        if label.startswith("Total"):
            cumulative = {
                m: v for col, m, _ in FTB_MEASURES if (v := _num(row[col] if col < len(row) else "")) is not None
            }
            break

    if not quarterly:
        raise ValueError("Release Table 2 parsed no quarterly first-time-buyer rows")

    # Quarters must sum to each published year total (completions).
    for y, totals in annual.items():
        got = sum(v["completions"] for yy, _, v in quarterly if yy == y and "completions" in v)
        want = totals.get("completions")
        if want is not None and abs(got - want) > 0.5:
            raise ValueError(f"FTB {y} completions: quarters sum {got} != published {want}")
    if cumulative and "completions" in cumulative:
        got = sum(v["completions"] for _, _, v in quarterly if "completions" in v)
        if abs(got - cumulative["completions"]) > 0.5:
            raise ValueError(
                f"FTB cumulative completions {got} != published {cumulative['completions']}"
            )

    units = {m: u for _, m, u in FTB_MEASURES}
    out: list[Observation] = []
    for y, start_month, vals in quarterly:
        end_month = start_month + 2
        for measure, value in vals.items():
            out.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=date(y, start_month, 1).isoformat(),
                    period_end=date(y, end_month, monthrange(y, end_month)[1]).isoformat(),
                    geography_code=ENGLAND[0],
                    geography_label=ENGLAND[1],
                    value=round(value, 2),
                    unit=units[measure],
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=(
                        "series={m}; category=first-time-buyer; source=MHCLG Help to Buy "
                        "Release Table 2; quarterly; geography=England only".format(m=measure)
                    ),
                )
            )
    out.sort(key=lambda o: (o.period_start, o.notes))
    return out


def _check_totals(values, annual, cumulative) -> None:
    """Month rows must add up to the published year and cumulative rows (completions)."""
    for (year, measure, scheme), total in annual.items():
        if measure != "completions":
            continue
        got = sum(v for (ym, m, s), v in values.items() if ym.startswith(f"{year}-") and m == measure and s == scheme)
        if abs(got - total) > 0.5:
            raise ValueError(f"{year} {scheme} completions: months sum {got} != published {total}")
    for (measure, scheme), total in cumulative.items():
        if measure != "completions":
            continue
        got = sum(v for (_, m, s), v in values.items() if m == measure and s == scheme)
        if abs(got - total) > 0.5:
            raise ValueError(f"{scheme} cumulative completions {got} != published {total}")


class HelpToBuyEquityLoanConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID))

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def evidence_from_pinned_raw(self) -> RawEvidence:
        path = self.data_root / PINNED_RAW
        if not path.is_file():
            raise FileNotFoundError(path)
        return RawEvidence(
            path=PINNED_RAW,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=sha256_file(path),
            content_type="application/vnd.oasis.opendocument.spreadsheet",
            official_release_date=OFFICIAL_RELEASE_DATE,
            source_url=PINNED_URL,
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        path = self.data_root / evidence[0].path
        return parse_table2(path) + parse_release_table2_ftb(path)

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Help to Buy equity loan completions",
            sector="housing-land",
            publisher="MHCLG",
            source_url=SOURCE_LANDING,
            series_id=(
                "Help to Buy: Equity Loan Table 2 (monthly) and Release Table 2 "
                "(quarterly first-time buyers), England"
            ),
            geography="England (E92000001) — not UK",
            frequency="monthly (all schemes); quarterly (first-time buyers)",
            unit="legal completions (equity-loan-value and property-value: GBP million)",
            definition=(
                "Purchases of new-build homes in England completed with a Help to Buy equity loan. "
                "Monthly rows (Table 2) cover April 2013 to May 2023 by scheme. Quarterly rows "
                "(Release Table 2) are first-time-buyer completions and values for England. "
                "series=completions counts legal completions (one per purchase); equity-loan-value "
                "is the government loan at completion and property-value the total purchase price, "
                "both in £ million. category gives the 2013-2021 scheme, the 2021-2023 scheme, all, "
                "or first-time-buyer."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.help_to_buy_equity_loan",
            curated_path="curated/observations.csv",
            update_cadence="none — final release; the scheme closed on 31 May 2023",
            raw_evidence=list(evidence),
            transformations=(
                "Parse Table_2_-_Monthly. Month rows are checked against each published year row and "
                "the cumulative total for completions. category=all sums the two schemes by month. "
                "Parse Release_Table_2 for England first-time-buyer quarterly rows; quarters are "
                "checked against each published year total and the cumulative total."
            ),
            caveats=(
                "England only. Legacy FirstBuy completions after 1 April 2013 are excluded. The two "
                "schemes overlapped in April and May 2021. Completions count purchases, not new homes "
                "built, and are not additional supply. Values are revised figures from the final release. "
                "category=first-time-buyer is quarterly only and must not be added to the monthly scheme "
                "rows (those already include first-time buyers)."
            ),
            revision_notes=(
                "Pinned Help_to_Buy_Tables.ods from the final release (16 November 2023), retrieved "
                "2026-11-10. Release Table 2 (FTB quarterly) added 2026-11-10."
            ),
            related_indicator_ids=["housing-completions", "net-additional-dwellings"],
            open_questions=[
                "Local-authority FTB quarters (Table 1a) are not ingested — England Release Table 2 only.",
            ],
        )


def main() -> None:
    connector = HelpToBuyEquityLoanConnector()
    evidence = connector.evidence_from_pinned_raw()
    observations = connector.transform([evidence])
    _, curated = connector.write_hand_off([evidence], observations)
    print(f"{INDICATOR_ID}: {len(observations)} observations -> {curated}")


if __name__ == "__main__":
    main()
