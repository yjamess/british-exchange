"""The housing policy register matches the shared policy-event shape."""

import copy
import json
import re
from datetime import date
from pathlib import Path

import pytest

from britain_exchange.policy_event import load_policy_registry

ROOT = Path(__file__).resolve().parents[1]
EVENTS = ROOT / "data" / "housing" / "policy-events" / "events.json"
MODEL = ROOT / "web" / "src" / "brand" / "housing" / "canvas" / "model.tsx"
ANCHORS = {
    "housing-town-planning-act-1919",
    "town-country-planning-act-1947",
    "housing-act-1980",
    "renters-rights-act-2025",
}


def _raw() -> dict:
    return json.loads(EVENTS.read_text(encoding="utf-8"))


def _load_variant(tmp_path: Path, raw: dict):
    path = tmp_path / "events.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    return load_policy_registry(path)


def _event(raw: dict, event_id: str) -> dict:
    return next(e for e in raw["events"] if e["id"] == event_id)


def test_anchor_assent_dates_and_blank_right_to_buy_commencement() -> None:
    registry = load_policy_registry(EVENTS)
    by_id = {event.id: event for event in registry.events}
    assert registry.retrieved_at == date(2026, 11, 5)
    assert ANCHORS <= set(by_id)
    assert by_id["housing-town-planning-act-1919"].enactment_date == date(1919, 7, 31)
    assert by_id["town-country-planning-act-1947"].enactment_date == date(1947, 8, 6)
    assert by_id["housing-act-1980"].enactment_date == date(1980, 8, 8)
    assert by_id["renters-rights-act-2025"].enactment_date == date(2025, 10, 27)

    right_to_buy = by_id["housing-act-1980"]
    assert right_to_buy.commencements[0].when is None
    assert "Part I" in right_to_buy.commencements[0].scope
    assert all(link.relationship == "context" for link in right_to_buy.linked_indicators)

    renters = by_id["renters-rights-act-2025"]
    assert renters.commencements[0].when == date(2026, 5, 1)
    assert "not social housing" in renters.commencements[0].scope
    assert all(event.announcement_date is None for event in registry.events)
    assert all(by_id[anchor].type == "act" for anchor in ANCHORS)


def test_spot_checked_dates() -> None:
    by_id = {event.id: event for event in load_policy_registry(EVENTS).events}
    # Royal Assent, read from the enacted text on legislation.gov.uk.
    assert by_id["public-health-act-1875"].enactment_date == date(1875, 8, 11)
    assert by_id["housing-working-classes-act-1890"].enactment_date == date(1890, 8, 18)
    assert by_id["housing-act-1930"].enactment_date == date(1930, 8, 1)
    assert by_id["new-towns-act-1946"].enactment_date == date(1946, 8, 1)
    assert by_id["housing-act-1985"].enactment_date == date(1985, 10, 30)
    assert by_id["housing-scotland-act-1987"].enactment_date == date(1987, 5, 15)
    assert by_id["homelessness-reduction-act-2017"].enactment_date == date(2017, 4, 27)
    assert by_id["building-safety-act-2022"].enactment_date == date(2022, 4, 28)
    # Statutory instruments: made date is the mark; coming into force is a commencement.
    hhsrs = by_id["hhsrs-england-regulations-2005"]
    assert hhsrs.enactment_date == date(2005, 11, 17)
    assert [c.when for c in hhsrs.commencements] == [date(2006, 4, 6)]
    # Commencements stated in the Act itself.
    assert [c.when for c in by_id["housing-act-1985"].commencements] == [date(1986, 4, 1)]
    homeless_1977 = by_id["housing-homeless-persons-act-1977"].commencements
    assert [c.when for c in homeless_1977] == [date(1977, 12, 1), date(1978, 4, 1)]
    assert by_id["renting-homes-wales-act-2016"].commencements[0].when == date(2022, 12, 1)
    # Institutions and programmes.
    assert by_id["housing-corporation"].start_date == date(1964, 7, 16)
    assert by_id["housing-corporation"].end_date == date(2009, 4, 1)
    assert by_id["homes-and-communities-agency"].start_date == date(2008, 9, 8)
    assert by_id["homes-england"].start_date == date(2018, 1, 11)
    assert by_id["regulator-of-social-housing"].start_date == date(2018, 10, 1)
    assert by_id["department-of-the-environment"].start_date == date(1970, 11, 12)
    assert by_id["help-to-buy-equity-loan"].start_date == date(2013, 4, 1)
    assert by_id["department-for-levelling-up-housing-and-communities"].end_date is None


