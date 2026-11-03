import { describe, expect, it } from "vitest";
import { solarElevationRad, temperatureProxyC, type Environment } from "./environment.js";
import { buildSnowModel } from "./snow-model.js";
import { planarTerrain } from "./terrain.js";

const DEG = Math.PI / 180;

const midlat: Environment = {
  latitude: 46,
  dayOfYear: 90,
  hour: 13,
  snowlineAltitude: 1600,
  storms: [{ daysAgo: 1, centimeters: 40 }],
  stormWindRad: null,
};

describe("solar geometry", () => {
  it("peaks near noon and is negative at night", () => {
    const noon = solarElevationRad({ ...midlat, hour: 12 });
    const morning = solarElevationRad({ ...midlat, hour: 8 });
    const night = solarElevationRad({ ...midlat, hour: 1 });
    expect(noon).toBeGreaterThan(morning);
    expect(night).toBeLessThan(0);
  });

  it("summer sun climbs higher than winter sun", () => {
    const summer = solarElevationRad({ ...midlat, dayOfYear: 172, hour: 12 });
    const winter = solarElevationRad({ ...midlat, dayOfYear: 355, hour: 12 });
    expect(summer).toBeGreaterThan(winter);
  });
});

describe("temperature proxy", () => {
  it("gets colder with altitude and in winter", () => {
    expect(temperatureProxyC(midlat, 3000)).toBeLessThan(temperatureProxyC(midlat, 1500));
    expect(temperatureProxyC({ ...midlat, dayOfYear: 15 }, 2000)).toBeLessThan(
      temperatureProxyC({ ...midlat, dayOfYear: 200 }, 2000)
    );
  });
});

describe("condition inference", () => {
  it("cold + fresh storm = powder, wind-loaded = windslab", () => {
    const january: Environment = {
      ...midlat,
      dayOfYear: 15,
      snowlineAltitude: 800,
      storms: [{ daysAgo: 1, centimeters: 40 }],
    };
    const gentle = planarTerrain(20 * DEG);
    const calm = buildSnowModel(gentle, january);
    expect(calm.at(0, 0).condition).toBe("powder");

    // A slope falling away to the east with westerly storm wind loads it.
    const loaded = buildSnowModel(gentle, { ...january, stormWindRad: 270 * DEG });
    expect(loaded.at(0, 0).condition).toBe("windslab");
  });

  it("maritime snow clings to a 55-degree Chugach face", () => {
    const westFace = planarTerrain(55 * DEG);
    const sphinx: Environment = {
      ...midlat,
      latitude: 60.5,
      snowlineAltitude: 0,
      snowClimate: "maritime",
      storms: [{ daysAgo: 1, centimeters: 60 }],
    };
    expect(buildSnowModel(westFace, sphinx).at(0, 0).surface).toBe("snow");
    // The temperate default calls the same face ice.
    const temperate = buildSnowModel(westFace, { ...midlat, snowlineAltitude: 0 });
    expect(temperate.at(0, 0).surface).toBe("ice");
  });

  it("south faces wet out in spring sun while north faces hold dry snow", () => {
    const aprilNoon: Environment = {
      ...midlat,
      dayOfYear: 105,
      hour: 13,
      snowlineAltitude: 1400,
      storms: [{ daysAgo: 10, centimeters: 30 }],
    };
    // South-facing wall: descends toward the north (-z if z points south).
    const southFace = { height: (_x: number, z: number) => z * Math.tan(30 * DEG) };
    const northFace = { height: (_x: number, z: number) => -z * Math.tan(30 * DEG) };
    const south = buildSnowModel(southFace, aprilNoon).at(0, 0);
    const north = buildSnowModel(northFace, aprilNoon).at(0, 0);
    expect(["wet", "crust"]).toContain(south.condition);
    expect(["packed", "powder"]).toContain(north.condition);
  });

  it("bare ground below the snowline", () => {
    const model = buildSnowModel(planarTerrain(20 * DEG), midlat);
    const at = model.at(0, 0);
    expect(at.surface).toBe("rock");
    expect(at.snowDepth).toBe(0);
  });
});
