'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plane, Ship, Navigation2, Anchor, Wrench, BadgeDollarSign, Gauge, Route, Users } from 'lucide-react';
import { db } from '../../lib/db';
import { routes } from '../../lib/routes';
import { Aircraft, Yacht } from '../../types';
import { aircraftImage } from '../lib/mockData';
import { getAirport, placeLine } from '../../lib/flight/airports';
import { getMarina } from '../../lib/estate';
import { useSimNow } from '../lib/useSimNow';
import { getFlightSnapshot, getVoyageSnapshot, formatDurationMs } from '../../lib/flight/engine';
import { maintenanceDue } from '../../lib/hangar';
import { PageShell, PageHeader, Tabs, Button, Chip, Artwork, EmptyState, money } from '../components/ui';

function AircraftCard({ jet }: { jet: Aircraft }) {
  const router = useRouter();
  const now = useSimNow(1000);
  const flight = useLiveQuery(() => (jet.currentFlightID ? db.flights.get(jet.currentFlightID) : undefined), [jet.currentFlightID]);
  const snap = flight && flight.arrivedAt === null ? getFlightSnapshot(flight, jet, now) : null;
  const here = getAirport(jet.currentLocationICAO);
  const due = maintenanceDue(jet);
  const status = jet.status === 'in_transit' ? { chip: <Chip tone="accent">In flight</Chip> } : jet.status === 'maintenance' ? { chip: <Chip tone="amber"><Wrench size={10} /> In the shop</Chip> } : due ? { chip: <Chip tone="amber">Inspection due</Chip> } : { chip: <Chip>Parked</Chip> };
  return (
    <div className="group rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-[var(--accent)]/40 transition-colors">
      <button onClick={() => router.push(routes.aircraft(jet.tailNumber))} className="block w-full text-left">
        <Artwork src={aircraftImage(jet)} alt={jet.model} className="aspect-[16/9]">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070b12] to-transparent" />
          <div className="absolute top-3 left-3 flex gap-1.5">{status.chip}{jet.charter?.enabled && jet.status === 'parked' && <Chip tone="mint"><BadgeDollarSign size={10} /> Charter</Chip>}</div>
          <div className="absolute left-4 right-4 bottom-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[22px] font-bold tracking-wider text-white leading-none">{jet.tailNumber}{jet.nickname ? <span className="text-[13px] text-zinc-400 font-sans font-normal tracking-normal ml-2">“{jet.nickname}”</span> : null}</div>
              <div className="text-[13px] text-zinc-300 mt-1 truncate">{jet.model}</div>
            </div>
          </div>
        </Artwork>
      </button>
      <div className="px-4 pt-3 pb-4">
        {snap && flight ? (
          <div className="mb-3">
            <div className="flex justify-between text-[12px]"><span className="text-white">{flight.originICAO} <span className="text-[var(--accent)]">→</span> {flight.destinationICAO}</span><span className="text-zinc-400 font-mono">{formatDurationMs(snap.msRemaining)} to go</span></div>
            <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${snap.distanceProgress * 100}%` }} /></div>
          </div>
        ) : (
          <div className="text-[12.5px] text-zinc-400 mb-3 truncate">{jet.status === 'maintenance' ? `Back in ${formatDurationMs((jet.maintenanceUntil || now) - now)}` : `At ${placeLine(here, jet.currentLocationICAO)}`}</div>
        )}
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1"><Gauge size={11} /> {jet.speedKnots} kts</div>
          <div className="flex items-center gap-1"><Route size={11} /> {jet.rangeNM.toLocaleString()} NM</div>
          <div className="flex items-center gap-1"><Users size={11} /> {(jet.modules || []).length}/{(jet.cabinConfig || []).length} mods</div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => router.push(routes.aircraft(jet.tailNumber))}>Hangar</Button>
          <Button size="sm" className="flex-1" disabled={jet.status !== 'parked' || due} onClick={() => router.push(routes.planner({ aircraft: jet.tailNumber }))}><Navigation2 size={13} /> Dispatch</Button>
        </div>
      </div>
    </div>
  );
}

function YachtCard({ y }: { y: Yacht }) {
  const router = useRouter();
  const now = useSimNow(1000);
  const voyage = useLiveQuery(() => (y.currentVoyageId ? db.yachtVoyages.get(y.currentVoyageId) : undefined), [y.currentVoyageId]);
  const snap = voyage && voyage.arrivedAt === null ? getVoyageSnapshot(voyage, now) : null;
  const marina = getMarina(y.currentMarinaId);
  return (
    <div className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] hover:border-[var(--accent)]/40 transition-colors">
      <button onClick={() => router.push(routes.yacht(y.id))} className="block w-full text-left">
        <Artwork src={y.imageUrl} alt={y.name} className="aspect-[16/9]">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070b12] to-transparent" />
          <div className="absolute top-3 left-3 flex gap-1.5">{y.status === 'cruising' ? <Chip tone="accent">Under way</Chip> : <Chip><Anchor size={10} /> Moored</Chip>}{y.charterOut?.enabled && y.status === 'docked' && <Chip tone="mint"><BadgeDollarSign size={10} /> Charter</Chip>}</div>
          <div className="absolute left-4 right-4 bottom-3">
            <div className="font-serif text-[22px] text-white leading-none">{y.name}</div>
            <div className="text-[12.5px] text-zinc-300 mt-1">{y.builder} · {y.lengthMeters} m · {y.guests} guests</div>
          </div>
        </Artwork>
      </button>
      <div className="px-4 pt-3 pb-4">
        {snap && voyage ? (
          <div className="mb-3">
            <div className="flex justify-between text-[12px]"><span className="text-white">{getMarina(voyage.originMarinaId)?.city} <span className="text-[var(--accent)]">→</span> {getMarina(voyage.destinationMarinaId)?.city}</span><span className="text-zinc-400 font-mono">{formatDurationMs(snap.msRemaining)} to go</span></div>
            <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${snap.progress * 100}%` }} /></div>
          </div>
        ) : <div className="text-[12.5px] text-zinc-400 mb-3">Moored at {marina?.name || y.currentLocationName}, {marina?.city || ''}</div>}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => router.push(routes.yacht(y.id))}>Details</Button>
          <Button size="sm" className="flex-1" disabled={y.status !== 'docked'} onClick={() => router.push(routes.yacht(y.id) + '&plan=1')}><Ship size={13} /> Set sail</Button>
        </div>
      </div>
    </div>
  );
}

