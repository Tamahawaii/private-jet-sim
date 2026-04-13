# JETSTREAM — Interaction Specification (Part 2)

Continues from `13-INTERACTIONS-PART-1.md`. Covers: World view, Flight planner, Active flight, Yachts.

---

# SECTION 6: WORLD VIEW (`/world`)

The live map + event calendar. The most interactive screen in the app.

## Layout

**Desktop**: 2/3 map on left, 1/3 event panel on right
**Mobile**: Full-screen map with bottom sheet (draggable) for events

## The Map

### Map Controls (bottom-right stack)

#### [BTN] Map Layers (stacked squares icon)
- On tap: opens [MODAL] Layers Panel
  - Layer toggles (each is a [BTN] checkbox):
    - ☑ My Aircraft (cyan)
    - ☑ My Yachts (cyan)
    - ☑ My Properties (cyan pins)
    - ☑ Friend Aircraft (persona colors)
    - ☑ Friend Yachts (persona colors)
    - ☑ Friend Properties (persona-colored pins with portraits)
    - ☑ Events (tier-colored pins)
    - ☑ Available Properties (small green dots, zoom 11+ only)
    - ☑ Airports (small gray dots)
    - ☑ Marinas (small anchor icons)
  - [BTN] "Reset to defaults" (bottom)
  - Settings persist in player.settings.mapLayerPrefs

#### [BTN] Map Style
- On tap: opens [MODAL] Style Picker
  - 4 big thumbnails: **FlightAware** | **Satellite** | **Dark** | **Roads**
  - Active one has cyan border
  - On tap a style: applies immediately, closes modal, saves preference

#### [BTN] Live Radar toggle
- Simple switch: ON/OFF
- When ON: shows weather overlay (cloud cover, visible precipitation)
- When OFF: no weather layer
- V1 can stub this with a static weather layer or skip entirely

#### [BTN] Sim Speed
- Shows current speed as label "1X" / "10X" / "30X" / "60X"
- On tap: opens sim speed picker (see Section 1)

#### [BTN] Find Me (location target icon)
- On tap: map pans + zooms to player's current location
- Animation: 600ms ease-in-out

### Map Interactions

#### [BTN] Tap anywhere on map (empty space)
- On tap: dismisses any open popup / side panel
- Double-tap: zoom in one level, centered on tap point

#### [BTN] Pinch / Scroll zoom
- Standard Mapbox behavior
- As zoom increases, pin types appear per spec (properties at 11+, labels at 13+)

#### [BTN] Tap an aircraft marker (yours)
- Opens [POPUP] Aircraft Mini-Card (attached to marker)
  - Tail number, model, status
  - If in transit: ETA + progress bar
  - [BTN] "View Aircraft" → `/fleet/[tail]`
  - [BTN] "View Flight" → `/flight/[id]` (if in transit)

#### [BTN] Tap an aircraft marker (friend's)
- Opens [POPUP] Friend Aircraft Mini-Card
  - Persona portrait + name + aircraft model
  - "En route to {destination}" if in transit
  - [BTN] "View Profile" → `/social/[personaId]/profile`
  - [BTN] "Message" → `/social/[personaId]` DM thread

#### [BTN] Tap a yacht marker (yours or friend's)
- Same pattern as aircraft but with yacht info
- Additional [BTN] "Invite Aboard" if yours AND friend nearby AND your yacht is anchored — see hosting flow

#### [BTN] Tap an event pin
- Opens [POPUP] Event Mini-Card (see section 6.1)

#### [BTN] Tap a marina pin
- Opens [POPUP] Marina Info
  - Marina name, city, berth tier max
  - Monthly berth fee
  - Your yachts berthed here (if any)
  - [BTN] "Send Yacht Here" → opens voyage planner with this marina preselected

#### [BTN] Tap a property pin (yours)
- Opens [POPUP] Property Mini-Card
  - Nickname or address
  - "Your property"
  - [BTN] "View Details" → `/real-estate/property/[id]`
  - [BTN] "Host Something" → opens hosting modal if applicable

#### [BTN] Tap a property pin (friend's)
- Shows: Persona portrait, address, "Owned by {name}"
- [BTN] "View Profile" → `/social/[personaId]/profile`
- [BTN] "Message" → DM

#### [BTN] Tap a property pin (available)
- Opens [POPUP] Available Property Card
  - Address, sqft, beds, asking price
  - [BTN] "View Full Details" → `/real-estate/property/[id]`
  - [BTN] "Buy Now — ${price}" — direct purchase path

#### [BTN] Tap a neighborhood cluster pin (zoomed out)
- On tap: map zooms in to neighborhood bounds (smooth ease, 800ms)

## 6.1 Event Panel (Right side on desktop, bottom sheet on mobile)

### Header

