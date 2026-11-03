export const SURFACE_TYPES = ["snow", "ice", "rock"] as const;
export type SurfaceType = (typeof SURFACE_TYPES)[number];

export const SNOW_CONDITIONS = ["powder", "packed", "crust", "wet", "icy", "windslab"] as const;
export type SnowCondition = (typeof SNOW_CONDITIONS)[number];

export interface SurfacePhysics {
  /** Kinetic friction running flat-base (ski mode). */
  glideFriction: number;
  /** Lateral edge authority while turning, 0..1. Low grip = the ski washes out. */
  edgeGrip: number;
  /** Steepest skinable angle before backsliding, radians. */
  skinSlipAngleRad: number;
  /** Steepest angle booting holds without front-pointing, radians. */
  bootHoldAngleRad: number;
  /** Climbing pace multiplier for the surface. */
  climbPace: number;
  /** Quadratic flow drag; deep fresh snow taxes speed hard. */
  flowDrag: number;
}

const DEG = Math.PI / 180;

const SNOW_TABLE: Record<SnowCondition, SurfacePhysics> = {
  powder: { glideFriction: 0.12, edgeGrip: 0.55, skinSlipAngleRad: 24 * DEG, bootHoldAngleRad: 41 * DEG, climbPace: 0.85, flowDrag: 0.004 },
  packed: { glideFriction: 0.05, edgeGrip: 0.85, skinSlipAngleRad: 25 * DEG, bootHoldAngleRad: 43 * DEG, climbPace: 1.0, flowDrag: 0.0015 },
  crust: { glideFriction: 0.07, edgeGrip: 0.45, skinSlipAngleRad: 23 * DEG, bootHoldAngleRad: 40 * DEG, climbPace: 0.9, flowDrag: 0.002 },
  wet: { glideFriction: 0.15, edgeGrip: 0.7, skinSlipAngleRad: 22 * DEG, bootHoldAngleRad: 39 * DEG, climbPace: 0.8, flowDrag: 0.003 },
  icy: { glideFriction: 0.03, edgeGrip: 0.3, skinSlipAngleRad: 16 * DEG, bootHoldAngleRad: 29 * DEG, climbPace: 0.6, flowDrag: 0.0008 },
  windslab: { glideFriction: 0.04, edgeGrip: 0.9, skinSlipAngleRad: 26 * DEG, bootHoldAngleRad: 45 * DEG, climbPace: 0.95, flowDrag: 0.001 },
};

const ICE_SURFACE: SurfacePhysics = { glideFriction: 0.02, edgeGrip: 0.25, skinSlipAngleRad: 14 * DEG, bootHoldAngleRad: 26 * DEG, climbPace: 0.5, flowDrag: 0.0005 };

const ROCK_SURFACE: SurfacePhysics = { glideFriction: 0.7, edgeGrip: 0.95, skinSlipAngleRad: 50 * DEG, bootHoldAngleRad: 55 * DEG, climbPace: 0.35, flowDrag: 0 };

/** Coefficients for a surface under a given snow condition (ice/rock ignore condition). */
export function surfacePhysics(surface: SurfaceType, condition: SnowCondition): SurfacePhysics {
  if (surface === "ice") return ICE_SURFACE;
  if (surface === "rock") return ROCK_SURFACE;
  return SNOW_TABLE[condition];
}

/**
 * How steeply snow adheres to terrain. Dry continental snowpacks slab off
 * early; dense maritime snow (coastal Alaska, the Pacific Northwest) clings
 * to 60+ degree faces — the Chugach "Big 5" hold perfect snow at angles the
 * temperate heuristic calls rock.
 */
export const SNOW_CLIMATES = ["continental", "temperate", "maritime"] as const;
export type SnowClimate = (typeof SNOW_CLIMATES)[number];

interface AdherenceThresholds {
  /** Above this angle wind-scour and gravity turn snow into ice. */
  snowToIceRad: number;
  /** Above this angle even cohesive snowpacks sluff to bare rock. */
  iceToRockRad: number;
}

const CLIMATE_THRESHOLDS: Record<SnowClimate, AdherenceThresholds> = {
  continental: { snowToIceRad: 40 * DEG, iceToRockRad: 50 * DEG },
  temperate: { snowToIceRad: 45 * DEG, iceToRockRad: 55 * DEG },
  maritime: { snowToIceRad: 55 * DEG, iceToRockRad: 65 * DEG },
};

/**
 * Slope-adherence heuristic: how steeply snow sticks before becoming ice,
 * then bare rock, by snow climate. Later this becomes imagery- and
 * user-painted overrides.
 */
export function classifySurface(slopeAngleRad: number, climate: SnowClimate = "temperate"): SurfaceType {
  const t = CLIMATE_THRESHOLDS[climate];
  if (slopeAngleRad > t.iceToRockRad) return "rock";
  if (slopeAngleRad > t.snowToIceRad) return "ice";
  return "snow";
}

export function constantSurface(type: SurfaceType): (x: number, z: number) => SurfaceType {
  return () => type;
}

export function terrainSurface(
  terrain: { height: (x: number, z: number) => number },
  climate: SnowClimate = "temperate"
): (x: number, z: number) => SurfaceType {
  return (x, z) => {
    const eps = 2;
    const dhdx = (terrain.height(x + eps, z) - terrain.height(x - eps, z)) / (2 * eps);
    const dhdz = (terrain.height(x, z + eps) - terrain.height(x, z - eps)) / (2 * eps);
    return classifySurface(Math.atan(Math.hypot(dhdx, dhdz)), climate);
  };
}
