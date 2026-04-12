'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useStore } from '../lib/store';
import { interpolateFlightPosition, computeGreatCirclePoints, computeBearing, offsetCoordinate, computeRangeCirclePoints } from '../lib/math';
import { Layers } from 'lucide-react';

export default function MapEngine() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fleet, selectedAircraftId, activeView, provisionalRoute, mapStyle, setMapStyle } = useStore();
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
       } else if (useStore.getState().activeView === 'Sandbox') {
           m.getCanvas().style.cursor = 'crosshair';
       } else {
           m.getCanvas().style.cursor = '';
       }
    });

    m.on('click', (e) => {
       const features = m.queryRenderedFeatures(e.point);
       const planeFeature = features.find(f => f.layer.id.startsWith('plane-layer-'));
       
       if (planeFeature) {
          const id = planeFeature.layer.id.replace('plane-layer-', '');
          useStore.getState().setSelectedAircraftId(id);
          useStore.getState().setActiveView('Sandbox');
          return;
       }

       const state = useStore.getState();
       if (state.activeView === 'Sandbox' && state.selectedAircraftId) {
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

    if (activeView === 'Logistics' && provisionalRoute) {
       const midLng = (provisionalRoute.origin.lng + provisionalRoute.destination.lng) / 2;
       const midLat = (provisionalRoute.origin.lat + provisionalRoute.destination.lat) / 2;
       m.flyTo({ center: [midLng, midLat], zoom: 3, pitch: 30, duration: 4000 });
       return;
    }

    if (!jet || !jet.currentLocation) return;
    const center = [jet.currentLocation.lng, jet.currentLocation.lat] as [number, number];

    switch (flightPhase) {
      case 'Hangar':
      case 'Pre-flight':
        m.flyTo({ center, zoom: 14, pitch: 45, duration: 3000 });
        break;
      case 'Taxi':
        m.flyTo({ center, zoom: 16.5, pitch: 75, bearing: 45, duration: 4000 });
        break;
      case 'Takeoff':
        m.flyTo({ center, zoom: 12, pitch: 70, duration: 6000 });
        break;
      case 'Cruise':
        if(jet.destination) {
          const midLng = (jet.currentLocation.lng + jet.destination.lng) / 2;
          const midLat = (jet.currentLocation.lat + jet.destination.lat) / 2;
          m.flyTo({ center: [midLng, midLat], zoom: 3, pitch: 30, duration: 10000 });
        }
        break;
      case 'Landing':
        if(jet.destination) {
           m.flyTo({ center: [jet.destination.lng, jet.destination.lat], zoom: 15, pitch: 75, duration: 8000 });
        }
        break;
    }
  }, [flightPhase, jet?.currentLocation, jet?.destination, activeView, provisionalRoute]);

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

        if (fJet.destination && (fJet.flightPhase === 'Cruise' || fJet.flightPhase === 'Landing' || fJet.flightPhase === 'Taxi' || fJet.flightPhase === 'Takeoff')) {
          
          let progress = 0;
          if (fJet.flightPhase === 'Cruise' && fJet.lockedUntil && fJet.launchedAt) {
             progress = Math.min(1, Math.max(0, (Date.now() - fJet.launchedAt) / (fJet.lockedUntil - fJet.launchedAt)));
          }

          if (fJet.flightPhase === 'Cruise') {
            const interp = interpolateFlightPosition(
              fJet.currentLocation.lat, fJet.currentLocation.lng,
              fJet.destination.lat, fJet.destination.lng,
              progress
            );

            const fullArc = computeGreatCirclePoints(
              fJet.currentLocation.lat, fJet.currentLocation.lng,
              fJet.destination.lat, fJet.destination.lng
            );

            const sliceIndex = Math.floor(progress * fullArc.length);
            passedArcCoords = fullArc.slice(0, Math.max(2, sliceIndex + 1));
            futureArcCoords = fullArc.slice(Math.max(0, sliceIndex));
            
            if (passedArcCoords.length < 2) passedArcCoords = [];
            if (futureArcCoords.length < 2) futureArcCoords = [];

            planeCoords = interp.point;
            planeBearing = interp.bearing - 45; // Offset Unicode plane symbol angle mathematically
            showRoute = true;
          } else {
            const baseBearing = computeBearing(fJet.currentLocation.lat, fJet.currentLocation.lng, fJet.destination.lat, fJet.destination.lng);
            let timePassedMs = fJet.launchedAt ? (Date.now() - fJet.launchedAt) : 0;
            let distOffset = 0;

            if (fJet.flightPhase === 'Taxi') {
                distOffset = Math.min(0.04, (timePassedMs / 5000) * 0.04);
                planeCoords = [offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lng, offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lat];
                planeBearing = baseBearing - 45;
            } else if (fJet.flightPhase === 'Takeoff') {
                distOffset = 0.04 + Math.min(0.8, (timePassedMs / 6000) * 0.8);
                planeCoords = [offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lng, offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lat];
                planeBearing = baseBearing - 45;
            } else if (fJet.flightPhase === 'Landing') {
                distOffset = Math.max(0, 0.8 - ((timePassedMs / 8000) * 0.8));
                planeCoords = [offsetCoordinate(fJet.destination.lat, fJet.destination.lng, distOffset, baseBearing - 180).lng, offsetCoordinate(fJet.destination.lat, fJet.destination.lng, distOffset, baseBearing - 180).lat];
                planeBearing = baseBearing - 45;
            }
          }

        } else {
           // On the ground
           planeCoords = [fJet.currentLocation.lng, fJet.currentLocation.lat];
           showRoute = false;
        }

        // Dedicated Range Map for selected aircraft during logistics planning
        if (fJet.id === selectedAircraftId && activeView === 'Logistics' && (fJet.flightPhase === 'Hangar' || fJet.flightPhase === 'Pre-flight')) {
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
               'text-size': fJet.flightPhase === 'Cruise' ? 24 : 16,
               'text-rotation-alignment': 'map',
               'text-rotate': ['get', 'rotation'],
               'text-allow-overlap': true,
             },
             paint: {
               'text-color': '#ffffff',
               'text-halo-color': '#000',
               'text-halo-width': 1,
               'text-opacity': fJet.flightPhase === 'Cruise' ? 1 : 0.6
             }
           });
        } else {
           (m.getSource(planeSourceId) as any).setData(planeData);
           m.setLayoutProperty(planeLayerId, 'text-size', fJet.flightPhase === 'Cruise' ? 24 : 16);
           m.setPaintProperty(planeLayerId, 'text-opacity', fJet.flightPhase === 'Cruise' ? 1 : 0.6);
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
      if ((activeView === 'Logistics' || activeView === 'Sandbox') && provisionalRoute) {
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

      // Render Logistics Omni-Map (All scheduled future itineraries spanning the globe)
      const omniSourceId = 'omni-routes';
      const omniLayerId = 'omni-layer';
      if (activeView === 'Logistics') {
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
  }, [fleet, selectedAircraftId, activeView, provisionalRoute]);

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
