"""
BUILD_TERRAIN.py — atlas terrain pipeline.

Downloads Mapzen "terrarium" DEM tiles (elevation encoded in PNG RGB) from the
public AWS elevation-tiles-prod bucket, decodes to a numpy elevation grid,
computes a hillshade + soft hypsometric tint, and writes a single PNG for the
atlas to render underneath the physical layers.

Terrarium encoding:  elevation_m = (R * 256) + G + (B / 256) - 32768

Cartographic choices
--------------------
* Illumination: azimuth 315° (NW), altitude 45°. Standard NatGeo/Britannica.
* Hypsometric tint: soft pale-green → cream → warm buff → mauve → white.
  Very muted so labels and thematic layers read on top.
* Blend: multiply hillshade over tint at ~60% strength.
* Output PNG: RGB (no alpha) so it acts as a paper base.

Output
------
    ../terrain-hillshade.png          — the final PNG the atlas embeds
    ../terrain-metadata.json          — bounds + projection info
"""

import io
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE  = Path(__file__).parent
CACHE = HERE / 'terrain-tiles'
OUT   = HERE.parent
CACHE.mkdir(exist_ok=True)

# Atlas bounds (from atlas.json manifest). One-degree padding so hillshade edges
# aren't awkward on the Rajasthan boundary.
BOUNDS = {
    'minLon': 68.8, 'maxLon': 79.0,
    'minLat': 22.2, 'maxLat': 30.9,
}

ZOOM = 7
TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'


# ---------------------------------------------------------------------------
# Tile math
# ---------------------------------------------------------------------------

def deg2num(lat, lon, zoom):
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1/math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x, y

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat = math.degrees(lat_rad)
    return lat, lon


# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------

def fetch_tile(x, y, z, tries=3):
    path = CACHE / f'terrarium-{z}-{x}-{y}.png'
    if path.exists() and path.stat().st_size > 1024:
        return path
    url = TILE_URL.format(z=z, x=x, y=y)
    # Python's urllib on macOS often hits SSL cert issues on Python.org builds;
    # curl handles it via the system trust store. Also uses --retry to survive
    # the occasional S3 slowness.
    last = None
    for attempt in range(1, tries + 1):
        r = subprocess.run(['curl', '-sSL', '--fail', '-m', '90',
                            '--retry', '2', '--retry-delay', '2',
                            '-A', 'rajasthan-atlas/1.0', '-o', str(path), url],
                           capture_output=True)
        if r.returncode == 0 and path.exists() and path.stat().st_size > 1024:
            return path
        last = r
        print(f'  retry {attempt}/{tries}: x={x} y={y}')
    raise RuntimeError(f'failed to fetch {url}: {last.stderr!r}')


def fetch_all():
    xs = list(range(deg2num(BOUNDS['maxLat'], BOUNDS['minLon'], ZOOM)[0],
                    deg2num(BOUNDS['minLat'], BOUNDS['maxLon'], ZOOM)[0] + 1))
    ys = list(range(deg2num(BOUNDS['maxLat'], BOUNDS['minLon'], ZOOM)[1],
                    deg2num(BOUNDS['minLat'], BOUNDS['maxLon'], ZOOM)[1] + 1))
    print(f'Fetching {len(xs)*len(ys)} tiles: x={xs} × y={ys}')
    grid = {}
    for x in xs:
        for y in ys:
            grid[(x, y)] = fetch_tile(x, y, ZOOM)
    return xs, ys, grid


# ---------------------------------------------------------------------------
# Decode + stitch
# ---------------------------------------------------------------------------

def stitch(xs, ys, grid):
    cols, rows = len(xs), len(ys)
    tile_size = 256
    big = np.zeros((rows * tile_size, cols * tile_size, 3), dtype=np.uint8)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            im = Image.open(grid[(x, y)]).convert('RGB')
            arr = np.asarray(im, dtype=np.uint8)
            big[j*tile_size:(j+1)*tile_size, i*tile_size:(i+1)*tile_size] = arr
    return big


def decode_terrarium(rgb):
    r = rgb[..., 0].astype(np.float32)
    g = rgb[..., 1].astype(np.float32)
    b = rgb[..., 2].astype(np.float32)
    ele = (r * 256.0) + g + (b / 256.0) - 32768.0
    return ele


