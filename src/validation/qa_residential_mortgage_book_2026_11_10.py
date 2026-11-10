"""Independent QA — residential-mortgage-book (FCA/PRA MLAR summary, long run).

Does not import the Housing connector. Re-reads the pinned workbook with openpyxl,
finds each row by its sheet, row number and label (written out here), and compares
every quarter with what Postgres serves for the current release. Cross-checks Q2 2026
against the FCA's published headline figures.
Writes data/qa/qa_report_residential-mortgage-book_2026-11-10.md.

  uv run python -m britain_exchange.archive_data pull data/housing/residential-mortgage-book
  PYTHONPATH=src uv run python -m validation.qa_residential_mortgage_book_2026_11_10
"""

from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date
from pathlib import Path

import openpyxl
import yaml

from britain_exchange.checksum import sha256_file
from britain_exchange.db import connect, load_repo_env

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "housing" / "residential-mortgage-book"
OUT = ROOT / "data" / "qa" / "qa_report_residential-mortgage-book_2026-11-10.md"
INDICATOR = "residential-mortgage-book"
UK = "K02000001"
HEADER_YEAR_ROW, HEADER_Q_ROW, FIRST_COL = 13, 14, 5  # 1-based; data from column E

# served series → (sheet, row, label in column C, unit in column D, stock|flow)
SPEC: dict[str, tuple[str, int, str, str, str]] = {
    "gross-advances": ("Summary 1", 17, "Gross advances", "£ millions", "flow"),
    "net-advances": ("Summary 1", 18, "Net advances", "£ millions", "flow"),
    "new-commitments": ("Summary 1", 19, "New commitments", "£ millions", "flow"),
    "house-purchase-share-of-advances": ("Summary 1", 32, "House purchase", "Per cent", "flow"),
    "first-time-buyer-share-of-advances": ("Summary 1", 33, "Of which:  First time buyers", "Per cent", "flow"),
    "buy-to-let-share-of-advances": ("Summary 1", 34, "Buy to let", "Per cent", "flow"),
    "remortgage-share-of-advances": ("Summary 1", 38, "Remortgage", "Per cent", "flow"),
    "ltv-up-to-75-share": ("Summary 2", 19, "< = 75%", "Per cent", "flow"),
    "ltv-75-to-90-share": ("Summary 2", 20, "Over 75 < = 90%", "Per cent", "flow"),
    "ltv-90-to-95-share": ("Summary 2", 21, "Over 90 < = 95%", "Per cent", "flow"),
    "ltv-over-95-share": ("Summary 2", 22, "Over 95%", "Per cent", "flow"),
    "balances-unsecuritised": ("Summary 2", 35, "Unsecuritised", "£ millions", "stock"),
    "balances-securitised": ("Summary 2", 36, "Securitised", "£ millions", "stock"),
    "balances-outstanding": ("Summary 2", 37, "Overall residential loans to individuals", "£ millions", "stock"),
    "arrears-balances": ("Summary 3", 21, "Balances outstanding", "£ millions", "stock"),
    "arrears-share-of-balances": ("Summary 3", 22, "Balances as per cent total loan balances", "Per cent", "stock"),
}
UNIT_MAP = {"£ millions": "gbp-millions", "Per cent": "percent"}

# FCA "Mortgage lending statistics" page, Q2 2026 edition, published 8 Sep 2026
# (fetched 2026-11-10). £m, published to £0.1bn.
HEADLINES = [
    ("balances-outstanding", 1_760_600, "Outstanding residential loans £1,760.6bn"),
    ("gross-advances", 77_400, "Gross advances £77.4bn"),
    ("new-commitments", 79_200, "New commitments £79.2bn"),
]
GROWTH = [("balances-outstanding", 0.8, "Outstanding +0.8% q/q"), ("gross-advances", 11.1, "Gross advances +11.1% q/q"), ("new-commitments", 1.4, "Commitments +1.4% q/q")]


def quarter_start(year: int, q: int) -> date:
    return date(year, 3 * q - 2, 1)


