import { describe, expect, it } from "vitest";
import { stepSkier, NEUTRAL_CONTROLS, type Skier } from "./physics.js";
import { planarTerrain } from "./terrain.js";
import { buildSnowModel } from "./snow-model.js";
import type { Environment } from "./environment.js";
import type { SnowModel } from "./snow-model.js";

const DEG = Math.PI / 180;

const winter: Environment = {
  latitude: 46,
  dayOfYear: 15,
  hour: 12,
  // The test slope sits at the snowline, so it stays snow-covered.
  snowlineAltitude: 0,
  storms: [{ daysAgo: 10, centimeters: 30 }],
  stormWindRad: null,
};

function skierOn(slopeDeg: number, condition: Environment = winter, mode: Skier["mode"] = "ski"): {
  skier: Skier;
  model: SnowModel;
  terrain: ReturnType<typeof planarTerrain>;
} {
  const terrain = planarTerrain(slopeDeg * DEG);
  return { skier: { x: 0, z: 0, vx: 0, vz: 0, mode, heading: 0 }, model: buildSnowModel(terrain, condition), terrain };
}

describe("skiing", () => {
  it("accelerates down the fall line on packed snow", () => {
    const { skier, model, terrain } = skierOn(35);
    let s = skier;
    for (let i = 0; i < 60; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, terrain, model);
    expect(s.vx).toBeGreaterThan(2);
    expect(Math.abs(s.vz)).toBeLessThan(0.01);
    expect(s.x).toBeGreaterThan(0);
  });

  it("decelerates to a stop on flat ground without reversing", () => {
    const { skier, model, terrain } = skierOn(0);
    let s: Skier = { ...skier, vx: 8 };
    for (let i = 0; i < 240; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, terrain, model);
    expect(s.vx).toBe(0);
  });

  it("powder is slower than packed at equal speed and slope", () => {
    const packed = skierOn(15);
    const powderEnv: Environment = { ...winter, storms: [{ daysAgo: 1, centimeters: 50 }] };
    const powder = skierOn(15, powderEnv);
    const run = (ctx: ReturnType<typeof skierOn>) => {
      let s: Skier = { ...ctx.skier, vx: 10 };
      for (let i = 0; i < 60; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, ctx.terrain, ctx.model);
      return s.vx;
    };
    expect(run(powder)).toBeLessThan(run(packed));
  });

  it("braking bleeds speed faster than riding", () => {
    const { skier, model, terrain } = skierOn(10);
    const coast = (() => {
      let s: Skier = { ...skier, vx: 12 };
      for (let i = 0; i < 30; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, terrain, model);
      return s.vx;
    })();
    const braked = (() => {
      let s: Skier = { ...skier, vx: 12 };
      for (let i = 0; i < 30; i++) s = stepSkier(s, { ...NEUTRAL_CONTROLS, brake: 1 }, 1 / 60, terrain, model);
      return s.vx;
    })();
    expect(braked).toBeLessThan(coast);
  });

  it("edge input turns the skier", () => {
    const { skier, model, terrain } = skierOn(25);
    let straight: Skier = { ...skier, vx: 10 };
    let turned: Skier = { ...skier, vx: 10 };
    for (let i = 0; i < 30; i++) {
      straight = stepSkier(straight, NEUTRAL_CONTROLS, 1 / 60, terrain, model);
      turned = stepSkier(turned, { ...NEUTRAL_CONTROLS, edge: 1 }, 1 / 60, terrain, model);
    }
    expect(Math.abs(turned.vz)).toBeGreaterThan(Math.abs(straight.vz));
  });
});

describe("climbing", () => {
  it("skins uphill at a sane pace on moderate packed slopes", () => {
    const { skier, model, terrain } = skierOn(20, winter, "climb");
    let s = skier;
    for (let i = 0; i < 60; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, terrain, model);
    expect(s.vx).toBeLessThan(-0.3);
    expect(Math.abs(s.vx)).toBeLessThan(2);
  });

  it("backs off the pace as the slope steepens", () => {
    const moderate = skierOn(15, winter, "climb");
    const steep = skierOn(28, winter, "climb");
    const climb = (ctx: ReturnType<typeof skierOn>) => {
      let s = ctx.skier;
      for (let i = 0; i < 60; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, ctx.terrain, ctx.model);
      return Math.abs(s.vx);
    };
    expect(climb(steep)).toBeLessThan(climb(moderate));
  });

  it("slips back on slopes beyond holding", () => {
    const { skier, model, terrain } = skierOn(55, winter, "climb");
    let s: Skier = { ...skier, x: 0, vx: 0 };
    for (let i = 0; i < 30; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, terrain, model);
    expect(s.vx).toBeGreaterThan(0);
  });

  it("rock is barely climbable and slow", () => {
    // Continental climate: 52 degrees has already sluffed to bare rock.
    const { skier, model, terrain } = skierOn(52, { ...winter, snowClimate: "continental" }, "climb");
    let s = skier;
    for (let i = 0; i < 60; i++) s = stepSkier(s, NEUTRAL_CONTROLS, 1 / 60, terrain, model);
    expect(Math.abs(s.vx)).toBeLessThan(0.8);
  });
});
