# JETSTREAM — Interaction Specification (Part 3)

Continues from Parts 1 and 2. Covers: Social/DMs, Destinations, Real Estate, Profile, Onboarding, Empty/Error states, Edge cases.

---

# SECTION 10: SOCIAL HUB (`/social`)

## Layout

Two sections: Activity Feed (top half) + DM Threads (bottom half)

## 10.1 Activity Feed

Chronological posts (newest first) about friend activity in the last 7 days.

### Post Types

Each post is a small card:

**"Arrived" post**
- Persona portrait + "Sasha Volkov arrived at Monaco"
- Relative time
- Small map thumbnail showing location

**"Flew to" post**
- "Naomi Tanaka departed SFO for NRT, 11-hour flight"

**"Attended event" post**
- "Alessandro Conti attended Monaco Grand Prix"
- Prestige tier badge

**"Bought property" post** (rare, major moves only)
- "Khalid Al-Rashid acquired a property on Eaton Square, Belgravia"

**"Together" post**
- "Sasha Volkov and Rico Alvarez at Eden Rock, St Barths"
- Multiple portraits overlapping

### Interactions

#### [BTN] Post (whole card)
- On tap: opens [POPUP] "About this activity"
  - More context (Claude-generated flavor)
  - [BTN] "Message {name}" → DM
  - [BTN] "View Profile" → persona profile
  - [BTN] "See on Map" → world map zoomed to activity location

#### [BTN] "React" (small heart icon on each post)
- On tap: cycles through reactions (💙 / 🔥 / 👏 / 😂 / removed)
- Triggers small friendship bonus (+1) with the persona
- Persona may DM in response (30% chance, Claude-generated)

#### [BTN] "Scroll to Load More"
- Automatic infinite scroll
- Loads older activity as user scrolls

## 10.2 DM Threads List

List of all DM threads, sorted by most recent message.

Each row:
- Persona portrait (large, 48px)
- Name (bold)
- Last message preview (1 line, truncated with "...")
- Timestamp (relative)
- Unread indicator (cyan dot + bold text if unread)

#### [BTN] Thread Row
- On tap: navigate to `/social/[personaId]` DM thread

#### [BTN] "New Message" (FAB bottom-right)
- On tap: opens [MODAL] New DM picker
  - Shows all 15 personas + group chats
  - [BTN] Persona → navigate to `/social/[personaId]`
  - [BTN] "New Group Chat" → prompts for 2+ friends → creates thread

### Filter Bar

[BTN] All | Unread | Favorites | Groups

#### [BTN] Favorites
- Shows only threads marked as favorite
- Favorite toggle on each thread (star icon) — long-press on row to toggle

---

# SECTION 11: DM THREAD (`/social/[personaId]`)

## Layout

Header (persona info) + Messages (scrollable) + Input (bottom)

### Header

Content:
- Persona portrait
- Name + location status ("In Monaco" / "In transit to NRT")
- Friendship level indicator (subtle bar)

#### [BTN] Persona Portrait / Name
- On tap: navigate to `/social/[personaId]/profile`

#### [BTN] "..." menu (top right)
- Options:
  - "View Profile"
  - "Invite to Event"
  - "Send Location Ping" — shares your current coords
  - "Mute" (hide from activity feed)
  - "Clear Chat" (destructive, [CONFIRM] required)

## Messages Display

iMessage-style bubbles:
- Persona messages: left, --bg-elevated background
- Player messages: right, --accent-cyan-dim background
- Timestamps: subtle, shown between messages after 30+ min gap
- Typing indicator: 3 animated dots when Claude API call in progress

### Message Types

#### Text message
- Plain text bubble
- URLs auto-linked

#### Event attachment
- Compact event card embedded in message
- Shows event name, date, location
- [BTN] Card → opens event detail modal

#### Resort attachment
- Compact resort card
- [BTN] → resort detail

#### Location ping
- Small map thumbnail with pin
- "I'm at {location}"
- [BTN] → opens map centered there

#### Voice message (flavor only for Dmitri persona)
- "[Voice message: 0:42]" pill
- [BTN] Tap: brief fake waveform animation, no actual audio in v1

