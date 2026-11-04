import { bounds } from "./heightmap.js";
import type { FramedMap, GeoBox } from "./frame.js";
import { slopeGrid, normalGrid, aspectGrid } from "./derive.js";
import { encodePngRgb } from "./png.js";

export interface ContractFile {
  path: string;
  data: Uint8Array | string;
}

/**
 * The engine-agnostic asset contract: 16-bit heightfield + georeferencing,
 * derived slope/normal/aspect rasters as PNGs, and the route as GeoJSON.
 * Pure: returns files, callers do the writing.
 */
export function buildContract(frame: FramedMap, box: GeoBox, lineGeoJson: unknown): ContractFile[] {
  const map = frame.map;
  const { min, max } = bounds(map);
  const metersPerUnit = max > min ? (max - min) / 65535 : 1;

  const raw = new Uint8Array(map.width * map.height * 2);
  const dv = new DataView(raw.buffer);
  for (let i = 0; i < map.heights.length; i++) {
    dv.setUint16(i * 2, Math.round((map.heights[i] - min) / metersPerUnit), true);
  }

  const slope = slopeGrid(map);
  const slopeRgb = new Uint8Array(map.width * map.height * 3);
  for (let i = 0; i < slope.length; i++) {
    const v = Math.min(255, Math.round((slope[i] / (Math.PI / 2)) * 255));
    slopeRgb[i * 3] = v;
    slopeRgb[i * 3 + 1] = v;
    slopeRgb[i * 3 + 2] = v;
  }

  const normals = normalGrid(map);
  const normalRgb = new Uint8Array(map.width * map.height * 3);
  for (let i = 0; i < map.width * map.height; i++) {
    normalRgb[i * 3] = Math.round((normals[i * 3] * 0.5 + 0.5) * 255);
    normalRgb[i * 3 + 1] = Math.round((normals[i * 3 + 1] * 0.5 + 0.5) * 255);
    normalRgb[i * 3 + 2] = Math.round((normals[i * 3 + 2] * 0.5 + 0.5) * 255);
  }

  const aspect = aspectGrid(map);
  const aspectRgb = new Uint8Array(map.width * map.height * 3);
  for (let i = 0; i < aspect.length; i++) {
    const v = Math.round((aspect[i] / (2 * Math.PI)) * 255);
    aspectRgb[i * 3] = v;
    aspectRgb[i * 3 + 1] = v;
    aspectRgb[i * 3 + 2] = v;
  }

  const boundsJson = {
    geo: { north: box.north, south: box.south, west: box.west, east: box.east },
    grid: { width: map.width, height: map.height, spacingMeters: map.spacing },
    height: { minMeters: min, maxMeters: max, encoding: "uint16-le", zeroOffsetMeters: min, metersPerUnit },
    frame: {
      origin: { lat: frame.origin.lat, lon: frame.origin.lon },
      xAxis: "east",
      zAxis: "south",
      metersPerDegLat: frame.metersPerDegLat,
      metersPerDegLon: frame.metersPerDegLon,
    },
  };

  return [
    { path: "heightmap-16bit.raw", data: raw },
    { path: "slope.png", data: encodePngRgb(map.width, map.height, slopeRgb) },
    { path: "normal.png", data: encodePngRgb(map.width, map.height, normalRgb) },
    { path: "aspect.png", data: encodePngRgb(map.width, map.height, aspectRgb) },
    { path: "bounds.json", data: JSON.stringify(boundsJson, null, 2) },
    { path: "line.geojson", data: JSON.stringify(lineGeoJson, null, 2) },
  ];
}
