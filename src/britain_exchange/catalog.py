"""Discover Ready indicator hand-offs under data/."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from britain_exchange.dimensions import merge_row_dimensions
from britain_exchange.manifest import Manifest, load_manifest
from britain_exchange.paths import DATA_ROOT

# Full parsed tables above this size are not kept in memory (rents, EPC).
# A filtered read of those files caches only the matching rows.
_FULL_CACHE_MAX_BYTES = 12_000_000


SECTOR_DIRS: tuple[str, ...] = (
    "energy",
    "economy",
    "housing",
    "people",
    "government",
    "infrastructure",
    "regions",
    "history",
)


@dataclass(slots=True, frozen=True)
class IndicatorPackage:
    """On-disk package for one registry indicator."""

    sector_dir: str
    root: Path
    manifest: Manifest

    @property
    def curated_csv(self) -> Path:
        return self.root / self.manifest.curated_path


def _manifest_stamp(root: Path) -> tuple[tuple[str, int, int], ...]:
    """Cheap fingerprint of every manifest: path, mtime, size.

    Directory mtime does not change when a file's contents change, so the
    stamp stats each manifest.yaml. Parsing YAML happens only when this changes.
    """
    items: list[tuple[str, int, int]] = []
    for sector in SECTOR_DIRS:
        sector_path = root / sector
        if not sector_path.is_dir():
            continue
        for child in sorted(sector_path.iterdir()):
            manifest_path = child / "manifest.yaml"
            if not manifest_path.is_file():
                continue
            stat = manifest_path.stat()
            items.append((str(manifest_path), stat.st_mtime_ns, stat.st_size))
    return tuple(items)


def _scan_packages(root: Path) -> list[IndicatorPackage]:
    found: list[IndicatorPackage] = []
    for sector in SECTOR_DIRS:
        sector_path = root / sector
        if not sector_path.is_dir():
            continue
        for child in sorted(sector_path.iterdir()):
            manifest_path = child / "manifest.yaml"
            if not manifest_path.is_file():
                continue
            manifest = load_manifest(manifest_path)
            curated = child / manifest.curated_path
            if not curated.is_file():
                continue
            found.append(IndicatorPackage(sector_dir=sector, root=child, manifest=manifest))
    return found


# root → (manifest stamp, packages). One API request used to re-read every YAML.
_PACKAGE_CACHE: dict[Path, tuple[tuple[tuple[str, int, int], ...], list[IndicatorPackage]]] = {}


def iter_indicator_packages(data_root: Path | None = None) -> list[IndicatorPackage]:
    """Return packages that have both manifest.yaml and curated CSV."""
    root = (data_root or DATA_ROOT).resolve()
    stamp = _manifest_stamp(root)
    hit = _PACKAGE_CACHE.get(root)
    if hit is not None and hit[0] == stamp:
        return list(hit[1])
    found = _scan_packages(root)
    _PACKAGE_CACHE[root] = (stamp, found)
    return list(found)


def get_package(indicator_id: str, data_root: Path | None = None) -> IndicatorPackage:
    for package in iter_indicator_packages(data_root):
        if package.manifest.indicator_id == indicator_id:
            return package
    raise KeyError(indicator_id)


@dataclass(slots=True, frozen=True)
class _RowFilter:
    """Column filters applied while reading, before rows are copied for the API."""

    geography_code: str | None = None
    fuel: str | None = None
    water_company: str | None = None
    demographic: str | None = None
    series: str | None = None
    category: str | None = None

    def active(self) -> bool:
        return any(
            value is not None
            for value in (
                self.geography_code,
                self.fuel,
                self.water_company,
                self.demographic,
                self.series,
                self.category,
            )
        )

    def needs_dimensions(self) -> bool:
        return any(
            value is not None
            for value in (self.fuel, self.water_company, self.demographic, self.series, self.category)
        )


def _keep_row(row: dict[str, str], filt: _RowFilter) -> bool:
    """Same comparisons the API applies after building dimensions."""
    if filt.geography_code is not None and row.get("geography_code") != filt.geography_code:
        return False
    if not filt.needs_dimensions():
        return True
    dims = merge_row_dimensions(row)
    if filt.fuel is not None and dims.fuel != filt.fuel:
        return False
    if filt.water_company is not None and dims.water_company != filt.water_company:
        return False
    if filt.demographic is not None and dims.demographic != filt.demographic:
        return False
    if filt.series is not None and dims.series != filt.series:
        return False
    if filt.category is not None and dims.category != filt.category:
        return False
    return True


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _stream_matching(path: Path, filt: _RowFilter) -> list[dict[str, str]]:
    """Read a large CSV once, keeping only rows that match.

    Geography is a real column, so a UK-only request does not build a dict
    for every local authority. Dimension filters (series, fuel, …) are parsed
    only for rows that already passed the geography check.
    """
    kept: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if _keep_row(row, filt):
                kept.append(row)
    return kept


# (path, filter) → ((mtime_ns, size), rows). Callers must not mutate the lists.
_OBS_CACHE: dict[tuple[str, _RowFilter], tuple[tuple[int, int], list[dict[str, str]]]] = {}


def _cached_rows(path: Path, filt: _RowFilter, file_key: tuple[int, int]) -> list[dict[str, str]] | None:
    hit = _OBS_CACHE.get((str(path), filt))
    if hit is not None and hit[0] == file_key:
        return hit[1]
    return None


def _store_rows(path: Path, filt: _RowFilter, file_key: tuple[int, int], rows: list[dict[str, str]]) -> None:
    _OBS_CACHE[(str(path), filt)] = (file_key, rows)


def read_observations(
    package: IndicatorPackage,
    *,
    geography_code: str | None = None,
    fuel: str | None = None,
    water_company: str | None = None,
    demographic: str | None = None,
    series: str | None = None,
    category: str | None = None,
) -> list[dict[str, str]]:
    """Read curated rows, using a cache keyed by file mtime and size.

    Small files are parsed once and reused. Large files are filtered while
    reading so a single geography is not a full-table copy. A changed CSV
    misses the cache because mtime or size differs.
    https://docs.python.org/3/library/csv.html
    """
    filt = _RowFilter(
        geography_code=geography_code,
        fuel=fuel,
        water_company=water_company,
        demographic=demographic,
        series=series,
        category=category,
    )
    path = package.curated_csv
    stat = path.stat()
    file_key = (stat.st_mtime_ns, stat.st_size)
    cached = _cached_rows(path, filt, file_key)
    if cached is not None:
        return cached

    if stat.st_size <= _FULL_CACHE_MAX_BYTES:
        full = _RowFilter()
        all_rows = _cached_rows(path, full, file_key)
        if all_rows is None:
            all_rows = _read_csv(path)
            _store_rows(path, full, file_key, all_rows)
        rows = all_rows if not filt.active() else [row for row in all_rows if _keep_row(row, filt)]
        _store_rows(path, filt, file_key, rows)
        return rows

    # Large file: keep the filtered slice only. The full table stays on disk.
    rows = _stream_matching(path, filt)
    if filt.active():
        _store_rows(path, filt, file_key, rows)
    return rows


@dataclass(slots=True, frozen=True)
class Coverage:
    """Span and size of a curated series, for catalogue listings."""

    start: str  # earliest period_start (ISO date), "" if no rows
    end: str  # latest period_end (ISO date), "" if no rows
    count: int


_COVERAGE_CACHE: dict[Path, tuple[tuple[float, int], Coverage]] = {}


def coverage(package: IndicatorPackage) -> Coverage:
    """First/last period and row count of the curated CSV.

    Scans only the period columns and caches by file mtime and size, so the
    large curated files (rents, EPC) are read once per change, not per request.
    """
    path = package.curated_csv
    stat = path.stat()
    key = (stat.st_mtime, stat.st_size)
    hit = _COVERAGE_CACHE.get(path)
    if hit and hit[0] == key:
        return hit[1]
    start, end, count = "", "", 0
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader, [])
        i_start = header.index("period_start") if "period_start" in header else -1
        i_end = header.index("period_end") if "period_end" in header else i_start
        for row in reader:
            if not row:
                continue
            count += 1
            if i_start < 0:
                continue
            s = row[i_start]
            e = row[i_end] if i_end < len(row) else s
            if s and (not start or s < start):
                start = s
            if e and e > end:
                end = e
    result = Coverage(start=start, end=end, count=count)
    _COVERAGE_CACHE[path] = (key, result)
    return result
