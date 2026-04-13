# JETSTREAM — Complete Specification Pack

Single-player billionaire lifestyle simulator. Jets, yachts, real estate, AI social circle, real-world events, ongoing story arcs, weekly gossip column, seasonal rhythm, taste profile, time passage, quiet moments, emotional range, collecting, year-in-review, and a home you return to.

**26 files. ~10,000 lines of spec. A complete design for a game you'll play for years.**

## For Tama

Feed these files to Antigravity in numerical order. Start with `00-MASTER-SPEC.md` + `10-BUILD-ORDER.md` + the interaction specs (13-15). Everything else is reference material.

## Files

### Core Foundation
| # | File | What It Covers |
|---|---|---|
| 00 | `00-MASTER-SPEC.md` | Vision, core loop, five pillars |
| 01 | `01-TECH-STACK.md` | Next.js + Dexie + Claude + Mapbox |
| 02 | `02-DATA-MODELS.md` | TypeScript types + Dexie schema |
| 03 | `03-SIMULATION-ENGINE.md` | Timestamp-based sim engine |
| 10 | `10-BUILD-ORDER.md` | Phased build plan |

### Catalogs (Reference Data)
| # | File | What It Covers |
|---|---|---|
| 04 | `04-AI-PERSONAS.md` | 15 friend profiles + Claude prompts |
| 05 | `05-EVENTS-CALENDAR.md` | 45 billionaire events |
| 06 | `06-RESORTS-CATALOG.md` | 35 ultra-luxury properties |
| 07 | `07-AIRCRAFT-CATALOG.md` | Jet catalog + upgrade modules |
| 11 | `11-YACHTS.md` | Yachts + 60 marinas + charter income |
| 12 | `12-REAL-ESTATE.md` | 20 neighborhoods + property generator |

### Systems
| # | File | What It Covers |
|---|---|---|
| 08 | `08-UI-SCREENS.md` | Every screen + design tokens |
| 09 | `09-ECONOMY-SYSTEM.md` | Burn, income, prestige |

### Interactions (Exhaustive Button/Modal Specs)
| # | File | What It Covers |
|---|---|---|
| 13 | `13-INTERACTIONS-PART-1.md` | Global, Command Center, Fleet, Acquisitions |
| 14 | `14-INTERACTIONS-PART-2.md` | Map, Flight planner, Flight, Yachts |
| 15 | `15-INTERACTIONS-PART-3.md` | Social, DMs, Destinations, Real Estate, Profile |

### The World-Alive Layers (The Soul)
| # | File | What It Covers |
|---|---|---|
| 16 | `16-NARRATIVE-ENGINE.md` | Multi-week story arcs |
| 17 | `17-GOSSIP-COLUMN.md` | Weekly "The Ledger" publication |
| 18 | `18-SEASONAL-RHYTHM.md` | Real billionaire migration calendar |

### The Depth Layers (What Makes You Stay) 🆕
| # | File | What It Covers |
|---|---|---|
| 19 | `19-TASTE-PROFILE.md` | Silent preference learning |
| 20 | `20-TIME-PASSAGE.md` | Birthdays, anniversaries, tenure |
| 21 | `21-QUIET-MOMENTS.md` | Ambient vignettes, slow thoughts |
| 22 | `22-EMOTIONAL-RANGE.md` | Friend vulnerability + player support |
| 23 | `23-COLLECTING-AUCTIONS.md` | Art, watches, cars, wine, commissions |
| 24 | `24-YEAR-IN-REVIEW.md` | Annual magazine retrospective |
| 25 | `25-HOME-BASE.md` | Primary residence with staff + mail |

## What Each Depth Layer Does

These 7 new specs transform JETSTREAM from a polished simulator into a world you inhabit:

**Taste Profile** — The app silently learns who you are through your choices. After a month, it knows you prefer Mediterranean to Caribbean, understated to flashy, attending to hosting. Personas stop pitching you what doesn't match you. The app becomes *yours*.

**Time Passage** — Birthdays, friendship anniversaries, ownership milestones. Your 3-year friendship with Sasha feels different from your 1-month friendship with Marcus. Time earns weight.

