'use client';

import React, { useState } from 'react';
import { db } from '../../../lib/db';
import { applyDelta } from '../../../lib/relationships/affinity';
import { GiftItem, GiftCategory } from '../../../types';
import { X, Gift } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const CATEGORIES: GiftCategory[] = ['jewelry', 'art', 'wine-spirits', 'fashion', 'experience', 'travel', 'flowers', 'literature', 'tech', 'commission', 'symbolic'];

export function GiftModal({ personaId, personaName, onClose, onGiftSent }: { personaId: string, personaName: string, onClose: () => void, onGiftSent: () => void }) {
  const [activeCategory, setActiveCategory] = useState<GiftCategory>('art');
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [personalNote, setPersonalNote] = useState('');
  
  const allGifts = useLiveQuery(() => db.giftItems.toArray()) || [];
  const player = useLiveQuery(() => db.player.get('player'));
  
  const categoryGifts = allGifts.filter(g => g.category === activeCategory);

  const handleSend = async () => {
    if (!selectedGift || !player) return;
    if (player.netWorth < selectedGift.basePrice) {
       alert("Insufficient funds.");
       return;
    }

    const giftSentId = crypto.randomUUID();

    // Atomic TX bounds
    await db.transaction('rw', [db.player, db.giftsSent, db.relationships, db.relationshipEvents, db.transactions], async () => {
      // 1. Deduct funds
      const updatedPlayer = { ...player, netWorth: player.netWorth - selectedGift.basePrice };
      await db.player.put(updatedPlayer);

      // 2. Ledger transaction entry
      await db.transactions.add({
         id: crypto.randomUUID(),
         occurredAt: new Date().toISOString(),
         type: 'gift',
         amount: selectedGift.basePrice,
         description: `Gift to ${personaName}: ${selectedGift.name}`,
         relatedEntityId: selectedGift.id
      });

      // 3. Affinity metrics tracking
      const [participantA, participantB] = ['player', personaId].sort();
      const relId = `${participantA}__${participantB}`;
      const rel = await db.relationships.get(relId);
      
      if (rel) {
         rel.metrics = applyDelta(rel.metrics, selectedGift.affinityImpact);
         rel.lastInteractionAt = new Date().toISOString();
         await db.relationships.put(rel);

         await db.relationshipEvents.put({
            id: crypto.randomUUID(),
            relationshipId: relId,
            type: 'gift-sent',
            at: new Date().toISOString(),
            description: `Sent gift: ${selectedGift.name}`,
            metricsDelta: selectedGift.affinityImpact,
            contextRefs: { giftId: selectedGift.id }
         });
      }

      // 4. Archive explicitly the sent gift globally
      await db.giftsSent.put({
        id: giftSentId,
        giftItemId: selectedGift.id,
        fromId: 'player',
        toId: personaId,
        personalNote,
        sentAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        metricsApplied: selectedGift.affinityImpact
      });
    });

    onGiftSent();
    onClose();

    // Async decoupled LLM Reaction propagation
    (async () => {
       try {
           const threadMatches = await db.dmThreads.where('personaId').equals(personaId).toArray();
           let thread = threadMatches[0];
           if (!thread) {
               thread = { id: crypto.randomUUID(), personaId, messages: [], lastMessageAt: new Date().toISOString(), unreadCount: 0 };
               await db.dmThreads.add(thread);
           }
           
           const persona = await db.personas.get(personaId);
           const state = await db.personaState.get(personaId);
           const pData = await db.player.get('player');

           const giftContext = {
              giftName: selectedGift.name,
              description: selectedGift.description,
              personalNote
           };

           const res = await fetch('/api/ai/haiku', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                 personaId,
                 playerContext: { displayName: "Player", netWorth: pData?.netWorth },
                 personaState: state,
                 recentMessages: thread.messages,
                 persona,
                 giftContext
              })
           });

           if (res.ok) {
              const aiData = await res.json();
              
              if (aiData.content) {
                 await db.transaction('rw', [db.dmThreads, db.giftsSent], async () => {
                    const latestThread = await db.dmThreads.get(thread.id);
                    if (latestThread) {
                       const aiMsg = {
                          id: crypto.randomUUID(),
                          from: personaId,
                          content: aiData.content,
                          sentAt: new Date().toISOString()
                       };
                       latestThread.messages.push(aiMsg);
                       latestThread.lastMessageAt = aiMsg.sentAt;
                       await db.dmThreads.put(latestThread);
                    }
                    
                    const sentRec = await db.giftsSent.get(giftSentId);
                    if (sentRec) {
                       sentRec.reactionDM = aiData.content;
                       await db.giftsSent.put(sentRec);
                    }
                 });
              }
           }
       } catch (err) {
           console.error("Failed to generate async AI reaction to gift:", err);
       }
    })();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
       <div className="bg-[#141419] border border-white/10 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/60">
             <div className="flex items-center gap-3">
               <Gift size={20} className="text-[#f5a7a7]" />
               <h2 className="text-sm font-mono text-white tracking-widest uppercase font-bold">GIFTS CATALOG &mdash; {personaName}</h2>
             </div>
             <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Categories */}
            <div className="w-[200px] border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-1 bg-black/40 hidden md:flex">
               {CATEGORIES.map(cat => (
                  <button 
                     key={cat} 
                     onClick={() => { setActiveCategory(cat); setSelectedGift(null); }} 
                     className={`text-left px-4 py-3 rounded text-[10px] font-mono uppercase tracking-widest transition-all
                        ${activeCategory === cat ? 'bg-[#f5a7a7]/20 text-[#f5a7a7] font-bold border border-[#f5a7a7]/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'}`}
                  >
                     {cat}
                  </button>
               ))}
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative scroll-smooth">
               {!selectedGift ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                     {categoryGifts.map(g => {
                        const isPreferred = g.preferredBy?.includes(personaId);
                        return (
                           <div 
                              key={g.id} 
                              onClick={() => setSelectedGift(g)} 
                              className={`cursor-pointer border border-white/5 bg-black/30 hover:bg-black/50 p-5 rounded-xl flex flex-col gap-3 group transition-all duration-300 ${isPreferred ? 'ring-1 ring-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]' : ''}`}
                           >
                              {isPreferred && <span className="bg-yellow-900/40 text-yellow-500 border border-yellow-900/50 text-[9px] px-2 py-0.5 rounded uppercase font-mono tracking-widest w-max mb-1 shadow-sm">Preferred by {personaName}</span>}
                              <div className="font-bold font-serif text-white group-hover:text-[#f5a7a7] transition-colors">{g.name}</div>
                              <div className="text-xs text-zinc-400 leading-relaxed font-serif italic line-clamp-2">{g.description}</div>
                              <div className="text-xs font-mono text-zinc-500 mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                 <span>${g.basePrice.toLocaleString()}</span>
                                 <span className="text-[9px] text-[#f5a7a7] opacity-0 group-hover:opacity-100 transition-opacity">SELECT</span>
                              </div>
                           </div>
                        )
                     })}
                     {categoryGifts.length === 0 && (
                         <div className="col-span-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest py-20">No items available in this category.</div>
                     )}
                  </div>
               ) : (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto align-middle justify-center h-full">
                     <button onClick={() => setSelectedGift(null)} className="text-[10px] font-mono text-zinc-500 hover:text-white flex items-center gap-2 uppercase tracking-widest px-4 py-2 border border-white/10 rounded-full w-max bg-black/20 hover:bg-black/80 transition-colors"><X size={12}/> Swap Item</button>
                     
                     <div className="border border-white/10 bg-black/40 p-8 rounded-xl flex flex-col gap-6 relative shadow-[0_0_50px_rgba(245,167,167,0.05)]">
                        <div className="flex justify-between items-start gap-4">
                           <div className="flex flex-col gap-2">
                              <h3 className="text-2xl font-bold font-serif text-white tracking-wide">{selectedGift.name}</h3>
                              <p className="text-sm text-zinc-400 leading-relaxed max-w-md font-serif italic">{selectedGift.description}</p>
                           </div>
                           <div className="text-xl font-mono text-[#f5a7a7] border border-[#f5a7a7]/30 bg-[#f5a7a7]/10 px-4 py-2 rounded shadow-sm">
                              ${selectedGift.basePrice.toLocaleString()}
                           </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-lg flex flex-col gap-3">
                           <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Projected Relationship Impact</div>
                           <div className="flex flex-wrap gap-4">
                              {selectedGift.affinityImpact.affection ? <span className="text-xs font-mono text-green-400 bg-green-900/20 px-2 py-1 rounded">+{selectedGift.affinityImpact.affection} Affection</span> : null}
                              {selectedGift.affinityImpact.heat ? <span className="text-xs font-mono text-pink-400 bg-pink-900/20 px-2 py-1 rounded">+{selectedGift.affinityImpact.heat} Heat</span> : null}
                              {selectedGift.affinityImpact.trust ? <span className="text-xs font-mono text-blue-400 bg-blue-900/20 px-2 py-1 rounded">+{selectedGift.affinityImpact.trust} Trust</span> : null}
                              {selectedGift.affinityImpact.romanticTension ? <span className="text-xs font-mono text-purple-400 bg-purple-900/20 px-2 py-1 rounded">+{selectedGift.affinityImpact.romanticTension} Romance</span> : null}
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <label className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase ml-1">Personal Note (Optional)</label>
                           <textarea 
                              className="bg-[#0a0a0c] border border-white/10 rounded-lg p-4 text-sm text-white focus:border-[#f5a7a7]/50 focus:outline-none focus:ring-1 focus:ring-[#f5a7a7]/30 transition-all w-full h-24 placeholder:text-zinc-700 resize-none font-serif"
                              placeholder="Include a card with the delivery..."
                              value={personalNote}
                              onChange={e => setPersonalNote(e.target.value)}
                              maxLength={200}
                           />
                           <div className="text-[9px] font-mono text-zinc-600 text-right mr-1">{personalNote.length} / 200</div>
                        </div>

                        <button 
                           onClick={handleSend} 
                           disabled={!player || player.netWorth < selectedGift.basePrice} 
                           className="w-full bg-[#f5a7a7] hover:bg-[#f5a7a7]/90 text-black font-black font-mono tracking-widest uppercase py-5 rounded mt-2 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,167,167,0.4)]"
                        >
                           {player && player.netWorth < selectedGift.basePrice ? "INSUFFICIENT FUNDS" : "CONFIRM TRANSFER & SEND GIFT"}
                        </button>
                     </div>
                  </div>
               )}
            </div>
          </div>
       </div>
    </div>
  );
}
