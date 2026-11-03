import { describe, expect, it } from "vitest";
import {
  classifySurface,
  surfacePhysics,
  SNOW_CONDITIONS,
  SURFACE_TYPES,
} from "./surfaces.js";

const DEG = Math.PI / 180;

describe("surface classification", () => {
  it("keeps low angles as snow", () => {
    expect(classifySurface(30 * DEG)).toBe("snow");
  });
  it("turns very steep terrain to ice then rock", () => {
    expect(classifySurface(48 * DEG)).toBe("ice");
    expect(classifySurface(60 * DEG)).toBe("rock");
  });

  it("climate sets how steeply snow adheres", () => {
    expect(classifySurface(52 * DEG, "maritime")).toBe("snow");
    expect(classifySurface(52 * DEG, "temperate")).toBe("ice");
    expect(classifySurface(52 * DEG, "continental")).toBe("rock");
  });
});

describe("coefficient tables", () => {
  it("defines physics for every condition and surface", () => {
    for (const condition of SNOW_CONDITIONS) {
      const p = surfacePhysics("snow", condition);
      expect(p.glideFriction).toBeGreaterThan(0);
      expect(p.edgeGrip).toBeGreaterThan(0);
      expect(p.skinSlipAngleRad).toBeGreaterThan(0);
      expect(p.bootHoldAngleRad).toBeGreaterThan(p.skinSlipAngleRad);
    }
    for (const surface of SURFACE_TYPES) {
      const p = surfacePhysics(surface, "packed");
      expect(p.climbPace).toBeGreaterThan(0);
    }
  });

  it("orders the classic trade-offs sensibly", () => {
    const icy = surfacePhysics("snow", "icy");
    const packed = surfacePhysics("snow", "packed");
    const powder = surfacePhysics("snow", "powder");
    expect(icy.glideFriction).toBeLessThan(packed.glideFriction);
    expect(icy.edgeGrip).toBeLessThan(packed.edgeGrip);
    expect(powder.flowDrag).toBeGreaterThan(packed.flowDrag);
    expect(powder.skinSlipAngleRad).toBeLessThan(packed.skinSlipAngleRad);
  });
});
