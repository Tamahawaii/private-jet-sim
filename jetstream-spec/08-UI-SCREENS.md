# JETSTREAM — UI Screens & Design System

## Design Language

Maintain and refine the current aesthetic. Codified below.

### Color Tokens

```css
/* /app/globals.css */
:root {
  --bg-base: #050607;           /* near-black, not pure */
  --bg-elevated: #0d1012;       /* cards */
  --bg-elevated-2: #141719;     /* nested cards */
  --border-subtle: #1f2326;
  --border-emphasis: #2a2f33;
  
  --text-primary: #f2f4f6;
  --text-secondary: #9ba0a5;
  --text-tertiary: #5a5f64;
  
  --accent-cyan: #22d3ee;       /* keep your existing cyan feel */
  --accent-cyan-dim: #0891a6;
  --accent-gold: #d4a45a;       /* for Tier 5 prestige, status */
  --accent-magenta: #e11d48;    /* for cost/warning */
  --accent-mint: #10b981;       /* for positive/income */
  
  --font-display: 'Inter', system-ui;
  --font-serif: 'Fraunces', Georgia, serif;  /* editorial headers */
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Typography System

- **Display (page titles)**: Inter 700, 32-48px, uppercase, tight tracking (-0.02em)
- **Editorial headline (optional)**: Fraunces 500, 28-40px, regular tracking — for destinations pages and resort detail only
- **Eyebrow labels**: Inter 500, 11px, uppercase, tracking +0.12em, --text-tertiary
- **Body**: Inter 400, 14-15px, --text-primary
- **Data (numbers, codes)**: JetBrains Mono 500, 13-14px
- **Small caps labels** on cards: Inter 600, 10-11px, uppercase, tracking +0.1em

### Spacing Scale

Use Tailwind defaults with one addition: `px-edge` = 20px mobile, 32px desktop (page gutter).

### Radii

- Cards: 10px
- Buttons: 8px
- Badges: 6px
- Avatars: full

### Elevation

Don't use shadows. Use layered backgrounds + subtle borders for hierarchy.

---

## Screens

### 1. Command Center (`/cmd-center`)

**Purpose**: Launch pad. Shows what matters right now.

**Layout** (mobile-first stacked, desktop 2-col):
- **Top hero**: Current player status
  - Large: "Welcome back, {displayName}"
  - Current location + time + weather
  - Net worth (large, mono) + monthly burn delta (small, colored)
- **Active Flight card** (if any): live progress bar, origin → dest, ETA
- **Unread DMs** (if any): top 3 most recent, compact cards
- **Today's Event** (if any happening): card with CTA "Fly there"
- **Fleet Snapshot**: 1-line per aircraft (tail, status, location)
- **Upcoming in Next 7 Days**: event + booking reminders

**Components**: `<StatusHero>`, `<ActiveFlightCard>`, `<DMPreviewList>`, `<FleetSnapshotList>`

### 2. Fleet Roster (`/fleet`)

**Purpose**: See all your planes. Dispatch, upgrade, sell.

**Layout**: 2-column grid (1-col mobile) of `<AircraftCard>`s. Keep current design — it's good.

**Card states**:
- **Parked**: faded blueprint image, location code, "DISPATCH AIRCRAFT" button
- **In Transit / Cruise**: animated subtle glow, "VIEW TELEMETRY" button
- **Maintenance**: amber border, "MAINTENANCE IN PROGRESS" label

**Header action**: "ACQUIRE NEW" → routes to `/acquisitions`

**Per-card data** (keep current):
- Tail number (cyan, mono)
- Model name
- Max Speed | Burn Rate | Capacity | Location

**New addition**: small stack of module icons in card footer if any installed.

### 3. Aircraft Detail (`/fleet/[tailNumber]`)

**Purpose**: Deep view of one aircraft. Upgrade, sell, rename, maintenance.

**Layout**:
- Large blueprint image
- Tail + model + current status
- Tabs: **Specs | Modules | Flight Log | Actions**
- **Specs**: full spec sheet (editorial, not gamey)
- **Modules**: installed modules + "Install Module" marketplace
- **Flight Log**: chronological flights, each a row (origin, dest, duration, cost, date)
- **Actions**: Rename | Schedule Maintenance | Sell | Charter Out (income)

### 4. Acquisitions Market (`/acquisitions`)

**Purpose**: Browse and buy aircraft. Keep current design — it's strong.

**Layout**: Vertical scrollable list of `<AircraftListingCard>`s.

**Card content**: blueprint placeholder | model name | specs (KTS, GPH, $/NM, modules) | price | PURCHASE button

**Add**:
- Filter bar: Category (Light / Midsize / Heavy / Airliner) | Price range
- On purchase: modal confirms → tail number assignment (auto-generated N-number) → transaction recorded → aircraft added to fleet

### 5. World View (`/world`)

**Purpose**: The LIVE MAP + event calendar. The most alive screen.

**Layout** (desktop — 2-col, mobile — tabs):
- **Left (2/3)**: full-bleed map
  - Your aircraft in cyan
  - Friends' aircraft in their persona color (15 distinct hues)
  - Event locations as pins (color by prestige tier)
  - Great-circle flight paths rendered as dashed lines
  - Tap pin → side panel
- **Right (1/3)**: Event calendar
  - Horizontal timeline (next 60 days)
  - List view underneath with filter chips (Motorsport | Art | Fashion | Music | Film | Summits)
  - Each event card: date, name, location, prestige tier badge, attending friend avatars

**Map controls** (bottom-right stack):
- Sim speed: 1x / 10x / 30x / 60x
- Map mode: Satellite / Dark / Roads / FlightAware
- Live Radar toggle

**Header**: current sim time display (updates live, mono font)

### 6. Flight Planner (`/flight/new`)

**Purpose**: Plan and launch a flight.

**Layout** (single column, guided):
- **Step 1**: Select aircraft (visual picker of parked aircraft only)
- **Step 2**: Select destination
  - Tab: Events (list of upcoming events you can reach)
  - Tab: Resorts (list filtered by player's preferences)
  - Tab: Airport (ICAO search or map picker)
- **Step 3**: Passengers (optional) — pick friends to invite
- **Step 4**: Review
  - Route preview on mini-map
  - Distance, Duration, Estimated Block Cost (large, magenta)
  - "FILE PLAN & LAUNCH ⚡" button (keep this exact label — it's great)

**On launch**: flight created, aircraft status → in_transit, player redirected to `/flight/[id]` live view.

### 7. Active Flight View (`/flight/[flightId]`)

**Purpose**: Watch the flight. The "cozy" screen you check back on.

**Layout**:
- Large map (full-bleed) with aircraft live position
- Overlay card (bottom, draggable):
  - Route header: origin → destination
  - Progress bar (time-based)
  - Current data: altitude (simulated), speed, heading, miles remaining, ETA
  - Passenger avatars (if any friends on board)
  - Sim speed controls
- On arrival: card transforms into "ARRIVED — View Recap" with Claude-generated arrival recap + prestige gain + photo

### 8. Social Hub (`/social`)

**Purpose**: See friend activity + open DM threads.

**Layout**:
- **Top**: Activity feed
  - Chronological posts: "Sasha just arrived at Monaco", "Alessandro is heading to Portofino Thursday", "Elena attended Art Basel VIP preview"
  - Clickable to open full context
- **Bottom**: DM threads list
  - Each row: persona portrait, name, last message preview, unread indicator, timestamp

### 9. DM Thread (`/social/[personaId]`)

**Purpose**: 1:1 messaging with an AI friend.

**Layout**: iMessage-style bubbles
- Persona messages: left-aligned, --bg-elevated
- Player messages: right-aligned, --accent-cyan-dim bg, --text-primary
- Attachments render inline (event cards, resort cards, location pings)
- Typing indicator when awaiting Claude response
- Input bar: text field + "send location" + "invite to event" quick actions

**Implementation note**: when player sends a message, immediately call `/api/ai/dm` with trigger="player_message" + conversation history. Claude responds as the persona. Thread persists in Dexie.

### 10. Persona Profile (`/social/[personaId]/profile`)

**Purpose**: Lore view for a friend.

**Layout**:
- Portrait, name, archetype, nationality, age
- Bio
- Net worth, home base
- Interests list
- Their fleet (read-only)
- Friendship level indicator (subtle bar or tier label: Acquaintance / Friend / Close / Best)
- Recent activity with them (events attended together, trips taken)
- Current location on mini-map

### 11. Destinations (`/destinations`)

**Purpose**: Browse resorts. Book.

**Layout**: Editorial magazine grid
- Header: serif "Destinations" + subhead
- Filter chips: Region | Prestige Tier | "Near me" | "Near upcoming event"
- Grid of `<ResortCard>`: hero image, name, brand, city, nightly rate from
- Tap → `/destinations/[resortId]`

### 12. Resort Detail (`/destinations/[resortId]`)

**Purpose**: Book a stay. Editorial showcase.

**Layout**:
- Full-bleed hero image
- Serif name, brand, location
- Description (editorial prose, 3-4 sentences)
- Amenities (icon row)
- Suite picker (cards with rate multipliers)
- Date range picker
- Signature experiences (add-on list with prices)
- Total cost calculator (sticky bottom bar): `{nights} × {rate} + experiences = {total}` + "Book Stay" CTA
- Also: "Fly here" quick-action → opens flight planner with destination pre-set

### 13. Profile (`/profile`)

**Purpose**: Player's identity + progression.

**Layout**:
- **Identity card**: displayName, home base, member since, net worth chart over time
- **Prestige**: current score + tier label + what it unlocks
- **Stats**: total flights, miles flown, countries visited, events attended
- **Event history**: timeline of attended events with recaps
- **Travel map**: world map with dots on every airport visited
- **Settings**: display name, home base, sim preferences

---

## Global Navigation

**Desktop**: Top bar, persistent
- Logo (JETSTREAM) left
- Nav center: CMD CENTER | FLEET | WORLD | SOCIAL | DESTINATIONS | ACQUISITIONS
- Right: net worth pill (green, mono) | notifications bell | avatar

**Mobile**: Bottom tab bar
- Home | Map | Social | Fleet | More (→ acquisitions, destinations, profile)

---

## Key Components (build order)

1. `<Button>` (variant: primary/secondary/ghost, size: sm/md/lg)
2. `<Card>` (variant: default/elevated/bordered)
3. `<Badge>` (variant: neutral/cyan/gold/magenta)
4. `<DataRow>` (label + value, for spec sheets)
5. `<Avatar>` (persona portraits with fallback initials)
6. `<MapView>` (wrapper around Mapbox GL)
7. `<AircraftMarker>` / `<FriendMarker>` / `<EventPin>`
8. `<FlightProgressBar>`
9. `<DMBubble>`
10. `<EventCard>` / `<ResortCard>` / `<AircraftCard>`

---

## Motion Principles

- Page transitions: 200ms fade, no slide
- Hover: 150ms ease-out, subtle scale (1.01) or border brighten
- Map pan: native Mapbox easing
- Plane marker on map: smooth lerp between position updates
- DM messages arrive with a 100ms fade-up, no bounce
- Sim speed change: map timescale eases to new rate over 500ms

Keep motion restrained. This is a private bank UI, not a casino.

---

## Screens to Polish First (MVP order)

1. World View (map + events) — the most impressive, gets you excited
2. Flight Planner + Active Flight View — the core verb
3. Social Hub + DM Thread — the killer feature
4. Fleet Roster — already mostly there
5. Destinations — for the arrival fantasy
6. Everything else can be utilitarian for v1
