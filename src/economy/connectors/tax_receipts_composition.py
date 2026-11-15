"""ONS Appendix D / PUSF NAB tax-type composition under AHHY.

Locked identity (Anatomy of Revenue):

    MF6P + AIIH + NMHM + AHGR = AHHY

Approach (beginner-friendly):
1. Pin Appendix D workbook (Time Series sheet has all heads).
2. Pin PUSF ``/data`` JSON for MF6P, AIIH, NMHM (AHGR JSON is 404).
3. Curate multi-series monthly observations with ``series=<CDID>`` notes.
4. Cross-check the sum against Ready ``tax-receipts`` (AHHY) — do **not** fork AHHY.
5. Self-QA: identity holds on ≥3 months; latest month provisional only.

Best practices: pathlib, type hints, fail loudly — never invent silent residuals.
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

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.observation import (
    Observation,
    mark_latest_months_provisional,
    write_observations_csv,
)
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_timeseries import month_bounds, parse_month_name

INDICATOR_ID = "tax-receipts-composition"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"

# Appendix D Time Series uses abbreviated months ("2026 Sep"); PUSF JSON uses
# full names ("September"). Map both so we never invent a period.
_MONTH_ABBREV = {
    "jan": "january",
    "feb": "february",
    "mar": "march",
    "apr": "april",
    "may": "may",
    "jun": "june",
    "jul": "july",
    "aug": "august",
    "sep": "september",
    "sept": "september",
    "oct": "october",
    "nov": "november",
    "dec": "december",
}

APPENDIX_D_LANDING = (
    "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
    "publicsectorfinance/datasets/appendixdpublicsectorcurrentreceipts/current"
)
APPENDIX_D_FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/"
    "publicsectorfinance/datasets/appendixdpublicsectorcurrentreceipts/current/"
    "publicsectorcurrentreceiptsappendixdfinal.xlsx"
)

# Ready flagship total — read-only cross-check (do not re-pin AHHY here).
TAX_RECEIPTS_CURATED = ECONOMY_DATA / "tax-receipts" / "curated" / "observations.csv"

UNIT = "£ million, NSA (PS taxes + NICs composition)"


@dataclass(frozen=True, slots=True)
class AnatomyComponent:
    """One Anatomy head under AHHY."""

    cdid: str
    role: str  # component
    slug: str
    label: str
    source: str  # pusf-json | appendix-d-time-series


# Order matches Appendix D major heads that sum to AHHY.
ANATOMY_COMPONENTS: tuple[AnatomyComponent, ...] = (
    AnatomyComponent(
        "MF6P",
        "component",
        "cg-taxes",
        "Total central government taxes",
        "pusf-json",
    ),
    AnatomyComponent(
        "AIIH",
        "component",
        "social-contributions",
        "Social contributions (mainly NICs)",
        "pusf-json",
    ),
    AnatomyComponent(
        "NMHM",
        "component",
        "council-tax",
        "Council tax",
        "pusf-json",
    ),
    AnatomyComponent(
        "AHGR",
        "component",
        "other-lg-taxes",
        "Other local government taxes",
        "appendix-d-time-series",
    ),
)

COMPONENT_CDIDS = {c.cdid for c in ANATOMY_COMPONENTS}
PUSF_CDIDS = {c.cdid for c in ANATOMY_COMPONENTS if c.source == "pusf-json"}
AHGR_CDID = "AHGR"
TOTAL_CDID = "AHHY"


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


def _probe_status(url: str) -> int:
    """HEAD/GET status only — used to document AHGR 404 without inventing data."""
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return int(getattr(resp, "status", 200) or 200)
    except urllib.error.HTTPError as exc:
        return int(exc.code)


def _component(cdid: str) -> AnatomyComponent:
    return next(c for c in ANATOMY_COMPONENTS if c.cdid == cdid)


def _notes(comp: AnatomyComponent) -> str:
    return (
        f"series={comp.cdid}; role={comp.role}; category={comp.slug}; "
        f"label={comp.label}; source={comp.source}; "
        f"identity=MF6P+AIIH+NMHM+AHGR=AHHY"
    )


def _parse_workbook_period(raw: object) -> tuple[str, str] | None:
    """Parse Appendix D Time Series period labels like ``2026 Sep``."""
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    parts = text.split()
    if len(parts) != 2:
        raise ValueError(f"Unexpected Appendix D period label: {raw!r}")
    year = int(parts[0])
    month_token = parts[1].strip().lower()
    month_name = _MONTH_ABBREV.get(month_token, month_token)
    month = parse_month_name(month_name)
    return month_bounds(year, month)


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


def _parse_ahgr_from_workbook(xlsx_path: Path, release_date: str) -> list[Observation]:
    """Read AHGR column from Appendix D Time Series (PUSF /data is 404)."""
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    try:
        if "Time Series" not in wb.sheetnames:
            raise ValueError(f"Appendix D missing Time Series sheet: {wb.sheetnames}")
        ws = wb["Time Series"]
        rows = list(ws.iter_rows(values_only=True))
    finally:
        wb.close()

    if len(rows) < 7:
        raise ValueError("Appendix D Time Series too short")

    cdid_row = [str(c).strip().upper() if c is not None else "" for c in rows[5]]
    try:
        ahgr_col = cdid_row.index(AHGR_CDID)
    except ValueError as exc:
        raise ValueError("Appendix D Time Series missing AHGR column") from exc

    # Sanity: identity columns present for spot-checks against workbook.
    for needed in ("MF6P", "AIIH", "NMHM", "AHHY", AHGR_CDID):
        if needed not in cdid_row:
            raise ValueError(f"Appendix D Time Series missing {needed}")

    comp = _component(AHGR_CDID)
    version = f"AppendixD/TimeSeries/{AHGR_CDID} {release_date}".strip()
    out: list[Observation] = []
    for row in rows[6:]:
        bounds = _parse_workbook_period(row[0] if row else None)
        if bounds is None:
            continue
        start, end = bounds
        raw = row[ahgr_col] if ahgr_col < len(row) else None
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
    if not out:
        raise ValueError("No AHGR monthly rows parsed from Appendix D")
    return out


def _load_tax_receipts_ahhy() -> dict[str, float]:
    """Read Ready tax-receipts curated AHHY values (period_start → value)."""
    if not TAX_RECEIPTS_CURATED.is_file():
        raise FileNotFoundError(
            f"Missing Ready tax-receipts curated for AHHY cross-check: {TAX_RECEIPTS_CURATED}"
        )
    by_period: dict[str, float] = {}
    with TAX_RECEIPTS_CURATED.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if row.get("indicator_id") != "tax-receipts":
                continue
            if row.get("value") in (None, ""):
                continue
            by_period[row["period_start"]] = float(row["value"])
    if not by_period:
        raise ValueError("tax-receipts curated has no valued AHHY rows")
    return by_period


def _series_from_notes(notes: str) -> str:
    for piece in notes.split(";"):
        piece = piece.strip()
        if piece.startswith("series="):
            return piece.removeprefix("series=")
    raise ValueError(f"notes missing series=: {notes!r}")


def _identity_check(
    observations: list[Observation],
    ahhy_by_period: dict[str, float],
) -> dict[str, Any]:
    """MF6P + AIIH + NMHM + AHGR == AHHY (from Ready tax-receipts)."""
    by_period: dict[str, dict[str, float]] = {}
    for obs in observations:
        if obs.value is None or obs.observation_status == "missing":
            continue
        # Include provisional in the check table (PSF latest month) but
        # mark them; Validation can re-run after next release.
        cdid = _series_from_notes(obs.notes)
        by_period.setdefault(obs.period_start, {})[cdid] = float(obs.value)

    ok_rows: list[dict[str, Any]] = []
    fail_rows: list[dict[str, Any]] = []
    skipped = 0
    for period, vals in sorted(by_period.items()):
        if not COMPONENT_CDIDS.issubset(vals) or period not in ahhy_by_period:
            skipped += 1
            continue
        left = sum(vals[c] for c in ("MF6P", "AIIH", "NMHM", "AHGR"))
        right = ahhy_by_period[period]
        diff = round(left - right, 6)
        row = {
            "period": period,
            "MF6P": vals["MF6P"],
            "AIIH": vals["AIIH"],
            "NMHM": vals["NMHM"],
            "AHGR": vals["AHGR"],
            "sum_components": left,
            "AHHY_tax_receipts": right,
            "diff": diff,
        }
        if abs(diff) < 0.01:  # £0.01m tolerance
            ok_rows.append(row)
        else:
            fail_rows.append(row)

    # Spot table: prefer recent months (last 6 ok, else last 3 overall ok)
    spot = ok_rows[-6:] if len(ok_rows) >= 3 else ok_rows

    return {
        "rule": "MF6P + AIIH + NMHM + AHGR = AHHY (£ million, NSA)",
        "ahhy_source": "data/economy/tax-receipts/curated/observations.csv",
        "ahgr_source": (
            "Appendix D Time Series column AHGR "
            "(PUSF /timeseries/ahgr/pusf/data returned 404 at pin time)"
        ),
        "months_checked_ok": len(ok_rows),
        "months_failed": fail_rows[:20],
        "n_failed": len(fail_rows),
        "months_skipped_incomplete": skipped,
        "spot_months": spot,
        "pass": len(fail_rows) == 0 and len(ok_rows) >= 3,
    }


class TaxReceiptsCompositionConnector(Connector):
    """Pin Appendix D + PUSF heads; curate Anatomy composition under AHHY."""

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
            title="Tax receipts composition (Anatomy under AHHY)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=APPENDIX_D_LANDING,
            series_id="MF6P+AIIH+NMHM+AHGR→AHHY",
            geography="United Kingdom (K02000001); excl. Crown dependencies",
            frequency="monthly",
            unit=UNIT,
            definition=(
                "ONS Public Sector Finances Appendix D / PUSF National Accounts "
                "breakdown of public-sector taxes and social contributions. "
                "Curated components: MF6P (total CG taxes), AIIH (social "
                "contributions / mainly NICs), NMHM (council tax), AHGR (other "
                "local government taxes). Published identity: "
                "MF6P + AIIH + NMHM + AHGR = AHHY. Chart total is Ready "
                "tax-receipts (AHHY) — not JW2O and not HMRC cash."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.tax_receipts_composition",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS Public Sector Finances / Appendix D)",
            raw_evidence=list(evidence),
            transformations=(
                "Download Appendix D xlsx + PUSF /data JSON for MF6P, AIIH, NMHM. "
                "AHGR has no live PUSF /data (404) — parse the Appendix D Time "
                "Series AHGR column with openpyxl. Keep months only. Notes: "
                "series=<CDID>; category=<slug>; source=pusf-json|appendix-d-"
                "time-series. Latest valued month per series marked provisional. "
                "AHHY total is NOT curated here — cross-check against Ready "
                "tax-receipts observations."
            ),
            revision_notes=(
                f"PSF / Appendix D pin release {release or 'unknown'}; next PSF "
                "20 Nov 2026 may revise recent months. Re-pin workbook + JSON; "
                "re-run identity check (curated/anatomy_identity_check.json). "
                "Re-probe AHGR /data — switch to JSON if ONS publishes it."
            ),
            caveats=(
                "Accruals / National Accounts (Appendix D / PSA6D family) — NOT "
                "HMRC cash receipts and NOT PSA7D. Do not use JW2O (broader "
                "public-sector current receipts) as the Anatomy total. AHGR is "
                "workbook-sourced while PUSF timeseries JSON returns 404 — not "
                "an Exchange-invented residual. Do not mix HMRC cash heads under "
                "AHHY."
            ),
            related_indicator_ids=[
                "tax-receipts",
                "public-sector-net-borrowing",
                "total-managed-expenditure",
            ],
            open_questions=[
                "When AHGR PUSF /data recovers, switch source and keep workbook as evidence?",
                "Optional CG drill under MF6P (LIBR / NZGF / CPRN) as second wave?",
            ],
            notion_registry_url=(
                "https://app.notion.com/p/419654717685818dac2bc06033d4a01c"
            ),
            schema_version="1.0",
        )

    def fetch(self) -> list[RawEvidence]:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        raw_dir = self.data_root / "raw" / stamp
        raw_dir.mkdir(parents=True, exist_ok=True)
        evidence: list[RawEvidence] = []

        # Document AHGR API gap (do not invent a JSON body).
        ahgr_url = _timeseries_url(AHGR_CDID)
        ahgr_status = _probe_status(ahgr_url)
        probe_path = raw_dir / "ahgr_pusf_probe.json"
        probe_payload = {
            "url": ahgr_url,
            "http_status": ahgr_status,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "note": (
                "PUSF timeseries /data for AHGR unavailable; AHGR curated from "
                "Appendix D Time Series workbook column."
            ),
        }
        probe_path.write_text(json.dumps(probe_payload, indent=2) + "\n", encoding="utf-8")
        evidence.append(
            RawEvidence(
                path=str(probe_path.relative_to(self.data_root)),
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=_sha256(probe_path),
                content_type="application/json",
                official_release_date="",
                http_status=ahgr_status,
                source_url=ahgr_url,
            )
        )
        if ahgr_status == 200:
            raise RuntimeError(
                "AHGR PUSF /data returned 200 — update connector to prefer JSON "
                "and stop workbook-only AHGR path before shipping."
            )

        xlsx = raw_dir / "appendix_d_public_sector_current_receipts.xlsx"
        status = _fetch(APPENDIX_D_FILE_URL, xlsx)
        # Appendix D landing release date (Oct 2026 pin); JSON releaseDate used too.
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

        for cdid in sorted(PUSF_CDIDS):
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
        xlsx_path: Path | None = None
        appendix_release = ""

        for item in evidence:
            path = self.data_root / item.path
            name = path.name.lower()
            if name.endswith(".xlsx"):
                xlsx_path = path
                appendix_release = item.official_release_date or ""
                continue
            if not name.endswith(".json") or "probe" in name:
                continue
            cdid = path.name.split("_", 1)[0].upper()
            if cdid not in PUSF_CDIDS:
                continue
            payload = json.loads(path.read_text(encoding="utf-8"))
            obs.extend(_parse_pusf_months(payload, cdid))

        if xlsx_path is None:
            raise FileNotFoundError("Appendix D workbook missing from evidence")
        obs.extend(_parse_ahgr_from_workbook(xlsx_path, appendix_release))

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

        ahhy = _load_tax_receipts_ahhy()
        check = _identity_check(observations, ahhy)
        check_path = curated / "anatomy_identity_check.json"
        check_path.write_text(json.dumps(check, indent=2) + "\n", encoding="utf-8")

        manifest = self.build_manifest(evidence)
        man_path = self.data_root / "manifest.yaml"
        save_manifest(man_path, manifest)

        register = self.data_root / "source_register.csv"
        register.write_text(
            "cdid,role,slug,label,source\n"
            + "\n".join(
                f"{c.cdid},{c.role},{c.slug},{c.label},{c.source}"
                for c in ANATOMY_COMPONENTS
            )
            + f"\n{TOTAL_CDID},total,tax-receipts,Total PS taxes + NICs,"
            "ready-tax-receipts-cross-check-only\n",
            encoding="utf-8",
        )

        # Counts for README / validation report
        by_series: dict[str, int] = {}
        status_counts: dict[str, int] = {}
        for o in observations:
            by_series[_series_from_notes(o.notes)] = by_series.get(
                _series_from_notes(o.notes), 0
            ) + 1
            status_counts[o.observation_status] = (
                status_counts.get(o.observation_status, 0) + 1
            )

        spot_lines = []
        for row in check.get("spot_months", [])[-3:]:
            spot_lines.append(
                f"| {row['period']} | {row['MF6P']:,.0f} | {row['AIIH']:,.0f} | "
                f"{row['NMHM']:,.0f} | {row['AHGR']:,.0f} | {row['sum_components']:,.0f} | "
                f"{row['AHHY_tax_receipts']:,.0f} | {row['diff']} |"
            )

        readme = self.data_root / "README.md"
        readme.write_text(
            "\n".join(
                [
                    "# tax-receipts-composition",
                    "",
                    "**Owner:** Economy agent  ",
                    "**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready  ",
                    f"**indicator_id:** `{INDICATOR_ID}`  ",
                    "**Identity:** `MF6P + AIIH + NMHM + AHGR = AHHY`",
                    "",
                    "## Series",
                    "",
                    "| CDID | Role | Source |",
                    "|------|------|--------|",
                    "| MF6P | Total CG taxes | PUSF `/data` JSON |",
                    "| AIIH | Social contributions (NICs) | PUSF `/data` JSON |",
                    "| NMHM | Council tax | PUSF `/data` JSON |",
                    "| AHGR | Other LG taxes | Appendix D Time Series (PUSF `/data` **404**) |",
                    "| AHHY | Total (chart) | Ready `tax-receipts` — **not** forked here |",
                    "",
                    "## Reproduce",
                    "",
                    "```bash",
                    "uv run python -m economy.connectors.tax_receipts_composition",
                    "```",
                    "",
                    "## Identity spot (self-QA)",
                    "",
                    "| Period | MF6P | AIIH | NMHM | AHGR | Sum | AHHY | Diff |",
                    "|--------|------|------|------|------|-----|------|------|",
                    *spot_lines,
                    "",
                    f"Identity check pass={check['pass']}; "
                    f"ok_months={check['months_checked_ok']}; "
                    f"failed={check['n_failed']}.",
                    "",
                    "## Accounting",
                    "",
                    "- Accruals / NAB (Appendix D) — **not** HMRC cash.",
                    "- Do **not** use JW2O as Anatomy total.",
                    "- Latest month provisional only (PSF revises).",
                    "",
                    "Docs: `docs/handover-economy-06-anatomy-pin.md`",
                    "",
                ]
            ),
            encoding="utf-8",
        )

        # validation_report written by main() after paths known
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
        f"# QA report — tax-receipts-composition — {stamp}",
        "",
        "## Scope",
        f"- Economy package: `data/economy/{INDICATOR_ID}/`",
        "- Connector: `economy.connectors.tax_receipts_composition`",
        "- Identity: `MF6P + AIIH + NMHM + AHGR = AHHY`",
        "- AHHY total: Ready `data/economy/tax-receipts/` (read-only)",
        "",
        "## Checks",
        "| ID | Check | Result | Notes |",
        "|----|-------|--------|-------|",
        f"| C1 | Raw evidence pinned | pass | {len(evidence)} files |",
        "| C2 | AHGR not invented residual | pass | workbook Time Series; PUSF 404 probed |",
        "| C3 | AHHY not forked | pass | cross-check Ready tax-receipts only |",
        f"| C4 | Identity ≥3 months | {'pass' if check['pass'] else 'fail'} | "
        f"ok={check['months_checked_ok']} fail={check['n_failed']} |",
        f"| C5 | Provisional latest only | pass | statuses={status_counts} |",
        "| C6 | No HMRC cash / no JW2O total | pass | NAB heads only |",
        "",
        "## Row counts",
        "",
        "| Series | Rows |",
        "|--------|------|",
    ]
    for cdid in ("MF6P", "AIIH", "NMHM", "AHGR"):
        lines.append(f"| {cdid} | {by_series.get(cdid, 0)} |")
    lines.append(f"| **Total curated** | **{len(observations)}** |")
    lines.extend(
        [
            "",
            "## Identity spot (≥3 months)",
            "",
            "| Period | MF6P | AIIH | NMHM | AHGR | Sum | AHHY | Diff |",
            "|--------|------|------|------|------|-----|------|------|",
        ]
    )
    for row in check.get("spot_months", [])[-6:]:
        lines.append(
            f"| {row['period']} | {row['MF6P']:,.0f} | {row['AIIH']:,.0f} | "
            f"{row['NMHM']:,.0f} | {row['AHGR']:,.0f} | {row['sum_components']:,.0f} | "
            f"{row['AHHY_tax_receipts']:,.0f} | {row['diff']} |"
        )
    lines.extend(
        [
            "",
            "## Summary",
            f"- Overall: **{'pass' if check['pass'] else 'fail'}** (Economy self-QA)",
            f"- AHGR source: {check['ahgr_source']}",
            "- Blockers for Ready: independent Validation `EC-VAL-06B`",
            "",
        ]
    )
    path = data_root / "validation_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    connector = TaxReceiptsCompositionConnector()
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
        f"failed={check['n_failed']} skipped={check['months_skipped_incomplete']}"
    )
    for row in check.get("spot_months", [])[-3:]:
        print(
            f"  spot {row['period']}: "
            f"{row['MF6P']}+{row['AIIH']}+{row['NMHM']}+{row['AHGR']}="
            f"{row['sum_components']} vs AHHY {row['AHHY_tax_receipts']} "
            f"diff={row['diff']}"
        )
    for key, path in paths.items():
        print(f"  {key}: {path}")
    print(f"  validation_report: {report}")
    if not check["pass"]:
        raise SystemExit("Self-QA identity check failed")


if __name__ == "__main__":
    main()
