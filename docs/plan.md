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

## Roadmap to a complete simulator

Honest current state: a real mountain rendered as vertex-lit terrain, a
point-mass skier with surface-dependent glide/brake/turn physics, and a
conditions model that exists in code but not yet on screen. No body, no
snow behavior, no hazards, no gear. The phases below take it from
"vertical slice" to "simulator," each with acceptance criteria a
contributor can verify.

### Phase 1 — The athlete (feel and locomotion)

Make the rider a body, not a puck. Superhuman skimo athlete: exaggerate
technique, never physics.

- Locomotion repertoire: carve vs skid (edge angle), jump turns,
  side-slip, pole plants, skinning gait, bootpacking with tools
- Balance model: COM + toppling torque from lateral tilt (the double
  fall line is the test case), stumble → recovery → fall states
- Mass & load feed back into pace, braking, balance (bridges to Phase 4)
- Tunability: parameter presets, telemetry HUD mode, run recording
- **Acceptance:** a tester can side-slip the rollover, jump-turn the
  choke, and say "that's how it feels" — or tweak coefficients in one
  place and feel the difference.

### Phase 2 — The mountain (fidelity)

- Per-pixel terrain shading from the contract's normal/slope rasters
- Route overlay: line.geojson rendered on the mesh with waypoint markers
- ArcticDEM 2 m ingestion; multi-LOD grid (2 m face, 15 m apron)
- Imagery draping (ESRI World Imagery) and stylized modes, switchable
- Hazards from terrain: bergschrund extraction (curvature anomaly),
  crevasse zones, cliff bands
- Weather/time-of-day controls driving the existing environment model
- **Acceptance:** the West Face reads as THE West Face in screenshots;
  the schrund is visible and located where the report says.

### Phase 3 — Snow as a system

- Visualize the per-cell condition field (already modeled, not shown)
- Loose-snow sluff: Voellmy-Salm flow down the fall line using the
  spec's calibrated parameters — sluff management is this line's core
  survival mechanic (outrun it or pitch-by-pitch from the ribs)
- Playable snowpack scenarios from the spec: 2019 breakable crust over
  sharks vs 2022 velvet powder, same geometry
- Snow feel: compression, sluff spray, ski tracks
- **Acceptance:** the 2019 scenario punishes the same mistakes Townsend
  bailed for; the 2022 scenario skis top-to-bottom ahead of your sluff.

### Phase 4 — Gear, clothing, expedition

- Data-driven gear catalog (ski/glacier kit, avi safety, camping,
  clothing) with mass, slots, physics modifiers — seeded by
  `data/gear/gear_master_database.json` (42 items, 10 categories,
  weight/price/uphill/downhill/float/durability ratings); reference
  guides in `docs/gear/`
- Loadout UI; the 89.5 kg Townsend kit is the reference loadout
- Clothing × conditions interaction (vent/insulate choices cost pace)
- Multi-day: bivy, stove/fuel/food, weather windows, tour planning
- **Acceptance:** loadout choices visibly change how the same line
  rides; an overnight tour is completable.

### Phase 5 — The loop

- MapLibre planning view: same DEM, slope-angle shading, route drawing,
  GPX export
- Evidence ingestion: geotagged photos register; trip reports pin
  condition observations into the snow model
- Ghosts of prior descents; leaderboards later; multiplayer undecided
- **Acceptance:** plan a line in the map view from a trip report, then
  ride it under the conditions that report implies.

### Phase 6 — High fidelity and release

- UE track: `ue/` project consuming the same asset contract; desktop
  photoreal passes (M2.5 legacy item)
- v1.0: packaging, releases, trailer, community kickoff

### Open-source project practices

- MIT stays; third-party data keeps provenance notes (README)
- CONTRIBUTING + code of conduct + issue templates; good-first-issue
  labels seeded from Phase 1–2 items
- CI is the contribution gate: green = mergeable, verdict is public
- Docs: this plan + an ARCHITECTURE.md describing module boundaries
  (geo / sim / render / ride) and the asset contract as the extension
  point for new mountains
- New mountains = new evidence sets: keep `data/<mountain>/` the
  documented onboarding path so contributors can add lines
- Releases tagged from green master with changelogs

## Open questions

- Trip-report licensing/attribution when ingesting forum text (current
  stance: attributed excerpts only in-repo)
- Imagery sources: free (ESRI World Imagery tiles) vs paid (MapTiler)
- Multiplayer or ghosts of prior descents later?
- ArcticDEM access: PGC/Earthdata account on the maintainer side; large
  files route through CI fetch or laptop
