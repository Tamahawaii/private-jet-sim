import React from 'react';
import { Aircraft } from '../../../../types';
import { Plane, AlertTriangle } from 'lucide-react';

interface Props {
  fleet: Aircraft[];
  prefillError?: boolean;
  onSelect: (id: string) => void;
}

export default function Step1Aircraft({ fleet, prefillError, onSelect }: Props) {
  if (fleet.length === 0) {
      return <div className="text-zinc-500 font-mono tracking-widest text-sm">NO AIRCRAFT IN ROSTER. ACQUIRE ONE FROM ACQUISITIONS.</div>;
  }

  return (
    <div className="w-full max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500">
      <h2 className="text-2xl font-black font-mono tracking-widest mb-2 max-w-md uppercase">Select Aircraft</h2>
      <p className="text-zinc-400 font-mono text-xs tracking-widest mb-8 uppercase">Asset must be strictly secured in a hangar for mission assignment.</p>
      
      {prefillError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded mb-8 font-mono text-xs tracking-widest flex items-center gap-3">
           <AlertTriangle size={16} />
           REQUESTED AIRCRAFT IS CURRENTLY IN TRANSIT OR UNAVAILABLE FOR DISPATCH.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {fleet.map(jet => {
          const isParked = jet.status === 'parked';
          return (
             <button 
                key={jet.id}
                disabled={!isParked}
                onClick={() => isParked && onSelect(jet.tailNumber)}
                className={`flex flex-col border p-4 rounded-xl text-left transition-all relative overflow-hidden group ${
                   isParked 
                      ? 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-[#00f0ff]/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] outline-none' 
                      : 'border-white/5 bg-black/20 opacity-40 cursor-not-allowed'
                }`}
             >
                <div className="flex items-center justify-between w-full mb-4">
                   <div className="font-mono text-lg tracking-widest font-black text-white group-hover:text-[#00f0ff] transition-colors">{jet.tailNumber}</div>
                   {!isParked && <span className="text-[10px] font-mono tracking-widest bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded uppercase">UNAVAILABLE</span>}
                </div>
                
                <div className="text-zinc-400 text-xs font-sans tracking-wide mb-6">{jet.model}</div>
                
                <div className="flex items-center gap-2 text-[#00f0ff] font-mono text-[10px] tracking-widest mt-auto bg-[#00f0ff]/5 self-start px-2 py-1 rounded">
                   <Plane size={12} />
                   {isParked ? `AT ${jet.currentLocationICAO}` : 'IN TRANSIT'}
                </div>
             </button>
          )
        })}
      </div>
    </div>
  );
}