def read_raw(path: Path) -> tuple[dict[str, dict[date, float]], list[str]]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out: dict[str, dict[date, float]] = defaultdict(dict)
    problems: list[str] = []
    cache: dict[str, list[tuple]] = {}
    for series, (sheet, row, label, unit, _) in SPEC.items():
        if sheet not in cache:
            cache[sheet] = list(wb[sheet].iter_rows(min_row=1, max_row=70, values_only=True))
        rows = cache[sheet]
        years, quarters = rows[HEADER_YEAR_ROW - 1], rows[HEADER_Q_ROW - 1]
        r = rows[row - 1]
        if (r[2] or "").strip() != label.strip() or (r[3] or "").strip() != unit:
            problems.append(f"{sheet} r{row}: found {r[2]!r}/{r[3]!r}")
            continue
        year = None
        for c in range(FIRST_COL - 1, len(quarters)):
            if years[c] is not None:
                year = int(years[c])
            q = quarters[c]
            if not q or r[c] is None or r[c] == "":
                continue
            out[series][quarter_start(year, int(str(q).strip()[1]))] = float(r[c])
    wb.close()
    return out, problems


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
    check("C1", "Raw workbook SHA-256 matches manifest", sha == ev["checksum_sha256"], sha[:16] + "…")

    raw, problems = read_raw(raw_path)
    check("C2", "All 16 rows found at the expected sheet/row/label/unit", not problems, "; ".join(problems) or "16/16")

    rows, release = served()
    check(
        "C1b",
        "Current release checksum matches manifest",
        release.get("checksum_sha256") == ev["checksum_sha256"],
        str(release.get("checksum_sha256") or "not recorded")[:16],
    )
    srv: dict[str, dict[date, dict]] = defaultdict(dict)
    dupes = 0
    for r in rows:
        s = notes_map(r["notes"]).get("series")
        dupes += r["period_start"] in srv[s]
        srv[s][r["period_start"]] = r

    n_raw = sum(len(v) for v in raw.values())
    check(
        "C3",
        "Row count: raw cells = served rows; same 16 series; no duplicate (series, quarter)",
        n_raw == len(rows) and set(srv) == set(SPEC) and dupes == 0,
        f"raw {n_raw:,} / served {len(rows):,}; series served {len(srv)}; dupes {dupes}",
    )

    mism = []
    for s, vals in raw.items():
        for q, v in vals.items():
            got = srv.get(s, {}).get(q)
            if got is None or abs(got["value"] - v) > 1e-9 * max(1.0, abs(v)):
                mism.append((s, q.isoformat(), v, got and got["value"]))
    check(
        "C4",
        "Every served value equals the raw cell (16 series × all quarters)",
        not mism,
        f"{n_raw - len(mism):,} equal; {len(mism)} differ" + (f"; e.g. {mism[:3]}" if mism else ""),
    )

    quarters = sorted({q for v in raw.values() for q in v})
    expected = [quarter_start(y, q) for y in range(2007, 2027) for q in range(1, 5)]
    expected = [d for d in expected if quarters[0] <= d <= quarters[-1]]
    cover_bad = [s for s, v in srv.items() if sorted(v) != expected]
    check(
        "C5",
        "Quarterly coverage contiguous and identical for all series",
        not cover_bad and quarters == expected,
        f"{quarters[0]:%Y-%m}–{quarters[-1]:%Y-%m}, {len(expected)} quarters" + (f"; bad {cover_bad}" if cover_bad else ""),
    )

    bad_end = []
    for v in srv.values():
        for q, r in v.items():
            m = q.month + 2
            if r["period_end"] != date(q.year, m, calendar.monthrange(q.year, m)[1]):
                bad_end.append(q)
    check("C6", "period_end is the quarter end", not bad_end, f"{len(bad_end)} bad")

    bad_unit = [
        (s, r["unit"]) for s, v in srv.items() for r in v.values() if r["unit"] != UNIT_MAP[SPEC[s][3]]
    ]
    check("C7", "Units match the workbook's unit column (£ millions / Per cent)", not bad_unit, f"{len(bad_unit)} wrong")

    bad_measure = sorted(
        {
            (s, notes_map(r["notes"]).get("measure"))
            for s, v in srv.items()
            for r in v.values()
            if notes_map(r["notes"]).get("measure") != SPEC[s][4]
        }
    )
    check(
        "C8",
        "Stock/flow: balances and arrears = stock; advances, commitments, shares = flow",
        not bad_measure,
        f"{len(bad_measure)} series wrong" + (f": {bad_measure}" if bad_measure else ""),
    )

    geos = {r["geography_code"] for r in rows}
    check("C9", "Geography is UK only", geos == {UK}, str(sorted(geos)))

    sum_bad = [
        q
        for q in quarters
        if abs(raw["balances-unsecuritised"][q] + raw["balances-securitised"][q] - raw["balances-outstanding"][q]) > 1.0
    ]
    check("C10", "Internal: unsecuritised + securitised = overall balances (±£1m)", not sum_bad, f"{len(sum_bad)} quarters off")
    arr_bad = [
        q
        for q in quarters
        if abs(100 * raw["arrears-balances"][q] / raw["balances-outstanding"][q] - raw["arrears-share-of-balances"][q]) > 0.001
    ]
    check("C11", "Internal: arrears £ / balances £ = published arrears % (±0.001pp)", not arr_bad, f"{len(arr_bad)} quarters off")
    ltv_bad = [
        q
        for q in quarters
        if abs(sum(raw[s][q] for s in SPEC if s.startswith("ltv-")) - 100) > 0.1
    ]
    check("C12", "Internal: four LTV bands sum to 100% (±0.1)", not ltv_bad, f"{len(ltv_bad)} quarters off")

    # Summary 1 rows 33–35 sit under "House purchase": FTB + buy to let + other.
    wb = openpyxl.load_workbook(raw_path, read_only=True, data_only=True)
    s1 = list(wb["Summary 1"].iter_rows(min_row=32, max_row=35, values_only=True))
    wb.close()
    assert (s1[3][2] or "").strip() == "Other", s1[3][2]
    btl_in_hp = btl_total = 0
    for c in range(FIRST_COL - 1, len(s1[0])):
        if s1[0][c] is None or s1[1][c] is None:
            continue
        btl_total += 1
        btl_in_hp += abs(s1[1][c] + s1[2][c] + s1[3][c] - s1[0][c]) <= 0.05
    check(
        "C13",
        "Buy-to-let row: is it a component of house purchase (FTB + BTL + other = house purchase)?",
        "caveat" if btl_in_hp == btl_total else "pass",
        f"identity holds in {btl_in_hp}/{btl_total} quarters — in Summary 1 the BTL row is "
        "house-purchase buy-to-let; the manifest caveat says it includes further advance and "
        "remortgage (workbook note (a) is a general MLAR definition)",
    )

    last, prev = quarters[-1], quarters[-2]
    for i, (s, pub, label) in enumerate(HEADLINES, 1):
        v = srv.get(s, {}).get(last, {}).get("value")
        check(f"H{i}", f"FCA headline {last.year} Q{(last.month + 2) // 3} — {label}", v is not None and abs(v - pub) <= 50, f"served {v:,.1f} £m" if v else "missing")
    for i, (s, pct, label) in enumerate(GROWTH, len(HEADLINES) + 1):
        a, b = srv[s][last]["value"], srv[s][prev]["value"]
        g = 100 * (a / b - 1)
        check(f"H{i}", f"FCA headline — {label}", abs(g - pct) <= 0.05, f"served {g:.2f}%")

    failed = [c for c in checks if c[2] == "FAIL"]
    lines = [
        f"# QA report — {INDICATOR}",
        "",
        f"Date: {date.today().isoformat()} · Validation agent · release: {release['source_version']}",
        "",
        f"Independent re-read of the pinned workbook `{ev['path']}` (openpyxl, rows located by "
        "hand-written sheet/row/label, no Housing connector code), compared with every "
        "observation in the current Postgres release. Headlines from the FCA *Mortgage lending "
        "statistics* page, Q2 2026 edition published 8 September 2026, fetched 2026-11-10.",
        "",
        "| Check | What | Result | Detail |",
        "|---|---|---|---|",
        *[f"| {a} | {b} | {c} | {d} |" for a, b, c, d in checks],
        "",
        f"**Verdict:** {('PASS with caveat (C13) — values correct; fix the buy-to-let label/caveat before UI' if any(c[2] == 'caveat' for c in checks) else 'PASS — ready for UI') if not failed else f'FAIL — {len(failed)} check(s)'}",
        "",
        "Notes: the purpose shares are shares of gross advances, not balances. In Summary 1 the "
        "first-time-buyer, buy-to-let and other rows sum exactly to house purchase in every "
        "quarter (C13), so the served buy-to-let share is buy-to-let *house purchase* only and "
        "is already inside the house-purchase share; it must not be added to it, and the "
        "manifest/UI should not describe it as all buy-to-let advances. Arrears share is a "
        "stock ratio at quarter end. The FCA page gives no headline for arrears, LTV or "
        "buy-to-let, so those are checked against the workbook and internal identities only. "
        "Workbook note (b): unsecuritised balances revised down ~£10bn from 2024 Q3.",
        "",
    ]
    OUT.write_text("\n".join(lines))
    print("\n".join(lines))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
