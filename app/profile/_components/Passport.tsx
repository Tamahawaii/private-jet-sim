'use client';
import { routes } from '../../../lib/routes';

import React, { useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import maplibregl from 'maplibre-gl';
import Link from 'next/link';
import { Stamp, Plane, Globe2, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { db } from '../../../lib/db';
import { Flight, Player } from '../../../types';
import { computeTravelLog } from '../../../lib/flight/travelLog';
import { buildStyle, SRC } from '../../components/map/mapStyle';
import { registerIcons } from '../../components/map/icons';
import { useStore } from '../../lib/store';
import { describeRoute, formatDurationMs } from '../../../lib/flight/engine';

function PassportMap({ routes, airports }: { routes: { waypoints: [number, number][] }[]; airports: { lng: number; lat: number; visits: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const style = useStore.getState().mapStyle;
    const map = new maplibregl.Map({ container: ref.current, style: buildStyle(style, 'globe'), interactive: true, attributionControl: false, center: [-157.9, 21.3], zoom: 1.2, dragRotate: false, pitchWithRotate: false });
    map.scrollZoom.disable(); map.doubleClickZoom.disable();
    map.on('style.load', async () => {
      await registerIcons(map);
      (map.getSource(SRC.passport) as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: routes.map(r => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.waypoints } })) });
      (map.getSource(SRC.events) as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: airports.map(a => ({ type: 'Feature', properties: { id: '', isProximate: a.visits > 1, inRange: true }, geometry: { type: 'Point', coordinates: [a.lng, a.lat] } })) });
      const b = new maplibregl.LngLatBounds();
      airports.forEach(a => b.extend([a.lng, a.lat]));
      if (!b.isEmpty() && airports.length > 1) map.fitBounds(b, { padding: 40, duration: 0, maxZoom: 3.5 });
      else if (airports[0]) map.jumpTo({ center: [airports[0].lng, airports[0].lat], zoom: 2 });
    });
    return () => map.remove();
  }, [routes.length, airports.length]);
  return <div ref={ref} className="w-full h-full" />;
}

export default function Passport({ player }: { player: Player }) {
  const flights = (useLiveQuery(() => db.flights.toArray()) || []) as Flight[];
  const log = useMemo(() => computeTravelLog(flights, player), [flights, player?.homeBaseICAO]);
  const dots = log.airports.filter(a => a.airport).map(a => ({ lng: a.airport!.lng, lat: a.airport!.lat, visits: a.visits }));

  return (
    <section id="passport" className="scroll-mt-24">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Stamp size={11} /> Passport</div>
          <h2 className="font-serif text-[26px] text-white leading-tight">Everywhere you&apos;ve been.</h2>
        </div>
        <div className="text-right">
          <div className="font-mono text-[22px] font-bold text-[var(--color-gold)] leading-none">{Math.round(player.prestigeScore || 0).toLocaleString()}</div>
          <div className="eyebrow">Prestige</div>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden border border-white/10 bg-[#070b12] h-56 md:h-72 relative">
        <PassportMap routes={log.routes} airports={dots} />
        <div className="absolute left-3 bottom-3 flex gap-2 pointer-events-none">
          <span className="glass rounded-full px-2.5 py-1 text-[10.5px] font-mono text-zinc-300">{log.airports.length} airports</span>
          <span className="glass rounded-full px-2.5 py-1 text-[10.5px] font-mono text-zinc-300">{log.countries.length} countries</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3">
        <Tile icon={<Plane size={12} />} label="Flights" value={log.totalFlights.toLocaleString()} />
        <Tile icon={<Globe2 size={12} />} label="Miles flown" value={`${Math.round(log.totalNM * 1.151).toLocaleString()}`} sub={`${Math.round(log.totalNM).toLocaleString()} NM`} />
        <Tile icon={<Clock size={12} />} label="Hours aloft" value={log.totalHours.toFixed(1)} sub={log.longest ? `longest ${Math.round(log.longest.distanceNM).toLocaleString()} NM` : undefined} />
        <Tile icon={<Sparkles size={12} />} label="Spent on flying" value={`$${(log.totalSpend / 1e6).toFixed(2)}M`} />
      </div>

      {/* Stamps */}
      <div className="mt-6">
        <div className="eyebrow mb-3">Stamps</div>
        {log.countries.length === 0 ? (
          <div className="text-[13px] text-zinc-500">No stamps yet. File a flight plan.</div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {log.countries.map((c, i) => (
              <div key={c.iso} className="border-2 rounded-lg px-3 py-2 text-center min-w-[104px]" style={{ transform: `rotate(${((i * 37) % 9) - 4}deg)`, borderColor: c.isHome ? 'rgba(34,211,238,0.6)' : 'rgba(212,175,55,0.6)', color: c.isHome ? 'var(--accent)' : 'var(--color-gold)' }}>
                <div className="text-[8px] font-mono tracking-[0.2em]">{c.isHome ? 'HOME' : c.visits > 1 ? `${c.visits} VISITS` : 'ARRIVED'}</div>
                <div className="font-serif text-[15px] leading-tight mt-0.5 text-white">{c.name}</div>
                <div className="text-[9px] font-mono opacity-80 mt-0.5">{c.isHome ? player.homeBaseICAO : new Date(c.firstAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flight history */}
      <div className="mt-6">
        <div className="eyebrow mb-2">Flight log</div>
        {log.completed.length === 0 ? (
          <div className="text-[13px] text-zinc-500">Your logbook is empty.</div>
        ) : (
          <ul className="divide-y divide-white/8 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {log.completed.slice(0, 12).map(f => {
              const r = describeRoute(f);
              return (
                <li key={f.id}>
                  <Link href={routes.flight(f.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04]">
                    <div className="font-mono text-[12px] text-zinc-500 w-16 shrink-0">{new Date(f.arrivedAt || f.estimatedArrivalAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-white truncate">{r.originCity} <span className="text-[var(--accent)]">→</span> {r.destCity}</div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">{f.tailNumber} · {Math.round(f.distanceNM).toLocaleString()} NM · {formatDurationMs(f.estimatedArrivalAt - f.departedAt)}{f.recap ? ` · +${f.recap.prestigeGained}` : ''}</div>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl px-3.5 py-3">
      <div className="eyebrow flex items-center gap-1.5">{icon} {label}</div>
      <div className="font-mono text-[20px] font-semibold text-white mt-1 leading-none">{value}</div>
      {sub && <div className="text-[10.5px] text-zinc-500 mt-1 font-mono">{sub}</div>}
    </div>
  );
}
