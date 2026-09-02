'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import { usePathname, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { useStore } from '../../lib/store';
import { Aircraft, Flight, BillionaireEvent, Resort, Persona, PersonaState, Yacht, Voyage, Marina, Residence } from '../../../types';
import { buildStyle, SRC, LYR, CLICKABLE_LAYERS, RADAR_TILES } from './mapStyle';
import { registerIcons } from './icons';
import { getFlightSnapshot, getVoyageSnapshot } from '../../../lib/flight/engine';
import { resolveVoyages } from '../../../lib/estate';
import { nightPolygon } from '../../../lib/flight/sun';
import { getAllAirports, getAirport, shortCity } from '../../../lib/flight/airports';
import { calculateDistanceNM, computeGreatCirclePoints, computeRangeCirclePoints, unwrapPath } from '../../lib/math';
import { getEventNextOccurrence } from '../../lib/events';
import { resolveArrivals } from '../../../lib/simulation';
import MapControls from './MapControls';
import PeekCard from './PeekCard';
import FriendMarkers from './FriendMarkers';
import RouteLabels from './RouteLabels';

const EMPTY: never[] = [];
type FC = GeoJSON.FeatureCollection;
const fc = (features: GeoJSON.Feature[]): FC => ({ type: 'FeatureCollection', features });

/**
 * Frames a path (route) with padding. Computed by hand because fitBounds
 * misreads antimeridian-crossing bounds on the globe (Honolulu → Tokyo).
 */
function frameCoords(map: maplibregl.Map, coords: [number, number][], padding: { top: number; bottom: number; left: number; right: number }, maxZoom = 5, duration = 1400) {
  const un = unwrapPath(coords);
  if (un.length === 0) return;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of un) { minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
  const centerLng = (((minLng + maxLng) / 2 + 540) % 360) - 180;
  const centerLat = (minLat + maxLat) / 2;
  const el = map.getContainer();
  const w = Math.max(200, el.clientWidth - padding.left - padding.right);
  const h = Math.max(200, el.clientHeight - padding.top - padding.bottom);
  const spanLng = Math.max(2, maxLng - minLng) * 1.3;
  const spanLat = Math.max(2, maxLat - minLat) * 1.7;
  const zLng = Math.log2((w * 360) / (512 * spanLng));
  const zLat = Math.log2((h * 180) / (512 * spanLat));
  const zoom = Math.max(0.8, Math.min(maxZoom, zLng, zLat));
  map.easeTo({ center: [centerLng, centerLat], zoom, padding, duration, essential: true });
}

function setData(map: maplibregl.Map, id: string, data: FC | GeoJSON.Feature) {
  const src = map.getSource(id) as GeoJSONSource | undefined;
  if (src) src.setData(data as never);
}

