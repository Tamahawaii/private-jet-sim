'use client';
import { apiFetch } from '../../../../lib/api';

import React, { useState, useEffect, useRef , Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../lib/db';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { PersonaAvatar } from '../../../components/PersonaAvatar';
import { routes } from '../../../../lib/routes';
import { getAirport, placeLine } from '../../../../lib/flight/airports';
import { DMThread, DMMessage } from '../../../../types';
import { AI_MODELS } from '../../../../lib/constants';

function PersonaDMThread() {
   const search = useSearchParams();
   const resolvedParams = { personaId: search.get('id') || '' };
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

   // Opening the thread clears its unread badge
   useEffect(() => {
      if (thread && (thread.unreadCount || 0) > 0) db.dmThreads.update(thread.id, { unreadCount: 0 });
   }, [thread?.id, thread?.unreadCount]);

   const locationLine = personaState ? `In ${placeLine(getAirport(personaState.currentLocationICAO), personaState.currentLocationICAO)}` : '';

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
          
          const res = await apiFetch('/api/ai/haiku', { method: 'POST', body: JSON.stringify({
                  personaId: persona.id,
                  playerContext,
                  personaState, // passes IndexedDb contextual tracker explicitly!
                  persona, // universally passes persona config cleanly bridging client custom + canonical bounds
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
      <div className="absolute inset-0 z-50 bg-[#070b12] flex flex-col text-white" style={{ paddingTop: 'calc(var(--nav-h) + var(--safe-top))' }}>
         <div className="px-3 md:px-6 py-2 flex items-center gap-3 border-b border-white/8 shrink-0">
            <button onClick={() => router.push('/social?tab=chats')} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300"><ArrowLeft size={16} /></button>
            <button onClick={() => router.push(routes.persona(persona.id))} className="flex items-center gap-3 min-w-0 text-left">
               <PersonaAvatar persona={persona} size={40} />
               <div className="min-w-0">
                  <div className="text-[15px] text-white leading-tight truncate">{persona.displayName}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{locationLine}{isTyping ? ' · typing…' : ''}</div>
               </div>
            </button>
         </div>

         <div className="flex-1 overflow-y-auto no-scrollbar px-3 md:px-6 py-4 flex flex-col gap-2" ref={scrollRef}>
            {thread?.messages.length === 0 && (
               <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 opacity-80">
                  <PersonaAvatar persona={persona} size={72} />
                  <div className="font-serif text-[20px] text-white">Say something to {persona.displayName.split(' ')[0]}.</div>
                  <div className="text-[12.5px] text-zinc-500 max-w-xs">{persona.playerDynamic}</div>
               </div>
            )}
            {thread && thread.messages.map((msg, i) => {
               const mine = msg.from === 'player';
               const prev = thread.messages[i - 1];
               const gap = !prev || new Date(msg.sentAt).getTime() - new Date(prev.sentAt).getTime() > 20 * 60 * 1000;
               return (
                  <React.Fragment key={msg.id}>
                     {gap && <div className="text-center text-[10.5px] font-mono text-zinc-600 my-2">{new Date(msg.sentAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</div>}
                     <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine && <PersonaAvatar persona={persona} size={26} className="mb-0.5" />}
                        <div className={`max-w-[78%] px-4 py-2.5 text-[14.5px] leading-relaxed ${mine ? 'bg-[var(--accent)] text-black rounded-2xl rounded-br-md' : 'bg-white/8 text-zinc-100 rounded-2xl rounded-bl-md'}`}>
                           <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                     </div>
                  </React.Fragment>
               );
            })}
            {isTyping && (
               <div className="flex items-end gap-2"><PersonaAvatar persona={persona} size={26} /><div className="bg-white/8 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:120ms]" /><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:240ms]" /></div></div>
            )}
         </div>

         <div className="px-3 md:px-6 pt-2 border-t border-white/8 shrink-0 bg-[#070b12]" style={{ paddingBottom: 'calc(10px + var(--safe-bottom))' }}>
            <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2 items-end">
               <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Text ${persona.displayName.split(' ')[0]}…`}
                  className="flex-1 bg-white/6 border border-white/10 rounded-full h-11 px-4 text-[15px] focus:outline-none focus:border-[var(--accent)]/60 transition-colors"
               />
               <button type="submit" disabled={!input.trim() || isTyping} className="w-11 h-11 rounded-full bg-[var(--accent)] text-black flex items-center justify-center disabled:opacity-30"><Send size={16} /></button>
            </form>
         </div>
      </div>
   );
}

/** Static route: the id comes from the query string, so the reader needs a Suspense boundary. */
export default function Page() {
  return <Suspense fallback={null}><PersonaDMThread /></Suspense>;
}
