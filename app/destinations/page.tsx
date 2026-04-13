'use client';
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { getEventNextOccurrence } from '../lib/events';
import { useStore } from '../lib/store';
import EventCard from './_components/EventCard';
import { Globe, GlassWater, Building2 } from 'lucide-react';

export default function DestinationsPage() {
    const [activeTab, setActiveTab] = useState<'events' | 'resorts' | 'cities'>('events');
    const [simNow] = useState(() => useStore.getState().getNow());
    
    // Fetch and dynamically sort events
    const rawEvents = useLiveQuery(() => db.events.toArray(), []) || [];
    
    const sortedEvents = React.useMemo(() => {
        if (!rawEvents.length) return [];
        // Map raw event to dynamic event shifted to upcoming date
        const dynamic = rawEvents.map(e => getEventNextOccurrence(e, simNow));
        // Chronological sort
        return dynamic.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [rawEvents, simNow]);

    return (
        <div className="w-full h-full overflow-y-auto bg-[#0a0a0c] text-white pt-24 px-6 md:px-12 pb-24 relative">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header */}
                <div>
                   <h1 className="text-4xl md:text-6xl font-black font-sans uppercase tracking-tight">The Circuit</h1>
                   <p className="text-zinc-400 mt-2 text-sm tracking-widest font-mono uppercase">Global destinations across the network.</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-white/10 gap-8">
                   <button 
                      onClick={() => setActiveTab('events')}
                      className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'events' ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-transparent text-zinc-500 hover:text-white'}`}
                   >
                      <Globe size={16}/> Events
                   </button>
                   <button 
                      onClick={() => setActiveTab('resorts')}
                      className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'resorts' ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-transparent text-zinc-500 hover:text-white'}`}
                   >
                      <GlassWater size={16}/> Resorts <span className="opacity-50 text-[10px] ml-1 bg-white/10 px-1 rounded">PHASE 5</span>
                   </button>
                   <button 
                      onClick={() => setActiveTab('cities')}
                      className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'cities' ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-transparent text-zinc-500 hover:text-white'}`}
                   >
                      <Building2 size={16}/> Real Estate <span className="opacity-50 text-[10px] ml-1 bg-white/10 px-1 rounded">PHASE 9</span>
                   </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                   {activeTab === 'events' && (
                       <div className="flex flex-col gap-4">
                           {sortedEvents.map(evt => (
                               <EventCard key={evt.id} event={evt} simNow={simNow} />
                           ))}
                           {sortedEvents.length === 0 && (
                               <div className="text-zinc-500 font-mono text-sm tracking-widest pt-12">No events indexed.</div>
                           )}
                       </div>
                   )}

                   {activeTab === 'resorts' && (
                       <div className="flex items-center justify-center h-64 border border-dashed border-white/10 rounded-xl">
                          <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Global Resort Network — Pending Phase 5</p>
                       </div>
                   )}

                   {activeTab === 'cities' && (
                       <div className="flex items-center justify-center h-64 border border-dashed border-white/10 rounded-xl">
                          <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Real Estate Portfolio — Pending Phase 9</p>
                       </div>
                   )}
                </div>

            </div>
        </div>
    );
}