[BTN] "Calendar" / "List" toggle
- Calendar view: horizontal timeline for next 60 days
- List view: vertical scrollable cards

### Filter Chips (horizontal scroll)

[BTN] All | Motorsport | Art | Fashion | Music | Film | Summits | Polo/Racing | Galas

- On tap: filters events shown
- Multiple can be active (tapping again deselects)

### Time Range Buttons

[BTN] "This Week" | [BTN] "Next 30 Days" | [BTN] "Next 90 Days" | [BTN] "Rest of Year"

### Event Card (list view)

Shows: date (large, prominent), event name, location, prestige tier badge, attending friends (avatar pile, max 4 shown + "+3 more"), ticket price.

#### [BTN] Event Card
- On tap: opens [MODAL] Event Detail

#### [BTN] Attending friends avatar pile
- On tap: opens [POPUP] "Attending: Sasha Volkov, Rico Alvarez, +3 more" with tappable names → each navigates to `/social/[personaId]/profile`

### [MODAL] Event Detail

Full-screen modal on mobile, large centered modal on desktop.

Content:
- Hero image (full width)
- Event name (large, serif)
- Dates with countdown ("Starts in 14 days")
- Location (city, country + "Fly to {ICAO}")
- Prestige tier badge
- Prestige required to attend (if tier 4+)
- Ticket price
- Dress code
- Description (2-3 paragraphs)
- Attending friends list (full, not truncated) — each row has portrait + name + [BTN] "Message" + [BTN] "View Profile"
- Historical context ("This event has been running for 52 years...")

#### [BTN] "Plan Flight Here"
- Disabled if: player's prestige < prestigeRequired
  - Shows: "Requires {N} prestige to attend"
- On tap: navigate to `/flight/new?destination={ICAO}&eventId={id}`

#### [BTN] "Plan Yacht Arrival" (if event is coastal)
- Visible if: event is near a marina AND player owns at least one yacht
- On tap: navigate to `/yacht/new-voyage?destination={marinaId}&eventId={id}`

#### [BTN] "Book Stay Near Event"
- On tap: navigate to `/destinations?nearEvent={id}` — filters resorts to those near event

#### [BTN] "Check Your Properties"
- Visible if player owns at least one property in same city as event
- On tap: navigate to `/real-estate?ownedIn={city}`

#### [BTN] "Close" (X top-right)
- Closes modal

#### [BTN] Backdrop click (mobile: drag down)
- Closes modal

---

# SECTION 7: FLIGHT PLANNER (`/flight/new`)

Multi-step guided flow. Each step is a separate view with [BTN] "Back" and [BTN] "Next".

Query params can pre-populate: `?aircraft=N100JS&destination=LFMN&eventId=xxx`

## Step 1: Select Aircraft

### Layout
Grid of aircraft cards. Only `status === "parked"` aircraft are selectable.

#### [BTN] Aircraft Card
- On tap: selects this aircraft (cyan border appears), reveals "Next" button
- If pre-populated via query param, auto-advances to Step 2 after 300ms

#### [STATE] Aircraft in transit / maintenance / chartered
- Grayed out with label explaining unavailability
- Not tappable

#### [BTN] Next → (bottom right)
- Disabled until an aircraft is selected
- On tap: advance to Step 2

## Step 2: Select Destination

### Layout
Three tabs: [BTN] Events | [BTN] Resorts | [BTN] Airport

### 2a: Events Tab (default if no pre-populate)

Shows upcoming events sorted by date, filtered to those within aircraft range from current location.

