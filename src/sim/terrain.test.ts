import { describe, expect, it } from "vitest";
import { planarTerrain, proceduralTerrain, slopeAt, heightmapTerrain } from "./terrain.js";
import { makeHeightmap } from "../geo/heightmap.js";

const DEG = Math.PI / 180;

describe("slopeAt", () => {
  it("recovers the angle and fall line of a planar slope", () => {
    const terrain = planarTerrain(35 * DEG);
    const s = slopeAt(terrain, 50, 0);
    expect(s.angleRad).toBeCloseTo(35 * DEG, 5);
    expect(s.downhill[0]).toBeCloseTo(1, 5);
    expect(s.downhill[1]).toBeCloseTo(0, 5);
    expect(s.normal[1]).toBeGreaterThan(0);
  });

  it("returns zero slope on flat ground", () => {
    const s = slopeAt({ height: () => 100 }, 0, 0);
    expect(s.angleRad).toBe(0);
  });
});

describe("proceduralTerrain", () => {
  it("is deterministic and produces varied relief", () => {
    const a = proceduralTerrain(7);
    const b = proceduralTerrain(7);
    expect(a.height(123, -45)).toBe(b.height(123, -45));
    const t = proceduralTerrain(7);
    const h1 = t.height(0, 0);
    const h2 = t.height(180, 60);
    const h3 = t.height(-220, 310);
    expect(new Set([h1, h2, h3]).size).toBe(3);
  });
});

describe("heightmapTerrain", () => {
  it("interpolates heights from the grid", () => {
    const map = makeHeightmap(3, 3, 10);
    map.heights.set([0, 0, 0, 0, 100, 0, 0, 0, 0]);
    const terrain = heightmapTerrain(map);
    expect(terrain.height(10, 10)).toBeCloseTo(100);
    expect(terrain.height(5, 5)).toBeCloseTo(50, 0);
  });
});
