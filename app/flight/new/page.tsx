'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, ArrowLeft, Code } from 'lucide-react';

export default function FlightPlannerPlaceholder() {
   const router = useRouter();

   return (
     <div className="absolute inset-0 z-50 bg-[#0a0a0c] pt-24 px-6 md:px-10 pb-10 overflow-y-auto text-white flex flex-col items-center justify-center">
       <div className="w-full max-w-xl text-center border border-white/5 bg-[#141419] p-12 rounded-2xl shadow-2xl">
         <Globe2 className="mx-auto text-[#00f0ff] mb-6 animate-pulse" size={48} />
         
         <h1 className="text-3xl font-black font-mono tracking-widest mb-4">
            FLIGHT PLANNER
         </h1>
         
         <p className="text-zinc-400 font-mono text-sm tracking-widest mb-8 leading-relaxed">
            The Phase 2 active simulation bounds are currently locked.<br/><br/>
            In the upcoming release, you will file complex multi-waypoint flight plans, scan global airports, assign manifests, and dispatch flights to run concurrently across the geopolitical map.
         </p>
         
         <div className="flex gap-4 justify-center">
            <button 
               onClick={() => router.back()} 
               className="bg-white/10 hover:bg-white/20 transition-all font-bold tracking-widest text-sm py-4 px-8 rounded flex items-center gap-2"
            >
               <ArrowLeft size={16} /> RETURN
            </button>
            <button 
               disabled
               className="bg-[#00f0ff]/20 text-[#00f0ff] opacity-50 cursor-not-allowed font-bold tracking-widest text-sm py-4 px-8 rounded flex items-center gap-2"
            >
               <Code size={16} /> PHASE 2 SECURED
            </button>
         </div>
       </div>
     </div>
   );
}
