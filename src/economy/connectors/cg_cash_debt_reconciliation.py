"""ONS Appendix A REC3 — CG net cash requirement ↔ change in CG net debt.

Evidence package for Domain 08 Borrowing Machine **data readiness**.
This is **not** a public-sector PSNB→PSND bridge (see rejected QA 2026-11-14).

Approach (beginner-friendly):
1. Pin the Appendix A workbook (REC3 table source).
2. Download each REC3 CDID timeseries JSON from ONS PUSF.
3. Curate monthly observations with ``series=<CDID>`` notes.
4. Self-check: for months where every component is valued, sum(LHS+adj) == MW4W.

Best practices: pathlib, type hints, fail loudly — never invent residuals.
Refs: https://docs.python.org/3/library/pathlib.html · typing docs · PEP 8.
"""

from __future__ import annotations

import hashlib
import json
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

INDICATOR_ID = "cg-cash-debt-reconciliation"
UA = "BritishExchange-Economy/1.0 (+https://britishexchange.org)"
APPENDIX_A_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/governmentpublicsectorandtaxes/"
    "publicsectorfinance/datasets/publicsectorfinancesappendixatables110/current/"
    "publicsectorfinancessummarytablesappendixafinal.xlsx"
)
APPENDIX_A_LANDING = (
    "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
    "publicsectorfinance/datasets/publicsectorfinancesappendixatables110/current"
)


@dataclass(frozen=True, slots=True)
class Rec3Component:
    """One column of Appendix A REC3."""

    cdid: str
    role: str  # lhs | adj | rhs
    slug: str
    label: str


# Order matches Appendix A REC3 columns (identity: sum all but rhs == rhs).
REC3_COMPONENTS: tuple[Rec3Component, ...] = (
    Rec3Component(
        "M98R",
        "lhs",
        "cgncr-ex-ukar-nr",
        "CG net cash requirement (exc NRAM/B&B, Network Rail)",
    ),
    Rec3Component("LSIW", "adj", "adj-gilt-premia", "Net premia/discounts of gilt issuances"),
    Rec3Component("MW7L", "adj", "adj-il-gilt-uplift", "Index-linked gilt capital uplift"),
    Rec3Component("E3VL", "adj", "adj-other-gilt", "Other gilt-related adjustments"),
    Rec3Component(
        "E3VM", "adj", "adj-reclass-imputed", "Reclassifications and imputed liabilities"
    ),
    Rec3Component("N42A", "adj", "adj-official-reserves", "Revaluation of official reserves"),
    Rec3Component("E3VX", "adj", "adj-reserves-sdr", "Official reserves SDRs"),
    Rec3Component("N42C", "adj", "adj-national-savings", "National savings and tax instruments"),
    Rec3Component("N42E", "adj", "adj-debt-management-account", "Debt management account"),
    Rec3Component("N42F", "adj", "adj-foreign-currency", "Other foreign currency revaluation"),
    Rec3Component("E3VY", "adj", "adj-other-sterling-debt", "Other sterling debt"),
    Rec3Component("E3VZ", "adj", "adj-other-liquid-assets", "Other liquid assets"),
    Rec3Component("N42H", "adj", "adj-other", "Other adjustments"),
    Rec3Component(
        "MW4W",
        "rhs",
        "cg-change-in-net-debt-ex-ukar-nr",
        "Changes in CG net debt (exc NRAM/B&B, Network Rail)",
    ),
)

RHS_CDID = "MW4W"
LHS_ADJ_CDIDS = {c.cdid for c in REC3_COMPONENTS if c.role != "rhs"}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def _timeseries_url(cdid: str) -> str:
    return (
        "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/"
        f"publicsectorfinance/timeseries/{cdid.lower()}/pusf/data"
    )


def _parse_months(payload: dict[str, Any], cdid: str, unit: str) -> list[Observation]:
    months = payload.get("months")
    if not isinstance(months, list):
        raise ValueError(f"{cdid}: missing months array")
    comp = next(c for c in REC3_COMPONENTS if c.cdid == cdid)
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
                unit=unit,
                observation_status=status,
                source_version=f"PUSF/{cdid}",
                notes=(
                    f"series={cdid}; role={comp.role}; slug={comp.slug}; "
                    f"label={comp.label}; table=REC3"
                ),
            )
        )
    return out


