'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { DMThread, DMMessage } from '../../../../types';

export default function PersonaDMThread({ params }: { params: Promise<{ personaId: string }> }) {
   const resolvedParams = use(params);
   const router = useRouter();

   const [input, setInput] = useState('');
   const scrollRef = useRef<HTMLDivElement>(null);

   const persona = useLiveQuery(() => db.personas.get(resolvedParams.personaId), [resolvedParams.personaId]);
   const thread = useLiveQuery(() => db.dmThreads.where('personaId').equals(resolvedParams.personaId).first(), [resolvedParams.personaId]);

   // Auto-create thread if doesn't exist
   useEffect(() => {
      if (persona && thread === undefined) {
         db.dmThreads.add({
            id: crypto.randomUUID(),
            personaId: persona.id,
            messages: [],
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0
         });
      }
   }, [persona, thread]);

   useEffect(() => {
      if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
   }, [thread?.messages]);

   if (persona === undefined) return null;
   if (persona === null) {
      return <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 flex items-center justify-center text-white">PERSONA NOT FOUND</div>;
   }

   const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !thread) return;

      const playerMsg: DMMessage = {
         id: crypto.randomUUID(),
         from: 'player',
         content: input.trim(),
         sentAt: new Date().toISOString()
      };

      const updatedMessages = [...thread.messages, playerMsg];
      
      // Auto-stub AI placeholder for Milestone A
      const stubAIsg: DMMessage = {
         id: crypto.randomUUID(),
         from: persona.id,
         content: "AI coming soon...",
         sentAt: new Date(Date.now() + 1000).toISOString() // 1 sec delay illusion
      };
      
      updatedMessages.push(stubAIsg);

      await db.dmThreads.update(thread.id, {
         messages: updatedMessages,
         lastMessageAt: stubAIsg.sentAt
      });

      setInput('');
   };

   return (
      <div className="absolute inset-0 z-50 bg-[#0a0a0c] flex flex-col text-white">
         <div className="h-20 bg-[#141419] border-b border-white/10 flex items-center px-6 gap-4 flex-shrink-0 pt-6">
            <button onClick={() => router.push('/social/dms')} className="text-zinc-500 hover:text-white transition-colors">
               <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden relative">
                  {persona.portraitUrl && (
                     <div className="absolute inset-0 bg-cover bg-center grayscale" style={{ backgroundImage: `url(${persona.portraitUrl})` }} />
                  )}
               </div>
               <div className="flex flex-col">
                  <span className="font-black font-mono tracking-widest text-[#f5a7a7] uppercase text-sm">{persona.displayName}</span>
                  <span className="text-[10px] font-mono text-zinc-500">ENCRYPTED TUNNEL</span>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col gap-4" ref={scrollRef}>
            {thread && thread.messages.map((msg) => {
               const isPlayer = msg.from === 'player';
               return (
                  <div key={msg.id} className={`max-w-[75%] rounded-xl p-4 font-mono text-sm ${isPlayer ? 'bg-[#f5a7a7]/20 border border-[#f5a7a7]/30 text-[#f5a7a7] self-end rounded-tr-sm' : 'bg-white/10 border border-white/5 text-zinc-300 self-start rounded-tl-sm'}`}>
                     <p className="whitespace-pre-wrap">{msg.content}</p>
                     <span className="text-[9px] opacity-40 mt-2 block w-full text-right">
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                  </div>
               );
            })}
            {thread?.messages.length === 0 && (
               <div className="flex-1 flex items-center justify-center">
                  <div className="text-center font-mono opacity-50 tracking-widest">
                     <p className="text-xs mb-2">END TO END ENCRYPTED</p>
                     <p className="text-[10px]">No messages retained prior to this secure handshake.</p>
                  </div>
               </div>
            )}
         </div>

         <div className="p-4 bg-[#141419] border-t border-white/10 flex-shrink-0 pb-10">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
               <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Initiate transmission..."
                  className="flex-1 bg-black/50 border border-white/10 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#f5a7a7]/50 transition-colors"
               />
               <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-[#f5a7a7] text-black px-6 py-3 rounded font-bold transition-opacity hover:opacity-80 disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-2"
               >
                  <Send size={16} />
               </button>
            </form>
         </div>
      </div>
   );
}
