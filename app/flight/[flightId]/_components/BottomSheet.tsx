import React, { useState, useEffect } from 'react';
import { Flight, Aircraft } from '../../../../types';
import { useStore } from '../../../lib/store';
import { Plane, ChevronUp, ChevronDown, Compass, Wind, ChevronLeft } from 'lucide-react';
import { db } from '../../../../lib/db';
import { useRouter } from 'next/navigation';

export default function BottomSheet({ flight, aircraft }: { flight: Flight, aircraft: Aircraft }) {
   const [state, setState] = useState<'peek' | 'half' | 'full'>('peek');
   const { getNow, timeMultiplier } = useStore();
   const [now, setNow] = useState(getNow());
   const router = useRouter();

   useEffect(() => {
      const i = setInterval(() => setNow(getNow()), 100);
      return () => clearInterval(i);
   }, [getNow]);

   const elapsed = now - flight.departedAt;
   const total = flight.estimatedArrivalAt - flight.departedAt;
   const progress = Math.min(1, Math.max(0, total > 0 ? elapsed / total : 1));

   const msRemaining = Math.max(0, flight.estimatedArrivalAt - now);
   const virtualMsRemaining = msRemaining / timeMultiplier; // How much real world time until it lands

   const formatVirtualMs = (ms: number) => {
      const totalMins = Math.floor(ms / 60000);
      const h = Math.floor(totalMins / 60);
      const m = Math.floor(totalMins % 60);
      return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
   };

   // Altitude Simulation Flavor
   let altitude = 0;
   if (progress < 0.05) {
       altitude = (progress / 0.05) * 41000;
   } else if (progress > 0.95) {
       altitude = ((1 - progress) / 0.05) * 41000;
   } else {
       // Cruise
       const noise = Math.sin(now / 10000) * 500;
       altitude = 41000 + noise;
   }

   const handleCancel = async () => {
       if (progress >= 0.2) return;
       const cost = Math.floor(flight.costUSD * progress * 2);
       if (confirm(`Turn around and return to ${flight.originICAO}?\nYou'll pay fuel for completed distance ($${cost}) and land at ${flight.originICAO}.`)) {
           await db.flights.update(flight.id, {
               originICAO: flight.destinationICAO,
               destinationICAO: flight.originICAO,
               // Shorten estimated arrival to mirror the fractional return trip
               estimatedArrivalAt: now + elapsed,
               costUSD: cost
           });
       }
   };

   let heightClass = 'h-[160px]';
   if (state === 'half') heightClass = 'h-[320px]';
   if (state === 'full') heightClass = 'h-[75vh]';

   return (
       <div className={`w-full bg-black/90 pointer-events-auto backdrop-blur-3xl border-t border-white/20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${heightClass} flex flex-col rounded-t-3xl shadow-[0_-20px_40px_rgba(0,0,0,0.5)]`}>
          {/* Drag Handle Area */}
          <div 
             className="w-full flex justify-center py-4 cursor-pointer hover:bg-white/5 transition-colors"
             onClick={() => {
                if (state === 'peek') setState('half');
                else if (state === 'half') setState('full');
                else setState('peek');
             }}
          >
             <div className="w-12 h-1.5 bg-white/30 rounded-full" />
          </div>

          <div className="px-6 pb-6 flex-1 overflow-y-auto">
             {/* PEEK HEADER */}
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                   <div className="text-3xl font-black font-mono tracking-widest text-[#00f0ff]">{flight.originICAO}</div>
                   <Plane className="text-white/30 rotate-90" size={24} />
                   <div className="text-3xl font-black font-mono tracking-widest text-[#00f0ff]">{flight.destinationICAO}</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">ETA</div>
                   <div className="text-xl font-bold font-mono tracking-tighter text-white">
                      {formatVirtualMs(virtualMsRemaining)}
                   </div>
                </div>
             </div>

             {/* PROGRESS BAR */}
             <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/10 shadow-inner mb-6 relative">
                <div className="h-full bg-gradient-to-r from-[#0088ff] to-[#00f0ff] transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(0,240,255,0.5)]" style={{ width: `${progress * 100}%` }}>
                   <div className="absolute top-0 right-0 w-4 h-full bg-white/50 animate-pulse" />
                </div>
             </div>

             {/* HALF STATE EXTENSIONS */}
             {state !== 'peek' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-[10px] text-[#00f0ff] font-mono tracking-widest mb-1 flex items-center gap-2"><Wind size={12}/> GROUND SPEED</div>
                      <div className="text-2xl font-bold font-mono text-white">{Math.floor(flight.cruiseSpeedKTS)} <span className="text-sm text-zinc-500">KTS</span></div>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-[10px] text-[#00f0ff] font-mono tracking-widest mb-1 flex items-center gap-2"><ChevronUp size={12}/> ALTITUDE</div>
                      <div className="text-2xl font-bold font-mono text-white">{Math.floor(altitude).toLocaleString()} <span className="text-sm text-zinc-500">FT</span></div>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-[10px] text-[#00f0ff] font-mono tracking-widest mb-1 flex items-center gap-2"><Compass size={12}/> DIST REMAINING</div>
                      <div className="text-2xl font-bold font-mono text-white">{Math.floor(flight.distanceNM * (1 - progress))} <span className="text-sm text-zinc-500">NM</span></div>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-[10px] text-[#00f0ff] font-mono tracking-widest mb-1 flex items-center gap-2"><Plane size={12}/> TAIL NUMBER</div>
                      <div className="text-2xl font-bold font-mono text-white">{flight.tailNumber}</div>
                   </div>
                </div>
             )}

             {/* FULL STATE EXTENSIONS */}
             {state === 'full' && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="p-6 bg-black/40 border border-[#00f0ff]/20 rounded-2xl">
                       <h3 className="text-xs text-zinc-500 font-mono tracking-widest mb-4">MANIFEST</h3>
                       <div className="flex items-center gap-4">
                          <img src="/flight_attendant_avatar.png" className="w-12 h-12 rounded-full border border-white/20 object-cover" />
                          <div>
                             <div className="font-bold text-white font-mono tracking-widest">PLAYER (SOLO)</div>
                             <div className="text-xs text-zinc-500 font-sans">Leisure Travel</div>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 bg-black/40 border border-white/10 rounded-2xl flex justify-between items-center">
                       <div>
                          <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">TOTAL TRIP COST</div>
                          <div className="text-2xl font-black font-mono text-white">${flight.costUSD.toLocaleString()}</div>
                       </div>
                       {progress < 0.2 && (
                          <button onClick={handleCancel} className="px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500/40 rounded border border-red-500/30 text-xs font-bold font-mono tracking-widest transition-colors">
                             ✕ ABORT FLIGHT
                          </button>
                       )}
                    </div>
                 </div>
             )}
          </div>
       </div>
   );
}
