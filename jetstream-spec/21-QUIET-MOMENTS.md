# JETSTREAM — Quiet Moments

Every interaction in JETSTREAM so far is *active*. Fly somewhere, attend something, buy something, host something. But the real texture of billionaire life — the part worth having — is the in-between. The morning on the terrace. The 11pm DM from someone who can't sleep either. The slow Sunday on the yacht.

This system fills the silences.

## The Problem It Solves

Without quiet moments, the game is always demanding forward motion. Every open session needs an action. This feels frantic, not luxurious. Real wealth's fantasy isn't constant action — it's **time, space, and the permission to do nothing**.

Quiet moments are ambient narrative vignettes that just *are*. They don't require action. They create mood and presence.

## Core Concept

At any time, the Command Center or relevant screens can surface a **Quiet Moment** — a small, non-urgent card that doesn't demand anything. It just shares something:

- Ambient observations about where you are
- A friend's ambient update (not an invitation — just an update)
- A sensory vignette about your property or yacht
- A slow thought from a persona
- A note about the current weather, hour, or season

These moments are Claude-generated, tonally restrained, and **always optional to engage with**.

## Moment Types

### 1. Location Vignettes
When you're "at" a location (owned property, booked resort, on yacht):

> *"The morning light in Aspen, mid-January. 17°F outside. The house is quiet. You have 6 hours until dinner at The Little Nell."*

### 2. Persona Slow Thoughts
A friend shares something without agenda:

> *Elena:*  
> *"Watching the light change on the lake. Hope you're somewhere good."*

No invite. No question. Just presence. Player can respond or not.

### 3. Sensory Details
Brief atmospheric notes:

> *"Your yacht rocks gently at anchor off Portofino. The water is very clear today."*

### 4. Friend Ambient Updates
Activity feed style but lower-stakes:

> *"Sasha is at home in Monaco. Has been for three days. Quiet for him."*

### 5. Weather/Time Observations
> *"It's raining in London right now."*  
> *"Sunrise in Singapore in 23 minutes."*  
> *"First frost in Aspen last night."*

### 6. Memory Fragments
Tied to milestones (see file 20):

> *"Two years ago this week, you were at your first Met Gala."*

### 7. Nothing-to-Say DMs
Low-friendship-momentum persona says something minor:

> *Rico:*  
> *"okay this queso is elite, wish u were here lol"*

No reply needed. It's just life.

## Design Rules

**What quiet moments ARE**:
- Low-stakes
- Tonally restrained
- Optional to engage with
- Atmospheric
- Brief (usually 1-2 sentences)
- Real — they feel observed, not generated

**What quiet moments are NOT**:
- Invitations
- Calls to action
- Plot advancements
- Game mechanics disguised as mood
- Sentimental
- Forced

If a moment demands a response or triggers an outcome, it's not a quiet moment — it's a regular DM or event.

## Pacing & Frequency

- **Maximum 2-3 per session** visible at any time
- **New moments surface every 2-4 hours** of real time
- **Never interrupt active flows** (in the middle of a flight planning, no quiet moments appear)
- **Auto-dismiss** after 48 hours if unengaged — they're ephemeral by design
- **Skip quiet moments entirely** is a settings toggle (some players hate ambient stuff)

## Data Model

```typescript
type QuietMoment = {
  id: string;
  momentType: "location_vignette" | "slow_thought" | "sensory_detail" 
            | "friend_ambient" | "weather_time" | "memory_fragment" 
            | "nothing_dm";
  generatedAt: ISODateString;
  expiresAt: ISODateString;        // auto-remove after this
  
  content: string;                  // the text itself
  fromPersonaId?: PersonaID;        // if persona-attributed
  relatedLocationICAO?: string;
  relatedEntityId?: string;
  
  surfaced: boolean;                // shown to player yet?
  surfacedAt?: ISODateString;
  engagedWith?: "dismissed" | "responded" | "liked" | "ignored";
  
  tone: "warm" | "neutral" | "melancholic" | "playful" | "observed";
};
```

## Dexie Schema

```typescript
this.version(6).stores({
  // existing...
  quietMoments: 'id, momentType, expiresAt, surfaced',
});
```

## Generation Logic

