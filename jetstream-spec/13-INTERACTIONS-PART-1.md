# JETSTREAM — Interaction Specification

**This is the exhaustive reference for every button, every tap, every modal, every state in JETSTREAM.** If it's interactive, it's in here. If a button exists in the UI, this doc defines exactly what happens when it's tapped.

Read this AFTER `08-UI-SCREENS.md`. That file defines what the screens look like. This file defines how they behave.

## Conventions Used in This Doc

- **[BTN]** = a button or tappable element
- **[STATE]** = a visual state
- **[MODAL]** = a pop-up overlay (full or partial screen)
- **[TOAST]** = a brief non-blocking notification at bottom
- **[CONFIRM]** = a modal that requires explicit yes/no before proceeding
- **→** = flows to / triggers
- **GOTCHA** = a common mistake to avoid in implementation

Every interaction follows this pattern:
```
[BTN] Button Label
  Visible when: [conditions]
  Disabled when: [conditions]  
  On tap: [exact behavior]
  Loading state: [what shows]
  Error state: [what shows]
  Success: [final state]
```

---

# SECTION 1: GLOBAL SHELL

These elements exist on every screen.

## Top Nav Bar (Desktop) / Bottom Tab Bar (Mobile)

### Top Nav (Desktop, screen width ≥ 1024px)

**Layout** (left to right):
- JETSTREAM logo (left edge)
- Nav links (center): CMD CENTER | FLEET | WORLD | SOCIAL | DESTINATIONS | REAL ESTATE | ACQUISITIONS
- Right cluster: Net Worth pill | Notification bell | Avatar

#### [BTN] JETSTREAM Logo
- On tap: navigate to `/cmd-center`
- Hover state: slight cyan glow

#### [BTN] Nav Links (each)
- On tap: navigate to corresponding route
- Active state: underline in accent-cyan, text brightens to --text-primary
- Inactive state: --text-secondary
- Hover state: brighten to --text-primary, 150ms ease

#### [ELEMENT] Net Worth Pill
- Display: `$ {netWorth formatted}` — green when > $50B, white when lower
- Format: "$79.7B" (abbreviate with B/M/K), full number on hover tooltip
- Updates: live, subscribes to Zustand netWorth store
- On tap: navigate to `/profile` (transactions tab)
- GOTCHA: use `Intl.NumberFormat` for locale-safe formatting

#### [BTN] Notification Bell
- Display: bell icon + red dot if unreadCount > 0
- Badge number shown when ≥ 1 (99+ if more than 99)
- On tap: opens [MODAL] Notifications Panel (right-side drawer on desktop, full-screen on mobile)
- Auto-marks-read: notifications shown in panel get `readAt` set after 500ms delay

#### [MODAL] Notifications Panel
- Width: 380px drawer from right (desktop) or full-screen (mobile)
- Header: "Notifications" + [BTN] "Mark all read" + [BTN] close X
- Body: chronological list of notifications (newest first)
- Each notification row:
  - Icon (by type: plane for flights, chat bubble for DMs, calendar for events, etc.)
  - Title (bold)
  - Body (secondary)
  - Timestamp (relative: "2h ago")
  - On tap: navigates to `linkTo` route, closes panel
  - Unread state: subtle cyan left border
- Empty state: "No notifications" with a muted icon
- [BTN] "Mark all read": sets `readAt` on every visible notification, removes red dot from bell

#### [BTN] Avatar (top right)
- Display: initials in a circle, or uploaded photo if available
- On tap: opens [MODAL] Quick Profile Menu (dropdown from avatar)
  - "Profile" → `/profile`
  - "Settings" → `/profile` (settings tab)
  - "Sim Speed" → inline submenu: 1x / 10x / 30x / 60x (current one has checkmark)
  - "Map Mode" → submenu: Satellite / Dark / Roads / FlightAware
  - "Reset World" (dev-only, shown if localStorage flag set) → [CONFIRM] "Wipe all data?" → clears Dexie, re-seeds

### Bottom Tab Bar (Mobile, width < 1024px)

**5 tabs**: Home (CMD) | Map (WORLD) | Social | Fleet | More

