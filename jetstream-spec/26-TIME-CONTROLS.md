# JETSTREAM — Time Controls

Two distinct time-manipulation systems. Both exist because they serve genuinely different player needs. This file clarifies the mechanics, UX, and implementation for each, and corrects/extends what earlier specs said about sim speed.

## The Two Systems

### 1. SIM SPEED (transit acceleration)
**Use case**: "My plane is flying HNL → NRT and it's 9 hours. I want to watch but faster."

**Behavior**: Time passes faster *while you're watching*. The plane moves faster across the map. When you close the app, time passes at normal real-world pace.

**Speeds**: 1x, 10x, 30x, 60x, 100x (adding 100x based on your request)

**Scope**: Affects displayed time when app is open. Does not retroactively advance the world.

### 2. TIME SKIP (calendar jump)
**Use case**: "I want to jump ahead 3 months to Monaco GP weekend and see what happened in my world during that time."

**Behavior**: The sim clock *leaps forward* by a chosen duration. The world runs all interim logic (persona movement, arc advancement, gossip generation, flight arrivals, monthly burns, etc.) as if that time had actually passed.

**Durations**: 1 day / 1 week / 1 month / 3 months / 1 year / Custom

**Scope**: Permanent. Changes the sim clock persistently. Unlike sim speed, this actually moves time.

## Why Both

- **Sim Speed** is for *presence* — you want to watch the journey, just faster
- **Time Skip** is for *progression* — you don't care about the journey, you want to be in the future

Real billionaires don't watch planes fly. Sometimes neither do you. But sometimes you do. Support both.

---

## SIM SPEED — Full Spec

### Speeds Available

| Speed | Use Case |
|---|---|
| **1x** | Real time (default) |
| **10x** | Light acceleration — a 7-hour flight becomes 42 minutes |
| **30x** | Moderate — 7-hour flight becomes 14 minutes |
| **60x** | Fast — 7-hour flight becomes 7 minutes |
| **100x** | Very fast — 7-hour flight becomes 4.2 minutes |

### How It Works (Technical)

Per `03-SIMULATION-ENGINE.md`, sim speed uses a baseline-offset pattern:

```typescript
// /lib/stores/simClock.ts
export const useSimClock = create<SimClockState>((set, get) => ({
  simSpeed: 1,
  baselineRealTime: Date.now(),
  baselineSimTime: Date.now(),
  
  getNow(): Date {
    const { simSpeed, baselineRealTime, baselineSimTime } = get();
    const elapsedReal = Date.now() - baselineRealTime;
    const elapsedSim = elapsedReal * simSpeed;
    return new Date(baselineSimTime + elapsedSim);
  },
  
  setSpeed(speed: 1 | 10 | 30 | 60 | 100) {
    const currentSimNow = get().getNow();
    set({
      simSpeed: speed,
      baselineRealTime: Date.now(),
      baselineSimTime: currentSimNow.getTime(),
    });
  },
}));
```

### What Sim Speed Affects

**While app is open**:
- Aircraft/yacht marker movement on map (interpolated faster)
- Sim clock display (ticks forward faster)
- Active flight/voyage progress bars (fill faster)
- ETA countdowns

**What it does NOT affect**:
- Persona plan advancement (those fire on specific sim timestamps)
- Narrative arc beats
- Gossip generation
- Monthly burn cycles

All of those use wall-clock-equivalent timestamps. They don't run at 60x — they run at 1x, but the sim clock advances faster at 60x, so *more sim-time passes per minute of real-time*, which means those events resolve faster in practice.

### Critical Nuance — App Closed Behavior

**When you close the app at 60x sim speed and reopen 2 hours later (real time)**:
- Sim clock picks up from where you left it
- Real-world 2 hours = 2 hours of sim time (NOT 2 hours × 60 = 120 hours)
- Sim speed resets to 1x on close (or last chosen speed, player preference)
- This matches user expectation — they don't expect sped-up time to keep rocketing forward when they're not watching

**Implementation**: On app close, persist `baselineSimTime` as current sim clock. On app open, reset `baselineRealTime = Date.now()` so the clock starts fresh from that sim time.

### UX Surfaces

Sim speed is accessible from:

#### Active Flight/Voyage Screens
Floating control in top-right: pill showing current speed. Tap to cycle or open picker.

[MODAL] Speed Picker:
- 5 buttons in a row: **1x** | **10x** | **30x** | **60x** | **100x**
- Current speed is filled cyan
- Tap a speed → applies immediately, modal dismisses after 200ms
- [TOAST] "Sim speed: 100x"

#### World Map
Same pill control, bottom-right stack with other map controls.

#### Avatar Menu (desktop nav)
Sim Speed sub-menu with 5 options, checkmark on current.

#### Mobile Gesture
On active flight screen: two-finger tap cycles up (1x → 10x → 30x → 60x → 100x → 1x). Subtle, only if player discovers.

