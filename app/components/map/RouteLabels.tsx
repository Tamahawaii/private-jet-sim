'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Flight } from '../../../types';
import { getAirport, shortCity } from '../../../lib/flight/airports';

interface Props { map: maplibregl.Map; flight: Flight | null }

/** Origin / destination pills on the live flight map. */
export default function RouteLabels({ map, flight }: Props) {
  const markersRef = useRef<maplibregl.Marker[]>([]);
  useEffect(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (!flight || !flight.waypoints || flight.waypoints.length < 2) return;
    const mk = (icao: string, lng: number, lat: number, dest: boolean) => {
      const a = getAirport(icao);
      const el = document.createElement('div');
      el.className = `js-route-label${dest ? ' dest' : ''}`;
      el.innerHTML = `${icao}<span class="city">${shortCity(a, '')}</span>`;
      const m = new maplibregl.Marker({ element: el, anchor: 'bottom', opacityWhenCovered: '0' }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(m);
    };
    const o = flight.waypoints[0], d = flight.waypoints[flight.waypoints.length - 1];
    mk(flight.originICAO, o.lng, o.lat, false);
    mk(flight.destinationICAO, d.lng, d.lat, true);
    return () => { markersRef.current.forEach(m => m.remove()); markersRef.current = []; };
  }, [map, flight?.id]);
  return null;
}
