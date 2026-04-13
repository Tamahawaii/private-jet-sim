# ANTIGRAVITY INSTRUCTIONS — PHASE 5 + 6 COMBINED

This document tells you exactly what to do for Phases 5 and 6. All design + content has been done. Your job is integration.

You will receive these files alongside this document:
- `data/resorts.json` (35 resorts, ready to drop in)
- `data/personas.json` (19 personas, ready to drop in — REPLACES existing)
- `data/player.json` (canonical player profile)
- `data/pets.json` (sample pets seed)
- `types/schema-additions.ts` (TypeScript additions)
- `scripts/generate_imagery.js` (run separately when imagery is wanted)

**Total scope: combined Phase 5 + Phase 6.** Two phases at once because content is pre-built.

---

## SEQUENCE OF WORK

### STEP 1: Pre-Phase 5 cleanup (MUST do first)

Before any Phase 5 work, ship these fixes:

#### 1a. Investigate events.confirmedAttendees bug
- Check `db.events` — do events have populated `confirmedAttendees` arrays?
- If yes: fix render in `/app/events/[eventId]/page.tsx`
- If no: re-seed events.json (data corruption from Milestone C scrub script)
- Verify: open Monaco GP detail page → see attendee avatars

#### 1b. Inbox notification badge
- Add to top-right header (next to currency badge)
- Chat bubble icon (lucide `MessageCircle` or `Inbox`)
- Red dot with unread count
- Click → opens DMs list overlay or navigates to `/social/dms`
- Toast notification at bottom-right when new DM arrives (auto-fade 6s)
- Click toast → goes directly to that thread
- Mark read on view

#### 1c. Location-aware passenger picker
- Modify `Step3Passengers.tsx`
- ONLY enable persona toggles if `persona.currentLocationICAO === player.currentLocationICAO` OR matches aircraft origin
- Show others as disabled with "Currently in [city]" label below name
- Optional: "Invite to meet you" button next to disabled personas — sends DM (use existing /api/ai/dm endpoint)

#### 1d. Save export/import
- New page `/settings` (or section if /settings already exists)
- `[ EXPORT SAVE ]` button: serialize ALL Dexie tables to JSON, trigger download as `jetstream-save-YYYY-MM-DD.json`
- `[ IMPORT SAVE ]` button: file picker, validate version, confirmation modal "This replaces current save. Continue?", atomic restore
- JSON schema:
  ```typescript
  {
    version: 1,
    exportedAt: ISODateString,
    exportedFromUrl: string,
    data: {
      player: [...],
      aircraft: [...],
      flights: [...],
      transactions: [...],
      personas: [...],
      personaStates: [...],
      events: [...],
      eventAttendances: [...],
      dmThreads: [...],
      dmMessages: [...],
      apiUsage: [...],
      // any future tables
    }
  }
  ```

#### 1e. Vercel password protection
- I'll handle this in Vercel dashboard. No code change needed.

**SHIP these as one cleanup commit. Verify works. THEN proceed.**

---

### STEP 2: Phase 5 — Resorts

#### 2a. Schema + seeding
1. Add types from `types/schema-additions.ts` to `/types/index.ts` (Resort, ResortBooking, SignatureExperience)
2. Add Dexie tables to `/lib/db.ts`:
   ```typescript
   resorts: 'id, locationICAO, region, tier, brand',
   resortBookings: 'id, resortId, playerId, checkInAt, checkOutAt'
   ```
3. Drop `data/resorts.json` provided into `/data/resorts.json`
4. In `/lib/bootstrap.ts`: import `resorts.json` directly (NOT fetch — direct TypeScript import). Seed only if `db.resorts.count() === 0` (top-up otherwise)

#### 2b. Destinations page — Resorts tab
- Activate the "Resorts" tab in `/app/destinations/page.tsx`
- Pull from `db.resorts`
- Build `ResortCard` component (similar pattern to EventCard):
  - Image with monogram fallback
  - Name + brand
  - Location (city, country)
  - Tier badge
  - Nightly rate
  - "View" + "Fly There" buttons
- Filterable by region, tier, category

#### 2c. Resort detail page
- New route `/app/resorts/[resortId]/page.tsx`
- Editorial layout matching event detail aesthetic:
  - Hero with image (or gradient fallback) + name
  - Location + ICAO badge
  - Long description
  - Amenities pills
  - Dress code
  - Nightly rate
  - SIGNATURE EXPERIENCES section (cards with name, price, description)
  - "BOOK STAY" button → links to flight planner with `?destination={ICAO}&purpose=resort:{resortId}`
