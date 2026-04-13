# JETSTREAM — Real Estate Empire

Own cities. Properties become your permanent presence on the map. If jets take you there and yachts are where you stay temporarily, **real estate is where you belong**.

## Design Principles

- **Persistent presence.** Owning property in Aspen means you *belong* there — friends notice when you're in town, skip the resort, host your own parties.
- **Zoom-and-buy.** Tap a neighborhood on the world map → zoom to property grid → tap a house → see valuation → purchase.
- **Realistic valuations without Zillow API.** Generate prices from city × neighborhood × sqft × feature tier. Feels real.
- **Adjacency matters.** Friends own properties too. Seeing Sasha's house next to an available one creates a "buy next door" moment.
- **Scale is the point.** Buy one house. Buy a whole row. Buy a whole block. The game doesn't stop you.
- **Properties cost to run.** Monthly upkeep: staff, utilities, taxes, security. Scales with size. Keeps empire-building meaningful.

## The 20 Prestige Neighborhoods

Each neighborhood is a curated geographic zone with a generated grid of properties. Players zoom in on the world map, see the neighborhood highlighted, then see individual properties as tappable pins.

### Tier 5 — The Most Expensive Zip Codes on Earth

**1. Billionaires' Row — Central Park South, NYC**
- Coords center: 40.7654, -73.9799 | Airport: KTEB
- Property types: full-floor condos, penthouses
- Price range: $25M – $250M | Avg $/sqft: $10,500
- Seed: 40 units

**2. Belgravia, London**
- Coords: 51.4985, -0.1527 | Airport: EGLC
- Property types: stucco terraces, garden squares
- Price range: $15M – $180M | Avg $/sqft: £8,500
- Seed: 60 units

**3. Avenue Montaigne / 8e, Paris**
- Coords: 48.8655, 2.3068 | Airport: LFPB
- Property types: Haussmannian floor-throughs, hôtel particuliers
- Price range: $12M – $120M | Avg $/sqft: $7,800
- Seed: 50 units

**4. Cap Ferrat & Cap d'Antibes, French Riviera**
- Coords: 43.6843, 7.3336 (Ferrat) | Airport: LFMN
- Property types: waterfront villas, walled estates
- Price range: $30M – $400M | Avg $/sqft: $6,500
- Seed: 35 units

**5. Monaco — Carré d'Or**
- Coords: 43.7384, 7.4246 | Airport: LFMN
- Property types: ultra-luxe apartments, sea-view penthouses
- Price range: $18M – $300M | Avg $/sqft: $12,000 (world record territory)
- Seed: 40 units

**6. The Peak, Hong Kong**
- Coords: 22.2711, 114.1457 | Airport: VHHH
- Property types: hillside villas with harbor views
- Price range: $30M – $250M | Avg $/sqft: $8,000
- Seed: 30 units

**7. Ginza / Azabu, Tokyo**
- Coords: 35.6581, 139.7414 | Airport: RJTT
- Property types: ultra-modern towers, traditional machiya estates
- Price range: $8M – $90M | Avg $/sqft: $5,500
- Seed: 40 units

**8. Bel Air — Beverly Hills Post Office, LA**
- Coords: 34.0985, -118.4444 | Airport: KVNY
- Property types: mega-mansions, gated estates
- Price range: $15M – $500M | Avg $/sqft: $2,800
- Seed: 50 units

### Tier 4 — Elite Global Hotspots

**9. Aspen Core — Red Mountain + West End**
- Coords: 39.1911, -106.8175 | Airport: KASE
- Property types: historic Victorians, ski-in contemporary estates
- Price range: $12M – $120M | Avg $/sqft: $3,500
- Seed: 45 units

**10. Holland Park, London**
- Coords: 51.5016, -0.2017 | Airport: EGLC
- Property types: stucco villas, mews houses
- Price range: $10M – $80M | Avg $/sqft: £5,800
- Seed: 40 units

**11. Saint-Germain / 7e, Paris**
- Coords: 48.8558, 2.3227 | Airport: LFPB
- Property types: floor-throughs, Left Bank duplexes
- Price range: $6M – $50M | Avg $/sqft: $4,800
- Seed: 45 units