class CgCashDebtReconciliationConnector(Connector):
    """Pin Appendix A + REC3 CDIDs; curate multi-series monthly observations."""

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
            title="Central government cash requirement to change in net debt (REC3)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=APPENDIX_A_LANDING,
            series_id="REC3",
            geography=(
                "United Kingdom (K02000001); central government "
                "(ex NRAM/B&B, Network Rail)"
            ),
            frequency="monthly",
            unit="£ million, NSA",
            definition=(
                "ONS Public Sector Finances Appendix A table REC3: central government "
                "net cash requirement excluding NRAM/B&B and Network Rail (M98R), plus "
                "named reconciliation adjustments, equals changes in central government "
                "net debt with the same exclusions (MW4W). Not public-sector net "
                "borrowing (DZLS) and not public-sector net debt (HF6W)."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.cg_cash_debt_reconciliation",
            curated_path="curated/observations.csv",
            update_cadence="monthly (ONS Public Sector Finances)",
            raw_evidence=list(evidence),
            transformations=(
                "Download Appendix A xlsx + each REC3 CDID /data JSON. Keep months "
                "only. Notes: series=<CDID>; role=lhs|adj|rhs. Latest valued month "
                "per CDID marked provisional."
            ),
            revision_notes=(
                f"PSF release pin {release or 'unknown'}; re-pin after next bulletin. "
                "Re-check REC3 identity from curated (rec3_identity_check.json)."
            ),
            caveats=(
                "Central government only. Cash requirement ≠ accruals borrowing. "
                "Do not present as a public-sector Borrowing Machine or invent a "
                "balancing item for HF6W−sum(DZLS)."
            ),
            related_indicator_ids=[
                "public-sector-net-debt",
                "public-sector-net-borrowing",
                "public-sector-debt-interest",
                "public-sector-net-debt-percent-gdp",
            ],
            open_questions=[
                "Orchestrator: approve stable indicator_id cg-cash-debt-reconciliation?",
                "Separate CG cash/debt explorer vs keep evidence-only?",
            ],
            notion_registry_url="",
            schema_version="1.0",
        )

    def fetch(self) -> list[RawEvidence]:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        raw_dir = self.data_root / "raw" / stamp
        raw_dir.mkdir(parents=True, exist_ok=True)
        evidence: list[RawEvidence] = []

        xlsx = raw_dir / "appendix_a_rec3_source.xlsx"
        _fetch(APPENDIX_A_URL, xlsx)
        evidence.append(
            RawEvidence(
                path=str(xlsx.relative_to(self.data_root)),
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=_sha256(xlsx),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    official_release_date="",
                    http_status=200,
                    source_url=APPENDIX_A_URL,
                )
            )

        for comp in REC3_COMPONENTS:
            dest = raw_dir / f"{comp.cdid.lower()}_pusf.json"
            url = _timeseries_url(comp.cdid)
            _fetch(url, dest)
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
                    http_status=200,
                    source_url=url,
                )
            )
        return evidence

    def transform(self, evidence: list[RawEvidence]) -> list[Observation]:
        obs: list[Observation] = []
        for item in evidence:
            path = self.data_root / item.path
            if not path.name.endswith(".json"):
                continue
            cdid = path.name.split("_", 1)[0].upper()
            payload = json.loads(path.read_text(encoding="utf-8"))
            unit_out = "£ million, NSA (CG REC3)"
            obs.extend(_parse_months(payload, cdid, unit_out))
        # Latest month provisional per CDID (PSF revises recent months)
        out = mark_latest_months_provisional(
            obs,
            months=1,
            group_key=lambda o: o.notes.split(";", 1)[0].removeprefix("series="),
        )
        out.sort(key=lambda o: (o.period_start, o.notes))
        return out

    def write_hand_off(
        self, evidence: list[RawEvidence], observations: list[Observation]
    ) -> dict[str, Path]:
        self.data_root.mkdir(parents=True, exist_ok=True)
        curated = self.data_root / "curated"
        curated.mkdir(exist_ok=True)
        obs_path = curated / "observations.csv"
        write_observations_csv(obs_path, observations)

        # Identity self-check on final months (diagnostic; Validation owns Ready).
        check_path = curated / "rec3_identity_check.json"
        check_path.write_text(
            json.dumps(_identity_check(observations), indent=2) + "\n",
            encoding="utf-8",
        )

        manifest = self.build_manifest(evidence)
        man_path = self.data_root / "manifest.yaml"
        save_manifest(man_path, manifest)

        readme = self.data_root / "README.md"
        readme.write_text(
            "\n".join(
                [
                    "# Central government cash ↔ debt change (REC3)",
                    "",
                    "Evidence package for Domain 08. **Not** PSNB→PSND.",
                    "",
                    "Docs: `docs/economy-08-borrowing-machine-source-matrix.md`",
                    "Decision: `docs/economy-08-borrowing-machine-decision-memo.md`",
                    "",
                    "Reproduce:",
                    "",
                    "```bash",
                    "uv run python -m economy.connectors.cg_cash_debt_reconciliation",
                    "```",
                    "",
                ]
            ),
            encoding="utf-8",
        )

        # Optional copy of source register
        register = self.data_root / "source_register.csv"
        register.write_text(
            "cdid,role,slug,label\n"
            + "\n".join(
                f"{c.cdid},{c.role},{c.slug},{c.label}" for c in REC3_COMPONENTS
            )
            + "\n",
            encoding="utf-8",
        )

        return {
            "manifest": man_path,
            "observations": obs_path,
            "identity_check": check_path,
            "readme": readme,
        }


