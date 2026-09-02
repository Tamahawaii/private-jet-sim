'use client';
import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Navigation2, Home, Anchor, Sparkles, Star, Users } from 'lucide-react';
import { db } from '../../lib/db';
import { routes } from '../../lib/routes';
import { getEventNextOccurrence } from '../lib/events';
import { useStore } from '../lib/store';
import { BillionaireEvent, Resort, Residence, Persona, PersonaState, Marina } from '../../types';
import { getAirport, placeLine, shortCity } from '../../lib/flight/airports';
import { calculateDistanceNM } from '../lib/math';
import { PersonaAvatar } from '../components/PersonaAvatar';
import { PageShell, PageHeader, Tabs, Button, Chip, Artwork, money } from '../components/ui';

type Tab = 'events' | 'resorts' | 'homes' | 'marinas';

function fmtRange(startIso: string, endIso: string) {
  const s = new Date(startIso), e = new Date(endIso);
  const same = s.getUTCMonth() === e.getUTCMonth();
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${e.toLocaleDateString('en-US', same ? { day: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

function DestinationsContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>((search.get('tab') as Tab) || 'events');
  useEffect(() => { const t = search.get('tab') as Tab | null; if (t && ['events', 'resorts', 'homes', 'marinas'].includes(t)) setTab(t); }, [search]);
  const near = search.get('near');
  const [simNow] = useState(() => useStore.getState().getNow());
  const [region, setRegion] = useState<string>('all');

  const rawEvents = (useLiveQuery(() => db.events.toArray()) || []) as BillionaireEvent[];
  const resorts = (useLiveQuery(() => db.resorts.toArray()) || []) as Resort[];
  const residences = (useLiveQuery(() => db.residences.toArray()) || []) as Residence[];
  const marinas = (useLiveQuery(() => db.marinas.toArray()) || []) as Marina[];
  const personas = (useLiveQuery(() => db.personas.toArray()) || []) as Persona[];
  const states = (useLiveQuery(() => db.personaState.toArray()) || []) as PersonaState[];
  const player = useLiveQuery(() => db.player.get('player'));
  const here = getAirport(near || player?.currentLocationICAO);

  const events = useMemo(() => rawEvents.map(e => getEventNextOccurrence(e, simNow)).filter(e => new Date(e.endDate).getTime() > simNow).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [rawEvents, simNow]);
  const regions = useMemo(() => ['all', ...Array.from(new Set(resorts.map(r => r.region))).sort()], [resorts]);
  const visibleResorts = useMemo(() => {
    let list = resorts.filter(r => region === 'all' || r.region === region);
    if (here) list = [...list].sort((a, b) => calculateDistanceNM(here.lat, here.lng, a.lat, a.lng) - calculateDistanceNM(here.lat, here.lng, b.lat, b.lng));
    else list = [...list].sort((a, b) => b.tier - a.tier);
    return list;
  }, [resorts, region, here?.icao]);

  const distanceLabel = (lat: number, lng: number) => here ? `${Math.round(calculateDistanceNM(here.lat, here.lng, lat, lng)).toLocaleString()} NM from ${shortCity(here)}` : '';
  const friendsAt = (icao: string) => personas.filter(p => states.find(s => s.personaId === p.id)?.currentLocationICAO === icao);

  return (
    <PageShell width="max-w-6xl">
      <PageHeader eyebrow="Travel" title={tab === 'events' ? 'The season.' : tab === 'resorts' ? 'Somewhere better.' : tab === 'homes' ? 'Your homes.' : 'Harbours.'} subtitle={here ? `Measured from ${placeLine(here)}` : undefined} />
      <Tabs tabs={[{ id: 'events', label: 'Events', count: events.length }, { id: 'resorts', label: 'Resorts', count: resorts.length }, { id: 'homes', label: 'Homes', count: residences.filter(r => r.owned).length }, { id: 'marinas', label: 'Marinas', count: marinas.length }]} value={tab} onChange={setTab} />

      {tab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map(evt => {
            const a = getAirport(evt.locationICAO);
            const soon = new Date(evt.startDate).getTime() - simNow < 14 * 86400000;
            const attendees = (evt.confirmedAttendees || []).map(id => personas.find(p => p.id === id)).filter(Boolean) as Persona[];
            return (
              <div key={evt.id} className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-[var(--color-gold)]/40 transition-colors flex flex-col">
                <Link href={routes.event(evt.id)}>
                  <Artwork src={evt.imageUrl} alt={evt.name} className="aspect-[16/9]">
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070b12] to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5"><Chip tone="gold"><Star size={10} /> Tier {evt.prestigeTier}</Chip>{soon && <Chip tone="accent">Soon</Chip>}</div>
                    <div className="absolute left-4 right-4 bottom-3 font-serif text-[20px] leading-tight text-white text-balance">{evt.name}</div>
                  </Artwork>
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-[12px] text-zinc-400 flex flex-wrap gap-x-3 gap-y-1"><span className="flex items-center gap-1"><Calendar size={11} className="text-[var(--accent)]" /> {fmtRange(evt.startDate, evt.endDate)}</span><span className="flex items-center gap-1"><MapPin size={11} className="text-[var(--accent)]" /> {(evt.locationCity || '').split(',')[0]}</span></div>
                  {a && here && <div className="text-[11px] font-mono text-zinc-500 mt-1">{distanceLabel(a.lat, a.lng)}</div>}
                  {attendees.length > 0 && <div className="flex items-center gap-2 mt-2.5"><div className="flex -space-x-2">{attendees.slice(0, 4).map(p => <PersonaAvatar key={p.id} persona={p} size={22} className="border border-[#070b12]" />)}</div><span className="text-[11px] text-[var(--rose)] truncate">{attendees.slice(0, 2).map(p => p.displayName.split(' ')[0]).join(' & ')}{attendees.length > 2 ? ` +${attendees.length - 2}` : ''} going</span></div>}
                  <div className="flex gap-2 mt-auto pt-3">
                    <Button variant="secondary" size="sm" className="flex-1" href={routes.event(evt.id)}>Dossier</Button>
                    <Button size="sm" className="flex-1" href={routes.planner({ destination: evt.locationICAO, purpose: `event:${evt.id}` })}><Navigation2 size={13} /> Fly there</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'resorts' && (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">{regions.map(r => <button key={r} onClick={() => setRegion(r)} className={`h-8 px-3 rounded-full text-[11.5px] font-semibold whitespace-nowrap border ${region === r ? 'bg-white/12 border-white/20 text-white' : 'border-white/8 text-zinc-500 hover:text-white'}`}>{r === 'all' ? 'Everywhere' : r}</button>)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleResorts.map(r => {
              const fans = (r.preferredBy || []).map(id => personas.find(p => p.id === id)).filter(Boolean) as Persona[];
              return (
                <div key={r.id} className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-[var(--rose)]/40 transition-colors flex flex-col">
                  <Link href={routes.resort(r.id)}>
                    <Artwork src={r.imageUrl} alt={r.name} className="aspect-[16/9]">
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070b12] to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-1.5"><Chip tone="rose">Tier {r.tier}</Chip><Chip>{r.brand}</Chip></div>
                      <div className="absolute left-4 right-4 bottom-3 font-serif text-[20px] leading-tight text-white">{r.name}</div>
                    </Artwork>
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="text-[12px] text-zinc-400 flex items-center gap-1"><MapPin size={11} className="text-[var(--rose)]" /> {r.city}, {r.country} · from ${r.nightlyRate.toLocaleString()}/night</div>
                    {here && <div className="text-[11px] font-mono text-zinc-500 mt-1">{distanceLabel(r.lat, r.lng)}</div>}
                    <p className="text-[12.5px] text-zinc-400 mt-2 line-clamp-2">{r.shortDescription}</p>
                    {fans.length > 0 && <div className="flex items-center gap-2 mt-2.5"><div className="flex -space-x-2">{fans.slice(0, 3).map(p => <PersonaAvatar key={p.id} persona={p} size={22} className="border border-[#070b12]" />)}</div><span className="text-[11px] text-[var(--rose)]">{fans[0].displayName.split(' ')[0]}{fans.length > 1 ? ` +${fans.length - 1}` : ''} love it here</span></div>}
                    <div className="flex gap-2 mt-auto pt-3">
                      <Button variant="secondary" size="sm" className="flex-1" href={routes.resort(r.id)}>Details</Button>
                      <Button size="sm" className="flex-1" href={routes.planner({ destination: r.locationICAO, purpose: `resort:${r.id}` })}><Navigation2 size={13} /> Fly there</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'homes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {residences.filter(r => r.owned).map(r => {
            const a = getAirport(r.nearestAirportICAO);
            const friends = friendsAt(r.nearestAirportICAO);
            const youAreHere = player?.currentLocationICAO === r.nearestAirportICAO;
            return (
              <div key={r.id} className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-[var(--accent)]/40 transition-colors flex flex-col">
                <Link href={routes.residence(r.id)}>
                  <Artwork src={r.imageUrl} alt={r.name} className="aspect-[16/9]">
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070b12] to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-1.5"><Chip tone={r.isPrimary ? 'accent' : 'neutral'}><Home size={10} /> {r.isPrimary ? 'Home base' : r.type.replace('-', ' ')}</Chip>{youAreHere && <Chip tone="mint">You're here</Chip>}</div>
                    <div className="absolute left-4 right-4 bottom-3 font-serif text-[20px] leading-tight text-white">{r.name}</div>
                  </Artwork>
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-[12px] text-zinc-400 flex items-center gap-1"><MapPin size={11} className="text-[var(--accent)]" /> {r.city}, {r.country} · valued {money(r.currentValuation)}</div>
                  {friends.length > 0 && <div className="flex items-center gap-2 mt-2.5"><div className="flex -space-x-2">{friends.slice(0, 4).map(p => <PersonaAvatar key={p.id} persona={p} size={22} className="border border-[#070b12]" />)}</div><span className="text-[11px] text-[var(--rose)]">{friends.length} in town</span></div>}
                  <div className="flex gap-2 mt-auto pt-3">
                    <Button variant="secondary" size="sm" className="flex-1" href={routes.residence(r.id)}><Sparkles size={13} /> Host</Button>
                    <Button size="sm" className="flex-1" disabled={youAreHere} href={a ? routes.planner({ destination: a.icao }) : undefined}><Navigation2 size={13} /> Fly home</Button>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={() => router.push('/acquisitions?tab=homes')} className="rounded-3xl border border-dashed border-white/12 hover:border-white/25 p-8 text-left flex flex-col justify-center min-h-[220px]">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 mb-3"><Home size={16} /></div>
            <div className="font-serif text-[20px] text-white">Add an address.</div>
            <div className="text-[12.5px] text-zinc-500 mt-1">Mayfair, Aspen, Cap d&apos;Antibes, a motu in Bora Bora. {residences.filter(r => !r.owned).length} on the market.</div>
          </button>
        </div>
      )}

      {tab === 'marinas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...marinas].sort((a, b) => (here ? calculateDistanceNM(here.lat, here.lng, a.lat, a.lng) - calculateDistanceNM(here.lat, here.lng, b.lat, b.lng) : b.tier - a.tier)).map(m => (
            <div key={m.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col">
              <div className="flex items-start justify-between gap-3"><div><div className="text-[15px] text-white">{m.name}</div><div className="text-[12px] text-zinc-500">{m.city}, {m.country}</div></div><Chip tone="accent"><Anchor size={10} /> {m.basin.replace('-', ' ')}</Chip></div>
              <p className="text-[12.5px] text-zinc-400 mt-2 flex-1">{m.vibe}</p>
              {here && <div className="text-[11px] font-mono text-zinc-500 mt-2">{distanceLabel(m.lat, m.lng)}</div>}
              <div className="flex gap-2 mt-3"><Button size="sm" variant="secondary" className="flex-1" href={routes.planner({ destination: m.nearestAirportICAO })}><Navigation2 size={13} /> Fly there</Button><Button size="sm" variant="ghost" onClick={() => { useStore.getState().setPeek({ kind: 'marina', id: m.id }); router.push('/'); }}><MapPin size={13} /> Map</Button></div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

export default function DestinationsPage() {
  return <Suspense fallback={null}><DestinationsContent /></Suspense>;
}
