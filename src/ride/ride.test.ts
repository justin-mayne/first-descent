import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decodeHeightfield, worldOf, type ContractBounds } from "../render/contract-load.js";
import { makeRide, dropInSkier, rideStep, altitudeOf } from "./descent.js";
import { NEUTRAL_CONTROLS, type Skier } from "../sim/physics.js";
import type { Environment } from "../sim/environment.js";

const boundsUrl = new URL("../../assets/sphinx/bounds.json", import.meta.url);
const rawUrl = new URL("../../assets/sphinx/heightmap-16bit.raw", import.meta.url);

function loadRide(): ReturnType<typeof makeRide> {
  const b = JSON.parse(readFileSync(boundsUrl, "utf8")) as ContractBounds;
  const map = decodeHeightfield(new Uint8Array(readFileSync(rawUrl)), b);
  const env: Environment = {
    latitude: 60.5,
    dayOfYear: 110,
    hour: 11,
    snowlineAltitude: 0,
    snowClimate: "maritime",
    storms: [{ daysAgo: 2, centimeters: 60 }],
    stormWindRad: null,
  };
  return makeRide(map, env);
}

describe("riding the real Sphinx heightfield", () => {
  it("drops in over the rollover and carries speed down the face", () => {
    const world = loadRide();
    const b = JSON.parse(readFileSync(boundsUrl, "utf8")) as ContractBounds;
    // DSC_02: committing over the convex blind rollover under the summit.
    const start = worldOf(b.frame, 60.6664, -145.0694);
    let s: Skier = dropInSkier(world, start.x, start.z);
    const startAlt = altitudeOf(world, s);

    let maxSpeed = 0;
    for (let i = 0; i < 1800; i++) {
      s = rideStep(s, NEUTRAL_CONTROLS, world, 1 / 60);
      maxSpeed = Math.max(maxSpeed, Math.hypot(s.vx, s.vz));
    }
    const drop = startAlt - altitudeOf(world, s);
    const disp = Math.hypot(s.x - start.x, s.z - start.z);

    expect(maxSpeed).toBeGreaterThan(12);
    expect(drop).toBeGreaterThan(250);
    expect(disp).toBeGreaterThan(200);
  });

  it("braking keeps the descent slower than letting it run", () => {
    const world = loadRide();
    const b = JSON.parse(readFileSync(boundsUrl, "utf8")) as ContractBounds;
    const start = worldOf(b.frame, 60.6664, -145.0694);
    const ride = (brake: number): number => {
      let s: Skier = dropInSkier(world, start.x, start.z);
      let maxSpeed = 0;
      for (let i = 0; i < 900; i++) {
        s = rideStep(s, { ...NEUTRAL_CONTROLS, brake }, world, 1 / 60);
        maxSpeed = Math.max(maxSpeed, Math.hypot(s.vx, s.vz));
      }
      return maxSpeed;
    };
    expect(ride(1)).toBeLessThan(ride(0));
  });
});
