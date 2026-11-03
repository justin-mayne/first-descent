import { slopeAt, type Terrain } from "./terrain.js";
import type { SnowModel } from "./snow-model.js";
import { physicsFor } from "./snow-model.js";
import type { SnowAt } from "./snow-model.js";

export const G = 9.81;

/** Peak sustainable climbing pace on skins, meters per second. */
export const CLIMB_BASE_PACE = 1.6;

/** Turn rate at full edge commit and good speed, radians per second. */
export const TURN_RATE = 1.6;

export type Mode = "ski" | "climb";

export interface Skier {
  x: number;
  z: number;
  vx: number;
  vz: number;
  mode: Mode;
  /** Intended travel heading, radians; drives climbing direction. */
  heading: number;
}

export interface Controls {
  /** -1..1 edge commitment; sign is turn direction. */
  edge: number;
  /** 0..1 braking (snowplow / jump-turn check). */
  brake: number;
  /** 0..1 climbing effort. */
  power: number;
}

export const NEUTRAL_CONTROLS: Controls = { edge: 0, brake: 0, power: 1 };

/**
 * Advance the skier one fixed timestep. Pure function: terrain and snow are
 * queried, coefficients resolved per-position, a new state returned.
 */
export function stepSkier(
  skier: Skier,
  controls: Controls,
  dt: number,
  terrain: Terrain,
  snow: SnowModel
): Skier {
  const at: SnowAt = snow.at(skier.x, skier.z);
  const p = physicsFor(at);
  const slope = slopeAt(terrain, skier.x, skier.z);
  return skier.mode === "ski"
    ? stepSki(skier, controls, dt, slope, p)
    : stepClimb(skier, controls, dt, slope, p, at);
}

function stepSki(
  skier: Skier,
  controls: Controls,
  dt: number,
  slope: ReturnType<typeof slopeAt>,
  p: ReturnType<typeof physicsFor>
): Skier {
  const speed = Math.hypot(skier.vx, skier.vz);
  const sin = Math.sin(slope.angleRad);
  const cos = Math.cos(slope.angleRad);

  let ax = 0;
  let az = 0;
  if (speed < 1e-6) {
    // Static holding: gravity must exceed static friction to start moving.
    if (sin > p.glideFriction * cos) {
      ax = G * sin * cos * slope.downhill[0];
      az = G * sin * cos * slope.downhill[1];
    }
  } else {
    const ux = skier.vx / speed;
    const uz = skier.vz / speed;

    // Gravity along the fall line, projected to horizontal motion.
    ax = G * sin * cos * slope.downhill[0];
    az = G * sin * cos * slope.downhill[1];

    // Running friction, braking, and edge drag oppose motion.
    const mu = p.glideFriction + controls.brake * 0.5 + Math.abs(controls.edge) * 0.1 * (1 - p.edgeGrip);
    let fric = mu * G * cos * cos;
    // Quadratic flow drag (deep snow taxes speed).
    const drag = p.flowDrag * speed * speed;
    const decel = fric + drag;
    if (decel * dt >= speed) {
      return { ...skier, vx: 0, vz: 0 };
    }
    ax -= ux * decel;
    az -= uz * decel;

    // Steering: edge input rotates velocity; grip caps how much authority exists.
    const authority = p.edgeGrip;
    const turn = controls.edge * TURN_RATE * authority * Math.min(1, speed / 6) * dt;
    const cosT = Math.cos(turn);
    const sinT = Math.sin(turn);
    const vx = skier.vx * cosT - skier.vz * sinT;
    const vz = skier.vx * sinT + skier.vz * cosT;
    skier = { ...skier, vx, vz };
  }

  return {
    ...skier,
    x: skier.x + skier.vx * dt + 0.5 * ax * dt * dt,
    z: skier.z + skier.vz * dt + 0.5 * az * dt * dt,
    vx: skier.vx + ax * dt,
    vz: skier.vz + az * dt,
  };
}

function stepClimb(
  skier: Skier,
  controls: Controls,
  dt: number,
  slope: ReturnType<typeof slopeAt>,
  p: ReturnType<typeof physicsFor>,
  at: SnowAt
): Skier {
  const uphill = [-slope.downhill[0], -slope.downhill[1]];
  const angle = slope.angleRad;
  const boots = angle > p.skinSlipAngleRad;

  // Above the boot-hold angle nothing sticks: slide back downhill.
  if (angle > p.bootHoldAngleRad) {
    const slipAccel = G * Math.sin(angle) * Math.cos(angle) * 0.6;
    return {
      ...skier,
      x: skier.x + skier.vx * dt + 0.5 * slipAccel * slope.downhill[0] * dt * dt,
      z: skier.z + skier.vz * dt + 0.5 * slipAccel * slope.downhill[1] * dt * dt,
      vx: skier.vx + slipAccel * slope.downhill[0] * dt,
      vz: skier.vz + slipAccel * slope.downhill[1] * dt,
    };
  }

  // Pace decays with angle; boots are slower than skins.
  const hold = boots ? p.bootHoldAngleRad : p.skinSlipAngleRad;
  const anglePenalty = Math.max(0, 1 - Math.pow(angle / hold, 2));
  const bootPenalty = boots ? 0.6 : 1;
  const snowPenalty = at.snowDepth < 0.5 ? 0.7 : 1;
  const pace = CLIMB_BASE_PACE * controls.power * p.climbPace * anglePenalty * bootPenalty * snowPenalty;

  return {
    ...skier,
    x: skier.x + uphill[0] * pace * dt,
    z: skier.z + uphill[1] * pace * dt,
    vx: uphill[0] * pace,
    vz: uphill[1] * pace,
  };
}
