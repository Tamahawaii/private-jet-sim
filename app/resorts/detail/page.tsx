'use client';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapPin, Navigation2, Check, Star, Plus, Minus, BedDouble, Sparkles, Shirt, Users, X, Plane } from 'lucide-react';
import { db } from '../../../lib/db';
import { routes } from '../../../lib/routes';
import { useStore } from '../../lib/store';
import { bookResortAndFly, extendStay, purchaseExperience } from '../../lib/resorts';
import { calculateFlightBriefing } from '../../../lib/simulation';
import { getAirport, placeLine } from '../../../lib/flight/airports';
import { formatDurationMs } from '../../../lib/flight/engine';
import { Aircraft, Persona, SignatureExperience } from '../../../types';
import { PersonaAvatar } from '../../components/PersonaAvatar';
import { PageShell, PageHeader, Button, Chip, Artwork, Stat, money } from '../../components/ui';

function ResortDetailPage() {
  const search = useSearchParams();
  const router = useRouter();
  const resortId = search.get('id') || '';
  const simNow = useStore(s => s.getNow());
  const addToast = useStore(s => s.addToast);
  const resort = useLiveQuery(() => db.resorts.get(resortId), [resortId]);
  const fans = (useLiveQuery(() => db.personas.where('id').anyOf(resort?.preferredBy || []).toArray(), [resort?.id]) || []) as Persona[];
  const player = useLiveQuery(() => db.player.get('player'));
  const fleet = (useLiveQuery(() => db.aircraft.toArray()) || []) as Aircraft[];
  const activeBooking = useLiveQuery(async () => db.resortBookings.toCollection().filter(b => { if (!b.checkOutAt) return false; return simNow >= new Date(b.checkInAt).getTime() && simNow < new Date(b.checkOutAt).getTime(); }).first(), [Math.floor(simNow / 60000)]);
  const [open, setOpen] = useState(false);
  const [nights, setNights] = useState(3);
  const [tail, setTail] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (fleet.length && !tail) { const parked = fleet.find(f => f.status === 'parked'); setTail((parked || fleet[0]).tailNumber); } }, [fleet, tail]);

  const jet = fleet.find(f => f.tailNumber === tail);
  const dest = getAirport(resort?.locationICAO);
  const brief = useMemo(() => (jet?.currentLocation && dest ? calculateFlightBriefing(jet, { lat: jet.currentLocation.lat, lng: jet.currentLocation.lng }, { lat: dest.lat, lng: dest.lng }) : null), [jet?.tailNumber, dest?.icao]);

  if (resort === undefined) return <PageShell><div className="pt-10 text-zinc-500 text-sm">Calling the concierge…</div></PageShell>;
  if (!resort) return <PageShell><PageHeader back="/destinations?tab=resorts" title="Resort not found" /></PageShell>;

  const isHere = player?.currentLocationICAO === resort.locationICAO;
  const staying = activeBooking?.resortId === resortId;
  const stayCost = resort.nightlyRate * nights;
  const total = (brief?.totalCost || 0) + stayCost;
  const canAfford = (player?.netWorth || 0) >= total;
  const inRange = brief && jet ? brief.distanceNM <= jet.rangeNM : false;
  const checkout = activeBooking?.checkOutAt ? new Date(activeBooking.checkOutAt).getTime() : 0;

  const run = async (fn: () => Promise<unknown>, ok?: string) => { setBusy(true); try { await fn(); if (ok) addToast({ message: ok }); } catch (e: unknown) { addToast({ message: (e as Error).message || 'That did not work.' }); } finally { setBusy(false); } };

  return (
    <PageShell>
      <PageHeader back="/destinations?tab=resorts" eyebrow={`${resort.brand} · ${resort.category.replace(/-/g, ' ')} · tier ${resort.tier}`} title={resort.name} subtitle={`${resort.city}, ${resort.country} · from $${resort.nightlyRate.toLocaleString()} a night`} actions={staying ? <Chip tone="mint"><Check size={10} /> Checked in</Chip> : <Button onClick={() => setOpen(true)} disabled={fleet.length === 0}><BedDouble size={14} /> Book a stay</Button>} />
      <Artwork src={resort.imageUrl} alt={resort.name} className="aspect-[16/9] md:aspect-[21/9] rounded-3xl border border-white/8">
        <div className="absolute top-3 left-3 flex gap-1.5">{isHere && <Chip tone="accent">You're here</Chip>}{staying && <Chip tone="mint">Checkout in {formatDurationMs(checkout - simNow)}</Chip>}</div>
      </Artwork>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
        <Stat icon={<MapPin size={11} />} label="Airport" value={resort.locationICAO} sub={placeLine(dest, resort.nearestAirport)} />
        <Stat icon={<BedDouble size={11} />} label="Nightly" value={money(resort.nightlyRate)} sub={resort.currency} />
        <Stat icon={<Star size={11} />} label="Tier" value={`${resort.tier} / 5`} sub={resort.region} />
        <Stat icon={<Shirt size={11} />} label="Dress" value={<span className="text-[13px] font-sans font-medium">{resort.dressCode.split(/[;,.]/)[0]}</span>} />
      </div>
      <p className="text-[15px] text-zinc-200 leading-relaxed mt-5 max-w-3xl font-serif text-balance">{resort.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-4">{resort.amenities.map(a => <span key={a} className="text-[11.5px] px-2.5 py-1 rounded-lg bg-white/5 text-zinc-200 capitalize">{a}</span>)}</div>

      {fans.length > 0 && (
        <div className="mt-6"><div className="eyebrow mb-2 flex items-center gap-1.5"><Users size={11} /> Regulars from your circle</div><div className="flex flex-wrap gap-2">{fans.map(p => <button key={p.id} onClick={() => router.push(routes.persona(p.id))} className="flex items-center gap-2 pr-3 rounded-full bg-white/5 hover:bg-white/10"><PersonaAvatar persona={p} size={34} /><span className="text-[12.5px] text-white">{p.displayName}</span></button>)}</div></div>
      )}

      <div className="mt-6">
        <div className="eyebrow mb-2 flex items-center gap-1.5"><Sparkles size={11} /> Signature experiences</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {resort.signatureExperiences.map((se: SignatureExperience) => {
            const bought = staying && activeBooking?.experiencesPurchased?.includes(se.id);
            return (
              <div key={se.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3"><div className="text-[14px] text-white">{se.name}</div><div className="font-mono text-[13px] text-zinc-300 shrink-0">{money(se.price)}</div></div>
                <p className="text-[12.5px] text-zinc-400 mt-1 flex-1">{se.description}</p>
                <div className="mt-3"><Button size="sm" variant={bought ? 'secondary' : 'primary'} disabled={!staying || bought || busy} onClick={() => run(() => purchaseExperience(resort.id, activeBooking!.id, se.id, se.price), `${se.name} — arranged.`)}>{bought ? <><Check size={13} /> Booked</> : staying ? 'Arrange' : 'Check in first'}</Button></div>
              </div>
            );
          })}
        </div>
      </div>

      {staying && (
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center justify-between gap-3"><div><div className="text-[14px] text-white">Extend the stay</div><div className="text-[12px] text-zinc-500">One more night, {money(resort.nightlyRate)}. Checkout is in {formatDurationMs(checkout - simNow)}.</div></div><Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => extendStay(activeBooking!.id, resort.nightlyRate, 1), 'One more night.')}><Plus size={13} /> Night</Button></div>
      )}

      {open && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setOpen(false)}>
          <div className="w-full md:max-w-lg glass rounded-t-3xl md:rounded-3xl p-5 max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><div><div className="eyebrow">Book</div><div className="font-serif text-[22px] text-white">{resort.name}</div></div><button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-zinc-300"><X size={15} /></button></div>
            <div className="eyebrow mb-2">Nights</div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 mb-4"><button onClick={() => setNights(Math.max(1, nights - 1))} className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center"><Minus size={14} /></button><div className="flex-1 text-center font-mono text-[18px] text-white">{nights} night{nights > 1 ? 's' : ''}</div><button onClick={() => setNights(nights + 1)} className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center"><Plus size={14} /></button></div>
            <div className="eyebrow mb-2">Aircraft</div>
            <div className="space-y-1.5 mb-4">{fleet.filter(f => f.status === 'parked').map(f => (
              <button key={f.tailNumber} onClick={() => setTail(f.tailNumber)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left ${tail === f.tailNumber ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10' : 'border-white/8 bg-white/[0.03]'}`}><Plane size={14} className="text-zinc-400" /><div className="flex-1 min-w-0"><div className="font-mono text-[13px] text-white">{f.tailNumber} <span className="text-zinc-500 font-sans">· {f.model}</span></div><div className="text-[11px] text-zinc-500">at {f.currentLocationICAO} · range {f.rangeNM.toLocaleString()} NM</div></div>{tail === f.tailNumber && <Check size={14} className="text-[var(--accent)]" />}</button>
            ))}{fleet.filter(f => f.status === 'parked').length === 0 && <div className="text-[12.5px] text-zinc-500">No aircraft parked right now.</div>}</div>
            <div className="rounded-2xl bg-black/30 border border-white/8 p-3 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between text-zinc-400"><span>Flight{brief ? ` · ${Math.round(brief.distanceNM).toLocaleString()} NM · ${formatDurationMs(brief.durationHours * 3600000)}` : ''}</span><span className="font-mono text-zinc-200">{brief ? money(brief.totalCost) : '—'}</span></div>
              <div className="flex justify-between text-zinc-400"><span>{nights} night{nights > 1 ? 's' : ''} at {money(resort.nightlyRate)}</span><span className="font-mono text-zinc-200">{money(stayCost)}</span></div>
              <div className="flex justify-between text-white border-t border-white/8 pt-1.5"><span>Total</span><span className="font-mono">{money(total)}</span></div>
              {brief && !inRange && <div className="text-amber-300 text-[11.5px]">Out of range for {jet?.model}. Pick a longer-legged jet.</div>}
            </div>
            <Button className="w-full mt-4" disabled={!brief || !jet || !inRange || !canAfford || busy} onClick={() => run(async () => {
              const id = await bookResortAndFly({ resortId, checkInMs: simNow + (brief!.durationHours * 3600000), nights, nightlyRate: resort.nightlyRate, aircraftId: jet!.tailNumber, originICAO: jet!.currentLocationICAO, destinationICAO: resort.locationICAO, distanceNM: brief!.distanceNM, durationHours: brief!.durationHours, flightCost: brief!.totalCost, waypoints: brief!.waypoints });
              setOpen(false); router.push(routes.flight(id));
            })}>{canAfford ? 'Book & file the flight ⚡' : 'Insufficient funds'}</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function Page() { return <Suspense fallback={null}><ResortDetailPage /></Suspense>; }
