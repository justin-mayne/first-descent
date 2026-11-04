import { makeHeightmap, sample, type Heightmap } from "./heightmap.js";
import type { GeoGrid } from "./geotiff.js";

export const METERS_PER_DEG = 111320;

/**
 * World convention of a framed map: x = meters east of the NW origin,
 * z = meters SOUTH of the origin (the row direction of the north-up
 * raster), y = elevation in meters. Convert to the sim's z-north frame
 * by mirroring z when the render side consumes it.
 */
export interface FramedMap {
  map: Heightmap;
  origin: { lat: number; lon: number };
  metersPerDegLat: number;
  metersPerDegLon: number;
}

export interface GeoBox {
  north: number;
  south: number;
  west: number;
  east: number;
}

/** Bilinear-resample a GeoGrid onto a square meter grid covering `box`. */
export function frameMeters(grid: GeoGrid, spacingM: number, box: GeoBox): FramedMap {
  const centerLat = ((box.north + box.south) / 2) * (Math.PI / 180);
  const metersPerDegLat = METERS_PER_DEG;
  const metersPerDegLon = METERS_PER_DEG * Math.cos(centerLat);
  const widthM = (box.east - box.west) * metersPerDegLon;
  const heightM = (box.north - box.south) * metersPerDegLat;
  const w = Math.max(2, Math.round(widthM / spacingM) + 1);
  const h = Math.max(2, Math.round(heightM / spacingM) + 1);

  const src: Heightmap = { width: grid.width, height: grid.height, spacing: 1, heights: grid.heights };
  const map = makeHeightmap(w, h, spacingM);
  map.origin = { lat: box.north, lon: box.west };
  for (let row = 0; row < h; row++) {
    const lat = box.north - (row * spacingM) / metersPerDegLat;
    const gy = (grid.northDeg - lat) / grid.scaleLatDeg;
    for (let col = 0; col < w; col++) {
      const lon = box.west + (col * spacingM) / metersPerDegLon;
      const gx = (lon - grid.westDeg) / grid.scaleLonDeg;
      map.heights[row * w + col] = sample(src, gx, gy);
    }
  }
  return { map, origin: map.origin, metersPerDegLat, metersPerDegLon };
}

/** Local meter coordinates (x east, z south) of a geographic point in the frame. */
export function worldOf(frame: FramedMap, lat: number, lon: number): { x: number; z: number } {
  return {
    x: (lon - frame.origin.lon) * frame.metersPerDegLon,
    z: (frame.origin.lat - lat) * frame.metersPerDegLat,
  };
}
