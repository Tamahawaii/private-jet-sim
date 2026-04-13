# JETSTREAM — Emotional Range

Right now everyone in your circle is perpetually happy-successful. No one struggles. No one needs you. That's not friendship — that's LinkedIn. This system gives the personas emotional range: rough patches, vulnerabilities, quiet moments of needing a friend. And it gives you chances to *be* a friend, which is where the deepest bonds form.

## The Problem It Solves

JETSTREAM's current social layer is all flex. Friends celebrate, invite, arrive, post. No one ever admits something is hard. This is emotionally flat — it rewards only the performance layer of friendship.

Real friendship is the 2am text. The "I'm going through it." The showing up when nothing's happening. Without this layer, friendships feel like business relationships.

## Core Concept

Periodically (every 2-4 weeks sim time), a persona enters a **vulnerable state** — a quiet difficulty in their life. Nothing catastrophic; nothing that disrupts the world. Just human texture:

- Naomi's fertility struggle (private)
- Khalid's thoroughbred dying (semi-public, already in narrative engine)
- Vivian's mother declining (private)
- Jules going through a divorce (semi-public)
- Sasha's father's health (private, rarely talks about it)
- Elena's quiet depression after her father's death (very private)
- Saanvi's estrangement from her brother (private)
- Rico's team losing catastrophically and public criticism (semi-public)

When a persona is in this state:
- They DM less frequently
- Their messages are shorter, quieter
- They decline most invitations
- They don't post to the activity feed
- They *don't explicitly mention* what's wrong unless trust is high

The player can:
- **Notice** (the app surfaces subtle cues)
- **Reach out** (send a message without an agenda)
- **Show up** (fly to where they are, just to be there)
- **Respect distance** (not push, which is sometimes right)

## How It Differs from Narrative Arcs

The narrative engine (file 16) handles arcs with plot: feuds, obsessions, scandals. Those have public beats and affect the world.

Emotional range is **quieter and more private**. It doesn't advance like a plot — it just *is*. It may color a persona's behavior for 3-6 weeks, then fade. Most of the world doesn't know.

Both can coexist. Naomi's longevity obsession (narrative arc) might be running *while* she's also privately dealing with her mother's health (emotional range). One is the public performance; one is the private truth.

## Design Principles

- **Subtle, not theatrical.** No persona screams into the void. They go quiet.
- **Player must notice first.** The app surfaces cues, not labels.
- **Respect earned, not demanded.** Friendship has to be high to be let in.
- **Support is rewarded but not gamified.** Showing up yields real bonds, not XP pops.
- **Not every player will engage.** That's fine. The system works even if ignored.

## The Vulnerability State

```typescript
type VulnerabilityState = {
  id: string;
  personaId: PersonaID;
  
  theme: VulnerabilityTheme;           // broad category
  privateSummary: string;              // what's actually going on
  publicVisibility: "none" | "hints" | "known_to_close" | "semi_public";
  
  startedAt: ISODateString;
  expectedDurationWeeks: number;       // 3-10 typical
  resolvedAt?: ISODateString;
  
  // Behavioral effects while active
  dmFrequencyMultiplier: number;       // e.g., 0.3 = 30% of normal
  inviteAcceptanceModifier: number;    // -50 = much more likely to decline
  activityFeedMuted: boolean;
  moodOverride: "withdrawn" | "melancholic" | "numb" | "irritable";
  
  // Trust tracking
  trustRevealedToPlayer: boolean;      // has persona opened up?
  trustRevealedAt?: ISODateString;
  playerSupportActions: SupportAction[];
  
  // Resolution
  resolvedBy: "time" | "player_support" | "external_event";
  resolutionFriendshipDelta: number;   // if player supported well: +30-50
};

type VulnerabilityTheme = 
  | "family_illness"
  | "grief"
  | "relationship_ending"
  | "professional_crisis"
  | "health_concern"
  | "mental_health"
  | "existential_question"
  | "estrangement"
  | "public_embarrassment";

type SupportAction = {
  type: "unprompted_check_in" | "visit_without_agenda" | "respected_silence" 
      | "offered_help" | "just_listened" | "brought_them_out";
  occurredAt: ISODateString;
  friendshipDelta: number;
};
```

## How Vulnerability Triggers

### Rate
Roughly 1-2 personas in vulnerable states at any given sim-time. Staggered so the social world never feels uniformly heavy.

