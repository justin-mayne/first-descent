# First Descent

A steep-skiing and ski-mountaineering simulator built around **real
lines**: bring a mountain's terrain data, photos, and trip reports in; get
a rideable virtual environment out; plan and descend it with climbing and
skiing physics that reflect real snow conditions.

**Ride it:** <https://justin-mayne.github.io/first-descent/>

The proving ground is the Southeast/West face of **The Sphinx** in
Alaska's Chugach Range (Cordova / Points North zone) — one of the
Chugach "Big 5", Cody Townsend's Line 38/50 in *The FIFTY*, and the
subject of Brennan Lagasse and Jeff Dostie's human-powered ascent.

## Status

- **Sim core** — terrain, surfaces, snow-climate parameterization,
  solar/temperature environment model, per-position snow conditions,
  skiing/climbing physics (`src/sim`), all unit-tested
- **Terrain pipeline** — GeoTIFF parser (tiled LZW), meter framing with
  latitude-corrected spacing, slope/normal/aspect derivation, route
  snapping to DEM ground truth (`src/geo`)
- **Asset contract** — engine-agnostic heightfield + rasters + GeoJSON
  (`assets/sphinx/`), directly importable as a UE Landscape
- **Ride view** — three.js terrain mesh, skier on the physics core,
  chase camera, HUD, keyboard + touch controls (`src/app.tsx`)

See `docs/plan.md` for the roadmap (planning map, conditions layer,
evidence ingestion, loadout & clothing, the full loop).

## Data provenance

- Terrain: Copernicus DEM GLO-30 (© DLR / ESA / Airbus), cropped via
  OpenTopography, committed under `data/sphinx/dem/`
- Route and snowpack parameters: compiled simulation spec
  (`data/sphinx/spec/`), cross-checked against the DEM
- Trip reports: short attributed excerpts only (`data/sphinx/reports/`) —
  full third-party text is intentionally not committed

## Development

```sh
pnpm install
pnpm test        # vitest, includes integration tests on the real DEM
pnpm typecheck
pnpm build       # tsc + vite build
pnpm dev         # local ride view
```

CI runs typecheck and the full suite on every push and reports the
verdict back into `.ci/`; the asset contract is rebuilt by a dispatchable
workflow; every green master push deploys to GitHub Pages.
