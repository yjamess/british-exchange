"""PostgreSQL load must preserve prior observation releases."""

from __future__ import annotations

from pathlib import Path

import pytest

from britain_exchange.db import apply_migrations, connect, database_url

pytestmark = pytest.mark.skipif(
    not database_url(),
    reason="DATABASE_URL not set — skipping Postgres revision tests",
)

INDICATOR = "bx-revision-fixture"


def _cleanup(conn) -> None:
    conn.execute("DELETE FROM observation WHERE indicator_id = %s", (INDICATOR,))
    conn.execute("DELETE FROM data_release WHERE indicator_id = %s", (INDICATOR,))
    conn.execute("DELETE FROM indicator WHERE indicator_id = %s", (INDICATOR,))
    conn.commit()


def test_refresh_preserves_prior_release_observations(tmp_path: Path) -> None:
    from britain_exchange.catalog import IndicatorPackage
    from britain_exchange.load_ready import (
        replace_release_observations,
        upsert_indicator,
        upsert_release,
    )
    from britain_exchange.manifest import Manifest, RawEvidence

    def write_package(
        root: Path, *, version: str, checksum: str, value: float
    ) -> IndicatorPackage:
        curated = root / "curated"
        curated.mkdir(parents=True, exist_ok=True)
        csv_path = curated / "observations.csv"
        csv_path.write_text(
            "indicator_id,period_start,period_end,geography_code,geography_label,"
            "value,unit,observation_status,source_version,notes\n"
            f"{INDICATOR},2020-01-01,2020-03-31,K02000001,United Kingdom,"
            f"{value},index,final,{version},fuel=Gas\n",
            encoding="utf-8",
        )
        raw = root / "raw" / "file.bin"
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_bytes(version.encode())
        manifest = Manifest(
            indicator_id=INDICATOR,
            title="Revision fixture",
            sector="energy-industry",
            publisher="test",
            source_url="https://example.test",
            series_id="FIXTURE",
            geography="UK",
            frequency="quarterly",
            unit="index",
            definition="fixture",
            licence="OGL",
            agent_owner="orchestrator",
            connector_module="tests.fixture",
            curated_path="curated/observations.csv",
            update_cadence="test",
            raw_evidence=[
                RawEvidence(
                    path=str(raw.relative_to(root)),
                    retrieved_at="2026-11-03T00:00:00+00:00",
                    checksum_sha256=checksum,
                    content_type="application/octet-stream",
                    official_release_date="2026-11-01",
                    http_status=200,
                    source_url="https://example.test",
                )
            ],
        )
        return IndicatorPackage(sector_dir="test", root=root, manifest=manifest)

    with connect() as conn:
        apply_migrations(conn)
        _cleanup(conn)

        first = write_package(
            tmp_path / "r1", version="v1", checksum="aaa", value=100.0
        )
        upsert_indicator(conn, first.manifest)
        release_1 = upsert_release(conn, first)
        n1 = replace_release_observations(conn, first, release_1)
        conn.commit()
        assert n1 == 1

        second = write_package(
            tmp_path / "r2", version="v2", checksum="bbb", value=111.0
        )
        # Force second package to reuse same indicator id/path layout for loader.
        second = write_package(
            tmp_path / "r2", version="v2", checksum="bbb", value=111.0
        )
        upsert_indicator(conn, second.manifest)
        release_2 = upsert_release(conn, second)
        n2 = replace_release_observations(conn, second, release_2)
        conn.commit()
        assert n2 == 1
        assert release_2 != release_1

        counts = conn.execute(
            """
            SELECT release_id, COUNT(*)::int AS n, MAX(value) AS max_value
            FROM observation
            WHERE indicator_id = %s
            GROUP BY release_id
            ORDER BY release_id
            """,
            (INDICATOR,),
        ).fetchall()
        assert len(counts) == 2
        assert counts[0]["release_id"] == release_1
        assert counts[0]["n"] == 1
        assert float(counts[0]["max_value"]) == 100.0
        assert counts[1]["release_id"] == release_2
        assert float(counts[1]["max_value"]) == 111.0

        current = conn.execute(
            """
            SELECT release_id, is_current FROM data_release
            WHERE indicator_id = %s ORDER BY release_id
            """,
            (INDICATOR,),
        ).fetchall()
        assert current[0]["is_current"] is False
        assert current[1]["is_current"] is True

        # Reloading the same checksum must not create a third release or wipe history.
        again = write_package(
            tmp_path / "r2b", version="v2", checksum="bbb", value=111.0
        )
        release_again = upsert_release(conn, again)
        replace_release_observations(conn, again, release_again)
        conn.commit()
        assert release_again == release_2
        total_releases = conn.execute(
            "SELECT COUNT(*)::int AS n FROM data_release WHERE indicator_id = %s",
            (INDICATOR,),
        ).fetchone()
        assert total_releases["n"] == 2
        total_obs = conn.execute(
            "SELECT COUNT(*)::int AS n FROM observation WHERE indicator_id = %s",
            (INDICATOR,),
        ).fetchone()
        assert total_obs["n"] == 2

        # Typed fuel dimension populated on insert.
        dim = conn.execute(
            """
            SELECT dim_fuel FROM observation
            WHERE indicator_id = %s AND release_id = %s
            """,
            (INDICATOR, release_2),
        ).fetchone()
        assert dim["dim_fuel"] == "Gas"

        _cleanup(conn)
