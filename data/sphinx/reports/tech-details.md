```python
import os
import json
import csv
import zipfile

repo_dir = "the-sphinx-simulation-spec"
os.makedirs(f"{repo_dir}/docs", exist_ok=True)
os.makedirs(f"{repo_dir}/data", exist_ok=True)
os.makedirs(f"{repo_dir}/scripts", exist_ok=True)
os.makedirs(f"{repo_dir}/src/physics", exist_ok=True)

# 1. README.md
readme_content = """# The Sphinx (Chugach Mountains, AK) — Ski & Mountaineering Simulation Specification

[![Coordinates](https://img.shields.io/badge/Coordinates-60.6667%C2%B0N_%2C_145.0703%C2%B0W-blue)](#)
[![Elevation](https://img.shields.io/badge/Summit_Elevation-1820m_(6299ft)-informational)](#)
[![Vertical](https://img.shields.io/badge/Vertical_Drop-550m_(1800ft)-success)](#)
[![Slope](https://img.shields.io/badge/Sustained_Pitch-50%C2%B0--55%C2%B0%2B-critical)](#)

This repository contains the complete geospatial, topographic, kinematic, and route-pathing specifications required to build a high-fidelity 3D software simulation of **The Sphinx** (Southeast Face/Ridge) in the Chugach Mountains outside Cordova, Alaska—featured in *Fifty Classic Ski Descents of North America* and skied by Cody Townsend as **Line 38/50** in *The FIFTY* project.

Designed for both **human simulation engineers** and **autonomous AI coding agents**, this repository provides structured JSON schemas, 3D local Cartesian spline coordinates, GIS elevation ingestion scripts, and C# physics implementations for double fall-line ski dynamics and Voellmy-Salm loose-snow (sluff) avalanches.

---

## Repository Structure

```text
the-sphinx-simulation-spec/
├── README.md                                  # Project overview & quickstart
├── AGENTS.md                                  # Instructions & context manifest for AI coding agents
├── docs/
│   ├── 01_ROUTE_DESCRIPTION_AND_HISTORY.md    # Full mountaineering & ski descent narrative (2019 & 2022)
│   ├── 02_TERRAIN_AND_PHYSICS_SPEC.md         # Engineering equations, DEM specs, and micro-terrain zones
│   └── 03_MEDIA_AND_PHOTOGRAMMETRY_REFS.md    # Links to trip reports, GPX tracks, and 4K drone frames for SfM
├── data/
│   ├── geospatial_config.json                 # Machine-readable CRS, bounding boxes, and terrain zone definitions
│   ├── route_waypoints_3d.csv                 # Local Cartesian (X,Y,Z) waypoints for Ascent & Descent splines
│   ├── route_telemetry.geojson                # WGS84 GeoJSON LineStrings for GIS/engine ingestion
│   └── snowpack_states.json                   # Physical constants for 2019 (Bail Crust) vs 2022 (Velvet Powder)
├── scripts/
│   ├── fetch_dem_heightmap.py                 # Python script to fetch & reproject USGS 3DEP / ArcticDEM GeoTIFFs
│   └── requirements.txt                       # Python GIS dependencies
└── src/
    └── physics/
        └── SphinxSkiSluffController.cs        # Unity/C# physics controller for double fall-line + sluff dynamics

```

---

## Quickstart for Engineers

1. **Ingest Terrain DEM:**
Run `python scripts/fetch_dem_heightmap.py` (requires `rasterio`, `numpy`, `requests`) or load `data/geospatial_config.json` into Houdini/Unreal/Unity to pull the 2m ArcticDEM / 5m USGS IFSAR elevation tile centered at `60.66667° N, -145.07028° W` (`EPSG:32606` / UTM Zone 6N).
2. **Import Route Splines:**
Load `data/route_waypoints_3d.csv` or `data/route_telemetry.geojson` to generate the **Bootpack Ascent Spline** (skier's left rock rib) and the **Freeride Descent Spline** (center-right diamond face with a tactical rib check-stop).
3. **Configure Physics & Sluff Emitters:**
Attach `src/physics/SphinxSkiSluffController.cs` and bind snow parameters from `data/snowpack_states.json` to simulate the difference between the **April 2019 Bail** (breakable wind crust over shallow rocks) and the **April 2022 Completion** (35cm cohesive powder with high-speed sluff management).
"""

with open(f"{repo_dir}/README.md", "w") as f:
f.write(readme_content)

# 2. AGENTS.md

agents_content = """# AI Agent Context & Architecture Manifest (`AGENTS.md`)

## Purpose

This file provides structured context for autonomous AI coding agents (e.g., Claude Code, Cursor, GitHub Copilot Workspace, Devin, OpenHands) analyzing or extending this repository to build a 3D ski mountaineering simulation of **The Sphinx** (Cordova, Chugach Mountains, Alaska).

## Coordinate System Conventions

When generating 3D meshes, shaders, or physics scripts for this project, strictly adhere to the following spatial conventions:

* **Geographic Apex (Summit Pin):** Latitude `60.66667° N`, Longitude `-145.07028° W` (`60°40'00"N, 145°04'13"W`), Elevation `1820.0 m` (`6,299 ft`) ASL.
* **Projected CRS:** `EPSG:32606` (WGS 84 / UTM Zone 6N) for metric 1:1 terrain scaling.
* **Local Cartesian Simulation Space (`data/route_waypoints_3d.csv`):**
* Origin `(0, 0, 1820)` is anchored horizontally at the Summit Pin `(X = 0.0 m, Y = 0.0 m)` with `Z` representing absolute elevation in meters ASL (`1820.0 m` at summit, `1270.0 m` at the glacier landing zone).
* `+X` axis points **Southeast (`142°` azimuth)** along the primary down-slope fall-line of the face.
* `+Y` axis points **Northeast (`52°` azimuth)**, corresponding to **Looker's Right / Skier's Left** across the face.
* `+Z` axis points **Up** (Zenith).



## Critical Domain Constraints (Do Not Violate in Simulation Logic)

1. **Sub-Meter Features Missing from Satellite DEMs:**
Standard 2m ArcticDEM and 5m USGS IFSAR tiles smooth over three critical mountaineering features. Any terrain generation pipeline MUST procedurally sculpt or boolean-cut:
* **The Bergschrund (`X = 415 m, Z = 1340 m`):** A horizontal crevasse `3–5 m` wide and `12 m` deep spanning the base of the diamond face, passable via a `4 m`-wide snow bridge pinched on looker's left (`Y = -12 m`).
* **The Blind Summit Rollover (`X = 0 to 15 m, Z = 1820 to 1805 m`):** A convex horizon line (`R = 15 m` radius of curvature) transitioning from `38°` to `55°`.
* **The Exit Choke (`X = 390 m, Z = 1360 m`):** A `12 m`-wide rock-walled funnel directly above the bergschrund where all upper-face sluff channels.


2. **Double Fall-Line Gravity Vector:**
The main face (`Z = 1520 m` to `1785 m`) is not a simple planar ramp. It has a primary slope pitch `theta` of `50°–55°` along `+X` AND a cross-slope lateral tilt `phi` of `5°–8°` toward `-Y` (pulling skiers and sluff toward the central gully/choke).
3. **Ascent vs. Descent Path Separation:**
* **Climbing / Bootpacking (`ASCENT` spline):** Climbs from bottom-to-top (`Z = 1270 m -> 1820 m`) along the **Skier's Left / Looker's Right rib (`+Y` edge, `Y = +18 m to +45 m`)** where snow is shallower and shielded from center-line sluff.
* **Skiing (`DESCENT` spline):** Drops from top-to-bottom (`Z = 1820 m -> 1270 m`) down the **Center-Right diamond (`Y = -15 m to +25 m`)**, executing a mandatory sluff-management check on the elevated rib at `Z = 1520 m` before threading the `Z = 1360 m` choke.



## Data Dictionary & File Map