def test_type_rules_and_mark_dates() -> None:
    registry = load_policy_registry(EVENTS)
    types = {event.type for event in registry.events}
    assert types == {"act", "statutory_instrument", "programme", "institution"}
    for event in registry.events:
        if event.type in {"act", "statutory_instrument"}:
            assert event.enactment_date is not None and event.start_date is None
            assert event.mark_date == event.enactment_date
            assert any(
                s.role == "primary" and ("legislation.gov.uk" in s.url or "parliament.uk" in s.url)
                for s in event.sources
            ), event.id
        else:
            assert event.enactment_date is None and event.start_date is not None
            assert event.date_note
            assert event.mark_date == event.start_date
            assert any(s.role in {"primary", "official"} for s in event.sources), event.id
        assert all(s.url.startswith("https://") for s in event.sources)
        assert event.nations and event.topics


def test_eras_cover_every_event_without_overlap() -> None:
    registry = load_policy_registry(EVENTS)
    assert [era.id for era in registry.eras] == [
        "before-1900",
        "1900-1939",
        "1940-1960",
        "1960-1979",
        "1980-1999",
        "2000-2019",
        "2020-present",
    ]
    assert registry.eras[0].from_year is None and registry.eras[-1].to_year is None
    counts = {era.id: 0 for era in registry.eras}
    for event in registry.events:
        counts[registry.era_for(event).id] += 1
    assert all(count >= 3 for count in counts.values()), counts
    nations = {nation for event in registry.events for nation in event.nations}
    assert nations == {"england", "wales", "scotland", "northern-ireland"}


def test_relationships_are_sourced_and_resolve() -> None:
    registry = load_policy_registry(EVENTS)
    ids = {event.id for event in registry.events}
    assert len(registry.relationships) >= 15
    for edge in registry.relationships:
        assert edge.from_id in ids and edge.to_id in ids
        assert edge.source.role in {"primary", "official"}
        assert edge.source.url.startswith("https://")
    edges = {(e.from_id, e.kind, e.to_id) for e in registry.relationships}
    assert ("housing-act-1964", "created", "housing-corporation") in edges
    assert ("homes-england", "succeeded", "homes-and-communities-agency") in edges
    assert ("department-of-the-environment", "succeeded", "ministry-of-housing-and-local-government") in edges


def test_linked_indicators_point_at_real_series_and_views() -> None:
    registry = load_policy_registry(EVENTS)
    model = MODEL.read_text(encoding="utf-8")
    views_block = model[model.index("export const VIEWS") :]
    for event in registry.events:
        for link in event.linked_indicators:
            assert link.relationship == "context"
            curated = [
                ROOT / "data" / sector / link.indicator_id / "curated" / "observations.csv"
                for sector in ("housing", "regions")
            ]
            assert any(path.exists() for path in curated), link.indicator_id
            domain = re.search(rf"\n\s+{re.escape(link.domain)}: \[(.*?)\]", views_block, re.S)
            assert domain, f"{event.id}: unknown domain {link.domain}"
            assert f'id: "{link.view}"' in domain.group(1), f"{event.id}: unknown view {link.view}"
            assert " not " in f" {link.note} ", f"{event.id}: a link note must say what the series is not"


@pytest.mark.parametrize(
    "mutate, message",
    [
        (lambda r: _event(r, "housing-act-1985").update(enactment_date=None), "enactment_date"),
        (lambda r: _event(r, "homes-england").update(enactment_date="2018-01-11"), "enactment_date null"),
        (lambda r: _event(r, "homes-england").update(start_date=None), "start_date is required"),
        (lambda r: _event(r, "homes-england").update(date_note=None), "date_note is required"),
        (lambda r: _event(r, "housing-act-1985").update(type="bill"), "type must be one of"),
        (lambda r: _event(r, "housing-act-1985").update(nations=["ireland"]), "nations"),
        (lambda r: _event(r, "housing-act-1985").update(topics=["roads"]), "topics"),
        (lambda r: _event(r, "housing-act-1985").update(sources=[
            {"label": "x", "url": "https://www.gov.uk/x", "role": "official"}]), "legislation.gov.uk"),
        (lambda r: r["relationships"].append(dict(r["relationships"][0], to="no-such-event")), "endpoints"),
        (lambda r: r["relationships"][0]["source"].update(role="explanatory_notes"), "primary or official"),
        (lambda r: r["eras"][2].update(to=1965), "overlap"),
        (lambda r: r["events"].append(copy.deepcopy(r["events"][0])), "repeated event id"),
    ],
)
def test_loader_rejects_bad_records(tmp_path: Path, mutate, message: str) -> None:
    raw = _raw()
    mutate(raw)
    with pytest.raises(ValueError, match=message):
        _load_variant(tmp_path, raw)
