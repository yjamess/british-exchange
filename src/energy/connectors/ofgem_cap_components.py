"""Ofgem default tariff cap — cost components by period (Annex 9, sheet 1b).

Reads the pinned Annex 9 levelised cap workbook and writes
``data/energy/ofgem-default-tariff-cap/curated/components.json``: for every charge restriction
period since April 2017, the published cap broken into its cost allowances (wholesale, network,
policy, operating, smart meters, payment-method adjustments, supplier margin, headroom,
levelisation), the total before VAT and the total including VAT.

Ofgem notes on the sheet: values are £ per customer per year, average across GB regions,
excluding VAT except "Total inc VAT"; "Typical consumption" uses the typical consumption values
that applied in each period (updated May 2026; earlier periods use the values at the time).

Usage::

    uv run python -m energy.connectors.ofgem_cap_components \
        data/energy/ofgem-default-tariff-cap/raw/2026-11-07/oct-dec-2026/annex9-levelised-cap-rates.xlsx
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import openpyxl

OUT = Path("data/energy/ofgem-default-tariff-cap/curated/components.json")
SHEET = "1b Historical level tables"

FUELS = {
    "Electricity: Single-Rate Metering Arrangement": "elec_single",
    "Electricity: Multi-Register Metering Arrangement": "elec_multi",
    "Gas": "gas",
    "Dual fuel (implied)": "dual_fuel",
}
PAYMENTS = {"Other Payment Method": "other", "Standard Credit": "standard_credit", "PPM": "prepayment"}
LEVELS = {"Nil consumption": "nil", "Typical consumption": "typical"}

# Ofgem allowance codes → plain names (Ofgem default tariff cap methodology glossary).
COMPONENTS = {
    "DF": "Wholesale energy",
    "CM": "Capacity market",
    "AA": "Adjustment allowance",
    "PC": "Policy costs",
    "NC": "Network costs",
    "OC": "Operating costs",
    "SMNCC": "Smart meter costs",
    "IC": "Industry charges",
    "PAAC": "Payment method costs",
    "PAP": "Payment method percentage",
    "CO": "Covid-19 costs",
    "DRC": "Debt-related costs",
    "EBIT": "Supplier margin",
    "HAP": "Headroom",
    "Levelisation": "Levelisation",
    "Total_GB average": "Total before VAT",
    "Total inc VAT": "Total including VAT",
}

MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def period_start(label: str) -> str | None:
    m = re.match(r"\s*([A-Za-z]+)\s+(\d{4})", label)
    if not m:
        return None
    mon = MONTHS.get(m.group(1)[:3].lower())
    return f"{m.group(2)}-{mon:02d}-01" if mon else None


def num(v: Any) -> float | None:
    return float(v) if isinstance(v, (int, float)) else None


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    xlsx = Path(args[0])
    rows = list(openpyxl.load_workbook(xlsx, read_only=True, data_only=True)[SHEET].iter_rows(values_only=True))

    out: list[dict] = []
    payment: str | None = None
    fuel_cols: dict[int, str] = {}
    level: str | None = None
    periods: dict[int, str] = {}
    for r in rows:
        cells = list(r)
        texts = [c.strip() if isinstance(c, str) else c for c in cells]
        if any(t in PAYMENTS for t in texts if isinstance(t, str)):
            payment = next(PAYMENTS[t] for t in texts if isinstance(t, str) and t in PAYMENTS)
            level = None
            continue
        if any(isinstance(t, str) and t in FUELS for t in texts):
            fuel_cols = {j: FUELS[t] for j, t in enumerate(texts) if isinstance(t, str) and t in FUELS}
            continue
        if len(texts) > 1 and isinstance(texts[1], str) and texts[1] in LEVELS:
            level = LEVELS[texts[1]]
            periods = {j: t for j, t in enumerate(texts) if isinstance(t, str) and period_start(t)}
            continue
        if payment is None or level is None or len(texts) < 2 or not isinstance(texts[1], str):
            continue
        code = texts[1].strip()
        if code not in COMPONENTS:
            continue
        for start, fuel in fuel_cols.items():
            end = min([s for s in fuel_cols if s > start] + [len(texts)])
            for j in range(start + 1, end):
                if j in periods and j < len(texts):
                    out.append(
                        {
                            "payment": payment,
                            "fuel": fuel,
                            "level": level,
                            "period": periods[j],
                            "period_start": period_start(periods[j]),
                            "component": code,
                            "label": COMPONENTS[code],
                            "gbp": num(texts[j]),
                        }
                    )

    # Check: published components sum to the published total before VAT.
    checks = {}
    for row in out:
        if row["component"] in ("Total_GB average", "Total inc VAT"):
            continue
        k = (row["payment"], row["fuel"], row["level"], row["period"])
        checks.setdefault(k, 0.0)
        checks[k] += row["gbp"] or 0.0
    worst = 0.0
    for row in out:
        if row["component"] == "Total_GB average" and row["gbp"] is not None:
            k = (row["payment"], row["fuel"], row["level"], row["period"])
            worst = max(worst, abs(checks.get(k, 0.0) - row["gbp"]))

    pack = {
        "source": f"Ofgem · {xlsx.name} · {SHEET}",
        "unit": "£ per customer per year, GB average, excluding VAT unless stated",
        "note": "Typical consumption uses the values that applied in each period (Ofgem updated them in May 2026; earlier periods use the values at the time).",
        "rows": out,
        "reconciliation": {"rule": "sum of components = Total before VAT", "max_abs_difference_gbp": round(worst, 4)},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(pack, indent=1) + "\n")
    print(f"wrote {OUT} · {len(out)} values · max sum difference £{worst:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
