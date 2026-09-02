'use client';

import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useStore } from '../lib/store';
import { Flight } from '../../types';
import { getFlightMoments, getFlightSnapshot, FlightMoment } from '../../lib/flight/engine';
import { getAirport, shortCity } from '../../lib/flight/airports';
import { isPlayerAboard } from '../../lib/simulation';
import { sendProactiveDM } from '../../lib/social/proactiveDm';

declare global {
  interface Window { JetstreamNative?: { vibrate?: (ms: number) => void; isNative?: () => boolean } }
}

export function haptic(kind: 'light' | 'heavy') {
  const ms = kind === 'heavy' ? 60 : 18;
  try {
    if (window.JetstreamNative?.vibrate) window.JetstreamNative.vibrate(ms);
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch { /* no haptics */ }
}

/**
 * Watches active flights and fires in-flight moments (toasts, haptics, a
 * friend texting you) exactly once each, even across reloads.
 */
export default function FlightMomentsRunner() {
  const activeFlights = useLiveQuery(() => db.flights.filter(f => f.arrivedAt === null).toArray()) || [];
  const flightsRef = useRef<Flight[]>(activeFlights);
  useEffect(() => { flightsRef.current = activeFlights; }, [activeFlights]);
  const seenRef = useRef<Set<string>>(new Set()); // flights we've done the "catch-up" pass for
  const inflightRef = useRef<Set<string>>(new Set()); // moments currently being processed

  useEffect(() => {
    const tick = async () => {
      const now = useStore.getState().getNow();
      const player = await db.player.get('player');
      for (const flight of flightsRef.current) {
        if (!isPlayerAboard(flight) || !flight.waypoints || flight.waypoints.length < 2) continue;
        const aircraft = await db.aircraft.where('tailNumber').equals(flight.tailNumber).first();
        const snap = getFlightSnapshot(flight, aircraft, now);
        const companions = (flight.passengers || []).filter(p => p !== 'player');
        const moments = getFlightMoments(flight, aircraft, player, { hasCompany: true });
        const fired = new Set(flight.momentsFired || []);
        const due = moments.filter(m => m.at <= snap.progress && !fired.has(m.id));
        if (due.length === 0) continue;

        const firstPass = !seenRef.current.has(flight.id);
        seenRef.current.add(flight.id);
        const toFire: FlightMoment[] = [];
        for (const m of due) {
          // On the first pass after (re)opening the app, swallow stale beats except a pending text.
          if (firstPass && m.kind !== 'friend-text' && snap.progress - m.at > 0.02) { fired.add(m.id); continue; }
          toFire.push(m);
        }
        for (const m of toFire) {
          if (inflightRef.current.has(`${flight.id}:${m.id}`)) continue;
          inflightRef.current.add(`${flight.id}:${m.id}`);
          fired.add(m.id);
          try {
            if (m.haptic) haptic(m.haptic);
            if (m.kind === 'friend-text') {
              await fireFriendText(flight, snap.msRemaining, companions);
            } else if (m.kind !== 'pushback') {
              useStore.getState().addToast({ message: `${m.title} — ${m.body}`, link: `/flight/${flight.id}` });
            }
          } catch (e) { console.warn('moment failed', m.id, e); }
        }
        await db.flights.update(flight.id, { momentsFired: [...fired] });
      }
    };
    const id = setInterval(() => { tick().catch(console.error); }, 1000);
    return () => clearInterval(id);
  }, []);

  return null;
}

async function fireFriendText(flight: Flight, msRemaining: number, companions: string[]) {
  const dest = getAirport(flight.destinationICAO);
  const destCity = shortCity(dest, flight.destinationICAO);
  const hours = Math.max(1, Math.round(msRemaining / 3600000));
  // Prefer someone already at the destination; else a random friend elsewhere.
  const atDest = (await db.personaState.where('currentLocationICAO').equals(flight.destinationICAO).toArray()).filter(s => !companions.includes(s.personaId));
  let personaId: string | undefined;
  let situation = '';
  let fallback = '';
  if (atDest.length > 0) {
    personaId = atDest[Math.floor(Math.random() * atDest.length)].personaId;
    situation = `The player is mid-flight on their private jet to ${destCity} (${flight.destinationICAO}), landing in about ${hours} hour${hours > 1 ? 's' : ''}. You are already in ${destCity}. Text them about tonight — a specific place, a plan, or who else is around.`;
    fallback = `Heard you're wheels-down in ${destCity} in ${hours}h. I'm already here. Don't make plans.`;
  } else {
    const all = await db.personas.toArray();
    const pool = all.filter(p => !companions.includes(p.id));
    if (pool.length === 0) return;
    const p = pool[Math.floor(Math.random() * pool.length)];
    personaId = p.id;
    const theirState = await db.personaState.where('personaId').equals(p.id).first();
    const theirCity = shortCity(getAirport(theirState?.currentLocationICAO), theirState?.currentLocationICAO || 'somewhere');
    situation = `The player is somewhere over the ocean on their private jet heading to ${destCity}, landing in about ${hours} hour${hours > 1 ? 's' : ''}. You are in ${theirCity}. Text them something spontaneous — gossip, an invite, or teasing them about where they're going.`;
    fallback = `${destCity}?? Without me? Fine. Send photos.`;
  }
  if (!personaId) return;
  await sendProactiveDM(personaId, situation, { trigger: 'reaction', relatedId: flight.id, fallback, cooldownMs: 30 * 60 * 1000 });
}
