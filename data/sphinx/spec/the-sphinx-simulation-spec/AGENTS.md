# AI Agent Context & Architecture Manifest (`AGENTS.md`)

## Purpose
This file provides structured context for autonomous AI coding agents (e.g., Claude Code, Cursor, GitHub Copilot Workspace, Devin, OpenHands) analyzing or extending this repository to build a 3D ski mountaineering simulation of **The Sphinx** (Cordova, Chugach Mountains, Alaska).

## Coordinate System Conventions
When generating 3D meshes, shaders, or physics scripts for this project, strictly adhere to the following spatial conventions:
- **Geographic Apex (Summit Pin):** Latitude `60.66667° N`, Longitude `-145.07028° W` (`60°40'00"N, 145°04'13"W`), Elevation `1820.0 m` (`6,299 ft`) ASL.
- **Projected CRS:** `EPSG:32606` (WGS 84 / UTM Zone 6N) for metric 1:1 terrain scaling.
- **Local Cartesian Simulation Space (`data/route_waypoints_3d.csv`):**
  - Origin `(0, 0, 1820)` is anchored horizontally at the Summit Pin `(X = 0.0 m, Y = 0.0 m)` with `Z` representing absolute elevation in meters ASL (`1820.0 m` at summit, `1270.0 m` at the glacier landing zone).
  - `+X` axis points **Southeast (`142°` azimuth)** along the primary down-slope fall-line of the face.
  - `+Y` axis points **Northeast (`52°` azimuth)**, corresponding to **Looker's Right / Skier's Left** across the face.
  - `+Z` axis points **Up** (Zenith).

## Critical Domain Constraints (Do Not Violate in Simulation Logic)
1. **Sub-Meter Features Missing from Satellite DEMs:**
   Standard 2m ArcticDEM and 5m USGS IFSAR tiles smooth over three critical mountaineering features. Any terrain generation pipeline MUST procedurally sculpt or boolean-cut:
   - **The Bergschrund (`X = 415 m, Z = 1340 m`):** A horizontal crevasse `3–5 m` wide and `12 m` deep spanning the base of the diamond face, passable via a `4 m`-wide snow bridge pinched on looker's left (`Y = -12 m`).
   - **The Blind Summit Rollover (`X = 0 to 15 m, Z = 1820 to 1805 m`):** A convex horizon line (`R = 15 m` radius of curvature) transitioning from `38°` to `55°`.
   - **The Exit Choke (`X = 390 m, Z = 1360 m`):** A `12 m`-wide rock-walled funnel directly above the bergschrund where all upper-face sluff channels.
2. **Double Fall-Line Gravity Vector:**
   The main face (`Z = 1520 m` to `1785 m`) is not a simple planar ramp. It has a primary slope pitch `theta` of `50°–55°` along `+X` AND a cross-slope lateral tilt `phi` of `5°–8°` toward `-Y` (pulling skiers and sluff toward the central gully/choke).
3. **Ascent vs. Descent Path Separation:**
   - **Climbing / Bootpacking (`ASCENT` spline):** Climbs from bottom-to-top (`Z = 1270 m -> 1820 m`) along the **Skier's Left / Looker's Right rib (`+Y` edge, `Y = +18 m to +45 m`)** where snow is shallower and shielded from center-line sluff.
   - **Skiing (`DESCENT` spline):** Drops from top-to-bottom (`Z = 1820 m -> 1270 m`) down the **Center-Right diamond (`Y = -15 m to +25 m`)**, executing a mandatory sluff-management check on the elevated rib at `Z = 1520 m` before threading the `Z = 1360 m` choke.

## Data Dictionary & File Map
- `data/geospatial_config.json`: Master JSON configuration with bounding boxes, EPSG codes, and the 5 vertical terrain zones.
- `data/route_waypoints_3d.csv`: 26 high-precision 3D waypoints (`waypoint_id, route_type, sequence_order, zone_id, x_m, y_m, z_elev_m, lat, lon, slope_deg, cross_tilt_deg, normal_x, normal_y, normal_z, target_speed_ms, sluff_speed_ms, notes`).
- `data/route_telemetry.geojson`: Valid RFC 7946 GeoJSON containing the Summit Pin, Bergschrund Snow Bridge, Heli LZ, Bootpack LineString, and Ski Descent LineString.
- `data/snowpack_states.json`: Quantitative physics parameters for `2019_bail_crust` vs `2022_velvet_powder`.
- `src/physics/SphinxSkiSluffController.cs`: Reference C# implementation of the double fall-line kinematics and Voellmy-Salm sluff avalanche model.
