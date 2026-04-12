'use client';

import React from 'react';
import { useStore } from '../lib/store';
import { SHOP_CATALOG } from '../lib/mockData';
import { Compass, Fuel, DollarSign, Package } from 'lucide-react';

function fmt(n: number) {
    if (n >= 1000000000) return '$' + (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    return '$' + n.toLocaleString();
}

export default function Marketplace() {
  const { buyAircraft, playerCash, setActiveView } = useStore();

  return (
    <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
         
         <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <div>
               <h1 className="text-3xl font-black tracking-widest">ACQUISITIONS MARKET</h1>
               <p className="text-zinc-500 font-mono text-sm mt-1">Purchase new frames to expand operational capacity.</p>
            </div>
            <div className="text-right">
               <span className="block text-xs font-mono text-zinc-500 mb-1 tracking-widest">AVAILABLE CAPITAL</span>
               <span className="text-2xl font-black text-emerald-400 font-mono">{fmt(playerCash)}</span>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {SHOP_CATALOG.map((item, i) => {
               const canAfford = playerCash >= item.price;
               
               return (
                <div key={i} className="flex flex-col md:flex-row bg-[#141419] border border-white/10 rounded-xl overflow-hidden shadow-xl group hover:border-white/30 transition-all">
                   {/* Layout Image */}
                   <div className="w-full md:w-1/3 bg-black border-b md:border-b-0 md:border-r border-white/10 flex items-center justify-center p-4 min-h-[160px]">
                      {item.layoutImage ? (
                         <img src={item.layoutImage} alt={item.model} className="w-full h-full object-contain filter invert opacity-50 group-hover:opacity-100 transition-all" />
                      ) : (
                         <div className="text-zinc-700 text-xs font-mono tracking-widest text-center">NO BLUEPRINT<br/>AVAILABLE</div>
                      )}
                   </div>

                   {/* Specs */}
                   <div className="w-full md:w-2/3 p-6 flex flex-col justify-between gap-4">
                      <div>
                         <h2 className="text-xl font-bold text-white mb-2">{item.model}</h2>
                         <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm text-zinc-400">
                             <div className="flex items-center gap-2"><Compass size={14} className="text-zinc-500"/> {item.speedKnots} KTS</div>
                             <div className="flex items-center gap-2"><Fuel size={14} className="text-zinc-500"/> {item.fuelBurnGPH} GPH</div>
                             <div className="flex items-center gap-2"><DollarSign size={14} className="text-zinc-500"/> ${item.costPerNM}/NM</div>
                             <div className="flex items-center gap-2"><Package size={14} className="text-zinc-500"/> {item.cabinSlots} Modules</div>
                         </div>
                      </div>

                      <div className="flex justify-between items-center mt-2 pt-4 border-t border-white/5">
                         <span className="text-xl font-black font-mono text-white">${item.price.toLocaleString()}</span>
                         <button 
                            disabled={!canAfford}
                            onClick={() => {
                               buyAircraft(item);
                               setActiveView('Fleet');
                            }}
                            className={`px-6 py-2 rounded font-bold tracking-widest text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] ${canAfford ? 'bg-white text-black hover:scale-105' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                         >
                            {canAfford ? 'PURCHASE' : 'INSUFFICIENT FUNDS'}
                         </button>
                      </div>
                   </div>
                </div>
               );
            })}
         </div>

      </div>
    </div>
  )
}
