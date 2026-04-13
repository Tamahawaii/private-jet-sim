'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from './lib/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { getEventNextOccurrence } from './lib/events';
import { Calendar, MapPin, X, Navigation2 } from 'lucide-react';
import Link from 'next/link';
import { BillionaireEvent } from '../types';

export default function Home() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [simNow] = useState(() => useStore.getState().getNow());

  const rawEvents = useLiveQuery(() => db.events.toArray()) || [];
  const personas = useLiveQuery(() => db.personas.toArray()) || [];
  
  const upcoming = React.useMemo(() => {
     if (rawEvents.length === 0) return [];
     const shifted = rawEvents.map(e => getEventNextOccurrence(e, simNow));
     // Sift future events this year from now until future
     const future = shifted.filter(e => new Date(e.startDate).getTime() > simNow);
     return future.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 3);
  }, [rawEvents, simNow]);

  if (isDismissed || upcoming.length === 0) return null;

  return (
    <div className="absolute top-24 left-6 z-40 w-80 max-h-[80vh] flex flex-col pointer-events-auto bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div>
               <h2 className="text-xs font-black font-sans uppercase tracking-widest text-white">This Week In The World</h2>
               <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase">Global Executive Matrix</p>
            </div>
            <button 
               onClick={() => setIsDismissed(true)}
               className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
               <X size={14} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {upcoming.map((evt: BillionaireEvent) => {
                const start = new Date(evt.startDate);
                const isSameMonth = start.getUTCMonth() === new Date(evt.endDate).getUTCMonth();
                const dateStr = isSameMonth
                  ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${new Date(evt.endDate).toLocaleDateString('en-US', { day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
                  : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${new Date(evt.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

                return (
                    <div key={evt.id} className="block group">
                        <div className="h-24 bg-zinc-900 rounded-lg overflow-hidden relative mb-3 flex items-center justify-center">
                            {evt.imageUrl ? (
                                <img src={evt.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 absolute inset-0" alt={evt.name} />
                            ) : (
                                <span className="text-[8px] font-mono tracking-widest text-[#00f0ff]/50 uppercase z-10 relative">IMAGE PENDING</span>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                            <div className="absolute bottom-2 left-2 right-2">
                                <h3 className="text-white font-sans font-black text-sm leading-tight group-hover:text-[#00f0ff] transition-colors">{evt.name}</h3>
                            </div>
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono tracking-widest text-[#d4af37] border border-[#d4af37]/30 uppercase">
                                Tier {evt.prestigeTier}
                            </div>
                        </div>

                        {evt.confirmedAttendees && evt.confirmedAttendees.length > 0 && personas.length > 0 && (
                            <div className="flex items-center gap-2 mb-3 bg-[#f5a7a7]/10 border border-[#f5a7a7]/20 rounded p-2">
                                <div className="flex -space-x-2">
                                    {evt.confirmedAttendees.slice(0, 3).map((id, i) => {
                                        const p = personas.find(x => x.id === id);
                                        return p ? (
                                            <div key={i} className="w-5 h-5 rounded-full bg-[#f5a7a7] border border-black flex items-center justify-center font-mono text-[6px] font-black text-black">
                                                {p.displayName.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <span className="text-[9px] font-mono text-[#f5a7a7] uppercase tracking-widest leading-tight">
                                    {(() => {
                                        const firstNames = evt.confirmedAttendees.slice(0, 2).map((id) => personas.find(x => x.id === id)?.displayName.split(' ')[0] || id).filter(Boolean);
                                        const remainder = Math.max(0, evt.confirmedAttendees.length - 2);
                                        const namesStr = firstNames.join(', ');
                                        if (remainder > 0) return `${namesStr} & ${remainder} ${remainder === 1 ? 'other' : 'others'} attending`;
                                        return `${namesStr.replace(', ', ' & ')} attending`;
                                    })()}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-widest mb-1.5">
                            <Calendar size={12} className="text-[#00f0ff]"/> {dateStr}
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-widest mb-3">
                            <MapPin size={12} className="text-[#00f0ff]"/> {evt.locationCity} ({evt.locationICAO})
                        </div>

                        <div className="flex items-center gap-2">
                            <Link href={`/events/${evt.id}`} className="flex-1 text-center py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-colors">
                                DOSSIER
                            </Link>
                            <Link href={`/flight/new?destination=${evt.locationICAO}&purpose=event:${evt.id}`} className="flex-1 text-center py-2 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/20 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5">
                                <Navigation2 size={12}/> FLY THERE
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="p-4 border-t border-white/10 bg-black">
            <Link href="/destinations" className="block w-full py-2 bg-white text-black text-center font-mono text-[10px] font-bold uppercase tracking-widest rounded hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all">
                VIEW GLOBAL CALENDAR
            </Link>
        </div>
    </div>
  );
}
