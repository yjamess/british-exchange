"""Small helpers for ONS website timeseries JSON (shared by Energy manufacturing).

Approach (plain language):
- ONS publishes each CDID as JSON at ``.../timeseries/<cdid>/<dataset>/data``.
- We pin that JSON under ``raw/<date>/`` and parse years / quarters / months.
- Keep date math and value parsing in one place so connectors stay short.

Official pattern used by Economy Real GDP too; Energy reimplements lightly so we
do not import from ``economy`` (ownership boundary).
See ONS timeseries pages, e.g. https://www.ons.gov.uk/

Best practices:
- pathlib (https://docs.python.org/3/library/pathlib.html)
- type hints (https://docs.python.org/3/library/typing.html)
"""

from __future__ import annotations

import calendar
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Literal

from britain_exchange.observation import ObservationStatus

FrequencyChoice = Literal["years", "quarters", "months"]

MONTH_NAME_TO_NUM = {
    name.lower(): idx
    for idx, name in enumerate(calendar.month_name)
    if name
}
QUARTER_NUMBER = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}


def release_date_iso(description: dict[str, Any]) -> str:
    """Official release date from ONS ``description.releaseDate`` (UTC date)."""
    raw = description.get("releaseDate") or ""
    if not raw:
        return ""
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).date().isoformat()
    except ValueError:
        return str(raw)[:10]


def source_version(description: dict[str, Any], series_id: str, dataset_id: str) -> str:
    release = release_date_iso(description) or "unknown-release"
    return f"{dataset_id}/{series_id} {release}"


def parse_numeric(raw: object) -> tuple[float | None, ObservationStatus]:
    """Parse ONS string/number; empty / ``..`` → missing.

    Valued cells are ``final``. Callers mark the recent revision window with
    ``mark_latest_months_provisional`` (Housing / GVA pattern).
    """
    if raw is None:
        return None, "missing"
    if isinstance(raw, (int, float)):
        return float(raw), "final"
    text = str(raw).strip()
    if not text or text in {"..", "…", "-", "n/a", "N/A"}:
        return None, "missing"
    try:
        return float(text.replace(",", "")), "final"
    except ValueError as exc:
        raise ValueError(f"Non-numeric ONS value: {raw!r}") from exc


def quarter_bounds(year: int, quarter: int) -> tuple[str, str]:
    start_month = 1 + (quarter - 1) * 3
    end_month = start_month + 2
    start = f"{year:04d}-{start_month:02d}-01"
    end_day = calendar.monthrange(year, end_month)[1]
    end = f"{year:04d}-{end_month:02d}-{end_day:02d}"
    return start, end


def month_bounds(year: int, month: int) -> tuple[str, str]:
    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


def year_bounds(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def load_ons_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return payload


def expect_cdid(payload: dict[str, Any], series_id: str) -> dict[str, Any]:
    description = payload.get("description")
    if not isinstance(description, dict):
        raise ValueError("ONS payload missing description object")
    cdid = str(description.get("cdid") or "").upper()
    if cdid and cdid != series_id.upper():
        raise ValueError(f"Expected CDID {series_id}, got {cdid!r}")
    return description


def iter_period_rows(
    payload: dict[str, Any],
    frequency: FrequencyChoice,
) -> list[tuple[str, str, object, str]]:
    """Return list of (period_start, period_end, raw_value, source_dataset)."""
    rows = payload.get(frequency)
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"ONS payload missing non-empty {frequency!r} array")

    out: list[tuple[str, str, object, str]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f"{frequency} row is not an object: {row!r}")
        dataset = str(row.get("sourceDataset") or "")
        year_raw = row.get("year")
        if year_raw is None:
            raise ValueError(f"{frequency} row missing year: {row!r}")
        year = int(str(year_raw))

        if frequency == "years":
            start, end = year_bounds(year)
        elif frequency == "quarters":
            quarter_raw = row.get("quarter")
            if quarter_raw is None:
                raise ValueError(f"Quarter row missing quarter: {row!r}")
            code = str(quarter_raw).strip().upper()
            if code not in QUARTER_NUMBER:
                raise ValueError(f"Unexpected quarter code: {quarter_raw!r}")
            start, end = quarter_bounds(year, QUARTER_NUMBER[code])
        else:
            month_raw = row.get("month")
            if month_raw is None:
                # Fallback: parse "2026 JUN" style date label.
                date_label = str(row.get("date") or "")
                parts = date_label.split()
                if len(parts) == 2 and parts[1][:3].lower() in {
                    "jan",
                    "feb",
                    "mar",
                    "apr",
                    "may",
                    "jun",
                    "jul",
                    "aug",
                    "sep",
                    "oct",
                    "nov",
                    "dec",
                }:
                    month_token = parts[1][:3].lower()
                    month_map = {
                        "jan": 1,
                        "feb": 2,
                        "mar": 3,
                        "apr": 4,
                        "may": 5,
                        "jun": 6,
                        "jul": 7,
                        "aug": 8,
                        "sep": 9,
                        "oct": 10,
                        "nov": 11,
                        "dec": 12,
                    }
                    month = month_map[month_token]
                else:
                    raise ValueError(f"Month row missing month: {row!r}")
            else:
                month_name = str(month_raw).strip().lower()
                if month_name not in MONTH_NAME_TO_NUM:
                    raise ValueError(f"Unexpected month name: {month_raw!r}")
                month = MONTH_NAME_TO_NUM[month_name]
            start, end = month_bounds(year, month)

        out.append((start, end, row.get("value"), dataset))
    return out


def retrieved_pin_date() -> date:
    """Pin folder date for this wave (Europe/London calendar day of ingest)."""
    return date(2026, 11, 3)
