"""Indicator manifest schema shared by all sector agents.

YAML on disk keeps the hand-off human-readable (Notion contract).
Beginner note: dataclasses + PyYAML is enough; add Pydantic later if needed.
https://docs.python.org/3/library/dataclasses.html
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

import yaml

Sector = Literal[
    "energy-industry",
    "economy-public-finance",
    "housing-land",
    "people-society",
    "government-politics",
    "infrastructure",
    "regions-places",
    "history-change",
]

Frequency = Literal[
    "annual",
    "quarterly",
    "monthly",
    "weekly",
    "daily",
    "ad_hoc",
]


@dataclass(slots=True)
class RawEvidence:
    """One archived raw download or API response."""

    path: str  # relative to sector data root, e.g. raw/2026-11-03/file.xlsx
    retrieved_at: str  # ISO 8601 datetime
    checksum_sha256: str
    content_type: str = ""
    official_release_date: str = ""  # ISO date if known
    http_status: int | None = None
    source_url: str = ""


@dataclass(slots=True)
class Manifest:
    """Canonical metadata for one registry indicator."""

    indicator_id: str  # stable kebab id, e.g. electricity-generation-by-source
    title: str
    sector: Sector
    publisher: str
    source_url: str
    series_id: str
    geography: str  # human label + note UK vs GB vs England
    frequency: Frequency
    unit: str
    definition: str
    licence: str
    agent_owner: Literal["energy", "economy", "validation", "orchestrator"]
    connector_module: str  # e.g. energy.connectors.electricity_generation
    curated_path: str  # relative path to curated CSV
    update_cadence: str
    raw_evidence: list[RawEvidence] = field(default_factory=list)
    transformations: str = ""
    revision_notes: str = ""
    caveats: str = ""
    related_indicator_ids: list[str] = field(default_factory=list)
    open_questions: list[str] = field(default_factory=list)
    notion_registry_url: str = ""
    schema_version: str = "1.0"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Manifest:
        raw = data.get("raw_evidence") or []
        evidence = [RawEvidence(**item) for item in raw]
        payload = {**data, "raw_evidence": evidence}
        known = {f.name for f in cls.__dataclass_fields__.values()}  # type: ignore[attr-defined]
        filtered = {key: value for key, value in payload.items() if key in known}
        return cls(**filtered)


def save_manifest(path: Path, manifest: Manifest) -> Path:
    """Write manifest.yaml (UTF-8). Never overwrite without caller intent."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(
            manifest.to_dict(),
            handle,
            sort_keys=False,
            allow_unicode=True,
            default_flow_style=False,
        )
    return path


def load_manifest(path: Path) -> Manifest:
    """Load and validate required keys via dataclass construction."""
    with path.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Manifest must be a mapping: {path}")
    required = (
        "indicator_id",
        "title",
        "sector",
        "publisher",
        "source_url",
        "series_id",
        "geography",
        "frequency",
        "unit",
        "definition",
        "licence",
        "agent_owner",
        "connector_module",
        "curated_path",
        "update_cadence",
    )
    missing = [key for key in required if not data.get(key) and data.get(key) != 0]
    if missing:
        raise ValueError(f"Manifest missing required fields {missing}: {path}")
    return Manifest.from_dict(data)
