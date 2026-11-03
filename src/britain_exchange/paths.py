"""Repo path helpers so sector scripts do not hard-code absolute paths."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = REPO_ROOT / "data"
ENERGY_DATA = DATA_ROOT / "energy"
ECONOMY_DATA = DATA_ROOT / "economy"
QA_DATA = DATA_ROOT / "qa"
