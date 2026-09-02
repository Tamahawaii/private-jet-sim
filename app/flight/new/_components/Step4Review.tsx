import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Aircraft, FlightPurpose, Flight } from '../../../../types';
import { calculateFlightBriefing, launchFlight } from '../../../../lib/simulation';
import { ArrowLeft, Clock, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { db } from '../../../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { PersonaAvatar } from '../../../components/PersonaAvatar';
import { useStore } from '../../../lib/store';
import { getAirport, shortCity, localTimeAt, countryName } from '../../../../lib/flight/airports';
import { getFlightMoments, cruiseAltitudeFor, formatDurationMs } from '../../../../lib/flight/engine';
import RoutePreviewMap from './RoutePreviewMap';

interface Props {
  aircraft: Aircraft;
  destination: any;
  passengers: string[];
  onBack: () => void;
}

function fmt(n: number) {
    return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function purposeFrom(destination: any): FlightPurpose {
   const p: string | undefined = destination?.purpose;
   if (p?.startsWith('event:')) return { type: 'event', targetId: p.slice(6), label: destination.purposeName };
   if (p?.startsWith('resort:')) return { type: 'resort', targetId: p.slice(7), label: destination.purposeName };
   return { type: 'leisure' };
}

export default function Step4Review({ aircraft, destination, passengers, onBack }: Props) {
   const router = useRouter();
   const [isLaunching, setIsLaunching] = useState(false);
   const [flightId] = useState(() => crypto.randomUUID());
   const personas = useLiveQuery(() => db.personas.where('id').anyOf(passengers).toArray(), [passengers]) || [];
   const player = useLiveQuery(() => db.player.get('player'));

   const brief = aircraft.currentLocation ? calculateFlightBriefing(
     aircraft,
     { lat: aircraft.currentLocation.lat, lng: aircraft.currentLocation.lng },
     { lat: destination.lat, lng: destination.lng }
   ) : null;

   const simNow = useStore.getState().getNow();
   const dest = getAirport(destination.icao);
   const origin = getAirport(aircraft.currentLocationICAO);
   const purpose = purposeFrom(destination);

   const highlights = useMemo(() => {
      if (!brief) return [];
      const fake: Flight = {
         id: flightId, tailNumber: aircraft.tailNumber, originICAO: aircraft.currentLocationICAO, destinationICAO: destination.icao,
         departedAt: simNow, estimatedArrivalAt: simNow + brief.durationHours * 3600000, arrivedAt: null, distanceNM: brief.distanceNM,
         cruiseSpeedKTS: aircraft.speedKnots, burnGPH: aircraft.fuelBurnGPH, costUSD: brief.totalCost, waypoints: brief.waypoints, passengers, purpose,
      };
      const ms = getFlightMoments(fake, aircraft, player, { hasCompany: true });
      return ms.filter(m => ['sunset', 'sunrise', 'crossing', 'chop', 'halfway'].includes(m.kind)).slice(0, 3);
   }, [brief?.distanceNM, flightId, player?.tastes?.drinks]);

   const handleLaunch = async () => {
       if (!brief || !aircraft.currentLocation) return;
       setIsLaunching(true);
       try {
           const id = await launchFlight({
               flightId,
               aircraftId: aircraft.tailNumber,
               originICAO: aircraft.currentLocationICAO!,
               destinationICAO: destination.icao,
               distanceNM: brief.distanceNM,
               durationHours: brief.durationHours,
               cost: brief.totalCost,
               waypoints: brief.waypoints,
               passengers,
               purpose,
           });
           router.push(`/flight/${id}`);
       } catch (error: any) {
           console.error("Launch Error:", error);
           alert(`Dispatch failed: ${error.message}`);
           setIsLaunching(false);
       }
   };

   if (!brief) return null;

   const arrivalMs = simNow + brief.durationHours * 3600000;
   const cruiseAlt = cruiseAltitudeFor(aircraft, brief.distanceNM);
   const canAfford = (player?.netWorth ?? Infinity) >= brief.totalCost;

   return (
      <div className="w-full animate-in fade-in slide-in-from-right-4 duration-500 pb-28 md:pb-6">
         <div className="flex items-center gap-3 mb-1">
           <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300" disabled={isLaunching}><ArrowLeft size={18} /></button>
           <h2 className="font-serif text-[28px] text-white">Briefing</h2>
         </div>
         <p className="text-[12.5px] text-zinc-400 mb-5 ml-12">Review the plan, then release the brakes.</p>

         {/* Route hero */}
         <div className="rounded-3xl border border-white/10 overflow-hidden bg-white/[0.03]">
            <RoutePreviewMap origin={aircraft.currentLocation!} destination={{ lat: destination.lat, lng: destination.lng }} waypoints={brief.waypoints} className="md:hidden w-full h-44" />
            <div className="p-5">
               <div className="flex items-center justify-between">
                  <div>
                     <div className="font-mono text-[28px] font-bold tracking-wider text-white leading-none">{aircraft.currentLocationICAO}</div>
                     <div className="text-[12px] text-zinc-400 mt-1">{shortCity(origin, '')}</div>
                  </div>
                  <div className="flex-1 mx-4 flex items-center gap-2">
                     <span className="flex-1 h-px bg-gradient-to-r from-white/10 via-[var(--accent)]/60 to-[var(--accent)]" />
                     <span className="text-[10.5px] font-mono text-zinc-400 whitespace-nowrap">{Math.round(brief.distanceNM).toLocaleString()} NM</span>
                     <span className="flex-1 h-px bg-gradient-to-r from-[var(--accent)] to-white/10" />
                  </div>
                  <div className="text-right">
                     <div className="font-mono text-[28px] font-bold tracking-wider text-[var(--accent)] leading-none">{destination.icao}</div>
                     <div className="text-[12px] text-zinc-400 mt-1">{shortCity(dest, '')}{dest ? `, ${countryName(dest.country)}` : ''}</div>
                  </div>
               </div>
               {purpose.type !== 'leisure' && (
                  <div className="mt-4 inline-flex items-center gap-2 text-[11.5px] font-medium px-3 py-1.5 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-[var(--color-gold)]"><Sparkles size={12} /> {purpose.label || purpose.type}</div>
               )}
               <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-black/30 rounded-xl p-3"><div className="eyebrow">Block time</div><div className="font-mono text-[15px] text-white mt-1">{formatDurationMs(brief.durationHours * 3600000)}</div></div>
                  <div className="bg-black/30 rounded-xl p-3"><div className="eyebrow">Arrive</div><div className="font-mono text-[15px] text-white mt-1">{dest ? localTimeAt(dest, arrivalMs) : new Date(arrivalMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div><div className="text-[10px] text-zinc-500">local</div></div>
                  <div className="bg-black/30 rounded-xl p-3"><div className="eyebrow">Cruise</div><div className="font-mono text-[15px] text-white mt-1">FL{Math.round(cruiseAlt / 100)}</div><div className="text-[10px] text-zinc-500">{aircraft.speedKnots} kts</div></div>
               </div>
            </div>
         </div>

         {/* Highlights */}
         {highlights.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
               <div className="eyebrow mb-2">On this flight</div>
               <ul className="space-y-1.5">
                  {highlights.map(h => (
                     <li key={h.id} className="flex items-start gap-2 text-[12.5px] text-zinc-300"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" /> <span><span className="text-white">{h.title}.</span> {h.body}</span></li>
                  ))}
               </ul>
            </div>
         )}

         {/* Cost */}
         <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-end justify-between">
               <div>
                  <div className="eyebrow">Trip cost</div>
                  <div className="font-mono text-[30px] font-bold text-white leading-none mt-1">{fmt(brief.totalCost)}</div>
               </div>
               <div className="text-right">
                  <div className="eyebrow">Manifest</div>
                  <div className="flex -space-x-2 justify-end mt-1.5">
                     {passengers.includes('player') && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0b6e8c] to-[#2ca5c4] border-2 border-[#070b12] flex items-center justify-center font-mono text-[10px] font-bold text-white">{(player?.displayName || 'You').slice(0, 2).toUpperCase()}</div>}
                     {personas.map(p => <PersonaAvatar key={p.id} persona={p} size={32} className="border-2 border-[#070b12]" />)}
                  </div>
               </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/8 text-[11px]">
               <div><div className="text-zinc-500">Fuel</div><div className="font-mono text-zinc-200">{fmt(brief.breakdown.fuelCost)}</div></div>
               <div><div className="text-zinc-500">Crew</div><div className="font-mono text-zinc-200">{fmt(brief.breakdown.crewCost)}</div></div>
               <div><div className="text-zinc-500">Wear</div><div className="font-mono text-zinc-200">{fmt(brief.breakdown.wearTear)}</div></div>
               <div><div className="text-zinc-500">Fees</div><div className="font-mono text-zinc-200">{fmt(brief.totalCost - brief.breakdown.fuelCost - brief.breakdown.crewCost - brief.breakdown.wearTear)}</div></div>
            </div>
         </div>

         <div className="fixed md:sticky bottom-0 left-0 right-0 md:mt-5 p-4 md:p-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/90 to-transparent md:bg-none" style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
            <button
               disabled={isLaunching || !canAfford}
               onClick={handleLaunch}
               className="w-full h-13 py-3.5 rounded-xl bg-[var(--accent)] text-black font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50"
            >
               {isLaunching ? 'Releasing brakes…' : canAfford ? 'FILE PLAN & LAUNCH ⚡' : 'Insufficient funds'}
               {!isLaunching && canAfford && <ArrowRight size={15} />}
            </button>
            <div className="hidden md:flex items-center justify-center gap-4 mt-2 text-[10.5px] text-zinc-500"><span className="flex items-center gap-1"><Clock size={10} /> departs now (sim time)</span><span className="flex items-center gap-1"><MapPin size={10} /> route drawn on the globe</span></div>
         </div>
      </div>
   );
}
