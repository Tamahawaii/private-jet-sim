'use client';
import React, { useState } from 'react';
import { useStore } from './lib/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { getEventNextOccurrence } from './lib/events';
import { Calendar, MapPin, X, Navigation2, Plane, ChevronRight, Palmtree } from 'lucide-react';
import Link from 'next/link';
import { BillionaireEvent, Flight, Aircraft } from '../types';
import { useSimNow } from './lib/useSimNow';
import { getFlightSnapshot, formatDurationMs, describeRoute } from '../lib/flight/engine';
import { getAirport, shortCity } from '../lib/flight/airports';
import { isPlayerAboard } from '../lib/simulation';

function ActiveFlightCard({ flight, aircraft, compact }: { flight: Flight; aircraft?: Aircraft; compact?: boolean }) {
  const now = useSimNow(1000);
  const snap = getFlightSnapshot(flight, aircraft, now);
  const r = describeRoute(flight);
  return (
    <Link href={`/flight/${flight.id}`} className={`block glass rounded-2xl p-4 ${compact ? 'w-[78vw] max-w-[340px] shrink-0' : ''} hover:border-[var(--accent)]/40 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="eyebrow flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" /> {flight.purpose?.type === 'delivery' ? 'Delivery inbound' : 'In flight'} · {snap.phaseLabel}</div>
        <span className="font-mono text-[11px] text-zinc-400">{flight.tailNumber}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-[20px] text-white">{r.originCity}</span>
        <span className="text-[var(--accent)]">→</span>
        <span className="font-serif text-[20px] text-white">{r.destCity}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${snap.distanceProgress * 100}%` }} /></div>
      <div className="mt-1.5 flex justify-between text-[11px] font-mono text-zinc-500"><span>{Math.round(snap.distanceRemainingNM).toLocaleString()} NM to go</span><span className="text-white">lands in {formatDurationMs(snap.msRemaining)}</span></div>
    </Link>
  );
}

