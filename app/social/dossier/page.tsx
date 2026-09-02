'use client';
import React, { useState, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, MapPin, Plane, Heart, Briefcase, Activity, PawPrint, Users, Gift, Pencil, Trash2, Navigation2, Sparkles } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { db } from '../../../lib/db';
import { routes } from '../../../lib/routes';
import { relationshipId, relationshipDepth } from '../../../lib/relationships/affinity';
import { GiftModal } from '../../components/social/GiftModal';
import { PersonaAvatar, personaGradient, personaRole, statusLabel } from '../../components/PersonaAvatar';
import { getAirport, placeLine } from '../../../lib/flight/airports';
import { useStore } from '../../lib/store';
import { PageShell, Button, Chip, Stat, money } from '../../components/ui';

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'gold' | 'rose' | 'mint' | 'amber' | 'magenta'> = { strangers: 'neutral', acquaintances: 'neutral', friends: 'accent', 'close-friends': 'accent', flirting: 'rose', 'romantic-interest': 'rose', dating: 'rose', situationship: 'rose', 'intimate-occasional': 'rose', partners: 'gold', married: 'gold', estranged: 'amber', rivals: 'magenta', enemies: 'magenta' };

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 md:p-5"><div className="eyebrow mb-3 flex items-center gap-1.5">{icon} {title}</div>{children}</section>;
}

