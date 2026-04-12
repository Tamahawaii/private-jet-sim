'use client';

import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Plane, Plus, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FleetDashboard() {
  const { fleet, setSelectedAircraftId, setActiveView, timeMultiplier, setTimeMultiplier, addAircraft } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTail, setNewTail] = useState('');
  const [newModel, setNewModel] = useState('Gulfstream G650ER');

  const handleAdd = () => {
    if (newTail.trim() !== '') {
      addAircraft(newTail.toUpperCase(), newModel);
      setIsAdding(false);
      setNewTail('');
    }
  };

  const handleSelect = (id: string) => {
    setSelectedAircraftId(id);
    setActiveView('StateMachine');
  };

  const isLocked = (lockedUntil: number | null) => lockedUntil ? Date.now() < lockedUntil : false;

  return (
    <div className="absolute inset-0 z-20 flex pt-28 pb-10 px-10 gap-10 bg-black/60 backdrop-blur-xl overflow-y-auto">
      <div className="flex-1 max-w-6xl mx-auto flex flex-col gap-8">
        
        <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 rounded-2xl glass-panel">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-[#00f0ff] mb-2 uppercase">Hangar Fleet</h1>
            <p className="text-white/60 text-sm">Manage your aircraft and orchestrate flights</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
             <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                {[1, 10, 60, 3600].map(m => (
                  <button 
                    key={m} 
                    onClick={() => setTimeMultiplier(m)}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${timeMultiplier === m ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'text-white/50 hover:text-white'}`}
                  >
                    {m}x
                  </button>
                ))}
             </div>
             <p className="text-xs text-white/40 tracking-widest uppercase">Time Scale Scale</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fleet.map(jet => {
            const locked = isLocked(jet.lockedUntil);
            return (
              <motion.div 
                key={jet.id}
                whileHover={{ y: -5 }}
                onClick={() => handleSelect(jet.id)}
                className={`glass-panel p-6 rounded-2xl cursor-pointer transition-all border ${locked ? 'border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-[#00f0ff]/20 hover:border-[#00f0ff]/80 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Plane className={locked ? 'text-[#d4af37]' : 'text-[#00f0ff]'} />
                    <h2 className="text-xl font-bold tracking-wider">{jet.tailNumber}</h2>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-white/50">{jet.model}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-white/40"/>
                    <span className="text-sm">Location: <strong className="text-white">{jet.currentLocation.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-white/40"/>
                    <span className="text-sm">Status: <strong className={locked ? 'text-[#d4af37]' : 'text-[#00f0ff]'}>{jet.flightPhase}</strong></span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Add Aircraft Card */}
          {!isAdding ? (
            <motion.div 
              whileHover={{ y: -5 }}
              onClick={() => setIsAdding(true)}
              className="glass-panel p-6 rounded-2xl cursor-pointer border border-white/10 hover:border-white/30 flex flex-col items-center justify-center min-h-[160px] text-white/50 hover:text-white transition-colors"
            >
              <Plus size={32} className="mb-2" />
              <span className="uppercase tracking-widest text-sm font-semibold">Acquire Aircraft</span>
            </motion.div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-white/20 flex flex-col gap-4 min-h-[160px]">
              <input 
                autoFocus
                value={newTail}
                onChange={e => setNewTail(e.target.value)}
                placeholder="TAIL NUMBER" 
                className="bg-black/50 border border-white/10 rounded-lg p-3 text-white uppercase outline-none focus:border-[#00f0ff]"
              />
              <select 
                value={newModel}
                onChange={e => setNewModel(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#00f0ff]"
              >
                <option>Gulfstream G650ER</option>
                <option>Gulfstream G700</option>
                <option>Bombardier Global 7500</option>
                <option>Bombardier Global 8000</option>
                <option>Dassault Falcon 8X</option>
                <option>Dassault Falcon 10X</option>
                <option>Cessna Citation Longitude</option>
                <option>Embraer Praetor 600</option>
                <option>Boeing BBJ 787</option>
                <option>Airbus ACJ TwoTwenty</option>
              </select>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-xs uppercase tracking-widest bg-white/5 rounded-lg hover:bg-white/10">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-2 text-xs uppercase tracking-widest bg-[#00f0ff]/20 text-[#00f0ff] rounded-lg hover:bg-[#00f0ff]/30">Confirm</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
