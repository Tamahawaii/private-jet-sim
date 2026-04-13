// =============================================================================
// INTIMATE ENCOUNTER SCENE
// =============================================================================
// /components/IntimateEncounterScene.tsx
//
// Three-stage fade-to-black reveal:
// 1. Buildup paragraph (1.5s fade-in)
// 2. Black screen with bouncing emojis (~5s)
// 3. Fade text paragraph (1.5s fade-in)
// 4. Optional morning-after

'use client';

import { useEffect, useState, useRef } from 'react';
import type { IntimateEncounter } from '@/types';

interface Props {
  encounter: IntimateEncounter;
  onComplete: () => void;
}

type Stage = 'buildup' | 'fade' | 'aftertext' | 'morning' | 'complete';

export default function IntimateEncounterScene({ encounter, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>('buildup');
  
  useEffect(() => {
    if (stage === 'buildup') {
      const t = setTimeout(() => setStage('fade'), 6000); // 6s read time for buildup
      return () => clearTimeout(t);
    }
    if (stage === 'fade') {
      const t = setTimeout(() => setStage('aftertext'), 5500); // 5.5s of bouncing emojis
      return () => clearTimeout(t);
    }
  }, [stage]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center transition-colors duration-1000">
      <div className="max-w-2xl w-full px-6">
        
        {stage === 'buildup' && (
          <FadeInText className="text-stone-100 text-lg sm:text-xl leading-relaxed font-serif italic">
            {encounter.buildupText}
          </FadeInText>
        )}
        
        {stage === 'fade' && (
          <BouncingEmojis emojis={encounter.emojis} />
        )}
        
        {stage === 'aftertext' && (
          <div className="space-y-8">
            <FadeInText className="text-stone-100 text-lg sm:text-xl leading-relaxed font-serif">
              {encounter.fadeText}
            </FadeInText>
            
            <div className="text-center">
              {encounter.morningAfterText ? (
                <button
                  onClick={() => setStage('morning')}
                  className="text-stone-400 hover:text-stone-200 text-sm border border-stone-700 rounded-full px-6 py-2 transition"
                >
                  Morning →
                </button>
              ) : (
                <button
                  onClick={onComplete}
                  className="text-stone-400 hover:text-stone-200 text-sm border border-stone-700 rounded-full px-6 py-2 transition"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        )}
        
        {stage === 'morning' && encounter.morningAfterText && (
          <div className="space-y-8">
            <div className="text-center">
              <span className="text-amber-200/60 text-xs uppercase tracking-widest">— Morning —</span>
            </div>
            <FadeInText className="text-stone-100 text-lg sm:text-xl leading-relaxed font-serif">
              {encounter.morningAfterText}
            </FadeInText>
            <div className="text-center">
              <button
                onClick={onComplete}
                className="text-stone-400 hover:text-stone-200 text-sm border border-stone-700 rounded-full px-6 py-2 transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// FADE-IN TEXT
// -----------------------------------------------------------------------------

function FadeInText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className={`${className} transition-opacity duration-[1500ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </p>
  );
}

// -----------------------------------------------------------------------------
// BOUNCING EMOJIS
// -----------------------------------------------------------------------------

interface EmojiState {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function BouncingEmojis({ emojis }: { emojis: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [states, setStates] = useState<EmojiState[]>([]);
  
  // Initialize positions
  useEffect(() => {
    const initial = emojis.map(e => ({
      emoji: e,
      x: 20 + Math.random() * 60,           // 20-80% of container
      y: 20 + Math.random() * 60,
      vx: (Math.random() - 0.5) * 0.6,      // slow drift
      vy: (Math.random() - 0.5) * 0.6,
    }));
    setStates(initial);
  }, [emojis]);
  
  // Animation loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      setStates(prev => prev.map(s => {
        let nx = s.x + s.vx;
        let ny = s.y + s.vy;
        let nvx = s.vx;
        let nvy = s.vy;
        if (nx < 5 || nx > 95) { nvx = -nvx; nx = Math.max(5, Math.min(95, nx)); }
        if (ny < 5 || ny > 95) { nvy = -nvy; ny = Math.max(5, Math.min(95, ny)); }
        return { ...s, x: nx, y: ny, vx: nvx, vy: nvy };
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  
  return (
    <div ref={containerRef} className="relative w-full h-96 overflow-hidden">
      {states.map((s, i) => (
        <span
          key={i}
          className="absolute text-5xl sm:text-6xl select-none pointer-events-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 1.5s',
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}
