import React from 'react';
import { Persona } from '../../types';

interface Props {
    persona: Persona;
    size?: number;
    className?: string;
}

export function PersonaAvatar({ persona, size = 64, className = '' }: Props) {
    // Generate stable gradient based on persona id hash
    let hash = 0;
    for (let i = 0; i < persona.id.length; i++) {
        hash = persona.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `#${Math.abs(hash).toString(16).padEnd(6, '0').slice(0, 6)}`;
    const c2 = `#${Math.abs(hash * 31).toString(16).padEnd(6, '0').slice(0, 6)}`;
    
    return (
        <div 
           className={`rounded-full overflow-hidden relative shrink-0 flex items-center justify-center font-mono tracking-tighter uppercase font-bold text-white shadow-inner ${className}`}
           style={{ 
               width: size, 
               height: size, 
               fontSize: Math.max(10, size * 0.35),
               background: persona.portraitUrl ? 'bg-zinc-800' : `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
           }}
        >
           {persona.portraitUrl ? (
               <div className="absolute inset-0 bg-cover bg-center grayscale mix-blend-luminosity opacity-80 hover:opacity-100 hover:grayscale-0 transition-all" style={{ backgroundImage: `url(${persona.portraitUrl})` }} />
           ) : (
               <span className="opacity-90 mix-blend-overlay text-white">{persona.displayName.split(' ').map((n: string) => n[0]).join('')}</span>
           )}
        </div>
    );
}
