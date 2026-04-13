# JETSTREAM — Tech Stack

## Stack Decisions

### Framework: Next.js 14 (App Router)
- Already deploying on Vercel based on current setup
- Server Components where useful, Client Components for interactive UI
- Route handlers for Claude API proxy (keeps API key server-side)

### Language: TypeScript (strict mode)
- All data models fully typed
- Zod schemas for runtime validation on Claude API responses

### Styling: Tailwind CSS + CSS variables for theming
- Custom design tokens in `tailwind.config.ts`
- No component library — build primitives for full aesthetic control
- Optional: `class-variance-authority` for variant props

### State Management
- **React state** for UI ephemeral state
- **Zustand** for client-wide state (current user, sim speed, active flight)
- **Dexie.js** (IndexedDB wrapper) for persistent world state
- **TanStack Query** for Claude API calls (caching, retries)

### Persistence: Dexie.js (IndexedDB)
All tables live here. Schema defined in `/lib/db.ts`. Works offline. Survives browser refresh. Scoped to single browser profile (by design — local only).

### Maps: Mapbox GL JS
- Free tier: 50k loads/month (way more than needed for personal use)
- Supports satellite + dark style (you have both already)
- Great-circle path rendering via `@turf/turf`
- Custom aircraft markers, friend markers
- Alternative if Mapbox key is annoying: MapLibre GL (open source fork, no key)

### AI: Anthropic Claude API (direct)
- Model: `claude-sonnet-4-6` for DMs, persona decisions
- Haiku 4.5 (`claude-haiku-4-5-20251001`) for high-frequency low-stakes calls (caption generation, quick reactions)
- API key in `.env.local`, proxied through `/api/ai/*` route handlers
- Structured outputs via JSON mode for persona decisions

### Deployment: Vercel
- Already your stack
- `.env.local` for dev, Vercel env vars for prod
- No cron needed (timestamp-based sim)

## Package List

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "mapbox-gl": "^3.5.0",
    "@turf/turf": "^7.0.0",
    "dexie": "^4.0.0",
    "dexie-react-hooks": "^1.1.7",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.51.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/mapbox-gl": "^3.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

## Environment Variables

```
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_APP_NAME=JETSTREAM
```

## Directory Structure

```
/jetstream
├── /app
│   ├── layout.tsx              # shell, nav, sim clock
│   ├── page.tsx                # redirects to /cmd-center
│   ├── /cmd-center/page.tsx    # dashboard
│   ├── /fleet/page.tsx
│   ├── /fleet/[tailNumber]/page.tsx
│   ├── /acquisitions/page.tsx
│   ├── /world/page.tsx         # event calendar + live map
│   ├── /social/page.tsx        # friend feed + DMs
│   ├── /social/[personaId]/page.tsx  # 1:1 DM thread
│   ├── /destinations/page.tsx
│   ├── /destinations/[resortId]/page.tsx
│   ├── /profile/page.tsx
│   ├── /flight/new/page.tsx    # flight planner
│   ├── /flight/[flightId]/page.tsx  # live flight view
│   └── /api
│       ├── /ai/dm/route.ts         # POST: generate friend DM
│       ├── /ai/persona-plan/route.ts  # POST: friend decides next trip
│       ├── /ai/event-recap/route.ts   # POST: generate arrival recap
│       └── /ai/reaction/route.ts      # POST: friend reacts to player action
├── /components
│   ├── /ui               # primitives (Button, Card, etc.)
│   ├── /map              # MapView, AircraftMarker, FriendMarker
│   ├── /fleet            # AircraftCard, FleetGrid
│   ├── /flight           # FlightPlanner, FlightProgress
│   ├── /social           # DMThread, FriendCard, FeedPost
│   ├── /events           # EventCard, EventCalendar
│   └── /destinations     # ResortCard, BookingPanel
├── /lib
│   ├── db.ts             # Dexie schema
│   ├── simulation.ts     # timestamp-based world computation
│   ├── geo.ts            # great-circle math, ETA calc
│   ├── economy.ts        # burn rate, income, prestige
│   ├── persona-engine.ts # friend decision-making
│   ├── claude.ts         # server-side Claude client
│   └── stores.ts         # Zustand stores
├── /data                 # static seed data (JSON)
│   ├── aircraft.json
│   ├── airports.json
│   ├── events.json
│   ├── resorts.json
│   └── personas.json
├── /types                # shared TS types
│   └── index.ts
└── /public
    └── /imagery          # persona portraits, resort photos (stock)
```

## Why This Stack

- **No backend database** = no Supabase setup, no migrations, no auth. Faster to build.
- **Timestamp-based sim** = no cron jobs, no background workers, no serverless cold starts to worry about.
- **Claude API only runs on user action** = predictable costs, no runaway bills. Budget ~$5-15/month for personal play.
- **Everything Antigravity needs is already in the Next.js/Vercel ecosystem** you know.

## Migration Path (Future)
If you ever want multi-device sync:
1. Swap `/lib/db.ts` from Dexie to a Supabase client with identical interface
2. All calling code unchanged (repository pattern hides the storage)
3. Add Supabase auth, wrap app in auth provider
4. Done — no logic rewrite needed

This is why we wrap Dexie calls in repository functions, not call `db.flights.where(...)` directly from components.
