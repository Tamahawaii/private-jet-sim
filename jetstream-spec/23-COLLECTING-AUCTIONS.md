# JETSTREAM — Collecting & Auctions

The real billionaire activity that's missing: collecting. Art, watches, cars, wine. Commissioning a yacht. Bidding at Sotheby's. Getting outbid by Pierre Larousse on a contemporary piece. This system adds collecting mechanics and a live auction house to JETSTREAM.

## The Problem It Solves

Properties and aircraft are big infrastructure purchases. But the *weekly* purchase behavior of the ultra-wealthy is acquisition of smaller objects of taste: a Basquiat at Phillips, a Patek Philippe at Phillips Watches, a '62 Ferrari 250 GTO at RM Sotheby's Monterey. These purchases create identity, signal taste, and compound into collections that become part of who you are.

JETSTREAM's collecting layer adds:
- **Five collection categories**: Art, Watches, Cars, Wine, Commissions
- **A live auction system**: weekly events where you bid against friends
- **A static gallery**: see your collections grow
- **Commissioned pieces**: bespoke builds that take sim-months to complete

## The Five Collections

### 1. Art
The most important collection for status. Contemporary pieces, modern masters, blue-chip.

**Categories**:
- Contemporary (Richter, Wool, Prince, Sherman, KAWS)
- Modern Masters (Picasso, Basquiat, Warhol, Rothko)
- Post-War (Twombly, Johns, Pollock, de Kooning)
- Emerging (generic Claude-generated artists with fictional bios)
- Photography (Sherman, Cindy, Mapplethorpe, Gursky)

**Price range**: $50k (emerging) to $120M (blue-chip masterpieces)

### 2. Watches
A quieter flex. Vintage Patek, Rolex Daytonas, F.P. Journe, independents.

**Categories**:
- Vintage Rolex (Paul Newman Daytonas, Submariners)
- Patek Philippe (perpetual calendars, minute repeaters, Nautilus)
- F.P. Journe (Chronomètre Souverain, Resonance)
- Audemars Piguet (Royal Oak, especially vintage)
- Independents (Rexhep Rexhepi, De Bethune, Voutilainen)
- Grand Complications (one-off pieces from auction houses)

**Price range**: $35k to $35M (vintage Patek grail pieces)

### 3. Cars
The garage collection. For the motorsport-inclined personas especially.

