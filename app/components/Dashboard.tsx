'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store';
import { Plane, Navigation, Globe, Building2, Wind, Droplets } from 'lucide-react';
import VirtualAttendant from './VirtualAttendant';

export default function Dashboard() {
  const { fleet, setActiveView } = useStore();

  const totalValue = fleet.reduce((acc, jet) => acc + (jet.model.includes('BBJ') || jet.model.includes('ACJ') ? 120000000 : jet.model.includes('Citation') || jet.model.includes('Praetor') ? 20000000 : 65000000), 0);
  const activeFlights = fleet.filter(j => j.flightPhase !== 'Hangar' && j.flightPhase !== 'Pre-flight');
  const airborne = fleet.filter(j => j.flightPhase === 'Cruise');

  return (
    <div className="absolute inset-0 z-20 flex pt-28 pb-10 px-10 gap-6 overflow-y-auto">
      
      {/* Main Operations HUD */}
      <div className="flex-1 flex flex-col gap-6">
        <h1 className="text-3xl font-light tracking-[0.2em] text-white">OPERATIONS <span className="text-[#00f0ff] font-bold">CENTER</span></h1>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 border-[1px] border-white/5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-white/5 flex transition-transform group-hover:scale-110"><Building2 size={100} /></div>
            <div className="text-xs tracking-widest text-white/50 uppercase font-bold relative z-10">Total Fleet Valuation</div>
            <div className="text-3xl font-light text-white relative z-10">${(totalValue / 1000000).toFixed(1)}M</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 border-[1px] border-white/5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-[#00f0ff]/5 flex transition-transform group-hover:scale-110"><Plane size={100} /></div>
            <div className="text-xs tracking-widest text-[#00f0ff]/50 uppercase font-bold relative z-10">Active Flights</div>
            <div className="text-3xl font-light text-[#00f0ff] relative z-10">{activeFlights.length} / {fleet.length}</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 border-[1px] border-white/5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-white/5 flex transition-transform group-hover:scale-110"><Globe size={100} /></div>
            <div className="text-xs tracking-widest text-white/50 uppercase font-bold relative z-10">Airborne Assets</div>
            <div className="text-3xl font-light text-white relative z-10">{airborne.length}</div>
          </div>
        </div>

        {/* Global Weather Widget */}
        <div className="glass-panel p-6 rounded-2xl border-[1px] border-white/5 mt-auto">
           <h3 className="text-xs font-bold tracking-widest uppercase text-white/60 mb-4 flex items-center gap-2"><Wind size={14}/> Atmosphere Report</h3>
           <div className="grid grid-cols-4 gap-4">
              {['New York (JFK)', 'London (LHR)', 'Dubai (DXB)', 'Tokyo (HND)'].map(city => (
                 <div key={city} className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">{city}</span>
                    <div className="flex items-center justify-between">
                       <span className="text-xl text-white font-light">{Math.floor(Math.random() * 40) + 40}°F</span>
                       <Droplets size={16} className="text-[#00f0ff]/50" />
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* Virtual Dispathcer Side Panel */}
      <VirtualAttendant />

    </div>
  );
}