- IF player's aircraft.currentLocationICAO === resort.locationICAO → CONCIERGE MODE:
  - Header changes to "GUEST SINCE [arrivalDate]"
  - Button changes to "EXTEND STAY" (+1 night, +1 week buttons)
  - Signature Experiences become "PURCHASE" buttons (atomic transaction: burn cash → log to apiUsage and transactions → toast confirmation)
  - "CHECK OUT" button → opens flight planner

#### 2d. Booking mechanics (atomic)
- Function `bookResort(resortId, nights = 3)`:
  - Atomic transaction across [player, transactions, resortBookings]
  - Charge `nightlyRate * nights` from player cash
  - Create resortBookings record with `checkInAt = sim now, checkOutAt = sim now + nights days`
  - Add transaction record
- Function `extendStay(bookingId, additionalNights)`:
  - Atomic: charge cash, update checkOutAt
- Function `checkOutResort(bookingId)`:
  - Atomic: refund unused nights if any, set checkOutAt to sim now
  - Triggered by launching outbound flight
- Function `purchaseExperience(resortId, experienceId)`:
  - Atomic: charge cash, log to transactions + bookings record
  - Return success/fail

#### 2e. Flight planner Step 2 — Resorts tab
- Add third tab to Step 2 (after ICAO/Cities, Global Events)
- Pulls from `db.resorts`
- Selecting a resort sets `purpose = resort:{resortId}` and destination ICAO

#### 2f. Persona resort populations
- In bootstrap, after personas seed, randomly distribute 4-6 personas to their `preferredResorts[0]` instead of their default home location
- Update their `personaState.currentLocationICAO` to that resort's ICAO

#### 2g. "Bump into" proactive DMs
- After `resolveArrivals`, for each player flight that arrives at a resort ICAO:
  - Check if any persona is also at that ICAO
  - 40% chance to trigger proactive DM
  - DM uses Claude with system prompt: "You just realized [player] is at the same resort. Send a brief warm DM expressing surprise and suggesting drinks or meeting up."

---

### STEP 3: Phase 6 — World Embodiment + Identity + Imagery

#### 3a. Player profile
1. Add `Player` type from schema-additions.ts
2. Add Dexie table: `player: 'id'` (single record)
3. Drop `data/player.json` content into seed
4. In `bootstrap.ts`: if `db.player` empty, seed from `player.json`
5. New `/app/settings/profile/page.tsx`: editable form for all player fields
6. Update Claude DM system prompts to include player profile context

#### 3b. Persona schema upgrade
1. Update Persona type in `/types/index.ts` per `schema-additions.ts` (add identity fields)
2. **REPLACE** `/data/personas.json` with provided file (19 personas with full identity)
3. Migration: existing `db.personas` records → upgrade with new fields from JSON
4. Update Claude DM system prompt builder to include:
   - Persona identity (gender, pronouns, orientation, relationshipStyle, currentPartners)
   - Persona drama
   - Persona playerDynamic
   - Player profile context

#### 3c. Persona detail page identity block
- `/app/social/[personaId]/page.tsx` — add IDENTITY section:
  ```
  IDENTITY
  Pronouns: he/him
  Orientation: gay
  Relationship style: openly polyamorous
  Currently: with Inès (Paris) + Mateo (CDMX)
  ```
- For closeted personas (e.g., Marcus): show ONLY publicOrientation/publicRelationshipStatus by default
- At relationship depth >= 50, reveal: "There's more to [name] than meets the eye..." (placeholder for now; Phase 8 will gate fully)
- Use natural language, never clinical

#### 3d. Pets system
1. Add `Pet` type
2. Add Dexie table: `pets: 'id, ownerId, currentLocationICAO'`
3. Drop `data/pets.json` content into seed
4. In bootstrap, seed pets if empty
5. Pets render on map with personas (small paw icon overlaid on persona marker)
6. Step 3 of flight planner: add "PETS" section showing player's pets at current location, toggleable like passengers
7. On arrival: pets at player location (going on flight) update their currentLocationICAO

#### 3e. Imagery (defer until ready)
- `scripts/generate_imagery.js` is provided
- Player runs this when ready (needs GOOGLE_AI_API_KEY in `.env.local`)
- Don't run automatically — wait for user trigger
- After running: imagery files exist in `/public/portraits`, `/public/imagery/events`, `/public/imagery/resorts`
- All imageUrl fields populated in JSON files
- Components fall back to monogram gradient if imageUrl is null (existing pattern)