#### [BTN] Event Row
- On tap: selects event as destination (uses event's ICAO as dest)
- Selected state: cyan border + checkmark

#### [STATE] Out-of-range event
- Grayed out
- Label: "Out of range for {aircraft model} ({range} nm)"

### 2b: Resorts Tab

Shows resorts sorted by proximity to player's current location.

#### [BTN] Resort Row
- On tap: selects resort (uses resort.locationICAO as dest)
- If selected, the nearby airport code shown

### 2c: Airport Tab

Free-form airport picker.

#### [INPUT] Airport search
- Autocomplete searches `/data/airports.json` by ICAO, name, or city
- Results appear as dropdown as user types
- Minimum 2 characters to trigger search

#### [BTN] Airport search result
- On tap: selects this airport as destination

#### [BTN] "Pick on Map" option
- Opens [MODAL] Map Picker
- User taps anywhere, nearest airport (within 500nm) auto-selected
- If no airport within 500nm: error "No airport found"

#### [BTN] Next → 
- Disabled until destination selected
- On tap: if aircraft range insufficient → [MODAL] "This aircraft can't make {distance} nm. Range: {range} nm. Pick a different aircraft?"
  - [BTN] "Go Back to Aircraft" → returns to Step 1
  - [BTN] "Cancel"

## Step 3: Passengers (Optional)

### Layout
List of friends, sorted by current proximity to your origin.

Each row:
- Persona portrait + name
- Current location (or "In transit to X")
- Friendship level indicator (subtle bar or label)
- Distance from origin

#### [BTN] Friend Row
- On tap: toggles selection (checkbox state)
- Selected: cyan checkmark, included as passenger

#### [STATE] Friend not in same city as origin
- Grayed out
- Label: "Not in {origin city}"
- Not selectable (can't magically pick them up)

#### [BTN] "Skip" (secondary, top right)
- On tap: proceed without passengers

#### [BTN] Next →

## Step 4: Review & Launch

### Layout
- Mini-map preview showing origin → destination with great-circle line
- Data display:
  - Origin (ICAO, city) | Destination (ICAO, city)
  - Distance: X nm
  - Duration: Y h Z m
  - Aircraft: {tail} {model}
  - Passengers: {names or "Solo"}
  - Fuel: {gallons} gal
  - **Estimated Block Cost: ${amount}** (large, magenta)

### Cost Breakdown (collapsible)

[BTN] "See cost breakdown ↓"
- On tap: expands to show fuel / crew / nav / FBO / wear lines

### Purpose Tag (auto-populated if eventId or resortId in query params)

Shows small tag: "For: Monaco Grand Prix" or "For: Aman Tokyo stay" — editable via [BTN] "Change"

### [BTN] "FILE PLAN & LAUNCH ⚡"

Full-width button, bright cyan with lightning icon.

- Disabled if: insufficient funds (unlikely at $79.7B, but defensively check)
- On tap: 
  - Brief 800ms loading state ("Filing flight plan...")
  - Create Flight record in Dexie
  - Update aircraft: status = in_transit, currentFlightID = newId
  - Deduct cost from net worth
  - Create transaction
  - Schedule arrival timestamp
  - Generate waypoints (great-circle)
  - [TOAST] "Cleared for takeoff"
  - Navigate to `/flight/[newFlightId]` live view
  - If friends were added as passengers: fire Claude API for "Excited for the trip?" DM from highest-friendship passenger (optional flavor)

### [BTN] Back ←
- On tap: returns to Step 3

### [BTN] Cancel (small X top-right)
- On tap: [CONFIRM] "Cancel flight plan? No changes will be saved." → navigate to `/fleet`

---

# SECTION 8: ACTIVE FLIGHT VIEW (`/flight/[flightId]`)

Live view of a flight in progress. Or completed flight (historical view).

## Layout

Full-screen map with bottom overlay card (draggable).

### Live Mode (arrivedAt === null)

Map shows:
- Great-circle path (subtle dashed line)
- Aircraft marker at current interpolated position, rotated to heading
- Origin + destination airport markers
- Player position (if different from aircraft, rare)

#### [BTN] Map (outside card)
- Pinch/pan works normally
- Double-tap to zoom

### Bottom Overlay Card

Draggable: collapsed (peek) / half / full

#### Peek state content:
- Origin → Destination
- Progress bar
- "ETA {time}" 

#### Half state adds:
- Current altitude (simulated: FL {350-420} based on aircraft + distance)
- Current speed
- Heading
- Distance remaining

#### Full state adds:
- Passenger avatars (if any)
- Cost
- Flight log annotations ("Crossed 180°W", "Entered Russian airspace")
- [BTN] "Cancel Flight" (destructive)

### Interactive Elements

#### [BTN] Sim Speed (floating, top-right)
- Same 4-speed picker
- Updates clock live — map animates faster

#### [BTN] "Cancel Flight" (destructive)
- Only available if flight is <20% complete
- On tap: [CONFIRM] "Turn around and return to {origin}? You'll pay fuel for the completed distance and will land back at {origin} in {time}."
- On confirm: modifies flight record, schedules return arrival, updates UI

### On Arrival

Triggered when `now >= estimatedArrivalAt`.

Transition:
- Map smoothly zooms in on destination
- Bottom card morphs into "Arrival Recap" card
- [TOAST] "Arrived at {destination}"

#### Arrival Recap Card Content
- "Arrived at {airport name}"
- Total flight time
- Total cost
- Any prestige gain (if for an event)
- Claude-generated recap paragraph (via `/api/ai/event-recap` or generic if no event)
- Stock photo header image (location-themed)
- [BTN] "Check In to Resort" (if resort booking pending at this location)
- [BTN] "Go to My Property" (if player owns a property here)
- [BTN] "Find Dinner" (if it's evening local time — flavor, opens events)
- [BTN] "Share" (generates static image of recap — future v2)
- [BTN] "Close" → navigates to `/cmd-center`

### Completed Flight View (historical)

If `arrivedAt !== null`:
- No live animation, just static map showing route
- Overlay card shows completed stats
- No sim speed controls
- [BTN] "Close" → back

---

# SECTION 9: YACHTS

## 9.1 Yacht Detail (`/yacht/[hullId]`)

Same structure as aircraft detail. Tabs: SPECS | MODULES | VOYAGE LOG | CHARTER | ACTIONS

### Charter Tab (yachts only)

Shows charter history + current charter status.

#### [BTN] "Charter Availability" toggle
- When ON: yacht shows as charterable, income can generate
- When OFF: unavailable

#### Charter History Rows
Each completed charter shows:
- Client name (Claude-generated)
- Dates
- Revenue
- Any damage/notes (rare flavor event: "Minor damage to tender, -$12k repair")

#### [BTN] Charter Row
- On tap: opens [MODAL] charter detail

### Actions Tab

Same as aircraft actions (Rename, Schedule Maintenance, Sell) with yacht-specific additions:

#### [BTN] "Reposition" (visible when berthed)
- On tap: navigate to voyage planner with this yacht

#### [BTN] "Drop Anchor at Current Location" (visible when berthed)
- On tap: [CONFIRM] "Drop anchor off the coast near {marina}? You'll leave the berth and anchor offshore."
- On confirm: yacht status → anchored, currentLocation.type = anchored with nearby coords

## 9.2 Yacht Voyage Planner (`/yacht/new-voyage`)

Query params: `?yacht=YS-0001&destination=monaco-port-hercules`

Same 4-step pattern as flight planner.

### Step 1: Select Yacht
Grid of yachts in `idle` status (berthed or anchored).

### Step 2: Select Destination

Three tabs: [BTN] Marinas | [BTN] Anchor off Coast | [BTN] Near Event

#### 2a: Marinas Tab
List of marinas, filtered to those accepting yacht's slip tier.

#### [STATE] Marina too small
- Grayed: "Your yacht ({length}m) exceeds max berth tier ({maxTier})"

#### 2b: Anchor off Coast Tab
Map-based picker — tap any coastline within range.

#### [BTN] Map tap
- Validates: coords are within 2km of coastline (prevents anchoring mid-ocean for v1)
- If valid: places anchor pin, shows estimated voyage time
- If invalid: [TOAST] "Must anchor within 2km of coast"

#### 2c: Near Event Tab
Shows upcoming coastal events with "Anchor off {city}" as auto-destination.

### Step 3: Passengers

Same as flight planner. Friends must be in same city as yacht's origin.

### Step 4: Review & Launch

Similar to flight. Data shown:
- Origin marina → Destination
- Distance (nm)
- Estimated duration (remember: slow, 12-24 knots)
- **Warning if duration > 72 hours sim time**: prominent display "This voyage will take {X} days. Sim speed 60x recommended."
- Fuel cost (marine diesel: $4/gal)
- Crew cost
- Port fees
- **Total: ${amount}**

#### [BTN] "CAST OFF ⚓"
- On tap: similar to flight launch
- Creates YachtVoyage, updates yacht status → in_transit
- Navigate to `/yacht/[hullId]/voyage/[voyageId]`

## 9.3 Active Voyage View (`/yacht/[hullId]/voyage/[voyageId]`)

Same pattern as active flight. Key differences:

- Slower animation on map (yacht is moving at 15kts, not 500kts)
- Different icon (ship silhouette with wake effect)
- "ETA" shown in hours/days
- Can still sim-speed up to 60x

### [BTN] "Change Course" (unique to yachts)
- Available any time during voyage
- On tap: opens map picker
- Player picks new destination (marina or anchor spot)
- [MODAL] "Redirect to {new dest}? Fuel wasted so far: $X. New ETA: Y."
- On confirm: updates voyage record, recalculates waypoints from current position

### [BTN] "Drop Anchor Here" 
- On tap: stops yacht at current position, status → anchored
- Useful for impromptu stops

### On Arrival
Transition to "Docked" or "Anchored" state. Similar recap card.

## 9.4 Yacht Hosting Flow

When yacht is anchored or berthed AND friends are within 150nm:

### [BTN] "Host Something" (from yacht detail or map popup)

Opens [MODAL] Hosting Options:
- Dinner Aboard ($75k, 3-8 guests) — [BTN]
- Throw Party ($350k, 8-15 guests) — [BTN]
- Overnight Guest ($25k/guest, 1-3 guests) — [BTN]

Each option on tap:
- Shows eligible friends (within 150nm, friendship > 0)
- Player selects which to invite
- [BTN] "Send Invites"
- On send:
  - Claude API call per invitee to determine accept/decline (based on friendship, schedule, interests)
  - Shows responses as they come in (simulate 1-3 minutes delay sim time)
  - [TOAST] "3 friends accepted, 1 declined" after all responses
  - Event scheduled — plays out as vignette if player stays on yacht for the hosted event
  - Prestige + friendship effects applied on hosting event occurring
