'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { AnimatePresence, motion } from 'framer-motion';

export default function FlightAttendant() {
  const { activeView, selectedAircraftId, fleet } = useStore();
  const [dialogue, setDialogue] = useState('');
  const [show, setShow] = useState(true);

  const jet = fleet.find(j => j.id === selectedAircraftId);

  useEffect(() => {
    setShow(false);
    const timer = setTimeout(() => {
      let nextDialogue = '';
      if (activeView === 'Dashboard') {
        nextDialogue = "Welcome back, Commander! Enter the Hangar to manage your assets or check Logistics to schedule global contracts.";
      } else if (activeView === 'Fleet') {
        nextDialogue = "The Hangar. Swipe through your active fleet below to select an aircraft to dispatch.";
      } else if (activeView === 'Logistics') {
        nextDialogue = "The World Map. Select an Origin and Destination to analyze viability and authorize contracts.";
      } else if (activeView === 'StateMachine') {
         if (jet?.flightPhase === 'Cruise') {
            nextDialogue = "Aircraft is currently in transit. Tap the routing header to inspect live Atmospheric conditions.";
         } else if (jet?.flightPhase === 'Hangar' || jet?.flightPhase === 'Pre-flight') {
            nextDialogue = "Aircraft standing by. Set localized flight contracts and hit ACTIVATE to proceed to Taxi.";
         } else {
            nextDialogue = "Ground operations underway. Monitor progress carefully.";
         }
      }
      setDialogue(nextDialogue);
      setShow(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [activeView, jet?.flightPhase]);

  if (!show) return null;

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
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-24 h-32 bg-gray-200 rounded-t-full border border-white overflow-hidden pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center shrink-0"
      >
         <img src="/flight_attendant_avatar.png" alt="Dispatch" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
         {/* Fallback silhouette if image doesn't exist yet */}
         <div className="absolute inset-0 flex items-center justify-center -z-10 text-gray-400 text-xs">AI</div>
      </motion.div>
    </div>
  );
}
