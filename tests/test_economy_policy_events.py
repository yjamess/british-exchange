"""Economy policy register matches the shared policy-event shape, with its evidence record."""

import copy
import json
from datetime import date
from pathlib import Path

import pytest

from britain_exchange.policy_event import load_policy_registry

ROOT = Path(__file__).resolve().parents[1]
EVENTS = ROOT / "data" / "economy" / "economic-policy" / "events.json"
PLEDGES = ROOT / "data" / "economy" / "economic-policy" / "pledges.json"

ANCHORS = {
    "bank-of-england-act-1946": date(1946, 2, 14),
    "bank-of-england-act-1998": date(1998, 4, 23),
    "national-minimum-wage-act-1998": date(1998, 7, 31),
    "financial-services-and-markets-act-2000": date(2000, 6, 14),
    "pensions-act-2008": date(2008, 11, 26),
    "fiscal-responsibility-act-2010": date(2010, 2, 10),
    "budget-responsibility-and-national-audit-act-2011": date(2011, 3, 22),
    "welfare-reform-act-2012": date(2012, 3, 8),
    "financial-services-act-2012": date(2012, 12, 19),
    "european-union-future-relationship-act-2020": date(2020, 12, 31),
}


def _raw() -> dict:
    return json.loads(EVENTS.read_text(encoding="utf-8"))


def _load_variant(tmp_path: Path, raw: dict):
    path = tmp_path / "events.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    return load_policy_registry(path)


def _event(raw: dict, event_id: str) -> dict:
    return next(e for e in raw["events"] if e["id"] == event_id)


def test_seed_loads_with_assent_dates_and_policy_areas() -> None:
    registry = load_policy_registry(EVENTS)
    by_id = {event.id: event for event in registry.events}
    assert registry.registry_id == "economy-policy-events"
    assert set(ANCHORS) <= set(by_id)
    for event_id, assent in ANCHORS.items():
        assert by_id[event_id].type == "act"
        assert by_id[event_id].enactment_date == assent
    assert all(event.policy_area is not None for event in registry.events)


def test_bank_of_england_1998_dates_stay_apart() -> None:
    registry = load_policy_registry(EVENTS)
    act = next(e for e in registry.events if e.id == "bank-of-england-act-1998")
    assert act.announcement_date == date(1997, 5, 6)
    assert act.enactment_date == date(1998, 4, 23)
    assert act.commencements[0].when == date(1998, 6, 1)
    assert "1998/1120" in act.commencements[0].instrument
    assert act.dossier is not None
    assert "price stability" in act.dossier.objectives


def test_obr_and_charter_are_not_acts() -> None:
    registry = load_policy_registry(EVENTS)
    by_id = {event.id: event for event in registry.events}
    obr = by_id["office-for-budget-responsibility"]
    assert obr.type == "institution"
    assert obr.enactment_date is None
    assert obr.start_date == date(2011, 4, 4)
    charter = by_id["charter-for-budget-responsibility-autumn-2025"]
    assert charter.type == "programme"
    assert charter.dossier is not None
    assert any("current budget" in m.value for m in charter.dossier.measures)
    furlough = by_id["coronavirus-job-retention-scheme"]
    assert furlough.announcement_date == date(2020, 3, 20)
    assert furlough.start_date == date(2020, 4, 20)
    assert furlough.end_date == date(2021, 9, 30)


def test_repeal_is_recorded_as_a_date_and_a_relationship() -> None:
    registry = load_policy_registry(EVENTS)
    fra = next(e for e in registry.events if e.id == "fiscal-responsibility-act-2010")
    assert fra.status == "repealed"
    assert fra.repealed_date == date(2011, 3, 23)
    edge = next(r for r in registry.relationships if r.kind == "repealed")
    assert (edge.from_id, edge.to_id) == ("budget-responsibility-and-national-audit-act-2011", "fiscal-responsibility-act-2010")
    assert edge.when == date(2011, 3, 23)


def test_related_records_resolve_within_this_register() -> None:
    registry = load_policy_registry(EVENTS)
    ids = {event.id for event in registry.events}
    for event in registry.events:
        if event.dossier is None:
            continue
        for ref in event.dossier.related:
            if ref.registry == "economy":
                assert ref.event_id in ids, f"{event.id} points at unknown {ref.event_id}"


def test_linked_indicators_point_at_pinned_economy_series() -> None:
    registry = load_policy_registry(EVENTS)
    for event in registry.events:
        for link in event.linked_indicators:
            assert (ROOT / "data" / "economy" / link.indicator_id / "manifest.yaml").is_file(), link.indicator_id
            assert link.relationship == "context"


def test_pledges_are_listed_not_scored() -> None:
    raw = json.loads(PLEDGES.read_text(encoding="utf-8"))
    assert raw["registry_id"] == "economy-pledges"
    event_ids = {e["id"] for e in _raw()["events"]}
    for pledge in raw["pledges"]:
        assert pledge["scorable"] is False
        assert pledge["not_scored_reason"]
        assert set(pledge["linked_event_ids"]) <= event_ids


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda raw: _event(raw, "bank-of-england-act-1998").update(policy_area="housing"), "policy_area"),
        (lambda raw: _event(raw, "bank-of-england-act-1998").update(repealed_date="2001-01-01"), "repealed_date needs status"),
        (lambda raw: _event(raw, "fiscal-responsibility-act-2010").update(repealed_date="2009-01-01"), "before the mark date"),
        (lambda raw: _event(raw, "office-for-budget-responsibility").update(repealed_date="2012-01-01"), "acts and instruments only"),
        (lambda raw: _event(raw, "bank-of-england-act-1998")["dossier"].pop("objectives"), "objectives"),
        (lambda raw: _event(raw, "bank-of-england-act-1998")["dossier"]["related"].append({"registry": "people", "id": "x", "note": "n"}), "related registry"),
        (lambda raw: _event(raw, "bank-of-england-act-1998")["dossier"]["evaluations"].append({"label": "x", "url": "http://x", "publisher": "p", "finding": "f"}), "https"),
    ],
)
def test_loader_rejects_bad_evidence_records(tmp_path: Path, mutate, message: str) -> None:
    raw = copy.deepcopy(_raw())
    mutate(raw)
    with pytest.raises(ValueError, match=message):
        _load_variant(tmp_path, raw)