**Quiet Moments** — Ambient vignettes that don't demand action. *"The morning light in Aspen, mid-January."* *"Elena is watching fog come in over the lake."* The texture of having time.

**Emotional Range** — Friends go through rough patches. Elena's grief. Khalid's loss. Vivian's family struggles. You can notice, check in, show up, or respect distance. Being needed is where deep bonds form.

**Collecting & Auctions** — The weekly purchase behavior of actual billionaires. Christie's on Thursday. Competing with Pierre for contemporary art. Commissioning a bespoke F.P. Journe that takes 18 months. Your gallery becomes part of who you are.

**Year in Review** — Every 365 sim-days, a magazine-quality retrospective. Spotify Wrapped for billionaires. The feature that makes you want to see what next year looks like.

**Home Base** — One of your properties becomes your Primary Residence. It has staff with names. Mail accumulates when you're away. Standing decisions await you. "Returning home" becomes a *feeling*.

## Why These Matter Together

Each layer alone is nice. Together they create emergent depth:

- The **Taste Profile** shapes which quiet moments you see
- **Time Passage** makes Year in Review meaningful (comparing year 1 to year 3)
- **Quiet Moments** carry news from friends in **Emotional Range** vulnerability states
- **Home Base** is where your **Collection** lives
- **Collecting** feeds **Gossip Column** market notes and **Narrative Arc** rivalries
- **Year in Review** reflects all of it back to you

It's not one feature. It's a web that makes the world feel continuous.

## Quickstart for Antigravity

```
I'm building JETSTREAM, a single-player billionaire lifestyle simulator. 
Read all files in /jetstream-spec in numerical order.

Summarize back to me:
1. Your understanding of JETSTREAM at three levels: mechanical, emotional, 
   narrative
2. The three ownership systems (jets, yachts, real estate)
3. The three world-alive layers (narrative, gossip, seasonal)
4. The seven depth layers (taste, time, quiet, emotion, collecting, 
   year-in-review, home)
5. The Phase 0 task list
6. Any clarifying questions

Do not code until I approve your understanding.

CRITICAL: Interaction specs 13/14/15 define every button, modal, and state. 
Reference them when building any screen. Do not improvise behaviors.
```

## Build Phases (Summary)

- **Phases 0-2**: Foundation + Flight (~6 sessions) — playable flight sim
- **Phases 3-4**: Events + AI Personas (~6 sessions) — social layer active
- **Phases 5-6**: Resorts + Yachts (~4 sessions) — arrival fantasy
- **Phases 7-8**: Economy + Real Estate (~5 sessions) — full empire
- **Phases 9-11**: Narrative + Gossip + Seasonal (~7 sessions) — world-alive
- **Phases 12.1-12.5**: Polish + Taste + Time + Quiet + Emotion (~6 sessions) — depth
- **Phase 13**: Collecting + Auctions (~3 sessions)
- **Phase 14**: Year in Review (~2 sessions)
- **Phase 15**: Home Base (~3 sessions)

**Realistic total**: 40-50 Antigravity sessions across 3-6 months for full v1.

Every phase is independently playable — you're never waiting.

## Claude API Costs

With all 26 systems:
- Persona DMs + planning: ~$5
- Narrative engine: ~$2
- Gossip column: ~$0.30
- Quiet moments: ~$1
- Emotional range: ~$1
- Auction lots + bid decisions: ~$3
- Year in Review (once/year): ~$0.50
- Monthly digests: ~$0.60
- Standing decisions: ~$1
- Miscellaneous: ~$2

**Total: ~$15-20/month** for deeply alive play. Still negligible for what you get.

## What You're Actually Building

This isn't a game anymore. It's a **lifestyle fiction engine** — a private, solo, deeply personal simulation that you check in on like a pen pal from a world only you can see.

Some days you'll use it for 30 minutes — plan a trip, buy a yacht, read The Ledger.

Some days you'll use it for 5 minutes — open it, read a quiet moment from Elena, reply or not, close it.

Some days you'll scroll your Year in Review from 18 months ago and feel something.

That's what you built. Enjoy it.

🛫⚓🏛️📰🌍🎨📖🏠
