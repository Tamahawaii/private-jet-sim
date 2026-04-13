'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import Link from 'next/link';
import { ArrowLeft, MapPin, Navigation2, Check, Star, CheckCircle2, Waves, GlassWater } from 'lucide-react';
import { PersonaAvatar } from '../../components/PersonaAvatar';
import { SignatureExperience, Persona } from '../../../types';

export default function ResortDetailPage() {
    const params = useParams();
    const resortId = typeof params?.resortId === 'string' ? params.resortId : '';
    
    const resort = useLiveQuery(() => db.resorts.get(resortId), [resortId]);
    const preferences = useLiveQuery(() => 
        db.personas.where('id').anyOf(resort?.preferredBy || []).toArray()
    , [resort]) || [];

    if (resort === undefined) return <div className="p-24 text-center font-mono text-white">Loading dossier...</div>;
    if (resort === null) return <div className="p-24 text-center font-mono text-white text-red-500">RESORT NOT FOUND IN DIRECTORY</div>;

    const initials = resort.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="w-full h-full overflow-y-auto bg-[#0a0a0c] text-white">
            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/10 p-4 md:px-8 flex items-center justify-between">
                <Link href="/destinations?tab=resorts" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-mono tracking-widest text-xs uppercase">
                    <ArrowLeft size={16} /> Directory
                </Link>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 border border-white/10 rounded font-mono text-[10px] tracking-widest text-zinc-500 bg-white/5 flex items-center gap-1">
                        <MapPin size={12}/> {resort.locationICAO}
                    </div>
                </div>
            </div>

            <div className="w-full h-[40vh] min-h-[300px] relative bg-zinc-900 border-b border-white/10">
                 {resort.imageUrl ? (
                     <img 
                         src={resort.imageUrl} 
                         alt={resort.name} 
                         className="w-full h-full object-cover opacity-80"
                     />
                 ) : (
                     <div className="w-full h-full bg-gradient-to-br from-[#1a1a1f] to-[#0a0a0c] flex items-center justify-center">
                         <span className="text-[120px] text-[#f5a7a7]/10 font-serif leading-none tracking-tighter mix-blend-screen">{initials}</span>
                     </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
                 
                 <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 mb-reverse">
                     <div className="max-w-4xl mx-auto flex items-end justify-between">
                         <div>
                            {resort.brand !== 'Independent' && (
                                <span className="text-zinc-400 tracking-widest uppercase font-mono text-xs block mb-2">{resort.brand}</span>
                            )}
                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-sans font-black tracking-tight text-white mb-4 group">{resort.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tracking-widest uppercase mt-4">
                               <div className="text-[#f5a7a7] border border-[#f5a7a7]/30 bg-[#f5a7a7]/10 px-3 py-1 rounded-sm flex items-center gap-1"><Star size={12}/> Tier {resort.tier}</div>
                               <div className="text-zinc-300 flex items-center gap-1.5"><MapPin size={14}/> {resort.city}, {resort.country}</div>
                            </div>
                         </div>
                     </div>
                 </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-12 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    
                    {/* Left Column */}
                    <div className="md:col-span-2 space-y-12">
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                           <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2">Dossier summary</h2>
                           <p className="text-lg leading-relaxed text-zinc-300 font-sans">{resort.description}</p>
                           <p className="text-zinc-500 font-mono text-xs tracking-widest italic mt-4 mb-2 uppercase">"{resort.shortDescription}"</p>
                        </section>

                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2">Featured Amenities</h2>
                            <div className="flex flex-wrap gap-2">
                                {resort.amenities.map((am: string) => (
                                    <div key={am} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded text-xs font-mono tracking-widest text-zinc-300 flex items-center gap-1.5">
                                        <Check size={12} className="text-[#f5a7a7]" /> {am}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2 flex items-center justify-between">
                                Signature Experiences
                                <span className="text-[10px] text-zinc-500">PENDING BOOKING (COMMIT D)</span>
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {resort.signatureExperiences.map((se: SignatureExperience) => (
                                    <div key={se.id} className="bg-zinc-900 border border-white/10 p-5 rounded-xl flex items-start justify-between group">
                                        <div>
                                           <h3 className="font-bold text-white mb-2">{se.name}</h3>
                                           <p className="text-zinc-500 text-sm leading-relaxed">{se.description}</p>
                                        </div>
                                        <div className="shrink-0 text-right ml-4">
                                            <div className="text-lg font-mono tracking-widest text-[#f5a7a7]">${se.price.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Info Column */}
                    <div className="space-y-8">
                        <div className="bg-[#0f0f13] border border-white/10 rounded-xl p-6">
                            <div className="text-3xl font-mono tracking-widest text-white mb-1">${resort.nightlyRate.toLocaleString()} <span className="text-xs text-zinc-600 block mt-1 uppercase">Per Night</span></div>
                            <div className="flex items-center gap-2 mt-4 text-xs font-mono tracking-widest uppercase text-zinc-500 border border-zinc-800 p-2 rounded">
                                <Waves size={14} /> Currently quiet
                            </div>
                            
                            <button 
                                disabled
                                className="w-full bg-white/5 text-zinc-600 border border-white/5 py-4 rounded uppercase font-bold tracking-widest font-mono text-xs transition-colors mt-6 flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                Booking available in Commit D
                            </button>
                        </div>

                        {/* Social Discovery */}
                        <div className="border border-white/10 rounded-xl p-6 bg-black/40">
                             <h3 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-6 flex items-center gap-2"><GlassWater size={14} /> Social Circle Preferred</h3>
                             {preferences.length > 0 ? (
                                 <div className="flex flex-col gap-4">
                                     {preferences.map((p: any) => (
                                         <div key={p.id} className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded transition-colors">
                                            <PersonaAvatar persona={p} size={36} className="border border-white/10 group-hover:border-[#f5a7a7]/50" />
                                            <div>
                                                <div className="font-mono tracking-widest uppercase text-sm font-bold text-white group-hover:text-[#f5a7a7] transition-colors">{p.displayName}</div>
                                                <div className="text-[10px] text-zinc-500 font-sans">{p.archetype.replace(/_/g, ' ')}</div>
                                            </div>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <p className="text-xs text-zinc-500 font-mono tracking-widest leading-relaxed uppercase">No established personas frequently request this asset.</p>
                             )}
                        </div>

                        {/* Dress code */}
                        <div className="border border-white/10 rounded-xl p-6 bg-black/40">
                             <h3 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 pb-2 border-b border-white/10">Atmosphere</h3>
                             <p className="text-white text-sm leading-relaxed">{resort.dressCode}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
