# JETSTREAM — Simulation Engine

## Design Principle: Timestamp-Based, Not Tick-Based

**We never run a loop.** Nothing updates on a timer. Every piece of world state is computed **on demand** from stored timestamps and current wall-clock time.

This means:
- Closing the app costs nothing (no background work)
- Reopening the app after 8 hours works identically to reopening after 8 seconds
- No race conditions, no drift, no "did the tick fire?" bugs
- Sim speed only affects *displayed* time when app is open

## The Core Primitive: `getWorldState(now)`

```typescript
// /lib/simulation.ts

export type WorldState = {
  player: Player;
  playerCurrentFlight: FlightInProgress | null;
  fleet: AircraftWithLiveStatus[];
  friends: PersonaWithLiveState[];
  pendingDMs: DMMessage[];      // DMs generated while away
  activeEvents: BillionaireEvent[];
  upcomingEvents: BillionaireEvent[];
};

export async function getWorldState(now: Date = new Date()): Promise<WorldState> {
  const player = await playerRepo.get();
  const activeFlights = await flightRepo.getActive();
  
  // Resolve any flights that have arrived
  const stillInFlight: Flight[] = [];
  for (const flight of activeFlights) {
    if (new Date(flight.estimatedArrivalAt) <= now) {
      await resolveFlightArrival(flight, now);
    } else {
      stillInFlight.push(flight);
    }
  }
  
  // Compute live positions for planes still in flight
  const flightsInProgress = stillInFlight.map(f => ({
    ...f,
    currentPosition: interpolatePosition(f, now),
    progressPercent: computeProgress(f, now),
  }));
  
  // Resolve friend flights + generate persona actions
  await advancePersonas(now);
  
  // ... assemble WorldState
}
```

## Flight Math

### Great-Circle Path
Use `@turf/turf` to compute the great-circle line between origin and destination. Sample 64 waypoints (enough for smooth rendering).

```typescript
import { greatCircle, point } from '@turf/turf';

export function computeFlightPath(
  origin: Coordinates,
  destination: Coordinates
): Coordinates[] {
  const line = greatCircle(
    point([origin.lng, origin.lat]),
    point([destination.lng, destination.lat]),
    { npoints: 64 }
  );
  // Returns an array of [lng, lat] pairs; convert to our {lat, lng} shape
  return line.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
}
```

### Distance and Duration
```typescript
import { distance } from '@turf/turf';

export function computeFlightDuration(
  origin: Coordinates,
  destination: Coordinates,
  cruiseSpeedKTS: number
): { distanceNM: number; durationHours: number } {
  const distanceKM = distance(
    point([origin.lng, origin.lat]),
    point([destination.lng, destination.lat]),
    { units: 'kilometers' }
  );
  const distanceNM = distanceKM * 0.539957;
  const durationHours = distanceNM / cruiseSpeedKTS;
  return { distanceNM, durationHours };
}
```

### Cost
```typescript
export function computeFlightCost(
  durationHours: number,
  burnGPH: number,
  aircraft: Aircraft
): number {
  const fuelGallons = durationHours * burnGPH;
  const fuelPricePerGallon = 6.50;      // Jet-A average, tweak to taste
  const fuelCost = fuelGallons * fuelPricePerGallon;
  const crewCost = durationHours * 800; // crew hourly burden
  const navFees = 1200;                 // IFR + handling
  const handlingFees = 2500;            // FBO in/out
  const wearAndTear = durationHours * 450;
  return Math.round(fuelCost + crewCost + navFees + handlingFees + wearAndTear);
}
```

### Live Position Interpolation
Given a flight that's currently in progress, find where the plane is on the great-circle line at `now`.

```typescript
export function interpolatePosition(flight: Flight, now: Date): Coordinates {
  const departedMs = new Date(flight.departedAt).getTime();
  const arrivesMs = new Date(flight.estimatedArrivalAt).getTime();
  const nowMs = now.getTime();
  
  const progress = Math.min(1, Math.max(0, (nowMs - departedMs) / (arrivesMs - departedMs)));
  
  // Interpolate along waypoints
  const totalSegments = flight.waypoints.length - 1;
  const targetSegment = progress * totalSegments;
  const segmentIndex = Math.floor(targetSegment);
  const segmentProgress = targetSegment - segmentIndex;
  
  if (segmentIndex >= totalSegments) return flight.waypoints[flight.waypoints.length - 1];
  
  const a = flight.waypoints[segmentIndex];
  const b = flight.waypoints[segmentIndex + 1];
  
  return {
    lat: a.lat + (b.lat - a.lat) * segmentProgress,
    lng: a.lng + (b.lng - a.lng) * segmentProgress,
  };
}
```

### Heading (for rotating plane icon on map)
```typescript
import { bearing } from '@turf/turf';

export function computeHeading(from: Coordinates, to: Coordinates): number {
  return bearing(point([from.lng, from.lat]), point([to.lng, to.lat]));
}
```

## Flight Arrival Resolution

When `now >= flight.estimatedArrivalAt`, the flight has landed. We need to:

```typescript
async function resolveFlightArrival(flight: Flight, now: Date): Promise<void> {
  // 1. Mark flight arrived
  await flightRepo.markArrived(flight.id, flight.estimatedArrivalAt);
  
  // 2. Update aircraft status
  await aircraftRepo.update(flight.tailNumber, {
    status: 'parked',
    currentLocationICAO: flight.destinationICAO,
    currentFlightID: undefined,
    hoursFlown: /* increment */,
  });
  
  // 3. Update player location
  if (isPlayerOnFlight(flight)) {
    await playerRepo.update({ currentLocationICAO: flight.destinationICAO });
  }
  
  // 4. Fire arrival notification
  await notificationRepo.create({
    type: 'flight_arrival',
    title: `Arrived at ${flight.destinationICAO}`,
    body: /* contextual */,
    linkTo: `/flight/${flight.id}`,
  });
  
  // 5. Queue Claude call for arrival recap + friend reactions (async, on next AI opportunity)
  await queuePostArrivalNarrative(flight);
}
```

