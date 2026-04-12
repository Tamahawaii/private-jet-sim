'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import FlightStateMachine from './components/FlightStateMachine';
import CabinConfigurator from './components/CabinConfigurator';
import { useStore } from './lib/store';
import { AnimatePresence, motion } from 'framer-motion';

const MapEngine = dynamic(() => import('./components/MapEngine'), { ssr: false });

export default function Home() {
  const { activeView, setActiveView } = useStore();

  return (
    <main className="relative w-full h-full min-h-screen overflow-hidden bg-[var(--background)]">
      
      {/* Background Map - blurred if config is active */}
      <motion.div 
        className="absolute inset-0 z-0"
        animate={{
          filter: activeView === 'Configurator' ? 'blur(20px) brightness(0.3)' : 'blur(0px) brightness(1)',
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <MapEngine />
      </motion.div>
      
      {/* Top Nav */}
      <div className="absolute top-0 left-0 w-full p-6 z-30 flex justify-between items-center pointer-events-none">
        <div className="glass-panel px-6 py-3 rounded-full pointer-events-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-cyan)] shadow-[0_0_8px_var(--color-cyan)] animate-pulse" />
          <h1 className="text-lg font-semibold tracking-widest text-white/90">MANIFEST</h1>
        </div>
        <div className="glass-panel px-6 py-3 rounded-full pointer-events-auto flex gap-6 text-sm font-medium text-white/50 uppercase tracking-widest">
          <button 
            onClick={() => setActiveView('Fleet')} 
            className={`hover:text-white transition-colors ${activeView === 'Fleet' ? 'text-[var(--color-cyan)] drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]' : ''}`}
          >
            Fleet
          </button>
          <button 
            onClick={() => setActiveView('Logistics')} 
            className={`hover:text-white transition-colors ${activeView === 'Logistics' ? 'text-[var(--color-cyan)] drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]' : ''}`}
          >
            Logistics
          </button>
          <button 
            onClick={() => setActiveView('Configurator')} 
            className={`hover:text-white transition-colors ${activeView === 'Configurator' ? 'text-[var(--color-cyan)] drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]' : ''}`}
          >
            Cabin Configurator
          </button>
        </div>
      </div>
      
      {/* Content Swap */}
      <AnimatePresence>
        {activeView === 'Fleet' && (
          <motion.div
            key="fleet"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <div className="pointer-events-auto">
              <FlightStateMachine />
            </div>
          </motion.div>
        )}
        
        {activeView === 'Configurator' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 z-20 bg-black/40"
          >
            <CabinConfigurator />
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
