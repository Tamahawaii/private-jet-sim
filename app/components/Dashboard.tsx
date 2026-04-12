'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { Plane, Navigation, Globe, Building2, Wind, Droplets, MapPin } from 'lucide-react';
import VirtualAttendant from './VirtualAttendant';

export default function Dashboard() {
  const { fleet, setActiveView } = useStore();

  const totalValue = fleet.reduce((acc, jet) => acc + (jet.model.includes('BBJ') || jet.model.includes('ACJ') ? 120000000 : jet.model.includes('Citation') || jet.model.includes('Praetor') ? 20000000 : 65000000), 0);
  const activeFlights = fleet.filter(j => j.flightPhase !== 'Hangar' && j.flightPhase !== 'Pre-flight');
  const airborne = fleet.filter(j => j.flightPhase === 'Cruise');

  return (
    <div className="absolute inset-x-0 top-16 bottom-0 z-20 flex flex-col md:flex-row items-center justify-center p-4 gap-4 overflow-y-auto">
      
      {/* Symmetrical 2x2 Game Menu Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-4xl h-fit mt-10 md:mt-0">

         {/* 1. Contracts and Routes */}
         <motion.div 
           whileTap={{ scale: 0.95 }}
           onClick={() => setActiveView('Logistics')}
           className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl overflow-hidden shadow-2xl relative cursor-pointer min-h-[160px] md:min-h-[220px] flex flex-col p-4 border border-blue-400 group"
         >
           {/* Notification Badge */}
           <div className="absolute top-2 left-2 bg-[#ff0055] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20 shadow-[0_0_10px_#ff0055]">1</div>
           
           {/* Graphic */}
           <Plane size={150} className="absolute -right-10 -top-10 text-white/10 group-hover:scale-110 transition-transform duration-500" />
           <Plane size={80} className="absolute right-2 top-8 text-white/40 drop-shadow-lg -rotate-45" />

           <div className="mt-auto relative z-10">
             <h2 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-md">Logistics &<br/>Contracts</h2>
             <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] uppercase font-bold text-blue-200 tracking-widest flex items-center gap-1"><MapPin size={10}/> FLEET DEPLOYED: <span className="text-white">{activeFlights.length}</span></span>
             </div>
           </div>
         </motion.div>

         {/* 2. Airplanes and Licenses */}
         <motion.div 
           whileTap={{ scale: 0.95 }}
           onClick={() => setActiveView('Fleet')}
           className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl overflow-hidden shadow-2xl relative cursor-pointer min-h-[160px] md:min-h-[220px] flex flex-col p-4 border border-slate-500 group"
         >
           <div className="absolute top-2 left-2 bg-[#ff0055] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20 shadow-[0_0_10px_#ff0055]">1</div>
           <div className="absolute top-2 left-8 bg-[#d4af37] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg z-20 uppercase tracking-widest">A B C</div>
           
           <Plane size={150} className="absolute -right-10 -top-10 text-white/5 group-hover:scale-110 transition-transform duration-500" />
           
           <div className="mt-auto relative z-10">
             <h2 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-md">My Fleet<br/>& Hangar</h2>
             <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-widest flex items-center gap-1 justify-between">AIRCRAFT: <span className="text-white">{fleet.length} OWNED</span></span>
             </div>
           </div>
         </motion.div>

         {/* 3. Shop */}
         <motion.div 
           whileTap={{ scale: 0.95 }}
           onClick={() => setActiveView('Shop' as any)}
           className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl overflow-hidden shadow-2xl relative cursor-pointer min-h-[160px] md:min-h-[220px] flex flex-col p-4 border border-green-500 group"
         >
            <div className="absolute top-2 left-2 bg-[#ff0055] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20">New</div>
            <h2 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-md mt-auto">Aircraft<br/>Dealer</h2>
            <span className="text-[10px] text-green-200 uppercase mt-2">Purchase new jets and expand operations</span>
         </motion.div>

         {/* 4. Configuration Layout */}
         <motion.div 
           whileTap={{ scale: 0.95 }}
           onClick={() => setActiveView('Configurator')}
           className="bg-gradient-to-br from-[#003366] to-[#001D4A] rounded-xl overflow-hidden shadow-2xl relative cursor-pointer min-h-[160px] md:min-h-[220px] flex flex-col p-4 border border-[#00f0ff]/30 group"
         >
            <h2 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-md mt-auto">Cabin<br/>Configs</h2>
            <span className="text-[8px] text-[#00f0ff] uppercase mt-2 tracking-widest">Review Blueprints</span>
         </motion.div>

      </div>
    </div>
  );
}
