'use client';

import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useStore, ModuleType } from '../lib/store';
import { Save, CheckCircle } from 'lucide-react';

const MODULES: { id: ModuleType; label: string; desc: string; icon: string }[] = [
  { id: 'Executive', label: 'Executive Club', desc: '4 premium leather swivel seats', icon: '💺' },
  { id: 'MasterSuite', label: 'Master Suite', desc: 'King bed with en-suite shower', icon: '🛏️' },
  { id: 'Galley', label: 'Gourmet Galley', desc: 'Full kitchen and bar setup', icon: '🍾' },
  { id: 'Cinema', label: 'Cinema Room', desc: '85" 8K display with surround', icon: '🎞️' },
];

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
      className={`w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors ${isOver ? 'border-[var(--color-cyan)] bg-[var(--color-cyan)]/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'border-white/20 bg-black/20'}`}
    >
      {moduleData ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl">{moduleData.icon}</span>
          <span className="text-sm font-semibold tracking-wider text-[var(--color-cyan)] uppercase">{moduleData.label}</span>
        </div>
      ) : (
        <span className="text-white/30 text-xs uppercase tracking-widest font-sans">Empty Slot {index + 1}</span>
      )}
    </div>
  );
}

export default function CabinConfigurator() {
  const { cabinSlots, setCabinSlot } = useStore();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.data.current?.type);
  };

  const handleDragEnd = (event: any) => {
    setActiveDragId(null);
    const { over, active } = event;
    if (over && over.id.startsWith('slot-')) {
      const slotIndex = over.data.current?.index;
      const moduleType = active.data.current?.type as ModuleType;
      if (slotIndex !== undefined && moduleType) {
        setCabinSlot(slotIndex, moduleType);
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
          <div className="w-full max-w-xl relative">
            <div className="absolute inset-0 border-[2px] border-white/20 rounded-[120px] pointer-events-none" />
            <div className="absolute inset-0 border-[1px] border-[var(--color-cyan)]/30 rounded-[120px] pointer-events-none blur-sm" />
            
            <div className="py-20 px-16 flex flex-col gap-6 relative z-10">
              <div className="text-center text-white/40 tracking-[0.5em] text-sm md:text-base font-light mb-2 uppercase">Cockpit</div>
              {cabinSlots.map((slot, index) => (
                <DroppableSlot key={`slot-${index}`} index={index} currentModuleId={slot} />
              ))}
              <div className="text-center text-white/40 tracking-[0.5em] text-sm md:text-base font-light mt-2 uppercase">Aft / Cargo</div>
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeModule ? <DraggableModule module={activeModule} isOverlay /> : null}
        </DragOverlay>

      </DndContext>
    </div>
  );
}
