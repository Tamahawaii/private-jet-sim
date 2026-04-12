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
    <div className="flex gap-4 text-[var(--foreground)] w-[860px]">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl w-[420px] shrink-0 flex flex-col gap-4 border border-white/10 relative z-20"
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
                  <div className="flex items-center gap-2 relative z-50 w-full">
                    <div className="w-[120px]">
                      <AirportSearch 
                        value={jet.currentLocation} 
                        onChange={(loc) => setAircraftRoute(jet.id, loc, jet.destination)} 
                        placeholder="Origin"
                      />
                    </div>
                    <span className="text-white/40">→</span>
                    <div className="w-[120px]">
                      <AirportSearch 
                        value={jet.destination} 
                        onChange={(loc) => setAircraftRoute(jet.id, jet.currentLocation, loc)} 
                        placeholder="Dest"
                        excludeIata={jet.currentLocation.name}
                      />
                    </div>
                  </div>
               ) : (
                 <button 
                   onClick={() => setLocationExpanded(!locationExpanded)}
                   className="text-sm font-bold tracking-widest uppercase hover:text-[#00f0ff] transition-colors flex items-center gap-2"
                 >
                   {jet.currentLocation.name} {jet.destination ? `→ ${jet.destination.name}` : ''}
                 </button>
               )}

             </div>
             {isLocked && <span className="text-xs font-mono font-bold text-[#d4af37] bg-black/50 px-2 py-1 rounded">{formattedTTE} TTE</span>}
          </div>
          <div className="flex items-center gap-3">
            <Gauge size={16} className="text-gray-400"/>
            <span className="text-sm tracking-wider">ALT: {jet.flightPhase === 'Cruise' ? '41,000 FT' : '0 FT'}</span>
          </div>
        </div>

        <AnimatePresence>
            {locationExpanded && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="overflow-hidden bg-black/40 rounded-xl border border-white/5"
               >
                 <div className="p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                       <div>
                         <div className="text-[10px] uppercase tracking-widest text-[#00f0ff] font-bold mb-1">Origin ({jet.currentLocation.name})</div>
                         <div className="text-sm font-mono text-white/90">{getLocalTime(jet.currentLocation.lng)}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Conditions</div>
                         <div className="text-xs font-bold text-white flex items-center gap-1 justify-end"><CloudRain size={12}/> Clear, 22°C</div>
                       </div>
                    </div>
                    {jet.destination && (
                      <div className="flex justify-between items-center pt-3 border-t border-white/10">
                         <div>
                           <div className="text-[10px] uppercase tracking-widest text-[#00f0ff] font-bold mb-1">Destination ({jet.destination.name})</div>
                           <div className="text-sm font-mono text-white/90">{getLocalTime(jet.destination.lng)}</div>
                         </div>
                         <div className="text-right">
                           <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Conditions</div>
                           <div className="text-xs font-bold text-white flex items-center gap-1 justify-end"><CloudRain size={12}/> Overcast, 15°C</div>
                         </div>
                      </div>
                    )}
                 </div>
               </motion.div>
            )}
         </AnimatePresence>

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
            className="glass-panel p-6 rounded-2xl w-[320px] shrink-0 border border-[#00f0ff]/30 shadow-[0_0_20px_rgba(0,240,255,0.1)] flex flex-col relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,240,255,0.1),transparent_50%)] pointer-events-none" />
            <h3 className="text-xs uppercase font-bold tracking-widest text-[#00f0ff] mb-4 flex items-center gap-2"><Orbit size={14}/> Live Telemetry</h3>
            
            <div className="grid grid-cols-2 gap-4 h-full">
               <div className="flex flex-col justify-end bg-black/40 p-3 rounded-lg border border-white/5">
                 <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Altitude</span>
                 <span className="text-lg font-mono text-white text-right">FL 410</span>
               </div>
               <div className="flex flex-col justify-end bg-black/40 p-3 rounded-lg border border-white/5">
                 <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Airspeed</span>
                 <span className="text-lg font-mono text-white text-right">M 0.85</span>
               </div>
               <div className="flex flex-col justify-end bg-black/40 p-3 rounded-lg border border-white/5">
                 <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Outside Air</span>
                 <span className="text-lg font-mono text-white text-right">-54°C</span>
               </div>
               <div className="flex flex-col justify-end bg-black/40 p-3 rounded-lg border border-amber-500/20">
                 <span className="text-[10px] text-amber-500/50 flex items-center gap-1 uppercase tracking-widest font-bold mb-1"><Droplet size={10}/> Burned</span>
                 <span className="text-lg font-mono text-amber-500 text-right">{Math.floor(currentFuelBurned).toLocaleString()} <span className="text-[10px]">GAL</span></span>
               </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold flex items-center gap-1"><DollarSign size={12}/> Op Cost</span>
              <span className="text-2xl font-mono text-red-400 tracking-tighter">${Math.floor(currentCost).toLocaleString()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
