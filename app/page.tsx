'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import FlightStateMachine from './components/FlightStateMachine';
import CabinConfigurator from './components/CabinConfigurator';
import FleetDashboard from './components/FleetDashboard';
import LogisticsPlanner from './components/LogisticsPlanner';
import Dashboard from './components/Dashboard';
import Shop from './components/Shop';
import FlightAttendant from './components/FlightAttendant';
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
  const { activeView, setActiveView, playerCash } = useStore();

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
      
      {/* Deep Mobile Game Top Bar */}
      <div className="absolute top-0 left-0 w-full p-2 md:p-4 z-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start">
        
        <div className="flex gap-2 pointer-events-auto">
           {/* Navigation Toggle (Compact for Mobile) */}
           <div className="hidden md:flex bg-black/60 border border-white/10 p-1 rounded-lg gap-1 backdrop-blur-md">
             {(['Dashboard', 'Fleet', 'Logistics'] as const).map(view => (
                <button 
                  key={view}
                  onClick={() => setActiveView(view)} 
                  className={`px-4 py-1 text-[10px] uppercase font-bold tracking-widest rounded transition-all ${activeView === view ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30' : 'text-white/40 hover:text-white/80'}`}
                >
                  {view}
                </button>
             ))}
           </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
           {/* Navigation Toggle (Compact for Mobile) */}
           <div className="hidden md:flex bg-black/60 border border-white/10 p-1 rounded-lg gap-1 backdrop-blur-md">
             {(['Dashboard', 'Fleet', 'Logistics'] as const).map(view => (
                <button 
                  key={view}
                  onClick={() => setActiveView(view)} 
                  className={`px-4 py-1 text-[10px] uppercase font-bold tracking-widest rounded transition-all ${activeView === view ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30' : 'text-white/40 hover:text-white/80'}`}
                >
                  {view}
                </button>
             ))}
           </div>

           {/* Currency Indicator */}
           <div className="bg-black/80 border border-white/10 px-3 py-1 rounded flex items-center gap-2 backdrop-blur-md shadow-lg shadow-black/50">
              <span className="text-[#00f0ff] font-bold text-xs">$</span>
              <span className="text-[#00f0ff] font-mono font-black text-lg">{(playerCash / 1000000000).toFixed(1)}B</span>
           </div>
           
           {/* Store Action */}
           <button onClick={() => setActiveView('Dashboard')} className="bg-gradient-to-b from-green-500 to-green-700 border border-green-400 px-3 py-1 text-white font-bold text-xs rounded uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all">
              + Shop
           </button>
        </div>
      </div>
      
      {/* Content Swap */}
      <AnimatePresence>
        {activeView === 'Dashboard' && (
          <motion.div
            key="dash"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <div className="pointer-events-auto h-full w-full">
               <Dashboard />
            </div>
          </motion.div>
        )}

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
             {/* Back to Hangar Button */}
             <div className="absolute top-28 left-10 pointer-events-auto">
                <button onClick={() => setActiveView('Fleet')} className="glass-panel px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase text-white/60 hover:text-white transition-colors border border-white/20 shadow-lg">
                   ← Back to Hangar
                </button>
             </div>
             
             {/* Flight State Wrapper */}
             <div className="absolute bottom-10 left-10 right-10 pointer-events-auto z-10 flex flex-col items-start gap-4">
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
            className="absolute inset-0 z-20 bg-black/40 pointer-events-auto"
          >
            <CabinConfigurator />
          </motion.div>
        )}

        {activeView === 'Shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            <div className="pointer-events-auto h-full w-full">
               <Shop />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FlightAttendant />

    </main>
  );
}