# ---------------------------------------------------------------------------
# Crop to atlas bounds
# ---------------------------------------------------------------------------

def crop_to_bounds(ele, xs, ys):
    # Compute the world lat/lon of the stitched grid's corners
    top_lat, west_lon = num2deg(xs[0], ys[0], ZOOM)              # top-left of first tile
    bot_lat, east_lon = num2deg(xs[-1] + 1, ys[-1] + 1, ZOOM)    # bottom-right of last tile
    H, W = ele.shape
    # Pixel resolution
    lat_per_row = (bot_lat - top_lat) / H       # negative going down
    lon_per_col = (east_lon - west_lon) / W

    # Compute crop indices for the atlas bounds
    col_west  = int((BOUNDS['minLon'] - west_lon) / lon_per_col)
    col_east  = int((BOUNDS['maxLon'] - west_lon) / lon_per_col)
    row_north = int((BOUNDS['maxLat'] - top_lat) / lat_per_row)  # top of crop
    row_south = int((BOUNDS['minLat'] - top_lat) / lat_per_row)  # bottom of crop
    row_north = max(0, row_north)
    row_south = min(H, row_south)
    col_west  = max(0, col_west)
    col_east  = min(W, col_east)

    cropped = ele[row_north:row_south, col_west:col_east]
    # Actual lat/lon of the cropped region's corners
    top    = top_lat + row_north * lat_per_row
    bottom = top_lat + row_south * lat_per_row
    west   = west_lon + col_west * lon_per_col
    east   = west_lon + col_east * lon_per_col
    return cropped, dict(minLon=west, maxLon=east, minLat=bottom, maxLat=top)


# ---------------------------------------------------------------------------
# Hillshade
# ---------------------------------------------------------------------------

