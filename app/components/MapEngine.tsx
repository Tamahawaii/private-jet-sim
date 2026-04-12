'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useStore } from '../lib/store';
import { interpolateFlightPosition, computeGreatCirclePoints } from '../lib/math';

export default function MapEngine() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fleet, selectedAircraftId } = useStore();
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
    if (!map.current || !jet || !jet.currentLocation) return;
    const m = map.current;
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
  }, [flightPhase, jet?.currentLocation, jet?.destination]);

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

        if ((fJet.flightPhase === 'Cruise' || fJet.flightPhase === 'Landing') && fJet.destination) {
          
          let progress = 0;
          if (fJet.lockedUntil && fJet.launchedAt) {
             progress = Math.min(1, Math.max(0, (Date.now() - fJet.launchedAt) / (fJet.lockedUntil - fJet.launchedAt)));
          } else if (fJet.flightPhase === 'Landing') {
             progress = 1;
          }

          const interp = interpolateFlightPosition(
            fJet.currentLocation.lat, fJet.currentLocation.lng,
            fJet.destination.lat, fJet.destination.lng,
            progress
          );

          const arcCoords = computeGreatCirclePoints(
            fJet.currentLocation.lat, fJet.currentLocation.lng,
            fJet.destination.lat, fJet.destination.lng
          );

          const routeData = {
             type: 'FeatureCollection',
             features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: arcCoords } }]
          };

          const planeData = {
             type: 'FeatureCollection',
             features: [{ 
               type: 'Feature', 
               geometry: { type: 'Point', coordinates: interp.point },
               properties: { rotation: interp.bearing } 
             }]
          };

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
             
             m.addSource(planeSourceId, { type: 'geojson', data: planeData as any });
             m.addLayer({
               id: planeLayerId,
               type: 'symbol',
               source: planeSourceId,
               layout: {
                 'text-field': '✈',
                 'text-size': 24,
                 'text-rotation-alignment': 'map',
                 'text-rotate': ['get', 'rotation'],
                 'text-allow-overlap': true,
               },
               paint: {
                 'text-color': fJet.id === selectedAircraftId ? '#d4af37' : '#00f0ff',
                 'text-halo-color': '#000',
                 'text-halo-width': 2
               }
             });
          } else {
             (m.getSource(routeSourceId) as any).setData(routeData);
             (m.getSource(planeSourceId) as any).setData(planeData);
             m.setPaintProperty(routeLayerId, 'line-color', fJet.id === selectedAircraftId ? '#d4af37' : '#00f0ff');
             m.setPaintProperty(planeLayerId, 'text-color', fJet.id === selectedAircraftId ? '#d4af37' : '#00f0ff');
          }

        } else {
           if (m.getLayer(routeLayerId)) m.removeLayer(routeLayerId);
           if (m.getSource(routeSourceId)) m.removeSource(routeSourceId);
           if (m.getLayer(planeLayerId)) m.removeLayer(planeLayerId);
           if (m.getSource(planeSourceId)) m.removeSource(planeSourceId);
        }
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [fleet, selectedAircraftId]);

  return (
    <div className="absolute inset-0 z-0 bg-[#0a0a0c]">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-[var(--background)] opacity-80 pointer-events-none" />
    </div>
  );
}
