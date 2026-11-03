# The Sphinx — established facts

Source of truth for framing and modeling; update as evidence lands.

## Identity

- Feature: The Sphinx, Chugach Range, Alaska (eastern Chugach, Points North
  Heli / Cordova terrain)
- The line: **West Face** — one of the Chugach "Big 5"
- First descents: Jim Rippey (snowboard), Doug Coombs (skis)
- First human-powered tour ascents: Brennan Lagasse & Jeff Dostie, via the
  PNH heli-assisted touring program (est. 2011 era)

## Line geometry (from report text)

- Vertical: "barely a 2000' descent" ≈ 600 m
- Pitch: sustained "high 50+ degree", "never lets up"
- Termination: **gaping bergschrund at the base** — parties air over it
- Climbing: bootpack ("booter") visible in the face photos
- Aspect: west — afternoon sun loading matters for the conditions model

## Simulation notes

- 50°+ sustained handled: classifySurface takes a snow-climate parameter —
  maritime (coastal Alaska) snow adheres to 55°, bares off past 65°; the
  Sphinx runs with `snowClimate: "maritime"`
- Bergschrund = a terrain hazard feature to extract from the DEM (curvature
  anomaly) and render as a hazard
- West face + coastal latitude 60.5°N: solar geometry already handles it

## Still missing

- [ ] Coordinates pin (summit lat/lon) — blocks DEM framing
- [ ] GPX of descent or ascent
- [ ] Article URL + publish year; truncated remainder of the report
- [ ] Photos from the article (booter, schrund, golden light) into photos/
- [ ] ArcticDEM tile over the pin
