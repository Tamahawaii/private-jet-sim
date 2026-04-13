// =============================================================================
// GOSSIP COLUMN PAGE
// =============================================================================
// /app/gossip/page.tsx
//
// Displays public column items + anonymous blind items.
// Filters: All / Public / Blind / About me / About my circle
// Actions: read, react, issue correction, reveal blind subjects

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { issueCorrection, markGossipAsRead } from '@/lib/gossip/generator';
import type { GossipItem } from '@/types';

type FilterTab = 'all' | 'public' | 'blind' | 'about-me' | 'about-circle';

const VOICE_LABELS: Record<GossipItem['authorVoice'], string> = {
  'tabloid': 'Page Six',
  'editorial': 'T&C',
  'instagram-meme': 'IG Whisper',
  'whisper': 'Anonymous',
  'wire-news': 'AP / Reuters',
};

const VOICE_COLORS: Record<GossipItem['authorVoice'], string> = {
  'tabloid': 'bg-rose-100 text-rose-900',
  'editorial': 'bg-amber-50 text-amber-900',
  'instagram-meme': 'bg-fuchsia-100 text-fuchsia-900',
  'whisper': 'bg-stone-200 text-stone-700',
  'wire-news': 'bg-blue-50 text-blue-900',
};

export default function GossipColumnPage() {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedItem, setSelectedItem] = useState<GossipItem | null>(null);
  
  const allItems = useLiveQuery(
    () => db.gossipItems.orderBy('publishedAt').reverse().limit(100).toArray(),
    [],
    [] as GossipItem[]
  );
  
  const personas = useLiveQuery(() => db.personas.toArray(), [], []);
  
  const filtered = useMemo(() => {
    if (!allItems) return [];
    switch (filter) {
      case 'public': return allItems.filter(i => i.format === 'public-column');
      case 'blind': return allItems.filter(i => i.format === 'blind-item');
      case 'about-me': return allItems.filter(i => 
        i.body.toLowerCase().includes('honolulu') ||
        i.body.toLowerCase().includes('tama') ||
        i.blindSubjects.some(s => s.actualPersonaId === 'player')
      );
      case 'about-circle': {
        // Items mentioning personas player has any relationship with
        return allItems; // Simplified - real impl would check relationships
      }
      default: return allItems;
    }
  }, [allItems, filter]);
  
  const unreadCount = allItems?.filter(i => !i.playerHasRead).length || 0;
  
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-stone-200 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="text-2xl font-serif tracking-tight text-stone-900">The Column</h1>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-1 bg-rose-600 text-white rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {(['all', 'public', 'blind', 'about-me', 'about-circle'] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition ${
                  filter === t 
                    ? 'bg-stone-900 text-white' 
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {t === 'all' ? 'All' :
                 t === 'public' ? 'Public' :
                 t === 'blind' ? 'Blind Items' :
                 t === 'about-me' ? 'About Me' :
                 'My Circle'}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Items */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-stone-500">
            <p className="text-sm">No gossip yet.</p>
            <p className="text-xs mt-2">The world is quiet. For now.</p>
          </div>
        )}
        
        {filtered.map(item => (
          <GossipCard 
            key={item.id} 
            item={item} 
            personas={personas || []}
            onClick={() => {
              setSelectedItem(item);
              if (!item.playerHasRead) markGossipAsRead(item.id);
            }}
          />
        ))}
      </div>
      
      {/* Detail modal */}
      {selectedItem && (
        <GossipDetailModal
          item={selectedItem}
          personas={personas || []}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// CARD COMPONENT
// -----------------------------------------------------------------------------

function GossipCard({ 
  item, 
  personas,
  onClick 
}: { 
  item: GossipItem; 
  personas: any[];
  onClick: () => void; 
}) {
  const isUnread = !item.playerHasRead;
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-lg p-5 transition hover:shadow-md ${
        isUnread ? 'ring-1 ring-stone-900' : 'border border-stone-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${VOICE_COLORS[item.authorVoice]}`}>
            {VOICE_LABELS[item.authorVoice]}
          </span>
          {item.format === 'blind-item' && (
            <span className="text-[10px] text-stone-500">BLIND</span>
          )}
          {isUnread && <span className="w-2 h-2 bg-rose-500 rounded-full" />}
        </div>
        <span className="text-xs text-stone-500">
          {formatRelativeTime(item.publishedAt)}
        </span>
      </div>
      
      {item.headline && (
        <h2 className="font-serif text-lg text-stone-900 mb-2 leading-snug">
          {item.headline}
        </h2>
      )}
      
      <p className="text-sm text-stone-700 leading-relaxed">
        {item.body}
      </p>
      
      {item.reactionsFromPersonas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
          <span className="text-xs text-stone-500">
            {item.reactionsFromPersonas.length} {item.reactionsFromPersonas.length === 1 ? 'reaction' : 'reactions'}
          </span>
        </div>
      )}
    </button>
  );
}

// -----------------------------------------------------------------------------
// DETAIL MODAL
// -----------------------------------------------------------------------------

function GossipDetailModal({
  item,
  personas,
  onClose,
}: {
  item: GossipItem;
  personas: any[];
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-3 flex items-center justify-between">
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${VOICE_COLORS[item.authorVoice]}`}>
            {VOICE_LABELS[item.authorVoice]}
          </span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900 p-1">
            ✕
          </button>
        </div>
        
        <div className="p-5">
          {item.headline && (
            <h2 className="font-serif text-xl text-stone-900 mb-3 leading-snug">
              {item.headline}
            </h2>
          )}
          
          <p className="text-stone-800 leading-relaxed mb-5">
            {item.body}
          </p>
          
          {/* Blind item reveal */}
          {item.format === 'blind-item' && item.blindSubjects.length > 0 && (
            <div className="border border-stone-200 rounded-lg p-4 mb-5 bg-stone-50">
              <h3 className="text-xs uppercase tracking-wider text-stone-600 mb-2">
                Subjects in this blind
              </h3>
              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="text-sm text-stone-700 underline hover:text-stone-900"
                >
                  Reveal who they're talking about
                </button>
              ) : (
                <ul className="space-y-1">
                  {item.blindSubjects.map((s, i) => {
                    const persona = personas.find(p => p.id === s.actualPersonaId);
                    return (
                      <li key={i} className="text-sm text-stone-800">
                        <span className="text-stone-500">"{s.description}"</span>
                        {' → '}
                        <span className="font-medium">
                          {s.actualPersonaId === 'player' ? 'You' : persona?.displayName || s.actualPersonaId}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          
          {/* Truth indicator (only shown after reveal or for blind items) */}
          {(revealed || item.format === 'public-column') && !item.isAccurate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
              <p className="text-xs text-amber-900">
                <strong>This is wrong.</strong> Whoever planted this got the details twisted.
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex flex-col gap-2">
            {!item.isAccurate && !item.playerCorrectionIssued && (
              <>
                {!showCorrection ? (
                  <button
                    onClick={() => setShowCorrection(true)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
                  >
                    Issue a correction
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={correctionText}
                      onChange={e => setCorrectionText(e.target.value)}
                      placeholder="Set the record straight..."
                      className="w-full border border-stone-300 rounded-lg p-3 text-sm min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await issueCorrection(item.id, correctionText);
                          onClose();
                        }}
                        className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium"
                      >
                        Publish correction
                      </button>
                      <button
                        onClick={() => { setShowCorrection(false); setCorrectionText(''); }}
                        className="px-4 py-2 border border-stone-300 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-stone-500">
                      Issuing a correction publicly is a power move. Your discretion score will reflect that.
                    </p>
                  </div>
                )}
              </>
            )}
            
            {item.playerCorrectionIssued && (
              <div className="text-xs text-stone-600 bg-stone-100 rounded-lg p-3">
                ✓ You issued a correction on this story.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
