"""Offline tests for the DMO / ONS gilt connectors (they read pinned files only).

Pytest basics: https://docs.pytest.org/en/stable/getting-started.html
"""

from __future__ import annotations

import pytest

from britain_exchange.paths import ECONOMY_DATA
from economy.connectors.dmo_government_holdings import monthly_series, parse_workbook
from economy.connectors.dmo_quarterly_review import (
    find_page,
    page_texts,
    parse_market_value_portfolio,
    parse_sector_holdings,
    parse_uplifted_nominal_portfolio,
)
from economy.connectors.gilt_holdings_by_sector import SECTORS, check_table

QR_PDF = ECONOMY_DATA / "dmo-debt-portfolio-composition/raw/dmo_quarterly_review_2025_q4.pdf"
D4L_XLS = ECONOMY_DATA / "dmo-government-holdings/raw/Government Holdings of Gilts Nov 14 2026.xls"

pytestmark = pytest.mark.skipif(
    not (QR_PDF.exists() and D4L_XLS.exists()), reason="pinned DMO raw files not present"
)


def test_sector_table_matches_quarterly_review_q3_2025() -> None:
    texts = page_texts(QR_PDF)
    _, page = find_page(texts, "Gilt holdings (£mn, market values)")
    table = parse_sector_holdings(page)
    assert table.quarters[-1] == (2025, 3)
    assert table.total_gbp_mn[-1] == 2_124_632
    by_slug = {SECTORS[r.sector_label]: r.values_gbp_mn[-1] for r in table.rows}
    assert by_slug["overseas"] == 709_279
    assert by_slug["bank-of-england-apf"] == 393_760
    assert check_table(table)["pass"]


def test_portfolio_tables_have_expected_shape() -> None:
    texts = page_texts(QR_PDF)
    nominal = parse_uplifted_nominal_portfolio(texts[0])
    market = parse_market_value_portfolio(texts[1])
    assert len(nominal) == 32 and len(market) == 16
    dec_gross = next(
        p
        for p in nominal
        if (p.basis, p.instrument, p.as_of.isoformat()) == ("gross", "total", "2025-12-31")
    )
    assert dec_gross.value_gbn == 2908.65


def test_d4l_monthly_series_is_contiguous_and_additive() -> None:
    cells, data_date = parse_workbook(D4L_XLS)
    series = monthly_series(cells)
    assert data_date.isoformat() == "2026-11-14"
    assert min(series) == (2005, 4) and max(series) == (2026, 10)
    assert len(series) == 259  # Apr 2005 … Oct 2026, no gaps
    for parts in series.values():
        assert parts["total"] == pytest.approx(parts["conventional"] + parts["index-linked"])
