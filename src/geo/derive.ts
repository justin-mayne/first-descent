import type { Heightmap } from "./heightmap.js";

/**
 * Height gradient in meters: [d(height)/d(east), d(height)/d(south)] at a
 * cell, one-sided at the borders. The map frame is x east, rows south.
 */
export function gradientAt(map: Heightmap, col: number, row: number): [number, number] {
  const w = map.width;
  const h = map.height;
  const at = (c: number, r: number): number =>
    map.heights[Math.min(Math.max(r, 0), h - 1) * w + Math.min(Math.max(c, 0), w - 1)];
  const c0 = at(col, row);
  const dxStep = col === 0 || col === w - 1 ? 1 : 2;
  const dzStep = row === 0 || row === h - 1 ? 1 : 2;
  const dx = (col === w - 1 ? c0 - at(col - 1, row) : at(col + 1, row) - (col === 0 ? c0 : at(col - 1, row))) / (dxStep * map.spacing);
  const dz = (row === h - 1 ? c0 - at(col, row - 1) : at(col, row + 1) - (row === 0 ? c0 : at(col, row - 1))) / (dzStep * map.spacing);
  return [dx, dz];
}

/** Slope angle in radians per cell. */
export function slopeGrid(map: Heightmap): Float32Array {
  const out = new Float32Array(map.width * map.height);
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const [dx, dz] = gradientAt(map, col, row);
      out[row * map.width + col] = Math.atan(Math.hypot(dx, dz));
    }
  }
  return out;
}

/** Unit surface normals per cell, components packed (nx, ny, nz) * 3. */
export function normalGrid(map: Heightmap): Float32Array {
  const out = new Float32Array(map.width * map.height * 3);
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const [dx, dz] = gradientAt(map, col, row);
      const len = Math.hypot(dx, 1, dz);
      const i = (row * map.width + col) * 3;
      out[i] = -dx / len;
      out[i + 1] = 1 / len;
      out[i + 2] = -dz / len;
    }
  }
  return out;
}

/**
 * Downhill aspect per cell in radians, compass-style: 0 = north, pi/2 =
 * east, measured clockwise in the x-east / z-south map frame.
 */
export function aspectGrid(map: Heightmap): Float32Array {
  const out = new Float32Array(map.width * map.height);
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const [dx, dz] = gradientAt(map, col, row);
      const flat = Math.hypot(dx, dz) < 1e-9;
      const a = flat ? 0 : Math.atan2(-dx, dz);
      out[row * map.width + col] = a < 0 ? a + 2 * Math.PI : a;
    }
  }
  return out;
}
