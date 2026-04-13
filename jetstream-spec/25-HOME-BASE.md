# JETSTREAM — Home Base

Right now "home" is just an airport code. There's no felt sense of *belonging somewhere*. This system makes one of your owned properties your **Primary Residence** — a lived-in space that becomes the app's emotional anchor when you're not traveling.

## The Problem It Solves

Every session currently feels like a transit day. You're always going somewhere, attending something, buying something. But the richest part of the fantasy is the stillness between — being *home*. Having a place. Returning to it. Having it wait for you.

Without a home, you're a tourist in your own life.

## Core Concept

Once you own at least one property, you designate one as your **Primary Residence**. This unlocks:

- A dedicated **Home** view (new section of app)
- "Home days" — when you're physically at home, the app shifts into a quieter mode
- **Standing decisions** — small accumulating choices only visible at home (hire a new gardener, update the wine cellar, approve a renovation)
- **Staff relationships** — your household staff are subtle personas with lives
- **Mail** — a magazine-style inbox of things waiting for you when you return

The Primary Residence is the place you *live*. Everywhere else is where you visit.

## Designating a Home

Upon owning first property: [MODAL] prompts player to designate as Primary Residence, or "Not yet."

Subsequently, any owned property can be designated via its detail page:
#### [BTN] "Make Primary Residence"

Only one property at a time. Changing triggers a small ceremony — *"Home is now the Carré d'Or penthouse. The Aspen place will be maintained as a secondary residence."*

## Home View

New top-level route: **`/home`** (also first-tab shortcut on Command Center when player is physically at home).

### When Player Is Physically at Home

The Home view is the primary interface. It shows:

**Hero section**: Room view (stock image matching property type + mood time of day), current weather where you are, time of day, brief status line:
> *"Morning at Carré d'Or. 68°F, sun on the marina. You have nothing scheduled today."*

**Standing Decisions** card: 0-4 small items awaiting your attention (see below)

**The Mail** card: unread items of arrivals while you were away

**Who's Nearby**: friends within 200km currently, with quick DM shortcuts

**Today's Suggestions**: 2-3 low-key suggestions keyed to current mood/location/season:
- *"Lunch at La Petite Maison, 15 min walk"*
- *"Elena's been asking about the new Richter installation — invite her over?"*
- *"Your Bordeaux is approaching peak. Ernesto suggested decanting the 2005 Latour tonight."*

### When Player Is Away from Home

Home view is available but styled differently — more anticipatory:

**Hero**: "Away from home. Back in {X} days."

**Standing Decisions**: Still accessible, but flagged as "Waiting for you"

**The Mail**: Shows everything accumulating

**Home Status**: brief update — *"Carré d'Or is quiet. Staff is preparing for your return Thursday. The gardener finished the spring pruning."*

## Standing Decisions

Small, non-urgent choices accumulate while you're away. They're always at home when you return:

### Types

**Staffing**
- *"The gardener, Marcel, gave notice. Carlos has recommended his cousin Eduardo. Hire without interview, or want to meet him first?"*
- *"Your housekeeper Priya asked for two weeks off in October for her sister's wedding. Approve?"*

**Household**
- *"Wine merchant sent the seasonal allocation. Approve the list ($47k) or review?"*
- *"Kitchen suggested hiring a part-time pastry chef. Monthly cost +$6k."*

**Property**
- *"Landscape architect proposes replacing the east garden roses with jasmine. $38k. Worth doing now or defer?"*
- *"Your neighbor mentioned having the fence between properties cleaned. Split the cost with Sasha ($8k each)?"*

**Collection Care**
- *"The Basquiat should rotate back from storage to the dining room. Approve?"*
- *"Conservator flagged the Richter for light exposure — move to east wall?"*

**Social**
- *"Saanvi sent 24 orchids with a note: 'Remembering our dinner here last year.' Worth a handwritten thank-you?"*

### Resolution

Each decision has 2-3 simple options. No wrong answer — just flavor. Approved decisions become **small transactions** or **micro-events** that texture the world.

Some decisions, over time, have compounding effects:
- Consistently good staff decisions → +5 prestige passive (household runs well)
- Neglecting decisions → subtle flavor ("Carlos handled the gardener situation himself — you weren't available")

### Claude Integration

Standing decisions are Claude-generated (using Haiku for speed) with context about:
- Which property is home
- Current staff and their implied personalities
- Recent player choices (for continuity)
- Season and local context

```
/api/ai/standing-decision

Generate a standing decision for the player's Primary Residence.

Context:
- Residence: {property description, location}
- Current staff: {names, roles}
- Recent decisions: {last 5 decisions made}
- Current season: {season}

Generate a small household decision that feels real. 
- Never urgent
- Always 2-3 options
- Flavor over mechanic
- Keep it brief: 1-2 sentences of setup + 2-3 option labels

Return JSON.
```

New decisions fire 1-3 per week sim time, quietly pile up, resolve whenever you want.

## The Mail

Magazine-style inbox that accumulates while you're away. Surfaces at home.

### What Mail Contains

**Letters from friends** (Claude-generated, persona-specific voice):
- Thank you notes after stays
- Postcards from their trips
- Invitations to future events
- Seasonal greetings (Christmas cards, Diwali, etc.)

