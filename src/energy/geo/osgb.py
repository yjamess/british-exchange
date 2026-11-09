"""OSGB36 (EPSG:27700) easting/northing → WGS84 latitude/longitude.

Approach (plain language):
1. Convert National Grid easting/northing to OSGB36 lat/lon (Airy 1830 ellipsoid).
2. Apply the OS-recommended Helmert transform to WGS84 (ETRS89-compatible for UK maps).

Formulas follow Ordnance Survey's published conversion guidance:
https://www.ordnancesurvey.co.uk/documents/resources/guide-coordinate-systems-great-britain.pdf

Beginner note: prefer documenting the CRS and transform over inventing a "good enough"
shift. We do not use pyproj here so the pin stays dependency-light.
"""

from __future__ import annotations

import math
from typing import NamedTuple


class LonLat(NamedTuple):
    lon: float
    lat: float


# Airy 1830 (OSGB36)
_A = 6377563.396
_B = 6356256.909
_F0 = 0.9996012717  # scale factor on central meridian
_LAT0 = math.radians(49.0)
_LON0 = math.radians(-2.0)
_E0 = 400_000.0
_N0 = -100_000.0

# Helmert OSGB36 → WGS84 (metres / ppm / arc-seconds → radians)
_TX, _TY, _TZ = -446.448, 125.157, -542.060
_RX = math.radians(-0.1502 / 3600.0)
_RY = math.radians(-0.2470 / 3600.0)
_RZ = math.radians(-0.8421 / 3600.0)
_S = -20.4894 / 1_000_000.0  # scale
_A_WGS = 6378137.0
_F_WGS = 1 / 298.257223563


def _osgb36_to_lonlat(easting: float, northing: float) -> LonLat:
    """National Grid → OSGB36 geodetic (degrees)."""
    e2 = 1 - (_B * _B) / (_A * _A)
    n = (_A - _B) / (_A + _B)
    lat = _LAT0
    m = 0.0
    while abs(northing - _N0 - m) >= 0.00001:
        lat = ((northing - _N0 - m) / (_A * _F0)) + lat
        ma = (1 + n + (5 / 4) * n * n + (5 / 4) * n**3) * (lat - _LAT0)
        mb = (3 * n + 3 * n * n + (21 / 8) * n**3) * math.sin(lat - _LAT0) * math.cos(lat + _LAT0)
        mc = ((15 / 8) * n * n + (15 / 8) * n**3) * math.sin(2 * (lat - _LAT0)) * math.cos(2 * (lat + _LAT0))
        md = (35 / 24) * n**3 * math.sin(3 * (lat - _LAT0)) * math.cos(3 * (lat + _LAT0))
        m = _B * _F0 * (ma - mb + mc - md)

    cos_lat = math.cos(lat)
    sin_lat = math.sin(lat)
    nu = _A * _F0 / math.sqrt(1 - e2 * sin_lat * sin_lat)
    rho = _A * _F0 * (1 - e2) * (1 - e2 * sin_lat * sin_lat) ** -1.5
    eta2 = nu / rho - 1
    tan_lat = math.tan(lat)
    sec_lat = 1 / cos_lat
    vii = tan_lat / (2 * rho * nu)
    viii = (tan_lat / (24 * rho * nu**3)) * (5 + 3 * tan_lat * tan_lat + eta2 - 9 * tan_lat * tan_lat * eta2)
    ix = (tan_lat / (720 * rho * nu**5)) * (61 + 90 * tan_lat * tan_lat + 45 * tan_lat**4)
    x = sec_lat / nu
    xi = (sec_lat / (6 * nu**3)) * (nu / rho + 2 * tan_lat * tan_lat)
    xii = (sec_lat / (120 * nu**5)) * (5 + 28 * tan_lat * tan_lat + 24 * tan_lat**4)
    xiia = (sec_lat / (5040 * nu**7)) * (61 + 662 * tan_lat * tan_lat + 1320 * tan_lat**4 + 720 * tan_lat**6)
    de = easting - _E0
    lat_p = lat - vii * de**2 + viii * de**4 - ix * de**6
    lon_p = _LON0 + x * de - xi * de**3 + xii * de**5 - xiia * de**7
    return LonLat(lon=math.degrees(lon_p), lat=math.degrees(lat_p))


def _helmert_osgb_to_wgs(lon: float, lat: float) -> LonLat:
    """Helmert 7-parameter transform OSGB36 → WGS84 (degrees)."""
    lat_r, lon_r = math.radians(lat), math.radians(lon)
    sin_lat, cos_lat = math.sin(lat_r), math.cos(lat_r)
    sin_lon, cos_lon = math.sin(lon_r), math.cos(lon_r)
    e2 = 1 - (_B * _B) / (_A * _A)
    nu = _A / math.sqrt(1 - e2 * sin_lat * sin_lat)
    x = (nu) * cos_lat * cos_lon
    y = (nu) * cos_lat * sin_lon
    z = ((1 - e2) * nu) * sin_lat

    x2 = _TX + (1 + _S) * x + (-_RZ) * y + _RY * z
    y2 = _TY + _RZ * x + (1 + _S) * y + (-_RX) * z
    z2 = _TZ + (-_RY) * x + _RX * y + (1 + _S) * z

    e2_w = _F_WGS * (2 - _F_WGS)
    p = math.sqrt(x2 * x2 + y2 * y2)
    lat2 = math.atan2(z2, p * (1 - e2_w))
    for _ in range(6):
        sin_l = math.sin(lat2)
        nu_w = _A_WGS / math.sqrt(1 - e2_w * sin_l * sin_l)
        lat2 = math.atan2(z2 + e2_w * nu_w * sin_l, p)
    lon2 = math.atan2(y2, x2)
    return LonLat(lon=math.degrees(lon2), lat=math.degrees(lat2))


def osgb_to_wgs84(easting: float, northing: float) -> LonLat | None:
    """Return WGS84 lon/lat, or None if the grid reference is out of a sensible UK box."""
    if not (0 < easting < 800_000 and -100_000 < northing < 1_400_000):
        return None
    osgb = _osgb36_to_lonlat(easting, northing)
    wgs = _helmert_osgb_to_wgs(osgb.lon, osgb.lat)
    if not (-12 <= wgs.lon <= 4 and 49 <= wgs.lat <= 62):
        return None
    return wgs


def parse_xy(raw_x: object, raw_y: object) -> tuple[float, float] | None:
    """Parse DUKES/REPD X/Y cells that may be strings."""
    try:
        x = float(str(raw_x).strip())
        y = float(str(raw_y).strip())
    except (TypeError, ValueError):
        return None
    if x == 0 and y == 0:
        return None
    return x, y
