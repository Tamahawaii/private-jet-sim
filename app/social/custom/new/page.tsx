'use client';
import { apiFetch } from '../../../../lib/api';
import { routes } from '../../../../lib/routes';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../../lib/db';
import { ArrowLeft, Wand2, Settings2, Globe, Heart, Activity, Briefcase } from 'lucide-react';
import { seedPlayerRelationship } from '../../../../lib/relationships/helpers';

export default function CustomPersonaNew() {
   const router = useRouter();
   const [mode, setMode] = useState<'GUIDED' | 'ADVANCED'>('GUIDED');
   const [loading, setLoading] = useState(false);
   const [preview, setPreview] = useState<any>(null);

   // Guided form state
   const [seed, setSeed] = useState({
      displayName: '',
      age: 30,
      region: '',
      archetypeHint: ''
   });

   // Advanced form state
   const [advanced, setAdvanced] = useState({
      displayName: '', age: 30, region: '', wealthTier: 2, netWorth: 2000000000,
      gender: 'woman', pronouns: 'she/her', publicOrientation: 'straight',
      privateOrientation: 'straight', publicRelationshipStatus: 'single', 
      relationshipStyle: 'monogamous', orientationFlexibility: 50,
      voiceStyle: '', playerDynamic: '', drama: '', background: '',
      interests: '', tastesMusic: '', tastesDrinks: '', tastesWears: '', 
      tastesDrives: '', tastesAesthetic: ''
   });

   const generateId = (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const hash = Math.random().toString(16).slice(2, 6);
      return `${slug}-${hash}`;
   };

   const handleGenerateGuided = async () => {
      if (!seed.displayName || !seed.region || !seed.archetypeHint) return;
      setLoading(true);
      try {
         const res = await apiFetch('/api/personas/custom', { method: 'POST', body: JSON.stringify(seed)
         });
         const data = await res.json();
         if (data.error) throw new Error(data.error);
         
         const newPersona = {
            id: generateId(seed.displayName),
            displayName: seed.displayName,
            age: Number(seed.age),
            region: seed.region,
            ...data,
            fleet: [],
            preferredResorts: [],
            pets: [],
            imageUrl: null,
            isCustom: true,
            createdBy: 'player',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
         };
         setPreview(newPersona);
      } catch (err) {
         console.error(err);
         alert("Failed to generate persona.");
      } finally {
         setLoading(false);
      }
   };

   const savePersona = async (personaObj: any) => {
      // Illustrated portrait, generated on-device (deterministic from the persona id)
      try {
         const { portraitDataUri } = await import('../../../../lib/avatars/generate');
         personaObj.imageUrl = portraitDataUri(personaObj.id, { gender: personaObj.gender, age: personaObj.age });
      } catch (e) { console.warn('portrait generation failed', e); }
      await db.personas.put(personaObj);
      await db.personaState.put({
         personaId: personaObj.id,
         currentLocationICAO: 'KJFK',
         currentFlightState: null,
         nextPlannedFlight: null,
         friendshipWithPlayer: 0,
         relationshipDepth: 0,
         lastInteractionAt: null,
         mood: 'neutral',
         rivalryTargets: []
      });
      await seedPlayerRelationship(personaObj.id);
      router.push(routes.persona(personaObj.id));
   };

   const handleSaveAdvanced = async () => {
      if (!advanced.displayName) return;
      const personaObj = {
         id: generateId(advanced.displayName),
         displayName: advanced.displayName,
         age: Number(advanced.age),
         region: advanced.region,
         wealthTier: Number(advanced.wealthTier),
         netWorth: Number(advanced.netWorth),
         gender: advanced.gender,
         pronouns: advanced.pronouns,
         publicOrientation: advanced.publicOrientation,
         privateOrientation: advanced.publicOrientation,
         publicRelationshipStatus: advanced.publicRelationshipStatus,
         relationshipStyle: advanced.relationshipStyle,
         orientationFlexibility: String(advanced.orientationFlexibility || "50"),
         personality: ["ambitious"],
         interests: advanced.interests.split(',').map((s: string) => s.trim()),
         tastes: {
            music: advanced.tastesMusic,
            drinks: advanced.tastesDrinks,
            wears: advanced.tastesWears,
            drives: advanced.tastesDrives,
            aesthetic: advanced.tastesAesthetic
         },
         voiceStyle: advanced.voiceStyle,
         playerDynamic: advanced.playerDynamic,
         drama: advanced.drama,
         background: advanced.background,
         currentPartners: [],
         residences: [advanced.region],
         fleet: [],
         preferredResorts: [],
         pets: [],
         imageUrl: null,
         isCustom: true,
         createdBy: 'player',
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
      };
      await savePersona(personaObj);
   };

   return (
      <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
         <div className="max-w-4xl mx-auto flex flex-col gap-8">
            <div className="flex items-end justify-between border-b border-white/10 pb-4">
               <div>
                  <button onClick={() => router.push('/social')} className="text-zinc-500 hover:text-white transition-colors mb-4 flex items-center gap-2 text-xs font-mono tracking-widest uppercase">
                     <ArrowLeft size={14} /> Back to Social
                  </button>
                  <h1 className="text-3xl font-black tracking-widest uppercase text-[#f5a7a7]">CREATE PERSONA</h1>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => { setMode('GUIDED'); setPreview(null); }} className={`px-4 py-2 font-mono text-xs tracking-widest font-bold border rounded flex items-center gap-2 ${mode === 'GUIDED' ? 'bg-white/10 border-white/30 text-white' : 'border-transparent text-zinc-600 hover:text-white hover:bg-white/5'}`}>
                     <Wand2 size={14}/> GUIDED
                  </button>
                  <button onClick={() => setMode('ADVANCED')} className={`px-4 py-2 font-mono text-xs tracking-widest font-bold border rounded flex items-center gap-2 ${mode === 'ADVANCED' ? 'bg-white/10 border-white/30 text-white' : 'border-transparent text-zinc-600 hover:text-white hover:bg-white/5'}`}>
                     <Settings2 size={14}/> ADVANCED
                  </button>
               </div>
            </div>

            {mode === 'GUIDED' && (
               <div className="flex flex-col gap-6">
                  {!preview ? (
                     <div className="bg-[#141419] border border-white/10 rounded-xl p-8 flex flex-col gap-6 max-w-2xl">
                        <p className="text-sm font-serif text-zinc-400 italic">Describe the essence of your new connection. Our narrative engine (Claude Sonnet) will hallucinate their complete psychological profile, tastes, backstory, and distinctive vocal style.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col gap-2">
                              <label className="text-xs font-mono tracking-widest text-[#f5a7a7]">Full Name</label>
                              <input type="text" value={seed.displayName} onChange={e => setSeed({...seed, displayName: e.target.value})} className="bg-black border border-white/10 rounded px-4 py-2 font-serif text-sm focus:outline-none focus:border-[#f5a7a7]/50" placeholder="Lucas Vancetti" />
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-xs font-mono tracking-widest text-[#f5a7a7]">Age</label>
                              <input type="number" value={seed.age} onChange={e => setSeed({...seed, age: parseInt(e.target.value)})} className="bg-black border border-white/10 rounded px-4 py-2 font-serif text-sm focus:outline-none focus:border-[#f5a7a7]/50" placeholder="30" />
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <label className="text-xs font-mono tracking-widest text-[#f5a7a7]">Base Region / Location</label>
                           <input type="text" value={seed.region} onChange={e => setSeed({...seed, region: e.target.value})} className="bg-black border border-white/10 rounded px-4 py-2 font-serif text-sm focus:outline-none focus:border-[#f5a7a7]/50" placeholder="Paris, France" />
                        </div>

                        <div className="flex flex-col gap-2">
                           <label className="text-xs font-mono tracking-widest text-[#f5a7a7]">Archetype Hint</label>
                           <textarea value={seed.archetypeHint} onChange={e => setSeed({...seed, archetypeHint: e.target.value})} className="bg-black border border-white/10 rounded px-4 py-3 font-serif text-sm min-h-[100px] focus:outline-none focus:border-[#f5a7a7]/50" placeholder="A jaded music executive who secretly writes poetry..." />
                        </div>

                        <button onClick={handleGenerateGuided} disabled={loading} className="mt-4 bg-[#f5a7a7] hover:bg-[#f5a7a7]/90 text-black py-3 rounded font-bold font-mono tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                           {loading ? 'GENERATING NEURAL SEED...' : <><Wand2 size={16}/> GENERATE PERSONA</>}
                        </button>
                     </div>
                  ) : (
                     <div className="bg-[#141419] border border-[#f5a7a7]/30 rounded-xl p-8 flex flex-col gap-8">
                        <div className="flex justify-between items-start">
                           <div>
                              <h2 className="text-3xl font-black tracking-widest uppercase">{preview.displayName}</h2>
                              <span className="text-xs font-mono text-zinc-500 uppercase">{preview.age} YEARS OLD • {preview.region} • TIER {preview.wealthTier}</span>
                           </div>
                           <span className="bg-[#f5a7a7]/10 text-[#f5a7a7] border border-[#f5a7a7]/30 px-3 py-1 rounded text-xs font-mono font-bold tracking-widest">
                              ${(preview.netWorth / 1e9).toFixed(1)}B NW
                           </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8 text-sm">
                           <div className="flex flex-col gap-4">
                              <div><strong className="text-[#f5a7a7] font-mono text-xs tracking-widest">BACKGROUND:</strong><p className="mt-1 text-zinc-300 italic">{preview.background}</p></div>
                              <div><strong className="text-[#f5a7a7] font-mono text-xs tracking-widest">DRAMA:</strong><p className="mt-1 text-zinc-300">{preview.drama}</p></div>
                           </div>
                           <div className="flex flex-col gap-4">
                              <div><strong className="text-[#f5a7a7] font-mono text-xs tracking-widest">PLAYER DYNAMIC:</strong><p className="mt-1 text-zinc-300">{preview.playerDynamic}</p></div>
                              <div><strong className="text-[#f5a7a7] font-mono text-xs tracking-widest">VOICE STYLE:</strong><p className="mt-1 text-zinc-400 text-xs font-mono">{preview.voiceStyle}</p></div>
                           </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                           <button onClick={() => savePersona(preview)} className="flex-1 bg-[#f5a7a7] hover:bg-white text-black py-4 rounded font-bold font-mono tracking-widest transition-colors">
                              ACCEPT & SAVE TO NETWORK
                           </button>
                           <button onClick={() => setPreview(null)} className="px-8 border border-white/20 hover:bg-white/5 py-4 rounded font-bold font-mono tracking-widest transition-colors">
                              DISCARD
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            )}

            {mode === 'ADVANCED' && (
               <div className="bg-[#141419] border border-white/10 rounded-xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Info */}
                  <div className="flex flex-col gap-4">
                     <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest border-b border-white/10 pb-2">Core Identity</h3>
                     <input type="text" value={advanced.displayName} onChange={e => setAdvanced({...advanced, displayName: e.target.value})} placeholder="Display Name" className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded"/>
                     <input type="number" value={advanced.age} onChange={e => setAdvanced({...advanced, age: parseInt(e.target.value)})} placeholder="Age" className="bg-black border border-white/10 p-2 text-sm max-w-[100px] rounded"/>
                     <input type="text" value={advanced.region} onChange={e => setAdvanced({...advanced, region: e.target.value})} placeholder="Region (Paris, France)" className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded"/>
                     <input type="number" value={advanced.wealthTier} onChange={e => setAdvanced({...advanced, wealthTier: parseInt(e.target.value)})} placeholder="Wealth Tier (1-5)" className="bg-black border border-white/10 p-2 text-sm max-w-[100px] rounded"/>
                     <input type="number" value={advanced.netWorth} onChange={e => setAdvanced({...advanced, netWorth: parseInt(e.target.value)})} placeholder="Net Worth (Raw Dollars e.g. 5000000000)" className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded"/>
                  </div>
                  {/* Identity & Relationships */}
                  <div className="flex flex-col gap-4">
                     <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest border-b border-white/10 pb-2">Identity & Relationships</h3>
                     <select value={advanced.gender} onChange={e => setAdvanced({...advanced, gender: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded">
                        <option value="man">Man</option>
                        <option value="woman">Woman</option>
                        <option value="non-binary">Non-Binary</option>
                     </select>
                     <select value={advanced.pronouns} onChange={e => setAdvanced({...advanced, pronouns: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded">
                        <option value="he/him">he/him</option>
                        <option value="she/her">she/her</option>
                        <option value="they/them">they/them</option>
                        <option value="she/they">she/they</option>
                        <option value="he/they">he/they</option>
                        <option value="any">any</option>
                     </select>
                     <select value={advanced.publicOrientation} onChange={e => setAdvanced({...advanced, publicOrientation: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded">
                        <option value="straight">Straight</option>
                        <option value="gay">Gay</option>
                        <option value="lesbian">Lesbian</option>
                        <option value="bisexual">Bisexual</option>
                        <option value="queer">Queer</option>
                        <option value="pansexual">Pansexual</option>
                     </select>
                     <select value={advanced.privateOrientation} onChange={e => setAdvanced({...advanced, privateOrientation: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded">
                        <option value="straight">Straight</option>
                        <option value="gay">Gay</option>
                        <option value="lesbian">Lesbian</option>
                        <option value="bisexual">Bisexual</option>
                        <option value="queer">Queer</option>
                        <option value="pansexual">Pansexual</option>
                     </select>
                     <select value={advanced.publicRelationshipStatus} onChange={e => setAdvanced({...advanced, publicRelationshipStatus: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded">
                        <option value="single">Single</option>
                        <option value="dating">Dating</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="complicated">It's Complicated</option>
                     </select>
                     <select value={advanced.relationshipStyle} onChange={e => setAdvanced({...advanced, relationshipStyle: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded">
                        <option value="monogamous">Monogamous</option>
                        <option value="open">Open</option>
                        <option value="polyamorous">Polyamorous</option>
                     </select>
                     <input type="number" value={advanced.orientationFlexibility} onChange={e => setAdvanced({...advanced, orientationFlexibility: parseInt(e.target.value)})} placeholder="Orientation Flexibility (0-100)" className="bg-black border border-white/10 p-2 text-sm max-w-[200px] rounded"/>
                  </div>
                  {/* Persona Config */}
                  <div className="flex flex-col gap-4">
                     <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest border-b border-white/10 pb-2">Narrative Settings</h3>
                     <textarea value={advanced.background} onChange={e => setAdvanced({...advanced, background: e.target.value})} placeholder="Background" className="bg-black border border-white/10 p-2 text-sm h-24 rounded"/>
                     <textarea value={advanced.voiceStyle} onChange={e => setAdvanced({...advanced, voiceStyle: e.target.value})} placeholder="Voice Style Options" className="bg-black border border-white/10 p-2 text-sm h-24 rounded"/>
                     <textarea value={advanced.drama} onChange={e => setAdvanced({...advanced, drama: e.target.value})} placeholder="Current Drama" className="bg-black border border-white/10 p-2 text-sm h-24 rounded"/>
                     <textarea value={advanced.playerDynamic} onChange={e => setAdvanced({...advanced, playerDynamic: e.target.value})} placeholder="Player Dynamic" className="bg-black border border-white/10 p-2 text-sm h-24 rounded"/>
                  </div>

                  <div className="col-span-full mt-4">
                     <button onClick={handleSaveAdvanced} className="w-full bg-zinc-100 hover:bg-white text-black py-4 rounded font-bold font-mono tracking-widest transition-colors text-lg">
                        SAVE PERSONA MANUALLY
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}
