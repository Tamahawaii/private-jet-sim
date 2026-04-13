// =============================================================================
// DRAMA RESPONSE MODAL
// =============================================================================
// /components/DramaResponseModal.tsx
//
// Surfaces unresolved drama where player must respond.
// Shows consequence preview on hover/long-press.

'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { resolveDramaResponse } from '@/lib/drama/triggers';
import type { DramaEvent, DramaResponseOption } from '@/types';

const SEVERITY_STYLES: Record<DramaEvent['severity'], { ring: string; label: string; bg: string }> = {
  minor: { ring: 'ring-stone-300', label: 'A small thing', bg: 'bg-stone-50' },
  moderate: { ring: 'ring-amber-400', label: 'Worth your attention', bg: 'bg-amber-50' },
  major: { ring: 'ring-rose-500', label: 'This is real', bg: 'bg-rose-50' },
  catastrophic: { ring: 'ring-rose-700 ring-2', label: 'Five-alarm', bg: 'bg-rose-100' },
};

export default function DramaResponseModal() {
  const unresolvedDrama = useLiveQuery(async () => {
    const all = await db.dramaEvents.toArray();
    return all.find(d => 
      d.playerResponseRequired && 
      !d.resolvedAt && 
      d.targetIds.includes('player')
    );
  }, [], null);
  
  const [previewOption, setPreviewOption] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [deferred, setDeferred] = useState<Set<string>>(new Set());
  
  if (!unresolvedDrama) return null;
  if (deferred.has(unresolvedDrama.id)) return null;
  
  const initiator = useLiveQuery(
    () => unresolvedDrama ? db.personas.get(unresolvedDrama.initiatorId) : null,
    [unresolvedDrama?.id]
  );
  
  const sev = SEVERITY_STYLES[unresolvedDrama.severity];
  
  const handleSelectOption = async (option: DramaResponseOption) => {
    setIsResolving(true);
    try {
      await resolveDramaResponse(
        unresolvedDrama.id, 
        option.id, 
        new Date().toISOString()
      );
    } finally {
      setIsResolving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ring-2 ${sev.ring} ${sev.bg}`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-stone-700 font-semibold">
              ⚡ {sev.label}
            </span>
            <span className="text-xs text-stone-500">
              {formatTime(unresolvedDrama.triggeredAt)}
            </span>
          </div>
          <h2 className="font-serif text-xl text-stone-900 leading-snug">
            {unresolvedDrama.title}
          </h2>
        </div>
        
        {/* Persona context */}
        {initiator && (
          <div className="px-5 pb-3 flex items-center gap-3">
            {initiator.avatarUrl && (
              <img 
                src={initiator.avatarUrl} 
                alt={initiator.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-sm font-medium text-stone-900">{initiator.displayName}</p>
              <p className="text-xs text-stone-500">{initiator.region}</p>
            </div>
          </div>
        )}
        
        {/* Narrative */}
        <div className="px-5 pb-5">
          <p className="text-stone-800 leading-relaxed">
            {unresolvedDrama.narrativeText}
          </p>
        </div>
        
        {/* Response options */}
        <div className="px-5 pb-5">
          <p className="text-xs uppercase tracking-wider text-stone-600 mb-3">
            How do you respond?
          </p>
          
          <div className="space-y-2">
            {unresolvedDrama.playerResponseOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setPreviewOption(option.id)}
                onMouseLeave={() => setPreviewOption(null)}
                onTouchStart={() => setPreviewOption(option.id)}
                disabled={isResolving}
                className="w-full text-left px-4 py-3 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 hover:border-stone-900 transition disabled:opacity-50"
              >
                <div className="font-medium text-stone-900">{option.label}</div>
                {previewOption === option.id && (
                  <div className="mt-2 text-xs text-stone-600 italic">
                    {option.consequencePreview}
                    {Object.keys(option.reputationDeltaPreview).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.entries(option.reputationDeltaPreview).map(([k, v]) => (
                          <span 
                            key={k} 
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              (v as number) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {k} {(v as number) > 0 ? '+' : ''}{v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setDeferred(prev => new Set(prev).add(unresolvedDrama.id))}
            className="w-full mt-4 text-xs text-stone-500 hover:text-stone-700 py-2"
          >
            Address later
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}
