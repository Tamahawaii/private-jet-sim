'use client';
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import Link from 'next/link';
import { ArrowLeft, MapPin, Edit3, User, Shield, Briefcase, Heart, Utensils, Music, Glasses, Coffee, Car } from 'lucide-react';
import { Player, PartnerEntry } from '../../types';

export default function PlayerProfilePage() {
    const player = useLiveQuery(() => db.player.get('player')) as Player;

    if (player === undefined) return <div className="p-24 text-center font-mono text-white tracking-widest">LOADING DOSSIER...</div>;
    if (player === null) return <div className="p-24 text-center font-mono text-white text-red-500">CANONICAL RECORD ERROR</div>;

    const initials = player.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="w-full h-full overflow-y-auto bg-[#0a0a0c] text-white">
            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/10 p-4 md:px-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-mono tracking-widest text-xs uppercase">
                    <ArrowLeft size={16} /> Dashboard
                </Link>
                <div className="flex items-center gap-3">
                    <Link href="/settings" className="px-3 py-1.5 border border-white/10 rounded font-mono text-[10px] tracking-widest text-zinc-400 hover:text-white hover:border-white/30 bg-white/5 flex items-center gap-1.5 transition-colors">
                        <Edit3 size={12}/> EDIT
                    </Link>
                </div>
            </div>

            <div className="w-full h-[40vh] min-h-[300px] relative bg-zinc-900 border-b border-white/10">
                 {player.imageUrl ? (
                     <img 
                         src={player.imageUrl} 
                         alt={player.displayName} 
                         className="w-full h-full object-cover opacity-80"
                     />
                 ) : (
                     <div 
                        className="w-full h-full flex items-center justify-center relative overflow-hidden" 
                        style={{ background: `linear-gradient(135deg, ${player.monogramColors?.[0] || '#222'}, ${player.monogramColors?.[1] || '#111'})` }}
                     >
                         <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('/noise.png')] pointer-events-none"></div>
                         <span className="text-[120px] text-white/30 font-serif leading-none tracking-tighter mix-blend-overlay">{initials}</span>
                     </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent pointer-events-none" />
                 
                 <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
                     <div className="max-w-4xl mx-auto flex items-end justify-between">
                         <div>
                            <span className="text-zinc-400 tracking-widest uppercase font-mono text-xs block mb-2">
                                {player.alternateName ? `A.K.A. ${player.alternateName}` : 'PRIMARY RECORD'}
                            </span>
                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-sans font-black tracking-tight text-white mb-4 group">{player.displayName}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tracking-widest uppercase mt-4">
                               <div className="text-[#00f0ff] border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-3 py-1 rounded-sm flex items-center gap-1.5">
                                   <Shield size={12}/> TIER {player.wealthTier}
                               </div>
                               <div className="text-zinc-300 flex items-center gap-1.5"><MapPin size={14}/> {player.region}</div>
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
                           <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2 flex items-center gap-2"><User size={14}/> IDENTITY PROFILE</h2>
                           
                           <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                               <div>
                                   <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">GENDER & PRONOUNS</div>
                                   <div className="font-sans text-white">{player.gender} ({player.pronouns})</div>
                               </div>
                               <div>
                                   <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">AGE</div>
                                   <div className="font-sans text-white">{player.age}</div>
                               </div>
                               <div>
                                   <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">ORIENTATION</div>
                                   <div className="font-sans text-white">{player.publicOrientation}</div>
                               </div>
                               <div>
                                   <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1">RELATIONSHIP STYLE</div>
                                   <div className="font-sans text-white">{player.relationshipStyle}</div>
                               </div>
                           </div>
                           
                           <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                               <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-2">ORIENTATION FLEXIBILITY</div>
                               <p className="text-sm text-zinc-300 italic">"{player.orientationFlexibility}"</p>
                           </div>
                        </section>

                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2 flex items-center gap-2"><Briefcase size={14}/> PUBLIC REPUTATION</h2>
                            <p className="text-lg leading-relaxed text-zinc-300 font-sans">{player.publicReputation}</p>
                            
                            <div className="mt-6 flex flex-wrap gap-2">
                                {player.personality.map((trait: string, idx: number) => (
                                    <div key={idx} className="bg-black/40 border border-white/10 px-3 py-1.5 rounded text-xs font-mono tracking-widest text-zinc-300 uppercase">
                                        {trait}
                                    </div>
                                ))}
                            </div>
                        </section>
                        
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2 flex items-center gap-2"><Heart size={14}/> CURRENT PARTNERS</h2>
                            {player.currentPartners && player.currentPartners.length > 0 ? (
                                <div className="space-y-4">
                                    {player.currentPartners.map((partner: PartnerEntry, idx: number) => (
                                        <div key={idx} className="bg-zinc-900 border border-white/10 p-5 rounded-xl flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-white mb-1 uppercase tracking-widest font-mono">{partner.name}</h3>
                                                <p className="text-zinc-400 text-sm">{partner.relationship} • {partner.status}</p>
                                                {partner.note && <p className="text-zinc-500 text-xs mt-2 italic">"{partner.note}"</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-zinc-500 italic">No formal partners currently on record.</div>
                            )}
                        </section>
                    </div>

                    {/* Right Info Column */}
                    <div className="space-y-8">
                        <div className="bg-[#0f0f13] border border-white/10 rounded-xl p-6">
                            <div className="text-3xl font-mono tracking-widest text-white mb-1">${(player.netWorth / 1e9).toFixed(1)}B <span className="text-xs text-zinc-600 block mt-1 uppercase">EST. NET WORTH</span></div>
                            <div className="flex items-center gap-3 mt-6 text-xs font-mono tracking-widest uppercase text-zinc-400">
                                <div className="text-right">
                                   <span className="block text-[9px] text-zinc-600 mb-0.5">RESIDENCE</span>
                                   <span className="text-white">{player.homeCity}</span>
                                </div>
                                <div className="w-px h-6 bg-white/10"></div>
                                <div className="text-left">
                                   <span className="block text-[9px] text-zinc-600 mb-0.5">BASE ICAO</span>
                                   <span className="text-white">{player.homeBase}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tastes */}
                        <div className="border border-white/10 rounded-xl p-6 bg-black/40 space-y-5">
                             <h3 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-6 flex items-center gap-2"><Glasses size={14} /> ESTABLISHED TASTES</h3>
                             
                             {player.tastes?.aesthetic && (
                                 <div>
                                    <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5"><Glasses size={10}/> AESTHETIC</div>
                                    <div className="text-sm text-white font-sans">{player.tastes.aesthetic}</div>
                                 </div>
                             )}
                             {player.tastes?.drinks && (
                                 <div>
                                    <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5"><Coffee size={10}/> DRINKS</div>
                                    <div className="text-sm text-white font-sans">{player.tastes.drinks}</div>
                                 </div>
                             )}
                             {player.tastes?.music && (
                                 <div>
                                    <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5"><Music size={10}/> MUSIC</div>
                                    <div className="text-sm text-white font-sans">{player.tastes.music}</div>
                                 </div>
                             )}
                             {player.tastes?.wears && (
                                 <div>
                                    <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5"><User size={10}/> WEARS</div>
                                    <div className="text-sm text-white font-sans">{player.tastes.wears}</div>
                                 </div>
                             )}
                             {player.tastes?.drives && (
                                 <div>
                                    <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5"><Car size={10}/> DRIVES</div>
                                    <div className="text-sm text-white font-sans">{player.tastes.drives}</div>
                                 </div>
                             )}
                        </div>

                        {/* Interests */}
                        {player.interests && player.interests.length > 0 && (
                            <div className="border border-white/10 rounded-xl p-6 bg-black/40">
                                 <h3 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 pb-2 border-b border-white/10">KNOWN INTERESTS</h3>
                                 <ul className="space-y-2">
                                     {player.interests.map((interest: string, idx: number) => (
                                         <li key={idx} className="text-white text-sm flex items-start gap-2">
                                             <span className="text-[#00f0ff] opacity-50 mt-1">•</span> {interest}
                                         </li>
                                     ))}
                                 </ul>
                            </div>
                        )}
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
