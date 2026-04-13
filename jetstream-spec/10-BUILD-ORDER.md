# JETSTREAM — Build Order for Antigravity

Orchestrates all spec files into a buildable sequence. Build in **vertical slices** — each phase ships something playable.

## Phase 0: Foundation (1 session)

Scaffold project, design system, primitives, Dexie schema stubs. Deploy to Vercel.

## Phase 1: Fleet & Acquisitions (1-2 sessions)

Seed aircraft catalog, build fleet grid + detail + acquisitions. Purchase flow with tail number generation. Net worth pill wired.

## Phase 2: Flight Planning & Live Map (2-3 sessions)

Mapbox setup, flight planner (multi-step), active flight view, timestamp-based simulation, sim speed controls, arrival resolution.

## Phase 3: Events Calendar + FOMO (1-2 sessions)

Seed 45 events, calendar UI on `/world`, event detail modal, "Fly there" quick action, attendance detection, prestige on attendance.

## Phase 4: AI Personas (3-4 sessions)

Seed 15 personas + initial states, social hub + DM threads + profiles, Claude API route handlers (persona-plan, DM generation), friend markers on map, friendship dynamics, activity feed.

## Phase 5: Resorts & Destinations (1-2 sessions)

Seed 35 resorts, browse/detail pages, booking flow, integration with flight planner ("Fly + Stay"), nearby friend notifications.

## Phase 6: Yachts (2-3 sessions)

Reference: `11-YACHTS.md`

Seed yachts + 60 marinas, extend Dexie, give player starting yacht, fleet tabs, yacht voyage planner, active voyage view, charter income engine, friend yacht ownership seeding, hosting actions when anchored.

## Phase 7: Economy Completion (1 session)

`applyMonthlyBurn()` with yacht costs included, transaction ledger page, charter toggles, net worth chart, appearance fees at high prestige.

## Phase 8: Real Estate Empire (3-4 sessions)

Reference: `12-REAL-ESTATE.md`

Seed 20 neighborhoods, deterministic property generator (run once, persist), seed friend property ownership, browse + list + detail pages, zoom-dependent map pins, single + multi-purchase flows, portfolio tab, hosting actions, neighbor-reaction DMs, upkeep in burn, annual appreciation, "Consolidate neighborhood."

## Phase 9: Narrative Engine (2-3 sessions) 🆕

Reference: `16-NARRATIVE-ENGINE.md`

The story layer. Transforms events from isolated moments into ongoing arcs.

Tasks:
1. Extend Dexie with `narrativeArcs` table
2. Build `/lib/narrative-engine.ts` orchestration functions
3. Build `/api/ai/generate-arc` route handler
4. Build `/api/ai/advance-arc` route handler
5. Seed 3 starter arcs (Basel Feud, Naomi's Obsession, Khalid's Stallion)
6. Wire `advanceNarratives()` into `getWorldState()`
7. Add arc tagging to DMs, activity posts, event recaps
8. Build `/arcs` page with active arcs list
9. Build arc detail page with timeline of beats
10. Add arc indicator tags in DM threads and activity feed
11. Test: fast-forward sim 8 weeks, verify arcs advance and resolve with sensible pacing

**Exit criteria**: After a week of sim time, 3-7 arcs are active. You're getting DMs that reference ongoing storylines. An arc resolves and you see the payoff.

## Phase 10: Gossip Column ("The Ledger") (2 sessions) 🆕

Reference: `17-GOSSIP-COLUMN.md`

The outside-observer layer. Weekly publication that watches your world.

Tasks:
1. Extend Dexie with `gossipIssues` table
2. Curate 30-50 stock images under `/public/imagery/ledger/` with mood/scene tags
3. Build `/lib/gossip-engine.ts` with weekly generation logic
4. Build `/api/ai/gossip-weekly` route handler with system prompt calibrated to voice
5. Implement `gatherWeekMaterial()` aggregating player/persona activity, arc beats, transactions
6. Build `/ledger` archive page
7. Build `/ledger/[issueId]` reader with full editorial styling (serif body, pull quotes, etc.)
8. Wire Command Center preview card on new issues
9. Notification on publication
10. Prestige effects for Watch List appearances
11. Make name mentions tappable (to profiles, events, locations)
12. Settings toggle for publication
13. Test: advance 4 weeks, verify 4 distinct issues with continuity and accurate references

