"""Everyday Britain average prices — ONS Shopping prices comparison tool data.

Source (official, OGL): ONS adhoc download of the shopping-prices tool data
before the 2025 methodology update (Jan 2018 → Jan 2025).

Caveats (must stay on the Manifest / Notes):
- Average prices are **official statistics in development**.
- Designed to show price *change*, not a shop's exact shelf price.
- This pin ends **2025-01**; post-Mar-2025 tool methodology changed (scanner
  segments). Do not splice vintages silently.
- No retailer scrapes.

Scope: ONS Category1 groups Food and drink (+ establishments), Household
items, Services, Health, Transport. ``BASKET_ITEMS`` keeps stable slug
overrides for the original ten UI specimens.

Run:: ``uv run python -m economy.connectors.everyday_basket``
"""

from __future__ import annotations

import calendar
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

import openpyxl

from britain_exchange.connector import Connector
from britain_exchange.manifest import Manifest, RawEvidence
from britain_exchange.observation import Observation
from britain_exchange.paths import ECONOMY_DATA

INDICATOR_ID = "everyday-basket-average-prices"
SOURCE_URL = (
    "https://www.ons.gov.uk/economy/inflationandpriceindices/adhocs/"
    "2724shoppingpricescomparisontooldatadownloadbeforethe2025update"
)
SOURCE_FILE_URL = (
    "https://www.ons.gov.uk/file?uri=/economy/inflationandpriceindices/adhocs/"
    "2724shoppingpricescomparisontooldatadownloadbeforethe2025update/datadownload1.xlsx"
)
RAW_NAME = "ons_shopping_prices_pre2025.xlsx"
OFFICIAL_RELEASE = "2025-03-31"  # adhoc release date on the ONS page
ITEMS_JSON = "curated/items.json"

# Orchestrator-locked Category1 allowlist (excludes Clothing; Recreation).
CATEGORY1_ALLOWLIST: frozenset[str] = frozenset(
    {
        "Food and drink",
        "Food and drink establishments",
        "Household items",
        "Services",
        "Health",
        "Transport",
    }
)


@dataclass(frozen=True, slots=True)
class BasketItem:
    """One everyday item drawn from the ONS shopping-prices metadata."""

    item_id: int
    slug: str
    label: str
    unit_hint: str
    category1: str = ""
    category2: str = ""


# Stable slug / label overrides for the original ten specimens (UI contract).
BASKET_ITEMS: tuple[BasketItem, ...] = (
    BasketItem(210111, "white-sliced-bread", "White sliced bread", "750–800g"),
    BasketItem(210113, "wholemeal-sliced-bread", "Wholemeal sliced bread", "750–800g"),
    BasketItem(211709, "whole-milk", "Whole milk", "as priced"),
    BasketItem(211710, "semi-skimmed-milk", "Semi-skimmed milk", "as priced"),
    BasketItem(211604, "eggs", "Eggs", "as priced"),
    BasketItem(211306, "butter", "Butter", "250g"),
    BasketItem(212719, "bananas", "Bananas", "as priced"),
    BasketItem(212310, "white-potatoes", "White potatoes", "as priced"),
    BasketItem(213003, "instant-coffee", "Instant coffee", "as priced"),
    BasketItem(220121, "restaurant-coffee", "Restaurant cup of coffee", "as priced"),
)

_SLUG_OVERRIDE: dict[int, BasketItem] = {item.item_id: item for item in BASKET_ITEMS}


def _slugify(label: str) -> str:
    """Kebab-case slug from an ONS ITEM_DESC ([PEP 8](https://peps.python.org/pep-0008/) naming)."""
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
    if not slug:
        raise ValueError(f"Cannot slugify empty label: {label!r}")
    return slug


def _size_hint(raw: object, *, fallback: str = "as priced") -> str:
    if raw is None:
        return fallback
    text = str(raw).strip()
    return text if text else fallback


