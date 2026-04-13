# JETSTREAM — Year in Review

Every year of sim time deserves a pause. This system generates a beautiful, scrollable, shareable retrospective of your year in JETSTREAM — every trip, every event, every purchase, every friendship milestone, every gossip column mention — organized as a magazine-quality "year in my life" feature.

This is the feature that makes you want to keep playing across years. Not because it gamifies — because it makes you want to *see what the next year looks like*.

## The Problem It Solves

Even with narrative arcs and gossip columns, your *own* story doesn't accumulate into something you can step back and *look at*. After a full sim-year of play, you want a moment where the app hands you the year as a gift — a visual artifact you can scroll through, remember, and compare to future years.

Spotify Wrapped for billionaires.

## Core Concept

Every 365 sim-days from player creation date (anniversary), a **Year in Review** issue is generated. It's a long-form, richly-designed retrospective covering:

- Your movements (cities, miles, flights)
- Events attended + prestige gained
- Friendships — who you grew closest to, who drifted
- Major acquisitions (properties, yachts, jets, collection pieces)
- Arc participation
- Ledger mentions aggregated
- Hosting summary (parties thrown)
- Top personas (most-traveled-with, most-hosted)
- Financial overview (net worth start → end, biggest transactions)
- A personal editorial essay reflecting on the year

It's generated once, permanently archived, and accessible forever.

## The Structure

Each Year in Review has **9 sections**, magazine-style:

