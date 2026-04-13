import React from 'react';
import { Flight, Aircraft } from '../../../../types';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ArrivalRecap({ flight, aircraft }: { flight: Flight, aircraft: Aircraft }) {
   const router = useRouter();

   return (
      <div className="w-full bg-black/90 backdrop-blur-3xl border-t border-[#00f0ff]/50 flex flex-col rounded-t-3xl shadow-[0_-20px_40px_rgba(0,240,255,0.2)] p-8 animate-in slide-in-from-bottom-full duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
         <div className="flex items-center justify-center w-16 h-16 bg-[#00f0ff]/20 rounded-full border border-[#00f0ff]/50 text-[#00f0ff] mb-6 mx-auto">
            <CheckCircle size={32} />
         </div>
         
         <h2 className="text-center text-3xl font-black font-mono tracking-widest text-white mb-2 uppercase">Arrival Success</h2>
         <p className="text-center text-zinc-400 text-sm font-mono tracking-widest uppercase mb-8">
            {aircraft.tailNumber} SECURED AT {flight.destinationICAO} HANGAR.
         </p>

         <button 
             onClick={() => router.push('/')}
             className="w-full max-w-sm mx-auto bg-[#00f0ff] text-black font-black font-mono tracking-widest py-4 rounded-xl hover:bg-white transition-colors"
         >
             CONTINUE TO OPERATIONS
         </button>
      </div>
   );
}
