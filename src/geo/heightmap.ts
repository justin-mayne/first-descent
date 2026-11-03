export interface Heightmap {
  width: number;
  height: number;
  /** Grid spacing in meters. */
  spacing: number;
  /** Row-major heights in meters; length === width * height. Index: y * width + x. */
  heights: Float32Array;
  /** Origin of the (0,0) sample in geographic coordinates, if known. */
  origin?: { lat: number; lon: number };
}

export function makeHeightmap(width: number, height: number, spacing: number): Heightmap {
  return { width, height, spacing, heights: new Float32Array(width * height) };
}

export function atIndex(map: Heightmap, x: number, y: number): number {
  return map.heights[y * map.width + x];
}

/** Bilinear sample in grid coordinates (x right, y down); clamps at edges. */
export function sample(map: Heightmap, x: number, y: number): number {
  const cx = Math.min(Math.max(x, 0), map.width - 1);
  const cy = Math.min(Math.max(y, 0), map.height - 1);
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(x0 + 1, map.width - 1);
  const y1 = Math.min(y0 + 1, map.height - 1);
  const fx = cx - x0;
  const fy = cy - y0;
  const h00 = map.heights[y0 * map.width + x0];
  const h10 = map.heights[y0 * map.width + x1];
  const h01 = map.heights[y1 * map.width + x0];
  const h11 = map.heights[y1 * map.width + x1];
  return h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
}

/** Sample in world meters relative to the (0,0) corner. */
export function sampleWorld(map: Heightmap, wx: number, wz: number): number {
  return sample(map, wx / map.spacing, wz / map.spacing);
}

export function bounds(map: Heightmap): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < map.heights.length; i++) {
    const h = map.heights[i];
    if (h < min) min = h;
    if (h > max) max = h;
  }
  return { min, max };
}

/** Extract a sub-region (grid coordinates, inclusive of max edge) as a new map. */
export function crop(map: Heightmap, x0: number, y0: number, x1: number, y1: number): Heightmap {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = makeHeightmap(w, h, map.spacing);
  out.origin = map.origin;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out.heights[y * w + x] = map.heights[(y0 + y) * map.width + (x0 + x)];
    }
  }
  return out;
}
