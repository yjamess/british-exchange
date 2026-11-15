"""Dated vintage store for Growth Revisions (first estimate vs latest release).

Builds a curated JSON pack from the pinned raw ABMI / IHXW files so the UI can
draw both vintages without inventing numbers. Roles: ``first`` is the earliest
pinned first estimate of the shared latest quarter; ``latest`` is the newest
pinned release (12 Nov 2026 PN2, which carried the Sep QNA history unchanged).

Honesty rule (Growth handover §1.3):
- Absolute £ levels are **not** comparable across vintages (reference year moves).
- The chart uses each vintage **rebased to 2019 Q4 = 100**.
- Spot table still shows absolute levels + ratio for Notes honesty.

Run::

    uv run python -m economy.connectors.gdp_vintage_band

Output:: ``data/economy/gdp-vintage-band/curated/band.json``
Pack id:: ``economy.gdp-vintage-band``
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from britain_exchange.paths import ECONOMY_DATA

OUT_PATH = ECONOMY_DATA / "gdp-vintage-band" / "curated" / "band.json"
REF_PERIOD = "2019-10-01"  # 2019 Q4
REF_LABEL = "2019 Q4"

# (indicator key, path under data/economy/, role, ONS dataset, chain-volume reference year)
VINTAGE_FILES: tuple[tuple[str, str, str, str, int], ...] = (
    ("real-gdp", "real-gdp/raw/2026-11-11/abmi_pn2.json", "first", "PN2", 2023),
    ("real-gdp", "real-gdp/raw/2026-11-14/abmi_pn2.json", "latest", "PN2", 2024),
    ("real-gdp-per-head", "real-gdp-per-head/raw/2026-11-11/ihxw_pn2.json", "first", "PN2", 2023),
    ("real-gdp-per-head", "real-gdp-per-head/raw/2026-11-14/ihxw_pn2.json", "latest", "PN2", 2024),
)

QUARTER_NUMBER = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}


@dataclass(frozen=True, slots=True)
class QuarterPoint:
    """One ONS quarterly observation."""

    period_start: str
    t: float
    value: float


def _sha256(path: Path) -> str:
    """Checksum of a raw pin — same pattern as other economy connectors."""
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _release_date(description: dict[str, Any]) -> str:
    """Pull YYYY-MM-DD from ONS description.releaseDate when present."""
    raw = description.get("releaseDate") or ""
    if not raw:
        return ""
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).date().isoformat()
    except ValueError:
        return str(raw)[:10]


def _period_start(year: int, quarter: int) -> str:
    """First day of the quarter as ISO date (ONS convention in our store)."""
    month = 1 + (quarter - 1) * 3
    return f"{year:04d}-{month:02d}-01"


def _t(period_start: str) -> float:
    """Fractional year for chart x-axis (e.g. 2019-10-01 → 2019.75)."""
    y = int(period_start[:4])
    m = int(period_start[5:7])
    return y + (m - 1) / 12


def parse_quarters(
    payload: dict[str, Any],
    *,
    skip_zero_before: str | None = None,
) -> list[QuarterPoint]:
    """Parse ONS ``quarters`` array. Optional zero-placeholder filter (IHXW)."""
    rows = payload.get("quarters")
    if not isinstance(rows, list) or not rows:
        raise ValueError("ONS payload missing quarters array")
    out: list[QuarterPoint] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        year = int(str(row.get("year")))
        q_raw = str(row.get("quarter") or "").strip().upper()
        if q_raw not in QUARTER_NUMBER:
            raise ValueError(f"Unexpected quarter: {row!r}")
        period = _period_start(year, QUARTER_NUMBER[q_raw])
        raw = row.get("value")
        if raw is None or str(raw).strip() in {"", "..", "…", "-"}:
            continue
        value = float(str(raw).replace(",", ""))
        # IHXW PN2 pads early history with zeros — drop those placeholders.
        if skip_zero_before and value == 0.0 and period < skip_zero_before:
            continue
        out.append(QuarterPoint(period_start=period, t=_t(period), value=value))
    out.sort(key=lambda p: p.period_start)
    return out


def rebase(points: list[QuarterPoint], ref_period: str) -> list[dict[str, float | str]]:
    """Index so ``ref_period`` = 100. Fail loudly if the reference quarter is missing."""
    base = next((p.value for p in points if p.period_start == ref_period), None)
    if base is None or base == 0:
        raise ValueError(f"Reference quarter {ref_period} missing or zero")
    return [
        {"period_start": p.period_start, "t": p.t, "v": (p.value / base) * 100.0}
        for p in points
        if p.period_start >= ref_period
    ]


def levels_payload(points: list[QuarterPoint]) -> list[dict[str, float | str]]:
    """Absolute levels kept for the spot table / Notes (not for the chart)."""
    return [{"period_start": p.period_start, "t": p.t, "v": p.value} for p in points]


def build_pack() -> dict[str, Any]:
    """Assemble first-estimate + latest-release vintages for GDP and GDP per head."""
    by_indicator: dict[str, list[dict[str, Any]]] = {
        "real-gdp": [],
        "real-gdp-per-head": [],
    }
    for key, rel, role, dataset, ref_year in VINTAGE_FILES:
        path = ECONOMY_DATA / rel
        if not path.is_file():
            raise FileNotFoundError(
                f"Missing vintage raw: {path}. Expected PN2 and QNA pins under data/economy/."
            )
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError(f"Expected JSON object in {path}")
        description = (
            payload.get("description")
            if isinstance(payload.get("description"), dict)
            else {}
        )
        skip = "1955-01-01" if key == "real-gdp-per-head" else None
        points = parse_quarters(payload, skip_zero_before=skip)
        index = rebase(points, REF_PERIOD)
        latest = points[-1]
        ref = next(p for p in points if p.period_start == REF_PERIOD)
        since_pct = (latest.value / ref.value - 1.0) * 100.0
        by_period = {p.period_start: p.value for p in points}
        by_indicator[key].append(
            {
                "id": role,
                "label": f"{role} · {_release_date(description) or 'unknown-release'}",
                "dataset": dataset,
                "release_date": _release_date(description),
                "reference_year": ref_year,
                "source_file": f"data/economy/{rel}",
                "checksum_sha256": _sha256(path),
                "n": len(points),
                "range": [points[0].period_start, points[-1].period_start],
                "latest_level": latest.value,
                "ref_level": ref.value,
                "since_ref_pct": round(since_pct, 4),
                "_by_period": by_period,
                "_ref_level": ref.value,
                "levels": levels_payload(points),
                "index": index,
            }
        )

    spot: dict[str, Any] = {}
    for key, vintages in by_indicator.items():
        by_id = {v["id"]: v for v in vintages}
        first, latest = by_id["first"], by_id["latest"]
        # Compare both vintages at the latest quarter they share — the newer
        # release carries one more quarter than the first estimate.
        common = min(first["range"][1], latest["range"][1])
        first_level = float(first["_by_period"][common])
        latest_level = float(latest["_by_period"][common])
        spot[key] = {
            "latest_period": common,
            "first_level": first_level,
            "latest_level": latest_level,
            "level_ratio": round(latest_level / first_level, 4),
            "first_since_ref_pct": round((first_level / float(first["_ref_level"]) - 1.0) * 100.0, 4),
            "latest_since_ref_pct": round((latest_level / float(latest["_ref_level"]) - 1.0) * 100.0, 4),
            "first_reference_year": first["reference_year"],
            "latest_reference_year": latest["reference_year"],
        }

    for vintages in by_indicator.values():
        for v in vintages:
            v.pop("_by_period", None)
            v.pop("_ref_level", None)

    return {
        "pack_id": "economy.gdp-vintage-band",
        "built_at": datetime.now(timezone.utc).isoformat(),
        "ref_period": REF_PERIOD,
        "ref_label": REF_LABEL,
        "unit_index": f"index {REF_LABEL} = 100 (each vintage separately)",
        "honesty": (
            "Absolute £ levels are not comparable across vintages (reference year "
            "moves with Blue Book). The chart plots each vintage rebased to "
            f"{REF_LABEL} = 100 so growth shapes can be compared."
        ),
        "series": by_indicator,
        "spot": spot,
    }


def main() -> None:
    """Build the vintage-band pack from pinned first-estimate + latest raw JSON."""
    pack = build_pack()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(pack, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_PATH}")
    print(f"series={list(pack['series'])}")
    for key, spot in pack["spot"].items():
        print(
            f"  {key}: ratio={spot['level_ratio']} "
            f"first_since={spot['first_since_ref_pct']}% "
            f"latest_since={spot['latest_since_ref_pct']}%"
        )


if __name__ == "__main__":
    main()
