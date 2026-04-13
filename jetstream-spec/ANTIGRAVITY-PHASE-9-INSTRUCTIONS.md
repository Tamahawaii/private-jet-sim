# ANTIGRAVITY INSTRUCTIONS — PHASE 9

THE BIG ONE. Behavioral engine, intimacy, drama, life events, reputation, gossip.

You will receive these files:
- `types/phase-9-additions.ts` — all new types (drop into /types/index.ts)
- `lib/behavioral/engine.ts` — main tick + burst entry points
- `lib/behavioral/action-selector.ts` — LLM decision logic
- `lib/behavioral/action-executor.ts` — turns decisions into actions
- `lib/intimacy/encounter.ts` — fade-to-black scene generator
- `lib/intimacy/emoji-curator.ts` — contextual emoji picker
- `lib/drama/triggers.ts` — drama event creation
- `lib/life-events/handlers.ts` — marriage/divorce/birth/breakup
- `lib/reputation/calculator.ts` — multi-axis reputation
- `lib/gossip/generator.ts` — gossip column + blind items
- `specs/PHASE-9-MASTER-SPEC.md` — comprehensive spec, READ FIRST

---

## SHIP ORDER (CRITICAL — 5 separate commits)

DO NOT ship Phase 9 as one commit. Split into 5 atomic commits with verification between each:

1. **Schema + behavioral engine plumbing** (no LLM calls yet)
2. **Drama system + response UI**
3. **Intimacy system + fade-to-black UI**
4. **Life events + reputation calculator**
5. **Gossip column + UI**

Each commit must build clean and not break existing functionality before next commit starts.

---

## STEP 1: Schema + Behavioral Engine Plumbing

### 1a. Type additions
- Drop all of `types/phase-9-additions.ts` into `/types/index.ts`
- Update Player type to include `relationshipPreferences: PlayerRelationshipPreferences`
- Update PersonaState type to include `ghostUntil?: ISODateString`

### 1b. Dexie schema
Add tables to `/lib/db.ts`:
```typescript
intimateEncounters: 'id, occurredAt, *participantIds',
dramaEvents: 'id, type, severity, triggeredAt, initiatorId, *targetIds',
lifeEvents: 'id, type, primaryPersonaId, occurredAt',
playerReputation: 'id',
personaActionDecisions: 'id, personaId, decisionAt, chosenAction',
behavioralTickLogs: 'id, tickAt, trigger',
gossipItems: 'id, publishedAt, format, isAccurate',
```

Note: `playerReputation` table stores ONE record with id `'player-reputation'`.

### 1c. Bootstrap migration
- Existing player records: add `relationshipPreferences: { style: 'undeclared', declaredAt: null, publiclyKnown: false }`
- Existing personaStates: ensure `ghostUntil` undefined is OK
- Initialize empty `playerReputation` record with neutral scores (all 50)

### 1d. Behavioral engine files
- Drop `lib/behavioral/engine.ts`, `action-selector.ts`, `action-executor.ts` into `/lib/behavioral/`
- Note: engine.ts has placeholder for `getCurrentSimTime()` — wire to existing sim-time helper
- The action-executor imports stubs (drama, intimacy, life-events, gossip) — these come in later steps. Use `// @ts-ignore` or stub functions for now.

### 1e. Cron handler
Create `/app/api/cron/behavioral-tick/route.ts`:
```typescript
import { runBackgroundTick } from '@/lib/behavioral/engine';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const log = await runBackgroundTick();
  return Response.json({ ok: true, log });
}
```

Add `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/behavioral-tick",
    "schedule": "0 */8 * * *"
  }]
}
```

User must add `CRON_SECRET` env var.

### 1f. On-open trigger
In root layout or app initializer, call `runOnOpenBurst()` once per session start (debounced, e.g., min 1 hour between bursts).

### Verification
- [ ] Build passes
- [ ] Cron endpoint returns 200 when called with correct auth
- [ ] On-open burst runs once when app loads
- [ ] behavioralTickLogs table populates
- [ ] No errors in console
- [ ] Existing DM/event/flight functionality unaffected

**Ship Commit 1.**

---

## STEP 2: Drama System + Response UI

