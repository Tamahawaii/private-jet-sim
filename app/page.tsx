'use client';

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import FleetSidebar from './components/FleetSidebar';
import DispatchController from './components/DispatchController';
import FlightAttendant from './components/FlightAttendant';
import { ErrorBoundary } from './components/ErrorBoundary';

const MapEngine = dynamic(() => import('./components/MapEngine'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0c] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#00f0ff] border-t-transparent rounded-full animate-spin flex items-center justify-center">
            <span className="text-xl">✈</span>
        </div>
        <p className="font-mono text-sm tracking-widest text-[#00f0ff] animate-pulse">BOOTING AVIONICS...</p>
      </div>
    </div>
  )
});

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return (
     <div className="w-screen h-screen bg-[#0a0a0c] flex items-center justify-center text-[#00f0ff] font-mono tracking-widest animate-pulse">
        INITIALIZING COMMAND CENTER...
     </div>
  );

  return (
    <main className="relative w-full h-full xl:min-h-screen overflow-hidden bg-[var(--background)]">
      <ErrorBoundary>
        {/* 3D MAP LAYER (ALWAYS RENDERED, Z-INDEX 0) */}
        <div className="absolute inset-0 z-0">
          <Suspense fallback={null}>
            <MapEngine />
          </Suspense>
        </div>

        {/* OVERLAYS */}
        <FleetSidebar />
        <DispatchController />
        <FlightAttendant />
      </ErrorBoundary>
    </main>
  );
}
