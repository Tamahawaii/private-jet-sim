import SunCalc from 'suncalc';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Sub-solar point (where the sun is directly overhead) at a given instant. */
export function subsolarPoint(atMs: number): { lat: number; lng: number } {
  const d = new Date(atMs);
  // Days since J2000.0
  const jd = atMs / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;         // mean longitude of the sun
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;   // mean anomaly
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD; // ecliptic longitude
  const eps = (23.439 - 0.0000004 * n) * RAD;          // obliquity
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  // Equation of time (minutes), simplified
  const y = Math.tan(eps / 2) ** 2;
  const L0 = L * RAD;
  const eot = 4 * DEG * (y * Math.sin(2 * L0) - 2 * 0.0167 * Math.sin(g) + 4 * 0.0167 * y * Math.sin(g) * Math.cos(2 * L0)
    - 0.5 * y * y * Math.sin(4 * L0) - 1.25 * 0.0167 * 0.0167 * Math.sin(2 * g));
  const utcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  // Solar noon longitude: sun is overhead where local solar time = 12:00
  let lng = -(utcMinutes + eot - 720) / 4;
  lng = ((lng + 540) % 360) - 180;
  return { lat: decl * DEG, lng };
}

/**
 * Builds the night-side polygon for the day/night terminator. The polygon is
 * the set of points more than 90° (plus a small twilight offset) from the
 * sub-solar point, traced as a great circle and closed over the pole.
 */
export function nightPolygon(atMs: number, twilightDeg = 0): GeoJSON.Feature<GeoJSON.Polygon> {
  const sun = subsolarPoint(atMs);
  const anti = { lat: -sun.lat, lng: ((sun.lng + 360) % 360) - 180 }; // antisolar point (center of night)
  const radiusDeg = 90 - twilightDeg;
  const ring: [number, number][] = [];
  const latR = anti.lat * RAD, lngR = anti.lng * RAD, dR = radiusDeg * RAD;
  const steps = 180;
  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(latR) * Math.cos(dR) + Math.cos(latR) * Math.sin(dR) * Math.cos(brng));
    const lng2 = lngR + Math.atan2(Math.sin(brng) * Math.sin(dR) * Math.cos(latR), Math.cos(dR) - Math.sin(latR) * Math.sin(lat2));
    ring.push([lng2 * DEG, lat2 * DEG]);
  }
  // Unwrap longitudes so the ring is continuous, then close over the pole
  // that lies inside the night hemisphere.
  const unwrapped: [number, number][] = [];
  let prev = ring[0][0];
  let offset = 0;
  for (const [lng, lat] of ring) {
    let l = lng + offset;
    while (l - prev > 180) { offset -= 360; l -= 360; }
    while (l - prev < -180) { offset += 360; l += 360; }
    unwrapped.push([l, lat]);
    prev = l;
  }
  const poleLat = anti.lat >= 0 ? 90 : -90;
  const first = unwrapped[0];
  const last = unwrapped[unwrapped.length - 1];
  // The traced circle may not wrap the full 360° of longitude (it does when
  // the antisolar point is near a pole); handle both cases by capping.
  const coords: [number, number][] = [...unwrapped];
  if (Math.abs(last[0] - first[0]) > 300) {
    coords.push([last[0], poleLat], [first[0], poleLat], first);
  } else {
    coords.push(first);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

export type SunState = 'day' | 'golden' | 'twilight' | 'night';

/** Sun altitude in degrees at a location and instant. */
export function sunAltitudeDeg(lat: number, lng: number, atMs: number): number {
  return SunCalc.getPosition(new Date(atMs), lat, lng).altitude * DEG;
}

export function sunStateAt(lat: number, lng: number, atMs: number): SunState {
  const alt = sunAltitudeDeg(lat, lng, atMs);
  if (alt > 10) return 'day';
  if (alt > 0) return 'golden';
  if (alt > -8) return 'twilight';
  return 'night';
}