**Catalog / publication arrivals**:
- Christie's, Phillips, RM Sotheby's catalogs (link to current lots)
- Hermès seasonal lookbooks
- Wine merchant allocations
- Book club selections (Dom Perignon, Christie's Wine Club)

**Invitations** (formal, not DMs):
- Save-the-dates for galas
- Premier invitations (fashion houses, art openings, gallery previews)
- Dinner invitations from personas

**Business matters**:
- Monthly statements from wealth managers
- Property management updates
- Charter income summaries

**Occasional paper world**:
- Your copy of The Ledger (if you're subscribed via home mail, otherwise digital)
- Air Mail delivery
- Literary Review

### UI: The Mail View

Editorial layout:
- Header: "Mail awaiting you"
- Letter stack: physical-feeling envelopes, preview text visible
- Catalogs: covers of current auction catalogs
- Organized by type or chronological

Each item opens to full view. Some letters have reply options. Catalogs link directly to relevant auctions.

## Staff Relationships

Your household staff are light personas — they have names, histories, small personalities. Interacting with them is part of home life.

### Core Staff Roster (seeded at home designation)

Base staff for any Primary Residence:
- **Estate Manager** (runs everything, most senior)
- **Head Housekeeper**
- **Head of Security** 
- **Chef** (if you added the Michelin Chef module to aircraft/yacht — can double at home)
- **Driver** (if residence requires)
- **Gardener** (if residence has grounds)

Additional staff unlock based on property feature tier and monthly upkeep investment.

### Each Staff Member

Minimal data model:
```typescript
type HomeStaff = {
  id: string;
  propertyId: string;
  role: string;                        // "Estate Manager"
  name: string;                        // "Marcus Pellegrino"
  nationality: string;                 // "Italian"
  yearsOfService: number;              // increments with time
  personality: string;                 // 2-3 word descriptor: "discreet, sharp"
  
  // Light relationship
  rapportWithPlayer: number;           // 0-100, grows slowly over time
  
  // Flavor
  backstory?: string;                  // Claude-generated bio
  quirks?: string[];
};
```

Staff relationships grow slowly — after a year, your Estate Manager "knows" how you take your coffee. After two years, your Chef anticipates what you'll want for dinner. This is surfaced as small flavor details.

### Staff Moments

Occasional small moments where staff presence is felt:
- *"Marcus left you a note: the wine delivery is in the cellar, and he's arranged the evening you asked about. Details on the desk."*
- *"Ernesto the Chef has prepared the tasting you like — the one with the olive oil from his cousin's farm."*

These ambient moments make the residence feel *inhabited*.

## Home Days vs. Travel Days

When you're physically at your Primary Residence:
- Home tab becomes default
- Quiet moments surface more frequently
- Standing decisions are visible in preview
- Command Center features "Today at Home" summary

When you're traveling:
- Command Center stays default
- Home view accessible via nav but styled "away"
- Quiet moments lower rate
- Mail accumulates silently

## Impact on Existing Systems

### Flight Planner
When planning a flight, new option: **"Return home"** — single-tap flight to Primary Residence airport.

### Resorts
When you're at a resort, subtle comparison: *"Room service at Aman Tokyo. You'd normally be at Carré d'Or right now."* Builds anticipation of return.

### Events
Arriving somewhere not-home: *"3 days away from home."* — subtle.

### Seasonal
Peak season at your home = best times of year. Monaco in May if your home is Carré d'Or. Surfaces as: *"Home is at its best right now."*

### Economy
Primary Residence monthly upkeep is baseline — the "minimum lifestyle burn" is your residence. All other properties are secondary residences with slightly lower staffing defaults.

## Dexie Schema

```typescript
this.version(9).stores({
  // existing...
  homeStaff: 'id, propertyId',
  standingDecisions: 'id, propertyId, resolvedAt, generatedAt',
  mailItems: 'id, type, arrivedAt, readAt',
});

// Extend player:
// player.primaryResidencePropertyId: string | null
```

## Ceremony of Changing Homes

Changing Primary Residence is a small narrative moment:

[MODAL] "Make [property] home?"
- "Your Monaco staff will be retained at Carré d'Or."
- "The Aspen place will shift to secondary residence. Staff will be reduced."
- "Elena might be surprised — she knew the Aspen place as home."
- [BTN] Cancel | [BTN] Confirm

On confirm:
- Brief transition animation
- Home view updates
- Notification: *"Home is now Carré d'Or."*
- Friend DMs may reference the change within a few days

## Build Order

Insert as **Phase 15: Home Base** (near the end — needs properties system complete).

Tasks:
1. Extend player with `primaryResidencePropertyId`
2. Extend Dexie with staff, standing decisions, mail tables
3. Build property designation flow (make residence)
4. Build `/home` route with Away/At-Home modes
5. Build Claude endpoint for standing decisions generation
6. Implement standing decisions queue + resolution
7. Implement seeded home staff on designation
8. Build staff relationship tracking
9. Build `/home/mail` view with magazine styling
10. Implement mail generation engine (letters from friends, catalogs, invites)
11. Wire "Return home" quick-action into flight planner
12. Add "Home at its best" seasonal surface
13. Integrate home location into quiet moments generation
14. Test: designate home, travel away for 3 weeks sim time, return, verify mail has accumulated and standing decisions are waiting

## Why This Matters

Without a home, you're nomadic — which is glamorous but also *lonely*. Every game-day is a performance. There's no "returning."

With a home, your life gets a **rhythm**:
- Travel days are visits
- Home days are rest
- You anticipate returning
- Friends can visit *you*
- The space accumulates character — staff, collection, memories

The home view is the one screen you'll open not to *do* anything, but to just *be* somewhere.

It's the feature that makes you own JETSTREAM, not just play it.
