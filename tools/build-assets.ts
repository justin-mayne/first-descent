import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseGeotiff } from "../src/geo/geotiff.js";
import { frameMeters } from "../src/geo/frame.js";
import { parseWaypointsCsv, snapRoute, routesGeoJson } from "../src/geo/route.js";
import { buildContract } from "../src/geo/contract.js";

const OUT_DIR = "assets/sphinx";
const BOX = { north: 60.68, south: 60.65, west: -145.095, east: -145.045 };
const SPACING_M = 15;

function main(): void {
  const dem = readFileSync("data/sphinx/dem/sphinx-cop30.tif");
  const grid = parseGeotiff(dem.buffer.slice(dem.byteOffset, dem.byteOffset + dem.byteLength) as ArrayBuffer);
  const frame = frameMeters(grid, SPACING_M, BOX);
  const csv = readFileSync("data/sphinx/spec/the-sphinx-simulation-spec/data/route_waypoints_3d.csv", "utf8");
  const geojson = routesGeoJson(snapRoute(grid, parseWaypointsCsv(csv)));

  mkdirSync(OUT_DIR, { recursive: true });
  const files = buildContract(frame, BOX, geojson);
  for (const f of files) {
    writeFileSync(`${OUT_DIR}/${f.path}`, f.data);
    console.log(`${f.path}: ${typeof f.data === "string" ? f.data.length : f.data.byteLength} bytes`);
  }
  const b = JSON.parse(readFileSync(`${OUT_DIR}/bounds.json`, "utf8"));
  console.log(
    `grid ${b.grid.width}x${b.grid.height} @ ${b.grid.spacingMeters} m; heights ${b.height.minMeters.toFixed(0)}..${b.height.maxMeters.toFixed(0)} m`
  );
}

main();
