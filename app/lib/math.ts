export function toRad(val: number) {
  return val * Math.PI / 180;
}

export function toDeg(val: number) {
  return val * 180 / Math.PI;
}

// Great-circle distance calculation via Haversine
export function calculateDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generates points along a great circle arc for drawing smooth lines on the globe
export function computeGreatCirclePoints(lat1: number, lon1: number, lat2: number, lon2: number, segments: number = 100) {
  const points: [number, number][] = [];
  const distance = calculateDistanceNM(lat1, lon1, lat2, lon2);
  const angDist = distance / 3440.065; // Angular distance in radians

  for (let i = 0; i <= segments; i++) {
    const fraction = i / segments;
    const A = Math.sin((1 - fraction) * angDist) / Math.sin(angDist);
    const B = Math.sin(fraction * angDist) / Math.sin(angDist);

    const x = A * Math.cos(toRad(lat1)) * Math.cos(toRad(lon1)) + 
              B * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2));
    const y = A * Math.cos(toRad(lat1)) * Math.sin(toRad(lon1)) + 
              B * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2));
    const z = A * Math.sin(toRad(lat1)) + B * Math.sin(toRad(lat2));

    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lon = toDeg(Math.atan2(y, x));
    
    points.push([lon, lat]);
  }
  return points;
}

// Generates an array of points forming a physical radius ring around a center coordinate
export function computeRangeCirclePoints(lat: number, lon: number, radiusNM: number, segments: number = 72): [number, number][] {
  const points: [number, number][] = [];
  const angDist = radiusNM / 3440.065; 

  for (let i = 0; i <= segments; i++) {
    const bearing = (i / segments) * 360;
    const brngRad = toRad(bearing);
    const latRad = toRad(lat);
    const lonRad = toRad(lon);

    const destLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(angDist) +
      Math.cos(latRad) * Math.sin(angDist) * Math.cos(brngRad)
    );

    const destLonRad = lonRad + Math.atan2(
      Math.sin(brngRad) * Math.sin(angDist) * Math.cos(latRad),
      Math.cos(angDist) - Math.sin(latRad) * Math.sin(destLatRad)
    );

    points.push([toDeg(destLonRad), toDeg(destLatRad)]);
  }
  return points;
}

export function computeBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const originLat = lat1 * Math.PI / 180;
  const originLng = lng1 * Math.PI / 180;
  const destLat = lat2 * Math.PI / 180;
  const destLng = lng2 * Math.PI / 180;

  const y = Math.sin(destLng - originLng) * Math.cos(destLat);
  const x = Math.cos(originLat) * Math.sin(destLat) -
            Math.sin(originLat) * Math.cos(destLat) * Math.cos(destLng - originLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function offsetCoordinate(lat: number, lng: number, distanceNM: number, bearing: number) {
  const R = 3440.065; // Earth radius in NM
  const brng = bearing * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceNM / R) + 
                       Math.cos(lat1) * Math.sin(distanceNM / R) * Math.cos(brng));
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(distanceNM / R) * Math.cos(lat1),
                               Math.cos(distanceNM / R) - Math.sin(lat1) * Math.sin(lat2));

  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
}

export function interpolateFlightPosition(lat1: number, lng1: number, lat2: number, lng2: number, fraction: number) {
  const R = 3440.065; // Earth radius in NM
  const d = calculateDistanceNM(lat1, lng1, lat2, lng2) / R;
  
  if (d < 1e-6) return { point: [lng2, lat2] as [number, number], bearing: 0 };
  
  const lat1Rad = lat1 * Math.PI / 180;
  const lng1Rad = lng1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lng2Rad = lng2 * Math.PI / 180;

  const a = Math.sin((1 - fraction) * d) / Math.sin(d);
  const b = Math.sin(fraction * d) / Math.sin(d);

  const x = a * Math.cos(lat1Rad) * Math.cos(lng1Rad) + b * Math.cos(lat2Rad) * Math.cos(lng2Rad);
  const y = a * Math.cos(lat1Rad) * Math.sin(lng1Rad) + b * Math.cos(lat2Rad) * Math.sin(lng2Rad);
  const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);

  const lat3 = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
  const lng3 = Math.atan2(y, x) * 180 / Math.PI;

  const bearing = computeBearing(lat1, lng1, lat2, lng2); // simplify bearing to point to destination overall

  return { point: [lng3, lat3] as [number, number], bearing };
}

export function calculateInitialBearing(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}