### Selection
Claude or deterministic logic picks a persona whose last vulnerability was 4+ months ago, weighted by:
- Archetype fit (Elena more prone to quiet depression; Dmitri more prone to professional embarrassment)
- Age-appropriate themes (older personas more likely family_illness)
- Life-stage fit (no forced themes)

### Themes by Persona (curated)

Each persona has a set of themes they're plausible candidates for:

```
Sasha Volkov:      grief, family_illness, relationship_ending
Naomi Tanaka:      health_concern, existential_question, professional_crisis
Dmitri Kozlov:     public_embarrassment, professional_crisis, relationship_ending
Alessandro Conti:  family_illness, professional_crisis
Amara Okonkwo:     professional_crisis, estrangement
Jules Laurent:     relationship_ending, professional_crisis, public_embarrassment
Elena Marchetti:   grief, mental_health, family_illness
Marcus Chen:       professional_crisis, public_embarrassment
Khalid Al-Rashid:  grief (already used early), family_illness
Vivian Hollis:     family_illness, grief, health_concern
Rico Alvarez:      public_embarrassment (team losses), professional_crisis
Pietro Russo:      health_concern, grief
Charles Pemberton: professional_crisis, relationship_ending
Pierre Larousse:   public_embarrassment, professional_crisis
Saanvi Mehta:      estrangement, family_illness
```

## The Cues System

When a persona is vulnerable and friendship is sufficient, the player sees cues. The app **never labels** these as "vulnerability." They just appear:

### Cue types

**Pattern shift cue** (appears in Social tab)
> *"Elena hasn't DM'd you in 12 days. Unusual."*

**Activity absence cue** (subtle)
> Friend activity feed: "Elena has been quiet this week."

**Tonal shift cue** (if persona has DMed recently)
When reviewing recent DMs, the app may add an aside:
> *"Her messages have been shorter lately."*

**Proximity cue** (if persona is somewhere unusual)
> *"Elena flew to Geneva yesterday. No event there."*

**Quiet moment cue** (via quiet moments system)
> *"Elena is at home in Geneva. Has been for two weeks. Quiet even for her."*

### What the player can do

#### [BTN] Send a check-in DM