### 2a. Drop in drama files
- `lib/drama/triggers.ts`
- Update action-executor.ts to actually call `triggerDramaEvent` (remove stub)

### 2b. Drama notification UI
Per spec, surface drama events with `playerResponseRequired: true`:

Component: `DramaResponseModal.tsx`
- Triggered when there's any unresolved drama with player as target
- Modal with:
  - Title (drama.title)
  - Description (drama.narrativeText)
  - Response options as buttons
  - Tap-and-hold or hover shows consequencePreview
  - "Address later" button (closes modal but keeps drama unresolved)

### 2c. Drama integration with Inbox badge
- Add red urgent indicator on inbox bell when unresolved player-targeted drama exists
- Tapping urgent bell goes to drama list view first

### 2d. Resolution endpoint
Create `/app/api/drama/[id]/resolve/route.ts`:
```typescript
import { resolveDramaResponse } from '@/lib/drama/triggers';
// POST { responseOptionId: string }
```

### Verification
- [ ] Manually trigger drama via debug button → modal appears
- [ ] Selecting option resolves drama
- [ ] Some response options trigger followup drama (test ultimatum → reject)
- [ ] Metrics actually update on resolution
- [ ] Sonnet used for major/catastrophic, Haiku for minor/moderate (check apiUsage logs)

**Ship Commit 2.**

---

## STEP 3: Intimacy System + Fade-to-Black UI

### 3a. Drop in intimacy files
- `lib/intimacy/encounter.ts`
- `lib/intimacy/emoji-curator.ts`

### 3b. Intimate encounter component
Component: `IntimateEncounterScene.tsx`

Three-stage reveal:
1. **Buildup paragraph** fades in (1.5s)
2. **Black screen** with bouncing emojis (~5s, randomized motion paths via CSS keyframes or framer-motion)
3. **Fade text paragraph** fades in (1.5s)
4. **Continue button** appears

Bouncing emoji animation: each emoji has random initial position, random velocity vector, bounces off viewport edges. Use canvas or absolutely-positioned divs.

