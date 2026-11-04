import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { frameMeters, worldOf } from "./frame.js";
import { parseGeotiff, type GeoGrid } from "./geotiff.js";
import { heightmapTerrain } from "../sim/terrain.js";
import { slopeAt } from "../sim/terrain.js";

const DEG = Math.PI / 180;
const demUrl = new URL("../../data/sphinx/dem/sphinx-cop30.tif", import.meta.url);
const specBox = { north: 60.68, south: 60.65, west: -145.095, east: -145.045 };

function demArrayBuffer(): ArrayBuffer {
  const b = readFileSync(demUrl);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

/** A 45-degree ramp descending toward the east, 1 m pixels at the equator. */
function rampGrid(): GeoGrid {
  const w = 41;
  const h = 5;
  const heights = new Float32Array(w * h);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) heights[r * w + c] = w - 1 - c;
  return {
    width: w,
    height: h,
    scaleLonDeg: 1 / 111320,
    scaleLatDeg: 1 / 111320,
    westDeg: 0,
    northDeg: 5 / 111320,
    heights,
  };
}

describe("frameMeters", () => {
  it("preserves slope magnitude through resampling", () => {
    const frame = frameMeters(rampGrid(), 1, { north: 5 / 111320, south: 0, west: 0, east: 40 / 111320 });
    const terrain = heightmapTerrain(frame.map);
    const slope = slopeAt(terrain, 20, 2);
    expect(slope.angleRad).toBeCloseTo(45 * DEG, 1);
    expect(slope.downhill[0]).toBeGreaterThan(0.99);
  });

  it("reproduces the Sphinx face angles from the real tile", () => {
    const grid = parseGeotiff(demArrayBuffer());
    const frame = frameMeters(grid, 15, specBox);
    const terrain = heightmapTerrain(frame.map);
    const slopeAtGeo = (lat: number, lon: number): number => {
      const { x, z } = worldOf(frame, lat, lon);
      return slopeAt(terrain, x, z, 15).angleRad / DEG;
    };
    // Upper diamond (spec: 53 degrees sustained).
    expect(slopeAtGeo(60.6654, -145.0686)).toBeGreaterThan(48);
    expect(slopeAtGeo(60.6654, -145.0686)).toBeLessThan(60);
    // Mid face (spec: 50-55).
    expect(slopeAtGeo(60.664, -145.0694)).toBeGreaterThan(45);
    expect(slopeAtGeo(60.664, -145.0694)).toBeLessThan(58);
    // Bergschrund bench: the documented flat pocket in the steeps.
    expect(slopeAtGeo(60.6637, -145.0658)).toBeGreaterThan(22);
    expect(slopeAtGeo(60.6637, -145.0658)).toBeLessThan(38);
  });
});
