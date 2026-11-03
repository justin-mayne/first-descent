import type { SnowClimate } from "./surfaces.js";

const DEG = Math.PI / 180;

export interface Environment {
  /** Degrees north. */
  latitude: number;
  /** 1..365. */
  dayOfYear: number;
  /** Solar hours 0..24. */
  hour: number;
  /** Altitude in meters above which snow can persist. */
  snowlineAltitude: number;
  /** Storm history, most recent first: how many days ago it ended, and total cm. */
  storms: { daysAgo: number; centimeters: number }[];
  /** Prevailing wind while the most recent storm fell, radians; null = calm. */
  stormWindRad: number | null;
  /** How steeply snow adheres here; defaults to temperate. Maritime = coastal AK/PNW. */
  snowClimate?: SnowClimate;
}

/**
 * Solar elevation in radians (NOAA approximation): declination from day of
 * year, hour angle from solar time. Accurate to a degree or two - plenty for
 * which-slope-is-cooking inference.
 */
export function solarElevationRad(env: Environment): number {
  const decl = 23.44 * DEG * Math.sin((2 * Math.PI * (env.dayOfYear - 81)) / 365);
  const hourAngle = 15 * DEG * (env.hour - 12);
  const lat = env.latitude * DEG;
  const sinElev =
    Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
  return Math.asin(Math.min(1, Math.max(-1, sinElev)));
}

/**
 * Sun exposure of a slope right now: dot product of the unit surface normal
 * with the unit sun direction, clamped to [0, 1]. Zero at night, low on
 * shaded (north, N-hemisphere) aspects, high on sun-facing steeps.
 */
export function sunExposure(env: Environment, normal: [number, number, number]): number {
  const elev = solarElevationRad(env);
  if (elev <= 0) return 0;
  const decl = 23.44 * DEG * Math.sin((2 * Math.PI * (env.dayOfYear - 81)) / 365);
  const hourAngle = 15 * DEG * (env.hour - 12);
  const lat = env.latitude * DEG;
  // Sun direction in world coordinates (x east, y up, z south), from
  // elevation and the east-south-west arc of the hour angle.
  const az = Math.atan2(
    -Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)
  );
  const sun: [number, number, number] = [
    Math.cos(elev) * -Math.sin(az),
    Math.sin(elev),
    Math.cos(elev) * -Math.cos(az),
  ];
  const dot = normal[0] * sun[0] + normal[1] * sun[1] + normal[2] * sun[2];
  return Math.min(1, Math.max(0, dot));
}

/**
 * Rough air temperature proxy in Celsius at a given altitude: seasonal
 * sinusoid (coldest mid-January for the northern mid-latitudes) with the
 * standard 6.5 C/km lapse rate.
 */
export function temperatureProxyC(env: Environment, altitude: number): number {
  const seasonal = 2 - 12 * Math.cos((2 * Math.PI * (env.dayOfYear - 15)) / 365) - env.latitude * 0.35;
  return seasonal - 6.5 * (altitude / 1000);
}
