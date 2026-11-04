import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseGeotiff } from "./geotiff.js";

const demUrl = new URL("../../data/sphinx/dem/sphinx-cop30.tif", import.meta.url);
const fixtureUrl = new URL("fixtures/strip-f32.tif", import.meta.url);

function toArrayBuffer(b: Uint8Array): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

describe("parseGeotiff", () => {
  it("reads an uncompressed stripped GeoTIFF fixture (3x2 float32)", () => {
    const raw = readFileSync(fixtureUrl);
    expect(raw[0]).toBe(0x49);
    expect(raw[1]).toBe(0x49);
    expect(raw[2]).toBe(42);
    const grid = parseGeotiff(toArrayBuffer(raw));
    expect(grid.width).toBe(3);
    expect(grid.height).toBe(2);
    expect(grid.scaleLonDeg).toBeCloseTo(0.001);
    expect(grid.scaleLatDeg).toBeCloseTo(0.001);
    expect(grid.westDeg).toBeCloseTo(0);
    expect(grid.northDeg).toBeCloseTo(60);
    expect(Array.from(grid.heights)).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it("decodes the real Copernicus tile (tiled LZW float32) against known values", () => {
    const grid = parseGeotiff(toArrayBuffer(readFileSync(demUrl)));
    expect(grid.width).toBe(540);
    expect(grid.height).toBe(324);
    expect(grid.scaleLonDeg).toBeCloseTo(1 / 3600, 8);
    expect(grid.westDeg).toBeCloseTo(-145.15, 5);
    expect(grid.northDeg).toBeCloseTo(60.71, 5);

    let min = Infinity;
    let max = -Infinity;
    for (const v of grid.heights) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    expect(min).toBeGreaterThan(590);
    expect(min).toBeLessThan(600);
    expect(max).toBeGreaterThan(1950);
    expect(max).toBeLessThan(1960);

    // Summit pin sample, verified independently in python.
    const pinRow = Math.round((60.71 - 60.66667) / grid.scaleLatDeg);
    const pinCol = Math.round((-145.07028 - grid.westDeg) / grid.scaleLonDeg);
    expect(grid.heights[pinRow * grid.width + pinCol]).toBeGreaterThan(1912);
    expect(grid.heights[pinRow * grid.width + pinCol]).toBeLessThan(1922);
  });
});
