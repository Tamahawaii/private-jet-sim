'use client';
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Gauge, Route, Fuel, Users, Clock, Wrench, BadgeDollarSign, Navigation2, Sparkles, Check, Plus, Trash2, Tag, ChevronRight } from 'lucide-react';
import { db } from '../../../lib/db';
import { routes } from '../../../lib/routes';
import { Aircraft } from '../../../types';
import { aircraftImage, catalogFor } from '../../lib/mockData';
import { getAirport, placeLine } from '../../../lib/flight/airports';
import { useSimNow } from '../../lib/useSimNow';
import { getFlightSnapshot, formatDurationMs, describeRoute } from '../../../lib/flight/engine';
import { MODULE_CATALOG, installModule, removeModule, setCharter, charterRateFor, maintenanceDue, maintenanceCost, scheduleMaintenance, MAINTENANCE_INTERVAL_HOURS, modulePrestige, moduleMonthlyCost } from '../../../lib/hangar';
import { Economy } from '../../../lib/economy';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { useStore } from '../../lib/store';
import { PageShell, PageHeader, Tabs, Button, Chip, Artwork, Stat, EmptyState, money } from '../../components/ui';

function FleetDetail() {
  const router = useRouter();
  const search = useSearchParams();
  const tail = search.get('tail') || '';
  const jet = useLiveQuery(() => db.aircraft.get(tail), [tail]) as Aircraft | undefined | null;
  const flights = useLiveQuery(() => db.flights.where('tailNumber').equals(tail).reverse().sortBy('departedAt'), [tail]) || [];
  const player = useLiveQuery(() => db.player.get('player'));
  const now = useSimNow(1000);
  const [tab, setTab] = useState<'overview' | 'modules' | 'log' | 'manage'>('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const addToast = useStore(s => s.addToast);

  if (jet === undefined) return <PageShell><div className="pt-10 text-zinc-500 text-sm">Opening the hangar…</div></PageShell>;
  if (!jet) return <PageShell><EmptyState title="Aircraft not found" action={<Button onClick={() => router.push('/fleet')}>Back to fleet</Button>} /></PageShell>;

  const cat = catalogFor(jet);
  const here = getAirport(jet.currentLocationICAO);
  const activeFlight = flights.find(f => f.arrivedAt === null);
  const snap = activeFlight ? getFlightSnapshot(activeFlight, jet, now) : null;
  const due = maintenanceDue(jet);
  const slots = (jet.cabinConfig || []).length || 2;
  const installed = jet.modules || [];
  const canAct = jet.status === 'parked';

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) addToast({ message: ok }); } catch (e: unknown) { addToast({ message: (e as Error).message || 'That did not work.' }); } finally { setBusy(null); }
  };

  return (
    <PageShell>
      <PageHeader back="/fleet" eyebrow={`${cat?.manufacturer || ''} · ${cat?.category || 'jet'}`} title={<span className="font-mono tracking-wider">{jet.tailNumber}</span>} subtitle={<>{jet.model}{jet.nickname ? ` · “${jet.nickname}”` : ''}</>} actions={<Button disabled={!canAct || due} onClick={() => router.push(routes.planner({ aircraft: jet.tailNumber }))}><Navigation2 size={14} /> Dispatch</Button>} />

      <Artwork src={aircraftImage(jet)} alt={jet.model} className="aspect-[16/9] md:aspect-[21/9] rounded-3xl border border-white/8">
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#070b12] to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {jet.status === 'in_transit' ? <Chip tone="accent">In flight</Chip> : jet.status === 'maintenance' ? <Chip tone="amber"><Wrench size={10} /> In the shop</Chip> : <Chip>Parked</Chip>}
          {jet.charter?.enabled && <Chip tone="mint"><BadgeDollarSign size={10} /> Charter program</Chip>}
          {due && jet.status === 'parked' && <Chip tone="amber">Inspection due</Chip>}
        </div>
        <div className="absolute left-5 right-5 bottom-4 flex items-end justify-between gap-4">
          <div className="text-[13px] text-zinc-300">
            {snap && activeFlight ? <>{describeRoute(activeFlight).originCity} <span className="text-[var(--accent)]">→</span> {describeRoute(activeFlight).destCity} · lands in {formatDurationMs(snap.msRemaining)}</> : jet.status === 'maintenance' ? `Inspection in progress · back in ${formatDurationMs((jet.maintenanceUntil || now) - now)}` : `At ${placeLine(here, jet.currentLocationICAO)}`}
          </div>
          {activeFlight && <Button size="sm" variant="secondary" onClick={() => router.push(routes.flight(activeFlight.id))}>Watch</Button>}
        </div>
      </Artwork>

      <div className="mt-5"><Tabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'modules', label: 'Modules', count: installed.length }, { id: 'log', label: 'Logbook', count: flights.length }, { id: 'manage', label: 'Manage' }]} value={tab} onChange={setTab} /></div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Stat icon={<Gauge size={11} />} label="Cruise" value={`${jet.speedKnots} kts`} sub={jet.baseSpecs && jet.baseSpecs.speedKnots !== jet.speedKnots ? `base ${jet.baseSpecs.speedKnots}` : undefined} />
            <Stat icon={<Route size={11} />} label="Range" value={`${jet.rangeNM.toLocaleString()} NM`} sub={jet.baseSpecs && jet.baseSpecs.rangeNM !== jet.rangeNM ? `base ${jet.baseSpecs.rangeNM.toLocaleString()}` : undefined} />
            <Stat icon={<Fuel size={11} />} label="Burn" value={`${jet.fuelBurnGPH} gph`} sub={`$${Math.round(jet.fuelBurnGPH * 6.5).toLocaleString()}/hr fuel`} />
            <Stat icon={<Users size={11} />} label="Cabin" value={`${cat?.passengerCapacity ?? '—'} pax`} sub={`${installed.length}/${slots} modules`} />
            <Stat icon={<Clock size={11} />} label="Hours" value={Math.round(jet.hoursFlown || 0).toLocaleString()} sub={`${Math.round(jet.hoursSinceLastMaintenance || 0)} since inspection`} />
            <Stat icon={<Sparkles size={11} />} label="Prestige" value={`+${modulePrestige(jet)}`} sub="per arrival, from cabin" />
            <Stat icon={<Tag size={11} />} label="Paid" value={money(jet.purchasePrice)} sub={`resale ${money(jet.purchasePrice * 0.8)}`} />
            <Stat icon={<BadgeDollarSign size={11} />} label="Charter" value={jet.charter?.enabled ? money(jet.charter.lifetimeIncome) : 'Off'} sub={jet.charter?.enabled ? `${money(jet.charter.ratePerHour)}/hr booked` : `up to ${money(charterRateFor(jet))}/hr`} />
          </div>
          {cat?.description && <p className="text-[14px] text-zinc-300 leading-relaxed max-w-2xl">{cat.description}</p>}
          {jet.layoutImage && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="eyebrow mb-2">Cabin plan</div>
              <img src={jet.layoutImage} alt="Cabin layout" className="w-full max-h-48 object-contain opacity-90" />
            </div>
          )}
        </div>
      )}

      {tab === 'modules' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-2"><div className="eyebrow">Installed · {installed.length} of {slots} slots</div><div className="text-[11px] font-mono text-zinc-500">{money(moduleMonthlyCost(jet))}/mo upkeep</div></div>
            {installed.length === 0 ? <div className="text-[13px] text-zinc-500">Nothing fitted yet. Stock cabin, stock range.</div> : (
              <ul className="divide-y divide-white/8">
                {installed.map(m => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/12 text-[var(--accent)] flex items-center justify-center"><Check size={14} /></div>
                    <div className="flex-1 min-w-0"><div className="text-[13.5px] text-white">{m.name}</div><div className="text-[11px] text-zinc-500 font-mono">{effectLine(m.effect)}</div></div>
                    <button disabled={!canAct || busy !== null} onClick={() => run(m.id, () => removeModule(jet.tailNumber, m.id), 'Module removed — 40% recovered.')} className="w-8 h-8 rounded-lg hover:bg-white/8 text-zinc-500 hover:text-[var(--magenta)] flex items-center justify-center disabled:opacity-40"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="eyebrow mb-2">Upgrade market</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {MODULE_CATALOG.filter(m => !installed.some(i => i.id === m.id)).map(m => {
                const full = installed.length >= slots;
                const affordable = (player?.netWorth ?? 0) >= m.price;
                return (
                  <div key={m.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-[14px] text-white">{m.name}</div><div className="text-[10.5px] font-mono text-[var(--accent)] mt-0.5">{effectLine(m.effect)} · {money(m.monthlyCost)}/mo</div></div>
                      <Chip tone={m.category === 'performance' ? 'accent' : m.category === 'cabin' ? 'gold' : 'neutral'}>{m.category}</Chip>
                    </div>
                    <p className="text-[12.5px] text-zinc-400 mt-2 leading-relaxed flex-1">{m.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="font-mono text-[15px] text-white">{money(m.price)}</div>
                      <Button size="sm" disabled={!canAct || full || !affordable || busy !== null} onClick={() => run(m.id, () => installModule(jet.tailNumber, m.id), `${m.name} installed.`)}><Plus size={13} /> {full ? 'No slot' : !canAct ? 'Park first' : 'Install'}</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'log' && (
        flights.length === 0 ? <EmptyState title="Logbook is empty" body="Dispatch this aircraft to start its history." /> : (
          <ul className="divide-y divide-white/8 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {flights.map(f => { const r = describeRoute(f); return (
              <li key={f.id}><button onClick={() => router.push(routes.flight(f.id))} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] text-left">
                <div className="font-mono text-[11.5px] text-zinc-500 w-16 shrink-0">{new Date(f.departedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="flex-1 min-w-0"><div className="text-[13.5px] text-white truncate">{r.originCity} <span className="text-[var(--accent)]">→</span> {r.destCity}</div><div className="text-[11px] text-zinc-500 font-mono">{Math.round(f.distanceNM).toLocaleString()} NM · {formatDurationMs(f.estimatedArrivalAt - f.departedAt)} · {money(f.costUSD)}{f.recap ? ` · +${f.recap.prestigeGained}` : ''}</div></div>
                {f.arrivedAt === null ? <Chip tone="accent">Airborne</Chip> : <ChevronRight size={14} className="text-zinc-600" />}
              </button></li>
            ); })}
          </ul>
        )
      )}

      {tab === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ManageCard title="Charter program" body={jet.charter?.enabled ? `Earning while parked. ${Math.round(jet.charter.lifetimeHours)} charter hours, ${money(jet.charter.lifetimeIncome)} net so far.` : `Let the operator book this aircraft while it sits. About ${money(charterRateFor(jet) * 0.32 * 24 * 30 * 0.6)}/month net at typical utilisation — and it adds hours toward inspections.`}>
            <Button variant={jet.charter?.enabled ? 'secondary' : 'primary'} size="sm" disabled={busy !== null} onClick={() => run('charter', () => setCharter(jet.tailNumber, !jet.charter?.enabled), jet.charter?.enabled ? 'Charter program paused.' : 'Charter program on.')}><BadgeDollarSign size={13} /> {jet.charter?.enabled ? 'Pause charter' : 'Start charter'}</Button>
          </ManageCard>
          <ManageCard title="Inspection" body={jet.status === 'maintenance' ? `In the shop. Back on the line in ${formatDurationMs((jet.maintenanceUntil || now) - now)}.` : due ? `Overdue: ${Math.round(jet.hoursSinceLastMaintenance)} hours since the last check (limit ${MAINTENANCE_INTERVAL_HOURS}). Grounded until inspected. ${money(maintenanceCost(jet))}, 36 hours.` : `${Math.round(MAINTENANCE_INTERVAL_HOURS - (jet.hoursSinceLastMaintenance || 0))} hours until the next check. An early inspection costs ${money(maintenanceCost(jet))} and takes 36 hours.`}>
            <Button variant={due ? 'primary' : 'secondary'} size="sm" disabled={!canAct || busy !== null} onClick={() => run('maint', () => scheduleMaintenance(jet.tailNumber), 'Inspection scheduled.')}><Wrench size={13} /> Schedule inspection</Button>
          </ManageCard>
          <ManageCard title="Name" body={jet.nickname ? `Known as “${jet.nickname}”.` : 'Give the aircraft a name. It shows up in texts and on the map.'}>
            <Button variant="secondary" size="sm" onClick={async () => { const v = prompt(`Name for ${jet.tailNumber}:`, jet.nickname || ''); if (v !== null) await aircraftRepo.update(jet.tailNumber, { nickname: v.trim() || undefined }); }}><Tag size={13} /> Rename</Button>
          </ManageCard>
          <ManageCard title="Sell" body={`Liquidate for ${money(jet.purchasePrice * 0.8)} (80% of what you paid). Modules go with it.`} danger>
            <Button variant="danger" size="sm" disabled={!canAct || busy !== null} onClick={() => { if (confirm(`Sell ${jet.model} ${jet.tailNumber} for ${money(jet.purchasePrice * 0.8)}?`)) run('sell', async () => { await Economy.sellAircraft(jet.tailNumber); router.push('/fleet'); }); }}>Sell aircraft</Button>
          </ManageCard>
        </div>
      )}
    </PageShell>
  );
}

function effectLine(e: Aircraft['modules'][number]['effect']): string {
  const parts: string[] = [];
  if (e.rangeBonus) parts.push(`+${Math.round(e.rangeBonus * 100)}% range`);
  if (e.speedBonus) parts.push(`+${Math.round(e.speedBonus * 100)}% speed`);
  if (e.prestigeBonus) parts.push(`+${e.prestigeBonus} prestige/arrival`);
  if (e.capacityBonus) parts.push(`${e.capacityBonus} seats`);
  return parts.join(' · ') || 'comfort';
}

function ManageCard({ title, body, children, danger }: { title: string; body: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${danger ? 'border-[var(--magenta)]/25 bg-[var(--magenta)]/5' : 'border-white/8 bg-white/[0.03]'}`}>
      <div><div className="text-[14px] text-white font-medium">{title}</div><p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">{body}</p></div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

export default function Page() { return <Suspense fallback={null}><FleetDetail /></Suspense>; }
