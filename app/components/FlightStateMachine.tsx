'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plane, CloudRain, MapPin, Gauge } from 'lucide-react';
import { useStore, FlightPhase, MAIN_HUBS } from '../lib/store';

const PHASES: FlightPhase[] = ['Hangar', 'Pre-flight', 'Taxi', 'Takeoff', 'Cruise', 'Landing'];

export default function FlightStateMachine() {
  const { fleet, selectedAircraftId, updateAircraft, weatherEnabled, setWeatherEnabled, timeMultiplier, setAircraftRoute } = useStore();
  const jet = fleet.find(j => j.id === selectedAircraftId);
  const [timeLeft, setTimeLeft] = useState<number>(0);

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
      
      if (newPhase === 'Cruise') {
         // Lock the transit state based on logical distance (using flat 18000s for testing here)
         updates.lockedUntil = Date.now() + ((18000 * 1000) / timeMultiplier);
      }
      
      if (newPhase === 'Landing') {
         if (jet.destination) updates.currentLocation = jet.destination;
         updates.destination = null;
         updates.lockedUntil = null;
      }
      
      updateAircraft(jet.id, updates);
    }
  };

  const prevPhase = () => {
    if (currentIndex > 0) {
      updateAircraft(jet.id, { flightPhase: PHASES[currentIndex - 1], lockedUntil: null });
    }
  };

  return (
    <div className="absolute bottom-10 left-10 right-10 z-10 flex justify-between items-end">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl w-[420px] flex flex-col gap-4 text-[var(--foreground)] border border-white/10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className={isLocked ? 'text-[#d4af37]' : 'text-[#00f0ff]'} />
            <h2 className="text-xl font-bold font-sans">{jet.tailNumber}</h2>
          </div>
          <span className={`text-xs font-bold uppercase tracking-widest ${isLocked ? 'text-[#d4af37]' : 'text-[#00f0ff]'}`}>
            {jet.flightPhase}
          </span>
        </div>
        
        <div className="h-px bg-white/10 w-full" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <MapPin size={16} className="text-gray-400"/>
               
               {(jet.flightPhase === 'Hangar' || jet.flightPhase === 'Pre-flight') ? (
                  <div className="flex items-center gap-2 relative">
                     <select 
                       value={jet.currentLocation.name} 
                       onChange={(e) => setAircraftRoute(jet.id, e.target.value, jet.destination?.name || '')}
                       className="bg-black/50 border border-white/20 text-white rounded px-2 py-1 text-xs font-bold uppercase tracking-widest outline-none focus:border-[#00f0ff] appearance-none cursor-pointer"
                     >
                       {Object.keys(MAIN_HUBS).map(h => <option key={h} value={h}>{h}</option>)}
                     </select>
                     <span className="text-white/40">→</span>
                     <select 
                       value={jet.destination?.name || ''} 
                       onChange={(e) => setAircraftRoute(jet.id, jet.currentLocation.name, e.target.value)}
                       className={`bg-black/50 border text-white rounded px-2 py-1 text-xs font-bold uppercase tracking-widest outline-none appearance-none cursor-pointer ${!jet.destination ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)] focus:border-red-400' : 'border-white/20 focus:border-[#00f0ff]'}`}
                     >
                       <option value="" disabled>DEST</option>
                       {Object.keys(MAIN_HUBS).map(h => <option key={h} value={h} disabled={h === jet.currentLocation.name}>{h}</option>)}
                     </select>
                  </div>
               ) : (
                 <span className="text-sm font-bold tracking-widest uppercase">
                   {jet.currentLocation.name} {jet.destination ? `→ ${jet.destination.name}` : ''}
                 </span>
               )}

             </div>
             {isLocked && <span className="text-xs font-mono font-bold text-[#d4af37] bg-black/50 px-2 py-1 rounded">{timeLeft}s TTE</span>}
          </div>
          <div className="flex items-center gap-3">
            <Gauge size={16} className="text-gray-400"/>
            <span className="text-sm tracking-wider">ALT: {jet.flightPhase === 'Cruise' ? '41,000 FT' : '0 FT'}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button 
            disabled={currentIndex === 0 || isLocked}
            onClick={prevPhase}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-xs font-bold tracking-widest uppercase border border-white/10 rounded transition-colors disabled:opacity-30"
          >
            Revert
          </button>
          <button 
            disabled={currentIndex === PHASES.length - 1 || isLocked || ((currentIndex === 0 || currentIndex === 1) && !jet.destination)}
            onClick={nextPhase}
            className={`flex-1 px-4 py-3 text-xs font-bold tracking-widest uppercase border rounded transition-colors disabled:opacity-30 flex items-center justify-center ${
              isLocked 
               ? 'bg-[#d4af37]/10 border-[#d4af37]/50 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
               : 'bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 text-[#00f0ff] border-[#00f0ff]/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
            }`}
          >
            {isLocked ? 'In Transit...' : currentIndex === PHASES.length - 1 ? 'Arrived' : 'Advance'}
          </button>
        </div>
      </motion.div>

      <div className="flex gap-4">
        <button 
          onClick={() => setWeatherEnabled(!weatherEnabled)}
          className={`glass-panel p-4 rounded-xl flex items-center justify-center transition-colors ${weatherEnabled ? 'bg-[var(--color-cyan)]/20 border-[var(--color-cyan)]/30 text-[var(--color-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-gray-400 border border-white/10'}`}
        >
          <CloudRain size={24} />
        </button>
      </div>
    </div>
  );
}
