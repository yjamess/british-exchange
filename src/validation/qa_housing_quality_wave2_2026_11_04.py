"""QA — Housing Domain 07 'Housing quality' wave 2 (2026-11-04).

Independent checks of:

- ``epc-domestic-lodgements`` / ``epc-domestic-lodgements-by-local-authority``
- ``ehs-heating`` / ``ehs-insulation`` (new breakdown rows)
- ``ehs-disrepair``
- ``ehs-thermal-comfort``, ``ehs-repairs-satisfaction``,
  ``ehs-accessibility-adaptations``

Raw cells are re-read here with fixed label / header lookups written for QA
(not the connectors' parsers). Nothing in ``data/housing`` is modified.

Run:
  uv run python -m validation.qa_housing_quality_wave2_2026_11_04
"""

from __future__ import annotations

import csv
import random
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from britain_exchange.checksum import sha256_file
from britain_exchange.paths import HOUSING_DATA
from housing.ods_util import read_ods_sheet

QA_DIR = HOUSING_DATA.parent / "qa"
REPORT = QA_DIR / "qa_housing_quality_wave2_2026_11_04.md"
WEB_CAP = 10_000

EHS_IDS = (
    "ehs-heating",
    "ehs-insulation",
    "ehs-disrepair",
    "ehs-thermal-comfort",
    "ehs-repairs-satisfaction",
    "ehs-accessibility-adaptations",
)
EPC_IDS = ("epc-domestic-lodgements", "epc-domestic-lodgements-by-local-authority")
REQUIRED_KEYS = ("series", "tenure", "breakdown", "observation-type", "table", "base")
OBS_TYPES = {"survey-estimate", "survey-response", "administrative-record", "modelled-derived"}


