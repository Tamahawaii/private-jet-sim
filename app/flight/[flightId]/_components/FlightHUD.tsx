'use client';

import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Flight, Aircraft } from '../../../../types';
import { FlightSnapshot } from '../../../../lib/flight/engine';
import { localTimeAt } from '../../../../lib/flight/airports';
import { describeRoute } from '../../../../lib/flight/engine';

interface Props { flight: Flight; aircraft: Aircraft; snap: FlightSnapshot; simNow: number; onClose: () => void }

const PHASE_TONE: Record<string, string> = {
  taxi: 'bg-zinc-200 text-black',
  takeoff: 'bg-amber-300 text-black',
  climb: 'bg-[var(--accent)] text-black',
  cruise: 'bg-[var(--accent)] text-black',
  descent: 'bg-amber-300 text-black',
  approach: 'bg-amber-300 text-black',
  landed: 'bg-emerald-400 text-black',
};

/** Top strip on the live flight: phase, route, local time at destination. */
export default function FlightHUD({ flight, aircraft, snap, simNow, onClose }: Props) {
  const r = describeRoute(flight);
  const destLocal = r.dest ? localTimeAt(r.dest, simNow) : null;
  return (
    <div className="absolute left-3 right-3 md:left-6 md:right-auto md:w-[420px] z-40 pointer-events-none" style={{ top: 'calc(var(--nav-h) + var(--safe-top) + 10px)' }}>
      <div className="glass rounded-2xl px-4 py-3 pointer-events-auto flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white shrink-0" aria-label="Back to the world"><X size={15} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold tracking-[0.14em] px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${PHASE_TONE[snap.phase] || 'bg-white/10 text-white'}`}>{snap.phaseLabel}</span>
            <span className="text-[11px] text-zinc-400 font-mono truncate">{aircraft.tailNumber} · {aircraft.model}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className="font-serif text-[19px] text-white leading-none truncate">{r.originCity}</span>
            <ArrowRight size={14} className="text-[var(--accent)] shrink-0" />
            <span className="font-serif text-[19px] text-white leading-none truncate">{r.destCity}</span>
          </div>
        </div>
        {destLocal && (
          <div className="text-right shrink-0">
            <div className="eyebrow">{flight.destinationICAO} local</div>
            <div className="font-mono text-[13px] text-white mt-0.5">{destLocal}</div>
          </div>
        )}
      </div>
    </div>
  );
}
