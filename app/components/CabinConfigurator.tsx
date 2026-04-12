'use client';

import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useStore, ModuleType } from '../lib/store';
import { Save, CheckCircle, AlertTriangle } from 'lucide-react';

const MODULES: { id: ModuleType; label: string; desc: string; icon: string }[] = [
  { id: 'Executive', label: 'Executive Club', desc: '4 premium leather swivel seats', icon: '💺' },
  { id: 'MasterSuite', label: 'Master Suite', desc: 'King bed with en-suite shower', icon: '🛏️' },
  { id: 'Galley', label: 'Gourmet Galley', desc: 'Full kitchen and bar setup', icon: '🍾' },
  { id: 'Cinema', label: 'Cinema Room', desc: '85" 8K display with surround', icon: '🎞️' },
];

function JetModuleRenderer({ moduleType }: { moduleType: ModuleType }) {
  if (moduleType === 'Executive') {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center gap-2 relative bg-black/40">
         <div className="flex gap-16">
            <div className="w-8 h-10 bg-zinc-800 rounded-t-xl rounded-b-sm border-2 border-zinc-600 shadow-inner" />
            <div className="w-8 h-10 bg-zinc-800 rounded-t-xl rounded-b-sm border-2 border-zinc-600 shadow-inner" />
         </div>
         <div className="w-40 h-12 bg-[#3e2723] rounded border-2 border-[#1a0f0a] shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center relative">
            <div className="w-32 h-6 bg-[#2d1b15] rounded-sm opacity-80" />
         </div>
         <div className="flex gap-16">
            <div className="w-8 h-10 bg-zinc-800 rounded-b-xl rounded-t-sm border-2 border-zinc-600 shadow-inner" />
            <div className="w-8 h-10 bg-zinc-800 rounded-b-xl rounded-t-sm border-2 border-zinc-600 shadow-inner" />
         </div>
         <div className="absolute left-4 top-0 bottom-0 w-8 flex flex-col justify-center opacity-10 border-r-2 border-dashed border-white/50" />
      </div>
    );
  }
  
  if (moduleType === 'MasterSuite') {
    return (
      <div className="w-full h-full flex items-center justify-end pr-6 pl-16 relative bg-black/40">
         <div className="w-full max-w-[200px] h-24 bg-zinc-900 border-2 border-zinc-700 rounded-xl flex items-center justify-start p-2 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
            <div className="flex flex-col gap-2 z-10">
               <div className="w-10 h-7 bg-zinc-300 rounded-md shadow-sm" />
               <div className="w-10 h-7 bg-zinc-300 rounded-md shadow-sm" />
            </div>
            <div className="ml-6 w-3/4 h-[90%] bg-zinc-800/80 rounded-md border border-zinc-600/50" />
         </div>
         <div className="absolute left-4 top-0 bottom-0 w-8 flex flex-col justify-center opacity-10 border-r-2 border-dashed border-white/50" />
      </div>
    );
  }

  if (moduleType === 'Cinema') {
    return (
      <div className="w-full h-full flex items-center justify-between px-8 relative bg-black/40">
         <div className="w-12 h-28 bg-zinc-800 border-[3px] border-zinc-600 rounded-l-2xl rounded-r-md shadow-xl" />
         <div className="w-6 h-32 bg-black border border-zinc-900 rounded shadow-[0_0_20px_rgba(0,240,255,0.15)] flex items-center justify-center relative">
             <div className="w-1 h-28 bg-[#00f0ff]/20 rounded-full animate-pulse" />
         </div>
      </div>
    );
  }

  if (moduleType === 'Galley') {
    return (
       <div className="w-full h-full flex justify-between px-4 relative bg-black/40">
          <div className="w-20 h-full bg-zinc-900 border-r-2 border-zinc-700 flex flex-col justify-around py-2 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
             <div className="w-12 h-12 ml-3 rounded-full border-2 border-zinc-600 bg-zinc-800 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-zinc-500/50" />
             </div>
             <div className="w-16 h-3 ml-2 bg-zinc-700 rounded-sm" />
          </div>
          <div className="w-16 h-full bg-zinc-900 border-l-2 border-zinc-700 flex flex-col justify-center gap-4 p-3 shadow-[-2px_0_10px_rgba(0,0,0,0.5)]">
             <div className="w-10 h-10 rounded bg-zinc-800 border-2 border-zinc-600" />
             <div className="w-10 h-10 rounded bg-zinc-800 border-2 border-zinc-600" />
          </div>
       </div>
    );
  }

  return null;
}