### 3c. Player initiation interface
On persona detail page, when status >= 'flirting' AND romanticTension >= 50:
- Show "MAKE A MOVE" button (subtle, in the persona's monogram color)
- Tapping → API call that:
  - Rolls acceptance based on metrics + drama state + style alignment
  - If accepted → calls `renderIntimateEncounter()` → returns encounter
  - Surfaces IntimateEncounterScene
- If declined: brief decline message ("Theo's busy with the press tour. Maybe in Paris next month.")

### 3d. Marcus closeted reveal
Special button on Marcus detail page when relationship depth >= 60:
- "ASK HIM DIRECTLY"
- Tapping triggers `betrayal-reveal` drama (severity: major) with custom narrative prompt
- This is the only way Marcus's closeted state can be unlocked

### Verification
- [ ] "Make a move" button appears at right thresholds
- [ ] Encounter scene renders with all three stages
- [ ] Emojis actually bounce (animation works)
- [ ] Fade text is non-explicit, atmospheric (review a few generations)
- [ ] Marcus reveal button only appears at depth >= 60
- [ ] Encounters trigger jealousy detection (verify another linked persona's metrics shift)

**Ship Commit 3.**

---

## STEP 4: Life Events + Reputation Calculator

### 4a. Drop in
- `lib/life-events/handlers.ts`
- `lib/reputation/calculator.ts`

### 4b. Life event surfacing
- When persona's `publicRelationshipStatus` changes via life event, update persona detail page
- Add LIFE EVENTS section to persona detail page (chronological, recent first)
- Engagements/marriages should trigger gossip (handled by gossip generator next step)

### 4c. Reputation display
Add Reputation panel to player profile/dashboard:
- Four progress bars (one per axis)
- Active labels shown as pills below
- Tap each axis: drawer with "What's affecting this score" — list of recent events

### 4d. Reputation in persona prompts
Update persona DM prompt builder to include reputation context:
```typescript
import { getReputationContextForPrompts } from '@/lib/reputation/calculator';

const repContext = await getReputationContextForPrompts();
// Add to system prompt:
systemPrompt += `\n\nWhat the world says about ${player.displayName}: ${repContext}`;
```

### 4e. Player relationship style declaration
Add to `/settings/profile`:
- Radio: monogamous / open / polyamorous / casual / undeclared
- Checkbox: "Make this publicly known"
- POST to `/api/player/relationship-preferences`
- Personas now know your declared style (in their action selector context)

### Verification
- [ ] Marriage life event updates persona's publicRelationshipStatus
- [ ] Divorce updates partners list
- [ ] Reputation panel renders with correct scores
- [ ] Recalculation runs after each tick
- [ ] Style declaration saves and is reflected in DMs (persona references it)

**Ship Commit 4.**

---

## STEP 5: Gossip Column + UI

### 5a. Drop in
- `lib/gossip/generator.ts`
- Update behavioral engine to actually call `generateGossipForRecentEvents` (remove stub)

### 5b. Gossip column page
Create `/app/gossip/page.tsx`:
- List of gossip items, newest first
- Tab filters: All / Public / Blind / About me / About my circle
- Each item:
  - Headline (if public)
  - Body
  - Author voice indicator (small label: "Page Six", "Whisper", etc.)
  - Read indicator
  - Reactions count
  - Action buttons:
    - "Issue correction" (if isAccurate === false and player knows it's wrong)
    - "Reveal subjects" (if blind item, opens modal showing actualPersonaIds)

### 5c. Gossip notification badge
- Add gossip count to inbox badge area (separate from DM count)
- Tap → opens /gossip page

### 5d. Persona reactions to gossip
After gossip generates, some personas may react via behavioral engine:
- Action selector should consider `react-to-gossip` action when recent gossip exists
- If chosen, sends DM to player about the gossip

### 5e. Correction mechanic
- "Issue correction" button on false rumors
- Posts a correction publicly (logged in apiUsage as gossip-correction)
- Restores some discretion reputation
- Other personas may react to the correction

### Verification
- [ ] Gossip generates after intimate encounters with triggeredGossip=true
- [ ] Gossip generates after dramatic events with public visibility
- [ ] Gossip generates after marriage/engagement life events
- [ ] Some gossip is inaccurate (~15%)
- [ ] Public column items have headlines
- [ ] Blind items use descriptors not names
- [ ] Issue correction flow works
- [ ] Personas occasionally react to gossip via DM (catch in behavioral logs)

**Ship Commit 5.**

---

## CRITICAL REMINDERS

1. **All atomic transactions**: any flow that changes player money + DB state must be in `db.transaction(...)`
2. **Prompt token costs add up**: Phase 9 will dramatically increase API spend. Monitor closely first 24h after deploy.
3. **Test on-open burst with simulated absence**: manually push `lastBurst.tickAt` back 3 days in IndexedDB to verify burst intensity scaling
4. **Marcus closeted is sensitive**: review the betrayal-reveal narrative output before considering it locked
5. **False rumors must feel plausible**: spot-check 10 generated false rumors. If they're obviously fake (wrong syntax, etc.), tweak the prompt
6. **Drama frequency may overwhelm at first**: if user feedback is "too much drama", drop TICK_PROBABILITY_PER_PERSONA from 0.35 to 0.25
7. **Cron secret**: must be added to Vercel env. Without it, cron returns 401 (silently fails).
8. **Don't forget**: existing event/flight code that updates relationships should now also feed into reputation recalc. Add `recalculateReputation()` call to existing `resolveArrivals` after metric updates.

---

## VERIFICATION SMOKE TEST (after all 5 commits)

End-to-end soap opera test:
1. Declare style as "polyamorous, public"
2. Take Theo to Aman Venice (initiate flirting in DMs first)
3. Make a move → encounter
4. Wait 8 hours real (or trigger cron manually)
5. Verify: gossip item appears, possibly Rio (jealous) DMs you, possibly drama event triggered
6. Check reputation: discretion should drop slightly, generosity unchanged
7. Resolve drama event by selecting an option
8. Verify metrics update across all involved relationships

If this all works smoothly, Phase 9 is shippable.

---

## COST MONITORING

After deploy, check `/api/usage` (or wherever apiUsage is exposed):
- Daily total should be in $0.05-$0.60 range typical
- If $5+/day, something is in a loop — investigate immediately
- Spike after on-open burst is normal (3x daily tick cost)
