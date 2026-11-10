"""Independent QA — corporate-owned-titles (HM Land Registry CCOD + OCOD).

Does not import the Housing connector. Re-downloads both full files through the
HM Land Registry API, recounts them with its own reader, and compares the result
with what Postgres serves for the current release. Writes data/qa/qa_report_….md.

  uv run python -m validation.qa_corporate_owned_titles_2026_11_10
"""

from __future__ import annotations

import csv
import hashlib
import io
import os
import tempfile
import zipfile
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import httpx
import yaml

from britain_exchange.db import connect, load_repo_env

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data" / "housing" / "corporate-owned-titles" / "manifest.yaml"
OUT = ROOT / "data" / "qa" / "qa_report_corporate_owned_titles_2026-11-10.md"
API = "https://use-land-property-data.service.gov.uk/api/v1"
INDICATOR = "corporate-owned-titles"
EW = "K04000001"

# Hand-picked districts → ONS LAD 2024 codes, written out here rather than matched.
SPOT = {
    "CITY OF WESTMINSTER": "E09000033",
    "KENSINGTON AND CHELSEA": "E09000020",
    "CITY OF LONDON": "E09000001",
    "BIRMINGHAM": "E08000025",
    "CITY OF BRISTOL": "E06000023",
    "HEREFORDSHIRE": "E06000019",
    "CARDIFF": "W06000015",
    "RHONDDA CYNON TAFF": "W06000016",
}


def fetch(client: httpx.Client, dataset: str, dest_dir: Path) -> tuple[Path, str, int]:
    meta = client.get(f"{API}/datasets/{dataset}").json()["result"]
    (full,) = [r for r in meta["resources"] if "_FULL_" in r["file_name"]]
    url = client.get(f"{API}/datasets/{dataset}/{full['file_name']}").json()["result"][
        "download_url"
    ]
    dest = dest_dir / full["file_name"]
    sha = hashlib.sha256()
    with httpx.stream("GET", url, timeout=600.0) as response, dest.open("wb") as fh:
        response.raise_for_status()
        for chunk in response.iter_bytes(1 << 20):
            fh.write(chunk)
            sha.update(chunk)
    return dest, sha.hexdigest(), int(full["row_count"])


def recount(path: Path) -> dict:
    tenure: Counter[str] = Counter()
    district: Counter[str] = Counter()
    kind: Counter[str] = Counter()
    country: Counter[str] = Counter()
    companies: set[str] = set()
    trailer = None
    with zipfile.ZipFile(path) as z, z.open(z.namelist()[0]) as raw:
        for row in csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8", newline="")):
            if row["Title Number"] == "Row Count:":
                trailer = int(row["Tenure"])
                continue
            tenure[row["Tenure"]] += 1
            district[row["District"]] += 1
            kind[row["Proprietorship Category (1)"]] += 1
            if "Country Incorporated (1)" in row:
                country[row["Country Incorporated (1)"].title()] += 1
            for i in range(1, 5):
                if number := row[f"Company Registration No. ({i})"].strip():
                    companies.add(number.upper())
    return {
        "titles": sum(tenure.values()),
        "trailer": trailer,
        "tenure": tenure,
        "district": district,
        "kind": kind,
        "country": country,
        "companies": len(companies),
    }


def served() -> tuple[list[dict], dict]:
    with connect() as conn:
        release = conn.execute(
            "SELECT release_id, source_version FROM data_release "
            "WHERE indicator_id = %s AND is_current",
            (INDICATOR,),
        ).fetchone()
        rows = conn.execute(
            "SELECT period_start, period_end, geography_code, value, unit, notes "
            "FROM observation WHERE release_id = %s",
            (release["release_id"],),
        ).fetchall()
    return rows, release


def notes_map(text: str) -> dict[str, str]:
    return dict(p.strip().split("=", 1) for p in text.split(";") if "=" in p)


