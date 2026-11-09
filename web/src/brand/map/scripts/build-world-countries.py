#!/usr/bin/env python3
"""Regenerate world-countries-display.json from Natural Earth 110m (public domain).

Download:
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson

Usage:
  python3 build-world-countries.py /path/to/ne_110m_admin_0_countries.geojson
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

WIDTH = 960.0
HEIGHT = 480.0
LAT_MIN = -58.0
LAT_MAX = 83.0
OUT = Path(__file__).resolve().parents[1] / "world-countries-display.json"


def project(lon: float, lat: float) -> tuple[float, float]:
    lat = max(LAT_MIN, min(LAT_MAX, lat))
    x = (lon + 180.0) / 360.0 * WIDTH
    y = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * HEIGHT
    return round(x, 2), round(y, 2)


def ring_to_path(ring: list) -> str:
    if not ring:
        return ""
    parts: list[str] = []
    for i, pt in enumerate(ring):
        x, y = project(pt[0], pt[1])
        parts.append(("M" if i == 0 else "L") + f"{x} {y}")
    parts.append("Z")
    return "".join(parts)


def geom_to_path(geom: dict) -> str:
    gtype = geom["type"]
    coords = geom["coordinates"]
    paths: list[str] = []
    if gtype == "Polygon":
        for ring in coords:
            paths.append(ring_to_path(ring))
    elif gtype == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                paths.append(ring_to_path(ring))
    else:
        raise ValueError(gtype)
    return "".join(paths)


def bounds_of(geom: dict) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []

    def walk(ring: list) -> None:
        for pt in ring:
            x, y = project(pt[0], pt[1])
            xs.append(x)
            ys.append(y)

    if geom["type"] == "Polygon":
        for ring in geom["coordinates"]:
            walk(ring)
    else:
        for poly in geom["coordinates"]:
            for ring in poly:
                walk(ring)
    return min(xs), min(ys), max(xs), max(ys)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    src = Path(sys.argv[1])
    geo = json.loads(src.read_text())
    shapes: list[dict] = []
    seen: set[str] = set()
    for feat in geo["features"]:
        props = feat["properties"]
        iso = (props.get("ADM0_A3") or props.get("ISO_A3") or "").strip()
        if not iso or iso in {"-99", "ATA"} or iso in seen:
            continue
        geom = feat.get("geometry")
        if geom is None:
            continue
        path = geom_to_path(geom)
        if not path:
            continue
        seen.add(iso)
        x0, y0, x1, y1 = bounds_of(geom)
        shapes.append(
            {
                "id": iso,
                "name": props.get("NAME") or props.get("ADMIN") or iso,
                "path": path,
                "bounds": [x0, y0, x1, y1],
                "label": [round((x0 + x1) / 2, 2), round((y0 + y1) / 2, 2)],
            }
        )
    shapes.sort(key=lambda s: s["id"])
    OUT.write_text(
        json.dumps(
            {
                "source": "Natural Earth 110m admin_0 countries (public domain)",
                "sourceUrl": "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/",
                "projection": "equirectangular",
                "viewBox": [0, 0, WIDTH, HEIGHT],
                "latClip": [LAT_MIN, LAT_MAX],
                "shapes": shapes,
            },
            separators=(",", ":"),
        )
    )
    print(f"wrote {len(shapes)} countries → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
