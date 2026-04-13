'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { SHOP_CATALOG } from '../../lib/mockData';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { Compass, Fuel, DollarSign, Package } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { playerRepo } from '../../../lib/repositories/player';
import { Economy } from '../../../lib/economy';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

export default function Marketplace() {
  const { setSelectedAircraftId } = useStore();
  const player = useLiveQuery(() => playerRepo.get());
  const playerCash = player?.netWorth || 0;
  const router = useRouter();
  
  const [category, setCategory] = useState<'ALL' | 'AIRCRAFT' | 'YACHTS'>('AIRCRAFT');
  const [maxPrice, setMaxPrice] = useState(250000000);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const filteredCatalog = useMemo(() => {
     let c = SHOP_CATALOG.filter(item => {
         if (category === 'YACHTS') return false; // Not in json yet
         return item.price <= maxPrice;
     });
     c.sort((a, b) => sortOrder === 'DESC' ? b.price - a.price : a.price - b.price);
     return c;
  }, [category, maxPrice, sortOrder]);

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
               <span className="text-2xl font-black text-emerald-400 font-mono">${playerCash.toLocaleString()}</span>
            </div>
         <div className="flex flex-col gap-4 bg-[#141419] p-4 rounded-xl border border-white/5">
            <div className="flex gap-4 items-center">
               <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">CATEGORY</span>
               <div className="flex gap-2">
                  {['ALL', 'AIRCRAFT', 'YACHTS'].map(c => (
                     <button key={c} onClick={() => setCategory(c as any)} className={`text-xs px-3 py-1 font-bold rounded ${category === c ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}>{c}</button>
                  ))}
               </div>
            </div>
            
            <div className="flex flex-col gap-2">
               <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                  <span>MAX PRICE: ${(maxPrice/1000000).toFixed(0)}M</span>
                  <span>SORT: <button onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')} className="text-[#00f0ff] underline">{sortOrder === 'DESC' ? 'High to Low' : 'Low to High'}</button></span>
               </div>
               <input 
                  type="range" min="1000000" max="300000000" step="1000000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#00f0ff] h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
               />
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCatalog.map((item, i) => {
               const closingFee = Math.round(item.price * 0.01);
               const totalCost = item.price + closingFee;
               const canAfford = playerCash >= totalCost;
               
               return (
                <div key={i} className="flex flex-col md:flex-row bg-[#141419] border border-white/10 rounded-xl overflow-hidden shadow-xl group hover:border-white/30 transition-all">
                   <div className="w-full md:w-1/3 bg-black border-b md:border-b-0 md:border-r border-white/10 flex items-center justify-center p-4 min-h-[160px]">
                      {item.layoutImage ? (
                         <img src={item.layoutImage} alt={item.model} className="w-full h-full object-contain filter invert opacity-50 group-hover:opacity-100 transition-all" />
                      ) : (
                         <div className="text-zinc-700 text-xs font-mono tracking-widest text-center">NO BLUEPRINT<br/>AVAILABLE</div>
                      )}
                   </div>

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
                         <div className="flex flex-col">
                           <span className="text-xl font-black font-mono text-white">${item.price.toLocaleString()}</span>
                           <span className="text-[10px] text-zinc-500 font-mono">+ ${(closingFee).toLocaleString()} Closing</span>
                         </div>
                         <button 
                            onClick={async () => {
                               const newCraft = await Economy.purchaseAircraft(item);
                               if (newCraft) {
                                  setSelectedAircraftId(newCraft.id);
                                  router.push('/fleet');
                               }
                            }}
                            className={`px-6 py-2 rounded font-bold tracking-widest text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] ${canAfford ? 'bg-white text-black hover:scale-105 cursor-pointer' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
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
