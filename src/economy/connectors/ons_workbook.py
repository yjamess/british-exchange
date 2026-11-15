"""Download one ONS workbook into an Economy raw/ folder.

Why this exists:
The shared ``Connector.fetch_url`` does not send a User-Agent. ONS sometimes
answers 403 to those requests. Economy must not change the shared contract
in ``src/britain_exchange/``, so the header stays here.

Best practices: pathlib and type hints
(https://docs.python.org/3/library/pathlib.html,
https://docs.python.org/3/library/typing.html).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import httpx

from britain_exchange.checksum import sha256_file
from britain_exchange.manifest import RawEvidence

# A short, honest agent name. ONS asks clients to identify themselves.
_USER_AGENT = "british-exchange-economy/1.0 (research; ONS open data)"


def download_ons_file(
    url: str,
    target: Path,
    *,
    relative_path: str,
    official_release_date: str,
    timeout_s: float = 120.0,
) -> RawEvidence:
    """Save ``url`` to ``target`` and return checksummed raw evidence.

    Raises if the HTTP status is not a success. Does not invent a body.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": _USER_AGENT, "Accept": "*/*"}
    with httpx.Client(timeout=timeout_s, follow_redirects=True, headers=headers) as client:
        response = client.get(url)
        response.raise_for_status()
        target.write_bytes(response.content)

    content_type = response.headers.get("content-type", "")
    return RawEvidence(
        path=relative_path,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
        checksum_sha256=sha256_file(target),
        content_type=content_type,
        official_release_date=official_release_date,
        http_status=response.status_code,
        source_url=url,
    )
