'use client';
import { routes } from '../../../../lib/routes';

import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Wind, ArrowUp, Compass, Route as RouteIcon, Users, Sparkles, ChevronRight, MapPin } from 'lucide-react';
import { Flight, Aircraft, Player } from '../../../../types';
import { db } from '../../../../lib/db';
import { useStore } from '../../../lib/store';
import { FlightSnapshot, getFlightMoments, formatDurationMs, FlightMoment, describeRoute } from '../../../../lib/flight/engine';
import { PersonaAvatar } from '../../../components/PersonaAvatar';

interface Props { flight: Flight; aircraft: Aircraft; snap: FlightSnapshot; simNow: number }

type SheetState = 'peek' | 'half' | 'full';

function headingLabel(h: number) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return `${Math.round(h).toString().padStart(3, '0')}° ${dirs[Math.round(h / 22.5) % 16]}`;
}

export default function FlightSheet({ flight, aircraft, snap, simNow }: Props) {
  const [state, setState] = useState<SheetState>('peek');
  const router = useRouter();
  const timeMultiplier = useStore(s => s.timeMultiplier);
  const player = useLiveQuery(() => db.player.get('player')) as Player | undefined;
  const passengers = useLiveQuery(() => db.personas.where('id').anyOf((flight.passengers || []).filter(p => p !== 'player')).toArray(), [flight.id]) || [];
  const r = describeRoute(flight);

  const moments = useMemo(() => getFlightMoments(flight, aircraft, player, { hasCompany: true }), [flight.id, aircraft.tailNumber, player?.tastes?.drinks]);
  const past = moments.filter(m => m.at <= snap.progress).reverse();
  const next = moments.find(m => m.at > snap.progress);
  const total = flight.estimatedArrivalAt - flight.departedAt;
  const momentTime = (m: FlightMoment) => new Date(flight.departedAt + m.at * total).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const realMsRemaining = snap.msRemaining / Math.max(1, timeMultiplier);
  const arrivalClock = new Date(flight.estimatedArrivalAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Swipe handling
  const touchY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchY.current = null;
    if (Math.abs(dy) < 30) return;
    setState(s => dy < 0 ? (s === 'peek' ? 'half' : 'full') : (s === 'full' ? 'half' : 'peek'));
  };
  const cycle = () => setState(s => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'));

  const handleAbort = async () => {
    if (snap.progress >= 0.2) return;
    const cost = Math.floor(flight.costUSD * snap.progress * 2);
    if (!confirm(`Turn around and return to ${r.originCity}?\nYou'll pay for the distance flown ($${cost.toLocaleString()}).`)) return;
    const now = useStore.getState().getNow();
    await db.flights.update(flight.id, {
      originICAO: flight.destinationICAO,
      destinationICAO: flight.originICAO,
      waypoints: [...flight.waypoints].reverse(),
      departedAt: now - (flight.estimatedArrivalAt - now),
      estimatedArrivalAt: now + (now - flight.departedAt),
      costUSD: cost,
      momentsFired: [],
    });
  };

  const heightClass = state === 'peek' ? 'h-[168px]' : state === 'half' ? 'h-[46vh] min-h-[360px]' : 'h-[82vh]';

  return (
    <div
      className={`pointer-events-auto w-full md:w-[440px] md:left-6 md:absolute md:bottom-6 glass rounded-t-3xl md:rounded-3xl transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${heightClass} flex flex-col overflow-hidden`}
      style={{ marginBottom: 'var(--safe-bottom)', background: state === 'peek' ? undefined : 'rgba(9, 13, 20, 0.9)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={cycle} aria-label="Expand">
        <span className="w-10 h-1.5 rounded-full bg-white/25" />
      </button>

      <div className="px-5 pb-5 flex-1 overflow-y-auto no-scrollbar">
        {/* Header row */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[26px] font-bold tracking-wider text-white">{flight.originICAO}</span>
              <span className="text-[var(--accent)] text-sm">→</span>
              <span className="font-mono text-[26px] font-bold tracking-wider text-[var(--accent)]">{flight.destinationICAO}</span>
            </div>
            <div className="text-[12px] text-zinc-400 -mt-0.5 truncate">{r.originCity} to {r.destCity} · {Math.round(flight.distanceNM).toLocaleString()} NM</div>
          </div>
          <div className="text-right shrink-0">
            <div className="eyebrow">Arrives</div>
            <div className="font-mono text-[20px] font-semibold text-white leading-tight">{formatDurationMs(snap.msRemaining)}</div>
            <div className="text-[10.5px] text-zinc-500 font-mono">{arrivalClock}{timeMultiplier > 1 ? ` · ${formatDurationMs(realMsRemaining)} real` : ''}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--accent-dim)] to-[var(--accent)] rounded-full shadow-[0_0_14px_rgba(34,211,238,0.6)] transition-[width] duration-200 ease-linear" style={{ width: `${snap.distanceProgress * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10.5px] font-mono text-zinc-500">
            <span>{Math.round(snap.distanceFlownNM).toLocaleString()} NM flown</span>
            <span className="text-zinc-300">{snap.phaseLabel}</span>
            <span>{Math.round(snap.distanceRemainingNM).toLocaleString()} NM to go</span>
          </div>
        </div>

        {state !== 'peek' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-2.5">
              <Stat icon={<ArrowUp size={12} />} label="Altitude" value={Math.round(snap.altitudeFt / 100) * 100} unit="ft" sub={Math.abs(snap.verticalSpeedFpm) > 150 ? `${snap.verticalSpeedFpm > 0 ? '▲' : '▼'} ${Math.abs(Math.round(snap.verticalSpeedFpm / 100) * 100).toLocaleString()} fpm` : 'level'} />
              <Stat icon={<Wind size={12} />} label="Ground speed" value={Math.round(snap.groundSpeedKts)} unit="kts" sub={`${Math.round(snap.groundSpeedKts * 1.151)} mph`} />
              <Stat icon={<Compass size={12} />} label="Heading" value={headingLabel(snap.heading)} sub={`cruise FL${Math.round(snap.cruiseAltFt / 100)}`} />
              <Stat icon={<RouteIcon size={12} />} label="Burn" value={Math.round(flight.burnGPH * (snap.groundSpeedKts > 0 ? 1 : 0.1))} unit="gph" sub={`${Math.round(flight.burnGPH * snap.msElapsed / 3600000).toLocaleString()} gal used`} />
            </div>

            {/* Cabin */}
            <div>
              <div className="eyebrow mb-2 flex items-center gap-1.5"><Users size={11} /> Cabin</div>
              <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-2xl p-3">
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0b6e8c] to-[#2ca5c4] border-2 border-[#0a0f18] flex items-center justify-center font-mono text-[11px] font-bold text-white">{(player?.displayName || 'You').slice(0, 2).toUpperCase()}</div>
                  {passengers.map(p => <PersonaAvatar key={p.id} persona={p} size={36} className="border-2 border-[#0a0f18]" />)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-white truncate">{passengers.length === 0 ? 'Flying solo' : `You, ${passengers.map(p => p.displayName.split(' ')[0]).join(', ')}`}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{flight.purpose?.type === 'event' ? 'En route to an event' : flight.purpose?.type === 'resort' ? 'Resort stay ahead' : 'Leisure'} · {aircraft.cabinConfig?.length || 0} cabin modules</div>
                </div>
              </div>
            </div>

            {/* Next up */}
            {next && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-dashed border-white/12">
                <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-white truncate">Up next: {next.title}</div>
                  <div className="text-[11px] text-zinc-500">in {formatDurationMs((next.at - snap.progress) * total)}</div>
                </div>
              </div>
            )}

            {state === 'full' && (
              <>
                <div>
                  <div className="eyebrow mb-2">Flight log</div>
                  <ol className="relative border-l border-white/10 ml-2 space-y-3">
                    {past.length === 0 && <li className="pl-4 text-[12px] text-zinc-500">Pushback shortly.</li>}
                    {past.map(m => (
                      <li key={m.id} className="pl-4 relative">
                        <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${m.kind === 'chop' ? 'bg-amber-300' : m.kind === 'friend-text' ? 'bg-[#f5a7a7]' : 'bg-[var(--accent)]'}`} />
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] text-white">{m.title}</span>
                          <span className="text-[10.5px] font-mono text-zinc-500 shrink-0">{momentTime(m)}</span>
                        </div>
                        <div className="text-[12px] text-zinc-400 leading-snug">{m.body}</div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <Mini label="Trip cost" value={`$${Math.round(flight.costUSD).toLocaleString()}`} />
                  <Mini label="Block time" value={formatDurationMs(total)} />
                  <Mini label="Tail" value={flight.tailNumber} />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => router.push(routes.aircraft(aircraft.tailNumber))} className="flex-1 h-11 rounded-xl bg-white/6 border border-white/10 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5"><MapPin size={13} /> Aircraft <ChevronRight size={13} /></button>
                  {snap.progress < 0.2 && (
                    <button onClick={handleAbort} className="flex-1 h-11 rounded-xl bg-[var(--magenta)]/15 border border-[var(--magenta)]/30 text-[var(--magenta)] text-[12px] font-semibold">Turn back</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, unit, sub }: { icon: React.ReactNode; label: string; value: string | number; unit?: string; sub?: string }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl px-3.5 py-3">
      <div className="eyebrow flex items-center gap-1.5">{icon} {label}</div>
      <div className="font-mono text-[20px] font-semibold text-white mt-1 leading-none">{typeof value === 'number' ? value.toLocaleString() : value}{unit && <span className="text-[11px] text-zinc-500 ml-1">{unit}</span>}</div>
      {sub && <div className="text-[10.5px] text-zinc-500 mt-1 font-mono">{sub}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl px-2 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className="font-mono text-[13px] text-white mt-1">{value}</div>
    </div>
  );
}
