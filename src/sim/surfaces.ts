export const SURFACE_TYPES = ["snow", "ice", "rock"] as const;
export type SurfaceType = (typeof SURFACE_TYPES)[number];

export const SNOW_CONDITIONS = ["powder", "packed", "crust", "wet", "icy"] as const;
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
 * Slope-adherence heuristic: snow rarely adheres beyond ~55 degrees and
 * wind/gravitational packing turns very steep terrain into ice or bare rock.
 * Later this becomes imagery- and user-painted overrides.
 */
export function classifySurface(slopeAngleRad: number): SurfaceType {
  if (slopeAngleRad > 55 * DEG) return "rock";
  if (slopeAngleRad > 45 * DEG) return "ice";
  return "snow";
}

export function constantSurface(type: SurfaceType): (x: number, z: number) => SurfaceType {
  return () => type;
}

export function terrainSurface(terrain: { height: (x: number, z: number) => number }): (x: number, z: number) => SurfaceType {
  return (x, z) => {
    const eps = 2;
    const dhdx = (terrain.height(x + eps, z) - terrain.height(x - eps, z)) / (2 * eps);
    const dhdz = (terrain.height(x, z + eps) - terrain.height(x, z - eps)) / (2 * eps);
    return classifySurface(Math.atan(Math.hypot(dhdx, dhdz)));
  };
}
