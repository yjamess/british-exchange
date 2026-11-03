"""Discover Ready indicator hand-offs under data/{energy,economy}/."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from britain_exchange.manifest import Manifest, load_manifest
from britain_exchange.paths import DATA_ROOT


SECTOR_DIRS: tuple[str, ...] = ("energy", "economy")


@dataclass(slots=True, frozen=True)
class IndicatorPackage:
    """On-disk package for one registry indicator."""

    sector_dir: str
    root: Path
    manifest: Manifest

    @property
    def curated_csv(self) -> Path:
        return self.root / self.manifest.curated_path


def iter_indicator_packages(data_root: Path | None = None) -> list[IndicatorPackage]:
    """Return packages that have both manifest.yaml and curated CSV."""
    root = data_root or DATA_ROOT
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
            found.append(
                IndicatorPackage(sector_dir=sector, root=child, manifest=manifest)
            )
    return found


def get_package(indicator_id: str, data_root: Path | None = None) -> IndicatorPackage:
    for package in iter_indicator_packages(data_root):
        if package.manifest.indicator_id == indicator_id:
            return package
    raise KeyError(indicator_id)


def read_observations(package: IndicatorPackage) -> list[dict[str, str]]:
    with package.curated_csv.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))
