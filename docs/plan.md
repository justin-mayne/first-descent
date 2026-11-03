# First Descent — Plan

A steep-skiing and ski-mountaineering simulator built around **real lines**:
bring a mountain's topo data, photos, and trip reports in; get a beautiful,
rideable virtual environment out; plan and descend it with climbing/skiing
physics that reflect real snow conditions.

## Decisions (26 Oct 2026)

1. **Terrain engine: hybrid.** MapLibre (real DEM + imagery tiles) for the
   planning view; a three.js heightfield extracted from the same DEM for the
   riding view. One DEM, two renderers, each doing what it is best at.
2. **Art direction: keep both possible.** The terrain material supports
   imagery-draped realism and stylized alpine as switchable modes.
3. **Scope driver: one real line.** Every pipeline decision is made against a
   single specific descent the author has in mind, then generalized.
4. **Evidence ingestion is a first-class input.** Photos and trip reports are
   not decoration: they feed the snow-condition model (trip reports describe
   conditions on aspects at times — ground truth for inference).

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

- **M0 — Environment proven.** Install/tests/build green; dev server reachable
  from the iPad's Safari (or deploy-preview fallback confirmed).
- **M1 — Rideable mountain (procedural).** three.js terrain mesh from the
  heightfield, skier with the physics core, keyboard controls, camera,
  HUD (speed/slope/condition). Tuned until the *feel* is right.
- **M2 — The real line.** DEM for the chosen mountain parsed, framed, and
  rideable; GPX line overlaid; imagery-draped and stylized modes both render.
- **M3 — Planning view.** MapLibre with the same DEM + line, slope-angle
  shading, route drawing that exports GPX.
- **M4 — Conditions layer.** Snow model live in the sim and visualized on
  terrain; condition field affects physics everywhere.
- **M5 — Evidence ingestion.** Photos register by geotag; trip reports
  extract condition observations (assisted structuring) and pin them into
  the snow model.
- **M6 — The loop.** Read beta → plan on the map → ride it in the sim with
  conditions inferred from the evidence.

## Open questions

- **Which line first?** Mountain, route, season; existing GPX/photos/reports?
- Trip-report licensing/attribution when ingesting forum text
- Imagery sources: free (ESRI World Imagery tiles) vs paid (MapTiler) quality
- Multiplayer or ghosts of prior descents later?
