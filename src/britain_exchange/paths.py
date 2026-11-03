"""Repo path helpers so sector scripts do not hard-code absolute paths."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = REPO_ROOT / "data"
ENERGY_DATA = DATA_ROOT / "energy"
ECONOMY_DATA = DATA_ROOT / "economy"
HOUSING_DATA = DATA_ROOT / "housing"
PEOPLE_DATA = DATA_ROOT / "people"
GOVERNMENT_DATA = DATA_ROOT / "government"
INFRASTRUCTURE_DATA = DATA_ROOT / "infrastructure"
REGIONS_DATA = DATA_ROOT / "regions"
HISTORY_DATA = DATA_ROOT / "history"
QA_DATA = DATA_ROOT / "qa"
