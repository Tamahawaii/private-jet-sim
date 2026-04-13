# PHASE 9 MASTER SPEC

The biggest phase. Brings JETSTREAM to life: autonomous personas, intimacy, drama, marriages, reputation, gossip. Soap opera at billionaire scale.

---

## DESIGN PILLARS (locked from session)

| Pillar | Choice |
|---|---|
| Intimacy explicitness | Emojis + atmospheric paragraph (sensual, not graphic) |
| Drama frequency | Constant — always something brewing |
| Player agency | Autonomous — personas act, you deal with consequences |
| Behavioral cadence | Background tick (cron) + on-app-open burst |
| Cost strategy | Mixed — Sonnet for big decisions, Haiku for small |
| Gossip format | Both public column + anonymous blind items |
| Gossip accuracy | Sometimes wrong — juicy false rumors mixed in |
| Life events | In scope — marriages, divorces, births, breakups |
| Reputation | Multi-axis: discretion, fidelity, generosity, dramaProne |
| Player relationship limits | Open style declaration system; personas calibrate |
| Romantic availability | Realistic + Marcus closeted reveal special case |

---

## ARCHITECTURE OVERVIEW

```
                  ┌──────────────────────────────┐
                  │   BEHAVIORAL ENGINE (cron)   │
                  │  runs every ~8h real-time    │
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────▼───────────────┐
                  │  ACTION SELECTOR (Haiku)     │
                  │  - per persona, evaluates    │
                  │  - returns: action + params  │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
        ┌────────────────────────────────────────────┐
        │             ACTION EXECUTORS               │
        │ ┌────────┐ ┌──────┐ ┌──────┐ ┌─────────┐  │
        │ │send-dm │ │gift  │ │drama │ │intimacy │  │
        │ │(Haiku) │ │(none)│ │(Sonn)│ │(Sonnet) │  │
        │ └────────┘ └──────┘ └──────┘ └─────────┘  │
        └────────────────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────┐
              │  RELATIONSHIPS / METRICS UPDATE  │
              └──────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────┐
              │   GOSSIP COLUMN GENERATOR        │
              │   (Haiku, looks at recent events)│
              └──────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────┐
              │   REPUTATION RECALCULATOR        │
              │   (pure functions, no LLM)       │
              └──────────────────────────────────┘
```

---

## KEY UI ADDITIONS

### 1. Player relationship style declaration

`/settings/profile` gets a section:

```
RELATIONSHIP STYLE
○ Monogamous — one at a time
● Open — multiple, all aware
○ Polyamorous — multiple committed
○ Casual — no commitments
○ Don't say (default)

[ ] Make this publicly known
```

When publicly known, personas calibrate their reactions accordingly.
Note: personas' OWN relationship styles also matter — a strict-monogamy persona may not engage if you're declared open.

### 2. Drama event response interface

When a drama event is triggered with `playerResponseRequired: true`, surface it prominently:

```
┌───────────────────────────────────────────┐
│  ⚡ THEO IS UPSET                          │
│  ─────────────────────────────────         │
│  Theo Beaumont confronts you about Rio    │
│                                            │
│  "I saw the photos. The yacht. Last week."│
│  His message ends there.                   │
│                                            │
│  How do you respond?                       │
│                                            │
│  [ Apologize sincerely ]                   │
│  [ Explain calmly ]                        │
│  [ Deny everything ]                       │
│  [ Make THEM apologize ]                   │
│                                            │
│  [Tap option for consequence preview]      │
└───────────────────────────────────────────┘
```

