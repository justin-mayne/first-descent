import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseWaypointsCsv, routesGeoJson, snapRoute } from "./route.js";
import { parseGeotiff } from "./geotiff.js";

const demUrl = new URL("../../data/sphinx/dem/sphinx-cop30.tif", import.meta.url);
const csvUrl = new URL(
  "../../data/sphinx/spec/the-sphinx-simulation-spec/data/route_waypoints_3d.csv",
  import.meta.url
);

function load(): { csv: string; grid: ReturnType<typeof parseGeotiff> } {
  const b = readFileSync(demUrl);
  return {
    csv: readFileSync(csvUrl, "utf8"),
    grid: parseGeotiff(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer),
  };
}

describe("route waypoints", () => {
  it("parses the spec csv including quoted notes", () => {
    const wps = parseWaypointsCsv(load().csv);
    expect(wps).toHaveLength(26);
    expect(wps.filter((w) => w.routeType === "ASCENT")).toHaveLength(14);
    expect(wps.filter((w) => w.routeType === "DESCENT")).toHaveLength(12);
    const summit = wps.find((w) => w.id === "ASC_14");
    expect(summit?.note).toContain("6,299 ft");
    expect(summit?.lat).toBeCloseTo(60.6667, 3);
  });

  it("snaps the summit to the DEM height, not the spec height", () => {
    const { csv, grid } = load();
    const snapped = snapRoute(grid, parseWaypointsCsv(csv));
    const summit = snapped.find((p) => p.id === "ASC_14");
    // Spec says 1820; the DEM holds the truth (~1917).
    expect(summit?.z).toBeGreaterThan(1900);
    expect(summit?.z).toBeLessThan(1935);
    // Descent stays on the ground: DSC z equals ASC z at the shared pin.
    const dropIn = snapped.find((p) => p.id === "DSC_01");
    expect(Math.abs((dropIn?.z ?? 0) - (summit?.z ?? 0))).toBeLessThan(1);
  });

  it("emits one ordered LineString per route", () => {
    const { csv, grid } = load();
    const gj = routesGeoJson(snapRoute(grid, parseWaypointsCsv(csv)));
    expect(gj.type).toBe("FeatureCollection");
    expect(gj.features).toHaveLength(2);
    const ascent = gj.features.find((f) => f.properties.route === "ASCENT");
    const descent = gj.features.find((f) => f.properties.route === "DESCENT");
    expect(ascent?.geometry.coordinates).toHaveLength(14);
    expect(descent?.geometry.coordinates).toHaveLength(12);
    const first = descent?.geometry.coordinates[0];
    expect(first?.[2]).toBeGreaterThan(1900);
  });
});
