import React, { useState } from 'react';
import { ArrowLeft, User, Users, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { PersonaAvatar } from '../../../components/PersonaAvatar';

interface Props {
  selectedPassengers: string[];
  onChange: (passengers: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Passengers({ selectedPassengers, onChange, onNext, onBack }: Props) {
   const personas = useLiveQuery(() => db.personas.toArray()) || [];

   const togglePersona = (id: string) => {
       let next = [...selectedPassengers];
       if (next.includes(id)) {
           next = next.filter(p => p !== id);
       } else {
           next.push(id);
       }
       if (next.length === 0) next = ['player'];
       onChange(next);
   };

   const setSolo = () => {
       onChange(['player']);
       onNext();
   };

   return (
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
         <div className="flex items-center gap-4 mb-2">
           <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft size={20} />
           </button>
           <h2 className="text-2xl font-black font-mono tracking-widest uppercase">Manifest</h2>
         </div>
         <p className="text-zinc-400 font-mono text-xs tracking-widest mb-8 uppercase">Assign VIPs and passengers to the flight manifest.</p>
         
         <div className="space-y-4">
            <button 
               onClick={setSolo}
               className={`w-full p-6 border rounded-xl flex items-center justify-between transition-all group text-left ${selectedPassengers.length === 1 && selectedPassengers[0] === 'player' ? 'border-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_20px_rgba(0,240,255,0.1)]' : 'border-[#00f0ff]/30 bg-[#00f0ff]/5 hover:bg-[#00f0ff]/10 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]'}`}
            >
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] flex items-center justify-center border border-[#00f0ff]/40">
                     <User size={20} />
                  </div>
                  <div>
                     <div className="text-white font-mono font-bold tracking-widest group-hover:text-[#00f0ff] transition-colors">FLY SOLO</div>
                     <div className="text-zinc-400 text-xs font-sans mt-1">Player acts as sole passenger. Standard costs apply.</div>
                  </div>
               </div>
               <div className="text-[#00f0ff] text-xs font-mono tracking-widest border border-[#00f0ff]/30 px-3 py-1 rounded">
                  {selectedPassengers.length === 1 && selectedPassengers[0] === 'player' ? 'SELECTED' : 'SELECT'}
               </div>
            </button>

            <div className="pt-6 mt-6 border-t border-white/10">
               <h3 className="text-xs font-mono tracking-widest text-[#f5a7a7] mb-4 flex items-center gap-2"><Users size={14}/> SOCIAL CIRCLE DIRECTORY</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personas.map(p => {
                     const isSelected = selectedPassengers.includes(p.id);
                     return (
                     <button
                        key={p.id}
                        onClick={() => togglePersona(p.id)}
                        className={`w-full p-4 border rounded-xl flex items-center justify-between transition-all group text-left ${isSelected ? 'border-[#f5a7a7] bg-[#f5a7a7]/10' : 'border-white/5 bg-black/20 hover:border-[#f5a7a7]/30 hover:bg-[#141419]'}`}
                     >
                        <div className="flex items-center gap-3">
                           <PersonaAvatar persona={p} size={40} className={`border border-white/10 group-hover:border-[#f5a7a7]/50 ${isSelected ? 'border-[#f5a7a7]' : ''}`} />
                           <div className="flex flex-col">
                              <span className="font-bold font-mono tracking-widest text-white group-hover:text-[#f5a7a7] transition-colors uppercase text-sm truncate max-w-[150px]">{p.displayName}</span>
                              <span className="text-[10px] text-zinc-500 font-mono tracking-widest capitalize">{p.archetype.replace(/_/g, ' ')}</span>
                           </div>
                        </div>
                        {isSelected && <Check size={16} className="text-[#f5a7a7]" />}
                     </button>
                  )})}
               </div>
            </div>
            
            <div className="fixed bottom-0 left-0 md:relative md:mt-8 w-full bg-[#0a0a0c] md:bg-transparent border-t border-white/10 md:border-t-0 p-4 md:p-0 flex justify-end z-20">
               <button 
                   onClick={onNext}
                   className="bg-[#00f0ff] text-black px-8 py-3 rounded font-bold transition-opacity hover:opacity-80 font-mono text-sm tracking-widest uppercase flex items-center gap-2"
               >
                   Confirm Manifest <ArrowLeft size={16} className="rotate-180" />
               </button>
            </div>
         </div>
      </div>
   );
}
