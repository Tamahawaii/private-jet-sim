'use client';

import React from 'react';
import { Globe, Plane, ShoppingCart, MessageCircle, User, Palmtree } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { playerRepo } from '../../lib/repositories/player';
import { db } from '../../lib/db';
import SimSpeedControl from './SimSpeedControl';

function fmt(n: number) {
    if (n >= 1000000000) return '$' + (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    return '$' + n.toLocaleString();
}

export const NAV_ITEMS = [
  { id: '/', match: (p: string) => p === '/' || p === '/world' || p.startsWith('/flight'), icon: Globe, label: 'World' },
  { id: '/fleet', match: (p: string) => p.startsWith('/fleet'), icon: Plane, label: 'Fleet' },
  { id: '/destinations', match: (p: string) => p.startsWith('/destinations') || p.startsWith('/resorts') || p.startsWith('/events'), icon: Palmtree, label: 'Travel' },
  { id: '/social', match: (p: string) => p.startsWith('/social'), icon: MessageCircle, label: 'Social' },
  { id: '/acquisitions', match: (p: string) => p.startsWith('/acquisitions'), icon: ShoppingCart, label: 'Acquire' },
];

export default function TopNav() {
  const pathname = usePathname() || '/';
  const player = useLiveQuery(() => playerRepo.get());
  const netWorth = player?.netWorth || 0;

  const dmThreads = useLiveQuery(() => db.dmThreads.toArray());
  const unreadCount = dmThreads ? dmThreads.reduce((acc, t) => acc + (t.unreadCount || 0), 0) : 0;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-3 md:px-6 pointer-events-auto bg-gradient-to-b from-[#070b12]/95 via-[#070b12]/70 to-transparent"
      style={{ height: 'calc(var(--nav-h) + var(--safe-top))', paddingTop: 'var(--safe-top)' }}
    >
      <Link href="/" className="flex items-center gap-2 min-w-0">
         <span className="w-7 h-7 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/60 flex items-center justify-center shrink-0">
            <Plane size={13} className="text-[var(--accent)] -rotate-45" />
         </span>
         <span className="hidden sm:block text-[15px] font-bold text-white tracking-[0.22em] font-mono">JETSTREAM</span>
      </Link>

      <div className="hidden md:flex gap-1 bg-black/40 p-1 rounded-full border border-white/8">
        {NAV_ITEMS.map(tab => {
          const isActive = tab.match(pathname);
          return (
            <Link
              key={tab.id}
              href={tab.id}
              className={`flex items-center gap-2 px-4 py-1.5 text-[12px] font-semibold tracking-wide rounded-full transition-all ${
                isActive ? 'bg-white text-black' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon size={13} /> {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
         <div className="md:hidden"><SimSpeedControl compact /></div>
         <div className="hidden md:block"><SimSpeedControl /></div>
         <Link href="/social/dms" className="relative hidden md:flex w-9 h-9 bg-black/40 border border-white/10 hover:border-white/30 rounded-full transition-colors items-center justify-center">
             <MessageCircle size={16} className="text-zinc-300" />
             {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 bg-[var(--magenta)] border border-black text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center font-mono">
                     {unreadCount > 9 ? '9+' : unreadCount}
                 </span>
             )}
         </Link>
         <Link href="/profile" className="hidden md:flex w-9 h-9 bg-black/40 border border-white/10 hover:border-white/30 rounded-full transition-colors items-center justify-center">
             <User size={16} className="text-zinc-300" />
         </Link>
         <div className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-500/30 px-2.5 md:px-3 h-9 rounded-full">
            <span className="text-emerald-300 font-bold font-mono tracking-wide text-[12.5px]">{fmt(netWorth)}</span>
         </div>
      </div>
    </div>
  );
}