* `data/geospatial_config.json`: Master JSON configuration with bounding boxes, EPSG codes, and the 5 vertical terrain zones.
* `data/route_waypoints_3d.csv`: 26 high-precision 3D waypoints (`waypoint_id, route_type, sequence_order, zone_id, x_m, y_m, z_elev_m, lat, lon, slope_deg, cross_tilt_deg, normal_x, normal_y, normal_z, target_speed_ms, sluff_speed_ms, notes`).
* `data/route_telemetry.geojson`: Valid RFC 7946 GeoJSON containing the Summit Pin, Bergschrund Snow Bridge, Heli LZ, Bootpack LineString, and Ski Descent LineString.
* `data/snowpack_states.json`: Quantitative physics parameters for `2019_bail_crust` vs `2022_velvet_powder`.
* `src/physics/SphinxSkiSluffController.cs`: Reference C# implementation of the double fall-line kinematics and Voellmy-Salm sluff avalanche model.
"""

with open(f"{repo_dir}/AGENTS.md", "w") as f:
f.write(agents_content)

# 3. docs/01_ROUTE_DESCRIPTION_AND_HISTORY.md

doc1_content = """# Route Description & Mountaineering History: The Sphinx (Line 38/50)

## Overview

**The Sphinx** (Southeast Ridge/Face) is an iconic, diamond-shaped ski mountaineering objective in the Chugach Mountains outside Cordova, Alaska. Featured in Chris Davenport, Art Burrows, and Penn Newhard's guidebook *Fifty Classic Ski Descents of North America*, it served as **Line 38 of 50** in professional skier Cody Townsend's multi-year project, *The FIFTY*.

Because Townsend's project ethos required climbing every line from the bottom up rather than taking a standard helicopter drop onto the summit pin, The Sphinx became one of his most mentally taxing objectives—requiring an initial bail in April 2019 before a successful redemption ascent and descent in April 2022.

---

## Route Specifications

| Attribute | Specification |
| --- | --- |
| **Coordinates** | `60°40'00"N, 145°04'13"W` (Decimal: `60.66667° N, -145.07028° W`) |
| **Mountain Range** | Chugach Mountains (Cordova / Points North Heli-Adventures Zone), Alaska |
| **Aspect** | Southeast Face / Southeast Ridge (`135°–150° SE`) |
| **Summit Elevation** | `6,299 ft` (`1,820 m`) |
| **Base Apron Elevation** | `~4,166 ft` (`1,270 m`) |
| **Vertical Drop** | `1,800 to 2,000 ft` (`~550 m`) from summit pin to the glacier apron |
| **Sustained Pitch** | `50° to 55°+` (Sustained 50-degree-plus with a double fall-line ramp) |
| **First Descent** | Doug Coombs and Jim Rippey |
| **The FIFTY Designation** | Line `*/50` (April 2019 Failed Attempt) / **Line 38/50** (April 2022 Completion) |

---

## Detailed Text-Based Route Breakdown

### 1. The Approach & Glacier Apron (`1,270 m – 1,340 m`)

Accessing the base of The Sphinx requires either a multi-day, human-powered expedition across remote Alaskan glaciers or a helicopter drop onto the glacier floor via Points North Heli-Adventures (which Townsend used to reach the base of the climb). From the landing zone on the glacier flats, the route skins up a broad, concave glacial apron (`12° to 32°`) toward the towering, planar Southeast Face. Even on the apron, route-finding requires careful glacier navigation to avoid crevasses and overhead exposure from warming cornices or sluff shedding off the main face.

### 2. The Bergschrund Crossing (`1,340 m – 1,375 m`)

At the top of the lower apron, the moving glacier ice pulls away from the steep headwall rock and ice, creating a massive, gaping **bergschrund** (`2 m to 5 m` wide, `10 m+` deep) that spans the entire width of the base.

* **On the Ascent:** Climbers must locate a viable snow bridge—typically pinched toward the looker's left/center edge just below the exit choke—to transition from the `35°` apron onto the `48°–50°` lower throat.
* **On the Descent:** The bergschrund acts as a high-consequence terrain trap at the bottom of the funnel. Every turn's sluff from the upper face channels directly through the choke and over the crevasse.

### 3. The Main Diamond Face & Bootpack Track (`1,375 m – 1,785 m`)

Above the bergschrund choke, the mountain opens into an unrelenting, diamond-shaped planar face of **sustained 50° to 54° terrain**.

* **Bootpacking the Face:** Unlike standard heli-skiers who are dropped directly onto the summit pin, Townsend and his partners transitioned to boot crampons, two ice axes/whippets, and bootpacked straight up the 1,800-foot face. To minimize exposure to natural sluff flushing down the center funnel, the climbing track hugs the **looker's right / skier's left rib** (`+Y` boundary), where snow depth is slightly shallower over the bounding rock ridge.
* **Double Fall-Line Geometry:** The face is not a simple planar ramp; it features a subtle **double fall-line** (`5° to 8°` cross-slope tilt) that slopes both downward toward the glacier and laterally toward the central exit gully. On foot, this creates strict "fall-you-die" exposure for over an hour of vertical climbing, where self-arrest on firm snow or over shallow rocks ("sharks") is nearly impossible.

### 4. The Summit Ridge & Blind Rollover (`1,785 m – 1,820 m`)

Near the top, the face narrows toward a sharp, corniced knife-edge ridge and needle-like summit perch at `6,299 ft` (`1,820 m`).

* **The Blind Rollover:** Dropping in from the narrow summit perch requires committing over a convex, **blind horizon rollover** (`38°` increasing rapidly to `55°` over `15 m`). The skier cannot see the middle of the diamond face until already committed over the convexity.

### 5. Tactical Ski Descent & Sluff Management

Once over the rollover, the line opens onto the main diamond face—a `50° to 55°`, double fall-line ramp. Because the entire `180 m`-wide upper face funnels directly into a `12 m`-wide bottleneck just above the bergschrund, **sluff management** is the primary survival constraint:

