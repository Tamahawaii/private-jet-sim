'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import FlightStateMachine from './components/FlightStateMachine';
import CabinConfigurator from './components/CabinConfigurator';
import FleetDashboard from './components/FleetDashboard';
import LogisticsPlanner from './components/LogisticsPlanner';
import { useStore } from './lib/store';
import { AnimatePresence, motion } from 'framer-motion';

const MapEngine = dynamic(() => import('./components/MapEngine'), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0c] z-0">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#00f0ff] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.5)]" />
        <p className="text-[#00f0ff] font-mono text-sm tracking-[0.2em] uppercase animate-pulse">Initializing 3D Engine...</p>
      </div>
    </div>
  )
});

export default function Home() {
  const { activeView, setActiveView } = useStore();

  return (
    <main className="relative w-full h-full min-h-screen overflow-hidden bg-[var(--background)]">
      
      {/* Background Map layer */}
      <div className="absolute inset-0 z-0">
        <MapEngine />
      </div>
      
      {/* High-performance Map Darkening Overlay (Animates Opacity rather than expensive WebGL Blur) */}
      <motion.div 
        className="absolute inset-0 bg-[#0a0a0c]/80 pointer-events-none z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: activeView === 'Configurator' || activeView === 'Fleet' ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{ backdropFilter: 'blur(8px)' }}
      />
      
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
            Hangar
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
            key="dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <div className="pointer-events-auto h-full w-full">
               <FleetDashboard />
            </div>
          </motion.div>
        )}

        {activeView === 'Logistics' && (
          <motion.div
            key="logistics"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <div className="pointer-events-auto h-full w-full">
               <LogisticsPlanner />
            </div>
          </motion.div>
        )}

        {activeView === 'StateMachine' && (
           <motion.div
             key="statemachine"
             initial={{ opacity: 0, y: 50 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 50 }}
             className="absolute inset-0 z-20 pointer-events-none"
           >
             <div className="pointer-events-auto grid w-full h-full relative">
                {/* Back to Hangar Button */}
                <div className="absolute top-28 left-10">
                   <button onClick={() => setActiveView('Fleet')} className="glass-panel px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase text-white/60 hover:text-white transition-colors border border-white/20">
                      ← Back to Hangar
                   </button>
                </div>
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
