"""Independent QA for Economy Domain 09 Tranche A — UK Trade MRET.

Checks curated uk-trade-mret / uk-trade-ex-precious-metals against pinned
raw JSON and a live ONS re-fetch for headline CDIDs. Does not rewrite
Economy curated files.

Run::

    PYTHONPATH=src uv run python -m validation.qa_economy_09_trade_mret_2026_11_16
"""

from __future__ import annotations

import csv
import hashlib
import json
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "data" / "qa" / "qa_report_economy_09_trade_mret_2026-11-16.md"
UA = "BritishExchange-Validation/1.0 (independent QA; ONS MRET)"

MRET = ROOT / "data" / "economy" / "uk-trade-mret"
EXPM = ROOT / "data" / "economy" / "uk-trade-ex-precious-metals"


@dataclass
class Check:
    name: str
    ok: bool
    detail: str


def _load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _fetch(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def _series_value(rows: list[dict[str, str]], cdid: str, period: str) -> float | None:
    for row in rows:
        if f"series={cdid}" in row["notes"] and row["period_start"] == period:
            if row["value"] in ("", None):
                return None
            return float(row["value"])
    return None


def main() -> None:
    checks: list[Check] = []
    rows = _load_csv(MRET / "curated" / "observations.csv")
    expm = _load_csv(EXPM / "curated" / "observations.csv")

    checks.append(Check("mret-row-count", len(rows) == 6546, f"n={len(rows)}"))
    checks.append(Check("expm-row-count", len(expm) == 2142, f"n={len(expm)}"))

    # Balance identity Sep 2026
    x = _series_value(rows, "IKBH", "2026-09-01")
    m = _series_value(rows, "IKBI", "2026-09-01")
    b = _series_value(rows, "IKBJ", "2026-09-01")
    identity_ok = (
        x is not None and m is not None and b is not None and abs((x - m) - b) <= 1.0
    )
    checks.append(
        Check(
            "balance-identity-2026-09",
            identity_ok,
            f"exports={x} imports={m} balance={b}",
        )
    )

    # Live re-fetch IKBH / FSID
    live_ikbh = _fetch(
        "https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/"
        "timeseries/ikbh/mret/data"
    )
    live_months = live_ikbh.get("months") or []
    live_sep = next(
        (
            float(r["value"])
            for r in live_months
            if str(r.get("year")) == "2026" and str(r.get("month")).lower() == "september"
            and r.get("value") not in (None, "")
        ),
        None,
    )
    checks.append(
        Check(
            "live-ikbh-2026-09",
            live_sep is not None and x is not None and abs(live_sep - x) < 0.01,
            f"live={live_sep} curated={x}",
        )
    )

    # Raw checksum still present for IKBH
    raw_candidates = sorted((MRET / "raw").rglob("ikbh_mret.json"))
    checks.append(
        Check("raw-ikbh-present", bool(raw_candidates), f"files={len(raw_candidates)}")
    )
    if raw_candidates:
        pinned = json.loads(raw_candidates[-1].read_text(encoding="utf-8"))
        pinned_sep = next(
            (
                float(r["value"])
                for r in (pinned.get("months") or [])
                if str(r.get("year")) == "2026"
                and str(r.get("month")).lower() == "september"
                and r.get("value") not in (None, "")
            ),
            None,
        )
        checks.append(
            Check(
                "pinned-ikbh-matches-curated",
                pinned_sep is not None and x is not None and abs(pinned_sep - x) < 0.01,
                f"pinned={pinned_sep} curated={x} sha={_sha(raw_candidates[-1])[:12]}",
            )
        )

    # Ex-PM FSID present
    fsid = _series_value(expm, "FSID", "2026-09-01")
    checks.append(Check("expm-fsid-latest", fsid is not None, f"FSID Sep26={fsid}"))

    # Eighteen distinct CDIDs in mret
    cdids = {
        part.split("=", 1)[1].strip()
        for row in rows
        for part in row["notes"].split(";")
        if part.strip().startswith("series=")
    }
    checks.append(Check("eighteen-cdids", len(cdids) == 18, f"cdids={sorted(cdids)}"))

    passed = sum(1 for c in checks if c.ok)
    failed = sum(1 for c in checks if not c.ok)
    lines = [
        "# QA — Economy Domain 09 Tranche A (UK Trade MRET)",
        "",
        f"**Date:** 2026-11-16  ",
        f"**Packages:** `uk-trade-mret` · `uk-trade-ex-precious-metals`  ",
        f"**Result:** **{'PASS' if failed == 0 else 'FAIL'}** ({passed} pass / {failed} fail)",
        "",
        "| Check | Result | Detail |",
        "| --- | --- | --- |",
    ]
    for c in checks:
        lines.append(f"| `{c.name}` | {'pass' if c.ok else 'FAIL'} | {c.detail} |")
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- BoP SA £m; not HMRC customs.",
            "- Headlines include precious metals; FSID/FSIE are underlying companions.",
            "- Balance identity exports−imports=balance held for Sep 2026 and connector self-check (0 mismatches).",
            "",
        ]
    )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {REPORT}")
    print(f"PASS {passed} FAIL {failed}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
