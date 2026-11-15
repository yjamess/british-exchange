"""Independent QA for Economy Domain 03 — employment by occupation (EC-VAL-03-OCCUPATION).

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_03_occupation_2026_11_15

Checks the Economy package against the raw Nomis pin and the published identities.
Does not rewrite the package.
"""

from __future__ import annotations

import csv
import hashlib
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_03_occupation_2026-11-15.md"
PACK = ROOT / "data" / "economy" / "employment-by-occupation"

# Spots read directly from Nomis on 2026-11-15 (window Jul 2025–Jun 2026).
LATEST_WINDOW = "Jul 2025-Jun 2026"
SPOT_SHARE = {"1": 11.4, "2": 27.2, "3": 15.0, "4": 9.1, "5": 8.3, "6": 8.7, "7": 5.6, "8": 5.5, "9": 9.0}
SPOT_PEOPLE_2 = 9_100_200.0
SPOT_EMPLOYMENT = 33_470_000.0
FIRST_WINDOW = "Jan 2021-Dec 2021"
EXPECTED_WINDOWS = 19


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def note_field(notes: str, key: str) -> str:
    marker = f"{key}="
    if marker not in notes:
        return ""
    return notes.split(marker, 1)[1].split(";", 1)[0].strip()


def main() -> None:
    checks: list[tuple[str, str, str]] = []

    def add(name: str, ok: bool, detail: str) -> None:
        checks.append((name, "pass" if ok else "fail", detail))

    manifest = yaml.safe_load((PACK / "manifest.yaml").read_text(encoding="utf-8"))
    evidence = manifest["raw_evidence"][0]
    raw_path = PACK / evidence["path"]
    add("raw pin present", raw_path.is_file(), raw_path.name)
    add(
        "raw checksum matches manifest",
        raw_path.is_file() and sha256(raw_path) == evidence["checksum_sha256"],
        evidence["checksum_sha256"][:16],
    )
    add("ONS EMP04 discontinued → Nomis APS named", "Nomis" in manifest["publisher"] and "NM_17_5" in manifest["series_id"], manifest["publisher"])

    rows = list(csv.DictReader((PACK / "curated" / "observations.csv").open(newline="", encoding="utf-8")))
    valued = [r for r in rows if r["value"] not in ("", None)]
    add("no missing rows", len(valued) == len(rows), f"{len(rows)} rows")

    windows = sorted({note_field(r["notes"], "window") for r in rows}, key=lambda w: next(r["period_end"] for r in rows if note_field(r["notes"], "window") == w))
    add("window count", len(windows) == EXPECTED_WINDOWS, f"{len(windows)} windows {windows[0]} → {windows[-1]}")
    add("first SOC2020 window", windows[0] == FIRST_WINDOW, windows[0])
    add("latest window", windows[-1] == LATEST_WINDOW, windows[-1])

    by_window: dict[str, dict[tuple[str, str], float]] = defaultdict(dict)
    for r in rows:
        by_window[note_field(r["notes"], "window")][(note_field(r["notes"], "series"), note_field(r["notes"], "soc"))] = float(r["value"])

    latest = by_window[LATEST_WINDOW]
    add("latest shares match Nomis", all(abs(latest[("share", k)] - v) < 1e-9 for k, v in SPOT_SHARE.items()), ", ".join(f"{k}:{latest[('share', k)]}" for k in SPOT_SHARE))
    add("group 2 people", latest[("people", "2")] == SPOT_PEOPLE_2, str(latest[("people", "2")]))
    add("denominator", latest[("employment", "all")] == SPOT_EMPLOYMENT, str(latest[("employment", "all")]))

    worst = 0.0
    sums: list[float] = []
    for window, cells in by_window.items():
        den = cells[("employment", "all")]
        for soc in SPOT_SHARE:
            worst = max(worst, abs(cells[("people", soc)] / den * 100 - cells[("share", soc)]))
        sums.append(sum(cells[("share", soc)] for soc in SPOT_SHARE))
    add("share identity every window", worst <= 0.06, f"worst gap {worst:.3f} points")
    add("nine groups under 100%", all(99.0 <= s_ <= 100.0 for s_ in sums), f"min {min(sums):.1f} max {max(sums):.1f}")

    statuses = {r["observation_status"] for r in rows}
    provisional = [r for r in rows if r["observation_status"] == "provisional"]
    add("latest window provisional only", statuses == {"final", "provisional"} and len(provisional) == 19 and all(note_field(r["notes"], "window") == LATEST_WINDOW for r in provisional), f"{len(provisional)} provisional")
    add("units say people not jobs", all("People" in r["unit"] or "%" in r["unit"] for r in rows) and not any("job" in r["unit"].lower() for r in rows), "units")
    add("geography UK", {r["geography_code"] for r in rows} == {"K02000001"}, "K02000001")

    failed = [c for c in checks if c[1] == "fail"]
    verdict = "PASS" if not failed else "FAIL"
    lines = [
        "# QA — Economy Domain 03 employment by occupation (2026-11-15)",
        "",
        f"**Verdict:** {verdict} · {len(checks) - len(failed)} pass / {len(failed)} fail / 0 warn",
        "",
        "Independent sample of `employment-by-occupation` against the Nomis pin and the published share identity. Does not rewrite the Economy package.",
        "",
        "| Check | Result | Detail |",
        "|-------|--------|--------|",
        *[f"| {n} | {s} | {d} |" for n, s, d in checks],
        "",
        "## Ready recommendation",
        "",
        "Promote `employment-by-occupation` to Ready and cloud-load when verdict is PASS. People, not jobs — never compare with Workforce Jobs. EMP04 is discontinued; Nomis APS is the official successor.",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
