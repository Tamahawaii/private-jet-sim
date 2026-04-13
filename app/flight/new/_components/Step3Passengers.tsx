import { ArrowLeft, User, Users } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Passengers({ onNext, onBack }: Props) {
   const personas = useLiveQuery(() => db.personas.toArray()) || [];

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
               onClick={onNext}
               className="w-full p-6 border border-[#00f0ff]/30 bg-[#00f0ff]/5 rounded-xl flex items-center justify-between hover:bg-[#00f0ff]/10 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all group text-left"
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
                  SELECT
               </div>
            </button>

            <div className="pt-6 mt-6 border-t border-white/10">
               <h3 className="text-xs font-mono tracking-widest text-[#f5a7a7] mb-4 flex items-center gap-2"><Users size={14}/> SOCIAL CIRCLE DIRECTORY</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personas.map(p => (
                     <button
                        key={p.id}
                        onClick={onNext}
                        className="w-full p-4 border border-white/5 bg-black/20 rounded-xl flex items-center justify-between hover:border-[#f5a7a7]/30 hover:bg-[#141419] transition-all group text-left"
                     >
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden relative border border-white/10 group-hover:border-[#f5a7a7]/50 transition-colors">
                              {p.portraitUrl ? (
                                 <div className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 transition-all" style={{ backgroundImage: `url(${p.portraitUrl})` }} />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center font-mono text-[10px] font-bold tracking-tighter text-zinc-500 uppercase bg-zinc-900">
                                     {p.displayName.split(' ').map((n: string) => n[0]).join('')}
                                 </div>
                              )}
                           </div>
                           <div className="flex flex-col">
                              <span className="font-bold font-mono tracking-widest text-white group-hover:text-[#f5a7a7] transition-colors uppercase text-sm truncate max-w-[150px]">{p.displayName}</span>
                              <span className="text-[10px] text-zinc-500 font-mono tracking-widest capitalize">{p.archetype.replace(/_/g, ' ')}</span>
                           </div>
                        </div>
                     </button>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}
