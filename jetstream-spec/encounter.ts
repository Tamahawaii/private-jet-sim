// =============================================================================
// INTIMATE ENCOUNTER SYSTEM
// =============================================================================
// /lib/intimacy/encounter.ts
//
// Generates fade-to-black intimate scenes:
// - Brief buildup (1-3 sentences from persona POV)
// - Bouncing emojis (4-6, contextual)
// - Atmospheric paragraph (sensual mood, no explicit acts)
// - Optional morning-after scene

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { applyDelta, EVENT_DEFAULT_IMPACTS, relationshipId } from '@/lib/relationships/affinity';
import { selectEmojisForContext } from './emoji-curator';
import type { 
  IntimateEncounter, 
  IntimacyDepth, 
  Persona, 
  Player 
} from '@/types';

export interface EncounterSeed {
  participantIds: string[];          // ['player', personaId] (or persona-to-persona)
  initiatedBy: string;
  depth: IntimacyDepth;
  location: string;
  occurredAt: string;
  context?: string;                  // free-form context: "after the Monaco GP afterparty", "in the Aman Venice suite"
}

export async function renderIntimateEncounter(seed: EncounterSeed): Promise<{
  encounter: IntimateEncounter;
  costUsd: number;
}> {
  // Fetch participants
  const player = await db.player.get('player');
  const personaId = seed.participantIds.find(id => id !== 'player');
  if (!personaId) throw new Error('Need at least one persona participant');
  const persona = await db.personas.get(personaId);
  if (!persona || !player) throw new Error('Could not load participants');
  
  // Generate textual content via Sonnet (quality matters for these scenes)
  const provider = getRegistry().getDefault();
  const generated = await generateEncounterText(provider, persona, player, seed);
  
  // Pick contextual emojis
  const emojis = selectEmojisForContext({
    depth: seed.depth,
    location: seed.location,
    persona,
  });
  
  // Build encounter record
  const encounter: IntimateEncounter = {
    id: crypto.randomUUID(),
    participantIds: seed.participantIds,
    initiatedBy: seed.initiatedBy,
    depth: seed.depth,
    location: seed.location,
    occurredAt: seed.occurredAt,
    buildupText: generated.buildup,
    emojis,
    fadeText: generated.fade,
    morningAfterText: generated.morningAfter,
    metricsApplied: getMetricsForDepth(seed.depth),
    triggeredJealousyFrom: await detectJealousyTriggers(personaId, seed.occurredAt),
    triggeredGossip: shouldTriggerGossip(persona, seed),
    isPubliclyKnown: rollPublicVisibility(seed),
  };
  
  // Apply relationship metric changes
  const relId = relationshipId('player', personaId);
  const rel = await db.relationships.get(relId);
  if (rel) {
    rel.metrics = applyDelta(rel.metrics, encounter.metricsApplied);
    rel.lastInteractionAt = seed.occurredAt;
    rel.history.push({
      id: crypto.randomUUID(),
      type: encounter.depth === 'first-night' ? 'first-intimacy' : 
            encounter.depth === 'kiss' ? 'first-kiss' : 'shared-event',
      at: seed.occurredAt,
      description: `Intimate encounter at ${seed.location}`,
      metricsDelta: encounter.metricsApplied,
    });
    await db.relationships.put(rel);
  }
  
  // Save encounter
  await db.intimateEncounters.add(encounter);
  
  return {
    encounter,
    costUsd: generated.costUsd,
  };
}

// -----------------------------------------------------------------------------
// LLM GENERATION
// -----------------------------------------------------------------------------

