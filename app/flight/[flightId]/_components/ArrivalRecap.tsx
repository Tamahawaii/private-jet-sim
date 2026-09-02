'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Stamp, Sparkles, MessageCircle, ArrowRight, Globe, CalendarDays, Palmtree } from 'lucide-react';
import { Flight, Aircraft } from '../../../../types';
import { db } from '../../../../lib/db';
import { countryName } from '../../../../lib/flight/airports';
import { describeRoute } from '../../../../lib/flight/engine';
import { formatDurationMs } from '../../../../lib/flight/engine';
import { PersonaAvatar } from '../../../components/PersonaAvatar';

export default function ArrivalRecap({ flight, aircraft }: { flight: Flight, aircraft: Aircraft }) {
   const router = useRouter();
   const r = describeRoute(flight);
   const recap = flight.recap;
   const companions = useLiveQuery(() => db.personas.where('id').anyOf(recap?.companions || []).toArray(), [flight.id]) || [];
   const reactor = useLiveQuery(() => (recap?.reactionPersonaId ? db.personas.get(recap.reactionPersonaId) : undefined), [recap?.reactionPersonaId]);
   const country = r.dest ? countryName(r.dest.country) : recap?.countryName;

   const primary = recap?.purposeLink
     ? { label: flight.purpose?.type === 'event' ? `Attend ${recap.purposeLabel}` : `Check in at ${recap.purposeLabel}`, href: recap.purposeLink, icon: flight.purpose?.type === 'event' ? <CalendarDays size={15} /> : <Palmtree size={15} /> }
     : { label: `Explore ${r.destCity}`, href: `/destinations?near=${flight.destinationICAO}`, icon: <Palmtree size={15} /> };

   return (
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="pointer-events-auto w-full md:w-[460px] md:absolute md:left-6 md:bottom-6 glass rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[86vh] flex flex-col"
        style={{ marginBottom: 'var(--safe-bottom)' }}
      >
         <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-[var(--accent)]/12 to-transparent">
            <div className="eyebrow flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Landed · {flight.destinationICAO}{recap?.arrivedLocalTime ? ` · ${recap.arrivedLocalTime} local` : ''}</div>
            <h2 className="font-serif text-[34px] leading-[1.05] text-white mt-2 text-balance">Welcome to {r.destCity}.</h2>
            <p className="text-[13px] text-zinc-400 mt-1.5">{country}{recap ? ` · flight #${recap.flightNumber} · ${formatDurationMs(recap.hoursAloft * 3600000)} aloft in ${aircraft.tailNumber}` : ''}</p>
            {recap?.newCountry && (
               <div className="absolute right-5 top-5 rotate-[8deg] border-2 border-[var(--color-gold)]/70 text-[var(--color-gold)] rounded-lg px-2.5 py-1.5 text-center shadow-[0_0_20px_rgba(212,175,55,0.25)]">
                  <div className="text-[8px] font-mono tracking-[0.2em]">FIRST VISIT</div>
                  <div className="font-serif text-[14px] leading-none mt-0.5">{recap.countryName}</div>
               </div>
            )}
         </div>

         <div className="px-6 pb-6 overflow-y-auto no-scrollbar space-y-5">
            {recap && (
               <div className="bg-white/4 border border-white/8 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                     <div className="eyebrow flex items-center gap-1.5"><Sparkles size={11} className="text-[var(--color-gold)]" /> Prestige</div>
                     <div className="font-mono text-[22px] font-bold text-[var(--color-gold)]">+{recap.prestigeGained}</div>
                  </div>
                  <ul className="mt-2 space-y-1">
                     {recap.breakdown.map((b, i) => (
                        <li key={i} className="flex justify-between text-[12px]"><span className="text-zinc-400">{b.label}</span><span className="font-mono text-zinc-200">+{b.points}</span></li>
                     ))}
                  </ul>
               </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
               <div className="bg-white/4 border border-white/8 rounded-xl py-2.5"><div className="eyebrow">Distance</div><div className="font-mono text-[13px] text-white mt-1">{Math.round(flight.distanceNM).toLocaleString()} NM</div></div>
               <div className="bg-white/4 border border-white/8 rounded-xl py-2.5"><div className="eyebrow">Trip cost</div><div className="font-mono text-[13px] text-white mt-1">${Math.round(flight.costUSD).toLocaleString()}</div></div>
               <div className="bg-white/4 border border-white/8 rounded-xl py-2.5"><div className="eyebrow">From</div><div className="font-mono text-[13px] text-white mt-1">{flight.originICAO}</div></div>
            </div>

            {companions.length > 0 && (
               <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">{companions.map(p => <PersonaAvatar key={p.id} persona={p} size={32} className="border-2 border-[#0a0f18]" />)}</div>
                  <div className="text-[12.5px] text-zinc-300">{companions.map(p => p.displayName.split(' ')[0]).join(', ')} landed with you.</div>
               </div>
            )}

            {reactor && (
               <button onClick={() => router.push(`/social/dms/${reactor.id}`)} className="w-full flex items-center gap-3 bg-[#f5a7a7]/10 border border-[#f5a7a7]/25 rounded-2xl p-3 text-left">
                  <PersonaAvatar persona={reactor} size={36} className="border border-[#f5a7a7]/40" />
                  <div className="flex-1 min-w-0">
                     <div className="text-[13px] text-white">{reactor.displayName.split(' ')[0]} texted you</div>
                     <div className="text-[11px] text-zinc-400">Someone noticed you land.</div>
                  </div>
                  <MessageCircle size={16} className="text-[#f5a7a7]" />
               </button>
            )}

            <div className="flex flex-col gap-2 pt-1">
               <button onClick={() => router.push(primary.href)} className="h-12 rounded-xl bg-[var(--accent)] text-black font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-white transition-colors">{primary.icon} {primary.label} <ArrowRight size={15} /></button>
               <div className="flex gap-2">
                  <button onClick={() => router.push('/profile#passport')} className="flex-1 h-11 rounded-xl bg-white/6 border border-white/10 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5"><Stamp size={14} /> Passport</button>
                  <button onClick={() => router.push('/')} className="flex-1 h-11 rounded-xl bg-white/6 border border-white/10 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5"><Globe size={14} /> Back to the world</button>
               </div>
            </div>
         </div>
      </motion.div>
   );
}
