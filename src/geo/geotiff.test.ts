import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseGeotiff } from "./geotiff.js";

const demUrl = new URL("../../data/sphinx/dem/sphinx-cop30.tif", import.meta.url);

/** Build a tiny uncompressed little-endian float32 stripped GeoTIFF in memory. */
function buildTiff(w: number, h: number, pixels: Float32Array): ArrayBuffer {
  const entries: [number, number, number, number][] = [
    [256, 3, 1, w],
    [257, 3, 1, h],
    [258, 3, 1, 32],
    [259, 3, 1, 1],
    [273, 4, 1, 0], // strip offset, patched below
    [277, 3, 1, 1],
    [278, 4, 1, h],
    [279, 4, 1, pixels.length * 4],
    [339, 3, 1, 3],
    [33550, 12, 3, 0], // pixel scale offset, patched below
    [33922, 12, 6, 0], // tiepoint offset, patched below
  ];
  const ifd = 8 + pixels.length * 4;
  const scaleOff = ifd + 2 + 12 * entries.length + 4;
  const tieOff = scaleOff + 24;
  const bytes = new Uint8Array(tieOff + 24);
  const dv = new DataView(bytes.buffer);
  let p = 0;
  const u16 = (v: number): void => {
    dv.setUint16(p, v, true);
    p += 2;
  };
  const u32 = (v: number): void => {
    dv.setUint32(p, v, true);
    p += 4;
  };
  bytes[0] = 0x49;
  bytes[1] = 0x49;
  u16(42);
  u32(ifd);
  for (let i = 0; i < pixels.length; i++) dv.setFloat32(8 + i * 4, pixels[i], true);
  entries[4] = [273, 4, 1, 8];
  entries[9] = [33550, 12, 3, scaleOff];
  entries[10] = [33922, 12, 6, tieOff];
  p = ifd;
  u16(entries.length);
  for (const [tag, type, count, value] of entries) {
    u16(tag);
    u16(type);
    u32(count);
    if (type === 3 && count === 1) {
      u16(value);
      u16(0);
    } else {
      u32(value);
    }
  }
  u32(0); // next IFD
  dv.setFloat64(scaleOff, 0.001, true);
  dv.setFloat64(scaleOff + 8, 0.001, true);
  for (let i = 0; i < 6; i++) dv.setFloat64(tieOff + i * 8, [0, 0, 0, 0, 0, 60][i], true);
  return bytes.buffer as ArrayBuffer;
}

function toArrayBuffer(b: Uint8Array): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

describe("parseGeotiff", () => {
  it("reads a synthetic uncompressed stripped GeoTIFF", () => {
    const w = 3;
    const h = 2;
    const px = new Float32Array([10, 20, 30, 40, 50, 60]);
    const grid = parseGeotiff(buildTiff(w, h, px));
    expect(grid.width).toBe(w);
    expect(grid.height).toBe(h);
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