export default function FleetPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'aircraft' | 'yachts'>('aircraft');
  const fleet = (useLiveQuery(() => db.aircraft.toArray()) || []) as Aircraft[];
  const yachts = (useLiveQuery(() => db.yachts.filter(y => !!y.owned).toArray()) || []) as Yacht[];

  return (
    <PageShell>
      <PageHeader eyebrow="Fleet" title={tab === 'aircraft' ? 'Your hangar.' : 'Your marina.'} subtitle={tab === 'aircraft' ? `${fleet.length} aircraft · ${fleet.filter(j => j.status === 'in_transit').length} airborne` : `${yachts.length} yacht${yachts.length === 1 ? '' : 's'}`} actions={<Button variant="secondary" size="sm" onClick={() => router.push(tab === 'aircraft' ? '/acquisitions' : '/acquisitions?tab=yachts')}>Acquire</Button>} />
      <Tabs tabs={[{ id: 'aircraft', label: 'Aircraft', count: fleet.length }, { id: 'yachts', label: 'Yachts', count: yachts.length }]} value={tab} onChange={setTab} />
      {tab === 'aircraft' && (
        fleet.length === 0 ? <EmptyState icon={<Plane size={18} />} title="No aircraft yet" body="The market has everything from a Phenom to a BBJ." action={<Button onClick={() => router.push('/acquisitions')}>Browse the market</Button>} /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{fleet.map(j => <AircraftCard key={j.tailNumber} jet={j} />)}</div>
      )}
      {tab === 'yachts' && (
        yachts.length === 0 ? <EmptyState icon={<Ship size={18} />} title="No yacht in the fleet" body="Seven hulls are for sale, from a 24 m catamaran to a 142 m Lürssen. Every one comes with a crew and a berth in Monaco." action={<Button onClick={() => router.push('/acquisitions?tab=yachts')}>See the brokerage</Button>} /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{yachts.map(y => <YachtCard key={y.id} y={y} />)}</div>
      )}
    </PageShell>
  );
}