### Message Interactions

#### [BTN] Long-press on message bubble
- Opens context menu:
  - Copy
  - React (5 emoji options)
  - Reply (quotes the message)
  - Delete (your messages only)

#### [BTN] Link in message
- On tap: navigate to linked content

## Input Bar (bottom)

### [INPUT] Text field
- Placeholder: "Message {persona name}"
- Grows up to 4 lines, then scrolls
- Enter to send (Shift+Enter = newline)

### [BTN] Send (paper plane icon)
- Disabled if: input empty
- On tap:
  - Append player message immediately to thread (optimistic UI)
  - Clear input
  - Show typing indicator for persona
  - Call `/api/ai/dm` with trigger = "player_message" + full recent history
  - On response: append persona message to thread
  - On error: [TOAST] "Message failed, retry?" with [BTN] retry

### [BTN] Attach (paperclip icon, left of input)
- On tap: opens bottom sheet:
  - **Share Event** → picker of upcoming events → attaches selected
  - **Share Resort** → picker → attaches
  - **Share Location** → auto-shares current coords
  - **Invite to Flight** → picker of scheduled flights → attaches invitation

### [BTN] Invite to Event (quick action, next to attach)
- On tap: opens event picker (filtered to upcoming, where persona is not already attending)
- Selecting an event: sends a message with event attachment + invite framing

### [BTN] Quick Reactions (above input, contextual)
- Shown when persona just sent a message
- Emoji buttons: 🔥 💙 😂 🙏 👏
- On tap: sends emoji-only message immediately

## Group Chats (same screen with multiple personas)

Differences:
- Multiple persona portraits in header
- Each message labeled with sender name
- All personas may respond to player messages (Claude decides who speaks based on relevance)

---

# SECTION 12: PERSONA PROFILE (`/social/[personaId]/profile`)

Display-heavy lore view.

## Sections

### 12.1 Hero
- Portrait (large, 120px)
- Name, age, nationality
- Archetype tag (e.g., "Old Money Heir")
- Quick stats: net worth, based in

### 12.2 Bio
- 2-3 sentence description
- Interests as chips

### 12.3 Friendship Status
- Level label: "Acquaintance" / "Friend" / "Close Friend" / "Best Friend" / "Rival"
- Visual bar showing position on scale
- "First met: {date}" (created date of thread)
- "Last interaction: {relative time}"

### 12.4 Their Empire

