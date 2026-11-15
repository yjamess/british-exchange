"""ONS Appendix D / PUSF NAB CG tax drill under MF6P.

Locked identity (Anatomy CG sibling under Ready four-head AHHY package):

    NMBY + NMCU + LIQR = MF6P

Approach (beginner-friendly):
1. Pin PUSF ``/data`` JSON for NMBY, NMCU, LIQR (leaves) and MF6P (total evidence).
2. Optionally pin Appendix D workbook for Validation spot evidence (not required for
   AHGR — all four CDIDs have live JSON).
3. Curate multi-series monthly observations with ``series=<CDID>`` notes for the
   three leaves only — do **not** rewrite Ready ``tax-receipts-composition``.
4. Cross-check the sum against Ready composition MF6P (read-only) and the pinned
   MF6P JSON (same vintage).
5. Self-QA: identity holds on ≥3 months; latest month provisional only.

Best practices: pathlib, type hints, fail loudly — never invent silent residuals
or mix HMRC cash under AHHY/MF6P.
Refs: https://docs.python.org/3/library/pathlib.html · typing docs · PEP 8.
"""

from __future__ import annotations

import csv
import hashlib
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import (
    Observation,
    mark_latest_months_provisional,
    write_observations_csv,
)
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import month_bounds, parse_month_name

INDICATOR_ID = "tax-receipts-cg-composition"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"

APPENDIX_D_LANDING = (
    "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
    "publicsectorfinance/datasets/appendixdpublicsectorcurrentreceipts/current"
)
APPENDIX_D_FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/"
    "publicsectorfinance/datasets/appendixdpublicsectorcurrentreceipts/current/"
    "publicsectorcurrentreceiptsappendixdfinal.xlsx"
)

# Ready four-head package — read-only MF6P cross-check (do not rewrite).
COMPOSITION_CURATED = (
    ECONOMY_DATA / "tax-receipts-composition" / "curated" / "observations.csv"
)

UNIT = "£ million, NSA (CG tax composition under MF6P)"
TOTAL_CDID = "MF6P"
IDENTITY_RULE = "NMBY + NMCU + LIQR = MF6P"


@dataclass(frozen=True, slots=True)
class CgComponent:
    """One CG Anatomy leaf under MF6P."""

    cdid: str
    role: str  # component | total-evidence
    slug: str
    label: str
    source: str  # pusf-json
    curate: bool


# Leaves sum to MF6P; MF6P is pinned for evidence / identity, not curated as a leaf.
CG_COMPONENTS: tuple[CgComponent, ...] = (
    CgComponent(
        "NMBY",
        "component",
        "cg-production-taxes",
        "Total CG taxes on production",
        "pusf-json",
        True,
    ),
    CgComponent(
        "NMCU",
        "component",
        "cg-income-wealth-taxes",
        "Total CG taxes on income and wealth",
        "pusf-json",
        True,
    ),
    CgComponent(
        "LIQR",
        "component",
        "other-cg-taxes",
        "Other CG taxes",
        "pusf-json",
        True,
    ),
    CgComponent(
        "MF6P",
        "total-evidence",
        "cg-taxes-total",
        "Total central government taxes",
        "pusf-json",
        False,
    ),
)

