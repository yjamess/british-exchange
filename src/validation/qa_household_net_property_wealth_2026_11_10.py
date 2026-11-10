"""Independent QA — household-net-property-wealth (ONS Wealth and Assets Survey).

Does not import the Housing connector. Re-reads Tables 3.8, 3.9 and 3.19 of the pinned
workbook with openpyxl, using row labels and round headers written out here, and
compares every cell with what Postgres serves for the current release. Cross-checks
the April 2020 to March 2022 medians against the published headline figures.
Writes data/qa/qa_report_household-net-property-wealth_2026-11-10.md.

  uv run python -m britain_exchange.archive_data pull data/housing/household-net-property-wealth
  PYTHONPATH=src uv run python -m validation.qa_household_net_property_wealth_2026_11_10
"""

from __future__ import annotations

import calendar
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

import openpyxl
import yaml

from britain_exchange.checksum import sha256_file
from britain_exchange.db import connect, load_repo_env

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "housing" / "household-net-property-wealth"
OUT = ROOT / "data" / "qa" / "qa_report_household-net-property-wealth_2026-11-10.md"
INDICATOR = "household-net-property-wealth"
GB = "K03000001"
MONTHS = {m: i for i, m in enumerate(calendar.month_name) if m}

# Table 3.8: (percentile heading row, owners row, all households row) → served series stem
T38 = {"p25": (5, 6, 7), "median": (8, 9, 10), "p75": (11, 12, 13)}
T38_LABELS = ("Net Property Wealth for property owners", "Net Property Wealth for all households")
T319_AGES = {
    "Under 16": "age-under-16",
    "16-24": "age-16-24",
    "25-34": "age-25-34",
    "35-44": "age-35-44",
    "45-54": "age-45-54",
    "55-64": "age-55-64",
    "65+": "age-65-plus",
    "All Persons": "age-all-persons",
}
T319_BANDS = ["do-not-own", "under-50", "50-to-125", "125-to-250", "250-to-375", "375-to-500", "500-or-more"]
LATEST = "April 2020 to March 2022"


def round_dates(header: str) -> tuple[date, date]:
    words = re.sub(r"\s+", " ", header).strip()
    m = re.fullmatch(r"(\w+) (\d{4}) to (\w+) (\d{4})", words)
    assert m, header
    a, y1, b, y2 = m.groups()
    end_m = MONTHS[b]
    return date(int(y1), MONTHS[a], 1), date(int(y2), end_m, calendar.monthrange(int(y2), end_m)[1])


def read_raw(path: Path) -> tuple[dict[tuple[str, str, date], float], dict, list[str]]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out: dict[tuple[str, str, date], float] = {}
    extra: dict = {}
    problems: list[str] = []

    t38 = list(wb["3.8"].iter_rows(values_only=True))
    rounds = [round_dates(h) for h in t38[3][1:10]]
    extra["rounds"] = rounds
    for stem, (head, own, allh) in T38.items():
        if stem == "median" and "Median" not in str(t38[head - 1][1]):
            problems.append(f"3.8 r{head}: {t38[head - 1][1]!r}")
        for row, who, label in ((own, "property-owners", T38_LABELS[0]), (allh, "all-households", T38_LABELS[1])):
            r = t38[row - 1]
            if r[0] != label:
                problems.append(f"3.8 r{row}: {r[0]!r}")
            for (start, _), v in zip(rounds, r[1:10]):
                out[(f"{stem}-{who}", "", start)] = float(v)

    t39 = list(wb["3.9"].iter_rows(values_only=True))
    if [round_dates(h) for h in t39[3][1:10]] != rounds:
        problems.append("3.9 round headers differ from 3.8")
    agg = {t39[i][0]: t39[i][1:10] for i in (5, 6, 7)}
    if "Aggregate household net property wealth" not in agg:
        problems.append(f"3.9 labels {list(agg)}")
    for (start, _), v in zip(rounds, agg["Aggregate household net property wealth"]):
        out[("aggregate-net", "", start)] = float(v)
    extra["identity"] = [
        (s, g, d, n)
        for (s, _), g, d, n in zip(
            rounds,
            agg["Aggregate household gross property wealth"],
            agg["Aggregate mortgage debt"],
            agg["Aggregate household net property wealth"],
        )
    ]

    t319 = list(wb["3.19"].iter_rows(values_only=True))
    (start_idx,) = [i for i, r in enumerate(t319) if isinstance(r[0], str) and r[0].strip() == LATEST]
    latest_start, _ = round_dates(LATEST)
    sums = {}
    for r in t319[start_idx + 2 : start_idx + 10]:
        series = T319_AGES[r[0].strip()]
        for band, v in zip(T319_BANDS, r[1:8]):
            out[(series, band, latest_start)] = float(v)
        sums[series] = sum(r[1:8])
    extra["t319_sums"] = sums
    wb.close()
    return out, extra, problems


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