# Appendix A REC3 monthly rows themselves do not balance before 2000-04
# (checked 2026-11-14 against the Oct 2026 workbook). Annual/FY rows do.
# Trust the identity for product use from this month onward.
REC3_MONTHLY_TRUST_FROM = "2000-04-01"


def _identity_check(observations: list[Observation]) -> dict[str, Any]:
    """Sum lhs+adj vs rhs for final months with full component coverage."""
    by_period: dict[str, dict[str, float]] = {}
    for o in observations:
        if o.observation_status != "final" or o.value is None:
            continue
        cdid = o.notes.split(";", 1)[0].removeprefix("series=")
        by_period.setdefault(o.period_start, {})[cdid] = float(o.value)

    ok = 0
    fail: list[dict[str, Any]] = []
    fail_pre_trust: list[dict[str, Any]] = []
    skipped = 0
    for period, vals in sorted(by_period.items()):
        if RHS_CDID not in vals or not LHS_ADJ_CDIDS.issubset(vals):
            skipped += 1
            continue
        left = sum(vals[c] for c in LHS_ADJ_CDIDS)
        right = vals[RHS_CDID]
        diff = round(left - right, 6)
        row = {"period": period, "sum_lhs_adj": left, "mw4w": right, "diff": diff}
        if abs(diff) < 0.01:  # £0.01m tolerance
            ok += 1
        elif period < REC3_MONTHLY_TRUST_FROM:
            fail_pre_trust.append(row)
        else:
            fail.append(row)

    return {
        "rule": "sum(M98R + adjustments) == MW4W (£ million)",
        "monthly_trust_from": REC3_MONTHLY_TRUST_FROM,
        "note": (
            "Pre-2000-04 monthly gaps also appear in the official Appendix A "
            "REC3 workbook; annual/FY REC3 rows still balance. Do not treat "
            "pre-trust monthly failures as connector bugs."
        ),
        "months_checked_ok": ok,
        "months_failed_from_trust": fail[:20],
        "n_failed_from_trust": len(fail),
        "months_failed_pre_trust_official_gap": fail_pre_trust[:20],
        "n_failed_pre_trust": len(fail_pre_trust),
        "months_skipped_incomplete": skipped,
        "pass": len(fail) == 0 and ok > 0,
    }


def main() -> None:
    connector = CgCashDebtReconciliationConnector()
    print(f"fetch → {connector.data_root}")
    evidence = connector.fetch()
    print(f"raw files: {len(evidence)}")
    obs = connector.transform(evidence)
    paths = connector.write_hand_off(evidence, obs)
    check = json.loads(paths["identity_check"].read_text(encoding="utf-8"))
    print(f"observations: {len(obs)}")
    print(
        f"identity: pass={check['pass']} ok_months={check['months_checked_ok']} "
        f"failed={check['n_failed']} skipped={check['months_skipped_incomplete']}"
    )
    for key, path in paths.items():
        print(f"  {key}: {path}")


if __name__ == "__main__":
    main()
