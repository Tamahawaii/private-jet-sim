'use client';
import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageCircle, Heart, MapPin, Plus, Sparkles, Plane } from 'lucide-react';
import { db } from '../../lib/db';
import { routes } from '../../lib/routes';
import { Persona, PersonaState, DMThread, Relationship } from '../../types';
import { getAirport, shortCity } from '../../lib/flight/airports';
import { relationshipId } from '../../lib/relationships/affinity';
import { PersonaAvatar, personaGradient, personaRole, statusLabel } from '../components/PersonaAvatar';
import { PageShell, PageHeader, Tabs, Button, Chip, money } from '../components/ui';

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'gold' | 'rose' | 'mint' | 'amber' | 'magenta'> = { strangers: 'neutral', acquaintances: 'neutral', friends: 'accent', 'close-friends': 'accent', flirting: 'rose', 'romantic-interest': 'rose', dating: 'rose', situationship: 'rose', 'intimate-occasional': 'rose', partners: 'gold', married: 'gold', estranged: 'amber', rivals: 'magenta', enemies: 'magenta' };

function SocialHub() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<'circle' | 'chats' | 'nearby'>((search.get('tab') as 'circle' | 'chats' | 'nearby') || 'circle');
  useEffect(() => { const t = search.get('tab'); if (t === 'chats' || t === 'nearby' || t === 'circle') setTab(t); }, [search]);
  const personas = (useLiveQuery(() => db.personas.toArray()) || []) as Persona[];
  const states = (useLiveQuery(() => db.personaState.toArray()) || []) as PersonaState[];
  const threads = (useLiveQuery(() => db.dmThreads.toArray()) || []) as DMThread[];
  const relationships = (useLiveQuery(() => db.relationships.toArray()) || []) as Relationship[];
  const player = useLiveQuery(() => db.player.get('player'));

  const roster = useMemo(() => personas.map(p => {
    const st = states.find(s => s.personaId === p.id);
    const rel = relationships.find(r => r.id === relationshipId('player', p.id));
    const thread = threads.find(t => t.personaId === p.id);
    const here = getAirport(st?.currentLocationICAO);
    return { p, st, rel, thread, here, warmth: rel ? rel.metrics.affection + rel.metrics.heat * 0.5 + rel.metrics.trust * 0.5 : 0 };
  }).sort((a, b) => b.warmth - a.warmth), [personas, states, relationships, threads]);
  const unread = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);
  const nearby = roster.filter(r => r.st?.currentLocationICAO && r.st.currentLocationICAO === player?.currentLocationICAO);
  const chats = roster.filter(r => r.thread && r.thread.messages.length > 0).sort((a, b) => new Date(b.thread!.lastMessageAt).getTime() - new Date(a.thread!.lastMessageAt).getTime());

  return (
    <PageShell width="max-w-6xl">
      <PageHeader eyebrow="Social" title={tab === 'chats' ? 'Messages.' : tab === 'nearby' ? `In ${shortCity(getAirport(player?.currentLocationICAO), 'town')}.` : 'Your circle.'} subtitle={`${personas.length} people · ${unread ? `${unread} unread` : 'inbox clear'}`} actions={<Button variant="secondary" size="sm" onClick={() => router.push('/social/custom/new')}><Plus size={14} /> New persona</Button>} />
      <Tabs tabs={[{ id: 'circle', label: 'Circle', count: personas.length }, { id: 'chats', label: 'Chats', count: unread || undefined }, { id: 'nearby', label: 'Nearby', count: nearby.length }]} value={tab} onChange={setTab} />

      {tab === 'circle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {roster.map(({ p, st, rel, thread, here }) => (
            <div key={p.id} className="rounded-3xl border border-white/8 bg-white/[0.03] hover:border-[var(--rose)]/40 transition-colors overflow-hidden">
              <button onClick={() => router.push(routes.persona(p.id))} className="w-full text-left">
                <div className="h-20 relative" style={{ background: personaGradient(p) }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-transparent to-transparent" />
                  <div className="absolute top-3 right-3 flex gap-1.5">{rel && rel.status !== 'strangers' && <Chip tone={STATUS_TONE[rel.status] || 'neutral'}>{statusLabel(rel.status)}</Chip>}{thread && (thread.unreadCount || 0) > 0 && <Chip tone="magenta">{thread.unreadCount} new</Chip>}</div>
                </div>
                <div className="px-4 -mt-9 relative">
                  <PersonaAvatar persona={p} size={64} className="border-[3px] border-[#070b12]" />
                  <div className="mt-2 font-serif text-[20px] text-white leading-tight">{p.displayName}</div>
                  <div className="text-[12px] text-zinc-500">{personaRole(p)} · {money(p.netWorth)}</div>
                  <div className="text-[12px] text-zinc-400 mt-1.5 flex items-center gap-1.5"><MapPin size={11} className="text-[var(--rose)]" /> {here ? shortCity(here) : st?.currentLocationICAO || 'Somewhere'}{st?.mood && st.mood !== 'neutral' ? ` · feeling ${st.mood}` : ''}</div>
                </div>
              </button>
              <div className="flex gap-2 p-4 pt-3">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => router.push(routes.dm(p.id))}><MessageCircle size={13} /> Text</Button>
                <Button size="sm" variant="ghost" onClick={() => router.push(routes.persona(p.id))}>Dossier</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'chats' && (
        chats.length === 0 ? <div className="text-[13px] text-zinc-500">No conversations yet. Text someone, or fly somewhere — they'll text you.</div> : (
          <ul className="divide-y divide-white/8 rounded-3xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {chats.map(({ p, thread }) => { const last = thread!.messages[thread!.messages.length - 1]; return (
              <li key={p.id}><button onClick={() => router.push(routes.dm(p.id))} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] text-left">
                <PersonaAvatar persona={p} size={44} />
                <div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2"><span className="text-[14px] text-white truncate">{p.displayName}</span><span className="text-[10.5px] font-mono text-zinc-500 shrink-0">{new Date(thread!.lastMessageAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div><div className={`text-[12.5px] truncate ${thread!.unreadCount ? 'text-white' : 'text-zinc-500'}`}>{last?.from === 'player' ? 'You: ' : ''}{last?.content}</div></div>
                {thread!.unreadCount ? <span className="w-5 h-5 rounded-full bg-[var(--magenta)] text-white text-[10px] font-bold flex items-center justify-center">{thread!.unreadCount}</span> : null}
              </button></li>
            ); })}
          </ul>
        )
      )}

      {tab === 'nearby' && (
        nearby.length === 0 ? <div className="text-[13px] text-zinc-500 rounded-3xl border border-dashed border-white/12 p-8 text-center"><Plane size={18} className="mx-auto mb-2 text-zinc-500" />Nobody from your circle is where you are. Fly to them, or host something and they will come.</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{nearby.map(({ p, rel }) => (
            <div key={p.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-3"><PersonaAvatar persona={p} size={48} /><div className="flex-1 min-w-0"><div className="text-[14px] text-white">{p.displayName}</div><div className="text-[12px] text-zinc-500 flex items-center gap-1"><Heart size={11} className="text-[var(--rose)]" /> {statusLabel(rel?.status)}</div></div><Button size="sm" onClick={() => router.push(routes.dm(p.id))}><Sparkles size={13} /> Plan tonight</Button></div>
          ))}</div>
        )
      )}
    </PageShell>
  );
}

export default function Page() { return <Suspense fallback={null}><SocialHub /></Suspense>; }
