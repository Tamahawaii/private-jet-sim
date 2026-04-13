import React from 'react';
import { Resort } from '../../../types';
import { MapPin, Navigation2, Star, Tag, BedDouble } from 'lucide-react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { PersonaAvatar } from '../../components/PersonaAvatar';

interface Props {
    resort: Resort;
}

export default function ResortCard({ resort }: Props) {
    const preferences = useLiveQuery(() => 
        db.personas.where('id').anyOf(resort.preferredBy || []).toArray()
    , [resort.preferredBy]) || [];

    // Branded initials
    const initials = resort.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="w-full bg-black/40 border border-white/10 hover:border-[#f5a7a7]/50 hover:bg-[#f5a7a7]/5 transition-all rounded-xl p-4 md:p-6 group flex flex-col md:flex-row gap-6">
            {/* Snapshot Image or Fallback Gradient */}
            <div className="w-full md:w-56 h-36 bg-zinc-900 rounded-lg overflow-hidden shrink-0 relative flex flex-col items-center justify-center">
                {resort.imageUrl ? (
                    <img 
                       src={resort.imageUrl} 
                       alt={resort.name} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                       loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a1f] to-[#0a0a0c] flex items-center justify-center border border-white/5">
                        <span className="text-4xl text-[#f5a7a7]/20 font-serif translate-y-1">{initials}</span>
                    </div>
                )}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono tracking-widest text-[#f5a7a7] uppercase border border-[#f5a7a7]/20 flex items-center gap-1">
                    <Star size={10}/> Tier {resort.tier}
                </div>
                {resort.brand !== "Independent" && (
                    <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur top-auto px-2 py-1 text-[9px] font-mono tracking-widest text-zinc-400 uppercase text-center border-t border-white/10 line-clamp-1">
                        {resort.brand}
                    </div>
                )}
            </div>

            {/* Resort Content */}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                   <h3 className="text-xl font-black font-sans text-white group-hover:text-[#f5a7a7] transition-colors mb-2">
                       {resort.name}
                   </h3>
                   
                   <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-mono text-zinc-400 tracking-widest uppercase mb-4">
                       <div className="flex items-center gap-1.5"><MapPin size={14} />{resort.city}, {resort.country}</div>
                       <div className="flex items-center gap-1.5"><BedDouble size={14} />${resort.nightlyRate}/night</div>
                       <div className="flex items-center gap-1.5"><Tag size={14} />{resort.category.replace(/-/g, ' ')}</div>
                   </div>

                   {/* Preferred By Social Discovery */}
                   {preferences.length > 0 && (
                       <div className="flex items-center gap-2 mt-2">
                           <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-600">Preferred by:</span>
                           <div className="flex -space-x-2">
                               {preferences.map((p, idx) => (
                                   <div key={p.id} className="relative z-[0]" style={{ zIndex: 10 - idx }} title={p.displayName}>
                                       <PersonaAvatar persona={p} size={20} className="border border-[#0c0c0e] ring-1 ring-white/10" />
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}
                </div>

                <div className="flex items-center gap-3 mt-6 md:mt-auto">
                    <Link 
                       href={`/resorts/${resort.id}`}
                       className="px-4 py-2 text-xs font-bold tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors uppercase"
                    >
                       View Dossier
                    </Link>
                    <button 
                       disabled
                       className="px-4 py-2 text-xs font-bold tracking-widest bg-white/5 text-zinc-500 border border-white/5 rounded transition-colors uppercase flex items-center gap-2 cursor-not-allowed"
                       title="Booking engine initializing in Commit D"
                    >
                       <Navigation2 size={14} /> Commit D Pending
                    </button>
                </div>
            </div>
        </div>
    );
}
