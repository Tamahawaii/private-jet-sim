# ANTIGRAVITY INSTRUCTIONS — PHASE 12

THE FINALE. Collecting (art/wine/cars/watches) + Year-in-Review (Spotify Wrapped for billionaires).

## Files

1. `types/phase-12-additions.ts` → `/types/index.ts`
2. `lib/collections/manage.ts` → `/lib/collections/manage.ts`
3. `lib/year-review/generator.ts` → `/lib/year-review/generator.ts`
4. `lib/year-review/YearInReviewPage.tsx` → `/app/year-in-review/[year]/page.tsx`

## Schema additions

```typescript
db.version(N).stores({
  ...existing,
  collectibles: 'id, category, currentLocationResidenceId, acquiredAt',
  auctionListings: 'id, status, saleDate, category',
  yearsInReview: 'id, year',
});
```

## Pages to create

### `/app/auctions/page.tsx` — Active auction listings

Browseable list of upcoming/live auctions. Each lot shows:
- Auction house badge
- Title, artist, description
- Estimate range
- "Place bid" button → modal with bid amount input

After bid: shows "Won!" or "Outbid" with winning hammer price.

Generation: call `generateUpcomingAuctions(5)` once a week (cron) or on demand to populate listings. Could be wired into the behavioral engine cycle.

### `/app/collection/page.tsx` — Player's collection

Grid view of owned collectibles, filterable by category. Each card shows:
- Image (placeholder if not present)
- Title, artist, year
- Acquisition price → current valuation (with delta)
- Storage location

Detail page per item: full provenance chain, valuation history, storage settings, "list for sale" option.

### Private offer DMs

Personas occasionally DM player private offers (handled by `generatePersonaPrivateOffer` from collections/manage). The DM has `attachedOffer` payload — render it inline in the message thread:

```
[normal DM bubble with text]
┌─────────────────────────────────────┐
│ 🖼  PRIVATE OFFER                    │
│ "Title of piece"                     │
│ Asking: $X                           │
│ [ Accept ] [ Counter ] [ Decline ]   │
└─────────────────────────────────────┘
```

Counter triggers a follow-up DM negotiation. Accept creates a Collectible record via private-sale path (similar to auction win, but `acquiredVia: 'private-sale'`, `acquiredFromPersonaId: senderId`).

### Year-in-Review trigger

When sim-time crosses Dec 31 → Jan 1, surface a banner notification:

```
✨ Your {year} is ready to look back at.
[ View Year in Review ]
```

Tapping → `/year-in-review/{year}` page (the slideshow component).

The page generates the review on first visit (Sonnet call, ~$0.05). Subsequent visits load from DB.

### Collection in event hosting

Hosting an event at a residence with notable collectibles becomes a flex. Update `hostPropertyEvent`:

After event saved, check if residence has any collectibles displayed. If yes, mention it in the recap prompt context: "Guests admired the [collectible title] in the [room]." Adds prestige to the event narrative.

## Verification

- [ ] Auction listings generate on demand
- [ ] Bidding works, win probability scales with bid vs estimate
- [ ] Collection page renders owned items by category
- [ ] Private offer DMs appear with attached offer payload
- [ ] Year-in-Review slideshow plays through all slides
- [ ] Generated narrative is specific (mentions actual personas, dramas, places)
- [ ] Awards section feels personal not generic

## Cost note

Year-in-Review uses Sonnet for the narrative essay — $0.03-0.10 per generation. Once per sim-year per player. Negligible.
Auction listing generation: ~$0.005 per listing × 5 per week = $0.025/week.
Private offers: only triggered occasionally by behavioral engine, ~$0.005 each.

## Final architecture summary

After Phase 12, JETSTREAM has:
- **Phases 0-4**: Core jet sim (fleet, flights, events, finance, basic personas)
- **Phase 5**: Resorts + booking
- **Phase 6**: Player profile + persona identity depth + pets
- **Phase 7**: Pluggable LLM providers + custom personas
- **Phase 8**: Relationships + gifts
- **Phase 9**: Behavioral engine + intimacy + drama + life events + reputation + gossip
- **Phase 10**: UI polish for Phase 9 systems
- **Phase 11**: Yachts + real estate
- **Phase 12**: Collecting + year-in-review

Total: 12 phases, ~50+ files of new code, ~$2-25/month operating cost depending on player engagement.

Ship it.
