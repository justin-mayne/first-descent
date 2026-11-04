import { describe, expect, it } from "vitest";
import { makeHeightmap } from "./heightmap.js";
import { slopeGrid, normalGrid, aspectGrid } from "./derive.js";

const DEG = Math.PI / 180;

/** 45-degree plane descending toward the east on a 1 m grid. */
function ramp(): ReturnType<typeof makeHeightmap> {
  const map = makeHeightmap(9, 3, 1);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) map.heights[r * 9 + c] = 8 - c;
  return map;
}

describe("derived rasters", () => {
  it("computes slope, normal, and aspect on a 45-degree east-facing ramp", () => {
    const map = ramp();
    const slopes = slopeGrid(map);
    const normals = normalGrid(map);
    const aspects = aspectGrid(map);
    for (let i = 0; i < 9 * 3; i++) {
      expect(slopes[i]).toBeCloseTo(45 * DEG, 5);
      expect(normals[i * 3]).toBeCloseTo(Math.SQRT1_2, 5);
      expect(normals[i * 3 + 1]).toBeCloseTo(Math.SQRT1_2, 5);
      expect(normals[i * 3 + 2]).toBeCloseTo(0, 5);
      expect(aspects[i]).toBeCloseTo(90 * DEG, 5);
    }
  });

  it("reports north aspect for a slope descending south", () => {
    const map = makeHeightmap(3, 9, 1);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 3; c++) map.heights[r * 3 + c] = r;
    // height increases with row (south) -> downhill points north
    const aspects = aspectGrid(map);
    const center = aspects[4 * 3 + 1];
    expect(center).toBeCloseTo(0, 5);
  });
});
