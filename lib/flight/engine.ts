import { Flight, Aircraft, Player } from '../../types';
import { calculateDistanceNM, computeBearing, interpolateFlightPosition } from '../../app/lib/math';
import { getAirport, shortCity, localTimeAt, nearestCountry, AirportRecord } from './airports';
import { sunAltitudeDeg } from './sun';

export type FlightPhase = 'taxi' | 'takeoff' | 'climb' | 'cruise' | 'descent' | 'approach' | 'landed';

export interface FlightSnapshot {
  progress: number;               // time progress 0..1
  distanceProgress: number;       // fraction of the route flown 0..1
  position: [number, number];     // [lng, lat]
  heading: number;                // degrees true
  phase: FlightPhase;
  phaseLabel: string;
  altitudeFt: number;
  cruiseAltFt: number;
  verticalSpeedFpm: number;
  groundSpeedKts: number;
  distanceFlownNM: number;
  distanceRemainingNM: number;
  msElapsed: number;
  msRemaining: number;            // sim ms until arrival
  flown: [number, number][];
  ahead: [number, number][];
  isComplete: boolean;
}

export interface PhasePlan {
  totalMs: number;
  taxiEnd: number;     // fractions of total time
  takeoffEnd: number;
  climbEnd: number;
  descentStart: number;
  approachStart: number;
  taxiInStart: number;
  cruiseAltFt: number;
}

const MIN = 60 * 1000;

export function cruiseAltitudeFor(aircraft: Pick<Aircraft, 'speedKnots' | 'rangeNM' | 'model'> | null | undefined, distanceNM: number): number {
  const speed = aircraft?.speedKnots ?? 480;
  const range = aircraft?.rangeNM ?? 4000;
  if (speed < 220) return distanceNM < 60 ? 1500 : 3000; // rotorcraft
  if (distanceNM < 150) return 21000;
  if (distanceNM < 300) return 27000;
  if (distanceNM < 700) return 37000;
  if (range >= 7000) return 45000;
  if (range >= 4500) return 43000;
  return 41000;
}

export function planPhases(flight: Pick<Flight, 'departedAt' | 'estimatedArrivalAt' | 'distanceNM'>, aircraft?: Aircraft | null): PhasePlan {
  const totalMs = Math.max(1, flight.estimatedArrivalAt - flight.departedAt);
  const cruiseAltFt = cruiseAltitudeFor(aircraft, flight.distanceNM);
  const heli = (aircraft?.speedKnots ?? 480) < 220;
  // Nominal durations in ms
  let taxi = heli ? 1 * MIN : 3 * MIN;
  let takeoff = 1 * MIN;
  let climb = Math.min(heli ? 4 * MIN : 22 * MIN, totalMs * 0.2);
  let descent = Math.min(heli ? 5 * MIN : 26 * MIN, totalMs * 0.22);
  let approach = heli ? 2 * MIN : 5 * MIN;
  let taxiIn = heli ? 1 * MIN : 2 * MIN;
  const sum = taxi + takeoff + climb + descent + approach + taxiIn;
  if (sum > totalMs * 0.9) {
    const k = (totalMs * 0.9) / sum;
    taxi *= k; takeoff *= k; climb *= k; descent *= k; approach *= k; taxiIn *= k;
  }
  const f = (ms: number) => ms / totalMs;
  const taxiEnd = f(taxi);
  const takeoffEnd = taxiEnd + f(takeoff);
  const climbEnd = takeoffEnd + f(climb);
  const taxiInStart = 1 - f(taxiIn);
  const approachStart = taxiInStart - f(approach);
  const descentStart = approachStart - f(descent);
  return { totalMs, taxiEnd, takeoffEnd, climbEnd, descentStart, approachStart, taxiInStart, cruiseAltFt };
}

