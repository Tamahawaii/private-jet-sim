import type { StyleSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl';
import type { MapStyleId, MapProjection } from '../../lib/store';

/** Ids of the overlay sources the engine feeds each tick. */
export const SRC = {
  land: 'js-land',
  borders: 'js-borders',
  night: 'js-night',
  routesAhead: 'js-routes-ahead',
  routesFlown: 'js-routes-flown',
  provRoute: 'js-prov-route',
  range: 'js-range',
  airports: 'js-airports',
  events: 'js-events',
  resorts: 'js-resorts',
  planes: 'js-planes',
  radar: 'js-radar',
  passport: 'js-passport',
} as const;

export const LYR = {
  planesAir: 'js-planes-air',
  planesParked: 'js-planes-parked',
  planesHalo: 'js-planes-halo',
  events: 'js-events',
  resorts: 'js-resorts',
  airports: 'js-airports',
  radar: 'js-radar',
  labels: 'js-labels-tiles',
} as const;

export const CLICKABLE_LAYERS = [LYR.planesAir, LYR.planesParked, LYR.events, LYR.resorts, LYR.airports];

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as const;

const CARTO_SUBS = ['a', 'b', 'c', 'd'];
const carto = (layer: string) => CARTO_SUBS.map(s => `https://${s}.basemaps.cartocdn.com/${layer}/{z}/{x}/{y}@2x.png`);
const ESRI_SAT = ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'];
export const RADAR_TILES = ['https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png'];

export interface Palette {
  ocean: string;
  land: string;
  landOutline: string;
  border: string;
  nightOpacity: number;
  routeAhead: string;
  routeFlown: string;
  routeGlow: string;
  airport: string;
  isLight: boolean;
}

export function paletteFor(styleId: MapStyleId): Palette {
  switch (styleId) {
    case 'Roads':
      return { ocean: '#c6d6e2', land: '#ecebe4', landOutline: 'rgba(60,80,100,0.35)', border: 'rgba(60,80,100,0.25)', nightOpacity: 0.12, routeAhead: 'rgba(20,40,60,0.55)', routeFlown: '#0a7ea4', routeGlow: 'rgba(10,126,164,0.45)', airport: '#334155', isLight: true };
    case 'Satellite':
      return { ocean: '#04111d', land: '#1a2a1e', landOutline: 'rgba(200,220,240,0.12)', border: 'rgba(200,220,240,0.10)', nightOpacity: 0.2, routeAhead: 'rgba(255,255,255,0.55)', routeFlown: '#7df9ff', routeGlow: 'rgba(0,240,255,0.5)', airport: '#cbd5e1', isLight: false };
    case 'FlightAware':
      return { ocean: '#05100e', land: '#0f2a24', landOutline: 'rgba(120,255,200,0.16)', border: 'rgba(120,255,200,0.10)', nightOpacity: 0.12, routeAhead: 'rgba(160,255,220,0.5)', routeFlown: '#8bffd6', routeGlow: 'rgba(60,255,180,0.45)', airport: '#7dd3b5', isLight: false };
    default:
      return { ocean: '#070b12', land: '#151c26', landOutline: 'rgba(140,170,210,0.16)', border: 'rgba(140,170,210,0.10)', nightOpacity: 0.13, routeAhead: 'rgba(255,255,255,0.5)', routeFlown: '#9ff5ff', routeGlow: 'rgba(0,240,255,0.55)', airport: '#94a3b8', isLight: false };
  }
}

function tileSource(tiles: string[], attribution: string, maxzoom = 19): SourceSpecification {
  return { type: 'raster', tiles, tileSize: 256, maxzoom, attribution };
}

/**
 * Builds the full style: a stylized vector globe (instant, offline-safe)
 * with raster detail tiles fading in as you zoom, plus the empty overlay
 * sources the engine animates.
 */
export function buildStyle(styleId: MapStyleId, projection: MapProjection): StyleSpecification {
  const p = paletteFor(styleId);
  const sources: Record<string, SourceSpecification> = {
    [SRC.land]: { type: 'geojson', data: '/geo/land-110m.json' },
    [SRC.borders]: { type: 'geojson', data: '/geo/borders-110m.json' },
    [SRC.night]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.routesAhead]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.routesFlown]: { type: 'geojson', data: EMPTY_FC as never, lineMetrics: true },
    [SRC.provRoute]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.range]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.airports]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.events]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.resorts]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.planes]: { type: 'geojson', data: EMPTY_FC as never },
    [SRC.passport]: { type: 'geojson', data: EMPTY_FC as never },
  };

  const cartoAttr = '© <a href="https://carto.com/attributions">CARTO</a> © OpenStreetMap contributors';
  let baseTiles: SourceSpecification | null = null;
  let labelTiles: SourceSpecification | null = null;
  let baseOpacity: unknown = 1;
  if (styleId === 'Satellite') {
    baseTiles = tileSource(ESRI_SAT, 'Imagery © Esri, Maxar, Earthstar Geographics');
    baseOpacity = ['interpolate', ['linear'], ['zoom'], 0, 0.75, 3, 1];
  } else if (styleId === 'Roads') {
    baseTiles = tileSource(carto('rastertiles/voyager_nolabels'), cartoAttr);
    labelTiles = tileSource(carto('rastertiles/voyager_only_labels'), cartoAttr);
    baseOpacity = ['interpolate', ['linear'], ['zoom'], 2, 0, 4, 1];
  } else {
    baseTiles = tileSource(carto('dark_nolabels'), cartoAttr);
    labelTiles = tileSource(carto('dark_only_labels'), cartoAttr);
    baseOpacity = ['interpolate', ['linear'], ['zoom'], 2.5, 0, 4.5, styleId === 'FlightAware' ? 0.6 : 0.92];
  }
  if (baseTiles) sources['js-base-tiles'] = baseTiles;
  if (labelTiles) sources['js-label-tiles'] = labelTiles;

  const layers: LayerSpecification[] = [
    { id: 'js-bg', type: 'background', paint: { 'background-color': p.ocean } },
    { id: 'js-land', type: 'fill', source: SRC.land, paint: { 'fill-color': p.land, 'fill-opacity': 1 } },
    { id: 'js-land-outline', type: 'line', source: SRC.land, paint: { 'line-color': p.landOutline, 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 5, 1.2] } },
    { id: 'js-borders', type: 'line', source: SRC.borders, paint: { 'line-color': p.border, 'line-width': 0.7, 'line-dasharray': [3, 2] } },
  ];
  if (baseTiles) layers.push({ id: 'js-base-tiles', type: 'raster', source: 'js-base-tiles', paint: { 'raster-opacity': baseOpacity as number, 'raster-fade-duration': 300 } });

  // Day/night: three nested rings for a soft terminator
  for (let i = 0; i < 3; i++) {
    layers.push({ id: `js-night-${i}`, type: 'fill', source: SRC.night, filter: ['==', ['get', 'ring'], i], paint: { 'fill-color': p.isLight ? '#0b1a2a' : '#000208', 'fill-opacity': p.nightOpacity, 'fill-antialias': false } });
  }

  layers.push(
    { id: 'js-range-fill', type: 'fill', source: SRC.range, paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.035 } },
    { id: 'js-range-line', type: 'line', source: SRC.range, paint: { 'line-color': '#22d3ee', 'line-width': 1.2, 'line-opacity': 0.6, 'line-dasharray': [4, 3] } },
    { id: 'js-passport-routes', type: 'line', source: SRC.passport, paint: { 'line-color': '#22d3ee', 'line-width': 1.2, 'line-opacity': 0.55 } },
    { id: 'js-routes-ahead', type: 'line', source: SRC.routesAhead, layout: { 'line-cap': 'round' }, paint: { 'line-color': p.routeAhead, 'line-width': 1.6, 'line-opacity': 0.9, 'line-dasharray': [1.5, 2.5] } },
    { id: 'js-routes-flown-glow', type: 'line', source: SRC.routesFlown, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.routeGlow, 'line-width': 9, 'line-blur': 6, 'line-opacity': 0.9 } },
    { id: 'js-routes-flown', type: 'line', source: SRC.routesFlown, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.routeFlown, 'line-width': 2.2, 'line-opacity': 1 } },
    { id: 'js-prov-glow', type: 'line', source: SRC.provRoute, layout: { 'line-cap': 'round' }, paint: { 'line-color': p.routeGlow, 'line-width': 8, 'line-blur': 6, 'line-opacity': 0.7 } },
    { id: 'js-prov', type: 'line', source: SRC.provRoute, layout: { 'line-cap': 'round' }, paint: { 'line-color': p.routeFlown, 'line-width': 2, 'line-dasharray': [2, 2] } },
    { id: LYR.airports, type: 'circle', source: SRC.airports, minzoom: 3.6,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3.6, ['match', ['get', 'size'], 'L', 2, 'M', 1.1, 0.8], 8, ['match', ['get', 'size'], 'L', 5, 'M', 3.5, 2.5]],
        'circle-color': p.airport,
        'circle-opacity': ['interpolate', ['linear'], ['zoom'],
          3.6, ['case', ['boolean', ['get', 'inRange'], true], ['match', ['get', 'size'], 'L', 0.55, 'M', 0.14, 0.08], 0.06],
          6.5, ['case', ['boolean', ['get', 'inRange'], true], ['match', ['get', 'size'], 'L', 0.8, 'M', 0.5, 0.35], 0.1]],
        'circle-stroke-color': p.isLight ? '#ffffff' : '#0a0f18', 'circle-stroke-width': 0.8,
      } },
    { id: 'js-resorts-halo', type: 'circle', source: SRC.resorts, paint: { 'circle-radius': 11, 'circle-color': '#f5a7a7', 'circle-opacity': ['case', ['boolean', ['get', 'inRange'], true], 0.16, 0.04], 'circle-blur': 0.6 } },
    { id: LYR.resorts, type: 'circle', source: SRC.resorts, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.2, 6, 5.5], 'circle-color': '#f5a7a7', 'circle-opacity': ['case', ['boolean', ['get', 'inRange'], true], 0.95, 0.3], 'circle-stroke-color': '#0a0f18', 'circle-stroke-width': 1.2 } },
    { id: 'js-events-halo', type: 'circle', source: SRC.events, paint: { 'circle-radius': ['case', ['boolean', ['get', 'isProximate'], false], 16, 11], 'circle-color': '#d4af37', 'circle-opacity': ['case', ['boolean', ['get', 'inRange'], true], ['case', ['boolean', ['get', 'isProximate'], false], 0.3, 0.14], 0.04], 'circle-blur': 0.7 } },
    { id: LYR.events, type: 'circle', source: SRC.events, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.6, 6, 6], 'circle-color': '#d4af37', 'circle-opacity': ['case', ['boolean', ['get', 'inRange'], true], 1, 0.3], 'circle-stroke-color': '#0a0f18', 'circle-stroke-width': 1.2 } },
    { id: LYR.planesHalo, type: 'circle', source: SRC.planes, filter: ['==', ['get', 'selected'], true], paint: { 'circle-radius': 22, 'circle-color': '#22d3ee', 'circle-opacity': 0.22, 'circle-blur': 0.8 } },
    { id: LYR.planesParked, type: 'symbol', source: SRC.planes, filter: ['==', ['get', 'inFlight'], false],
      layout: { 'icon-image': ['case', ['==', ['get', 'selected'], true], 'jet-selected', 'jet-parked'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.42, 6, 0.6], 'icon-rotate': -20, 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      paint: { 'icon-opacity': 0.95 } },
    { id: LYR.planesAir, type: 'symbol', source: SRC.planes, filter: ['==', ['get', 'inFlight'], true],
      layout: { 'icon-image': ['case', ['==', ['get', 'selected'], true], 'jet-selected', 'jet-air'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.55, 6, 0.85], 'icon-rotate': ['get', 'heading'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      paint: { 'icon-opacity': 1 } },
  );
  if (labelTiles) layers.push({ id: LYR.labels, type: 'raster', source: 'js-label-tiles', paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 2.5, 0, 4.5, 0.9], 'raster-fade-duration': 300 } });

  const style: StyleSpecification = {
    version: 8,
    name: `jetstream-${styleId}`,
    sources,
    layers,
    projection: { type: projection === 'globe' ? 'globe' : 'mercator' },
    sky: {
      'sky-color': p.isLight ? '#9dc3e6' : '#050a14',
      'horizon-color': p.isLight ? '#dfeef8' : '#1a3554',
      'fog-color': p.isLight ? '#c6d6e2' : '#070b12',
      'sky-horizon-blend': 0.55,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.85,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
    },
  };
  return style;
}