function EventCard({ evt, personas, compact }: { evt: BillionaireEvent; personas: { id: string; displayName: string }[]; compact?: boolean }) {
  const start = new Date(evt.startDate);
  const dateStr = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(evt.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  const names = (evt.confirmedAttendees || []).map(id => personas.find(p => p.id === id)?.displayName.split(' ')[0]).filter(Boolean) as string[];
  const a = getAirport(evt.locationICAO);
  return (
    <div className={`glass rounded-2xl overflow-hidden ${compact ? 'w-[78vw] max-w-[340px] shrink-0' : ''}`}>
      <div className="relative h-20 bg-gradient-to-br from-[#1b2a3d] via-[#0d1521] to-[#070b12] flex items-end p-3">
        {evt.imageUrl && <img src={evt.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] to-transparent" />
        <div className="absolute top-2.5 right-2.5 text-[9px] font-mono tracking-widest text-[var(--color-gold)] border border-[var(--color-gold)]/40 bg-black/50 rounded px-1.5 py-0.5">TIER {evt.prestigeTier}</div>
        <h3 className="relative font-serif text-[17px] leading-tight text-white text-balance">{evt.name}</h3>
      </div>
      <div className="p-3 pt-2">
        <div className="text-[11px] text-zinc-400 flex items-center gap-3">
          <span className="flex items-center gap-1"><Calendar size={11} className="text-[var(--accent)]" /> {dateStr}</span>
          <span className="flex items-center gap-1 truncate"><MapPin size={11} className="text-[var(--accent)]" /> {(evt.locationCity || shortCity(a, evt.locationICAO)).split(',')[0]}</span>
        </div>
        {names.length > 0 && <div className="text-[11px] text-[var(--rose)] mt-1.5 truncate">{names.slice(0, 2).join(' & ')}{names.length > 2 ? ` +${names.length - 2}` : ''} attending</div>}
        <div className="flex gap-2 mt-2.5">
          <Link href={`/events/${evt.id}`} className="flex-1 h-9 rounded-lg bg-white/6 border border-white/10 text-white text-[11.5px] font-semibold flex items-center justify-center">Dossier</Link>
          <Link href={`/flight/new?destination=${evt.locationICAO}&purpose=event:${evt.id}`} className="flex-1 h-9 rounded-lg bg-[var(--accent)] text-black text-[11.5px] font-semibold flex items-center justify-center gap-1"><Navigation2 size={12} /> Fly there</Link>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [simNow] = useState(() => useStore.getState().getNow());
  const peek = useStore(s => s.peek);

  const rawEvents = useLiveQuery(() => db.events.toArray()) || [];
  const personas = useLiveQuery(() => db.personas.toArray()) || [];
  const activeFlights = useLiveQuery(() => db.flights.filter(f => f.arrivedAt === null).toArray()) || [];
  const fleet = useLiveQuery(() => db.aircraft.toArray()) || [];
  const player = useLiveQuery(() => db.player.get('player'));

  const upcoming = React.useMemo(() => {
     if (rawEvents.length === 0) return [];
     const shifted = rawEvents.map(e => getEventNextOccurrence(e, simNow));
     const future = shifted.filter(e => new Date(e.endDate).getTime() > simNow);
     return future.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 4);
  }, [rawEvents, simNow]);

  const myFlights = activeFlights.filter(f => isPlayerAboard(f) || f.purpose?.type === 'delivery').sort((a, b) => a.estimatedArrivalAt - b.estimatedArrivalAt);
  const here = getAirport(player?.currentLocationICAO);

  return (
    <>
      {/* Desktop: left panel */}
      {!isDismissed && (
        <div className="hidden md:flex absolute left-6 z-40 w-[340px] max-h-[calc(100vh-var(--nav-h)-48px)] flex-col pointer-events-auto animate-in fade-in slide-in-from-left-6 duration-700" style={{ top: 'calc(var(--nav-h) + 16px)' }}>
          <div className="glass rounded-2xl p-4 mb-3">
            <div className="eyebrow">Welcome back{player?.displayName ? `, ${player.displayName}` : ''}</div>
            <div className="font-serif text-[22px] text-white mt-0.5">{here ? `You\u2019re in ${shortCity(here)}.` : 'Ready when you are.'}</div>
            <div className="text-[12px] text-zinc-400 mt-1 flex items-center gap-3"><span className="flex items-center gap-1"><Plane size={11} /> {fleet.filter(j => j.status === 'parked').length} parked · {fleet.filter(j => j.status !== 'parked').length} airborne</span></div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-2">
            {myFlights.map(f => <ActiveFlightCard key={f.id} flight={f} aircraft={fleet.find(a => a.tailNumber === f.tailNumber)} />)}
            <div className="flex items-center justify-between px-1">
              <div className="eyebrow">This week in the world</div>
              <button onClick={() => setIsDismissed(true)} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-500"><X size={13} /></button>
            </div>
            {upcoming.map(evt => <EventCard key={evt.id} evt={evt} personas={personas} />)}
            <Link href="/destinations" className="glass rounded-2xl p-3 flex items-center gap-3 hover:border-[var(--accent)]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[var(--rose)]/10 text-[var(--rose)] flex items-center justify-center"><Palmtree size={16} /></div>
              <div className="flex-1"><div className="text-[13px] text-white">Destinations & calendar</div><div className="text-[11px] text-zinc-500">Resorts, events, the whole season.</div></div>
              <ChevronRight size={14} className="text-zinc-500" />
            </Link>
          </div>
        </div>
      )}

      {/* Phone: bottom strip */}
      {!peek && (
        <div className="md:hidden absolute left-0 right-0 z-30 pointer-events-none" style={{ bottom: 'calc(var(--tabbar-h) + 10px)' }}>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 pointer-events-auto">
            {myFlights.map(f => <ActiveFlightCard key={f.id} flight={f} aircraft={fleet.find(a => a.tailNumber === f.tailNumber)} compact />)}
            {upcoming.slice(0, 3).map(evt => <EventCard key={evt.id} evt={evt} personas={personas} compact />)}
            <Link href="/destinations" className="glass rounded-2xl p-4 w-[60vw] max-w-[260px] shrink-0 flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-[var(--rose)]/10 text-[var(--rose)] flex items-center justify-center"><Palmtree size={16} /></div>
              <div><div className="font-serif text-[18px] text-white">Where next?</div><div className="text-[11px] text-zinc-500">Resorts & the season's calendar</div></div>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