/** Relative ground-speed multiplier over time progress (before normalization). */
function speedProfile(p: number, plan: PhasePlan): number {
  if (p < plan.taxiEnd) return 0.03;
  if (p < plan.takeoffEnd) return 0.03 + 0.37 * ((p - plan.taxiEnd) / Math.max(1e-6, plan.takeoffEnd - plan.taxiEnd));
  if (p < plan.climbEnd) return 0.4 + 0.65 * easeOut((p - plan.takeoffEnd) / Math.max(1e-6, plan.climbEnd - plan.takeoffEnd));
  if (p < plan.descentStart) return 1.05;
  if (p < plan.approachStart) return 1.05 - 0.6 * easeInOut((p - plan.descentStart) / Math.max(1e-6, plan.approachStart - plan.descentStart));
  if (p < plan.taxiInStart) return 0.45 - 0.3 * ((p - plan.approachStart) / Math.max(1e-6, plan.taxiInStart - plan.approachStart));
  return 0.03;
}

const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 2);
const easeInOut = (t: number) => { t = clamp01(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Integrate the speed profile once per plan (cached by key) so distance
// progress is a smooth monotone function of time progress.
const integralCache = new Map<string, Float32Array>();
const STEPS = 400;
function distanceCurve(plan: PhasePlan): Float32Array {
  const key = [plan.taxiEnd, plan.takeoffEnd, plan.climbEnd, plan.descentStart, plan.approachStart, plan.taxiInStart].map(x => x.toFixed(5)).join('|');
  let curve = integralCache.get(key);
  if (curve) return curve;
  curve = new Float32Array(STEPS + 1);
  let acc = 0;
  for (let i = 1; i <= STEPS; i++) {
    const p0 = (i - 1) / STEPS, p1 = i / STEPS;
    acc += (speedProfile(p0, plan) + speedProfile(p1, plan)) / 2 / STEPS;
    curve[i] = acc;
  }
  for (let i = 0; i <= STEPS; i++) curve[i] /= acc; // normalize to 1
  integralCache.set(key, curve);
  return curve;
}

export function distanceProgressAt(p: number, plan: PhasePlan): number {
  const curve = distanceCurve(plan);
  const x = clamp01(p) * STEPS;
  const i = Math.floor(x);
  if (i >= STEPS) return 1;
  const t = x - i;
  return curve[i] + (curve[i + 1] - curve[i]) * t;
}

export function phaseAt(p: number, plan: PhasePlan): FlightPhase {
  if (p >= 1) return 'landed';
  if (p < plan.taxiEnd) return 'taxi';
  if (p < plan.takeoffEnd) return 'takeoff';
  if (p < plan.climbEnd) return 'climb';
  if (p < plan.descentStart) return 'cruise';
  if (p < plan.approachStart) return 'descent';
  if (p < plan.taxiInStart) return 'approach';
  return 'taxi';
}

export function altitudeAt(p: number, plan: PhasePlan, atMs: number, originElev = 0, destElev = 0): number {
  const cruise = plan.cruiseAltFt;
  if (p < plan.taxiEnd) return originElev;
  if (p < plan.takeoffEnd) return originElev + 800 * clamp01((p - plan.taxiEnd) / Math.max(1e-6, plan.takeoffEnd - plan.taxiEnd));
  if (p < plan.climbEnd) {
    const t = (p - plan.takeoffEnd) / Math.max(1e-6, plan.climbEnd - plan.takeoffEnd);
    return originElev + 800 + (cruise - originElev - 800) * easeOut(t);
  }
  if (p < plan.descentStart) {
    const wobble = Math.sin(atMs / 9000) * 120 + Math.sin(atMs / 23000) * 80;
    return cruise + wobble;
  }
  if (p < plan.approachStart) {
    const t = (p - plan.descentStart) / Math.max(1e-6, plan.approachStart - plan.descentStart);
    return cruise - (cruise - (destElev + 3000)) * easeInOut(t);
  }
  if (p < plan.taxiInStart) {
    const t = (p - plan.approachStart) / Math.max(1e-6, plan.taxiInStart - plan.approachStart);
    return destElev + 3000 * (1 - easeInOut(t));
  }
  return destElev;
}

export function phaseLabel(phase: FlightPhase, altitudeFt: number): string {
  switch (phase) {
    case 'taxi': return 'TAXI';
    case 'takeoff': return 'TAKEOFF';
    case 'climb': return `CLIMB · ${Math.round(altitudeFt / 100)}00 FT`;
    case 'cruise': return `CRUISE · FL${Math.round(altitudeFt / 100)}`;
    case 'descent': return `DESCENT · ${Math.round(altitudeFt / 100)}00 FT`;
    case 'approach': return 'APPROACH';
    case 'landed': return 'LANDED';
  }
}

/** Point along the waypoint polyline at a given distance fraction. */
export function positionAlong(waypoints: { lat: number; lng: number }[], frac: number): { point: [number, number]; heading: number; index: number } {
  const n = waypoints.length;
  if (n === 0) return { point: [0, 0], heading: 0, index: 0 };
  if (n === 1) return { point: [waypoints[0].lng, waypoints[0].lat], heading: 0, index: 0 };
  const f = clamp01(frac) * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  const t = f - i;
  const a = waypoints[i], b = waypoints[i + 1];
  const interp = interpolateFlightPosition(a.lat, a.lng, b.lat, b.lng, t);
  // Heading toward the next waypoint (or from previous at the very end)
  const heading = computeBearing(interp.point[1], interp.point[0], b.lat, b.lng);
  return { point: interp.point, heading: isFinite(heading) ? heading : computeBearing(a.lat, a.lng, b.lat, b.lng), index: i };
}

export function getFlightSnapshot(flight: Flight, aircraft: Aircraft | null | undefined, now: number): FlightSnapshot {
  const plan = planPhases(flight, aircraft);
  const msElapsed = Math.max(0, now - flight.departedAt);
  const progress = clamp01(plan.totalMs > 0 ? msElapsed / plan.totalMs : 1);
  const dp = distanceProgressAt(progress, plan);
  const wps = flight.waypoints && flight.waypoints.length >= 2
    ? flight.waypoints
    : [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }];
  const { point, heading, index } = positionAlong(wps, dp);
  const origin = getAirport(flight.originICAO);
  const dest = getAirport(flight.destinationICAO);
  const phase = phaseAt(progress, plan);
  const altitudeFt = altitudeAt(progress, plan, now, origin?.elev ?? 0, dest?.elev ?? 0);
  const altPrev = altitudeAt(Math.max(0, progress - 0.002), plan, now - 1000, origin?.elev ?? 0, dest?.elev ?? 0);
  const dtMin = (0.002 * plan.totalMs) / MIN;
  const verticalSpeedFpm = dtMin > 0 ? (altitudeFt - altPrev) / dtMin : 0;
  // Ground speed: derivative of distance progress * total distance / time
  const dpPrev = distanceProgressAt(Math.max(0, progress - 0.002), plan);
  const nmPerHourAvg = flight.distanceNM / (plan.totalMs / 3600000);
  const groundSpeedKts = phase === 'landed' ? 0 : Math.max(0, ((dp - dpPrev) / 0.002) * nmPerHourAvg);

  const flown: [number, number][] = [];
  for (let i = 0; i <= index; i++) flown.push([wps[i].lng, wps[i].lat]);
  flown.push(point);
  const ahead: [number, number][] = [point];
  for (let i = index + 1; i < wps.length; i++) ahead.push([wps[i].lng, wps[i].lat]);

  return {
    progress,
    distanceProgress: dp,
    position: point,
    heading,
    phase,
    phaseLabel: phaseLabel(phase, altitudeFt),
    altitudeFt,
    cruiseAltFt: plan.cruiseAltFt,
    verticalSpeedFpm,
    groundSpeedKts,
    distanceFlownNM: flight.distanceNM * dp,
    distanceRemainingNM: flight.distanceNM * (1 - dp),
    msElapsed,
    msRemaining: Math.max(0, flight.estimatedArrivalAt - now),
    flown,
    ahead,
    isComplete: progress >= 1,
  };
}

// ---------------------------------------------------------------------------
// VOYAGES — the sea version (constant speed, no altitude)
// ---------------------------------------------------------------------------

export interface VoyageSnapshot {
  progress: number;
  position: [number, number];
  heading: number;
  phase: 'castoff' | 'cruise' | 'approach' | 'moored';
  phaseLabel: string;
  speedKts: number;
  distanceCoveredNM: number;
  distanceRemainingNM: number;
  msRemaining: number;
  flown: [number, number][];
  ahead: [number, number][];
  isComplete: boolean;
}

export function getVoyageSnapshot(v: { departedAt: number; estimatedArrivalAt: number; distanceNM: number; waypoints: { lat: number; lng: number }[] }, now: number): VoyageSnapshot {
  const total = Math.max(1, v.estimatedArrivalAt - v.departedAt);
  const progress = clamp01((now - v.departedAt) / total);
  const wps = v.waypoints && v.waypoints.length >= 2 ? v.waypoints : [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }];
  const { point, heading, index } = positionAlong(wps, progress);
  const hours = total / 3600000;
  const speedKts = progress >= 1 ? 0 : v.distanceNM / hours;
  const phase = progress >= 1 ? 'moored' : progress < 0.03 ? 'castoff' : progress > 0.96 ? 'approach' : 'cruise';
  const labels = { castoff: 'CASTING OFF', cruise: `UNDER WAY · ${Math.round(speedKts)} KTS`, approach: 'ENTERING HARBOUR', moored: 'MOORED' } as const;
  const flown: [number, number][] = []; for (let i = 0; i <= index; i++) flown.push([wps[i].lng, wps[i].lat]); flown.push(point);
  const ahead: [number, number][] = [point]; for (let i = index + 1; i < wps.length; i++) ahead.push([wps[i].lng, wps[i].lat]);
  return { progress, position: point, heading, phase, phaseLabel: labels[phase], speedKts, distanceCoveredNM: v.distanceNM * progress, distanceRemainingNM: v.distanceNM * (1 - progress), msRemaining: Math.max(0, v.estimatedArrivalAt - now), flown, ahead, isComplete: progress >= 1 };
}

