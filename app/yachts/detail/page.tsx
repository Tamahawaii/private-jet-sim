'use client';
import React, { useMemo, useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Anchor, Ship, Users, Ruler, Gauge, Route, BadgeDollarSign, Check, MapPin, ArrowRight, Sparkles, Navigation2 } from 'lucide-react';
import { db } from '../../../lib/db';
import { routes } from '../../../lib/routes';
import { Yacht, Persona, PersonaState, Marina } from '../../../types';
import { MARINAS, getMarina, voyageBriefing, launchVoyage, setYachtCharter, sellYacht, purchaseYacht } from '../../../lib/estate';
import { getVoyageSnapshot, formatDurationMs } from '../../../lib/flight/engine';
import { useSimNow } from '../../lib/useSimNow';
import { useStore } from '../../lib/store';
import { PersonaAvatar } from '../../components/PersonaAvatar';
import { PageShell, PageHeader, Tabs, Button, Chip, Artwork, Stat, money } from '../../components/ui';

function YachtDetail() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get('id') || '';
  const y = useLiveQuery(() => db.yachts.get(id), [id]) as Yacht | undefined | null;
  const player = useLiveQuery(() => db.player.get('player'));
  const personas = (useLiveQuery(() => db.personas.toArray()) || []) as Persona[];
  const states = (useLiveQuery(() => db.personaState.toArray()) || []) as PersonaState[];
  const voyages = useLiveQuery(() => db.yachtVoyages.where('yachtId').equals(id).reverse().sortBy('departedAt'), [id]) || [];
  const now = useSimNow(1000);
  const addToast = useStore(s => s.addToast);
  const [tab, setTab] = useState<'overview' | 'voyage' | 'log' | 'manage'>(search.get('plan') ? 'voyage' : 'overview');
  useEffect(() => { if (search.get('plan')) setTab('voyage'); }, [search]);
  const [dest, setDest] = useState<string | null>(null);
  const [guests, setGuests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Hooks must run on every render — compute voyage targets before the early returns below.
  const targets = useMemo(() => {
    if (!y) return [] as { m: Marina; brief: ReturnType<typeof voyageBriefing> }[];
    const from = getMarina(y.currentMarinaId);
    if (!from) return [];
    return MARINAS.filter(m => m.id !== from.id).map(m => ({ m, brief: voyageBriefing(y, from, m) })).sort((a, b) => (a.brief.sameBasin === b.brief.sameBasin ? a.brief.distanceNM - b.brief.distanceNM : a.brief.sameBasin ? -1 : 1));
  }, [y?.currentMarinaId, y?.id]);

  if (y === undefined) return <PageShell><div className="pt-10 text-zinc-500 text-sm">Walking down to the dock…</div></PageShell>;
  if (!y) return <PageShell><PageHeader back="/fleet" title="Yacht not found" /></PageShell>;

  const marina = getMarina(y.currentMarinaId);
  const active = voyages.find(v => v.arrivedAt === null);
  const snap = active ? getVoyageSnapshot(active, now) : null;
  const fans = y.preferredBy.map(pid => personas.find(p => p.id === pid)).filter(Boolean) as Persona[];
  const canBoard = (p: Persona) => marina && states.find(s => s.personaId === p.id)?.currentLocationICAO === marina.nearestAirportICAO;
  const boardable = personas.filter(canBoard);
  const chosen = targets.find(t => t.m.id === dest);

  const run = async (fn: () => Promise<unknown>, ok?: string) => { setBusy(true); try { await fn(); if (ok) addToast({ message: ok }); } catch (e: unknown) { addToast({ message: (e as Error).message }); } finally { setBusy(false); } };

  return (
    <PageShell>
      <PageHeader back="/fleet" eyebrow={`${y.builder} · ${y.yearBuilt} · ${y.class}`} title={y.name} subtitle={y.owned ? (active ? 'Under way' : `Moored at ${marina?.name || y.currentLocationName}`) : `For sale · ${money(y.acquisitionPrice)}`} actions={y.owned ? <Button disabled={y.status !== 'docked'} onClick={() => setTab('voyage')}><Ship size={14} /> Set sail</Button> : <Button disabled={(player?.netWorth || 0) < y.acquisitionPrice || busy} onClick={() => run(() => purchaseYacht(y.id), `${y.name} is yours.`)}>Acquire</Button>} />

      <Artwork src={y.imageUrl} alt={y.name} className="aspect-[16/9] md:aspect-[21/9] rounded-3xl border border-white/8">
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#070b12] to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">{y.status === 'cruising' ? <Chip tone="accent">Under way</Chip> : <Chip><Anchor size={10} /> Moored</Chip>}{y.charterOut?.enabled && <Chip tone="mint"><BadgeDollarSign size={10} /> Chartered out</Chip>}</div>
        {snap && active && (
          <div className="absolute left-5 right-5 bottom-4">
            <div className="flex justify-between text-[12.5px] text-zinc-200"><span>{getMarina(active.originMarinaId)?.city} <span className="text-[var(--accent)]">→</span> {getMarina(active.destinationMarinaId)?.city}</span><span className="font-mono">{snap.phaseLabel} · {formatDurationMs(snap.msRemaining)}</span></div>
            <div className="mt-1.5 h-1 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${snap.progress * 100}%` }} /></div>
          </div>
        )}
      </Artwork>

      <div className="mt-5"><Tabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'voyage', label: 'Plan a voyage' }, { id: 'log', label: 'Log', count: voyages.length }, { id: 'manage', label: 'Manage' }]} value={tab} onChange={setTab} /></div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Stat icon={<Ruler size={11} />} label="Length" value={`${y.lengthMeters} m`} sub={`crew of ${y.crewSize}`} />
            <Stat icon={<Users size={11} />} label="Guests" value={y.guests} sub="sleeping" />
            <Stat icon={<Gauge size={11} />} label="Cruise" value={`${y.cruisingSpeedKnots} kts`} sub={`${y.rangeNm.toLocaleString()} NM range`} />
            <Stat icon={<BadgeDollarSign size={11} />} label="Upkeep" value={money(y.annualOperatingCost / 12)} sub="per month" />
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="eyebrow mb-2">Signature</div>
            <div className="flex flex-wrap gap-1.5">{y.signatureFeatures.map(f => <span key={f} className="text-[11.5px] px-2.5 py-1 rounded-lg bg-white/5 text-zinc-200 capitalize">{f}</span>)}</div>
            {y.interiorDesigner && <div className="text-[12px] text-zinc-500 mt-3">Interiors by {y.interiorDesigner} · flag {y.flag}, hailing from {y.hailingPort}</div>}
          </div>
          {marina && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/12 text-[var(--accent)] flex items-center justify-center"><MapPin size={16} /></div>
              <div className="flex-1 min-w-0"><div className="text-[14px] text-white">{marina.name}, {marina.city}</div><div className="text-[12px] text-zinc-500 truncate">{marina.vibe}</div></div>
              <Button size="sm" variant="secondary" onClick={() => router.push(routes.planner({ destination: marina.nearestAirportICAO }))}><Navigation2 size={13} /> Fly there</Button>
            </div>
          )}
          {fans.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="eyebrow mb-2">Would love a week aboard</div>
              <div className="flex flex-wrap gap-2">{fans.map(p => <button key={p.id} onClick={() => router.push(routes.persona(p.id))} className="flex items-center gap-2 pr-3 rounded-full bg-white/5 hover:bg-white/10"><PersonaAvatar persona={p} size={30} /><span className="text-[12.5px] text-white">{p.displayName.split(' ')[0]}</span></button>)}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'voyage' && (
        !y.owned ? <div className="text-[13px] text-zinc-500">Acquire her first.</div> :
        y.status !== 'docked' ? <div className="text-[13px] text-zinc-500">She is under way — plan the next leg once she is moored.</div> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="eyebrow mb-2">Destination · from {marina?.city}</div>
              <div className="space-y-1.5 max-h-[52vh] overflow-y-auto no-scrollbar pr-1">
                {targets.map(({ m, brief }) => (
                  <button key={m.id} onClick={() => setDest(m.id)} className={`w-full text-left px-4 py-3 rounded-2xl border transition-colors flex items-center gap-3 ${dest === m.id ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                    <div className="flex-1 min-w-0"><div className="text-[14px] text-white">{m.name} <span className="text-zinc-500">· {m.city}</span></div><div className="text-[11.5px] text-zinc-500 truncate">{m.vibe}</div></div>
                    <div className="text-right shrink-0"><div className="font-mono text-[12px] text-zinc-200">{Math.round(brief.distanceNM).toLocaleString()} NM</div><div className={`font-mono text-[10px] ${brief.sameBasin ? 'text-[var(--accent)]' : 'text-amber-400'}`}>{brief.sameBasin ? formatDurationMs(brief.hours * 3600000) : 'open-ocean passage'}</div></div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="eyebrow mb-2">Guests aboard · {boardable.length} in {marina?.city}</div>
                {boardable.length === 0 ? <div className="text-[12.5px] text-zinc-500 rounded-2xl border border-dashed border-white/12 p-4">Nobody from your circle is in {marina?.city}. Fly a friend in, or sail solo.</div> : (
                  <div className="grid grid-cols-2 gap-2">{boardable.map(p => { const on = guests.includes(p.id); return (
                    <button key={p.id} onClick={() => setGuests(g => on ? g.filter(x => x !== p.id) : [...g, p.id])} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left ${on ? 'border-[var(--rose)]/60 bg-[var(--rose)]/10' : 'border-white/8 bg-white/[0.03]'}`}><PersonaAvatar persona={p} size={30} /><span className="text-[12.5px] text-white truncate flex-1">{p.displayName}</span>{on && <Check size={14} className="text-[var(--rose)]" />}</button>
                  ); })}</div>
                )}
              </div>
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                {chosen ? (
                  <>
                    <div className="flex items-baseline justify-between"><div className="font-serif text-[22px] text-white">{marina?.city} <span className="text-[var(--accent)] text-base">→</span> {chosen.m.city}</div><div className="font-mono text-[12px] text-zinc-400">{Math.round(chosen.brief.distanceNM).toLocaleString()} NM</div></div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <Stat label="Passage" value={formatDurationMs(chosen.brief.hours * 3600000)} />
                      <Stat label="Cost" value={money(chosen.brief.totalCost)} sub="fuel, crew, berth" />
                      <Stat label="Arrive" value={new Date(now + chosen.brief.hours * 3600000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} sub={new Date(now + chosen.brief.hours * 3600000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} />
                    </div>
                    {!chosen.brief.sameBasin && <div className="text-[11.5px] text-amber-300 mt-3">Open-ocean passage — days at sea, a proper adventure for the log.</div>}
                    <Button className="w-full mt-4" disabled={busy || (player?.netWorth || 0) < chosen.brief.totalCost} onClick={() => run(async () => { await launchVoyage({ yachtId: y.id, toMarinaId: chosen.m.id, guests }); useStore.getState().setSelectedAircraftId(null); router.push('/'); }, `${y.name} is under way. Watch her on the globe.`)}><Ship size={14} /> Cast off <ArrowRight size={14} /></Button>
                  </>
                ) : <div className="text-[13px] text-zinc-500">Pick a marina to see the passage.</div>}
              </div>
            </div>
          </div>
        )
      )}

      {tab === 'log' && (
        voyages.length === 0 ? <div className="text-[13px] text-zinc-500">No passages yet.</div> : (
          <ul className="divide-y divide-white/8 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {voyages.map(v => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                <div className="font-mono text-[11.5px] text-zinc-500 w-16 shrink-0">{new Date(v.departedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="flex-1 min-w-0"><div className="text-[13.5px] text-white">{getMarina(v.originMarinaId)?.city} <span className="text-[var(--accent)]">→</span> {getMarina(v.destinationMarinaId)?.city}</div><div className="text-[11px] text-zinc-500 font-mono">{Math.round(v.distanceNM).toLocaleString()} NM · {formatDurationMs(v.estimatedArrivalAt - v.departedAt)} · {money(v.costUSD)}{v.recap ? ` · +${v.recap.prestigeGained}` : ''}</div></div>
                {v.arrivedAt === null ? <Chip tone="accent">At sea</Chip> : <Chip tone="mint">Moored</Chip>}
              </li>
            ))}
          </ul>
        )
      )}

      {tab === 'manage' && y.owned && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col gap-3"><div><div className="text-[14px] text-white font-medium">Charter her out</div><p className="text-[12.5px] text-zinc-400 mt-1">{y.charterOut?.enabled ? `Listed with the brokerage. ${money(y.charterOut.lifetimeIncome)} earned so far.` : `${money(y.charterRatePerWeek)} a week when booked; about ${money(y.charterRatePerWeek * 0.55 * 0.7 * 4.3)} a month net while she sits.`}</p></div><div className="mt-auto"><Button size="sm" variant={y.charterOut?.enabled ? 'secondary' : 'primary'} disabled={busy} onClick={() => run(() => setYachtCharter(y.id, !y.charterOut?.enabled))}><BadgeDollarSign size={13} /> {y.charterOut?.enabled ? 'Delist' : 'List for charter'}</Button></div></div>
          <div className="rounded-2xl border border-[var(--magenta)]/25 bg-[var(--magenta)]/5 p-4 flex flex-col gap-3"><div><div className="text-[14px] text-white font-medium">Sell</div><p className="text-[12.5px] text-zinc-400 mt-1">Brokers will return about {money(y.acquisitionPrice * 0.72)}.</p></div><div className="mt-auto"><Button size="sm" variant="danger" disabled={busy || y.status !== 'docked'} onClick={() => { if (confirm(`Sell ${y.name}?`)) run(async () => { await sellYacht(y.id); router.push('/fleet'); }); }}>Sell yacht</Button></div></div>
        </div>
      )}
    </PageShell>
  );
}

export default function Page() { return <Suspense fallback={null}><YachtDetail /></Suspense>; }
