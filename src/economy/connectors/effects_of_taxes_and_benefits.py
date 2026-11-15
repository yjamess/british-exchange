"""ONS Effects of taxes and benefits — Who Bears the Tax Burden? pin.

Approach (plain language):
1. Download the official ETB reference-tables workbook (FYE 2024 edition).
2. Curate **Table 8** — direct / indirect / all taxes as % of published
   denominators (gross income; disposable income and expenditure for
   **indirect only**, as ONS publishes).
3. Curate **Table 2a** totals — average £/year direct and indirect tax by
   equivalised disposable-income quintile (absolute levels, not shares).
4. Label quintiles, tax class, and denominator in ``notes`` so loaders can
   promote dimensions. Do **not** invent shares or fairness claims.

Best practices: ``pathlib.Path``, type hints, fail loudly
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html, PEP 8).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import openpyxl

from britain_exchange.checksum import sha256_file
from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.ons_workbook import download_ons_file

INDICATOR_ID = "effects-of-taxes-and-benefits"
PIN_DATE = "2026-11-15"
OFFICIAL_RELEASE_DATE = "2025-09-25"
SOURCE_VERSION = "ETB FYE 2024 · released 2025-09-25"

# Financial year ending 2024 = 2023-04-01 … 2024-03-31.
PERIOD_START = "2023-04-01"
PERIOD_END = "2024-03-31"

UK_GEOGRAPHY_CODE = "K02000001"
UK_GEOGRAPHY_LABEL = "United Kingdom"

SOURCE_LANDING_URL = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/incomeandwealth/datasets/"
    "theeffectsoftaxesandbenefitsonhouseholdincomefinancialyearending2014"
)
# Prefer the edition path — the ``/current/`` file URI 404'd on 2026-11-15.
SOURCE_FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/incomeandwealth/datasets/"
    "theeffectsoftaxesandbenefitsonhouseholdincomefinancialyearending2014/"
    "financialyearending2024/etbreferencetablesfye202324final.xlsx"
)
RAW_RELATIVE = f"raw/{PIN_DATE}/etbreferencetablesfye202324final.xlsx"

BULLETIN_URL = (
    "https://www.ons.gov.uk/peoplepopulationandcommunity/"
    "personalandhouseholdfinances/incomeandwealth/bulletins/"
    "theeffectsoftaxesandbenefitsonhouseholdincome/2024"
)

QUINTILE_BANDS: tuple[str, ...] = (
    "Bottom",
    "2nd",
    "3rd",
    "4th",
    "Top",
    "All individuals",
)

# Table 8 headline rows we pin (totals only — not VAT/alcohol components).
# (section_label, tax_class, denominator) — section_label matches col A when set.
TABLE8_TARGETS: tuple[tuple[str | None, str, str], ...] = (
    ("Percentages of gross income", "direct", "gross_income"),
    ("Percentages of gross income", "indirect", "gross_income"),
    ("Percentages of gross income", "all", "gross_income"),
    ("Percentages of disposable income", "indirect", "disposable_income"),
    ("Percentages of expenditure", "indirect", "expenditure"),
)

TAX_CLASS_LABELS = {
    "direct": "Direct taxes",
    "indirect": "Indirect taxes",
    "all": "All taxes",
}

# Spot values for self-QA (Table 8 Bottom quintile + Table 2a Bottom totals).
SELF_QA_SPOTS: dict[str, float] = {
    "t8_bottom_direct_gross": 15.7,
    "t8_bottom_indirect_gross": 21.0,
    "t8_bottom_all_gross": 36.7,
    "t8_bottom_indirect_disposable": 24.9,
    "t8_bottom_indirect_expenditure": 16.5,
    "t8_top_direct_gross": 28.8,
    "t8_top_indirect_gross": 7.5,
    "t2a_bottom_direct_gbp": 3696.0,
    "t2a_bottom_indirect_gbp": 4929.0,
    "t2a_all_direct_gbp": 15743.0,
    "t2a_all_indirect_gbp": 7363.0,
}


def _notes(**parts: str) -> str:
    """Build parseable ``key=value; …`` notes (connector contract)."""
    return "; ".join(f"{k}={v}" for k, v in parts.items())


def _band_slug(band: str) -> str:
    if band == "All individuals":
        return "all"
    if band == "Bottom":
        return "bottom"
    if band == "Top":
        return "top"
    return band.lower()


def _read_header_bands(row: tuple[object, ...] | list[object]) -> list[str]:
    """Map Table 8 / 2a header cells to QUINTILE_BANDS order."""
    cells = [str(c).strip() if c is not None else "" for c in row]
    found: list[str] = []
    for band in QUINTILE_BANDS:
        if band not in cells:
            raise ValueError(f"Missing quintile header {band!r} in {cells}")
        found.append(band)
    return found


def _values_for_bands(
    row: tuple[object, ...] | list[object],
    header: tuple[object, ...] | list[object],
) -> dict[str, float]:
    header_cells = [str(c).strip() if c is not None else "" for c in header]
    out: dict[str, float] = {}
    for band in QUINTILE_BANDS:
        idx = header_cells.index(band)
        raw = row[idx] if idx < len(row) else None
        if raw is None or raw == "" or raw == "..":
            raise ValueError(f"Missing value for band {band!r}")
        out[band] = float(raw)
    return out


def _parse_table8(ws) -> list[Observation]:
    """Taxes as % of gross / disposable / expenditure (publisher-supported only)."""
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise ValueError("Table 8 is empty")
    header_row = rows[3]
    _read_header_bands(header_row)

    current_section: str | None = None
    # tax_class -> (denominator, values_by_band)
    collected: dict[tuple[str, str], dict[str, float]] = {}

    for row in rows[4:]:
        if not row or all(c is None for c in row):
            continue
        col_a = str(row[0]).strip() if row[0] is not None else ""
        col_b = str(row[1]).strip() if row[1] is not None else ""
        if col_a.startswith("Percentages of"):
            current_section = col_a
        if not col_b:
            continue
        tax_class: str | None = None
        if col_b == "Direct taxes":
            tax_class = "direct"
        elif col_b == "Indirect taxes":
            tax_class = "indirect"
        elif col_b == "All taxes":
            tax_class = "all"
        if tax_class is None or current_section is None:
            continue
        target = next(
            (
                t
                for t in TABLE8_TARGETS
                if t[0] == current_section and t[1] == tax_class
            ),
            None,
        )
        if target is None:
            # Direct taxes under disposable/expenditure are not published — skip.
            continue
        _, tax, denominator = target
        values = _values_for_bands(row, header_row)
        collected[(tax, denominator)] = values

    expected_keys = {(t[1], t[2]) for t in TABLE8_TARGETS}
    missing = expected_keys - set(collected)
    if missing:
        raise ValueError(f"Table 8 missing expected rows: {sorted(missing)}")

    observations: list[Observation] = []
    for (tax, denominator), values in sorted(collected.items()):
        for band, value in values.items():
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=PERIOD_START,
                    period_end=PERIOD_END,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="percent of denominator",
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=_notes(
                        table="8",
                        measure="tax_share",
                        tax=tax,
                        tax_label=TAX_CLASS_LABELS[tax],
                        denominator=denominator,
                        band=_band_slug(band),
                        band_label=band,
                        ranking="equivalised_disposable_income_quintile",
                        population="all_individuals",
                        equivalisation="modified_OECD",
                    ),
                )
            )
    return observations


def _parse_table2a_totals(ws) -> list[Observation]:
    """Average £/year total direct and total indirect taxes by quintile."""
    rows = list(ws.iter_rows(values_only=True))
    header_row = None
    header_idx = None
    for i, row in enumerate(rows):
        cells = [str(c).strip() if c is not None else "" for c in row]
        if "Bottom" in cells and "All individuals" in cells:
            header_row = row
            header_idx = i
            break
    if header_row is None or header_idx is None:
        raise ValueError("Table 2a quintile header not found")

    targets = {
        "Total direct taxes": "direct",
        "Total indirect taxes": "indirect",
    }
    found: dict[str, dict[str, float]] = {}
    for row in rows[header_idx + 1 :]:
        if not row:
            continue
        label = str(row[1]).strip() if row[1] is not None else ""
        if label not in targets:
            continue
        tax = targets[label]
        found[tax] = _values_for_bands(row, header_row)

    if set(found) != {"direct", "indirect"}:
        raise ValueError(f"Table 2a totals incomplete: {sorted(found)}")

    observations: list[Observation] = []
    for tax, values in sorted(found.items()):
        for band, value in values.items():
            observations.append(
                Observation(
                    indicator_id=INDICATOR_ID,
                    period_start=PERIOD_START,
                    period_end=PERIOD_END,
                    geography_code=UK_GEOGRAPHY_CODE,
                    geography_label=UK_GEOGRAPHY_LABEL,
                    value=value,
                    unit="£ per year (household average)",
                    observation_status="final",
                    source_version=SOURCE_VERSION,
                    notes=_notes(
                        table="2a",
                        measure="average_gbp",
                        tax=tax,
                        tax_label=TAX_CLASS_LABELS[tax],
                        band=_band_slug(band),
                        band_label=band,
                        ranking="equivalised_disposable_income_quintile",
                        population="all_individuals",
                        equivalisation="ranking_only_modified_OECD",
                        income_basis="unequivalised_household_averages",
                    ),
                )
            )
    return observations


def _lookup(
    observations: Sequence[Observation],
    *,
    table: str,
    tax: str,
    band: str,
    denominator: str | None = None,
) -> float:
    for obs in observations:
        parts = {
            p.split("=", 1)[0]: p.split("=", 1)[1]
            for p in obs.notes.split("; ")
            if "=" in p
        }
        if parts.get("table") != table:
            continue
        if parts.get("tax") != tax:
            continue
        if parts.get("band") != band:
            continue
        if denominator is not None and parts.get("denominator") != denominator:
            continue
        if obs.value is None:
            raise ValueError(f"Null value for {table}/{tax}/{band}/{denominator}")
        return float(obs.value)
    raise KeyError(f"No observation table={table} tax={tax} band={band} den={denominator}")


def run_self_qa(observations: Sequence[Observation]) -> dict[str, object]:
    """Numerical self-checks vs published Table 8 / 2a cells."""
    checks: list[dict[str, object]] = []

    def check(name: str, actual: float, expected: float, tol: float = 0.05) -> None:
        ok = abs(actual - expected) <= tol
        checks.append(
            {
                "name": name,
                "actual": actual,
                "expected": expected,
                "pass": ok,
            }
        )

    check(
        "t8_bottom_direct_gross",
        _lookup(observations, table="8", tax="direct", band="bottom", denominator="gross_income"),
        SELF_QA_SPOTS["t8_bottom_direct_gross"],
    )
    check(
        "t8_bottom_indirect_gross",
        _lookup(observations, table="8", tax="indirect", band="bottom", denominator="gross_income"),
        SELF_QA_SPOTS["t8_bottom_indirect_gross"],
    )
    check(
        "t8_bottom_all_gross",
        _lookup(observations, table="8", tax="all", band="bottom", denominator="gross_income"),
        SELF_QA_SPOTS["t8_bottom_all_gross"],
    )
    check(
        "t8_bottom_indirect_disposable",
        _lookup(
            observations,
            table="8",
            tax="indirect",
            band="bottom",
            denominator="disposable_income",
        ),
        SELF_QA_SPOTS["t8_bottom_indirect_disposable"],
    )
    check(
        "t8_bottom_indirect_expenditure",
        _lookup(
            observations, table="8", tax="indirect", band="bottom", denominator="expenditure"
        ),
        SELF_QA_SPOTS["t8_bottom_indirect_expenditure"],
    )
    check(
        "t8_top_direct_gross",
        _lookup(observations, table="8", tax="direct", band="top", denominator="gross_income"),
        SELF_QA_SPOTS["t8_top_direct_gross"],
    )
    check(
        "t8_top_indirect_gross",
        _lookup(observations, table="8", tax="indirect", band="top", denominator="gross_income"),
        SELF_QA_SPOTS["t8_top_indirect_gross"],
    )
    check(
        "t2a_bottom_direct_gbp",
        _lookup(observations, table="2a", tax="direct", band="bottom"),
        SELF_QA_SPOTS["t2a_bottom_direct_gbp"],
    )
    check(
        "t2a_bottom_indirect_gbp",
        _lookup(observations, table="2a", tax="indirect", band="bottom"),
        SELF_QA_SPOTS["t2a_bottom_indirect_gbp"],
    )
    check(
        "t2a_all_direct_gbp",
        _lookup(observations, table="2a", tax="direct", band="all"),
        SELF_QA_SPOTS["t2a_all_direct_gbp"],
    )
    check(
        "t2a_all_indirect_gbp",
        _lookup(observations, table="2a", tax="indirect", band="all"),
        SELF_QA_SPOTS["t2a_all_indirect_gbp"],
    )

    # Identity: direct + indirect ≈ all (gross income, Bottom).
    d = _lookup(observations, table="8", tax="direct", band="bottom", denominator="gross_income")
    i = _lookup(observations, table="8", tax="indirect", band="bottom", denominator="gross_income")
    a = _lookup(observations, table="8", tax="all", band="bottom", denominator="gross_income")
    check("t8_bottom_direct_plus_indirect_eq_all", round(d + i, 1), a, tol=0.15)

    # Denominator discipline: no direct×disposable or direct×expenditure rows.
    illegal = [
        obs.notes
        for obs in observations
        if "table=8" in obs.notes
        and "tax=direct" in obs.notes
        and (
            "denominator=disposable_income" in obs.notes
            or "denominator=expenditure" in obs.notes
        )
    ]
    checks.append(
        {
            "name": "no_invented_direct_denominators",
            "actual": len(illegal),
            "expected": 0,
            "pass": len(illegal) == 0,
        }
    )

    n_t8 = sum(1 for o in observations if "table=8" in o.notes)
    n_t2a = sum(1 for o in observations if "table=2a" in o.notes)
    # 5 tax×denominator combos × 6 bands = 30; 2 taxes × 6 bands = 12.
    checks.append(
        {
            "name": "row_counts",
            "actual": {"table8": n_t8, "table2a": n_t2a, "total": len(observations)},
            "expected": {"table8": 30, "table2a": 12, "total": 42},
            "pass": n_t8 == 30 and n_t2a == 12 and len(observations) == 42,
        }
    )

    passed = sum(1 for c in checks if c["pass"])
    failed = [c["name"] for c in checks if not c["pass"]]
    return {
        "indicator_id": INDICATOR_ID,
        "retrieved_pin_date": PIN_DATE,
        "official_release_date": OFFICIAL_RELEASE_DATE,
        "period": f"{PERIOD_START} → {PERIOD_END} (FYE 2024)",
        "checks": checks,
        "summary": {"pass": passed, "fail": len(failed), "failed_names": failed},
    }


class EffectsOfTaxesAndBenefitsConnector(Connector):
    """ETB FYE 2024 — direct/indirect burden by quintile + denominators."""

    def __init__(self, data_root: Path | None = None) -> None:
        root = data_root or (ECONOMY_DATA / INDICATOR_ID)
        super().__init__(root)

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    def build_manifest(self, evidence: Sequence[RawEvidence]) -> Manifest:
        return Manifest(
            indicator_id=self.indicator_id,
            title="Effects of taxes and benefits (direct/indirect tax burden)",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_LANDING_URL,
            series_id="ETB reference tables · Table 8 + Table 2a totals · FYE 2024",
            geography="United Kingdom (K02000001); private households (HFS/LCF)",
            frequency="annual (financial year)",
            unit="percent of denominator | £ per year (household average)",
            definition=(
                "ONS Effects of taxes and benefits on household income (ETB), "
                "financial year ending 2024. Curates (1) Table 8 — direct, "
                "indirect and all taxes as a percentage of gross income; "
                "indirect taxes also as a percentage of disposable income and "
                "of expenditure (only where ONS publishes those denominators); "
                "(2) Table 2a — average household £/year total direct and total "
                "indirect taxes by equivalised disposable-income quintile. "
                "Survey-derived group averages for private households — not "
                "what any specific household pays; legal liability ≠ economic "
                "incidence; no fairness claims. Ranking uses modified-OECD "
                "equivalised disposable income; Table 2a £ averages are "
                "unequivalised household means."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.effects_of_taxes_and_benefits",
            curated_path="curated/observations.csv",
            update_cadence="annual (ETB release)",
            raw_evidence=list(evidence),
            transformations=(
                f"Download ETB FYE 2024 reference tables xlsx ({SOURCE_FILE_URL}). "
                "Parse Table 8 headline Direct/Indirect/All taxes rows under each "
                "published percentage section; parse Table 2a 'Total direct taxes' "
                "and 'Total indirect taxes' rows. Emit one observation per "
                "tax × band (× denominator for Table 8). Skip component tax rows "
                "(Income Tax, VAT, …). Do not invent direct-tax shares of "
                "disposable income or expenditure."
            ),
            revision_notes=(
                "ETB revises prior years when processing errors are found "
                "(see dataset corrections). Re-pin the edition workbook; "
                "compare checksums. Sample sizes fell in FYE 2024 (HFS −21%)."
            ),
            caveats=(
                "HFS/LCF sample of private households only — excludes institutions "
                "and people experiencing homelessness. Indirect-tax / final-income "
                "path uses the smaller LCF expenditure sample. Quintile averages "
                "are not individual liabilities. Deferred lump-sum direct tax "
                "payments can distort bottom-quintile direct-tax estimates "
                "(ONS notes 5–6). Expenditure denominator available from 1995/96 "
                "(note 13). Domain 04 owns household income/HBAI series — link, "
                "do not fork. Not comparable to AHHY public-sector tax receipts."
            ),
            related_indicator_ids=[
                "tax-receipts",
                "tax-receipts-composition",
                "tax-machine-income-tax-rules",
            ],
            open_questions=[
                "Pin additional FYE editions for a multi-year burden timeseries?",
                "Add Table 9 (non-retired) as a labelled alternate population?",
            ],
            notion_registry_url=(
                "https://app.notion.com/41965471768581f5a6d8f652ce533d8c"
            ),
        )

    def transform(self, evidence: Sequence[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("No raw evidence")
        path = self.data_root / evidence[0].path
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        try:
            obs = _parse_table8(wb["Table 8"]) + _parse_table2a_totals(wb["Table 2a"])
        finally:
            wb.close()
        return obs

    def run(self) -> tuple[Path, Path, dict[str, object]]:
        """Fetch (or reuse pin), transform, write hand-off + self-QA artefacts."""
        target = self.data_root / RAW_RELATIVE
        if target.is_file() and target.stat().st_size > 10_000:
            evidence = RawEvidence(
                path=RAW_RELATIVE,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=sha256_file(target),
                content_type=(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ),
                official_release_date=OFFICIAL_RELEASE_DATE,
                http_status=200,
                source_url=SOURCE_FILE_URL,
            )
        else:
            evidence = download_ons_file(
                SOURCE_FILE_URL,
                target,
                relative_path=RAW_RELATIVE,
                official_release_date=OFFICIAL_RELEASE_DATE,
            )

        observations = self.transform([evidence])
        qa = run_self_qa(observations)
        if qa["summary"]["fail"]:  # type: ignore[index]
            raise RuntimeError(f"Self-QA failed: {qa['summary']}")

        manifest_path, curated_path = self.write_hand_off([evidence], observations)

        curated_dir = self.data_root / "curated"
        curated_dir.mkdir(parents=True, exist_ok=True)
        qa_path = curated_dir / "self_qa.json"
        qa_path.write_text(json.dumps(qa, indent=2) + "\n", encoding="utf-8")

        sums_path = self.data_root / f"raw/{PIN_DATE}/SHA256SUMS"
        sums_path.write_text(
            f"{evidence.checksum_sha256}  {Path(evidence.path).name}\n",
            encoding="utf-8",
        )
        return manifest_path, curated_path, qa


def main() -> None:
    connector = EffectsOfTaxesAndBenefitsConnector()
    manifest_path, curated_path, qa = connector.run()
    summary = qa["summary"]
    print(f"Wrote {manifest_path}")
    print(f"Wrote {curated_path}")
    print(f"Self-QA: {summary['pass']} pass / {summary['fail']} fail")


if __name__ == "__main__":
    main()