function DraggableModule({ module, isOverlay = false }: { module: typeof MODULES[0], isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${module.id}`,
    data: { type: module.id }
  });
  
  const style = transform && !isOverlay ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`glass-panel p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-[var(--color-cyan)]/50 transition-colors ${isDragging && !isOverlay ? 'opacity-30' : 'opacity-100'} ${isOverlay ? 'scale-105 shadow-[0_0_20px_var(--color-cyan)] border-[var(--color-cyan)] bg-black/60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{module.icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-white/90">{module.label}</h3>
          <p className="text-xs text-white/50">{module.desc}</p>
        </div>
      </div>
    </div>
  );
}

function DroppableSlot({ index, currentModuleId }: { index: number, currentModuleId: ModuleType }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${index}`,
    data: { index }
  });

  const moduleData = currentModuleId !== 'Empty' ? MODULES.find(m => m.id === currentModuleId) : null;

  return (
    <div 
      ref={setNodeRef}
      className={`w-full h-36 border-y-2 border-dashed flex items-center justify-center transition-colors relative overflow-hidden ${isOver ? 'border-[var(--color-cyan)] bg-[var(--color-cyan)]/10 shadow-[0_0_15px_rgba(0,240,255,0.2)] z-10' : 'border-white/10 bg-black/20 hover:bg-black/50'} ${index === 0 ? 'rounded-t-3xl border-t-2' : ''} ${index === 3 ? 'rounded-b-3xl border-b-2' : ''}`}
    >
      {moduleData ? (
        <JetModuleRenderer moduleType={currentModuleId} />
      ) : (
        <span className="text-white/30 text-xs uppercase tracking-widest font-sans">Empty Slot {index + 1}</span>
      )}
    </div>
  );
}

export default function CabinConfigurator() {
  const { fleet, selectedAircraftId, setCabinSlot } = useStore();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedJet = fleet.find(j => j.id === selectedAircraftId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.data.current?.type);
  };

  const handleDragEnd = (event: any) => {
    setActiveDragId(null);
    const { over, active } = event;
    if (selectedJet && over && over.id.startsWith('slot-')) {
      const slotIndex = over.data.current?.index;
      const moduleType = active.data.current?.type as ModuleType;
      if (slotIndex !== undefined && moduleType) {
        setCabinSlot(selectedJet.id, slotIndex, moduleType);
      }
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const activeModule = activeDragId ? MODULES.find(m => m.id === activeDragId) : null;

  return (
    <div className="w-full h-full flex pt-24 pb-10 px-10 gap-10">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        
        {/* Sidebar */}
        <div className="w-80 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-widest text-white/90 uppercase mb-4">Cabin Modules</h2>
            <div className="flex flex-col gap-4 flex-1">
              {MODULES.map(m => (
                <DraggableModule key={m.id} module={m} />
              ))}
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className={`w-full py-4 rounded-xl font-semibold tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                saveSuccess 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                  : 'bg-[var(--color-gold)] text-black hover:bg-[#ebd583] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]'
              }`}
            >
              {isSaving ? (
                <span className="animate-pulse flex items-center gap-2">Syncing...</span>
              ) : saveSuccess ? (
                <><CheckCircle size={20} /> Configuration Saved</>
              ) : (
                <><Save size={20} /> Save Format</>
              )}
            </button>
          </div>
        </div>

        {/* Fuselage Blueprint */}
        <div className="flex-1 flex justify-center items-center overflow-y-auto">
          {!selectedJet ? (
            <div className="text-center text-white/40 flex flex-col items-center gap-4">
               <AlertTriangle size={48} className="text-[#00f0ff]" />
               <p className="tracking-widest uppercase">No Aircraft Selected</p>
            </div>
          ) : (
            <div className="w-full max-w-xl relative">
              <div className="absolute inset-0 border-[2px] border-white/20 rounded-[120px] pointer-events-none" />
              <div className="absolute inset-0 border-[1px] border-[var(--color-cyan)]/30 rounded-[120px] pointer-events-none blur-sm" />
              
              <div className="py-20 px-16 flex flex-col gap-6 relative z-10">
                <div className="flex justify-between items-center px-4 mb-4">
                  <div className="text-white/40 tracking-[0.5em] text-sm md:text-base font-light uppercase">Cockpit</div>
                  <div className="text-[#00f0ff] tracking-widest text-xs font-bold bg-[#00f0ff]/10 px-3 py-1 rounded-full">{selectedJet.model}</div>
                </div>

                {(selectedJet.cabinConfig || []).map((slot, index) => (
                  <DroppableSlot key={`slot-${index}`} index={index} currentModuleId={slot} />
                ))}

                <div className="text-center text-white/40 tracking-[0.5em] text-sm md:text-base font-light mt-2 uppercase">Aft / Cargo</div>
              </div>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeModule ? <DraggableModule module={activeModule} isOverlay /> : null}
        </DragOverlay>

      </DndContext>
    </div>
  );
}