New quick action on persona profile: **"Check In"**  
- Opens DM thread with prompt: *"Just thinking about you — hope all's well."* (player can edit or send as-is)
- Triggers **Support Action: unprompted_check_in**
- Persona's response depends on trust level:
  - Low trust: deflection ("Thanks, all fine, you?")
  - Medium trust: acknowledgment without detail ("Going through some stuff, thanks for asking")
  - High trust: opens up (shares what's happening)

#### [BTN] Fly to them without an event

Flying to a persona's current location without an associated event or trip purpose triggers **Support Action: visit_without_agenda** on arrival. Significant friendship boost potential.

#### [BTN] Just listen

If persona opens up in DM, player responding with simply "I'm here" or similar (without advice-giving, without pivoting to themselves) is detected as **Support Action: just_listened**. Claude checks tone of player response against a "supportive listening" pattern.

#### [BTN] Bring them out

Hosting an intimate dinner (not a party) at your property and inviting the vulnerable persona. They're more likely to decline, but accepting is significant.

### What NOT to do

These are tracked and degrade trust:
- Cancelling plans with a vulnerable persona → *"I get it"* — cold
- Sending generic group chat messages when they've gone quiet → ignored
- Pitching them an event/trip in first message after noticing silence → small trust decrease
- Posting about your own trip from somewhere great while they're struggling → pointed silence

## Player Support → Friendship Dynamics

Support actions compound over the vulnerability period:

| Action | Friendship Delta |
|---|---|
| Unprompted check-in (first) | +5 |
| Visit without agenda | +20 |
| Just listened (sustained) | +15 |
| Respected distance when signaled | +8 |
| Offered help that was needed | +12 |
| Brought them out (accepted) | +18 |

If player accumulates significant support during a vulnerability, the resolution generates a meaningful DM:

> *Elena:*  
> *"I don't know if I said this but the Geneva trip last month — you not pushing, not asking, just coming — that mattered. A lot. Thank you."*

And relationships deepen permanently (+30-50 friendship, marked as "close friend" if not already).

## UI Surface

### Command Center — "Someone's Quiet" Widget

Appears only when:
- A friend with friendship > 40 is in a vulnerable state
- 7+ days have passed since their last message
- Player hasn't yet checked in

Widget content (subtle, not alarmist):
> *"Elena has been quiet the past two weeks. Might be worth a message."*
> [BTN] "Say hi"

Dismisses after player engages or a week passes.

### Persona Profile — Trust Level Indicator

For personas with high friendship (70+), a small indicator when vulnerable:
> *"She's going through something."*

Only shown if trust has been revealed. Otherwise, just cues.

## Claude Integration

### `/api/ai/vulnerability-dm`

When persona DMs player during vulnerable state, this endpoint generates the message with vulnerability context.

Prompt includes:
- Persona's vulnerability theme + private summary
- Player's recent actions (did they check in? fly out? ignore?)
- Trust level between player and persona
- Time elapsed since vulnerability started

Claude generates tonally appropriate message — deflection, subtle hint, or open admission depending on trust.

### `/api/ai/vulnerability-detection`

When app analyzes player's reply to determine support action type. E.g., "Did this reply qualify as 'just listened' or was it advice-giving?"

Returns classification + reasoning.

### `/api/ai/vulnerability-resolve`

When vulnerability period ends, generates resolution DM if player engaged meaningfully. Tonally mature — not gushing, just acknowledged.

## Settings

Critical — some players don't want heavy emotional content:

**Profile → Settings → "Emotional Depth"**
- Toggle: "Friends go through difficult times sometimes" — ON by default
- When OFF: vulnerability system disabled entirely, world stays in default mode

This is a hard toggle. Respect it.

## Sample Vulnerability Flow (Elena — grief arc)

**Week 0**: Elena's father's health declines (trigger event, private).  
Elena's `vulnerabilityState` created. `publicVisibility: none`. `moodOverride: withdrawn`. `dmFrequencyMultiplier: 0.2`.

**Week 1**: Player notices Elena hasn't DMed in 10 days. Command Center surfaces cue.

**Week 2**: Quiet moment: *"Elena is in Geneva. Her father's been ill for a while now, though she hasn't said so."* (Only if player has friendship 80+.)

**Week 3**: Player DMs: *"Hey, thinking of you."* Elena replies: *"Thank you. Geneva stuff. I'll catch up soon."* Support action logged.

**Week 4**: Player flies to Geneva without an event. On arrival, Elena DMs: *"You didn't have to come."* Visit logged, friendship +20.

**Week 5**: Elena's father passes. `publicVisibility: hints`. Naomi DMs player: *"Have you heard about Elena's dad?"* Saanvi DMs Elena publicly (in group chat): condolences.

**Week 6**: Player stays close. Doesn't pitch events. Just shows up. Sustained support.

**Week 8**: Resolution. Elena DMs: *"I'm back in the world. Not fully. But the Geneva trip — I'll never forget it."* Friendship deepens permanently, friendship level jumps to 95.

This is the kind of arc that makes a friendship mean something over months of play.

## Why This Matters

Without this layer, your friends are NPCs who celebrate you. With it, they're people who sometimes need you. And being needed by someone you love is one of the deepest pleasures of human life.

JETSTREAM can simulate that.

This is the feature that will make you care about these characters after a year of play. It's the difference between *social mechanics* and *actual attachment*.

## Build Order

Insert as **Phase 12.5: Emotional Range**.

Tasks:
1. Extend Dexie with `vulnerabilityStates` table
2. Build `/lib/vulnerability-engine.ts`:
   - Scheduler that triggers new vulnerabilities at appropriate cadence
   - Behavior-effect applicator (adjusts persona DM rates, invite acceptance)
   - Support action detector (pattern matches player actions)
3. Build Claude endpoints (vulnerability-dm, vulnerability-detection, vulnerability-resolve)
4. Extend persona-plan prompts with vulnerability context (affects their trip choices)
5. Build cues system — surface appropriate signals without labels
6. Build "Someone's Quiet" Command Center widget
7. Build "Check In" quick action on persona profiles
8. Implement "visit without agenda" detection on flight arrival
9. Implement "just listened" detection on DM replies
10. Add settings toggle for emotional depth
11. Seed one initial vulnerability at first load (Khalid's stallion, already in narrative engine — can coexist)
12. Test: fast-forward 4 weeks, verify vulnerabilities trigger, cues surface, support actions register, resolutions generate

## A Final Note

This is the most sensitive system in JETSTREAM. Written carefully, it creates real attachment. Written clumsily, it creates emotional manipulation.

The difference is **restraint**. Personas don't perform their pain. They go quiet. The player has to choose to notice. That's what makes it feel real.

When Antigravity builds this, emphasize: *the app's job is to get out of the way*. No alerts. No "feelings detected." No UI that says "your friend is sad." Just subtle, ambient shifts. Everything works because nothing announces itself.