// ---------------------------------------------------------------------------
// MOMENTS — deterministic in-flight beats seeded by the flight id
// ---------------------------------------------------------------------------

export type MomentKind = 'pushback' | 'wheels-up' | 'seatbelt-off' | 'service' | 'chop' | 'sunset' | 'sunrise' | 'crossing' | 'halfway' | 'friend-text' | 'descent' | 'gear-down' | 'touchdown';

export interface FlightMoment {
  id: string;
  kind: MomentKind;
  at: number;        // time progress 0..1
  title: string;
  body: string;
  haptic?: 'light' | 'heavy';
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const OCEANS: { name: string; box: [number, number, number, number] }[] = [
  { name: 'the Mediterranean', box: [-6, 30, 37, 46] },
  { name: 'the Caribbean', box: [-89, 9, -59, 23] },
  { name: 'the Gulf of Mexico', box: [-98, 18, -81, 31] },
  { name: 'the North Sea', box: [-4, 51, 9, 62] },
  { name: 'the Arabian Sea', box: [50, 5, 75, 25] },
  { name: 'the South China Sea', box: [105, 0, 121, 23] },
  { name: 'the Tasman Sea', box: [150, -45, 172, -30] },
  { name: 'the Indian Ocean', box: [40, -45, 110, 20] },
  { name: 'the Atlantic', box: [-70, -55, -5, 65] },
  { name: 'the Pacific', box: [-180, -60, -75, 62] },
  { name: 'the Pacific', box: [120, -60, 180, 62] },
];
function regionName(lng: number, lat: number): string {
  const country = nearestCountry(lng, lat);
  if (country) return country;
  for (const o of OCEANS) { const [w, s, e, n] = o.box; if (lng >= w && lng <= e && lat >= s && lat <= n) return o.name; }
  return 'open water';
}

const SERVICE_LINES = [
  (d: string) => `Cabin service. ${d} as the coastline slides away beneath the wing.`,
  (d: string) => `Second course plated at altitude. ${d} to follow.`,
  (d: string) => `The crew dims the cabin. ${d}, a warm towel, and nothing to do for hours.`,
  (d: string) => `Linen changed, ${d.toLowerCase()} poured, phone face-down. This is the good part.`,
];
const CHOP_LINES = [
  (r: string) => `Light chop over ${r}. Seatbelt sign on for a moment.`,
  (r: string) => `A few bumps crossing ${r}. The captain climbs two thousand feet for smoother air.`,
  (r: string) => `Moderate turbulence over ${r}. Glasses steadied, nobody flinches.`,
];

export function getFlightMoments(flight: Flight, aircraft: Aircraft | null | undefined, player?: Pick<Player, 'tastes'> | null, opts?: { hasCompany?: boolean }): FlightMoment[] {
  const plan = planPhases(flight, aircraft);
  const rnd = mulberry32(hashSeed(flight.id));
  const origin = getAirport(flight.originICAO);
  const dest = getAirport(flight.destinationICAO);
  const originCity = shortCity(origin, flight.originICAO);
  const destCity = shortCity(dest, flight.destinationICAO);
  const moments: FlightMoment[] = [];
  const push = (kind: MomentKind, at: number, title: string, body: string, haptic?: 'light' | 'heavy') =>
    moments.push({ id: `${kind}-${Math.round(at * 1000)}`, kind, at: clamp01(at), title, body, haptic });

  push('pushback', 0, 'Pushback', `Door sealed in ${originCity}. Taxiing to the active runway.`, 'light');
  push('wheels-up', plan.taxiEnd + (plan.takeoffEnd - plan.taxiEnd) * 0.4, 'Wheels up', `Airborne out of ${flight.originICAO}. Climbing.`, 'heavy');
  push('seatbelt-off', plan.climbEnd, 'Seatbelt sign off', `Level at FL${Math.round(plan.cruiseAltFt / 100)}. ${flight.distanceNM > 1500 ? 'Long haul. Settle in.' : 'Short hop. Enjoy it.'}`);

  const cruiseLen = plan.descentStart - plan.climbEnd;
  if (cruiseLen > 0.15) {
    const drink = pickDrink(player?.tastes?.drinks, rnd);
    push('service', plan.climbEnd + cruiseLen * (0.12 + rnd() * 0.1), 'Cabin service', SERVICE_LINES[Math.floor(rnd() * SERVICE_LINES.length)](drink));
  }

  // Turbulence windows (0–2) in cruise
  const chops = cruiseLen > 0.3 ? Math.floor(rnd() * 3) : (cruiseLen > 0.15 ? Math.floor(rnd() * 2) : 0);
  for (let i = 0; i < chops; i++) {
    const at = plan.climbEnd + cruiseLen * (0.25 + rnd() * 0.6);
    const pos = positionAlong(flight.waypoints, distanceProgressAt(at, plan)).point;
    push('chop', at, 'Turbulence', CHOP_LINES[Math.floor(rnd() * CHOP_LINES.length)](regionName(pos[0], pos[1])), 'light');
  }

  // Halfway / crossings
  if (flight.distanceNM > 800) push('halfway', 0.5, 'Halfway', `Point of no return. ${Math.round(flight.distanceNM / 2).toLocaleString()} NM to ${destCity}.`);
  const wps = flight.waypoints || [];
  for (let i = 1; i < wps.length; i++) {
    const a = wps[i - 1], b = wps[i];
    if ((a.lat > 0) !== (b.lat > 0) && Math.abs(a.lat) < 30 && Math.abs(b.lat) < 30) {
      push('crossing', progressForWaypoint(i, wps.length, plan), 'Equator', 'Crossing the equator. The stars will be different tonight.');
    }
    if (Math.abs(a.lng - b.lng) > 180) {
      push('crossing', progressForWaypoint(i, wps.length, plan), 'Date line', 'Crossing the International Date Line. Tomorrow, or yesterday.');
    }
  }

  // Sunset / sunrise at altitude — scan the timeline
  const samples = 48;
  let prevAlt: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const p = i / samples;
    if (p < plan.takeoffEnd || p > plan.approachStart) continue;
    const t = flight.departedAt + p * plan.totalMs;
    const pos = positionAlong(wps, distanceProgressAt(p, plan)).point;
    const alt = sunAltitudeDeg(pos[1], pos[0], t);
    if (prevAlt !== null) {
      if (prevAlt > 0 && alt <= 0) push('sunset', p, 'Sunset at altitude', `The sun drops below the horizon at ${Math.round(plan.cruiseAltFt / 1000)},000 ft. The cabin glows amber.`);
      if (prevAlt <= 0 && alt > 0) push('sunrise', p, 'Sunrise at altitude', `First light over the wing. ${destCity} is waking up ahead.`);
    }
    prevAlt = alt;
  }

