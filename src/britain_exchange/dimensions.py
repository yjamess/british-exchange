"""Typed observation dimensions parsed from structured notes.

Curated CSV still carries a free-text ``notes`` column for human context, but
fuel / company / demographic / series / category distinctions used for filtering
and charts must be available as typed fields (DB columns + API).
See docs/connector-contract.md.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(slots=True, frozen=True)
class ObservationDimensions:
    """Structural breakdown keys for one observation row."""

    fuel: str = ""
    water_company: str = ""
    water_company_name: str = ""
    demographic: str = ""
    series: str = ""
    category: str = ""  # band=, vehicle=, classification=, etc.

    def as_api_dict(self) -> dict[str, str]:
        return {
            "fuel": self.fuel,
            "water_company": self.water_company,
            "water_company_name": self.water_company_name,
            "demographic": self.demographic,
            "series": self.series,
            "category": self.category,
        }

    def is_empty(self) -> bool:
        return not any(
            (
                self.fuel,
                self.water_company,
                self.water_company_name,
                self.demographic,
                self.series,
                self.category,
            )
        )


def _split_notes(notes: str) -> dict[str, str]:
    """Parse ``key=value; key2=value2`` notes into a dict (first wins)."""
    out: dict[str, str] = {}
    text = (notes or "").strip()
    if not text:
        return out
    for part in text.split(";"):
        chunk = part.strip()
        if not chunk or "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        key = key.strip().lower()
        value = value.strip()
        if key and key not in out:
            out[key] = value
    return out


def dimensions_from_notes(notes: str) -> ObservationDimensions:
    """Derive typed dimensions from structured notes."""
    parts = _split_notes(notes)
    demographic = parts.get("sex") or parts.get("demographic") or parts.get("tenure") or ""
    category = (
        parts.get("band")
        or parts.get("vehicle")
        or parts.get("classification")
        or parts.get("kind")
        or ""
    )
    return ObservationDimensions(
        fuel=parts.get("fuel", ""),
        water_company=parts.get("company", ""),
        water_company_name=parts.get("company_name", ""),
        demographic=demographic,
        series=parts.get("series", ""),
        category=category,
    )


def notes_from_dimensions(
    dims: ObservationDimensions,
    *,
    extra: str = "",
) -> str:
    """Serialize typed dimensions back to the notes convention used in curated CSV."""
    pieces: list[str] = []
    if dims.fuel:
        pieces.append(f"fuel={dims.fuel}")
    if dims.water_company:
        pieces.append(f"company={dims.water_company}")
    if dims.water_company_name:
        pieces.append(f"company_name={dims.water_company_name}")
    if dims.demographic:
        if dims.demographic.lower() in {"male", "female", "persons", "all"}:
            pieces.append(f"sex={dims.demographic}")
        else:
            pieces.append(f"demographic={dims.demographic}")
    if dims.series:
        pieces.append(f"series={dims.series}")
    if dims.category:
        pieces.append(f"band={dims.category}")
    if extra.strip():
        pieces.append(extra.strip())
    return "; ".join(pieces)


def merge_row_dimensions(row: dict[str, object]) -> ObservationDimensions:
    """Prefer explicit dim_* columns on a row; fall back to parsing notes."""
    nested = row.get("dimensions")
    nested_map = nested if isinstance(nested, dict) else {}
    explicit = ObservationDimensions(
        fuel=str(
            row.get("dim_fuel") or nested_map.get("fuel") or row.get("fuel") or ""
        ),
        water_company=str(
            row.get("dim_water_company")
            or nested_map.get("water_company")
            or row.get("water_company")
            or ""
        ),
        water_company_name=str(
            row.get("dim_water_company_name")
            or nested_map.get("water_company_name")
            or row.get("water_company_name")
            or ""
        ),
        demographic=str(
            row.get("dim_demographic")
            or nested_map.get("demographic")
            or row.get("demographic")
            or ""
        ),
        series=str(
            row.get("dim_series") or nested_map.get("series") or row.get("series") or ""
        ),
        category=str(
            row.get("dim_category")
            or nested_map.get("category")
            or row.get("category")
            or ""
        ),
    )
    if not explicit.is_empty():
        parsed = dimensions_from_notes(str(row.get("notes") or ""))
        return ObservationDimensions(
            fuel=explicit.fuel or parsed.fuel,
            water_company=explicit.water_company or parsed.water_company,
            water_company_name=explicit.water_company_name or parsed.water_company_name,
            demographic=explicit.demographic or parsed.demographic,
            series=explicit.series or parsed.series,
            category=explicit.category or parsed.category,
        )
    return dimensions_from_notes(str(row.get("notes") or ""))


def dimensions_to_db_fields(dims: ObservationDimensions) -> dict[str, str]:
    payload = asdict(dims)
    return {
        "dim_fuel": payload["fuel"],
        "dim_water_company": payload["water_company"],
        "dim_water_company_name": payload["water_company_name"],
        "dim_demographic": payload["demographic"],
        "dim_series": payload["series"],
        "dim_category": payload["category"],
    }
