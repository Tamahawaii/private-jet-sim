# JETSTREAM — Master Specification

## Vision
JETSTREAM is a single-player billionaire lifestyle simulator. The player owns a private jet fleet, flies to real-world luxury events, stays at real ultra-luxury resorts, and maintains a social circle of 15 AI-powered billionaire friends who live their own lives across the globe in real time.

This is **not** a flight simulator. It is a **fantasy simulator**. Flying is the transition; the destination and the social layer are the game.

## Target Player
Single user (the developer). Designed for personal play, not multiplayer, not public release. Optimize for "feels alive and aspirational" over "balanced" or "monetizable."

## Core Loop
1. **Check the world** — calendar shows upcoming real-world events (Coachella, Monaco GP, Art Basel). Friends DM about plans.
2. **Choose a destination** — pick an event or a resort stay.
3. **Plan the flight** — select aircraft from fleet, file plan, see cost/duration.
4. **Fly** — plane moves across globe in real time. Speed up 1x/10x/30x/60x. Close the app, plane keeps moving (timestamp-based simulation).
5. **Arrive** — check into resort, attend event, get paparazzi photos, friends react in DMs.
6. **Social ripple** — your attendance affects prestige, friendships, rivalries. Other friends now DM you about it.
7. **Repeat** — new events unlock, friends travel, world keeps turning.

## Five Pillars

### 1. THE LIVING WORLD
A rolling calendar of 40+ real billionaire-tier events. Each has date windows, location, prestige tier, dress code, ticket price, and which friends are attending. Miss Coachella weekend and it's gone for a year. Creates urgency and FOMO.

### 2. THE ARRIVAL EXPERIENCE
30+ real ultra-luxury resorts (Aman, Cheval Blanc, The Brando, Singita, Amangiri, Nihi Sumba). Nightly rates, amenities, signature experiences. Landing somewhere = booking somewhere = stakes.

### 3. AI SOCIAL LAYER (KILLER FEATURE)
15 AI billionaire personas with distinct personalities, net worths, fleets, and travel preferences. They:
- Fly independently on their own schedules (visible on your map)
- DM you via Claude API with contextually-aware messages
- Form rivalries, alliances, friend groups
- Attend events together, post photos, extend invites
- React when you attend something prestigious
- Get jealous, competitive, supportive based on personality

### 4. PERSISTENT REAL-TIME SIMULATION
The world runs on wall-clock time. Everything is timestamp-based. Close the app for 8 hours, your plane has moved 8 hours' worth of distance, your friends have traveled, events have happened, DMs have queued up.

### 5. ECONOMY + PROGRESSION
Starting capital: $79.7B (matches current UI). Monthly burn: crew salaries, hangar fees, fuel, resort nights, event tickets, aircraft maintenance. Income: charter out parked jets, investment yield on idle capital, appearance fees once prestige unlocks. Prestige score gates invite-only events (Met Gala, Davos, Sun Valley).

## Storage Philosophy
**Local-first.** All state in IndexedDB (via Dexie.js). No cloud sync in v1. The player is a single user on a single device at a time. This is intentional — it keeps architecture simple.

**Timestamp-based, not tick-based.** We never run a background loop. When the user opens the app, we compute current world state from stored timestamps (`flight.departed_at`, `friend.current_leg_start`, etc.) and current wall-clock time. This means closing the app is free — nothing needs to run.

**Sim speed** only accelerates the *displayed* time relative to real time when the app is open. When closed, time passes at 1x. This matches user expectation (plane is where it would realistically be when you come back).

## Aesthetic Direction
Maintain current dark editorial vibe. Influences: Aman Resorts web design, Tom Ford, private bank dashboards (JP Morgan Reserve), Kinfolk magazine, Apple Invites. Cyan accent (#00E5FF-ish) stays. Serif headlines optional for editorial feel. No gamified UI elements (no XP bars, no loot boxes, no bright primary colors).

## Success Criteria
The build is successful if the developer-player:
1. Opens the app and feels a small thrill seeing where friends are on the map
2. Feels real FOMO when a friend DMs from an event they're missing
3. Wants to check back in hours later to see flight progress
4. Occasionally lingers on a resort booking screen imagining the trip

## Out of Scope (v1)
- Multiplayer / sharing with real humans
- Weather-driven flight routing (just visual flavor)
- Realistic ATC / flight mechanics
- Mobile native app (web-only, mobile-responsive is enough)
- Monetization / payments
- Image generation (paparazzi photos use stock imagery with Claude-generated captions)

## Out of Scope (future consideration)
- Supabase sync (architecture supports swap-in later)
- Yacht + car fleets (same mechanics, different vehicles)
- Real estate portfolio (own homes in cities you frequent)
- Charter business management mini-game
