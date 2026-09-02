import React, { useState, useEffect, useMemo } from 'react';
import { Aircraft } from '../../../../types';
import { calculateDistanceNM } from '../../../lib/math';
import { Search, X, ArrowLeft, Calendar, Plane, Waves, Navigation2 } from 'lucide-react';
import { db } from '../../../../lib/db';
import { getEventNextOccurrence } from '../../../lib/events';
import { useStore } from '../../../lib/store';
import { searchAirports, getAirport, countryName, AirportRecord } from '../../../../lib/flight/airports';
import { formatDurationMs } from '../../../../lib/flight/engine';

interface Props {
  aircraft: Aircraft;
  prefillDestination?: string | null;
  prefillPurpose?: string | null;
  onSelect: (destination: any) => void;
  onBack: () => void;
}

const POPULAR = ['LFMN', 'EGLL', 'KTEB', 'KVNY', 'LSGG', 'OMDB', 'RJTT', 'LIML', 'KASE', 'TFFJ', 'MMSD', 'NTAA'];

export default function Step2Destination({ aircraft, prefillDestination, prefillPurpose, onSelect, onBack }: Props) {
   const [query, setQuery] = useState(prefillDestination && !prefillPurpose?.startsWith('event:') && !prefillPurpose?.startsWith('resort:') ? prefillDestination : '');
   const [activeTab, setActiveTab] = useState<'airports'|'events'|'resorts'>(prefillPurpose?.startsWith('event:') ? 'events' : (prefillPurpose?.startsWith('resort:') ? 'resorts' : 'airports'));
   const [events, setEvents] = useState<any[]>([]);
   const [resorts, setResorts] = useState<any[]>([]);
   const setProvisionalRoute = useStore(s => s.setProvisionalRoute);

   useEffect(() => {
     db.events.toArray().then(raw => {
       const mapped = raw.map(e => getEventNextOccurrence(e, useStore.getState().getNow()));
       mapped.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
       setEvents(mapped);
     });
     db.resorts.toArray().then(raw => setResorts(raw.sort((a,b) => b.tier - a.tier)));
   }, []);

   const origin = aircraft.currentLocation;
   const reach = (lat: number, lng: number) => {
      if (!origin) return { distance: 0, inRange: true, hours: 0 };
      const distance = calculateDistanceNM(origin.lat, origin.lng, lat, lng);
      return { distance, inRange: distance <= aircraft.rangeNM, hours: distance / aircraft.speedKnots };
   };

   const results: AirportRecord[] = useMemo(() => {
      if (query.trim().length >= 2) return searchAirports(query, 30);
      return POPULAR.map(i => getAirport(i)).filter(Boolean) as AirportRecord[];
   }, [query]);

   const handleSelect = (dest: any) => {
      const r = reach(dest.lat, dest.lng);
      if (!r.inRange) {
         alert(`Out of range for the ${aircraft.model}.\nRange: ${aircraft.rangeNM.toLocaleString()} NM · Distance: ${Math.round(r.distance).toLocaleString()} NM\nPick a closer stop or a longer-legged jet.`);
         return;
      }
      setProvisionalRoute(null);
      onSelect(dest);
   };

   const preview = (lat: number, lng: number, name: string) => {
      if (!origin) return;
      setProvisionalRoute({ origin: { lat: origin.lat, lng: origin.lng, name: origin.name }, destination: { lat, lng, name } });
   };

   const ReachLine = ({ lat, lng }: { lat: number; lng: number }) => {
      const r = reach(lat, lng);
      return (
        <span className="shrink-0 text-right leading-tight">
          <span className="block text-[12px] font-mono text-zinc-200">{Math.round(r.distance).toLocaleString()} NM</span>
          <span className={`block text-[10px] font-mono ${r.inRange ? 'text-[var(--accent)]' : 'text-amber-400'}`}>{r.inRange ? formatDurationMs(r.hours * 3600000) : 'beyond range'}</span>
        </span>
      );
   };

   const tabBtn = (id: typeof activeTab, label: string, icon: React.ReactNode, tone = 'var(--accent)') => (
      <button onClick={() => setActiveTab(id)} className={`pb-3 text-[12px] font-semibold tracking-wide transition-all flex items-center gap-2 border-b-2 ${activeTab === id ? 'text-white' : 'border-transparent text-zinc-500 hover:text-white'}`} style={activeTab === id ? { borderColor: tone } : {}}>
        {icon} {label}
      </button>
   );

   return (
      <div className="w-full max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full overflow-hidden">
         <div className="flex items-center gap-3 mb-1">
           <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300"><ArrowLeft size={18} /></button>
           <h2 className="font-serif text-[28px] text-white">Where to?</h2>
         </div>
         <p className="text-[12.5px] text-zinc-400 mb-5 ml-12">{aircraft.tailNumber} · {aircraft.model} · range {aircraft.rangeNM.toLocaleString()} NM from {aircraft.currentLocationICAO}</p>

         <div className="flex border-b border-white/10 gap-6 mb-4 shrink-0">
             {tabBtn('airports', 'Airports', <Plane size={14}/>)}
             {tabBtn('events', 'Events', <Calendar size={14}/>, 'var(--color-gold)')}
             {tabBtn('resorts', 'Resorts', <Waves size={14}/>, 'var(--rose)')}
         </div>

         {activeTab === 'airports' && (
           <>
             <div className="relative mb-4 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                   type="text"
                   inputMode="search"
                   autoFocus
                   className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 pl-12 pr-10 text-white text-[15px] focus:outline-none focus:border-[var(--accent)] transition-colors"
                   placeholder="City, airport, ICAO or IATA…"
                   value={query}
                   onChange={(e) => setQuery(e.target.value)}
                />
                {query.length > 0 && (
                   <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X size={16} /></button>
                )}
             </div>
             {query.trim().length < 2 && <div className="eyebrow mb-2">Popular with your circle</div>}
             <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 pb-24 md:pb-4">
                {results.length === 0 && (
                   <div className="text-center p-8 text-zinc-500 text-sm">No airports match “{query}”.</div>
                )}
                {results.map(a => (
                   <button
                      key={a.icao}
                      onClick={() => handleSelect({ ...a })}
                      onMouseEnter={() => preview(a.lat, a.lng, a.name)}
                      className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-[var(--accent)]/40 rounded-2xl flex items-center gap-4 text-left transition-all group"
                   >
                      <div className="w-14 shrink-0">
                         <div className="font-mono text-[15px] font-bold text-white group-hover:text-[var(--accent)] transition-colors tracking-wider">{a.icao}</div>
                         {a.iata && <div className="font-mono text-[10px] text-zinc-500">{a.iata}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="text-[14px] text-white truncate">{a.city ? a.city.split(',')[0] : a.name}<span className="text-zinc-500">, {countryName(a.country)}</span></div>
                         <div className="text-[11.5px] text-zinc-500 truncate">{a.name}</div>
                      </div>
                      <ReachLine lat={a.lat} lng={a.lng} />
                   </button>
                ))}
             </div>
           </>
         )}

         {activeTab === 'events' && (
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 pb-24 md:pb-4">
               {events.map((evt: any) => {
                  const a = getAirport(evt.locationICAO);
                  const start = new Date(evt.startDate);
                  const dateStr = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(evt.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
                  return (
                     <button
                        key={evt.id}
                        onClick={() => {
                           if (!a) { alert('Airport code not found in routing database.'); return; }
                           handleSelect({ ...a, purpose: `event:${evt.id}`, purposeName: `Attending ${evt.name}` });
                        }}
                        onMouseEnter={() => a && preview(a.lat, a.lng, a.name)}
                        className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-[var(--color-gold)]/50 rounded-2xl flex items-center gap-4 text-left transition-all group"
                     >
                        <div className="w-11 h-11 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 flex items-center justify-center shrink-0 text-[var(--color-gold)] font-serif text-lg">{evt.prestigeTier}</div>
                        <div className="flex-1 min-w-0">
                           <div className="text-[14px] text-white group-hover:text-[var(--color-gold)] transition-colors truncate">{evt.name}</div>
                           <div className="text-[11.5px] text-zinc-500 truncate">{dateStr} · {evt.locationCity}</div>
                        </div>
                        {a && <ReachLine lat={a.lat} lng={a.lng} />}
                     </button>
                  );
               })}
            </div>
         )}

         {activeTab === 'resorts' && (
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 pb-24 md:pb-4">
               {resorts.map((r: any) => {
                  const a = getAirport(r.locationICAO);
                  return (
                     <button
                        key={r.id}
                        onClick={() => {
                           if (!a) { alert('Airport code not found in routing database.'); return; }
                           handleSelect({ ...a, purpose: `resort:${r.id}`, purposeName: `Stay at ${r.name}` });
                        }}
                        onMouseEnter={() => preview(r.lat, r.lng, r.name)}
                        className="w-full px-4 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-[var(--rose)]/50 rounded-2xl flex items-center gap-4 text-left transition-all group"
                     >
                        <div className="w-11 h-11 rounded-xl bg-[var(--rose)]/10 border border-[var(--rose)]/20 flex items-center justify-center shrink-0 text-[var(--rose)] font-serif text-lg">{r.name.substring(0, 1)}</div>
                        <div className="flex-1 min-w-0">
                           <div className="text-[14px] text-white group-hover:text-[var(--rose)] transition-colors truncate">{r.name}</div>
                           <div className="text-[11.5px] text-zinc-500 truncate">{r.brand} · {r.city}, {r.country} · from ${r.nightlyRate.toLocaleString()}/night</div>
                        </div>
                        <ReachLine lat={r.lat} lng={r.lng} />
                     </button>
                  );
               })}
            </div>
         )}
         <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-500 pt-3"><Navigation2 size={12} /> Hover a destination to preview the route on the globe.</div>
      </div>
   );
}
