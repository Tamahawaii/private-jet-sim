# JETSTREAM — Economy & Progression

## Philosophy

The player should feel wealthy but not infinite. Spending should feel like *taste*, not grinding. Progression is social (prestige) and experiential (places visited, events attended), not numeric grind.

## Starting State

- **Net Worth**: $79,700,000,000 ($79.7B — matches current UI)
- **Prestige**: 200 (Tier 3 access — can attend most events except Tier 4+ invite-only)
- **Starting Fleet**: 5 aircraft (per 07-AIRCRAFT-CATALOG.md)
- **Home Base**: HNL (Honolulu)

## Money Out (Expenses)

### Per-Flight Costs
Computed at flight launch, locked in:
```
fuel_cost = duration_hours × burn_GPH × $6.50/gal
crew_cost = duration_hours × $800/hr
nav_fees = $1,200 (IFR + handling flat)
fbo_fees = $2,500 (arrival + departure FBO handling)
wear_tear = duration_hours × $450
```

**Typical costs** (for reference):
- HNL → LAX (Phenom 300, 5.2 hrs): ~$13,500
- HNL → LBL (Global 8000, 7.9 hrs): ~$17,725 (matches your current UI 👍)
- HNL → NRT (G700, 8.5 hrs): ~$22,000
- JFK → CDG (BBJ 787, 7 hrs): ~$58,000

### Monthly Burn (runs automatically each sim-month)
Per aircraft:
- Hangar fee: $8k/mo (light) to $45k/mo (airliner)
- Insurance: 0.5% of hull value / year = hull × 0.0004 / month
- Maintenance reserve: $2k-15k/mo by category
- Crew retainers (pilot + copilot + cabin): $18k-85k/mo

**Example monthly burn for starting fleet**: ~$680k/month
- Phenom 300: ~$45k
- Citation X: ~$95k
- Falcon 900: ~$120k
- Global 8000: ~$185k
- BBJ 787: ~$235k

Plus lifestyle:
- Executive staff (household, security): $300k/month flat
- "Miscellaneous lifestyle" abstraction: $200k/month

**Total baseline burn**: ~$1.2M/month = $14.4M/year

Compared to $79.7B net worth, this is 0.018% annually. Feels wealthy, not broke.

### Event Tickets
Paid at point of attendance (see 05-EVENTS-CALENDAR.md).
Range: $15k–$250k per event, typical $30k–$80k.

### Resort Bookings
```
cost = nights × nightlyRate × suiteMultiplier + sum(experiences)
```
Typical stay: $12k–$45k for a 3-4 night stay, or $80k+ for presidential suite + full experience package.

### Aircraft Purchases & Module Upgrades
Per 07-AIRCRAFT-CATALOG.md. One-time costs, assets show on balance sheet.

## Money In (Income)

### Investment Yield (Passive)
5% annualized on idle capital (very conservative for someone with $79B).
- Calculated monthly: `yield = netWorth × 0.05 / 12`
- Credits automatically on the 1st of each sim-month
- Shows as transaction type `investment_yield`

Starting monthly yield: ~$332M. This more than covers baseline burn — the player can sustain lifestyle indefinitely. That's intentional; the point isn't to run out.

### Charter Out Aircraft (Active)
Any aircraft in `parked` state can be listed for charter.
- Revenue: $8k–$25k per idle-day (by aircraft category)
- Toggleable per aircraft ("Charter Available" switch)
- Randomly generates bookings (30-60% of available days get chartered)
- Aircraft shows as "chartered out — unavailable" for the duration
- Small prestige penalty (-1) for budget-tier charters, +prestige for luxury charters

### Appearance Fees (Prestige 500+)
Once prestige hits 500, high-tier events may offer appearance fees:
- You attend → event credits $50k–$250k to your account
- Models your fame entering the equation
- Claude-generated flavor text: "Art Basel's PR team has arranged a €150,000 appearance honorarium."

### Sale of Aircraft
Sell your planes anytime at 75-85% of current market value (depreciation).
Maintains asset liquidity.

## Prestige System

Range: 0 to 1000. Starts at 200.

### Gaining Prestige

