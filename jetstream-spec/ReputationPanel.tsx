// =============================================================================
// REPUTATION PANEL + DEEP-DIVE
// =============================================================================
// /components/ReputationPanel.tsx
//
// Shows 4-axis reputation with active labels.
// Tap any axis: drawer with what's affecting that score.

'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { ReputationScores, PlayerReputation } from '@/types';

const AXIS_DESCRIPTIONS: Record<keyof ReputationScores, { label: string; description: string; lowDesc: string; highDesc: string }> = {
  discretion: {
    label: 'Discretion',
    description: 'How well your private affairs stay private.',
    lowDesc: 'Tabloid magnet — the press knows your moves.',
    highDesc: 'Discreet — what happens in your circle stays there.',
  },
  fidelity: {
    label: 'Fidelity',
    description: 'Whether you honor what you\'ve declared. Calibrated to your declared style.',
    lowDesc: 'Famously unfaithful — you don\'t hold your word.',
    highDesc: 'True to your word — what you say, you do.',
  },
  generosity: {
    label: 'Generosity',
    description: 'Gifts, hospitality, time given freely.',
    lowDesc: 'Tight-fisted — known for never reaching for the check.',
    highDesc: 'Legendary host — invitations from you are coveted.',
  },
  dramaProne: {
    label: 'Drama-Prone',
    description: 'How much chaos follows you. Lower is better here.',
    lowDesc: 'Quietly powerful — you stay above the noise.',
    highDesc: 'Drama magnet — every week brings a new headline.',
  },
};

