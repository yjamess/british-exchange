"""Pledge and archive files match the shared policy-record shape."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from britain_exchange.catalog import iter_indicator_packages
from britain_exchange.manifest import load_manifest
from britain_exchange.policy_record import event_ids_from_file, load_archive, load_pledges

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "data" / "housing" / "policy-events"
PLEDGES = FOLDER / "pledges.json"
ARCHIVE = FOLDER / "archive.json"
EVENTS = FOLDER / "events.json"


@pytest.fixture(scope="module")
def event_ids() -> set[str]:
    return event_ids_from_file(EVENTS)


@pytest.fixture(scope="module")
def indicator_ids() -> set[str]:
    # Archived indicators keep only manifest.yaml on disk (data lives in Supabase), so read manifests,
    # not packages with a local curated CSV.
    ids = {p.manifest.indicator_id for p in iter_indicator_packages()}
    for path in (ROOT / "data").glob("*/*/manifest.yaml"):
        ids.add(load_manifest(path).indicator_id)
    return ids


def test_pledges_load_with_existing_event_ids(event_ids: set[str], indicator_ids: set[str]) -> None:
    registry = load_pledges(PLEDGES, event_ids)
    assert registry.registry_id == "housing-pledges"
    assert 6 <= len(registry.pledges) <= 10
    for pledge in registry.pledges:
        assert pledge.scorable == (pledge.match is not None)
        if not pledge.scorable:
            assert pledge.not_scored_reason
        else:
            assert pledge.match is not None
            assert pledge.match.indicator_id in indicator_ids
            assert pledge.match.geography_code == pledge.target.geography_code
            assert pledge.match.unit == pledge.target.unit
        assert set(pledge.context_indicator_ids) <= indicator_ids


def test_pledge_file_never_stores_delivered_values() -> None:
    text = PLEDGES.read_text(encoding="utf-8")
    assert '"delivered' not in text and '"outturn' not in text


def test_archive_loads_with_rights_rule(event_ids: set[str]) -> None:
    registry = load_archive(ARCHIVE, event_ids)
    assert registry.registry_id == "housing-archive"
    assert 15 <= len(registry.items) <= 25
    holders = {item.holder for item in registry.items}
    assert {"Imperial War Museums", "London Archives", "The National Archives"} <= holders
    for item in registry.items:
        if item.rights.can_reproduce:
            assert item.rights.status in {"public-domain", "ogl", "cc-by"}
        if item.holder == "Imperial War Museums":
            assert item.rights.status == "non-commercial" and not item.rights.can_reproduce


def _write(tmp_path: Path, name: str, data: dict) -> Path:
    path = tmp_path / name
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def _first_pledge_doc() -> dict:
    raw = json.loads(PLEDGES.read_text(encoding="utf-8"))
    raw["pledges"] = [copy.deepcopy(raw["pledges"][0])]
    return raw


def test_scorable_requires_matching_geography_unit_and_period(tmp_path: Path) -> None:
    doc = _first_pledge_doc()
    pledge = doc["pledges"][0]
    pledge.update(scorable=True, not_scored_reason=None)
    pledge["target"].update(
        geography_code="E92000001", unit="dwellings", period_start="2020-04-01", period_end="2021-03-31"
    )
    good = {
        "indicator_id": "net-additional-dwellings",
        "series": "net-additions",
        "geography_code": "E92000001",
        "unit": "dwellings",
        "aggregation": "sum",
    }
    pledge["match"] = dict(good)
    load_pledges(_write(tmp_path, "ok.json", doc))

    pledge["match"] = dict(good, geography_code="K02000001")
    with pytest.raises(ValueError, match="geography"):
        load_pledges(_write(tmp_path, "geo.json", doc))

    pledge["match"] = dict(good, unit="dwellings-per-year")
    with pytest.raises(ValueError, match="unit"):
        load_pledges(_write(tmp_path, "unit.json", doc))

    pledge["match"] = dict(good)
    pledge["target"]["period_end"] = None
    with pytest.raises(ValueError, match="period"):
        load_pledges(_write(tmp_path, "period.json", doc))

    pledge["match"] = None
    with pytest.raises(ValueError, match="needs a match"):
        load_pledges(_write(tmp_path, "nomatch.json", doc))

    pledge["target"]["period_end"] = "2021-03-31"
    pledge["match"] = dict(good, dimensions={"category": "ahp-2021-26"})
    registry = load_pledges(_write(tmp_path, "dims.json", doc))
    assert registry.pledges[0].match.dimensions == (("category", "ahp-2021-26"),)

    pledge["match"] = dict(good, dimensions={"tenure": "social-rent"})
    with pytest.raises(ValueError, match="unknown keys"):
        load_pledges(_write(tmp_path, "dimkey.json", doc))


def test_unscored_needs_reason_and_short_quotation(tmp_path: Path) -> None:
    doc = _first_pledge_doc()
    pledge = doc["pledges"][0]
    pledge.update(scorable=False, match=None, not_scored_reason=None)  # the first pledge may be scored
    with pytest.raises(ValueError, match="not_scored_reason"):
        load_pledges(_write(tmp_path, "reason.json", doc))

    doc = _first_pledge_doc()
    doc["pledges"][0]["statement"] = '"' + " ".join(["word"] * 26) + '"'
    with pytest.raises(ValueError, match="words"):
        load_pledges(_write(tmp_path, "long.json", doc))

    doc = _first_pledge_doc()
    doc["pledges"][0]["sources"][0]["url"] = "http://example.org"
    with pytest.raises(ValueError, match="https"):
        load_pledges(_write(tmp_path, "http.json", doc))


def test_unknown_event_id_is_rejected(tmp_path: Path, event_ids: set[str]) -> None:
    doc = _first_pledge_doc()
    doc["pledges"][0]["linked_event_ids"] = ["no-such-act-1900"]
    with pytest.raises(ValueError, match="linked_event_ids"):
        load_pledges(_write(tmp_path, "event.json", doc), event_ids)


def test_archive_reproduce_only_for_open_licences(tmp_path: Path) -> None:
    raw = json.loads(ARCHIVE.read_text(encoding="utf-8"))
    item = copy.deepcopy(next(i for i in raw["items"] if i["holder"] == "Imperial War Museums"))
    item["rights"]["can_reproduce"] = True
    raw["items"] = [item]
    with pytest.raises(ValueError, match="can_reproduce"):
        load_archive(_write(tmp_path, "rights.json", raw))
