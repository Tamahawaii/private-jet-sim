'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../../../lib/db';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export default function CustomPersonaEdit({ params }: { params: Promise<{ id: string }> }) {
   const resolvedParams = use(params);
   const router = useRouter();
   const persona = useLiveQuery(() => db.personas.get(resolvedParams.id), [resolvedParams.id]);
   
   const [advanced, setAdvanced] = useState<any>(null);

   useEffect(() => {
      if (persona && persona.isCustom) {
         setAdvanced({
            ...persona,
            interests: persona.interests ? persona.interests.join(', ') : '',
            tastesMusic: persona.tastes?.music || '',
            tastesDrinks: persona.tastes?.drinks || '',
            tastesWears: persona.tastes?.wears || '',
            tastesDrives: persona.tastes?.drives || '',
            tastesAesthetic: persona.tastes?.aesthetic || ''
         });
      }
   }, [persona]);

   if (!persona) return null;
   if (!persona.isCustom) return <div className="p-10 text-white">Canonical personas cannot be edited.</div>;
   if (!advanced) return null;

   const handleSaveAdvanced = async () => {
      if (!advanced.displayName) return;
      const personaObj = {
         ...persona,
         displayName: advanced.displayName,
         age: Number(advanced.age),
         region: advanced.region,
         wealthTier: Number(advanced.wealthTier) as 1 | 2 | 3 | 4 | 5,
         netWorth: Number(advanced.netWorth),
         gender: advanced.gender,
         pronouns: advanced.pronouns,
         publicOrientation: advanced.publicOrientation,
         privateOrientation: advanced.privateOrientation,
         publicRelationshipStatus: advanced.publicRelationshipStatus,
         relationshipStyle: advanced.relationshipStyle,
         orientationFlexibility: String(advanced.orientationFlexibility || "50"),
         interests: advanced.interests.split(',').map((s: string) => s.trim()),
         tastes: {
            ...persona.tastes,
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
         updatedAt: new Date().toISOString()
      };
      
      await db.personas.put(personaObj);
      router.push(`/social/${personaObj.id}`);
   };

   return (
      <div className="absolute inset-0 z-40 bg-[#0a0a0c] pt-24 px-10 pb-10 overflow-y-auto text-white">
         <div className="max-w-4xl mx-auto flex flex-col gap-8">
            <div className="flex items-end justify-between border-b border-white/10 pb-4">
               <div>
                  <button onClick={() => router.push(`/social/${persona.id}`)} className="text-zinc-500 hover:text-white transition-colors mb-4 flex items-center gap-2 text-xs font-mono tracking-widest uppercase">
                     <ArrowLeft size={14} /> Back to Dossier
                  </button>
                  <h1 className="text-3xl font-black tracking-widest uppercase text-[#f5a7a7]">EDIT PERSONA: {persona.displayName}</h1>
               </div>
               <div className="flex gap-2">
                  <span className={`px-4 py-2 font-mono text-xs tracking-widest font-bold border rounded flex items-center gap-2 bg-white/10 border-white/30 text-white`}>
                     <Settings2 size={14}/> ADVANCED EDIT
                  </span>
               </div>
            </div>

            <div className="bg-[#141419] border border-[#f5a7a7]/30 shadow-2xl shadow-[#f5a7a7]/5 rounded-xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Basic Info */}
               <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-mono text-[#f5a7a7] uppercase tracking-widest border-b border-white/10 pb-2">Core Identity</h3>
                  <input type="text" value={advanced.displayName} onChange={e => setAdvanced({...advanced, displayName: e.target.value})} placeholder="Display Name" className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none"/>
                  <input type="number" value={advanced.age} onChange={e => setAdvanced({...advanced, age: parseInt(e.target.value)})} placeholder="Age" className="bg-black border border-white/10 p-2 text-sm max-w-[100px] rounded focus:border-[#f5a7a7]/50 focus:outline-none"/>
                  <input type="text" value={advanced.region} onChange={e => setAdvanced({...advanced, region: e.target.value})} placeholder="Region (Paris, France)" className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none"/>
                  <input type="number" value={advanced.wealthTier} onChange={e => setAdvanced({...advanced, wealthTier: parseInt(e.target.value)})} placeholder="Wealth Tier (1-5)" className="bg-black border border-white/10 p-2 text-sm max-w-[100px] rounded focus:border-[#f5a7a7]/50 focus:outline-none"/>
                  <input type="number" value={advanced.netWorth} onChange={e => setAdvanced({...advanced, netWorth: parseInt(e.target.value)})} placeholder="Net Worth (Raw Dollars e.g. 5000000000)" className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded font-mono focus:border-[#f5a7a7]/50 focus:outline-none"/>
               </div>
               {/* Identity & Relationships */}
               <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-mono text-[#f5a7a7] uppercase tracking-widest border-b border-white/10 pb-2">Identity & Relationships</h3>
                  <select value={advanced.gender} onChange={e => setAdvanced({...advanced, gender: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none">
                     <option value="man">Man</option>
                     <option value="woman">Woman</option>
                     <option value="non-binary">Non-Binary</option>
                  </select>
                  <select value={advanced.pronouns} onChange={e => setAdvanced({...advanced, pronouns: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none">
                     <option value="he/him">he/him</option>
                     <option value="she/her">she/her</option>
                     <option value="they/them">they/them</option>
                     <option value="she/they">she/they</option>
                     <option value="he/they">he/they</option>
                     <option value="any">any</option>
                  </select>
                  <select value={advanced.publicOrientation} onChange={e => setAdvanced({...advanced, publicOrientation: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none">
                     <option value="straight">Straight</option>
                     <option value="gay">Gay</option>
                     <option value="lesbian">Lesbian</option>
                     <option value="bisexual">Bisexual</option>
                     <option value="queer">Queer</option>
                     <option value="pansexual">Pansexual</option>
                  </select>
                  <select value={advanced.privateOrientation} onChange={e => setAdvanced({...advanced, privateOrientation: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none">
                     <option value="straight">Straight</option>
                     <option value="gay">Gay</option>
                     <option value="lesbian">Lesbian</option>
                     <option value="bisexual">Bisexual</option>
                     <option value="queer">Queer</option>
                     <option value="pansexual">Pansexual</option>
                  </select>
                  <select value={advanced.publicRelationshipStatus} onChange={e => setAdvanced({...advanced, publicRelationshipStatus: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none">
                     <option value="single">Single</option>
                     <option value="dating">Dating</option>
                     <option value="married">Married</option>
                     <option value="divorced">Divorced</option>
                     <option value="complicated">It's Complicated</option>
                  </select>
                  <select value={advanced.relationshipStyle} onChange={e => setAdvanced({...advanced, relationshipStyle: e.target.value})} className="bg-black border border-white/10 p-2 text-sm max-w-sm rounded focus:border-[#f5a7a7]/50 focus:outline-none">
                     <option value="monogamous">Monogamous</option>
                     <option value="open">Open</option>
                     <option value="polyamorous">Polyamorous</option>
                  </select>
                  <input type="number" value={advanced.orientationFlexibility} onChange={e => setAdvanced({...advanced, orientationFlexibility: parseInt(e.target.value)})} placeholder="Orientation Flexibility (0-100)" className="bg-black border border-white/10 p-2 text-sm max-w-[200px] rounded focus:border-[#f5a7a7]/50 focus:outline-none"/>
               </div>
               {/* Persona Config */}
               <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-mono text-[#f5a7a7] uppercase tracking-widest border-b border-white/10 pb-2">Narrative Settings (Raw)</h3>
                  <label className="text-xs text-zinc-500 font-mono tracking-widest mt-2">BACKGROUND</label>
                  <textarea value={advanced.background} onChange={e => setAdvanced({...advanced, background: e.target.value})} placeholder="Background" className="bg-black border border-white/10 p-3 text-sm h-32 rounded font-sans focus:border-[#f5a7a7]/50 focus:outline-none"/>
                  
                  <label className="text-xs text-zinc-500 font-mono tracking-widest mt-2">VOICE STYLE (LLM PROMPT)</label>
                  <textarea value={advanced.voiceStyle} onChange={e => setAdvanced({...advanced, voiceStyle: e.target.value})} placeholder="Voice Style Options" className="bg-black border border-white/10 p-3 text-sm h-32 rounded font-mono text-zinc-400 focus:border-[#f5a7a7]/50 focus:outline-none"/>
                  
                  <label className="text-xs text-zinc-500 font-mono tracking-widest mt-2">CURRENT DRAMA</label>
                  <textarea value={advanced.drama} onChange={e => setAdvanced({...advanced, drama: e.target.value})} placeholder="Current Drama" className="bg-black border border-white/10 p-3 text-sm h-24 rounded focus:border-[#f5a7a7]/50 focus:outline-none"/>
                  
                  <label className="text-xs text-zinc-500 font-mono tracking-widest mt-2">PLAYER DYNAMIC</label>
                  <textarea value={advanced.playerDynamic} onChange={e => setAdvanced({...advanced, playerDynamic: e.target.value})} placeholder="Player Dynamic" className="bg-black border border-white/10 p-3 text-sm h-24 rounded focus:border-[#f5a7a7]/50 focus:outline-none"/>
               </div>

               <div className="col-span-full mt-4">
                  <button onClick={handleSaveAdvanced} className="w-full bg-[#f5a7a7] hover:bg-[#f5a7a7]/90 text-black py-4 rounded font-bold font-mono tracking-widest transition-colors text-lg">
                     OVERWRITE NETWORK PERSONA
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}
