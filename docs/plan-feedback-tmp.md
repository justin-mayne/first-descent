This is an exceptionally well-structured engineering plan. Anchoring the entire architecture around **a single specific line** (the West Face of The Sphinx—clearly referencing Cody Townsend’s *The Fifty* 2019 bail vs. 2022 redemption) and enforcing a **strict, engine-agnostic asset contract** solves the two biggest killers of indie simulation projects: scope creep and renderer lock-in.

Below is a technical and design critique broken down by what works brilliantly, hidden architectural traps to watch out for, and how to link your Phase 1–4 roadmap with the gear database we just built.

---

### 1. What Is Brilliant in This Plan

* **The Agent/Human Hardware Split:** Running the pure TypeScript simulation core (`src/geo`, `src/sim`), pipeline, and `three.js` rapid-iteration loop on an always-on Linux box while reserving the desktop strictly for Unreal Engine look-dev passes is a massive productivity multiplier. Because `src/sim` is pure TS and unit-tested, your agent can tune physics and snow models headlessly in CI without waiting on shader compilation.
* **The "2019 vs. 2022" Acceptance Test (Phase 3):** Using a documented historical failure (2019 breakable crust/sharks) vs. success (2022 velvet powder/sluff management) on identical geometry is a gold-standard acceptance criterion. It turns subjective "snow feel" into an objective pass/fail simulation test.
* **Voellmy-Salm for Sluff Management:** Implementing a simplified Voellmy-Salm shallow-flow model ($\tau = \mu \sigma + \frac{\rho g}{\xi} v^2$) on the 2D heightfield grid is computationally cheap enough to run in real time in JS while naturally producing the exact tactical behavior needed on steep faces: sluff accelerates down the fall line, funnels into chokes, and forces the player to pull onto ribs/spines to let debris flush past.

---

### 2. Architectural & Technical Blind Spots to Address

#### A. The Three.js $\leftrightarrow$ Unreal Engine Physics Bridge (Phase 6 Risk)

* **The Trap:** Your Asset Contract (`M2`) cleanly exports static terrain (`heightmap-16bit.raw`, rasters, `conditions.json`), which allows both Three.js and UE to *render* the mountain. However, your physics and snow core live in `src/sim/` (TypeScript). When you reach Phase 6, how does Unreal Engine run the skier physics and Voellmy-Salm sluff?
* **The Fix:** Decide early how UE consumes `src/sim/`:
1. **Replay/Telemetry Consumer:** Play and simulate in the browser/TS core, export a high-frequency transform + sluff state recording (`run_telemetry.json`), and use UE purely as a cinematic replay/rendering engine at first.
2. **Embedded JS Runtime (Puerts / Unreal.js) or WebSocket Bridge:** Run the Node `src/sim` process locally alongside UE, streaming state over localhost UDP/WebSockets at 60–120Hz so you never have to rewrite and maintain the physics engine twice in C++.



#### B. The "2m DEM Resolution Wall" on Micro-Terrain (Phase 2 Risk)

* **The Trap:** Moving from SRTM/Copernicus (30m) to ArcticDEM (2m) is a huge leap, but a **2m grid still smooths out sub-meter features** that define steep skiing: a 1.5m vertical bergschrund lip, a 1m-wide rock choke, wind-lip cornices, or exposed "sharks" (rocks) in the 2019 low-tide scenario. A 2m heightfield will turn a vertical 2m cliff or schrund lip into a 45° ramp.
* **The Fix:** Add a **Procedural Micro-Detail / Feature Stamp Layer** to the Asset Contract (`features.geojson` or detail displacement map). When curvature anomaly detection flags a bergschrund or cliff band (or a trip report pins a "choke/rock step"), allow the pipeline to stamp sharp procedural geometry (or high-frequency normal/displacement offsets) along that spline so the schrund actually has an overhang/lip you have to air over or side-slip around.

#### C. Multi-LOD Grid Seams (`2m face, 15m apron`)

* **The Trap:** In `heightmap-16bit.raw`, a standard single-resolution raster makes Unreal Landscape import trivial. If you export a multi-LOD grid, UE Landscape won't natively ingest mixed meters-per-sample without separate Landscape actors (which creates seam/collision headaches at the boundary).
* **The Fix:** Keep the exported `heightmap-16bit.raw` at a uniform 2m resolution (even a $4\text{km} \times 4\text{km}$ bounding box at 2m/sample is only $2000 \times 2000$ pixels— roughly 8MB uncompressed, which both Three.js and UE5 handle effortlessly). Use quadtree chunking in Three.js for rendering LOD, rather than baking multi-resolution grids into the raw heightmap contract.

#### D. `conditions.json` Format & Memory Footprint

* **The Trap:** If `conditions.json` stores per-cell snow state (surface type, depth, temperature, moisture, sluff mass) as verbose JSON objects across a $2000 \times 2000$ grid, the JSON file will bloat to hundreds of megabytes and stall browser parsing.
* **The Fix:** Change `conditions.json` in the Asset Contract to a **multi-channel 8-bit/16-bit PNG or binary buffer (`conditions.bin` + `conditions_meta.json`)**—for example:
* `R`: Surface Enum ID (Powder, Windslab, Breakable Crust, Melt-Freeze Crust, Glacial Ice, Rock)
* `G`: Unconsolidated Snow Depth (cm, feeds sluff availability and ski sinkage)
* `B`: Crust Thickness / Shear Strength (controls whether player breaks through crust based on mass + turn G-force)
* `A`: Surface Friction / Moisture factor



