# ANTIGRAVITY INSTRUCTIONS — PHASE 8

Relationship graph, gift system, and 5-axis affinity engine.

You will receive these files:
- `data/gifts.json` — 50+ gift catalog (drop in)
- `data/persona-relationships.json` — initial persona-to-persona seeds (drop in)
- `lib/relationships/affinity.ts` — pure affinity calculation functions (drop in)
- `types/phase-7-8-additions.ts` — Phase 8 type sections (Relationship, Gift types)
- `specs/RELATIONSHIP-UI.md` — UI specs (radar chart, gift sending flow)

---

## SEQUENCE

### STEP 1: Schema additions

1. Add Phase 8 types from `types/phase-7-8-additions.ts` to `/types/index.ts`:
   - RelationshipMetrics
   - RelationshipStatus
   - Relationship
   - RelationshipEvent
   - RelationshipEventType
   - GiftCategory
   - GiftItem
   - GiftSent
   - EVENT_DEFAULT_IMPACTS (export from affinity.ts)

2. Drop in `lib/relationships/affinity.ts`

3. Add Dexie tables to `/lib/db.ts`:
   ```typescript
   db.version(N).stores({
     ...existing,
     relationships: 'id, participantA, participantB, status, lastInteractionAt',
     relationshipEvents: 'id, relationshipId, type, at',
     giftItems: 'id, category, basePrice',
     giftsSent: 'id, fromId, toId, sentAt',
   });
   ```

### STEP 2: Seed data

In `/lib/bootstrap.ts`:

1. **Gift items**: import `data/gifts.json`, seed `db.giftItems` if `count() === 0`
2. **Persona relationships**: import `data/persona-relationships.json`, seed `db.relationships` if empty
3. **Player ↔ persona relationships**: lazy-create on first interaction (DM, flight, event). For now, no bulk seed.
4. **Strangers between personas not in seed**: optional — seed empty relationships for ALL persona pairs to avoid lookup misses. Use `relationshipId(a, b)` from affinity.ts.

### STEP 3: Hook affinity engine into existing events

The existing simulation code already creates events (flights complete, events attended, DMs sent). Wire each into the relationship engine:

**Flight completion** (in `resolveArrivals`):
```typescript
import { relationshipId, EVENT_DEFAULT_IMPACTS, applyDelta } from '@/lib/relationships/affinity';

for (const passenger of flight.passengers) {
  if (passenger.type !== 'persona') continue;
  
  const relId = relationshipId('player', passenger.id);
  let rel = await db.relationships.get(relId);
  if (!rel) rel = createEmptyRelationship('player', passenger.id);
  
  const delta = EVENT_DEFAULT_IMPACTS['shared-flight'];
  rel.metrics = applyDelta(rel.metrics, delta);
  rel.lastInteractionAt = simNow;
  rel.history.push({
    id: crypto.randomUUID(),
    type: 'shared-flight',
    at: simNow,
    description: `Flew together to ${flight.destinationICAO}`,
    metricsDelta: delta,
    contextRefs: { flightId: flight.id },
  });
  
  await db.relationships.put(rel);
}
```

Same pattern for:
- Event attendance together
- Resort co-occupancy (player + persona at same resort overlapping dates)
- DM exchanges (smaller delta — only every Nth message to avoid runaway)
- Gift sends/receipts

### STEP 4: Heat decay

Daily simulation tick (or on app open) should apply heat decay to all relationships:
```typescript
import { applyHeatDecay } from '@/lib/relationships/affinity';

const allRels = await db.relationships.toArray();
const simNow = getCurrentSimTime();
for (const rel of allRels) {
  const decayed = applyHeatDecay(rel.metrics, rel.lastInteractionAt, simNow);
  if (decayed.heat !== rel.metrics.heat) {
    rel.metrics = decayed;
    await db.relationships.put(rel);
  }
}
```

Run this in existing daily/hourly tick (whatever cadence the sim already uses).

### STEP 5: Status auto-suggestion

After every metric change, optionally call `suggestStatus()` and surface to player as a notification:
- "Your relationship with Theo Beaumont is getting close. Update status to 'flirting'?"
- Player accepts or dismisses
- Status doesn't auto-change without confirmation (player agency)

### STEP 6: Persona detail page additions

Per `specs/RELATIONSHIP-UI.md`:

1. Add radar chart component
2. Add status badge above radar
3. Add relationship history timeline below radar
4. Add "RELATIONSHIPS" section listing connected personas
5. Add "SEND GIFT" button (top right of detail page)

### STEP 7: Gift sending modal

Per spec:
1. Modal with browse → personalize → confirm flow
2. Atomic transaction on send (cash burn + records + metrics)
3. Trigger Claude-generated reaction DM
4. Show toast: "Gift sent to [name]"

### STEP 8: Persona-to-persona visibility

On persona detail page RELATIONSHIPS section:
- Public relationships always visible
- Private (isPubliclyKnown: false) only visible if player has depth >50 with at least one party
- Use `relationshipDepth()` helper from affinity.ts

---

## VERIFICATION CHECKLIST

- [ ] All persona pairs from seed have correct relationships in db.relationships
- [ ] Gift catalog (50+ items) loaded in db.giftItems
- [ ] Persona detail page shows radar chart with correct metrics
- [ ] Status badge displays appropriately
- [ ] History timeline shows past events
- [ ] Send Gift modal works end-to-end
- [ ] Gift sent: cash debited, gift record saved, metrics applied, reaction DM generated
- [ ] After flight with persona: relationship metrics updated, history event added
- [ ] After event attendance: same
- [ ] Heat decay runs and reduces heat on relationships without contact
- [ ] Persona-to-persona relationships visible on detail pages (public ones always; private only at depth >50)
- [ ] Marcus's relationship to player still respects publicOrientation in UI labeling

---

## SHIP ORDER

1. Schema + seeds + affinity engine wired up → push → verify metrics update on flight/DM
2. Persona detail page UI (radar, history, status) → push → verify visualizations correct
3. Gift catalog + send flow → push → verify can send gifts and trigger reactions

Three commits, three verifications.
