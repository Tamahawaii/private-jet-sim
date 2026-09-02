'use client';

import React, { useState } from 'react';
import { Layers, Globe2, Map as MapIcon, LocateFixed, CloudRain, Sun, Plane, Users, CalendarDays, Palmtree, TowerControl, Check, Anchor, Home } from 'lucide-react';
import { useStore, MapStyleId } from '../../lib/store';

const STYLES: { id: MapStyleId; label: string; hint: string }[] = [
  { id: 'Dark', label: 'Midnight', hint: 'Dark editorial globe' },
  { id: 'Satellite', label: 'Satellite', hint: 'Imagery, night shadow' },
  { id: 'Roads', label: 'Daylight', hint: 'Light cartography' },
  { id: 'FlightAware', label: 'Radar', hint: 'Ops green, live weather' },
];

interface Props {
  onRecenter: () => void;
  showRecenter: boolean;
  /** Extra space under the nav (e.g. to clear the flight HUD). */
  topOffset?: number;
}

export default function MapControls({ onRecenter, showRecenter, topOffset = 0 }: Props) {
  const [open, setOpen] = useState<'layers' | 'style' | null>(null);
  const mapStyle = useStore(s => s.mapStyle);
  const setMapStyle = useStore(s => s.setMapStyle);
  const projection = useStore(s => s.mapProjection);
  const setProjection = useStore(s => s.setMapProjection);
  const layers = useStore(s => s.mapLayers);
  const toggle = useStore(s => s.toggleMapLayer);

  const btn = (active: boolean) =>
    `w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-xl border ${active ? 'bg-[var(--accent)] text-black border-transparent' : 'bg-black/55 text-white border-white/15 hover:bg-black/75'}`;

  const LAYER_ROWS: { key: keyof typeof layers; label: string; icon: React.ReactNode; tint: string }[] = [
    { key: 'fleet', label: 'Your fleet', icon: <Plane size={14} />, tint: 'text-[var(--accent)]' },
    { key: 'friends', label: 'Friends', icon: <Users size={14} />, tint: 'text-[#f5a7a7]' },
    { key: 'events', label: 'Events', icon: <CalendarDays size={14} />, tint: 'text-[#d4af37]' },
    { key: 'resorts', label: 'Resorts', icon: <Palmtree size={14} />, tint: 'text-[#f5a7a7]' },
    { key: 'airports', label: 'Airports', icon: <TowerControl size={14} />, tint: 'text-zinc-300' },
    { key: 'marinas', label: 'Marinas & yachts', icon: <Anchor size={14} />, tint: 'text-sky-200' },
    { key: 'homes', label: 'Your homes', icon: <Home size={14} />, tint: 'text-amber-300' },
    { key: 'daylight', label: 'Day / night', icon: <Sun size={14} />, tint: 'text-amber-200' },
    { key: 'weather', label: 'Live radar (US)', icon: <CloudRain size={14} />, tint: 'text-sky-300' },
  ];

  return (
    <div className="absolute right-3 md:right-5 z-40 flex flex-col items-end gap-2 pointer-events-auto" style={{ top: `calc(var(--nav-h) + var(--safe-top) + ${12 + topOffset}px)` }}>
      <button className={btn(open === 'layers')} title="Layers" onClick={() => setOpen(open === 'layers' ? null : 'layers')}>
        <Layers size={18} />
      </button>
      <button className={btn(open === 'style')} title="Map style" onClick={() => setOpen(open === 'style' ? null : 'style')}>
        <MapIcon size={18} />
      </button>
      <button className={btn(projection === 'globe')} title={projection === 'globe' ? 'Switch to flat map' : 'Switch to globe'} onClick={() => setProjection(projection === 'globe' ? 'flat' : 'globe')}>
        <Globe2 size={18} />
      </button>
      {showRecenter && (
        <button className={`${btn(false)} mt-2`} title="Re-center" onClick={onRecenter}>
          <LocateFixed size={18} />
        </button>
      )}

      {open === 'layers' && (
        <div className="glass mt-1 w-60 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 pt-2 pb-1 eyebrow">Layers</div>
          {LAYER_ROWS.map(row => (
            <button key={row.key} onClick={() => toggle(row.key)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left">
              <span className={`${layers[row.key] ? row.tint : 'text-zinc-600'}`}>{row.icon}</span>
              <span className={`flex-1 text-[13px] ${layers[row.key] ? 'text-white' : 'text-zinc-500'}`}>{row.label}</span>
              <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${layers[row.key] ? 'bg-[var(--accent)] border-transparent text-black' : 'border-white/20'}`}>{layers[row.key] && <Check size={11} strokeWidth={3} />}</span>
            </button>
          ))}
        </div>
      )}

      {open === 'style' && (
        <div className="glass mt-1 w-60 rounded-2xl p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 pt-2 pb-1 eyebrow">Map style</div>
          {STYLES.map(s => (
            <button key={s.id} onClick={() => { setMapStyle(s.id); setOpen(null); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left ${mapStyle === s.id ? 'bg-[var(--accent)]/12 text-[var(--accent)]' : 'hover:bg-white/5 text-white'}`}>
              <span>
                <span className="block text-[13px] font-medium">{s.label}</span>
                <span className="block text-[11px] text-zinc-500">{s.hint}</span>
              </span>
              {mapStyle === s.id && <Check size={14} />}
            </button>
          ))}
          <div className="px-3 pt-3 pb-1 eyebrow">Projection</div>
          <div className="flex gap-1 p-1">
            {(['globe', 'flat'] as const).map(p => (
              <button key={p} onClick={() => setProjection(p)} className={`flex-1 py-2 rounded-lg text-[12px] font-medium capitalize ${projection === p ? 'bg-white text-black' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