**12. Fisher Island, Miami**
- Coords: 25.7614, -80.1392 | Airport: KOPF
- Property types: private island condos and villas
- Price range: $8M – $75M | Avg $/sqft: $4,500
- Seed: 35 units

**13. Palm Beach Island, FL**
- Coords: 26.7056, -80.0364 | Airport: KPBI
- Property types: oceanfront estates, Mizner classics
- Price range: $10M – $200M | Avg $/sqft: $3,800
- Seed: 40 units

**14. Southampton Estate Section, Hamptons**
- Coords: 40.8845, -72.3919 | Airport: KHTO
- Property types: shingle-style estates, Gin Lane oceanfront
- Price range: $15M – $250M | Avg $/sqft: $3,200
- Seed: 40 units

**15. Indian Creek Village, Miami**
- Coords: 25.8789, -80.1497 | Airport: KOPF
- Property types: waterfront mansions (14 houses total in reality)
- Price range: $40M – $180M | Avg $/sqft: $4,200
- Seed: 18 units (plus some on adjacent waterfront)

### Tier 4 Continued — Mediterranean + Alpine

**16. Portofino & Santa Margherita Ligure**
- Coords: 44.3035, 9.2106 | Airport: LIMJ
- Property types: pastel villas, hillside estates
- Price range: $10M – $80M | Avg $/sqft: $4,200
- Seed: 30 units

**17. Porto Cervo, Sardinia**
- Coords: 41.1333, 9.5333 | Airport: LIEO
- Property types: Costa Smeralda villas
- Price range: $8M – $60M | Avg $/sqft: $3,500
- Seed: 35 units

**18. Ibiza Old Town + Cala Jondal**
- Coords: 38.9067, 1.4206 | Airport: LEIB
- Property types: whitewashed fincas, hilltop moderns
- Price range: $6M – $45M | Avg $/sqft: $2,800
- Seed: 40 units

**19. Gstaad, Switzerland**
- Coords: 46.4719, 7.2855 | Airport: LSZH (connect)
- Property types: protected chalet architecture
- Price range: $15M – $100M | Avg $/sqft: $4,500
- Seed: 30 units

**20. Verbier + Zermatt (combined tier)**
- Coords: 46.0963, 7.2286 (Verbier) | Airport: LSGS
- Property types: ski chalets, altitude estates
- Price range: $8M – $55M | Avg $/sqft: $3,200
- Seed: 35 units

### Bonus Neighborhoods (phase 2 if ambition allows)

**21. Notting Hill / Holland Park, London** (Tier 3)
**22. Tribeca penthouses, NYC** (Tier 4)
**23. Carmel-by-the-Sea, CA** (Tier 3)
**24. Jackson Hole / Teton Village** (Tier 3) — bonus: near JAC, where your N150JS currently sits
**25. Martha's Vineyard Chilmark** (Tier 3)
**26. St Barths — Colombier + Pointe Milou** (Tier 4)
**27. Malibu — Billionaires' Beach Carbon Beach** (Tier 4)
**28. Montecito, Santa Barbara** (Tier 4)

## Property Generation Algorithm

For each neighborhood, we generate a grid of properties at seed time. Each property is deterministic (same seed = same properties) so the world stays consistent.

