'use client';

import React from 'react';
import { useStore } from '../lib/store';
import { Globe, Plane, ShoppingCart, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function fmt(n: number) {
    if (n >= 1000000000) return '$' + (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    return '$' + n.toLocaleString();
}

import { playerRepo } from '../lib/repositories/player';
import { useLiveQuery } from 'dexie-react-hooks';

export default function TopNav() {
  const pathname = usePathname();
  const player = useLiveQuery(() => playerRepo.get());
  const netWorth = player?.netWorth || 0;

  return (
    <div className="absolute top-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-xl border-b border-white/10 z-[100] flex items-center justify-between px-8 pointer-events-auto">
      
      <div className="flex items-center gap-2">
         <span className="w-8 h-8 rounded-full bg-[#00f0ff]/20 border border-[#00f0ff] flex items-center justify-center">
            <Plane size={16} className="text-[#00f0ff] -rotate-45" />
         </span>
         <h1 className="text-xl font-black text-white tracking-widest font-mono">JETSTREAM</h1>
      </div>

      <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
        {[
          { id: '/', activeCheck: '/', icon: Globe, label: 'CMD CENTER' },
          { id: '/fleet', activeCheck: '/fleet', icon: Plane, label: 'FLEET ROSTER' },
          { id: '/acquisitions', activeCheck: '/acquisitions', icon: ShoppingCart, label: 'ACQUISITIONS' }
        ].map(tab => {
          const isActive = pathname === tab.activeCheck || pathname?.startsWith(tab.activeCheck + '/');
          return (
            <Link
              key={tab.id}
              href={tab.id}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                isActive 
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                  : 'text-zinc-500 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-4 py-2 rounded-lg">
         <DollarSign size={14} className="text-emerald-400" />
         <span className="text-emerald-400 font-black font-mono tracking-widest text-sm">{fmt(netWorth)}</span>
      </div>

    </div>
  );
}
