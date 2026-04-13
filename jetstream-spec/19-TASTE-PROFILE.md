# JETSTREAM — Taste Profile

The app silently learns who you are. After months of play, it *knows* you — and so do your friends. This isn't a settings screen you fill out. It's passive observation that compounds.

## The Problem It Solves

Right now, recommendations are generic. Events, resorts, properties — all surface the same way for every player. A real social circle learns you. After two years, Sasha knows you hate fashion weeks and always go to Monaco. Alessandro knows you prefer understated over flashy. Rico knows you say yes to any party he throws.

The Taste Profile gives the app — and the AI friends — this memory.

## Core Concept

Every meaningful action silently updates a **taste vector** for the player across multiple dimensions. The vector is never shown to the player as raw data. Instead, it affects:

- Which events surface first on the calendar
- Which resorts the Destinations page highlights
- How Claude personas phrase their invitations
- Which trips personas assume you'll join
- Contextual DM openers ("I know you usually skip fashion weeks, but...")

## Taste Dimensions

```typescript
type TasteProfile = {
  playerId: "player";                // singleton
  
  // Event category affinities (0-100, starts at 50)
  motorsport: number;
  art: number;
  fashion: number;
  music_festival: number;
  film: number;
  yacht_regatta: number;
  polo_racing: number;
  tennis_golf: number;
  gala_awards: number;
  summit_conference: number;
  
  // Aesthetic/style preferences
  understated_vs_flashy: number;     // 0 = Amara, 100 = Dmitri
  ancient_vs_modern: number;         // 0 = Venice palazzo, 100 = Tokyo tower
  crowd_vs_solitude: number;         // 0 = private island, 100 = Coachella VIP
  city_vs_nature: number;            // 0 = Monaco, 100 = Singita
  warm_vs_cool_climates: number;     // 0 = Aspen, 100 = Seychelles
  
  // Social preferences
  close_circle_vs_scene: number;     // 0 = 2-person dinners, 100 = 40-person parties
  old_money_vs_new: number;          // 0 = Sasha's set, 100 = Dmitri's set
  hosts_vs_attends: number;          // low = rarely hosts, high = always hosting
  
  // Region gravity (how much you've used this region)
  region_mediterranean: number;
  region_caribbean: number;
  region_asia_pacific: number;
  region_americas: number;
  region_middle_east: number;
  region_alpine: number;
  
  // Friend affinity (separate from friendship level — this is behavioral preference)
  preferredCompanionPersonaIds: PersonaID[]; // top 3 by frequency traveled with
  avoidedPersonaIds: PersonaID[];    // consistently declined
  
  // Meta
  lastUpdatedAt: ISODateString;
  totalActions: number;              // how much data we have
};
```

## How It Updates

Every meaningful action nudges the relevant dimensions. Updates are small — a single action moves things by 1-3 points. Momentum builds.

```typescript
// /lib/taste-engine.ts

export const TASTE_WEIGHTS = {
  // Attending an event
  eventAttendance: {
    dimension: event => event.category,    // maps to matching field
    delta: +3,
    tierMultiplier: true,                  // tier 5 events count more
  },
  
  // Declining / skipping an event you were invited to
  eventDecline: {
    dimension: event => event.category,
    delta: -2,
  },
  
  // Booking a resort
  resortBooking: {
    // Multiple dimensions affected
    effects: resort => ([
      { dim: getRegionDim(resort.locationCountry), delta: +2 },
      { dim: 'understated_vs_flashy', delta: resort.brand === 'Aman' ? -3 : +1 },
      { dim: 'warm_vs_cool_climates', delta: isTropical(resort) ? +2 : -2 },
      { dim: 'crowd_vs_solitude', delta: resort.prestigeTier >= 5 ? -3 : +1 },
    ]),
  },
  
  // Flying to a region
  flightArrival: {
    effects: flight => ([
      { dim: getRegionDim(flight.destinationCountry), delta: +1 },
    ]),
  },
  
  // Buying property in a region
  propertyPurchase: {
    effects: property => ([
      { dim: getRegionDim(property.country), delta: +5 },  // big commitment
      { dim: 'understated_vs_flashy', delta: property.featureTier === 'trophy' ? +4 : -2 },
    ]),
  },
  
  // Hosting events
  hosting: {
    effects: eventType => ([
      { dim: 'hosts_vs_attends', delta: +4 },
      { dim: 'close_circle_vs_scene', delta: eventType.guestCount > 10 ? +2 : -2 },
    ]),
  },
  
  // Traveling with a specific persona (passenger)
  traveledWith: {
    effect: personaId => incrementCompanionCount(personaId),
  },
  
  // Declining a persona's invitation repeatedly
  declinedInvitation: {
    effect: personaId => incrementDeclineCount(personaId),
  },
};
```

