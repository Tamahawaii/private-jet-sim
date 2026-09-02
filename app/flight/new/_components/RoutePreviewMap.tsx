'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { buildStyle, SRC } from '../../../components/map/mapStyle';
import { registerIcons } from '../../../components/map/icons';
import { useStore } from '../../../lib/store';

interface Props {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints: { lat: number; lng: number }[];
  className?: string;
}

/** Small non-interactive globe used inside the briefing card. */
export default function RoutePreviewMap({ origin, destination, waypoints, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const style = useStore.getState().mapStyle;
    const map = new maplibregl.Map({
      container: ref.current,
      style: buildStyle(style, 'globe'),
      interactive: false,
      attributionControl: false,
      center: [(origin.lng + destination.lng) / 2, (origin.lat + destination.lat) / 2],
      zoom: 1,
    });
    map.on('style.load', async () => {
      await registerIcons(map);
      const line = waypoints.map(w => [w.lng, w.lat]);
      (map.getSource(SRC.provRoute) as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }] });
      (map.getSource(SRC.planes) as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { id: 'o', inFlight: false, selected: true, heading: 0 }, geometry: { type: 'Point', coordinates: [origin.lng, origin.lat] } },
      ] });
      (map.getSource(SRC.events) as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { id: 'd', isProximate: true, inRange: true }, geometry: { type: 'Point', coordinates: [destination.lng, destination.lat] } },
      ] });
      const b = new maplibregl.LngLatBounds();
      line.forEach(c => b.extend(c as [number, number]));
      map.fitBounds(b, { padding: 36, duration: 0, maxZoom: 5 });
    });
    return () => map.remove();
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);
  return <div ref={ref} className={className} />;
}