```typescript
// /lib/seed/generateProperties.ts

type Neighborhood = {
  id: string;
  name: string;
  centerCoords: Coordinates;
  boundingBox: { north: number; south: number; east: number; west: number };
  nearestAirportICAO: string;
  propertyTypes: PropertyType[];
  avgPricePerSqft: number;
  sqftRange: [number, number];
  seedCount: number;
  prestigeTier: 1 | 2 | 3 | 4 | 5;
};

type PropertyType = "penthouse" | "floor_through" | "townhouse" | 
  "villa" | "estate" | "chalet" | "mansion" | "apartment";

export function generateNeighborhoodProperties(n: Neighborhood): Property[] {
  const rng = seedrandom(n.id);                 // deterministic
  const properties: Property[] = [];
  
  for (let i = 0; i < n.seedCount; i++) {
    // Position: randomly placed within bounding box
    const lat = n.boundingBox.south + rng() * (n.boundingBox.north - n.boundingBox.south);
    const lng = n.boundingBox.west + rng() * (n.boundingBox.east - n.boundingBox.west);
    
    // Sqft varies by position (closer to center = larger prestige)
    const sqft = Math.round(
      n.sqftRange[0] + rng() * (n.sqftRange[1] - n.sqftRange[0])
    );
    
    // Feature tier determines price multiplier
    const featureRoll = rng();
    const featureTier = featureRoll > 0.95 ? "trophy" :
                       featureRoll > 0.7 ? "premium" :
                       featureRoll > 0.3 ? "standard" : "entry";
    const featureMultiplier = 
      featureTier === "trophy" ? 1.8 :
      featureTier === "premium" ? 1.3 :
      featureTier === "standard" ? 1.0 : 0.75;
    
    const basePrice = sqft * n.avgPricePerSqft * featureMultiplier;
    const price = Math.round(basePrice / 100_000) * 100_000;  // round to 100k
    
    const features = generateFeatures(n, featureTier, rng);
    const propertyType = pickPropertyType(n.propertyTypes, rng);
    const bedrooms = Math.min(12, Math.max(2, Math.round(sqft / 600)));
    
    properties.push({
      id: `${n.id}-prop-${i}`,
      neighborhoodId: n.id,
      address: generateAddress(n, rng),
      coords: { lat, lng },
      sqft,
      bedrooms,
      bathrooms: Math.round(bedrooms * 1.2),
      propertyType,
      features,
      featureTier,
      askingPriceUSD: price,
      zestimateUSD: price,                     // same number, just "Zillow-like" label
      imageUrl: pickImage(propertyType, featureTier, rng),
      description: generateDescription(n, propertyType, features),
      ownerType: "available",                  // 'available' | 'player' | 'persona'
      ownerId: null,
    });
  }
  
  return properties;
}
```

## Feature Pool (randomized per property)

Each property gets 3-8 features rolled at generation:

**Common** (standard/entry tier properties)
- Gourmet kitchen, wine cellar, formal dining, home theater, gym, sauna, terrace, garden

**Premium**
- Infinity pool, guest house, staff quarters, private elevator, catering kitchen, multiple fireplaces, art gallery wall space, panic room, climate-controlled garage, motor court

**Trophy**
- Helipad, private beach access, dedicated art gallery, indoor pool + outdoor pool, spa wing, private dock, private vineyard, tennis court, bowling alley, private chapel, underground car museum, private ski-in/ski-out access, view easements (legally protected forever)

Example generated feature list for a $120M Bel Air trophy: *"Helipad, infinity pool, 18,000-bottle wine cellar, private spa wing, 24-car motor court, dedicated art gallery, staff quarters (housing for 12), indoor basketball court."*

## Address Generation

Realistic-sounding addresses per neighborhood. Examples:

**Bel Air**: "{number} Bellagio Road", "{number} Bel Air Road", "{number} Nimes Road", "{number} Stradella Road", "{number} Copa de Oro Road"

**Aspen**: "{number} Red Mountain Road", "{number} Willoughby Way", "{number} Hallam Street", "{number} W. Francis Street"

**Belgravia**: "{number} Eaton Square", "{number} Belgrave Square", "{number} Wilton Crescent", "{number} Chester Square"

**Cap Ferrat**: "Villa {name}, Chemin du Roi" — hand-curated names like "Villa Cypris", "Villa Les Pergolas"

Store these per-neighborhood address patterns in `/data/neighborhoods.json`.

## Data Model (extends 02-DATA-MODELS.md)

