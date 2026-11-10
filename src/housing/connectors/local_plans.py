"""Planning Data — England local plan status (who has a plan, how old, what stage).

Approach:
1. Pin the Planning Data ``local-plan`` bulk CSV and the ``organisation`` register.
2. Take every current local planning authority (LPA) in the organisation register —
   councils, national parks, development corporations — as the denominator.
3. Credit each plan to its member LPAs (joint plans list members in ``organisations``).
4. Per LPA: the most recent adopted plan (adoption date; ``start-date`` when the
   adoption date is blank) and the most advanced plan in preparation.
5. Emit England counts (plan age bands, preparation stages, vintage of today's plans)
   plus one row per LPA, and a small summary pack for the Planning decisions view.

Caveats: this is plan *status*, not site allocations (no national allocation polygons
exist — see docs/domain06-gap-hunt-2026-11-10.md). Planning Data is compiled from
councils and is incomplete: blank stages are counted as missing, never inferred.
"""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import HOUSING_DATA

INDICATOR_ID = "local-plan-status"
PIN_DAY = "2026-11-10"
PINNED_PLANS = f"raw/{PIN_DAY}/local-plan.csv"
PINNED_ORGS = f"raw/{PIN_DAY}/organisation.csv"
PLANS_URL = "https://files.planning.data.gov.uk/dataset/local-plan.csv"
ORGS_URL = "https://files.planning.data.gov.uk/organisation-collection/dataset/organisation.csv"
SOURCE_LANDING = "https://www.planning.data.gov.uk/dataset/local-plan"
SOURCE_VERSION = f"Planning Data local-plan bulk CSV {PIN_DAY}"
ENGLAND_CODE = "E92000001"
ENGLAND_LABEL = "England"
AS_AT = date.fromisoformat(PIN_DAY)
SUMMARY_PATH = "curated/summary.json"

# Plan stages before adoption, least → most advanced. Labels are plain words for the UI.
PREP_STAGES: list[tuple[str, str]] = [
    ("in preparation", "In preparation"),
    ("regulation-18", "Early consultation"),
    ("draft", "Draft published"),
    ("regulation-19", "Final draft published"),
    ("submitted", "Submitted for examination"),
    ("examination", "At examination"),
]
PREP_ORDER = [code for code, _ in PREP_STAGES]

# Age of the adopted plan. National policy asks councils to review plans at least
# every five years (National Planning Policy Framework), so bands read against that test.
AGE_BANDS: list[tuple[str, str, float, float]] = [
    ("under-5", "Under 5 years", 0, 5),
    ("5-10", "5 to 10 years", 5, 10),
    ("10-15", "10 to 15 years", 10, 15),
    ("15-plus", "15 years or more", 15, 1e9),
]


def _years_between(start: date, end: date) -> float:
    return (end - start).days / 365.25


