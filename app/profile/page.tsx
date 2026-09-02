'use client';
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import Link from 'next/link';
import { MapPin, Edit3, User, Briefcase, Heart, Music, Glasses, Coffee, Car, Bell, ShoppingCart } from 'lucide-react';
import { Player, PartnerEntry } from '../../types';
import Passport from './_components/Passport';

export default function PlayerProfilePage() {
    const player = useLiveQuery(() => db.player.get('player')) as Player;
    const unreadInbox = useLiveQuery(() => db.notifications.filter(n => !n.readAt).count()) || 0;

    if (player === undefined) return <div className="p-24 text-center font-mono text-white tracking-widest">LOADING DOSSIER...</div>;
    if (player === null) return <div className="p-24 text-center font-mono text-white text-red-500">CANONICAL RECORD ERROR</div>;

    const initials = player.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="w-full h-full overflow-y-auto no-scrollbar bg-[#070b12] text-white pb-tabs" style={{ paddingTop: 'calc(var(--nav-h) + var(--safe-top))' }}>
            <div className="max-w-4xl mx-auto px-4 md:px-8 pt-4">
               <div className="relative rounded-3xl overflow-hidden border border-white/8" style={{ background: `linear-gradient(135deg, ${player.monogramColors?.[0] || '#0b6e8c'}, ${player.monogramColors?.[1] || '#2ca5c4'})` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/40 to-transparent" />
                  <div className="relative p-5 md:p-7 flex items-end gap-4">
                     <div className="w-[104px] h-[104px] md:w-[124px] md:h-[124px] rounded-2xl overflow-hidden border-[3px] border-[#070b12] shadow-2xl bg-[#0b1220] shrink-0 relative">
                        <img src={player.imageUrl || '/avatars/player.svg'} alt={player.displayName} className="absolute inset-0 w-full h-full object-cover" style={player.imageUrl ? {} : { transform: 'scale(1.06) translateY(3%)' }} />
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="eyebrow">{player.alternateName ? `a.k.a. ${player.alternateName}` : 'Primary record'} · tier {player.wealthTier}</div>
                        <h1 className="font-serif text-[34px] md:text-[44px] leading-[1.02] text-white mt-1">{player.displayName}</h1>
                        <div className="text-[12.5px] text-zinc-300 mt-1 flex items-center gap-1.5"><MapPin size={12} /> {player.homeCity} · {player.occupation}</div>
                     </div>
                  </div>
                  <div className="relative px-5 md:px-7 pb-5 flex flex-wrap gap-2">
                     <Link href="/inbox" className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold flex items-center gap-1.5 relative"><Bell size={13} /> Inbox{unreadInbox > 0 && <span className="ml-1 bg-[var(--accent)] text-black text-[10px] font-mono font-bold px-1.5 rounded-md">{unreadInbox}</span>}</Link>
                     <Link href="/acquisitions" className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold flex items-center gap-1.5"><ShoppingCart size={13} /> Acquire</Link>
                     <Link href="/settings" className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold flex items-center gap-1.5"><Edit3 size={13} /> Settings</Link>
                  </div>
               </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 pb-24">
                <div className="mb-14"><Passport player={player} /></div>
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