```typescript
type Property = {
  id: string;                         // PK
  neighborhoodId: string;
  address: string;
  coords: Coordinates;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
  features: string[];
  featureTier: "entry" | "standard" | "premium" | "trophy";
  askingPriceUSD: number;
  zestimateUSD: number;
  imageUrl: string;
  description: string;
  ownerType: "available" | "player" | "persona" | "other";
  ownerId: string | null;             // personaId if owned by a friend
  // Post-purchase fields (null if not owned by player)
  purchasedAt?: ISODateString;
  purchasePriceUSD?: number;
  currentValueUSD?: number;           // appreciates 3-8% annually
  nickname?: string;                  // "The Aspen Place"
  staffCount?: number;
  monthlyUpkeepUSD?: number;
};

type Neighborhood = {
  id: string;
  name: string;
  city: string;
  country: string;
  region: string;                     // "Mediterranean", "US West", etc
  centerCoords: Coordinates;
  boundingBox: { north: number; south: number; east: number; west: number };
  nearestAirportICAO: string;
  prestigeTier: 1 | 2 | 3 | 4 | 5;
  propertyTypes: PropertyType[];
  avgPricePerSqft: number;
  sqftRange: [number, number];
  addressPatterns: string[];          // templates for generation
  description: string;                // editorial prose
  imageUrl: string;                   // neighborhood hero image
};
```

## Dexie Schema Extension

```typescript
// Add to /lib/db.ts
this.version(2).stores({
  // ... existing tables
  neighborhoods: 'id, prestigeTier, region',
  properties: 'id, neighborhoodId, ownerType, ownerId, askingPriceUSD',
});
```

## Purchase Flow UX

```
World Map
    ↓  (tap neighborhood cluster)
Neighborhood Zoomed View — shows all properties as pins
    - Green pins = available
    - Cyan pins = player-owned (with nickname label)
    - Persona-color pins = friend-owned (avatar overlay)
    ↓  (tap a pin)
Property Detail Modal
    - Hero image
    - Address + neighborhood badge
    - Specs: sqft, beds, baths, features list
    - Price (large, mono, magenta)
    - "View on Map" → zooms in further to street-level
    - "Check Owner" → if owned by friend, shows persona
    - IF AVAILABLE: "PURCHASE" button
    ↓  (tap PURCHASE)
Purchase Confirm
    - Review: total price + closing costs (3%) + 12 months upkeep reserve
    - "I understand ongoing costs are {X}/mo" checkbox
    - "CONFIRM PURCHASE" button
    ↓
Celebration moment
    - Property appears in Portfolio
    - Transaction recorded
    - Friend DMs: Claude-generated "Congrats, neighbor" if you bought near one of them
    - Map pin changes color to cyan
```

## Ownership Benefits

Once you own a property, on the map:
- Pin displays with your cyan player color + nickname
- Traveling to that city? → flight planner suggests "Stay at [property name]" instead of booking a resort (**free** vs. resort rates)
- Arriving in the city unlocks "Host a dinner" / "Throw a party" actions
- Hosting events boosts friendship with attending personas
- Hosting during a major local event (GP in Monaco, Art Basel in Miami) boosts prestige significantly

## Friend Property Seeding

Each persona owns 2-4 properties consistent with their lore. Pre-seeded, not randomized:

### Sasha Volkov (3 properties)
- Monaco — Carré d'Or — $85M penthouse on Avenue Princesse Grace
- London — Belgravia — $62M Eaton Square mansion
- Cap Ferrat — $180M "Villa Néréides"

### Naomi Tanaka (3)
- Palo Alto — Atherton estate — $45M
- Tokyo — Azabu modern — $38M
- Aspen — West End contemporary — $28M

### Alessandro Conti (4)
- Milan — Brera loft — $22M
- Portofino — hillside villa "La Magnolia" — $65M
- Tuscany — farmhouse estate (not in our neighborhoods, flavor only)
- Capri — cliffside villa — $42M

### Elena Marchetti (3)
- Geneva — Old Town hôtel particulier — $28M
- Portofino — waterfront villa — $58M
- St. Moritz — chalet (flavor, no neighborhood pin)

### Khalid Al-Rashid (4)
- London — Belgravia — $110M Wilton Crescent home
- Aspen — Red Mountain estate — $58M
- Monaco — Carré d'Or — $95M penthouse
- Paris — Avenue Montaigne — $48M

### Rico Alvarez (3)
- Miami — Indian Creek — $85M waterfront
- Aspen — Red Mountain — $42M
- Monterrey — family estate (flavor, no pin)

### Dmitri Kozlov (3)
- Limassol — flavor only, no neighborhood yet
- Monaco — Carré d'Or penthouse — $55M (mid-tier for the area, he thinks it's the best)
- Dubai — Palm Jumeirah (flavor, no pin)

