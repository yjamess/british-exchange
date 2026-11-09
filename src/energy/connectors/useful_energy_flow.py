"""Useful / rejected energy pack from ECUK Whole energy flow tables (DESNZ).

Reads the pinned workbook and writes ``curated/assumed_efficiencies.json`` for the
Useful Energy Experiment view:

* ``rows``        — Assumed Efficiencies, all four sector blocks (Domestic, Services,
                    Industry, Transport), one row per published consumption line.
* ``by_sector_year`` — Table W2, useful and rejected by sector, 2017 onward.
* ``by_end_use``  — Table W3, useful and rejected by sector × end use (latest year).
* ``counterfactual`` — Table W4, "if efficiency stayed at 2017" (Note 7: reflects
                    updated assumptions, not real-world savings).
* ``notes``       — the workbook's Notes sheet, verbatim.
* ``identity``    — check that every published row reproduces as
                    useful = consumption × efficiency, rejected = max(0, consumption − useful).
                    Only when it holds may the site offer a user-scenario recalculation.

Usage::

    uv run python -m energy.connectors.useful_energy_flow \
        data/energy/primary-energy-flow-allocation/raw/2026-11-06/ECUK_2026_Whole_energy_flow_tables.xlsx
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import openpyxl

OUT = Path("data/energy/primary-energy-flow-allocation/curated/assumed_efficiencies.json")

# Block start columns on the Assumed Efficiencies sheet: label, consumption, efficiency, useful, rejected.
BLOCKS = {"domestic": 0, "services": 5, "industry": 10, "transport": 15}

# Labels that name a fuel (a sub-heading, or a leaf that is itself the fuel).
FUELS = {
    "solid fuels",
    "natural gas",
    "gas",
    "electricity",
    "heat pumps",
    "other heating",
    "petroleum products",
    "petroleum products/coal",
    "heat sold",
    "bioenergy & waste",
    "district heating",
    "other",
}

# Fuel sub-headings (a heading row with no numbers). "Other" as a heading is an end use, not a fuel.
FUEL_HEADINGS = {"electricity", "natural gas", "petroleum products", "bioenergy & waste"}

# Sheet headings that Table W3 folds into a wider end use (reconciled to W3 in identity checks).
W3_GROUP = {("services", "Fans"): "Cooling & humidification", ("services", "Small power"): "Other", ("services", "Cooled storage"): "Other"}


def _num(v: Any) -> float | None:
    return float(v) if isinstance(v, (int, float)) else None


def _clean(label: str) -> str:
    return re.sub(r"\s*\[Note \d+\]", "", str(label)).strip()


def assumed_efficiencies(ws: Any, end_uses: dict[str, set[str]], year: int) -> tuple[list[dict], dict]:
    rows = list(ws.iter_rows(values_only=True))
    out: list[dict] = []
    totals: dict[str, dict] = {}
    for sector, c in BLOCKS.items():
        end_use: str | None = None
        fuel: str | None = None
        known = {e.lower(): e for e in end_uses.get(sector, set())}
        for r in rows[4:]:
            label = r[c] if c < len(r) else None
            if label in (None, ""):
                continue
            label = _clean(label)
            cons, eff, use, rej = (_num(r[c + k]) if c + k < len(r) else None for k in (1, 2, 3, 4))
            low = label.lower()
            if low == "total":
                totals.setdefault(sector, {}).update({"consumption_ktoe": cons, "useful_ktoe": use, "rejected_ktoe": rej})
                continue
            if low == "proportion rejected energy":
                totals.setdefault(sector, {})["proportion_rejected"] = rej
                continue
            if cons is None:  # a heading
                if low in FUEL_HEADINGS:
                    fuel = label
                else:
                    end_use, fuel = label, None
                continue
            # A leaf. Industry sub-sectors and transport Air / Water are end uses in their own right (W3).
            if low in known and low not in FUELS:
                out.append(_row(sector, known[low], None, label, cons, eff, use, rej, year))
                continue
            if low in FUELS:
                fuel = None
                out.append(_row(sector, end_use, label, label, cons, eff, use, rej, year))
            else:
                out.append(_row(sector, end_use, fuel, label, cons, eff, use, rej, year))
    return out, totals


def _row(sector, end_use, fuel, tech, cons, eff, use, rej, year) -> dict:
    heading = end_use or ""
    return {
        "sector": sector,
        "end_use": W3_GROUP.get((sector, heading), heading),
        "heading": heading,
        "fuel": fuel,
        "fuel_or_tech": tech,
        "consumption_ktoe": cons,
        "efficiency": eff,
        "useful_ktoe": use,
        "rejected_ktoe": rej,
        "year": year,
    }


def identity(rows: list[dict]) -> dict:
    """Recompute every row; report the worst absolute error (ktoe)."""
    worst = 0.0
    failures = []
    for r in rows:
        c, e, u, j = r["consumption_ktoe"], r["efficiency"], r["useful_ktoe"], r["rejected_ktoe"]
        if None in (c, e, u, j):
            continue
        uu = c * e
        jj = max(0.0, c - uu)
        err = max(abs(uu - u), abs(jj - j))
        worst = max(worst, err)
        if err > 0.01:
            failures.append(f"{r['sector']} · {r['end_use']} · {r['fuel_or_tech']}: {err:.4f}")
    return {
        "rule": "useful = consumption × efficiency; rejected = max(0, consumption − useful); ambient heat = max(0, useful − consumption)",
        "max_abs_error_ktoe": round(worst, 6),
        "reproducible": not failures,
        "failures": failures,
    }


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    xlsx = Path(args[0])
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)

    title = str(next(wb["Assumed Efficiencies"].iter_rows(values_only=True))[0])
    year = int(re.search(r"(\d{4})", title).group(1))  # "Energy efficiency assumptions by sector, 2025"

    # W3 first: its end-use names identify leaf rows that are end uses themselves.
    w3 = []
    end_uses: dict[str, set[str]] = {}
    for r in list(wb["Table W3"].iter_rows(values_only=True))[4:]:
        if not r or r[0] in (None, ""):
            continue
        sector = _clean(r[0]).lower()
        w3.append({"sector": sector, "end_use": _clean(r[1]), "useful_ktoe": _num(r[2]), "rejected_ktoe": _num(r[3]), "total_ktoe": _num(r[4]), "year": year})
        end_uses.setdefault(sector, set()).add(_clean(r[1]))

    rows, totals = assumed_efficiencies(wb["Assumed Efficiencies"], end_uses, year)

    w2_rows = list(wb["Table W2"].iter_rows(values_only=True))
    head = [_clean(h) if h else "" for h in w2_rows[3]]
    w2 = []
    for r in w2_rows[4:]:
        if not isinstance(r[0], (int, float)):
            continue
        for i, h in enumerate(head[1:], 1):
            m = re.match(r"(.+?) - (useful|rejected)", h)
            if m and _num(r[i]) is not None:
                w2.append({"year": int(r[0]), "sector": m.group(1).lower().replace("total sectors", "all"), "kind": m.group(2), "ktoe": _num(r[i])})

    w4 = []
    for r in list(wb["Table W4"].iter_rows(values_only=True))[4:]:
        if r and r[0] not in (None, ""):
            w4.append({"sector": _clean(r[0]).lower().replace("total", "all"), "useful_now": _num(r[1]), "rejected_now": _num(r[2]), "useful_2017_efficiency": _num(r[3]), "rejected_2017_efficiency": _num(r[4]), "year": year})

    notes = {}
    for r in wb["Notes"].iter_rows(values_only=True):
        if r and isinstance(r[0], str) and r[0].strip().startswith("Note ") and len(r) > 1 and r[1]:
            notes[r[0].strip()] = str(r[1]).strip()

    pack = {
        "source": f"{xlsx.name} · Assumed Efficiencies, Tables W2–W4, Notes",
        "status": "Official Statistics in Development — modelled coefficients",
        "year": year,
        "sector_scope": "domestic, services, industry, transport",
        "note": "Published assumed efficiencies applied to allocated consumption (Note 3). Not measured losses. Heat pump useful energy includes ambient heat (Note 2). User scenarios are not DESNZ statistics.",
        "rows": rows,
        "sector_totals": totals,
        "by_sector_year": w2,
        "by_end_use": w3,
        "counterfactual": w4,
        "notes": notes,
        "identity": identity(rows),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(pack, indent=2) + "\n")
    print(f"wrote {OUT} · {len(rows)} coefficient rows · identity reproducible={pack['identity']['reproducible']} (max err {pack['identity']['max_abs_error_ktoe']} ktoe)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
