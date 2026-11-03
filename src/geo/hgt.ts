import { makeHeightmap, type Heightmap } from "./heightmap.js";

/**
 * Parse an SRTM `.hgt` file: raw big-endian int16 samples on a regular grid.
 * Sizes: 1201x1201 (1 arc-second, ~30 m) or 3601x3601 (1/3 arc-second, ~10 m).
 */
export function parseHgt(buffer: ArrayBuffer): Heightmap {
  const side = Math.sqrt(buffer.byteLength / 2);
  if (side !== 1201 && side !== 3601 && side !== 1801) {
    throw new Error(`unexpected hgt size: ${buffer.byteLength} bytes (${side} per side)`);
  }
  const view = new DataView(buffer);
  const map = makeHeightmap(side, side, arcSecondsToMeters(side === 3601 ? 1 / 3 : 1));
  for (let i = 0; i < side * side; i++) {
    map.heights[i] = view.getInt16(i * 2, false);
  }
  return map;
}

function arcSecondsToMeters(arcSeconds: number): number {
  return Math.round(arcSeconds * (1 / 3600) * (Math.PI / 180) * 6371000);
}
