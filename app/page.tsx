import React from 'react';
import dynamic from 'next/dynamic';
import FlightStateMachine from './components/FlightStateMachine';

const MapEngine = dynamic(() => import('./components/MapEngine'), { ssr: false });

export default function Home() {
  return (
    <main className="relative w-full h-full min-h-screen overflow-hidden bg-[var(--background)]">
      <MapEngine />
      
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center pointer-events-none">
        <div className="glass-panel px-6 py-3 rounded-full pointer-events-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-cyan)] shadow-[0_0_8px_var(--color-cyan)] animate-pulse" />
          <h1 className="text-lg font-semibold tracking-widest text-white/90">MANIFEST</h1>
        </div>
        <div className="glass-panel px-6 py-3 rounded-full pointer-events-auto flex gap-6 text-sm font-medium text-white/80 uppercase tracking-widest">
          <span className="text-[var(--color-cyan)] drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">Fleet</span>
          <span className="hover:text-white cursor-pointer transition-colors">Logistics</span>
          <span className="hover:text-white cursor-pointer transition-colors">Cabin Configurator</span>
        </div>
      </div>
      
      <FlightStateMachine />
    </main>
  );
}
