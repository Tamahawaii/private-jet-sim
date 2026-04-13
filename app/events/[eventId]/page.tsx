'use client';
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { getEventNextOccurrence } from '../../lib/events';
import { useStore } from '../../lib/store';
import { ArrowLeft, Calendar, MapPin, Tag, Navigation2 } from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const simNow = useStore(state => state.getNow());

    const rawEvent = useLiveQuery(
        () => db.events.get(resolvedParams.eventId),
        [resolvedParams.eventId]
    );

    if (rawEvent === undefined) return <div className="p-8 text-white font-mono uppercase text-xs tracking-widest bg-[#0a0a0c] h-screen">Checking dossier...</div>;
    if (rawEvent === null) return <div className="p-8 text-white font-mono uppercase text-xs tracking-widest bg-[#0a0a0c] h-screen">Event dossier classified or missing.</div>;

    const event = getEventNextOccurrence(rawEvent, simNow);
    const start = new Date(event.startDate);
    const dateStr = `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })} - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 pointer-events-auto">
            {/* Backdrop Blur overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={() => router.back()} />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-5xl h-full max-h-[85vh] bg-[#0c0c0e] border border-white/10 shadow-2xl rounded-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Left: Imagery Hero */}
                <div className="w-full md:w-2/5 h-64 md:h-full relative shrink-0 bg-zinc-900 flex items-center justify-center">
                    {event.imageUrl ? (
                        <img src={event.imageUrl} className="w-full h-full object-cover" alt={event.name} />
                    ) : (
                         <span className="text-xs font-mono tracking-widest text-[#00f0ff]/50 uppercase">IMAGE PENDING</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0c0c0e] via-black/40 to-transparent" />
                    <button 
                       onClick={() => router.back()}
                       className="absolute top-6 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
                    >
                       <ArrowLeft size={18} />
                    </button>
                    <div className="absolute bottom-6 left-6 font-mono text-[10px] tracking-widest uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded">
                       Tier {event.prestigeTier} Prestige
                    </div>
                </div>

                {/* Right: Dossier Content */}
                <div className="flex-1 p-8 md:p-12 overflow-y-auto flex flex-col custom-scrollbar">
                    <div className="mb-8">
                       <h1 className="text-3xl md:text-5xl font-black font-sans uppercase tracking-tight text-white mb-6 leading-none">
                           {event.name}
                       </h1>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono tracking-widest uppercase text-zinc-400">
                           <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                               <Calendar size={16} className="text-[#00f0ff]" />
                               {dateStr}
                           </div>
                           <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                               <MapPin size={16} className="text-[#00f0ff]" />
                               {event.locationCity}, {event.locationCountry}
                           </div>
                           <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                               <Tag size={16} className="text-[#00f0ff]" />
                               {event.category.replace('_', ' ')}
                           </div>
                           <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                               <Navigation2 size={16} className="text-[#00f0ff]" />
                               {event.locationICAO}
                           </div>
                       </div>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div>
                            <h3 className="text-white text-sm font-bold tracking-widest font-mono uppercase mb-3 text-[#00f0ff]">Dossier</h3>
                            <p className="text-zinc-300 font-sans leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-white text-sm font-bold tracking-widest font-mono uppercase mb-3 text-[#00f0ff]">Logistics</h3>
                                <ul className="space-y-4 text-sm font-sans text-zinc-300">
                                    <li className="flex justify-between border-b border-white/10 pb-2">
                                        <span className="text-zinc-500">Ticket Access</span>
                                        <span>{event.ticketPrice > 0 ? `$${event.ticketPrice.toLocaleString()}` : 'Invite Only'}</span>
                                    </li>
                                    <li className="flex justify-between border-b border-white/10 pb-2">
                                        <span className="text-zinc-500">Minimum Social Capital</span>
                                        <span>{event.prestigeRequired} PRSTG</span>
                                    </li>
                                    <li className="flex justify-between border-b border-white/10 pb-2">
                                        <span className="text-zinc-500">Sartorial Protocol</span>
                                        <span>{event.dressCode}</span>
                                    </li>
                                </ul>
                            </div>
                            
                            <div>
                                <h3 className="text-white text-sm font-bold tracking-widest font-mono uppercase mb-3 text-[#00f0ff]">Expected Network</h3>
                                <div className="flex flex-wrap gap-2">
                                    {event.confirmedAttendees.map(p => (
                                       <span key={p} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono uppercase text-zinc-300 tracking-widest">
                                           {p}
                                       </span>
                                    ))}
                                    {event.confirmedAttendees.length === 0 && <span className="text-zinc-500 font-mono text-xs uppercase">No intelligence available</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between">
                        <button 
                           onClick={() => router.back()}
                           className="px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                        >
                           Decline
                        </button>
                        <Link 
                           href={`/flight/new?destination=${event.locationICAO}&purpose=event:${event.id}`}
                           className="px-8 py-3 font-mono text-xs font-bold uppercase tracking-widest bg-[#00f0ff] text-black hover:bg-white hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2"
                        >
                           <Navigation2 size={16} /> Dispatch Aircraft
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
