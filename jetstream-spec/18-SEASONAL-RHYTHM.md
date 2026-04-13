# JETSTREAM — Seasonal Rhythm

Right now the calendar treats every month the same. Real billionaire life is brutally seasonal — "the season" migrates around the globe, and your friends migrate with it. Monaco in May is electric; Monaco in November is dead. Aspen in July has no one; Aspen in February is the whole circle. This system makes the calendar *pulse* — giving every month a distinct feel and turning annual rhythms into gameplay texture.

## The Billionaire Calendar (for real)

The ultra-wealthy follow a well-established global migration. This isn't invented — it's how this world actually moves:

### Winter (January – March): Alpine + Caribbean
- **Aspen, Gstaad, Verbier, St. Moritz** — ski season
- **St. Barths, Mustique, Parrot Cay** — Caribbean escape
- **Dubai, Doha** — desert glamour, World Cup prep

### Spring (April – June): The European Awakening
- **Coachella** — the season's bookmark
- **Paris, Milan** — spring, fashion markets
- **Monaco, Cannes** — the French Riviera comes alive
- **Kentucky, Royal Ascot** — horse racing calendar
- **Art Basel Basel** — the art world's high holy

### Summer (July – August): Mediterranean Supremacy
- **Porto Cervo, Ibiza, Mykonos, Portofino, Capri** — yacht season
- **Hamptons** — East Coast Americans stay stateside
- **Wimbledon, Henley** — English summer
- **Sun Valley, Aspen** — American mountain set
- **Salzburg Festival** — cultural summer

### Fall (September – November): Transitions
- **Venice Film Festival, US Open, Toronto** — festival season
- **Milan/Paris Fashion Weeks** — F/W shows
- **Frieze London, FIAC Paris, Frieze Masters** — fall art
- **Miami** — waking up for winter season

### December: Art Basel + New Year
- **Art Basel Miami Beach** — the year's biggest art moment
- **St. Barths, Aspen** — New Year's migrations
- **Gstaad** — Christmas set

## Design Principles

