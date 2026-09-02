'use client';
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Home, Users, Ruler, BedDouble, Sparkles, Navigation2, Check, PartyPopper, BadgeDollarSign } from 'lucide-react';
import { db } from '../../../lib/db';
import { routes } from '../../../lib/routes';
import { Residence, Persona, PersonaState } from '../../../types';
import { GATHERINGS, hostGathering, purchaseResidence, sellResidence } from '../../../lib/estate';
import { getAirport, placeLine } from '../../../lib/flight/airports';
import { useStore } from '../../lib/store';
import { PersonaAvatar } from '../../components/PersonaAvatar';
import { PageShell, PageHeader, Button, Chip, Artwork, Stat, money } from '../../components/ui';

function ResidenceDetail() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get('id') || '';
  const r = useLiveQuery(() => db.residences.get(id), [id]) as Residence | undefined | null;
  const player = useLiveQuery(() => db.player.get('player'));
  const personas = (useLiveQuery(() => db.personas.toArray()) || []) as Persona[];
  const states = (useLiveQuery(() => db.personaState.toArray()) || []) as PersonaState[];
  const gatherings = useLiveQuery(() => db.gatherings.where('residenceId').equals(id).reverse().sortBy('at'), [id]) || [];
  const addToast = useStore(s => s.addToast);
  const [kind, setKind] = useState<keyof typeof GATHERINGS>('dinner');
  const [guests, setGuests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (r === undefined) return <PageShell><div className="pt-10 text-zinc-500 text-sm">Unlocking the gate…</div></PageShell>;
  if (!r) return <PageShell><PageHeader back="/acquisitions?tab=homes" title="Residence not found" /></PageShell>;

  const apt = getAirport(r.nearestAirportICAO);
  const here = (player?.currentLocationICAO || '') === r.nearestAirportICAO;
  const nearby = personas.filter(p => states.find(s => s.personaId === p.id)?.currentLocationICAO === r.nearestAirportICAO);
  const spec = GATHERINGS[kind];
  const run = async (fn: () => Promise<unknown>, ok?: string) => { setBusy(true); try { await fn(); if (ok) addToast({ message: ok }); } catch (e: unknown) { addToast({ message: (e as Error).message }); } finally { setBusy(false); } };

  return (
    <PageShell>
      <PageHeader back="/acquisitions?tab=homes" eyebrow={`${r.type.replace('-', ' ')} · ${r.city}`} title={r.name} subtitle={`${r.neighborhood ? `${r.neighborhood}, ` : ''}${r.city}, ${r.country}${r.owned ? ' · yours' : ''}`} actions={r.owned ? <Button variant="secondary" onClick={() => router.push(routes.planner({ destination: r.nearestAirportICAO }))}><Navigation2 size={14} /> Fly home</Button> : <Button disabled={(player?.netWorth || 0) < r.acquisitionPrice || busy} onClick={() => run(() => purchaseResidence(r.id), `Keys to ${r.name}.`)}>Acquire · {money(r.acquisitionPrice)}</Button>} />

      <Artwork src={r.imageUrl} alt={r.name} className="aspect-[16/9] md:aspect-[21/9] rounded-3xl border border-white/8">
        <div className="absolute top-3 left-3 flex gap-1.5">{r.owned ? <Chip tone="mint"><Check size={10} /> {r.isPrimary ? 'Home base' : 'Owned'}</Chip> : <Chip>For sale</Chip>}{here && r.owned && <Chip tone="accent">You're here</Chip>}</div>
      </Artwork>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
        <Stat icon={<Ruler size={11} />} label="Size" value={`${r.squareMeters.toLocaleString()} m²`} sub={`${r.bedrooms} bedrooms · ${r.bathrooms} baths`} />
        <Stat icon={<Users size={11} />} label="Staff" value={r.staffSize} sub={r.caretakerName ? `run by ${r.caretakerName}` : 'full time'} />
        <Stat icon={<BadgeDollarSign size={11} />} label={r.owned ? 'Valuation' : 'Asking'} value={money(r.owned ? r.currentValuation : r.acquisitionPrice)} sub={`${money((r.annualPropertyTax + r.annualMaintenanceCost + r.annualInsurance) / 12)}/mo upkeep`} />
        <Stat icon={<Home size={11} />} label="Airport" value={r.nearestAirportICAO} sub={placeLine(apt, '')} />
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 mt-4">
        <div className="eyebrow mb-2">The house</div>
        <div className="flex flex-wrap gap-1.5">{r.features.map(f => <span key={f} className="text-[11.5px] px-2.5 py-1 rounded-lg bg-white/5 text-zinc-200 capitalize">{f}</span>)}</div>
        {r.interiorDesigner && <div className="text-[12px] text-zinc-500 mt-3">Interiors by {r.interiorDesigner}{r.canHostEvents ? ` · hosts up to ${r.maxEventGuests}` : ''}</div>}
      </div>

      {r.owned && r.canHostEvents && (
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 mt-4">
          <div className="flex items-center justify-between mb-3"><div><div className="eyebrow">Host something</div><div className="font-serif text-[20px] text-white">Open the house.</div></div><PartyPopper size={18} className="text-[var(--color-gold)]" /></div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(Object.keys(GATHERINGS) as (keyof typeof GATHERINGS)[]).map(k => { const g = GATHERINGS[k]; return (
              <button key={k} onClick={() => setKind(k)} className={`rounded-2xl border p-3 text-left ${kind === k ? 'border-[var(--color-gold)]/60 bg-[var(--color-gold)]/10' : 'border-white/8 bg-white/[0.02]'}`}><div className="text-[13px] text-white">{g.label}</div><div className="text-[10.5px] font-mono text-zinc-500 mt-1">{money(g.cost)} · +{g.prestige}</div></button>
            ); })}
          </div>
          <p className="text-[12.5px] text-zinc-400 mb-3">{spec.note}</p>
          <div className="eyebrow mb-2">Guest list · {nearby.length} in {r.city}</div>
          {nearby.length === 0 ? <div className="text-[12.5px] text-zinc-500 mb-3">Nobody from your circle is in town. Fly some friends in first — or host anyway; word gets around.</div> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">{nearby.map(p => { const on = guests.includes(p.id); return (
              <button key={p.id} disabled={!on && guests.length >= spec.maxGuests} onClick={() => setGuests(g => on ? g.filter(x => x !== p.id) : [...g, p.id])} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left disabled:opacity-40 ${on ? 'border-[var(--rose)]/60 bg-[var(--rose)]/10' : 'border-white/8 bg-white/[0.02]'}`}><PersonaAvatar persona={p} size={28} /><span className="text-[12.5px] text-white truncate flex-1">{p.displayName.split(' ')[0]}</span>{on && <Check size={13} className="text-[var(--rose)]" />}</button>
            ); })}</div>
          )}
          <Button className="w-full" variant="gold" disabled={busy || (player?.netWorth || 0) < spec.cost} onClick={() => run(async () => { await hostGathering(r.id, kind, guests); setGuests([]); }, `${spec.label} hosted. The column will hear about it.`)}><Sparkles size={14} /> Host the {spec.label.toLowerCase()} · {money(spec.cost)}</Button>
        </div>
      )}

      {gatherings.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-2">Hosted here</div>
          <ul className="divide-y divide-white/8 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {gatherings.map(g => (
              <li key={g.id} className="flex items-center gap-3 px-4 py-3"><div className="font-mono text-[11.5px] text-zinc-500 w-16 shrink-0">{new Date(g.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div><div className="flex-1 min-w-0"><div className="text-[13.5px] text-white">{GATHERINGS[g.kind].label}</div><div className="text-[11px] text-zinc-500 font-mono">{g.guestIds.length} guests · {money(g.cost)} · +{g.prestigeGained} prestige</div></div><div className="flex -space-x-2">{g.guestIds.slice(0, 4).map(id => { const p = personas.find(x => x.id === id); return p ? <PersonaAvatar key={id} persona={p} size={24} className="border border-[#070b12]" /> : null; })}</div></li>
            ))}
          </ul>
        </div>
      )}

      {r.owned && !r.isPrimary && (
        <div className="rounded-2xl border border-[var(--magenta)]/25 bg-[var(--magenta)]/5 p-4 mt-4 flex items-center justify-between gap-3"><div><div className="text-[14px] text-white font-medium">Sell</div><p className="text-[12.5px] text-zinc-400 mt-1">Agents will return about {money(r.currentValuation * 0.94)}.</p></div><Button size="sm" variant="danger" disabled={busy} onClick={() => { if (confirm(`Sell ${r.name}?`)) run(async () => { await sellResidence(r.id); router.push('/acquisitions?tab=homes'); }); }}>Sell</Button></div>
      )}
    </PageShell>
  );
}

export default function Page() { return <Suspense fallback={null}><ResidenceDetail /></Suspense>; }
