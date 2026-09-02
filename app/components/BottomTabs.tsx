'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { User } from 'lucide-react';
import { db } from '../../lib/db';
import { NAV_ITEMS } from './TopNav';

/** Phone navigation. Hidden on md+ where the top bar carries the tabs. */
export default function BottomTabs() {
  const pathname = usePathname() || '/';
  const dmThreads = useLiveQuery(() => db.dmThreads.toArray());
  const unread = dmThreads ? dmThreads.reduce((acc, t) => acc + (t.unreadCount || 0), 0) : 0;
  // Hide during the flight planner and live flight (they have their own chrome)
  if (pathname.startsWith('/flight/')) return null;

  const tabs = [...NAV_ITEMS.filter(t => t.id !== '/acquisitions'), { id: '/profile', match: (p: string) => p.startsWith('/profile') || p.startsWith('/settings') || p.startsWith('/acquisitions'), icon: User, label: 'You' }];

  return (
    <nav
      className="md:hidden absolute left-0 right-0 bottom-0 z-[100] pointer-events-auto bg-[#070b12]/92 backdrop-blur-xl border-t border-white/8"
      style={{ height: 'var(--tabbar-h)', paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="grid grid-cols-5 h-full">
        {tabs.map(tab => {
          const active = tab.match(pathname);
          return (
            <Link key={tab.id} href={tab.id} className="relative flex flex-col items-center justify-center gap-1">
              <span className={`relative flex items-center justify-center w-11 h-7 rounded-full transition-colors ${active ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-zinc-500'}`}>
                <tab.icon size={18} strokeWidth={active ? 2.4 : 2} />
                {tab.id === '/social' && unread > 0 && <span className="absolute -top-0.5 right-1.5 w-2 h-2 rounded-full bg-[var(--magenta)]" />}
              </span>
              <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-white' : 'text-zinc-500'}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
