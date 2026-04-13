'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { useRouter } from 'next/navigation';
import { MessageCircle, ArrowLeft } from 'lucide-react';

export default function DMInbox() {
   const router = useRouter();
   const threads = useLiveQuery(() => db.dmThreads.toArray()) || [];
   const personas = useLiveQuery(() => db.personas.toArray()) || [];

   const enrichThreads = threads.map(t => {
      const persona = personas.find(p => p.id === t.personaId);
      return { ...t, persona };
   }).filter(t => t.persona).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

   return (
      <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
         <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
               <div className="flex items-center gap-4">
                  <button onClick={() => router.push('/social')} className="text-zinc-500 hover:text-white transition-colors">
                     <ArrowLeft size={20} />
                  </button>
                  <h1 className="text-3xl font-black tracking-widest uppercase">ENCRYPTED COMMS</h1>
               </div>
            </div>

            {enrichThreads.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-20 border border-white/5 border-dashed rounded-xl bg-black/20">
                  <MessageCircle size={32} className="text-zinc-600 mb-4" />
                  <p className="font-mono text-zinc-500 text-sm tracking-widest">NO ACTIVE CONVERSATIONS</p>
                  <button onClick={() => router.push('/social')} className="mt-6 text-[#f5a7a7] border border-[#f5a7a7] px-4 py-2 rounded text-xs tracking-widest font-bold">
                     BROWSE DIRECTORY
                  </button>
               </div>
            ) : (
               <div className="flex flex-col gap-2">
                  {enrichThreads.map(t => (
                     <div key={t.id} onClick={() => router.push(`/social/dms/${t.personaId}`)} className="flex items-center gap-4 p-4 bg-[#141419] border border-white/5 hover:border-[#f5a7a7]/30 cursor-pointer rounded-xl transition-all">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 relative">
                           {t.persona?.imageUrl ? (
                              <div className="absolute inset-0 bg-cover bg-center grayscale" style={{ backgroundImage: `url(${t.persona.imageUrl})` }} />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center font-mono text-[10px] font-bold tracking-tighter text-zinc-500 uppercase bg-zinc-900">
                                  {t.persona?.displayName.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                           )}
                           {t.unreadCount > 0 && (
                              <div className="absolute top-0 right-0 w-3 h-3 bg-[#f5a7a7] rounded-full animate-pulse" />
                           )}
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                           <div className="flex justify-between items-end mb-1">
                              <span className="font-black font-mono tracking-widest text-[#f5a7a7] uppercase">{t.persona?.displayName}</span>
                              <span className="text-[10px] font-mono text-zinc-500">{new Date(t.lastMessageAt).toLocaleDateString()}</span>
                           </div>
                           <p className="text-xs text-zinc-400 truncate">
                              {t.messages[t.messages.length - 1]?.content || 'Started conversation'}
                           </p>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
   );
}