**Categories**:
- '50s-'60s Ferrari (250 series, 275 GTB, Testarossa)
- Modern Hypercars (McLaren F1, Pagani Zonda, Bugatti Chiron)
- Vintage Porsche (Carrera RS, 911 R, 959)
- Le Mans Prototypes (Ford GT40, Porsche 917)
- One-offs and prototypes
- Classic Americana (Shelby Cobras, Hemi 'Cudas, split-window Corvettes)

**Price range**: $250k to $70M (prototype/one-off Ferraris)

### 4. Wine
The cellar. Less flashy, accumulates silently.

**Categories**:
- Burgundy (DRC, Leroy, Coche-Dury, Roumier)
- Bordeaux (first growths, Le Pin, Petrus)
- California cult (Screaming Eagle, Harlan, Scarecrow)
- Champagne (vintage Krug, Dom P2, Salon)
- Aged fortified (Madeira, 1787 Lafite)

**Price range**: $500/bottle to $250k/bottle (auction-house grails)

### 5. Commissions
Bespoke pieces made for you, taking sim-time to complete.

**Types**:
- **Bespoke timepiece** (F.P. Journe commission, 18 sim-months, $800k-3M)
- **Commissioned portrait** (contemporary artist paints you, 12 sim-months, $250k-2M)
- **Custom car build** (Singer 911 restoration, Pagani coachbuilt, 24 sim-months, $1.5M-12M)
- **Commissioned yacht refit** (major customization, 36 sim-months, $25M-100M)
- **Private commission sculpture** (artist creates for your property, 18 sim-months, $500k-5M)
- **Couture wardrobe** (full seasonal wardrobe from a house, 6 sim-months, $400k-1.5M)

Commissions have progress states: *Ordered → In Progress → Near Completion → Delivered*. You get updates (DM-like notifications) as they progress.

## The Auction House

New section of app: **Auctions** (accessible from main nav or under Acquisitions).

### How Auctions Work

**Weekly Live Auctions**: Every Thursday sim-time, 3-7 auction lots become available for bidding, modeled after real auction houses:
- **Christie's Contemporary Evening Sale**
- **Sotheby's Magnificent Jewels** (future, if jewelry added)
- **Phillips Watches New York**
- **RM Sotheby's Monterey** (annual August event)
- **Acker Fine Wine**

Each lot has:
- Item name, provenance, description
- Stock image
- Estimated price range ($X – $Y)
- Auction start price (opening bid)
- **Auction close time** (24 sim-hours after opening)
- **Friend bidders**: 2-4 AI personas interested in this lot

### Bidding Flow

#### Opening a lot
- [BTN] Lot card on Auctions page
- Opens detail view: full description, zoomed image, provenance, estimate range
- Shows: current high bid, bidder (public: "Private collector" if friend, "$X" if player), auction close time
- **[BTN] "Place Bid"** — enter amount, must be > current bid by minimum increment

#### Bidding against friends
- When you place bid, Claude evaluates whether friend bidders counter
- Bidding is **asynchronous** — friends may counter immediately, or 2 sim-hours later, depending on their persona logic
- Notification when outbid: *"You've been outbid on [Lot]. New high: $X by [private/friend]."*
- You can re-bid up to the close time

#### Winning
- At auction close, high bidder wins
- If player: lot added to their collection
- If friend: lot enters that friend's collection (visible on their profile)
- Net worth deducted at close
- Transaction recorded

#### Rivalry dynamics
- Pierre Larousse competes heavily in art auctions. If you bid on a contemporary piece he wants, he'll aggressively counter.
- Khalid bids on bloodstock art (horse paintings, Stubbs).
- Amara has quiet, strategic bidding — she doesn't get into wars but wins what she wants.
- Dmitri overbids on flashy pieces, often getting publicly mocked in the Ledger.

### Private Sales

Not all purchases are auctions. Sometimes you get a **private sale offer** — a dealer or Claude-generated gallery reaches out directly.

**Example**: *"A piece has become available through a private sale. Robert Longo, 'Men in the Cities' series, 1982. Asking: $2.8M. Dealer: Gagosian."*

[BTN] Accept | [BTN] Decline | [BTN] Counter-offer ($X lower)

Counter-offers: dealer responds (Claude evaluates). Accepts, rejects, or counters back.

## Data Model

```typescript
type CollectionItem = {
  id: string;
  playerId: "player";
  category: "art" | "watches" | "cars" | "wine" | "commissions";
  
  name: string;
  artist_or_maker?: string;           // "Jean-Michel Basquiat", "F.P. Journe"
  year?: number;                      // created/made year
  provenance?: string[];              // ownership history (flavor text)
  description: string;
  imageUrl: string;
  
  acquiredAt: ISODateString;
  acquisitionType: "auction" | "private_sale" | "commission" | "gifted";
  acquisitionPrice: number;
  currentValueUSD: number;            // appreciates over time for most categories
  
  // Commission-specific
  commissionStatus?: "ordered" | "in_progress" | "near_completion" | "delivered";
  commissionProgressPercent?: number;
  commissionExpectedDeliveryAt?: ISODateString;
  
  // Display/storage
  displayLocation?: string;           // "Monaco penthouse", "Aspen chalet", "Storage"
  
  // Metadata
  prestigeValue: number;              // 0-100, contributes to overall prestige
  publiclyKnown: boolean;             // do friends know you have this?
};

type AuctionLot = {
  id: string;
  auctionHouse: string;               // "Christie's", "Phillips", "RM Sotheby's"
  saleName: string;                   // "Contemporary Evening Sale, November 2026"
  
  item: Omit<CollectionItem, 'acquiredAt' | 'acquisitionType' | 'acquisitionPrice' | 'currentValueUSD' | 'displayLocation' | 'publiclyKnown'>;
  estimateLow: number;
  estimateHigh: number;
  openingBid: number;
  currentHighBid: number;
  currentHighBidder: PersonaID | "player" | null;
  minimumBidIncrement: number;        // typically 5-10% of current bid
  
  auctionOpensAt: ISODateString;
  auctionClosesAt: ISODateString;
  
  interestedBidders: PersonaID[];     // personas who may counter
  bidHistory: AuctionBid[];
  
  status: "upcoming" | "live" | "closed";
  winnerPersonaId?: PersonaID | "player";
  winningBid?: number;
};

type AuctionBid = {
  id: string;
  lotId: string;
  bidder: PersonaID | "player";
  amount: number;
  placedAt: ISODateString;
};

type PrivateSaleOffer = {
  id: string;
  item: Omit<CollectionItem, 'acquiredAt' | 'acquisitionPrice'>;
  askingPrice: number;
  offeredBy: string;                  // "Gagosian", "Private dealer via Saanvi"
  offeredAt: ISODateString;
  expiresAt: ISODateString;
  status: "pending" | "accepted" | "declined" | "negotiating" | "expired";
  playerCounterOffer?: number;
};
```

## Dexie Schema

```typescript
this.version(7).stores({
  // existing...
  collectionItems: 'id, category, acquiredAt, commissionStatus',
  auctionLots: 'id, status, auctionClosesAt',
  auctionBids: 'id, lotId, placedAt',
  privateSaleOffers: 'id, status, expiresAt',
});
```

## Generation Logic

### Weekly Auction Lots

Every Thursday sim-time, `generateWeeklyAuctions()` runs:

```typescript
async function generateWeeklyAuctions(now: Date): Promise<void> {
  // Determine what type of auction this week
  const thisWeekAuctionType = pickAuctionType(now);
  // (e.g., Christie's Contemporary in May, RM Monterey in August, etc.)
  
  const lotCount = randomBetween(3, 7);
  
  for (let i = 0; i < lotCount; i++) {
    const lot = await generateLot(thisWeekAuctionType, now);
    await auctionRepo.create(lot);
  }
  
  // Notify player
  await notificationRepo.create({
    type: 'system',
    title: 'New at ' + thisWeekAuctionType.houseName,
    body: `${lotCount} lots live now.`,
    linkTo: '/auctions',
  });
}
```

### Lot Generation

Uses Claude (Haiku for speed) to generate realistic lot entries:

```
Generate an auction lot for {auctionHouseType}.

Pick a plausible item within these categories: {categories}.
Price range for this house: {priceRange}.

Generate:
- Name (e.g., "Untitled, 1982" for Basquiat, "Perpetual Calendar Ref. 1518 in Steel" for Patek)
- Artist/maker
- Year
- Provenance (3-5 lines of ownership history, some plausibly fictional)
- Description (2-3 sentences, auction-catalog voice)
- Estimate low/high (realistic for the category)
- Which personas would plausibly bid (2-4, based on their known taste from this list: ...)

Return JSON.
```

### Friend Bidding

When player places a bid, evaluate whether interested friends counter:

```typescript
async function evaluateFriendCounters(lot: AuctionLot, playerBid: number): Promise<void> {
  for (const personaId of lot.interestedBidders) {
    const persona = await personaRepo.get(personaId);
    
    // Call Claude to decide
    const response = await claudeBidDecision({
      persona,
      lot,
      currentBid: playerBid,
      estimateHigh: lot.estimateHigh,
    });
    
    if (response.willBid) {
      // Schedule counter-bid 10min - 6 hours from now (sim time)
      const delayMinutes = randomBetween(10, 360);
      schedulePersonaCounterBid(personaId, lot.id, response.bidAmount, delayMinutes);
    }
  }
}
```

Claude's bid decision prompt:
```
You are {persona.displayName}. An auction is live:
Lot: {item name, by artist, year}
Current bid: ${currentBid}
Estimate: ${low} - ${high}
Your interest level: {taste match score}

Decide:
- Do you bid? (willBid: bool)
- If yes, how much? (above current by minimum increment, up to estimateHigh * 1.3 max)
- How aggressively? (depends on your personality - Pierre aggressive on art, Amara strategic)

Return JSON: { willBid, bidAmount, reasoning }
```

## UI: The Auction House

### `/auctions` Main Page

Layout:
- **Live Now** section: current week's open auctions, grouped by sale
- **Upcoming** section: next week's lots (teaser — can't bid yet)
- **Closed Recent** section: last 2 weeks of closed auctions, who won what
- **My Bids** section: lots where you currently hold a bid

