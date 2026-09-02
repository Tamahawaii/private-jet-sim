import airportsCore from '../../data/airports-core.json';
import countryNames from '../../data/countries.json';
import { guessTimeZone, formatLocalTime } from './timezones';

export interface AirportRecord {
  icao: string;
  iata?: string;
  name: string;
  city?: string;
  country: string; // ISO-3166 alpha-2
  lat: number;
  lng: number;
  size: 'L' | 'M' | 'S';
  elev?: number;
  alias?: string;
}

const AIRPORTS = airportsCore as AirportRecord[];
const BY_ICAO = new Map<string, AirportRecord>();
for (const a of AIRPORTS) BY_ICAO.set(a.icao, a);

export function getAllAirports(): AirportRecord[] {
  return AIRPORTS;
}

export function getAirport(icao: string | null | undefined): AirportRecord | undefined {
  if (!icao) return undefined;
  return BY_ICAO.get(icao.toUpperCase());
}

export function countryName(iso: string | undefined): string {
  if (!iso) return 'Unknown';
  return (countryNames as Record<string, string>)[iso] || iso;
}

/** "Honolulu" from "Honolulu, Oahu" — the short city used in headlines. */
export function shortCity(a: AirportRecord | undefined, fallback = ''): string {
  if (!a) return fallback;
  const c = a.city || a.name;
  return c.split(',')[0].trim();
}

/** Human line like "Nice, France" */
export function placeLine(a: AirportRecord | undefined, fallback = ''): string {
  if (!a) return fallback;
  return `${shortCity(a)}, ${countryName(a.country)}`;
}

/**
 * Approximate UTC offset (hours) from longitude. We have no tz database on
 * the client; a 15°-per-hour estimate is right for the vast majority of
 * airports and good enough for "local time at destination" flavor.
 */
export function approxUtcOffsetHours(lng: number): number {
  return Math.round(lng / 15);
}

/** Local wall-clock time at a longitude (fixed-offset approximation; prefer localTimeAt for airports). */
export function localTimeString(lng: number, atMs: number, country?: string, lat = 0): string {
  return formatLocalTime(atMs, guessTimeZone(country, lng, lat));
}

/** Local time at an airport, DST-aware where the zone is known. */
export function localTimeAt(a: AirportRecord | undefined, atMs: number, withDate = false): string {
  if (!a) return '';
  return formatLocalTime(atMs, guessTimeZone(a.country, a.lng, a.lat), withDate);
}

/** Search across ICAO / IATA / name / city, biggest airports first. */
export function searchAirports(query: string, limit = 24): AirportRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const rank = { L: 0, M: 1, S: 2 } as const;
  const scored: { a: AirportRecord; s: number }[] = [];
  for (const a of AIRPORTS) {
    let s = -1;
    const icao = a.icao.toLowerCase();
    const iata = (a.iata || '').toLowerCase();
    if (icao === q || iata === q) s = 0;
    else if (icao.startsWith(q) || iata.startsWith(q)) s = 1;
    else if ((a.city || '').toLowerCase().startsWith(q)) s = 2;
    else if ((a.city || '').toLowerCase().includes(q)) s = 3;
    else if (a.name.toLowerCase().includes(q)) s = 4;
    else if (countryName(a.country).toLowerCase() === q) s = 5;
    if (s >= 0) scored.push({ a, s: s * 10 + rank[a.size] });
    if (scored.length > 400) break;
  }
  scored.sort((x, y) => x.s - y.s);
  return scored.slice(0, limit).map(x => x.a);
}

/** Country of the nearest sizeable airport — a cheap "what are we flying over" lookup. */
export function nearestCountry(lng: number, lat: number): string | undefined {
  let best: AirportRecord | undefined; let bestD = Infinity;
  const cosLat = Math.cos(lat * Math.PI / 180);
  for (const a of AIRPORTS) {
    if (a.size === 'S') continue;
    const dx = (a.lng - lng) * cosLat, dy = a.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = a; }
  }
  // Farther than ~3° from any airport → open water / wilderness, not a country
  return best && bestD < 9 ? countryName(best.country) : undefined;
}
