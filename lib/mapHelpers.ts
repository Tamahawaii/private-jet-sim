export function isValidLngLat(coords: unknown): coords is {lat: number, lng: number} {
  return coords != null &&
         typeof (coords as any).lat === 'number' && 
         typeof (coords as any).lng === 'number' &&
         !isNaN((coords as any).lat) && 
         !isNaN((coords as any).lng) &&
         isFinite((coords as any).lat) && 
         isFinite((coords as any).lng);
}

export function whenStyleReady(map: any, fn: () => void) {
  if (map.isStyleLoaded()) fn();
  else map.once('styledata', () => whenStyleReady(map, fn));
}
