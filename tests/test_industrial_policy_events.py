"""Energy industrial-policy register matches the shared policy-event shape."""

from datetime import date
from pathlib import Path

from britain_exchange.policy_event import load_policy_registry

EVENTS = Path(__file__).resolve().parents[1] / "data" / "energy" / "industrial-policy" / "events.json"

ANCHORS = {
    "electricity-act-1947": date(1947, 8, 13),
    "electricity-act-1989": date(1989, 7, 27),
    "utilities-act-2000": date(2000, 7, 28),
    "climate-change-act-2008": date(2008, 11, 26),
    "energy-act-2023": date(2023, 10, 26),
}


def test_industrial_policy_seed_loads_and_assent_dates() -> None:
    registry = load_policy_registry(EVENTS)
    by_id = {event.id: event for event in registry.events}
    assert registry.registry_id == "energy-industrial-policy-events"
    assert registry.retrieved_at == date(2026, 11, 7)
    assert set(ANCHORS) <= set(by_id)
    for event_id, assent in ANCHORS.items():
        assert by_id[event_id].type == "act"
        assert by_id[event_id].enactment_date == assent

    strategy = by_id["modern-industrial-strategy-2025"]
    assert strategy.type == "programme"
    assert strategy.enactment_date is None
    assert strategy.start_date == date(2025, 6, 23)
    assert strategy.date_note

    assert any(r.kind == "repealed" for r in registry.relationships)


def test_housing_register_still_loads_after_topic_extension() -> None:
    housing = Path(__file__).resolve().parents[1] / "data" / "housing" / "policy-events" / "events.json"
    registry = load_policy_registry(housing)
    assert len(registry.events) > 0
