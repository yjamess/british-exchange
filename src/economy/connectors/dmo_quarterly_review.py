"""Parsers for the DMO Quarterly Review PDF (one publication → two indicators).

The Quarterly Review (QR) PDF carries tables we need for:

* ``gilt-holdings-by-sector``      — page "Gilt and Treasury Bill Holdings" (ONS, market value £mn)
* ``dmo-debt-portfolio-composition`` — "Debt Portfolio Overview" + "Market Value Statistics"

The PDF has a clean text layer, so ``pypdf`` (already a project dependency) is enough —
no OCR and no hand-keyed numbers. Each parser **fails loudly** when the layout is not
what it expects, rather than returning partial data.

Refs: pypdf https://pypdf.readthedocs.io/ · re https://docs.python.org/3/library/re.html
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from pypdf import PdfReader

# --------------------------------------------------------------------------- text access


def page_texts(pdf_path: Path) -> list[str]:
    """Return extracted text for every page (index 0 = page 1)."""
    reader = PdfReader(str(pdf_path))
    return [(page.extract_text() or "") for page in reader.pages]


def find_page(texts: list[str], *needles: str) -> tuple[int, str]:
    """Return ``(0-based index, text)`` of the single page containing all ``needles``."""
    hits = [(i, t) for i, t in enumerate(texts) if all(n in t for n in needles)]
    if len(hits) != 1:
        raise ValueError(f"Expected exactly one page containing {needles!r}, found {len(hits)}")
    return hits[0]


# --------------------------------------------------------------------------- ownership table


@dataclass(frozen=True, slots=True)
class SectorHoldingRow:
    """One row of the QR gilt-holdings table: a sector across four quarters."""

    sector_label: str  # as printed (line-wraps joined with a single space)
    values_gbp_mn: tuple[int, int, int, int]  # one per quarter, oldest first
    latest_share_pct: float  # share printed for the latest quarter


@dataclass(frozen=True, slots=True)
class SectorHoldingsTable:
    quarters: tuple[tuple[int, int], ...]  # (year, quarter), oldest first
    rows: tuple[SectorHoldingRow, ...]  # sector rows in print order (excl. TOTAL)
    total_gbp_mn: tuple[int, int, int, int]
    total_share_pct: float


_QUARTER_HEADER = re.compile(
    r"Gilt holdings \(£mn, market values\)\s+"
    r"Q(\d) (\d{4}) Q(\d) (\d{4}) Q(\d) (\d{4}) Q(\d) (\d{4}) Q(\d) (\d{4}) \(%\)"
)
_NUMBER = r"(\d{1,3}(?:,\d{3})*)"
_ROW = re.compile(
    rf"([A-Za-z][A-Za-z ()\-]*?)\s+{_NUMBER}\s+{_NUMBER}\s+{_NUMBER}\s+{_NUMBER}\s+(\d+\.\d)"
)


def _int(token: str) -> int:
    return int(token.replace(",", ""))


def parse_sector_holdings(page_text: str) -> SectorHoldingsTable:
    """Parse the ONS gilt-holdings-by-sector table (market value, £mn).

    Sector names can wrap onto two printed lines, so we flatten whitespace before
    matching ``<label> n n n n pct`` — labels contain no digits, which keeps this safe.
    """
    header = _QUARTER_HEADER.search(page_text)
    if header is None:
        raise ValueError("Gilt holdings header (quarters) not found")
    g = header.groups()
    pairs = [(int(g[i + 1]), int(g[i])) for i in range(0, 10, 2)]  # (year, quarter)
    if pairs[3] != pairs[4]:
        raise ValueError(f"Latest-quarter share column does not repeat last quarter: {pairs}")
    quarters = tuple(pairs[:4])

    body = page_text[header.end() :]
    stop = body.find("Source: ONS")
    if stop == -1:
        raise ValueError("Table end marker 'Source: ONS' not found")
    flat = re.sub(r"\s+", " ", body[:stop]).strip()

    rows: list[SectorHoldingRow] = []
    total: tuple[tuple[int, int, int, int], float] | None = None
    for match in _ROW.finditer(flat):
        label = match.group(1).strip()
        values = tuple(_int(match.group(i)) for i in range(2, 6))
        share = float(match.group(6))
        if label == "TOTAL":
            total = (values, share)  # type: ignore[assignment]
        else:
            rows.append(SectorHoldingRow(label, values, share))  # type: ignore[arg-type]
    if total is None or not rows:
        raise ValueError("Could not find sector rows and TOTAL row")
    # Everything in the table body must have been consumed by a row; leftover text
    # means a row was missed (e.g. the layout changed).
    leftover = _ROW.sub("", flat).strip()
    if leftover:
        raise ValueError(f"Unparsed text left in holdings table: {leftover!r}")
    return SectorHoldingsTable(quarters, tuple(rows), total[0], total[1])


# --------------------------------------------------------------------------- portfolio tables

_MONTHS = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12,
}  # fmt: skip
_DATE_RE = re.compile(r"(\d{1,2}) (" + "|".join(_MONTHS) + r") (\d{4})")
_BN = r"£([\d,]+\.\d+)bn"

# QR instrument labels → (instrument slug, human label)
INSTRUMENTS: dict[str, tuple[str, str]] = {
    "Uplifted nominal value of the debt portfolio": ("total", "Debt portfolio (total)"),
    "Debt portfolio": ("total", "Debt portfolio (total)"),
    "Conventional gilts": ("conventional-gilts", "Conventional gilts"),
    "Index-linked gilts": ("index-linked-gilts", "Index-linked gilts"),
    "Treasury bills": ("treasury-bills", "Treasury bills (debt management)"),
}


@dataclass(frozen=True, slots=True)
class PortfolioPoint:
    valuation: str  # "uplifted-nominal" | "market-value"
    basis: str  # "gross" | "net"
    instrument: str  # slug from INSTRUMENTS
    instrument_label: str
    as_of: date
    value_gbn: float  # £ billion


def _dates(line: str) -> list[date]:
    return [date(int(y), _MONTHS[m], int(d)) for d, m, y in _DATE_RE.findall(line)]


def _bn(token: str) -> float:
    return float(token.replace(",", ""))


def _instrument_for(prefix: str) -> tuple[str, str]:
    # QR footnote digits are glued to labels ("Conventional gilts4", "Treasury bills3").
    key = re.sub(r"\d+$", "", prefix.replace("•", "").strip())
    if key not in INSTRUMENTS:
        raise ValueError(f"Unknown portfolio line label: {prefix!r}")
    return INSTRUMENTS[key]


def parse_uplifted_nominal_portfolio(page_text: str) -> list[PortfolioPoint]:
    """Page 1: uplifted-nominal portfolio, gross values then net values, four quarter-ends."""
    lines = [ln.strip() for ln in page_text.splitlines()]
    date_line = next((ln for ln in lines if len(_dates(ln)) == 4), None)
    if date_line is None:
        raise ValueError("Four-date header line not found on portfolio overview page")
    as_ofs = _dates(date_line)

    basis: str | None = None
    out: list[PortfolioPoint] = []
    row_re = re.compile(rf"^(•?\s*[A-Za-z][A-Za-z\- ]*?\d?)\s+{_BN}\s+{_BN}\s+{_BN}\s+{_BN}$")
    for line in lines:
        if line.startswith("Gross values"):
            basis = "gross"
        elif line.startswith("Net values"):
            basis = "net"
        match = row_re.match(line)
        if match is None or basis is None:
            continue
        slug, label = _instrument_for(match.group(1))
        for as_of, token in zip(as_ofs, match.groups()[1:], strict=True):
            out.append(PortfolioPoint("uplifted-nominal", basis, slug, label, as_of, _bn(token)))
    # 2 bases × 4 instruments × 4 dates
    if len(out) != 32:
        raise ValueError(f"Expected 32 uplifted-nominal points, parsed {len(out)}")
    return out


def parse_market_value_portfolio(page_text: str) -> list[PortfolioPoint]:
    """Page 2: market-value portfolio. Left block = gross values, right block = net values.

    Each printed line holds both blocks side by side, e.g.
    ``Debt portfolio £a £b Debt portfolio £c £d`` → gross (a, b) and net (c, d).
    """
    lines = [ln.strip() for ln in page_text.splitlines()]
    date_line = next((ln for ln in lines if len(_dates(ln)) == 4), None)
    if date_line is None:
        raise ValueError("Four-date header line not found on market value page")
    d = _dates(date_line)
    if d[0] != d[2] or d[1] != d[3]:
        raise ValueError(f"Market-value dates not repeated across gross/net blocks: {d}")
    as_ofs = d[:2]

    pair_re = re.compile(rf"(Debt portfolio|•\s*[A-Za-z\- ]+?)\s+{_BN}\s+{_BN}")
    out: list[PortfolioPoint] = []
    for line in lines:
        if "yield" in line or "years" in line or "duration" in line:
            continue
        pairs = pair_re.findall(line)
        if len(pairs) != 2:
            continue
        for basis, (prefix, a, b) in zip(("gross", "net"), pairs, strict=True):
            slug, label = _instrument_for(prefix)
            for as_of, token in zip(as_ofs, (a, b), strict=True):
                out.append(PortfolioPoint("market-value", basis, slug, label, as_of, _bn(token)))
    # 2 bases × 4 instruments × 2 dates
    if len(out) != 16:
        raise ValueError(f"Expected 16 market-value points, parsed {len(out)}")
    return out