---

## FILES TO REPLACE / ADD

| File | Action |
|------|--------|
| `/types/index.ts` | Add types from schema-additions.ts |
| `/lib/db.ts` | Add tables: resorts, resortBookings, pets, player |
| `/lib/bootstrap.ts` | Seed all new data; preserve existing if present |
| `/data/personas.json` | REPLACE with provided file (19 personas) |
| `/data/resorts.json` | NEW file (35 resorts) |
| `/data/player.json` | NEW file (player profile) |
| `/data/pets.json` | NEW file (sample pets) |
| `/scripts/generate_imagery.js` | NEW script (don't run automatically) |
| `/app/destinations/page.tsx` | Activate Resorts tab |
| `/app/resorts/[resortId]/page.tsx` | NEW route |
| `/app/social/[personaId]/page.tsx` | Add identity block |
| `/app/settings/profile/page.tsx` | NEW route (player profile editor) |
| `/app/settings/page.tsx` | Add Export/Import save buttons |
| `/app/flight/new/_components/Step2Destination.tsx` | Add Resorts tab |
| `/app/flight/new/_components/Step3Passengers.tsx` | Location-aware filtering + Pets section |
| `/app/api/ai/dm/route.ts` (or wherever DM endpoint lives) | Update prompt builder with identity + player context |
| `/app/components/Header.tsx` (or layout) | Add inbox badge |
| `/app/components/Toast.tsx` | NEW component for proactive DM notifications |
| `/lib/simulation.ts` | Add bump-into trigger after resolveArrivals |

---

## VERIFICATION CHECKLIST (BEFORE CLAIMING DONE)

Pre-Phase 5 cleanup:
- [ ] Event detail pages show confirmed attendees
- [ ] Inbox badge visible top-right
- [ ] Toast appears when proactive DM arrives
- [ ] Step 3 only enables passengers at player's location
- [ ] Settings page has Export/Import buttons working

Phase 5:
- [ ] /destinations Resorts tab shows 35 resorts
- [ ] Click resort → detail page renders properly
- [ ] "BOOK STAY" → flight planner with destination prefilled
- [ ] Fly to a resort → arrival → Concierge Mode active
- [ ] Extend Stay button works (charges cash atomically)
- [ ] Purchase Signature Experience works (charges cash, logs)
- [ ] Step 2 of flight planner has Resorts tab
- [ ] Some personas seeded at resorts (verified via FRIENDS map layer)
- [ ] Bump-into DM occasionally fires when arriving at same resort as persona

Phase 6:
- [ ] Player profile in db.player, /settings/profile loads + edits
- [ ] All 19 personas in db.personas (4 new + reframings)
- [ ] Persona detail pages show identity block
- [ ] Marcus's detail page shows public-only by default
- [ ] DM responses reference identity context (Naomi mentions women generally; Theo flirts gay-coded; etc.)
- [ ] Pets visible on map
- [ ] Pets selectable in Step 3 passenger picker
- [ ] No portrait 404s (monogram fallback works)

Build:
- [ ] `npm run build` passes locally with zero TypeScript errors
- [ ] Push to main, Vercel green
- [ ] User smoke tests on live URL

---

## SHIP IN ORDER

1. Pre-Phase 5 cleanup → push → user verifies → APPROVED
2. Phase 5 work → push → user verifies → APPROVED
3. Phase 6 work → push → user verifies → APPROVED
4. (Optional) User runs `generate_imagery.js` → push images → done

DO NOT ship all three at once — too much surface area for any single bug to manifest. Three commits, three verifications.

---

## REMINDERS

- All NaN-coordinate map operations MUST use `whenStyleReady()` and `isValidLngLat()` helpers
- Dexie writes that touch player money MUST be atomic transactions
- API key NEVER exposed to client (server-only routes)
- Use existing `<PersonaAvatar>` component for ALL persona/player imagery (handles null fallback)
- Pets need their own avatar component or extend PersonaAvatar to handle pet imagery
- Build locally before push (prebuild hook catches TS errors)
- Verify Vercel deploy is GREEN before declaring milestone complete
- Don't claim "VERIFIED" or "EXACTED" until user has smoke tested

If you run into ambiguity or find conflicts in the data, STOP and ask. Don't guess.
