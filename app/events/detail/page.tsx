'use client';
import React, { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock, MapPin, Shirt, Ticket, Navigation2, Star, Users, Check } from 'lucide-react';
import { db } from '../../../lib/db';
import { routes } from '../../../lib/routes';
import { getEventNextOccurrence } from '../../lib/events';
import { useStore } from '../../lib/store';
import { getAirport, placeLine } from '../../../lib/flight/airports';
import { calculateDistanceNM } from '../../lib/math';
import { formatDurationMs } from '../../../lib/flight/engine';
import { PersonaAvatar } from '../../components/PersonaAvatar';
import { PageShell, PageHeader, Button, Chip, Artwork, Stat, money } from '../../components/ui';

function EventDetailPage() {
  const search = useSearchParams();
  const id = search.get('id') || '';
  const router = useRouter();
  const simNow = useStore(s => s.getNow());
  const raw = useLiveQuery(() => db.events.get(id), [id]);
  const attendances = useLiveQuery(() => db.eventAttendance.filter(ea => ea.eventId === id).toArray(), [id]) || [];
  const player = useLiveQuery(() => db.player.get('player'));
  const fleet = useLiveQuery(() => db.aircraft.toArray()) || [];
  const attendeeIds = useMemo(() => { const set = new Set<string>(raw?.confirmedAttendees || []); attendances.forEach(a => a.companionPersonaIds?.forEach(x => set.add(x))); return [...set]; }, [raw, attendances]);
  const attendees = useLiveQuery(() => db.personas.where('id').anyOf(attendeeIds).toArray(), [attendeeIds]) || [];

  if (raw === undefined) return <PageShell><div className="pt-10 text-zinc-500 text-sm">Pulling the dossier…</div></PageShell>;
  if (!raw) return <PageShell><PageHeader back="/destinations" title="Event not found" /></PageShell>;

  const evt = getEventNextOccurrence(raw, simNow);
  const start = new Date(evt.startDate).getTime(), end = new Date(evt.endDate).getTime();
  const status = simNow >= start && simNow <= end ? 'live' : simNow < start ? 'upcoming' : 'past';
  const a = getAirport(evt.locationICAO);
  const here = getAirport(player?.currentLocationICAO);
  const dist = a && here ? calculateDistanceNM(here.lat, here.lng, a.lat, a.lng) : null;
  const jet = fleet.find(j => j.status === 'parked' && j.currentLocationICAO === player?.currentLocationICAO) || fleet.find(j => j.status === 'parked');
  const eta = dist && jet ? dist / jet.speedKnots : null;
  const attended = attendances.length > 0;
  const gated = (player?.prestigeScore || 0) < evt.prestigeRequired;
  const dateLine = `${new Date(evt.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', timeZone: 'UTC' })} – ${new Date(evt.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

  return (
    <PageShell>
      <PageHeader back="/destinations" eyebrow={`${evt.category} · tier ${evt.prestigeTier}`} title={evt.name} subtitle={dateLine} actions={<Button disabled={status === 'past'} onClick={() => router.push(routes.planner({ destination: evt.locationICAO, purpose: `event:${evt.id}` }))}><Navigation2 size={14} /> Fly there</Button>} />
      <Artwork src={evt.imageUrl} alt={evt.name} className="aspect-[16/9] md:aspect-[21/9] rounded-3xl border border-white/8">
        <div className="absolute top-3 left-3 flex gap-1.5">
          {status === 'live' && <Chip tone="accent"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" /> Happening now</Chip>}
          {status === 'upcoming' && <Chip><Clock size={10} /> In {formatDurationMs(start - simNow)}</Chip>}
          {attended && <Chip tone="mint"><Check size={10} /> You were there</Chip>}
          {gated && <Chip tone="amber"><Star size={10} /> Invite only · {evt.prestigeRequired} prestige</Chip>}
        </div>
      </Artwork>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
        <Stat icon={<MapPin size={11} />} label="Where" value={(evt.locationCity || '').split(',')[0]} sub={a ? `${a.icao} · ${placeLine(a)}` : evt.locationICAO} />
        <Stat icon={<Ticket size={11} />} label="Ticket" value={evt.ticketPrice ? money(evt.ticketPrice) : 'Invitation'} sub={`${evt.prestigeRequired} prestige to enter`} />
        <Stat icon={<Shirt size={11} />} label="Dress" value={<span className="text-[13px] font-sans font-medium">{evt.dressCode.split(/[;,.]/)[0]}</span>} />
        <Stat icon={<Navigation2 size={11} />} label="From you" value={dist !== null ? `${Math.round(dist).toLocaleString()} NM` : '—'} sub={eta ? `${formatDurationMs(eta * 3600000)} in ${jet?.tailNumber}` : undefined} />
      </div>
      <p className="text-[15px] text-zinc-200 leading-relaxed mt-5 max-w-3xl font-serif text-balance">{evt.description}</p>
      {evt.dressCode && <p className="text-[12.5px] text-zinc-500 mt-2 max-w-3xl">Dress: {evt.dressCode}</p>}
      <div className="mt-6">
        <div className="eyebrow mb-2 flex items-center gap-1.5"><Users size={11} /> Who&apos;s going</div>
        {attendees.length === 0 ? <div className="text-[13px] text-zinc-500">Nobody from your circle has confirmed yet.</div> : (
          <div className="flex flex-wrap gap-2">{attendees.map(p => <button key={p.id} onClick={() => router.push(routes.persona(p.id))} className="flex items-center gap-2 pr-3 rounded-full bg-white/5 hover:bg-white/10"><PersonaAvatar persona={p} size={34} /><span className="text-[12.5px] text-white">{p.displayName}</span></button>)}</div>
        )}
      </div>
      <div className="mt-6 flex gap-2">
        <Button className="flex-1" disabled={status === 'past'} onClick={() => router.push(routes.planner({ destination: evt.locationICAO, purpose: `event:${evt.id}` }))}><Navigation2 size={14} /> Plan the flight</Button>
        <Button variant="secondary" onClick={() => { useStore.getState().setPeek({ kind: 'event', id: evt.id }); router.push('/'); }}><MapPin size={14} /> On the globe</Button>
      </div>
    </PageShell>
  );
}

export default function Page() { return <Suspense fallback={null}><EventDetailPage /></Suspense>; }
