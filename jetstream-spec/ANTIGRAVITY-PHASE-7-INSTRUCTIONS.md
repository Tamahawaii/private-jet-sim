# ANTIGRAVITY INSTRUCTIONS — PHASE 7

Pluggable LLM provider system + custom persona creation.

You will receive these files:
- `lib/llm/types.ts` — provider interface (drop in)
- `lib/llm/providers/anthropic.ts` (drop in)
- `lib/llm/providers/google.ts` (drop in)
- `lib/llm/providers/openai.ts` (drop in)
- `lib/llm/registry.ts` (drop in)
- `types/phase-7-8-additions.ts` — type additions
- `specs/CUSTOM-PERSONA-CREATION.md` — UX flow

---

## SEQUENCE

### STEP 1: Install LLM provider system

1. Create `/lib/llm/` directory in project
2. Drop in all 5 files exactly as provided
3. Add types from `types/phase-7-8-additions.ts` to `/types/index.ts` (CustomPersona, CustomPersonaSeed sections only — Phase 8 types come later)

### STEP 2: Refactor existing DM endpoint

The existing DM endpoint (likely `/app/api/ai/dm/route.ts`) currently calls Anthropic directly.
Refactor to use the registry:

**BEFORE:**
```typescript
// hardcoded anthropic call
const response = await fetch('https://api.anthropic.com/v1/messages', { ... });
```

**AFTER:**
```typescript
import { getDefaultProvider } from '@/lib/llm/registry';

const provider = getDefaultProvider();
const response = await provider.complete({
  systemPrompt: builtSystemPrompt,
  messages: conversationMessages,
  maxTokens: 800,
  temperature: 0.85,
  metadata: {
    personaId: persona.id,
    threadId: thread.id,
    purpose: 'dm',
  },
});

// response.content has the message text
// response.estimatedCostUsd ready for logging
// response.providerId for tracking
```

Update apiUsage logging to include `providerId` field.

### STEP 3: Settings UI for provider switching

Add to `/app/settings/page.tsx` (or create section if exists):

**LLM PROVIDER section:**
- Currently active: [Anthropic / Google / OpenAI]
- Available providers (list, with status indicator green/red):
  - Each row: provider name, default model dropdown, "Test Connection" button, "Set as Default" button
- "Add provider key" — for keys not in env yet (would require server-side handling; defer to manual env config for v1)

For v1, simply:
- Read which providers are registered (server-side)
- Show as radio buttons: "Use Anthropic" / "Use Google" / "Use OpenAI"
- POST to `/api/settings/llm-provider` to set
- Server endpoint calls `registry.setDefault(id)`

### STEP 4: Cost dashboard upgrade

Update existing api usage view to show:
- Cost broken down by provider
- Cost broken down by purpose (dm, custom-persona-bio, behavior, etc.)
- 7-day / 30-day rolling totals
- Cost-per-DM averages by provider (so player can see Gemini saves money vs Claude)

### STEP 5: Custom persona creation

Follow the UX in `specs/CUSTOM-PERSONA-CREATION.md`:

1. Create `/app/social/custom/new/page.tsx` — the form
2. Create `/app/api/personas/custom/route.ts` — POST endpoint
   - Receives CustomPersonaSeed
   - Calls Sonnet via registry (force model: 'claude-sonnet-4-6')
   - Parses JSON response
   - Returns assembled persona for preview
3. Confirmation step (client-side):
   - Show editable preview of all fields
   - "Create" button POSTs to `/api/personas/custom/save`
4. Save endpoint inserts into `db.personas` with isCustom flag
5. Redirect to `/social/[newPersonaId]`

Also:
- Add "+ Custom Persona" button to `/social` page header
- On `/social/[personaId]` for custom personas, show "Edit" and "Delete" buttons
- Edit form is the same as creation, pre-populated, no LLM call

### STEP 6: Required environment variables

Document in README:
- `ANTHROPIC_API_KEY` — required
- `GOOGLE_AI_API_KEY` — optional (enables Gemini)
- `OPENAI_API_KEY` — optional (enables GPT)
- `LLM_DEFAULT_PROVIDER` — optional override ('anthropic' | 'google' | 'openai')
- `ANTHROPIC_DEFAULT_MODEL` — optional (default: claude-haiku-4-5-20251001)
- `GOOGLE_DEFAULT_MODEL` — optional (default: gemini-2.5-flash)
- `OPENAI_DEFAULT_MODEL` — optional (default: gpt-4o-mini)

User adds these in Vercel env vars dashboard.

---

## VERIFICATION CHECKLIST

- [ ] DMs still work after refactor (test with existing personas)
- [ ] apiUsage records include providerId field
- [ ] Cost calculations correct (compare to manual: tokens * pricing)
- [ ] If GOOGLE_AI_API_KEY added to env, Gemini option appears in settings
- [ ] If GOOGLE_AI_API_KEY added, "Test Connection" returns ok
- [ ] Switching default provider via settings → next DM uses new provider
- [ ] Custom persona creation flow works end-to-end
- [ ] Generated persona has all required fields
- [ ] Custom persona appears in /social list
- [ ] Custom persona has working DM thread
- [ ] Custom persona can be edited and deleted
- [ ] Settings UI shows current provider + costs

---

## SHIP ORDER

1. LLM provider system + DM refactor → push → verify DMs still work
2. Settings provider switching → push → verify can switch providers
3. Custom persona creation → push → verify can create + DM custom persona

Three commits, three verifications.
