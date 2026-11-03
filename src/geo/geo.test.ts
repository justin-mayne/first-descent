import { describe, expect, it } from "vitest";
import { makeHeightmap, sample, bounds, crop } from "./heightmap.js";
import { parseHgt } from "./hgt.js";

describe("heightmap", () => {
  it("samples bilinearly between grid points", () => {
    const map = makeHeightmap(2, 2, 30);
    map.heights.set([0, 100, 200, 300]);
    expect(sample(map, 0, 0)).toBeCloseTo(0);
    expect(sample(map, 1, 1)).toBeCloseTo(300);
    expect(sample(map, 0.5, 0.5)).toBeCloseTo(150);
    expect(sample(map, 0.25, 0)).toBeCloseTo(25);
  });

  it("clamps sampling outside the grid", () => {
    const map = makeHeightmap(2, 2, 30);
    map.heights.set([10, 20, 30, 40]);
    expect(sample(map, -5, -5)).toBeCloseTo(10);
    expect(sample(map, 99, 99)).toBeCloseTo(40);
  });

  it("reports bounds and crops sub-regions", () => {
    const map = makeHeightmap(4, 4, 30);
    for (let i = 0; i < 16; i++) map.heights[i] = i;
    expect(bounds(map)).toEqual({ min: 0, max: 15 });
    const part = crop(map, 1, 1, 2, 2);
    expect(part.width).toBe(2);
    expect(Array.from(part.heights)).toEqual([5, 6, 9, 10]);
  });
});

describe("parseHgt", () => {
  it("parses a synthetic 1201x1201 SRTM tile with ~30 m spacing", () => {
    const side = 1201;
    const buffer = new ArrayBuffer(side * side * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < side * side; i++) {
      view.setInt16(i * 2, (i % 4000) - 1000, false);
    }
    const map = parseHgt(buffer);
    expect(map.width).toBe(side);
    expect(map.height).toBe(side);
    expect(map.spacing).toBeCloseTo(30, -1);
    expect(map.heights[0]).toBe(-1000);
    expect(map.heights[1]).toBe(-999);
  });

  it("rejects non-SRTM-sized buffers", () => {
    expect(() => parseHgt(new ArrayBuffer(1000))).toThrow();
  });
});
