'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { Plane, Navigation, Globe, Building2, Wind, Droplets } from 'lucide-react';
import VirtualAttendant from './VirtualAttendant';

export default function Dashboard() {
  const { fleet, setActiveView } = useStore();

  const totalValue = fleet.reduce((acc, jet) => acc + (jet.model.includes('BBJ') || jet.model.includes('ACJ') ? 120000000 : jet.model.includes('Citation') || jet.model.includes('Praetor') ? 20000000 : 65000000), 0);
  const activeFlights = fleet.filter(j => j.flightPhase !== 'Hangar' && j.flightPhase !== 'Pre-flight');
  const airborne = fleet.filter(j => j.flightPhase === 'Cruise');

  return (
    <div className="absolute inset-x-0 top-16 bottom-0 z-20 flex flex-col md:flex-row items-center justify-center p-4 gap-4 overflow-y-auto">
      
      {/* 2x3 Grid exactly matching Screenshot 3 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-5xl h-fit">

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
             <h2 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-md">Contracts<br/>and routes</h2>
             <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] uppercase font-bold text-blue-200 tracking-widest flex items-center gap-1"><MapPin size={10}/> ROUTES OPENED: <span className="text-white">12</span></span>
                <span className="text-[10px] uppercase font-bold text-blue-200 tracking-widest flex items-center gap-1"><Globe size={10}/> PILOTS: <span className="text-white">{fleet.length}</span></span>
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
             <h2 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow-md">Airplanes<br/>and licenses</h2>
             <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-widest flex items-center gap-1 justify-between">AIRPLANES: <span className="text-white">{fleet.length}/30</span></span>
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-widest flex items-center gap-1 justify-between">LICENSES: <span className="text-white">6/219</span></span>
             </div>
           </div>
         </motion.div>

         {/* 3. Cabin Configurator / Shop (Top Right) */}
         <div className="flex flex-col gap-3 h-full">
             <motion.div 
               whileTap={{ scale: 0.95 }}
               onClick={() => setActiveView('Configurator')}
               className="bg-gradient-to-br from-[#003366] to-[#001D4A] rounded-xl overflow-hidden shadow-2xl relative cursor-pointer flex-1 flex flex-col p-4 border border-[#00f0ff]/30 group"
             >
                <div className="absolute right-2 top-2 bg-[#ff0055] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-20 uppercase">New</div>
                <h2 className="text-lg font-black text-white drop-shadow-md absolute bottom-4 w-full text-center left-0">Configurator</h2>
             </motion.div>
             
             <motion.div 
               whileTap={{ scale: 0.95 }}
               className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl overflow-hidden shadow-2xl relative cursor-pointer flex-1 flex flex-col p-4 border border-green-500 group"
             >
                <div className="absolute top-2 left-2 bg-[#ff0055] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20">19</div>
                <h2 className="text-2xl font-black text-white drop-shadow-md mt-6">Shop</h2>
                <span className="text-[8px] text-green-200 uppercase mt-auto">Visit regularly to check out new special offers! <strong className="text-white">Duty-free!</strong></span>
             </motion.div>
         </div>

         {/* 4. Special Events */}
         <div className="col-span-2 md:col-span-2 bg-gradient-to-b from-blue-800 to-blue-900 rounded-xl overflow-hidden shadow-2xl relative cursor-pointer flex flex-col justify-end p-4 border border-blue-700 min-h-[120px]">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,240,255,0.2),transparent_50%)]" />
             <h2 className="text-2xl pt-8 font-black text-white drop-shadow-md tracking-widest">SPECIAL EVENTS</h2>
             <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-1 flex gap-2 items-center"><Navigation size={10}/> New events coming soon</span>
         </div>

         {/* 5. Charter Fleet */}
         <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-teal-700 to-teal-900 rounded-xl overflow-hidden shadow-2xl relative cursor-pointer flex flex-col justify-end p-4 border border-teal-600 opacity-80 min-h-[120px]">
             <Plane size={80} className="absolute right-2 top-2 text-white/20 drop-shadow-lg -rotate-12" />
             <h2 className="text-2xl font-black text-white drop-shadow-md">Charter fleet</h2>
             <span className="text-[10px] text-teal-300 font-bold uppercase tracking-widest mt-1">🔒 Reach level 3 to unlock</span>
         </div>

      </div>
    </div>
  );
}
