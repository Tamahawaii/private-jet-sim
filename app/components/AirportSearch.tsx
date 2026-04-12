'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LocationData } from '../lib/store';
import airportsData from '../lib/airports.json';
import { Search, MapPin } from 'lucide-react';

interface Airport {
  name: string;
  iata: string;
  lat: number;
  lng: number;
  city: string;
}

const airports: Airport[] = airportsData as Airport[];

interface AirportSearchProps {
  value: LocationData | null;
  onChange: (loc: LocationData) => void;
  placeholder?: string;
  excludeIata?: string;
}

export default function AirportSearch({ value, onChange, placeholder = "Search global airport...", excludeIata }: AirportSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(`${value.name} (${value.name})`);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (value) setQuery(`${value.name} (${value.name})`);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filtered = query.length < 2 ? [] : airports.filter(a => {
    if (a.iata === excludeIata) return false;
    const lowerQ = query.toLowerCase();
    return a.iata.toLowerCase().includes(lowerQ) || 
           a.name.toLowerCase().includes(lowerQ) ||
           a.city.toLowerCase().includes(lowerQ);
  }).slice(0, 10);

  const handleSelect = (a: Airport) => {
    onChange({ lat: a.lat, lng: a.lng, name: a.iata });
    setQuery(`${a.city} (${a.iata})`);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full min-w-[240px]">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery(''); // Clear logic on click to immediately type
          }}
          placeholder={placeholder}
          className="w-full bg-black/50 border border-white/20 text-white rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-[#00f0ff] transition-colors"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-full max-w-sm bg-[#121215] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {filtered.map(a => (
            <button
              key={a.iata}
              onClick={() => handleSelect(a)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#00f0ff]/10 flex items-center justify-center text-[#00f0ff] shrink-0">
                <MapPin size={16} />
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-sm tracking-widest text-[#00f0ff]">{a.iata}</div>
                <div className="text-xs text-white/70 truncate">{a.name}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{a.city}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#121215] border border-white/10 rounded-xl shadow-2xl z-50 p-4 text-center text-xs text-white/50 uppercase tracking-widest">
          No global airports found
        </div>
      )}
    </div>
  );
}
