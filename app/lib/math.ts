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
export function computeGreatCirclePoints(
  lat1: number, lon1: number, lat2: number, lon2: number, numPoints: number = 100
): [number, number][] {
  const coords: [number, number][] = [];
  const distance = calculateDistanceNM(lat1, lon1, lat2, lon2);
  const fraction = distance / 3440.065; // Convert back to angular distance

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * fraction) / Math.sin(fraction);
    const B = Math.sin(f * fraction) / Math.sin(fraction);

    const x = A * Math.cos(toRad(lat1)) * Math.cos(toRad(lon1)) + 
              B * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2));
    const y = A * Math.cos(toRad(lat1)) * Math.sin(toRad(lon1)) + 
              B * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2));
    const z = A * Math.sin(toRad(lat1)) + B * Math.sin(toRad(lat2));

    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lon = toDeg(Math.atan2(y, x));
    
    coords.push([lon, lat]);
  }
  return coords;
}

// Interpolate a single exact point along the great circle given a fraction (0.0 to 1.0)
// Also returns the bearing so the plane icon faces the right direction
export function interpolateFlightPosition(
  lat1: number, lon1: number, lat2: number, lon2: number, fraction: number
): { point: [number, number], bearing: number } {
  if (fraction <= 0) return { point: [lon1, lat1], bearing: calculateInitialBearing(lat1, lon1, lat2, lon2) };
  if (fraction >= 1) return { point: [lon2, lat2], bearing: calculateInitialBearing(lat1, lon1, lat2, lon2) };

  const distance = calculateDistanceNM(lat1, lon1, lat2, lon2);
  const angDist = distance / 3440.065;

  const A = Math.sin((1 - fraction) * Math.abs(angDist)) / Math.sin(Math.abs(angDist));
  const B = Math.sin(fraction * Math.abs(angDist)) / Math.sin(Math.abs(angDist));

  const x = A * Math.cos(toRad(lat1)) * Math.cos(toRad(lon1)) + 
            B * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2));
  const y = A * Math.cos(toRad(lat1)) * Math.sin(toRad(lon1)) + 
            B * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2));
  const z = A * Math.sin(toRad(lat1)) + B * Math.sin(toRad(lat2));

  const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const lon = toDeg(Math.atan2(y, x));
  
  // Calculate bearing to next minor point for rotation
  const bearing = calculateInitialBearing(lat1, lon1, lat2, lon2); 

  return { point: [lon, lat], bearing };
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
