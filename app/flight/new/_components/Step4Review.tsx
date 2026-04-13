import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Aircraft } from '../../../../types';
import { calculateFlightBriefing, launchFlight } from '../../../../lib/simulation';
import { ArrowLeft, Zap, DollarSign, Clock, MapPin } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { db } from '../../../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { PersonaAvatar } from '../../../components/PersonaAvatar';

interface Props {
  aircraft: Aircraft;
  destination: any;
  passengers: string[];
  onBack: () => void;
}

function fmt(n: number) {
    return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function Step4Review({ aircraft, destination, passengers, onBack }: Props) {
   const router = useRouter();
   const mapContainer = useRef<HTMLDivElement>(null);
   const [isLaunching, setIsLaunching] = useState(false);
   
   const personas = useLiveQuery(() => db.personas.where('id').anyOf(passengers).toArray(), [passengers]) || [];

   // Compute the briefing securely based on the immutable selected props
   const brief = aircraft.currentLocation ? calculateFlightBriefing(
     aircraft, 
     { lat: aircraft.currentLocation.lat, lng: aircraft.currentLocation.lng }, 
     { lat: destination.lat, lng: destination.lng }
   ) : null;

   useEffect(() => {
     if (!mapContainer.current || !brief || !aircraft.currentLocation) return;
     const origin = aircraft.currentLocation;

     console.log('Origin:', origin);
     console.log('Destination:', destination);
     
     // Hard Guard against Maplibregl NaN faults natively blocking application thread
     if (!origin || !destination || isNaN(origin.lat) || isNaN(origin.lng) || isNaN(destination.lat) || isNaN(destination.lng) || origin.lat === null || destination.lat === null) {
       console.error('Invalid flight coordinates detected:', origin, destination);
       if (mapContainer.current) {
         mapContainer.current.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-red-500 font-mono text-xs tracking-widest bg-black/60 relative p-6 text-center border border-red-500/20">ROUTE PREVIEW UNAVAILABLE (INVALID COORDS)</div>';
       }
       return;
     }

     const map = new maplibregl.Map({
       container: mapContainer.current,
       style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
       bounds: [
          [Math.min(origin.lng, destination.lng) - 5, Math.min(origin.lat, destination.lat) - 5],
          [Math.max(origin.lng, destination.lng) + 5, Math.max(origin.lat, destination.lat) + 5]
       ],
       interactive: false
     });

     map.on('load', () => {
         map.addSource('route', {
            type: 'geojson',
            data: {
               type: 'Feature',
               geometry: { type: 'LineString', coordinates: brief.waypoints.map(p => [p.lng, p.lat]) }
            } as any
         });
         map.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route',
            paint: { 'line-color': '#00f0ff', 'line-width': 2, 'line-dasharray': [2, 2] }
         });
         
         // Add origin and destination markers
         new maplibregl.Marker({ color: '#ffffff' }).setLngLat([origin.lng, origin.lat]).addTo(map);
         new maplibregl.Marker({ color: '#00f0ff' }).setLngLat([destination.lng, destination.lat]).addTo(map);
     });

     return () => map.remove();
   }, []);

   const handleLaunch = async () => {
       if (!brief || !aircraft.currentLocation) return;
       setIsLaunching(true);
       try {
           const flightId = await launchFlight({
               aircraftId: aircraft.tailNumber, // Pass tailNumber as ID since it's the primary key
               originICAO: aircraft.currentLocationICAO!,
               destinationICAO: destination.icao,
               distanceNM: brief.distanceNM,
               durationHours: brief.durationHours,
               cost: brief.totalCost,
               waypoints: brief.waypoints,
               passengers: passengers,
               purpose: { type: 'leisure' } // Stubbed default
           });
           
           router.push(`/flight/${flightId}`);
       } catch (error: any) {
           console.error("Launch Error:", error);
           alert(`DISPATCH FAILED: ${error.message}`);
           setIsLaunching(false);
       }
   };

   if (!brief) return null;

   const hours = Math.floor(brief.durationHours);
   const minutes = Math.round((brief.durationHours - hours) * 60);

   return (
      <div className="w-full max-w-4xl animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
         <div className="flex items-center gap-4 mb-2">
           <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors" disabled={isLaunching}>
              <ArrowLeft size={20} />
           </button>
           <h2 className="text-2xl font-black font-mono tracking-widest uppercase">Flight Briefing</h2>
         </div>
         <p className="text-zinc-400 font-mono text-xs tracking-widest mb-8 uppercase">Review telemetry and authorize financial dispatch.</p>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
               <div className="bg-black/40 border border-white/10 p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#00f0ff]" />
                  <div className="flex justify-between items-end mb-4">
                     <div>
                        <div className="text-[10px] text-[#00f0ff] font-mono tracking-widest uppercase mb-1">Total Cost</div>
                        <div className="text-4xl font-black font-mono tracking-tighter text-white">{fmt(brief.totalCost)}</div>
                     </div>
                     <div className="text-right flex flex-col items-end">
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-2">Manifest ({passengers.length})</div>
                        <div className="flex -space-x-3">
                           {passengers.includes('player') && (
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#0a0a0c] flex items-center justify-center font-mono text-[10px] text-white">PL</div>
                           )}
                           {personas.map(p => (
                              <div key={p.id} className="w-8 h-8 rounded-full border-2 border-[#0a0a0c] overflow-hidden">
                                 <PersonaAvatar persona={p} size={32} />
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
                     <div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">FUEL ({Math.round(brief.durationHours * aircraft.fuelBurnGPH)} GAL)</div>
                        <div className="text-sm font-bold font-mono text-zinc-300">{fmt(brief.breakdown.fuelCost)}</div>
                     </div>
                     <div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">CREW</div>
                        <div className="text-sm font-bold font-mono text-zinc-300">{fmt(brief.breakdown.crewCost)}</div>
                     </div>
                     <div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">WEAR & TEAR</div>
                        <div className="text-sm font-bold font-mono text-zinc-300">{fmt(brief.breakdown.wearTear)}</div>
                     </div>
                     <div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest mb-1">FEES</div>
                        <div className="text-sm font-bold font-mono text-zinc-300">{fmt(brief.totalCost - brief.breakdown.fuelCost - brief.breakdown.crewCost - brief.breakdown.wearTear)}</div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                        <MapPin size={16} />
                     </div>
                     <div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Distance</div>
                        <div className="text-lg font-bold font-mono text-white">{Math.round(brief.distanceNM).toLocaleString()} NM</div>
                     </div>
                  </div>
                  <div className="bg-black/20 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                        <Clock size={16} />
                     </div>
                     <div>
                        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Duration</div>
                        <div className="text-lg font-bold font-mono text-white">{hours}h {minutes}m</div>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-4 mt-6">
                  <button 
                     disabled={isLaunching}
                     onClick={handleLaunch}
                     className="flex-1 bg-[#00f0ff] text-black font-black font-mono tracking-widest px-6 py-4 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                     {isLaunching ? 'SECURING UPLINK...' : 'FILE PLAN & LAUNCH ⚡'}
                  </button>
               </div>
            </div>

            <div className="h-64 lg:h-auto rounded-xl overflow-hidden border border-white/10 relative">
               <div ref={mapContainer} className="w-full h-full" />
               <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
               <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-xs font-mono tracking-widest text-white shadow-black/50 drop-shadow-lg">
                  <div>
                     <div className="text-zinc-400 mb-1">ORIGIN</div>
                     <div className="font-bold">{aircraft.currentLocationICAO}</div>
                  </div>
                  <div className="text-right">
                     <div className="text-[#00f0ff] mb-1">DESTINATION</div>
                     <div className="font-bold">{destination.icao}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