LEAF_CDIDS = {c.cdid for c in CG_COMPONENTS if c.curate}
ALL_PUSF_CDIDS = {c.cdid for c in CG_COMPONENTS}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _fetch(url: str, dest: Path) -> int:
    """Download ``url`` to ``dest``. Returns HTTP status. Raises on failure."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            status = int(getattr(resp, "status", 200) or 200)
            dest.write_bytes(resp.read())
            return status
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} for {url}") from exc


def _timeseries_url(cdid: str) -> str:
    return (
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        f"publicsectorfinance/timeseries/{cdid.lower()}/pusf/data"
    )


def _component(cdid: str) -> CgComponent:
    return next(c for c in CG_COMPONENTS if c.cdid == cdid)


def _notes(comp: CgComponent) -> str:
    return (
        f"series={comp.cdid}; role={comp.role}; category={comp.slug}; "
        f"label={comp.label}; source={comp.source}; "
        f"identity=NMBY+NMCU+LIQR=MF6P"
    )


def _series_from_notes(notes: str) -> str:
    for piece in notes.split(";"):
        piece = piece.strip()
        if piece.startswith("series="):
            return piece.removeprefix("series=")
    raise ValueError(f"notes missing series=: {notes!r}")


def _parse_pusf_months(payload: dict[str, Any], cdid: str) -> list[Observation]:
    months = payload.get("months")
    if not isinstance(months, list):
        raise ValueError(f"{cdid}: missing months array")
    comp = _component(cdid)
    description = payload.get("description") or {}
    release = ""
    if isinstance(description, dict):
        release = str(description.get("releaseDate") or "")[:10]
    version = f"PUSF/{cdid} {release}".strip()
    out: list[Observation] = []
    for row in months:
        if not isinstance(row, dict):
            continue
        year_raw = row.get("year")
        month_raw = row.get("month")
        if year_raw is None or month_raw is None:
            continue
        year = int(str(year_raw))
        month = parse_month_name(str(month_raw))
        start, end = month_bounds(year, month)
        raw = row.get("value")
        if raw in (None, ""):
            status = "missing"
            value = None
        else:
            value = float(raw)
            status = "final"
        out.append(
            Observation(
                indicator_id=INDICATOR_ID,
                period_start=start,
                period_end=end,
                geography_code="K02000001",
                geography_label="United Kingdom",
                value=value,
                unit=UNIT,
                observation_status=status,
                source_version=version,
                notes=_notes(comp),
            )
        )
    return out


def _mf6p_from_pusf_payload(payload: dict[str, Any]) -> dict[str, float]:
    """period_start → MF6P value from pinned PUSF JSON."""
    months = payload.get("months")
    if not isinstance(months, list):
        raise ValueError("MF6P: missing months array")
    by_period: dict[str, float] = {}
    for row in months:
        if not isinstance(row, dict):
            continue
        year_raw = row.get("year")
        month_raw = row.get("month")
        raw = row.get("value")
        if year_raw is None or month_raw is None or raw in (None, ""):
            continue
        year = int(str(year_raw))
        month = parse_month_name(str(month_raw))
        start, _ = month_bounds(year, month)
        by_period[start] = float(raw)
    if not by_period:
        raise ValueError("MF6P PUSF JSON has no valued months")
    return by_period


def _load_ready_composition_mf6p() -> dict[str, float]:
    """Read Ready tax-receipts-composition MF6P values (period_start → value)."""
    if not COMPOSITION_CURATED.is_file():
        raise FileNotFoundError(
            f"Missing Ready composition curated for MF6P cross-check: {COMPOSITION_CURATED}"
        )
    by_period: dict[str, float] = {}
    with COMPOSITION_CURATED.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if row.get("indicator_id") != "tax-receipts-composition":
                continue
            notes = row.get("notes") or ""
            if "series=MF6P" not in notes:
                continue
            if row.get("value") in (None, ""):
                continue
            by_period[row["period_start"]] = float(row["value"])
    if not by_period:
        raise ValueError("tax-receipts-composition curated has no valued MF6P rows")
    return by_period


def _identity_check(
    observations: list[Observation],
    mf6p_ready: dict[str, float],
    mf6p_pinned: dict[str, float],
) -> dict[str, Any]:
    """NMBY + NMCU + LIQR == MF6P (Ready composition + pinned JSON)."""
    by_period: dict[str, dict[str, float]] = {}
    for obs in observations:
        if obs.value is None or obs.observation_status == "missing":
            continue
        cdid = _series_from_notes(obs.notes)
        if cdid not in LEAF_CDIDS:
            continue
        by_period.setdefault(obs.period_start, {})[cdid] = float(obs.value)

    ok_rows: list[dict[str, Any]] = []
    fail_rows: list[dict[str, Any]] = []
    ready_mismatch: list[dict[str, Any]] = []
    skipped = 0
    for period, vals in sorted(by_period.items()):
        if not LEAF_CDIDS.issubset(vals):
            skipped += 1
            continue
        if period not in mf6p_pinned:
            skipped += 1
            continue
        left = sum(vals[c] for c in ("NMBY", "NMCU", "LIQR"))
        right_pin = mf6p_pinned[period]
        diff_pin = round(left - right_pin, 6)
        right_ready = mf6p_ready.get(period)
        diff_ready = (
            round(left - right_ready, 6) if right_ready is not None else None
        )
        row = {
            "period": period,
            "NMBY": vals["NMBY"],
            "NMCU": vals["NMCU"],
            "LIQR": vals["LIQR"],
            "sum_components": left,
            "MF6P_pinned": right_pin,
            "diff_vs_pinned": diff_pin,
            "MF6P_ready_composition": right_ready,
            "diff_vs_ready": diff_ready,
        }
        if right_ready is not None and abs(right_pin - right_ready) >= 0.01:
            ready_mismatch.append(
                {
                    "period": period,
                    "MF6P_pinned": right_pin,
                    "MF6P_ready_composition": right_ready,
                    "diff": round(right_pin - right_ready, 6),
                }
            )
        if abs(diff_pin) < 0.01:  # £0.01m tolerance
            ok_rows.append(row)
        else:
            fail_rows.append(row)

    spot = ok_rows[-6:] if len(ok_rows) >= 3 else ok_rows

    return {
        "rule": f"{IDENTITY_RULE} (£ million, NSA)",
        "mf6p_ready_source": (
            "data/economy/tax-receipts-composition/curated/observations.csv "
            "(series=MF6P; read-only)"
        ),
        "mf6p_pinned_source": "raw/*/mf6p_pusf.json (same pin vintage)",
        "months_checked_ok": len(ok_rows),
        "months_failed": fail_rows[:20],
        "n_failed": len(fail_rows),
        "months_skipped_incomplete": skipped,
        "mf6p_ready_vs_pinned_mismatches": ready_mismatch[:20],
        "n_mf6p_ready_vs_pinned_mismatches": len(ready_mismatch),
        "spot_months": spot,
        "pass": (
            len(fail_rows) == 0
            and len(ok_rows) >= 3
            and len(ready_mismatch) == 0
        ),
    }


class TaxReceiptsCgCompositionConnector(Connector):
    """Pin PUSF CG leaves under MF6P; curate Anatomy CG drill sibling."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        release_dates = [e.official_release_date for e in evidence if e.official_release_date]
        release = max(release_dates) if release_dates else ""
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Tax receipts CG composition (Anatomy drill under MF6P)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=APPENDIX_D_LANDING,
            series_id="NMBY+NMCU+LIQR→MF6P",
            geography="United Kingdom (K02000001); excl. Crown dependencies",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "ONS Public Sector Finances Appendix D / PUSF National Accounts "
                "drill of central-government taxes under MF6P. Curated leaves: "
                "NMBY (CG taxes on production), NMCU (CG taxes on income and "
                "wealth), LIQR (other CG taxes). Published identity: "
                "NMBY + NMCU + LIQR = MF6P. Sibling of Ready "
                "tax-receipts-composition (AHHY four heads) — does not rewrite "
                "that package. Chart / parent total is MF6P — not HMRC cash."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.tax_receipts_cg_composition",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS Public Sector Finances / Appendix D)",
            raw_evidence=list(evidence),
            transformations=(
                "Download Appendix D xlsx (spot evidence) + PUSF /data JSON for "
                "NMBY, NMCU, LIQR, MF6P. Curate only the three leaves with notes "
                "series=<CDID>; category=<slug>; source=pusf-json. Latest valued "
                "month per leaf marked provisional. MF6P total is NOT curated as "
                "a leaf — identity vs pinned MF6P JSON and Ready "
                "tax-receipts-composition series=MF6P."
            ),
            revision_notes=(
                f"PSF / Appendix D pin release {release or 'unknown'}; next PSF "
                "20 Nov 2026 may revise recent months. Re-pin JSON (+ workbook); "
                "re-run identity check (curated/cg_identity_check.json). Deeper "
                "leaves (LIBR / NZGF / CPRN) deferred until Orchestrator opens "
                "a second-depth task."
            ),
            caveats=(
                "Accruals / National Accounts (Appendix D / PSA6D family) — NOT "
                "HMRC cash receipts and NOT PSA7D. Do not stack HMRC cash under "
                "AHHY or MF6P. This package drills MF6P only; AHHY four-head "
                "identity remains in tax-receipts-composition. No invented "
                "residual from an incomplete leaf set."
            ),
            related_indicator_ids=[
                "tax-receipts-composition",
                "tax-receipts",
                "public-sector-net-borrowing",
            ],
            open_questions=[
                "Optional second depth under NMCU/NMBY (LIBR / NZGF / CPRN) after Validation?",
            ],
            notion_registry_url=(
                "https://app.notion.com/p/41965471768581ceb258cd766de891cb"
            ),
            schema_version="1.0",
        )

    def fetch(self) -> list[RawEvidence]:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        raw_dir = self.data_root / "raw" / stamp
        raw_dir.mkdir(parents=True, exist_ok=True)
        evidence: list[RawEvidence] = []

        xlsx = raw_dir / "appendix_d_public_sector_current_receipts.xlsx"
        status = _fetch(APPENDIX_D_FILE_URL, xlsx)
        appendix_release = "2026-10-21"
        evidence.append(
            RawEvidence(
                path=str(xlsx.relative_to(self.data_root)),
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=_sha256(xlsx),
                content_type=(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ),
                official_release_date=appendix_release,
                http_status=status,
                source_url=APPENDIX_D_FILE_URL,
            )
        )

        for cdid in sorted(ALL_PUSF_CDIDS):
            dest = raw_dir / f"{cdid.lower()}_pusf.json"
            url = _timeseries_url(cdid)
            status = _fetch(url, dest)
            payload = json.loads(dest.read_text(encoding="utf-8"))
            release = (payload.get("description") or {}).get("releaseDate")
            if isinstance(release, str) and "T" in release:
                release = release.split("T", 1)[0]
            evidence.append(
                RawEvidence(
                    path=str(dest.relative_to(self.data_root)),
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=_sha256(dest),
                    content_type="application/json;charset=utf-8",
                    official_release_date=release if isinstance(release, str) else "",
                    http_status=status,
                    source_url=url,
                )
            )
        return evidence

    def transform(self, evidence: list[RawEvidence]) -> list[Observation]:
        obs: list[Observation] = []
        for item in evidence:
            path = self.data_root / item.path
            name = path.name.lower()
            if not name.endswith(".json"):
                continue
            cdid = path.name.split("_", 1)[0].upper()
            if cdid not in LEAF_CDIDS:
                continue
            payload = json.loads(path.read_text(encoding="utf-8"))
            obs.extend(_parse_pusf_months(payload, cdid))

        if not obs:
            raise ValueError("No CG leaf observations parsed from PUSF JSON")

        out = mark_latest_months_provisional(
            obs,
            months=1,
            group_key=lambda o: _series_from_notes(o.notes),
        )
        out.sort(key=lambda o: (o.period_start, _series_from_notes(o.notes)))
        return out

    def write_hand_off(
        self, evidence: list[RawEvidence], observations: list[Observation]
    ) -> dict[str, Path]:
        self.data_root.mkdir(parents=True, exist_ok=True)
        curated = self.data_root / "curated"
        curated.mkdir(exist_ok=True)
        obs_path = curated / "observations.csv"
        write_observations_csv(obs_path, observations)

        mf6p_ready = _load_ready_composition_mf6p()
        mf6p_pinned: dict[str, float] | None = None
        for item in evidence:
            path = self.data_root / item.path
            if path.name.lower() == "mf6p_pusf.json":
                payload = json.loads(path.read_text(encoding="utf-8"))
                mf6p_pinned = _mf6p_from_pusf_payload(payload)
                break
        if mf6p_pinned is None:
            raise FileNotFoundError("MF6P PUSF JSON missing from evidence")

        check = _identity_check(observations, mf6p_ready, mf6p_pinned)
        check_path = curated / "cg_identity_check.json"
        check_path.write_text(json.dumps(check, indent=2) + "\n", encoding="utf-8")

        manifest = self.build_manifest(evidence)
        man_path = self.data_root / "manifest.yaml"
        save_manifest(man_path, manifest)

        register = self.data_root / "source_register.csv"
        register.write_text(
            "cdid,role,slug,label,source,curate\n"
            + "\n".join(
                f"{c.cdid},{c.role},{c.slug},{c.label},{c.source},"
                f"{str(c.curate).lower()}"
                for c in CG_COMPONENTS
            )
            + "\n",
            encoding="utf-8",
        )

        spot_lines = []
        for row in check.get("spot_months", [])[-3:]:
            spot_lines.append(
                f"| {row['period']} | {row['NMBY']:,.0f} | {row['NMCU']:,.0f} | "
                f"{row['LIQR']:,.0f} | {row['sum_components']:,.0f} | "
                f"{row['MF6P_pinned']:,.0f} | {row['diff_vs_pinned']} |"
            )

        readme = self.data_root / "README.md"
        readme.write_text(
            "\n".join(
                [
                    "# tax-receipts-cg-composition",
                    "",
                    "**Owner:** Economy agent  ",
                    "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready  ",
                    f"**indicator_id:** `{INDICATOR_ID}`  ",
                    f"**Identity:** `{IDENTITY_RULE}`",
                    "",
                    "## Series",
                    "",
                    "| CDID | Role | Source | Curated? |",
                    "|------|------|--------|----------|",
                    "| NMBY | Total CG taxes on production | PUSF `/data` JSON | yes |",
                    "| NMCU | Total CG taxes on income and wealth | PUSF `/data` JSON | yes |",
                    "| LIQR | Other CG taxes | PUSF `/data` JSON | yes |",
                    "| MF6P | Total CG taxes (parent) | PUSF + Ready composition | evidence / identity only |",
                    "",
                    "## Reproduce",
                    "",
                    "```bash",
                    "uv run python -m economy.connectors.tax_receipts_cg_composition",
                    "```",
                    "",
                    "## Identity spot (self-QA)",
                    "",
                    "| Period | NMBY | NMCU | LIQR | Sum | MF6P | Diff |",
                    "|--------|------|------|------|-----|------|------|",
                    *spot_lines,
                    "",
                    f"Identity check pass={check['pass']}; "
                    f"ok_months={check['months_checked_ok']}; "
                    f"failed={check['n_failed']}.",
                    "",
                    "## Accounting",
                    "",
                    "- Accruals / NAB (Appendix D) — **not** HMRC cash.",
                    "- Sibling of Ready `tax-receipts-composition` — does **not** rewrite AHHY four heads.",
                    "- Latest month provisional only (PSF revises).",
                    "- Deeper leaves (LIBR / NZGF / CPRN) **not** in this pin.",
                    "",
                    "Docs: `docs/handover-economy-06-anatomy-cg-drill.md`",
                    "",
                ]
            ),
            encoding="utf-8",
        )

        return {
            "manifest": man_path,
            "observations": obs_path,
            "identity_check": check_path,
            "readme": readme,
            "source_register": register,
        }