### Lot Detail Page

Full-width hero image, item details, provenance text, estimate range, **live bid widget**:
- Current high bid + bidder (public or "Private collector")
- [INPUT] Your bid ($)
- [BTN] "Place Bid"
- Time remaining (countdown)
- Bid history (expandable)

### [MODAL] Confirm Bid

> *"Bid ${amount} for [Lot]? This will be binding — if you're the high bidder at close, the purchase completes automatically."*
> [BTN] Cancel | [BTN] Confirm Bid

### Being Outbid Flow

Notification: *"You've been outbid on [Lot]. New high: ${amount}."*  
Clicking opens lot page with quick re-bid option.

### Winning Flow

On auction close:
- [MODAL] "Congratulations — you won [Lot] for ${amount}."
- Item added to collection
- Transaction recorded
- Possible friend reactions: Pierre DM if he was bidding aggressively ("You paid too much, mate."), or Amara in Ledger sighting ("Spotted: JETSTREAM reader made a quiet acquisition at Christie's Thursday...")

## UI: The Gallery (My Collection)

New route: `/gallery` or under Profile.

### Layout

**Five tabs**: Art | Watches | Cars | Wine | Commissions

Each tab:
- Grid view with images + name + acquisition date
- Sort: Newest, Most Valuable, Oldest Owned, Alphabetical
- Filter by sub-category
- Total collection value shown at top of tab

