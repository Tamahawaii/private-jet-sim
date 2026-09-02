'use client';
import React, { useMemo, useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plane, Ship, Home, Gauge, Route, Users, Anchor, BedDouble, Ruler, Sparkles, Check } from 'lucide-react';
import { db } from '../../lib/db';
import { routes } from '../../lib/routes';
import { SHOP_CATALOG, CatalogItem } from '../lib/mockData';
import { Economy } from '../../lib/economy';
import { purchaseYacht, purchaseResidence, getMarina } from '../../lib/estate';
import { useStore } from '../lib/store';
import { Yacht, Residence } from '../../types';
import { PersonaAvatar } from '../components/PersonaAvatar';
import { PageShell, PageHeader, Tabs, Button, Chip, Artwork, money } from '../components/ui';

type Tab = 'aircraft' | 'yachts' | 'homes';

function Marketplace() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>((search.get('tab') as Tab) || 'aircraft');
  useEffect(() => { const t = search.get('tab') as Tab | null; if (t) setTab(t); }, [search]);
  const player = useLiveQuery(() => db.player.get('player'));
  const cash = player?.netWorth || 0;
  const yachts = (useLiveQuery(() => db.yachts.toArray()) || []) as Yacht[];
  const residences = (useLiveQuery(() => db.residences.toArray()) || []) as Residence[];
  const personas = useLiveQuery(() => db.personas.toArray()) || [];
  const addToast = useStore(s => s.addToast);
  const setSelectedAircraftId = useStore(s => s.setSelectedAircraftId);
  const [busy, setBusy] = useState<string | null>(null);
  const [cat, setCat] = useState<'all' | 'light' | 'midsize' | 'heavy' | 'airliner' | 'helicopter'>('all');

  const aircraft = useMemo(() => SHOP_CATALOG.filter(i => cat === 'all' || i.category === cat).sort((a, b) => a.price - b.price), [cat]);

  const buyAircraft = async (item: CatalogItem) => {
    setBusy(item.id);
    try {
      const craft = await Economy.purchaseAircraft(item);
      if (!craft) { addToast({ message: 'Not enough capital for that one.' }); return; }
      setSelectedAircraftId(craft.id);
      addToast({ message: `${item.model} acquired. ${craft.tailNumber} is being ferried from the factory — watch it on the globe.`, link: routes.flight(craft.currentFlightID || '') });
    } catch (e: unknown) { addToast({ message: (e as Error).message }); } finally { setBusy(null); }
  };
  const buyYacht = async (y: Yacht) => { setBusy(y.id); try { await purchaseYacht(y.id); addToast({ message: `${y.name} is yours. She's berthed in ${getMarina(y.currentMarinaId)?.city || y.currentLocationName}.`, link: routes.yacht(y.id) }); } catch (e: unknown) { addToast({ message: (e as Error).message }); } finally { setBusy(null); } };
  const buyHome = async (r: Residence) => { setBusy(r.id); try { await purchaseResidence(r.id); addToast({ message: `Keys to ${r.name}. ${r.caretakerName ? `${r.caretakerName} has the house ready.` : ''}`, link: routes.residence(r.id) }); } catch (e: unknown) { addToast({ message: (e as Error).message }); } finally { setBusy(null); } };

  return (
    <PageShell>
      <PageHeader eyebrow="Acquisitions" title={tab === 'aircraft' ? 'The market.' : tab === 'yachts' ? 'The brokerage.' : 'The portfolio.'} subtitle={<>Available capital <span className="font-mono text-emerald-300">{money(cash)}</span></>} />
      <Tabs tabs={[{ id: 'aircraft', label: 'Aircraft', count: SHOP_CATALOG.length }, { id: 'yachts', label: 'Yachts', count: yachts.length }, { id: 'homes', label: 'Homes', count: residences.length }]} value={tab} onChange={setTab} />

      {tab === 'aircraft' && (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
            {(['all', 'light', 'midsize', 'heavy', 'airliner', 'helicopter'] as const).map(c => (
              <button key={c} onClick={() => setCat(c)} className={`h-8 px-3 rounded-full text-[11.5px] font-semibold capitalize whitespace-nowrap border ${cat === c ? 'bg-white/12 border-white/20 text-white' : 'border-white/8 text-zinc-500 hover:text-white'}`}>{c === 'all' ? 'All types' : c}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {aircraft.map(item => {
              const affordable = cash >= item.price * 1.01;
              return (
                <div key={item.id} className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] flex flex-col">
                  <Artwork src={item.imageUrl} alt={item.model} className="aspect-[16/9]">
                    <div className="absolute top-3 left-3 flex gap-1.5"><Chip>{item.category}</Chip><Chip tone="gold">Tier {item.prestigeTier}</Chip></div>
                  </Artwork>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="font-serif text-[20px] text-white leading-tight">{item.model}</div>
                    <div className="text-[11.5px] text-zinc-500">{item.manufacturer}</div>
                    <p className="text-[12.5px] text-zinc-400 mt-2 leading-relaxed flex-1">{item.description}</p>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-zinc-400">
                      <div className="flex items-center gap-1"><Gauge size={11} /> {item.speedKnots} kts</div>
                      <div className="flex items-center gap-1"><Route size={11} /> {item.rangeNM.toLocaleString()} NM</div>
                      <div className="flex items-center gap-1"><Users size={11} /> {item.passengerCapacity} pax</div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div><div className="font-mono text-[18px] text-white">{money(item.price)}</div><div className="text-[10px] text-zinc-500">+1% closing · {item.cabinSlots} module slots</div></div>
                      <Button size="sm" disabled={!affordable || busy !== null} onClick={() => buyAircraft(item)}>{affordable ? 'Acquire' : 'Out of reach'}</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'yachts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {yachts.sort((a, b) => a.acquisitionPrice - b.acquisitionPrice).map(y => {
            const fans = y.preferredBy.map(id => personas.find(p => p.id === id)).filter(Boolean);
            const affordable = cash >= y.acquisitionPrice;
            return (
              <div key={y.id} className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] flex flex-col">
                <Artwork src={y.imageUrl} alt={y.name} className="aspect-[16/9]">
                  <div className="absolute top-3 left-3 flex gap-1.5"><Chip>{y.class}</Chip>{y.owned && <Chip tone="mint"><Check size={10} /> Owned</Chip>}</div>
                </Artwork>
                <div className="p-4 flex flex-col flex-1">
                  <div className="font-serif text-[22px] text-white leading-tight">{y.name}</div>
                  <div className="text-[11.5px] text-zinc-500">{y.builder} · {y.yearBuilt} · flag {y.flag}</div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-zinc-400">
                    <div className="flex items-center gap-1"><Ruler size={11} /> {y.lengthMeters} m</div>
                    <div className="flex items-center gap-1"><Users size={11} /> {y.guests} guests</div>
                    <div className="flex items-center gap-1"><Anchor size={11} /> {y.cruisingSpeedKnots} kts</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">{y.signatureFeatures.slice(0, 4).map(f => <span key={f} className="text-[10.5px] px-2 py-1 rounded-md bg-white/5 text-zinc-300 capitalize">{f}</span>)}</div>
                  {fans.length > 0 && <div className="flex items-center gap-2 mt-3"><div className="flex -space-x-2">{fans.slice(0, 3).map(p => p && <PersonaAvatar key={p.id} persona={p} size={22} className="border border-[#070b12]" />)}</div><span className="text-[11px] text-[var(--rose)]">{fans.map(p => p!.displayName.split(' ')[0]).slice(0, 2).join(' & ')} would love a week aboard</span></div>}
                  <div className="flex items-center justify-between mt-4">
                    <div><div className="font-mono text-[18px] text-white">{money(y.acquisitionPrice)}</div><div className="text-[10px] text-zinc-500">{money(y.annualOperatingCost)}/yr to run · charters at {money(y.charterRatePerWeek)}/wk</div></div>
                    {y.owned ? <Button size="sm" variant="secondary" onClick={() => router.push(routes.yacht(y.id))}>Open</Button> : <Button size="sm" disabled={!affordable || busy !== null} onClick={() => buyYacht(y)}>{affordable ? 'Acquire' : 'Out of reach'}</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'homes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {residences.sort((a, b) => a.acquisitionPrice - b.acquisitionPrice).map(r => {
            const affordable = cash >= r.acquisitionPrice;
            return (
              <div key={r.id} className="rounded-3xl overflow-hidden border border-white/8 bg-white/[0.03] flex flex-col">
                <Artwork src={r.imageUrl} alt={r.name} className="aspect-[16/9]">
                  <div className="absolute top-3 left-3 flex gap-1.5"><Chip>{r.type.replace('-', ' ')}</Chip>{r.owned && <Chip tone="mint"><Check size={10} /> {r.isPrimary ? 'Home base' : 'Owned'}</Chip>}</div>
                </Artwork>
                <div className="p-4 flex flex-col flex-1">
                  <div className="font-serif text-[22px] text-white leading-tight">{r.name}</div>
                  <div className="text-[11.5px] text-zinc-500">{r.neighborhood ? `${r.neighborhood}, ` : ''}{r.city}, {r.country}</div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-zinc-400">
                    <div className="flex items-center gap-1"><Ruler size={11} /> {r.squareMeters.toLocaleString()} m²</div>
                    <div className="flex items-center gap-1"><BedDouble size={11} /> {r.bedrooms} bd</div>
                    <div className="flex items-center gap-1"><Sparkles size={11} /> {r.staffSize} staff</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">{r.features.slice(0, 4).map(f => <span key={f} className="text-[10.5px] px-2 py-1 rounded-md bg-white/5 text-zinc-300 capitalize">{f}</span>)}</div>
                  <div className="flex items-center justify-between mt-4">
                    <div><div className="font-mono text-[18px] text-white">{money(r.owned ? r.currentValuation : r.acquisitionPrice)}</div><div className="text-[10px] text-zinc-500">{r.owned ? 'current valuation' : `${money(r.annualPropertyTax + r.annualMaintenanceCost + r.annualInsurance)}/yr upkeep`}</div></div>
                    {r.owned ? <Button size="sm" variant="secondary" onClick={() => router.push(routes.residence(r.id))}>Open</Button> : <Button size="sm" disabled={!affordable || busy !== null} onClick={() => buyHome(r)}>{affordable ? 'Acquire' : 'Out of reach'}</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

export default function Page() { return <Suspense fallback={null}><Marketplace /></Suspense>; }
