import React, { useState } from 'react';
import { Clock, Zap, CheckCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { db } from '../../lib/db';
import { resolveArrivals } from '../../lib/simulation';
import { detectEventAttendance } from '../lib/events';

interface Props {
  onClose: () => void;
}

export default function TimeSkipModal({ onClose }: Props) {
   const { advanceSimClock } = useStore();
   const [state, setState] = useState<'preview' | 'resolving' | 'summary'>('preview');
   const [skipHours, setSkipHours] = useState(1);
   const [results, setResults] = useState<any[]>([]);

   const handleSkip = async (durationValue: number) => {
      setState('resolving');
      
      const ms = durationValue;
      advanceSimClock(ms);
      
      // Deterministic immediate arrival resolution using store value directly
      const resolvedData = await resolveArrivals();
      await detectEventAttendance();
      setResults(resolvedData || []);
      setState('summary');
   };

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
         <div className="bg-[#141419] border border-[#00f0ff]/30 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(0,240,255,0.1)]">
            
            {state === 'preview' && (
               <div className="flex flex-col gap-6">
                  <div className="text-center">
                     <div className="mx-auto w-16 h-16 bg-[#00f0ff]/10 rounded-full flex items-center justify-center text-[#00f0ff] mb-4 border border-[#00f0ff]/30">
                        <Clock size={32} />
                     </div>
                     <h2 className="text-2xl font-black font-mono tracking-widest text-white uppercase">Time Jump</h2>
                     <p className="text-zinc-400 text-xs font-mono tracking-widest mt-2 uppercase">Fast-forward global simulation clock.</p>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mt-4">
                     <button onClick={() => handleSkip(86400000)} className="bg-black/50 hover:bg-white/10 text-white font-mono text-xs py-3 border border-white/5 rounded transition-colors">1D</button>
                     <button onClick={() => handleSkip(86400000 * 7)} className="bg-black/50 hover:bg-white/10 text-white font-mono text-xs py-3 border border-white/5 rounded transition-colors">1W</button>
                     <button onClick={() => handleSkip(86400000 * 30)} className="bg-black/50 hover:bg-white/10 text-white font-mono text-xs py-3 border border-white/5 rounded transition-colors">1MO</button>
                     <button onClick={() => handleSkip(86400000 * 90)} className="bg-black/50 hover:bg-white/10 text-white font-mono text-xs py-3 border border-white/5 rounded transition-colors">3MO</button>
                     <button onClick={() => handleSkip(86400000 * 365)} className="bg-black/50 hover:bg-white/10 text-white font-mono text-xs py-3 border border-white/5 rounded transition-colors">1Y</button>
                  </div>

                  <div className="flex gap-4 mt-2">
                     <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold font-mono tracking-widest py-3 rounded transition-colors text-xs">CANCEL</button>
                  </div>
               </div>
            )}

            {state === 'resolving' && (
               <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-[#00f0ff] border-t-transparent rounded-full animate-spin mb-6" />
                  <h2 className="text-lg font-black font-mono tracking-widest text-[#00f0ff] animate-pulse">COMPUTING PHYSICS...</h2>
               </div>
            )}

            {state === 'summary' && (
               <div className="flex flex-col gap-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-2 border border-emerald-500/30">
                     <CheckCircle size={32} />
                  </div>
                  <h2 className="text-2xl font-black font-mono tracking-widest text-white">JUMP COMPLETE</h2>
                  <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Simulation advanced {skipHours} hours.</p>
                  
                  {results.length > 0 ? (
                     <div className="bg-black/50 border border-white/5 p-4 rounded-xl text-left font-mono text-xs max-h-48 overflow-y-auto">
                        <div className="text-zinc-500 mb-2">ARRIVALS RESOLVED:</div>
                        <ul className="space-y-2">
                           {results.map((r, idx) => (
                              <li key={idx} className="flex justify-between text-zinc-300">
                                 <span>{r.tailNumber}</span>
                                 <span className="text-[#00f0ff]">{r.destination}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  ) : (
                     <div className="bg-black/50 border border-white/5 p-4 rounded-xl font-mono text-xs tracking-widest text-zinc-600">
                        NO FLIGHTS CONCLUDED DURING JUMP
                     </div>
                  )}

                  <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold font-mono tracking-widest py-3 rounded transition-colors text-xs mt-2">
                     ACKNOWLEDGE
                  </button>
               </div>
            )}
         </div>
      </div>
   );
}
