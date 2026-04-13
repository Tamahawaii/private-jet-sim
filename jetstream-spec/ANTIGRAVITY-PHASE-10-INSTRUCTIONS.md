# ANTIGRAVITY INSTRUCTIONS — PHASE 10

UI POLISH for the systems Phase 9 stood up. Three components.

Phase 9 created the engines. Phase 10 makes them feel right.

## Files

1. `components/GossipColumnPage.tsx` → drop at `/app/gossip/page.tsx` 
   - Adjust import from `useLiveQuery` if not already installed: `npm install dexie-react-hooks`
2. `components/ReputationPanel.tsx` → drop at `/components/ReputationPanel.tsx`
   - Mount in `/app/profile/page.tsx` (or wherever player profile lives)
3. `components/DramaResponseModal.tsx` → drop at `/components/DramaResponseModal.tsx`
   - Mount in root layout — it self-renders only when there's unresolved drama
4. `components/IntimateEncounterScene.tsx` → drop at `/components/IntimateEncounterScene.tsx`
   - Triggered from persona detail page "Make a Move" button (Phase 9 spec)

## Wire-up

### Root layout

```tsx
import DramaResponseModal from '@/components/DramaResponseModal';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <DramaResponseModal />
      </body>
    </html>
  );
}
```

### Inbox badge

Update existing inbox badge component to show a red dot when:
- `await db.dramaEvents.filter(d => d.playerResponseRequired && !d.resolvedAt && d.targetIds.includes('player')).count() > 0`

Make it pulse subtly. This is the "something needs you" indicator.

### Persona detail page — "Make a Move" button

```tsx
{relationship.metrics.romanticTension >= 50 && 
 ['flirting','romantic-interest','dating','situationship'].includes(relationship.status) && (
  <button onClick={handleMakeMove}>Make a Move</button>
)}
```

`handleMakeMove`:
1. POST to `/api/intimacy/initiate` with `{ personaId, location: persona.currentLocation || playerLocation }`
2. Server runs `renderIntimateEncounter()`, returns the encounter
3. Show `<IntimateEncounterScene encounter={...} onComplete={...} />`

If persona declines, show a brief decline DM message instead (no scene).

### Marcus closeted special button

On Marcus persona detail page only:

```tsx
{relationship.metrics.depth >= 60 && marcus.publicOrientation === 'straight' && (
  <button 
    className="bg-rose-100 text-rose-900 ring-1 ring-rose-300"
    onClick={handleAskMarcusDirectly}
  >
    Ask him directly
  </button>
)}
```

This triggers a custom `betrayal-reveal` drama event with hand-tuned narrative prompt.

## Verification

- [ ] Drama modal appears automatically when there's unresolved player-targeted drama
- [ ] Tap-and-hold on response option shows consequence preview with reputation deltas
- [ ] "Address later" defers but drama still shows on next session
- [ ] Gossip column displays public column items + blind items with proper styling
- [ ] Blind item reveal shows actual persona names
- [ ] Issue correction flow works for false rumors
- [ ] Reputation panel shows 4 axes with progress bars
- [ ] Tap any axis opens drawer with what's driving that score
- [ ] Intimate encounter scene plays through 3 stages cleanly
- [ ] Bouncing emojis actually bounce (not static)
- [ ] Buildup → black screen → fade text transitions are smooth
- [ ] Marcus reveal button only appears at depth >= 60

## Polish notes

- Drama modal severity ring: use `ring-rose-700 ring-2` for catastrophic (gets attention)
- Reputation bars: green for high (good), red for low (with dramaProne inverted)
- Gossip page: voice color labels make sources scannable
- Encounter scene: emoji bouncing should feel slow and dreamy, not chaotic. If it looks like a screensaver, slow velocities further (currently 0.6 max).

That's Phase 10. Phase 9 + 10 together = the full living world.
