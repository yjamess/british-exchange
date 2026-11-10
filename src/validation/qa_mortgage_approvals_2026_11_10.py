"""Independent QA — mortgage-approvals (Bank of England Money and Credit).

Does not import the Housing connector. Re-reads the pinned IADB CSV with csv.reader,
compares every cell with what Postgres serves for the current release, and checks
the Sep 2026 values against the Bank's published Money and Credit headlines.
Writes data/qa/qa_report_mortgage-approvals_2026-11-10.md.

  uv run python -m britain_exchange.archive_data pull data/housing/mortgage-approvals
  PYTHONPATH=src uv run python -m validation.qa_mortgage_approvals_2026_11_10
"""

from __future__ import annotations

import calendar
import csv
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

import yaml

from britain_exchange.checksum import sha256_file
from britain_exchange.db import connect, load_repo_env

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "housing" / "mortgage-approvals"
OUT = ROOT / "data" / "qa" / "qa_report_mortgage-approvals_2026-11-10.md"
INDICATOR = "mortgage-approvals"
UK = "K02000001"

# Bank of England series code → expected unit (written out here, not read from the connector).
UNIT = {
    "LPMVTVX": "approvals",  # net approvals for house purchase, number
    "LPMB4B3": "approvals",  # approvals for remortgaging, number
    "LPMVTVJ": "gbp-millions",  # net secured lending to individuals, £m
    "LPMVTVC": "gbp-millions",  # gross secured lending to individuals, £m
}

# Money and Credit, September 2026, published 29 Oct 2026 (bankofengland.co.uk, fetched
# 2026-11-10). (code, month, published figure, rounding unit in the series' own unit).
HEADLINES = [
    ("LPMVTVX", date(2026, 9, 1), 53_400, 100, "House-purchase approvals Sep: 53,400"),
    ("LPMB4B3", date(2026, 9, 1), 42_600, 100, "Remortgage approvals Sep: 42,600"),
    ("LPMB4B3", date(2026, 8, 1), 34_000, 100, "Remortgage approvals Aug: 34,000"),
    ("LPMVTVJ", date(2026, 9, 1), 3_900, 100, "Net mortgage borrowing Sep: £3.9bn"),
    ("LPMVTVJ", date(2026, 8, 1), 4_200, 100, "Net mortgage borrowing Aug: £4.2bn"),
    ("LPMVTVC", date(2026, 9, 1), 24_200, 100, "Gross secured lending Sep: £24.2bn"),
    ("LPMVTVC", date(2026, 8, 1), 23_700, 100, "Gross secured lending Aug: £23.7bn"),
]


def read_raw(path: Path) -> dict[tuple[str, date], float]:
    out: dict[tuple[str, date], float] = {}
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        assert header[0] == "DATE", header
        for row in reader:
            day = datetime.strptime(row[0], "%d %b %Y").date()
            assert day.day == calendar.monthrange(day.year, day.month)[1], row[0]
            for code, cell in zip(header[1:], row[1:]):
                if cell.strip():
                    key = (code, day.replace(day=1))
                    assert key not in out, key
                    out[key] = float(cell)
    return out


def notes_map(text: str) -> dict[str, str]:
    return dict(p.strip().split("=", 1) for p in (text or "").split(";") if "=" in p)


def served() -> tuple[list[dict], dict]:
    with connect() as conn:
        release = conn.execute(
            "SELECT release_id, source_version, checksum_sha256 FROM data_release "
            "WHERE indicator_id = %s AND is_current",
            (INDICATOR,),
        ).fetchone()
        rows = conn.execute(
            "SELECT period_start, period_end, geography_code, value, unit, notes "
            "FROM observation WHERE release_id = %s",
            (release["release_id"],),
        ).fetchall()
    return rows, release


