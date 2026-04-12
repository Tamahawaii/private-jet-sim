'use client';

import React from 'react';
import { useStore, Aircraft } from '../lib/store';
import { Plane, Compass, Fuel, LayoutGrid, Route, MousePointerClick } from 'lucide-react';

export default function FleetManager() {
  const { fleet, setSelectedAircraftId, setActiveView } = useStore();

  return (
    <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
         
         <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <div>
               <h1 className="text-3xl font-black tracking-widest">FLEET ROSTER</h1>
               <p className="text-zinc-500 font-mono text-sm mt-1">Total Assets: {fleet.length}</p>
            </div>
            <button 
               onClick={() => setActiveView('Shop')}
               className="bg-white/5 hover:bg-white/10 border border-white/20 text-xs px-4 py-2 font-bold tracking-widest transition-colors rounded"
            >
               ACQUIRE NEW
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {fleet.map((jet: Aircraft) => (
                <div key={jet.id} className="group relative bg-[#141419] border border-white/10 rounded-xl overflow-hidden hover:border-[#00f0ff]/50 transition-all shadow-xl">
                   {/* Status badge */}
                   <div className="absolute top-4 right-4 z-10 flex gap-2">
                       {jet.flightPhase === 'Hangar' ? (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded font-mono font-bold">PARKED</span>
                       ) : (
                          <span className="text-[10px] bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 px-2 py-1 rounded font-mono font-bold animate-pulse">{jet.flightPhase.toUpperCase()}</span>
                       )}
                   </div>

                   {/* Jet Photo / Blueprint */}
                   <div className="w-full h-48 bg-gradient-to-b from-white/5 to-transparent flex items-center justify-center p-6 relative">
                       {jet.layoutImage ? (
                          <img src={jet.layoutImage} alt={jet.model} className="w-full h-full object-contain filter group-hover:brightness-125 transition-all opacity-80" />
                       ) : (
                          <Plane size={48} className="text-zinc-600" />
                       )}
                   </div>

                   {/* Details block */}
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
                            <span className="text-white flex items-center gap-2"><Route size={12} className="text-amber-400"/> {jet.flightPhase === 'Hangar' ? jet.currentLocation.name : 'IN TRANSIT'}</span>
                         </div>
                      </div>

                      <button 
                         onClick={() => {
                            setSelectedAircraftId(jet.id);
                            setActiveView('Map');
                         }}
                         className="mt-2 w-full bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 py-3 rounded font-bold tracking-widest text-sm transition-colors flex justify-center items-center gap-2"
                      >
                         <MousePointerClick size={16}/> {jet.flightPhase === 'Hangar' ? 'DISPATCH AIRCRAFT' : 'VIEW TELEMETRY'}
                      </button>
                   </div>
                </div>
            ))}
         </div>

      </div>
    </div>
  )
}
