import React from 'react';
import { Aircraft } from '../../../../types';
import { Plane, AlertTriangle, Gauge, Route } from 'lucide-react';
import { getAirport, placeLine } from '../../../../lib/flight/airports';

interface Props {
  fleet: Aircraft[];
  prefillError?: boolean;
  onSelect: (id: string) => void;
}

export default function Step1Aircraft({ fleet, prefillError, onSelect }: Props) {
  if (fleet.length === 0) {
      return <div className="text-zinc-500 text-sm">No aircraft in your roster yet. Acquire one from the market.</div>;
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-right-4 duration-500 pb-6">
      <h2 className="font-serif text-[28px] text-white">Which jet?</h2>
      <p className="text-[12.5px] text-zinc-400 mb-5">Only parked aircraft can be dispatched.</p>

      {prefillError && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-xl mb-5 text-[12px] flex items-center gap-3">
           <AlertTriangle size={16} />
           That aircraft is in transit — pick another.
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5">
        {fleet.map(jet => {
          const isParked = jet.status === 'parked';
          const here = getAirport(jet.currentLocationICAO);
          return (
             <button
                key={jet.id}
                disabled={!isParked}
                onClick={() => isParked && onSelect(jet.tailNumber)}
                className={`flex items-center gap-4 border px-4 py-3.5 rounded-2xl text-left transition-all group ${
                   isParked
                      ? 'border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-[var(--accent)]/50'
                      : 'border-white/5 bg-black/20 opacity-40 cursor-not-allowed'
                }`}
             >
                <div className="w-16 h-12 shrink-0 flex items-center justify-center">
                  {jet.layoutImage ? <img src={jet.layoutImage} alt="" className="w-full h-full object-contain opacity-80" /> : <Plane size={22} className="text-white/30" />}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2">
                     <span className="font-mono text-[16px] font-bold tracking-wider text-white group-hover:text-[var(--accent)] transition-colors">{jet.tailNumber}</span>
                     {!isParked && <span className="text-[9px] font-mono tracking-widest bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase">In transit</span>}
                   </div>
                   <div className="text-[12.5px] text-zinc-400 truncate">{jet.model}</div>
                   <div className="text-[11px] text-zinc-500 truncate mt-0.5">{isParked ? `At ${placeLine(here, jet.currentLocationICAO)}` : 'Airborne'}</div>
                </div>
                <div className="text-right shrink-0 text-[10.5px] font-mono text-zinc-500 space-y-1">
                   <div className="flex items-center justify-end gap-1"><Route size={10} /> {jet.rangeNM.toLocaleString()} NM</div>
                   <div className="flex items-center justify-end gap-1"><Gauge size={10} /> {jet.speedKnots} kts</div>
                </div>
             </button>
          )
        })}
      </div>
    </div>
  );
}
