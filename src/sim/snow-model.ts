import type { Terrain } from "./terrain.js";
import { slopeAt } from "./terrain.js";
import { classifySurface, surfacePhysics, type SnowCondition, type SurfaceType } from "./surfaces.js";
import { sunExposure, temperatureProxyC, type Environment } from "./environment.js";

const DEG = Math.PI / 180;

export interface SnowAt {
  surface: SurfaceType;
  condition: SnowCondition;
  /** 0..1 confidence-ish depth proxy; low depth thins glide and exposes hazards. */
  snowDepth: number;
}

export interface SnowModel {
  at(x: number, z: number): SnowAt;
}

const RECENT_STORM_DAYS = 3;

/**
 * Infer surface and snow condition at a point from terrain geometry and the
 * environment: the way a ski mountaineer reads a face. Rules, in order:
 *  - bare slope adherence (steep = rock/ice) and the snowline
 *  - cold snow: fresh storm = powder on wind-sheltered, windslab on leeward
 *  - sun-cooked: warm proxy + sun exposure now = wet
 *  - overnight refreeze on sun-exposed slopes = morning crust
 *  - cold, wind-scoured, steep, dry = icy
 *  - everything else settles toward packed
 */
export function buildSnowModel(terrain: Terrain, env: Environment): SnowModel {
  return {
    at(x: number, z: number): SnowAt {
      const slope = slopeAt(terrain, x, z);
      const altitude = terrain.height(x, z);
      const surface = classifySurface(slope.angleRad, env.snowClimate);
      if (surface !== "snow") {
        return { surface, condition: "packed", snowDepth: 0 };
      }
      if (altitude < env.snowlineAltitude) {
        return { surface: "rock", condition: "packed", snowDepth: 0 };
      }

      const temp = temperatureProxyC(env, altitude);
      const exposure = sunExposure(env, slope.normal);
      const lastStorm = env.storms[0];
      const fresh = lastStorm !== undefined && lastStorm.daysAgo <= RECENT_STORM_DAYS;
      const leeward = env.stormWindRad !== null && windLoaded(slope, env.stormWindRad);

      if (temp < -4) {
        if (fresh && leeward) return { surface: "snow", condition: "windslab", snowDepth: 1 };
        if (fresh) return { surface: "snow", condition: "powder", snowDepth: 1 };
        if (slope.angleRad > 40 * DEG && env.stormWindRad !== null) {
          return { surface: "snow", condition: "icy", snowDepth: 0.4 };
        }
        return { surface: "snow", condition: "packed", snowDepth: 0.8 };
      }

      if (temp > -1 && exposure > 0.35) {
        return { surface: "snow", condition: "wet", snowDepth: 0.7 };
      }
      if (exposure > 0.15 && env.hour < 10) {
        return { surface: "snow", condition: "crust", snowDepth: 0.6 };
      }
      if (fresh) {
        return { surface: "snow", condition: leeward ? "windslab" : "powder", snowDepth: 1 };
      }
      return { surface: "snow", condition: "packed", snowDepth: 0.8 };
    },
  };
}

/** Leeward check: the slope falls away from the wind (cross-slope component). */
function windLoaded(slope: { downhill: [number, number] }, windRad: number): boolean {
  const windX = Math.sin(windRad);
  const windZ = Math.cos(windRad);
  const cross = windX * -slope.downhill[1] + windZ * slope.downhill[0];
  return cross > 0.3;
}

export function physicsFor(snow: SnowAt) {
  return surfacePhysics(snow.surface, snow.condition);
}
