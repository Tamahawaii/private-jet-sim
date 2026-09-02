'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, MessageCircle, Plane, CalendarDays, Sparkles, Check, ChevronRight } from 'lucide-react';
import { db } from '../../lib/db';
import { resolveLegacyLink } from '../../lib/routes';
import { Notification } from '../../types';
import { PageShell, PageHeader, Button, EmptyState } from '../components/ui';

const ICON: Record<Notification['type'], React.ReactNode> = { dm: <MessageCircle size={15} />, flight_arrival: <Plane size={15} />, event_reminder: <CalendarDays size={15} />, friend_action: <Sparkles size={15} />, system: <Bell size={15} /> };

export default function InboxPage() {
  const router = useRouter();
  const items = (useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().limit(80).toArray()) || []) as Notification[];
  const unread = items.filter(n => !n.readAt).length;
  const open = async (n: Notification) => {
    if (!n.readAt) await db.notifications.update(n.id, { readAt: new Date().toISOString() });
    if (n.linkTo) router.push(resolveLegacyLink(n.linkTo));
  };
  const markAll = async () => { const now = new Date().toISOString(); for (const n of items) if (!n.readAt) await db.notifications.update(n.id, { readAt: now }); };
  return (
    <PageShell width="max-w-3xl">
      <PageHeader back="/profile" eyebrow="Inbox" title={unread ? `${unread} new.` : 'All caught up.'} subtitle="Landings, texts, the house, the shop." actions={unread ? <Button size="sm" variant="secondary" onClick={markAll}><Check size={13} /> Mark read</Button> : undefined} />
      {items.length === 0 ? <EmptyState icon={<Bell size={16} />} title="Nothing yet" body="Fly somewhere. The world will start writing." /> : (
        <ul className="divide-y divide-white/8 rounded-3xl border border-white/8 bg-white/[0.03] overflow-hidden">
          {items.map(n => (
            <li key={n.id}><button onClick={() => open(n)} className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.04] text-left">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.readAt ? 'bg-white/5 text-zinc-500' : 'bg-[var(--accent)]/15 text-[var(--accent)]'}`}>{ICON[n.type] || <Bell size={15} />}</div>
              <div className="flex-1 min-w-0"><div className={`text-[14px] ${n.readAt ? 'text-zinc-300' : 'text-white'}`}>{n.title}</div><div className="text-[12.5px] text-zinc-500 line-clamp-2">{n.body}</div><div className="text-[10.5px] font-mono text-zinc-600 mt-1">{new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div></div>
              {n.linkTo && <ChevronRight size={14} className="text-zinc-600 mt-2" />}
            </button></li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