### Charles Pemberton (4)
- Greenwich, CT — flavor
- Southampton — Gin Lane oceanfront — $78M
- Aspen — $45M
- Palm Beach Island — $55M

### Vivian Hollis (3)
- NYC — Billionaires' Row Central Park South — $58M penthouse
- Southampton — $65M
- Palm Beach Island — $45M

### Amara Okonkwo (2)
- London — Holland Park — $42M
- Palm Beach Island — $28M (inherited, barely uses)

### Marcus Chen (4)
- Palo Alto — flavor
- Sydney — Point Piper (flavor)
- Aspen — $38M
- Tokyo — Azabu penthouse — $52M

### Jules Laurent (2)
- LA — Bel Air estate — $95M
- Paris — Avenue Montaigne — $35M

### Pierre Larousse (3)
- Paris — 8e floor-through — $22M
- Saint-Germain — pied-à-terre — $12M
- Ibiza — Cala Jondal villa — $18M

### Pietro Russo (3)
- Rome — flavor
- Porto Cervo — $45M villa
- Portofino — $38M villa

### Saanvi Mehta (3)
- London — Holland Park — $48M
- Delhi — flavor
- Aspen — $32M

### Naomi Tanaka (already listed above)

This seeding means **neighborhoods feel populated**. Bel Air has Jules Laurent's place. Aspen has 5 friends owning homes. Monaco Carré d'Or has 3. When you buy in these neighborhoods, you're buying into a community.

## Property Economics

### Purchase Cost
`purchase_total = asking_price × 1.03` (closing costs)

### Monthly Upkeep
```
base_upkeep = sqft × $0.85                           // utilities, taxes, basic staff
security_premium = sqft × $0.25                      // 24/7 security
feature_upkeep = features.length × $2500             // pool, gym, etc. each cost
staff_costs = staff_count × $8000                    // average live-in staff
```

Example: A 12,000 sqft Bel Air mansion with 8 features and 10 staff:
- Base: $10,200
- Security: $3,000
- Features: $20,000
- Staff: $80,000
- **Total: $113,200/month** ($1.36M/year)

For scale: if you own 20 properties averaging this, that's $27M/year in upkeep. Still trivial against $79B, but noticeable on top of yacht crew and jet costs. The first "your money actually matters" checkpoint.

### Appreciation
Properties appreciate 3-8%/year randomly. Revalue annually in sim time. Creates small wealth growth you see over time. Selling = 5% transaction cost.

### Renting Out (v2)
Not in v1. You own, you don't rent. Adds income stream for v2 if needed.

## Multi-Purchase UI (Buy Rows / Blocks)

Per your request — the "buy a whole row" feel:

**Multi-select mode on neighborhood view**:
- Toggle "Select Multiple" button
- Tap multiple available properties (pins turn checkmark-cyan)
- Running total in bottom bar: "5 properties selected — $42,500,000"
- "Purchase All" button
- Confirmation modal lists them all, single transaction

**"Buy entire neighborhood" endgame goal**:
Once you own 80% of a neighborhood's available properties, unlock a "Consolidate" action — spend 10% premium to buy remaining units at once. Creates a fun late-game empire badge.

## Map Integration

### Zoom Levels
- **Zoom 0-4 (world)**: neighborhood cluster pins only, color-coded by tier
- **Zoom 5-10 (regional)**: neighborhood labels + rough outlines
- **Zoom 11-14 (city)**: individual property pins appear
- **Zoom 15+ (street)**: property pins with labels, can see adjacency clearly

### Map Layers (toggle in Live Radar panel)
- Your Properties — cyan pins with labels
- Friend Properties — persona-colored pins with portraits
- Available Properties — subtle green pins (only at zoom 11+)
- Active Voyages & Flights — existing layer

## UI Additions

### New: `/real-estate` page
Browse neighborhoods. Grid of neighborhood cards with hero image, city, prestige tier, "X properties, from $Y". Tap → zooms world map to that neighborhood.

### New: `/real-estate/[neighborhoodId]` page
Alternative to map view — list/grid of all properties in that neighborhood with filters:
- Price range
- Min sqft
- Feature filter (must have pool, helipad, etc.)
- Availability (available / owned by me / owned by friends)
- Sort (price asc/desc, sqft)

