'use client';

import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { SHOP_CATALOG } from '../lib/mockData';
import { Plane, Plus, DollarSign, Fuel, Compass } from 'lucide-react';
import { formatCurrency } from './Dashboard'; // we need to move this or rewrite formatCurrency, let's just write it natively

function fmt(n: number) {
    if (n >= 1000000000) return '$' + (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    return '$' + n.toLocaleString();
}

export default function FleetSidebar() {
  const { fleet, selectedAircraftId, setSelectedAircraftId, playerCash, buyAircraft } = useStore();
  const [shopOpen, setShopOpen] = useState(false);

  return (
    <div className="absolute top-0 bottom-0 left-0 w-80 bg-black/60 backdrop-blur-xl border-r border-[#00f0ff]/20 z-30 flex flex-col pointer-events-auto">
       <div className="p-4 border-b border-[#00f0ff]/20 bg-gradient-to-b from-black/80 to-transparent">
          <h1 className="text-xl font-black text-white tracking-widest drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">JETSTREAM <span className="text-[#00f0ff]">DISPATCH</span></h1>
          <p className="text-xs font-mono text-zinc-400 mt-1">CAPITAL: <span className="text-green-400">{fmt(playerCash)}</span></p>
       </div>

       <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {fleet.map((jet, i) => (
             <button
               key={jet.id}
               onClick={() => { setSelectedAircraftId(jet.id); setShopOpen(false); }}
               className={`text-left p-3 rounded border transition-all ${
                 selectedAircraftId === jet.id && !shopOpen ? 'bg-[#00f0ff]/10 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/30'
               }`}
             >
                <div className="flex justify-between items-center mb-1">
                   <h3 className="font-bold text-white text-sm">{jet.tailNumber}</h3>
                   {jet.flightPhase === 'Hangar' ? <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">PARKED</span> 
                   : <span className="text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded font-mono animate-pulse">{jet.flightPhase.toUpperCase()}</span>}
                </div>
                <p className="text-xs text-[#00f0ff] font-mono">{jet.model}</p>
             </button>
          ))}
          
          <button 
             onClick={() => setShopOpen(!shopOpen)}
             className={`mt-4 p-3 border border-dashed rounded text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all ${shopOpen ? 'bg-white/10 border-white text-white' : 'border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500'}`}
          >
             <Plus size={14}/> ACQUIRE ASSET
          </button>
       </div>

       {shopOpen && (
         <div className="absolute top-0 bottom-0 left-80 w-[400px] bg-black/90 backdrop-blur-3xl border-r border-white/10 overflow-y-auto p-4 z-40">
           <h2 className="text-sm font-black text-white tracking-widest mb-4">AIRCRAFT MARKET</h2>
           <div className="flex flex-col gap-4">
              {SHOP_CATALOG.map((item, i) => (
                 <div key={i} className="bg-white/5 border border-white/10 p-4 rounded flex flex-col gap-3">
                    <h3 className="text-lg font-bold text-white">{item.model}</h3>
                    <div className="flex justify-between font-mono text-xs text-zinc-400">
                       <span className="flex items-center gap-1"><Compass size={12}/> {item.speedKnots} KTS</span>
                       <span className="flex items-center gap-1"><Fuel size={12}/> {item.fuelBurnGPH} GPH</span>
                    </div>
                    <button 
                       disabled={playerCash < item.price}
                       onClick={() => {
                          buyAircraft(item);
                          setShopOpen(false);
                       }}
                       className={`p-2 rounded text-xs font-bold tracking-wider ${playerCash >= item.price ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                    >
                       {playerCash >= item.price ? `PURCHASE - ${fmt(item.price)}` : 'INSUFFICIENT FUNDS'}
                    </button>
                 </div>
              ))}
           </div>
         </div>
       )}
    </div>
  )
}