- Seasons are **soft rules**, not hard blocks — you can always fly to Aspen in July, it just feels different
- Friends **migrate naturally** — they're in season-appropriate locations most of the time
- Events already reflect this (they're dated), but now **locations themselves feel seasonal**
- The app **surfaces the season's gravity** — suggesting plans, showing who's where, noting when a place is "in season"
- **Out-of-season penalties are subtle** — fewer friends around, less social activity, lower prestige boost from being there

## Data Model

```typescript
// Add to /types/index.ts

type SeasonProfile = {
  id: string;                       // "monaco-may", "aspen-feb"
  locationICAO: ICAOCode;
  locationName: string;             // "Monaco", "Aspen"
  region: string;                   // for grouping
  seasonName: string;               // "The Season", "Ski Season", "Off-Season"
  
  // Which months this profile is active
  activeMonths: number[];           // e.g., [5, 6] for May-June
  peakMonths: number[];             // e.g., [5] for peak May
  
  vibe: "peak" | "high" | "shoulder" | "off" | "dead";
  
  description: string;              // "The Côte d'Azur at full volume. Everyone is here."
  
  // Multipliers and effects
  prestigeMultiplier: number;       // 1.5 during peak, 0.7 off-season
  hostingBonus: number;             // bonus to friendship gain from hosting
  personaMigrationWeight: number;   // 0-1, how likely friends go here in this period
  propertyValueMultiplier: number;  // seasonal shift to property "current value" (subtle)
  resortAvailabilityImpact: "none" | "busy" | "sold_out"; // flavor
  
  iconicEvents?: string[];          // events that anchor this season's identity
};
```

We define ~35-40 season profiles covering the major billionaire destinations across their seasonal variations. Each location can have multiple profiles (Monaco in May = peak; Monaco in November = dead).

## The Season Profiles (curated)

### Tier A — Seasons that define the calendar

**Monaco**
- `monaco-season` | May–Sep | vibe: peak → high
- `monaco-off` | Nov–Feb | vibe: dead

**Aspen**
- `aspen-winter` | Dec–Mar | vibe: peak
- `aspen-summer` | Jul–Aug | vibe: shoulder (Ideas Festival, Food & Wine)
- `aspen-mud-season` | Apr–Jun, Oct–Nov | vibe: dead

**St. Barths**
- `stbarths-nye-season` | Dec 20 – Jan 10 | vibe: peak (mania)
- `stbarths-high-season` | Jan–Apr | vibe: high
- `stbarths-closed` | Sep–Oct | vibe: dead (many properties literally close)

**Hamptons**
- `hamptons-summer` | Memorial Day – Labor Day | vibe: peak
- `hamptons-off` | Nov–Apr | vibe: dead

**Mykonos**
- `mykonos-peak` | Jul–Aug | vibe: peak (chaos)
- `mykonos-shoulder` | May–Jun, Sep | vibe: high
- `mykonos-closed` | Nov–Mar | vibe: dead

**Ibiza**
- `ibiza-peak` | Jun–Aug | vibe: peak
- `ibiza-closing` | Sep | vibe: high (closing parties)
- `ibiza-closed` | Nov–Apr | vibe: dead

**Porto Cervo** (Costa Smeralda)
- `porto-cervo-peak` | Jul–Aug | vibe: peak
- `porto-cervo-shoulder` | Jun, Sep | vibe: shoulder
- `porto-cervo-closed` | Nov–Apr | vibe: dead

**Portofino / Capri**
- `portofino-summer` | May–Oct | vibe: high
- `portofino-winter` | Nov–Mar | vibe: dead

**Gstaad**
- `gstaad-winter` | Dec 20 – Mar | vibe: peak
- `gstaad-polo` | Jul | vibe: shoulder (Hublot Polo Gold Cup)
- `gstaad-off` | Other | vibe: dead

### Tier B — Seasons with distinct identities

**Cannes** — `cannes-festival` (May), `cannes-off` (rest)
**Venice** — `venice-biennale` (May–Nov alternating years), `venice-carnival` (Feb), `venice-film` (late Aug), `venice-acqua-alta` (Oct–Jan, flavor)
**Miami** — `miami-winter` (Dec–Apr, peak), `miami-art-basel` (1st week Dec, peak), `miami-summer` (Jun–Sep, dead for this set)
**Palm Beach** — `palm-beach-season` (Nov–Apr), `palm-beach-summer` (dead)
**Montecito / Santa Barbara** — `montecito-shoulder` (Apr–Nov), pleasant year-round actually
**Pebble Beach** — `pebble-beach-concours-week` (Aug), `pebble-beach-off` (rest)
**Royal Ascot / English Summer** — `english-summer` (Jun–Jul: Ascot, Wimbledon, Henley, Goodwood)
**Courchevel / Val d'Isère / Verbier** — `alpine-peak` (Feb), `alpine-shoulder` (Dec–Jan, Mar), `alpine-closed` (Apr–Nov)

### Tier C — Always-on (no strong seasonality)

- Tokyo, Singapore, Hong Kong, London, Paris, NYC — cities don't "close," but have peak *event* moments baked into the events calendar
- Dubai — big during GP (Dec) and air show (Nov)
- Geneva, Zurich — always baseline (plus Davos in Jan)

## Engine Logic

### Computing a Location's Current Season

```typescript
// /lib/seasonal-engine.ts

export function getSeasonAt(locationICAO: string, date: Date): SeasonProfile | null {
  const month = date.getMonth() + 1;
  const profiles = SEASON_PROFILES.filter(p => p.locationICAO === locationICAO);
  
  // Prefer peak match
  const peakMatch = profiles.find(p => p.peakMonths.includes(month));
  if (peakMatch) return peakMatch;
  
  // Then active match
  const activeMatch = profiles.find(p => p.activeMonths.includes(month));
  if (activeMatch) return activeMatch;
  
  return null;  // no specific season applies
}

export function getVibeMultiplier(locationICAO: string, date: Date): number {
  const season = getSeasonAt(locationICAO, date);
  if (!season) return 1.0;
  
  return season.prestigeMultiplier;
}
```

### Applying Seasonal Effects

#### Prestige
When player attends an event, gains prestige from stay, or hosts at a location:
```typescript
const baseEffect = standardPrestigeGain;
const multiplier = getVibeMultiplier(location, now);
const actualGain = Math.round(baseEffect * multiplier);
```

Monaco GP in May: +12 prestige becomes +18 (1.5x peak multiplier).
Monaco GP in November (if there was one): +12 becomes +8 (0.7x off-season).

#### Persona Migration
The persona-plan Claude endpoint receives `currentSeasonalContext` — a list of current peak-season locations with their migration weights.

Claude's trip planning heavily favors these locations when generating next trips for personas. The result: **friends naturally end up in-season**.

```
PERSONA PLAN PROMPT EXTENSION:

Current seasonal migration context (weight 0-1, higher = more likely):
- Monaco: 0.9 (peak season, May)
- Porto Cervo: 0.85 (shoulder, warming up)
- Aspen: 0.1 (mud season, skip)
- St. Barths: 0.3 (closing down)
- Hamptons: 0.1 (off-season)

When deciding this persona's next trip, weight destinations by these seasonal factors combined with their personal interests.
```

Result: most friends in Monaco in May, most friends in Aspen in February, most friends on yachts in August.

#### Hosting Bonuses
Hosting during peak season at an in-season location:
- Friendship gain per attending friend: base ×1.3
- Prestige gain: base ×1.5
- Claude generates more effusive recaps

Hosting off-season is still fun but feels quieter — smaller guest lists, more intimate.

#### UI Surface
- When viewing a city on the map, a subtle label shows current seasonal state: "Monaco — In Season" or "Aspen — Off Season"
- When planning a trip to an off-season location, a soft advisory appears: "Most of the circle is elsewhere right now. This'll be a quiet trip."
- Destinations page shows seasonal badges ("PEAK SEASON" / "SHOULDER" / "OFF SEASON") next to resort cards

## Integration with Existing Systems

### With Narrative Engine
Arcs reference seasonal context. A "summer yacht week" arc makes sense in July, not March. Claude's arc generation is given seasonal context.

### With Gossip Column
Weekly Ledger issues are heavily colored by current season. April issues mention Miami art-world thaw. August issues dripping with Med yacht coverage. December issues about Art Basel Miami and the start of the Caribbean migration.

### With Events
Events already anchor seasons. The seasonal engine adds texture *between* events — the "gravity" that pulls friends to seasonal locations even when no specific event is happening.

### With Property Values
Subtle property value shifts seasonally (maybe ±3% peak to trough) for properties in highly seasonal locations. Pure flavor — visible on property detail page as "Seasonal value adjustment: +$2.3M." Doesn't change resale math significantly.

### With Resorts
Resort listing page shows seasonal availability hint. Aman Tokyo = year-round. Eden Rock St. Barths = "Currently peak season" or "Closing for the season."

### With AI Personas
Each persona's home base is always accessible to them — but their "natural movement" heavily weights in-season destinations. Their `personaState.mood` can even shift based on where they are relative to season ("thrilled" in their peak spot, "restless" in off-season).

## UI Elements

### Seasonal Map Overlay (toggle in World view)

[BTN] "Seasonal Heatmap" toggle in map layers
- When ON: world map shows soft color overlay indicating peak-season regions
- Deep warm colors for peak (Monaco in May, Aspen in February)
- Cool tones for dead-season
- Legend in corner

### The Season's Gravity Widget (Command Center)

New card: **"This Season"**
- "Peak season in: Monaco, Porto Cervo, Mykonos (currently)"
- "Ending soon: [location list]"
- "Starting next month: [location list]"
- Shows where the circle is concentrated right now

### Friend Migration Summary (Social tab)

Small widget: **"Where's the Circle?"**
- Heatmap or bubble chart showing current concentration of friends
- "7 friends in Monaco this week"
- [BTN] Tap → see who's where

## Build Order

Insert as **Phase 9.8: Seasonal Rhythm** (after Gossip Column, before final Polish).

Tasks:
1. Define `SEASON_PROFILES` constant array in `/data/seasons.ts` (not JSON — computed with helper functions)
2. Build `/lib/seasonal-engine.ts` with `getSeasonAt`, `getVibeMultiplier`, helpers
3. Integrate seasonal context into persona-plan prompts
4. Apply seasonal multipliers to prestige gain calculations
5. Apply seasonal bonuses to hosting calculations
6. Add seasonal badge UI to resort cards, event cards, location mentions
7. Add "This Season" widget to Command Center
8. Add "Seasonal Heatmap" toggle to map
9. Add "Where's the Circle?" widget to Social hub
10. Pass seasonal context to gossip and narrative engines
11. Test: fast-forward sim time 12 months, verify friends migrate naturally (most in Monaco May, most in Aspen Feb, most on yachts August)

## The Magic Moment

The goal: after three months of regular play, opening the app in July and:
- Seeing your map dotted with friend markers, almost all in the Mediterranean
- Command Center saying "Peak season: Porto Cervo, Mykonos, Portofino"
- Six DMs waiting, half of them from Italy and France
- Your Aspen property value has dipped slightly (off-season), Porto Cervo has a note "Peak season — consider repositioning your yacht"
- The Ledger's current issue full of references to who's on which Med yacht

Then opening the app in February:
- Your map shifts. Friends are now in Aspen, St. Moritz, St. Barths.
- Command Center: "Peak season: Aspen, St. Barths, St. Moritz"
- DMs: "Dinner at The Little Nell Saturday?"
- Your Aspen property value has ticked up. Your Porto Cervo villa is dormant.
- The Ledger's Monday issue: ski photos, Caribbean dispatches.

**The world has a pulse.**