def month_seq(start: date, end: date) -> list[date]:
    out, d = [], start
    while d <= end:
        out.append(d)
        d = date(d.year + d.month // 12, d.month % 12 + 1, 1)
    return out


def main() -> int:
    load_repo_env()
    manifest = yaml.safe_load((DIR / "manifest.yaml").read_text())
    checks: list[tuple[str, str, str, str]] = []

    def check(cid: str, what: str, status: bool | str, detail: str) -> None:
        if isinstance(status, bool):
            status = "pass" if status else "FAIL"
        checks.append((cid, what, status, detail))

    (ev,) = manifest["raw_evidence"]
    raw_path = DIR / ev["path"]
    sha = sha256_file(raw_path)
    check("C1", "Raw CSV SHA-256 matches manifest", sha == ev["checksum_sha256"], sha[:16] + "…")

    raw = read_raw(raw_path)
    rows, release = served()
    check(
        "C1b",
        "Current release checksum matches manifest",
        release.get("checksum_sha256") in (None, "", ev["checksum_sha256"]),
        str(release.get("checksum_sha256") or "not recorded")[:16],
    )

    srv: dict[tuple[str, date], dict] = {}
    dupes = 0
    for r in rows:
        code = notes_map(r["notes"]).get("boe")
        key = (code, r["period_start"])
        dupes += key in srv
        srv[key] = r
    check(
        "C2",
        "Row count: raw non-empty cells = served rows; no duplicate (series, month)",
        len(raw) == len(rows) == len(srv) and dupes == 0,
        f"raw {len(raw):,} / served {len(rows):,} / distinct {len(srv):,}",
    )

    mism = [k for k in raw if k not in srv or srv[k]["value"] != raw[k]]
    extra = [k for k in srv if k not in raw]
    check(
        "C3",
        "Every served value equals the raw cell (all 4 series, all months)",
        not mism and not extra,
        f"{len(raw) - len(mism):,} equal; {len(mism)} mismatched/missing; {len(extra)} extra"
        + (f"; e.g. {mism[:3]}" if mism else ""),
    )

    bad_end = [
        k
        for k, r in srv.items()
        if r["period_end"]
        != r["period_start"].replace(day=calendar.monthrange(r["period_start"].year, r["period_start"].month)[1])
    ]
    check("C4", "period_end is the last day of period_start's month", not bad_end, f"{len(bad_end)} bad")

    cover = []
    gaps_total = 0
    for code in UNIT:
        months = sorted(m for c, m in srv if c == code)
        expected = month_seq(months[0], months[-1])
        gaps = len(set(expected) - set(months))
        gaps_total += gaps
        cover.append(f"{code} {months[0]:%Y-%m}–{months[-1]:%Y-%m} n={len(months)} gaps={gaps}")
    check("C5", "Monthly coverage contiguous per series", gaps_total == 0, "; ".join(cover))

    bad_unit = [(c, r["unit"]) for (c, _), r in srv.items() if UNIT.get(c) != r["unit"]]
    check(
        "C6",
        "Units: approvals for LPMVTVX/LPMB4B3, gbp-millions for LPMVTVJ/LPMVTVC",
        not bad_unit,
        f"{len(bad_unit)} wrong" + (f"; e.g. {bad_unit[:2]}" if bad_unit else ""),
    )

    measures = defaultdict(set)
    for (c, _), r in srv.items():
        n = notes_map(r["notes"])
        measures[(n.get("series"), c)].add(n.get("measure"))
    mixed = {k: v for k, v in measures.items() if v != {"flow"}}
    one_code = defaultdict(set)
    for s, c in measures:
        one_code[s].add(c)
    check(
        "C7",
        "Stock/flow: every row measure=flow; one BoE code per served series",
        not mixed and all(len(v) == 1 for v in one_code.values()),
        ", ".join(f"{s}={sorted(c)[0]}" for s, c in sorted(one_code.items())),
    )

    geos = {r["geography_code"] for r in rows}
    check("C8", "Geography is UK only", geos == {UK}, str(sorted(geos)))

    for i, (code, month, pub, step, label) in enumerate(HEADLINES, 1):
        v = srv.get((code, month), {}).get("value")
        ok = v is not None and abs(v - pub) <= step / 2
        check(f"H{i}", f"Publisher headline — {label}", ok, f"served {v:,.0f}" if v is not None else "missing")

    check(
        "H0",
        "Brief headline: Sep 2026 house-purchase approvals 53,443 exactly",
        srv.get(("LPMVTVX", date(2026, 9, 1)), {}).get("value") == 53_443,
        f"served {srv.get(('LPMVTVX', date(2026, 9, 1)), {}).get('value')}",
    )

    failed = [c for c in checks if c[2] == "FAIL"]
    lines = [
        f"# QA report — {INDICATOR}",
        "",
        f"Date: {date.today().isoformat()} · Validation agent · release: {release['source_version']}",
        "",
        f"Independent recount of the pinned raw file `{ev['path']}` (csv.reader, no Housing "
        "connector code), compared with every observation in the current Postgres release. "
        "Headlines from Bank of England *Money and Credit — September 2026* (published "
        "29 October 2026), fetched 2026-11-10.",
        "",
        "| Check | What | Result | Detail |",
        "|---|---|---|---|",
        *[f"| {a} | {b} | {c} | {d} |" for a, b, c, d in checks],
        "",
        f"**Verdict:** {'PASS — ready for UI' if not failed else f'FAIL — {len(failed)} check(s)'}",
        "",
        "Notes: the publisher rounds approvals to the nearest 100 and lending to £0.1bn, so H "
        "checks allow ± half a rounding step. LPMB4B3 (remortgage) starts October 1997 in the "
        "Bank's database; the earlier blank cells are correctly absent rather than zero. "
        "Recent months are revised each release; this QA covers the 29 Oct 2026 vintage only.",
        "",
    ]
    OUT.write_text("\n".join(lines))
    print("\n".join(lines))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