```typescript
// /lib/quiet-moments-engine.ts

export async function maybeGenerateQuietMoment(now: Date): Promise<void> {
  const settings = await playerRepo.getSettings();
  if (!settings.quietMomentsEnabled) return;
  
  // Throttle: max 1 new moment per 3 hours of real time
  const lastGenerated = await quietMomentRepo.lastGeneratedAt();
  if (differenceInMinutes(now, lastGenerated) < 180) return;
  
  // Don't generate during active flights/voyages (user focused elsewhere)
  const hasActiveTransit = await flightRepo.hasActive() || await voyageRepo.hasActive();
  if (hasActiveTransit) return;
  
  // Cap at 3 unread moments
  const unread = await quietMomentRepo.getUnread();
  if (unread.length >= 3) return;
  
  // Decide type based on context
  const context = await buildQuietContext(now);
  const type = selectMomentType(context);
  
  // Call Claude (Haiku — low-stakes, needs speed)
  const content = await generateQuietMomentContent(type, context);
  
  await quietMomentRepo.create({
    ...content,
    expiresAt: addHours(now, 48),
    surfaced: false,
  });
}
```

### The Claude Prompt

Uses **Claude Haiku 4.5** — cheap, fast, and perfectly suited.

```
You are generating a QUIET MOMENT for a billionaire lifestyle simulator. 
This is not an invitation, a plot beat, or a call to action. It's just an 
ambient observation — the textual equivalent of looking out a window.

Rules:
- Maximum 2 sentences
- Never ask a question
- Never include "you should" or suggestions
- Tonally restrained — not sentimental, not manic
- Specific details > general observations
- No emojis unless from Dmitri or Rico specifically

Type of moment: {momentType}
Context:
- Player location: {location}
- Current season/time: {date and local time}
- Persona (if applicable): {persona details}
- Recent context: {1-2 sentences}

Generate the moment. Text only. No quotes or formatting.
```

## UI Surface

### On Command Center

Small, understated card: **"Quiet"** (label subtle, upper-right of card)

Displays one unread quiet moment. Styling:
- Serif font for the text (editorial feel)
- No bright colors
- No prominent actions
- Just: [BTN] small heart icon (like) | [BTN] small X (dismiss) | [BTN] reply icon (only if from persona)

### In DM Threads (if from persona)

Quiet moment DMs appear like regular messages but are subtly styled:
- Italic text
- Muted background
- No typing indicator follow-up expected

### In Activity Feed

Friend ambient updates slot into the activity feed but styled differently — lower visual weight, italic tone.

## Settings Toggle

In Profile → Settings:

> **Quiet Moments**  
> *Ambient observations and slow thoughts that surface throughout the app*  
> Toggle: ON / OFF

Default ON. Some players hate ambient stuff — respect that.

## Sample Moments (for voice calibration)

Show Antigravity these so it tunes the prompt correctly:

**Location vignette (Aspen, winter morning)**:
> *Mid-January, Aspen. Still dark at 7am. The snow started again sometime in the night.*

**Slow thought from Elena**:
> *Watching the fog come in across the lake. Something about February here.*

**Sensory detail (aboard yacht, Med)**:
> *The sea is glass this morning. You can see the bottom at thirty feet.*

**Friend ambient (Sasha, Monaco)**:
> *Sasha is still in Monaco. Three weeks now. Quiet for him.*

**Weather/time**:
> *Rain in Belgravia since Wednesday.*

**Nothing-to-say from Rico**:
> *"ok the tacos at this place are actually stupid. that's it that's the text"*

**Memory fragment**:
> *One year ago tonight, you were at your first Cannes Film Festival premiere.*

## Why This Matters

Games without quiet moments force constant engagement. That's fine for a 2-hour session but wrong for a world you're supposed to inhabit over months.

The quiet moments do three things:
1. **Slow the pace** so the world feels lived-in, not frantic
2. **Demonstrate the app's knowledge** without performing it (it knows where you are, when it is, who you are)
3. **Make you love the app even when nothing is happening** — which is most of the time

This is the feature that makes you open JETSTREAM just to read, not to do.

## Build Order

Insert as **Phase 12.4: Quiet Moments**.

Tasks:
1. Extend Dexie with `quietMoments` table
2. Build `/lib/quiet-moments-engine.ts` with throttled generation
3. Build `/api/ai/quiet-moment` endpoint using Haiku
4. Wire into `getWorldState()` — generate after all urgent state resolved
5. Design Command Center "Quiet" card component
6. Style quiet-moment DMs distinctly in DM thread component
7. Integrate friend ambient moments into activity feed with lower visual weight
8. Add settings toggle
9. Test: fast-forward 2 days, verify quiet moments generated at appropriate pace without overwhelming