def main() -> int:
    load_repo_env()
    manifest = yaml.safe_load(MANIFEST.read_text())
    manifest_sha = {
        Path(e["path"]).name: e["checksum_sha256"] for e in manifest["raw_evidence"]
    }
    checks: list[tuple[str, str, str, str]] = []

    def check(cid: str, what: str, ok: bool, detail: str) -> None:
        checks.append((cid, what, "pass" if ok else "FAIL", detail))

    counts: dict[str, dict] = {}
    with tempfile.TemporaryDirectory() as tmp, httpx.Client(
        headers={"Authorization": os.environ["HMLR_API_KEY"]}, timeout=60.0
    ) as client:
        for dataset, origin in (("ocod", "overseas-company"), ("ccod", "uk-company")):
            path, sha, row_count = fetch(client, dataset, Path(tmp))
            check(
                f"C1-{dataset}",
                f"{path.name} SHA-256 matches manifest",
                manifest_sha.get(path.name) == sha,
                sha[:16] + "…",
            )
            c = recount(path)
            path.unlink()
            # API row_count includes the header and the trailer line.
            check(
                f"C2-{dataset}",
                "Titles = trailer = publisher row count − 2",
                c["titles"] == c["trailer"] == row_count - 2,
                f"{c['titles']:,} / {c['trailer']:,} / {row_count - 2:,}",
            )
            counts[origin] = c

    rows, release = served()
    by: dict[tuple, float] = {}
    lad_sum: dict[str, float] = defaultdict(float)
    lad_codes: dict[str, set[str]] = defaultdict(set)
    for r in rows:
        n = notes_map(r["notes"])
        if r["geography_code"] == EW:
            by[(n.get("series"), n.get("category"), n.get("tenure", ""))] = r["value"]
        elif n.get("series") == "owner-origin":
            lad_sum[n["category"]] += r["value"]
            lad_codes[n["category"]].add(r["geography_code"])
            by[("lad", n["category"], r["geography_code"])] = r["value"]

    periods = {(str(r["period_start"]), str(r["period_end"])) for r in rows}
    check("C3", "One period, November 2026", periods == {("2026-11-01", "2026-11-30")}, str(periods))

    for origin, c in counts.items():
        check(
            f"C4-{origin}",
            "England and Wales total and tenure split",
            by.get(("owner-origin", origin, "")) == c["titles"]
            and all(
                by.get(("owner-origin", origin, t.lower())) == c["tenure"][t]
                for t in ("Freehold", "Leasehold")
            ),
            f"{c['titles']:,} titles; freehold {c['tenure']['Freehold']:,}",
        )
        kinds = {k: v for (s, k, _), v in by.items() if s == f"{origin}-owner-type"}
        check(
            f"C5-{origin}",
            "Owner-type counts (all categories)",
            sorted(kinds.values()) == sorted(c["kind"].values()) and sum(kinds.values()) == c["titles"],
            f"{len(kinds)} categories",
        )
        check(
            f"C6-{origin}",
            "Local authority rows sum to the total; all E/W codes",
            lad_sum[origin] == c["titles"]
            and all(code[0] in "EW" for code in lad_codes[origin]),
            f"{len(lad_codes[origin])} authorities, sum {lad_sum[origin]:,.0f}",
        )
        misses = [
            f"{d}: raw {c['district'][d]} vs served {by.get(('lad', origin, code))}"
            for d, code in SPOT.items()
            if not c["district"][d] or by.get(("lad", origin, code)) != c["district"][d]
        ]
        check(f"C7-{origin}", "Spot-check 8 named authorities", not misses, "; ".join(misses) or "all equal")

    overseas = counts["overseas-company"]
    countries = {k: v for (s, k, _), v in by.items() if s == "overseas-country"}
    check(
        "C8",
        "Overseas country counts",
        sorted(countries.values()) == sorted(overseas["country"].values()),
        f"{len(countries)} countries; top raw {overseas['country'].most_common(1)[0]}",
    )
    companies = by.get(("proprietors", "uk-companies-with-number", ""))
    check(
        "C9",
        "Distinct UK company registration numbers",
        companies == counts["uk-company"]["companies"],
        f"served {companies:,.0f} vs recount {counts['uk-company']['companies']:,}",
    )

    failed = [c for c in checks if c[2] != "pass"]
    lines = [
        f"# QA report — {INDICATOR}",
        "",
        f"Date: {date.today().isoformat()} · Validation agent · release: {release['source_version']}",
        "",
        "Independent recount: both full files re-downloaded through the HM Land Registry API, "
        "read with csv.DictReader (no Housing connector code), compared with the current "
        "Postgres release. Authority spot-checks use hand-written ONS codes, not the "
        "connector's name matching.",
        "",
        "| Check | What | Result | Detail |",
        "|---|---|---|---|",
        *[f"| {a} | {b} | {c} | {d} |" for a, b, c, d in checks],
        "",
        f"**Verdict:** {'PASS — ready for UI' if not failed else f'FAIL — {len(failed)} check(s)'}",
        "",
        "Not checked: HM Land Registry publishes no aggregate tables for these files, so the "
        "official cross-check is the publisher's row count (C2). Raw zips are not retained, "
        "so this recount is only possible while the release is current on the API.",
        "",
    ]
    OUT.write_text("\n".join(lines))
    print("\n".join(lines))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
