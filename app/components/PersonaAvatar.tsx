import React from 'react';
import { Persona } from '../../types';

interface Props {
    persona: Pick<Persona, 'id' | 'displayName' | 'imageUrl' | 'monogramColors'> & Partial<Persona>;
    size?: number;
    className?: string;
    /** Rounded square instead of a circle (cards, headers). */
    shape?: 'circle' | 'squircle';
}

/** Gradient behind the portrait, derived from the persona's monogram colours (or a stable hash). */
export function personaGradient(p: { id: string; monogramColors?: [string, string] }): string {
    if (p.monogramColors?.length === 2) return `linear-gradient(135deg, ${p.monogramColors[0]} 0%, ${p.monogramColors[1]} 100%)`;
    let hash = 0;
    for (let i = 0; i < p.id.length; i++) hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
    const h1 = Math.abs(hash) % 360, h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1} 45% 38%) 0%, hsl(${h2} 50% 24%) 100%)`;
}

/** One-line role for a persona — archetype when the record has one, otherwise where they are from. */
export function personaRole(p: { archetype?: string | null; region?: string; wealthTier?: number }): string {
  if (p.archetype) return String(p.archetype).replace(/_/g, ' ');
  if (p.region) return p.region;
  return p.wealthTier ? `Tier ${p.wealthTier}` : '';
}

/** Relationship status label, safe for missing records. */
export function statusLabel(status?: string | null): string {
  return (status || 'strangers').replace(/-/g, ' ');
}

export function PersonaAvatar({ persona, size = 64, className = '', shape = 'circle' }: Props) {
    const initials = persona.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
    const isPortrait = !!persona.imageUrl;
    return (
        <div
           className={`overflow-hidden relative shrink-0 flex items-center justify-center font-mono tracking-tight uppercase font-bold text-white ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'} ${className}`}
           style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34), background: personaGradient(persona) }}
        >
           {isPortrait ? (
               <img src={persona.imageUrl as string} alt={persona.displayName} className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scale(1.06) translateY(3%)' }} draggable={false} />
           ) : (
               <span className="opacity-95 drop-shadow">{initials}</span>
           )}
        </div>
    );
}
