'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useStore } from '../lib/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Aircraft } from '../../types';
import { aircraftRepo } from '../../lib/repositories/aircraft';
import { interpolateFlightPosition, computeGreatCirclePoints, computeBearing, offsetCoordinate, computeRangeCirclePoints } from '../lib/math';
import { Layers, Maximize, Minimize, FastForward, CloudRain, Plane, MapPin, Map as MapIcon, ShieldAlert, Building, Calendar, Focus, Plus, Minus, Maximize2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { resolveArrivals } from '../../lib/simulation';
import { getEventNextOccurrence } from '../lib/events';
import TimeSkipModal from './TimeSkipModal';
import airportsData from '../../data/airports.json';

export default function MapEngine() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const airportsRef = useRef<any[]>([]);

  const { selectedAircraftId, provisionalRoute, mapStyle, setMapStyle, zenMode, setZenMode, timeMultiplier, setTimeMultiplier } = useStore();
  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
  const activeFlights = useLiveQuery(() => db.flights.filter((f: any) => f.arrivedAt === null).toArray()) || [];
  const fleetRef = useRef(fleet);
  const activeFlightsRef = useRef(activeFlights);
  const pathname = usePathname();
  const hasCenteredRef = useRef(false);

  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [showFleet, setShowFleet] = useState(true);
  const [showAirports, setShowAirports] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [showFriends, setShowFriends] = useState(true);
  const [timeSkipOpen, setTimeSkipOpen] = useState(false);
  
  const showFleetRef = useRef(showFleet);
  const showAirportsRef = useRef(showAirports);
  const showEventsRef = useRef(showEvents);
  const showFriendsRef = useRef(showFriends);
  
  const rawEvents = useLiveQuery(() => db.events.toArray()) || [];
  const eventsRef = useRef(rawEvents);

  const rawPersonas = useLiveQuery(() => db.personas.toArray()) || [];
  const rawPersonaStates = useLiveQuery(() => db.personaState.toArray()) || [];
  const personasRef = useRef(rawPersonas);
  const personaStatesRef = useRef(rawPersonaStates);
  
  const router = useRouter();

  const [airportsDataState, setAirportsData] = useState<any[]>([]);

  useEffect(() => { fleetRef.current = fleet; }, [fleet]);
  useEffect(() => { activeFlightsRef.current = activeFlights; }, [activeFlights]);
  useEffect(() => { showFleetRef.current = showFleet; }, [showFleet]);
  useEffect(() => { showAirportsRef.current = showAirports; }, [showAirports]);
  useEffect(() => { showEventsRef.current = showEvents; }, [showEvents]);
  useEffect(() => { showFriendsRef.current = showFriends; }, [showFriends]);
  useEffect(() => { eventsRef.current = rawEvents; }, [rawEvents]);
  useEffect(() => { personasRef.current = rawPersonas; }, [rawPersonas]);
  useEffect(() => { personaStatesRef.current = rawPersonaStates; }, [rawPersonaStates]);

  // Fit bounds to fleet on initial CMD CENTER mount
  useEffect(() => {
     if (!map.current || hasCenteredRef.current || fleet.length === 0) return;
     if (pathname === '/' || pathname === '/world') {
         if (selectedAircraftId) return; // Tracking specific aircraft
         const bounds = new maplibregl.LngLatBounds();
         fleet.forEach((jet: Aircraft) => {
            if (jet.currentLocation && !isNaN(jet.currentLocation.lng) && !isNaN(jet.currentLocation.lat) && jet.currentLocation.lng !== null && jet.currentLocation.lat !== null) {
                bounds.extend([jet.currentLocation.lng, jet.currentLocation.lat]);
            }
         });
         if (!bounds.isEmpty()) {
            map.current.fitBounds(bounds, { padding: 100, maxZoom: 5, duration: 2000 });
            hasCenteredRef.current = true;
         }
     }
  }, [fleet, pathname, selectedAircraftId]);

  useEffect(() => {
     setAirportsData(airportsData as any);
  }, []);

  useEffect(() => {
    if (!map.current || airportsDataState.length === 0) return;
    const m = map.current;
    
    if (showAirports && !m.getSource('airports-source')) {
      m.addSource('airports-source', {
         type: 'geojson',
         data: {
           type: 'FeatureCollection',
           features: airportsDataState.filter(a => a && a.lat !== null && a.lng !== null && !isNaN(a.lat) && !isNaN(a.lng)).map(a => ({
             type: 'Feature',
             geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
             properties: { icao: a.icao, name: a.name }
           }))
         }
      });
      m.addLayer({
         id: 'airports-layer',
         type: 'circle',
         source: 'airports-source',
         minzoom: 4,
         paint: {
           'circle-radius': 3,
           'circle-color': '#888',
           'circle-opacity': 0.5,
           'circle-stroke-width': 1,
           'circle-stroke-color': '#fff',
           'circle-stroke-opacity': 0.3
         }
      });
    } else if (!showAirports && m.getLayer('airports-layer')) {
      m.removeLayer('airports-layer');
      m.removeSource('airports-source');
    }
  }, [showAirports, airportsDataState]);

  useEffect(() => {
    fleetRef.current = fleet;
    activeFlightsRef.current = activeFlights;
  }, [fleet, activeFlights]);

  const jet = fleet.find((j: Aircraft) => j.id === selectedAircraftId);
  const flightPhase = jet?.flightPhase;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'base-raster': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'base-layer',
            type: 'raster',
            source: 'base-raster',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: [-118.4085, 33.9416],
      zoom: 12,
      pitch: 60,
      bearing: -17.6,
    });

    const m = map.current;

    // Interactive map cursor logic
    m.on('mousemove', (e) => {
       const features = m.queryRenderedFeatures(e.point);
       if (features.some(f => f.layer.id.startsWith('plane-layer-') || f.layer.id === 'events-layer')) {
           m.getCanvas().style.cursor = 'pointer';
       } else {
           m.getCanvas().style.cursor = 'crosshair';
       }
    });

    let hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'event-hover-popup' });
    m.on('mousemove', 'events-layer', (e) => {
        if (e.features && e.features[0]) {
            const props = e.features[0].properties;
            hoverPopup.setLngLat(e.lngLat)
                .setHTML(`<div class="bg-black/90 px-3 py-2 rounded-lg border border-[#d4af37]/30 text-white font-mono tracking-widest uppercase shadow-2xl backdrop-blur"><div class="text-xs font-black text-[#d4af37]">${props.name}</div><div class="text-[10px] text-zinc-400 mt-1">${props.dateStr}</div></div>`)
                .addTo(m);
        }
    });
    m.on('mouseleave', 'events-layer', () => {
        hoverPopup.remove();
    });

    m.on('click', (e) => {
       const features = m.queryRenderedFeatures(e.point);
       
       const eventFeature = features.find(f => f.layer.id === 'events-layer');
       if (eventFeature) {
          router.push(`/events/${eventFeature.properties.eventId}`);
          return;
       }

       const planeFeature = features.find(f => f.layer.id.startsWith('plane-layer-'));
       
       if (planeFeature) {
          const id = planeFeature.layer.id.replace('plane-layer-', '');
          useStore.getState().setSelectedAircraftId(id);
          const plane = fleetRef.current.find((j: Aircraft) => j.id === id);
          if (plane) {
              const htmlContent = `
                <div class="p-3 bg-black/90 border border-[#00f0ff]/30 text-white font-mono tracking-widest flex flex-col gap-3 min-w-[200px] rounded backdrop-blur">
                   <div>
                     <span class="text-xs text-[#00f0ff] font-black">${plane.tailNumber}</span>
                     <span class="block text-[10px] text-zinc-400 mt-1">${plane.model}</span>
                     <span class="inline-block mt-2 px-2 py-0.5 border ${plane.status === 'parked' ? 'border-zinc-500 text-zinc-400' : 'border-[#00f0ff] text-[#00f0ff] animate-pulse'} text-[8px] rounded uppercase">${plane.status === 'parked' ? 'PARKED' : 'IN TRANSIT'}</span>
                   </div>
                   <div class="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
                     <button data-href="/fleet/${plane.tailNumber}" class="w-full bg-white/10 hover:bg-white/20 py-1.5 rounded text-[10px] font-bold text-white transition-colors cursor-pointer popup-router-btn">VIEW CRAFT</button>
                     ${plane.status === 'parked' ? `
                        <button data-href="/flight/new?aircraft=${plane.tailNumber}" class="w-full bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/20 py-1.5 rounded text-[10px] font-bold transition-colors cursor-pointer popup-router-btn">DISPATCH FLIGHT</button>
                     ` : `
                        <button data-href="/flight/${plane.currentFlightID}" class="w-full bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/20 py-1.5 rounded text-[10px] font-bold transition-colors cursor-pointer popup-router-btn">VIEW FLIGHT</button>
                     `}
                   </div>
                </div>
              `;
              new maplibregl.Popup({ offset: 15, closeButton: true, className: "jetstream-popup" })
                .setLngLat(e.lngLat)
                .setHTML(htmlContent)
                .addTo(m);
                
              // Attach to the newly rendered buttons safely by deferring to next tick
              setTimeout(() => {
                 document.querySelectorAll('.popup-router-btn').forEach(btn => {
                     btn.addEventListener('click', (ev) => {
                          const href = (ev.currentTarget as HTMLElement).getAttribute('data-href');
                          if (href) window.location.href = href; // force navigation fallback
                     });
                 });
              }, 100);
          }
       }
    });

  }, []);

  useEffect(() => {
    if (!map.current) return;
    const m = map.current;
    
    // Switch map styles directly
    // Switch map styles securely
    if (mapStyle === 'Dark' || mapStyle === undefined) {
      m.setStyle('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');
    } else if (mapStyle === 'Roads') {
      m.setStyle('https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json');
    } else if (mapStyle === 'Satellite') {
      const tilesUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      m.setStyle({
        version: 8,
        sources: { 'base-raster': { type: 'raster', tiles: [tilesUrl], tileSize: 256 } },
        layers: [{ id: 'base-layer', type: 'raster', source: 'base-raster', minzoom: 0, maxzoom: 22 }]
      });
    }

  }, [mapStyle]);

  // Engine dependencies check

  // Weather Radar Overlay
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    const updateWeather = () => {
      try {
        if (!m.isStyleLoaded()) return;

        if (!weatherEnabled) {
          if (m.getLayer('weather-radar')) m.removeLayer('weather-radar');
          if (m.getSource('weather-radar')) m.removeSource('weather-radar');
          return;
        }

        const tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';

        if (m.getSource('weather-radar')) {
           m.removeLayer('weather-radar');
           m.removeSource('weather-radar');
        }

        m.addSource('weather-radar', {
           type: 'raster',
           tiles: [tileUrl],
           tileSize: 256
        });
        
        m.addLayer({
           id: 'weather-radar',
           type: 'raster',
           source: 'weather-radar',
           paint: { 'raster-opacity': 0.6 }
        });
      } catch (e) {
        console.error("Weather radar failed", e);
      }
    };

    if (m.isStyleLoaded()) {
      updateWeather();
    } else {
      m.once('styledata', updateWeather);
    }
    
    // Re-apply if mapStyle changes wipe the layers
    const wrapper = () => updateWeather();
    m.on('style.load', wrapper);
    return () => { m.off('style.load', wrapper); };
  }, [weatherEnabled, mapStyle]);

  // LIVE FLIGHT TRACKER ENGINE (Executes 10 times a second to interpolate map markers)
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    const intervalId = setInterval(() => {
      if (!m.isStyleLoaded()) return;
      if (pathname !== '/' && pathname !== '/world' && !pathname.startsWith('/flight/')) return;

      fleetRef.current.forEach((fJet: Aircraft) => {
        const routeSourceId = `route-source-${fJet.id}`;
        const routeLayerId = `route-layer-${fJet.id}`;
        const planeSourceId = `plane-source-${fJet.id}`;
        const planeLayerId = `plane-layer-${fJet.id}`;

        let planeCoords = [0, 0] as [number, number];
        let planeBearing = 0;
        let passedArcCoords: [number, number][] = [];
        let futureArcCoords: [number, number][] = [];
        let rangeCoords: [number, number][] = [];
        let showRoute = false;
        let showRange = false;

        if (fJet.status === 'in_transit' && fJet.currentFlightID) {
           const flight = activeFlightsRef.current.find((f: any) => f.id === fJet.currentFlightID);
           if (flight) {
               const now = useStore.getState().getNow();
               const elapsed = now - flight.departedAt;
               const total = flight.estimatedArrivalAt - flight.departedAt;
               let progress = Math.min(1, Math.max(0, total > 0 ? elapsed / total : 1));

               if (progress >= 1.0) {
                   resolveArrivals().catch(console.error); // Ensure map immediately initiates db sweep properly
               }

               // Render great circle array
               const fullArc = flight.waypoints.map((w: any) => [w.lng, w.lat] as [number, number]);
               if (fullArc.length > 0) {
                  const sliceIndex = Math.floor(progress * (fullArc.length - 1));
                  passedArcCoords = fullArc.slice(0, Math.max(2, sliceIndex + 1));
                  futureArcCoords = fullArc.slice(Math.max(0, sliceIndex));
                  
                  if (passedArcCoords.length < 2) passedArcCoords = [];
                  if (futureArcCoords.length < 2) futureArcCoords = [];
                  
                  // Simple linear interpolation between the two closest array nodes
                  const currentSegmentProg = (progress * (fullArc.length - 1)) - sliceIndex;
                  const p1 = fullArc[sliceIndex];
                  const p2 = fullArc[Math.min(fullArc.length - 1, sliceIndex + 1)];
                  
                  if (p1 && p2) {
                      const interp = interpolateFlightPosition(
                         p1[1], p1[0], p2[1], p2[0], currentSegmentProg
                      );
                      planeCoords = interp.point;
                      planeBearing = computeBearing(p1[1], p1[0], p2[1], p2[0]) - 45; 
                  } else {
                      planeCoords = p1 || [flight.waypoints[0].lng, flight.waypoints[0].lat];
                      planeBearing = -45;
                  }
                  
                  showRoute = true;
               }
           } else {
               // Fallback if flight record missing but state is in_transit
               if (fJet.currentLocation) {
                  planeCoords = [fJet.currentLocation.lng, fJet.currentLocation.lat];
               }
           }
        } else {
           if (fJet.currentLocation) {
               planeCoords = [fJet.currentLocation.lng, fJet.currentLocation.lat];
           }
        }
        
        // Cinematic Sandbox Map Tracking
        if (fJet.id === useStore.getState().selectedAircraftId) {
            if (!isNaN(planeCoords[0]) && !isNaN(planeCoords[1])) {
                m.setCenter(planeCoords as [number, number]);
            }
        }

        // Dedicated Range Map for selected aircraft
        if (fJet.id === selectedAircraftId && fJet.status === 'parked' && fJet.currentLocation) {
            showRange = true;
            // E.g., BBJ: 9900NM, Citation: 3500NM, Gulfstream: 7500NM
            const rangeNM = fJet.model.includes('BBJ') || fJet.model.includes('ACJ') ? 8000 : fJet.model.includes('Citation') || fJet.model.includes('Praetor') ? 3500 : 7500;
            rangeCoords = computeRangeCirclePoints(fJet.currentLocation.lat, fJet.currentLocation.lng, rangeNM);
        }

        const planeData = {
           type: 'FeatureCollection',
           features: [{ 
             type: 'Feature', 
             geometry: { type: 'Point', coordinates: planeCoords },
             properties: { rotation: planeBearing } 
           }]
        };

        const routeData = {
           type: 'FeatureCollection',
           features: showRoute && passedArcCoords.length >= 2 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: passedArcCoords } }] : []
        };

        const futureRouteData = {
           type: 'FeatureCollection',
           features: showRoute && futureArcCoords.length >= 2 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: futureArcCoords } }] : []
        };

        const rangeData = {
           type: 'FeatureCollection',
           features: showRange ? [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [rangeCoords] } }] : []
        };

        if (showFleetRef.current && !m.getSource(planeSourceId)) {
           m.addSource(planeSourceId, { type: 'geojson', data: planeData as any });
           m.addLayer({
             id: planeLayerId,
             type: 'circle',
             source: planeSourceId,
             paint: {
               'circle-color': '#00f0ff',
               'circle-radius': fJet.id === selectedAircraftId ? 16 : (fJet.status === 'parked' ? 8 : 12),
               'circle-stroke-color': '#ffffff',
               'circle-stroke-width': fJet.id === selectedAircraftId ? 3 : (fJet.status === 'parked' ? 2 : 3),
               'circle-opacity': 0.9,
               'circle-blur': fJet.id === selectedAircraftId ? 0.3 : 0.1
             }
           });
        } else if (showFleetRef.current && m.getSource(planeSourceId)) {
           (m.getSource(planeSourceId) as any).setData(planeData);
           m.setPaintProperty(planeLayerId, 'circle-radius', fJet.id === selectedAircraftId ? 16 : (fJet.status === 'parked' ? 8 : 12));
           m.setPaintProperty(planeLayerId, 'circle-stroke-width', fJet.id === selectedAircraftId ? 3 : (fJet.status === 'parked' ? 2 : 3));
           m.setPaintProperty(planeLayerId, 'circle-blur', fJet.id === selectedAircraftId ? 0.3 : 0.1);
        } else if (!showFleetRef.current && m.getLayer(planeLayerId)) {
           m.removeLayer(planeLayerId);
           m.removeSource(planeSourceId);
        }

        if (showFleetRef.current && showRoute) {
           if (!m.getSource(routeSourceId)) {
               m.addSource(routeSourceId, { type: 'geojson', data: routeData as any });
               m.addLayer({
                 id: routeLayerId,
                 type: 'line',
                 source: routeSourceId,
                 paint: {
                   'line-color': '#ffffff',
                   'line-width': 2.5,
                   'line-opacity': 0.8
                 }
               });
           } else {
               (m.getSource(routeSourceId) as any).setData(routeData);
           }

           const futureSourceId = `${routeSourceId}-future`;
           const futureLayerId = `${routeLayerId}-future`;
           if (!m.getSource(futureSourceId)) {
               m.addSource(futureSourceId, { type: 'geojson', data: futureRouteData as any });
               m.addLayer({
                 id: futureLayerId,
                 type: 'line',
                 source: futureSourceId,
                 paint: {
                   'line-color': '#ffffff',
                   'line-width': 2.5,
                   'line-dasharray': [2, 2],
                   'line-opacity': 0.3
                 }
               });
           } else {
               (m.getSource(futureSourceId) as any).setData(futureRouteData);
           }
        } else {
           if (m.getLayer(routeLayerId)) m.removeLayer(routeLayerId);
           if (m.getSource(routeSourceId)) m.removeSource(routeSourceId);
           if (m.getLayer(`${routeLayerId}-future`)) m.removeLayer(`${routeLayerId}-future`);
           if (m.getSource(`${routeSourceId}-future`)) m.removeSource(`${routeSourceId}-future`);
        }

        const rangeSourceId = `range-source-${fJet.id}`;
        const rangeLayerId = `range-layer-${fJet.id}`;
        const rangeOutlineId = `range-outline-${fJet.id}`;

        if (showRange) {
           if (!m.getSource(rangeSourceId)) {
               m.addSource(rangeSourceId, { type: 'geojson', data: rangeData as any });
               m.addLayer({
                  id: rangeLayerId,
                  type: 'fill',
                  source: rangeSourceId,
                  paint: {
                     'fill-color': '#00f0ff',
                     'fill-opacity': 0.05
                  }
               }, planeLayerId); // insert below plane
               m.addLayer({
                  id: rangeOutlineId,
                  type: 'line',
                  source: rangeSourceId,
                  paint: {
                     'line-color': '#00f0ff',
                     'line-width': 1,
                     'line-opacity': 0.3,
                     'line-dasharray': [4, 4]
                  }
               }, planeLayerId);
           } else {
               (m.getSource(rangeSourceId) as any).setData(rangeData);
           }
        } else {
           if (m.getLayer(rangeLayerId)) m.removeLayer(rangeLayerId);
           if (m.getLayer(rangeOutlineId)) m.removeLayer(rangeOutlineId);
           if (m.getSource(rangeSourceId)) m.removeSource(rangeSourceId);
        }
      });

      // Render Provisional Route Line
      const provSourceId = 'prov-route-source';
      const provLayerId = 'prov-route-layer';
      if (provisionalRoute) {
          const provArcCoords = computeGreatCirclePoints(
              provisionalRoute.origin.lat, provisionalRoute.origin.lng,
              provisionalRoute.destination.lat, provisionalRoute.destination.lng
          );
          const provData = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: provArcCoords } }] };
          if (!m.getSource(provSourceId)) {
              m.addSource(provSourceId, { type: 'geojson', data: provData as any });
              m.addLayer({
                  id: provLayerId,
                  type: 'line',
                  source: provSourceId,
                  paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.8 }
              });
          } else {
              (m.getSource(provSourceId) as any).setData(provData);
          }
      } else {
          if (m.getLayer(provLayerId)) m.removeLayer(provLayerId);
          if (m.getSource(provSourceId)) m.removeSource(provSourceId);
      }

      const eventsSourceId = 'events-source';
      const eventsLayerId = 'events-layer';
      
      if (showEventsRef.current) {
         const simNowLocal = useStore.getState().getNow();
         const eventsFeatures = eventsRef.current.map((rawEvent: any) => {
             const evt = getEventNextOccurrence(rawEvent, simNowLocal);
             const start = new Date(evt.startDate).getTime();
             const end = new Date(evt.endDate).getTime();
             
             // Proximate logic: within 7 days
             const isProximate = (start - simNowLocal) > 0 && (start - simNowLocal) < 7 * 24 * 60 * 60 * 1000;
             const isSameMonth = new Date(start).getUTCMonth() === new Date(end).getUTCMonth();
             const dateStr = isSameMonth
                ? `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${new Date(end).toLocaleDateString('en-US', { day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
                : `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

             const air = airportsDataState.find(a => a.icao === evt.locationICAO);
             if (!air || air.lat === null || air.lng === null || isNaN(air.lat) || isNaN(air.lng)) return null;
             
             return {
                type: 'Feature',
                properties: { eventId: evt.id, name: evt.name, isProximate, dateStr },
                geometry: { type: 'Point', coordinates: [air.lng, air.lat] }
             };
         }).filter(Boolean);

         const eventsData = { type: 'FeatureCollection', features: eventsFeatures };
         
         if (!m.getSource(eventsSourceId)) {
             m.addSource(eventsSourceId, { type: 'geojson', data: eventsData as any });
             m.addLayer({
                id: eventsLayerId,
                type: 'circle',
                source: eventsSourceId,
                paint: {
                   'circle-color': '#d4af37',
                   'circle-radius': 6,
                   'circle-opacity': ['case', ['boolean', ['get', 'isProximate'], false], 1.0, 0.5],
                   'circle-stroke-color': '#ffffff',
                   'circle-stroke-width': 1
                }
             });
         } else {
             (m.getSource(eventsSourceId) as any).setData(eventsData);
             if (m.getLayer(eventsLayerId)) {
                 const pulseRadius = 6 + Math.sin(performance.now() / 200) * 3;
                 m.setPaintProperty(eventsLayerId, 'circle-radius', ['case', ['boolean', ['get', 'isProximate'], false], pulseRadius, 6]);
             }
         }
      } else {
          if (m.getLayer(eventsLayerId)) m.removeLayer(eventsLayerId);
          if (m.getSource(eventsSourceId)) m.removeSource(eventsSourceId);
      }



    }, 100);

    return () => clearInterval(intervalId);
  }, [fleet, selectedAircraftId, provisionalRoute]);

  // NATIVE PERSONA MAP MARKERS
  const friendMarkersRef = useRef<Record<string, maplibregl.Marker>>({});

  useEffect(() => {
     if (!map.current) return;
     const m = map.current;

     if (!m.isStyleLoaded()) return;

     if (!showFriends || (pathname !== '/' && pathname !== '/world' && pathname !== '/social')) {
         Object.values(friendMarkersRef.current).forEach(marker => marker.remove());
         friendMarkersRef.current = {};
         return;
     }

     const currentIds = new Set<string>();

     personasRef.current.forEach((p: any) => {
         const state = personaStatesRef.current.find((s: any) => s.personaId === p.id);
         if (!state || !state.currentCoords || isNaN(state.currentCoords.lat) || isNaN(state.currentCoords.lng)) return;

         currentIds.add(p.id);

         if (!friendMarkersRef.current[p.id]) {
             // Create element
             const el = document.createElement('div');
             el.className = 'w-6 h-6 rounded-full cursor-pointer relative flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform';
             
             // Pulse ring
             const pulse = document.createElement('div');
             pulse.className = 'absolute inset-0 bg-[#f5a7a7] rounded-full animate-ping opacity-30';
             
             // Inner monogram
             const inner = document.createElement('div');
             inner.className = 'w-4 h-4 bg-[#f5a7a7] text-black rounded-full flex items-center justify-center font-mono text-[8px] font-black z-10 uppercase tracking-tighter shadow-[0_0_10px_rgba(245,167,167,0.5)]';
             
             // Setup inner letters
             const letters = document.createElement('span');
             letters.innerText = p.displayName.split(' ').map((n: string) => n[0]).join('');
             inner.appendChild(letters);
             
             el.appendChild(pulse);
             el.appendChild(inner);

             // Tooltip logic mapping explicitly requested schema
             const popupHtml = `
               <div class="p-3 bg-[#0a0a0c] border border-white/10 rounded-lg min-w-[200px]">
                  <div class="flex flex-col gap-1 mb-4">
                     <span class="text-xs font-mono tracking-widest text-[#f5a7a7] font-black uppercase">${p.displayName}</span>
                     <span class="text-[10px] font-mono text-zinc-500 uppercase">${state.currentLocationICAO || 'IN TRANSIT'}</span>
                  </div>
                  <div class="flex flex-col gap-2">
                     <button onclick="window.location.href='/social/dms/${p.id}'" class="w-full text-[10px] font-mono tracking-widest bg-[#f5a7a7] text-black px-2 py-2 hover:opacity-80 transition-opacity">SEND DM</button>
                     <button onclick="window.location.href='/social/${p.id}'" class="w-full text-[10px] font-mono tracking-widest border border-white/10 text-white px-2 py-2 hover:bg-white/10 transition-colors">VIEW DOSSIER</button>
                  </div>
               </div>
             `;

             const popup = new maplibregl.Popup({ offset: 15, closeButton: false, className: 'persona-popup' })
                 .setHTML(popupHtml);

             const marker = new maplibregl.Marker({ element: el })
                 .setLngLat([state.currentCoords.lng, state.currentCoords.lat])
                 .setPopup(popup)
                 .addTo(m);

             friendMarkersRef.current[p.id] = marker;
         } else {
             friendMarkersRef.current[p.id].setLngLat([state.currentCoords.lng, state.currentCoords.lat]);
         }
     });

     // Cleanup removed
     Object.keys(friendMarkersRef.current).forEach(id => {
         if (!currentIds.has(id)) {
             friendMarkersRef.current[id].remove();
             delete friendMarkersRef.current[id];
         }
     });

  }, [rawPersonas, rawPersonaStates, showFriends, pathname]);

  return (
    <div className="absolute inset-0 z-0 bg-[#0a0a0c]">
      <div 
         ref={mapContainer} 
         className="w-full h-full" 
         style={mapStyle === 'FlightAware' ? { filter: 'sepia(100%) hue-rotate(185deg) saturate(300%) brightness(85%) contrast(120%)' } : {}}
      />
      
      {/* Dynamic Map Controls Stack (Top Right of Map Area) */}
      <div className="absolute top-20 right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto">
         {/* The 4-Button Vertical Stack */}
         <button 
            onClick={() => { setLayersOpen(!layersOpen); setStylePickerOpen(false); }}
            className="w-11 h-11 bg-white text-black rounded shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
            title="Map Layers"
         >
            <Layers size={20} />
         </button>
         
         <button 
            onClick={() => { setStylePickerOpen(!stylePickerOpen); setLayersOpen(false); }}
            className={`w-11 h-11 rounded shadow-2xl flex items-center justify-center hover:scale-105 transition-all outline outline-1 outline-white/20 ${stylePickerOpen ? 'bg-[#00f0ff] text-black outline-none' : 'bg-black/60 backdrop-blur-xl text-white'}`}
            title="Map Style"
         >
            <MapIcon size={20} className={stylePickerOpen ? "opacity-100" : "opacity-80"}/>
         </button>

         <button 
            onClick={() => setWeatherEnabled(!weatherEnabled)}
            className={`w-11 h-11 rounded shadow-2xl flex items-center justify-center hover:scale-105 transition-all outline outline-1 outline-white/20 ${weatherEnabled ? 'bg-[#00f0ff] text-black outline-none' : 'bg-black/60 backdrop-blur-xl text-[#00f0ff]'}`}
            title="Live Radar"
         >
            <CloudRain size={20} />
         </button>

         <button 
            onClick={() => {
               if (map.current && jet?.currentLocation && !isNaN(jet.currentLocation.lng) && !isNaN(jet.currentLocation.lat)) {
                  map.current.flyTo({ center: [jet.currentLocation.lng, jet.currentLocation.lat], zoom: 12 });
               }
            }}
            className="w-11 h-11 bg-black/60 backdrop-blur-xl text-white outline outline-1 outline-white/20 rounded shadow-2xl flex items-center justify-center hover:bg-white/20 transition-all mt-4"
            title="Find Me"
         >
            <Focus size={20} />
         </button>

         {/* Popups expand downward since they are below the buttons in flex-col list */}
         {layersOpen && (
            <div className="flex flex-col gap-1 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl w-64 mt-2">
               <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-2 border-b border-white/10 pb-2">Map Layers</h3>
               
               <button onClick={() => setShowFleet(!showFleet)} className={`w-full text-left px-4 py-2 hover:bg-white/10 ${!showFleet && 'opacity-50'} text-xs font-mono font-bold tracking-widest text-[#00f0ff]`}>
                  JETSTREAM FLEET {showFleet && '✓'}
               </button>
               <button onClick={() => setShowEvents(!showEvents)} className={`w-full text-left px-4 py-2 hover:bg-white/10 ${!showEvents && 'opacity-50'} text-xs font-mono font-bold tracking-widest text-amber-300`}>
                  GLOBAL EVENTS {showEvents && '✓'}
               </button>
               <button onClick={() => setShowFriends(!showFriends)} className={`w-full text-left px-4 py-2 hover:bg-white/10 ${!showFriends && 'opacity-50'} text-xs font-mono font-bold tracking-widest text-[#f5a7a7]`}>
                  NETWORK {showFriends && '✓'}
               </button>
               <button onClick={() => setShowAirports(!showAirports)} className={`w-full text-left px-4 py-2 hover:bg-white/10 ${!showAirports && 'opacity-50'} text-xs font-mono font-bold tracking-widest text-zinc-300`}>
                  AIRPORTS {showAirports && '✓'}
               </button>

               <div className="w-full h-px bg-white/10 my-2"/>

               <button className="flex items-center gap-3 p-2 rounded text-left opacity-30 cursor-not-allowed">
                  <Building size={16} className="text-zinc-400"/>
                  <span className="text-xs font-bold tracking-widest text-zinc-400 flex-1">PROPERTIES</span>
                  <span className="text-[8px] bg-white/10 px-1 rounded">PHASE 8</span>
               </button>

               <button onClick={() => setShowEvents(!showEvents)} className="flex items-center gap-3 p-2 rounded hover:bg-white/10 transition-all text-left">
                  <Calendar size={16} className={showEvents ? "text-[#d4af37]" : "text-zinc-600"}/>
                  <span className={`text-xs font-bold tracking-widest flex-1 ${showEvents ? 'text-white' : 'text-zinc-500'}`}>EVENTS</span>
               </button>
            </div>
         )}
         
         {stylePickerOpen && (
            <div className="flex flex-col gap-2 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl w-64 mt-2">
               <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-2 border-b border-white/10 pb-2">Map Base Style</h3>
               
               {['FlightAware', 'Satellite', 'Dark', 'Roads'].map((style) => (
                  <button 
                     key={style}
                     onClick={() => { setMapStyle(style as any); setStylePickerOpen(false); }} 
                     className={`p-2 rounded text-left transition-all ${mapStyle === style ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50' : 'hover:bg-white/10 text-white border border-transparent'}`}
                  >
                     <span className="text-xs font-bold tracking-widest">{style.toUpperCase()}</span>
                  </button>
               ))}
            </div>
         )}
      </div>

      {/* Speed Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-black/80 backdrop-blur-xl border border-white/20 rounded-full p-2 shadow-[0_0_30px_rgba(0,240,255,0.2)] pointer-events-auto">
         <div className="px-4 border-r border-white/10 flex items-center gap-2 text-zinc-400">
            <FastForward size={14} className={timeMultiplier > 1 ? "text-[#00f0ff]" : ""} />
            <span className="text-[10px] font-mono tracking-widest font-black uppercase">Sim Speed</span>
         </div>
         <div className="flex px-2 gap-1">
            {[1, 10, 30, 60, 100].map((spd) => (
              <button 
                key={spd}
                onClick={() => setTimeMultiplier(spd)}
                className={`w-10 h-8 rounded-full text-xs font-mono font-black transition-all ${
                  timeMultiplier === spd 
                     ? 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.6)]' 
                     : 'text-zinc-500 hover:text-white hover:bg-white/10'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
          <button 
             onClick={() => setTimeSkipOpen(true)}
             className="px-4 border-l border-white/10 text-xs font-mono tracking-widest font-black text-amber-500 hover:text-white transition-colors h-full flex items-center"
          >
             SKIP
          </button>
       </div>

       {timeSkipOpen && <TimeSkipModal onClose={() => setTimeSkipOpen(false)} />}
    </div>
  );
}