class EverydayBasketConnector(Connector):
    """Pin ONS shopping-prices xlsx → curated observations for scoped Category1 groups."""

    def __init__(self, data_root: Path | None = None) -> None:
        super().__init__(data_root or (ECONOMY_DATA / INDICATOR_ID))
        self._catalogue: list[BasketItem] = []

    @property
    def indicator_id(self) -> str:
        return INDICATOR_ID

    @property
    def catalogue(self) -> list[BasketItem]:
        """Items included in the last transform (for items.json)."""
        return list(self._catalogue)

    def build_manifest(self, evidence: list[RawEvidence]) -> Manifest:
        groups = ", ".join(sorted(CATEGORY1_ALLOWLIST))
        n_items = len(self._catalogue) or "Category1-filtered"
        return Manifest(
            indicator_id=INDICATOR_ID,
            title="Everyday basket average prices",
            sector="economy-public-finance",
            publisher="ONS",
            source_url=SOURCE_URL,
            series_id="shopping-prices-comparison-tool",
            geography="United Kingdom (K02000001); average prices from CPIH price collection",
            frequency="monthly",
            unit="£ average price (official statistics in development)",
            definition=(
                "Average prices from the ONS Shopping prices comparison tool data "
                "download (pre-2025 methodology) for Orchestrator-scoped Category1 "
                f"groups ({groups}). Cash £ levels reconstructed from January base "
                "averages and CPIH item index growth — not a retailer shelf quote. "
                f"Catalogue size: {n_items} items. Also writes curated/items.json."
            ),
            licence="Open Government Licence v3.0",
            agent_owner="economy",
            connector_module="economy.connectors.everyday_basket",
            curated_path="curated/observations.csv",
            update_cadence="adhoc until live post-2025 average-price download is pinned",
            raw_evidence=list(evidence),
            notion_registry_url="",
            transformations=(
                "Download ONS adhoc xlsx. Read sheets metadata + averageprice. "
                "Keep rows whose Category1 is in CATEGORY1_ALLOWLIST (Food and drink, "
                "Food and drink establishments, Household items, Services, Health, "
                "Transport). Apply BASKET_ITEMS slug/label overrides for the original "
                "ten specimens. Emit one Observation per item-month with notes "
                "category=<slug>; item_id; item; size; category1; category2. Write "
                "curated/items.json catalogue."
            ),
            revision_notes=(
                "ONS revises average prices when the shopping-tool basket updates "
                "(typically March). This pin is the pre-2025-update archive ending "
                "2025-01."
            ),
            caveats=(
                "Official statistics in development. Sample targets price change, not "
                "price levels. Never present as a single shop's shelf price. Do not "
                "mix with post-Mar-2025 scanner-segment average prices without a new pin. "
                "Pin ends 2025-01."
            ),
            related_indicator_ids=[
                "cpih-inflation",
                "cpih-index",
                "cpi-inflation",
                *[f"cpih-inflation-{s}" for s in ("food", "restaurants")],
            ],
            open_questions=[
                "Pin current (post-2025) average-price download from the live tool.",
                "Whether petrol/diesel should join via a DESNZ/BEIS series (not in this file).",
            ],
        )

    def fetch_latest(self, *, retrieved_on: date | None = None) -> RawEvidence:
        day = retrieved_on or datetime.now(timezone.utc).date()
        relative = f"raw/{day.isoformat()}/{RAW_NAME}"
        dest = self.data_root / relative
        if dest.is_file() and dest.stat().st_size > 0:
            # Reuse today's pin if already downloaded (idempotent local runs).
            digest = hashlib.sha256(dest.read_bytes()).hexdigest()
            return RawEvidence(
                path=relative,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                checksum_sha256=digest,
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                official_release_date=OFFICIAL_RELEASE,
                http_status=200,
                source_url=SOURCE_FILE_URL,
            )
        # Prefer any existing pin under raw/ so re-runs stay offline-friendly.
        raw_root = self.data_root / "raw"
        if raw_root.is_dir():
            existing = sorted(raw_root.glob(f"*/{RAW_NAME}"), reverse=True)
            if existing:
                pinned = existing[0]
                digest = hashlib.sha256(pinned.read_bytes()).hexdigest()
                rel = str(pinned.relative_to(self.data_root))
                return RawEvidence(
                    path=rel,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    checksum_sha256=digest,
                    content_type=(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    ),
                    official_release_date=OFFICIAL_RELEASE,
                    http_status=200,
                    source_url=SOURCE_FILE_URL,
                )
        result = self.fetch_url(SOURCE_FILE_URL, relative)
        return RawEvidence(
            path=result.evidence.path,
            retrieved_at=result.evidence.retrieved_at,
            checksum_sha256=result.evidence.checksum_sha256,
            content_type=result.evidence.content_type,
            official_release_date=OFFICIAL_RELEASE,
            http_status=result.evidence.http_status,
            source_url=result.evidence.source_url,
        )

    def _read_catalogue(self, path: Path) -> dict[int, BasketItem]:
        """Build item_id → BasketItem from the metadata sheet (allowlist only)."""
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        try:
            meta = wb["metadata"]
            rows = meta.iter_rows(values_only=True)
            header = next(rows)
            col = {str(name): i for i, name in enumerate(header)}
            required = ("ITEM_ID", "Category1", "Category2", "ITEM_DESC", r"WEIGHT\SIZE")
            for name in required:
                if name not in col:
                    raise ValueError(f"metadata sheet missing column {name!r}")

            catalogue: dict[int, BasketItem] = {}
            for row in rows:
                if not row or row[col["ITEM_ID"]] is None:
                    continue
                category1 = str(row[col["Category1"]] or "").strip()
                if category1 not in CATEGORY1_ALLOWLIST:
                    continue
                item_id = int(row[col["ITEM_ID"]])
                label = str(row[col["ITEM_DESC"]] or "").strip()
                category2 = str(row[col["Category2"]] or "").strip()
                size_raw = row[col[r"WEIGHT\SIZE"]]
                override = _SLUG_OVERRIDE.get(item_id)
                if override is not None:
                    catalogue[item_id] = BasketItem(
                        item_id=item_id,
                        slug=override.slug,
                        label=override.label,
                        unit_hint=_size_hint(size_raw, fallback=override.unit_hint),
                        category1=category1,
                        category2=category2,
                    )
                else:
                    catalogue[item_id] = BasketItem(
                        item_id=item_id,
                        slug=_slugify(label),
                        label=label,
                        unit_hint=_size_hint(size_raw),
                        category1=category1,
                        category2=category2,
                    )
        finally:
            wb.close()

        # Slug uniqueness within the allowlist (overrides already fixed).
        seen: dict[str, int] = {}
        for item in catalogue.values():
            prior = seen.get(item.slug)
            if prior is not None and prior != item.item_id:
                raise ValueError(
                    f"Duplicate slug {item.slug!r} for item_ids {prior} and {item.item_id}"
                )
            seen[item.slug] = item.item_id

        missing_overrides = sorted(set(_SLUG_OVERRIDE) - set(catalogue))
        if missing_overrides:
            raise ValueError(
                f"BASKET_ITEMS overrides missing from allowlisted metadata: {missing_overrides}"
            )
        return catalogue

    def transform(self, evidence: list[RawEvidence]) -> list[Observation]:
        if not evidence:
            raise ValueError("transform() requires RawEvidence")
        path = self.data_root / evidence[0].path
        if not path.is_file():
            raise FileNotFoundError(path)

        wanted = self._read_catalogue(path)
        self._catalogue = sorted(wanted.values(), key=lambda i: (i.category1, i.slug))

        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        try:
            ap = wb["averageprice"]
            rows = ap.iter_rows(values_only=True)
            header = next(rows)
            months: list[date] = []
            for cell in header[1:]:
                if isinstance(cell, datetime):
                    months.append(cell.date())
                elif isinstance(cell, date):
                    months.append(cell)
                else:
                    raise ValueError(f"Unexpected averageprice header cell: {cell!r}")

            observations: list[Observation] = []
            version = f"ONS shopping-prices adhoc {OFFICIAL_RELEASE}"
            found: set[int] = set()
            for row in rows:
                if not row or row[0] is None:
                    continue
                item_id = int(row[0])
                item = wanted.get(item_id)
                if item is None:
                    continue
                found.add(item_id)
                for month, raw in zip(months, row[1:], strict=False):
                    if raw is None or raw == "":
                        continue
                    value = float(raw)
                    last_day = calendar.monthrange(month.year, month.month)[1]
                    period_start = f"{month.year:04d}-{month.month:02d}-01"
                    period_end = f"{month.year:04d}-{month.month:02d}-{last_day:02d}"
                    observations.append(
                        Observation(
                            indicator_id=INDICATOR_ID,
                            period_start=period_start,
                            period_end=period_end,
                            geography_code="K02000001",
                            geography_label="United Kingdom",
                            value=value,
                            unit="£ average price",
                            # Frozen adhoc archive (ends 2025-01) — all final.
                            # "Official statistics in development" is a methods
                            # caveat on the Manifest / Notes, not a revision flag.
                            observation_status="final",
                            source_version=version,
                            notes=(
                                f"category={item.slug}; item_id={item.item_id}; "
                                f"item={item.label}; size={item.unit_hint}; "
                                f"category1={item.category1}; category2={item.category2}; "
                                "dataset=shopping-prices-comparison-tool; "
                                "status=official-statistics-in-development"
                            ),
                        )
                    )
        finally:
            wb.close()

        missing = sorted(set(wanted) - found)
        if missing:
            raise ValueError(f"Allowlisted item_ids missing from averageprice sheet: {missing}")

        observations.sort(key=lambda o: (o.notes, o.period_start))
        return observations

    def write_items_json(self, relative: str = ITEMS_JSON) -> Path:
        """Write the searchable catalogue (one row per item)."""
        if not self._catalogue:
            raise ValueError("write_items_json() requires a prior transform()")
        path = self.data_root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = [
            {
                "item_id": item.item_id,
                "slug": item.slug,
                "label": item.label,
                "size": item.unit_hint,
                "category1": item.category1,
                "category2": item.category2,
            }
            for item in self._catalogue
        ]
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        return path


def main() -> None:
    connector = EverydayBasketConnector()
    evidence = connector.fetch_latest()
    observations = connector.transform([evidence])
    manifest_path, curated_path = connector.write_hand_off([evidence], observations)
    items_path = connector.write_items_json()
    print(f"indicator_id: {INDICATOR_ID}")
    print(f"raw: {evidence.path}")
    print(f"sha256: {evidence.checksum_sha256}")
    print(f"observations: {len(observations)}")
    print(f"items: {len(connector.catalogue)}")
    print(f"category1_allowlist: {sorted(CATEGORY1_ALLOWLIST)}")
    print(f"manifest: {manifest_path}")
    print(f"curated: {curated_path}")
    print(f"items_json: {items_path}")
    if observations:
        print(
            f"range: {observations[0].period_start} → {observations[-1].period_start}"
        )


if __name__ == "__main__":
    main()
