'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useRouter } from 'next/navigation';
import { MapPin, MessageCircle, Heart, Star, Compass } from 'lucide-react';

export default function SocialHub() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'CLOSE'>('ALL');
  
  const personas = useLiveQuery(() => db.personas.toArray()) || [];
  const states = useLiveQuery(() => db.personaState.toArray()) || [];
  const threads = useLiveQuery(() => db.dmThreads.toArray()) || [];
  
  // Combine persona + state
  let roster = personas.map(p => {
     const state = states.find(s => s.personaId === p.id);
     return { ...p, state };
  }).filter(Boolean);
  
  if (filter === 'CLOSE') {
     roster = roster.filter(p => threads.some(t => t.personaId === p.id));
  }

  return (
    <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
         <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <div>
               <h1 className="text-3xl font-black tracking-widest uppercase">SOCIAL CIRCLE</h1>
               <div className="flex gap-4 mt-3">
                  <button onClick={() => setFilter('ALL')} className={`text-xs font-mono tracking-widest font-bold pb-2 border-b-2 ${filter === 'ALL' ? 'text-[#f5a7a7] border-[#f5a7a7]' : 'text-zinc-600 border-transparent hover:text-white'}`}>ALL CONTACTS</button>
                  <button onClick={() => setFilter('CLOSE')} className={`text-xs font-mono tracking-widest font-bold pb-2 border-b-2 ${filter === 'CLOSE' ? 'text-[#f5a7a7] border-[#f5a7a7]' : 'text-zinc-600 border-transparent hover:text-white'}`}>INNER CIRCLE</button>
               </div>
            </div>
            <div className="flex gap-2 items-center mb-2">
               <button 
                  onClick={() => router.push('/social/custom/new')}
                  className="bg-[#f5a7a7]/10 hover:bg-[#f5a7a7]/20 border border-[#f5a7a7]/30 text-[#f5a7a7] text-xs px-4 py-2 font-bold tracking-widest transition-colors rounded flex items-center gap-2"
               >
                  <Star size={14} fill="currentColor" /> NEW PERSONA
               </button>
               <button 
                  onClick={() => router.push('/social/dms')}
                  className="bg-white/5 hover:bg-white/10 border border-white/20 text-xs px-4 py-2 font-bold tracking-widest transition-colors rounded flex items-center gap-2"
               >
                  <MessageCircle size={14} /> CHATS
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {roster.map(member => (
               <div key={member.id} onClick={() => router.push(`/social/${member.id}`)} className="group relative bg-[#141419] border border-white/10 rounded-xl overflow-hidden hover:border-[#f5a7a7]/50 transition-all shadow-xl cursor-pointer flex flex-col">
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                     {member.state?.relationshipDepth !== undefined && member.state.relationshipDepth >= 50 && (
                        <span className="text-[10px] bg-[#f5a7a7]/20 text-[#f5a7a7] border border-[#f5a7a7]/30 px-2 py-1 rounded font-mono font-bold flex items-center gap-1">
                           <Heart size={10} className="fill-[#f5a7a7]" /> CLOSE
                        </span>
                     )}
                     <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded font-mono font-bold flex items-center gap-1 opacity-80">
                        {(member.netWorth / 1e9).toFixed(1)}B
                     </span>
                  </div>

                  <div className="w-full aspect-[21/9] bg-gradient-to-b from-zinc-800 to-black relative">
                     {member.imageUrl ? (
                        <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity mix-blend-luminosity" style={{ backgroundImage: `url(${member.imageUrl})` }} />
                     ) : (
                         <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                             <span className="text-4xl font-black font-mono text-zinc-700/50 uppercase tracking-tighter mix-blend-overlay">
                                 {member.displayName.split(' ').map((n: string) => n[0]).join('')}
                             </span>
                         </div>
                     )}
                     <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <h2 className="text-2xl font-black font-mono tracking-widest text-[#f5a7a7] uppercase">{member.displayName}</h2>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                           {member.publicOrientation && (
                              <span className="text-[9px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                                 {member.publicOrientation}
                              </span>
                           )}
                           {member.publicRelationshipStatus && (
                              <span className="text-[9px] bg-[#f5a7a7]/10 text-[#f5a7a7] px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                                 {member.publicRelationshipStatus}
                              </span>
                           )}
                           <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">
                              {member.region}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="p-4 flex flex-col gap-4 flex-1">
                     <p className="text-xs text-zinc-500 italic line-clamp-2">"{member.background}"</p>

                     <div className="grid grid-cols-1 gap-2 mt-auto">
                        <div className="bg-black/40 p-2 rounded border border-white/5 flex items-center gap-3">
                           <MapPin size={14} className="text-[#f5a7a7]" />
                           <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">Current Location</span>
                              <span className="text-xs font-mono text-zinc-300">{member.state?.currentCoords?.name || member.state?.currentLocationICAO || 'Unknown'}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-2 w-full mt-2">
                        <button 
                           onClick={(e) => { e.stopPropagation(); router.push(`/social/${member.id}`); }}
                           className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 rounded font-bold tracking-widest text-[10px] transition-colors"
                        >
                           VIEW DOSSIER
                        </button>
                        <button 
                           onClick={(e) => { e.stopPropagation(); router.push(`/social/dms/${member.id}`); }}
                           className="flex-1 bg-[#f5a7a7]/10 hover:bg-[#f5a7a7]/20 text-[#f5a7a7] border border-[#f5a7a7]/30 py-2 rounded font-bold tracking-widest text-[10px] transition-colors"
                        >
                           MESSAGE
                        </button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