  // Someone texts mid-flight
  if (opts?.hasCompany && cruiseLen > 0.2) {
    push('friend-text', plan.climbEnd + cruiseLen * (0.35 + rnd() * 0.3), 'Incoming text', 'Your phone lights up somewhere over the middle of nowhere.');
  }

  const arrivalLocal = dest ? localTimeAt(dest, flight.estimatedArrivalAt) : '';
  push('descent', plan.descentStart, 'Beginning descent', `Descending into ${destCity}${arrivalLocal ? ` — local time on arrival ${arrivalLocal}` : ''}.`);
  push('gear-down', plan.approachStart + (plan.taxiInStart - plan.approachStart) * 0.6, 'Gear down', `${dest?.name || flight.destinationICAO} in sight.`, 'light');
  push('touchdown', plan.taxiInStart, 'Touchdown', `Wheels down at ${flight.destinationICAO}. Welcome to ${destCity}.`, 'heavy');

  return moments.sort((a, b) => a.at - b.at);
}

function progressForWaypoint(index: number, count: number, plan: PhasePlan): number {
  // Invert the distance curve: find time progress whose distance progress ≈ index/(count-1)
  const target = index / Math.max(1, count - 1);
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (distanceProgressAt(mid, plan) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

function pickDrink(tastes: string | undefined, rnd: () => number): string {
  const defaults = ['Champagne', 'A cold mezcal', 'Espresso', 'A glass of natural wine', 'Sparkling water with lime'];
  if (!tastes) return defaults[Math.floor(rnd() * defaults.length)];
  const parts = tastes.split(/,|\band\b/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return defaults[0];
  const pick = parts[Math.floor(rnd() * parts.length)];
  return pick.charAt(0).toUpperCase() + pick.slice(1);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatDurationMs(ms: number): string {
  const totalMins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function describeRoute(flight: Pick<Flight, 'originICAO' | 'destinationICAO'>): { origin: AirportRecord | undefined; dest: AirportRecord | undefined; originCity: string; destCity: string } {
  const origin = getAirport(flight.originICAO);
  const dest = getAirport(flight.destinationICAO);
  return { origin, dest, originCity: shortCity(origin, flight.originICAO), destCity: shortCity(dest, flight.destinationICAO) };
}

export { calculateDistanceNM };