- Attending Tier 1 event: +1
- Attending Tier 2 event: +3
- Attending Tier 3 event: +6
- Attending Tier 4 event: +12
- Attending Tier 5 event: +25
- Staying at Tier 3 resort: +2/stay
- Staying at Tier 4 resort: +4/stay
- Staying at Tier 5 resort: +8/stay
- Owning a Tier 5 prestige aircraft (G700, G800, BBJ 787, ACJ): +15 passive contribution per owned
- Installing Hermès Maison Fit module: +40
- Being invited to group chats by friends: +5 each
- Friend reaching +80 friendship with you: +10

### Losing Prestige

- Missing a Tier 4+ event you were invited to: -5
- Declining a friend's in-person invite repeatedly: -2 per decline after first
- Selling all flagship aircraft: -20
- Getting caught in a Claude-generated "rivalry drama" moment: -3

### Prestige Tiers & Unlocks

- **0–199** — **Rising**: Tier 1-2 events only
- **200–399** — **Established**: Tier 3 events (Monaco paddock, Art Basel, etc.)
- **400–599** — **Serious Circle**: Tier 4 events (Met Gala adjacent, Cannes, Royal Ascot)
- **600–799** — **Rarified**: Unlocks Davos invitation events, Met Gala
- **800–1000** — **The Inner Ring**: Sun Valley, private-plane-only gatherings, secret summits

## Friendship as Secondary Currency

See `personaState.friendshipWithPlayer` in 02-DATA-MODELS.md.

Friendship unlocks:
- Joint event attendance (travel together in same plane)
- Invitations to private parties (not on the public event calendar)
- Access to their properties (e.g., "Come stay at my place in Capri")
- Occasional collab opportunities ("Let's invest in this together" — flavor only in v1)

## Spending Patterns (Expected)

A healthy session might look like:
- Monthly yield: +$332M
- Monthly burn: -$1.2M
- One flight: -$17k
- Event ticket: -$60k
- 4-night resort stay: -$18k
- **Net delta: +$329M/month**

Even at aggressive spending (buying a $75M aircraft, installing $10M of modules, monthly events and resort stays), the player's net worth still grows. This is intentional — the fantasy is abundance. But the *relative* cost of choices still matters (do I spend on the Hermès module or a Global 8000?).

## UI Surface Area

Economy surfaces on:
- **Top-right nav pill**: current net worth, live-updated
- **Command Center hero**: net worth + monthly delta trend sparkline
- **Profile page**: net worth chart over time (line chart), transaction history
- **Flight planner review step**: cost preview
- **Resort booking**: total preview
- **Event detail**: ticket price if attending
- **Transaction ledger** (accessed from Profile): full history, filterable by type

## Implementation

```typescript
// /lib/economy.ts

export async function applyMonthlyBurn(now: Date): Promise<void> {
  const lastBurnTx = await transactionRepo.lastOfType('monthly_burn');
  const lastBurnDate = lastBurnTx ? new Date(lastBurnTx.occurredAt) : /* account created */;
  
  const monthsElapsed = differenceInMonths(now, lastBurnDate);
  if (monthsElapsed < 1) return;
  
  for (let i = 0; i < monthsElapsed; i++) {
    const burnDate = addMonths(lastBurnDate, i + 1);
    
    // Calculate burn
    const fleet = await aircraftRepo.getAll();
    const aircraftBurn = fleet.reduce((sum, a) => sum + monthlyBurnForAircraft(a), 0);
    const lifestyleBurn = 500_000;
    const totalBurn = aircraftBurn + lifestyleBurn;
    
    // Calculate yield
    const player = await playerRepo.get();
    const monthlyYield = player.netWorth * 0.05 / 12;
    
    // Record transactions
    await transactionRepo.create({
      occurredAt: burnDate.toISOString(),
      type: 'monthly_burn',
      amount: -totalBurn,
      description: `Monthly operating costs`,
    });
    await transactionRepo.create({
      occurredAt: burnDate.toISOString(),
      type: 'investment_yield',
      amount: monthlyYield,
      description: `Portfolio yield (5% annualized)`,
    });
    
    // Update net worth
    await playerRepo.adjustNetWorth(monthlyYield - totalBurn);
  }
}
```

Call `applyMonthlyBurn(now)` from `getWorldState()` on every app open, BEFORE other resolution logic. Since it's idempotent (checks months elapsed), re-running is safe.