---

### 3. Physics & Gameplay Refinements (Phases 1–5)

#### Phase 1: The Athlete & "The Double Fall Line"

* **Pedal-Hop vs. Carving State Machine:** In steep ski mountaineering (45°–55°+), skiers rarely carve continuous arcs; they disconnect their skis from the snow via **jump turns (pedal-hops)**, pivot 180° around a planted pole, and absorb the landing into a controlled **side-slip/skid** to shed speed before sluff catches them.
* **Concrete Mechanic:** Model the **Pole Plant** as a physical pivot constraint. On slopes $>45^\circ$, initiating a jump turn within the timing window of a pole plant gives fast angular rotation and low down-mountain drift. Missing the pole plant timing on icy/crusty double-fall-line terrain applies lateral torque to the Center of Mass (COM), triggering your `stumble -> recovery -> fall` chain.



#### Phase 3: Breakable Crust Mechanics (The 2019 Townsend Scenario)

* Why is breakable crust terrifying on a 50° face? Because edge grip is binary and unpredictable.
* **Concrete Mechanic:** Compare instantaneous ski pressure ($P = \frac{F_{\text{normal}}}{\text{Ski Area}}$) against the cell's `crust_strength`.
* When $P < \text{crust\_strength}$, the ski rides on top (high speed, low edge hold, skittery).
* During high-G turn initiation, $P > \text{crust\_strength}$: the crust punches through, spiking `flow_drag` asymmetrically on the outside ski and locking the ski tip's yaw rotation ("railing"), which pitches the athlete's COM forward over the handlebars.
* This directly links **Phase 3 (Snow)** to **Phase 4 (Gear)**: wider freeride skis (`SKI_003`, 106mm waist) distribute force over a larger surface area (staying on top of crust or floating in powder), whereas narrow 65mm–85mm skimo skis punch through crust more easily unless they hold an edge on pure chalk/ice.





#### Phase 4: Connecting the Gear Database to "The 89.5 kg Townsend Kit"

You can wire the `gear_master_database.json` we generated directly into `src/sim/` for Phase 4:

* **System Mass Breakdown ($89.5\text{ kg}$ reference):**
* Athlete Body Mass: $\sim 75.0\text{ kg}$
* Worn Clothing + Boots + Helmet (`CLO_*` + `BOT_002`/`003`): $\sim 4.5\text{ kg}$


* Skis + Bindings + Skins + Poles (`SKI_002`/`003` + `BND_002` + `SKN_002` + `POL_001`): $\sim 3.8\text{ kg}$


* Pack + Avy Gear + Climbing Rack + Bivy/Stove (`PCK_002` + `AVY_*` + `CLM_*` + `CMP_*`): $\sim 6.2\text{ kg}$




* **Location-Aware Mass Multipliers:**
* Separate total mass into $M_{\text{feet}}$ (Skis + Bindings + Boots + Skins/Crampons) and $M_{\text{sprung}}$ (Body + Pack).


* On the uphill (skinning/bootpacking), $M_{\text{feet}}$ applies the $4\times$ metabolic/cadence penalty.


* When skis go on the backpack (`A-Frame` or `Diagonal` carry for bootpacking the couloir), $M_{\text{feet}}$ drops by the weight of the skis/bindings, while $M_{\text{pack}}$ increases—raising the athlete's vertical Center of Mass ($Z_{\text{COM}}$) and increasing `toppling_torque` when side-hilling or front-pointing on steep ice.





#### Phase 5: Open-Source Licensing & Data Provenance Answers

To resolve your **Open Questions** at the bottom of the doc:

1. **Trip-Report Ingestion Licensing:** Keep raw scraped forum text *out* of the git repository. Instead, build a small schema (`evidence.json`) that stores **structured facts** extracted from the report (which are not copyrightable) alongside a URL citation and short fair-use quote (<25 words):
```json
{
  "source_url": "https://...",
  "author": "Author Name",
  "date_observed": "2019-04-14",
  "pins": [
    { "lat": 45.152, "lon": -111.451, "elevation_m": 3180, "surface": "breakable_crust", "hazard": "exposed_sharks", "excerpt": "Punchy crust over shallow rocks..." }
  ]
}

```


Your local CLI tool (`tools/`) can use an LLM or regex parser to extract `evidence.json` from pasted text locally without ever committing copyrighted stories to the repo.
2. **Imagery Sources:** For an MIT open-source repo, avoid committing cached ESRI or MapTiler tiles directly into Git (violates ToS and bloats the repo). Commit the tile-fetcher script in `tools/` using **USGS NAIP** (public domain in the US—great for Montana/Sphinx!) or Sentinel-2/Mapbox/ESRI via user-supplied API keys or runtime tile fetching.
3. **ArcticDEM Access:** PGC provides **AWS S3 public buckets / STAC APIs** for ArcticDEM and REMA (Cloud-Optimized GeoTIFFs / COGs). Using `geotiff.js` with HTTP range requests (`fromUrl`), your Node CLI can fetch *only* the exact $4\text{km} \times 4\text{km}$ bounding box window directly from the public Cloud-Optimized GeoTIFF in seconds—no multi-gigabyte manual downloads or Earthdata login required!

Would you like me to generate a ready-to-drop `evidence.json` schema and TypeScript interface file that bridges the `gear_master_database.json` and `conditions` grid into your `src/sim/` directory structure?
