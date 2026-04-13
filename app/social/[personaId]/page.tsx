'use client';

import React, { use } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, MapPin, Plane, Award, Heart, Briefcase, Glasses, Activity, Compass } from 'lucide-react';

export default function PersonaDossier({ params }: { params: Promise<{ personaId: string }> }) {
   const resolvedParams = use(params);
   const router = useRouter();

   const persona = useLiveQuery(() => db.personas.get(resolvedParams.personaId), [resolvedParams.personaId]);
   const state = useLiveQuery(() => db.personaState.where('personaId').equals(resolvedParams.personaId).first(), [resolvedParams.personaId]);

   if (persona === undefined) return null;
   if (persona === null) {
      return (
         <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 flex items-center justify-center">
            <div className="text-zinc-500 font-mono tracking-widest">PERSONA NOT FOUND</div>
         </div>
      );
   }

   return (
      <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-6 md:px-10 pb-10 overflow-y-auto text-white">
         <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-20">
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
               <button onClick={() => router.push('/social')} className="text-zinc-500 hover:text-white transition-colors">
                  <ArrowLeft size={20} />
               </button>
               <div>
                  <h1 className="text-3xl font-black tracking-widest uppercase">{persona.displayName}</h1>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold tracking-widest">
                     ID: {persona.id}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Avatar & Exec Info */}
               <div className="col-span-1 border border-white/10 bg-[#141419] rounded-xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="aspect-[4/5] bg-black relative">
                     {persona.portraitUrl ? (
                         <div className="absolute inset-0 bg-cover bg-center opacity-70 grayscale hover:grayscale-0 transition-all duration-700" style={{ backgroundImage: `url(${persona.portraitUrl})` }} />
                     ) : (
                         <div className="absolute inset-0 flex items-center justify-center text-zinc-800"><p>?</p></div>
                     )}
                     <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                        <div className="text-white text-xl font-black font-mono shadow-sm tracking-widest uppercase">${persona.netWorth.toFixed(1)}B NW</div>
                     </div>
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                     <button 
                        onClick={() => router.push(`/social/dms/${persona.id}`)}
                        className="w-full bg-[#f5a7a7]/10 hover:bg-[#f5a7a7]/20 text-[#f5a7a7] border border-[#f5a7a7]/30 py-3 rounded font-bold tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                     >
                        <MessageCircle size={14} /> SEND DIRECT MESSAGE
                     </button>
                     <button 
                        onClick={() => router.push(`/flight/new?passenger=${persona.id}`)}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded font-bold tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                     >
                        <Plane size={14} /> INVITE AS PASSENGER
                     </button>
                  </div>
               </div>

               {/* Extensive Detail Rows */}
               <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
                  
                  <div className="bg-[#141419] border border-white/10 rounded-xl p-6">
                     <h2 className="text-xs font-mono text-[#f5a7a7] tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14}/> DOSSIER BACKGROUND</h2>
                     <p className="text-zinc-300 font-serif leading-relaxed text-sm">{persona.bio}</p>
                     
                     <div className="grid grid-cols-2 gap-4 mt-6">
                        <div>
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Age & Region</div>
                           <div className="text-sm font-mono text-white">{persona.age} • {persona.nationality}</div>
                        </div>
                        <div>
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Current Sector</div>
                           <div className="text-sm font-mono text-white capitalize">{persona.archetype.replace(/_/g, ' ')}</div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#141419] border border-white/10 rounded-xl p-6">
                     <h2 className="text-xs font-mono text-[#f5a7a7] tracking-widest mb-4 flex items-center gap-2"><Activity size={14}/> LIVE TELEMETRY</h2>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 border border-white/5 p-3 rounded">
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1 flex items-center gap-1"><MapPin size={10}/> Location</div>
                           <div className="text-sm font-mono text-white break-words">{state?.currentCoords?.name || state?.currentLocationICAO || 'Unknown'}</div>
                        </div>
                        <div className="bg-black/30 border border-white/5 p-3 rounded">
                           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1 flex items-center gap-1"><Compass size={10}/> Disposition</div>
                           <div className="text-sm font-mono text-white uppercase">{state?.mood || 'Neutral'}</div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#141419] border border-white/10 rounded-xl p-6">
                     <h2 className="text-xs font-mono text-[#f5a7a7] tracking-widest mb-4 flex items-center gap-2"><Award size={14}/> TASTES & FLEET</h2>
                     
                     <div className="mb-4">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">Interests</div>
                        <div className="flex flex-wrap gap-2">
                           {persona.interests.map(i => (
                              <span key={i} className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono uppercase border border-zinc-700">{i}</span>
                           ))}
                        </div>
                     </div>

                     <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-2">Registered Assets (Aviation)</div>
                        <div className="flex flex-col gap-2">
                           {persona.fleet.map(craft => (
                              <div key={craft.tailNumber} className="flex justify-between items-center bg-black/40 px-3 py-2 border border-white/5 rounded text-xs font-mono">
                                 <span className="text-[#00f0ff]">{craft.tailNumber}</span>
                                 <span className="text-zinc-500 text-[10px]">{craft.modelId.toUpperCase()}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

               </div>
            </div>
         </div>
      </div>
   );
}
