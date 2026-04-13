'use client';

import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Aircraft } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../../lib/repositories/aircraft';
import { Plane, Compass, Fuel, LayoutGrid, Route, MousePointerClick } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FleetManager() {
  const { setSelectedAircraftId } = useStore();
  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
  const router = useRouter();
  const [tab, setTab] = useState<'AIRCRAFT' | 'YACHTS'>('AIRCRAFT');

  return (
    <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
         
         <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <div>
               <h1 className="text-3xl font-black tracking-widest">FLEET ROSTER</h1>
               <div className="flex gap-4 mt-3">
                  <button onClick={() => setTab('AIRCRAFT')} className={`text-xs font-mono tracking-widest font-bold pb-2 border-b-2 ${tab === 'AIRCRAFT' ? 'text-[#00f0ff] border-[#00f0ff]' : 'text-zinc-600 border-transparent hover:text-white'}`}>AIRCRAFT</button>
                  <button onClick={() => setTab('YACHTS')} className={`text-xs font-mono tracking-widest font-bold pb-2 border-b-2 ${tab === 'YACHTS' ? 'text-[#00f0ff] border-[#00f0ff]' : 'text-zinc-600 border-transparent hover:text-white'}`}>YACHTS</button>
               </div>
            </div>
            <button 
               onClick={() => router.push('/acquisitions')}
               className="bg-white/5 hover:bg-white/10 border border-white/20 text-xs px-4 py-2 font-bold tracking-widest transition-colors rounded mb-2"
            >
               ACQUIRE NEW
            </button>
         </div>

         {tab === 'YACHTS' && (
            <div className="w-full py-32 flex flex-col items-center justify-center border border-white/5 border-dashed rounded-xl bg-[#141419]/50">
               <h2 className="text-xl font-black tracking-widest text-zinc-500 mb-2">MARITIME BRANCH INACTIVE</h2>
               <p className="text-sm font-mono text-zinc-600">Yacht acquisitions unlock in Phase 6.</p>
            </div>
         )}

         {tab === 'AIRCRAFT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {fleet.map((jet: Aircraft) => (
                   <div key={jet.id} onClick={() => router.push(`/fleet/${jet.tailNumber}`)} className="group relative bg-[#141419] border border-white/10 rounded-xl overflow-hidden hover:border-[#00f0ff]/50 transition-all shadow-xl cursor-pointer">
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                          {jet.status === 'parked' ? (
                             <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded font-mono font-bold">PARKED</span>
                          ) : (
                             <span className="text-[10px] bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 px-2 py-1 rounded font-mono font-bold animate-pulse">IN TRANSIT</span>
                          )}
                      </div>

                      <div className="w-full h-48 bg-gradient-to-b from-white/5 to-transparent flex items-center justify-center p-6 relative">
                          {jet.layoutImage ? (
                             <img src={jet.layoutImage} alt={jet.model} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-contain filter group-hover:brightness-125 transition-all opacity-80" />
                          ) : (
                             <div className="aspect-video w-full bg-white/5 border border-white/10 rounded flex items-center justify-center">
                               <div className="text-center">
                                 <Plane className="w-8 h-8 text-white/20 mx-auto mb-2" strokeWidth={1} />
                                 <span className="text-[8px] font-mono uppercase tracking-widest text-white/30">
                                   No blueprint available
                                 </span>
                               </div>
                             </div>
                          )}
                      </div>

                      <div className="p-6 flex flex-col gap-4">
                         <div>
                            <h2 className="text-2xl font-black font-mono tracking-widest text-[#00f0ff]">{jet.tailNumber}</h2>
                            <h3 className="text-sm text-zinc-400 mt-1">{jet.model}</h3>
                         </div>

                         <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                            <div className="bg-black/40 p-2 rounded border border-white/5">
                               <span className="text-zinc-500 block mb-1">Max Speed</span>
                               <span className="text-white flex items-center gap-2"><Compass size={12} className="text-amber-400"/> {jet.speedKnots} KT</span>
                            </div>
                            <div className="bg-black/40 p-2 rounded border border-white/5">
                               <span className="text-zinc-500 block mb-1">Burn Rate</span>
                               <span className="text-white flex items-center gap-2"><Fuel size={12} className="text-amber-400"/> {jet.fuelBurnGPH} GPH</span>
                            </div>
                            <div className="bg-black/40 p-2 rounded border border-white/5">
                               <span className="text-zinc-500 block mb-1">Capacity</span>
                               <span className="text-white flex items-center gap-2"><LayoutGrid size={12} className="text-amber-400"/> {jet.cabinConfig.length} SLOTS</span>
                            </div>
                            <div className="bg-black/40 p-2 rounded border border-white/5">
                               <span className="text-zinc-500 block mb-1">Location</span>
                               <span className="text-white flex items-center gap-2"><Route size={12} className="text-amber-400"/> {jet.status === 'parked' ? (jet.currentLocationICAO ?? 'Hangar') : 'In Transit'}</span>
                            </div>
                         </div>

                         <div className="mt-2 flex gap-2 w-full">
                            <button 
                               onClick={(e) => { e.stopPropagation(); router.push(`/fleet/${jet.tailNumber}`); }}
                               className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded font-bold tracking-widest text-[10px] transition-colors flex justify-center items-center gap-2"
                            >
                               VIEW CRAFT
                            </button>
                            <button 
                               disabled={jet.status !== 'parked'}
                               onClick={(e) => { e.stopPropagation(); router.push(`/flight/new?aircraft=${jet.tailNumber}`); }}
                               className={`flex-1 ${jet.status === 'parked' ? 'bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30' : 'bg-white/5 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50'} py-3 rounded font-bold tracking-widest text-[10px] transition-colors flex justify-center items-center gap-2`}
                            >
                               DISPATCH
                            </button>
                         </div>
                      </div>
                   </div>
               ))}
            </div>
         )}
      </div>
    </div>
  )
}
