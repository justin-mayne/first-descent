import type { Heightmap } from "../geo/heightmap.js";
import { slopeGrid } from "../geo/derive.js";

export interface TerrainGeometryData {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

/**
 * Flat-shaded vertex data for the whole framed map: vertex (col, row) at
 * world (col*spacing, height, row*spacing); x east, z south.
 */
export function buildTerrainGeometryData(map: Heightmap): TerrainGeometryData {
  const w = map.width;
  const h = map.height;
  const positions = new Float32Array(w * h * 3);
  const colors = new Float32Array(w * h * 3);
  const slopes = slopeGrid(map);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const i = row * w + col;
      positions[i * 3] = col * map.spacing;
      positions[i * 3 + 1] = map.heights[i];
      positions[i * 3 + 2] = row * map.spacing;
      const [r, g, b] = terrainColor(map.heights[i], slopes[i]);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
  }
  const indices = new Uint32Array((w - 1) * (h - 1) * 6);
  let o = 0;
  for (let row = 0; row < h - 1; row++) {
    for (let col = 0; col < w - 1; col++) {
      const a = row * w + col;
      indices[o++] = a;
      indices[o++] = a + w;
      indices[o++] = a + 1;
      indices[o++] = a + 1;
      indices[o++] = a + w;
      indices[o++] = a + w + 1;
    }
  }
  return { positions, colors, indices };
}

const DEG = Math.PI / 180;

/** Snow, steep-snow, and bare-rock banding by slope angle. */
export function terrainColor(heightM: number, slopeRad: number): [number, number, number] {
  const deg = slopeRad / DEG;
  if (deg > 55) {
    const t = Math.min(1, (deg - 55) / 15);
    return [0.5 - 0.12 * t, 0.46 - 0.1 * t, 0.44 - 0.08 * t];
  }
  const snow: [number, number, number] = [0.93, 0.96, 1.0];
  if (deg > 45) {
    const t = (deg - 45) / 10;
    return [snow[0] - 0.25 * t, snow[1] - 0.24 * t, snow[2] - 0.2 * t];
  }
  const shade = Math.min(1, Math.max(0, (deg - 20) / 25)) * 0.12;
  const warm = Math.min(1, Math.max(0, (2400 - heightM) / 600)) * 0.06;
  return [snow[0] - shade - warm, snow[1] - shade - warm * 0.5, snow[2] - shade];
}
