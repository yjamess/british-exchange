"""Deploy runtime gates for cloud completeness.

Local dev may serve Ready series from ``data/`` files when ``DATABASE_URL`` is
unset. Production (Railway) and any process with ``BX_REQUIRE_POSTGRES=1`` must
use Supabase Postgres — file fallback is a laptop convenience, not a live store.
"""

from __future__ import annotations

import os


def _truthy(raw: str | None) -> bool | None:
    if raw is None:
        return None
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return None


def require_postgres() -> bool:
    """Return True when Ready series must come from PostgreSQL.

    Explicit ``BX_REQUIRE_POSTGRES`` wins. Otherwise Railway deployments require
    Postgres automatically (``RAILWAY_ENVIRONMENT`` / ``RAILWAY_SERVICE_ID``).
    """
    forced = _truthy(os.environ.get("BX_REQUIRE_POSTGRES"))
    if forced is not None:
        return forced
    return bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_SERVICE_ID"))


def postgres_required_but_missing(*, using_postgres: bool) -> bool:
    return require_postgres() and not using_postgres