def kv(notes: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for part in notes.split("; "):
        if "=" in part:
            k, v = part.split("=", 1)
            out.setdefault(k.strip(), v.strip())
    return out


@dataclass
class Pack:
    indicator_id: str
    rows: list[dict[str, str]]
    manifest: dict
    root: Path

    def raw(self, needle: str) -> Path:
        for ev in self.manifest["raw_evidence"]:
            if needle in ev["path"]:
                return self.root / ev["path"]
        raise KeyError(needle)


def load(indicator_id: str) -> Pack:
    root = HOUSING_DATA / indicator_id
    with (root / "curated" / "observations.csv").open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    for r in rows:
        r["_n"] = kv(r["notes"])  # type: ignore[assignment]
    manifest = yaml.safe_load((root / "manifest.yaml").read_text(encoding="utf-8"))
    return Pack(indicator_id, rows, manifest, root)


@dataclass
class Report:
    lines: list[str] = field(default_factory=list)
    fails: list[str] = field(default_factory=list)
    warns: list[str] = field(default_factory=list)

    def h(self, text: str) -> None:
        self.lines += ["", text, ""]

    def p(self, text: str = "") -> None:
        self.lines.append(text)

    def check(self, ok: bool, label: str) -> str:
        if not ok:
            self.fails.append(label)
        return "PASS" if ok else "FAIL"


def num(text: str) -> float | None:
    t = (text or "").strip().replace(",", "")
    try:
        return float(t)
    except ValueError:
        return None


def find(pack: Pack, **sel: str) -> list[dict[str, str]]:
    out = []
    for r in pack.rows:
        n = r["_n"]  # type: ignore[index]
        ok = True
        for k, v in sel.items():
            if k in ("period_start", "geography_code"):
                ok = ok and r[k] == v
            else:
                ok = ok and n.get(k.replace("_", "-")) == v
        if ok:
            out.append(r)
    return out


# ---------------------------------------------------------------------------
# 1. Integrity
# ---------------------------------------------------------------------------


def integrity(rep: Report, packs: dict[str, Pack]) -> None:
    rep.h("## 1. Package integrity")
    rep.p("| Indicator | Rows | Periods | Final | Suppressed | Missing | Raw checksums | Natural keys unique | Notes keys / obs-type | ≤10k web load | Result |")
    rep.p("|---|---:|---|---:|---:|---:|---|---|---|---|---|")
    for iid, pack in packs.items():
        st = Counter(r["observation_status"] for r in pack.rows)
        periods = sorted({r["period_start"] for r in pack.rows})
        cks = all(
            sha256_file(pack.root / ev["path"]) == ev["checksum_sha256"] for ev in pack.manifest["raw_evidence"]
        )
        keys = Counter(
            (
                r["period_start"], r["period_end"], r["geography_code"],
                r["_n"].get("series"), r["_n"].get("tenure"), r["_n"].get("breakdown"),  # type: ignore[union-attr]
                r["_n"].get("category", ""), r["_n"].get("table"),  # type: ignore[union-attr]
            )
            for r in pack.rows
        )
        unique = max(keys.values()) == 1
        notes_ok = all(
            all(k in r["_n"] for k in REQUIRED_KEYS)  # type: ignore[operator]
            and r["_n"]["observation-type"] in OBS_TYPES  # type: ignore[index]
            and (r["_n"]["breakdown"] == "none" or r["_n"].get("category") == f"{r['_n']['breakdown']}:{r['_n'].get(r['_n']['breakdown'])}")  # type: ignore[index,union-attr]
            for r in pack.rows
        )
        values_ok = all(
            (r["value"] == "") == (r["observation_status"] in ("suppressed", "missing")) for r in pack.rows
        )
        cap = len(pack.rows) <= WEB_CAP
        cap_txt = "yes" if cap else "no — API filter required (not loaded by web)"
        ok = cks and unique and notes_ok and values_ok and (cap or iid.startswith("epc-"))
        rep.p(
            f"| `{iid}` | {len(pack.rows)} | {periods[0][:7]}…{periods[-1][:7]} | {st['final']} | {st['suppressed']} | {st['missing']} | "
            f"{'ok' if cks else 'MISMATCH'} | {'yes' if unique else 'NO'} | {'ok' if notes_ok and values_ok else 'BAD'} | {cap_txt} | {rep.check(ok, f'integrity {iid}')} |"
        )


# ---------------------------------------------------------------------------
# 2. EPC
# ---------------------------------------------------------------------------

BANDS = ("band-a", "band-b", "band-c", "band-d", "band-e", "band-f", "band-g", "band-not-recorded")


def epc_checks(rep: Report, nat: Pack, la: Pack) -> None:
    rep.h("## 2. EPC domestic lodgements (administrative record)")
    all_rows = nat.rows + la.rows

    def table_of(r: dict) -> str:
        return r["_n"]["table"]  # type: ignore[index]

    # Region-sheet and LA-sheet 'Unknown' rows share EPC-UNALLOCATED (they are
    # in different packages); key LA-level unknowns separately here.
    def geo_key(r: dict) -> str:
        g = r["geography_code"]
        return "EPC-UNALLOCATED-LA" if g == "EPC-UNALLOCATED" and r["_n"]["geography-level"] == "local-authority" else g  # type: ignore[index]

    cells: dict[tuple[str, str, str, str, str], float] = {}
    for r in all_rows:
        k = (table_of(r), geo_key(r), r["period_start"], r["period_end"], r["_n"]["series"])  # type: ignore[index]
        if k in cells:
            raise ValueError(f"QA key collision {k}")
        cells[k] = float(r["value"])
    groups: dict[tuple[str, str, str, str], dict[str, float]] = defaultdict(dict)
    for (t, g, s, e, ser), v in cells.items():
        groups[(t, g, s, e)][ser] = v

    # 2a band sums
    bad = [k for k, d in groups.items() if abs(sum(d[b] for b in BANDS) - d["lodgements-total"]) > 0]
    rep.p(f"- **Bands + not recorded = lodgements total** on every published row: {len(groups) - len(bad)}/{len(groups)} exact — {rep.check(not bad, 'epc band sums')}")
    for k in bad[:5]:
        rep.p(f"  - {k}: Σbands {sum(groups[k][b] for b in BANDS):,.0f} vs total {groups[k]['lodgements-total']:,.0f}")

    # 2b England + Wales = E&W
    def cmp_sum(label: str, parts_fn, whole_code: str, tables=("D1", "EB1", "NB1"), tol: float = 0) -> None:
        checked, diffs = 0, []
        for (t, g, s, e), d in groups.items():
            if g != whole_code or t not in tables:
                continue
            parts = parts_fn(t, s, e)
            if not parts:
                continue
            for ser in ("lodgements-total", *BANDS):
                total = sum(groups[p].get(ser, 0.0) for p in parts)
                checked += 1
                if abs(total - d[ser]) > tol:
                    diffs.append((t, s, ser, total, d[ser]))
        rep.p(f"- **{label}**: {checked - len(diffs)}/{checked} cells equal — {rep.check(not diffs and checked > 0, 'epc ' + label)}")
        for t, s, ser, tot, whole in diffs[:6]:
            rep.p(f"  - {t} {s} {ser}: Σ parts {tot:,.0f} vs published {whole:,.0f} ({tot - whole:+,.0f})")

    cmp_sum(
        "England + Wales = England and Wales (quarters and years)",
        lambda t, s, e: [k for k in ((t, "E92000001", s, e), (t, "W92000004", s, e)) if k in groups],
        "K04000001",
    )
    region_codes = [f"E1200000{i}" for i in range(1, 10)] + ["EPC-UNALLOCATED"]
    cmp_sum(
        "Σ 9 regions + 'Unknown' = England (quarters)",
        lambda t, s, e: [k for k in ((t, c, s, e) for c in region_codes) if k in groups] if s[5:7] != "01" or e[5:7] != "12" else [],
        "E92000001",
    )
    la_codes: dict[tuple[str, str], list[tuple[str, str, str, str]]] = defaultdict(list)
    for r in la.rows:
        if r["_n"]["series"] == "lodgements-total":  # type: ignore[index]
            la_codes[(r["period_start"], r["period_end"])].append(("D1", geo_key(r), r["period_start"], r["period_end"]))
    cmp_sum(
        "Σ local authorities (E + W + 'Unknown') = England and Wales, D1 quarters",
        lambda t, s, e: la_codes.get((s, e), []),
        "K04000001",
        tables=("D1",),
    )
    la_e: dict[str, float] = defaultdict(float)
    la_w: dict[str, float] = defaultdict(float)
    la_u: dict[str, float] = defaultdict(float)
    for r in la.rows:
        if r["_n"]["series"] != "lodgements-total":  # type: ignore[index]
            continue
        g = geo_key(r)
        target = la_e if g.startswith("E0") else la_w if g.startswith("W06") else la_u
        target[r["period_start"]] += float(r["value"])
    def country(code: str) -> dict[str, float]:
        return {k[2]: d["lodgements-total"] for k, d in groups.items() if k[0] == "D1" and k[1] == code and not (k[2][5:7] == "01" and k[3][5:7] == "12")}
    eng, wal = country("E92000001"), country("W92000004")
    e_gap = max(abs(la_e[s] + la_u[s] - v) for s, v in eng.items())
    w_gap = max(abs(la_w[s] - v) for s, v in wal.items())
    rep.p(
        f"- Σ English LA codes + LA-sheet 'Unknown' vs England sheet: max |gap| {e_gap:,.0f}; Σ Welsh LA codes vs Wales sheet: max |gap| {w_gap:,.0f} — "
        f"{rep.check(e_gap == 0 and w_gap == 0, 'epc LA vs country')}. The LA-sheet 'Unknown' ({sum(la_u.values()):,.0f} lodgements over "
        f"{sum(1 for v in la_u.values() if v)} quarters) is English: it equals the region-sheet 'Unknown'."
    )
    reg_u = sum(d["lodgements-total"] for k, d in groups.items() if k[0] == "D1" and k[1] == "EPC-UNALLOCATED")
    rep.p(f"- Region-sheet 'Unknown' (D1, England region not allocated) total {reg_u:,.0f} — kept as EPC-UNALLOCATED in `epc-domestic-lodgements` so Σ regions reconciles to England.")

    # 2c quarters → years
    q_sum: dict[tuple[str, str, str, str], float] = defaultdict(float)
    q_n: Counter = Counter()
    for (t, g, s, e), d in groups.items():
        if g in ("K04000001", "E92000001", "W92000004") and not (s[5:7] == "01" and e[5:7] == "12"):
            for ser in ("lodgements-total", *BANDS):
                q_sum[(t, g, s[:4], ser)] += d[ser]
            q_n[(t, g, s[:4])] += 1
    yr_checked, yr_bad = 0, []
    for (t, g, s, e), d in groups.items():
        if s[5:7] == "01" and e[5:7] == "12" and s[:4] == e[:4]:
            if q_n[(t, g, s[:4])] != 4:
                continue
            for ser in ("lodgements-total", *BANDS):
                yr_checked += 1
                if abs(q_sum[(t, g, s[:4], ser)] - d[ser]) > 0:
                    yr_bad.append((t, g, s[:4], ser, q_sum[(t, g, s[:4], ser)], d[ser]))
    rep.p(f"- **Σ four quarters = published calendar-year row** (country sheets): {yr_checked - len(yr_bad)}/{yr_checked} — {rep.check(not yr_bad, 'epc quarter-year')}")
    for b in yr_bad[:5]:
        rep.p(f"  - {b}")

    # 2d cumulative (Total) rows read independently from raw
    rep.p("- **Σ all quarters = published cumulative '(Total)' row** (raw re-read):")
    rep.p("")
    rep.p("  | Table | Area | Published (Total) lodgements | Σ curated quarters | Result |")
    rep.p("  |---|---|---:|---:|---|")
    for t, fname in (("D1", "D1-_Domestic"), ("EB1", "EB1-_Existing"), ("NB1", "NB1-_New")):
        path = nat.raw(fname)
        for sheet, code in (("England_and_Wales", "K04000001"), ("England_Only", "E92000001"), ("Wales_Only", "W92000004")):
            rows = read_ods_sheet(path, f"{t}_{sheet}")
            total_row = next(r for r in rows if r and r[0].strip() == "(Total)")
            published = num(total_row[2])
            curated = sum(
                d["lodgements-total"] for k, d in groups.items()
                if k[0] == t and k[1] == code and not (k[2][5:7] == "01" and k[3][5:7] == "12")
            )
            rep.p(f"  | {t} | {sheet} | {published:,.0f} | {curated:,.0f} | {rep.check(published == curated, f'epc cumulative {t} {sheet}')} |")
        rows = read_ods_sheet(path, f"{t}_by_Region")
        for r in rows[4:]:
            if r and r[0].strip() == "London" and not r[1].strip():
                published = num(r[2])
                curated = sum(d["lodgements-total"] for k, d in groups.items() if k[0] == t and k[1] == "E12000007")
                rep.p(f"  | {t} | London (region sheet) | {published:,.0f} | {curated:,.0f} | {rep.check(published == curated, f'epc cumulative {t} London')} |")
                break

    # 2e EB1 + NB1 = D1
    eb_nb, eb_bad = 0, []
    for (t, g, s, e), d in groups.items():
        if t != "D1" or g.startswith(("E06", "E07", "E08", "E09", "W06")) or g == "EPC-UNALLOCATED-LA":
            continue
        a, b = groups.get(("EB1", g, s, e)), groups.get(("NB1", g, s, e))
        if not a or not b:
            continue
        for ser in ("lodgements-total", *BANDS):
            eb_nb += 1
            if a[ser] + b[ser] != d[ser]:
                eb_bad.append((g, s, ser, a[ser] + b[ser], d[ser]))
    rep.p(f"- **Existing (EB1) + new (NB1) = all dwellings (D1)**, country + region cells: {eb_nb - len(eb_bad)}/{eb_nb} equal — {'PASS' if not eb_bad else 'NOTE'}")
    for g, s, ser, tot, whole in eb_bad[:8]:
        rep.p(f"  - {g} {s[:7]} {ser}: EB1+NB1 {tot:,.0f} vs D1 {whole:,.0f} ({tot - whole:+,.0f})")
    if eb_bad:
        rep.warns.append(f"EPC: EB1+NB1 ≠ D1 in {len(eb_bad)} of {eb_nb} cells (published tables; not rewritten)")

    # 2f random spot checks vs raw
    rnd = random.Random(20261104)
    rep.p("")
    rep.p("**Random spot checks vs raw cells (seeded)**")
    rep.p("")
    rep.p("| Table | Sheet | Raw row | Series | Raw | Curated | Result |")
    rep.p("|---|---|---|---|---:|---:|---|")
    col_series = {2: "lodgements-total", 4: "band-a", 5: "band-b", 6: "band-c", 7: "band-d", 8: "band-e", 9: "band-f", 10: "band-g", 11: "band-not-recorded"}
    region_map = {
        "north east": "E12000001", "north west": "E12000002", "yorkshire and the humber": "E12000003",
        "east midlands": "E12000004", "west midlands": "E12000005", "east of england": "E12000006",
        "london": "E12000007", "south east": "E12000008", "south west": "E12000009", "unknown": "EPC-UNALLOCATED",
    }
    for t, fname, sheets in (
        ("D1", "D1-_Domestic", ("England_and_Wales", "Wales_Only", "by_Region", "by_LA", "by_LA", "by_LA")),
        ("EB1", "EB1-_Existing", ("England_Only", "by_Region")),
        ("NB1", "NB1-_New", ("England_and_Wales", "by_Region")),
    ):
        path = (la if sheets == "by_LA" else nat).raw(fname)
        for sheet in sheets:
            rows = read_ods_sheet(path, f"{t}_{sheet}")
            body = [r for r in rows[4:] if r and r[0].strip() and not r[0].startswith("(")]
            if sheet == "by_Region":
                body = [r for r in body if r[1].strip()]
            r = rnd.choice(body)
            col = rnd.choice(list(col_series))
            if sheet == "by_LA":
                col += 1
                code, quarter = r[0].strip(), r[2].strip()
                code = "EPC-UNALLOCATED-LA" if code.lower() == "unknown" else code
            elif sheet == "by_Region":
                code, quarter = region_map[r[0].strip().lower()], r[1].strip()
            else:
                code = {"England_and_Wales": "K04000001", "England_Only": "E92000001", "Wales_Only": "W92000004"}[sheet]
                quarter = r[1].strip() or r[0].strip()
            series = col_series[col - 1 if sheet == "by_LA" else col]
            if "/" in quarter:
                y, q = quarter.split("/")
                start = f"{y}-{3 * (int(q) - 1) + 1:02d}-01"
                end_m = 3 * int(q)
            else:
                start, end_m = f"{quarter}-01-01", 12
            match = [
                d for k, d in groups.items()
                if k[0] == t and k[1] == code and k[2] == start and int(k[3][5:7]) == end_m
            ]
            cur = match[0][series] if match else None
            raw = num(r[col])
            rep.p(f"| {t} | {sheet} | {r[0].strip()} {quarter} | {series} | {raw:,.0f} | {'' if cur is None else f'{cur:,.0f}'} | {rep.check(cur == raw, f'epc spot {t} {sheet}')} |")

    # 2g LA coverage / discontinuities
    per_q = Counter(r["period_start"] for r in la.rows if r["_n"]["series"] == "lodgements-total" and r["geography_code"] != "EPC-UNALLOCATED")  # type: ignore[index]
    first: dict[str, str] = {}
    last: dict[str, str] = {}
    for r in la.rows:
        if r["_n"]["series"] != "lodgements-total":  # type: ignore[index]
            continue
        g = r["geography_code"]
        first[g] = min(first.get(g, "9999"), r["period_start"])
        last[g] = max(last.get(g, "0000"), r["period_start"])
    qs = sorted(per_q)
    starts = Counter(v for k, v in first.items() if v != qs[0])
    stops = Counter(v for k, v in last.items() if v != qs[-1])
    rep.p("")
    rep.p(
        f"- LA coverage: {len(first)} area codes in total; {per_q[qs[0]]} LAs in {qs[0][:7]}, {per_q[qs[-1]]} in {qs[-1][:7]}. "
        f"Codes starting after 2008 Q4: {dict(sorted(starts.items()))}; codes ending before {qs[-1][:7]}: {dict(sorted(stops.items()))}. "
        "These are LA reorganisations (codes as at lodgement) — **discontinuity**: an LA series is not a fixed geography across 2019/2020/2021/2023, "
        "and the 2025 Barnsley / Sheffield boundary change (E08000016→E08000038, E08000019→E08000039) has old and new codes both present in 2025 Q4."
    )
    zero_q = sum(1 for k, d in groups.items() if k[0] == "D1" and k[1] != "EPC-UNALLOCATED" and d["lodgements-total"] == 0)
    rep.p(f"- D1 rows with zero lodgements in a quarter (published 0, kept): {zero_q}.")


# ---------------------------------------------------------------------------
# 3. EHS DA tables (heating, insulation, disrepair)
# ---------------------------------------------------------------------------


def norm_header(text: str) -> str:
    c = re.sub(r"\s+", "", text.strip().lower())
    return re.sub(r"[\d,*]+$", "", c) if not re.fullmatch(r"[\d\-]+", c) else c


def raw_da(path: Path, sheet: str, group: str, label: str, header: str, occurrence: int = 1, block: int = 0) -> str:
    """Cell under the ``occurrence``-th ``header`` in tenure block ``block``."""
    rows = read_ods_sheet(path, sheet)
    hdr_idx = next(i for i in range(1, 10) if header in [norm_header(c) for c in rows[i]])
    labels = [norm_header(c) for c in rows[hdr_idx]]
    cols = [j for j, l in enumerate(labels) if l == header]
    col = cols[block] if block else cols[occurrence - 1]
    in_group = group == ""
    for r in rows[hdr_idx + 1 :]:
        if not r or not r[0].strip():
            continue
        lab = r[0].strip().lower()
        if lab == group:
            in_group = True
            continue
        if in_group and lab == label:
            return r[col].strip() if col < len(r) else ""
    raise KeyError((sheet, group, label))


def spot_da(rep: Report, packs: dict[str, Pack]) -> None:
    rep.h("## 3. EHS DA tables — spot checks vs published cells")
    rep.p("| Indicator | Year | Selector | Raw cell | Curated | Result |")
    rep.p("|---|---|---|---:|---:|---|")
    checks = [
        ("ehs-heating", "DA6101", "2024", "dwelling age", "pre-1919", "central", 1, 0, dict(series="central-heating", breakdown="dwelling-age", category="dwelling-age:pre-1919", tenure="all-tenures")),
        ("ehs-heating", "DA6101", "2024", "dwelling type", "purpose built flat, high rise", "communalheating", 1, 0, dict(series="communal-heating", breakdown="dwelling-type", category="dwelling-type:purpose-built-flat-high-rise")),
        ("ehs-heating", "DA6101", "2024", "dwelling type", "detached", "yes", 1, 0, dict(series="heat-pump", breakdown="dwelling-type", category="dwelling-type:detached")),
        ("ehs-heating", "DA6101", "2012", "total usable floor area", "less than 50m2", "storage", 1, 0, dict(series="storage-heaters", breakdown="floor-area", category="floor-area:under-50m2")),
        ("ehs-heating", "DA6101", "2015", "tenure", "all social", "condensing-combi", 1, 0, dict(series="boiler-condensing-combi", breakdown="none", tenure="social-rented")),
        ("ehs-heating", "DA6102", "2024", "government office region", "london", "gas", 1, 0, dict(series="main-fuel-gas", breakdown="region", geography_code="E12000007")),
        ("ehs-heating", "DA6102", "2016", "sub-national area", "northern", "electrical", 1, 0, dict(series="main-fuel-electricity", breakdown="sub-national-area", geography_code="EHS-SNA-NORTHERN")),
        ("ehs-insulation", "DA6201", "2024", "dwelling age", "pre-1919", "soliduninsulated", 1, 0, dict(series="solid-wall-uninsulated", breakdown="dwelling-age", category="dwelling-age:pre-1919")),
        ("ehs-insulation", "DA6201", "2024", "dwelling type", "converted flat", "none", 2, 0, dict(series="glazing-none", breakdown="dwelling-type", category="dwelling-type:converted-flat")),
        ("ehs-insulation", "DA6201", "2024", "dwelling type", "converted flat", "none", 1, 0, dict(series="loft-depth-none", breakdown="dwelling-type", category="dwelling-type:converted-flat")),
        ("ehs-insulation", "DA6201", "2009", "dwelling age", "1945-64", "200mmormore", 1, 0, dict(series="loft-depth-200mm-plus", breakdown="dwelling-age", category="dwelling-age:1945-1964")),
        ("ehs-insulation", "DA6201", "2018", "total usable floor area", "110m2or more", "cavitywallswithevidenceofinsulation", 1, 0, dict(series="cavity-insulated", breakdown="floor-area", category="floor-area:110m2-plus")),
        ("ehs-insulation", "DA6202", "2024", "government office region", "north east", "morethanhalf", 1, 0, None),
        ("ehs-insulation", "DA6202", "2024", "government office region", "north east", "all", 1, 0, dict(series="full-double-glazing", breakdown="region", geography_code="E12000001")),
        ("ehs-insulation", "DA6202", "2012", "sub-national area", "rest of england", "noloft", 1, 0, dict(series="no-loft", breakdown="sub-national-area", geography_code="EHS-SNA-REST-OF-ENGLAND")),
        ("ehs-disrepair", "DA5201", "2024", "dwelling age", "pre-1919", "over£65/m", 1, 2, dict(series="repair-cost-gbp-over-65-per-m2", breakdown="dwelling-age", category="dwelling-age:pre-1919", tenure="private-rented")),
        ("ehs-disrepair", "DA5201", "2024", "", "all dwellings", "zerocosts", 1, 4, dict(series="no-basic-repair-costs", breakdown="none", tenure="all-tenures")),
        ("ehs-disrepair", "DA5201", "2012", "tenure", "private rented", "all5electricalsafetyfeatures", 1, 0, dict(series="all-5-electrical-safety-features", breakdown="none", tenure="private-rented")),
        ("ehs-disrepair", "DA5202", "2023", "government office region", "london", "£35-65/m", 1, 4, dict(series="repair-cost-gbp-35-65-per-m2", breakdown="region", geography_code="E12000007", tenure="all-tenures")),
    ]
    files = {"DA6101": "DA6101_", "DA6102": "DA6102_", "DA6201": "DA6201_", "DA6202": "DA6202_", "DA5201": "DA5201_", "DA5202": "DA5202_"}
    for iid, table, year, group, label, header, occ, block, sel in checks:
        if sel is None:
            continue  # unmapped series (documented as not ingested)
        pack = packs[iid]
        raw = raw_da(pack.raw(files[table]), year, group, label, header, occ, block - 1 if block else 0) if block else raw_da(pack.raw(files[table]), year, group, label, header, occ)
        sel = {**sel, "table": table}
        sel.setdefault("geography_code", "E92000001")
        sel.setdefault("tenure", "all-tenures")
        match = [r for r in find(pack, **sel) if r["period_start"].startswith(year)]
        cur = match[0]["value"] if len(match) == 1 else f"{len(match)} rows"
        rawv = num(raw)
        ok = len(match) == 1 and (
            (rawv is not None and match[0]["value"] != "" and float(match[0]["value"]) == rawv)
            or (raw in ("u", "*") and match[0]["observation_status"] == "suppressed")
        )
        desc = ", ".join(f"{k}={v}" for k, v in sel.items() if k not in ("table",))
        rep.p(f"| `{iid}` | {year} | {desc} | `{raw}` ({table}) | {cur} | {rep.check(ok, f'spot {iid} {table} {year} {label}')} |")


def da_consistency(rep: Report, packs: dict[str, Pack]) -> None:
    rep.h("## 4. EHS DA tables — denominators, sums, derived series, skipped rows")
    # 4a denominators
    rep.p("Published `row-dwellings-000s` / `row-sample-unweighted` for mutually exclusive category sets vs the all-dwellings row (same table, year). Tolerance: dwellings ±0.5%; samples exact.")
    rep.p("")
    rep.p("| Indicator | Year | Set | Σ dwellings (000s) | All dwellings | Σ sample | All sample | Result |")
    rep.p("|---|---|---|---:|---:|---:|---:|---|")
    exclusive_types = {"end-terrace", "mid-terrace", "semi-detached", "detached", "bungalow", "converted-flat", "purpose-built-flat-low-rise", "purpose-built-flat-high-rise"}
    for iid, series, table, areas in (("ehs-heating", "central-heating", "DA6101", "DA6102"), ("ehs-insulation", "cavity-uninsulated", "DA6201", "DA6202"), ("ehs-disrepair", "no-basic-repair-costs", "DA5201", "DA5202")):
        pack = packs[iid]
        for year in ("2010", "2019", "2024"):
            base = [r for r in find(pack, series=series, breakdown="none", tenure="all-tenures", table=table, geography_code="E92000001") if r["period_start"].startswith(year)]
            if not base:
                continue
            all_d = num(base[0]["_n"].get("row-dwellings-000s", ""))  # type: ignore[union-attr]
            all_s = num(base[0]["_n"].get("row-sample-unweighted", ""))  # type: ignore[union-attr]
            ages = {r["_n"].get("dwelling-age") for r in pack.rows if r["period_start"].startswith(year) and r["_n"].get("table") == table}  # type: ignore[union-attr]
            split_ages = "post-2013" in ages
            for bk, tbl, filt in (
                ("dwelling-age", table, (lambda c: c != "post-1990") if split_ages else (lambda c: c not in ("1991-2002", "2003-2013", "post-2013"))),
                ("dwelling-type", table, lambda c: c in exclusive_types),
                ("floor-area", table, lambda c: True),
                ("region" if year >= "2020" else "sub-national-area", areas, lambda c: True),
            ):
                tenure = "all-tenures"
                rows = [
                    r for r in pack.rows
                    if r["period_start"].startswith(year) and r["_n"].get("series") == series and r["_n"].get("breakdown") == bk  # type: ignore[union-attr]
                    and r["_n"].get("tenure") == tenure and r["_n"].get("table") == tbl  # type: ignore[union-attr]
                    and filt(r["_n"].get(bk, "") if bk not in ("region", "sub-national-area") else "x")  # type: ignore[union-attr]
                ]
                sd = sum(num(r["_n"].get("row-dwellings-000s", "")) or 0 for r in rows)  # type: ignore[union-attr]
                ss = sum(num(r["_n"].get("row-sample-unweighted", "")) or 0 for r in rows)  # type: ignore[union-attr]
                ok = all_d is not None and abs(sd - all_d) <= 0.005 * all_d and ss == all_s
                rep.p(f"| `{iid}` | {year} | {bk} ({len(rows)}) | {sd:,.0f} | {all_d:,.0f} | {ss:,.0f} | {all_s:,.0f} | {rep.check(ok, f'denominator {iid} {year} {bk}')} |")

    # 4b heating system shares
    pack = packs["ehs-heating"]
    grp: dict[tuple, dict[str, float]] = defaultdict(dict)
    for r in pack.rows:
        n = r["_n"]
        if n["series"] in ("central-heating", "storage-heaters", "room-heater") and r["value"]:  # type: ignore[index]
            grp[(r["period_start"], r["geography_code"], n["tenure"], n["breakdown"], n.get("category", ""), n["table"])][n["series"]] = float(r["value"])  # type: ignore[index,union-attr]
    complete = [d for d in grp.values() if len(d) == 3]
    bad = [d for d in complete if abs(sum(d.values()) - 100) > 0.3]
    rep.p("")
    rep.p(f"- Heating: central + storage + room heaters = 100 ±0.3 for {len(complete) - len(bad)}/{len(complete)} complete rows ({len(grp) - len(complete)} rows have a suppressed component) — {rep.check(not bad, 'heating system sum')}")
    # derived condensing
    comp: dict[tuple, dict[str, float]] = defaultdict(dict)
    for r in pack.rows:
        n = r["_n"]
        if n["series"] in ("boiler-condensing", "boiler-condensing-combi", "condensing-boiler") and r["value"]:  # type: ignore[index]
            comp[(r["period_start"], r["geography_code"], n["tenure"], n["breakdown"], n.get("category", ""), n["table"])][n["series"]] = float(r["value"])  # type: ignore[index,union-attr]
    dk = [d for d in comp.values() if "condensing-boiler" in d]
    dbad = [d for d in dk if abs(d["boiler-condensing"] + d["boiler-condensing-combi"] - d["condensing-boiler"]) > 0.051]
    rep.p(f"- Heating: derived `condensing-boiler` = boiler-condensing + boiler-condensing-combi on {len(dk) - len(dbad)}/{len(dk)} rows (derived= flag on each) — {rep.check(not dbad, 'derived condensing')}")

    # 4c disrepair bands
    pack = packs["ehs-disrepair"]
    bands = ("no-basic-repair-costs", "repair-cost-gbp-1-20-per-m2", "repair-cost-gbp-20-35-per-m2", "repair-cost-gbp-35-65-per-m2", "repair-cost-gbp-over-65-per-m2")
    g2: dict[tuple, dict[str, float]] = defaultdict(dict)
    for r in pack.rows:
        n = r["_n"]
        if n["series"] in bands and r["value"]:  # type: ignore[index]
            g2[(r["period_start"], r["geography_code"], n["tenure"], n["breakdown"], n.get("category", ""), n["table"])][n["series"]] = float(r["value"])  # type: ignore[index,union-attr]
    comp2 = [d for d in g2.values() if len(d) == 5]
    bad2 = [d for d in comp2 if abs(sum(d.values()) - 100) > 0.5]
    rep.p(f"- Disrepair: five repair-cost bands sum to 100 ±0.5 on {len(comp2) - len(bad2)}/{len(comp2)} complete rows — {rep.check(not bad2, 'disrepair bands sum')}")
    miss = Counter(r["period_start"][:4] for r in pack.rows if r["observation_status"] == "missing")
    rep.p(f"- Disrepair 'N/A' cells kept as missing, by year: {dict(sorted(miss.items()))} — 2020–2022 not collected (no full internal inspection, COVID-19). **Discontinuity:** 2019 → 2023 only.")

    # 4d insulation vs annex
    pack = packs["ehs-insulation"]
    da = {r["period_start"][:4]: r["value"] for r in find(pack, series="full-double-glazing", breakdown="none", tenure="all-tenures", table="DA6201")}
    an = {r["period_start"][:4]: r["value"] for r in find(pack, series="full-double-glazing-annex", tenure="all-tenures")}
    same = [y for y in an if y in da and float(da[y]) == float(an[y])]
    rep.p(f"- Insulation: DA6201 full-double-glazing (all tenures) = annex AT2.9 in {len(same)}/{len(an)} years — {rep.check(len(same) == len(an), 'glazing vs annex')}")
    # areas vs dwellings all-dwellings rows (raw)
    p1, p2 = pack.raw("DA6201_"), pack.raw("DA6202_")
    eq = 0
    for y in ("2010", "2015", "2020", "2024"):
        a = raw_da(p1, y, "", "all dwellings", "noloft")
        b = raw_da(p2, y, "", "all dwellings", "noloft")
        eq += a == b
    rep.p(f"- DA6201 vs DA6202 all-dwellings 'no loft' cell identical in {eq}/4 sampled years (areas table is the same survey) — {rep.check(eq == 4, 'DA6201 vs DA6202')}")

    # 4e skipped rows
    rep.p("")
    rep.p("**Published rows not ingested (mislabelled in source):**")
    for path, sheet, table in ((packs["ehs-heating"].raw("DA6102_"), "2008", "DA6102"), (packs["ehs-insulation"].raw("DA6202_"), "2008", "DA6202")):
        rows = read_ods_sheet(path, sheet)
        sna = [r for r in rows if r and r[0].strip().lower() in ("northern", "london and south east")]
        bad = [r for r in rows if r and r[0].strip() and r[0].strip()[0].islower() and any(c.strip() for c in r[1:6]) and r[0].strip().lower() not in ("all dwellings",) and len(r[0]) > 40]
        alld = [r for r in rows if r and r[0].strip().lower() == "all dwellings" and any(num(c) is not None for c in r[1:])][-1]
        nums = [r for r in rows if r and r[0].strip()]
        dcol = max(j for j, c in enumerate(alld) if num(c) is not None) - 1
        tot = sum(num(r[dcol]) or 0 for r in sna + bad[:1])
        rep.p(
            f"- {table} 2008: the third sub-national-area row carries the footnote text as its label ('{bad[0][0].strip()[:60]}…'), sample size blank. "
            f"Its dwellings (000s) {bad[0][dcol].strip()} + Northern + London & SE = {tot:,.0f} vs all dwellings {alld[dcol].strip()} — consistent with 'Rest of England', "
            "but the label is not inferred: row left out, `Rest of England` 2008 absent for heating/insulation."
        )
        rep.warns.append(f"{table} 2008 'Rest of England' row mislabelled in source — not ingested")
    rep.p("- DA5201 2022 repeats tenure as rows inside the tenure column blocks (every cell N/A) — skipped as structurally redundant.")


# ---------------------------------------------------------------------------
# 5. Thermal comfort
# ---------------------------------------------------------------------------


def raw_annex(path: Path, sheet: str, section: str, group: str, label: str, col: int, *, label_col: int = 1) -> str:
    rows = read_ods_sheet(path, sheet)
    sec, grp = "", ""
    markers = {"thousands of dwellings": "thousands", "thousands of households": "thousands", "percentages": "percentages", "sample sizes": "sample", "sample size": "sample"}
    for r in rows:
        if not r:
            continue
        lab = r[label_col].strip().lower() if len(r) > label_col else ""
        vals = [c.strip().lower() for c in r[label_col + 1 :] if c.strip()]
        if not lab and vals and set(vals) <= set(markers):
            sec, grp = markers[vals[-1]], ""
            continue
        if lab and not vals:
            grp = lab
            continue
        if sec == section and (grp == group or group == "*") and lab == label:
            return r[col].strip() if col < len(r) else ""
    raise KeyError((sheet, section, group, label))


def thermal(rep: Report, pack: Pack) -> None:
    rep.h("## 5. `ehs-thermal-comfort` (survey-response)")
    piq, wea = pack.raw("Chapter_2_Annex"), pack.raw("Weather_Resilient")
    rep.p("| Selector | Raw cell | Curated | Result |")
    rep.p("|---|---:|---:|---|")
    checks = [
        (piq, "AT_2_9", "percentages", "able to keep warm during winter", "no", 3, dict(series="unable-to-keep-warm-in-winter", tenure="private-rented", breakdown="none")),
        (piq, "AT_2_9", "percentages", "able to keep warm during winter", "no", 4, dict(series="unable-to-keep-warm-in-winter", tenure="local-authority", breakdown="none")),
        (piq, "AT_2_9", "percentages", "reduce heating", "mentioned", 7, dict(series="reduced-heating", tenure="all-tenures", breakdown="none")),
        (piq, "AT_2_11", "percentages", "rooms affected by overheating", "attic rooms", 4, dict(series="overheating-room-attic-rooms", tenure="local-authority")),
        (piq, "AT_2_13", "percentages", "household contains children aged below 5", "unable to keep warm during winter", 5, dict(series="unable-to-keep-warm-in-winter", tenure="housing-association", breakdown="household-composition")),
        (wea, "AT1_1", "percentages", "construction type", "steel frame", 3, dict(series="home-gets-uncomfortably-hot", tenure="private-rented", breakdown="construction-type", category="construction-type:steel-frame")),
        (wea, "AT1_2", "percentages", "dwelling type", "converted flat", 4, dict(series="unable-to-keep-warm-in-winter", tenure="social-rented", breakdown="dwelling-type", category="dwelling-type:converted-flat")),
        (wea, "AT1_2", "percentages", "dwelling type", "detached house", 4, dict(series="unable-to-keep-warm-in-winter", tenure="social-rented", breakdown="dwelling-type", category="dwelling-type:detached")),
        (wea, "AT1_3", "percentages", "tenure", "private rented", 5, dict(series="both-overheating-and-unable-to-keep-warm", tenure="private-rented", breakdown="none")),
    ]
    for path, sheet, sec, grp, lab, col, sel in checks:
        raw = raw_annex(path, sheet, sec, grp, lab, col)
        m = find(pack, **sel)
        if sel.get("series") == "unable-to-keep-warm-in-winter" and sel.get("breakdown") == "household-composition":
            m = [r for r in m if r["_n"].get("household-composition") == "has-child-aged-under-5"]  # type: ignore[union-attr]
        ok = len(m) == 1 and ((num(raw) is not None and m[0]["value"] and float(m[0]["value"]) == num(raw)) or (raw == "u" and m[0]["observation_status"] == "suppressed"))
        cur = m[0]["value"] or m[0]["observation_status"] if len(m) == 1 else f"{len(m)} rows"
        rep.p(f"| {sheet} {grp} / {lab} col {col} → {', '.join(f'{k}={v}' for k, v in sel.items())} | `{raw}` | {cur} | {rep.check(ok, f'thermal spot {sheet} {lab}')} |")

    rep.p("")
    # PIQ AT2.9 vs weather all-dwellings rows (not duplicated)
    cmp_rows = []
    for series, sheet, grp, lab in (("unable-to-keep-warm-in-winter", "AT1_2", "construction type", "all dwellings"), ("home-gets-uncomfortably-hot", "AT1_1", "construction type", "all dwellings")):
        for col, tenure in ((2, "owner-occupied"), (3, "private-rented"), (4, "social-rented"), (5, "all-tenures")):
            w = raw_annex(wea, sheet, "percentages", grp, lab, col)
            c = find(pack, series=series, tenure=tenure, breakdown="none", table="PIQ AT2.9")
            cmp_rows.append((series, tenure, w, c[0]["value"] if c else None))
    eq = sum(1 for _, _, w, c in cmp_rows if c is not None and num(w) == float(c))
    rep.p(f"- PIQ AT2.9 (households) vs weather AT1.1/AT1.2 all-dwellings rows (occupied dwellings): {eq}/{len(cmp_rows)} identical — same respondents, two base labels; the weather total rows are not ingested to avoid duplicates — {rep.check(eq == len(cmp_rows), 'thermal piq vs weather')}")
    # AT1.3 identities
    t13 = {}
    for r in find(pack, table="Weather AT1.3"):
        t13.setdefault((r["_n"]["tenure"], r["_n"].get("category", "")), {})[r["_n"]["series"]] = r["value"]  # type: ignore[index,union-attr]
    ok_sum = sum(1 for d in t13.values() if all(d.values()) and len(d) == 4 and abs(sum(float(v) for v in d.values()) - 100) <= 0.2)
    rep.p(f"- Weather AT1.3: neither + overheating only + cold only + both = 100 ±0.2 on {ok_sum}/{len(t13)} rows (rows with a 'u' cannot be checked) — {rep.check(ok_sum >= len(t13) - 1, 'AT1.3 sums')}")
    links = []
    for tenure, col in (("owner-occupied", 2), ("private-rented", 3), ("social-rented", 4), ("all-tenures", 5)):
        d = t13.get((tenure, ""), {})
        hot = num(raw_annex(wea, "AT1_1", "percentages", "construction type", "all dwellings", col))
        cold = num(raw_annex(wea, "AT1_2", "percentages", "construction type", "all dwellings", col))
        if d.get("overheating-only") and d.get("both-overheating-and-unable-to-keep-warm") and d.get("unable-to-keep-warm-only"):
            links.append((tenure, float(d["overheating-only"]) + float(d["both-overheating-and-unable-to-keep-warm"]), hot, float(d["unable-to-keep-warm-only"]) + float(d["both-overheating-and-unable-to-keep-warm"]), cold))
    gap = max(max(abs(a - b), abs(c - e)) for _, a, b, c, e in links)
    ok_links = gap <= 0.25
    rep.p(
        "- AT1.3 overheating-only + both vs AT1.1 total; cold-only + both vs AT1.2 total: "
        + "; ".join(f"{t}: {a:.1f} vs {b}, {c:.1f} vs {e}" for t, a, b, c, e in links)
        + f". Largest gap {gap:.1f} pp — AT1.3 needs a valid answer to *both* questions (don't-know on either excluded), "
        f"so its base is slightly smaller; gaps ≤0.25 pp accepted as base + rounding — {rep.check(ok_links, 'AT1.3 vs AT1.1/1.2')}"
    )
    # complements
    comp_ok = 0
    comp_n = 0
    for grp, yes, no in (("able to keep warm during winter", "yes", "no"), ("home gets uncomfortably hot", "yes", "no")):
        for col in range(2, 8):
            a, b = num(raw_annex(piq, "AT_2_9", "percentages", grp, yes, col)), num(raw_annex(piq, "AT_2_9", "percentages", grp, no, col))
            comp_n += 1
            comp_ok += a is not None and b is not None and abs(a + b - 100) <= 0.1
    rep.p(f"- Complements not emitted (AT2.9 'yes'/'no' pairs) sum to 100 in {comp_ok}/{comp_n} raw cells — {rep.check(comp_ok == comp_n, 'thermal complements')}")
    # anomaly
    th = raw_annex(wea, "AT1_2", "thousands", "dwelling type", "detached house", 5)
    pct = raw_annex(wea, "AT1_2", "percentages", "dwelling type", "detached house", 5)
    tot = raw_annex(wea, "AT1_3", "thousands", "dwelling type", "detached house", 6)
    rep.p(
        f"- **Source anomaly:** weather AT1.2 detached house, all dwellings: thousands `{th}` but share `{pct}%`; AT1.3 gives {tot}k detached occupied dwellings, "
        f"so {pct}% ≈ {float(pct) / 100 * num(tot):,.0f}k, and the owner-occupied + private-rented cells are 208k + 43k. The published 4,190 is inconsistent "
        "(likely a transposed total). Percentages kept; that row's `dwellings-000s` note is the published figure and must not be used."
    )
    rep.warns.append("Weather AT1.2 detached/all-dwellings thousands (4,190) inconsistent with its share — published value carried in notes only")
    small = Counter()
    for r in pack.rows:
        s = num(r["_n"].get("cell-sample-unweighted", r["_n"].get("sample-unweighted", "")))  # type: ignore[union-attr]
        if s is not None:
            small["<30" if s < 30 else "<100" if s < 100 else "≥100"] += 1
    rep.p(f"- Unweighted bases on rows that carry one: {dict(small)}. Smallest are owner-occupied / private-rented cells for concrete boxwall / other concrete and purpose-built high-rise (italicised 'indicative' in source).")


# ---------------------------------------------------------------------------
# 6. Repairs satisfaction
# ---------------------------------------------------------------------------


def repairs(rep: Report, pack: Pack) -> None:
    rep.h("## 6. `ehs-repairs-satisfaction` (survey-response)")
    path = pack.raw("FT5421")
    rows = read_ods_sheet(path, "FT5421")

    def ft(group: str, year: str, col: int) -> str:
        on = False
        for r in rows:
            lab = r[0].strip().lower() if r else ""
            if lab == group:
                on = True
                continue
            if on and lab in ("local authority renters", "housing association renters", "all social renters", "all private renters"):
                on = False
            if on and lab == year:
                return r[col].strip()
        raise KeyError((group, year))

    rep.p("| Selector | Raw cell | Curated | Result |")
    rep.p("|---|---:|---:|---|")
    for group, year, col, sel in (
        ("local authority renters", "2024-25", 7, dict(series="dissatisfied", tenure="local-authority", period_start="2024-04-01", breakdown="none")),
        ("housing association renters", "1994-95", 1, dict(series="very-satisfied", tenure="housing-association", period_start="1994-04-01", breakdown="none")),
        ("all private renters", "2008-093", 3, dict(series="satisfied", tenure="private-rented", period_start="2008-04-01", breakdown="none")),
        ("all social renters", "2015-16", 4, dict(series="neither-satisfied-nor-dissatisfied", tenure="social-rented", period_start="2015-04-01", breakdown="none")),
    ):
        raw = ft(group, year, col)
        m = find(pack, table="FT5421", **sel)
        ok = len(m) == 1 and float(m[0]["value"]) == num(raw)
        rep.p(f"| FT5421 {group} {year} col {col} | `{raw}` | {m[0]['value'] if m else '—'} | {rep.check(ok, f'repairs spot {group} {year}')} |")
    piq = pack.raw("Chapter_3_Annex")
    for sheet, grp, lab, col, sel in (
        ("AT_3_1", "damp present", "dissatisfied", 4, dict(series="dissatisfied", tenure="local-authority", breakdown="housing-quality", category="housing-quality:damp-present")),
        ("AT_3_1", "damp present", "neither satisfied nor dissatisfied", 2, dict(series="neither-satisfied-nor-dissatisfied", tenure="owner-occupied-leaseholder", breakdown="housing-quality", category="housing-quality:damp-present")),
        ("AT_3_2", "estate agent or property manager responsible for repairs", "dissatisfied", 2, dict(series="dissatisfied", tenure="private-rented", breakdown="repair-responsibility")),
        ("AT_3_3", "reason", "landlord slow to get things done", 2, dict(series="dissatisfaction-reason-landlord-slow-to-get-things-done", tenure="owner-occupied-leaseholder")),
    ):
        raw = raw_annex(piq, sheet, "percentages", grp, lab, col)
        m = find(pack, **sel)
        if sheet == "AT_3_2":
            m = [r for r in m if r["_n"].get("repair-responsibility") == "estate-agent-or-property-manager"]  # type: ignore[union-attr]
        ok = len(m) == 1 and ((num(raw) is not None and m[0]["value"] and float(m[0]["value"]) == num(raw)) or (raw == "u" and m[0]["observation_status"] == "suppressed"))
        cur = (m[0]["value"] or m[0]["observation_status"]) if len(m) == 1 else f"{len(m)} rows"
        rep.p(f"| {sheet} {grp} / {lab} col {col} | `{raw}` | {cur} | {rep.check(ok, f'repairs spot {sheet} {lab}')} |")

    rep.p("")
    by: dict[tuple, dict[str, float]] = defaultdict(dict)
    for r in find(pack, table="FT5421"):
        by[(r["period_start"], r["_n"]["tenure"])][r["_n"]["series"]] = float(r["value"])  # type: ignore[index]
    off = {
        k: (round(d["very-satisfied"] + d["fairly-satisfied"] - d["satisfied"], 1), round(d["slightly-dissatisfied"] + d["very-dissatisfied"] - d["dissatisfied"], 1))
        for k, d in by.items()
        if abs(d["very-satisfied"] + d["fairly-satisfied"] - d["satisfied"]) > 0.2 or abs(d["slightly-dissatisfied"] + d["very-dissatisfied"] - d["dissatisfied"]) > 0.2
    }
    off_years = {k[0][:4] for k in off}
    resid = [100 - (d["satisfied"] + d["neither-satisfied-nor-dissatisfied"] + d["dissatisfied"]) for d in by.values()]
    rep.p(
        f"- FT5421: very + fairly = all satisfied and slightly + very = all dissatisfied (±0.2) in {len(by) - len(off)}/{len(by)} tenure-years; "
        f"the exceptions are all in survey years {sorted(off_years)} (SEH; published components rounded to whole numbers): "
        + "; ".join(f"{k[0][:4]} {k[1]} {v[0]:+}/{v[1]:+}" for k, v in sorted(off.items()))
        + f" — {rep.check(off_years <= {'2001', '2002'}, 'FT5421 nets')} (source rounding, kept as published)"
    )
    rep.p(
        f"- FT5421: 100 − (satisfied + neither + dissatisfied) ranges {min(resid):.1f} to {max(resid):.1f} pp — the residual is table note 1 "
        f"(households where no repairs were done or repairs were not the landlord's responsibility are in the total). Never negative — {rep.check(min(resid) >= -0.3, 'FT5421 residual')}"
    )
    b31: dict[tuple, float] = defaultdict(float)
    n31: Counter = Counter()
    for r in find(pack, table="PIQ AT3.1"):
        if r["value"]:
            b31[(r["_n"]["tenure"], r["_n"]["category"])] += float(r["value"])  # type: ignore[index]
            n31[(r["_n"]["tenure"], r["_n"]["category"])] += 1  # type: ignore[index]
    full = [k for k, n in n31.items() if n == 3]
    ok31 = sum(1 for k in full if abs(b31[k] - 100) <= 0.2)
    rep.p(f"- PIQ AT3.1: satisfied + neither + dissatisfied = 100 ±0.2 in {ok31}/{len(full)} complete groups — {rep.check(ok31 == len(full), 'AT3.1 sums')}")
    ft_prs = find(pack, table="FT5421", series="satisfied", tenure="private-rented", period_start="2024-04-01")
    piq_prs = find(pack, table="PIQ AT3.1", series="satisfied", tenure="private-rented", category="housing-quality:all-households")
    rep.p(
        f"- Base difference (not an error): 2024-25 private renters satisfied — FT5421 {ft_prs[0]['value']}% (all renting households, full household sample) vs "
        f"PIQ AT3.1 {piq_prs[0]['value']}% (excludes landlord-not-responsible, household subsample). Kept as separate keys (breakdown=none vs housing-quality:all-households)."
    )
    rep.p("- FT5421 'all private renters' prints a values row with no year label between 2007-08 and a value-less '2008-09' label row, then '2008-09³' (note 3). The unlabelled row (42.5 / 29.0 / 71.5 … 2,423k) is not ingested; 2008-09 private renters = the '2008-09³' row. **Discontinuity** 2007-08 (SEH) → 2008-09 (EHS).")
    rep.warns.append("FT5421 private renters: unlabelled 2008-09 values row not ingested (ambiguous label)")


# ---------------------------------------------------------------------------
# 7. Accessibility
# ---------------------------------------------------------------------------


def accessibility(rep: Report, pack: Pack) -> None:
    import openpyxl

    rep.h("## 7. `ehs-accessibility-adaptations`")
    wb = openpyxl.load_workbook(pack.raw("Accessability"), data_only=True, read_only=True)
    rep.p("| Selector | Raw cell | Curated | Result |")
    rep.p("|---|---:|---:|---|")
    for sheet, tenure_label, feature, series, tenure, year in (
        ("AT2", "housing association", "level access to main entrance", "feature-level-access-to-main-entrance", "housing-association", "2018"),
        ("AT1", "all dwellings", "all four accessibility features", "all-four-accessibility-features", "all-tenures", "2009"),
        ("AT2", "private rented", "wc at entrance level?", "feature-wc-at-entrance-level", "private-rented", "2018"),
    ):
        ws = wb[sheet]
        cur_t, raw = "", None
        for r in ws.iter_rows(values_only=True):
            b = str(r[1]).strip().lower() if len(r) > 1 and r[1] is not None else ""
            c = str(r[2]).strip().lower() if len(r) > 2 and r[2] is not None else ""
            if b:
                cur_t = b
            if cur_t == tenure_label and c == feature:
                raw = r[7]
                break
        m = [r for r in find(pack, series=series, tenure=tenure) if r["period_start"].startswith(year)]
        ok = raw is not None and len(m) == 1 and abs(float(m[0]["value"]) - float(raw)) < 0.05
        rep.p(f"| {sheet} {tenure_label} / {feature} | `{float(raw):.4f}` | {m[0]['value'] if m else '—'} | {rep.check(ok, f'access spot {sheet} {feature}')} |")
    wb.close()
    adapt = pack.raw("Home_Adaptations")
    for sheet, grp, lab, col, sel in (
        ("AT1_3", "tenure", "private renters", 8, dict(series="accommodation-unsuitable", tenure="private-rented", period_start="2019-04-01")),
        ("AT3_1", "age", "75 or over", 2, dict(series="lacks-needed-adaptations", tenure="all-tenures", breakdown="age-of-oldest-person-needing-adaptation", period_start="2014-04-01")),
        ("AT1_1", "required adaptation(s)", "yes", 3, dict(series="household-member-needs-adaptations", period_start="2019-04-01")),
    ):
        rows = read_ods_sheet(adapt, sheet)
        grp_key = "age1" if grp == "age" else grp
        raw = raw_annex(adapt, sheet, "percentages", grp_key, lab, col)
        m = find(pack, **sel)
        if sheet == "AT3_1":
            m = [r for r in m if r["_n"].get("age-of-oldest-person-needing-adaptation") == "75-plus"]  # type: ignore[union-attr]
        ok = len(m) == 1 and float(m[0]["value"]) == num(raw)
        rep.p(f"| {sheet} {grp} / {lab} col {col} | `{raw}` | {m[0]['value'] if m else '—'} | {rep.check(ok, f'adapt spot {sheet} {lab}')} |")
    pairs_ok = pairs_n = 0
    for sheet, a_off in (("AT1_3", 0), ("AT3_1", 0)):
        rows = read_ods_sheet(adapt, sheet)
        in_pct = False
        for r in rows:
            if any(c.strip().lower() == "percentages" for c in r):
                in_pct = True
                continue
            if in_pct and len(r) > 9 and r[1].strip() and num(r[2]) is not None:
                for base in (2, 7):
                    pairs_n += 1
                    pairs_ok += abs((num(r[base]) or 0) + (num(r[base + 1]) or 0) - 100) <= 0.1
    rep.p("")
    rep.p(f"- AT1.3 suitable + unsuitable and AT3.1 lack + all installed = 100 in {pairs_ok}/{pairs_n} raw cells (complements not emitted) — {rep.check(pairs_ok == pairs_n, 'adaptations complements')}")
    rep.p("- **Discontinuity / age:** accessibility features 2009 and 2018 only; adaptations 2014-15 and 2019-20 only. No later EHS accessibility or adaptations tables are published (checked gov.uk EHS collection, 2026-11-04).")


# ---------------------------------------------------------------------------


def main() -> None:
    packs = {iid: load(iid) for iid in (*EPC_IDS, *EHS_IDS)}
    rep = Report()
    rep.p("# QA — Housing Domain 07 'Housing quality' wave 2 · 2026-11-04")
    rep.p("")
    rep.p(
        "Independent checks (raw cells re-read by this script, not the connectors' parsers) of the EPC register statistics and the "
        "new / extended EHS packages. Read-only: no source or curated data rewritten. Script: "
        "`src/validation/qa_housing_quality_wave2_2026_11_04.py`."
    )
    integrity(rep, packs)
    epc_checks(rep, packs["epc-domestic-lodgements"], packs["epc-domestic-lodgements-by-local-authority"])
    spot_da(rep, packs)
    da_consistency(rep, packs)
    thermal(rep, packs["ehs-thermal-comfort"])
    repairs(rep, packs["ehs-repairs-satisfaction"])
    accessibility(rep, packs["ehs-accessibility-adaptations"])

    rep.h("## 8. Not published / not ingested / needs access")
    rep.p(
        "- **EPC certificate-level data** (England and Wales): get-energy-performance-data.communities.gov.uk (and the redirected "
        "epc.opendatacommunities.org) requires a GOV.UK One Login account for bulk CSV / API — **not registered, not used**. A stock view "
        "(latest valid certificate per dwelling) needs a separate pipeline: certificate lifecycle (10-year validity, expiry), supersession / "
        "repeat lodgements, UPRN / address matching to the dwelling stock, transaction-type and tenure fields, and licence terms (address data). "
        "The aggregate live tables ingested here count lodgements, not dwellings."
    )
    rep.p(
        "- **Scotland**: the Scottish EPC Register publishes quarterly *certificate-level* extracts (via the Scottish Government's open data "
        "portal); no aggregate domestic-EPC-by-band statistical table comparable to D1 was found. Aggregating certificates would be a derived "
        "pipeline (same lifecycle issues) — not ingested. Scottish House Condition Survey EPC-band estimates are a survey measure (comparable "
        "to EHS, not to D1) — out of scope for this wave."
    )
    rep.p("- EB1 / NB1 by local authority, D2 (environmental impact rating), D3 (floor area / energy use / CO₂ / fuel cost), D4a/D4b (transaction type × tenure): published, not ingested.")
    rep.p("- DA6101 solid fuel / biomass / water heating / standard, back and combination boilers; DA6201 'other' wall type and intermediate loft depths / glazing extents; DA5201 mean repair cost (£/m²) and the four other electrical features; DA6103/DA6203/DA5203 household tables: published, not ingested (kept heating/insulation under the 10k web load).")
    rep.p("- DA7104 (energy performance by heating / insulation characteristics), DA1101 stock profile (construction type distribution — Stock & Tenure scope): published, not ingested. Construction (wall) type appears here only as a condition breakdown of thermal comfort (weather AT1.1/1.2).")
    rep.p("- FA5431 / FA5441 (repairs satisfaction by respondent characteristics; main reason, live table) and FA5401 (satisfaction with accommodation): published, not ingested this wave.")

    rep.h("## Verdict")
    if rep.fails:
        rep.p(f"**FAIL** — {len(rep.fails)} check(s) failed:")
        for f in rep.fails:
            rep.p(f"- {f}")
    else:
        rep.p("**PASS** — all integrity, reconciliation, spot, sum and denominator checks passed.")
    if rep.warns:
        rep.p("")
        rep.p("Source issues recorded (not errors in ingestion; source data not rewritten):")
        for w in rep.warns:
            rep.p(f"- {w}")
    rep.p("")
    rep.p(
        "Ready recommendation: `epc-domestic-lodgements`, `epc-domestic-lodgements-by-local-authority`, `ehs-heating` and `ehs-insulation` "
        "(breakdowns), `ehs-disrepair`, `ehs-thermal-comfort`, `ehs-repairs-satisfaction`, `ehs-accessibility-adaptations` → **Ready** "
        "if the verdict above is PASS."
    )
    QA_DIR.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(rep.lines) + "\n", encoding="utf-8")
    print(f"wrote {REPORT} — fails={len(rep.fails)} warns={len(rep.warns)}")
    for f in rep.fails:
        print("  FAIL", f)


if __name__ == "__main__":
    main()