**Exit criteria**: Monday morning (sim time), a new Ledger drops. You read it, find yourself mentioned in the Watch List, tap Sasha's name and open his profile. The voice feels right.

## Phase 11: Seasonal Rhythm (1-2 sessions) 🆕

Reference: `18-SEASONAL-RHYTHM.md`

The world-pulse layer. Makes months feel different.

Tasks:
1. Define `SEASON_PROFILES` constant in `/data/seasons.ts` (~35-40 profiles)
2. Build `/lib/seasonal-engine.ts` with lookup helpers
3. Integrate seasonal context into persona-plan Claude prompts
4. Apply seasonal prestige multipliers
5. Apply seasonal hosting bonuses
6. Add seasonal badges to resort cards, event cards, property pages
7. Add "This Season" widget to Command Center
8. Add "Seasonal Heatmap" toggle to map
9. Add "Where's the Circle?" widget to Social hub
10. Pass seasonal context to gossip + narrative engines
11. Test: fast-forward 12 months, verify friends migrate naturally (Med in August, Aspen in February)

**Exit criteria**: Opening the app in July shows friends concentrated in the Mediterranean. Opening in February shows them in Aspen and St. Barths. The world pulses.

## Phase 12: Polish & Persona Depth (ongoing)

Paparazzi photo cards, notification bell polish, first-run onboarding, rivalry drama moments, group chats, module marketplaces, property renovations, settings polish, compound-building UX. Keep going as long as it's fun.

## Prompts for Antigravity

**Opening each phase:**

> Phase {N}: {name}. Read the relevant spec file plus interaction specs 13/14/15.
> 
> Before coding: outline your plan, call out any ambiguities, ask clarifying questions.
> 
> While building: every button, modal, and state must match the interaction spec exactly. Don't improvise.
> 
> Match the aesthetic: dark, editorial, restrained. No gamified UI.

**For narrative engine (Phase 9):**
> Read `16-NARRATIVE-ENGINE.md` in full. The key insight: arcs are lazy-evaluated on app open, never in a background loop. Beats advance based on `nextBeatExpectedAt` timestamps. Start with Dexie schema + orchestration logic, then route handlers, then UI.

**For gossip column (Phase 10):**
> Read `17-GOSSIP-COLUMN.md` in full. Voice is critical — read the sample issue. Calibrate the system prompt carefully. Generate weekly on app open, never on a timer. Stock imagery goes in `/public/imagery/ledger/`.

**For seasonal rhythm (Phase 11):**
> Read `18-SEASONAL-RHYTHM.md` in full. Seasons are *soft* rules — they weight Claude's persona-plan decisions and apply modest prestige multipliers. Friends should naturally migrate; don't force it with hard locks.

## Anti-Patterns to Avoid

- Tick loops running every second (use timestamps)
- localStorage instead of IndexedDB
- Client-side Claude API calls (always server proxy)
- Regenerating properties on every load (run once, persist)
- Running narrative engine or gossip generation in background timers
- Hard seasonal blocks ("can't fly to Aspen in July") — keep them soft
- Components coupled to Dexie (use repositories)
- Bright confetti / casino UI

## Build Time Estimates (Realistic)

- **Phases 0-2**: ~6 sessions → working flight simulator
- **Phases 3-4**: ~6 sessions → social layer active
- **Phases 5-6**: ~4 sessions → arrival fantasy + yachts
- **Phases 7-8**: ~5 sessions → full empire mechanics
- **Phases 9-10**: ~5 sessions → story + gossip layers (the soul)
- **Phase 11**: ~2 sessions → seasonal pulse
- **Phase 12**: ongoing polish

**Total to full v1**: 28-35 Antigravity sessions across 2-4 months of part-time work. Every phase standalone-playable — you're never waiting for "the whole thing."

## Your Setup (Tama)

Personal use, no users, no monetization. Skip auth. Hardcode preferences. Don't build empty states you won't hit. Pick the aesthetic YOU like.

You're the richest person in this world. Systems tuned for abundance. Lean in. 🛫⚓🏛️📰
