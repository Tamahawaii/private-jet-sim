import React from 'react';
import { BillionaireEvent } from '../../../types';
import { getEventNextOccurrence } from '../../lib/events';
import { Calendar, MapPin, Tag, Navigation2 } from 'lucide-react';
import Link from 'next/link';

interface Props {
    event: BillionaireEvent;
    simNow: number;
}

export default function EventCard({ event, simNow }: Props) {
    const activeEvent = getEventNextOccurrence(event, simNow);
    
    const start = new Date(activeEvent.startDate);
    const end = new Date(activeEvent.endDate);
    
    // Format: e.g. "May 24 - 26, 2026"
    const isSameMonth = start.getUTCMonth() === end.getUTCMonth();
    const dateLine = isSameMonth 
      ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
      : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

    return (
        <div className="w-full bg-black/40 border border-white/10 hover:border-[#00f0ff]/50 hover:bg-white/5 transition-all rounded-xl p-4 md:p-6 group flex flex-col md:flex-row gap-6">
            {/* Event Snapshot Image */}
            <div className="w-full md:w-48 h-32 bg-zinc-900 rounded-lg overflow-hidden shrink-0 relative">
                <img 
                   src={event.imageUrl} 
                   alt={event.name} 
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                   loading="lazy"
                />
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono tracking-widest text-amber-500 uppercase border border-amber-500/20">
                    Tier {event.prestigeTier}
                </div>
            </div>

            {/* Event Content */}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                   <h3 className="text-xl font-black font-sans text-white group-hover:text-[#00f0ff] transition-colors mb-2">
                       {event.name}
                   </h3>
                   
                   <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-400 tracking-widest uppercase mb-4">
                       <div className="flex items-center gap-1.5"><Calendar size={14} />{dateLine}</div>
                       <div className="flex items-center gap-1.5"><MapPin size={14} />{event.locationCity}</div>
                       <div className="flex items-center gap-1.5"><Tag size={14} />{event.category.replace('_', ' ')}</div>
                   </div>
                </div>

                <div className="flex items-center gap-3 mt-auto">
                    <Link 
                       href={`/events/${event.id}`}
                       className="px-4 py-2 text-xs font-bold tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors uppercase"
                    >
                       View Details
                    </Link>
                    <Link 
                       href={`/flight/new?destination=${event.locationICAO}&purpose=event:${event.id}`}
                       className="px-4 py-2 text-xs font-bold tracking-widest bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20 border border-[#00f0ff]/20 rounded transition-colors uppercase flex items-center gap-2"
                    >
                       <Navigation2 size={14} /> Fly There
                    </Link>
                </div>
            </div>
        </div>
    );
}
