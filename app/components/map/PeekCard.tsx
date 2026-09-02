'use client';

import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Navigation2, Plane, MessageCircle, FileText, MapPin, CalendarDays, Crosshair } from 'lucide-react';
import { db } from '../../../lib/db';
import { useStore } from '../../lib/store';
import { Aircraft, Persona } from '../../../types';
import { getAirport, placeLine, shortCity, countryName } from '../../../lib/flight/airports';
import { calculateDistanceNM } from '../../lib/math';
import { getEventNextOccurrence } from '../../lib/events';
import { getFlightSnapshot, formatDurationMs } from '../../../lib/flight/engine';
import { PersonaAvatar } from '../PersonaAvatar';

interface Props {
  fleet: Aircraft[];
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  onOpen: (href: string) => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Which jet would fly to a target: the selected parked jet, else the nearest parked one. */
function pickJet(fleet: Aircraft[], selectedId: string | null, lat: number, lng: number): { jet: Aircraft; distance: number; inRange: boolean } | null {
  const parked = fleet.filter(j => j.status === 'parked' && j.currentLocation);
  if (parked.length === 0) return null;
  const sel = parked.find(j => j.id === selectedId || j.tailNumber === selectedId);
  const candidates = sel ? [sel] : parked;
  let best: { jet: Aircraft; distance: number } | null = null;
  for (const j of candidates) {
    const d = calculateDistanceNM(j.currentLocation!.lat, j.currentLocation!.lng, lat, lng);
    if (!best || d < best.distance) best = { jet: j, distance: d };
  }
  if (!best) return null;
  return { ...best, inRange: best.distance <= best.jet.rangeNM };
}

export default function PeekCard({ fleet, onFlyTo, onOpen }: Props) {
  const peek = useStore(s => s.peek);
  const setPeek = useStore(s => s.setPeek);
  const selectedAircraftId = useStore(s => s.selectedAircraftId);

  const event = useLiveQuery(() => (peek?.kind === 'event' ? db.events.get(peek.id) : undefined), [peek?.kind, peek?.id]);
  const resort = useLiveQuery(() => (peek?.kind === 'resort' ? db.resorts.get(peek.id) : undefined), [peek?.kind, peek?.id]);
  const persona = useLiveQuery(() => (peek?.kind === 'persona' ? db.personas.get(peek.id) : undefined), [peek?.kind, peek?.id]);
  const personaState = useLiveQuery(() => (peek?.kind === 'persona' ? db.personaState.where('personaId').equals(peek.id).first() : undefined), [peek?.kind, peek?.id]);
  const personas = useLiveQuery(() => (peek?.kind === 'event' ? db.personas.toArray() : Promise.resolve([] as Persona[])), [peek?.kind]) || [];
  const aircraft = peek?.kind === 'aircraft' ? fleet.find(a => a.id === peek.id || a.tailNumber === peek.id) : undefined;
  const flight = useLiveQuery(() => (aircraft?.currentFlightID ? db.flights.get(aircraft.currentFlightID) : undefined), [aircraft?.currentFlightID]);
  const simNow = useStore.getState().getNow();

  const body = useMemo(() => {
    if (!peek) return null;
    if (peek.kind === 'aircraft' && aircraft) {
      const here = getAirport(aircraft.currentLocationICAO);
      const inFlight = aircraft.status === 'in_transit' && flight;
      const snap = inFlight && flight ? getFlightSnapshot(flight, aircraft, simNow) : null;
      const dest = flight ? getAirport(flight.destinationICAO) : undefined;
      return {
        eyebrow: inFlight ? 'YOUR JET · IN FLIGHT' : 'YOUR JET · PARKED',
        title: aircraft.tailNumber,
        titleMono: true,
        subtitle: aircraft.model,
        line: inFlight && snap ? `${snap.phaseLabel} · ${shortCity(dest, flight!.destinationICAO)} in ${formatDurationMs(snap.msRemaining)}` : `At ${placeLine(here, aircraft.currentLocationICAO)}`,
        coords: inFlight && snap ? snap.position : (aircraft.currentLocation ? [aircraft.currentLocation.lng, aircraft.currentLocation.lat] as [number, number] : null),
        actions: inFlight
          ? [{ label: 'Watch flight', href: `/flight/${aircraft.currentFlightID}`, primary: true, icon: <Plane size={14} /> }, { label: 'Craft', href: `/fleet/${aircraft.tailNumber}`, icon: <FileText size={14} /> }]
          : [{ label: 'Dispatch', href: `/flight/new?aircraft=${aircraft.tailNumber}`, primary: true, icon: <Navigation2 size={14} /> }, { label: 'Craft', href: `/fleet/${aircraft.tailNumber}`, icon: <FileText size={14} /> }],
        avatars: null,
      };
    }
    if (peek.kind === 'event' && event) {
      const evt = getEventNextOccurrence(event, simNow);
      const a = getAirport(evt.locationICAO);
      const reach = a ? pickJet(fleet, selectedAircraftId, a.lat, a.lng) : null;
      const attendees = (evt.confirmedAttendees || []).map(id => personas.find(p => p.id === id)).filter(Boolean);
      return {
        eyebrow: `EVENT · TIER ${evt.prestigeTier} · ${evt.category.replace(/_/g, ' ')}`,
        title: evt.name,
        titleMono: false,
        subtitle: `${fmtDate(evt.startDate)} – ${fmtDate(evt.endDate)} · ${evt.locationCity}`,
        line: reach ? `${Math.round(reach.distance).toLocaleString()} NM from ${reach.jet.tailNumber} · ${reach.inRange ? 'in range' : 'beyond range'}` : 'No parked jet available',
        lineTone: reach ? (reach.inRange ? 'ok' : 'warn') : 'muted',
        coords: a ? [a.lng, a.lat] as [number, number] : null,
        actions: [
          { label: 'Fly there', href: `/flight/new?${reach ? `aircraft=${reach.jet.tailNumber}&` : ''}destination=${evt.locationICAO}&purpose=event:${evt.id}`, primary: true, icon: <Navigation2 size={14} />, disabled: !!reach && !reach.inRange },
          { label: 'Dossier', href: `/events/${evt.id}`, icon: <CalendarDays size={14} /> },
        ],
        avatars: attendees.slice(0, 4) as NonNullable<typeof attendees[number]>[],
      };
    }
    if (peek.kind === 'resort' && resort) {
      const reach = pickJet(fleet, selectedAircraftId, resort.lat, resort.lng);
      return {
        eyebrow: `RESORT · ${resort.brand} · TIER ${resort.tier}`,
        title: resort.name,
        titleMono: false,
        subtitle: `${resort.city}, ${resort.country} · from $${resort.nightlyRate.toLocaleString()}/night`,
        line: reach ? `${Math.round(reach.distance).toLocaleString()} NM from ${reach.jet.tailNumber} · ${reach.inRange ? 'in range' : 'beyond range'}` : 'No parked jet available',
        lineTone: reach ? (reach.inRange ? 'ok' : 'warn') : 'muted',
        coords: [resort.lng, resort.lat] as [number, number],
        actions: [
          { label: 'Fly there', href: `/flight/new?${reach ? `aircraft=${reach.jet.tailNumber}&` : ''}destination=${resort.locationICAO}&purpose=resort:${resort.id}`, primary: true, icon: <Navigation2 size={14} />, disabled: !!reach && !reach.inRange },
          { label: 'Details', href: `/resorts/${resort.id}`, icon: <FileText size={14} /> },
        ],
        avatars: null,
      };
    }
    if (peek.kind === 'persona' && persona) {
      const a = getAirport(personaState?.currentLocationICAO);
      return {
        eyebrow: `FRIEND · ${persona.archetype.replace(/_/g, ' ')}`,
        title: persona.displayName,
        titleMono: false,
        subtitle: a ? `In ${placeLine(a)}` : (personaState?.currentLocationICAO || 'Location unknown'),
        line: personaState?.mood ? `Mood: ${personaState.mood}` : '',
        coords: personaState?.currentCoords ? [personaState.currentCoords.lng, personaState.currentCoords.lat] as [number, number] : null,
        actions: [
          { label: 'Message', href: `/social/dms/${persona.id}`, primary: true, icon: <MessageCircle size={14} /> },
          { label: 'Dossier', href: `/social/${persona.id}`, icon: <FileText size={14} /> },
        ],
        avatars: null,
        personaAvatar: persona,
      };
    }
    if (peek.kind === 'airport') {
      const a = getAirport(peek.id);
      if (!a) return null;
      const reach = pickJet(fleet, selectedAircraftId, a.lat, a.lng);
      return {
        eyebrow: `AIRPORT${a.iata ? ` · ${a.iata}` : ''} · ${countryName(a.country)}`,
        title: a.icao,
        titleMono: true,
        subtitle: `${a.name}${a.city ? ` · ${shortCity(a)}` : ''}`,
        line: reach ? `${Math.round(reach.distance).toLocaleString()} NM from ${reach.jet.tailNumber} · ${reach.inRange ? 'in range' : 'beyond range'}` : 'No parked jet available',
        lineTone: reach ? (reach.inRange ? 'ok' : 'warn') : 'muted',
        coords: [a.lng, a.lat] as [number, number],
        actions: [
          { label: 'Fly there', href: `/flight/new?${reach ? `aircraft=${reach.jet.tailNumber}&` : ''}destination=${a.icao}`, primary: true, icon: <Navigation2 size={14} />, disabled: !!reach && !reach.inRange },
        ],
        avatars: null,
      };
    }
    return null;
  }, [peek, aircraft, flight, event, resort, persona, personaState, personas, fleet, selectedAircraftId, simNow]);

  return (
    <AnimatePresence>
      {peek && body && (
        <motion.div
          key={`${peek.kind}:${peek.id}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute left-3 right-3 md:left-6 md:right-auto md:w-[380px] z-40 pointer-events-auto"
          style={{ bottom: 'calc(var(--tabbar-h) + 12px)' }}
        >
          <div className="glass rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              {'personaAvatar' in body && body.personaAvatar ? <PersonaAvatar persona={body.personaAvatar} size={44} className="border border-white/10" /> : null}
              <div className="flex-1 min-w-0">
                <div className="eyebrow truncate">{body.eyebrow}</div>
                <div className={`mt-0.5 text-white leading-tight ${body.titleMono ? 'font-mono text-2xl font-bold tracking-wider' : 'font-serif text-[22px]'}`}>{body.title}</div>
                <div className="text-[13px] text-zinc-400 mt-0.5 truncate">{body.subtitle}</div>
                {body.line && (
                  <div className={`text-[12px] mt-1.5 flex items-center gap-1.5 ${('lineTone' in body && body.lineTone === 'warn') ? 'text-amber-300' : ('lineTone' in body && body.lineTone === 'ok') ? 'text-[var(--accent)]' : 'text-zinc-500'}`}>
                    <MapPin size={12} /> {body.line}
                  </div>
                )}
                {body.avatars && body.avatars.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex -space-x-2">{body.avatars.map(p => <PersonaAvatar key={p.id} persona={p} size={22} className="border border-[#0a0f18]" />)}</div>
                    <span className="text-[11px] text-[#f5a7a7]">{body.avatars.map(p => p.displayName.split(' ')[0]).slice(0, 2).join(', ')}{body.avatars.length > 2 ? ` +${body.avatars.length - 2}` : ''} attending</span>
                  </div>
                )}
              </div>
              <button onClick={() => setPeek(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400" aria-label="Close"><X size={14} /></button>
            </div>
            <div className="flex gap-2 mt-3">
              {body.actions.map(a => (
                <button
                  key={a.label}
                  disabled={'disabled' in a && a.disabled}
                  onClick={() => onOpen(a.href)}
                  className={`flex-1 h-10 rounded-xl text-[12px] font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 ${a.primary ? 'bg-[var(--accent)] text-black hover:bg-white' : 'bg-white/8 text-white hover:bg-white/15 border border-white/10'}`}
                >
                  {a.icon} {a.label}
                </button>
              ))}
              {body.coords && (
                <button onClick={() => onFlyTo(body.coords![0], body.coords![1], 5.5)} className="w-10 h-10 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center" title="Zoom to">
                  <Crosshair size={14} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