Subsections:
- **Fleet**: Jet(s) owned (lore only, read-only)
- **Yachts**: If they own yachts
- **Properties**: List of their properties (tappable → opens property detail where they're shown as owner)

### 12.5 Shared History

- Events attended together (list)
- Trips taken together (flights/voyages where they were a passenger)
- Property neighbors (if player owns property near theirs)

## Interactions

### [BTN] "Message" (primary button)
- On tap: navigate to `/social/[personaId]` DM thread

### [BTN] "View on Map"
- On tap: navigate to world map zoomed on their current location

### [BTN] "Invite to Dinner" (if same city)
- Disabled if: you and persona aren't in same city
- On tap: opens [MODAL] dinner invite
  - Select restaurant tier ($$ / $$$ / $$$$)
  - Cost range shown
  - On send: Claude API response, then in-DM acceptance/decline flow

---

# SECTION 13: DESTINATIONS (`/destinations`)

## Filter Bar (top)

[BTN] Region chips: All | Asia-Pacific | Europe | Americas | Middle East & Africa

[BTN] Prestige Tier: All | Tier 3 | Tier 4 | Tier 5

[BTN] "Near Me" toggle (uses player current location)

[BTN] "Near Upcoming Event" dropdown — select an event, filters to resorts within 100nm

[BTN] Sort: Nightly Rate (low/high) | Prestige | Alphabetical

## Resort Grid

Magazine-style grid. Cards show: hero image, name, brand, city, country, starting nightly rate, prestige tier badge.

### [BTN] Resort Card
- On tap: navigate to `/destinations/[resortId]`

### [STATE] Active Booking Badge
- If player has active booking at this resort, shows "CURRENTLY STAYING" ribbon

---

# SECTION 14: RESORT DETAIL (`/destinations/[resortId]`)

Full editorial layout.

## Header

- Hero image (full-bleed, 60vh on desktop)
- Name in serif (large)
- Brand, city, country
- Prestige tier badge

## Body Sections

### About (description prose)

### Amenities (icon grid)

### Suite Options

List of suite types with:
- Name
- Nightly rate
- Rate multiplier vs base
- Radio selection

#### [BTN] Suite Option
- On tap: selects this suite (radio behavior)
- Default: base suite selected

### Date Picker

Two date inputs: Check-in, Check-out

#### [INPUT] Check-in date
- Calendar picker, can't select past dates (sim time)
- Max 365 days in future

#### [INPUT] Check-out date
- Must be after check-in
- Minimum 1 night

### Signature Experiences (add-ons)

Each experience shown as row with checkbox:
- Name
- Description
- Price

#### [BTN] Experience checkbox
- On tap: toggles inclusion in booking
- Total updates live at bottom

## Sticky Bottom Bar

Displays live-updating total:
- "{nights} × ${rate} + {experiences count} experiences = ${total}"

### [BTN] "Book Stay"
- Disabled if: no dates selected OR insufficient funds (unlikely)
- On tap: opens [CONFIRM] Booking Confirmation
  - Summary: resort, suite, dates, experiences, total
  - Payment: shown as upfront cost (booking paid in full)
  - [BTN] Cancel | [BTN] "Confirm Booking"

### On Confirm
- Create ResortBooking record
- Deduct total from net worth
- Create transaction
- If booking check-in is today or in past sim time: status = active immediately
- Else: status = upcoming, will become active on check-in date
- [TOAST] "Booked at {resort name}"
- Navigate to `/profile` (bookings tab)
- Small cyan pulse on new booking in list

## Quick Action: "Fly + Stay"

### [BTN] "Fly Here & Stay" (alongside "Book Stay")
- On tap: opens combined flow
- Step A: Flight planner with destination pre-set to resort's ICAO
- Step B: Booking flow (dates, suite, experiences)
- Final confirm covers BOTH flight + booking as single transaction
- Useful for short-notice trips

### [BTN] "Stay at My Property Instead" (if owned nearby)
- Visible if: player owns property within 50km of resort
- On tap: [MODAL] "You own {property nickname} here. Stay there instead for free?"
  - [BTN] "Stay at My Place" → cancels resort booking flow, marks property as current stay
  - [BTN] "Still Book Resort" → continues with booking

---

# SECTION 15: REAL ESTATE (`/real-estate`)

## Browse View

Grid of neighborhood cards. Each shows: hero image, neighborhood name, city, prestige tier, "{N} properties, from ${min price}", avg $/sqft.

### [BTN] Neighborhood Card
- On tap: navigate to `/real-estate/[neighborhoodId]` list view

## Filter Bar

[BTN] Region chips

[BTN] Prestige Tier chips

[BTN] Sort: Avg Price | Prestige | Alphabetical

[BTN] "My Neighborhoods" toggle — filter to neighborhoods where player already owns

## Global Map View Alternate

### [BTN] "View on Map" (toggle, top right)
- On tap: switches to full-screen map mode centered on all neighborhoods
- Neighborhoods shown as clustered pins
- Taps zoom in / open properties per map interaction spec in Section 6

---

# SECTION 16: NEIGHBORHOOD VIEW (`/real-estate/[neighborhoodId]`)

Shows all properties in this neighborhood.

## Layout

Split: mini-map on top/left (neighborhood bounds), property list on bottom/right.

## Filter Bar

[INPUT] Price range (dual slider)
[INPUT] Min sqft
[BTN] Feature multiselect: Helipad | Pool | Waterfront | Beach access | Tennis court | etc.
[BTN] Availability: Available | Owned by me | Owned by friends | All
[BTN] Sort: Price (low/high) | Sqft | Feature tier

## Property List

Each row shows: thumbnail, address, sqft, beds, price, owner badge (Available / Yours / Friend's)

### [BTN] Property Row
- On tap: navigate to `/real-estate/property/[propertyId]`

### [BTN] Property Row (long-press on mobile, hover menu on desktop)
- Opens quick action menu:
  - "View details"
  - "Buy now" (if available)
  - "View owner" (if friend-owned)

## Multi-Select Mode

### [BTN] "Select Multiple" (top right)
- On tap: toggles multi-select mode
- Property rows show checkboxes
- Non-available properties disabled in this mode

### Selected Property Behavior
- [BTN] Tap row in multi-select: toggles selection
- Running total in sticky bottom bar:
  - "{N} selected — ${total}"
  - [BTN] "Purchase All" (cyan, full-width)
  - [BTN] "Cancel"

### [BTN] "Purchase All"
- On tap: opens [CONFIRM] Multi-Purchase
  - List of all selected with addresses + prices
  - Total price + closing costs (3%)
  - Monthly upkeep sum for these properties
  - [BTN] "Confirm All Purchases"
- On confirm:
  - Single transaction for total
  - Each property marked owned
  - Pins turn cyan
  - [TOAST] "{N} properties acquired"
  - Neighbor-reaction DMs fire if any were near friend properties (Claude API, async)

### [BTN] "Select Entire Neighborhood" (if 80%+ available properties owned)
- Unlocks "Consolidate" action
- [MODAL] "Consolidate {neighborhood}? Purchase all remaining available properties at 10% premium. Total: ${amount}."
- On confirm: buys everything remaining, unlocks "Neighborhood Dominated" achievement flavor

---

# SECTION 17: PROPERTY DETAIL (`/real-estate/property/[propertyId]`)

Full editorial property page.

## Layout

- Hero image (stock photo matching property type + tier)
- Address, neighborhood, city
- Price tag (large, mono)
- Zestimate comparison: "${zestimate} Zestimate" (matches for now — flavor)

## Spec Grid

- Sqft | Bedrooms | Bathrooms | Year built (generated)
- Property type | Feature tier | Lot size (if applicable)

## Features List

Bulleted list of all features. Trophy-tier features are bolded/highlighted.

## Description

Generated prose (3-4 sentences) evoking the property.

## Map

Small embedded map showing property location + nearby friend properties within 500m.

### [BTN] "View Full Map"
- On tap: navigate to world map at max zoom on this property

## Owner Section

### If Available
Shows: "Available" label in green.

#### [BTN] "PURCHASE — ${price}" (primary button)
- On tap: [CONFIRM] Purchase
  - Total breakdown: asking + closing costs (3%)
  - Monthly upkeep estimate
  - Required staff count suggestion
  - [BTN] "Cancel" | [BTN] "Complete Purchase"
- On confirm:
  - Deduct total from net worth
  - Transaction recorded
  - Property updated: ownerType = "player", ownerId = player.id, purchasedAt, currentValueUSD = purchasePriceUSD
  - [TOAST] "Welcome to your new place at {address}"
  - If friend owns adjacent (< 500m): fire Claude API `/api/ai/neighbor-reaction`, queue DM
  - Navigate to portfolio view showing new property highlighted

### If Owned by Player
Shows: "Your Property" label in cyan.

#### [BTN] "Rename"
- On tap: [MODAL] rename dialog (like aircraft)

#### [BTN] "Manage Staff"
- On tap: [MODAL] Staff Manager
  - Slider for staff count (0-30)
  - Each slider tick shows $8k/month cost
  - Effects: more staff = higher upkeep but "host-ready" badge enables larger events
  - [BTN] "Save"

#### [BTN] "Host Event Here"
- Opens hosting modal (see section 18)

#### [BTN] "Sell Property" (destructive)
- On tap: [CONFIRM] "Sell {nickname or address}? You'll receive ~${sellPrice} (95% of current value, minus 5% transaction cost)."
- On confirm: property becomes Available again, net worth +=, transaction logged

### If Owned by Friend
Shows: Persona portrait + "Owned by {name}"

#### [BTN] "View {Name}'s Profile"
- On tap: navigate to persona profile

#### [BTN] "Message {Name} About This"
- On tap: navigate to DM with pre-populated draft: "I love your place on {street}. How long have you had it?"

---

# SECTION 18: HOSTING FLOW

Triggered from: yacht anchored at location + friends nearby, OR owned property + player present.

## [MODAL] Host Event

### Step 1: Choose Event Type

Cards showing each event option:

**At Property (Villa / Penthouse / Estate)**
- **Dinner Party** — $45k base, 3-8 guests
- **Pool Party** — $125k, 8-15 guests (requires pool feature)
- **Ski Weekend** — $200k, 3 days, 4-8 guests (winter only, Aspen/Gstaad/Verbier)
- **Art Basel Private Viewing** — $350k, during Basel Miami (owns in Miami)
- **Grand Prix Viewing Party** — $500k, during Monaco GP (owns in Monaco)
- **Fashion Week After-Party** — $280k, during Paris/Milan Fashion Weeks
- **Derby Brunch** — $180k, during Kentucky Derby

**On Yacht**
- **Dinner Aboard** — $75k, 3-8 guests
- **Sunset Party** — $200k, 8-15 guests
- **Overnight Cruise** — $400k/night, 1-3 overnight guests
- **Regatta Hosting** — $850k, during Monaco Yacht Show or Cowes

### Each Event Type Card

#### [BTN] Card
- On tap: proceed to Step 2

### Step 2: Choose Date

Date picker, limited to valid windows:
- Dinner: any day (1-7 days out)
- Pool Party: any summer day
- Ski Weekend: winter only (Dec-March)
- Event-specific: auto-locked to event date window

### Step 3: Invite Guests

List of eligible friends (within 200nm of host location).

Filter options:
- All eligible
- Close friends only
- Specific archetypes (artists, tech, etc.)

#### [BTN] Friend checkbox
- Toggles invite

#### [BTN] "Select All Close Friends"
- Auto-selects all friends with friendship > 50

### Step 4: Review & Send

Summary:
- Event type + cost
- Date
- Location
- Guest list
- Estimated attendance (Claude can predict)

#### [BTN] "Send Invites"
- On tap:
  - Deduct cost upfront
  - For each invitee, call `/api/ai/hosting-accept`
  - Claude returns accept/decline per invitee based on friendship, schedule, interests, rivalries
  - Show responses as they stream in (real-time feel):
    - Sasha: ACCEPTED
    - Naomi: ACCEPTED  
    - Dmitri: DECLINED ("Already in Dubai that weekend")
    - etc.
  - Final [TOAST] "{N} of {M} accepted"
  - Event scheduled for chosen date
  - Appears in Upcoming section on Command Center

### On Event Day (sim time)

If player is at host location when event fires:
- [MODAL] "Tonight: {event type}"
- Claude generates vignette recap
- Prestige effects applied
- Friendship bumps per attendee
- Possible paparazzi photo (high-tier events)
- Appears in event history

If player isn't present:
- Event doesn't fire (player must be there)
- Small refund (-50% host costs)
- [TOAST] "You missed your own party. Costs partially refunded."

---

# SECTION 19: PROFILE (`/profile`)

## Tabs

[BTN] OVERVIEW | [BTN] PORTFOLIO | [BTN] HISTORY | [BTN] TRANSACTIONS | [BTN] SETTINGS

### 19.1 Overview Tab

- Display name, home base, member since, current location
- Net Worth (large)
- Net worth chart (line graph over time, last 90 days by default)
  - [BTN] Time range: 7D | 30D | 90D | 1Y | ALL
- Prestige score with tier label
- Stats row: total flights, miles flown, countries visited, events attended, properties owned, yachts owned

### 19.2 Portfolio Tab

Sub-sections:

**Aircraft**
- Count + total value
- List (compact, each tappable → `/fleet/[tail]`)

**Yachts**
- Count + total value
- List

**Properties**
- Count + total value + total monthly upkeep
- Grid of property cards with nicknames
- Tappable → property detail

**Active Bookings**
- Any upcoming/active resort bookings
- Tappable → resort detail

### 19.3 History Tab

**Events Attended**
- Chronological list with attended event cards
- Filter: by category, by tier
- Tap → event detail + your recap

**Trips**
- Every flight + voyage taken
- Filter: aircraft, yacht, date range

**Travel Map**
- World map with pins on every visited airport + marina + city
- Hover → "Visited {N} times"

### 19.4 Transactions Tab

Ledger of all financial events.

Filter bar:
- By type (purchases, flights, bookings, charters, yields, etc.)
- Date range

Each row: date, type, description, amount (colored — green for in, magenta for out)

### [BTN] "Export" (top right)
- On tap: downloads CSV of transactions (bonus feature, optional for v1)

### 19.5 Settings Tab

#### [INPUT] Display Name
- Editable text field

#### [BTN] Home Base
- Opens airport picker

#### Preferences:
- Default sim speed: 1x / 10x / 30x / 60x (dropdown)
- Default map mode (dropdown)
- Show friend locations on map (toggle)
- Notification preferences (checkboxes for DM / event / flight / property)

#### Danger Zone:
- [BTN] "Reset World" (destructive) — wipes Dexie, re-seeds

---

# SECTION 20: ONBOARDING FLOW

Shown only on first app load (Dexie empty).

## Step 1: Welcome

Fullscreen splash:
- "JETSTREAM" logo (large)
- Tagline: "Your private world."
- [BTN] "Begin"

## Step 2: Name

Full-screen with single input:
- Label: "What should we call you?"
- [INPUT] Name (defaults to "Commander")
- [BTN] "Continue"

## Step 3: Home Base

- Map with major airports highlighted
- Suggested: HNL (since it matches starter fleet location)
- [INPUT] Search
- [BTN] "Confirm Home Base"

## Step 4: World Briefing

Text card sequence (each tap advances):

1. "You have $79.7B, five aircraft, and one yacht."
2. "You know fifteen people. Some are friends. Some are rivals."
3. "Forty-five events happen each year. Attendance is the currency."
4. "You own nothing yet. Everywhere you land is a decision."
5. "Welcome."

## Step 5: Drop into Command Center

Subtle animation as UI materializes. First-time tutorial markers (small pulsing dots) on:
- Fleet tab ("Your aircraft")
- World tab ("Live map")
- Social tab ("Your circle")

These auto-dismiss after first visit to each section.

---

# SECTION 21: EMPTY / ERROR / LOADING STATES

## Empty States

### No DMs yet
"No conversations yet. Your friends are probably traveling. Check back soon."

### No flights yet
"You haven't flown anywhere. Your fleet is waiting."
[BTN] "Plan First Flight"

### No properties owned
"You don't own any real estate yet. Browse neighborhoods to start your empire."
[BTN] "Browse Neighborhoods"

### No active bookings
"No stays booked. The world is waiting."

### No upcoming events
"Nothing on the calendar the next 30 days. Try extending the range or changing filters."

## Loading States

### Global
Subtle skeleton pulses on cards. Never show spinners on primary layouts.

### Claude API calls
- DM typing indicator: 3 animated dots
- Persona planning: silent background (user doesn't need to know)
- Event recap: "Preparing recap..." for 1-3 seconds before card reveal

### Map tiles loading
- Gray placeholder tiles with subtle gradient animation

## Error States

### Network error
- [TOAST] "Connection issue. Retrying..." with auto-retry after 3s
- If persistent: small banner "Offline mode — some features unavailable"

### Claude API failure
- For DMs: typing indicator disappears, replaced by subtle retry icon — tap to retry
- For persona planning: fallback to deterministic logic (see `03-SIMULATION-ENGINE.md`)

### Insufficient funds (edge case at $79.7B but defensive)
- [TOAST] "Insufficient funds — ${shortfall} short"
- Buttons remain disabled

### Invalid input (e.g., check-in date in past)
- Field border turns magenta
- Inline error text below field
- Submit button disabled until corrected

### 404 (bad route)
Custom page:
- "This destination isn't in your flight plan."
- [BTN] "Return to Command Center"

---

# SECTION 22: EDGE CASES & GOTCHAS FOR ANTIGRAVITY

## Flight Edge Cases

- **Aircraft running out of range**: prevent at planner stage. Never allow launch of flight exceeding aircraft range.
- **Two flights same aircraft simultaneously**: prevent by checking status = parked before allowing dispatch.
- **Player on two flights at once**: prevent — player can only be on one flight at a time.
- **Flight arriving while app closed at very high sim speed**: resolve correctly using timestamps; see sim engine spec.

## Yacht Edge Cases

- **Yacht route through land**: v1 accepts visual artifact. Don't let Antigravity sink hours into pathing.
- **Yacht too big for marina**: block at planner (tier mismatch).
- **Multiple yachts to same marina**: allow (marinas have multiple slips).

## Property Edge Cases

- **Adjacent property ownership overlap**: when multi-selecting, ensure no duplicates.
- **Property value after years**: appreciation math must handle 0 years elapsed (no appreciation yet).
- **Selling property that's being hosted at**: block sale if event scheduled there in future.
- **Deleting owner's staff to $0**: allow, but flag that property becomes "uninhabitable" for events.

## Persona Edge Cases

- **Persona in same city as their destination**: Claude should NOT plan a flight to their current location. Guard this in persona-plan API.
- **Player and persona both arriving at same location same time**: allow, trigger greeting DM.
- **Persona's plane can't make their planned trip range**: fallback to a closer destination, re-plan.
- **Group chat with 10+ personas and a rivalry pair**: Claude should handle tensely, not explode (prompt engineering).

## Economy Edge Cases

- **Monthly burn running 12 months at once after long absence**: calculate iteratively, record 12 transactions — don't aggregate into one.
- **Net worth going negative briefly during purchase confirm**: prevent by validating before transaction.
- **Charter income exceeding operational costs making "rich-er" forever**: intended. It's the fantasy.

## UI Edge Cases

- **Modal over modal over modal**: prevent. Max 1 modal at a time. Opening a new one closes previous.
- **Swipe-to-go-back on iOS**: disable on forms mid-input to prevent data loss. Warn with [CONFIRM].
- **Keyboard pushing bottom sticky buttons off-screen**: ensure sticky elements respect safe-area-inset-bottom.
- **Very long persona names / addresses**: truncate with ellipsis, full text on hover/tap.

## Save/Persist Edge Cases

- **Browser storage full**: defensive — on Dexie quota error, [MODAL] "Storage full. Clear old flights from log?" with [BTN] to prune > 1 year old completed flights.
- **Multiple tabs open**: Dexie supports multi-tab, but prefer last-write-wins. Add a "This world is open in another tab" banner if detected via BroadcastChannel.
- **Data corruption**: wrap critical reads in try/catch. On parse failure, show "Data error — reset world?" modal.

---

# SECTION 23: ANIMATION & TIMING REFERENCE

## Standard Durations

- Page transitions: **200ms** fade
- Modal open/close: **250ms** ease-out
- Button hover: **150ms** ease-out
- Card hover: **150ms** border brighten
- Toast appear: **200ms** slide up + fade
- Toast dismiss: **150ms** fade
- Map pan on location: **600ms** ease-in-out
- Map zoom on cluster: **800ms** ease-in-out
- Flight arrival camera zoom: **1200ms** smooth
- Sim speed change map timescale ease: **500ms**
- Drawer slide: **300ms** ease-out
- Onboarding splash transition: **400ms**

## Custom Motions

- **New item pulse** (purchased aircraft, yacht, property): cyan glow expanding from card, 2s, 1x
- **Unread DM pulse**: gentle cyan dot breathing, 2s cycle, continuous until read
- **Live position tick**: 2Hz (every 500ms) for smooth aircraft movement on map
- **Typing indicator dots**: 3 dots cycling opacity, 1.2s loop
- **Net worth updating animation**: tween from old → new over 800ms on value change

## What NOT to Animate

- No confetti, no celebrations
- No bouncy spring physics
- No large scale transforms (stay within 1.0-1.05x)
- No rotating loading spinners — use skeletons or progress bars

---

# SECTION 24: ACCESSIBILITY NOTES

- All buttons must have text labels or aria-label
- Tap targets minimum 44x44px (mobile)
- Color is never the ONLY signal (always pair color with icon or text)
- Focus states visible (cyan outline)
- ESC closes modals
- Map controls keyboard-accessible
- Screen reader announcements for:
  - Flight arrival
  - New DM received
  - Transaction completed
  - Toast messages
