import { heightmapTerrain, slopeAt, type Terrain } from "../sim/terrain.js";
import { buildSnowModel, type SnowModel } from "../sim/snow-model.js";
import type { Environment } from "../sim/environment.js";
import { stepSkier, type Skier, type Controls } from "../sim/physics.js";
import type { Heightmap } from "../geo/heightmap.js";

export interface RideWorld {
  terrain: Terrain;
  snow: SnowModel;
  map: Heightmap;
}

export function makeRide(map: Heightmap, env: Environment): RideWorld {
  const terrain = heightmapTerrain(map);
  return { terrain, snow: buildSnowModel(terrain, env), map };
}

/** A skier dropping in at a world point, nudged 2 m/s down the fall line. */
export function dropInSkier(world: RideWorld, x: number, z: number): Skier {
  const slope = slopeAt(world.terrain, x, z);
  return {
    x,
    z,
    vx: slope.downhill[0] * 2,
    vz: slope.downhill[1] * 2,
    mode: "ski",
    heading: 0,
  };
}

export function altitudeOf(world: RideWorld, s: Skier): number {
  return world.terrain.height(s.x, s.z);
}

export function rideStep(s: Skier, controls: Controls, world: RideWorld, dt: number): Skier {
  return stepSkier(s, controls, dt, world.terrain, world.snow);
}
