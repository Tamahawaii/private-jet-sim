# JETSTREAM — Time Passage & Milestones

The calendar rolls forward but nothing ages. Friendships accumulate no weight. The Aspen purchase from two years ago feels the same as yesterday. This system gives sim time *gravity* — birthdays, anniversaries, tenure, year-over-year comparisons that make the world feel lived-in.

## The Problem It Solves

Right now, time passes without consequence. The game rewards recent action but forgets everything else. Real billionaire life has enormous *institutional memory* — "the year of the Mustique disaster," "when Sasha turned 40," "the first time we went to Art Basel together."

## Core Mechanics

### 1. Persona Birthdays

Each of the 15 personas has a birthday (pre-seeded in `/data/personas.json`). When a persona's birthday occurs in sim time:

- A notification fires: *"Today is Sasha Volkov's 39th birthday"*
- The persona may DM you (50% chance, higher if close friendship)
- An opportunity surfaces in Command Center: **"Send a gift"** or **"Throw a dinner"**
- Other personas sometimes reference it in DMs ("Going to Alessandro's for Sasha tonight, you in?")
- Skipping close friends' birthdays has small friendship penalties (-3 if you never acknowledged)

Over years, birthdays accumulate memory: *"Sasha's 40th (you were there, at Cheval Blanc)," "Sasha's 41st (missed, you were in Tokyo)"*

### 2. Friendship Anniversaries

After 1 year of knowing a persona (first DM sent), 2 years, 5 years, etc., a small anniversary moment triggers:

- Claude-generated DM reminiscing: *"Five years this week since we met at Basel. Feels longer. Meant in the good way."*
- Small friendship bonus on receipt
- Enters your Shared History log on their profile

### 3. Ownership Anniversaries

**Property**: 1-year, 5-year, 10-year milestones on properties owned.
- "You've owned Red Mountain Aspen for 5 years. It's appreciated 34%."
- Small prestige bonus for long-term ownership (+2 per property at 5-year mark — reflects taste)

**Aircraft**: Hours-flown milestones.
- "N100JS has flown 1,000 hours under your ownership."
- Retirement consideration at high hours (optional sale recommendation at 3,000+ hours)

**Yachts**: Similar.

### 4. Player Tenure

The app tracks **`playerCreatedAt`**. Milestones surface:
- 3 months: first year-in-review (mini version)
- 6 months: mid-year digest
- 1 year: "Year in Review" (see file 24)
- 2 years, 5 years: anniversary markers

### 5. Seasonal Year-Over-Year Memory

When you arrive at a seasonal location, the app surfaces previous visits:
- *"Last May in Monaco, you stayed at Hotel de Paris. Event attended: GP. Companion: Sasha."*
- *"First time in Aspen was February 2026. You've been back 4 times since."*

Creates pattern awareness.

### 6. "It's Been..." Memory Triggers

Periodic ambient memories:
- "It's been 6 months since you bought the Carré d'Or penthouse."
- "It's been a year since you attended your first Met Gala."
- "It's been 2 weeks since you last DMed Elena."

These surface subtly in Command Center and can feel warm or slightly pointed depending on context.

## Data Model Additions

```typescript
// Add to Persona type
type Persona = {
  // ...existing fields
  birthday: {
    month: number;     // 1-12
    day: number;       // 1-31
    birthYear: number; // for age calc
  };
};

// New type
type Milestone = {
  id: string;
  type: "persona_birthday" | "friendship_anniversary" | "ownership_anniversary" 
      | "player_tenure" | "tour_revisit" | "memory_trigger";
  occurredAt: ISODateString;
  acknowledgedAt?: ISODateString;    // when player engaged with it
  relatedEntityId?: string;          // personaId, propertyId, etc.
  claudeGeneratedText?: string;      // for memory triggers with prose
  outcomeAppliedAt?: ISODateString;  // when effects (friendship, prestige) fired
};
```

## Seeded Persona Birthdays

```typescript
{
  "sasha-volkov":     { month: 7,  day: 14, birthYear: 1988 }, // mid-summer, Monaco peak
  "naomi-tanaka":     { month: 3,  day: 22, birthYear: 1992 },
  "dmitri-kozlov":    { month: 11, day: 8,  birthYear: 1994 },
  "alessandro-conti": { month: 10, day: 3,  birthYear: 1981 }, // Milan Fashion Week-ish
  "amara-okonkwo":    { month: 2,  day: 27, birthYear: 1985 },
  "jules-laurent":    { month: 5,  day: 16, birthYear: 1974 }, // Cannes time
  "elena-marchetti":  { month: 12, day: 4,  birthYear: 1990 }, // Art Basel Miami
  "marcus-chen":      { month: 9,  day: 19, birthYear: 1987 },
  "khalid-al-rashid": { month: 6,  day: 12, birthYear: 1982 }, // Royal Ascot
  "vivian-hollis":    { month: 11, day: 30, birthYear: 1968 },
  "rico-alvarez":     { month: 8,  day: 25, birthYear: 1979 }, // Hamptons peak
  "pietro-russo":     { month: 4,  day: 11, birthYear: 1963 },
  "charles-pemberton":{ month: 1,  day: 23, birthYear: 1975 }, // Davos week
  "pierre-larousse":  { month: 10, day: 17, birthYear: 1977 }, // Paris FW
  "saanvi-mehta":     { month: 4,  day: 29, birthYear: 1986 }
}
```

Birthdays cluster near seasonal moments on purpose — creates natural flex opportunities.

## Claude Integration

### `/api/ai/birthday-dm`

When a persona's birthday arrives and they choose to DM:

**Prompt context**:
- Persona's current mood, location
- Friendship level with player
- Player's current location
- Age turning
- Shared history (events attended together, trips)

Claude generates a contextually appropriate message — could be warm ("Thirty-eight. Feels the same as thirty-seven. Hope all's well, mate."), prompting ("Doing something small in Monaco if you're on this side of the world"), or pointed if friendship is low.

### `/api/ai/memory-trigger`

Generates the "It's been X since..." prose. Called sparingly (1-2 per week max).

### `/api/ai/revisit-recap`

When arriving somewhere with previous visits, generates a brief reminder of past context. Feels like memory, not a database query.

## Build Order

Insert as **Phase 12.3: Time Passage & Milestones**.

Tasks:
1. Extend Persona type with `birthday` field
2. Seed birthdays in `/data/personas.json`
3. Create `milestones` table in Dexie
4. Build `/lib/milestone-engine.ts`:
   - Detects upcoming birthdays on app open (next 7 days)
   - Detects friendship anniversaries
   - Detects ownership anniversaries
   - Generates "It's been..." triggers at appropriate cadence
5. Wire into Command Center:
   - "Today's Birthdays" card when applicable
   - "Recent Memories" small section
6. Build `/api/ai/birthday-dm` and `/api/ai/memory-trigger` endpoints
7. Add friendship/prestige bonuses for acknowledging milestones
8. Add player tenure markers at 3/6/12 months
9. Build revisit-recap integration when landing at previously-visited locations

## Why This Matters

Without time weight, the game has no history. With it:
- Your 3-year friendship with Sasha *feels* different from your 1-month friendship with Marcus
- Missing Alessandro's 45th birthday is a real decision
- Your Aspen place has a story
- The app becomes a vessel for your accumulated *life*, not just your current actions

Time earning weight is what makes a simulator feel like a *life*.
