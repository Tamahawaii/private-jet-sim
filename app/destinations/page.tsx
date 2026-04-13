'use client';
import React, { useState, useMemo, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { getEventNextOccurrence } from '../lib/events';
import { useStore } from '../lib/store';
import EventCard from './_components/EventCard';
import ResortCard from './_components/ResortCard';
import { Globe, GlassWater, Building2, FilterX } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

function DestinationsContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Search Params -> State mapping
    const tabParam = searchParams?.get('tab') || 'events';
    const activeTab = ['events', 'resorts', 'cities'].includes(tabParam) ? tabParam : 'events';
    
    const setTab = (tab: string) => {
        const params = new URLSearchParams(searchParams?.toString());
        params.set('tab', tab);
        router.push(`${pathname}?${params.toString()}`);
    };

    const regionsFilter = searchParams?.getAll('region') || [];
    const tiersFilter = searchParams?.getAll('tier').map(Number) || [];
    const categoriesFilter = searchParams?.getAll('category') || [];
    const preferredByFilter = searchParams?.getAll('persona') || [];

    const toggleFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams?.toString());
        const current = params.getAll(key);
        if (current.includes(value)) {
            params.delete(key);
            current.forEach(v => { if (v !== value) params.append(key, v) });
        } else {
            params.append(key, value);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams?.toString());
        params.delete('region');
        params.delete('tier');
        params.delete('category');
        params.delete('persona');
        router.push(`${pathname}?${params.toString()}`);
    };

    const [simNow] = useState(() => useStore.getState().getNow());
    
    // DB Queries
    const rawEvents = useLiveQuery(() => db.events.toArray(), []) || [];
    const rawResorts = useLiveQuery(() => db.resorts.toArray(), []);
    const personas = useLiveQuery(() => db.personas.toArray(), []) || [];

    const sortedEvents = useMemo(() => {
        if (!rawEvents.length) return [];
        const dynamic = rawEvents.map(e => getEventNextOccurrence(e, simNow));
        return dynamic.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [rawEvents, simNow]);

    const filteredResorts = useMemo(() => {
        if (!rawResorts) return null; // Distinguish between loaded (empty) and loading (null)
        
        return rawResorts.filter(r => {
            const matchesRegion = regionsFilter.length === 0 || regionsFilter.includes(r.region);
            const matchesTier = tiersFilter.length === 0 || tiersFilter.includes(r.tier);
            const matchesCategory = categoriesFilter.length === 0 || categoriesFilter.includes(r.category);
            const matchesPreferred = preferredByFilter.length === 0 || preferredByFilter.some(pId => r.preferredBy?.includes(pId));
            
            return matchesRegion && matchesTier && matchesCategory && matchesPreferred;
        });
    }, [rawResorts, regionsFilter, tiersFilter, categoriesFilter, preferredByFilter]);

    // Unique options for filters
    const availableRegions = useMemo(() => rawResorts ? Array.from(new Set(rawResorts.map(r => r.region))).sort() : [], [rawResorts]);
    const availableCategories = useMemo(() => rawResorts ? Array.from(new Set(rawResorts.map(r => r.category))).sort() : [], [rawResorts]);
    const availablePersonas = useMemo(() => {
        if (!rawResorts || personas.length === 0) return [];
        const activeIds = new Set(rawResorts.flatMap(r => r.preferredBy || []));
        return personas.filter(p => activeIds.has(p.id)).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [rawResorts, personas]);

    const hasActiveFilters = regionsFilter.length > 0 || tiersFilter.length > 0 || categoriesFilter.length > 0 || preferredByFilter.length > 0;

    return (
        <div className="w-full h-full overflow-y-auto bg-[#0a0a0c] text-white pt-24 px-6 md:px-12 pb-24 relative">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header */}
                <div>
                   <h1 className="text-4xl md:text-6xl font-black font-sans uppercase tracking-tight">The Circuit</h1>
                   <p className="text-zinc-400 mt-2 text-sm tracking-widest font-mono uppercase">Global destinations across the network.</p>
                </div>

                {/* Main Tabs */}
                <div className="flex border-b border-white/10 gap-8">
                   <button 
                      onClick={() => setTab('events')}
                      className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'events' ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-transparent text-zinc-500 hover:text-white'}`}
                   >
                      <Globe size={16}/> Events
                   </button>
                   <button 
                      onClick={() => setTab('resorts')}
                      className={`pb-4 text-xs font-bold font-mono tracking-widest uppercase transition-all flex items-center gap-2 border-b-2 ${activeTab === 'resorts' ? 'border-[#f5a7a7] text-[#f5a7a7]' : 'border-transparent text-zinc-500 hover:text-white'}`}
                   >
                      <GlassWater size={16}/> Resorts
                   </button>
                   <button 
                      onClick={() => setTab('cities')}
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
                               <div className="text-zinc-500 font-mono text-sm tracking-widest pt-12 text-center">No events indexed.</div>
                           )}
                       </div>
                   )}

                   {activeTab === 'resorts' && (
                       <div className="space-y-6">
                           {/* Filter Ribbon */}
                           <div className="flex items-center flex-nowrap overflow-x-auto gap-3 pb-2 no-scrollbar">
                               {hasActiveFilters && (
                                   <button onClick={clearFilters} className="shrink-0 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors" title="Clear all filters">
                                       <FilterX size={14} />
                                   </button>
                               )}

                               {/* Region Drop */}
                               <select 
                                   className={`shrink-0 bg-transparent border rounded-full px-4 py-2 text-xs font-mono tracking-widest uppercase outline-none ${regionsFilter.length > 0 ? 'border-[#f5a7a7] text-[#f5a7a7]' : 'border-white/20 text-zinc-400 hover:border-white/50'}`}
                                   value=""
                                   onChange={(e) => toggleFilter('region', e.target.value)}
                               >
                                   <option value="" disabled hidden>{regionsFilter.length > 0 ? `Regions (${regionsFilter.length})` : 'Region'}</option>
                                   {availableRegions.map(r => (
                                       <option key={r} value={r} className="bg-black text-white">{regionsFilter.includes(r) ? `✓ ${r}` : r}</option>
                                   ))}
                               </select>

                               {/* Tier Drop */}
                               <select 
                                   className={`shrink-0 bg-transparent border rounded-full px-4 py-2 text-xs font-mono tracking-widest uppercase outline-none ${tiersFilter.length > 0 ? 'border-[#f5a7a7] text-[#f5a7a7]' : 'border-white/20 text-zinc-400 hover:border-white/50'}`}
                                   value=""
                                   onChange={(e) => toggleFilter('tier', e.target.value)}
                               >
                                   <option value="" disabled hidden>{tiersFilter.length > 0 ? `Tiers (${tiersFilter.length})` : 'Tier'}</option>
                                   {[5, 4, 3, 2, 1].map(t => (
                                       <option key={t} value={t.toString()} className="bg-black text-white">{tiersFilter.includes(t) ? `✓ Tier ${t}` : `Tier ${t}`}</option>
                                   ))}
                               </select>

                               {/* Category Drop */}
                               <select 
                                   className={`shrink-0 bg-transparent border rounded-full px-4 py-2 text-xs font-mono tracking-widest uppercase outline-none ${categoriesFilter.length > 0 ? 'border-[#f5a7a7] text-[#f5a7a7]' : 'border-white/20 text-zinc-400 hover:border-white/50'}`}
                                   value=""
                                   onChange={(e) => toggleFilter('category', e.target.value)}
                               >
                                   <option value="" disabled hidden>{categoriesFilter.length > 0 ? `Category (${categoriesFilter.length})` : 'Category'}</option>
                                   {availableCategories.map(c => (
                                       <option key={c} value={c} className="bg-black text-white">{categoriesFilter.includes(c) ? `✓ ${c.replace(/-/g, ' ')}` : c.replace(/-/g, ' ')}</option>
                                   ))}
                               </select>

                               {/* Preferred By */}
                               <select 
                                   className={`shrink-0 bg-transparent border rounded-full px-4 py-2 text-xs font-mono tracking-widest uppercase outline-none ${preferredByFilter.length > 0 ? 'border-[#f5a7a7] text-[#f5a7a7]' : 'border-white/20 text-zinc-400 hover:border-white/50'}`}
                                   value=""
                                   onChange={(e) => toggleFilter('persona', e.target.value)}
                               >
                                   <option value="" disabled hidden>{preferredByFilter.length > 0 ? `Preferred by (${preferredByFilter.length})` : 'Preferred by'}</option>
                                   {availablePersonas.map(p => (
                                       <option key={p.id} value={p.id} className="bg-black text-white">{preferredByFilter.includes(p.id) ? `✓ ${p.displayName}` : p.displayName}</option>
                                   ))}
                               </select>
                           </div>

                           {/* Render State */}
                           {filteredResorts === null ? (
                               <div className="flex flex-col gap-4">
                                   {[1, 2, 3].map(i => (
                                      <div key={i} className="w-full h-44 bg-white/5 animate-pulse rounded-xl border border-white/5" />
                                   ))}
                               </div>
                           ) : filteredResorts.length === 0 ? (
                               <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-xl">
                                  <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase mb-4">No results match applied filters.</p>
                                  <button onClick={clearFilters} className="bg-white text-black px-6 py-2 rounded font-bold tracking-widest uppercase font-mono text-xs hover:bg-zinc-200 transition-colors">Clear Headers</button>
                               </div>
                           ) : (
                               <div className="flex flex-col gap-4">
                                   {filteredResorts.map(r => (
                                       <ResortCard key={r.id} resort={r} />
                                   ))}
                               </div>
                           )}
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

export default function DestinationsPage() {
    return (
        <Suspense fallback={<div className="p-24 text-center font-mono text-zinc-600">Syncing telemetry...</div>}>
            <DestinationsContent />
        </Suspense>
    );
}
