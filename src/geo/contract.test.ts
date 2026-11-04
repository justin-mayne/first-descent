import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { buildContract } from "./contract.js";
import { frameMeters, worldOf } from "./frame.js";
import { parseGeotiff } from "./geotiff.js";
import { parseWaypointsCsv, snapRoute, routesGeoJson } from "./route.js";
import { makeHeightmap } from "./heightmap.js";

function demArrayBuffer(): ArrayBuffer {
  const b = readFileSync(new URL("../../data/sphinx/dem/sphinx-cop30.tif", import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

function pngPixels(png: Uint8Array, width: number, height: number): Uint8Array {
  // locate IDAT without verifying CRCs; tests only need pixel values
  let p = 8;
  const idats: Buffer[] = [];
  while (p + 8 <= png.length) {
    const len = (png[p] << 24) | (png[p + 1] << 16) | (png[p + 2] << 8) | png[p + 3];
    const type = String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]);
    if (type === "IDAT") idats.push(Buffer.from(png.subarray(p + 8, p + 8 + len)));
    p += 12 + len;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(idats));
  const out = new Uint8Array(width * height * 3);
  for (let r = 0; r < height; r++) {
    out.set(raw.subarray(r * (1 + width * 3) + 1, (r + 1) * (1 + width * 3)), r * width * 3);
  }
  return out;
}

describe("buildContract", () => {
  it("emits the full contract with a normalized 16-bit heightfield", () => {
    const map = makeHeightmap(4, 3, 10);
    for (let i = 0; i < 12; i++) map.heights[i] = 100 + i * 10;
    const frame = {
      map,
      origin: { lat: 60, lon: -145 },
      metersPerDegLat: 111320,
      metersPerDegLon: 55000,
    };
    const files = buildContract(frame, { north: 60, south: 59.9, west: -145, east: -144.9 }, { type: "FeatureCollection" });
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(["aspect.png", "bounds.json", "heightmap-16bit.raw", "line.geojson", "normal.png", "slope.png"]);

    const raw = files.find((f) => f.path === "heightmap-16bit.raw")!.data as Uint8Array;
    expect(raw.length).toBe(24);
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    expect(dv.getUint16(0, true)).toBe(0);
    expect(dv.getUint16(22, true)).toBe(65535);

    const boundsJson = JSON.parse(files.find((f) => f.path === "bounds.json")!.data as string);
    expect(boundsJson.height.minMeters).toBe(100);
    expect(boundsJson.height.maxMeters).toBe(210);
    expect(boundsJson.grid.spacingMeters).toBe(10);
    expect(boundsJson.frame.zAxis).toBe("south");

    const slopePng = files.find((f) => f.path === "slope.png")!.data as Uint8Array;
    const pixels = pngPixels(slopePng, 4, 3);
    expect(pixels.length).toBe(4 * 3 * 3);
  });

  it("paints the real Sphinx diamond into the slope raster", () => {
    const grid = parseGeotiff(demArrayBuffer());
    const box = { north: 60.68, south: 60.65, west: -145.095, east: -145.045 };
    const frame = frameMeters(grid, 15, box);
    const csv = readFileSync(
      new URL("../../data/sphinx/spec/the-sphinx-simulation-spec/data/route_waypoints_3d.csv", import.meta.url),
      "utf8"
    );
    const geojson = routesGeoJson(snapRoute(grid, parseWaypointsCsv(csv)));
    const files = buildContract(frame, box, geojson);
    const slopePng = files.find((f) => f.path === "slope.png")!.data as Uint8Array;
    const pixels = pngPixels(slopePng, frame.map.width, frame.map.height);

    const pixelAt = (lat: number, lon: number): number => {
      const { x, z } = worldOf(frame, lat, lon);
      const col = Math.min(frame.map.width - 1, Math.max(0, Math.round(x / frame.map.spacing)));
      const row = Math.min(frame.map.height - 1, Math.max(0, Math.round(z / frame.map.spacing)));
      return pixels[(row * frame.map.width + col) * 3];
    };
    // Upper diamond: ~54 degrees -> ~153/255
    expect(pixelAt(60.6654, -145.0686)).toBeGreaterThan(135);
    expect(pixelAt(60.6654, -145.0686)).toBeLessThan(175);
    // Schrund bench: ~30 degrees -> ~85/255
    expect(pixelAt(60.6637, -145.0658)).toBeGreaterThan(60);
    expect(pixelAt(60.6637, -145.0658)).toBeLessThan(110);

    const line = JSON.parse(files.find((f) => f.path === "line.geojson")!.data as string);
    expect(line.features).toHaveLength(2);
  });
});
