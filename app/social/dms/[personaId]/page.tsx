'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { DMThread, DMMessage } from '../../../../types';
import { AI_MODELS } from '../../../../lib/constants';

export default function PersonaDMThread({ params }: { params: Promise<{ personaId: string }> }) {
   const resolvedParams = use(params);
   const router = useRouter();

   const [input, setInput] = useState('');
   const [isTyping, setIsTyping] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   const persona = useLiveQuery(() => db.personas.get(resolvedParams.personaId), [resolvedParams.personaId]);
   const personaState = useLiveQuery(() => db.personaState.where('personaId').equals(resolvedParams.personaId).first(), [resolvedParams.personaId]);
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
      
      await db.dmThreads.update(thread.id, {
         messages: updatedMessages,
         lastMessageAt: playerMsg.sentAt
      });

      setInput('');
      setIsTyping(true);

      // Rate limit check
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const usagePastHour = await db.apiUsage
        .filter(r => r.personaId === persona.id && r.timestamp > oneHourAgo)
        .toArray();

      if (usagePastHour.length >= 30) {
         const rateLimitMsg: DMMessage = {
             id: crypto.randomUUID(),
             from: persona.id,
             content: `${persona.displayName.split(' ')[0]} is traveling and will respond later.`,
             sentAt: new Date().toISOString()
         };
         await db.dmThreads.update(thread.id, {
             messages: [...updatedMessages, rateLimitMsg],
             lastMessageAt: rateLimitMsg.sentAt
         });
         setIsTyping(false);
         return;
      }

      // Fetch AI Response
      try {
          const playerContext = {
             displayName: "Player",
             netWorth: (await db.player.get('player'))?.netWorth || 0
          };
          
          const res = await fetch('/api/ai/haiku', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  personaId: persona.id,
                  playerContext,
                  personaState, // passes IndexedDb contextual tracker explicitly!
                  recentMessages: updatedMessages
              })
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.error("API response error:", res.status, errData);
              throw new Error("Network error");
          }

          const data = await res.json();
          
          let generatedContent = data.content;
          if (!generatedContent) {
              generatedContent = `${persona.displayName.split(' ')[0]} is quiet today...`;
          }

          const aiMsg: DMMessage = {
             id: crypto.randomUUID(),
             from: persona.id,
             content: generatedContent,
             sentAt: new Date().toISOString()
          };

          await db.dmThreads.update(thread.id, {
             messages: [...updatedMessages, aiMsg],
             lastMessageAt: aiMsg.sentAt
          });

          // Telemetry Cost logging
          if (data.usage?.inputTokens && data.usage?.outputTokens) {
             const cost = (data.usage.inputTokens * (1.00 / 1000000)) + (data.usage.outputTokens * (3.00 / 1000000));
             await db.apiUsage.add({
                 id: crypto.randomUUID(),
                 timestamp: new Date().toISOString(),
                 model: AI_MODELS.HAIKU,
                 endpoint: '/api/ai/haiku',
                 inputTokens: data.usage.inputTokens,
                 outputTokens: data.usage.outputTokens,
                 estimatedCostUsd: cost,
                 personaId: persona.id,
                 threadId: thread.id
             });
          }

      } catch (err) {
          console.error("Failed handling DM:", err);
          const failureMsg: DMMessage = {
             id: crypto.randomUUID(),
             from: persona.id,
             content: `${persona.displayName.split(' ')[0]} is traveling and will respond later.`,
             sentAt: new Date().toISOString()
          };
          await db.dmThreads.update(thread.id, {
             messages: [...updatedMessages, failureMsg],
             lastMessageAt: failureMsg.sentAt
          });
      } finally {
          setIsTyping(false);
      }
   };

   return (
      <div className="absolute inset-0 z-50 bg-[#0a0a0c] flex flex-col text-white">
         <div className="h-20 bg-[#141419] border-b border-white/10 flex items-center px-6 gap-4 flex-shrink-0 pt-6">
            <button onClick={() => router.push('/social/dms')} className="text-zinc-500 hover:text-white transition-colors">
               <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden relative">
                  {persona.imageUrl ? (
                     <div className="absolute inset-0 bg-cover bg-center grayscale" style={{ backgroundImage: `url(${persona.imageUrl})` }} />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center font-mono text-[10px] font-bold tracking-tighter text-zinc-500 uppercase bg-zinc-900">
                         {persona.displayName.split(' ').map((n: string) => n[0]).join('')}
                     </div>
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
            {isTyping && (
               <div className="bg-white/10 border border-white/5 text-zinc-300 self-start rounded-tl-sm max-w-[75%] rounded-xl p-4 font-mono text-sm opacity-50 animate-pulse">
                  . . .
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
                  disabled={!input.trim() || isTyping}
                  className="bg-[#f5a7a7] text-black px-6 py-3 rounded font-bold transition-opacity hover:opacity-80 disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-2"
               >
                  <Send size={16} />
               </button>
            </form>
         </div>
      </div>
   );
}