export default function ReputationPanel() {
  const reputation = useLiveQuery(
    () => db.playerReputation.get('player-reputation'),
    [],
    null
  );
  const [drawerAxis, setDrawerAxis] = useState<keyof ReputationScores | null>(null);
  
  if (!reputation) {
    return (
      <div className="bg-white rounded-lg p-6 border border-stone-200">
        <p className="text-sm text-stone-500">Reputation not yet calculated.</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-white rounded-lg p-6 border border-stone-200">
        <h2 className="font-serif text-lg text-stone-900 mb-4">Reputation</h2>
        
        <div className="space-y-3">
          {(Object.keys(AXIS_DESCRIPTIONS) as Array<keyof ReputationScores>).map(axis => (
            <ReputationBar
              key={axis}
              axis={axis}
              score={reputation.scores[axis]}
              label={getCurrentLabel(reputation, axis)}
              onClick={() => setDrawerAxis(axis)}
            />
          ))}
        </div>
        
        {reputation.publicLabels.length > 0 && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">
              What people say about you
            </p>
            <div className="flex flex-wrap gap-2">
              {reputation.publicLabels.map(label => (
                <span
                  key={label}
                  className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-700 italic"
                >
                  "{label}"
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {drawerAxis && (
        <ReputationDrawer
          axis={drawerAxis}
          reputation={reputation}
          onClose={() => setDrawerAxis(null)}
        />
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// REPUTATION BAR
// -----------------------------------------------------------------------------

function ReputationBar({
  axis,
  score,
  label,
  onClick,
}: {
  axis: keyof ReputationScores;
  score: number;
  label: string | null;
  onClick: () => void;
}) {
  const desc = AXIS_DESCRIPTIONS[axis];
  
  // For dramaProne, color logic is inverted (low is good)
  const inverted = axis === 'dramaProne';
  const colorClass = inverted
    ? (score < 30 ? 'bg-emerald-500' : score < 50 ? 'bg-amber-400' : score < 70 ? 'bg-orange-500' : 'bg-rose-600')
    : (score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : score >= 30 ? 'bg-orange-500' : 'bg-rose-600');
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left group hover:bg-stone-50 rounded p-2 -m-2 transition"
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-stone-800">{desc.label}</span>
        <div className="flex items-baseline gap-2">
          {label && <span className="text-xs italic text-stone-500">"{label}"</span>}
          <span className="text-sm tabular-nums text-stone-700">{score}</span>
        </div>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// DRAWER
// -----------------------------------------------------------------------------

function ReputationDrawer({
  axis,
  reputation,
  onClose,
}: {
  axis: keyof ReputationScores;
  reputation: PlayerReputation;
  onClose: () => void;
}) {
  const desc = AXIS_DESCRIPTIONS[axis];
  const score = reputation.scores[axis];
  
  // Pull recent events that affected this axis
  const recentEvents = useLiveQuery(async () => {
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString();
    
    if (axis === 'discretion') {
      const dramas = await db.dramaEvents
        .where('triggeredAt').above(cutoff)
        .filter(d => ['gossip-column', 'press', 'whispered'].includes(d.publicVisibility))
        .toArray();
      const gossip = await db.gossipItems
        .where('publishedAt').above(cutoff)
        .toArray();
      return { 
        type: 'discretion',
        dramaCount: dramas.length,
        gossipCount: gossip.length,
        recentDramas: dramas.slice(0, 5),
      };
    }
    
    if (axis === 'fidelity') {
      const player = await db.player.get('player');
      const rels = await db.relationships
        .where('participantA').equals('player')
        .or('participantB').equals('player')
        .toArray();
      const romantic = rels.filter(r => 
        ['flirting','romantic-interest','dating','situationship','intimate-occasional','partners','married'].includes(r.status)
      );
      return {
        type: 'fidelity',
        declaredStyle: player?.relationshipPreferences?.style || 'undeclared',
        publiclyKnown: player?.relationshipPreferences?.publiclyKnown || false,
        activeRomantic: romantic.length,
        relationships: romantic.slice(0, 5),
      };
    }
    
    if (axis === 'generosity') {
      const gifts = await db.giftsSent
        .where('fromId').equals('player')
        .filter(g => g.sentAt >= cutoff)
        .toArray();
      let total = 0;
      for (const g of gifts) {
        const item = await db.giftItems.get(g.giftItemId);
        if (item) total += item.basePrice;
      }
      return { type: 'generosity', giftCount: gifts.length, totalSpent: total };
    }
    
    if (axis === 'dramaProne') {
      const dramas = await db.dramaEvents
        .where('triggeredAt').above(cutoff)
        .filter(d => d.targetIds.includes('player') || d.initiatorId === 'player')
        .toArray();
      return {
        type: 'dramaProne',
        dramaCount: dramas.length,
        bySeverity: {
          minor: dramas.filter(d => d.severity === 'minor').length,
          moderate: dramas.filter(d => d.severity === 'moderate').length,
          major: dramas.filter(d => d.severity === 'major').length,
          catastrophic: dramas.filter(d => d.severity === 'catastrophic').length,
        },
        recentDramas: dramas.slice(0, 5),
      };
    }
  }, [axis], null);
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-3 flex items-center justify-between">
          <h2 className="font-serif text-lg">{desc.label}</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 p-1">✕</button>
        </div>
        
        <div className="p-5">
          <div className="text-center mb-5">
            <div className="text-5xl font-light text-stone-900 mb-1">{score}</div>
            <p className="text-sm text-stone-500">{desc.description}</p>
          </div>
          
          <p className="text-sm text-stone-700 italic mb-5 text-center">
            {score >= 70 ? desc.highDesc : score <= 30 ? desc.lowDesc : 'In the middle of the road on this one.'}
          </p>
          
          {recentEvents && (
            <div className="border-t border-stone-100 pt-5">
              <h3 className="text-xs uppercase tracking-wider text-stone-500 mb-3">
                What's driving this score (last 60 days)
              </h3>
              {renderAxisDetails(recentEvents)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getCurrentLabel(rep: PlayerReputation, axis: keyof ReputationScores): string | null {
  return rep.labels.find(l => l.axis === axis)?.label || null;
}

function renderAxisDetails(data: any): JSX.Element {
  if (!data) return <p className="text-sm text-stone-500">No recent activity.</p>;
  
  switch (data.type) {
    case 'discretion':
      return (
        <ul className="space-y-2 text-sm text-stone-700">
          <li>• {data.dramaCount} public-visibility drama events</li>
          <li>• {data.gossipCount} gossip items in circulation</li>
          {data.recentDramas?.map((d: any) => (
            <li key={d.id} className="text-xs text-stone-500 ml-2">— {d.title}</li>
          ))}
        </ul>
      );
    
    case 'fidelity':
      return (
        <div className="space-y-2 text-sm text-stone-700">
          <p>Declared style: <span className="font-medium">{data.declaredStyle}</span> {data.publiclyKnown ? '(public)' : '(private)'}</p>
          <p>Active romantic links: <span className="font-medium">{data.activeRomantic}</span></p>
          {data.activeRomantic === 0 && <p className="text-xs text-stone-500">No active romance to measure.</p>}
        </div>
      );
    
    case 'generosity':
      return (
        <div className="space-y-2 text-sm text-stone-700">
          <p>Gifts given: <span className="font-medium">{data.giftCount}</span></p>
          <p>Total value: <span className="font-medium">${data.totalSpent.toLocaleString()}</span></p>
        </div>
      );
    
    case 'dramaProne':
      return (
        <div className="space-y-2 text-sm text-stone-700">
          <p>Drama events involving you: <span className="font-medium">{data.dramaCount}</span></p>
          <ul className="text-xs text-stone-500 ml-2 space-y-1">
            <li>Catastrophic: {data.bySeverity.catastrophic}</li>
            <li>Major: {data.bySeverity.major}</li>
            <li>Moderate: {data.bySeverity.moderate}</li>
            <li>Minor: {data.bySeverity.minor}</li>
          </ul>
        </div>
      );
    
    default:
      return <p className="text-sm text-stone-500">No data.</p>;
  }
}