### 1. Cover
- Large serif "YEAR ONE" / "YEAR TWO" / etc.
- Hero photo (Claude-selected from the year's stock imagery based on dominant mood)
- Subtitle: Claude-generated one-liner essence of the year — *"The year you moved to Monaco."* / *"The year you met Elena."* / *"The quiet year."*
- Date range

### 2. By the Numbers
Infographic-style stats (no gamification — editorial infographic):
- Flights taken / Miles flown / Hours in the air
- Countries visited / Cities landed in
- Events attended (with prestige tier breakdown)
- Properties acquired
- Yacht voyages
- DMs sent + received
- Auction lots won
- Hosting events thrown
- Net worth delta

### 3. The Map
Interactive scrollable world map showing every location you visited, with clustering for frequent visits. Draws a visual "shape" of your year.

- Hover on a city: "Visited 4 times. First: March. Highlights: Met Gala, Sasha's 40th."

### 4. The People
Who you grew closest to, who you drifted from:

- Top 3 friends (by friendship delta or total interaction)
- Notable new depths: "Your friendship with Elena grew from 45 → 85 this year"
- Quiet losses: "You and Charles have grown distant"
- Traveled most with: {persona}
- Hosted most often: {persona}
- Their birthdays you remembered (or didn't)

### 5. The Moments
Editorial highlights — 5-7 specific moments from the year, each as a card:
- Event: "Monaco Grand Prix, May"
- Photo (stock)
- Claude-generated 2-3 sentence recollection
- Key detail: "Attended with Sasha. Stayed at your Carré d'Or penthouse. Mentioned in The Ledger."

These are the memories Claude decides were most resonant based on:
- Prestige earned
- Arc participation
- First-time events
- Rare hosts/attendees
- Ledger mentions

### 6. The Collection
Acquisitions summary:
- Properties: added [list with locations]
- Aircraft / yachts: added [list]
- Collection: N art pieces, N watches, N cars, etc.
- Auction highlights: biggest wins, narrow losses to rivals
- Commissions delivered this year

### 7. The Arcs
Narrative arcs you participated in or witnessed:
- Brief summaries of closed arcs
- "Still unfolding": active arcs that will continue into next year

### 8. The Essay
A single page of **Claude-generated editorial prose** — 400-600 words reflecting on the year's meaning. Written in a literary, slightly wistful voice. References specific moments, makes connections the player might not have noticed:

> *"It was the year you discovered you love Monaco in October — not in May, when everyone else is there, but in the quiet shoulder weeks. Elena noticed first; she'd been saying it for years. Somewhere between the September Frieze opening and Khalid's birthday dinner at the Metropole, you agreed with her. It was also the year you stopped pretending to like fashion week..."*

This is the section that will make you actually pause.

### 9. Looking Ahead
Subtle setup for the next year:
- Active arcs continuing
- Upcoming events in first month of new year
- Friendships at inflection points
- Active commissions still in progress

## Data Model

```typescript
type YearInReview = {
  id: string;                          // "year-1", "year-2"
  yearNumber: number;
  startDate: ISODateString;
  endDate: ISODateString;
  generatedAt: ISODateString;
  
  cover: {
    title: string;                     // "YEAR ONE"
    subtitle: string;                  // Claude-generated essence
    heroImageUrl: string;
  };
  
  byTheNumbers: {
    flightsCount: number;
    milesFlown: number;
    hoursInAir: number;
    countriesVisited: number;
    citiesLanded: number;
    eventsAttended: { count: number; tier5: number; tier4: number; tier3: number };
    propertiesAcquired: number;
    yachtVoyages: number;
    dmsSent: number;
    dmsReceived: number;
    auctionLotsWon: number;
    eventsHosted: number;
    netWorthStart: number;
    netWorthEnd: number;
  };
  
  mapVisualization: {
    visits: { city: string; coords: Coordinates; count: number; highlights: string[] }[];
  };
  
  thePeople: {
    topThreeFriends: { personaId: PersonaID; startFriendship: number; endFriendship: number; note: string }[];
    traveledMostWith: PersonaID;
    hostedMostFor: PersonaID;
    notableGrowth: { personaId: PersonaID; delta: number; moment: string }[];
    quietLosses: { personaId: PersonaID; delta: number }[];
    birthdaysRemembered: PersonaID[];
    birthdaysMissed: PersonaID[];
  };
  
  theMoments: Moment[];              // 5-7 standout moments
  
  theCollection: {
    propertiesAdded: { id: string; address: string; city: string }[];
    jetsAdded: { model: string; tailNumber: string }[];
    yachtsAdded: { model: string; hullId: string }[];
    collectionItems: { category: string; count: number; totalValue: number }[];
    biggestAuctionWin: { lot: string; price: number; house: string };
    narrowLosses: { lot: string; lostTo: PersonaID; finalPrice: number }[];
    commissionsDelivered: { name: string; deliveredAt: string }[];
  };
  
  theArcs: {
    participatedIn: { arcId: string; title: string; summary: string; resolved: boolean }[];
    witnessedPublic: { arcId: string; title: string; summary: string }[];
  };
  
  theEssay: string;                  // 400-600 word editorial
  
  lookingAhead: {
    continuingArcs: { arcId: string; title: string }[];
    upcomingEvents: { eventId: string; name: string; date: string }[];
    relationshipsAtInflection: { personaId: PersonaID; note: string }[];
    activeCommissions: { name: string; expectedDelivery: string }[];
  };
  
  viewedAt?: ISODateString;          // when player first opened it
  sharedAt?: ISODateString;          // for screenshot/share tracking
};

type Moment = {
  id: string;
  title: string;
  dateRange: { start: string; end: string };
  category: "event" | "trip" | "hosting" | "acquisition" | "milestone";
  imageUrl: string;
  description: string;                // Claude-generated 2-3 sentences
  keyDetails: string[];               // bullet points
  relatedEntityIds: { type: string; id: string }[];  // links to deeper navigation
};
```

## Dexie Schema

```typescript
this.version(8).stores({
  // existing...
  yearsInReview: 'id, yearNumber, generatedAt',
});
```

## Generation Logic

Runs automatically on app open when the player's sim-year anniversary passes.

```typescript
// /lib/year-review-engine.ts

export async function maybeGenerateYearInReview(now: Date): Promise<void> {
  const player = await playerRepo.get();
  const createdAt = new Date(player.createdAt);
  
  const yearsElapsed = differenceInYears(now, createdAt);
  const existingReviews = await reviewRepo.getAll();
  
  if (yearsElapsed > existingReviews.length) {
    // Generate the Nth review (where N is yearsElapsed)
    const newYearNumber = existingReviews.length + 1;
    const yearStart = addYears(createdAt, newYearNumber - 1);
    const yearEnd = addYears(createdAt, newYearNumber);
    
    const review = await generateYearInReview(newYearNumber, yearStart, yearEnd);
    await reviewRepo.create(review);
    
    // Fire a special notification
    await notificationRepo.create({
      type: 'system',
      title: 'Your Year in Review is ready.',
      body: review.cover.subtitle,
      linkTo: `/year-in-review/${review.id}`,
      priority: 'high',
    });
  }
}
```

### The Generation Process

Year-in-review generation is the **most expensive single Claude call** in the app — it's worth it. Uses Sonnet, 1-2 calls per year:

1. **Gather all data** from the year:
   - Every flight, voyage, booking, purchase, attendance, DM volume, arc, Ledger mention
   - All transactions
   - Friendship deltas per persona

2. **First Claude call** (structured analysis):
   Ask Claude to identify:
   - The 5-7 most resonant moments worth featuring
   - The essence of the year (subtitle)
   - Notable patterns (growth/loss in friendships)
   - What makes this year different from previous years (if any)
   
   Returns: structured data for sections 1, 4, 5

3. **Second Claude call** (essay generation):
   Given the structured analysis, write the 400-600 word editorial essay.
   
   Prompt tuned for literary, observant, slightly wistful voice. Specific references. Makes connections.

4. **Compose the full YearInReview object** from data + Claude outputs

### The Essay Prompt

```
You are writing a personal essay for JETSTREAM's Year in Review — a yearly 
retrospective the player will read once and remember.

Voice: literary, observant, slightly wistful. Think Joan Didion meets 
Air Mail. Specific details over general feelings. Make unexpected 
connections. Don't flatter. Don't sentimentalize.

Length: 400-600 words. A single flowing piece.

Rules:
- Reference specific events, places, and people by name
- Identify patterns the player may not have consciously noticed
- Acknowledge what was gained AND what was lost
- Never use words like "amazing," "incredible," "unforgettable"
- Second-person voice ("you") but restrained
- End with something that looks forward without promising

The year's essential data:
{structured summary of the year}

Key moments Claude identified:
{5-7 moments with details}

Write the essay.
```

## UI: The Year in Review Page

### Route: `/year-in-review/[id]`

### Layout (magazine reading experience)

Full-screen, scroll-driven. Each section is its own "page" — slight vertical separation, strong typography.

**Cover**: Full-viewport hero. Serif title. Hero image as background (slight dim overlay for text legibility). Subtitle appears on scroll.

**By the Numbers**: Grid of oversized number tiles. Large, mono, minimal. Not gamified — editorial infographic.

**The Map**: Embedded Mapbox with custom styling. Visited cities as glowing points. Clustering + animation on scroll (cities "appear" as user scrolls the section).

**The People**: Three big portrait cards for top friends. Smaller cards for others. Stat deltas shown as sparklines.

**The Moments**: Each moment as a full-width card. Hero image left, prose right (on desktop). Stacked on mobile. Parallax-y on scroll.

**The Collection**: Grid of thumbnails — properties, collection items. Click-through to detail.

**The Arcs**: Timeline-style rendering. Each arc is a branch with beats as nodes.

**The Essay**: Centered column. Narrow width. Large serif type. Ample whitespace. Just read.

**Looking Ahead**: Simple list-style section. Understated.

### Navigation & Interactions

- Top sticky: progress bar showing scroll position through sections
- Table of contents button (opens drawer with jump-to-section)
- [BTN] "Share" (top right) — generates shareable image of the cover + essence (for personal screenshot use)
- [BTN] "Archive" (returns to all year-in-review archive)

### First-Time Viewing (Ceremony)

When a new Year in Review is generated, the app creates a moment:

- Command Center becomes replaced with a **full-screen modal** on next open:
  - "Your first year in JETSTREAM is complete."
  - [BTN] "Read now" (primary)
  - [BTN] "Later" (secondary, dismisses for now)
- Reading the review is a single moment. After first view, it moves to the archive but remains accessible forever.

### Archive Page: `/year-in-review`

List of all generated reviews. Each as a large card with cover image + title + subtitle. Tappable to open.

Adds "My Years" sidebar in Profile for quick access.

## Subtle Countdown

In the final 30 days before a year anniversary, Command Center shows a small indicator: *"Year One concludes in 23 days."* Builds anticipation.

## Integration with Other Systems

### Narrative Arcs
Closed arcs from the year get their own beat in the review. Active arcs are noted in "Looking Ahead."

### The Ledger
All Ledger issues from the year are accessible via review — a compiled view: *"Your Year in the Ledger"* (aggregated mentions, sightings).

### Collection
The collection as of year-end has a snapshot comparison — *"Started the year with 4 items, ended with 23."*

### Taste Profile
The essay references patterns detected in the taste profile: *"You've shown a strong preference for Mediterranean summers..."*

## Monthly Digest (Between Years)

Between annual reviews, a lighter **Monthly Digest** is generated automatically — a much shorter version (80-150 words) summarizing the month. Shown on Command Center on the 1st of each sim-month.

Example:
> *"March was a Paris month. You were there three times. Frieze LA, Oscars week in LA, and a week at your Avenue Montaigne place. Naomi came through twice. You bought the Longo at auction, narrowly beat Pierre. Prestige up 18. Elena's gone quiet — it's been three weeks."*

Low cost, high continuity — keeps year-in-review momentum between the big annual moment.

## Cost

Year in Review generation: ~$0.30-0.50 once per year per player. Trivial.

Monthly Digest: ~$0.05 per month = $0.60/year.

**Total: ~$1/year** for both.

## Build Order

Insert as **Phase 14: Year in Review** (near the end — needs all other systems populated).

Tasks:
1. Extend Dexie with `yearsInReview` + `monthlyDigests` tables
2. Build `/lib/year-review-engine.ts` with data aggregation
3. Build Claude prompts for structured analysis + essay
4. Build `/year-in-review/[id]` page with full magazine layout (this is a design-heavy screen)
5. Build archive `/year-in-review`
6. Wire ceremony modal on first generation
7. Implement monthly digest system
8. Add countdown indicator to Command Center in final month
9. Test: fast-forward exactly 365 days, verify generation triggers, Claude essay voice is right, layout renders well on mobile

## Why This Matters

This is the feature that **makes you want to play for years**.

Without Year in Review, sim-years blur together. With it, each year becomes an artifact — something you can scroll through years later and remember: *"That was the year I moved to Monaco."* *"That was the year Elena's dad died."* *"That was the year I finally beat Pierre at the Basquiat auction."*

The review gives your play a **shape**. It tells you you've lived through something. And it quietly motivates you to make the next year even better.

This is the feature that moves JETSTREAM from "a game I'm playing" to "a life I'm building."
