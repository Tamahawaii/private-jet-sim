'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plane, CloudRain, MapPin, Gauge } from 'lucide-react';
import { useStore, FlightPhase } from '../lib/store';

const PHASES: FlightPhase[] = ['Hangar', 'Pre-flight', 'Taxi', 'Takeoff', 'Cruise', 'Landing'];

export default function FlightStateMachine() {
  const { flightPhase, setFlightPhase, weatherEnabled, setWeatherEnabled } = useStore();

  const currentIndex = PHASES.indexOf(flightPhase);

  const nextPhase = () => {
    if (currentIndex < PHASES.length - 1) setFlightPhase(PHASES[currentIndex + 1]);
  };

  const prevPhase = () => {
    if (currentIndex > 0) setFlightPhase(PHASES[currentIndex - 1]);
  };

  return (
    <div className="absolute bottom-10 left-10 right-10 z-10 flex justify-between items-end">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl w-96 flex flex-col gap-4 text-[var(--foreground)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="text-[var(--color-cyan)]" />
            <h2 className="text-xl font-bold font-sans">N174JS</h2>
          </div>
          <span className="text-xs uppercase tracking-widest text-[var(--color-gold)]">{flightPhase}</span>
        </div>
        
        <div className="h-px bg-white/10 w-full" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <MapPin size={16} className="text-gray-400"/>
            <span className="text-sm">LAX &rarr; HNL</span>
          </div>
          <div className="flex items-center gap-3">
            <Gauge size={16} className="text-gray-400"/>
            <span className="text-sm tracking-wider">ALT: {flightPhase === 'Cruise' ? '41,000 FT' : '0 FT'}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button 
            disabled={currentIndex === 0}
            onClick={prevPhase}
            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-xs tracking-wider uppercase border border-white/10 rounded transition-colors disabled:opacity-30"
          >
            Revert
          </button>
          <button 
            disabled={currentIndex === PHASES.length - 1}
            onClick={nextPhase}
            className="flex-1 px-4 py-2 bg-[var(--color-cyan)]/20 hover:bg-[var(--color-cyan)]/30 text-[var(--color-cyan)] text-xs tracking-wider uppercase border border-[var(--color-cyan)]/30 rounded transition-colors disabled:opacity-30 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          >
            {currentIndex === PHASES.length - 1 ? 'Arrived' : 'Advance'}
          </button>
        </div>
      </motion.div>

      <div className="flex gap-4">
        <button 
          onClick={() => setWeatherEnabled(!weatherEnabled)}
          className={`glass-panel p-4 rounded-xl flex items-center justify-center transition-colors ${weatherEnabled ? 'bg-[var(--color-cyan)]/20 border-[var(--color-cyan)]/30 text-[var(--color-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-gray-400'}`}
        >
          <CloudRain size={24} />
        </button>
      </div>
    </div>
  );
}
