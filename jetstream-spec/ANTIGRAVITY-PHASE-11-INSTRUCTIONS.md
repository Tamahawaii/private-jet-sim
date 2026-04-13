# ANTIGRAVITY INSTRUCTIONS — PHASE 11

YACHTS + REAL ESTATE. Two new asset classes with full ownership lifecycles.

## Files

1. `types/phase-11-additions.ts` → drop into `/types/index.ts`
2. `data/yachts.json` → seed at first load (similar to fleet/aircraft seeding pattern)
3. `data/residences.json` → seed at first load
4. `lib/yachts/charter.ts` → `/lib/yachts/charter.ts`
5. `lib/realestate/management.ts` → `/lib/realestate/management.ts`

## Schema additions

```typescript
db.version(N).stores({
  ...existing,
  yachts: 'id, status, currentLocationName',
  yachtCharters: 'id, yachtId, startDate, endDate',
  playerOwnedYachts: 'id, yachtId, acquiredAt',
  residences: 'id, type, city, country, isPrimary',
  playerOwnedResidences: 'id, residenceId, acquiredAt',
  propertyEvents: 'id, residenceId, startDate',
  recurringCosts: 'id, source, sourceId, appliedAt',
});
```

The Diamond Head House (Honolulu) should be auto-acquired for the player at first run as their primary residence (free, since it's the canonical starting estate for the Tama character).

## Pages to create

### `/app/yachts/page.tsx` — Yacht catalog + fleet view
Two tabs:
- "My Fleet" — yachts player owns, shows status, current location, options to charter for self/guests, list for charter, view logs
- "Catalog" — browseable catalog of acquirable yachts with detail pages

Detail page per yacht shows: photo, specs, signature features, "preferred by" personas, acquisition button, current location on map.

### `/app/residences/page.tsx` — Properties view
- Map showing all owned residences as pins
- List view with monthly carrying costs
- "Browse market" tab for unowned residences
- Detail page per residence: photo, features, host event button (if `canHostEvents`), caretaker thread shortcut, scheduled events list

### Event hosting flow

On residence detail → "Host Event" button:

```
SELECT EVENT TYPE
○ Dinner party (8-12 guests, ~$2.5k/guest)
○ Weekend house party (multi-day, ~$8k/guest)
○ Gala fundraiser (40+ guests, ~$5k/guest)
○ Private concert (curated, ~$15k/guest)
○ Art opening (~$4k/guest)
○ Wedding host
○ Wake / memorial
○ Business meeting

SELECT GUESTS
[multi-select from personas]

SET DATE
[date range picker]

NOTES (optional)
[textarea]

[Confirm — $X total cost]
```

After confirm: cost deducted, relationships updated, recap generated async (Haiku call).

## Caretaker DM integration

Each owned residence has a virtual "caretaker" sender that periodically DMs player. Wire via behavioral engine:

In `/lib/behavioral/engine.ts`, add a step after persona evaluations:

```typescript
// Caretaker DMs (1-2 per month per residence)
const owned = await db.playerOwnedResidences.toArray();
for (const own of owned) {
  // ~3% chance per tick (so every ~30 ticks = ~10 days = once a month)
  if (Math.random() < 0.03) {
    await generateCaretakerDM(own.residenceId);
  }
}
```

Caretaker threads should appear in inbox like persona DMs, just from a non-persona sender (special icon, italic name to distinguish).

## Monthly cost ticker

Add a sim-time hook (or cron) that runs once per sim-month:

```typescript
import { applyMonthlyYachtCosts } from '@/lib/yachts/charter';
import { applyMonthlyResidenceCosts } from '@/lib/realestate/management';

await applyMonthlyYachtCosts();
await applyMonthlyResidenceCosts();
```

Surface the totals in a "monthly statement" notification — modal that summarizes spend by asset.

## Yacht charter-out for revenue

Detail page on yacht player owns gets a "List for charter" button:
- Set N weeks available
- Returns projected revenue (60-90% utilization)
- After period ends, revenue lands in player.netWorth

## Persona integration

When player books charter with guest personas, those personas:
- Get strong relationship metric boost (yacht intimacy)
- May initiate proactive DMs about the trip via behavioral engine
- May trigger gossip if it's a public sighting (handled by gossip generator if visibility flagged)

When player hosts event, persona attendees:
- Apply event-type-specific metric boost
- May spawn drama if conflicting personas attend together (e.g., Charles + Sasha in same room)

For drama detection: in `hostPropertyEvent`, after metrics applied, scan guest pairs for known rivalries (existing relationship.metrics.rivalry > 50) and roll for drama trigger via `triggerDramaEvent` from Phase 9.

## Verification

- [ ] Diamond Head House auto-owned at first run
- [ ] Yacht catalog renders, can purchase if funds available
- [ ] Charter flow deducts correct amount
- [ ] Hosted events apply relationship deltas
- [ ] Caretaker DMs appear in inbox occasionally
- [ ] Monthly cost run deducts from net worth correctly
- [ ] Yacht log entries generate when requested
- [ ] Event recaps generate post-event

## Cost note

Phase 11's LLM use is light: caretaker DMs (~$0.001 each), yacht logs on demand, event recaps on hosted events. Negligible add to total monthly cost.

That's Phase 11. After this, the player has the full asset trifecta: jets, yachts, residences. Phase 12 = collecting + year-in-review = the polish layer for ownership.