## Key Decay Rule

To prevent taste from ossifying, all dimensions **decay 0.5 points/month toward 50 (neutral)**. This means if you stop attending motorsport for a year, the affinity drifts back down. Prevents "I went to one Monaco GP three years ago and now every event suggestion is F1."

## Integration Points

### Events Calendar Sorting

```typescript
export function scoreEventForPlayer(event: BillionaireEvent, taste: TasteProfile): number {
  const categoryAffinity = taste[event.category] ?? 50;
  const regionAffinity = taste[getRegionDim(event.locationCountry)] ?? 50;
  const attendingCompanions = event.confirmedAttendees.filter(p => 
    taste.preferredCompanionPersonaIds.includes(p)
  ).length;
  
  return categoryAffinity * 0.4 
       + regionAffinity * 0.2 
       + attendingCompanions * 10 
       + event.prestigeTier * 5;
}
```

Events with highest scores surface first on the calendar and in "You might like" widgets.

### Destination Page

Default resort sort changes from "nearby" to "matches your taste" after 30+ meaningful actions. The app quietly shifts from generic to personalized.

### Claude Persona Prompts (Extension)

When generating DMs or invitations, personas receive taste context:

```
PLAYER TASTE (from observed behavior, not self-reported):
- Strong preference: motorsport, Mediterranean, old money circles
- Weak preference: fashion weeks, Caribbean
- Travels most often with: Sasha Volkov, Khalid Al-Rashid
- Hosts rarely; attends more often

Given this, your invitation should reflect what you know about this player. 
If you're inviting them to something that doesn't match their taste, acknowledge 
it ("I know fashion week isn't your thing, but Elena's hosting a small dinner..."). 
Don't pitch them something tone-deaf.
```

This is the quiet magic. Sasha stops inviting you to art fairs because you've said no three times. Rico keeps inviting you to parties because you always come. Personas feel like they *know you* — because they do.

### Command Center "For You"

New widget after 30+ actions: **"Curated for You"**
- 3 events you haven't seen yet, ranked by taste score
- 1 resort you might love (region + aesthetic match)
- 1 friend you haven't traveled with recently but who'd enjoy this moment

Never explicitly says "based on your taste" — it just appears as recommendations.

## UI Surface (Minimal, On Purpose)

The player **never sees raw numbers** from the taste profile. Closest surface:

### Profile → "How JETSTREAM Sees You" (Hidden Easter Egg)

Only unlocks after 60+ meaningful actions. Small link at the bottom of Profile: *"How are we doing?"*

Opens [MODAL] Reflection:
- Natural-language summary generated by Claude from the taste profile
- Example: *"You've shown a clear pattern: Mediterranean over Caribbean, understated over showy, attending over hosting. You travel most often with Sasha and Khalid. You've declined three fashion week invitations — we'll stop offering them unless something interesting comes up."*
- [BTN] "That sounds right" (no effect, just satisfying acknowledgment)
- [BTN] "Not really — recalibrate" → resets taste profile to neutral, logged as "player correction"

## Data Model Addition

```typescript
// Extend Dexie schema
this.version(5).stores({
  // existing...
  tasteProfile: 'playerId',
});
```

## Build Notes

Insert as **Phase 12.2: Taste Profile** (after base polish, can ship before later phases).

Tasks:
1. Extend Dexie with `tasteProfile` singleton
2. Initialize all dimensions at 50 on first load
3. Build `/lib/taste-engine.ts` with update functions
4. Wire update hooks into:
   - Flight arrival resolution
   - Event attendance detection
   - Resort booking
   - Property purchase
   - Hosting completion
   - Companion tracking
5. Implement monthly decay pass (in `applyMonthlyBurn` cycle)
6. Update event calendar sorting to use taste scoring
7. Update Destinations page sorting
8. Extend Claude persona prompts with taste context
9. Build "For You" widget on Command Center (unlocks after 30 actions)
10. Build "How JETSTREAM Sees You" modal (unlocks after 60 actions)

## Why This Matters

Without the taste profile, your 100th session feels identical to your 10th. With it, the app has *accumulated memory*. You don't tell it who you are — it finds out. And then it reflects you back at you.

That's the moment the simulation stops being generic and starts being *yours*.
