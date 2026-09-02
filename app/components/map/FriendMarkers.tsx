'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Persona, PersonaState } from '../../../types';
import { useStore } from '../../lib/store';

interface Props {
  map: maplibregl.Map;
  personas: Persona[];
  states: PersonaState[];
  visible: boolean;
}

/** Persona presence pins — small DOM markers so portraits/monograms stay crisp on the globe. */
export default function FriendMarkers({ map, personas, states, visible }: Props) {
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});

  useEffect(() => {
    const current = new Set<string>();
    if (visible) {
      for (const p of personas) {
        const st = states.find(s => s.personaId === p.id);
        const c = st?.currentCoords;
        if (!c || !isFinite(c.lat) || !isFinite(c.lng)) continue;
        current.add(p.id);
        const existing = markersRef.current[p.id];
        if (existing) { existing.setLngLat([c.lng, c.lat]); continue; }

        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'js-friend-pin';
        el.setAttribute('aria-label', p.displayName);
        const initials = p.displayName.split(' ').map(n => n[0]).join('').slice(0, 2);
        el.innerHTML = p.imageUrl
          ? `<span class="js-friend-avatar" style="background-image:url('${p.imageUrl}')"></span>`
          : `<span class="js-friend-avatar js-friend-mono">${initials}</span>`;
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          useStore.getState().setPeek({ kind: 'persona', id: p.id });
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' })
          .setLngLat([c.lng, c.lat])
          .addTo(map);
        markersRef.current[p.id] = marker;
      }
    }
    for (const id of Object.keys(markersRef.current)) {
      if (!current.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    }
  }, [map, personas, states, visible]);

  // Pins are DOM elements and don't scale with zoom — hide them when the whole globe is in view.
  useEffect(() => {
    const apply = () => {
      const hide = map.getZoom() < 2.1;
      for (const m of Object.values(markersRef.current)) m.getElement().style.display = hide ? 'none' : '';
    };
    apply();
    map.on('zoom', apply);
    return () => { map.off('zoom', apply); };
  }, [map, personas, states, visible]);

  useEffect(() => () => { Object.values(markersRef.current).forEach(m => m.remove()); markersRef.current = {}; }, []);

  return null;
}