def _iso(raw: str | None) -> date | None:
    text = (raw or "").strip()[:10]
    if len(text) < 10:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _int(raw: str | None) -> int | None:
    text = (raw or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def load_lpas(org_path: Path) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    """Current LPAs by organisation entity, and organisation reference → entity."""
    lpas: dict[str, dict[str, str]] = {}
    by_ref: dict[str, str] = {}
    with org_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            entity = (row.get("entity") or "").strip()
            ref = (row.get("organisation") or "").strip()
            if entity and ref:
                by_ref[ref] = entity
            if entity and (row.get("local-planning-authority") or "").strip() and not (row.get("end-date") or "").strip():
                lpas[entity] = {
                    "name": (row.get("name") or entity).strip(),
                    "code": (row.get("local-planning-authority") or "").strip(),
                    "kind": (row.get("dataset") or "").strip(),
                }
    return lpas, by_ref


def build_status(plans_path: Path, org_path: Path, *, as_at: date = AS_AT) -> dict[str, Any]:
    """Per-LPA status + England aggregates. Pure function of the two pinned files."""
    csv.field_size_limit(10**9)
    lpas, by_ref = load_lpas(org_path)
    by_lpa: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    rows_total = 0
    blank_stage = 0
    with plans_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows_total += 1
            if not (row.get("local-plan-process") or "").strip():
                blank_stage += 1
            members = {by_ref[ref] for ref in (row.get("organisations") or "").split(";") if ref in by_ref}
            for entity in members or {(row.get("organisation-entity") or "").strip()}:
                by_lpa[entity].append(row)

    councils: list[dict[str, Any]] = []
    for entity, lpa in lpas.items():
        rows = [r for r in by_lpa.get(entity, []) if not (r.get("end-date") or "").strip()]
        adopted: list[tuple[date, str, dict[str, str]]] = []
        for r in rows:
            stage = (r.get("local-plan-process") or "").strip()
            if stage not in ("adopted", ""):
                continue
            if r.get("adopted-date"):
                when, field = _iso(r["adopted-date"]), "adopted-date"
            elif stage == "adopted":
                when, field = _iso(r.get("start-date")), "start-date"
            else:
                continue  # blank stage and no adoption date: unknown, not adopted
            if when and when <= as_at:
                adopted.append((when, field, r))
        prep = [r for r in rows if (r.get("local-plan-process") or "").strip() in PREP_ORDER]
        record: dict[str, Any] = {
            "entity": entity,
            "code": lpa["code"],
            "name": lpa["name"],
            "kind": lpa["kind"],
            "records": len(by_lpa.get(entity, [])),
            "plan": None,
            "adopted": None,
            "adoptedFrom": None,
            "ageYears": None,
            "ageBand": "none",
            "periodStart": None,
            "periodEnd": None,
            "requiredHousing": None,
            "joint": False,
            "prepStage": None,
            "prepPlan": None,
        }
        if adopted:
            when, field, r = max(adopted, key=lambda item: item[0])
            age = _years_between(when, as_at)
            record.update(
                plan=(r.get("name") or "").strip() or None,
                adopted=when.isoformat(),
                adoptedFrom=field,
                ageYears=round(age, 1),
                ageBand=next(code for code, _, lo, hi in AGE_BANDS if lo <= age < hi),
                periodStart=(r.get("period-start-date") or "")[:4] or None,
                periodEnd=(r.get("period-end-date") or "")[:4] or None,
                joint=";" in (r.get("organisations") or ""),
            )
            # A joint plan's figure covers every member council; it is not this council's.
            if record["joint"]:
                record["jointRequiredHousing"] = _int(r.get("required-housing"))
            else:
                record["requiredHousing"] = _int(r.get("required-housing"))
        if prep:
            best = max(prep, key=lambda r: PREP_ORDER.index(r["local-plan-process"].strip()))
            record.update(prepStage=best["local-plan-process"].strip(), prepPlan=(best.get("name") or "").strip() or None)
        councils.append(record)
    councils.sort(key=lambda c: c["name"])

    bands = Counter(c["ageBand"] for c in councils)
    stages = Counter(c["prepStage"] for c in councils if c["prepStage"])
    vintage = Counter(int(c["adopted"][:4]) for c in councils if c["adopted"])
    with_plan = [c for c in councils if c["adopted"]]
    return {
        "indicator_id": INDICATOR_ID,
        "title": "Local plan status (England)",
        "publisher": "MHCLG / Planning Data",
        "asAt": as_at.isoformat(),
        "geography": "England local planning authorities — not UK",
        "lpaCount": len(councils),
        "withAdoptedPlan": len(with_plan),
        "olderThanFive": sum(1 for c in with_plan if (c["ageYears"] or 0) >= 5),
        "preparing": sum(stages.values()),
        "ageBands": [
            {"id": code, "label": label, "lpas": bands.get(code, 0)} for code, label, _, _ in AGE_BANDS
        ]
        + [{"id": "none", "label": "No adopted plan in the data", "lpas": bands.get("none", 0)}],
        "prepStages": [{"id": code, "label": label, "lpas": stages.get(code, 0)} for code, label in PREP_STAGES],
        "vintage": [{"year": y, "lpas": n} for y, n in sorted(vintage.items())],
        "councils": councils,
        "coverage": {
            "planRecords": rows_total,
            "blankStageRecords": blank_stage,
            "adoptedFromStartDate": sum(1 for c in with_plan if c["adoptedFrom"] == "start-date"),
            "withRequiredHousing": sum(1 for c in with_plan if c["requiredHousing"] is not None),
            "jointPlans": sum(1 for c in with_plan if c["joint"]),
        },
        "source": {
            "landing": SOURCE_LANDING,
            "file": PLANS_URL,
            "organisations": ORGS_URL,
            "licence": "Open Government Licence v3.0",
        },
    }


def status_observations(status: dict[str, Any]) -> list[Observation]:
    period = status["asAt"]
    out: list[Observation] = []

    def add(series: str, value: float, unit: str, *, code: str = ENGLAND_CODE, label: str = ENGLAND_LABEL, extra: str = "") -> None:
        notes = f"series={series}; as-at={period}; source=planning.data.gov.uk/local-plan; coverage=England LPAs — not UK"
        out.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=period,
                period_end=period,
                geography_code=code,
                geography_label=label,
                value=value,
                unit=unit,
                observation_status="final",
                source_version=SOURCE_VERSION,
                notes=f"{notes}; {extra}" if extra else notes,
            )
        )

    add("lpa-count", status["lpaCount"], "local planning authorities")
    add("lpas-with-adopted-plan", status["withAdoptedPlan"], "local planning authorities")
    add("adopted-plan-older-than-5-years", status["olderThanFive"], "local planning authorities")
    for band in status["ageBands"]:
        add("lpas-by-plan-age", band["lpas"], "local planning authorities", extra=f"age-band={band['id']}")
    for stage in status["prepStages"]:
        add("lpas-by-preparation-stage", stage["lpas"], "local planning authorities", extra=f"stage={stage['id']}")
    for row in status["vintage"]:
        add("current-plans-by-adoption-year", row["lpas"], "local planning authorities", extra=f"adoption-year={row['year']}")
    for c in status["councils"]:
        if c["ageYears"] is not None:
            add(
                "adopted-plan-age",
                c["ageYears"],
                "years",
                code=c["code"],
                label=c["name"],
                extra=f"adopted={c['adopted']}; date-field={c['adoptedFrom']}; joint={str(c['joint']).lower()}",
            )
        if c["requiredHousing"] is not None:
            add(
                "required-housing",
                c["requiredHousing"],
                "dwellings over plan period",
                code=c["code"],
                label=c["name"],
                extra=f"plan-period={c['periodStart'] or '?'}-{c['periodEnd'] or '?'}",
            )
    out.sort(key=lambda o: (o.geography_code, o.notes))
    return out


