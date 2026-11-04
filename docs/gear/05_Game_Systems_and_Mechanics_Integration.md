# 5. Game Systems & Mechanics Integration Guide

To make modern ski, skimo, climbing, and winter camping gear feel impactful in gameplay, gear choices should create meaningful trade-offs across **Weight, Transition Speed, Thermoregulation, and Terrain Capability**.

---

## A. Core Gameplay Loops & Gear Trade-Offs

### 1. The Skimo vs. Freeride Dilemma ("Light is Right" vs. "Charge Hard")
* **Uphill Stamina Formula:**
  * *Foot Weight Penalty:* Famous mountaineering rule of thumb: **1 lb on your feet equals 5 lbs on your back.** In game code, ski + binding + boot + skin weight should have a `4.0x` multiplier on uphill cadence stamina drain compared to backpack weight (`1.0x`).
  * *Ankle ROM (Range of Motion):* Boots with >65° ROM allow longer stride lengths on low-angle skin tracks (+18% flat/rolling skinning speed).
* **Downhill Control Formula:**
  * *Ski Mass & Waist Width:* Heavy freeride skis (2,000g+) have high `Dampening` (reduces camera shake and edge loss on tracked-out crud/ice) and high `Float` (prevents submarine tip-diving in deep powder). Ultralight 65mm skimo skis require precise center-of-mass balance inputs from the player in variable snow.

### 2. The Transition Minigame (Interactive Gear Handling)
Transitions at windy ridges are where time is won or lost—and where gear can blow away down a 1,000m face:
* **Skin Ripping:**
  * *Skimo Setup:* Player pulls tip bungee at the ski nose, rips skins off while bindings remain clipped in, stuffs skins inside race suit chest pocket, flips heel lever down. **Total time: 8–12 seconds.**
  * *Freeride/Hybrid Setup:* Player steps out of bindings, scrapes snow/ice off ski bases, pulls skins from tail to tip, folds skins onto cheat sheets (if winds are >50 km/h, risk of skins sticking together or blowing away in a Quick-Time Event), snaps Shift toe piece from walk to ski mode, locks boot buckles. **Total time: 60–90 seconds.**

### 3. Dynamic Thermoregulation Engine
Track three interlocking player states: **Core Temp (37°C)**, **Skin Sweat/Moisture (0%–100%)**, and **Extremity Warmth (Hands/Feet)**.
* **Climbing in a Hardshell + Down Jacket:** Core Temp spikes -> Sweat reaches 80% -> Base layer becomes soaked.
* **Stopping on a Ridge at -15°C with 60 km/h Wind:** If Sweat is high, evaporative cooling causes Core Temp to plummet 3x faster (`Flash Chill` debuff) unless the player immediately puts on a static Belay Parka over their shell and swaps damp uphill liner gloves for dry insulated descent gloves.

### 4. Technical Terrain Gating & Risk Mitigation
Certain gear unlocks faster or safer movement across mountain hazards:
| Terrain Hazard | Without Specialized Gear | With Specialized Gear |
| :--- | :--- | :--- |
| **40° Wind-Scoured Icy Skin Track** | High slip probability on kick-turns; slow progress | **Ski Crampons (Harscheisen):** 100% traction on hardpack uphill |
| **50° Frozen Couloir Bootpack** | Impossible / Fatal slide on ski boots alone | **Skis on A-Frame Pack + Boot Crampons + Dual Ice Axes:** Secure front-pointing ascent |
| **Cliff Band / Chockstone Choke** | Must downclimb or backtrack entire route | **6mm RAD Line + Harness + Ice Screw (V-Thread) / Picket:** Rappel directly through the choke with skis on feet |
| **Glacier Snowbridge** | Unroped fall into hidden crevasse = Game Over | **Roped Team + Micro Traxion + Snow Picket:** Arrest fall and execute 3:1 haul rescue |
| **Overnight Blizzard (-25°C)** | Hypothermia / Frostbite exposure | **Snow Saw + 4-Season Tent + R-7.3 Pad + -20°C Bag + White Gas Stove:** Full stamina & hydration restoration |