def compute_hillshade(ele, cell_size_m, azimuth_deg=315.0, altitude_deg=45.0,
                     z_factor=1.5):
    """
    Standard USGS hillshade formula. Result is 0..255 uint8 grayscale.
    z_factor exaggerates relief for atlas readability.
    """
    az_rad   = math.radians(360.0 - azimuth_deg + 90.0)
    alt_rad  = math.radians(altitude_deg)

    # Gradients (numpy). Note: rows go south-to-north when top_row = north.
    # dz/dx: east direction (positive x); dz/dy: south direction (positive y in image).
    dzdy, dzdx = np.gradient(ele * z_factor, cell_size_m, cell_size_m)
    slope = np.arctan(np.hypot(dzdx, dzdy))
    aspect = np.arctan2(-dzdy, -dzdx)   # tuned so NW light produces expected shadows

    illumination = (np.cos(alt_rad) * np.cos(slope) +
                    np.sin(alt_rad) * np.sin(slope) * np.cos(az_rad - aspect))
    illumination = np.clip(illumination, 0.0, 1.0)
    return (illumination * 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# Hypsometric tint
# ---------------------------------------------------------------------------

# Soft palette — inspired by NatGeo terrain plates: cool pale green in the plains,
# warm buff on mid-elevation, mauve-grey on high ridges, near-white on peaks.
# Rajasthan's low relief (mostly 100–600 m, peak 1722 m) shapes the stops.
HYPSO_STOPS = [
    (   0, (216, 220, 200)),   # cool paper — near sea level (unused in Rajasthan)
    ( 100, (219, 218, 194)),   # river plains
    ( 250, (222, 213, 178)),   # low plains
    ( 400, (218, 200, 158)),   # plateau
    ( 600, (200, 174, 132)),   # Aravalli mid
    ( 900, (174, 148, 118)),   # Aravalli high
    (1200, (156, 130, 116)),   # near-peak
    (1500, (176, 156, 148)),   # peaks
    (1800, (218, 200, 196)),   # snow-adjacent (unused mostly)
]


def hypsometric_tint(ele):
    """Interpolate the palette to give each pixel an RGB tint by elevation."""
    stops = np.array([s[0] for s in HYPSO_STOPS], dtype=np.float32)
    cols  = np.array([s[1] for s in HYPSO_STOPS], dtype=np.float32)  # (N, 3)
    H, W = ele.shape
    ele_c = np.clip(ele, stops[0], stops[-1])
    idx = np.searchsorted(stops, ele_c, side='right') - 1
    idx = np.clip(idx, 0, len(stops) - 2)
    lo = stops[idx]; hi = stops[idx + 1]
    lo_col = cols[idx]; hi_col = cols[idx + 1]
    t = ((ele_c - lo) / (hi - lo + 1e-9)).reshape(H, W, 1)
    rgb = lo_col + t * (hi_col - lo_col)
    # Slight desaturation toward the paper base so terrain reads as ground, not data
    paper = np.array([244, 236, 216], dtype=np.float32)  # --paper light theme
    rgb = 0.65 * rgb + 0.35 * paper
    return np.clip(rgb, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# Blend + emit
# ---------------------------------------------------------------------------

def blend(tint, hillshade, strength=0.55):
    """Multiply hillshade over tint at `strength` opacity."""
    hs = hillshade.astype(np.float32) / 255.0
    hs = 1.0 - (1.0 - hs) * strength       # dampen strength
    return np.clip(tint.astype(np.float32) * hs[..., None], 0, 255).astype(np.uint8)


def cell_size_metres(bounds, ele_shape):
    H, W = ele_shape
    mid_lat = (bounds['minLat'] + bounds['maxLat']) / 2
    km_per_deg_lat = 111.32
    km_per_deg_lon = 111.32 * math.cos(math.radians(mid_lat))
    lat_span_km = (bounds['maxLat'] - bounds['minLat']) * km_per_deg_lat
    lon_span_km = (bounds['maxLon'] - bounds['minLon']) * km_per_deg_lon
    dx = (lon_span_km * 1000) / W
    dy = (lat_span_km * 1000) / H
    return (dx + dy) / 2


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    xs, ys, grid = fetch_all()
    stitched = stitch(xs, ys, grid)
    ele_full = decode_terrarium(stitched)
    print(f'Stitched grid: {ele_full.shape} · elevation range '
          f'{ele_full.min():.0f} → {ele_full.max():.0f} m')

    ele, actual_bounds = crop_to_bounds(ele_full, xs, ys)
    print(f'Cropped to Rajasthan bounds: {ele.shape} · elevation range '
          f'{ele.min():.0f} → {ele.max():.0f} m')

    # Downsample slightly for delivery size — target ~1000 px wide.
    H, W = ele.shape
    target_w = 1000
    if W > target_w:
        scale = target_w / W
        new_h = int(H * scale)
        pil = Image.fromarray(ele.astype(np.float32), mode='F').resize(
            (target_w, new_h), Image.BILINEAR)
        ele = np.asarray(pil)
        print(f'Downsampled to {ele.shape} for delivery')

    cell = cell_size_metres(actual_bounds, ele.shape)
    print(f'Cell size ≈ {cell:.0f} m')

    hs   = compute_hillshade(ele, cell)
    tint = hypsometric_tint(ele)
    blended = blend(tint, hs, strength=0.60)

    out_png = OUT / 'terrain-hillshade.png'
    Image.fromarray(blended).save(out_png, optimize=True)
    print(f'Wrote {out_png.name}: {out_png.stat().st_size:,} bytes  ({ele.shape[1]}×{ele.shape[0]})')

    meta = {
        'schemaVersion': 1,
        'lastUpdated':   '2026-07-06',
        'bounds':        {k: round(v, 5) for k, v in actual_bounds.items()},
        'image':         'atlas/data/terrain-hillshade.png',
        'width':         ele.shape[1], 'height': ele.shape[0],
        'elevationRange': [int(ele.min()), int(ele.max())],
        'source': ('Mapzen "terrarium" DEM tiles from the AWS elevation-tiles-prod bucket '
                   '(SRTMGL1 / SRTMGL3 fused). ODbL 1.0.'),
        'hillshade': {'azimuth': 315.0, 'altitude': 45.0, 'zFactor': 1.5},
    }
    (OUT / 'terrain-metadata.json').write_text(json.dumps(meta, indent=2))
    print(f'Wrote terrain-metadata.json')


if __name__ == '__main__':
    main()
