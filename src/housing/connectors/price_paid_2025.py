"""Price Paid 2025 yearly slice — England & Wales registered sales.

Approach (beginner-friendly):
1. Pin HM Land Registry pp-2025.csv under data/housing/price-paid-2025/raw/.
2. Map the headerless PPD columns to a stable curated CSV.
3. Load into Postgres ``price_paid_transaction`` (not Observation rows).

Official guide:
https://www.gov.uk/guidance/about-the-price-paid-data
"""

from __future__ import annotations

import csv
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterator

from britain_exchange.checksum import sha256_file
from britain_exchange.db import apply_migrations, connect
from britain_exchange.manifest import Manifest, RawEvidence, save_manifest
from britain_exchange.paths import HOUSING_DATA

INDICATOR_ID = "price-paid-2025"
PINNED_REL = "raw/2026-11-04/pp-2025.csv"
SOURCE_LANDING = (
    "https://www.gov.uk/government/statistical-data-sets/price-paid-data-yearly-file"
)
PINNED_URL = "https://price-paid-data.publicdata.landregistry.gov.uk/pp-2025.csv"
OFFICIAL_RELEASE_DATE = "2026-10-28"
SOURCE_YEAR = 2025
CURATED_REL = "curated/transactions.csv"
ATTRIBUTION = (
    "Contains HM Land Registry data © Crown copyright and database right 2021. "
    "This data is licensed under the Open Government Licence v3.0."
)
PUBLISHER = "HM Land Registry"
GEOGRAPHY = "England and Wales"


def public_source() -> dict[str, str]:
    """Publisher, series and file for the page source line.

    The year is ``SOURCE_YEAR`` on this package, so the site does not invent a
    second copy of the file name.
    """
    return {
        "publisher": PUBLISHER,
        "series": f"Price Paid Data yearly file {SOURCE_YEAR}",
        "release": f"pp-{SOURCE_YEAR}.csv",
        "geography": GEOGRAPHY,
        "url": SOURCE_LANDING,
    }

# Land Registry property type / tenure codes → short labels.
PROPERTY_TYPE = {"D": "detached", "S": "semi-detached", "T": "terraced", "F": "flat", "O": "other"}
TENURE = {"F": "freehold", "L": "leasehold"}

CURATED_FIELDS = (
    "transaction_id",
    "price",
    "transfer_date",
    "postcode",
    "property_type",
    "new_build",
    "tenure",
    "paon",
    "saon",
    "street",
    "locality",
    "town",
    "district",
    "county",
    "ppd_category",
    "record_status",
)


def data_root() -> Path:
    return HOUSING_DATA / INDICATOR_ID


