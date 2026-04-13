'use client';

import React, { useState } from 'react';
import { Aircraft } from '../../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { Plane, Compass, Fuel, LayoutGrid, Route, Package, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Economy } from '../../../lib/economy';
import { playerRepo } from '../../../lib/repositories/player';

import { flightRepo } from '../../../lib/repositories/flight';

export default function FleetDetail({ params }: { params: Promise<{ tailNumber: string }> }) {
  const router = useRouter();
  const { tailNumber } = React.use(params);
  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
  const jet = fleet.find(j => j.tailNumber === tailNumber);
  const flights = useLiveQuery(() => flightRepo.getAllByTailNumber(tailNumber), [tailNumber]) || [];
  
  const [activeTab, setActiveTab] = useState<'SPECS' | 'MODULES' | 'FLIGHT_LOG' | 'ACTIONS'>('SPECS');

  if (fleet.length === 0) return (
     <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 flex items-center justify-center font-mono text-[#00f0ff] animate-pulse tracking-widest text-sm">
        ACCESSING DATABASE...
     </div>
  );
  if (!jet) return (
     <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 flex flex-col items-center justify-center gap-4 text-white">
        <h2 className="font-mono text-xl tracking-widest text-red-500">ASSET NOT FOUND</h2>
        <button onClick={() => router.push('/fleet')} className="text-zinc-400 hover:text-white border-b border-zinc-500 pb-1 text-xs">Return to Roster</button>
     </div>
  );
  return (
    <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

         {/* BACK BTN */}
         <button onClick={() => router.push('/fleet')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold w-max">
            <ChevronLeft size={16} /> Back to Fleet
         </button>
         
         {/* HERO HEADER */}
         <div className="bg-[#141419] border border-white/10 rounded-xl overflow-hidden shadow-xl p-8 relative flex flex-col items-center">
            {/* Status Pin */}
             <div className="absolute top-4 right-4 z-10">
                 {jet.flightPhase === 'Hangar' ? (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded font-mono font-bold">PARKED</span>
                 ) : (
                    <span className="text-xs bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 px-3 py-1.5 rounded font-mono font-bold animate-pulse">{jet.flightPhase.toUpperCase()}</span>
                 )}
             </div>

             <div className="h-64 w-full flex justify-center items-center opacity-80 mb-6">
                 {jet.layoutImage ? (
                    <img src={jet.layoutImage} alt={jet.model} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-full object-contain filter drop-shadow-2xl brightness-125" />
                 ) : (
                    <div className="aspect-video bg-white/5 border border-white/10 rounded flex items-center justify-center p-12">
                      <div className="text-center">
                        <Plane className="w-12 h-12 text-white/20 mx-auto mb-2" strokeWidth={1} />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                          No blueprint available
                        </span>
                      </div>
                    </div>
                 )}
             </div>

             <div className="text-center w-full relative z-20">
                <h1 className="text-5xl font-black font-mono tracking-widest text-[#00f0ff] mb-2 drop-shadow-lg">{jet.tailNumber}</h1>
                <h2 className="text-xl text-zinc-400 font-bold">{jet.model} {jet.nickname ? `"${jet.nickname}"` : ''}</h2>
             </div>
         </div>

         {/* TABS MENU */}
         <div className="flex gap-4 border-b border-white/10">
            {['SPECS', 'MODULES', 'FLIGHT_LOG', 'ACTIONS'].map(tab => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-3 px-2 text-sm tracking-widest font-bold transition-all border-b-2 ${activeTab === tab ? 'text-white border-[#00f0ff]' : 'text-zinc-500 border-transparent hover:text-white'}`}
               >
                  {tab.replace('_', ' ')}
               </button>
            ))}
         </div>

         {/* TAB CONTENTS */}
         {activeTab === 'SPECS' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-12">
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">Max Speed</span>
                  <span className="text-xl font-mono text-white flex items-center gap-2"><Compass size={20} className="text-amber-400"/> {jet.speedKnots} KTS</span>
               </div>
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">Burn Rate</span>
                  <span className="text-xl font-mono text-white flex items-center gap-2"><Fuel size={20} className="text-amber-400"/> {jet.fuelBurnGPH} GPH</span>
               </div>
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">Range Limit</span>
                  <span className="text-xl font-mono text-white flex items-center gap-2"><Route size={20} className="text-amber-400"/> {jet.rangeNM} NM</span>
               </div>
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">Capacity</span>
                  <span className="text-xl font-mono text-white flex items-center gap-2"><LayoutGrid size={20} className="text-amber-400"/> {jet.cabinConfig.length} SLOTS</span>
               </div>
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5 col-span-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">Flight Hours</span>
                  <span className="text-xl font-mono text-white">{Math.round(jet.hoursFlown).toLocaleString()} HR</span>
               </div>
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5 col-span-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">Current Location</span>
                  <span className="text-xl font-mono text-white">{jet.flightPhase === 'Hangar' ? (jet.currentLocation?.name ?? 'Hangar') : 'In Transit'}</span>
               </div>
            </div>
         )}

         {activeTab === 'MODULES' && (
            <div className="flex flex-col items-center justify-center py-20 bg-[#141419] rounded-xl border border-white/5 border-dashed">
               <Package size={48} className="text-zinc-600 mb-4" />
               <h3 className="text-zinc-400 font-mono tracking-widest mb-1">MODULES INTERFACE</h3>
               <p className="text-zinc-600 text-sm">Marketplace module integration coming in Phase 7.</p>
            </div>
         )}

         {activeTab === 'FLIGHT_LOG' && (
            <div className="flex flex-col gap-2 pb-12">
               {flights.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-[#141419] rounded-xl border border-white/5 border-dashed">
                     <h3 className="text-zinc-400 font-mono tracking-widest mb-1">NO FLIGHTS RECORDED</h3>
                     <p className="text-zinc-600 text-sm">Dispatch this aircraft to start its log.</p>
                  </div>
               ) : (
                  flights.map(f => (
                     <button 
                        key={f.id}
                        onClick={() => router.push(`/flight/${f.id}`)}
                        className="bg-[#141419] p-4 rounded-xl border border-white/5 hover:border-[#00f0ff]/30 transition-all flex items-center justify-between group text-left"
                     >
                        <div className="flex items-center gap-6">
                           <div>
                              <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">{new Date(f.departedAt).toLocaleDateString()}</div>
                              <div className="font-mono font-black text-white group-hover:text-[#00f0ff] transition-colors">{f.originICAO} → {f.destinationICAO}</div>
                           </div>
                           <div className="hidden md:block">
                              <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">DISTANCE</div>
                              <div className="font-mono text-zinc-300">{Math.round(f.distanceNM)} NM</div>
                           </div>
                           <div className="hidden md:block">
                              <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">COST</div>
                              <div className="font-mono text-zinc-300">${f.costUSD.toLocaleString()}</div>
                           </div>
                        </div>
                        <div>
                           {f.arrivedAt ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded">COMPLETED</span>
                           ) : (
                              <span className="bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff] animate-pulse text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded">IN TRANSIT</span>
                           )}
                        </div>
                     </button>
                  ))
               )}
            </div>
         )}

         {activeTab === 'ACTIONS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-[#141419] p-6 rounded-xl border border-[#00f0ff]/30 flex flex-col gap-4 col-span-1 md:col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                     <Plane size={100} className="rotate-45" />
                  </div>
                  <div className="flex items-center gap-3 relative z-10">
                     <div className="w-10 h-10 rounded bg-[#00f0ff]/20 flex items-center justify-center text-[#00f0ff] border border-[#00f0ff]/30">
                        <Route size={20} />
                     </div>
                     <div>
                        <h3 className="font-bold text-white mb-1">Dispatch Mission</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">Send this aircraft on a structured flight assignment or repositioning hop.</p>
                     </div>
                  </div>
                  <button 
                     disabled={jet.status !== 'parked'}
                     onClick={() => router.push(`/flight/new?aircraft=${jet.tailNumber}`)}
                     className={`bg-[#00f0ff] hover:bg-white text-black shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded py-3 text-sm font-black font-mono tracking-widest mt-auto transition-colors relative z-10 ${jet.status !== 'parked' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                     {jet.status === 'parked' ? 'DISPATCH AIRCRAFT ⚡' : 'AIRCRAFT IN TRANSIT'}
                  </button>
               </div>
               
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-white mb-1">Rename Aircraft</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">Assign a nickname or callsign. Shows up globally across Dispatch.</p>
                  </div>
                  <button 
                     onClick={async () => {
                         const newName = prompt(`Enter new nickname for ${jet.tailNumber}:`, jet.nickname || '');
                         if (newName !== null) {
                             await aircraftRepo.update(jet.id, { nickname: newName.trim() || undefined });
                         }
                     }}
                     className="bg-white/5 hover:bg-white/10 text-white rounded py-2 text-sm font-bold tracking-widest mt-auto border border-white/10 transition-colors"
                  >
                     ASSIGN NAME
                  </button>
               </div>
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-white mb-1">Schedule Maintenance</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">Take aircraft offline for mandatory inspections.</p>
                  </div>
                  <button className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded py-2 text-sm font-bold tracking-widest mt-auto border border-amber-500/20">MAINTENANCE MENU</button>
               </div>
               <div className="bg-[#141419] p-6 rounded-xl border border-white/5 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-white mb-1">Charter Program</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">Allow operator to charter your frame while idle.</p>
                  </div>
                  <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded py-2 text-sm font-bold tracking-widest mt-auto border border-emerald-500/20">TOGGLE CHARTER (COMING SOON)</button>
               </div>
               <div className="bg-red-950/20 p-6 rounded-xl border border-red-900/30 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-red-500 mb-1">Liquidate Asset</h3>
                    <p className="text-xs text-red-500/70 leading-relaxed">Sell this aircraft immediately. Returns 80% of original capital.</p>
                  </div>
                  <button 
                     onClick={async () => {
                         if (confirm(`Sell ${jet.model} for $${Math.round(jet.purchasePrice * 0.8).toLocaleString()}?`)) {
                             await Economy.sellAircraft(jet.id);
                             router.push('/fleet');
                         }
                     }}
                     className="bg-red-600 hover:bg-red-500 text-white rounded py-2 text-sm font-bold tracking-widest mt-auto transition-colors"
                  >
                     SELL FOR ${(jet.purchasePrice * 0.8).toLocaleString()}
                  </button>
               </div>
            </div>
         )}
      </div>
    </div>
  )
}