#### [BTN] Each Tab
- Icon + label stacked
- Active state: cyan tint, icon filled
- Inactive: --text-tertiary
- On tap: navigate + subtle 50ms scale pulse (0.95 → 1.0)

#### [BTN] "More" Tab
- On tap: opens [MODAL] More Menu (bottom sheet sliding up)
- Content:
  - Acquisitions → `/acquisitions`
  - Destinations → `/destinations`
  - Real Estate → `/real-estate`
  - Profile → `/profile`
  - Notifications (with unread count badge)
  - Settings
- Each row: icon + label + chevron right
- On tap row: navigate, close sheet

## Global Sim Clock Display

Visible on all pages (top of map screens, subtle in corner elsewhere).

- Format: "MON 14 APR • 09:42 UTC-10" (day, date, time, player's home timezone)
- Updates: every 500ms via `requestAnimationFrame` while app open
- Advances at current sim speed
- On tap (desktop): opens [MODAL] Sim Speed controls
- On tap (mobile): same

## Sim Speed Control

Accessible from: avatar menu, world map overlay, active flight view, active voyage view.

[MODAL] Sim Speed Picker
- 4 buttons in a row: **1x** | **10x** | **30x** | **60x**
- Current speed: accent-cyan filled
- Others: ghost style
- On tap a speed:
  - Updates Zustand `useSimClock.setSpeed(n)`
  - Closes modal after 200ms
  - [TOAST] "Sim speed: {n}x"
- GOTCHA: when sim speed changes, re-baseline the sim clock timestamps (see 03-SIMULATION-ENGINE.md). Don't apply retroactively.

---

# SECTION 2: COMMAND CENTER (`/cmd-center`)

Launch pad. Layout: vertical scroll, mobile-first.

## Sections (top to bottom)

### 2.1 Status Hero

Display only, no interactions except:
- [BTN] Location text → navigates to `/world` centered on player location
- [BTN] Net worth number → navigates to `/profile` (transactions tab)

### 2.2 Active Flight Card (conditional)

Visible only if `Flight.arrivedAt === null` for any flight with player on board.

Content:
- Origin ICAO → ICAO ICAO progress bar
- "ETA: {time remaining}" (e.g., "3h 24m")
- Mini aircraft silhouette animated along the bar

#### [BTN] Card (entire card is tappable)
- On tap: navigate to `/flight/[flightId]` live view

### 2.3 Active Voyage Card (conditional)

Same pattern as active flight, for yachts.

#### [BTN] Card
- On tap: navigate to `/yacht/[hullId]/voyage/[voyageId]`

### 2.4 Unread DMs Preview

Shows top 3 most recent unread DM threads.

Each row:
- Persona portrait (40px)
- Name + preview of last message (1 line, truncated)
- Unread indicator (small cyan dot)

#### [BTN] DM Row
- On tap: navigate to `/social/[personaId]` thread

#### [BTN] "View all" link at bottom
- On tap: navigate to `/social`

### 2.5 Today's Event (conditional)

Visible if any event is happening today OR starting in next 48h AND player's prestige qualifies them.

Card content:
- Event name + dates
- Location + distance from player's current location
- Prestige tier badge
- Attending friends (avatar pile)
- Primary [BTN] "Plan Flight Here"
- Secondary [BTN] "Dismiss" (small X, removes for this session)

#### [BTN] "Plan Flight Here"
- On tap: navigate to `/flight/new?destination={eventLocationICAO}&eventId={eventId}`
- Flight planner pre-populates destination + sets purpose tag

#### [BTN] Dismiss (X)
- On tap: adds event ID to session-level dismissed list (Zustand, not persisted)
- Card hides for this session

### 2.6 Fleet Snapshot

Compact list of all aircraft + yachts, one line each.

Each row:
- Tail/hull icon + ID
- Model name
- Status chip (PARKED / IN TRANSIT / CRUISE / CHARTERED / ANCHORED)
- Current location (ICAO or marina)

#### [BTN] Row
- On tap: navigate to `/fleet/[tailNumber]` or `/yacht/[hullId]`

#### [BTN] "View all" 
- On tap: navigate to `/fleet`

### 2.7 Upcoming (Next 7 Days)

Timeline list of:
- Scheduled flights
- Scheduled voyages
- Event windows starting
- Active resort bookings' check-out dates
- Active property events (hosting) scheduled

Each row:
- Icon + title + relative time
- Tap → navigate to relevant detail

### 2.8 Quick Actions Bar (sticky bottom, mobile only)

3 large buttons: **Fly** | **Sail** | **Buy**

#### [BTN] Fly
- On tap: navigate to `/flight/new`

#### [BTN] Sail
- On tap: navigate to `/yacht/new-voyage` (picker of which yacht first)

#### [BTN] Buy
- On tap: opens [MODAL] "What do you want?" 
  - Aircraft → `/acquisitions?category=aircraft`
  - Yacht → `/acquisitions?category=yachts`
  - Property → `/real-estate`

---

# SECTION 3: FLEET (`/fleet`)

## Tabs

[BTN] Tab: Aircraft | [BTN] Tab: Yachts

### [BTN] Aircraft Tab
- Default selection
- On tap: shows aircraft grid

### [BTN] Yachts Tab
- On tap: shows yachts grid (same layout pattern as aircraft)

## Aircraft Grid View

### [BTN] "ACQUIRE NEW" (top-right)
- On tap: navigate to `/acquisitions?category=aircraft`

### Aircraft Cards

Each card shows: blueprint image, tail number, model name, specs (Max Speed | Burn Rate | Capacity | Location), status chip.

#### [BTN] Card Body (non-button area)
- On tap: navigate to `/fleet/[tailNumber]` detail

#### [BTN] "DISPATCH AIRCRAFT" (parked state)
- On tap: navigate to `/flight/new?aircraft={tailNumber}` (flight planner pre-selects this aircraft)

#### [BTN] "VIEW TELEMETRY" (in-transit state)
- On tap: navigate to `/flight/[activeFlightId]` live view

#### [STATE] Maintenance state
- Card shows amber border
- Replaces button with "MAINTENANCE IN PROGRESS" label (non-interactive)
- Small timer showing remaining maintenance time

## Yachts Grid View

Same pattern. Status chips: PARKED (berthed) / IN TRANSIT / ANCHORED / CHARTERED / MAINTENANCE

#### [BTN] "DEPART" (berthed)
- On tap: navigate to yacht voyage planner with this yacht selected

#### [BTN] "VIEW TELEMETRY" (in-transit)
- On tap: navigate to active voyage view

#### [BTN] "WEIGH ANCHOR" (anchored)
- On tap: opens [MODAL] "Weigh anchor and sail to…" with marina + custom-coord picker

#### [STATE] Chartered state
- Shows "CHARTERED UNTIL {date}" label + income amount
- Non-interactive while chartered

---

# SECTION 4: AIRCRAFT DETAIL (`/fleet/[tailNumber]`)

Top section: large blueprint image, tail number (large, cyan mono), model name, current status chip.

## Tabs

[BTN] SPECS | [BTN] MODULES | [BTN] FLIGHT LOG | [BTN] ACTIONS

### 4.1 Specs Tab (default)

Display-only spec sheet. No interactions.

### 4.2 Modules Tab

Two sections: "Installed" + "Available to Install"

#### Installed Module Row
- Module icon + name + effect description + monthly cost
- [BTN] "UNINSTALL" (small, ghost)
  - On tap: [CONFIRM] "Uninstall {module name}? You'll lose its effects. No refund." → on confirm: remove module, save aircraft, [TOAST] "Module removed"

#### [BTN] "+ Install Module"
- Visible if aircraft has empty module slots
- On tap: opens [MODAL] Module Marketplace
  - List of all available modules with prices
  - Filter: Range | Interior | Performance | Comms | Crew
  - Each module card has [BTN] "INSTALL — ${price}"
  - On tap install: [CONFIRM] "Install {module} for ${price}? Takes 48h (sim time) to complete." → on confirm: deduct price, create transaction, schedule module install (aircraft status → maintenance for 48h sim time), [TOAST] "Installation scheduled"

### 4.3 Flight Log Tab

Chronological list of completed + active flights.

Each row:
- Origin → Destination (with airport codes)
- Date (short format)
- Duration
- Cost
- Status icon (completed / active)

#### [BTN] Row
- On tap: navigate to `/flight/[flightId]` (history view if completed, live if active)

### 4.4 Actions Tab

#### [BTN] "Rename"
- On tap: opens [MODAL] Rename dialog
  - Text input: "Nickname (optional)"
  - [BTN] Cancel | [BTN] Save
  - On save: update aircraft.nickname, [TOAST] "Renamed"

#### [BTN] "Schedule Maintenance"
- Disabled if: currently in transit OR hoursSinceLastMaintenance < 50
- On tap: [MODAL] "Schedule maintenance now? Aircraft unavailable for 3 days sim time. Cost: ${amount}."
  - Cost scales with aircraft category ($50k light → $500k airliner)
- On confirm: aircraft status → maintenance, schedule return to parked in 3 days sim time, deduct cost

#### [BTN] "Charter Out Toggle"
- Switch on/off
- Enabled only when status = parked
- When ON: aircraft becomes charter-available, can generate income
- When OFF: aircraft unavailable for charter
- [TOAST] on change: "Charter availability {on/off}"

#### [BTN] "Sell Aircraft" (destructive — red)
- Disabled if: currently in transit OR chartered out
- On tap: [CONFIRM] "Sell {tail} {model}? You'll receive ~${sellPrice} (75-85% of purchase price)."
  - Show detailed breakdown: purchase price, depreciation, module bonuses, final offer
  - [BTN] Cancel | [BTN] "Confirm Sale"
- On confirm:
  - Aircraft removed from fleet
  - Net worth += sellPrice
  - Transaction recorded
  - [TOAST] "Sold for ${amount}"
  - Navigate back to `/fleet`

---

# SECTION 5: ACQUISITIONS (`/acquisitions`)

## Filter Bar (top)

[BTN] Category chips: **All** | **Aircraft** | **Yachts**

### [BTN] Category chip
- On tap: filter listing below
- Active chip: filled cyan
- URL updates: `?category=aircraft`

### [BTN] "Subcategory" dropdown (shown when Aircraft or Yachts selected)
- For Aircraft: Light | Midsize | Heavy | Airliner | Helicopter
- For Yachts: Motor 30-50m | Motor 50-80m | Mega 80-120m | Giga 120m+ | Sail | Explorer

### [BTN] Price range slider
- Dual-handle slider: $1M to $1B
- Filters listings in real-time

### [BTN] "Sort" dropdown
- Options: Price (low/high) | Speed/Length | Range | Newest listing
- Default: Price ascending

## Listing Cards

Same layout as current Acquisitions screen.

#### [BTN] Listing Card (body)
- On tap: opens [MODAL] Aircraft/Yacht Detail Preview
  - Full specs
  - Module slots
  - Description
  - [BTN] "PURCHASE — ${price}"
  - [BTN] "Close"

#### [BTN] "PURCHASE" (direct from listing)
- Disabled if: player net worth < price
  - Tooltip on hover: "Insufficient funds"
- On tap: opens [CONFIRM] Purchase modal
  - Model: "{Model name}"
  - Price: ${price}
  - Closing costs: ${price * 0.01} (1% fee)
  - Delivery: 7 days sim time
  - [BTN] Cancel | [BTN] "Confirm Purchase"

#### Confirm Purchase flow
- On confirm:
  - Deduct price + closing costs from net worth
  - Create transaction
  - Create aircraft/yacht with auto-generated tail/hull number
  - Status: "in_transit" to delivery location (player's home base)
  - Schedule arrival in 7 days sim time → will be "parked"
  - [TOAST] "Purchase confirmed. Delivery scheduled."
  - Navigate to `/fleet` with new item highlighted briefly (cyan pulse animation, 2s)

#### Tail Number Generation
- Format: N{random 3-digit}{JS or XP suffix}
- JS suffix for aircraft numbered ≤ 500 owned, XP for 501+
- GOTCHA: ensure uniqueness — check existing fleet before assignment

#### Hull ID Generation (yachts)
- Format: YS-{4-digit sequential}
- Starts at YS-0001 (player's first yacht)
