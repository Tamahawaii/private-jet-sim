import React from 'react';
import { ArrowLeft, User, Users, Check, MapPin, ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { PersonaAvatar } from '../../../components/PersonaAvatar';
import { Aircraft } from '../../../../types';
import { getAirport, shortCity } from '../../../../lib/flight/airports';

interface Props {
  aircraft: Aircraft;
  selectedPassengers: string[];
  onChange: (passengers: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Passengers({ aircraft, selectedPassengers, onChange, onNext, onBack }: Props) {
   const personas = useLiveQuery(() => db.personas.toArray()) || [];
   const personaStates = useLiveQuery(() => db.personaState.toArray()) || [];

   const togglePersona = (id: string, canBoard: boolean) => {
       if (!canBoard) return;
       let next = [...selectedPassengers];
       if (next.includes(id)) next = next.filter(p => p !== id);
       else next.push(id);
       if (!next.includes('player')) next.unshift('player');
       onChange(next);
   };

   const here = getAirport(aircraft.currentLocationICAO);
   const sorted = [...personas].sort((a, b) => {
      const la = personaStates.find(s => s.personaId === a.id)?.currentLocationICAO === aircraft.currentLocationICAO ? 0 : 1;
      const lb = personaStates.find(s => s.personaId === b.id)?.currentLocationICAO === aircraft.currentLocationICAO ? 0 : 1;
      return la - lb;
   });
   const companions = selectedPassengers.filter(p => p !== 'player');
   const nearby = sorted.filter(p => personaStates.find(s => s.personaId === p.id)?.currentLocationICAO === aircraft.currentLocationICAO).length;

   return (
      <div className="w-full animate-in fade-in slide-in-from-right-4 duration-500 pb-28 md:pb-6">
         <div className="flex items-center gap-3 mb-1">
           <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300"><ArrowLeft size={18} /></button>
           <h2 className="font-serif text-[28px] text-white">Who&apos;s coming?</h2>
         </div>
         <p className="text-[12.5px] text-zinc-400 mb-5 ml-12">{nearby === 0 ? `Nobody in your circle is in ${shortCity(here, aircraft.currentLocationICAO)} right now — fly solo, or invite them later.` : `${nearby} friend${nearby > 1 ? 's' : ''} in ${shortCity(here, aircraft.currentLocationICAO)} can board.`}</p>

         <button
            onClick={() => onChange(['player'])}
            className={`w-full px-4 py-3.5 border rounded-2xl flex items-center justify-between transition-all text-left mb-4 ${companions.length === 0 ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}
         >
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/40"><User size={16} /></div>
               <div>
                  <div className="text-[14px] text-white font-medium">Fly solo</div>
                  <div className="text-[11.5px] text-zinc-500">Just you and the crew.</div>
               </div>
            </div>
            {companions.length === 0 && <Check size={16} className="text-[var(--accent)]" />}
         </button>

         <div className="eyebrow mb-2 flex items-center gap-1.5"><Users size={11} /> Your circle</div>
         <div className="grid grid-cols-1 gap-2">
            {sorted.map(p => {
               const pState = personaStates.find(s => s.personaId === p.id);
               const loc = pState?.currentLocationICAO || 'Unknown';
               const canBoard = loc === aircraft.currentLocationICAO;
               const isSelected = selectedPassengers.includes(p.id);
               const locAirport = getAirport(loc);
               return (
                  <button
                     key={p.id}
                     onClick={() => togglePersona(p.id, canBoard)}
                     disabled={!canBoard}
                     className={`w-full px-3.5 py-2.5 border rounded-2xl flex items-center gap-3 transition-all text-left ${isSelected ? 'border-[var(--rose)]/60 bg-[var(--rose)]/10' : (!canBoard ? 'border-white/5 bg-black/20 opacity-50 cursor-not-allowed' : 'border-white/8 bg-white/[0.03] hover:border-[var(--rose)]/40 hover:bg-white/[0.06]')}`}
                  >
                     <PersonaAvatar persona={p} size={38} className={`border shrink-0 ${isSelected ? 'border-[var(--rose)]' : 'border-white/10'} ${!canBoard ? 'grayscale' : ''}`} />
                     <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-[14px] truncate ${isSelected ? 'text-[var(--rose)]' : 'text-white'}`}>{p.displayName}</span>
                        <span className="text-[11px] text-zinc-500 truncate flex items-center gap-1"><MapPin size={10} /> {canBoard ? 'Here — can board' : `In ${shortCity(locAirport, loc)}`}</span>
                     </div>
                     {isSelected && <Check size={16} className="text-[var(--rose)] shrink-0" />}
                  </button>
               );
            })}
         </div>

         <div className="fixed md:sticky bottom-0 left-0 right-0 md:mt-6 p-4 md:p-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/90 to-transparent md:bg-none md:from-transparent" style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
            <button onClick={onNext} className="w-full md:w-auto md:ml-auto h-12 md:px-6 rounded-xl bg-[var(--accent)] text-black font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-white transition-colors">
                {companions.length === 0 ? 'Continue solo' : `Continue with ${companions.length}`} <ArrowRight size={15} />
            </button>
         </div>
      </div>
   );
}