### New: `/real-estate/property/[propertyId]` page
Full property detail — editorial layout with hero images, spec sheet, features, map, owner info.

### Profile additions
Under Profile, new tab: **Portfolio**
- Properties owned (grid with nicknames)
- Total property value (sum of current values)
- Monthly upkeep total
- Net appreciation this year

## The Hosting Mechanic (extends yacht hosting)

Owning property in a city unlocks:

- **Dinner at home** (3-8 guests) — $45k cost, +3 friendship per attending friend
- **Pool party** (Bel Air, Palm Beach, Ibiza, Portofino properties only) — $125k cost, +4 friendship per attendee, small prestige bump
- **Aspen ski weekend** (if you own in Aspen and it's winter) — $200k cost, 3-day event, +8 friendship per attending friend, significant prestige
- **Art Basel private viewing** (if you own in Miami during Basel week) — $350k cost, curator fee, +15 prestige, +6 friendship per attendee
- **Grand Prix viewing party** (if you own in Monaco during GP weekend) — $500k cost, +25 prestige, +8 friendship, chance of "tabloid" recap

Each hosting action has cooldowns (monthly) and seasonal gates.

## Claude Integration

### New endpoint: `/api/ai/neighbor-reaction`

When you buy a property near a friend (within 500m), fire a persona reaction DM:

```
POST /api/ai/neighbor-reaction
{
  personaId: "sasha-volkov",
  playerProperty: { neighborhoodId, address, type, featureTier },
  friendProperty: { address, type },
  distance: 320  // meters
}
→
"Tama, tell me you saw the Ferrari next door before you closed. We're going to be shouting across the hedge, mate. Dinner on Friday — my place."
```

### New endpoint: `/api/ai/hosting-accept`

When you invite friends to a party at your property, Claude determines each friend's response based on:
- Friendship level
- Their current location & distance
- Their interests (is this their scene?)
- Their calendar (if a prestigious event is happening elsewhere)
- Rivalries (won't come if rival will be there)

## Implementation Order (insert into 10-BUILD-ORDER.md)

Insert as **Phase 7**: Real Estate (3-4 sessions, after Economy Completion, before Polish)

Tasks:
1. Seed `/data/neighborhoods.json` (20 core neighborhoods)
2. Write property generator (`generateProperties.ts`) + run once to seed
3. Extend Dexie schema with `neighborhoods`, `properties`
4. Seed friend property ownership from spec above
5. Build `/real-estate` browse page
6. Build `/real-estate/[neighborhoodId]` detail/list page
7. Build `/real-estate/property/[propertyId]` detail page
8. Extend map: zoom tiers, neighborhood outlines, property pins
9. Implement purchase flow + multi-select
10. Portfolio tab on Profile page
11. Integrate with flight planner: "Stay at your [nickname]" option
12. Implement hosting actions (start with Dinner and Pool Party, add event-specific later)
13. Wire up neighbor-reaction DMs when buying near friends
14. Implement upkeep in monthly burn calculation
15. Implement annual appreciation pass

## Stock Imagery Strategy

Property photos: use Unsplash / Pexels with search terms:
- "luxury mansion bel air"
- "modern villa cap ferrat"
- "aspen ski chalet"
- "belgravia london townhouse"
- "penthouse new york"

Store under `/public/imagery/properties/{type}-{tier}-{n}.jpg` — rotate through a pool of 5-10 images per property type × feature tier combo. Don't need unique image per generated property.

Neighborhood hero images: one per neighborhood, Google Street View screenshots or Unsplash. Store under `/public/imagery/neighborhoods/{id}.jpg`.

## Scale Ambition (for your endgame satisfaction)

By playing long enough, you can:

- **Own 50+ properties globally**
- **Consolidate entire neighborhoods** — own all of Indian Creek, or all of Carré d'Or
- **Buy adjacent to every friend** — position yourself as "everyone's neighbor"
- **Build a "compound"** — own 5 contiguous properties in Aspen, merge them conceptually as your estate
- **Global empire map**: zoom out and see your cyan pins studded across every continent

This is pure fantasy fulfillment. Lean in.
