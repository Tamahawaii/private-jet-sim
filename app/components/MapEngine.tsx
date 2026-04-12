'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useStore } from '../lib/store';
import { interpolateFlightPosition, computeGreatCirclePoints, computeBearing, offsetCoordinate, computeRangeCirclePoints } from '../lib/math';

export default function MapEngine() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fleet, selectedAircraftId, activeView, provisionalRoute } = useStore();
  const jet = fleet.find(j => j.id === selectedAircraftId);
  const flightPhase = jet?.flightPhase;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
          }
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
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

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

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
        let arcCoords: [number, number][] = [];
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

            arcCoords = computeGreatCirclePoints(
              fJet.currentLocation.lat, fJet.currentLocation.lng,
              fJet.destination.lat, fJet.destination.lng
            );

            planeCoords = interp.point;
            planeBearing = interp.bearing;
            showRoute = true;
          } else {
            const baseBearing = computeBearing(fJet.currentLocation.lat, fJet.currentLocation.lng, fJet.destination.lat, fJet.destination.lng);
            let timePassedMs = fJet.launchedAt ? (Date.now() - fJet.launchedAt) : 0;
            let distOffset = 0;

            if (fJet.flightPhase === 'Taxi') {
                distOffset = Math.min(0.04, (timePassedMs / 5000) * 0.04);
                planeCoords = [offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lng, offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lat];
                planeBearing = baseBearing;
            } else if (fJet.flightPhase === 'Takeoff') {
                distOffset = 0.04 + Math.min(0.8, (timePassedMs / 6000) * 0.8);
                planeCoords = [offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lng, offsetCoordinate(fJet.currentLocation.lat, fJet.currentLocation.lng, distOffset, baseBearing).lat];
                planeBearing = baseBearing;
            } else if (fJet.flightPhase === 'Landing') {
                distOffset = Math.max(0, 0.8 - ((timePassedMs / 8000) * 0.8));
                planeCoords = [offsetCoordinate(fJet.destination.lat, fJet.destination.lng, distOffset, baseBearing - 180).lng, offsetCoordinate(fJet.destination.lat, fJet.destination.lng, distOffset, baseBearing - 180).lat];
                planeBearing = baseBearing;
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
           features: showRoute ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: arcCoords } }] : []
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
               'text-color': fJet.id === selectedAircraftId ? '#d4af37' : '#00f0ff',
               'text-halo-color': '#000',
               'text-halo-width': 2,
               'text-opacity': fJet.flightPhase === 'Cruise' ? 1 : 0.6
             }
           });
        } else {
           (m.getSource(planeSourceId) as any).setData(planeData);
           m.setPaintProperty(planeLayerId, 'text-color', fJet.id === selectedAircraftId ? '#d4af37' : '#00f0ff');
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
                   'line-color': fJet.id === selectedAircraftId ? '#d4af37' : '#00f0ff',
                   'line-width': 3,
                   'line-dasharray': [2, 2],
                   'line-opacity': 0.6
                 }
               });
           } else {
               (m.getSource(routeSourceId) as any).setData(routeData);
               m.setPaintProperty(routeLayerId, 'line-color', fJet.id === selectedAircraftId ? '#d4af37' : '#00f0ff');
           }
        } else {
           if (m.getLayer(routeLayerId)) m.removeLayer(routeLayerId);
           if (m.getSource(routeSourceId)) m.removeSource(routeSourceId);
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
      if (activeView === 'Logistics' && provisionalRoute) {
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

    }, 100);

    return () => clearInterval(intervalId);
  }, [fleet, selectedAircraftId, activeView, provisionalRoute]);

  return (
    <div className="absolute inset-0 z-0 bg-[#0a0a0c]">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-[var(--background)] opacity-80 pointer-events-none" />
    </div>
  );
}