def expected_unit(series: str) -> tuple[str, str]:
    if series == "aggregate-net":
        return "gbp-billions", "stock"
    if series.startswith("age-"):
        return "percent", "share"
    return "gbp", "stock"


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

    raw, extra, problems = read_raw(raw_path)
    check("C2", "Table 3.8/3.9/3.19 rows and round headers found where expected", not problems, "; ".join(problems) or "ok")

    rows, release = served()
    check(
        "C1b",
        "Current release checksum matches manifest",
        release.get("checksum_sha256") == ev["checksum_sha256"],
        str(release.get("checksum_sha256") or "not recorded")[:16],
    )
    srv: dict[tuple[str, str, date], dict] = {}
    dupes = 0
    for r in rows:
        n = notes_map(r["notes"])
        key = (n.get("series"), n.get("band", ""), r["period_start"])
        dupes += key in srv
        srv[key] = r
    check(
        "C3",
        "Row count: raw cells = served rows (54 + 9 + 56); no duplicate key",
        len(raw) == len(rows) == len(srv) and dupes == 0,
        f"raw {len(raw)} / served {len(rows)} / distinct {len(srv)}",
    )

    mism = [(k, v, srv.get(k, {}).get("value")) for k, v in raw.items() if srv.get(k, {}).get("value") != v]
    by_table = defaultdict(int)
    for k in raw:
        by_table["3.19" if k[0].startswith("age-") else "3.9" if k[0] == "aggregate-net" else "3.8"] += 1
    check(
        "C4",
        "Every served value equals the raw cell",
        not mism and not set(srv) - set(raw),
        f"3.8: {by_table['3.8']}, 3.9: {by_table['3.9']}, 3.19: {by_table['3.19']}; {len(mism)} differ"
        + (f"; e.g. {mism[:3]}" if mism else ""),
    )

    ends = {s: e for s, e in extra["rounds"]}
    bad_period = [k for k, r in srv.items() if ends.get(k[2]) != r["period_end"]]
    check("C5", "period_start/end map to the survey round in the header", not bad_period, f"{len(bad_period)} bad")

    overlap = [
        (a, b)
        for i, a in enumerate(extra["rounds"])
        for b in extra["rounds"][i + 1 :]
        if a[0] <= b[1] and b[0] <= a[1]
    ]
    unlabelled = all("round=" not in srv[k]["notes"] for k in srv if not k[0].startswith("age-"))
    check(
        "C6",
        "Period coverage: overlapping survey periods in one series",
        "caveat" if overlap else "pass",
        f"{len(overlap)} overlap: "
        + "; ".join(f"{a[0]:%b %Y}–{a[1]:%b %Y} vs {b[0]:%b %Y}–{b[1]:%b %Y}" for a, b in overlap)
        + (". Wave 5 (Jul 2014–Jun 2016) and Round 5 (Apr 2014–Mar 2016) are both served in each "
           "Table 3.8/3.9 series with no wave/round label in notes" if unlabelled else ""),
    )

    bad_unit = [
        (k[0], r["unit"], notes_map(r["notes"]).get("measure"))
        for k, r in srv.items()
        if (r["unit"], notes_map(r["notes"]).get("measure")) != expected_unit(k[0])
    ]
    check(
        "C7",
        "Units/measure: gbp & stock (3.8), gbp-billions & stock (3.9), percent & share (3.19)",
        not bad_unit,
        f"{len(bad_unit)} wrong" + (f"; e.g. {bad_unit[:2]}" if bad_unit else ""),
    )

    geos = {r["geography_code"] for r in rows}
    check("C8", "Geography is Great Britain only", geos == {GB}, str(sorted(geos)))

    id_bad = [(s, g, d, n) for s, g, d, n in extra["identity"] if abs(g - d - n) > 1]
    check("C9", "Internal (3.9): gross property − mortgage debt = net, ±£1bn rounding", not id_bad, f"{len(id_bad)} rounds off" + (f": {id_bad}" if id_bad else ""))

    sums = extra["t319_sums"]
    sum_bad = {k: v for k, v in sums.items() if abs(v - 100) > 2}
    check(
        "C10",
        "Internal (3.19): each age row's bands sum to 100 ±2 (published whole %)",
        not sum_bad,
        ", ".join(f"{k.removeprefix('age-')} {v:g}" for k, v in sums.items()),
    )

    ordered = []
    for who in ("all-households", "property-owners"):
        for s, _ in extra["rounds"]:
            a, b, c = (srv[(f"{p}-{who}", "", s)]["value"] for p in ("p25", "median", "p75"))
            ordered.append(a <= b <= c)
    check("C11", "Internal (3.8): p25 ≤ median ≤ p75 in every round", all(ordered), f"{sum(ordered)}/{len(ordered)}")

    latest = round_dates(LATEST)[0]
    for i, (series, pub, label) in enumerate(
        [
            ("median-all-households", 106_000, "median, all households £106,000"),
            ("median-property-owners", 226_000, "median, property owners £226,000"),
        ],
        1,
    ):
        v = srv.get((series, "", latest), {}).get("value")
        check(f"H{i}", f"Published headline Apr 2020–Mar 2022 — {label}", v == pub, f"served {v:,.0f}" if v else "missing")
    agg = srv.get(("aggregate-net", "", latest), {}).get("value")
    check(
        "H3",
        "Published headline — net property wealth is 40% of household wealth (ONS bulletin 24 Jan 2025)",
        "not checkable",
        f"served aggregate £{agg:,.0f}bn; total household wealth is not in this workbook, so the 40% share cannot be recomputed here",
    )

    failed = [c for c in checks if c[2] == "FAIL"]
    caveats = [c[0] for c in checks if c[2] == "caveat"]
    verdict = (
        f"FAIL — {len(failed)} check(s)"
        if failed
        else f"PASS with caveat ({', '.join(caveats)}) — values correct" if caveats else "PASS — ready for UI"
    )
    lines = [
        f"# QA report — {INDICATOR}",
        "",
        f"Date: {date.today().isoformat()} · Validation agent · release: {release['source_version']}",
        "",
        f"Independent re-read of the pinned workbook `{ev['path']}` (openpyxl, labels and round "
        "headers parsed here, no Housing connector code), compared with every observation in "
        "the current Postgres release. Headline medians from the Domain 09 brief "
        "(docs/agent-kickoff-ownership.md); the ONS *Total wealth in Great Britain: April 2020 "
        "to March 2022* bulletin (24 January 2025, fetched 2026-11-10) gives the 40% property "
        "share but no median, so the medians are confirmed against the brief and Table 3.8 only.",
        "",
        "| Check | What | Result | Detail |",
        "|---|---|---|---|",
        *[f"| {a} | {b} | {c} | {d} |" for a, b, c, d in checks],
        "",
        f"**Verdict:** {verdict}",
        "",
        "Notes: C6 — the ONS table deliberately prints both the last wave (July 2014 to June "
        "2016) and the first round on the new basis (April 2014 to March 2016). They are two "
        "estimates of almost the same period, not two points in time; a line chart that joins "
        "all nine points will draw a spurious step in 2014–16. The UI should break the line "
        "between waves and rounds or show one of the two. Accreditation was suspended for the "
        "April 2020 to March 2022 round (ONS, 13 June 2025); confidence intervals are not loaded.",
        "",
    ]
    OUT.write_text("\n".join(lines))
    print("\n".join(lines))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
