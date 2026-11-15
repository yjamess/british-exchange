"""Independent QA for Economy Domain 06 Scotland bands 2017–22 — EC-VAL-06E-SCOT.

Recomputes after-allowance Scotland bands from pinned gov.scot / HMRC SIT
gross tables + curated Personal Allowance. Does not import Economy connector
band constants. Does not edit curated or raw.

Run:

    PYTHONPATH=src uv run python -m validation.qa_economy_06_scotland_bands_2026_11_15
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "data" / "economy" / "tax-machine-income-tax-history"
REPORT = ROOT / "data" / "qa" / "qa_report_economy_06_scotland_bands_2026-11-15.md"
RAW_DIR = BASE / "raw" / "2026-11-15"

FILL_YEARS = (
    "2017-18",
    "2018-19",
    "2019-20",
    "2020-21",
    "2021-22",
    "2022-23",
)

# Primary recomputes (≥3 required); extras strengthen the sample.
PRIMARY_YEARS = ("2018-19", "2020-21", "2022-23")
EXTRA_YEARS = ("2017-18", "2021-22", "2019-20")

SCOTLAND_RAW_FILES = (
    "sco_2017_18_govscot.html",
    "sco_2018_19_govscot.html",
    "sco_hmrc_sit_2019.html",
    "sco_hmrc_sit_2020.html",
    "sco_hmrc_sit_2021.html",
    "sco_2020_21_govscot.html",
    "sco_2021_22_budget.html",
    "sco_2022_23_govscot.html",
    "sco_hmrc_sit_2023.html",
    "employers_2018_19.html",
    "employers_2020_21.html",
)

# Gross upper of each PA-relative band, read from pinned HTML tables
# (Validation extract — not Economy connector). Higher/top use absolute
# £150,000 / £150,001 (employers / SRR convention).
# Format: (band_id, rate_percent, gross_upper_or_None_for_open)
#
# Sources:
#   2017-18: sco_2017_18_govscot / sco_hmrc_sit_2019 (HRT £43,000)
#   2018-19: sco_2018_19_govscot + employers_2018_19 after-allowance cross-check
#   2019-20: sco_hmrc_sit_2019 / sco_hmrc_sit_2020 (£14,549 / £24,944 / £43,430)
#   2020-21: sco_hmrc_sit_2021 / sco_2020_21_govscot + employers_2020_21
#   2021-22: sco_2021_22_budget / sco_2020_21_govscot (£14,667 / £25,296 / £43,662)
#   2022-23: sco_2022_23_govscot / sco_hmrc_sit_2023 (£14,732 / £25,688 / £43,662)
GROSS_TABLES: dict[str, tuple[tuple[str, Decimal, Decimal | None], ...]] = {
    "2017-18": (
        ("basic", Decimal("20"), Decimal("43000")),
        ("higher", Decimal("40"), Decimal("150000")),
        ("additional", Decimal("45"), None),
    ),
    "2018-19": (
        ("starter", Decimal("19"), Decimal("13850")),
        ("basic", Decimal("20"), Decimal("24000")),
        ("intermediate", Decimal("21"), Decimal("43430")),
        ("higher", Decimal("41"), Decimal("150000")),
        ("top", Decimal("46"), None),
    ),
    "2019-20": (
        ("starter", Decimal("19"), Decimal("14549")),
        ("basic", Decimal("20"), Decimal("24944")),
        ("intermediate", Decimal("21"), Decimal("43430")),
        ("higher", Decimal("41"), Decimal("150000")),
        ("top", Decimal("46"), None),
    ),
    "2020-21": (
        ("starter", Decimal("19"), Decimal("14585")),
        ("basic", Decimal("20"), Decimal("25158")),
        ("intermediate", Decimal("21"), Decimal("43430")),
        ("higher", Decimal("41"), Decimal("150000")),
        ("top", Decimal("46"), None),
    ),
    "2021-22": (
        ("starter", Decimal("19"), Decimal("14667")),
        ("basic", Decimal("20"), Decimal("25296")),
        ("intermediate", Decimal("21"), Decimal("43662")),
        ("higher", Decimal("41"), Decimal("150000")),
        ("top", Decimal("46"), None),
    ),
    "2022-23": (
        ("starter", Decimal("19"), Decimal("14732")),
        ("basic", Decimal("20"), Decimal("25688")),
        ("intermediate", Decimal("21"), Decimal("43662")),
        ("higher", Decimal("41"), Decimal("150000")),
        ("top", Decimal("46"), None),
    ),
}

# Absolute higher/top convention (PA taper) — matches HMRC employers pages.
HIGHER_BAND_IDS = frozenset({"higher", "additional", "top"})
ABSOLUTE_HIGHER_UPPER = Decimal("150000")
ABSOLUTE_TOP_LOWER = Decimal("150001")

# Prior-year spot expectations (from previous Time Machine QA PASS).
PRIOR_2016_17_BASIC_UPPER = Decimal("32000")
POST_2023_24_STARTER_UPPER = Decimal("2162")
POST_2023_24_TOP_RATE = Decimal("47")


@dataclass(frozen=True)
class AfterBand:
    band_id: str
    rate: Decimal
    lower: Decimal
    upper: Decimal | None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_csv(name: str) -> list[dict[str, str]]:
    with (BASE / "curated" / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def load_sums() -> dict[str, str]:
    out: dict[str, str] = {}
    for line in (RAW_DIR / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        digest, name = line.split(None, 1)
        out[name.strip()] = digest.strip()
    return out


def parse_dec(raw: str) -> Decimal | None:
    text = (raw or "").strip()
    if not text:
        return None
    return Decimal(text)


def after_allowance_from_gross(
    gross_rows: tuple[tuple[str, Decimal, Decimal | None], ...],
    pa: Decimal,
) -> list[AfterBand]:
    """Map gross income ranges (assuming standard UK PA) → after-allowance.

    Starter/basic/intermediate: upper = gross_upper − PA; first lower = 0;
    subsequent lower = previous upper + 1.
    Higher upper / top lower keep absolute £150,000 / £150,001.
    """
    bands: list[AfterBand] = []
    prev_upper: Decimal | None = None
    for band_id, rate, gross_upper in gross_rows:
        if band_id in HIGHER_BAND_IDS and band_id != "higher":
            # additional / top — open upper
            lower = ABSOLUTE_TOP_LOWER
            upper = None
        elif band_id == "higher":
            lower = (prev_upper + 1) if prev_upper is not None else Decimal("0")
            upper = ABSOLUTE_HIGHER_UPPER
        else:
            if gross_upper is None:
                raise ValueError(f"{band_id}: expected gross upper")
            upper = gross_upper - pa
            lower = Decimal("0") if prev_upper is None else prev_upper + 1
        bands.append(AfterBand(band_id, rate, lower, upper))
        prev_upper = upper if upper is not None else prev_upper
    return bands


def curated_scotland_bands(rows: list[dict[str, str]], tax_year: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for row in rows:
        if row["tax_year"] == tax_year and row["jurisdiction"] == "scotland":
            out[row["band_id"]] = row
    return out


def curated_ewni_bands(rows: list[dict[str, str]], tax_year: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for row in rows:
        if row["tax_year"] == tax_year and row["jurisdiction"] == "england-wales-ni":
            out[row["band_id"]] = row
    return out


def pa_for(allowances: list[dict[str, str]], tax_year: str, jurisdiction: str) -> Decimal:
    for row in allowances:
        if (
            row["tax_year"] == tax_year
            and row["jurisdiction"] == jurisdiction
            and row["allowance_id"] == "personal_allowance"
        ):
            return Decimal(row["amount_gbp"])
    raise KeyError(f"PA missing for {jurisdiction} {tax_year}")


def check(
    results: list[tuple[str, str, str, str]],
    check_id: str,
    label: str,
    ok: bool,
    notes: str,
    *,
    warn: bool = False,
) -> None:
    if ok:
        result = "pass"
    elif warn:
        result = "warn"
    else:
        result = "fail"
    results.append((check_id, label, result, notes))


def html_contains(path: Path, *needles: str) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    return all(n in text for n in needles)


def main() -> int:
    results: list[tuple[str, str, str, str]] = []
    spot: list[str] = []

    manifest = yaml.safe_load((BASE / "manifest.yaml").read_text(encoding="utf-8"))
    sums = load_sums()
    evidence = {
        Path(item["path"]).name: item for item in manifest.get("raw_evidence", [])
    }

    # --- C1 checksums ---
    for name in SCOTLAND_RAW_FILES:
        path = RAW_DIR / name
        disk = sha256(path)
        man = evidence.get(name, {}).get("checksum_sha256")
        sum_dig = sums.get(name)
        ok = path.is_file() and man == disk and sum_dig == disk
        check(
            results,
            "C1",
            f"checksum {name}",
            ok,
            f"manifest={man == disk} SHA256SUMS={sum_dig == disk} disk={disk[:16]}",
        )

    bands = load_csv("income_tax_bands.csv")
    allowances = load_csv("allowances.csv")
    coverage = load_csv("coverage_inventory.csv")
    fiscal = json.loads((BASE / "curated" / "fiscal_drag_status.json").read_text())

    # --- C2 recompute after-allowance (≥3 years; we do all six) ---
    for tax_year in PRIMARY_YEARS + EXTRA_YEARS:
        pa = pa_for(allowances, tax_year, "scotland")
        expected = after_allowance_from_gross(GROSS_TABLES[tax_year], pa)
        curated = curated_scotland_bands(bands, tax_year)

        # status
        statuses = {r["coverage_status"] for r in curated.values()}
        check(
            results,
            "C2",
            f"Scotland {tax_year} coverage_status",
            statuses == {"pinned_govscot_hmrc_sit"} and "gap" not in curated,
            f"status={sorted(statuses)} n_bands={len(curated)}",
        )

        for exp in expected:
            row = curated.get(exp.band_id)
            if row is None:
                check(
                    results,
                    "C2",
                    f"Scotland {tax_year} {exp.band_id}",
                    False,
                    "missing curated band",
                )
                continue
            c_lo = parse_dec(row["lower_after_allowance_gbp"])
            c_hi = parse_dec(row["upper_after_allowance_gbp"])
            c_rate = parse_dec(row["rate_percent"])
            ok = (
                c_lo == exp.lower
                and c_hi == exp.upper
                and c_rate == exp.rate
            )
            check(
                results,
                "C2",
                f"Scotland {tax_year} {exp.band_id}",
                ok,
                (
                    f"gross→after PA={pa}: "
                    f"({exp.lower},{exp.upper if exp.upper is not None else 'open'} @{exp.rate}%) "
                    f"curated→({c_lo},{c_hi if c_hi is not None else 'open'} @{c_rate}%)"
                ),
            )
            if tax_year in PRIMARY_YEARS and exp.band_id in {
                "starter",
                "basic",
                "intermediate",
            }:
                spot.append(
                    f"{tax_year} {exp.band_id}: after-allowance "
                    f"{exp.lower}–{exp.upper} @{exp.rate}% (PA £{pa})"
                )

        # PA Scotland == E/W/NI (reserved UK)
        pa_ewni = pa_for(allowances, tax_year, "england-wales-ni")
        check(
            results,
            "C2",
            f"PA reserved UK {tax_year}",
            pa == pa_ewni,
            f"scotland={pa} ewni={pa_ewni}",
        )

    # Raw HTML presence of key gross figures (spot, not full parse)
    raw_spot = [
        ("sco_2017_18_govscot.html", ("£43,000", "20%", "40%", "45%")),
        ("sco_2018_19_govscot.html", ("£13,850", "£43,430", "19%", "41%", "46%")),
        ("employers_2018_19.html", ("£2,000", "£31,580", "41%")),
        ("sco_hmrc_sit_2021.html", ("£14,585", "£25,158", "£43,430")),
        ("employers_2020_21.html", ("£2,085", "£30,930")),
        ("sco_2021_22_budget.html", ("£14,667", "£25,296", "£43,662")),
        ("sco_2022_23_govscot.html", ("£14,732", "£25,688", "£43,662", "41%", "46%")),
        ("sco_hmrc_sit_2023.html", ("£14,732", "£25,688", "£43,662")),
    ]
    for name, needles in raw_spot:
        ok = html_contains(RAW_DIR / name, *needles)
        check(
            results,
            "C2",
            f"raw needles {name}",
            ok,
            f"needles={list(needles)}",
        )

    # --- C3 Scotland ≠ E/W/NI ---
    diverge_checks = [
        ("2017-18", "basic", "upper_after_allowance_gbp"),
        ("2018-19", "higher", "rate_percent"),
        ("2020-21", "starter", "band_id"),  # starter exists only in Scotland
        ("2022-23", "higher", "rate_percent"),
    ]
    for tax_year, band_id, field in diverge_checks:
        sco = curated_scotland_bands(bands, tax_year)
        ewni = curated_ewni_bands(bands, tax_year)
        if field == "band_id":
            ok = band_id in sco and band_id not in ewni
            notes = f"scotland_has_starter={band_id in sco} ewni_has={band_id in ewni}"
        else:
            s_val = sco.get(band_id, {}).get(field)
            # For higher rate: compare Scotland higher vs E/W/NI higher
            e_val = ewni.get(band_id, {}).get(field) or ewni.get("basic", {}).get(field)
            if band_id == "basic" and field == "upper_after_allowance_gbp":
                e_val = ewni["basic"]["upper_after_allowance_gbp"]
                s_val = sco["basic"]["upper_after_allowance_gbp"]
            elif band_id == "higher" and field == "rate_percent":
                e_val = ewni["higher"]["rate_percent"]
                s_val = sco["higher"]["rate_percent"]
            ok = s_val is not None and e_val is not None and s_val != e_val
            notes = f"scotland.{field}={s_val} ewni.{field}={e_val}"
        check(results, "C3", f"Scotland≠E/W/NI {tax_year} {band_id}", ok, notes)
        spot.append(f"diverge {tax_year} {band_id}: {notes}")

    # Extra structural: 2018–19 five bands vs three
    n_sco = len(curated_scotland_bands(bands, "2018-19"))
    n_ewni = len(curated_ewni_bands(bands, "2018-19"))
    check(
        results,
        "C3",
        "2018-19 band count Scotland≠E/W/NI",
        n_sco == 5 and n_ewni == 3,
        f"scotland_n={n_sco} ewni_n={n_ewni}",
    )

    # --- C4 coverage inventory ---
    cov_by_year = {r["tax_year"]: r for r in coverage}
    gap_left = [
        y
        for y in FILL_YEARS
        if cov_by_year.get(y, {}).get("scotland_income_tax")
        in {None, "gap_awaiting_clean_pin", "gap"}
    ]
    for y in FILL_YEARS:
        status = cov_by_year.get(y, {}).get("scotland_income_tax")
        check(
            results,
            "C4",
            f"coverage_inventory {y}",
            status == "pinned_govscot_hmrc_sit",
            f"scotland_income_tax={status}",
        )
    check(
        results,
        "C4",
        "no remaining 2017–22 gaps in inventory",
        gap_left == [],
        f"gaps_left={gap_left}",
    )

    # --- C5 no Ready / frontend / fiscal drag ---
    status_note = str(manifest.get("status_note", ""))
    check(
        results,
        "C5",
        "no Ready claim in manifest",
        "not Ready" in status_note or "Validation-ready" in status_note,
        f"status_note={status_note[:80]}",
    )
    check(
        results,
        "C5",
        "fiscal drag deferred",
        fiscal.get("status") == "deferred" and fiscal.get("examples_path") in (None, ""),
        f"status={fiscal.get('status')} examples={fiscal.get('examples_path')}",
    )
    # Light scan: pin token must not appear in web UI wiring for this fill alone.
    history_ui = False
    web_src = ROOT / "web" / "src"
    if web_src.is_dir():
        for path in web_src.rglob("*"):
            if path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".md"}:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if "pinned_govscot_hmrc_sit" in text:
                history_ui = True
                break
    check(
        results,
        "C5",
        "no UI claim for govscot pin",
        not history_ui,
        "no web/src reference to pinned_govscot_hmrc_sit",
    )

    # --- C6 prior years not corrupted ---
    # Pre-2017: 2016-17 Scotland mirrors E/W/NI
    sco_1617 = curated_scotland_bands(bands, "2016-17")
    ewni_1617 = curated_ewni_bands(bands, "2016-17")
    mirror_ok = (
        sco_1617.get("basic", {}).get("upper_after_allowance_gbp")
        == ewni_1617.get("basic", {}).get("upper_after_allowance_gbp")
        == str(PRIOR_2016_17_BASIC_UPPER)
        and sco_1617.get("basic", {}).get("coverage_status")
        == "pre_divergence_mirrors_ewni"
    )
    check(
        results,
        "C6",
        "2016-17 Scotland mirror intact",
        mirror_ok,
        (
            f"sco_basic_upper={sco_1617.get('basic', {}).get('upper_after_allowance_gbp')} "
            f"ewni={ewni_1617.get('basic', {}).get('upper_after_allowance_gbp')} "
            f"status={sco_1617.get('basic', {}).get('coverage_status')}"
        ),
    )
    spot.append(
        f"2016-17 Scotland basic upper={sco_1617.get('basic', {}).get('upper_after_allowance_gbp')} "
        f"(mirror E/W/NI)"
    )

    # Post-2022: 2023-24 GOV.UK pin unchanged
    sco_2324 = curated_scotland_bands(bands, "2023-24")
    post_ok = (
        parse_dec(sco_2324.get("starter", {}).get("upper_after_allowance_gbp", ""))
        == POST_2023_24_STARTER_UPPER
        and parse_dec(sco_2324.get("top", {}).get("rate_percent", ""))
        == POST_2023_24_TOP_RATE
        and sco_2324.get("starter", {}).get("coverage_status")
        == "pinned_govuk_after_allowance"
    )
    check(
        results,
        "C6",
        "2023-24 Scotland GOV.UK pin intact",
        post_ok,
        (
            f"starter_upper={sco_2324.get('starter', {}).get('upper_after_allowance_gbp')} "
            f"top_rate={sco_2324.get('top', {}).get('rate_percent')} "
            f"status={sco_2324.get('starter', {}).get('coverage_status')}"
        ),
    )
    spot.append(
        f"2023-24 starter upper={sco_2324.get('starter', {}).get('upper_after_allowance_gbp')} "
        f"@19%; top={sco_2324.get('top', {}).get('rate_percent')}%"
    )

    # E/W/NI 2018-19 basic upper not clobbered
    ewni_1819 = curated_ewni_bands(bands, "2018-19")
    check(
        results,
        "C6",
        "E/W/NI 2018-19 basic intact",
        ewni_1819.get("basic", {}).get("upper_after_allowance_gbp") == "34500"
        and ewni_1819.get("higher", {}).get("rate_percent") == "40",
        (
            f"basic_upper={ewni_1819.get('basic', {}).get('upper_after_allowance_gbp')} "
            f"higher_rate={ewni_1819.get('higher', {}).get('rate_percent')}"
        ),
    )

    # --- summarise ---
    counts = {"pass": 0, "warn": 0, "fail": 0}
    for _, _, result, _ in results:
        counts[result] += 1

    verdict = "pass" if counts["fail"] == 0 else "fail"
    ready_yes = verdict == "pass"
    years_checked = list(PRIMARY_YEARS + EXTRA_YEARS)

    lines: list[str] = []
    lines.append(
        "# QA report — Economy 06 Scotland income-tax bands 2017–22 · 2026-11-15"
    )
    lines.append("")
    lines.append("## Scope")
    lines.append("")
    lines.append("- Indicator: `tax-machine-income-tax-history`")
    lines.append("- Package: `data/economy/tax-machine-income-tax-history/`")
    lines.append("- Handover: `docs/handover-economy-06-scotland-bands.md`")
    lines.append(
        "- Kickoff: `docs/agent-kickoff-validation-economy-06-scotland-bands.md`"
    )
    lines.append(
        "- Script: `validation.qa_economy_06_scotland_bands_2026_11_15`"
    )
    lines.append(
        "- Focus: Scotland `pinned_govscot_hmrc_sit` for **2017–18…2022–23**"
    )
    lines.append(
        f"- Years recomputed: {', '.join(years_checked)} "
        f"(primary {', '.join(PRIMARY_YEARS)})"
    )
    lines.append("")
    lines.append("## Independence")
    lines.append("")
    lines.append(
        "Disk raw + curated only. After-allowance recomputed from Validation-extracted "
        "gross uppers in pinned gov.scot / HMRC SIT HTML + curated UK Personal Allowance "
        "(reserved). Does not import Economy `SCOTLAND_BANDS_HISTORICAL`. "
        "No curated/raw rewrites. Fiscal drag out of scope."
    )
    lines.append("")
    lines.append("## Checks")
    lines.append("")
    lines.append("| ID | Check | Result | Notes |")
    lines.append("|----|-------|--------|-------|")
    for check_id, label, result, notes in results:
        safe = notes.replace("|", "\\|")
        lines.append(f"| {check_id} | {label} | **{result}** | {safe} |")
    lines.append("")
    lines.append("## Spot cells")
    lines.append("")
    for item in spot:
        lines.append(f"- {item}")
    lines.append(
        "- Mapping: starter/basic/intermediate upper = gross upper − PA; "
        "higher upper / top lower absolute £150,000 / £150,001"
    )
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(
        f"- **Verdict: {verdict}** "
        f"({counts['pass']} pass / {counts['warn']} warn / {counts['fail']} fail)"
    )
    if ready_yes:
        lines.append(
            "- **Ready recommendation: yes** — Orchestrator may re-load cloud history "
            "package + refresh Time Machine Scotland gap copy. Do **not** start fiscal-drag "
            "work from this PASS alone; fiscal drag remains deferred."
        )
    else:
        lines.append(
            "- **Ready recommendation: no** — fix Fail rows (owner: Economy) before "
            "cloud re-load / gap-copy refresh."
        )
    lines.append(
        "- Out of scope: Time Machine React redesign; fiscal-drag examples; Notion Ready "
        "flip by Validation."
    )
    lines.append("")
    lines.append("## Blockers")
    lines.append("")
    if counts["fail"] == 0:
        lines.append("- None for Scotland 2017–22 Validation PASS.")
        lines.append(
            "- Orchestrator-owned next: cloud re-load of `tax-machine-income-tax-history` "
            "+ Time Machine gap-copy refresh; registry note only (same indicator id)."
        )
        lines.append("- Fiscal drag remains deferred (`EC-G2-06E-DRAG` queued).")
    else:
        fails = [f"{lab}: {notes}" for _, lab, res, notes in results if res == "fail"]
        for f in fails:
            lines.append(f"- {f}")
    lines.append("")

    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"Wrote {REPORT.relative_to(ROOT)} — "
        f"{counts['pass']} pass / {counts['warn']} warn / {counts['fail']} fail"
    )
    return 0 if counts["fail"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
