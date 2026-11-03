"""Base connector interface for sector agents.

Subclass this in `src/energy` or `src/economy`. Keep `fetch` + `transform`
small and explicit so Validation can re-run them.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import httpx

from britain_exchange.checksum import sha256_bytes, sha256_file
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import Observation, write_observations_csv


@dataclass(slots=True)
class FetchResult:
    """Result of downloading one raw artefact."""

    path: Path
    evidence: RawEvidence


class Connector(ABC):
    """One connector owns one publisher source used by one or more indicators."""

    def __init__(self, data_root: Path, *, timeout_s: float = 60.0) -> None:
        self.data_root = data_root
        self.timeout_s = timeout_s

    @property
    @abstractmethod
    def indicator_id(self) -> str:
        """Canonical indicator id matching the Notion registry row."""

    @abstractmethod
    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        """Fill the shared manifest after raw files exist."""

    @abstractmethod
    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        """Turn raw files into curated observations."""

    def fetch_url(
        self,
        url: str,
        relative_raw_path: str,
        *,
        official_release_date: str = "",
    ) -> FetchResult:
        """Download a URL into data_root/raw/..., hash it, return evidence metadata."""
        target = self.data_root / relative_raw_path
        target.parent.mkdir(parents=True, exist_ok=True)

        with httpx.Client(timeout=self.timeout_s, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            payload = response.content
            content_type = response.headers.get("content-type", "")

        target.write_bytes(payload)
        checksum = sha256_bytes(payload)
        # Re-hash from disk so the manifest matches the archived file.
        disk_checksum = sha256_file(target)
        if disk_checksum != checksum:
            raise RuntimeError(f"Checksum mismatch writing {target}")

        evidence = RawEvidence(
            path=relative_raw_path,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            checksum_sha256=checksum,
            content_type=content_type,
            official_release_date=official_release_date,
            http_status=response.status_code,
            source_url=url,
        )
        return FetchResult(path=target, evidence=evidence)

    def write_hand_off(
        self,
        evidence: Sequence[RawEvidence],
        observations: Sequence[Observation],
        *,
        manifest_name: str = "manifest.yaml",
        curated_name: str = "curated/observations.csv",
    ) -> tuple[Path, Path]:
        """Write curated CSV + manifest.yaml under the sector data root."""
        curated_path = write_observations_csv(self.data_root / curated_name, observations)
        manifest = self.build_manifest(evidence)
        # Keep curated_path in sync with what we just wrote.
        manifest.curated_path = curated_name
        manifest.raw_evidence = list(evidence)
        manifest_path = save_manifest(self.data_root / manifest_name, manifest)
        return manifest_path, curated_path
