"""Shared policy and event records.

Housing Domain 10 is the first user. Economy and Government can reuse this
shape later. An event is not an Observation: it has no measured value.

Dates stay separate. Royal Assent is not commencement, a made date is not a
coming-into-force date, and a programme's opening is not its delivery.

Four kinds of record share one shape:

- ``act``: ``enactment_date`` is Royal Assent (required).
- ``statutory_instrument``: ``enactment_date`` is the made date (required);
  coming into force goes in ``commencements``.
- ``programme`` and ``institution``: ``enactment_date`` is null and
  ``start_date`` (required), ``end_date`` (nullable) and ``date_note`` say what
  the dates are.

The mark on a timeline is ``mark_date``: enactment for acts and instruments,
start for programmes and institutions.

https://docs.python.org/3/library/dataclasses.html
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

EventType = Literal["act", "statutory_instrument", "programme", "institution"]
EventStatus = Literal[
    "enacted_text_only",
    "amended",
    "partially_in_force",
    "in_force",
    "repealed",
    "active",
    "closed",
    "dissolved",
    "succeeded",
]
SourceRole = Literal["primary", "explanatory_notes", "official"]
LinkRelationship = Literal["context"]
Nation = Literal["england", "wales", "scotland", "northern-ireland"]
RelationshipKind = Literal[
    "created", "amended", "repealed", "replaced", "administered", "funded", "implemented", "succeeded"
]

_TYPES: frozenset[str] = frozenset({"act", "statutory_instrument", "programme", "institution"})
_LEGAL_TYPES: frozenset[str] = frozenset({"act", "statutory_instrument"})
_STATUSES: frozenset[str] = frozenset(
    {
        "enacted_text_only",
        "amended",
        "partially_in_force",
        "in_force",
        "repealed",
        "active",
        "closed",
        "dissolved",
        "succeeded",
    }
)
_ROLES: frozenset[str] = frozenset({"primary", "explanatory_notes", "official"})
_TOPICS: frozenset[str] = frozenset(
    {
        # Housing Domain 10
        "planning",
        "new-towns",
        "social-housing",
        "council-housing",
        "private-renting",
        "homeownership",
        "homelessness",
        "conditions",
        "building-safety",
        "leasehold",
        "finance",
        "regeneration",
        "welfare",
        # Energy & Industry Domain 10
        "energy",
        "electricity",
        "climate",
        "industrial-strategy",
        "investment",
        "regulation",
        "manufacturing",
        "renewables",
    }
)
_NATIONS: frozenset[str] = frozenset({"england", "wales", "scotland", "northern-ireland"})
_KINDS: frozenset[str] = frozenset(
    {"created", "amended", "repealed", "replaced", "administered", "funded", "implemented", "succeeded"}
)
# Hosts that carry the text of legislation or the record of Royal Assent.
_LEGAL_HOSTS: frozenset[str] = frozenset(
    {"www.legislation.gov.uk", "legislation.gov.uk", "api.parliament.uk", "hansard.parliament.uk"}
)


@dataclass(frozen=True, slots=True)
class PolicySource:
    """One citable page. Primary legislation outranks explanatory notes."""

    label: str
    url: str
    role: SourceRole


@dataclass(frozen=True, slots=True)
class Commencement:
    """One appointment of provisions. `when` is None when the date is not pinned."""

    when: date | None
    instrument: str
    citation: str
    url: str
    scope: str


@dataclass(frozen=True, slots=True)
class LinkedIndicator:
    """A canonical series to open beside the event. Context, not a causal claim."""

    indicator_id: str
    title: str
    domain: str
    view: str
    relationship: LinkRelationship
    note: str


@dataclass(frozen=True, slots=True)
class PolicyEvent:
    """One Act, instrument, programme or institution, with dates kept apart."""

    id: str
    title: str
    citation: str
    aliases: tuple[str, ...]
    type: EventType
    topics: tuple[str, ...]
    summary: str
    institution: str
    jurisdiction: str
    nations: tuple[Nation, ...]
    extent: str
    announcement_date: date | None
    enactment_date: date | None
    start_date: date | None
    end_date: date | None
    date_note: str | None
    commencements: tuple[Commencement, ...]
    status: EventStatus
    status_note: str
    sources: tuple[PolicySource, ...]
    linked_indicators: tuple[LinkedIndicator, ...]

    @property
    def mark_date(self) -> date:
        """Where the event sits on a timeline: enactment for law, start otherwise."""

        mark = self.enactment_date if self.type in _LEGAL_TYPES else self.start_date
        assert mark is not None  # guaranteed by the loader
        return mark


@dataclass(frozen=True, slots=True)
class Era:
    """A browsing range in whole years. Not a claim about the period."""

    id: str
    label: str
    from_year: int | None
    to_year: int | None
    focus: str

    def contains(self, year: int) -> bool:
        if self.from_year is not None and year < self.from_year:
            return False
        if self.to_year is not None and year > self.to_year:
            return False
        return True


@dataclass(frozen=True, slots=True)
class Relationship:
    """A sourced edge between two events. Read as: `from_id` <kind> `to_id`."""

    from_id: str
    to_id: str
    kind: RelationshipKind
    when: date | None
    note: str
    source: PolicySource


@dataclass(frozen=True, slots=True)
class PolicyRegistry:
    """A versioned file of events for one sector."""

    registry_id: str
    title: str
    sector: str
    retrieved_at: date
    note: str
    eras: tuple[Era, ...]
    events: tuple[PolicyEvent, ...]
    relationships: tuple[Relationship, ...]

    def era_for(self, event: PolicyEvent) -> Era:
        year = event.mark_date.year
        for era in self.eras:
            if era.contains(year):
                return era
        raise LookupError(f"{event.id}: no era covers {year}")


def load_policy_registry(path: Path) -> PolicyRegistry:
    """Read and check an event file. Raises ValueError when a required fact is missing."""

    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"{path} must be a JSON object")
    events_raw = raw.get("events")
    if not isinstance(events_raw, list) or not events_raw:
        raise ValueError(f"{path} needs at least one event")
    events = tuple(_event(item, path) for item in events_raw)
    ids = [event.id for event in events]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{path} has a repeated event id")
    eras = _eras(raw.get("eras"), path)
    relationships = tuple(
        _relationship(row, path, set(ids)) for row in _list(raw, "relationships", str(path))
    )
    seen_edges = [(r.from_id, r.to_id, r.kind) for r in relationships]
    if len(seen_edges) != len(set(seen_edges)):
        raise ValueError(f"{path} has a repeated relationship")
    registry = PolicyRegistry(
        registry_id=_text(raw, "registry_id", path),
        title=_text(raw, "title", path),
        sector=_text(raw, "sector", path),
        retrieved_at=_required_date(raw.get("retrieved_at"), "retrieved_at", path),
        note=_text(raw, "note", path),
        eras=eras,
        events=events,
        relationships=relationships,
    )
    for event in events:
        registry.era_for(event)
    return registry


def _event(item: Any, path: Path) -> PolicyEvent:
    if not isinstance(item, dict):
        raise ValueError(f"{path} has an event that is not an object")
    event_id = _text(item, "id", path)
    status = item.get("status")
    if status not in _STATUSES:
        raise ValueError(f"{event_id}: status must be one of {sorted(_STATUSES)}")
    event_type = item.get("type")
    if event_type not in _TYPES:
        raise ValueError(f"{event_id}: type must be one of {sorted(_TYPES)}")
    sources = tuple(_source(row, event_id) for row in _list(item, "sources", event_id))
    _check_sources(event_id, event_type, sources)

    topics = tuple(_text_list(item.get("topics"), event_id, "topics"))
    if not topics or not set(topics) <= _TOPICS or len(set(topics)) != len(topics):
        raise ValueError(f"{event_id}: topics must be a non-empty unique list from {sorted(_TOPICS)}")
    nations = tuple(_text_list(item.get("nations"), event_id, "nations"))
    if not nations or not set(nations) <= _NATIONS or len(set(nations)) != len(nations):
        raise ValueError(f"{event_id}: nations must be a non-empty unique list from {sorted(_NATIONS)}")

    enactment = _optional_date(item.get("enactment_date"), "enactment_date", event_id)
    start = _optional_date(item.get("start_date"), "start_date", event_id)
    end = _optional_date(item.get("end_date"), "end_date", event_id)
    date_note = item.get("date_note")
    if date_note is not None and (not isinstance(date_note, str) or not date_note.strip()):
        raise ValueError(f"{event_id}: date_note must be non-empty text or null")
    if event_type in _LEGAL_TYPES:
        if enactment is None:
            label = "Royal Assent" if event_type == "act" else "made date"
            raise ValueError(f"{event_id}: enactment_date ({label}) is required for {event_type}")
        if start is not None or end is not None:
            raise ValueError(f"{event_id}: {event_type} uses enactment_date, not start_date/end_date")
    else:
        if enactment is not None:
            raise ValueError(f"{event_id}: {event_type} must have enactment_date null")
        if start is None:
            raise ValueError(f"{event_id}: start_date is required for {event_type}")
        if date_note is None:
            raise ValueError(f"{event_id}: date_note is required for {event_type}")
        if end is not None and end < start:
            raise ValueError(f"{event_id}: end_date is before start_date")

    commencements = tuple(_commencement(row, event_id) for row in _list(item, "commencements", event_id))
    mark = enactment if event_type in _LEGAL_TYPES else start
    for row in commencements:
        if row.when is not None and mark is not None and row.when < mark:
            raise ValueError(f"{event_id}: commencement {row.citation} is before the mark date")

    return PolicyEvent(
        id=event_id,
        title=_text(item, "title", path),
        citation=_text(item, "citation", path),
        aliases=tuple(_text_list(item.get("aliases"), event_id, "aliases")),
        type=event_type,
        topics=topics,
        summary=_text(item, "summary", path),
        institution=_text(item, "institution", path),
        jurisdiction=_text(item, "jurisdiction", path),
        nations=nations,
        extent=_text(item, "extent", path),
        announcement_date=_optional_date(item.get("announcement_date"), "announcement_date", event_id),
        enactment_date=enactment,
        start_date=start,
        end_date=end,
        date_note=date_note.strip() if isinstance(date_note, str) else None,
        commencements=commencements,
        status=status,
        status_note=_text(item, "status_note", path),
        sources=sources,
        linked_indicators=tuple(_link(row, event_id) for row in _list(item, "linked_indicators", event_id)),
    )


def _check_sources(event_id: str, event_type: str, sources: tuple[PolicySource, ...]) -> None:
    if event_type in _LEGAL_TYPES:
        legal = [s for s in sources if s.role == "primary" and urlparse(s.url).hostname in _LEGAL_HOSTS]
        if not legal:
            raise ValueError(
                f"{event_id}: {event_type} needs a primary source on legislation.gov.uk or Parliament"
            )
    elif not any(source.role in {"primary", "official"} for source in sources):
        raise ValueError(f"{event_id}: needs a primary or official source")


def _eras(value: Any, path: Path) -> tuple[Era, ...]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{path}: eras must be a non-empty list")
    eras: list[Era] = []
    for item in value:
        if not isinstance(item, dict):
            raise ValueError(f"{path}: era must be an object")
        era_id = _text(item, "id", path)
        lo, hi = item.get("from"), item.get("to")
        for key, bound in (("from", lo), ("to", hi)):
            if bound is not None and (not isinstance(bound, int) or isinstance(bound, bool)):
                raise ValueError(f"{era_id}: {key} must be an integer year or null")
        if lo is not None and hi is not None and lo > hi:
            raise ValueError(f"{era_id}: from is after to")
        eras.append(Era(era_id, _text(item, "label", era_id), lo, hi, _text(item, "focus", era_id)))
    if len({era.id for era in eras}) != len(eras):
        raise ValueError(f"{path}: repeated era id")
    for index, era in enumerate(eras):
        if era.from_year is None and index != 0:
            raise ValueError(f"{era.id}: only the first era may be open at the start")
        if era.to_year is None and index != len(eras) - 1:
            raise ValueError(f"{era.id}: only the last era may be open at the end")
        if index:
            previous = eras[index - 1]
            if previous.to_year is None or era.from_year is None or era.from_year <= previous.to_year:
                raise ValueError(f"{era.id}: eras must be ordered and must not overlap")
    return tuple(eras)


def _relationship(item: Any, path: Path, ids: set[str]) -> Relationship:
    if not isinstance(item, dict):
        raise ValueError(f"{path}: relationship must be an object")
    from_id = _text(item, "from", path)
    to_id = _text(item, "to", path)
    where = f"relationship {from_id} -> {to_id}"
    if from_id not in ids or to_id not in ids:
        raise ValueError(f"{where}: both endpoints must be event ids in this file")
    if from_id == to_id:
        raise ValueError(f"{where}: an event cannot relate to itself")
    kind = item.get("kind")
    if kind not in _KINDS:
        raise ValueError(f"{where}: kind must be one of {sorted(_KINDS)}")
    source = _source(item.get("source"), where)
    if source.role not in {"primary", "official"}:
        raise ValueError(f"{where}: needs a primary or official source")
    return Relationship(
        from_id=from_id,
        to_id=to_id,
        kind=kind,
        when=_optional_date(item.get("date"), "date", where),
        note=_text(item, "note", where),
        source=source,
    )


def _source(item: Any, event_id: str) -> PolicySource:
    if not isinstance(item, dict):
        raise ValueError(f"{event_id}: source must be an object")
    role = item.get("role")
    if role not in _ROLES:
        raise ValueError(f"{event_id}: source role must be one of {sorted(_ROLES)}")
    url = _text(item, "url", event_id)
    if not url.startswith("https://"):
        raise ValueError(f"{event_id}: source url must be https")
    return PolicySource(label=_text(item, "label", event_id), url=url, role=role)


def _commencement(item: Any, event_id: str) -> Commencement:
    if not isinstance(item, dict):
        raise ValueError(f"{event_id}: commencement must be an object")
    url = _text(item, "url", event_id)
    if not url.startswith("https://"):
        raise ValueError(f"{event_id}: commencement url must be https")
    return Commencement(
        when=_optional_date(item.get("date"), "commencement date", event_id),
        instrument=_text(item, "instrument", event_id),
        citation=_text(item, "citation", event_id),
        url=url,
        scope=_text(item, "scope", event_id),
    )


def _link(item: Any, event_id: str) -> LinkedIndicator:
    if not isinstance(item, dict):
        raise ValueError(f"{event_id}: linked indicator must be an object")
    relationship = item.get("relationship")
    if relationship != "context":
        raise ValueError(f"{event_id}: linked indicators are context only")
    return LinkedIndicator(
        indicator_id=_text(item, "id", event_id),
        title=_text(item, "title", event_id),
        domain=_text(item, "domain", event_id),
        view=_text(item, "view", event_id),
        relationship=relationship,
        note=_text(item, "note", event_id),
    )


def _list(item: dict[str, Any], key: str, where: str) -> list[Any]:
    value = item.get(key)
    if not isinstance(value, list):
        raise ValueError(f"{where}: {key} must be a list")
    return value


def _text_list(value: Any, where: str, key: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(part, str) and part.strip() for part in value):
        raise ValueError(f"{where}: {key} must be a list of strings")
    return value


def _text(item: Any, key: str, where: Any) -> str:
    if not isinstance(item, dict):
        raise ValueError(f"{where}: expected an object")
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{where}: {key} must be non-empty text")
    return value.strip()


def _required_date(value: Any, key: str, where: Any) -> date:
    parsed = _optional_date(value, key, where)
    if parsed is None:
        raise ValueError(f"{where}: {key} is required")
    return parsed


def _optional_date(value: Any, key: str, where: Any) -> date | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{where}: {key} must be YYYY-MM-DD or null")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{where}: {key} must be YYYY-MM-DD") from exc