function PersonaDossier() {
   const search = useSearchParams();
   const id = search.get('id') || '';
   const router = useRouter();
   const [giftOpen, setGiftOpen] = useState(false);
   const persona = useLiveQuery(() => db.personas.get(id), [id]);
   const state = useLiveQuery(() => db.personaState.where('personaId').equals(id).first(), [id]);
   const pets = useLiveQuery(() => db.pets.where('ownerId').equals(id).toArray(), [id]) || [];
   const player = useLiveQuery(() => db.player.get('player'));
   const myRelId = relationshipId('player', id);
   const myRel = useLiveQuery(() => db.relationships.get(myRelId), [myRelId]);
   const allRels = useLiveQuery(() => db.relationships.toArray()) || [];
   const allPersonas = useLiveQuery(() => db.personas.toArray()) || [];
   const giftsSent = useLiveQuery(() => db.giftsSent.where('toId').equals(id).reverse().sortBy('sentAt'), [id]) || [];
   const giftCatalog = useLiveQuery(() => db.giftItems.toArray()) || [];
   const flightsTogether = useLiveQuery(() => db.flights.filter(f => f.arrivedAt !== null && (f.passengers || []).includes(id)).count(), [id]) || 0;

   if (persona === undefined) return <PageShell><div className="pt-10 text-zinc-500 text-sm">Opening the file…</div></PageShell>;
   if (!persona) return <PageShell><div className="pt-10 text-zinc-500 text-sm">Persona not found.</div></PageShell>;

   const depth = myRel ? relationshipDepth(myRel.metrics) : 0;
   const connections = allRels.filter(r => r.id !== myRelId && (r.participantA === id || r.participantB === id) && (r.isPubliclyKnown || depth > 50));
   const m = myRel?.metrics || { affection: 0, trust: 0, heat: 0, romanticTension: 0, rivalry: 0 };
   const radarData = [{ axis: 'Affection', value: m.affection }, { axis: 'Trust', value: m.trust }, { axis: 'Heat', value: m.heat }, { axis: 'Romance', value: m.romanticTension }, { axis: 'Rivalry', value: m.rivalry }];
   const here = getAirport(state?.currentLocationICAO);
   const sameCity = !!state?.currentLocationICAO && state.currentLocationICAO === player?.currentLocationICAO;

   return (
      <PageShell>
         {/* Hero */}
         <div className="relative rounded-3xl overflow-hidden border border-white/8 mt-4" style={{ background: personaGradient(persona) }}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/30 to-transparent" />
            <div className="relative p-5 md:p-7 flex flex-col md:flex-row md:items-end gap-4">
               <PersonaAvatar persona={persona} size={132} shape="squircle" className="border-[3px] border-[#070b12] shadow-2xl" />
               <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">{myRel && <Chip tone={STATUS_TONE[myRel.status] || 'neutral'}>{statusLabel(myRel.status)}</Chip>}<Chip tone="gold">Tier {persona.wealthTier}</Chip>{sameCity && <Chip tone="accent">In your city</Chip>}{persona.isCustom && <Chip>Custom</Chip>}</div>
                  <h1 className="font-serif text-[32px] md:text-[40px] leading-[1.05] text-white">{persona.displayName}</h1>
                  <div className="text-[13px] text-zinc-300 mt-1">{[personaRole(persona), persona.age ? `${persona.age}` : '', persona.archetype ? persona.region : ''].filter(Boolean).join(' · ')}</div>
                  <div className="text-[12.5px] text-zinc-400 mt-1 flex items-center gap-1.5"><MapPin size={12} className="text-[var(--rose)]" /> {here ? placeLine(here) : state?.currentLocationICAO || 'Somewhere'}{state?.mood && state.mood !== 'neutral' ? ` · ${state.mood}` : ''}</div>
               </div>
            </div>
            <div className="relative px-5 md:px-7 pb-5 flex flex-wrap gap-2">
               <Button size="sm" onClick={() => router.push(routes.dm(persona.id))}><MessageCircle size={13} /> Text</Button>
               <Button size="sm" variant="gold" onClick={() => setGiftOpen(true)}><Gift size={13} /> Send a gift</Button>
               <Button size="sm" variant="secondary" onClick={() => router.push(sameCity ? routes.planner({}) : routes.planner({ destination: state?.currentLocationICAO || undefined }))}><Navigation2 size={13} /> {sameCity ? 'Fly somewhere together' : `Fly to ${here ? here.city?.split(',')[0] : 'them'}`}</Button>
               {persona.isCustom && <><Button size="sm" variant="ghost" onClick={() => router.push(routes.customPersonaEdit(persona.id))}><Pencil size={13} /> Edit</Button><Button size="sm" variant="ghost" onClick={async () => { if (prompt('Type DELETE to remove this persona:') === 'DELETE') { await db.transaction('rw', [db.personas, db.personaState, db.dmThreads], async () => { await db.dmThreads.where('personaId').equals(persona.id).delete(); await db.personaState.delete(persona.id); await db.personas.delete(persona.id); }); router.push('/social'); } }}><Trash2 size={13} /></Button></>}
            </div>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
            <Stat label="Net worth" value={money(persona.netWorth)} />
            <Stat label="Closeness" value={`${Math.round(depth)}`} sub="of 100" />
            <Stat label="Flights together" value={flightsTogether} />
            <Stat label="Gifts" value={giftsSent.length} sub={giftsSent[0] ? `last ${new Date(giftsSent[0].sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : undefined} />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
            <div className="lg:col-span-3 space-y-4">
               <Section icon={<Briefcase size={11} />} title="Background"><p className="text-[14.5px] text-zinc-200 leading-relaxed font-serif">{persona.background}</p>{persona.bio && <p className="text-[13px] text-zinc-400 leading-relaxed mt-3">{persona.bio}</p>}</Section>
               {persona.playerDynamic && <Section icon={<Sparkles size={11} />} title="Between you two"><p className="text-[14px] text-[var(--rose)]/90 leading-relaxed font-serif">{persona.playerDynamic}</p></Section>}
               {persona.drama && <Section icon={<Activity size={11} />} title="Current drama"><p className="text-[13.5px] text-zinc-300 leading-relaxed italic border-l-2 border-[var(--rose)]/40 pl-3">{persona.drama}</p></Section>}
               <Section icon={<Heart size={11} />} title="Identity">
                  <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                     <div className="bg-black/25 rounded-xl p-3"><div className="eyebrow mb-1">Pronouns</div><div className="text-white capitalize">{persona.gender} · {persona.pronouns}</div></div>
                     <div className="bg-black/25 rounded-xl p-3"><div className="eyebrow mb-1">Orientation</div><div className="text-white capitalize">{persona.publicOrientation}</div></div>
                     <div className="bg-black/25 rounded-xl p-3 col-span-2"><div className="eyebrow mb-1">Relationship style</div><div className="text-white">{persona.relationshipStyle}</div></div>
                  </div>
                  {persona.currentPartners && persona.currentPartners.length > 0 && <div className="mt-3 space-y-2">{persona.currentPartners.map((pt, i) => <div key={i} className="bg-black/25 rounded-xl p-3 flex items-start justify-between gap-2"><div><div className="text-[13px] text-white">{pt.name}</div><div className="text-[11.5px] text-zinc-500 capitalize">{pt.relationship}{pt.location ? ` · ${pt.location}` : ''}{pt.note ? ` — “${pt.note}”` : ''}</div></div><Chip tone="rose">{pt.status}</Chip></div>)}</div>}
               </Section>
               {(persona.tastes || persona.interests?.length) && (
                  <Section icon={<Sparkles size={11} />} title="Tastes">
                     <div className="grid grid-cols-2 gap-2 text-[12.5px]">{Object.entries(persona.tastes || {}).filter(([, v]) => v).map(([k, v]) => <div key={k} className="bg-black/25 rounded-xl p-3"><div className="eyebrow mb-1">{k}</div><div className="text-white">{v}</div></div>)}</div>
                     {persona.interests?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{persona.interests.map(i => <span key={i} className="text-[11.5px] px-2.5 py-1 rounded-lg bg-white/5 text-zinc-200">{i}</span>)}</div>}
                  </Section>
               )}
               {pets.length > 0 && <Section icon={<PawPrint size={11} />} title="Companions"><div className="flex flex-wrap gap-2">{pets.map(pet => <div key={pet.id} className="flex items-center gap-3 bg-black/25 rounded-2xl px-3 py-2"><div className="w-9 h-9 rounded-full bg-[var(--rose)]/12 flex items-center justify-center text-lg">{pet.species === 'cat' ? '🐈' : pet.species === 'dog' ? '🐕' : '🐾'}</div><div><div className="text-[13px] text-white">{pet.name} <span className="text-zinc-500 text-[11px]">· {pet.breed}</span></div><div className="text-[11.5px] text-zinc-400">{pet.personality}</div></div></div>)}</div></Section>}
            </div>
            <div className="lg:col-span-2 space-y-4">
               <Section icon={<Heart size={11} />} title="With you">
                  <div className="w-full h-56 -mt-2"><ResponsiveContainer><RadarChart data={radarData}><PolarGrid stroke="rgba(255,255,255,0.12)" /><PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#8b93a1' }} /><PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} /><Radar dataKey="value" stroke="#f5a7a7" fill="#f5a7a7" fillOpacity={0.3} animationDuration={600} /></RadarChart></ResponsiveContainer></div>
                  {myRel && myRel.history && myRel.history.length > 0 && <div className="border-t border-white/8 pt-3 mt-1 space-y-2">{myRel.history.slice().reverse().slice(0, 5).map((ev: { id: string; description: string; at: string }) => <div key={ev.id} className="text-[12px]"><div className="text-white">{ev.description}</div><div className="text-[10.5px] font-mono text-zinc-500">{new Date(ev.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>)}</div>}
               </Section>
               {giftsSent.length > 0 && <Section icon={<Gift size={11} />} title="Gifts you sent"><ul className="space-y-2">{giftsSent.slice(0, 5).map(g => { const item = giftCatalog.find(x => x.id === g.giftItemId); return <li key={g.id} className="text-[12.5px] flex justify-between gap-2"><span className="text-white">{item?.name || 'Gift'}</span><span className="text-zinc-500 font-mono">{new Date(g.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></li>; })}</ul></Section>}
               {connections.length > 0 && <Section icon={<Users size={11} />} title="Their circle"><ul className="space-y-2">{connections.map(r => { const otherId = r.participantA === id ? r.participantB : r.participantA; const other = allPersonas.find(p => p.id === otherId); if (!other) return null; return <li key={r.id}><button onClick={() => router.push(routes.persona(other.id))} className="w-full flex items-center gap-2 text-left"><PersonaAvatar persona={other} size={28} /><span className="text-[13px] text-white flex-1 truncate">{other.displayName}</span><Chip tone={STATUS_TONE[r.status] || 'neutral'}>{statusLabel(r.status)}</Chip></button></li>; })}</ul></Section>}
               {persona.fleet?.length > 0 && <Section icon={<Plane size={11} />} title="Their fleet"><ul className="space-y-1.5">{persona.fleet.map(f => <li key={f.tailNumber} className="text-[12.5px] flex justify-between"><span className="text-white">{f.model}</span><span className="font-mono text-zinc-500">{f.tailNumber}</span></li>)}</ul></Section>}
            </div>
         </div>
         {giftOpen && <GiftModal personaId={persona.id} personaName={persona.displayName} onClose={() => setGiftOpen(false)} onGiftSent={() => setGiftOpen(false)} />}
      </PageShell>
   );
}

export default function Page() { return <Suspense fallback={null}><PersonaDossier /></Suspense>; }
