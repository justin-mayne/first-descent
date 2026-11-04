# Terrain Engineering & Kinematic Physics Specification

## 1. Geospatial & Digital Elevation Model (DEM) Specification

| Parameter | Technical Value / Source | Engineering Implementation Notes |
| :--- | :--- | :--- |
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
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ZONE_5` | **Summit Spine & Blind Rollover** | `1,785 – 1,820 m` | `0 – 32 m` | `38° -> 55°` | `8° – 10°` | Knife-edge cornice on looker's right; convex entry ramp (`R = 15 m`). |
| `ZONE_4` | **Main Diamond Face** | `1,520 – 1,785 m` | `32 – 240 m` | `50° – 54°` | `5° – 8°` | Broad (`180 m` wide) planar-convex ramp canted toward `-Y` gully; bounded by rock ribs. |
| `ZONE_3` | **Lower Funnel Ramp** | `1,375 – 1,520 m` | `240 – 375 m` | `48° – 51°` | `4° – 5°` | Converging rock walls narrowing from `180 m` down to `25 m`. Primary sluff compression zone. |
| `ZONE_2` | **Exit Choke & Bergschrund** | `1,340 – 1,375 m` | `375 – 425 m` | `44° – 48°` | `0° – 2°` | `12 m`-wide throat above a `3–5 m` wide, `12 m` deep horizontal crevasse; `4 m` snow bridge at `Y = -12 m`. |
| `ZONE_1` | **Glacier Apron & Heli LZ** | `1,270 – 1,340 m` | `425 – 850 m` | `10° – 32°` | `0°` | Concave debris/runout fan flattening to `10°` at the helicopter staging zone. |

---

## 3. Kinematic Equations for Software Implementation

### A. Double Fall-Line Gravity Decomposition
Let the local tangent plane of the mountain face be parameterized by down-slope pitch angle $\theta$ (along $+X$) and lateral cross-slope tilt $\phi$ (toward the central gully $-Y$). Given gravitational acceleration $g = 9.81 \text{ m/s}^2$:

$$\vec{g}_{\text{tangent}} = \begin{bmatrix} g_x \\ g_y \end{bmatrix} = \begin{bmatrix} g \sin\theta \cos\phi \\ -g \sin\phi \end{bmatrix}$$

In `ZONE_4` ($	heta = 52^\circ, \phi = 6^\circ$):
- Down-slope acceleration component: $g_x = 9.81 \times \sin(52^\circ) \cos(6^\circ) \approx 7.69 \text{ m/s}^2$
- Lateral drift component toward gully: $g_y = -9.81 \times \sin(6^\circ) \approx -1.03 \text{ m/s}^2$

### B. Skier Equation of Motion
For a skier of mass $m = 82 \text{ kg}$ (including airbag pack and mountaineering gear) travelling at velocity vector $\vec{v} = [v_x, v_y]$:

$$m \frac{d\vec{v}}{dt} = m \vec{g}_{\text{tangent}} - \vec{F}_{\text{friction}} - \vec{F}_{\text{drag}} + \vec{F}_{\text{carve}}$$

Where:
1. **Coulomb Basal Friction:** $\|\vec{F}_{\text{friction}}\| = \mu_k m g \cos\theta \cos\phi$
2. **Snow Displacement & Aerodynamic Drag:** $\|\vec{F}_{\text{drag}}\| = \frac{1}{2} (C_d A_{\text{aero}} \rho_{\text{air}} + C_{\text{plow}} A_{\text{ski}} \rho_{\text{snow}} d_{\text{pen}}) \|\vec{v}\|^2$
3. **Carving Centripetal Force:** Controlled by ski edge angle $\alpha_{\text{edge}}$ and turn radius $R_{\text{turn}}$.

### C. Voellmy-Salm Granular Sluff Avalanche Model
Loose snow entrained by each ski turn forms a surface avalanche front of flow thickness $h(t)$ (typically $0.30 \text{ m} \le h \le 0.65 \text{ m}$). Using the Voellmy-Salm rheological model with dry basal friction $\mu_s \approx 0.16$ and turbulent drag coefficient $\xi \approx 1500 \text{ m/s}^2$:

$$\frac{dv_{\text{sluff}}}{dt} = g (\sin\theta - \mu_s \cos\theta) - \frac{g}{\xi h} v_{\text{sluff}}^2$$

The terminal velocity of the sluff wave on a constant pitch $\theta$ is:

$$v_{\text{sluff, max}} = \sqrt{\xi h (\sin\theta - \mu_s \cos\theta)}$$

For `ZONE_4` ($	heta = 52^\circ, h = 0.35 \text{ m}, \mu_s = 0.16, \xi = 1500 \text{ m/s}^2$):
$$v_{\text{sluff, max}} = \sqrt{1500 \times 0.35 \times (0.7880 - 0.16 \times 0.6157)} = \sqrt{525 \times 0.6895} \approx 19.03 \text{ m/s} \text{ (68.5 km/h)}$$

### D. Loss-of-Control / Sluff Wipeout Criterion
If the Euclidean distance between the skier and an active sluff front drops below the collision threshold ($\|\vec{p}_{\text{skier}} - \vec{p}_{\text{sluff}}\| < 2.5 \text{ m}$) and the sluff momentum flux exceeds the skier's edge shear threshold:

$$\Phi_{\text{impact}} = \frac{1}{2} \rho_{\text{sluff}} h (v_{\text{sluff}} - v_{\text{skier}})^2 > 1800 \text{ Pa}$$

The simulation triggers an **Edge Blowout / Ragdoll State**, sweeping the agent toward the `Z = 1,340 m` bergschrund hazard.
