# JETSTREAM — Gossip Column ("The Ledger")

A weekly Claude-generated publication that treats your billionaire world like it's being watched. Page Six meets the Financial Times. Turns your movements and your friends' into dispatches from an outside observer.

## The Core Fantasy

Every Monday morning (sim time), a new issue of **The Ledger** drops. It's written in the voice of a well-connected gossip columnist — dry, knowing, sometimes catty, always informed. It features:

- Sightings of you and your friends at events last week
- Speculation about feuds, romances, deals
- Photos (stock imagery with Claude-generated captions)
- A "Most Watched" ranking of the billionaire circle this week
- Property transactions worth noting
- The week ahead — who's going where, which events to watch

**Why this works**: It creates an outside perspective on the world. It makes your actions feel observed. It surfaces narrative arcs naturally. It rewards attendance and hosting with name-drops. And it's insanely fun to read about yourself.

## The Publication

**Name**: The Ledger (or "Meridian Weekly" — final call by the player if they want to rename via settings).

**Cadence**: Weekly, published Monday 8am in player's home timezone.

**Length**: ~600-1200 words per issue. Mobile-readable in 3-5 minutes.

**Voice Reference**: Think Air Mail (Graydon Carter), Puck, early Page Six, the Business of Fashion Daily Digest. Dry, sophisticated, not mean-spirited. Assumes the reader is part of the world, not gawking at it.

## Issue Structure

Each issue has a standard structure, though Claude has flexibility:

### 1. Masthead
- "THE LEDGER" (serif, large)
- "Issue No. {n} • {date}"
- Brief hero quote or dateline

### 2. The Column (main editorial)
3-5 short paragraphs covering the week's most notable movements. Mix of:
- Sightings ("Spotted at Cheval Blanc Miami...")
- Speculation ("Sources whisper that...")
- Dry observations ("It has now been six weeks since Dmitri Kozlov was last photographed without sunglasses.")

### 3. The Sightings (bullet list, 4-8 items)
Short factual-feeling items:
- "Sasha Volkov — Monaco. Still."
- "Naomi Tanaka and Marcus Chen, same room at Sun Valley. No words exchanged."
- "Our own JETSTREAM reader — first appearance at Art Basel Miami."

### 4. Featured Photo
One stock image with a witty, knowing caption (Claude-generated).

### 5. The Watch List (top 5)
Ranked list of who's having the most-discussed week:
1. Most movement, prestigious attendance, or drama
2-5. Similar
- Each with a one-liner explanation

### 6. Market Notes (real-estate + yacht transactions)
- Major property purchases that happened this week
- Yacht acquisitions or sightings
- "A quiet $45M transaction on Gin Lane" kind of thing

### 7. The Week Ahead
- Preview of upcoming events (next 7-10 days)
- "Expected at Monaco GP Sunday: the usual paddock suspects, plus..."

### 8. Editor's Note (occasional)
A single witty observation to close, maybe 2-3 sentences.

## Data Model

```typescript
// Add to /types/index.ts

type GossipIssue = {
  id: string;                        // "ledger-2026-04-13"
  issueNumber: number;
  publishedAt: ISODateString;
  weekStart: ISODateString;
  weekEnd: ISODateString;
  
  masthead: {
    title: string;                   // "THE LEDGER" usually, customizable
    dateline: string;                // "From somewhere between Nice and Mustique..."
    heroQuote?: string;
  };
  
  column: string;                    // main prose section, markdown
  
  sightings: Sighting[];
  
  featuredPhoto?: {
    imageUrl: string;                // stock image path
    caption: string;                 // Claude-generated caption
  };
  
  watchList: WatchListEntry[];       // top 5
  
  marketNotes: MarketNote[];
  
  weekAhead: string;                 // prose
  
  editorsNote?: string;
  
  // Meta
  peopleReferenced: PersonaID[];
  playerReferenced: boolean;
  relatedArcIds: string[];
  readAt?: ISODateString;
  
  // Versioning (if the issue is edited later)
  generatedAt: ISODateString;
};

type Sighting = {
  personaIds: PersonaID[];           // who was seen (may include "player")
  location: string;
  text: string;                      // the one-liner
  vibe: "neutral" | "notable" | "suggestive" | "damning";
};

type WatchListEntry = {
  rank: 1 | 2 | 3 | 4 | 5;
  personaId: PersonaID | "player";
  headline: string;                  // "Had her name on two of this week's biggest tables"
  note?: string;                     // optional sub-line
};

type MarketNote = {
  type: "property" | "yacht" | "aircraft" | "art" | "other";
  text: string;                      // "A three-bedroom in Monaco's Carré d'Or sold for $62M..."
  referencedEntityId?: string;       // if it's trackable
};
```

