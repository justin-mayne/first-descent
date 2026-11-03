# The Sphinx — established facts

Source of truth for framing and modeling; update as evidence lands.

## Identity

- Feature: The Sphinx, Chugach Range, Alaska (eastern Chugach, Points North
  Heli / Cordova terrain)
- Pin: **60.6667, -145.0703**, summit 6,299 ft / 1,820 m (see pin.md)
- Vertical: 1,800–2,000 ft (~550–600 m) summit to glacier apron
- Pitch: sustained "high 50+ degree", "never lets up"
- Termination: **gaping bergschrund at the base** — parties air over it,
  via a snow bridge pinched near the exit choke
- First descents: Jim Rippey (snowboard), Doug Coombs (skis)
- First human-powered tour ascents: Brennan Lagasse & Jeff Dostie, via the
  PNH heli-assisted touring program (est. 2011 era)
- Also: Cody Townsend's The FIFTY **Line 38/50** (bail April 2019, descent
  April 2022 with Nick Russell and Ed Shanley)

## Which face? (open)

- **West Face** — the Lagasse/Dostie line (our narrative report)
- **Southeast Face / Ridge** — the Townsend line; the gemini overview's
  route description, coordinates, and beta are for this face
- Both are the same diamond-shaped feature with the schrund exit; DEM
  framing covers the whole peak either way. Decide which line gets the
  GPX overlay and the first playable descent.

## Line geometry (from reports)

- Double fall line: the ramp tilts down AND laterally toward the edge
  cliffs / central exit gully
- Summit entry: blind rollover over a convex horizon; corniced needle
  summit
- Lower third funnels into an exit choke directly above the bergschrund
- Climbing: bootpack ("booter") with crampons + two tools visible in face
  photos; "fall-you-die" exposure for an hour of vertical
- Aspect: west (Lagasse) / southeast (Townsend) — afternoon sun loading
  matters for the conditions model either way

## Simulation notes

- 50°+ sustained handled: classifySurface takes a snow-climate parameter —
  maritime (coastal Alaska) snow adheres to 55°, bares off past 65°; the
  Sphinx runs with `snowClimate: "maritime"`
- **Sluff management is the core survival mechanic** on this line: skier
  sluff funnels into the same exit choke; ski it mach-lo-top-bottom or in
  pitches from rib to rib. A sluff model (loose-snow flow following the
  fall line, catching the skier) belongs in the sim before hazards feel
  real
- 2019 conditions on the face: wind-pressed crust over shallow buried
  rocks ("sharks") — validates crust/icy condition physics in the steep
  band
- 2022 conditions: boot-top to knee velvet powder on the same face —
  the same geometry can hold opposite conditions; the snow model's storm
  history should be able to produce both
- Bergschrund = a terrain hazard feature to extract from the DEM (curvature
  anomaly) and render as a hazard
- West/southeast aspect + coastal latitude 60.5°N: solar geometry already
  handles it

## Sources

- gemini-overview.md (compiled summary; sources listed within):
  onX The-Fifty guidebook entry (Cody Townsend's own beta + interactive
  3D GPS track), skithefifty.com/sphinx, the 2019 "Line */50" writeup,
  Freeskier and Mountainwatch coverage, YouTube episode (a_LOvY4TnjY)
- reports/lagasse-west-face.md (paste, truncated; URL/year pending)

## Still missing

- [x] Coordinates pin (summit lat/lon)
- [ ] GPX of descent or ascent (onX page has Townsend's interactive track
      — extract or hand-digitize from it)
- [ ] Lagasse article URL + publish year; truncated remainder of the report
- [ ] Photos from the articles (booter, schrund, golden light; Bjarne
      Salén's shots on the onX page) into photos/
- [ ] DEM tile over the pin (crop via OpenTopography in the browser, see
      plan: Copernicus GLO-30 fallback)
