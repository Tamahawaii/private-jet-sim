'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { Activity, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VirtualAttendant() {
  const { fleet, activeView } = useStore();
  const airborne = fleet.filter(j => j.flightPhase === 'Cruise');
  
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'ai' | 'user'}[]>([
    { id: 1, text: "Good evening. I am monitoring global airspace. Your fleet is secured.", sender: 'ai' }
  ]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    // Contextual proactive banter!
    if (airborne.length > 0) {
      setTimeout(() => {
         triggerAIResponse(`Sir, tracking ${airborne.length} asset(s) currently traversing oceanic airspace. Telemetry is green.`);
      }, 3000);
    }
  }, [airborne.length]);

  const triggerAIResponse = (text: string) => {
     setTyping(true);
     setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now(), text, sender: 'ai' }]);
        setTyping(false);
     }, 1500);
  };

  const handleCommand = (cmd: string) => {
     setMessages(prev => [...prev, { id: Date.now(), text: cmd, sender: 'user' }]);
     
     if (cmd.includes('weather')) triggerAIResponse("I show localized turbulence inbound for the North Atlantic track. I'll advise crews to ascend to FL 430.");
     else if (cmd.includes('cost')) triggerAIResponse(`The operating costs on jumbo assets like the BBJ are currently hovering at $45 per NM. Highly expensive, sir.`);
     else triggerAIResponse("Copy that. Updating the flight manifests now.");
  };

  return (
    <div className="w-[320px] shrink-0 flex flex-col gap-4 relative z-50">
      
      {/* V-CARD Profile */}
      <div className="glass-panel p-4 rounded-2xl border border-[var(--color-cyan)]/30 shadow-[0_0_20px_rgba(0,240,255,0.1)] flex items-center gap-4">
         <div className="relative">
           <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#00f0ff] p-0.5">
             <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#00f0ff] to-blue-600 flex items-center justify-center">
               <Activity size={24} className="text-white" />
             </div>
           </div>
           <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
         </div>
         <div>
            <div className="text-sm font-bold tracking-widest text-white">VALERIE</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#00f0ff]">Lead Dispatcher</div>
         </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden relative">
         <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 scrollbar-hide">
            <AnimatePresence>
              {messages.map(m => (
                 <motion.div 
                   key={m.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${m.sender === 'ai' ? 'bg-white/5 text-white/80 self-start rounded-tl-sm' : 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 self-end rounded-tr-sm'}`}
                 >
                    {m.text}
                 </motion.div>
              ))}
              {typing && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 text-white/50 self-start p-3 rounded-2xl text-[10px] tracking-widest uppercase rounded-tl-sm flex gap-1">
                    <span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span>
                 </motion.div>
              )}
            </AnimatePresence>
         </div>

         {/* Prompts */}
         <div className="p-3 border-t border-white/5 bg-black/40 flex flex-wrap gap-2">
            <button onClick={() => handleCommand('Check weather en route.')} className="text-[10px] uppercase font-bold tracking-widest bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-white/60 transition-colors">Weather</button>
            <button onClick={() => handleCommand('Analyze fleet cost.')} className="text-[10px] uppercase font-bold tracking-widest bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-white/60 transition-colors">Cost</button>
            <button onClick={() => handleCommand('Stand by.')} className="text-[10px] uppercase font-bold tracking-widest bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-white/60 transition-colors">Stand by</button>
         </div>
      </div>

    </div>
  );
}
