import { sample, type Heightmap } from "./heightmap.js";
import type { GeoGrid } from "./geotiff.js";

/** A route waypoint from the spec's CSV, spec-side values kept as parsed. */
export interface Waypoint {
  id: string;
  routeType: "ASCENT" | "DESCENT";
  seq: number;
  zone: string;
  xM: number;
  yM: number;
  zSpecM: number;
  lat: number;
  lon: number;
  note: string;
}

export interface SnappedPoint {
  id: string;
  routeType: "ASCENT" | "DESCENT";
  seq: number;
  lat: number;
  lon: number;
  /** Ground-truth elevation from the DEM (bilinear). */
  z: number;
  note: string;
}

/** Parse the spec's `route_waypoints_3d.csv` (quoted fields supported). */
export function parseWaypointsCsv(text: string): Waypoint[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("empty waypoints csv");
  const header = splitCsvLine(lines[0]);
  const col = (name: string): number => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`missing csv column ${name}`);
    return i;
  };
  const ix = {
    id: col("waypoint_id"),
    type: col("route_type"),
    seq: col("sequence_order"),
    zone: col("zone_id"),
    x: col("x_m"),
    y: col("y_m"),
    z: col("z_elev_m"),
    lat: col("lat"),
    lon: col("lon"),
    note: col("notes"),
  };
  return lines.slice(1).map((line) => {
    const f = splitCsvLine(line);
    const type = f[ix.type];
    if (type !== "ASCENT" && type !== "DESCENT") throw new Error(`bad route_type ${type}`);
    return {
      id: f[ix.id],
      routeType: type,
      seq: Number(f[ix.seq]),
      zone: f[ix.zone],
      xM: Number(f[ix.x]),
      yM: Number(f[ix.y]),
      zSpecM: Number(f[ix.z]),
      lat: Number(f[ix.lat]),
      lon: Number(f[ix.lon]),
      note: f[ix.note],
    };
  });
}

/** Sample the DEM (bilinear) at a geographic point. */
export function snapZ(grid: GeoGrid, lat: number, lon: number): number {
  const src: Heightmap = { width: grid.width, height: grid.height, spacing: 1, heights: grid.heights };
  return sample(src, (lon - grid.westDeg) / grid.scaleLonDeg, (grid.northDeg - lat) / grid.scaleLatDeg);
}

/** Snap every waypoint's elevation onto the DEM, preserving order. */
export function snapRoute(grid: GeoGrid, waypoints: Waypoint[]): SnappedPoint[] {
  return waypoints.map((w) => ({
    id: w.id,
    routeType: w.routeType,
    seq: w.seq,
    lat: w.lat,
    lon: w.lon,
    z: snapZ(grid, w.lat, w.lon),
    note: w.note,
  }));
}

/** The snapped routes as a GeoJSON FeatureCollection of LineStrings. */
export function routesGeoJson(points: SnappedPoint[]): {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { route: string; name: string };
    geometry: { type: "LineString"; coordinates: number[][] };
  }[];
} {
  const routes: { key: string; name: string }[] = [
    { key: "ASCENT", name: "Sphinx bootpack ascent" },
    { key: "DESCENT", name: "Sphinx West/Southeast descent" },
  ];
  return {
    type: "FeatureCollection",
    features: routes
      .map(({ key, name }) => {
        const pts = points.filter((p) => p.routeType === key).sort((a, b) => a.seq - b.seq);
        if (pts.length < 2) return null;
        return {
          type: "Feature" as const,
          properties: { route: key, name },
          geometry: {
            type: "LineString" as const,
            coordinates: pts.map((p) => [p.lon, p.lat, Math.round(p.z * 10) / 10]),
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null),
  };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
