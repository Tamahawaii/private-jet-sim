'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useStore } from '../lib/store';
import { interpolateFlightPosition, computeGreatCirclePoints, computeBearing, offsetCoordinate, computeRangeCirclePoints } from '../lib/math';
import { Layers } from 'lucide-react';

export default function MapEngine() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fleet, selectedAircraftId, provisionalRoute, mapStyle, setMapStyle } = useStore();
  const jet = fleet.find(j => j.id === selectedAircraftId);
  const flightPhase = jet?.flightPhase;
  const [layersOpen, setLayersOpen] = useState(false);

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
       if (features.some(f => f.layer.id.startsWith('plane-layer-'))) {
           m.getCanvas().style.cursor = 'pointer';
       } else {
           m.getCanvas().style.cursor = 'crosshair';
       }
    });

    m.on('click', (e) => {
       const features = m.queryRenderedFeatures(e.point);
       const planeFeature = features.find(f => f.layer.id.startsWith('plane-layer-'));
       
       if (planeFeature) {
          const id = planeFeature.layer.id.replace('plane-layer-', '');
          useStore.getState().setSelectedAircraftId(id);
          return;
       }

       const state = useStore.getState();
       if (state.selectedAircraftId) {
          const plane = state.fleet.find(j => j.id === state.selectedAircraftId);
          if (plane && (plane.flightPhase === 'Hangar' || plane.flightPhase === 'Pre-flight' || plane.flightPhase === 'Cruise')) {
              // Note: Allow retargeting even in cruise!
              state.setProvisionalRoute({
                 origin: plane.currentLocation,
                 destination: { lat: e.lngLat.lat, lng: e.lngLat.lng, name: `WP ${Math.floor(e.lngLat.lat)}, ${Math.floor(e.lngLat.lng)}` }
              });
          }
       }
    });

  }, []);

  useEffect(() => {
    if (!map.current) return;
    const m = map.current;
    
    // Switch map styles directly
    let tilesUrl = 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png';
    if (mapStyle === 'Roads') tilesUrl = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png';
    if (mapStyle === 'Satellite') tilesUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    
    m.setStyle({
      version: 8,
      sources: { 'base-raster': { type: 'raster', tiles: [tilesUrl], tileSize: 256 } },
      layers: [{ id: 'base-layer', type: 'raster', source: 'base-raster', minzoom: 0, maxzoom: 22 }]
    });

  }, [mapStyle]);

  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    switch (flightPhase) {
      case 'Hangar':
      case 'Pre-flight':
        // Removed conflict logic in favor of pure interval
        break;
      case 'Taxi':
        break;
      case 'Takeoff':
        break;
      case 'Cruise':
        break;
      case 'Landing':
        break;
    }
  }, [flightPhase, jet?.currentLocation, jet?.destination, provisionalRoute]);

  // LIVE FLIGHT TRACKER ENGINE (Executes 10 times a second to interpolate map markers)
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    const intervalId = setInterval(() => {
      if (!m.isStyleLoaded()) return;

      fleet.forEach(fJet => {
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

        if (fJet.destination && fJet.launchedAt && fJet.flightPhase !== 'Hangar') {
           const timeM = useStore.getState().timeMultiplier;
           const simPassedMs = (Date.now() - fJet.launchedAt) * timeM;
           const mins = simPassedMs / 60000;
           
           // Physics Thresholds (Simulated Minutes)
           const preFlightEnds = 10;
           const taxiEnds = 10 + 15; // 25
           const takeoffEnds = 25 + 5; // 30
           
           // Fetch total locked time which was dynamically calculated upon launch
           const lockedUntil = fJet.lockedUntil || (Date.now() + 60000);
           const totalSimMins = ((lockedUntil - fJet.launchedAt) * timeM) / 60000;
           const landingBegins = Math.max(takeoffEnds + 5, totalSimMins - 10);
           
           // Determine active physics phase mathematically
           const calcPhase = 
              mins < preFlightEnds ? 'Pre-flight' :
              mins < taxiEnds ? 'Taxi' :
              mins < takeoffEnds ? 'Takeoff' :
              mins < landingBegins ? 'Cruise' :
              mins < totalSimMins ? 'Landing' : 'Hangar';

           // Auto-shift phase in store if boundary crossed
           if (calcPhase !== fJet.flightPhase) {
               if (calcPhase === 'Hangar') {
                   useStore.getState().updateAircraft(fJet.id, { 
                       flightPhase: 'Hangar', 
                       currentLocation: fJet.destination, 
                       destination: null, 
                       launchedAt: null, 
                       lockedUntil: null 
                   });
                   return; // skip this tick
               } else {
                   useStore.getState().updateAircraft(fJet.id, { flightPhase: calcPhase as any });
                   return;
               }
           }
           
           const baseBearing = computeBearing(fJet.currentLocation.lat, fJet.currentLocation.lng, fJet.destination.lat, fJet.destination.lng);

           if (fJet.flightPhase === 'Cruise') {
             const cruiseProg = Math.min(1, Math.max(0, (mins - takeoffEnds) / (landingBegins - takeoffEnds)));
             const interp = interpolateFlightPosition(
               fJet.currentLocation.lat, fJet.currentLocation.lng,
               fJet.destination.lat, fJet.destination.lng,
               cruiseProg
             );

             const fullArc = computeGreatCirclePoints(
               fJet.currentLocation.lat, fJet.currentLocation.lng,
               fJet.destination.lat, fJet.destination.lng
             );

             const sliceIndex = Math.floor(cruiseProg * fullArc.length);
             passedArcCoords = fullArc.slice(0, Math.max(2, sliceIndex + 1));
             futureArcCoords = fullArc.slice(Math.max(0, sliceIndex));
             
             if (passedArcCoords.length < 2) passedArcCoords = [];
             if (futureArcCoords.length < 2) futureArcCoords = [];

             planeCoords = interp.point;
             planeBearing = interp.bearing - 45; 
             showRoute = true;
           } else {
             let distOffset = 0;
             if (fJet.flightPhase === 'Pre-flight') {
                 planeCoords = [fJet.currentLocation.lng, fJet.currentLocation.lat];
             } else if (fJet.flightPhase === 'Taxi') {
                 const taxiProg = (mins - preFlightEnds) / 15;
                 distOffset = Math.min(0.04, taxiProg * 0.04);
                 planeCoords = [offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lng, offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lat];
             } else if (fJet.flightPhase === 'Takeoff') {
                 const takeoffProg = (mins - taxiEnds) / 5;
                 distOffset = 0.04 + Math.min(0.8, takeoffProg * 0.8);
                 planeCoords = [offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lng, offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lat];
             } else if (fJet.flightPhase === 'Landing') {
                 const landingProg = (mins - landingBegins) / 10;
                 distOffset = Math.max(0, 0.8 - (landingProg * 0.8));
                 planeCoords = [offsetCoordinate(fJet.destination.lat, fJet.destination.lng, distOffset, baseBearing - 180).lng, offsetCoordinate(fJet.destination.lat, fJet.destination.lng, distOffset, baseBearing - 180).lat];
             }
             planeBearing = baseBearing - 45;
           }
           
           // Cinematic Sandbox Map Tracking
           if (fJet.id === useStore.getState().selectedAircraftId) {
               m.setCenter(planeCoords as [number, number]);
               if (fJet.flightPhase !== 'Cruise' && m.getZoom() < 14) m.zoomTo(15, { duration: 1000 });
           }

        } else {
           // On the ground
           planeCoords = [fJet.currentLocation.lng, fJet.currentLocation.lat];
           showRoute = false;
        }

        // Dedicated Range Map for selected aircraft
        if (fJet.id === selectedAircraftId && (fJet.flightPhase === 'Hangar' || fJet.flightPhase === 'Pre-flight')) {
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

        if (!m.getSource(planeSourceId)) {
           m.addSource(planeSourceId, { type: 'geojson', data: planeData as any });
           m.addLayer({
             id: planeLayerId,
             type: 'symbol',
             source: planeSourceId,
             layout: {
               'text-field': '✈',
               'text-size': fJet.flightPhase === 'Cruise' ? 42 : 32,
               'text-rotation-alignment': 'map',
               'text-rotate': ['get', 'rotation'],
               'text-allow-overlap': true,
             },
             paint: {
               'text-color': '#ffffff',
               'text-halo-color': '#00f0ff',
               'text-halo-width': 2,
               'text-opacity': 1
             }
           });
        } else {
           (m.getSource(planeSourceId) as any).setData(planeData);
           m.setLayoutProperty(planeLayerId, 'text-size', fJet.flightPhase === 'Cruise' ? 42 : 32);
        }

        if (showRoute) {
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

      const omniSourceId = 'omni-routes';
      const omniLayerId = 'omni-layer';
      if (true) { // Always show omni routes
          const omniFeatures: any[] = [];
          fleet.forEach(fJet => {
            if (fJet.scheduledRoutes && fJet.scheduledRoutes.length > 0) {
               fJet.scheduledRoutes.forEach(leg => {
                  const points = computeGreatCirclePoints(leg.origin.lat, leg.origin.lng, leg.destination.lat, leg.destination.lng);
                  omniFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: points } });
               });
            }
          });
          const omniData = { type: 'FeatureCollection', features: omniFeatures };
          
          if (!m.getSource(omniSourceId)) {
             m.addSource(omniSourceId, { type: 'geojson', data: omniData as any });
             m.addLayer({
               id: omniLayerId,
               type: 'line',
               source: omniSourceId,
               paint: { 
                 'line-color': '#00f0ff', 
                 'line-width': 1.5, 
                 'line-opacity': 0.2,
                 'line-dasharray': [4, 4]
               }
             });
          } else {
             (m.getSource(omniSourceId) as any).setData(omniData);
          }
      } else {
          if (m.getLayer(omniLayerId)) m.removeLayer(omniLayerId);
          if (m.getSource(omniSourceId)) m.removeSource(omniSourceId);
      }

    }, 100);

    return () => clearInterval(intervalId);
  }, [fleet, selectedAircraftId, provisionalRoute]);

  return (
    <div className="absolute inset-0 z-0 bg-[#0a0a0c]">
      <div 
         ref={mapContainer} 
         className="w-full h-full" 
         style={mapStyle === 'FlightAware' ? { filter: 'sepia(100%) hue-rotate(185deg) saturate(300%) brightness(85%) contrast(120%)' } : {}}
      />
      
      {/* Dynamic Layer Toggle */}
      <div className="absolute bottom-40 right-4 z-50 flex flex-col items-end gap-2 pointer-events-auto">
         {layersOpen && (
            <div className="flex flex-col gap-1 bg-black/80 backdrop-blur border border-white/10 p-2 rounded-lg shadow-xl">
               {(['FlightAware', 'Satellite', 'Dark', 'Roads'] as const).map(s => (
                  <button 
                     key={s} 
                     onClick={() => setMapStyle(s)}
                     className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all text-left ${mapStyle === s ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                  >
                     {s} Mode
                  </button>
               ))}
            </div>
         )}
         <button 
            onClick={() => setLayersOpen(!layersOpen)}
            className="w-12 h-12 bg-white text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
         >
            <Layers size={20} />
         </button>
      </div>

    </div>
  );
}