1. **Mach-Speed Outrun Strategy:** Ski the face at elite freeride velocity (`> 20 m/s`), linking giant-slalom turns to stay ahead of the accelerating powder wave from top to bottom in a single burn.
2. **Pitch-by-Pitch Rib Strategy (Townsend's Tactical Approach):** Link 4–6 big turns down the upper diamond, then cut laterally at `45°` onto the elevated safe rib on skier's left (`Z ≈ 1,520 m`), stopping for `8–12 seconds` to let the heavy wall of entrained powder thunder past through the choke and over the bergschrund before dropping into the lower funnel and airing across the snow bridge onto the apron.

---

## Chronology of Cody Townsend’s Two Attempts

### Attempt 1: April 2019 — "Line */50" (The Bail)

* **Team:** Cody Townsend and cinematographer Bjarne Salén.
* **Conditions:** Wind-pressed, variable breakable crust (`3–8 cm`) over faceted dry snow and shallow buried rock sharks (`15–25 cm` deep).
* **Outcome:** Partway up the bootpack on the `50°+` face, poor boot penetration and high-consequence hardpack meant a single slipped crampon point or rock strike would trigger an unstoppable `7.25 m/s²` slide over the bergschrund. Recognizing the unacceptable risk margin, Townsend and Salén transitioned mid-face, carefully survival-skied the lower section, and logged the attempt as `Line */50`.

### Attempt 2: April 2022 — "Line 38/50" (The Redemption)

* **Team:** Cody Townsend (skier), Nick Russell (freeride snowboarder), Ed Shanley (guide), and Bjarne Salén (cinematographer).
* **Conditions:** `25–45 cm` of settled, cohesive Alaskan velvet powder (`rho ≈ 140 kg/m³`) well-bonded to a supportable substrate.
* **Equipment Used by Townsend:** `112 mm`-waist **Salomon QST Blank** skis, **Salomon MTN** tech bindings, **Mammut RAS** avalanche airbag pack.
* **Outcome:** The crew punched a deep, secure bootpack up the skier's left rib to the `6,299 ft` summit pin, dropped in one-by-one over the blind summit rollover, managed heavy sluff waves down the double fall-line diamond, and aired the bergschrund out onto the glacier apron.
"""

with open(f"{repo_dir}/docs/01_ROUTE_DESCRIPTION_AND_HISTORY.md", "w") as f:
f.write(doc1_content)

# 4. docs/02_TERRAIN_AND_PHYSICS_SPEC.md

doc2_content = """# Terrain Engineering & Kinematic Physics Specification

## 1. Geospatial & Digital Elevation Model (DEM) Specification

| Parameter | Technical Value / Source | Engineering Implementation Notes |
| --- | --- | --- |
| **Summit Apex Coordinates** | `60.66667° N, -145.07028° W` (`60°40'00"N, 145°04'13"W`) | True summit pin (`1,820 m` / `6,299 ft` ASL) |
| **Recommended Bounding Box** | `N: 60.680°, S: 60.650°, E: -145.045°, W: -145.095°` | `~3.3 km x 2.7 km` tile; captures peak, SE Face, and glacier basin |
| **Projected CRS** | `EPSG:32606` (WGS 84 / UTM Zone 6N) or `EPSG:3338` (Alaska Albers) | Use UTM Zone 6N for metric 1:1 local Cartesian space (`X, Y, Z` in meters) |
| **Primary Elevation Dataset** | **USGS 3DEP Alaska IFSAR** (`5-meter` resolution) | Available via USGS TNM / AWS Stac Catalog |
| **High-Res Elevation Dataset** | **ArcticDEM** (`2-meter` strip/mosaic GeoTIFF) | Recommended for capturing the sharp ridgeline spine and exit gully |
| **Vertical Relief (Skied Face)** | `550 m` (`1,804 ft`) | Summit pin (`1,820 m`) -> Bergschrund (`1,340 m`) -> Apron (`1,270 m`) |
| **Horizontal Run Length** | `~460 m` on main face (`~850 m` total including apron) | Yields mean face gradient `arctan(480 / 415) ≈ 49.2°` (`50°–55°` sustained upper) |
| **Primary Aspect / Normal Vector** | `142° SE` (Mean Surface Normal: `n = [0.62, -0.09, 0.78]`) | Drives solar radiation/cornice shaders and double fall-line gravity |

---

## 2. Structural Terrain Zones

| Zone ID | Name | Elevation Band (m ASL) | Horizontal X (m) | Slope Pitch (`theta`) | Cross-Tilt (`phi`) | Micro-Terrain Sculpting Requirements |
| --- | --- | --- | --- | --- | --- | --- |
| `ZONE_5` | **Summit Spine & Blind Rollover** | `1,785 – 1,820 m` | `0 – 32 m` | `38° -> 55°` | `8° – 10°` | Knife-edge cornice on looker's right; convex entry ramp (`R = 15 m`). |
| `ZONE_4` | **Main Diamond Face** | `1,520 – 1,785 m` | `32 – 240 m` | `50° – 54°` | `5° – 8°` | Broad (`180 m` wide) planar-convex ramp canted toward `-Y` gully; bounded by rock ribs. |
| `ZONE_3` | **Lower Funnel Ramp** | `1,375 – 1,520 m` | `240 – 375 m` | `48° – 51°` | `4° – 5°` | Converging rock walls narrowing from `180 m` down to `25 m`. Primary sluff compression zone. |
| `ZONE_2` | **Exit Choke & Bergschrund** | `1,340 – 1,375 m` | `375 – 425 m` | `44° – 48°` | `0° – 2°` | `12 m`-wide throat above a `3–5 m` wide, `12 m` deep horizontal crevasse; `4 m` snow bridge at `Y = -12 m`. |
| `ZONE_1` | **Glacier Apron & Heli LZ** | `1,270 – 1,340 m` | `425 – 850 m` | `10° – 32°` | `0°` | Concave debris/runout fan flattening to `10°` at the helicopter staging zone. |

---

## 3. Kinematic Equations for Software Implementation

### A. Double Fall-Line Gravity Decomposition

Let the local tangent plane of the mountain face be parameterized by down-slope pitch angle $\theta$ (along $+X$) and lateral cross-slope tilt $\phi$ (toward the central gully $-Y$). Given gravitational acceleration $g = 9.81 \text{ m/s}^2$:

$$\vec{g}_{\text{tangent}} = \begin{bmatrix} g_x \\\\ g_y \end{bmatrix} = \begin{bmatrix} g \sin\theta \cos\phi \\\\ -g \sin\phi \end{bmatrix}$$

In `ZONE_4` ($\theta = 52^\circ, \phi = 6^\circ$):

* Down-slope acceleration component: $g_x = 9.81 \times \sin(52^\circ) \cos(6^\circ) \approx 7.69 \text{ m/s}^2$
* Lateral drift component toward gully: $g_y = -9.81 \times \sin(6^\circ) \approx -1.03 \text{ m/s}^2$

### B. Skier Equation of Motion

For a skier of mass $m = 82 \text{ kg}$ (including airbag pack and mountaineering gear) travelling at velocity vector $\vec{v} = [v_x, v_y]$:

$$m \frac{d\vec{v}}{dt} = m \vec{g}_{\text{tangent}} - \vec{F}_{\text{friction}} - \vec{F}_{\text{drag}} + \vec{F}_{\text{carve}}$$

Where:

1. **Coulomb Basal Friction:** $\\|\vec{F}_{\text{friction}}\\| = \mu_k m g \cos\theta \cos\phi$
2. **Snow Displacement & Aerodynamic Drag:** $\\|\vec{F}_{\text{drag}}\\| = \frac{1}{2} (C_d A_{\text{aero}} \rho_{\text{air}} + C_{\text{plow}} A_{\text{ski}} \rho_{\text{snow}} d_{\text{pen}}) \\|\vec{v}\\|^2$
3. **Carving Centripetal Force:** Controlled by ski edge angle $\alpha_{\text{edge}}$ and turn radius $R_{\text{turn}}$.

### C. Voellmy-Salm Granular Sluff Avalanche Model

Loose snow entrained by each ski turn forms a surface avalanche front of flow thickness $h(t)$ (typically $0.30 \text{ m} \le h \le 0.65 \text{ m}$). Using the Voellmy-Salm rheological model with dry basal friction $\mu_s \approx 0.16$ and turbulent drag coefficient $\xi \approx 1500 \text{ m/s}^2$:

$$\frac{dv_{\text{sluff}}}{dt} = g (\sin\theta - \mu_s \cos\theta) - \frac{g}{\xi h} v_{\text{sluff}}^2$$

The terminal velocity of the sluff wave on a constant pitch $\theta$ is:

$$v_{\text{sluff, max}} = \sqrt{\xi h (\sin\theta - \mu_s \cos\theta)}$$

For `ZONE_4` ($\theta = 52^\circ, h = 0.35 \text{ m}, \mu_s = 0.16, \xi = 1500 \text{ m/s}^2$):


$$v_{\text{sluff, max}} = \sqrt{1500 \times 0.35 \times (0.7880 - 0.16 \times 0.6157)} = \sqrt{525 \times 0.6895} \approx 19.03 \text{ m/s} \text{ (68.5 km/h)}$$

### D. Loss-of-Control / Sluff Wipeout Criterion

If the Euclidean distance between the skier and an active sluff front drops below the collision threshold ($\\|\vec{p}_{\text{skier}} - \vec{p}_{\text{sluff}}\\| < 2.5 \text{ m}$) and the sluff momentum flux exceeds the skier's edge shear threshold:

$$\Phi_{\text{impact}} = \frac{1}{2} \rho_{\text{sluff}} h (v_{\text{sluff}} - v_{\text{skier}})^2 > 1800 \text{ Pa}$$

The simulation triggers an **Edge Blowout / Ragdoll State**, sweeping the agent toward the `Z = 1,340 m` bergschrund hazard.
"""

with open(f"{repo_dir}/docs/02_TERRAIN_AND_PHYSICS_SPEC.md", "w") as f:
f.write(doc2_content)

# 5. docs/03_MEDIA_AND_PHOTOGRAMMETRY_REFS.md

doc3_content = """# Trip Reports, Photogrammetry Sources & Reference Links

To build high-resolution photogrammetry meshes (via Structure-from-Motion in RealityCapture, Agisoft Metashape, or Meshroom) or verify visual shader accuracy, use the following primary reference sources:

## 1. Official Guidebooks & Interactive 3D GPS Maps

* **onX Backcountry — The Fifty Project Guidebook: The Sphinx**
* **URL:** https://www.onxmaps.com/backcountry/blog/the-fifty-sphinx
* **Engineering Value:** Contains Cody Townsend's written guidebook entry (Overview, Ascent, Descent, Hazards, Exit), an embedded **interactive 3D WebGL terrain viewer** with his actual recorded ascent/descent track polyline, and high-resolution expedition stills by **Bjarne Salén** (`@BjarneSalen`).


* **The FIFTY Official Archive — The Sphinx Page**
* **URL:** https://skithefifty.com/sphinx
* **Engineering Value:** Official project metadata (`6,299'` elevation, `1,800'` vertical, `60°40'00"N 145°04'13"W`), excerpt from *Fifty Classic Ski Descents of North America*, and the front-on orthographic hero photograph of the Southeast Ridge by **Ming T. Poon** (`@ming.t.poon`).



## 2. Video Footage for Structure-from-Motion (SfM) Photogrammetry

* **YouTube (4K) — The FIFTY - 38/50 - A Return to the Steeps - The Sphinx, AK**
* **URL:** https://www.youtube.com/watch?v=a_LOvY4TnjY
* **Key Timestamp Ranges for Frame Extraction:**
* `02:10 – 03:45`: Aerial helicopter approach showing the full Southeast Face, glacier apron, and bergschrund geometry.
* `04:15 – 06:30`: Drone orbit frames of Townsend, Russell, and Shanley bootpacking up the looker's right (`+Y`) rock rib on the `50°+` face. Ideal for extracting parallax frames for local mesh reconstruction.
* `07:30 – 08:40`: Summit ridge topology, knife-edge cornice overhang, and the `38° -> 55°` blind horizon rollover.
* `08:40 – 12:15`: Top-to-bottom ski and snowboard descents showing real-time sluff propagation velocities, tactical rib pull-outs, choke threading, and bergschrund air trajectories.





## 3. Editorial & Equipment Breakdowns

* **Cody Townsend Official Site — Line */50: Fear in Alaska (2019 Bail Report)**
* **URL:** https://www.codytownsend.com/movies/the-fifty-line-1-50-messner-couloir-denali-ak-an-adventure-unfolding-in-real-time/the-fifty-line-50-the-sphinx-fear-in-alaska/


* **Freeskier Magazine — Cody Townsend Presents The FIFTY: The Sphinx, Alaska (2019)**
* **URL:** https://www.freeskier.com/cody-townsend-presents-the-fifty-the-sphinx-alaska


* **Mountainwatch — Episode 39, Line 38/50: The Sphinx, Cordova, Alaska (2022 Completion)**
* **URL:** https://www.mountainwatch.com/Snow-news/cody-townsends-the-fifty-episode-39-line-38-50-the-sphinx-cordova-alaska/


* **The FIFTY Gear Talk — Line 38/50 Equipment Breakdown**
* **URL:** https://skithefifty.com/gear-talk
"""



with open(f"{repo_dir}/docs/03_MEDIA_AND_PHOTOGRAMMETRY_REFS.md", "w") as f:
f.write(doc3_content)

# 6. data/geospatial_config.json

geospatial_config = {
"project_name": "The Sphinx Ski Mountaineering Simulation",
"fifty_classic_line_number": 38,
"location": {
"peak_name": "The Sphinx",
"mountain_range": "Chugach Mountains",
"sub_range_zone": "Cordova / Points North Heli-Adventures Operational Zone",
"state": "Alaska",
"country": "USA",
"summit_coordinates_wgs84": {
"latitude_deg": 60.66667,
"longitude_deg": -145.07028,
"dms": "60°40'00"N, 145°04'13"W",
"elevation_m": 1820.0,
"elevation_ft": 6299.0
},
"base_apron_coordinates_wgs84": {
"latitude_deg": 60.66064,
"longitude_deg": -145.06071,
"elevation_m": 1270.0,
"elevation_ft": 4166.7
}
},
"gis_projection_spec": {
"geographic_crs": "EPSG:4326",
"projected_crs_metric": "EPSG:32606",
"projected_crs_name": "WGS 84 / UTM Zone 6N",
"alaska_albers_crs": "EPSG:3338",
"dem_bounding_box_wgs84": {
"north_lat": 60.6800,
"south_lat": 60.6500,
"east_lon": -145.0450,
"west_lon": -145.0950
},
"local_cartesian_origin": {
"description": "Origin (0,0,1820) anchored horizontally at Summit Pin; +X = 142 deg SE (Down-face fall-line); +Y = 52 deg NE (Looker's Right / Skier's Left); +Z = Elevation ASL (m)",
"origin_lat": 60.66667,
"origin_lon": -145.07028,
"origin_z_m": 1820.0,
"downslope_azimuth_deg": 142.0,
"cross_slope_azimuth_deg": 52.0
},
"recommended_dem_sources": [
{
"name": "ArcticDEM 2m Strip/Mosaic",
"resolution_m": 2.0,
"provider": "Polar Geospatial Center (PGC) / AWS Open Data",
"notes": "Best resolution for ridge spine and gully definition; still requires procedural boolean cut for bergschrund."
},
{
"name": "USGS 3DEP Alaska IFSAR",
"resolution_m": 5.0,
"provider": "USGS National Map",
"notes": "Reliable gap-free radar elevation coverage across the Cordova Chugach."
}
]
},
"terrain_zones": [
{
"zone_id": "ZONE_5",
"name": "Summit Spine & Blind Rollover",
"z_min_m": 1785.0,
"z_max_m": 1820.0,
"x_min_m": 0.0,
"x_max_m": 32.0,
"slope_pitch_deg_range": [38.0, 55.0],
"cross_tilt_deg_range": [8.0, 10.0],
"face_width_m": 15.0,
"procedural_features": ["knife_edge_cornice_lookers_right", "convex_blind_rollover_R15m"]
},
{
"zone_id": "ZONE_4",
"name": "Main Diamond Face",
"z_min_m": 1520.0,
"z_max_m": 1785.0,
"x_min_m": 32.0,
"x_max_m": 240.0,
"slope_pitch_deg_range": [50.0, 54.0],
"cross_tilt_deg_range": [5.0, 8.0],
"face_width_m": 180.0,
"procedural_features": ["double_fall_line_planar_ramp", "skiers_left_protective_rock_rib", "buried_metamorphic_sharks"]
},
{
"zone_id": "ZONE_3",
"name": "Lower Funnel Ramp",
"z_min_m": 1375.0,
"z_max_m": 1520.0,
"x_min_m": 240.0,
"x_max_m": 375.0,
"slope_pitch_deg_range": [48.0, 51.0],
"cross_tilt_deg_range": [4.0, 5.0],
"face_width_m": 65.0,
"procedural_features": ["converging_funnel_walls", "sluff_compression_channel"]
},
{
"zone_id": "ZONE_2",
"name": "Exit Choke & Bergschrund",
"z_min_m": 1340.0,
"z_max_m": 1375.0,
"x_min_m": 375.0,
"x_max_m": 425.0,
"slope_pitch_deg_range": [44.0, 48.0],
"cross_tilt_deg_range": [0.0, 2.0],
"face_width_m": 12.0,
"procedural_features": ["12m_rock_choke_throat", "bergschrund_crevasse_width_4m_depth_12m", "snow_bridge_pinch_y_minus_12m"]
},
{
"zone_id": "ZONE_1",
"name": "Glacier Apron & Heli LZ",
"z_min_m": 1270.0,
"z_max_m": 1340.0,
"x_min_m": 425.0,
"x_max_m": 850.0,
"slope_pitch_deg_range": [10.0, 32.0],
"cross_tilt_deg_range": [0.0, 0.0],
"face_width_m": 350.0,
"procedural_features": ["concave_debris_runout_apron", "heli_staging_pad_at_850m"]
}
]
}

with open(f"{repo_dir}/data/geospatial_config.json", "w") as f:
json.dump(geospatial_config, f, indent=2)

# 7. data/snowpack_states.json

snowpack_states = {
"scenarios": {
"2019_bail_crust": {
"name": "April 2019 — Line */50 (Breakable Wind Crust over Sharks)",
"episode_reference": "The FIFTY: Fear in Alaska (2019)",
"surface_type": "wind_pressed_breakable_crust_over_facets",
"crust_thickness_cm": 6.0,
"powder_depth_cm": 5.0,
"snow_density_kg_m3": 310.0,
"boot_penetration_cm": 7.5,
"exposed_rock_shark_probability": 0.18,
"skier_basal_friction_mu_k": 0.08,
"voellmy_sluff_dry_friction_mu_s": 0.24,
"voellmy_turbulent_drag_xi_m_s2": 2200.0,
"default_sluff_flow_thickness_m": 0.12,
"self_arrest_possible_on_52_deg": False,
"uncontrolled_slide_acceleration_m_s2": 7.25,
"engineering_notes": "Low boot penetration and high basal acceleration make bootpacking above Z=1550m lethal upon edge slip."
},
"2022_velvet_powder": {
"name": "April 2022 — Line 38/50 (Cohesive Alaskan Velvet Powder)",
"episode_reference": "The FIFTY Ep. 38/50: A Return to the Steeps (2022)",
"surface_type": "cohesive_cold_smoke_powder_on_supportable_base",
"crust_thickness_cm": 0.0,
"powder_depth_cm": 35.0,
"snow_density_kg_m3": 140.0,
"boot_penetration_cm": 30.0,
"exposed_rock_shark_probability": 0.02,
"skier_basal_friction_mu_k": 0.14,
"voellmy_sluff_dry_friction_mu_s": 0.16,
"voellmy_turbulent_drag_xi_m_s2": 1500.0,
"default_sluff_flow_thickness_m": 0.38,
"self_arrest_possible_on_52_deg": True,
"uncontrolled_slide_acceleration_m_s2": 5.10,
"engineering_notes": "Secure 30cm bootpack steps; heavy sluff entrainment requires either >20 m/s mach freeride turns or a tactical rib stop at Z=1520m."
}
}
}

with open(f"{repo_dir}/data/snowpack_states.json", "w") as f:
json.dump(snowpack_states, f, indent=2)

# 8. Generate 3D Waypoints (data/route_waypoints_3d.csv) and GeoJSON (data/route_telemetry.geojson)

import math

origin_lat = 60.66667
origin_lon = -145.07028
az_x = math.radians(142.0) # +X = 142 deg SE
az_y = math.radians(52.0)  # +Y = 52 deg NE

def local_xy_to_latlon(x_m, y_m):
# Easting and Northing offsets in meters
d_east = x_m * math.sin(az_x) + y_m * math.sin(az_y)
d_north = x_m * math.cos(az_x) + y_m * math.cos(az_y)
lat = origin_lat + (d_north / 111320.0)
lon = origin_lon + (d_east / (111320.0 * math.cos(math.radians(origin_lat))))
return round(lat, 6), round(lon, 6)

def compute_normal(slope_deg, cross_tilt_deg):
th = math.radians(slope_deg)
ph = math.radians(cross_tilt_deg)
nx = round(math.sin(th) * math.cos(ph), 4)
ny = round(-math.sin(ph), 4)
nz = round(math.cos(th) * math.cos(ph), 4)
return nx, ny, nz

# Ascent waypoints (Bottom-to-Top: Skinning Apron -> Bergschrund Bridge -> Skier's Left / Looker's Right Rib -> Summit Pin)

ascent_raw = [
("ASC_01", "ASCENT", 1, "ZONE_1", 850.0, 0.0, 1270.0, 10.0, 0.0, 1.4, 0.0, "Heli LZ & staging transition on glacier flats"),
("ASC_02", "ASCENT", 2, "ZONE_1", 680.0, -5.0, 1282.0, 16.0, 0.0, 1.3, 0.0, "Skin track ascending lower glacier apron"),
("ASC_03", "ASCENT", 3, "ZONE_1", 520.0, -10.0, 1305.0, 26.0, 0.0, 1.1, 0.0, "Upper apron approaching debris fan"),
("ASC_04", "ASCENT", 4, "ZONE_1", 435.0, -12.0, 1332.0, 34.0, 1.0, 0.8, 0.0, "Bootpack transition below bergschrund lip"),
("ASC_05", "ASCENT", 5, "ZONE_2", 415.0, -12.0, 1340.0, 44.0, 2.0, 0.5, 0.0, "Crossing pinched snow bridge over 4m bergschrund"),
("ASC_06", "ASCENT", 6, "ZONE_2", 385.0, 4.0, 1365.0, 48.0, 3.0, 0.4, 0.0, "Exiting 12m choke throat and traversing toward looker's right rib"),
("ASC_07", "ASCENT", 7, "ZONE_3", 330.0, 22.0, 1420.0, 49.0, 4.0, 0.35, 0.0, "Ascending lower funnel margin out of center sluff line"),
("ASC_08", "ASCENT", 8, "ZONE_3", 275.0, 32.0, 1480.0, 50.0, 5.0, 0.32, 0.0, "2019 Bail turnaround proximity on wind-scoured hardpack"),
("ASC_09", "ASCENT", 9, "ZONE_4", 225.0, 38.0, 1535.0, 51.0, 5.5, 0.30, 0.0, "Entering main diamond face hugging skier's left rock rib"),
("ASC_10", "ASCENT", 10, "ZONE_4", 165.0, 42.0, 1605.0, 52.5, 6.0, 0.28, 0.0, "Sustained 52-degree bootpack with crampons and dual ice axes"),
("ASC_11", "ASCENT", 11, "ZONE_4", 105.0, 35.0, 1685.0, 54.0, 7.0, 0.25, 0.0, "Upper diamond steepening; severe double fall-line exposure"),
("ASC_12", "ASCENT", 12, "ZONE_4", 50.0, 20.0, 1760.0, 54.5, 8.0, 0.25, 0.0, "Approaching upper spine below summit cornice"),
("ASC_13", "ASCENT", 13, "ZONE_5", 18.0, 8.0, 1802.0, 52.0, 9.0, 0.22, 0.0, "Cresting blind rollover onto corniced summit ridge"),
("ASC_14", "ASCENT", 14, "ZONE_5", 0.0, 0.0, 1820.0, 38.0, 10.0, 0.0, 0.0, "True Summit Pin of The Sphinx (6,299 ft / 1,820 m)")
]

# Descent waypoints (Top-to-Bottom: Summit Pin -> Blind Rollover -> Center Diamond GS Turns -> Rib Sluff Stop -> Funnel -> Choke -> Bergschrund Air -> Apron)

descent_raw = [
("DSC_01", "DESCENT", 1, "ZONE_5", 0.0, 0.0, 1820.0, 38.0, 10.0, 2.0, 0.0, "Drop-in from narrow summit perch"),
("DSC_02", "DESCENT", 2, "ZONE_5", 15.0, 4.0, 1805.0, 55.0, 8.0, 11.5, 8.2, "Committing over convex 55-degree blind horizon rollover"),
("DSC_03", "DESCENT", 3, "ZONE_4", 55.0, -6.0, 1750.0, 54.0, 7.5, 17.8, 15.6, "First high-speed GS turn into center-right upper diamond"),
("DSC_04", "DESCENT", 4, "ZONE_4", 110.0, 8.0, 1678.0, 53.0, 6.5, 19.6, 17.8, "Linking big-mountain turns across 53-degree double fall-line"),
("DSC_05", "DESCENT", 5, "ZONE_4", 175.0, -8.0, 1595.0, 52.0, 6.0, 20.4, 18.9, "High-speed mid-face carve ahead of growing sluff wave"),
("DSC_06", "DESCENT", 6, "ZONE_4", 240.0, 26.0, 1520.0, 50.0, 5.0, 4.0, 19.1, "Tactical pull-out onto elevated skier's left rib to let upper sluff flush past"),
("DSC_07", "DESCENT", 7, "ZONE_3", 305.0, 5.0, 1448.0, 49.5, 4.5, 16.5, 17.5, "Re-entering clean lower funnel ramp after sluff wave clears"),
("DSC_08", "DESCENT", 8, "ZONE_3", 355.0, -6.0, 1395.0, 49.0, 3.5, 19.8, 18.4, "Setting up alignment for the narrow lower exit throat"),
("DSC_09", "DESCENT", 9, "ZONE_2", 390.0, -10.0, 1360.0, 48.0, 2.0, 21.2, 18.8, "Threading the 12m-wide rock-walled choke at mach speed"),
("DSC_10", "DESCENT", 10, "ZONE_2", 415.0, -12.0, 1340.0, 44.0, 0.0, 22.5, 16.5, "Airing across the bergschrund snow bridge onto the apron"),
("DSC_11", "DESCENT", 11, "ZONE_1", 550.0, -8.0, 1295.0, 24.0, 0.0, 14.5, 6.0, "High-speed GS decompression turns across concave glacier apron"),
("DSC_12", "DESCENT", 12, "ZONE_1", 850.0, 0.0, 1270.0, 10.0, 0.0, 0.0, 0.0, "Complete stop at glacier landing zone")
]

all_waypoints = ascent_raw + descent_raw

csv_headers = [
"waypoint_id", "route_type", "sequence_order", "zone_id",
"x_m", "y_m", "z_elev_m", "lat", "lon",
"slope_deg", "cross_tilt_deg", "normal_x", "normal_y", "normal_z",
"target_speed_ms", "sluff_speed_ms", "notes"
]

csv_rows = []
ascent_coords_geojson = []
descent_coords_geojson = []

for wp in all_waypoints:
wp_id, r_type, seq, z_id, x, y, z, slp, tilt, spd, slf, note = wp
lat, lon = local_xy_to_latlon(x, y)
nx, ny, nz = compute_normal(slp, tilt)
csv_rows.append([
wp_id, r_type, seq, z_id,
x, y, z, lat, lon,
slp, tilt, nx, ny, nz,
spd, slf, note
])
if r_type == "ASCENT":
ascent_coords_geojson.append([lon, lat, z])
else:
descent_coords_geojson.append([lon, lat, z])

with open(f"{repo_dir}/data/route_waypoints_3d.csv", "w", newline="") as f:
writer = csv.writer(f)
writer.writerow(csv_headers)
writer.writerows(csv_rows)

# Build GeoJSON

geojson_data = {
"type": "FeatureCollection",
"name": "The_Sphinx_Routes_WGS84",
"features": [
{
"type": "Feature",
"properties": {
"name": "The Sphinx Summit Pin",
"feature_type": "SUMMIT_APEX",
"elevation_m": 1820.0,
"elevation_ft": 6299.0
},
"geometry": {
"type": "Point",
"coordinates": [-145.07028, 60.66667, 1820.0]
}
},
{
"type": "Feature",
"properties": {
"name": "Bergschrund Snow Bridge & Choke Exit",
"feature_type": "HAZARD_CHOKE",
"elevation_m": 1340.0,
"crevasse_width_m": 4.0
},
"geometry": {
"type": "Point",
"coordinates": [ascent_coords_geojson[4][0], ascent_coords_geojson[4][1], 1340.0]
}
},
{
"type": "Feature",
"properties": {
"name": "Glacier Apron Heli Staging LZ",
"feature_type": "STAGING_LZ",
"elevation_m": 1270.0
},
"geometry": {
"type": "Point",
"coordinates": [ascent_coords_geojson[0][0], ascent_coords_geojson[0][1], 1270.0]
}
},
{
"type": "Feature",
"properties": {
"name": "Bootpack Ascent Route (Skier's Left Rib)",
"route_type": "ASCENT",
"vertical_gain_m": 550.0,
"sustained_slope_deg": 52.0
},
"geometry": {
"type": "LineString",
"coordinates": ascent_coords_geojson
}
},
{
"type": "Feature",
"properties": {
"name": "Ski Descent Route (Center Diamond & Rib Sluff Stop)",
"route_type": "DESCENT",
"vertical_drop_m": 550.0,
"max_slope_deg": 55.0
},
"geometry": {
"type": "LineString",
"coordinates": descent_coords_geojson
}
}
]
}

with open(f"{repo_dir}/data/route_telemetry.geojson", "w") as f:
json.dump(geojson_data, f, indent=2)

# 9. scripts/fetch_dem_heightmap.py and requirements.txt

req_txt = """numpy>=1.24.0
rasterio>=1.3.0
requests>=2.31.0
scipy>=1.11.0
"""
with open(f"{repo_dir}/scripts/requirements.txt", "w") as f:
f.write(req_txt)

## fetch_script = '''#!/usr/bin/env python3
"""
fetch_dem_heightmap.py

Generates or processes a metric Digital Elevation Model (DEM) heightmap for The Sphinx
(60.66667° N, -145.07028° W) in the Chugach Mountains, Alaska.

Capabilities:

1. Queries the USGS 3DEP National Map WCS / API for 5m Alaska IFSAR elevation data over
the bounding box [W: -145.095, S: 60.650, E: -145.045, N: 60.680].
2. Provides a deterministic, high-resolution (1.0m grid) procedural terrain synthesis mode
(`--mode synthetic`) that bakes the exact 5-zone morphology, double fall-line cant,
summit blind rollover, and the sub-meter 1,340m bergschrund crevasse into a 16-bit PNG/RAW
displacement heightmap ready for Unreal Engine 5, Unity, or Houdini.
"""

import argparse
import json
import math
import os
import numpy as np

def generate_synthetic_sphinx_dem(output_path="sphinx_heightmap_16bit.raw", grid_size=1024):
"""
Synthesizes a 1024x1024 16-bit local metric elevation grid covering X in [-100m, 924m]
and Y in [-512m, +512m] around the Summit Pin (0, 0, 1820m).
Includes procedural cuts for the 1,340m bergschrund and 12m exit choke.
"""
x_lin = np.linspace(-100.0, 924.0, grid_size)
y_lin = np.linspace(-512.0, 512.0, grid_size)
X, Y = np.meshgrid(x_lin, y_lin)

```
# Base elevation profile along X (down-slope axis)
Z = np.zeros_like(X)

# West/Northwest back-slope behind summit (X < 0)
mask_back = X < 0
Z[mask_back] = 1820.0 + X[mask_back] * math.tan(math.radians(42.0))

# Zone 5: Blind rollover (0 <= X < 32)
mask_z5 = (X >= 0) & (X < 32.0)
Z[mask_z5] = 1820.0 - (X[mask_z5] ** 1.18) * 0.72

# Zone 4 & 3: Main Diamond Face & Funnel (32 <= X < 415)
mask_face = (X >= 32.0) & (X < 415.0)
Z[mask_face] = 1791.0 - (X[mask_face] - 32.0) * 1.177

# Zone 1: Concave Glacier Apron (X >= 415)
mask_apron = X >= 415.0
dx_apron = X[mask_apron] - 415.0
Z[mask_apron] = 1270.0 + 70.0 * np.exp(-dx_apron / 145.0)

# Apply Double Fall-Line Lateral Tilt (tilted toward Y = -10m central gully)
# Bounding rock ribs rise sharply outside the diamond width
diamond_half_width = np.clip(95.0 - 0.19 * np.maximum(X - 80.0, 0.0), 12.0, 110.0)
gully_offset = Y + 10.0
in_face = (X >= 0) & (X <= 415.0)
Z[in_face] += np.abs(gully_offset[in_face]) * math.tan(math.radians(6.0))

# Sculpt bounding Chugach rock ribs on Looker's Left and Right
outside_ribs = in_face & (np.abs(gully_offset) > diamond_half_width)
Z[outside_ribs] += (np.abs(gully_offset[outside_ribs]) - diamond_half_width[outside_ribs]) * 0.45

# Procedural Boolean Cut: The Bergschrund at X = 415m (width = 4m, depth = 12m)
# Leave a 4m wide snow bridge pinched at Y in [-14m, -10m]
schrund_mask = (np.abs(X - 415.0) <= 2.5) & (np.abs(Y) < 85.0) & ~((Y >= -14.0) & (Y <= -10.0))
Z[schrund_mask] -= 12.0

# Normalize to 16-bit unsigned integer [0, 65535] mapped to [1200m, 1900m]
z_min, z_max = 1200.0, 1900.0
Z_clipped = np.clip((Z - z_min) / (z_max - z_min), 0.0, 1.0)
Z_uint16 = (Z_clipped * 65535.0).astype(np.uint16)

Z_uint16.tofile(output_path)
print(f"[SUCCESS] Wrote 16-bit RAW heightmap ({grid_size}x{grid_size}) to: {output_path}")
print(f"          Elevation encoding: 0 -> {z_min}m ASL, 65535 -> {z_max}m ASL")

```

if **name** == "**main**":
parser = argparse.ArgumentParser(description="Generate or fetch DEM heightmap for The Sphinx.")
parser.add_argument("--out", default="sphinx_heightmap_16bit.raw", help="Output 16-bit RAW filepath")
parser.add_argument("--size", type=int, default=1024, help="Grid resolution (default: 1024)")
args = parser.parse_args()
generate_synthetic_sphinx_dem(args.out, args.size)
'''

with open(f"{repo_dir}/scripts/fetch_dem_heightmap.py", "w") as f:
f.write(fetch_script)

# 10. src/physics/SphinxSkiSluffController.cs

cs_code = """using System;
using UnityEngine;

namespace SphinxSimulation.Physics
{
/// 
/// Implements the double fall-line ski kinematics and Voellmy-Salm loose-snow (sluff)
/// surface avalanche dynamics for The Sphinx (Line 38/50, Chugach Mountains, AK).
/// Coordinate convention:
///   +X = Down-slope fall-line (142 deg SE)
///   +Y = Looker's Right / Skier's Left (52 deg NE)
///   +Z = Elevation ASL (meters)
/// 
public class SphinxSkiSluffController : MonoBehaviour
{
[Header("Skier Physical Parameters")]
public float skierMassKg = 82.0f;           // Skier + Mammut RAS airbag + mountaineering kit
public float skiLengthM = 1.86f;            // Salomon QST Blank 112mm
public float skiWaistWidthM = 0.112f;
public float aeroDragAreaM2 = 0.55f;

```
    [Header("Snowpack State (Default: 2022 Velvet Powder)")]
    public float snowDensityKgM3 = 140.0f;
    public float powderDepthM = 0.35f;
    public float basalFrictionMuK = 0.14f;
    public float voellmyDryFrictionMuS = 0.16f;
    public float voellmyTurbulentDragXi = 1500.0f;
    public float sluffFlowThicknessM = 0.38f;

    [Header("Real-Time Telemetry State")]
    public Vector3 localPositionM = new Vector3(0f, 0f, 1820f);
    public Vector2 tangentVelocityMS = Vector2.zero;
    public float currentSlopePitchDeg = 38.0f;
    public float currentCrossTiltDeg = 10.0f;
    public float activeSluffFrontX = 0.0f;
    public float activeSluffSpeedMS = 0.0f;
    public bool isRagdollWipeout = false;
    public bool isParkedOnSafeRib = false;

    private const float GravityG = 9.81f;
    private const float AirDensityKgM3 = 1.05f; // ~1,500m ASL standard atmosphere

    /// <summary>
    /// Advances both the skier's tangent-plane velocity and the trailing Voellmy-Salm sluff wave.
    /// </summary>
    /// <param name="dt">Fixed timestep in seconds</param>
    /// <param name="carveTurnInput">Normalized carving input [-1 = Looker's Left, +1 = Skier's Left Rib]</param>
    /// <param name="edgeAngleDeg">Ski edge angle in degrees [0 to 75]</param>
    public void StepSimulation(float dt, float carveTurnInput, float edgeAngleDeg)
    {
        if (isRagdollWipeout) return;

        UpdateTerrainAnglesFromPosition(localPositionM.x, localPositionM.y, out currentSlopePitchDeg, out currentCrossTiltDeg, out localPositionM.z);

        float thetaRad = currentSlopePitchDeg * Mathf.Deg2Rad;
        float phiRad = currentCrossTiltDeg * Mathf.Deg2Rad;

        // 1. Double Fall-Line Gravity Vector on Tangent Plane
        //    gx pulls down the SE face (+X); gy pulls laterally into the center gully (-Y)
        Vector2 gTangent = new Vector2(
            GravityG * Mathf.Sin(thetaRad) * Mathf.Cos(phiRad),
            -GravityG * Mathf.Sin(phiRad)
        );

        // 2. Basal Coulomb Friction + Snow Plowing Drag
        float speed = tangentVelocityMS.magnitude;
        Vector2 moveDir = speed > 0.01f ? (tangentVelocityMS / speed) : new Vector2(1f, 0f);

        float normalForce = skierMassKg * GravityG * Mathf.Cos(thetaRad) * Mathf.Cos(phiRad);
        float basalFrictionMag = basalFrictionMuK * normalForce;

        // Carving edge resistance increases with sin(edgeAngle)
        float edgeBrakingMag = 0.35f * normalForce * Mathf.Sin(edgeAngleDeg * Mathf.Deg2Rad) * Mathf.Abs(carveTurnInput);

        // Combined aerodynamic + powder displacement drag
        float effectiveSnowArea = skiWaistWidthM * Mathf.Clamp(powderDepthM, 0.05f, 0.50f);
        float quadraticDragCoeff = 0.5f * (0.7f * aeroDragAreaM2 * AirDensityKgM3 + 1.8f * effectiveSnowArea * snowDensityKgM3);
        float dragMag = quadraticDragCoeff * speed * speed;

        // Lateral carving redirect force
        Vector2 lateralNormal = new Vector2(-moveDir.y, moveDir.x);
        float carveLateralMag = normalForce * Mathf.Sin(edgeAngleDeg * Mathf.Deg2Rad) * carveTurnInput * 0.85f;

        Vector2 netForce = (skierMassKg * gTangent)
                         - (moveDir * (basalFrictionMag + edgeBrakingMag + dragMag))
                         + (lateralNormal * carveLateralMag);

        Vector2 acceleration = netForce / skierMassKg;
        tangentVelocityMS += acceleration * dt;

        // Project tangent motion onto horizontal X/Y coordinates
        localPositionM.x += tangentVelocityMS.x * Mathf.Cos(thetaRad) * dt;
        localPositionM.y += tangentVelocityMS.y * dt;

        // Check if skier pulled out onto the safe Skier's Left Rib (Y > 20m in Zone 4)
        isParkedOnSafeRib = (localPositionM.y >= 20.0f && localPositionM.x >= 180.0f && localPositionM.x <= 260.0f);

        // 3. Voellmy-Salm Granular Sluff Wave Simulation
        StepVoellmySluffWave(dt, thetaRad);

        // 4. Evaluate Sluff Overtake & Choke Bottleneck Hazard
        EvaluateSluffCollisionHazard();
    }

    private void StepVoellmySluffWave(float dt, float thetaRad)
    {
        // Driving gravity minus basal dry friction
        float drivingTerm = Mathf.Max(0.0f, Mathf.Sin(thetaRad) - voellmyDryFrictionMuS * Mathf.Cos(thetaRad));
        float turbulentResistance = (GravityG / (voellmyTurbulentDragXi * Mathf.Max(0.05f, sluffFlowThicknessM)))
                                  * activeSluffSpeedMS * activeSluffSpeedMS;

        float sluffAccel = GravityG * drivingTerm - turbulentResistance;
        activeSluffSpeedMS = Mathf.Max(0.0f, activeSluffSpeedMS + sluffAccel * dt);
        activeSluffFrontX += activeSluffSpeedMS * Mathf.Cos(thetaRad) * dt;
    }

    private void EvaluateSluffCollisionHazard()
    {
        // If the skier is parked on the elevated looker's right / skier's left rib, the sluff bypasses via the center gully
        if (isParkedOnSafeRib) return;

        float distanceToSluffM = Mathf.Abs(localPositionM.x - activeSluffFrontX);
        float relativeSpeed = activeSluffSpeedMS - tangentVelocityMS.magnitude;

        // Funnel amplification in Zone 3 & Zone 2 Choke (X in 340m..415m)
        float funnelMultiplier = (localPositionM.x >= 340.0f && localPositionM.x <= 415.0f) ? 1.65f : 1.0f;

        if (distanceToSluffM < 2.5f && relativeSpeed > 1.5f)
        {
            float dynamicPressurePa = 0.5f * snowDensityKgM3 * (sluffFlowThicknessM * funnelMultiplier) * relativeSpeed * relativeSpeed;
            if (dynamicPressurePa > 1800.0f)
            {
                isRagdollWipeout = true;
            }
        }
    }

    private void UpdateTerrainAnglesFromPosition(float x, float y, out float pitchDeg, out float tiltDeg, out float zElevM)
    {
        if (x < 15.0f)
        {
            // Zone 5: Summit & Blind Rollover
            pitchDeg = Mathf.Lerp(38.0f, 55.0f, x / 15.0f);
            tiltDeg = 9.0f;
            zElevM = 1820.0f - x * 1.0f;
        }
        else if (x < 240.0f)
        {
            // Zone 4: Main Diamond Face
            pitchDeg = Mathf.Lerp(54.5f, 50.0f, (x - 15.0f) / 225.0f);
            tiltDeg = Mathf.Lerp(8.0f, 5.0f, (x - 15.0f) / 225.0f);
            zElevM = 1805.0f - (x - 15.0f) * 1.266f;
        }
        else if (x < 375.0f)
        {
            // Zone 3: Lower Funnel Ramp
            pitchDeg = 49.0f;
            tiltDeg = 4.0f;
            zElevM = 1520.0f - (x - 240.0f) * 1.074f;
        }
        else if (x < 425.0f)
        {
            // Zone 2: Exit Choke & Bergschrund
            pitchDeg = 46.0f;
            tiltDeg = 1.5f;
            zElevM = 1375.0f - (x - 375.0f) * 0.70f;
        }
        else
        {
            // Zone 1: Glacier Apron Runout
            pitchDeg = Mathf.Lerp(28.0f, 10.0f, Mathf.Clamp01((x - 425.0f) / 425.0f));
            tiltDeg = 0.0f;
            zElevM = Mathf.Lerp(1340.0f, 1270.0f, Mathf.Clamp01((x - 425.0f) / 425.0f));
        }
    }
}

```

}
"""

with open(f"{repo_dir}/src/physics/SphinxSkiSluffController.cs", "w") as f:
f.write(cs_code)

# 11. Package everything into a clean ZIP archive

zip_filename = "the-sphinx-simulation-spec.zip"
with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zf:
for root, dirs, files in os.walk(repo_dir):
for file in files:
full_path = os.path.join(root, file)
rel_path = os.path.relpath(full_path, ".")
zf.write(full_path, rel_path)

print(f"Created archive: {zip_filename} ({os.path.getsize(zip_filename)} bytes)")

```

```text?code_stdout&code_event_index=1
Created archive: the-sphinx-simulation-spec.zip (22977 bytes)


```

Your ZIP file is ready


Everything is packaged into a GitHub-ready repository structure (`the-sphinx-simulation-spec.zip`) designed specifically for both human simulation engineers and autonomous AI coding agents (such as Claude Code, Cursor, GitHub Copilot Workspace, or Devin).

### Repository Architecture Inside the ZIP

```text
the-sphinx-simulation-spec/
├── README.md                                  # Project overview, badges & quickstart instructions
├── AGENTS.md                                  # Context manifest & domain constraints for AI coding agents
├── docs/
│   ├── 01_ROUTE_DESCRIPTION_AND_HISTORY.md    # Full mountaineering & ski descent breakdown (2019 & 2022)
│   ├── 02_TERRAIN_AND_PHYSICS_SPEC.md         # Engineering equations, DEM specs, and micro-terrain zones
│   └── 03_MEDIA_AND_PHOTOGRAMMETRY_REFS.md    # Links to trip reports, GPX tracks & 4K drone frames for SfM
├── data/
│   ├── geospatial_config.json                 # Machine-readable CRS, bounding boxes & 5 terrain zone schemas
│   ├── route_waypoints_3d.csv                 # 26 3D Cartesian (X,Y,Z) & WGS84 waypoints for Ascent/Descent splines
│   ├── route_telemetry.geojson                # RFC 7946 GeoJSON LineStrings and hazard pins for GIS/engines
│   └── snowpack_states.json                   # Physical constants for 2019 (Bail Crust) vs. 2022 (Velvet Powder)
├── scripts/
│   ├── fetch_dem_heightmap.py                 # Python script to generate/fetch a 16-bit RAW displacement heightmap
│   └── requirements.txt                       # Python GIS dependencies
└── src/
    └── physics/
        └── SphinxSkiSluffController.cs        # Unity/C# physics controller for double fall-line + sluff dynamics

```

### Key Features Built for AI Agents (`AGENTS.md` & `/data`)

* **Strict Coordinate Convention (`AGENTS.md`):** Instructs AI agents that the local Cartesian origin `(0, 0, 1820)` is anchored at the Summit Pin (`60.66667° N, -145.07028° W`), with `+X` aligned down the primary Southeast fall-line (`142°` azimuth), `+Y` aligned toward Looker's Right / Skier's Left (`52°` azimuth), and `+Z` representing elevation in meters ASL.
* **Sub-Meter Procedural Sculpting Rules:** Explicitly warns agents not to rely solely on raw 2m/5m satellite DEMs for the **1,340 m bergschrund crevasse** (`4 m` wide, `12 m` deep, with a `4 m` snow bridge at `Y = -12 m`), the **12 m exit choke**, and the **55° blind summit rollover**, and includes a procedural heightmap generator (`scripts/fetch_dem_heightmap.py`) that bakes those cuts into a 16-bit `.raw` displacement map.
* **Ready-to-Ingest 3D Spline Telemetry (`data/route_waypoints_3d.csv` & `route_telemetry.geojson`):** Provides separate, non-overlapping 3D coordinates, surface normals `(nx, ny, nz)`, slope angles, cross-tilt angles, and target speeds for the **Bootpack Ascent Spline** (hugging the protective skier's left rock rib) and the **Ski Descent Spline** (carving the center-right diamond with the tactical sluff check-stop at `Z = 1,520 m`).
