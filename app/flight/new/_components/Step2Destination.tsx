import React, { useState, useEffect } from 'react';
import { Aircraft } from '../../../../types';
import { calculateDistanceNM } from '../../../lib/math';
import { Search, MapPin, X, ArrowLeft } from 'lucide-react';

interface Props {
  aircraft: Aircraft;
  onSelect: (destination: any) => void;
  onBack: () => void;
}

export default function Step2Destination({ aircraft, onSelect, onBack }: Props) {
   const [query, setQuery] = useState('');
   const [airports, setAirports] = useState<any[]>([]);
   const [results, setResults] = useState<any[]>([]);

   useEffect(() => {
      fetch('/airports.json')
        .then(r => r.json())
        .then(data => setAirports(data))
        .catch(console.error);
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
      </div>
   );
}