### Visual Feedback at High Speeds

- 1x: normal
- 10x-30x: subtle "FAST FORWARD" label on map corner
- 60x-100x: more prominent chevron accents; aircraft leaves slight motion trail; map tilesets use lower detail level for perf

### Performance Guardrails

At 100x, aircraft position ticks happen at 2Hz (same as always) but each tick represents ~20-30 seconds of sim time. Don't over-sample — the user only needs smooth-ish visual motion.

If multiple planes and yachts are all in transit at 100x, batch their position updates into a single animation frame to prevent stutter.

---

## TIME SKIP — Full Spec

### The Mechanic

Player chooses a duration to skip. App:
1. Confirms the skip
2. Advances sim clock by that duration (persisted)
3. Runs all deferred world logic for the skipped period
4. Shows a summary of what happened during the skip
5. Player lands in the new sim-time, world updated

### Skip Durations

| Duration | Use Case |
|---|---|
| **1 day** | Skip to tomorrow — useful for waiting on specific events |
| **1 week** | Skip to next week — good for calendar navigation |
| **1 month** | Skip through a month — season progression |
| **3 months** | Skip a quarter — major seasonal shift |
| **1 year** | Full year skip — rapid aging |
| **Custom** | Pick a specific date |

### Guardrails

**Cannot skip past active flights/voyages mid-transit without confirmation**:
- If a flight is in progress, skipping will resolve its arrival
- Modal warns: *"Your flight to Monaco will land during this skip. You'll arrive before any events there."*
- Player can proceed or cancel

**Cannot skip past active commissions without warning**:
- Yacht refit completing in 30 sim-days + skip of 3 months → commission delivers during skip
- Note in summary: *"Your F.P. Journe commission delivered 6 weeks ago while you were away."*

**Cannot skip past major milestones silently**:
- Year anniversary within skip window → Year in Review generates *during* the skip, available after
- Friend birthdays within skip → surfaced in summary ("You missed Sasha's birthday 3 weeks ago.")

### The Skip Flow (UX)

#### [BTN] "Skip Time" — Access Points

- Command Center: small icon top-right next to sim clock display
- World map bottom controls: new "Skip" button
- Profile settings → Time controls

#### Step 1: Choose Duration

[MODAL] Skip Time:
- 6 options: 1 day | 1 week | 1 month | 3 months | 1 year | Custom
- [BTN] Custom opens date picker (max 5 years forward in a single skip)

#### Step 2: Preview What Will Happen

Before executing, show a **preview screen**:

> *"Skip to {target date} — 3 months from now?"*
>
> During this time:
> - 2 flights will complete (to and from Monaco, already scheduled)
> - Your F.P. Journe commission will deliver (weeks 4 of skip)
> - 3 friend birthdays will pass (Elena, Alessandro, Marcus)
> - 12 weekly Ledger issues will publish
> - 1 Year Anniversary will trigger your Year in Review
> - Monaco GP, Cannes Film Festival, Royal Ascot all happen in this window
> - Estimated ~18 persona trips will occur
> - Monthly burn will apply 3 times
> - Investment yield will credit 3 times
>
> [BTN] "Skip time" (primary) | [BTN] "Cancel"

This preview is important — it sets expectations and gives the player one last chance to engage with upcoming events instead of skipping past them.

#### Step 3: Execute the Skip

Loading state (10-30 seconds expected depending on skip length):

> *"Advancing time...{date}..."*

Behind the scenes:
1. Compute target sim time
2. Resolve all flight/voyage arrivals in the window (iterate through them chronologically)
3. Advance personas: for each sim-week in the skip, run `advancePersonas()` to fire movements, DMs, arc beats
4. Apply monthly burn × N months
5. Apply investment yield × N months
6. Advance narrative arcs (fire all beats whose `nextBeatExpectedAt` falls in the window)
7. Generate gossip issues (one per week in window)
8. Fire birthday events
9. Advance commissions
10. Advance property appreciation (if 1yr+ skipped)
11. Generate Year in Review if anniversary crossed
12. Apply sim clock to target
13. Build "Skip Summary" for display

#### Step 4: Skip Summary

After execution, player sees a **"While You Were Away"** screen — similar to Year in Review but more compact:

- Target date reached
- **Top 5 things that happened**:
  - "Sasha won the Monaco GP paddock weekend scene"
  - "Elena's grief arc resolved quietly"
  - "The Pemberton-Okonkwo feud escalated"
  - "Your commission delivered"
  - "3 friends visited your Monaco place while you weren't there"
- **Unread DMs**: 14 messages awaiting
- **Unread Ledger issues**: 12 (with "Read latest" CTA)
- **Net worth**: $X → $Y
- [BTN] "Continue" → closes, drops into Command Center

### Speed Considerations for Time Skip

Running a year's worth of Claude API calls synchronously during a skip is *expensive and slow*. Three strategies:

