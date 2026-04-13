'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { CloudRain, Wind, AlertTriangle, Route as RouteIcon, DollarSign, Zap } from 'lucide-react';

function fmt(n: number) {
    if (n >= 1000000000) return '$' + (n / 1000000000).toFixed(1) + 'B';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    return '$' + n.toLocaleString();
}

import { Aircraft } from '../../types';

function LiveTelemetryBlock({ jet, distance, timeMultiplier }: { jet: Aircraft, distance: number, timeMultiplier: number }) {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
     const i = setInterval(() => setNow(Date.now()), 100);
     return () => clearInterval(i);
  }, []);

  if (jet.launchedAt === null || jet.lockedUntil === null) return null;

  const totalSimMs = (jet.lockedUntil - jet.launchedAt) * timeMultiplier;
  const passedSimMs = (now - jet.launchedAt) * timeMultiplier;
  let progress = totalSimMs > 0 ? passedSimMs / totalSimMs : 0;
  if (progress > 1) progress = 1;
  if (progress < 0) progress = 0;

  const distTraveled = distance * progress;
  const distRemaining = distance - distTraveled;
  
  const realMsRemaining = jet.lockedUntil - now;
  const virtualMsRemaining = realMsRemaining * timeMultiplier;
  
  const formatVirtualMs = (ms: number) => {
     if (ms < 0) return "00h 00m";
     const totalMins = Math.floor(ms / 60000);
     const h = Math.floor(totalMins / 60);
     const m = Math.floor(totalMins % 60);
     return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  return (
    <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
       <div className="bg-black/50 p-2 rounded border border-[#00f0ff]/20">
          <span className="block text-[8px] text-[#00f0ff] uppercase tracking-widest">Ground Speed</span>
          <span className="text-white font-bold">{jet.flightPhase === 'Cruise' ? jet.speedKnots : Math.floor(jet.speedKnots * 0.4)} KTS</span>
       </div>
       <div className="bg-black/50 p-2 rounded border border-[#00f0ff]/20">
          <span className="block text-[8px] text-[#00f0ff] uppercase tracking-widest">ETA</span>
          <span className="text-white font-bold">{formatVirtualMs(virtualMsRemaining)}</span>
       </div>
       <div className="bg-black/50 p-2 rounded border border-[#00f0ff]/20">
          <span className="block text-[8px] text-[#00f0ff] uppercase tracking-widest">Dist Traveled</span>
          <span className="text-white font-bold">{Math.floor(distTraveled)} NM</span>
       </div>
       <div className="bg-black/50 p-2 rounded border border-[#00f0ff]/20">
          <span className="block text-[8px] text-[#00f0ff] uppercase tracking-widest">Dist Remaining</span>
          <span className="text-white font-bold">{Math.floor(distRemaining)} NM</span>
       </div>
       <div className="col-span-2 mt-2">
          <div className="h-1.5 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 shadow-inner">
             <div className="h-full bg-gradient-to-r from-[#0088ff] to-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.8)] relative" style={{ width: `${progress * 100}%` }}>
                <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/50 animate-pulse"/>
             </div>
          </div>
       </div>
    </div>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../../lib/repositories/aircraft';

export default function DispatchController() {
  const { selectedAircraftId, provisionalRoute, setProvisionalRoute, timeMultiplier } = useStore();
  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
  const jet = fleet.find((j: Aircraft) => j.id === selectedAircraftId);

  if (!jet) return null;

  // Calculate provisional metrics
  let distance = 0;
  let estimatedHours = 0;
  let tripCost = 0;
  
  const origin = jet.flightPhase === 'Hangar' ? provisionalRoute?.origin : jet.currentLocation;
  const destination = jet.flightPhase === 'Hangar' ? provisionalRoute?.destination : jet.destination;
  
  if (origin && destination) {
     const dLat = (destination.lat - origin.lat) * 60;
     const dLng = (destination.lng - origin.lng) * 60;
     distance = Math.round(Math.sqrt(dLat*dLat + dLng*dLng));
     estimatedHours = distance / jet.speedKnots;
     if (estimatedHours < 0.66) estimatedHours = 0.66; // Minimum block time
     tripCost = Math.round(distance * jet.costPerNM);
  }

  // Generate fake METAR based on coordinate rough hash
  const getMetar = (lat: number, lng: number) => {
     const hash = Math.abs(Math.floor(lat * 100 + lng * 100));
     const temp = (hash % 40) - 5; // -5 to 35 C
     const windSpd = hash % 35;
     const windDir = (hash * 13) % 360;
     return `${temp}°C | Wind ${windDir}° @ ${windSpd}KTS`;
  };

  return (
    <div className="absolute top-0 bottom-0 right-0 w-96 bg-black/80 backdrop-blur-3xl border-l border-[#00f0ff]/20 z-30 flex flex-col pointer-events-auto transform translate-x-0 transition-transform">
      <div className="p-5 border-b border-[#00f0ff]/20 bg-black/40">
         <h2 className="text-[10px] font-mono text-[#00f0ff] uppercase tracking-widest leading-none mb-1">DISPATCH CONTROLLER</h2>
         <h1 className="text-2xl font-black text-white tracking-widest">{jet.tailNumber}</h1>
         <div className="flex gap-2 mt-2">
            <span className="text-[10px] bg-white/10 text-white px-2 py-1 rounded font-mono">{jet.model}</span>
            <span className="text-[10px] bg-white/10 text-white px-2 py-1 rounded font-mono">{jet.speedKnots} KTS</span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

         {jet.layoutImage && (
            <div className="w-full h-32 relative bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-lg overflow-hidden flex items-center justify-center p-2 group">
               <img src={jet.layoutImage} alt={jet.model} className="w-full h-full object-contain filter group-hover:brightness-125 transition-all drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]" />
               <div className="absolute bottom-2 left-2 flex gap-2">
                 <span className="bg-black/80 px-2 py-1 text-[8px] text-zinc-400 border border-white/10 rounded font-mono uppercase tracking-widest">{jet.cabinConfig.length} Modules</span>
                 <span className="bg-black/80 px-2 py-1 text-[8px] text-zinc-400 border border-white/10 rounded font-mono uppercase tracking-widest">{jet.fuelBurnGPH} GPH</span>
               </div>
            </div>
         )}
         
         {/* Live Flight Status */}
         {(jet.flightPhase !== 'Hangar') && (
           <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/30 p-4 rounded-lg flex flex-col gap-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 bottom-0 w-1 bg-[#00f0ff] animate-pulse"/>
             <span className="text-[9px] text-[#00f0ff] font-bold uppercase tracking-widest">Active Flight Phase</span>
             <div className="flex justify-between items-end">
               <h3 className="text-xl text-white font-black font-mono">{jet.flightPhase.toUpperCase()}</h3>
               <span className="text-xs text-[#00f0ff] font-mono border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-2 py-1 rounded">LIVE</span>
             </div>
             
             <LiveTelemetryBlock jet={jet} distance={distance} timeMultiplier={timeMultiplier} />
             
           </div>
         )}

         {/* Routing View (Displayed for active and provisional) */}
         {(provisionalRoute !== null || (jet.flightPhase !== 'Hangar' && jet.destination !== null)) && origin !== null && destination !== null && (
            <div className="flex flex-col gap-2">
                 <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">
                    {jet.flightPhase === 'Hangar' ? 'Routing Instructions' : 'Active Routing Lock'}
                 </span>
                 <div className="flex flex-col gap-3">
                    <div className="bg-zinc-900 border border-zinc-700/50 p-3 rounded flex flex-col gap-1">
                       <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Origin</span>
                       <span className="text-sm font-mono text-white">{origin.name}</span>
                       <span className="text-[10px] font-mono text-[#00f0ff]">{getMetar(origin.lat, origin.lng)}</span>
                    </div>
                    <div className="w-px h-4 bg-zinc-700 mx-auto -my-1"/>
                    <div className="bg-zinc-900 border border-[#00f0ff]/50 p-3 rounded flex flex-col gap-1 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                       <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest">Destination target</span>
                       <span className="text-sm font-mono text-white">{destination.name}</span>
                       <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1"><CloudRain size={10}/> {getMetar(destination.lat, destination.lng)}</span>
                    </div>
                 </div>

                 {/* Costing Block */}
                 <div className="flex flex-col gap-2 mt-4">
                    <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Flight Envelope & Costing</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 border border-white/10 p-2 rounded">
                           <span className="block text-[9px] text-zinc-500 uppercase tracking-widest">Distance</span>
                           <span className="text-sm font-mono text-white font-bold">{distance.toLocaleString()} NM</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-2 rounded">
                           <span className="block text-[9px] text-zinc-500 uppercase tracking-widest">Duration</span>
                           <span className="text-sm font-mono text-white font-bold">{estimatedHours.toFixed(1)} HRS</span>
                        </div>
                        <div className="col-span-2 bg-[#ff0055]/10 border border-[#ff0055]/20 p-3 rounded flex justify-between items-center">
                           <div className="flex items-center gap-1 text-[#ff0055]">
                              <DollarSign size={14}/>
                              <span className="text-[10px] font-bold uppercase tracking-widest">Estimated Block Cost</span>
                           </div>
                           <span className="text-lg font-mono text-[#ff0055] font-black">{fmt(tripCost)}</span>
                        </div>
                    </div>
                    
                    {jet.flightPhase === 'Hangar' && provisionalRoute && (
                       <button 
                         onClick={() => {
                            if (provisionalRoute?.destination !== null && jet.currentLocation !== null) {
                               const toRad = (v: number) => v * Math.PI / 180;
                               const R = 3440; // NM
                               const dLat = toRad(provisionalRoute.destination.lat - jet.currentLocation.lat);
                               const dLon = toRad(provisionalRoute.destination.lng - jet.currentLocation.lng);
                               const lat1 = toRad(jet.currentLocation.lat);
                               const lat2 = toRad(provisionalRoute.destination.lat);
                               const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
                               const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                               const dist = R * c;
                               const hours = dist / (jet.speedKnots || 500);
                               
                               aircraftRepo.update(jet.id!, {
                                  destination: provisionalRoute.destination,
                                  flightPhase: 'Takeoff',
                                  launchedAt: Date.now(),
                                  lockedUntil: Date.now() + ((hours * 3600000) / timeMultiplier)
                               });
                               setProvisionalRoute(null);
                            }
                         }}
                         className="w-full mt-4 bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-black font-black uppercase text-sm tracking-widest rounded px-4 py-4 flex items-center justify-center gap-2 hover:brightness-125 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                       >
                         FILE PLAN & LAUNCH <Zap size={16} className="fill-black"/>
                       </button>
                    )}
                 </div>
            </div>
         )}
         
         {/* Blank state for hangar without route */}
         {jet.flightPhase === 'Hangar' && !provisionalRoute && (
            <div className="flex flex-col gap-2">
               <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Routing Instructions</span>
               <div className="p-6 border border-dashed border-white/20 rounded-lg text-center opacity-70">
                  <RouteIcon size={24} className="text-zinc-600 mx-auto mb-2"/>
                  <p className="text-xs text-zinc-400 font-mono">SELECT A DESTINATION ON THE GLOBE</p>
               </div>
            </div>
         )}

      </div>
    </div>
  )
}
