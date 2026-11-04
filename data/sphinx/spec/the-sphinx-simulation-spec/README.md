# The Sphinx (Chugach Mountains, AK) — Ski & Mountaineering Simulation Specification

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
