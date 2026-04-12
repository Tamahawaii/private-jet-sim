'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useStore } from '../lib/store';

mapboxgl.accessToken = 'pk.eyJ1IjoiZHVtbXlsb2NhbCIsImEiOiJjbXhxemN3aXYwbG53MnFxdm5zYndkOWg0In0.dummy'; 

export default function MapEngine() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { fleet, selectedAircraftId } = useStore();
  const jet = fleet.find(j => j.id === selectedAircraftId);
  const flightPhase = jet?.flightPhase;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.4085, 33.9416],
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
      projection: 'globe',
    });

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !jet) return;
    const m = map.current;
    const center = [jet.currentLocation.lng, jet.currentLocation.lat] as [number, number];

    switch (flightPhase) {
      case 'Hangar':
      case 'Pre-flight':
        m.flyTo({ center, zoom: 14, pitch: 45, duration: 2000 });
        break;
      case 'Taxi':
        m.flyTo({ center, zoom: 15, pitch: 60, bearing: 45, duration: 4000 });
        break;
      case 'Takeoff':
        m.flyTo({ center, zoom: 9, pitch: 70, duration: 6000 });
        break;
      case 'Cruise':
        if(jet.destination) {
          const midLng = (jet.currentLocation.lng + jet.destination.lng) / 2;
          const midLat = (jet.currentLocation.lat + jet.destination.lat) / 2;
          m.flyTo({ center: [midLng, midLat], zoom: 4, pitch: 30, duration: 10000 });
        }
        break;
      case 'Landing':
        if(jet.destination) {
           m.flyTo({ center: [jet.destination.lng, jet.destination.lat], zoom: 14, pitch: 60, duration: 8000 });
        }
        break;
    }
  }, [flightPhase, jet?.id]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-[var(--background)] opacity-60 pointer-events-none" />
    </div>
  );
}