export default function MapEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const mapStyle = useStore(s => s.mapStyle);
  const mapProjection = useStore(s => s.mapProjection);
  const mapLayers = useStore(s => s.mapLayers);
  const selectedAircraftId = useStore(s => s.selectedAircraftId);
  const provisionalRoute = useStore(s => s.provisionalRoute);
  const followSelected = useStore(s => s.followSelected);
  const setFollowSelected = useStore(s => s.setFollowSelected);
  const setPeek = useStore(s => s.setPeek);
  const setSelectedAircraftId = useStore(s => s.setSelectedAircraftId);

  const fleet = (useLiveQuery(() => db.aircraft.toArray()) || EMPTY) as Aircraft[];
  const activeFlights = (useLiveQuery(() => db.flights.filter(f => f.arrivedAt === null).toArray()) || EMPTY) as Flight[];
  const events = (useLiveQuery(() => db.events.toArray()) || EMPTY) as BillionaireEvent[];
  const resorts = (useLiveQuery(() => db.resorts.toArray()) || EMPTY) as Resort[];
  const personas = (useLiveQuery(() => db.personas.toArray()) || EMPTY) as Persona[];
  const personaStates = (useLiveQuery(() => db.personaState.toArray()) || EMPTY) as PersonaState[];
  const yachts = (useLiveQuery(() => db.yachts.toArray()) || EMPTY) as Yacht[];
  const voyages = (useLiveQuery(() => db.yachtVoyages.filter(v => v.arrivedAt === null).toArray()) || EMPTY) as Voyage[];
  const marinas = (useLiveQuery(() => db.marinas.toArray()) || EMPTY) as Marina[];
  const residences = (useLiveQuery(() => db.residences.filter(r => !!r.owned).toArray()) || EMPTY) as Residence[];
  const yachtsRef = useRef(yachts); const voyagesRef = useRef(voyages);
  useEffect(() => { yachtsRef.current = yachts; voyagesRef.current = voyages; }, [yachts, voyages]);

  const fleetRef = useRef(fleet);
  const flightsRef = useRef(activeFlights);
  const selectedRef = useRef(selectedAircraftId);
  const followRef = useRef(followSelected);
  const layersRef = useRef(mapLayers);
  const pathRef = useRef(pathname);
  useEffect(() => {
    fleetRef.current = fleet; flightsRef.current = activeFlights; selectedRef.current = selectedAircraftId;
    followRef.current = followSelected; layersRef.current = mapLayers; pathRef.current = pathname;
  }, [fleet, activeFlights, selectedAircraftId, followSelected, mapLayers, pathname]);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const framedFlightRef = useRef<string | null>(null);
  const lastNightAtRef = useRef(0);
  const arrivalSweepRef = useRef(0);
  const camLockUntilRef = useRef(0);
  const lockCamera = (ms: number) => { camLockUntilRef.current = Date.now() + ms; };

  const isPlanner = pathname.startsWith('/flight/new');
  const isMapRoute = pathname === '/' || pathname === '/world' || (pathname.startsWith('/flight/') && !isPlanner);

  // ---------------------------------------------------------------- init
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const initial = useStore.getState();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(initial.mapStyle, initial.mapProjection),
      center: [-157.9, 21.3],
      zoom: 1.6,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      maxPitch: 60,
      fadeDuration: 200,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    setMapInstance(map);
    // Diagnostics hook (harmless in production; lets a console inspect the live map/store)
    (window as unknown as { __jsMap?: maplibregl.Map; __jsStore?: typeof useStore }).__jsMap = map;
    (window as unknown as { __jsStore?: typeof useStore }).__jsStore = useStore;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.once('load', () => { map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'); });

    const onStyleLoad = async () => {
      readyRef.current = false;
      await registerIcons(map);
      readyRef.current = true;
      setMapReady(true);
      // Force a fresh overlay pass
      lastNightAtRef.current = 0;
      map.fire('js:overlays-refresh');
    };
    map.on('style.load', onStyleLoad);

    // Any user gesture breaks camera follow
    const breakFollow = (e: { originalEvent?: unknown }) => { if (e.originalEvent) useStore.getState().setFollowSelected(false); };
    map.on('dragstart', breakFollow);
    map.on('zoomstart', breakFollow);
    map.on('rotatestart', breakFollow);
    map.on('pitchstart', breakFollow);

    map.on('mousemove', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: CLICKABLE_LAYERS.filter(l => map.getLayer(l)) });
      map.getCanvas().style.cursor = hits.length ? 'pointer' : '';
    });

    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: CLICKABLE_LAYERS.filter(l => map.getLayer(l)) });
      const st = useStore.getState();
      if (!hits.length) { st.setPeek(null); return; }
      // Priority: planes > events > resorts > airports
      const order: string[] = [LYR.planesAir, LYR.planesParked, LYR.yachts, LYR.homes, LYR.events, LYR.resorts, LYR.marinas, LYR.airports];
      hits.sort((a, b) => order.indexOf(a.layer.id) - order.indexOf(b.layer.id));
      const f = hits[0];
      const p = f.properties || {};
      if (f.layer.id === LYR.planesAir || f.layer.id === LYR.planesParked) {
        st.setSelectedAircraftId(String(p.id));
        st.setPeek({ kind: 'aircraft', id: String(p.id) });
      } else if (f.layer.id === LYR.yachts) { st.setSelectedAircraftId(String(p.id)); st.setPeek({ kind: 'yacht', id: String(p.id) }); }
      else if (f.layer.id === LYR.homes) st.setPeek({ kind: 'residence', id: String(p.id) });
      else if (f.layer.id === LYR.events) st.setPeek({ kind: 'event', id: String(p.id) });
      else if (f.layer.id === LYR.resorts) st.setPeek({ kind: 'resort', id: String(p.id) });
      else if (f.layer.id === LYR.marinas) st.setPeek({ kind: 'marina', id: String(p.id) });
      else if (f.layer.id === LYR.airports) st.setPeek({ kind: 'airport', id: String(p.icao) });
    });

    return () => { /* map lives for the app lifetime */ };
  }, []);

  // ---------------------------------------------------------------- style / projection switch
  const styleKeyRef = useRef('');
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const key = `${mapStyle}:${mapProjection}`;
    if (styleKeyRef.current === key) return;
    const first = styleKeyRef.current === '';
    styleKeyRef.current = key;
    if (first) return; // initial style already applied in constructor
    readyRef.current = false;
    map.setStyle(buildStyle(mapStyle, mapProjection), { diff: false });
  }, [mapStyle, mapProjection]);

  // ---------------------------------------------------------------- weather radar layer
  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    const apply = () => {
      if (!map.isStyleLoaded()) return;
      const has = !!map.getLayer(LYR.radar);
      if (mapLayers.weather && !has) {
        if (!map.getSource(SRC.radar)) map.addSource(SRC.radar, { type: 'raster', tiles: RADAR_TILES, tileSize: 256, maxzoom: 10 });
        map.addLayer({ id: LYR.radar, type: 'raster', source: SRC.radar, paint: { 'raster-opacity': 0.55 } }, 'js-range-fill');
      } else if (!mapLayers.weather && has) {
        map.removeLayer(LYR.radar);
        if (map.getSource(SRC.radar)) map.removeSource(SRC.radar);
      }
    };
    apply();
    map.on('js:overlays-refresh', apply);
    return () => { map.off('js:overlays-refresh', apply); };
  }, [mapLayers.weather, mapReady]);

  // ---------------------------------------------------------------- static overlays (airports / events / resorts / range)
  const refreshStatic = useCallback(() => {
    const map = mapRef.current; if (!map || !readyRef.current) return;
    const st = useStore.getState();
    const layers = st.mapLayers;
    const selected = fleetRef.current.find(a => a.id === st.selectedAircraftId || a.tailNumber === st.selectedAircraftId);
    // Range ring + reachability dimming only when you're actively looking at a jet (tapped it, or planning a flight)
    const rangeMode = st.peek?.kind === 'aircraft' || pathRef.current.startsWith('/flight/new');
    const rangeCenter = rangeMode && selected && selected.status === 'parked' && selected.currentLocation ? selected : null;
    const inRange = (lat: number, lng: number) => {
      if (!rangeCenter || !rangeCenter.currentLocation) return true;
      return calculateDistanceNM(rangeCenter.currentLocation.lat, rangeCenter.currentLocation.lng, lat, lng) <= rangeCenter.rangeNM;
    };

    // Airports
    setData(map, SRC.airports, layers.airports ? fc(getAllAirports().filter(a => a.size !== 'S' || a.iata).map(a => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: { icao: a.icao, size: a.size, inRange: inRange(a.lat, a.lng) },
    }))) : fc([]));

    // Events (shifted to the current sim year)
    const simNow = st.getNow();
    setData(map, SRC.events, layers.events ? fc(events.map(raw => {
      const evt = getEventNextOccurrence(raw, simNow);
      const a = getAirport(evt.locationICAO); if (!a) return null;
      const start = new Date(evt.startDate).getTime();
      const isProximate = start - simNow > -3 * 86400000 && start - simNow < 10 * 86400000;
      return { type: 'Feature', geometry: { type: 'Point', coordinates: [a.lng, a.lat] }, properties: { id: evt.id, isProximate, inRange: inRange(a.lat, a.lng) } } as GeoJSON.Feature;
    }).filter(Boolean) as GeoJSON.Feature[]) : fc([]));

    // Resorts
    setData(map, SRC.resorts, layers.resorts ? fc(resorts.filter(r => isFinite(r.lat) && isFinite(r.lng)).map(r => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: { id: r.id, inRange: inRange(r.lat, r.lng) },
    }))) : fc([]));

    // Marinas + owned homes
    setData(map, SRC.marinas, layers.marinas ? fc(marinas.map(m => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [m.lng, m.lat] }, properties: { id: m.id, inRange: inRange(m.lat, m.lng) } }))) : fc([]));
    setData(map, SRC.homes, layers.homes ? fc(residences.map(r => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.coordinates.lng, r.coordinates.lat] }, properties: { id: r.id } }))) : fc([]));

    // Range ring for a selected parked jet
    if (rangeCenter && rangeCenter.currentLocation) {
      const ring = computeRangeCirclePoints(rangeCenter.currentLocation.lat, rangeCenter.currentLocation.lng, rangeCenter.rangeNM, 96);
      setData(map, SRC.range, fc([{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }]));
    } else setData(map, SRC.range, fc([]));

    // Provisional (planning) route
    if (st.provisionalRoute) {
      const pr = st.provisionalRoute;
      const arc = computeGreatCirclePoints(pr.origin.lat, pr.origin.lng, pr.destination.lat, pr.destination.lng, 96);
      setData(map, SRC.provRoute, fc([{ type: 'Feature', geometry: { type: 'LineString', coordinates: arc }, properties: {} }]));
    } else setData(map, SRC.provRoute, fc([]));
  }, [events, resorts]);

  const peekKind = useStore(s => s.peek?.kind);
  useEffect(() => { refreshStatic(); }, [refreshStatic, mapLayers, selectedAircraftId, provisionalRoute, fleet, mapReady, peekKind, pathname]);
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    map.on('js:overlays-refresh', refreshStatic);
    return () => { map.off('js:overlays-refresh', refreshStatic); };
  }, [refreshStatic]);

  // ---------------------------------------------------------------- tick loop (planes, routes, terminator, camera)
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!readyRef.current || !map.isStyleLoaded()) return;
      const st = useStore.getState();
      const now = st.getNow();
      const p = pathRef.current;
      const mapVisible = p === '/' || p === '/world' || p.startsWith('/flight/');
      if (!mapVisible) {
        // Hidden map: only sweep for landings every 2s, no rendering work.
        if (Date.now() - arrivalSweepRef.current > 2000) {
          arrivalSweepRef.current = Date.now();
          if (flightsRef.current.some(f => f.estimatedArrivalAt <= now)) resolveArrivals().catch(console.error);
        }
        return;
      }
      const showFleet = layersRef.current.fleet;
      const planeFeatures: GeoJSON.Feature[] = [];
      const flownFeatures: GeoJSON.Feature[] = [];
      const aheadFeatures: GeoJSON.Feature[] = [];
      let followTarget: [number, number] | null = null;
      let anyComplete = false;

      for (const jet of fleetRef.current) {
        const selected = jet.id === selectedRef.current || jet.tailNumber === selectedRef.current;
        let coords: [number, number] | null = null;
        let heading = 0;
        let inFlight = false;
        if (jet.status === 'in_transit' && jet.currentFlightID) {
          const flight = flightsRef.current.find(f => f.id === jet.currentFlightID);
          if (flight && flight.waypoints && flight.waypoints.length >= 2) {
            const snap = getFlightSnapshot(flight, jet, now);
            coords = snap.position; heading = snap.heading; inFlight = !snap.isComplete;
            if (snap.isComplete) anyComplete = true;
            if (showFleet) {
              if (snap.flown.length >= 2) flownFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: snap.flown }, properties: { id: jet.id, selected } });
              if (snap.ahead.length >= 2) aheadFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: snap.ahead }, properties: { id: jet.id, selected } });
            }
          } else if (flight && flight.estimatedArrivalAt <= now) {
            anyComplete = true;
          }
        }
        if (!coords && jet.currentLocation && isFinite(jet.currentLocation.lat) && isFinite(jet.currentLocation.lng)) {
          coords = [jet.currentLocation.lng, jet.currentLocation.lat];
        }
        if (!coords) continue;
        if (showFleet) planeFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: { id: jet.id, tail: jet.tailNumber, heading, inFlight, selected } });
        if (selected && inFlight) followTarget = coords;
      }
      // Owned yachts: moored at a marina or under way along a voyage
      const yachtFeatures: GeoJSON.Feature[] = [];
      if (layersRef.current.marinas) {
        for (const y of yachtsRef.current) {
          if (!y.owned) continue;
          const selected = y.id === selectedRef.current;
          let coords: [number, number] = [y.currentLocationLng, y.currentLocationLat];
          let heading = 0; let inFlight = false;
          if (y.status === 'cruising' && y.currentVoyageId) {
            const v = voyagesRef.current.find(x => x.id === y.currentVoyageId);
            if (v && v.waypoints.length >= 2) {
              const vs = getVoyageSnapshot(v, now);
              coords = vs.position; heading = vs.heading; inFlight = !vs.isComplete;
              if (vs.isComplete) anyComplete = true;
              if (vs.flown.length >= 2) flownFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: vs.flown }, properties: { id: y.id, selected } });
              if (vs.ahead.length >= 2) aheadFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: vs.ahead }, properties: { id: y.id, selected } });
            }
          }
          if (!isFinite(coords[0]) || !isFinite(coords[1])) continue;
          yachtFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: { id: y.id, heading, inFlight, selected } });
          if (selected && inFlight) followTarget = coords;
        }
      }
      setData(map, SRC.yachts, fc(yachtFeatures));
      setData(map, SRC.planes, fc(planeFeatures));
      setData(map, SRC.routesFlown, fc(flownFeatures));
      setData(map, SRC.routesAhead, fc(aheadFeatures));

      // Day / night terminator (throttled by sim-time drift)
      if (layersRef.current.daylight) {
        if (Math.abs(now - lastNightAtRef.current) > 3 * 60 * 1000) {
          lastNightAtRef.current = now;
          const rings = [0, 3, 6].map((tw, i) => { const f = nightPolygon(now, tw); return { ...f, properties: { ring: i } }; });
          setData(map, SRC.night, fc(rings));
        }
      } else if (lastNightAtRef.current !== -1) {
        lastNightAtRef.current = -1;
        setData(map, SRC.night, fc([]));
      }

      // Camera follow in the flight view
      const onFlightRoute = pathRef.current.startsWith('/flight/') && !pathRef.current.startsWith('/flight/new');
      if (onFlightRoute && followTarget && followRef.current && Date.now() > camLockUntilRef.current) {
        map.easeTo({ center: followTarget, duration: 110, easing: t => t, essential: true });
      }

      // Land flights whose clock ran out (cheap timestamp sweep, at most every 2s)
      if (anyComplete && Date.now() - arrivalSweepRef.current > 2000) {
        arrivalSweepRef.current = Date.now();
        resolveArrivals().catch(console.error);
        resolveVoyages().catch(console.error);
      }
    };
    const id = setInterval(tick, 100);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ---------------------------------------------------------------- camera framing per route
  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    if (pathname === '/' || pathname === '/world') {
      framedFlightRef.current = null;
      return;
    }
    if (pathname.startsWith('/flight/new')) {
      framedFlightRef.current = null;
      if (window.innerWidth < 768) return; // planner covers the map on phones
      if (provisionalRoute) {
        lockCamera(1500);
        frameCoords(map, computeGreatCirclePoints(provisionalRoute.origin.lat, provisionalRoute.origin.lng, provisionalRoute.destination.lat, provisionalRoute.destination.lng, 48), { left: 600, top: 120, right: 60, bottom: 80 }, 5, 1400);
      } else {
        const jet = fleet.find(a => a.id === selectedAircraftId || a.tailNumber === selectedAircraftId);
        if (jet?.currentLocation) { lockCamera(1300); map.easeTo({ center: [jet.currentLocation.lng, jet.currentLocation.lat], zoom: 3.2, padding: { left: 560, top: 0, right: 0, bottom: 0 }, duration: 1200 }); }
      }
      return;
    }
    if (pathname.startsWith('/flight/') && !pathname.startsWith('/flight/new')) {
      const jet = fleet.find(a => a.id === selectedAircraftId || a.tailNumber === selectedAircraftId);
      const flight = jet?.currentFlightID ? activeFlights.find(f => f.id === jet.currentFlightID) : undefined;
      if (!flight) {
        // Just landed: settle over the destination
        if (jet?.status === 'parked' && jet.currentLocation && framedFlightRef.current !== `landed:${jet.tailNumber}:${jet.currentLocationICAO}`) {
          framedFlightRef.current = `landed:${jet.tailNumber}:${jet.currentLocationICAO}`;
          lockCamera(2000);
          map.easeTo({ center: [jet.currentLocation.lng, jet.currentLocation.lat], zoom: 5.5, pitch: 0, duration: 1900, padding: window.innerWidth < 768 ? { top: 0, bottom: 380, left: 0, right: 0 } : { top: 0, bottom: 0, left: 460, right: 0 } });
        }
        return;
      }
      if (framedFlightRef.current === flight.id) return;
      framedFlightRef.current = flight.id;
      // Frame the whole route, then glide down to the jet
      const routeCoords = flight.waypoints.map(w => [w.lng, w.lat] as [number, number]);
      if (routeCoords.length >= 2) {
        const isPhone = window.innerWidth < 768;
        lockCamera(4200);
        frameCoords(map, routeCoords, isPhone ? { top: 120, bottom: 260, left: 40, right: 40 } : { top: 140, bottom: 220, left: 120, right: 120 }, 5, 1400);
        const t = window.setTimeout(() => {
          if (!useStore.getState().followSelected) return;
          const snap = getFlightSnapshot(flight, jet, useStore.getState().getNow());
          const zoom = Math.min(5.2, Math.max(map.getZoom() + 1.2, 3.4));
          lockCamera(2300);
          map.easeTo({ center: snap.position, zoom, pitch: mapProjection === 'flat' ? 35 : 0, duration: 2200, easing: t => 1 - Math.pow(1 - t, 3) });
        }, 1700);
        return () => window.clearTimeout(t);
      }
    }
  }, [pathname, selectedAircraftId, activeFlights.length, fleet.length, mapReady, mapProjection, provisionalRoute]);

  // First look: settle on the player's jet (or home) at a globe-friendly zoom
  const fittedFleetRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady || fittedFleetRef.current || fleet.length === 0) return;
    if (pathname !== '/' && pathname !== '/world') return;
    fittedFleetRef.current = true;
    const st = useStore.getState();
    const sel = fleet.find(a => a.id === st.selectedAircraftId || a.tailNumber === st.selectedAircraftId);
    const jet = sel?.currentLocation ? sel : fleet.find(j => j.currentLocation && isFinite(j.currentLocation.lat) && isFinite(j.currentLocation.lng));
    if (!jet?.currentLocation) return;
    const isPhone = window.innerWidth < 768;
    lockCamera(2600);
    map.easeTo({ center: [jet.currentLocation.lng, jet.currentLocation.lat], zoom: isPhone ? 2.25 : 2.8, duration: 2500, easing: t => 1 - Math.pow(1 - t, 3), padding: isPhone ? { top: 60, bottom: 220, left: 0, right: 0 } : { top: 40, bottom: 40, left: 360, right: 0 } });
  }, [fleet, pathname, mapReady]);

  // Re-center helper used by controls
  const recenter = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    const st = useStore.getState();
    const jet = fleetRef.current.find(a => a.id === st.selectedAircraftId || a.tailNumber === st.selectedAircraftId);
    if (jet?.status === 'in_transit' && jet.currentFlightID) {
      const flight = flightsRef.current.find(f => f.id === jet.currentFlightID);
      if (flight) {
        const snap = getFlightSnapshot(flight, jet, st.getNow());
        st.setFollowSelected(true);
        lockCamera(950);
        map.easeTo({ center: snap.position, zoom: Math.max(map.getZoom(), 3.4), duration: 900 });
        return;
      }
    }
    if (jet?.currentLocation) { lockCamera(950); map.easeTo({ center: [jet.currentLocation.lng, jet.currentLocation.lat], zoom: Math.max(map.getZoom(), 4), duration: 900 }); return; }
    const b = new maplibregl.LngLatBounds();
    fleetRef.current.forEach(j => { if (j.currentLocation) b.extend([j.currentLocation.lng, j.currentLocation.lat]); });
    if (!b.isEmpty()) { lockCamera(1250); map.fitBounds(b, { padding: 100, maxZoom: 3.5, duration: 1200 }); }
  }, []);

  const flyTo = useCallback((lng: number, lat: number, zoom = 5) => {
    const map = mapRef.current; if (!map) return;
    useStore.getState().setFollowSelected(false);
    lockCamera(1250);
    map.easeTo({ center: [lng, lat], zoom, duration: 1200 });
  }, []);

  const onLiveFlightRoute = pathname.startsWith('/flight/') && !pathname.startsWith('/flight/new');
  const selectedJet = fleet.find(a => a.id === selectedAircraftId || a.tailNumber === selectedAircraftId);
  const selectedFlight = onLiveFlightRoute && selectedJet?.currentFlightID ? activeFlights.find(f => f.id === selectedJet.currentFlightID) || null : null;

  return (
    <div className={`absolute inset-0 z-0 bg-[#070b12] ${onLiveFlightRoute ? 'js-flight' : ''}`}>
      <div ref={containerRef} className="w-full h-full" />
      {mapReady && mapInstance && (
        <FriendMarkers map={mapInstance} personas={personas} states={personaStates} visible={mapLayers.friends && (isMapRoute || isPlanner)} />
      )}
      {mapReady && mapInstance && (
        <RouteLabels map={mapInstance} flight={selectedFlight} />
      )}
      {isMapRoute && (
        <>
          <MapControls onRecenter={recenter} showRecenter={onLiveFlightRoute ? !followSelected : true} topOffset={onLiveFlightRoute ? 86 : 0} />
          <PeekCard fleet={fleet} onFlyTo={flyTo} onOpen={(href) => router.push(href)} />
        </>
      )}
    </div>
  );
}