## Persona Simulation (The Hard Part)

Personas need to feel alive — flying around, reacting to events, DMing the player. But we can't run background Claude calls. So:

### Strategy: Deterministic Plans + On-Demand Generation

Each persona has a **planned itinerary** — a forward-looking schedule of flights they intend to take. This is generated by Claude at key moments (weekly, or when major events get close) and stored as `persona.nextPlannedFlight`.

When the user opens the app:

1. **Advance plans**: for each persona, check if `nextPlannedFlight.plannedDepartureAt <= now`. If yes, "execute" it — set `currentFlightState`, clear `nextPlannedFlight`, and trigger a Claude call to generate the *next* plan.

2. **Resolve arrivals**: for each persona whose `currentFlightState.estimatedArrivalAt <= now`, land them at the destination, update `currentLocationICAO`, and potentially generate a DM.

3. **Generate DMs**: if a persona just arrived somewhere meaningful (same city as player, same event as player, or a prestigious event), queue a DM via Claude. If they arrived somewhere mundane, skip.

```typescript
async function advancePersonas(now: Date): Promise<DMMessage[]> {
  const personas = await personaRepo.getAll();
  const pendingDMs: DMMessage[] = [];
  
  for (const persona of personas) {
    const state = await personaStateRepo.get(persona.id);
    
    // Has their current flight arrived?
    if (state.currentFlightState && 
        new Date(state.currentFlightState.estimatedArrivalAt) <= now) {
      await landPersona(persona, state, now);
      
      // Should they DM the player?
      if (shouldTriggerArrivalDM(persona, state)) {
        const dm = await generatePersonaArrivalDM(persona, state);
        pendingDMs.push(dm);
      }
    }
    
    // Time to execute next planned flight?
    if (state.nextPlannedFlight && 
        new Date(state.nextPlannedFlight.plannedDepartureAt) <= now) {
      await executePersonaFlight(persona, state, now);
    }
    
    // Do they need a new plan?
    if (!state.nextPlannedFlight && !state.currentFlightState) {
      // Generate offline-safe fallback plan OR queue a Claude call
      await planNextPersonaTrip(persona, state, now);
    }
  }
  
  return pendingDMs;
}
```

### Fallback When Offline
If Claude API is unavailable (offline, rate limited), we use **deterministic fallback logic** for persona movement:
- Weighted random choice of destinations based on persona's `interests` and nearby events
- Templated DM messages like "Just landed in {city}. Wild trip." (low fidelity but keeps world moving)

When Claude comes back online, higher-quality DMs resume.

## Sim Speed Handling

Sim speed is **display-only** when the app is open. It does not affect stored timestamps.

**The trick**: when sim speed > 1x, we "warp" the effective `now` used for world queries:

```typescript
// /lib/stores.ts
export const useSimClock = create<SimClockState>((set, get) => ({
  simSpeed: 1,
  baselineRealTime: Date.now(),     // real time when speed last changed
  baselineSimTime: Date.now(),      // sim time at that moment
  
  getNow(): Date {
    const { simSpeed, baselineRealTime, baselineSimTime } = get();
    const elapsedReal = Date.now() - baselineRealTime;
    const elapsedSim = elapsedReal * simSpeed;
    return new Date(baselineSimTime + elapsedSim);
  },
  
  setSpeed(speed: 1 | 10 | 30 | 60) {
    const currentSimNow = get().getNow();
    set({
      simSpeed: speed,
      baselineRealTime: Date.now(),
      baselineSimTime: currentSimNow.getTime(),
    });
  },
}));
```

**Important**: when speed > 1x, we need to periodically call `getWorldState(clock.getNow())` to reflect progression. Use a `requestAnimationFrame` loop in the map view, throttled to 2Hz (twice per second) for smooth movement without burning CPU.

**Critical nuance**: sim speed advances the sim clock faster than real time *while the app is open*. When the user closes the app at sim-time T and reopens at real-time T + 2 hours, the sim clock resumes from T (not T + 2h × sim speed). We persist `baselineSimTime` and reset `baselineRealTime` on app resume. This matches user expectation — they don't expect their sped-up time to keep ticking when the app is closed.

**Scheduled flights use real timestamps**, so a 7-hour real flight does become a ~7-minute flight at 60x speed while watching, but still takes 7 real hours if you close the app. Player choice.

## Entry Point

Every page mount calls:

```typescript
// In root layout or a provider
useEffect(() => {
  (async () => {
    const now = useSimClock.getState().getNow();
    const state = await getWorldState(now);
    // populate Zustand store
    setWorldState(state);
  })();
}, [pathname]);  // re-run on navigation
```

Plus a lightweight "heartbeat" while the app is open:

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const now = useSimClock.getState().getNow();
    await resolvePendingArrivals(now);  // cheap — just timestamp checks
    await tickLivePositions(now);       // updates visible plane positions
  }, 500);  // 2Hz
  return () => clearInterval(interval);
}, []);
```

## Performance Budget

- `getWorldState()` on app open: < 200ms (IndexedDB reads + in-memory math)
- Heartbeat tick: < 10ms (just position interpolation)
- Claude API call: ~1-3 seconds, always async, never blocks UI
- Map frame render: 60fps for up to 20 visible planes (player's + 15 friends' + some buffer)