def _parse_date(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        raise ValueError("empty transfer date")
    # Source uses "2025-03-21 00:00"
    return date.fromisoformat(text[:10]).isoformat()


def iter_raw_rows(raw_path: Path) -> Iterator[dict[str, str]]:
    """Yield cleaned row dicts from the headerless PPD yearly CSV."""
    with raw_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        for cells in reader:
            if len(cells) < 16:
                continue
            tid = cells[0].strip().strip("{}")
            if not tid:
                continue
            yield {
                "transaction_id": tid,
                "price": str(int(float(cells[1].replace(",", "")))),
                "transfer_date": _parse_date(cells[2]),
                "postcode": cells[3].strip().upper(),
                "property_type": PROPERTY_TYPE.get(cells[4].strip().upper(), cells[4].strip().lower()),
                "new_build": "true" if cells[5].strip().upper() == "Y" else "false",
                "tenure": TENURE.get(cells[6].strip().upper(), cells[6].strip().lower()),
                "paon": cells[7].strip(),
                "saon": cells[8].strip(),
                "street": cells[9].strip(),
                "locality": cells[10].strip(),
                "town": cells[11].strip(),
                "district": cells[12].strip(),
                "county": cells[13].strip(),
                "ppd_category": cells[14].strip(),
                "record_status": cells[15].strip(),
            }


def build_manifest(evidence: RawEvidence, *, row_count: int) -> Manifest:
    return Manifest(
        indicator_id=INDICATOR_ID,
        title="Price Paid transactions (2025 slice)",
        sector="housing-land",
        publisher="HM Land Registry",
        source_url=SOURCE_LANDING,
        series_id="Price Paid Data yearly file 2025",
        geography="England and Wales",
        frequency="annual",
        unit="£ sale price (individual transaction)",
        definition=(
            "Individual residential property sales in England and Wales lodged with "
            "HM Land Registry during calendar year 2025. First Domain 01 address-search "
            "slice — not the full 1995–present single file."
        ),
        licence="Open Government Licence v3.0",
        agent_owner="housing",
        connector_module="housing.connectors.price_paid_2025",
        curated_path=CURATED_REL,
        update_cadence="monthly refresh of the yearly file on GOV.UK",
        raw_evidence=[evidence],
        notion_registry_url="",
        transformations=(
            "Parse headerless PPD CSV; map property_type/tenure codes; ISO dates; "
            "write curated/transactions.csv; load Postgres price_paid_transaction."
        ),
        caveats=(
            f"{ATTRIBUTION} England & Wales only. Recent months incomplete due to "
            "registration lag (typically two weeks to two months). "
            f"This package is the 2025 yearly slice ({row_count:,} rows)."
        ),
        revision_notes=f"Pinned pp-2025.csv ({OFFICIAL_RELEASE_DATE} GOV.UK update).",
        related_indicator_ids=["uk-hpi-measures", "uk-average-house-price"],
    )


def evidence_from_pinned() -> RawEvidence:
    root = data_root()
    path = root / PINNED_REL
    if not path.is_file():
        raise FileNotFoundError(f"Missing pinned Price Paid CSV: {path}")
    return RawEvidence(
        path=PINNED_REL,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
        checksum_sha256=sha256_file(path),
        content_type="text/csv",
        official_release_date=OFFICIAL_RELEASE_DATE,
        source_url=PINNED_URL,
    )


def curate_and_load(raw_path: Path, curated_path: Path) -> int:
    """One pass: write curated CSV and replace Postgres 2025-slice rows."""
    curated_path.parent.mkdir(parents=True, exist_ok=True)
    sql = """
        INSERT INTO price_paid_transaction (
            transaction_id, price, transfer_date, postcode, property_type,
            new_build, tenure, paon, saon, street, locality, town, district,
            county, ppd_category, record_status, source_year
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (transaction_id) DO UPDATE SET
            price = EXCLUDED.price,
            transfer_date = EXCLUDED.transfer_date,
            postcode = EXCLUDED.postcode,
            property_type = EXCLUDED.property_type,
            new_build = EXCLUDED.new_build,
            tenure = EXCLUDED.tenure,
            paon = EXCLUDED.paon,
            saon = EXCLUDED.saon,
            street = EXCLUDED.street,
            locality = EXCLUDED.locality,
            town = EXCLUDED.town,
            district = EXCLUDED.district,
            county = EXCLUDED.county,
            ppd_category = EXCLUDED.ppd_category,
            record_status = EXCLUDED.record_status,
            source_year = EXCLUDED.source_year
    """
    with connect() as conn:
        apply_migrations(conn)
        conn.execute("DELETE FROM price_paid_transaction WHERE source_year = %s", (SOURCE_YEAR,))
        count = 0
        batch: list[tuple] = []
        with conn.cursor() as cur, curated_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(CURATED_FIELDS))
            writer.writeheader()
            for row in iter_raw_rows(raw_path):
                writer.writerow(row)
                batch.append(
                    (
                        row["transaction_id"],
                        int(row["price"]),
                        row["transfer_date"],
                        row["postcode"],
                        row["property_type"],
                        row["new_build"] == "true",
                        row["tenure"],
                        row["paon"],
                        row["saon"],
                        row["street"],
                        row["locality"],
                        row["town"],
                        row["district"],
                        row["county"],
                        row["ppd_category"],
                        row["record_status"],
                        SOURCE_YEAR,
                    )
                )
                if len(batch) >= 5000:
                    cur.executemany(sql, batch)
                    count += len(batch)
                    batch.clear()
                    if count % 100_000 == 0:
                        print(f"  … {count:,} rows")
            if batch:
                cur.executemany(sql, batch)
                count += len(batch)
        conn.commit()
    return count


def search_price_paid(query: str, *, limit: int = 50) -> list[dict]:
    """Postcode prefix or street/town ILIKE search against the loaded slice."""
    q = " ".join((query or "").split()).strip()
    if len(q) < 2:
        return []
    limit = max(1, min(limit, 100))
    compact = q.upper().replace(" ", "")
    parts = q.split()
    street_part = " ".join(parts[:-1]) if len(parts) >= 2 else q
    town_part = parts[-1] if len(parts) >= 2 else q
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT transaction_id, price, transfer_date::text AS transfer_date,
                   postcode, property_type, new_build, tenure, paon, saon,
                   street, locality, town, district, county
            FROM price_paid_transaction
            WHERE source_year = %s
              AND (
                REPLACE(postcode, ' ', '') LIKE %s
                OR street ILIKE %s
                OR (street ILIKE %s AND town ILIKE %s)
                OR town ILIKE %s
              )
            ORDER BY transfer_date DESC
            LIMIT %s
            """,
            (
                SOURCE_YEAR,
                f"{compact}%",
                f"%{q}%",
                f"%{street_part}%",
                f"%{town_part}%",
                f"%{q}%",
                limit,
            ),
        ).fetchall()
    return [dict(r) for r in rows]


def count_price_paid() -> int:
    try:
        with connect() as conn:
            apply_migrations(conn)
            row = conn.execute(
                "SELECT COUNT(*) AS n FROM price_paid_transaction WHERE source_year = %s",
                (SOURCE_YEAR,),
            ).fetchone()
            return int(row["n"]) if row else 0
    except Exception:
        return 0


def main() -> None:
    root = data_root()
    evidence = evidence_from_pinned()
    raw_path = root / evidence.path
    curated_path = root / CURATED_REL
    print(f"curating + loading {raw_path}")
    n = curate_and_load(raw_path, curated_path)
    manifest = build_manifest(evidence, row_count=n)
    save_manifest(root / "manifest.yaml", manifest)
    print(f"rows: {n}")
    print(f"manifest: {root / 'manifest.yaml'}")
    print(f"curated: {curated_path}")
    print(f"sha256 raw: {evidence.checksum_sha256}")
    print(f"attribution: {ATTRIBUTION}")


if __name__ == "__main__":
    main()
