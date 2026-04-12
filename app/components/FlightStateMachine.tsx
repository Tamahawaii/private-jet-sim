'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AirportSearch from './AirportSearch';
import { Plane, CloudRain, MapPin, Gauge, Orbit, DollarSign, Droplet } from 'lucide-react';
import { useStore, FlightPhase, MAIN_HUBS } from '../lib/store';
import { calculateDistanceNM } from '../lib/math';

const PHASES: FlightPhase[] = ['Hangar', 'Pre-flight', 'Taxi', 'Takeoff', 'Cruise', 'Landing'];

export default function FlightStateMachine() {
  const { fleet, selectedAircraftId, updateAircraft, weatherEnabled, setWeatherEnabled, timeMultiplier, setAircraftRoute } = useStore();
  const jet = fleet.find(j => j.id === selectedAircraftId);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [locationExpanded, setLocationExpanded] = useState(false);

  const getLocalTime = (lng: number) => {
     const offsetHrs = Math.round(lng / 15);
     const d = new Date(Date.now() + offsetHrs * 3600000);
     const hrs = d.getUTCHours().toString().padStart(2, '0');
     const mins = d.getUTCMinutes().toString().padStart(2, '0');
     const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
     const day = d.getUTCDate();
     return `${hrs}:${mins} • ${month} ${day}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!jet?.lockedUntil) {
        setTimeLeft(0);
        return;
      }
      const diff = Math.floor((jet.lockedUntil - Date.now()) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [jet?.lockedUntil]);

  if (!jet) return null;

  const currentIndex = PHASES.indexOf(jet.flightPhase);
  const isLocked = timeLeft > 0;

  const nextPhase = () => {
    if (currentIndex < PHASES.length - 1) {
      const newPhase = PHASES[currentIndex + 1];
      const updates: any = { flightPhase: newPhase };
      
      if (newPhase === 'Cruise' && jet.destination) {
         // Calculate real distance using spherical math
         const distance = calculateDistanceNM(jet.currentLocation.lat, jet.currentLocation.lng, jet.destination.lat, jet.destination.lng);
         // Calculate real duration based on this physical jet's capable cruising speed (ms)
         const durationMs = (distance / jet.speedKnots) * 3600 * 1000;
         
         updates.lockedUntil = Date.now() + (durationMs / timeMultiplier);
         updates.launchedAt = Date.now();
      }
      
      if (newPhase === 'Taxi' || newPhase === 'Takeoff') {
         updates.launchedAt = Date.now();
      }

      if (newPhase === 'Landing') {
         if (jet.destination) updates.currentLocation = jet.destination;
         updates.destination = null;
         updates.lockedUntil = null;
         updates.launchedAt = Date.now();
      }
      
      updateAircraft(jet.id, updates);
    }
  };

  const prevPhase = () => {
    if (currentIndex > 0) {
      updateAircraft(jet.id, { flightPhase: PHASES[currentIndex - 1], lockedUntil: null, launchedAt: null });
    }
  };

  const elapsedS = jet.launchedAt ? Math.floor((Date.now() - jet.launchedAt) / 1000) : 0;
  const simElapsedHours = (elapsedS * timeMultiplier) / 3600;
  const currentCost = simElapsedHours * jet.speedKnots * (jet.costPerNM || 20);
  const currentFuelBurned = simElapsedHours * (jet.fuelBurnGPH || 400);

  const simTimeLeft = timeLeft * timeMultiplier;
  const simHoursLeft = Math.floor(simTimeLeft / 3600);
  const simMinutesLeft = Math.floor((simTimeLeft % 3600) / 60);
  const formattedTTE = simHoursLeft > 0 ? `${simHoursLeft}h ${simMinutesLeft}m` : `${simMinutesLeft}m`;

  return (
    <div className="absolute top-24 left-4 bottom-24 z-20 flex gap-4 text-[var(--foreground)] w-[360px] pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel p-0 rounded-lg w-full flex flex-col bg-[#e6e3dd] border-4 border-[#b5ae9c] overflow-hidden shadow-2xl relative pointer-events-auto"
      >
        {/* Header Ribbon */}
        <div className="bg-[#003366] border-b-4 border-[#001D4A] text-white p-3 flex justify-between items-center relative">
           <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#00f0ff] mb-0.5 opacity-80">Route Contract</span>
              <span className="text-sm font-black tracking-widest leading-none">{jet.currentLocation.name} - {jet.destination ? jet.destination.name : 'UNASSIGNED'}</span>
           </div>
           {isLocked && <div className="text-xs font-mono font-bold bg-[#ff0055] text-white px-2 py-1 rounded shadow-inner">{formattedTTE}</div>}
        </div>

        {/* Financial Header */}
        <div className="bg-[#dcd6c9] border-b border-[#c2baa8] px-4 py-2 flex justify-between items-center text-[#003366]">
           <span className="text-xs font-bold uppercase tracking-widest text-[#5c5443]">Reward</span>
           <span className="text-sm font-black text-green-700 bg-green-500/20 px-2 rounded shadow-inner">+$24,500</span>
        </div>

        {/* Aircraft Block */}
        <div className="p-4 flex flex-col gap-4">
           <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg shadow border-b-4 border-gray-300">
             <div className="flex items-center gap-3">
               <Plane size={24} className={isLocked ? 'text-[#d4af37]' : 'text-gray-400'} />
               <div className="flex flex-col leading-tight">
                 <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">Flight {jet.tailNumber}</span>
                 <span className="text-xs font-black text-gray-800 uppercase">{jet.model}</span>
               </div>
             </div>
             <span className={`text-[10px] uppercase font-black px-2 py-1 rounded shadow-inner text-white ${isLocked ? 'bg-amber-500' : 'bg-gray-400'}`}>
                {jet.flightPhase}
             </span>
           </div>

           {/* Location Editing */}
           <div className="flex items-center justify-between gap-1 mt-2">
             <div className="w-[140px] bg-white p-3 rounded-lg border-b-4 border-gray-300 shadow text-black relative flex flex-col items-center">
               <span className="absolute top-1 left-2 text-[8px] font-black uppercase text-gray-400 tracking-widest">Origin</span>
               <div className="w-full mt-3 font-bold">
                 <AirportSearch 
                    value={jet.currentLocation} 
                    onChange={(loc) => { if (!isLocked) setAircraftRoute(jet.id, loc, jet.destination) }} 
                    placeholder="Origin"
                 />
               </div>
               <div className="text-[10px] font-bold text-gray-500 mt-2">{getLocalTime(jet.currentLocation.lng)}</div>
             </div>
             
             <div className="flex flex-col items-center justify-center px-1">
                <Plane size={16} className={`text-[#00f0ff] transition-transform ${isLocked ? '-rotate-45 block' : 'hidden'}`} />
                <div className="w-8 border-b-2 border-gray-400 border-dashed my-1" />
             </div>
             
             <div className="w-[140px] bg-white p-3 rounded-lg border-b-4 border-gray-300 shadow text-black relative flex flex-col items-center">
               <span className="absolute top-1 left-2 text-[8px] font-black uppercase text-[#00f0ff] tracking-widest">Dest</span>
               <div className="w-full mt-3 font-bold">
                 <AirportSearch 
                    value={jet.destination} 
                    onChange={(loc) => { if (!isLocked) setAircraftRoute(jet.id, jet.currentLocation, loc) }} 
                    placeholder="Dest"
                    excludeIata={jet.currentLocation.name}
                 />
               </div>
               {jet.destination && <div className="text-[10px] font-bold text-gray-500 mt-2">{getLocalTime(jet.destination.lng)}</div>}
             </div>
           </div>
        </div>
         </div>

        {/* Action Button Area */}
        <div className="mt-auto p-4 bg-[#c2baa8] flex items-center gap-2 border-t border-[#b2a996]">
           <button 
             disabled={currentIndex === 0 || isLocked}
             onClick={prevPhase}
             className="px-4 py-4 bg-gray-500 hover:bg-gray-600 text-white text-xs font-black tracking-widest uppercase border border-gray-700 rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.5)] transition-all active:translate-y-1 active:shadow-none disabled:opacity-40"
           >
             REV
           </button>
           <button 
             disabled={currentIndex === PHASES.length - 1 || isLocked || ((currentIndex === 0 || currentIndex === 1) && !jet.destination)}
             onClick={nextPhase}
             className={`flex-1 py-4 text-xl font-black tracking-widest uppercase rounded-lg shadow-[0_6px_0_rgba(0,0,0,0.4)] transition-all active:translate-y-1.5 active:shadow-[0_0px_0_rgba(0,0,0,0)] disabled:opacity-60 disabled:shadow-none disabled:translate-y-1.5 ${
               isLocked 
                ? 'bg-amber-500 hover:bg-amber-400 text-amber-900 border border-amber-600 shadow-[0_6px_0_#92400e]'
                : jet.flightPhase === 'Cruise' ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-800 shadow-[0_6px_0_#4c1d95]' 
                : 'bg-green-500 hover:bg-green-400 text-white border border-green-700 shadow-[0_6px_0_#166534]'
             }`}
           >
             {isLocked ? 'TRANSIT' : jet.flightPhase === 'Cruise' ? 'LAND' : currentIndex === PHASES.length - 1 ? 'ARRIVED' : 'ACTIVATE'}
           </button>
        </div>
      </motion.div>

      {/* Weather Toggle */}
      <div className="flex gap-4 relative z-20 shrink-0">
        <button 
          onClick={() => setWeatherEnabled(!weatherEnabled)}
          className={`glass-panel p-4 h-fit rounded-xl flex items-center justify-center transition-colors ${weatherEnabled ? 'bg-[var(--color-cyan)]/20 border-[var(--color-cyan)]/30 text-[var(--color-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-gray-400 border border-white/10'}`}
        >
          <CloudRain size={24} />
        </button>
      </div>

      {/* Telemetry HUD */}
      <AnimatePresence>
        {jet.flightPhase === 'Cruise' && (
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-panel p-4 rounded-xl w-[280px] shrink-0 border border-[#00f0ff]/30 shadow-2xl flex flex-col relative overflow-hidden bg-[#001D4A] pointer-events-auto"
          >
            <h3 className="text-xs uppercase font-bold tracking-widest text-white mb-4 flex items-center gap-2"><Orbit size={14}/> Flight Tracking</h3>
            
            <div className="grid grid-cols-2 gap-3 h-full">
               <div className="flex flex-col justify-end bg-black/60 p-3 rounded-lg border-b-2 border-[#00f0ff]">
                 <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest font-bold mb-1">Alt</span>
                 <span className="text-sm font-mono text-white text-right">FL 410</span>
               </div>
               <div className="flex flex-col justify-end bg-black/60 p-3 rounded-lg border-b-2 border-[#00f0ff]">
                 <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest font-bold mb-1">KIAS</span>
                 <span className="text-sm font-mono text-white text-right">0.85 M</span>
               </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-white uppercase tracking-widest font-bold flex items-center gap-1">Fuel Status</span>
              <span className="text-lg font-mono text-[#00f0ff] tracking-tighter">{Math.floor(currentFuelBurned).toLocaleString()} <span className="text-[10px]">GAL</span></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