## Dexie Schema

```typescript
this.version(4).stores({
  // existing...
  gossipIssues: 'id, issueNumber, publishedAt, readAt',
});
```

## Generation Logic

Called on app open once per week (checks if current week's issue already exists).

```typescript
// /lib/gossip-engine.ts

export async function maybeGenerateWeeklyIssue(now: Date): Promise<void> {
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekId = format(currentWeekStart, 'yyyy-MM-dd');
  
  const existing = await gossipRepo.getByWeekId(weekId);
  if (existing) return;
  
  // Gather the week's material
  const material = await gatherWeekMaterial(currentWeekStart, now);
  
  // Call Claude
  const issue = await generateIssue(material);
  
  // Persist
  await gossipRepo.create(issue);
  
  // Create notification
  await notificationRepo.create({
    type: 'system',
    title: 'The Ledger, Issue No. ' + issue.issueNumber,
    body: issue.masthead.dateline,
    linkTo: `/ledger/${issue.id}`,
  });
}

async function gatherWeekMaterial(weekStart: Date, weekEnd: Date) {
  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    
    playerActions: await gatherPlayerActions(weekStart, weekEnd),
    // Flights, voyages, event attendance, property purchases, hosting events, 
    // prestige changes, yacht charters, DM highlights with friends
    
    personaActivities: await gatherPersonaActivities(weekStart, weekEnd),
    // Each friend's: flights taken, events attended, locations visited,
    // arc involvement, property transactions
    
    arcBeatsThisWeek: await narrativeRepo.getBeatsInRange(weekStart, weekEnd),
    // Public-visibility beats are strongest fuel for the column
    
    eventsThisWeek: await eventRepo.getInRange(weekStart, weekEnd),
    eventsUpcoming: await eventRepo.getInRange(weekEnd, addDays(weekEnd, 10)),
    
    recentWatchList: await gossipRepo.getRecentWatchLists(4),
    // So Claude can vary who gets featured week-to-week
    
    currentArcs: await narrativeRepo.getActive(),
  };
}
```

## The Generation Prompt

**Endpoint: `POST /api/ai/gossip-weekly`**

**System prompt:**
```
You are the editor of THE LEDGER, a weekly insider dispatch about the private 
world of the ultra-wealthy. Your voice is dry, knowing, sophisticated, and 
never mean-spirited. You assume your reader is part of this world — you write 
with them, not about them.

Reference publications for voice: Air Mail, Puck, The Business of Fashion's 
Daily Digest, early Page Six (Liz Smith era).

Rules for your writing:
- Never be cruel. Catty is fine. Mean is not.
- Never break character. You are a person, not an AI.
- Short, clean sentences. Sometimes a dry one-liner on its own.
- Reference specific places, brands, and events. Names are the currency.
- Let style vary by section. Column = paragraphs. Sightings = terse.
- Use italics sparingly, for emphasis or for quoted speech
- Never use emojis
- Never overexplain. The reader is in this world.
- If you must speculate, cushion it: "sources say," "we hear," "rumors persist"

Context for this week's issue:
- Issue number: {n}
- Week of: {date range}

PLAYER ACTIVITY THIS WEEK:
{playerActions formatted}

PERSONA ACTIVITY THIS WEEK:
{personaActivities formatted — what each friend did, where they went}

NARRATIVE ARC BEATS (things you may reference in commentary):
{arcBeatsThisWeek, public ones especially}

EVENTS THIS WEEK:
{eventsThisWeek}

EVENTS UPCOMING:
{eventsUpcoming}

RECENT WATCH LISTS (to avoid repeating):
{recentWatchList}

ACTIVE ARCS (for continuity references):
{currentArcs}

Generate this week's issue of THE LEDGER. Return JSON matching this structure:
{
  masthead: { dateline: string, heroQuote?: string },
  column: string (3-5 paragraphs, markdown, 400-700 words),
  sightings: [ { personaIds: [...], location: string, text: string, vibe: string } ] (4-8 items),
  featuredPhoto: { imageUrl: null, caption: string } (caption only; image selected separately),
  watchList: [ { rank, personaId, headline, note? } ] (exactly 5),
  marketNotes: [ { type, text } ] (0-4 items),
  weekAhead: string (2-3 paragraphs),
  editorsNote?: string (optional, 2-3 sentences)
}

Reference the player subtly when they've had a notable week. Do not over-flatter them — this is a paper of record, not a fan letter. If the player had a quiet week, don't force them in; they can be absent from an issue.
```

## Image Selection

For the featured photo, we don't call DALL-E. We curate a stock image library:

```
/public/imagery/ledger/
  ├── yacht-sunset-001.jpg
  ├── yacht-sunset-002.jpg
  ├── monaco-paddock-001.jpg
  ├── art-fair-crowd-001.jpg
  ├── private-jet-tarmac-001.jpg
  ├── evening-event-001.jpg
  ├── mediterranean-villa-001.jpg
  ...
  (30-50 total, organized by mood/scene)
```

Each image tagged with mood (`elegant`, `moody`, `bright`, `aspirational`) and scene type (`yacht`, `event`, `jet`, `property`, `street`, `dinner`).

After Claude generates the caption for `featuredPhoto`, we select an image by:
1. Parsing the caption for scene hints
2. Matching against tagged images
3. Deterministic pick (seedrandom with issue ID, so same image never appears twice in a row)

Alternative, simpler: let Claude return a `featuredPhotoHint` object with scene + mood, and we pick from tags. Caption generated to match.

## UI: The Ledger Reader

### New Route: `/ledger` (archive) and `/ledger/[issueId]` (single issue)

### `/ledger` — Archive View

Layout:
- Header: "THE LEDGER" in large serif, tagline underneath
- Latest issue featured as big card
- Grid/list of past issues (thumbnail + issue number + date + first-line preview)
- Filter: "All Issues" / "Featuring You" / "Past 3 Months"
- [BTN] Each issue card → navigate to issue detail

### `/ledger/[issueId]` — Single Issue

Layout (editorial, like reading a magazine):
- Full-width masthead header with serif title
- Publication date + issue number
- "Dateline" italics quote
- Column section: body text in larger serif type (reading-optimized)
- Pull-quote styling for notable sentences (Claude can mark these)
- Sightings section: visually distinct, smaller type, bullet-like
- Featured photo: full-width with italic caption
- Watch List: numbered 1-5, each entry as card with persona portrait + headline
- Market Notes: subtle, smaller type, separated by dividers
- Week Ahead: lightly different background tint
- Editor's Note: italicized, right-aligned

### Interactions on an Issue

**[BTN] Name mentioned (persona name)**
- On tap: navigate to persona profile OR open persona preview popover

**[BTN] Event name mentioned**
- On tap: navigate to event detail

**[BTN] Location mentioned**
- On tap: pan world map to that location

**[BTN] Share** (top right)
- On tap: copies issue link (for personal use, even though single-player — nice for screenshots)

**[BTN] Subscribe Settings** (gear icon)
- Opens [MODAL]:
  - Toggle: "Publish weekly on Monday" (default ON)
  - Toggle: "Include me in the Watch List when relevant" (default ON)
  - Toggle: "Rename publication" — lets player rename to "Meridian Weekly" or whatever
  - [BTN] Save

### Command Center Integration

When a new issue drops, on Command Center:
- **Ledger Preview Card**: masthead header, "Issue No. 47 — Out Now" + first line of column + [BTN] "Read"
- Dismisses after player reads

### Notification

When an issue is generated: notification "The Ledger, Issue No. {N}" — bell badge, tappable.

## Integration with Other Systems

### Narrative Arcs
Arc beats with `visibility: "public"` are the richest source material for The Ledger's column. Claude references them in commentary.

### DMs
Personas occasionally reference the Ledger. "Did you read the Ledger this morning? I can't believe they printed that about Dmitri" — adds realism.

### Prestige
Being featured on the Watch List at rank 1 yields +10 prestige. Rank 2-3 yields +5. Rank 4-5 yields +2.

### Events
After attending a tier 4+ event, player's name will frequently appear in that week's sightings or watch list, generating a small rush of "my moment was noticed."

### Properties
Property purchases (especially large multi-buys or consolidations) appear in Market Notes.

## Sample Issue Excerpt (for voice calibration)

```
THE LEDGER
Issue No. 47 • 13 April 2026
From somewhere between Nice and Montecito.

THE COLUMN

It has now been three weeks since Charles Pemberton said whatever it was he 
said about Amara Okonkwo on that podcast, and while neither party has deigned 
to publicly acknowledge the incident, we note that both were at Art Basel Miami 
and both were somehow never in the same room. A choreography of avoidance is a 
kind of confirmation.

Elsewhere on the circuit: Sasha Volkov remains in Monaco, which is hardly news, 
except that his *Mestre* was spotted provisioning for a longer voyage than his 
usual summer hop. Hinterland rumors suggest Mustique. We shall see.

Congratulations are due to our own frequent-flyer, who added a Carré d'Or 
penthouse to a portfolio that already spans three continents. The property in 
question last traded in 2019. We trust the mirrored ceilings of the previous 
owner have been, as is custom, removed.

Naomi Tanaka's longevity clinic is now, we are told, accepting referrals. We 
are also told the waitlist is approaching that of the Wolseley on a Thursday. 
Make of that what you will.

THE SIGHTINGS
— Pierre Larousse, Frieze preview tent. Wearing something green.
— Khalid Al-Rashid, Royal Ascot pre-party. First sighting in seven weeks.
— Rico Alvarez + Dmitri Kozlov, LIV Miami. Loud.
— Our JETSTREAM reader, Amansala opening. Briefly.

FEATURED PHOTO
[image: yacht-sunset-monaco]
*Mestre, at rest. One suspects she does not remain so for long.*

THE WATCH LIST
1. Amara Okonkwo — Had the week's best seat at the Yacht Club, and the week's 
   best silence.
2. The JETSTREAM reader — A quiet acquisition that wasn't, quite.
3. Naomi Tanaka — Turning down invitations is the new attending.
4. Sasha Volkov — Still Monaco. Always Monaco.
5. Rico Alvarez — Three parties, three cities, three matching shirts.

MARKET NOTES
— A four-bedroom above Larvotto traded for $58M. No name attached but we have 
  our suspects.
— *Poseidonia* was seen bunkering in Palma. A very long way from Pietro Russo's 
  usual April perch.

THE WEEK AHEAD
Monaco Grand Prix weekend begins Thursday. The paddock will include, by our 
count, at least seven people reading this. Royal Ascot follows closely. Those 
with Enclosure invitations, do try to dress the part — last year's attempts 
were noticed.

EDITOR'S NOTE
We have been asked, repeatedly, whether we ever tire of writing about the same 
twenty people. We do not. You are, all of you, inexhaustible.
```

This voice is the target. Tama — if you want me to adjust tone, dial it up/down in cattiness, more American vs. British, let me know and I'll revise the system prompt.

## Cost

Gossip generation is **Sonnet-class** — requires world awareness and voice consistency.

- One issue/week = ~4 issues/month
- ~3000 tokens input + ~1500 tokens output per issue
- Sonnet pricing ≈ $0.08 per issue
- **Total: ~$0.30/month**

Trivial. This is the best dollar you'll spend.

## Build Order

Insert as **Phase 9.7: Gossip Column** (after Narrative Engine, before Polish).

Tasks:
1. Extend Dexie schema with `gossipIssues`
2. Curate 30-50 stock images under `/public/imagery/ledger/` with tags
3. Build `/lib/gossip-engine.ts` with generation orchestration
4. Build `/api/ai/gossip-weekly` route handler
5. Implement `gatherWeekMaterial()` pulling from flights, events, attendances, purchases, arc beats, persona states
6. Build `/ledger` archive page
7. Build `/ledger/[issueId]` reader page with full editorial styling
8. Add Command Center preview card for new issues
9. Wire notifications on publication
10. Add prestige effects for Watch List appearances
11. Test: advance sim time 4 weeks, verify 4 distinct issues are generated with appropriate references to interim activity

## Why This Is Next-Level

The Ledger is the feature that turns passive observation into **anticipation**. After a few weeks of play, you'll start making decisions with the Ledger in mind:
- "I should go to this event — it'll be in the column"
- "I wonder if Khalid's recovery will be noted this week"
- "I can't believe they called me out for the Basel thing"

Your actions become **performance for an imagined audience**. And that audience — gossipy, informed, slightly judgmental, always watching — is exactly what the billionaire fantasy is about.
