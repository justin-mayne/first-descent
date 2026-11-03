export interface Terrain {
  height(x: number, z: number): number;
}

export interface SlopeInfo {
  angleRad: number;
  gradient: [number, number];
  /** Unit uphill normal of the terrain plane. */
  normal: [number, number, number];
  /** Unit horizontal direction of steepest descent. */
  downhill: [number, number];
}

export function slopeAt(terrain: Terrain, x: number, z: number, eps = 2): SlopeInfo {
  const dhdx = (terrain.height(x + eps, z) - terrain.height(x - eps, z)) / (2 * eps);
  const dhdz = (terrain.height(x, z + eps) - terrain.height(x, z - eps)) / (2 * eps);
  const run = Math.hypot(dhdx, dhdz);
  const angleRad = Math.atan(run);
  const nLen = Math.hypot(dhdx, 1, dhdz);
  const normal: [number, number, number] = [-dhdx / nLen, 1 / nLen, -dhdz / nLen];
  const downhill: [number, number] = run < 1e-9 ? [0, 0] : [-dhdx / run, -dhdz / run];
  return { angleRad, gradient: [dhdx, dhdz], normal, downhill };
}

/** A planar slope of the given angle, descending toward +x, at a base altitude. */
export function planarTerrain(angleRad: number, baseAltitude = 0): Terrain {
  return { height: (x) => baseAltitude - x * Math.tan(angleRad) };
}

/** Deterministic value-noise mountain for tests and the no-data fallback. */
export function proceduralTerrain(seed = 7, featureSize = 240, amplitude = 700): Terrain {
  const hash = (ix: number, iz: number) => {
    let h = (ix * 374761393 + iz * 668265263 + seed * 2246822519) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, z: number) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = smooth(x - ix);
    const fz = smooth(z - iz);
    const a = hash(ix, iz);
    const b = hash(ix + 1, iz);
    const c = hash(ix, iz + 1);
    const d = hash(ix + 1, iz + 1);
    return a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz;
  };
  return {
    height: (x: number, z: number) => {
      let h = 0;
      let scale = featureSize;
      let amp = amplitude;
      for (let octave = 0; octave < 5; octave++) {
        const n = noise(x / scale, z / scale);
        h += (1 - Math.abs(2 * n - 1)) * amp; // ridged: sharp crests, corridors
        scale /= 2;
        amp /= 2.2;
      }
      return h;
    },
  };
}

/** A Terrain backed by a parsed heightmap grid, world origin at its (0,0) corner. */
export function heightmapTerrain(map: { width: number; spacing: number; heights: Float32Array }): Terrain {
  const at = (gx: number, gy: number) => {
    const cx = Math.min(Math.max(gx, 0), map.width - 1);
    const cy = Math.min(Math.max(gy, 0), map.width - 1);
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const x1 = Math.min(x0 + 1, map.width - 1);
    const y1 = Math.min(y0 + 1, map.width - 1);
    const fx = cx - x0;
    const fy = cy - y0;
    const h = (xx: number, yy: number) => map.heights[yy * map.width + xx];
    return h(x0, y0) * (1 - fx) * (1 - fy) + h(x1, y0) * fx * (1 - fy) + h(x0, y1) * (1 - fx) * fy + h(x1, y1) * fx * fy;
  };
  return { height: (x, z) => at(x / map.spacing, z / map.spacing) };
}
