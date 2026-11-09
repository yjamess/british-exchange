"""Curated CSV reads stay correct when the catalog cache is warm."""

from pathlib import Path

from britain_exchange.catalog import get_package, read_observations

MANIFEST = """
indicator_id: {indicator_id}
title: Cache demo
sector: housing-land
publisher: Test
source_url: https://example.com/cache
series_id: CACHE
geography: England
frequency: annual
unit: count
definition: Fixture for the observation cache.
licence: Open Government Licence v3.0
agent_owner: housing
connector_module: housing.connectors.cache_demo
curated_path: curated/observations.csv
update_cadence: annual
"""

HEADER = "indicator_id,period_start,period_end,geography_code,geography_label,value,unit,observation_status,source_version,notes"


def _write_package(root: Path, indicator_id: str, rows: list[str]) -> None:
    package = root / "housing" / indicator_id
    (package / "curated").mkdir(parents=True)
    (package / "manifest.yaml").write_text(MANIFEST.format(indicator_id=indicator_id), encoding="utf-8")
    body = "\n".join([HEADER, *rows]) + "\n"
    (package / "curated" / "observations.csv").write_text(body, encoding="utf-8")


def test_geography_filter_and_cache_invalidation(tmp_path: Path) -> None:
    _write_package(
        tmp_path,
        "cache-demo",
        [
            "cache-demo,2020-01-01,2020-12-31,E92000001,England,1,count,final,v1,series=total",
            "cache-demo,2020-01-01,2020-12-31,E12000007,London,2,count,final,v1,series=total",
        ],
    )
    package = get_package("cache-demo", tmp_path)
    england = read_observations(package, geography_code="E92000001")
    assert [row["geography_code"] for row in england] == ["E92000001"]

    # Same file bytes: the second call is the cached list, still just England.
    again = read_observations(package, geography_code="E92000001")
    assert again == england

    csv_path = package.curated_csv
    csv_path.write_text(
        "\n".join(
            [
                HEADER,
                "cache-demo,2020-01-01,2020-12-31,E92000001,England,1,count,final,v1,series=total",
                "cache-demo,2021-01-01,2021-12-31,E92000001,England,3,count,final,v1,series=total",
                "cache-demo,2020-01-01,2020-12-31,E12000007,London,2,count,final,v1,series=total",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    updated = read_observations(package, geography_code="E92000001")
    assert [row["period_start"] for row in updated] == ["2020-01-01", "2021-01-01"]


def test_series_filter_uses_notes(tmp_path: Path) -> None:
    _write_package(
        tmp_path,
        "cache-series",
        [
            "cache-series,2020-01-01,2020-12-31,E92000001,England,1,count,final,v1,series=households-total",
            "cache-series,2020-01-01,2020-12-31,E92000001,England,9,count,final,v1,series=households-per-thousand",
        ],
    )
    package = get_package("cache-series", tmp_path)
    rows = read_observations(package, geography_code="E92000001", series="households-total")
    assert [row["value"] for row in rows] == ["1"]