async function generateEncounterText(
  provider: ReturnType<ReturnType<typeof getRegistry>['getDefault']>,
  persona: Persona,
  player: Player,
  seed: EncounterSeed
): Promise<{
  buildup: string;
  fade: string;
  morningAfter: string | null;
  costUsd: number;
}> {
  const systemPrompt = `You are writing intimate scenes for a sophisticated luxury social simulation game.

CRITICAL CONSTRAINTS:
- The scene MUST fade to black before any explicit physical contact
- NO explicit sexual content, NO descriptions of acts, NO body parts, NO clothing removal beyond suggestion
- Sensual, atmospheric, mood-setting prose only
- Think prestige TV — Conversations With Friends, Normal People, Past Lives — implied not shown
- Style: literary, restrained, evocative

OUTPUT FORMAT (valid JSON only):
{
  "buildup": "<1-3 sentences leading into the moment from third-person observation. Show charged tension, look exchanged, decision made. End just before the scene fades.>",
  "fade": "<one atmospheric paragraph (3-5 sentences) capturing the mood/setting/feeling of what unfolds. Sensual and tender or charged, depending on dynamic. Reference setting, light, sound, weight of the moment. Never describe acts.>",
  "morningAfter": "<optional 1-2 sentences morning-after scene, or null if not applicable. Light through curtains, who wakes first, what is or isn't said.>"
}`;

  const userPrompt = `Scene context:
- ${player.displayName} (${player.gender}, ${player.publicOrientation || 'gay'}) and ${persona.displayName} (${persona.gender}, ${persona.publicOrientation})
- Initiated by: ${seed.initiatedBy === 'player' ? player.displayName : persona.displayName}
- Depth: ${seed.depth}
- Location: ${seed.location}
- Persona's voice: ${persona.voiceStyle}
- Persona's playerDynamic: ${persona.playerDynamic}
- Their drama: ${persona.drama}
- Additional context: ${seed.context || 'none provided'}

Write the scene per the constraints. JSON only.`;

  const response = await provider.complete({
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 600,
    temperature: 0.85,
    model: 'claude-sonnet-4-6',  // Sonnet for prose quality
    metadata: { personaId: persona.id, purpose: 'intimacy' },
  });
  
  // Log usage
  await db.apiUsage.add({
    id: crypto.randomUUID(),
    timestamp: seed.occurredAt,
    model: response.model,
    endpoint: 'intimate-encounter',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    personaId: persona.id,
    providerId: response.providerId,
  });
  
  // Parse
  const cleaned = response.content.replace(/```json\s*|\s*```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      buildup: parsed.buildup || '',
      fade: parsed.fade || '',
      morningAfter: parsed.morningAfter || null,
      costUsd: response.estimatedCostUsd,
    };
  } catch {
    // Fallback if LLM fails
    return {
      buildup: 'A look exchanged, an unspoken question answered.',
      fade: 'The night belonged to them both.',
      morningAfter: null,
      costUsd: response.estimatedCostUsd,
    };
  }
}

// -----------------------------------------------------------------------------
// METRICS BY DEPTH
// -----------------------------------------------------------------------------

function getMetricsForDepth(depth: IntimacyDepth): Partial<{
  affection: number; trust: number; heat: number; romanticTension: number;
}> {
  switch (depth) {
    case 'kiss': return EVENT_DEFAULT_IMPACTS['first-kiss'];
    case 'makeout': return { heat: 22, romanticTension: 22, affection: 6 };
    case 'first-night': return EVENT_DEFAULT_IMPACTS['first-intimacy'];
    case 'returning': return { heat: 18, romanticTension: 12, affection: 8, trust: 4 };
    case 'morning-after': return { trust: 8, affection: 6 };
    case 'reunion': return { heat: 25, romanticTension: 22, affection: 12, trust: 6 };
  }
}

// -----------------------------------------------------------------------------
// JEALOUSY DETECTION
// -----------------------------------------------------------------------------

async function detectJealousyTriggers(personaId: string, occurredAt: string): Promise<string[]> {
  // Find personas who currently consider themselves romantically linked to player
  const relationships = await db.relationships
    .where('participantA').equals('player')
    .or('participantB').equals('player')
    .toArray();
  
  const romanticLinks = relationships.filter(rel => 
    ['flirting', 'romantic-interest', 'dating', 'situationship', 'intimate-occasional', 'partners', 'married']
      .includes(rel.status)
  );
  
  // Each linked persona other than this one is potentially jealous
  const jealousIds: string[] = [];
  for (const rel of romanticLinks) {
    const otherId = rel.participantA === 'player' ? rel.participantB : rel.participantA;
    if (otherId === personaId) continue;
    
    // Roll for jealousy based on relationship depth and player's declared style
    const player = await db.player.get('player');
    const playerStyle = player?.relationshipPreferences?.style || 'undeclared';
    
    // Open/poly players cause less jealousy when style is publicly known
    if (playerStyle === 'open' && player?.relationshipPreferences?.publiclyKnown) {
      if (Math.random() < 0.15) jealousIds.push(otherId);
    } else if (playerStyle === 'polyamorous' && player?.relationshipPreferences?.publiclyKnown) {
      if (Math.random() < 0.10) jealousIds.push(otherId);
    } else {
      // Default jealousy probability scaled by relationship intensity
      if (Math.random() < 0.55) jealousIds.push(otherId);
    }
  }
  
  return jealousIds;
}

// -----------------------------------------------------------------------------
// GOSSIP TRIGGER LOGIC
// -----------------------------------------------------------------------------

function shouldTriggerGossip(persona: Persona, seed: EncounterSeed): boolean {
  // Public locations are gossip-prone
  const publicishLocations = /restaurant|hotel|resort|bar|club|gala/i;
  if (publicishLocations.test(seed.location)) return Math.random() < 0.6;
  
  // Famous personas are always gossip-tracked
  if (persona.wealthTier >= 4) return Math.random() < 0.4;
  
  // First-time encounters more likely
  if (seed.depth === 'first-night' || seed.depth === 'kiss') return Math.random() < 0.35;
  
  return Math.random() < 0.2;
}

function rollPublicVisibility(seed: EncounterSeed): boolean {
  // Did paparazzi/staff/guests see them?
  const publicishLocations = /restaurant|hotel|resort|bar|club|gala|airport/i;
  if (publicishLocations.test(seed.location)) return Math.random() < 0.5;
  return Math.random() < 0.1;
}
