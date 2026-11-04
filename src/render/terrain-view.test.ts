import { describe, expect, it } from "vitest";
import { makeHeightmap } from "../geo/heightmap.js";
import { buildTerrainGeometryData, terrainColor } from "./terrain-view.js";

const DEG = Math.PI / 180;

describe("terrain geometry", () => {
  it("builds one vertex per cell and two triangles per quad", () => {
    const map = makeHeightmap(4, 3, 10);
    for (let i = 0; i < 12; i++) map.heights[i] = 1000 + i;
    const g = buildTerrainGeometryData(map);
    expect(g.positions.length).toBe(4 * 3 * 3);
    expect(g.colors.length).toBe(4 * 3 * 3);
    expect(g.indices.length).toBe(3 * 2 * 6);
    // first vertex: world (0, h, 0)
    expect(g.positions[0]).toBe(0);
    expect(g.positions[1]).toBe(1000);
    expect(g.positions[2]).toBe(0);
    // last vertex: ((w-1)*s, h, (h-1)*s)
    expect(g.positions[(4 * 3 - 1) * 3]).toBe(30);
    expect(g.positions[(4 * 3 - 1) * 3 + 2]).toBe(20);
  });

  it("bands snow, steep snow, and rock by angle", () => {
    const snow = terrainColor(1800, 25 * DEG);
    const steep = terrainColor(1800, 50 * DEG);
    const rock = terrainColor(1800, 62 * DEG);
    for (const c of [snow, steep, rock]) {
      for (const v of c) expect(v).toBeGreaterThan(0);
      expect(Math.max(...c)).toBeLessThanOrEqual(1);
    }
    expect(snow[0]).toBeGreaterThan(steep[0]);
    expect(steep[0]).toBeGreaterThan(rock[0]);
    expect(rock[0]).toBeGreaterThan(rock[2]);
  });
});