class LocalPlanStatusConnector(Connector):
    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (HOUSING_DATA / INDICATOR_ID), timeout_s=180.0)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Local plan status (England)",
            sector="housing-land",
            publisher="MHCLG / Planning Data",
            source_url=SOURCE_LANDING,
            series_id="planning.data.gov.uk dataset=local-plan (+ organisation)",
            geography="England local planning authorities — not UK",
            frequency="snapshot",
            unit="local planning authorities / years / dwellings",
            definition=(
                "For each current local planning authority in England: its most recent "
                "adopted local plan (age in years, plan period, homes the plan requires) "
                "and the most advanced plan in preparation. England counts by plan age "
                "band, preparation stage and adoption year of today's plans."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="housing",
            connector_module="housing.connectors.local_plans",
            curated_path="curated/observations.csv",
            update_cadence="monthly (when Planning Data updates)",
            raw_evidence=list(evidence),
            transformations=(
                "Current LPAs from organisation.csv (local-planning-authority set, no end-date). "
                "Plans credited to every member in `organisations` (joint plans). Ended plan "
                "records dropped. Adopted = stage adopted, or blank stage with an adoption date; "
                "date = adopted-date, else start-date. Most advanced preparation stage kept."
            ),
            caveats=(
                "Plan status, not site allocations. Planning Data is compiled from councils and "
                "is incomplete: 403 of 987 records have no stage and are not counted as adopted "
                "unless they carry an adoption date. For most adopted plans the adoption date is "
                "taken from start-date because adopted-date is blank. Required housing is the "
                "plan's own figure over its plan period — not a target for one year, and not "
                "comparable across councils with different periods. Joint plans' housing figures "
                "cover all member councils and are not attributed to any one council. Some councils "
                "with an adopted plan are missing from Planning Data (e.g. North Hertfordshire)."
            ),
            revision_notes="Initial Domain 06 ingest 2026-11-10 (T17) from the gap hunt.",
            related_indicator_ids=["brownfield-land", "planning-decisions-granted", "planning-appeals-casework", "green-belt-area"],
            notion_registry_url="",
        )

    def evidence_from_pinned_raw(self) -> list[RawEvidence]:
        retrieved = datetime.now(timezone.utc).isoformat()
        out: list[RawEvidence] = []
        for rel, url in ((PINNED_PLANS, PLANS_URL), (PINNED_ORGS, ORGS_URL)):
            path = self.data_root / rel
            if not path.is_file():
                raise FileNotFoundError(path)
            out.append(
                RawEvidence(
                    path=rel,
                    retrieved_at=retrieved,
                    checksum_sha256=sha256_file(path),
                    content_type="text/csv",
                    official_release_date=PIN_DAY,
                    source_url=url,
                )
            )
        return out

    def fetch_pinned(self) -> list[RawEvidence]:
        self.fetch_url(PLANS_URL, PINNED_PLANS, official_release_date=PIN_DAY)
        self.fetch_url(ORGS_URL, PINNED_ORGS, official_release_date=PIN_DAY)
        return self.evidence_from_pinned_raw()

    def status(self) -> dict[str, Any]:
        return build_status(self.data_root / PINNED_PLANS, self.data_root / PINNED_ORGS)

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        return status_observations(self.status())


def main() -> None:
    connector = LocalPlanStatusConnector()
    pinned = all((connector.data_root / rel).is_file() for rel in (PINNED_PLANS, PINNED_ORGS))
    evidence = connector.evidence_from_pinned_raw() if pinned else connector.fetch_pinned()
    status = connector.status()
    observations = status_observations(status)
    connector.write_hand_off(evidence, observations)
    summary = connector.data_root / SUMMARY_PATH
    summary.parent.mkdir(parents=True, exist_ok=True)
    summary.write_text(json.dumps(status, separators=(",", ":")))
    print(
        f"observations={len(observations)} lpas={status['lpaCount']} adopted={status['withAdoptedPlan']} "
        f"older_than_5={status['olderThanFive']} preparing={status['preparing']} → {summary}"
    )


if __name__ == "__main__":
    main()
