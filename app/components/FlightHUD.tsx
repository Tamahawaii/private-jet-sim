'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { Plane, Compass, Globe, Crosshair, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FlightHUD() {
  const { fleet, selectedAircraftId, provisionalRoute, quickLaunchFlight, setProvisionalRoute, setActiveView } = useStore();
  const [distance, setDistance] = useState(0);
  
  const jet = fleet.find(j => j.id === selectedAircraftId);

  useEffect(() => {
    if (provisionalRoute && jet) {
        // very rough calc for UI
        const dLat = (provisionalRoute.destination.lat - provisionalRoute.origin.lat) * 60;
        const dLng = (provisionalRoute.destination.lng - provisionalRoute.origin.lng) * 60;
        setDistance(Math.round(Math.sqrt(dLat*dLat + dLng*dLng)));
    } else {
        setDistance(0);
    }
  }, [provisionalRoute, jet]);

  if (!jet) return null;

  const isFlying = jet.flightPhase === 'Cruise' || jet.flightPhase === 'Takeoff' || jet.flightPhase === 'Landing';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="absolute bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-30 pointer-events-auto"
      >
        <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 md:p-6 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-col gap-4">
          
          <div className="flex justify-between items-start">
             <div>
                <h2 className="text-[#00f0ff] font-mono text-sm tracking-widest font-bold flex items-center gap-2">
                   <Plane size={14}/> {jet.tailNumber}
                </h2>
                <h1 className="text-white text-2xl md:text-3xl font-black drop-shadow-md">{jet.model}</h1>
             </div>
             <button onClick={() => setActiveView('Dashboard')} className="p-1 text-white/50 hover:text-white rounded-full bg-white/5">
                <X size={20}/>
             </button>
          </div>

          <div className="grid grid-cols-3 gap-2 border-y border-white/10 py-3">
             <div className="flex flex-col">
                <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest font-bold">Status</span>
                <span className="text-sm font-mono text-white flex items-center gap-1">
                   {isFlying ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> : <span className="w-2 h-2 rounded-full bg-amber-500"/>}
                   {jet.flightPhase.toUpperCase()}
                </span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest font-bold">Speed</span>
                <span className="text-sm font-mono text-white">{isFlying ? jet.speedKnots : 0} KTS</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest font-bold">Altitude</span>
                <span className="text-sm font-mono text-white">{isFlying ? (jet.model.includes('BBJ') ? '41,000' : '45,000') : '0'} FT</span>
             </div>
          </div>

          <div className="flex flex-col gap-2">
            {!provisionalRoute ? (
                <div className="flex items-center justify-center p-4 border border-dashed border-white/20 rounded-lg bg-white/5 opacity-50 animate-pulse">
                   <p className="text-xs font-mono text-white flex items-center gap-2"><Crosshair size={14}/> CLICK GLOBE TO SET DESTINATION</p>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-3">
                   <div className="flex-1 bg-black/60 border border-[#00f0ff]/30 rounded-lg p-3 flex flex-col justify-center">
                       <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest font-bold">Target coordinates</span>
                       <span className="text-sm font-mono text-white truncate">{provisionalRoute.destination.name}</span>
                       <span className="text-xs font-mono text-zinc-500">{distance.toLocaleString()} NM</span>
                   </div>
                   <button 
                     onClick={() => {
                        quickLaunchFlight(jet.id, provisionalRoute.destination);
                        setProvisionalRoute(null);
                     }}
                     className="bg-[#ff0055] hover:bg-[#ff0055]/80 text-white font-black uppercase text-sm md:text-base tracking-widest rounded-lg px-6 py-3 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,85,0.4)] transition-all active:scale-95"
                   >
                     <Zap size={18} className="fill-white"/> ENGAGE
                   </button>
                </div>
            )}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
