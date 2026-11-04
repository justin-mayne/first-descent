# First Descent — Plan

A steep-skiing and ski-mountaineering simulator built around **real lines**:
bring a mountain's topo data, photos, and trip reports in; get a beautiful,
rideable virtual environment out; plan and descend it with climbing/skiing
physics that reflect real snow conditions.

## Decisions (26 Oct 2026)

1. **Terrain engine: two renderers, one source of truth.** MapLibre (real DEM
   + imagery tiles) for the planning view; a browser three.js view for
   fast-iteration riding; and an **Unreal Engine track** for high-fidelity
   rendering, run on the author's desktop. All three consume the same
   engine-agnostic asset contract (below).
2. **Art direction: keep every mode possible.** Imagery-draped realism and
   stylized alpine as switchable modes in the browser renderer; UE pushes
   realism further.
3. **Scope driver: one real line.** Every pipeline decision is made against a
   single specific descent, then generalized.
4. **Evidence ingestion is a first-class input.** Photos and trip reports feed
   the snow-condition model.

## Division of labor

| Where | What |
|---|---|
| Linux box (always on, agent) | pipeline, sim core, snow model, MapLibre planning view, browser ride view, tests, CI |
| Desktop (occasional, human) | UE editor sessions: landscape import, materials, lighting, look pass |

## Asset contract (M2 output, engine-agnostic)

- `heightmap-16bit.raw` + `bounds.json` (geo bounds, grid size, meters/sample,
  world scale) — directly importable as a UE Landscape
- `slope.png`, `normal.png`, `aspect.png` — derived rasters, usable as
  landscape layers / three.js textures / MapLibre hillshade source
- `line.geojson` — the descent; splines in UE, overlays in map/sim views
- `imagery/` — tile cache for draping (both renderers)
- `conditions.json` — the snow-model field, shared by all renderers

## The three challenge areas

### 1. Real-terrain pipeline (data → environment)

```
data/<mountain>/
  dem/        SRTM .hgt, Copernicus/ALOS GeoTIFF   (user downloads in Safari)
  line.gpx    the descent track / skin track
  photos/     geotagged photos of the face, route, cruxes
  reports/    trip reports (markdown/text pasted from forums etc.)
```

Pipeline (Node, pure TS, unit-tested on synthetic fixtures):

- **Parse** DEM (.hgt done; GeoTIFF via the pure-JS geotiff reader)
- **Frame**: crop/resample the DEM to the face; record geo-bounds
- **Derive**: slope, aspect, normal maps; curvature later
- **Drape**: fetch imagery tiles for the same bounds (imagery mode)
- **Extract**: GPX → polyline + waypoints (spawn, cruxes, transition spots)
- **Register**: photos via EXIF geotags → world placement pins

### 2. Climbing and skiing physics

Modes: skin, boot, ski (transitions cost time later). Coefficients are
per-position, resolved from surface × condition tables (started in
`src/sim/`). Core behaviors with real consequences:

- Skins backslide past the slip angle; booting holds steeper; both fail
  eventually — you side-slip or pitch onto crampon terrain
- Skiing: gravity along the fall line, glide friction by surface, edge grip
  caps turn authority (ice washes out), flow drag for deep snow, braking

### 3. Conditions from environmental clues

Per-cell inference, not a global setting (started in `src/sim/`):

- Solar geometry (lat/date/hour) → which aspects are cooking now
- Temperature proxy by altitude/season → wet vs dry snow family
- Storm history + wind → powder vs windslab on leeward slopes
- Overnight refreeze + morning sun → crust; scoured steep cold → ice
- **Evidence layer**: trip-report text and photo metadata pin observed
  conditions to places and times, overriding/anchoring the inferred field

## Architecture

```
src/geo      heightmap, DEM parsers, tile math        (pure, tested)
src/sim      terrain, surfaces, environment, snow     (pure, tested)
             model, physics
src/render   three.js terrain materials, chunking     (browser)
src/map      MapLibre planning view                   (browser)
tools/       pipeline CLI: data → framed terrain +    (Node)
             derived maps + registered evidence
```

## Milestones

- **M0 — Environment proven.** DONE (CI green, Pages deploys, iPad Safari
  reaches the ride view).
- **M1 — Rideable mountain (procedural).** DONE for the real mountain:
  three.js terrain mesh from the framed Sphinx heightfield, skier on the
  physics core, chase camera, HUD, keyboard + touch controls; CI includes
  an acceptance test that rides the committed DEM. Feel-tuning continues.
- **M2 — The real line.** DONE for the data path: DEM parsed, framed,
  derived rasters, route snapped to ground truth, asset contract built by
  workflow into `assets/sphinx/`.
- **M2.5 — UE track opens.** `ue/` project scaffolding in-repo; desktop
  session imports the M2 assets (Landscape from raw heightmap, layers, line
  spline) and takes the first photoreal pass.
- **M3 — Planning view.** MapLibre with the same DEM + line, slope-angle
  shading, route drawing that exports GPX.
- **M4 — Conditions layer.** Snow model live in the sim and visualized on
  terrain; condition field affects physics everywhere.
- **M5 — Evidence ingestion.** Photos register by geotag; trip reports
  extract condition observations (assisted structuring) and pin them into
  the snow model.
- **M5.5 — Loadout & clothing.** Data-driven gear catalog (ski/glacier kit,
  avalanche safety, camping, clothing layers) with per-item mass and
  physics modifiers; loadouts chosen in the planning view and carried into
  the ride. Mass drives flow drag, braking, climb pace, and the balance
  model (COM offset); clothing interacts with the conditions model.
  First real loadout is specced: the 89.5 kg Townsend kit from the
  simulation spec's mechanics parameters.
- **M6 — The loop.** Read beta → plan on the map → gear up → ride it in
  the sim with conditions inferred from the evidence.

## Open questions

- **Proving ground: The Sphinx, Alaska.** Pin the exact feature (coordinates
  or a map link) — several Alaskan and one famous Californian feature share
  the name, and DEM framing needs the precise spot. Preferred DEM: ArcticDEM
  (~2 m, GeoTIFF); Copernicus GLO-30 as fallback.
- Trip-report licensing/attribution when ingesting forum text
- Imagery sources: free (ESRI World Imagery tiles) vs paid (MapTiler) quality
- Multiplayer or ghosts of prior descents later?
