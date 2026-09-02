'use client';

import { useEffect, useState } from 'react';
import { useStore } from './store';

/** Live simulation clock, re-rendering every `intervalMs` (default 1s). */
export function useSimNow(intervalMs = 1000): number {
  const getNow = useStore(s => s.getNow);
  const timeMultiplier = useStore(s => s.timeMultiplier);
  const baselineSimTime = useStore(s => s.baselineSimTime);
  const [now, setNow] = useState(() => getNow());
  useEffect(() => {
    setNow(getNow());
    const id = setInterval(() => setNow(getNow()), intervalMs);
    return () => clearInterval(id);
  }, [getNow, intervalMs, timeMultiplier, baselineSimTime]);
  return now;
}

export function formatSimClock(ms: number): { date: string; time: string } {
  const d = new Date(ms);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}
