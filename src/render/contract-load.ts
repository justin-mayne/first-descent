import type { Heightmap } from "../geo/heightmap.js";

/** The shape of assets/sphinx/bounds.json. */
export interface ContractBounds {
  geo: { north: number; south: number; west: number; east: number };
  grid: { width: number; height: number; spacingMeters: number };
  height: {
    minMeters: number;
    maxMeters: number;
    encoding: "uint16-le";
    zeroOffsetMeters: number;
    metersPerUnit: number;
  };
  frame: {
    origin: { lat: number; lon: number };
    xAxis: "east";
    zAxis: "south";
    metersPerDegLat: number;
    metersPerDegLon: number;
  };
}

/** Decode the 16-bit heightfield back into a live Heightmap. */
export function decodeHeightfield(raw: Uint8Array, b: ContractBounds): Heightmap {
  if (raw.length !== b.grid.width * b.grid.height * 2) throw new Error("heightfield size mismatch");
  const heights = new Float32Array(b.grid.width * b.grid.height);
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  for (let i = 0; i < heights.length; i++) {
    heights[i] = b.height.zeroOffsetMeters + dv.getUint16(i * 2, true) * b.height.metersPerUnit;
  }
  return { width: b.grid.width, height: b.grid.height, spacing: b.grid.spacingMeters, heights };
}

export interface WorldProjection {
  metersPerDegLat: number;
  metersPerDegLon: number;
  origin: { lat: number; lon: number };
}

/** Local meter coordinates (x east, z south) of a geographic point. */
export function worldOf(p: WorldProjection, lat: number, lon: number): { x: number; z: number } {
  return {
    x: (lon - p.origin.lon) * p.metersPerDegLon,
    z: (p.origin.lat - lat) * p.metersPerDegLat,
  };
}