### Item Detail View

Large image, all metadata, provenance, appreciation chart, **Display Location** (which of your properties the item "lives" at).

#### [BTN] "Change Display Location"
Picker of your owned properties. Each property can display N items (based on sqft).

#### [BTN] "Sell at Auction"
Consigns the item to next week's relevant auction. Receive ~85% of current value after fees.

#### [BTN] "Sell Privately"
Generates a private sale offer scenario. Slower, possibly higher price.

#### [BTN] "Lend to Exhibition" (v2 feature)
Loan piece to a museum — prestige boost, temporary unavailable for display.

## Integration with Existing Systems

### Prestige
Each item contributes to prestige based on value + cultural significance:
- Blue-chip Basquiat: +25 prestige passive contribution
- Vintage Patek 2499: +15
- Ferrari 250 GTO: +40 (rarity flex)
- Wine collection aggregate: +5-20 based on value
- Commissions: +10-30 based on scope

Surface as: "Your collection contributes +187 to your prestige."

### Friends' Collections
Each persona has pre-seeded collections visible on their profile:
- Sasha: classic art, vintage Patek, classic Italian cars
- Pierre: contemporary art (extensive), emerging artists
- Khalid: equestrian-themed art, vintage F1 cars
- Alessandro: classic Italian cars, Italian masters, Italian wines
- Amara: contemporary, Basquiat-era specifically
- Dmitri: flashy modern art, hypercars, showy watches

Create natural conversation starters: *"How's your collection coming? I saw you won the Longo at Phillips."*

### The Ledger
Acquisitions appear in Market Notes section:
> *"A strong week at Phillips Watches: the Paul Newman Daytona fetched $3.1M, reportedly to a West Coast collector."*

Big wins may be featured explicitly.

### Narrative Engine
Collecting rivalries can become arcs:
- **"The Feud of the Contemporary"** — Player vs Pierre, escalating auction battles over similar pieces for 6 weeks
- **"The Ferrari Hunt"** — Alessandro racing player to acquire a specific '63 250 GTO coming to Monterey

### Properties
Owning trophy pieces displayed at your Carré d'Or penthouse makes the property a "museum-grade" residence. Visible on property detail: *"Displayed: Basquiat 'Untitled, 1982,' Richter Abstraktes Bild 637-3..."*

## Seeded Starter Collection

Give the player 3-5 starter pieces to make Gallery immediately interesting:
- **1x mid-tier contemporary art piece** ($800k, generic "emerging artist" from Claude)
- **1x vintage Rolex Submariner** ($95k)
- **1x classic Porsche 911 Carrera RS** ($1.2M)
- **Small wine collection** (curated starter cellar, $120k total value, 40 bottles)
- No commissions — those come later

This establishes taste baseline so growth feels real.

## Cost to Build

Collecting system has real scope:
- ~600 lines of data structure + generation logic
- Claude API: ~$3-5/month additional (auction lot generation, bid decisions, rivalry commentary)
- Stock imagery needed: 100+ images for items (art reproductions, watch catalog shots, car photos, wine labels) — use Unsplash/Pexels + auction house public catalogs

## Build Order

Insert as **Phase 13: Collecting & Auctions** (after all world-alive layers).

Tasks:
1. Extend Dexie schema
2. Seed initial starter collection (3-5 items)
3. Seed persona pre-existing collections
4. Build `/lib/auction-engine.ts` with weekly generation
5. Build `/lib/collection-engine.ts` for value tracking/appreciation
6. Build Claude endpoints (lot generation, bid decisions, private sale offers)
7. Build `/auctions` main page + lot detail + bid flow
8. Build `/gallery` with 5 tabs and item detail
9. Implement commission system (progress states, deliveries)
10. Wire collection items into prestige calculations
11. Wire acquisitions into Ledger Market Notes
12. Integrate with narrative engine for rivalry arcs
13. Integrate with property system for displayed pieces
14. Test: run 4 weeks of auctions, verify friend bidders work, private sales offered at reasonable cadence

## Why This Matters

Collecting is how billionaires *think about themselves*. Your portfolio signals taste better than your net worth. Adding this layer to JETSTREAM:
- Creates weekly anticipation (Thursday auctions)
- Adds concrete rivalry mechanics (outbidding friends)
- Gives your properties a reason to exist beyond location (displaying work)
- Adds another year-in-review dimension (acquisitions over time)
- Extends Ledger material dramatically (auctions are prime gossip)

This is the feature that makes JETSTREAM feel like a real cultural world, not just a transport-and-event game.