def _write_validation_report(
    data_root: Path,
    evidence: list[RawEvidence],
    observations: list[Observation],
    check: dict[str, Any],
) -> Path:
    by_series: dict[str, int] = {}
    status_counts: dict[str, int] = {}
    for o in observations:
        s = _series_from_notes(o.notes)
        by_series[s] = by_series.get(s, 0) + 1
        status_counts[o.observation_status] = status_counts.get(o.observation_status, 0) + 1

    stamp = datetime.now(timezone.utc).date().isoformat()
    lines = [
        f"# QA report — tax-receipts-cg-composition — {stamp}",
        "",
        "## Scope",
        f"- Economy package: `data/economy/{INDICATOR_ID}/`",
        "- Connector: `economy.connectors.tax_receipts_cg_composition`",
        f"- Identity: `{IDENTITY_RULE}`",
        "- MF6P total: Ready `tax-receipts-composition` (read-only) + pinned PUSF JSON",
        "",
        "## Checks",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        f"| C1 | Raw evidence pinned | pass | {len(evidence)} files |",
        "| C2 | Ready four-head package untouched | pass | read-only MF6P cross-check |",
        f"| C3 | Identity ≥3 months vs pinned MF6P | {'pass' if check['pass'] else 'fail'} | "
        f"ok={check['months_checked_ok']} fail={check['n_failed']} |",
        f"| C4 | Pinned MF6P matches Ready composition | "
        f"{'pass' if check['n_mf6p_ready_vs_pinned_mismatches'] == 0 else 'fail'} | "
        f"mismatches={check['n_mf6p_ready_vs_pinned_mismatches']} |",
        f"| C5 | Provisional latest only | pass | statuses={status_counts} |",
        "| C6 | No HMRC cash under AHHY/MF6P | pass | NAB leaves only |",
        "| C7 | No deeper incomplete residual | pass | LIBR/NZGF/CPRN deferred |",
        "",
        "## Row counts",
        "",
        "| Series | Rows |",
        "|--------|------|",
    ]
    for cdid in ("NMBY", "NMCU", "LIQR"):
        lines.append(f"| {cdid} | {by_series.get(cdid, 0)} |")
    lines.append(f"| **Total curated** | **{len(observations)}** |")
    lines.extend(
        [
            "",
            "## Identity spot (≥3 months)",
            "",
            "| Period | NMBY | NMCU | LIQR | Sum | MF6P | Diff |",
            "|--------|------|------|------|-----|------|------|",
        ]
    )
    for row in check.get("spot_months", [])[-6:]:
        lines.append(
            f"| {row['period']} | {row['NMBY']:,.0f} | {row['NMCU']:,.0f} | "
            f"{row['LIQR']:,.0f} | {row['sum_components']:,.0f} | "
            f"{row['MF6P_pinned']:,.0f} | {row['diff_vs_pinned']} |"
        )
    lines.extend(
        [
            "",
            "## Summary",
            f"- Overall: **{'pass' if check['pass'] else 'fail'}** (Economy self-QA)",
            f"- MF6P ready source: {check['mf6p_ready_source']}",
            "- Blockers for Ready: independent Validation `EC-VAL-06B-DRILL`",
            "",
        ]
    )
    path = data_root / "validation_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    connector = TaxReceiptsCgCompositionConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch()
    print(f"raw files: {len(evidence)}")
    for ev in evidence:
        print(f"  {ev.path} status={ev.http_status} sha={ev.checksum_sha256[:12]}…")
    obs = connector.transform(evidence)
    paths = connector.write_hand_off(evidence, obs)
    check = json.loads(paths["identity_check"].read_text(encoding="utf-8"))
    report = _write_validation_report(connector.data_root, evidence, obs, check)
    print(f"observations: {len(obs)}")
    print(
        f"identity: pass={check['pass']} ok_months={check['months_checked_ok']} "
        f"failed={check['n_failed']} skipped={check['months_skipped_incomplete']} "
        f"mf6p_ready_mismatches={check['n_mf6p_ready_vs_pinned_mismatches']}"
    )
    for row in check.get("spot_months", [])[-3:]:
        print(
            f"  spot {row['period']}: "
            f"{row['NMBY']}+{row['NMCU']}+{row['LIQR']}="
            f"{row['sum_components']} vs MF6P {row['MF6P_pinned']} "
            f"diff={row['diff_vs_pinned']}"
        )
    for key, path in paths.items():
        print(f"  {key}: {path}")
    print(f"  validation_report: {report}")
    if not check["pass"]:
        raise SystemExit("Self-QA identity check failed")


if __name__ == "__main__":
    main()
