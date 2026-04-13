'use client';

import React, { useState } from 'react';
import { Aircraft } from '../../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { Plane, Compass, Fuel, LayoutGrid, Route, Package, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Economy } from '../../../lib/economy';
import { playerRepo } from '../../../lib/repositories/player';

export default function FleetDetail({ params }: { params: { tailNumber: string } }) {
  const router = useRouter();
  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
  const jet = fleet.find(j => j.tailNumber === params.tailNumber);
  
  const [activeTab, setActiveTab] = useState<'SPECS' | 'MODULES' | 'FLIGHT_LOG' | 'ACTIONS'>('SPECS');

  if (!jet) return null;

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
                    <img src={jet.layoutImage} alt={jet.model} className="h-full object-contain filter drop-shadow-2xl brightness-125" />
                 ) : (
                    <Plane size={64} className="text-zinc-600" />
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
            <div className="flex flex-col items-center justify-center py-20 bg-[#141419] rounded-xl border border-white/5 border-dashed">
               <h3 className="text-zinc-400 font-mono tracking-widest mb-1">NO FLIGHTS RECORDED</h3>
               <p className="text-zinc-600 text-sm">Dispatch this aircraft to start its log.</p>
            </div>
         )}

         {activeTab === 'ACTIONS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
