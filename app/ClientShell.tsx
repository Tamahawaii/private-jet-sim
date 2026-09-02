'use client';

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import TopNav from './components/TopNav';
import BottomTabs from './components/BottomTabs';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePathname } from 'next/navigation';
import { bootstrapWorld } from '../lib/bootstrap';
import { persistClock } from './lib/store';
import FlightMomentsRunner from './components/FlightMomentsRunner';
import WorldRunner from './components/WorldRunner';
import { useIsDesktop } from './lib/useIsDesktop';

const MapEngine = dynamic(() => import('./components/map/MapEngine'), {
  ssr: false,
  loading: () => <BootScreen label="Booting avionics" />,
});

function BootScreen({ label }: { label: string }) {
  return (
    <div className="w-full h-dvh flex items-center justify-center bg-[#070b12] text-white">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border border-[var(--accent)]/30" />
          <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-[var(--accent)] text-lg">✈</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--accent)] uppercase animate-pulse">{label}</div>
          <div className="font-serif text-2xl text-white/90 mt-2">JETSTREAM</div>
        </div>
      </div>
    </div>
  );
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  // The planner sits beside the globe on desktop, but covers it on phones (no point rendering it there).
  const isMapActive = pathname === '/' || pathname === '/world' || (pathname.startsWith('/flight/') && (isDesktop || !pathname.startsWith('/flight/new')));
  const [bootstrapped, setBootstrapped] = useState(false);
  // The globe mounts the first time a map route is shown and then stays warm in the background.
  const [mapMounted, setMapMounted] = useState(false);
  useEffect(() => { if (isMapActive) setMapMounted(true); }, [isMapActive]);

  useEffect(() => {
    bootstrapWorld().then(() => setBootstrapped(true)).catch((e) => { console.error(e); setBootstrapped(true); });
  }, []);

  // Snapshot the sim clock so closing the app resumes from where you left off.
  useEffect(() => {
    const id = setInterval(persistClock, 10000);
    const onHide = () => persistClock();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide); };
  }, []);

  if (!bootstrapped) return <BootScreen label="Booting simulation" />;

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-[#070b12]">
      <ErrorBoundary>
        <TopNav />
        <ToastContainer />
        <FlightMomentsRunner />
        <WorldRunner />
        {/* GLOBE LAYER (ALWAYS MOUNTED, hidden off-map to keep tiles warm) */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${isMapActive ? 'opacity-100 z-0 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}`}>
          {mapMounted && (
            <Suspense fallback={null}>
              <MapEngine />
            </Suspense>
          )}
        </div>

        {/* PAGE CONTENT */}
        <div className={`z-10 relative w-full h-full ${isMapActive ? 'pointer-events-none' : 'pointer-events-auto'}`}>
           {children}
        </div>
        <BottomTabs />
      </ErrorBoundary>
    </main>
  );
}
