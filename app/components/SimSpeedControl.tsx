'use client';

import React, { useState } from 'react';
import { FastForward, Clock3 } from 'lucide-react';
import { useStore } from '../lib/store';
import { useSimNow, formatSimClock } from '../lib/useSimNow';
import TimeSkipModal from './TimeSkipModal';

const SPEEDS = [1, 10, 30, 60, 100];

/** Sim clock pill + speed popover. Lives in the top bar so the map stays clear. */
export default function SimSpeedControl({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const timeMultiplier = useStore(s => s.timeMultiplier);
  const setTimeMultiplier = useStore(s => s.setTimeMultiplier);
  const now = useSimNow(1000);
  const clock = formatSimClock(now);
  const fast = timeMultiplier > 1;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`h-9 rounded-full border flex items-center gap-2 px-3 transition-colors ${fast ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-white/10 bg-black/40 text-zinc-200 hover:border-white/25'}`}
        aria-label="Simulation clock and speed"
      >
        {fast ? <FastForward size={13} /> : <Clock3 size={13} className="text-zinc-400" />}
        <span className="font-mono text-[11.5px] tracking-wide">
          {!compact && <span className="text-zinc-400 mr-1.5">{clock.date}</span>}
          {clock.time}
        </span>
        <span className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded-md ${fast ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-zinc-300'}`}>{timeMultiplier}×</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-11 z-50 glass rounded-2xl p-3 w-[280px] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-1 pb-2">
              <div>
                <div className="eyebrow">Simulation time</div>
                <div className="font-mono text-sm text-white mt-0.5">{clock.date} · {clock.time}</div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {SPEEDS.map(s => (
                <button key={s} onClick={() => setTimeMultiplier(s)} className={`h-9 rounded-lg font-mono text-[12px] font-bold transition-all ${timeMultiplier === s ? 'bg-[var(--accent)] text-black shadow-[0_0_16px_rgba(34,211,238,0.5)]' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>{s}×</button>
              ))}
            </div>
            <button onClick={() => { setOpen(false); setSkipOpen(true); }} className="mt-2 w-full h-9 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 text-[12px] font-semibold tracking-wide">
              Skip ahead…
            </button>
            <p className="text-[10.5px] text-zinc-500 px-1 pt-2 leading-snug">Speed only applies while the app is open. Flights keep moving in real time when you close it.</p>
          </div>
        </>
      )}
      {skipOpen && <TimeSkipModal onClose={() => setSkipOpen(false)} />}
    </div>
  );
}
