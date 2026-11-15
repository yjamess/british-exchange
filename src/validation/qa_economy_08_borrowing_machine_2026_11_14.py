"""Independent QA — Economy Domain 08 Borrowing Machine stock-flow bridge sample.

Question: does change in public-sector net debt (HF6W) equal the sum of
public-sector net borrowing (DZLS) over a compatible interval?

Does **not** re-ingest. Does **not** edit ``data/economy/``.
Reads curated CSVs only (final, valued rows). Units: HF6W £bn; DZLS £m → £bn.

Method (locked for this check):
  open / close = end-of-month HF6W stocks
  flows = DZLS for months after open through close inclusive
  residual = Δdebt − sum(borrowing)   (all in £ billion)

  PYTHONPATH=src uv run python -m validation.qa_economy_08_borrowing_machine_2026_11_14
"""

from __future__ import annotations

import csv
import hashlib
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ECON = ROOT / "data" / "economy"

WINDOWS: list[tuple[str, str, str]] = [
    ("2018-03-01", "2019-03-01", "FY 2018/19"),
    ("2019-03-01", "2020-03-01", "FY 2019/20"),
    ("2020-03-01", "2021-03-01", "FY 2020/21"),
    ("2021-03-01", "2022-03-01", "FY 2021/22"),
    ("2022-03-01", "2023-03-01", "FY 2022/23"),
    ("2023-03-01", "2024-03-01", "FY 2023/24"),
    ("2024-03-01", "2025-03-01", "FY 2024/25"),
    ("2019-12-01", "2020-12-01", "Cal 2020"),
    ("2023-12-01", "2024-12-01", "Cal 2024"),
    ("2024-08-01", "2025-08-01", "12m to Aug 2025"),
    ("2025-08-01", "2026-08-01", "12m to Aug 2026"),
]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def next_month(iso: str) -> str:
    y = int(iso[:4])
    m = int(iso[5:7])
    if m == 12:
        return f"{y + 1:04d}-01-01"
    return f"{y:04d}-{m + 1:02d}-01"


def load_final(indicator_id: str) -> dict[str, float]:
    path = ECON / indicator_id / "curated" / "observations.csv"
    out: dict[str, float] = {}
    with path.open(newline="") as f:
        for row in csv.DictReader(f):
            if row.get("observation_status") != "final":
                continue
            raw = row.get("value")
            if raw in ("", None):
                continue
            out[row["period_start"][:10]] = float(raw)
    return out


def flow_months(open_p: str, close_p: str) -> list[str]:
    """Months after open end-month through close end-month inclusive."""
    months: list[str] = []
    p = next_month(open_p)
    while p <= close_p:
        months.append(p)
        p = next_month(p)
    return months


def main() -> None:
    debt = load_final("public-sector-net-debt")
    bor = load_final("public-sector-net-borrowing")
    debt_csv = ECON / "public-sector-net-debt" / "curated" / "observations.csv"
    bor_csv = ECON / "public-sector-net-borrowing" / "curated" / "observations.csv"

    windows: list[dict[str, object]] = []
    for open_p, close_p, label in WINDOWS:
        months = flow_months(open_p, close_p)
        missing = [m for m in months if m not in bor]
        if open_p not in debt or close_p not in debt or missing:
            windows.append(
                {
                    "label": label,
                    "status": "skip",
                    "missing_debt": open_p not in debt or close_p not in debt,
                    "missing_flows": missing,
                }
            )
            continue
        d0 = debt[open_p]
        d1 = debt[close_p]
        delta = d1 - d0
        sum_bn = sum(bor[m] for m in months) / 1000.0
        resid = delta - sum_bn
        pct = (100.0 * resid / abs(delta)) if abs(delta) > 1e-9 else None
        windows.append(
            {
                "label": label,
                "status": "ok",
                "open": open_p,
                "close": close_p,
                "open_bn": d0,
                "close_bn": d1,
                "delta_bn": round(delta, 3),
                "sum_borrowing_bn": round(sum_bn, 3),
                "residual_bn": round(resid, 3),
                "residual_pct_of_abs_delta": None if pct is None else round(pct, 1),
                "n_months": len(months),
            }
        )

    # Contiguous monthly residuals (flow in month M explains end M-1 → end M).
    monthly: list[dict[str, float | str]] = []
    periods = sorted(debt)
    for i in range(1, len(periods)):
        prev, cur = periods[i - 1], periods[i]
        if next_month(prev) != cur or cur not in bor:
            continue
        delta = debt[cur] - debt[prev]
        flow = bor[cur] / 1000.0
        monthly.append(
            {
                "month": cur,
                "delta_bn": round(delta, 3),
                "borrow_bn": round(flow, 3),
                "residual_bn": round(delta - flow, 3),
            }
        )

    resids = [float(m["residual_bn"]) for m in monthly]
    abs_res = sorted(abs(r) for r in resids)
    ok_windows = [w for w in windows if w.get("status") == "ok"]
    material = [
        w
        for w in ok_windows
        if abs(float(w["residual_bn"])) >= 5.0  # £5bn threshold
        or (
            w["residual_pct_of_abs_delta"] is not None
            and abs(float(w["residual_pct_of_abs_delta"])) >= 10.0
        )
    ]

    # Pass only if residuals are negligible on every sample window.
    # Expected outcome for PSNB vs PSND: fail — residuals are structural.
    verdict = "fail" if material else "pass"

    doc = {
        "indicator_focus": "borrowing-machine-bridge",
        "series": {
            "debt": {
                "id": "public-sector-net-debt",
                "cdid": "HF6W",
                "unit": "£ billion",
                "n_final": len(debt),
                "curated_sha256": sha256_file(debt_csv),
            },
            "borrowing": {
                "id": "public-sector-net-borrowing",
                "cdid": "DZLS",
                "unit": "£ million (converted /1000 to £bn)",
                "n_final": len(bor),
                "curated_sha256": sha256_file(bor_csv),
            },
        },
        "mapping": {
            "open_close": "HF6W end-of-month stocks",
            "flows": "DZLS months after open through close inclusive",
            "residual": "Δdebt − sum(borrowing), £ billion",
        },
        "windows": windows,
        "monthly_residual_summary": {
            "n": len(monthly),
            "mean_bn": round(statistics.fmean(resids), 3) if resids else None,
            "median_bn": round(statistics.median(resids), 3) if resids else None,
            "stdev_bn": round(statistics.pstdev(resids), 3) if resids else None,
            "p90_abs_bn": abs_res[int(0.9 * (len(abs_res) - 1))] if abs_res else None,
            "max_abs_bn": abs_res[-1] if abs_res else None,
            "worst": sorted(monthly, key=lambda x: abs(float(x["residual_bn"])), reverse=True)[
                :8
            ],
        },
        "material_windows": [w["label"] for w in material],
        "verdict": verdict,
        "ui_implication": (
            "Do not ship a numeric Borrowing Machine that treats sum(DZLS) as explaining "
            "ΔHF6W, or invent a balancing item as an official series. Keep conceptual stage "
            "or ingest an official cash / debt-change reconciliation (e.g. net cash "
            "requirement path) before drawing numbers."
        ),
    }
    print(json.dumps(doc, indent=2))


if __name__ == "__main__":
    main()
