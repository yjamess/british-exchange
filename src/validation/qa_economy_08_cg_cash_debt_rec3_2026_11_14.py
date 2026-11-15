"""Independent QA — Economy Domain 08 CG cash↔debt (Appendix A REC3).

Does **not** import the Economy connector. Reads pinned raw + curated only,
re-parses ONS JSON with ``json``, compares every period, and recomputes the
REC3 identity. Optionally re-fetches live ONS ``/data`` to confirm pin freshness.

Never writes under ``data/economy/``.

  PYTHONPATH=src uv run python -m validation.qa_economy_08_cg_cash_debt_rec3_2026_11_14
"""

from __future__ import annotations

import calendar
import csv
import hashlib
import json
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / "data" / "economy" / "cg-cash-debt-reconciliation"
UA = "BritishExchange-Validation/1.0"
TRUST_FROM = "2000-04-01"

# REC3 column order (Appendix A) — identity: sum(all but last) == last
REC3 = [
    "M98R",
    "LSIW",
    "MW7L",
    "E3VL",
    "E3VM",
    "N42A",
    "E3VX",
    "N42C",
    "N42E",
    "N42F",
    "E3VY",
    "E3VZ",
    "N42H",
    "MW4W",
]
LHS = set(REC3[:-1])
RHS = "MW4W"

MONTH_NAME = {name: i for i, name in enumerate(calendar.month_name) if name}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read()


def month_start(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}-01"


def parse_months_json(payload: dict[str, Any]) -> dict[str, float | None]:
    """period_start → value (None if blank)."""
    out: dict[str, float | None] = {}
    for row in payload.get("months") or []:
        if not isinstance(row, dict):
            continue
        year_raw, month_raw = row.get("year"), row.get("month")
        if year_raw is None or month_raw is None:
            continue
        month = MONTH_NAME.get(str(month_raw).strip().title()) or MONTH_NAME.get(
            str(month_raw).strip().capitalize()
        )
        if month is None:
            # try full lowercase map
            month = next(
                (i for n, i in MONTH_NAME.items() if n.lower() == str(month_raw).lower()),
                None,
            )
        if month is None:
            continue
        period = month_start(int(str(year_raw)), month)
        raw = row.get("value")
        if raw in (None, ""):
            out[period] = None
        else:
            out[period] = float(raw)
    return out


def load_curated() -> dict[str, dict[str, tuple[float | None, str]]]:
    """period → cdid → (value, status)."""
    path = PKG / "curated" / "observations.csv"
    by: dict[str, dict[str, tuple[float | None, str]]] = defaultdict(dict)
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            notes = row.get("notes") or ""
            if not notes.startswith("series="):
                continue
            cdid = notes.split(";", 1)[0].removeprefix("series=")
            raw = row.get("value")
            val = None if raw in ("", None) else float(raw)
            by[row["period_start"]][cdid] = (val, row["observation_status"])
    return by


