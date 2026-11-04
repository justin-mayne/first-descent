import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decodeHeightfield, worldOf, type ContractBounds } from "./contract-load.js";

const boundsUrl = new URL("../../assets/sphinx/bounds.json", import.meta.url);
const rawUrl = new URL("../../assets/sphinx/heightmap-16bit.raw", import.meta.url);

function boundsFixture(): ContractBounds {
  return {
    geo: { north: 1, south: 0, west: 0, east: 1 },
    grid: { width: 3, height: 2, spacingMeters: 10 },
    height: { minMeters: 100, maxMeters: 300, encoding: "uint16-le", zeroOffsetMeters: 100, metersPerUnit: 200 / 65535 },
    frame: { origin: { lat: 1, lon: 0 }, xAxis: "east", zAxis: "south", metersPerDegLat: 111320, metersPerDegLon: 55000 },
  };
}

describe("contract loading", () => {
  it("decodes uint16-le heightfields against the bounds", () => {
    const b = boundsFixture();
    const raw = new Uint8Array(6 * 2);
    const dv = new DataView(raw.buffer);
    dv.setUint16(0, 0, true);
    dv.setUint16(2, 65535, true);
    dv.setUint16(4, 32768, true);
    const map = decodeHeightfield(raw, b);
    expect(map.width).toBe(3);
    expect(map.spacing).toBe(10);
    expect(map.heights[0]).toBeCloseTo(100, 5);
    expect(map.heights[1]).toBeCloseTo(300, 0);
    expect(map.heights[2]).toBeCloseTo(200, 0);
  });

  it("round-trips the committed Sphinx contract", () => {
    const b = JSON.parse(readFileSync(boundsUrl, "utf8")) as ContractBounds;
    const raw = new Uint8Array(readFileSync(rawUrl));
    const map = decodeHeightfield(raw, b);
    expect(map.width).toBe(b.grid.width);
    expect(map.height).toBe(b.grid.height);
    let min = Infinity;
    let max = -Infinity;
    for (const v of map.heights) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    expect(min).toBeGreaterThanOrEqual(b.height.minMeters - 1);
    expect(max).toBeLessThanOrEqual(b.height.maxMeters + 1);

    const pin = worldOf(b.frame, 60.6667, -145.0703);
    const col = Math.min(map.width - 1, Math.max(0, Math.round(pin.x / map.spacing)));
    const row = Math.min(map.height - 1, Math.max(0, Math.round(pin.z / map.spacing)));
    expect(map.heights[row * map.width + col]).toBeGreaterThan(1900);
    expect(map.heights[row * map.width + col]).toBeLessThan(1950);
  });
});
