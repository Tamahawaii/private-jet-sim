'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../lib/repositories/aircraft';
import { AnimatePresence, motion } from 'framer-motion';

export default function FlightAttendant() {
  const { selectedAircraftId } = useStore();
  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
  const [dialogue, setDialogue] = useState('');
  const [show, setShow] = useState(true);

  const jet = fleet.find(j => j.id === selectedAircraftId);

  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (isClosed) return;
    setShow(false);
    const timer = setTimeout(() => {
      let nextDialogue = '';
      if (!jet) {
         nextDialogue = "Command Center active. Select an aircraft from the fleet roster to begin dispatch.";
      } else if (jet.flightPhase === 'Cruise') {
         nextDialogue = `${jet.tailNumber} is currently in transit to ${jet.destination?.name || 'its destination'}. Monitoring telemetry...`;
      } else if (jet.flightPhase === 'Hangar' || jet.flightPhase === 'Pre-flight') {
         nextDialogue = `${jet.tailNumber} standing by. Click the globe to map a route and authorize the launch sequence.`;
      } else {
         nextDialogue = `Ground operations underway for ${jet.tailNumber}. Tracking live maneuvers.`;
      }
      setDialogue(nextDialogue);
      setShow(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedAircraftId, jet?.flightPhase, jet?.destination?.name, isClosed]);

  if (isClosed || !show) return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 flex items-end gap-2 pointer-events-none max-w-[400px]">
      <AnimatePresence>
        {dialogue && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white text-black p-3 rounded-2xl rounded-br-none shadow-xl border border-gray-200 pointer-events-auto"
          >
            <p className="text-xs font-medium font-sans leading-relaxed">{dialogue}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative pointer-events-auto">
        <button 
           onClick={() => setIsClosed(true)} 
           className="absolute top-0 right-0 z-10 w-5 h-5 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow transition-colors transform translate-x-1/2 -translate-y-1/2"
        >
           ✕
        </button>
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-24 h-32 bg-gray-200 rounded-t-full border border-white overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center shrink-0"
        >
           <img src="/flight_attendant_avatar.png" alt="Dispatch" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
           <div className="absolute inset-0 flex items-center justify-center -z-10 text-gray-400 text-xs">AI</div>
        </motion.div>
      </div>
    </div>
  );
}