def main() -> None:
    manifest = yaml.safe_load((PKG / "manifest.yaml").read_text(encoding="utf-8"))
    evidence = {e["path"]: e for e in manifest.get("raw_evidence") or []}

    # —— C1: disk checksums match manifest ——
    checksum_ok: list[dict[str, str]] = []
    checksum_fail: list[dict[str, str]] = []
    for rel, meta in evidence.items():
        path = PKG / rel
        if not path.exists():
            checksum_fail.append({"path": rel, "error": "missing"})
            continue
        got = sha256(path)
        exp = meta.get("checksum_sha256", "")
        row = {"path": rel, "match": "yes" if got == exp else "no", "sha256": got}
        (checksum_ok if got == exp else checksum_fail).append(row)

    # —— C2: live JSON hash vs pin (CDID files only) ——
    live_pin: list[dict[str, Any]] = []
    for rel, meta in evidence.items():
        if not rel.endswith(".json"):
            continue
        url = meta.get("source_url") or ""
        try:
            live = fetch(url)
            live_sha = hashlib.sha256(live).hexdigest()
            live_pin.append(
                {
                    "path": rel,
                    "live_match_pin": live_sha == meta.get("checksum_sha256"),
                    "live_sha256": live_sha,
                    "pin_sha256": meta.get("checksum_sha256"),
                    "release": json.loads(live.decode()).get("description", {}).get(
                        "releaseDate"
                    ),
                }
            )
        except Exception as exc:  # noqa: BLE001 — report, don't crash whole QA
            live_pin.append({"path": rel, "error": str(exc)})

    # —— C3: re-parse every CDID JSON vs curated ——
    curated = load_curated()
    parse_diffs: list[dict[str, Any]] = []
    parse_summary: dict[str, Any] = {}
    for rel in sorted(p for p in evidence if p.endswith(".json")):
        cdid = Path(rel).name.split("_", 1)[0].upper()
        payload = json.loads((PKG / rel).read_text(encoding="utf-8"))
        parsed = parse_months_json(payload)
        only_raw = 0
        only_cur = 0
        value_diffs = 0
        compared = 0
        for period, raw_val in parsed.items():
            cur = curated.get(period, {}).get(cdid)
            if cur is None:
                only_raw += 1
                continue
            cur_val, status = cur
            # missing both sides
            if raw_val is None and (cur_val is None or status == "missing"):
                compared += 1
                continue
            if raw_val is None or cur_val is None:
                value_diffs += 1
                if len(parse_diffs) < 30:
                    parse_diffs.append(
                        {
                            "cdid": cdid,
                            "period": period,
                            "raw": raw_val,
                            "curated": cur_val,
                            "status": status,
                        }
                    )
                continue
            compared += 1
            if abs(raw_val - cur_val) > 1e-9:
                value_diffs += 1
                if len(parse_diffs) < 30:
                    parse_diffs.append(
                        {
                            "cdid": cdid,
                            "period": period,
                            "raw": raw_val,
                            "curated": cur_val,
                        }
                    )
        for period, series in curated.items():
            if cdid in series and period not in parsed:
                only_cur += 1
        parse_summary[cdid] = {
            "compared": compared,
            "value_diffs": value_diffs,
            "only_raw": only_raw,
            "only_curated": only_cur,
        }

    # —— C4: REC3 identity from curated (final valued) ——
    ok = fail_trust = fail_pre = skipped = 0
    fail_examples: list[dict[str, Any]] = []
    for period, series in sorted(curated.items()):
        vals: dict[str, float] = {}
        complete = True
        for cdid in REC3:
            cell = series.get(cdid)
            if cell is None or cell[1] != "final" or cell[0] is None:
                complete = False
                break
            vals[cdid] = float(cell[0])
        if not complete:
            skipped += 1
            continue
        left = sum(vals[c] for c in LHS)
        right = vals[RHS]
        diff = round(left - right, 6)
        if abs(diff) < 0.01:
            ok += 1
        elif period < TRUST_FROM:
            fail_pre += 1
        else:
            fail_trust += 1
            if len(fail_examples) < 10:
                fail_examples.append(
                    {"period": period, "sum": left, "mw4w": right, "diff": diff}
                )

    # —— C5: Appendix A annual/FY samples (openpyxl if available) ——
    appendix: dict[str, Any] = {"available": False}
    xlsx = PKG / "raw/2026-11-14/appendix_a_rec3_source.xlsx"
    try:
        from openpyxl import load_workbook

        wb = load_workbook(xlsx, read_only=True, data_only=True)
        ws = wb["REC3"]
        samples = {
            "2021": None,
            "2023": None,
            "Apr 2021 to Mar 2022": None,
            "Apr 2023 to Mar 2024": None,
        }
        for row in ws.iter_rows(values_only=True):
            lab = str(row[0] or "")
            if lab in samples:
                nums = [float(x) for x in row[1:15] if isinstance(x, (int, float))]
                if len(nums) >= 14:
                    left = sum(nums[:-1])
                    right = nums[-1]
                    samples[lab] = {
                        "sum_lhs_adj": left,
                        "mw4w": right,
                        "diff": round(left - right, 6),
                    }
        appendix = {
            "available": True,
            "xlsx_sha256_match": sha256(xlsx)
            == evidence["raw/2026-11-14/appendix_a_rec3_source.xlsx"]["checksum_sha256"],
            "samples": samples,
        }
    except Exception as exc:  # noqa: BLE001
        appendix = {"available": False, "error": str(exc)}

    # —— C6: scope honesty ——
    scope = {
        "is_public_sector_psnb_psnd": False,
        "is_central_government_cash_debt": True,
        "related_not_duplicated": ["public-sector-net-debt", "public-sector-net-borrowing"],
        "trust_monthly_from": TRUST_FROM,
    }

    parse_pass = all(
        s["value_diffs"] == 0 and s["only_curated"] == 0 for s in parse_summary.values()
    )
    # only_raw can be non-zero if JSON has blank months not written — treat as warn if large
    live_pass = all(r.get("live_match_pin") is True for r in live_pin if "error" not in r)
    appendix_pass = appendix.get("available") and all(
        (v or {}).get("diff") == 0.0 for v in (appendix.get("samples") or {}).values() if v
    )
    identity_pass = fail_trust == 0 and ok > 0
    checksum_pass = len(checksum_fail) == 0

    verdict = (
        "pass"
        if checksum_pass and parse_pass and identity_pass and appendix_pass
        else "fail"
    )
    # live pin mismatch is warn (network / mid-release), not automatic fail if disk pin intact
    warns: list[str] = []
    if not live_pass:
        warns.append("live ONS JSON hash ≠ pin for at least one CDID (disk pin still used)")
    if any(s["only_raw"] > 0 for s in parse_summary.values()):
        warns.append("some raw blank/valued months not mirrored in curated (see only_raw)")

    doc = {
        "indicator_id": "cg-cash-debt-reconciliation",
        "verdict": verdict,
        "warns": warns,
        "checksum_pass": checksum_pass,
        "checksum_fail": checksum_fail,
        "live_pin": live_pin,
        "parse_summary": parse_summary,
        "parse_diffs_sample": parse_diffs,
        "parse_pass": parse_pass,
        "identity": {
            "ok": ok,
            "fail_from_trust": fail_trust,
            "fail_pre_trust": fail_pre,
            "skipped_incomplete": skipped,
            "fail_examples": fail_examples,
            "pass": identity_pass,
            "trust_from": TRUST_FROM,
        },
        "appendix_a": appendix,
        "appendix_pass": appendix_pass,
        "scope": scope,
        "n_curated_rows": sum(len(v) for v in curated.values()),
        "independence": "Validation did not edit data/economy/; no Economy connector import",
    }
    print(json.dumps(doc, indent=2))


if __name__ == "__main__":
    main()
