'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { SHOP_CATALOG } from '../lib/mockData';
import { ShoppingCart, Compass, Fuel, DollarSign, X } from 'lucide-react';

export default function Shop() {
  const { playerCash, buyAircraft, setActiveView } = useStore();

  return (
      <div className="absolute inset-0 top-16 z-20 flex flex-col p-4 md:p-8 bg-[#0a0a0c]/95 overflow-y-auto w-full backdrop-blur-xl">
         <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full">
            <h1 className="text-3xl md:text-5xl font-black text-white px-2 tracking-tighter drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">AIRCRAFT DEALER</h1>
            <button 
              onClick={() => setActiveView('Dashboard')}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full border border-white/20 transition-all text-white"
            >
              <X size={24} />
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full pb-32">
            {SHOP_CATALOG.map((jet, i) => {
               const canAfford = playerCash >= jet.price;
               
               return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-zinc-900 border border-zinc-700/50 rounded-2xl overflow-hidden flex flex-col shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:border-[#00f0ff]/50 transition-colors group"
                  >
                     <div className="h-48 bg-gradient-to-br from-zinc-800 to-black relative flex items-center justify-center overflow-hidden">
                        {jet.layoutImage ? (
                          <img src={jet.layoutImage} alt={jet.model} className="object-contain h-full w-full opacity-60 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                        ) : (
                          <div className="text-zinc-600 font-mono text-sm tracking-widest uppercase">No Blueprint Data</div>  
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
                     </div>
                     <div className="p-5 flex flex-col flex-1">
                        <h3 className="text-2xl font-black text-white mb-4 drop-shadow">{jet.model}</h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                           <div className="bg-black/50 p-2 rounded border border-white/5 flex flex-col">
                              <span className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1"><Compass size={12}/> Speed</span>
                              <span className="text-sm font-bold text-white font-mono">{jet.speedKnots} <span className="text-xs text-zinc-500">kts</span></span>
                           </div>
                           <div className="bg-black/50 p-2 rounded border border-white/5 flex flex-col">
                              <span className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1"><Fuel size={12}/> Burn</span>
                              <span className="text-sm font-bold text-white font-mono">{jet.fuelBurnGPH} <span className="text-xs text-zinc-500">gph</span></span>
                           </div>
                           <div className="bg-black/50 p-2 rounded border border-white/5 flex flex-col">
                              <span className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1"><DollarSign size={12}/> Cost/NM</span>
                              <span className="text-sm font-bold text-red-400 font-mono">${jet.costPerNM}</span>
                           </div>
                           <div className="bg-black/50 p-2 rounded border border-white/5 flex flex-col">
                              <span className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1"><DollarSign size={12}/> Layout</span>
                              <span className="text-sm font-bold text-[#00f0ff] font-mono">{jet.cabinSlots} <span className="text-[10px]">SLOTS</span></span>
                           </div>
                        </div>
                        
                        <div className="mt-auto flex flex-col gap-2">
                           <div className="flex justify-between items-baseline mb-2">
                             <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Price</span>
                             <span className="text-2xl font-black text-green-400 font-mono">${(jet.price / 1000000).toFixed(1)}M</span>
                           </div>
                           <button 
                             disabled={!canAfford}
                             onClick={() => {
                               buyAircraft(jet);
                               setActiveView('Fleet');
                             }}
                             className={`w-full py-3 rounded uppercase font-bold tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${canAfford ? 'bg-gradient-to-r from-green-600 to-green-500 hover:brightness-110 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                           >
                              <ShoppingCart size={16} />
                              {canAfford ? 'Purchase Aircraft' : 'Insufficient Funds'}
                           </button>
                        </div>
                     </div>
                  </motion.div>
               )
            })}
         </div>
      </div>
  )
}