Each option shows brief consequence preview on tap-and-hold or hover.
Required to resolve before proceeding (or "Address later" defers but doesn't dismiss).

### 3. Intimate encounter player surface

When player triggers (or accepts) an intimate encounter:

```
┌─────────────────────────────────────────┐
│                                          │
│  [Buildup paragraph rendered as text]   │
│  "The look across the suite was         │
│  decision enough. You closed the door." │
│                                          │
└─────────────────────────────────────────┘

       [BLACK SCREEN, BOUNCING EMOJIS]
              🌙  🍷  🔥  💋  🌃

┌─────────────────────────────────────────┐
│                                          │
│  [Fade-text paragraph rendered as text] │
│  "The candle burned down to nothing.    │
│  Outside, the canal kept its low murmur.│
│  Time bent in the way it bends in       │
│  rooms like that. The night belonged to │
│  you both."                              │
│                                          │
└─────────────────────────────────────────┘

  (optionally, on next sim-tick)
  [Morning-after paragraph if generated]
```

Implementation:
- 3-stage reveal animation
- Buildup fades in (1.5s)
- Black screen with bouncing emojis (4-6s, randomized motion paths)
- Fade text fades in (1.5s)
- "Continue" button at end

### 4. Gossip column page

New route `/gossip` (or `/society`):

```
THE COLUMN                          [public • blind • all]

▾ TODAY
  HEADLINE: Tama Spotted at Aman Venice with Brazilian Hotelier
  Page Six • The Honolulu founder was seen entering...
  [12 reactions • 3 personas commented]
  
▾ YESTERDAY  
  BLIND ITEM: Which French fashion designer is...
  Whisper • Word is the recent breakup wasn't as mutual...
  [reveal: Theo Beaumont] [issue correction]
  
[Filter: All / About me / About my circle]
[Sort: Newest / Most-reacted]
```

Each item:
- Read indicator
- "Issue correction" button if false (player can call out the rumor publicly — costs reputation move)
- "Reveal blind subjects" if blind item (always available, sometimes paid)

### 5. Persona detail page additions

On persona detail (already has identity + radar from Phase 6/8):

Add new sections:
- **DRAMA** — list of unresolved drama events involving this persona
- **GIFTS RECEIVED** (from this persona to player)
- **GOSSIP** — recent items mentioning this persona
- **LIFE EVENTS** — engagement, marriage, etc. (their timeline)

### 6. Reputation display

Player dashboard or profile shows:

```
REPUTATION

Discretion   ████████░░  78  "discreet"
Fidelity     ████████░░  82  "true to your word"  
Generosity   ██████████  95  "legendary host"
Drama-prone  ███░░░░░░░  32  "quietly powerful"

Public labels: discreet, legendary host
```

Hover/tap each axis to see what's driving the score (recent events).

### 7. Inbox notification badge upgrades

Phase 5 had basic inbox badge. Now:
- Separate counts for: DMs, drama (urgent), gossip (new items)
- Drama events with `playerResponseRequired` show urgent indicator (red)
- Tapping bell opens unified notification list

---

## BEHAVIORAL ENGINE TUNING

These constants are in `/lib/behavioral/engine.ts`:

| Constant | Value | Notes |
|---|---|---|
| TICK_PROBABILITY_PER_PERSONA | 0.35 | 35% of personas evaluate per tick |
| MAX_ACTIONS_PER_BURST | 8 | Cost cap |
| Cron frequency | every 8 hours real | ~3 sim days per tick |
| Burst intensity (on-open) | 0.5x to 3x | scales with absence |
| FALSE_RUMOR_PROBABILITY | 0.15 | 15% of gossip is wrong |
| GOSSIP_GENERATION_PROBABILITY | 0.55 | 55% of eligible events get gossip |

**To tune drama frequency** (your "constant" choice):
- TICK_PROBABILITY_PER_PERSONA could go to 0.5 if you want more
- Add a multiplier in action selector that biases toward `initiate-drama` action choice
- Currently selector chooses naturally; we can prompt-engineer for more drama

---

## COST PROJECTIONS

Per background tick (~8 hours):
- 19 personas × 0.35 eval rate = ~7 selections (Haiku) = ~$0.005
- ~5 actions executed avg, mix of DM/gift/drama:
  - DMs (Haiku): 3-4 × $0.001 = $0.004
  - Drama (Sonnet for major): 0-2 × $0.05 = $0-0.10
  - Intimate encounters (Sonnet): 0-1 × $0.05 = $0-0.05
- Gossip generation: 1-3 items (Haiku) = $0.003-0.009
- **Tick cost: $0.02-0.20 typical**

Per day (3 ticks): **$0.05-0.60**
Per month: **$1.50-18**

On-open burst can be 1-3x heavier if user away for days.

If costs run hot, raise FALSE_RUMOR_PROBABILITY to inflate gossip without LLM (template-based blind items), or drop TICK_PROBABILITY_PER_PERSONA.

---

## INTIMACY TRIGGERS (when do encounters happen?)

Encounters are NOT routinely auto-triggered (too high stakes). Triggers:

1. **Player explicitly initiates** via persona detail page → "Make a move" button
   - Only available if relationship status >= 'flirting' AND romanticTension >= 50
   - Roll persona acceptance based on metrics, drama state, declared style alignment
2. **Persona initiates via behavioral engine** — `progress-life-event` or `initiate-drama` actions
   - Specifically when persona's romanticTension >= 70 and they're at same location as player
   - Spec'd as a possible action in selector; LLM picks based on context
3. **Reunion encounters** — auto-suggested when player and existing partner meet after long absence

Each encounter creation runs through `/lib/intimacy/encounter.ts` which:
- Generates buildup + fade text (Sonnet)
- Picks emojis (deterministic)
- Applies metrics
- Triggers jealousy detection → may spawn drama events
- Triggers gossip detection → may spawn gossip items

---

## MARCUS CLOSETED REVEAL MECHANIC

Marcus has `publicOrientation: 'straight'` and `privateOrientation: 'bi-curious / questioning'`.

Standard pursuit logic checks `publicOrientation` and would block romance.
**Override**: at relationship depth >= 60 with Marcus, surface a special prompt:

```
You've gotten close to Marcus. Closer than friends usually do.
He's been texting you late at night, drunk, then deleting it.
Do you push?

[ Push for clarity ]
[ Stay friends ]
[ Pull back yourself ]
```

If "Push for clarity": triggers `betrayal-reveal` drama event (catastrophic-tier potential), 
Marcus's `publicOrientation` may eventually update via `coming-out` life event,
massive metrics shifts, Sarah Chen marriage may fracture, cascading drama.

Spec the trigger as a special action available only on Marcus persona detail page when conditions met.

---

## OPEN QUESTIONS DEFERRED

These don't need to be solved in Phase 9 itself but should be tracked:

1. **Custom NPCs from Phase 7** also need to participate in drama/intimacy. They use same schemas.
2. **Pet involvement in drama** — could pets cause drama? (pet jealousy, lost pet, etc.) Defer.
3. **Player-initiated marriage proposal** — UI flow exists but limited to declared partners. Defer ceremony.
4. **Death of personas** — `death-in-family` exists but personas themselves don't die (yet). Defer or never.

---

## NEW DEXIE TABLES

```typescript
db.version(N).stores({
  ...existing,
  intimateEncounters: 'id, occurredAt, *participantIds',
  dramaEvents: 'id, type, severity, triggeredAt, initiatorId, *targetIds',
  lifeEvents: 'id, type, primaryPersonaId, occurredAt',
  playerReputation: 'id',  // single record, id = 'player-reputation'
  personaActionDecisions: 'id, personaId, decisionAt, chosenAction',
  behavioralTickLogs: 'id, tickAt, trigger',
  gossipItems: 'id, publishedAt, format, isAccurate',
});
```

Plus update player record to include `relationshipPreferences` field (PlayerRelationshipPreferences).
Plus update personaStates to include `ghostUntil?: ISODateString`.