**Strategy A — Skip-mode approximation** (default):
During a skip, Claude calls use Haiku instead of Sonnet for most things (persona DMs, gossip). Arc generation and major beats still use Sonnet. Roughly 70% cost reduction during skips.

**Strategy B — Batched generation**:
Instead of generating 12 weekly gossip issues one-at-a-time, prompt Claude once for a "compressed summary" of all 12 weeks, then generate richly only the final issue (the one the player will read). Earlier issues show as "generated but brief" in archive.

**Strategy C — Deferred generation** (recommended):
During skip, only update state (movements, friendships, transactions, arc stages). Defer actual narrative generation. When player opens the Ledger archive, issues generate just-in-time if they haven't been yet. This spreads cost over actual usage.

Pick Strategy C as default. It's cleanest and player-driven.

### Cost Estimate for Time Skip

Best case (1-day skip): ~$0.02
Typical (1-month skip): ~$0.30
Large (1-year skip with Year in Review + 52 Ledger issues deferred): ~$1-2 initially + whatever is consumed when player browses archive later

Still trivial.

### Time Skip + Active Flights Interaction

If you skip with an active flight in-progress:

**Scenario A**: Skip > flight duration
→ Flight resolves mid-skip. On arrival in summary: "Your flight to Monaco arrived on [date] during the skip. You were checked into [nearest property or marked as 'present at destination']."

**Scenario B**: Skip < flight duration
→ Flight still in progress at end of skip. Show in summary: "Your flight to Monaco is still en route. ETA: [date]."

### Time Skip + Active Voyages
Same pattern as flights. Voyages are slow, so a 1-day skip often completes nothing; a 1-week skip might complete a transatlantic crossing.

### Rapid-Fire Skip (Power User)

For players who want to "chain skip" (skip, read summary, skip again without going to Command Center), add on the Summary screen:

- [BTN] "Skip Again" (small, bottom right) → returns to duration picker with same settings

Useful for blitzing through years to see a distant future state.

---

## When to Use Which

**Use SIM SPEED when**:
- You want to watch a flight or voyage unfold, just faster
- You want to feel present with the journey
- You're monitoring an arrival
- 10-30 minutes of real-time engagement

**Use TIME SKIP when**:
- You don't care about the journey
- You want to get to a specific date
- You want to accumulate weeks/months of world changes quickly
- 30-60 seconds of real-time (mostly the summary review)

**Use BOTH when**:
- You set up several scheduled flights + bookings for a future week
- Time Skip to that week
- Then Sim Speed through the flight days so you can watch what you planned

This is the "build your own season" loop.

---

## UI — Unified Time Controls Panel

Add a single access point: [BTN] "Time" in the top nav (desktop) or under More (mobile).

Opens [MODAL] Time Controls:

**Current Sim Time**: large display, updating live
**Sim Speed**: 5 buttons (1x/10x/30x/60x/100x) — affects active flights/voyages
**Skip Forward**: 6 duration options (1d/1w/1mo/3mo/1y/Custom)

This gives both systems a shared home and teaches players they're different things.

---

## Settings

Profile → Settings → Time

- **Default sim speed on app open**: 1x / last used / specific (dropdown)
- **Time skip — show preview before executing**: ON / OFF (default ON, recommended)
- **Time skip — show summary after**: ON / OFF (default ON)
- **"Rapid Skip" button visibility**: show on summary screen ON / OFF

---

## Build Order

Insert as **Phase 12.6: Time Controls Enhancement** (small but critical phase).

Tasks:
1. Extend simClock store with 100x option
2. Add Time Skip logic to `/lib/time-controls.ts`
3. Build skip preview computation (scans upcoming events/flights in window)
4. Build skip execution: iterate through sim-time in batches (weekly chunks recommended)
5. Implement Strategy C (deferred generation) for gossip + narrative
6. Build [MODAL] Time Controls unified panel
7. Build Skip Time preview screen
8. Build "While You Were Away" summary screen
9. Wire guardrails: active flight warnings, commission alerts, Year anniversary triggers
10. Add Rapid Skip chaining on summary screen
11. Test: skip 1 year forward, verify all subsystems advance correctly, no stale state, Year in Review generates, friendships decay/grow appropriately

---

## Why This Matters

Without robust time controls, the game forces real-time engagement. With them:

- **10-minute session**: open app, read Ledger, reply to a few DMs, sim-speed through a flight arrival
- **30-minute session**: plan a trip, book hotel, watch flight at 30x, arrive, host dinner
- **5-minute session**: open, time-skip to next Monday (new Ledger drops), read it, close
- **1-hour "season" session**: time-skip 3 months, review summary, respond to pent-up events, catch up on arcs

Different sessions for different moods. That's what makes a simulator into something you actually *live with* across years.

The time controls are invisible when you don't think about them. But they're what let JETSTREAM be a game you play for 5 minutes on a Tuesday and 2 hours on a Sunday — without feeling locked to either.
