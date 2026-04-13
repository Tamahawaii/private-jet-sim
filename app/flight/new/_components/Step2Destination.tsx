import React, { useState, useEffect } from 'react';
import { Aircraft } from '../../../../types';
import { calculateDistanceNM } from '../../../lib/math';
import { Search, MapPin, X, ArrowLeft, Calendar, Plane, Waves } from 'lucide-react';
import { db } from '../../../../lib/db';
import { getEventNextOccurrence } from '../../../lib/events';
import { useStore } from '../../../lib/store';
import airportsData from '../../../../data/airports.json';

interface Props {
  aircraft: Aircraft;
  prefillDestination?: string | null;
  prefillPurpose?: string | null;
  onSelect: (destination: any) => void;
  onBack: () => void;
}

export default function Step2Destination({ aircraft, prefillDestination, prefillPurpose, onSelect, onBack }: Props) {
   const [query, setQuery] = useState(prefillDestination && !prefillPurpose?.startsWith('event:') && !prefillPurpose?.startsWith('resort:') ? prefillDestination : '');
   const [airports, setAirports] = useState<any[]>([]);
   const [results, setResults] = useState<any[]>([]);
   const [activeTab, setActiveTab] = useState<'airports'|'events'|'resorts'>(prefillPurpose?.startsWith('event:') ? 'events' : (prefillPurpose?.startsWith('resort:') ? 'resorts' : 'airports'));
   const [events, setEvents] = useState<any[]>([]);
   const [resorts, setResorts] = useState<any[]>([]);
   useEffect(() => {
     db.events.toArray().then(raw => {
       const mapped = raw.map(e => getEventNextOccurrence(e, useStore.getState().getNow()));
       mapped.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
       setEvents(mapped);
     });
   }, []);

   useEffect(() => {
     db.resorts.toArray().then(raw => {
       const mapped = raw.sort((a,b) => b.tier - a.tier);
       setResorts(mapped);
     });
   }, []);

   useEffect(() => {
      setAirports(airportsData);
   }, []);

   useEffect(() => {
      if (query.trim().length < 2) {
         setResults([]);
         return;
      }
      const lower = query.toLowerCase();
      const matches = airports.filter(a => 
         (a.icao || '').toLowerCase().includes(lower) || 
         (a.name || '').toLowerCase().includes(lower) || 
         (a.city || '').toLowerCase().includes(lower)
      ).slice(0, 20); // max 20 results logic
      setResults(matches);
   }, [query, airports]);

   const handleSelect = (dest: any) => {
      // Validate range
      if (aircraft.currentLocation) {
         const distance = calculateDistanceNM(aircraft.currentLocation.lat, aircraft.currentLocation.lng, dest.lat, dest.lng);
         if (distance > aircraft.rangeNM) {
            alert(`Out of range for ${aircraft.model}.\nRange: ${aircraft.rangeNM} NM\nDistance: ${Math.round(distance)} NM`);
            return;
         }
      }
      onSelect(dest);
   };

   return (
      <div className="w-full max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full overflow-hidden">
         <div className="flex items-center gap-4 mb-2">
           <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft size={20} />
           </button>
           <h2 className="text-2xl font-black font-mono tracking-widest uppercase">Destination</h2>
         </div>
         <p className="text-zinc-400 font-mono text-xs tracking-widest mb-8 uppercase">Awaiting flight plan coordinates.</p>
         
         <div className="flex border-b border-white/10 gap-8 mb-6 shrink-0">
             <button 
                onClick={() => setActiveTab('airports')}
                className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'airports' ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-transparent text-zinc-500 hover:text-white'}`}
             >
                <Plane size={16}/> ICAO / Cities
             </button>
             <button 
                onClick={() => setActiveTab('events')}
                className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'events' ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-transparent text-zinc-500 hover:text-white'}`}
             >
                <Calendar size={16}/> Global Events
             </button>
             <button 
                onClick={() => setActiveTab('resorts')}
                className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'resorts' ? 'border-[#f5a7a7] text-[#f5a7a7]' : 'border-transparent text-zinc-500 hover:text-white'}`}
             >
                <Waves size={16}/> Resorts
             </button>
         </div>
         
         {activeTab === 'airports' && (
           <>
             <div className="relative mb-6 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
               type="text" 
               className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white font-mono tracking-widest text-sm focus:outline-none focus:border-[#00f0ff] transition-colors"
               placeholder="SEARCH ICAO, CITY, OR AIRPORT..."
               value={query}
               onChange={(e) => setQuery(e.target.value)}
            />
            {query.length > 0 && (
               <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                 <X size={16} />
               </button>
            )}
         </div>

         <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {results.length === 0 && query.trim().length >= 2 && (
               <div className="text-center p-8 text-zinc-600 font-mono text-xs tracking-widest">
                  NO MATCHING PROTOCOLS FOUND
               </div>
            )}
            {results.map(a => (
               <button 
                  key={a.icao}
                  onClick={() => handleSelect(a)}
                  className="w-full p-4 bg-black/20 hover:bg-white/5 border border-white/5 hover:border-[#00f0ff]/50 rounded-xl flex items-center justify-between text-left transition-all group"
               >
                  <div>
                     <div className="font-mono text-lg font-black text-white group-hover:text-[#00f0ff] transition-colors tracking-widest">{a.icao}</div>
                     <div className="text-zinc-400 text-xs font-sans mt-1">{a.name}</div>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono tracking-widest">
                     <MapPin size={12} />
                     {a.city ? `${a.city}, ${a.country}` : a.country}
                  </div>
               </button>
            ))}
         </div>
         </>
         )}

         {activeTab === 'events' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
               {events.map((evt: any) => {
                  const start = new Date(evt.startDate);
                  const isSameMonth = start.getUTCMonth() === new Date(evt.endDate).getUTCMonth();
                  const dateStr = isSameMonth
                    ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${new Date(evt.endDate).toLocaleDateString('en-US', { day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
                    : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${new Date(evt.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

                  return (
                     <button 
                        key={evt.id}
                        onClick={() => {
                           const a = airports.find(air => air.icao === evt.locationICAO);
                           if (a) {
                              a.purpose = `event:${evt.id}`;
                              a.purposeName = `Attending ${evt.name}`;
                              handleSelect(a);
                           } else {
                              alert("Airport code not found in routing database.");
                           }
                        }}
                        className="w-full p-4 bg-black/20 hover:bg-white/5 border border-white/5 hover:border-[#00f0ff]/50 rounded-xl flex items-center justify-between text-left transition-all group"
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-zinc-900 rounded overflow-hidden shrink-0 hidden sm:flex items-center justify-center">
                               {evt.imageUrl ? (
                                   <img src={evt.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                               ) : (
                                   <span className="text-[8px] font-mono tracking-widest text-[#00f0ff] uppercase text-center block leading-tight">IMG<br/>PND</span>
                               )}
                           </div>
                           <div>
                              <div className="font-mono text-base font-black text-white group-hover:text-[#00f0ff] transition-colors tracking-widest uppercase">{evt.name}</div>
                              <div className="text-zinc-500 text-xs font-mono tracking-widest mt-1 uppercase flex items-center gap-2">
                                  <span>{dateStr}</span>
                                  <span className="w-1 h-1 bg-zinc-700 rounded-full"/>
                                  <span>Tier {evt.prestigeTier}</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono tracking-widest bg-white/5 px-2 py-1 rounded">
                           {evt.locationICAO}
                        </div>
                     </button>
                  );
               })}
            </div>
         )}

         {activeTab === 'resorts' && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
               {resorts.map((r: any) => {
                  return (
                     <button 
                        key={r.id}
                        onClick={() => {
                           const a = airports.find(air => air.icao === r.locationICAO);
                           if (a) {
                              a.purpose = `resort:${r.id}`;
                              a.purposeName = `Stay at ${r.name}`;
                              handleSelect(a);
                           } else {
                              alert("Airport code not found in routing database.");
                           }
                        }}
                        className="w-full p-4 bg-black/20 hover:bg-white/5 border border-white/5 hover:border-[#f5a7a7]/50 rounded-xl flex items-center justify-between text-left transition-all group"
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-zinc-900 rounded overflow-hidden shrink-0 hidden sm:flex items-center justify-center">
                               <span className="text-xl font-serif text-white/50">{r.name.substring(0,2).toUpperCase()}</span>
                           </div>
                           <div>
                              <div className="font-mono text-base font-black text-white group-hover:text-[#f5a7a7] transition-colors tracking-widest uppercase">{r.name}</div>
                              <div className="text-zinc-500 text-xs font-mono tracking-widest mt-1 uppercase flex items-center gap-2">
                                  <span>Tier {r.tier}</span>
                                  <span className="w-1 h-1 bg-zinc-700 rounded-full"/>
                                  <span>{r.region}</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono tracking-widest bg-white/5 px-2 py-1 rounded">
                           {r.locationICAO}
                        </div>
                     </button>
                  );
               })}
            </div>
         )}
      </div>
   );
}
