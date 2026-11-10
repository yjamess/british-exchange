"""Pledge and archive records for Housing Domain 10 (Promise vs Delivery, Archive).

Neither file holds statistical observations. A pledge names a target and, only
when the pledge and a series share geography, period and unit, a ``match`` the
UI may use to compute delivery from the API at render time. Delivered values are
never stored here. An archive item is a catalogue record; images are referenced,
never copied, and ``can_reproduce`` is true only for public domain, OGL or CC-BY.

Shared shape: other sectors may reuse these loaders with their own files.
https://docs.python.org/3/library/dataclasses.html
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Literal

PledgeSourceRole = Literal["official", "primary", "manifesto"]
Aggregation = Literal["sum", "latest", "per-period"]
ArchiveKind = Literal["file", "photograph", "film", "plan", "report", "map", "pamphlet"]
RightsStatus = Literal[
    "public-domain", "ogl", "cc-by", "non-commercial", "all-rights-reserved", "unknown"
]

_PLEDGE_ROLES: frozenset[str] = frozenset({"official", "primary", "manifesto"})
_AGGREGATIONS: frozenset[str] = frozenset({"sum", "latest", "per-period"})
_NATIONS: frozenset[str] = frozenset({"England", "Wales", "Scotland", "Northern Ireland"})
_KINDS: frozenset[str] = frozenset({"file", "photograph", "film", "plan", "report", "map", "pamphlet"})
_RIGHTS: frozenset[str] = frozenset(
    {"public-domain", "ogl", "cc-by", "non-commercial", "all-rights-reserved", "unknown"}
)
_REPRODUCIBLE: frozenset[str] = frozenset({"public-domain", "ogl", "cc-by"})
_KEBAB = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_GEO_CODE = re.compile(r"^[A-Z]\d{8}$")
MAX_STATEMENT_WORDS = 25


# --------------------------------------------------------------------------- pledges


@dataclass(frozen=True, slots=True)
class RecordSource:
    label: str
    url: str
    role: PledgeSourceRole


@dataclass(frozen=True, slots=True)
class PledgeTarget:
    value: float
    unit: str
    geography_code: str | None
    period_start: date | None
    period_end: date | None
    period_note: str


@dataclass(frozen=True, slots=True)
class PledgeMatch:
    """The one series a scorable pledge is set beside. Context, not causation."""

    indicator_id: str
    series: str
    geography_code: str
    unit: str
    aggregation: Aggregation
    # Extra dimension filters (e.g. {"category": "ahp-2021-26"}), matched by the UI on observation dimensions.
    dimensions: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True, slots=True)
class Funding:
    amount_gbp: float
    period_note: str
    source: RecordSource


@dataclass(frozen=True, slots=True)
class Pledge:
    id: str
    title: str
    made_by: str
    made_date: date
    made_date_note: str | None
    made_date_precision: Literal["day", "month"]
    nations: tuple[str, ...]
    statement: str
    sources: tuple[RecordSource, ...]
    target: PledgeTarget
    measure_definition: str
    match: PledgeMatch | None
    scorable: bool
    not_scored_reason: str | None
    funding: tuple[Funding, ...]
    linked_event_ids: tuple[str, ...]
    pending_event_ids: tuple[str, ...]
    context_indicator_ids: tuple[str, ...]
    status_note: str


@dataclass(frozen=True, slots=True)
class PledgeRegistry:
    registry_id: str
    retrieved_at: date
    note: str
    pledges: tuple[Pledge, ...]


def load_pledges(path: Path, event_ids: set[str] | None = None) -> PledgeRegistry:
    """Read and check a pledge file. ``event_ids`` (when given) must contain every linked id."""

    raw = _object_file(path)
    items = raw.get("pledges")
    if not isinstance(items, list) or not items:
        raise ValueError(f"{path}: pledges must be a non-empty list")
    pledges = tuple(_pledge(item, event_ids) for item in items)
    _unique([p.id for p in pledges], path)
    return PledgeRegistry(
        registry_id=_text(raw, "registry_id", path),
        retrieved_at=_required_date(raw.get("retrieved_at"), "retrieved_at", path),
        note=_text(raw, "note", path),
        pledges=pledges,
    )


def _pledge(item: Any, event_ids: set[str] | None) -> Pledge:
    if not isinstance(item, dict):
        raise ValueError("pledge must be an object")
    pid = _kebab(item, "id", "pledge")
    nations = tuple(_text_list(item.get("nations"), pid, "nations", allow_empty=False))
    unknown = set(nations) - _NATIONS
    if unknown:
        raise ValueError(f"{pid}: unknown nations {sorted(unknown)}")
    statement = _text(item, "statement", pid)
    _check_statement(statement, pid)
    sources = tuple(_pledge_source(row, pid) for row in _list(item, "sources", pid))
    if not sources:
        raise ValueError(f"{pid}: needs at least one source")
    target = _target(item.get("target"), pid)
    match_raw = item.get("match")
    match = None if match_raw is None else _match(match_raw, pid)
    scorable = item.get("scorable")
    if not isinstance(scorable, bool):
        raise ValueError(f"{pid}: scorable must be true or false")
    reason = item.get("not_scored_reason")
    if scorable:
        if match is None:
            raise ValueError(f"{pid}: a scorable pledge needs a match")
        if target.geography_code is None or match.geography_code != target.geography_code:
            raise ValueError(f"{pid}: match geography must equal the target geography")
        if match.unit != target.unit:
            raise ValueError(f"{pid}: match unit must equal the target unit")
        if target.period_start is None or target.period_end is None:
            raise ValueError(f"{pid}: a scorable pledge needs a defined period")
        if reason is not None:
            raise ValueError(f"{pid}: not_scored_reason must be null when scorable")
    else:
        if not isinstance(reason, str) or not reason.strip():
            raise ValueError(f"{pid}: not_scored_reason is required when not scorable")
        if match is not None:
            raise ValueError(f"{pid}: an unscored pledge is listed, not matched (match must be null)")
    linked = tuple(_text_list(item.get("linked_event_ids"), pid, "linked_event_ids"))
    if event_ids is not None:
        missing = set(linked) - event_ids
        if missing:
            raise ValueError(f"{pid}: linked_event_ids not in events file: {sorted(missing)}")
    return Pledge(
        id=pid,
        title=_text(item, "title", pid),
        made_by=_text(item, "made_by", pid),
        made_date=_required_date(item.get("made_date"), "made_date", pid),
        made_date_note=_optional_text(item, "made_date_note", pid),
        made_date_precision=_precision(item.get("made_date_precision"), pid),
        nations=nations,
        statement=statement,
        sources=sources,
        target=target,
        measure_definition=_text(item, "measure_definition", pid),
        match=match,
        scorable=scorable,
        not_scored_reason=reason.strip() if isinstance(reason, str) else None,
        funding=tuple(_funding(row, pid) for row in _list(item, "funding", pid)),
        linked_event_ids=linked,
        pending_event_ids=tuple(
            _text_list(item.get("pending_event_ids", []), pid, "pending_event_ids")
        ),
        context_indicator_ids=tuple(
            _text_list(item.get("context_indicator_ids", []), pid, "context_indicator_ids")
        ),
        status_note=_text(item, "status_note", pid),
    )



def _precision(raw: Any, pid: str) -> Literal["day", "month"]:
    if raw is None:
        return "day"
    if raw not in ("day", "month"):
        raise ValueError(f"{pid}: made_date_precision must be 'day' or 'month'")
    return raw


def _check_statement(statement: str, pid: str) -> None:
    quotes = ('"', "“", "”")
    if statement[0] not in quotes or statement[-1] not in quotes:
        raise ValueError(f"{pid}: statement must be a quotation in quotation marks")
    words = statement.strip('"“” ').split()
    if len(words) > MAX_STATEMENT_WORDS:
        raise ValueError(f"{pid}: statement is {len(words)} words; limit {MAX_STATEMENT_WORDS}")


def _pledge_source(item: Any, where: str) -> RecordSource:
    if not isinstance(item, dict):
        raise ValueError(f"{where}: source must be an object")
    role = item.get("role")
    if role not in _PLEDGE_ROLES:
        raise ValueError(f"{where}: source role must be one of {sorted(_PLEDGE_ROLES)}")
    return RecordSource(label=_text(item, "label", where), url=_https(item, "url", where), role=role)


def _target(item: Any, pid: str) -> PledgeTarget:
    if not isinstance(item, dict):
        raise ValueError(f"{pid}: target must be an object")
    value = _number(item.get("value"), pid, "target.value")
    geo = item.get("geography_code")
    if geo is not None and (not isinstance(geo, str) or not _GEO_CODE.match(geo)):
        raise ValueError(f"{pid}: target.geography_code must be a GSS code or null")
    start = _optional_date(item.get("period_start"), "target.period_start", pid)
    end = _optional_date(item.get("period_end"), "target.period_end", pid)
    if start and end and start > end:
        raise ValueError(f"{pid}: target period_start is after period_end")
    return PledgeTarget(
        value=value,
        unit=_text(item, "unit", pid),
        geography_code=geo,
        period_start=start,
        period_end=end,
        period_note=_text(item, "period_note", pid),
    )


def _match(item: Any, pid: str) -> PledgeMatch:
    if not isinstance(item, dict):
        raise ValueError(f"{pid}: match must be an object or null")
    aggregation = item.get("aggregation")
    if aggregation not in _AGGREGATIONS:
        raise ValueError(f"{pid}: match.aggregation must be one of {sorted(_AGGREGATIONS)}")
    geo = _text(item, "geography_code", pid)
    if not _GEO_CODE.match(geo):
        raise ValueError(f"{pid}: match.geography_code must be a GSS code")
    return PledgeMatch(
        indicator_id=_kebab(item, "indicator_id", pid),
        series=_text(item, "series", pid),
        geography_code=geo,
        unit=_text(item, "unit", pid),
        aggregation=aggregation,
        dimensions=_dimensions(item.get("dimensions"), pid),
    )


_DIMENSION_KEYS: frozenset[str] = frozenset({"category", "fuel", "demographic"})


def _dimensions(raw: Any, pid: str) -> tuple[tuple[str, str], ...]:
    if raw is None:
        return ()
    if not isinstance(raw, dict) or not all(isinstance(v, str) and v for v in raw.values()):
        raise ValueError(f"{pid}: match.dimensions must map dimension names to non-empty strings")
    unknown = set(raw) - _DIMENSION_KEYS
    if unknown:
        raise ValueError(f"{pid}: match.dimensions has unknown keys {sorted(unknown)}")
    return tuple(sorted(raw.items()))


def _funding(item: Any, pid: str) -> Funding:
    if not isinstance(item, dict):
        raise ValueError(f"{pid}: funding row must be an object")
    return Funding(
        amount_gbp=_number(item.get("amount_gbp"), pid, "funding.amount_gbp"),
        period_note=_text(item, "period_note", pid),
        source=_pledge_source(item.get("source"), pid),
    )


# --------------------------------------------------------------------------- archive


@dataclass(frozen=True, slots=True)
class ArchiveRights:
    status: RightsStatus
    licence_url: str | None
    can_reproduce: bool
    note: str


@dataclass(frozen=True, slots=True)
class ArchiveItem:
    id: str
    title: str
    holder: str
    reference: str
    date_label: str
    date_start: date | None
    date_end: date | None
    kind: ArchiveKind
    description: str
    url: str
    linked_event_ids: tuple[str, ...]
    pending_event_ids: tuple[str, ...]
    topics: tuple[str, ...]
    rights: ArchiveRights
    image_url: str | None


@dataclass(frozen=True, slots=True)
class ArchiveRegistry:
    registry_id: str
    retrieved_at: date
    note: str
    items: tuple[ArchiveItem, ...]


def load_archive(path: Path, event_ids: set[str] | None = None) -> ArchiveRegistry:
    """Read and check an archive file. ``event_ids`` (when given) must contain every linked id."""

    raw = _object_file(path)
    items_raw = raw.get("items")
    if not isinstance(items_raw, list) or not items_raw:
        raise ValueError(f"{path}: items must be a non-empty list")
    items = tuple(_archive_item(item, event_ids) for item in items_raw)
    _unique([i.id for i in items], path)
    return ArchiveRegistry(
        registry_id=_text(raw, "registry_id", path),
        retrieved_at=_required_date(raw.get("retrieved_at"), "retrieved_at", path),
        note=_text(raw, "note", path),
        items=items,
    )


def _archive_item(item: Any, event_ids: set[str] | None) -> ArchiveItem:
    if not isinstance(item, dict):
        raise ValueError("archive item must be an object")
    aid = _kebab(item, "id", "archive item")
    kind = item.get("kind")
    if kind not in _KINDS:
        raise ValueError(f"{aid}: kind must be one of {sorted(_KINDS)}")
    start = _optional_date(item.get("date_start"), "date_start", aid)
    end = _optional_date(item.get("date_end"), "date_end", aid)
    if start and end and start > end:
        raise ValueError(f"{aid}: date_start is after date_end")
    linked = tuple(_text_list(item.get("linked_event_ids"), aid, "linked_event_ids"))
    if event_ids is not None:
        missing = set(linked) - event_ids
        if missing:
            raise ValueError(f"{aid}: linked_event_ids not in events file: {sorted(missing)}")
    image_url = item.get("image_url")
    if image_url is not None:
        image_url = _https(item, "image_url", aid)
    return ArchiveItem(
        id=aid,
        title=_text(item, "title", aid),
        holder=_text(item, "holder", aid),
        reference=_text(item, "reference", aid),
        date_label=_text(item, "date_label", aid),
        date_start=start,
        date_end=end,
        kind=kind,
        description=_text(item, "description", aid),
        url=_https(item, "url", aid),
        linked_event_ids=linked,
        pending_event_ids=tuple(
            _text_list(item.get("pending_event_ids", []), aid, "pending_event_ids")
        ),
        topics=tuple(_text_list(item.get("topics"), aid, "topics", allow_empty=False)),
        rights=_rights(item.get("rights"), aid),
        image_url=image_url,
    )


def _rights(item: Any, aid: str) -> ArchiveRights:
    if not isinstance(item, dict):
        raise ValueError(f"{aid}: rights must be an object")
    status = item.get("status")
    if status not in _RIGHTS:
        raise ValueError(f"{aid}: rights.status must be one of {sorted(_RIGHTS)}")
    can = item.get("can_reproduce")
    if not isinstance(can, bool):
        raise ValueError(f"{aid}: rights.can_reproduce must be true or false")
    if can and status not in _REPRODUCIBLE:
        raise ValueError(f"{aid}: can_reproduce is allowed only for {sorted(_REPRODUCIBLE)}")
    licence = item.get("licence_url")
    if licence is not None:
        licence = _https(item, "licence_url", aid)
    return ArchiveRights(status=status, licence_url=licence, can_reproduce=can, note=_text(item, "note", aid))


# --------------------------------------------------------------------------- helpers


def event_ids_from_file(path: Path) -> set[str]:
    """Event ids in an events.json file (read raw so the shape owner can evolve it)."""

    raw = _object_file(path)
    events = raw.get("events")
    if not isinstance(events, list):
        raise ValueError(f"{path}: events must be a list")
    return {e["id"] for e in events if isinstance(e, dict) and isinstance(e.get("id"), str)}


def _object_file(path: Path) -> dict[str, Any]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"{path} must be a JSON object")
    return raw


def _unique(ids: list[str], where: Any) -> None:
    if len(ids) != len(set(ids)):
        raise ValueError(f"{where}: repeated id")


def _list(item: dict[str, Any], key: str, where: str) -> list[Any]:
    value = item.get(key)
    if not isinstance(value, list):
        raise ValueError(f"{where}: {key} must be a list")
    return value


def _text_list(value: Any, where: str, key: str, *, allow_empty: bool = True) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(v, str) and v.strip() for v in value):
        raise ValueError(f"{where}: {key} must be a list of strings")
    if not allow_empty and not value:
        raise ValueError(f"{where}: {key} must not be empty")
    if len(value) != len(set(value)):
        raise ValueError(f"{where}: {key} has a repeated value")
    return value


def _text(item: Any, key: str, where: Any) -> str:
    if not isinstance(item, dict):
        raise ValueError(f"{where}: expected an object")
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{where}: {key} must be non-empty text")
    return value.strip()


def _optional_text(item: dict[str, Any], key: str, where: str) -> str | None:
    if item.get(key) is None:
        return None
    return _text(item, key, where)


def _kebab(item: Any, key: str, where: Any) -> str:
    value = _text(item, key, where)
    if not _KEBAB.match(value):
        raise ValueError(f"{where}: {key} must be kebab-case, got {value!r}")
    return value


def _https(item: dict[str, Any], key: str, where: str) -> str:
    value = _text(item, key, where)
    if not value.startswith("https://"):
        raise ValueError(f"{where}: {key} must be an https url")
    return value


def _number(value: Any, where: str, key: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"{where}: {key} must be a positive number")
    return float(value)


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
