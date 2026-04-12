'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useStore } from '../lib/store';

export default function MapEngine() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { fleet, selectedAircraftId } = useStore();
  const jet = fleet.find(j => j.id === selectedAircraftId);
  const flightPhase = jet?.flightPhase;
  
  const [missingKey, setMissingKey] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || token.trim() === '') {
      setMissingKey(true);
      return;
    }
    
    // Set token dynamically
    mapboxgl.accessToken = token;

    if (map.current || !mapContainer.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard', // Live 3D environment out of the box
      center: [-118.4085, 33.9416],
      zoom: 12,
      pitch: 60,
      bearing: -17.6,
      projection: 'globe' as any, // Globe view for massive distances
    });

    map.current.on('style.load', () => {
      // Force 'night' preset to seamlessly gel with Midnight Aviation theme
      map.current?.setConfigProperty('basemap', 'lightPreset', 'night');
      // Enable 3D buildings intrinsically available in mapbox standard
      map.current?.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
      map.current?.setConfigProperty('basemap', 'showTransitLabels', false);
      
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
        m.flyTo({ center, zoom: 14, pitch: 45, duration: 3000 });
        break;
      case 'Taxi':
        // Zooming in ultra-close to highlight 3D buildings and ground topography
        m.flyTo({ center, zoom: 16.5, pitch: 75, bearing: 45, duration: 4000 });
        break;
      case 'Takeoff':
        // Cinematic pull up into the sky
        m.flyTo({ center, zoom: 12, pitch: 70, duration: 6000 });
        break;
      case 'Cruise':
        if(jet.destination) {
          const midLng = (jet.currentLocation.lng + jet.destination.lng) / 2;
          const midLat = (jet.currentLocation.lat + jet.destination.lat) / 2;
          // Sub-orbital overview
          m.flyTo({ center: [midLng, midLat], zoom: 3, pitch: 30, duration: 10000 });
        }
        break;
      case 'Landing':
        if(jet.destination) {
           // Dive into the destination heavily pitched to highlight structural 3D terrain
           m.flyTo({ center: [jet.destination.lng, jet.destination.lat], zoom: 15, pitch: 75, duration: 8000 });
        }
        break;
    }
  }, [flightPhase, jet?.id]);

  if (missingKey) {
    return (
      <div className="absolute inset-0 z-0 bg-[#0a0a0c] flex items-center justify-center">
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 border border-[var(--color-cyan)] shadow-[0_0_30px_rgba(0,240,255,0.15)]">
           <h2 className="text-2xl font-bold tracking-widest text-[#00f0ff] uppercase">Mapbox Core Offline</h2>
           <p className="text-white/60 text-sm max-w-sm text-center">Missing valid Mapbox Access Token. Please provide your environment variable to unleash the 3D globe.</p>
           <div className="bg-black/50 p-4 rounded font-mono text-xs text-[#d4af37] border border-[#d4af37]/30 mt-4">
              NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_key_here
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Replaced solid block overlay with a smooth radial vignette to let 3D punch through */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-[var(--background)] opacity-80 pointer-events-none" />
    </div>
  );
}
