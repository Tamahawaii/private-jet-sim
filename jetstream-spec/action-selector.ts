// =============================================================================
// PERSONA ACTION SELECTOR
// =============================================================================
// /lib/behavioral/action-selector.ts
//
// Decides what a persona wants to do on a given tick.
// Uses Haiku (cheap) for selection. Sonnet only invoked if action chosen is "big".

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { relationshipId, relationshipDepth } from '@/lib/relationships/affinity';
import type { 
  PersonaActionDecision, 
  PersonaActionType, 
  Persona, 
  Player 
} from '@/types';

// -----------------------------------------------------------------------------
// MAIN SELECTOR
// -----------------------------------------------------------------------------

export async function selectPersonaAction(
  persona: Persona,
  player: Player,
  tickAt: string
): Promise<PersonaActionDecision> {
  const decisionId = crypto.randomUUID();
  
  // Gather context
  const context = await buildContext(persona, player, tickAt);
  
  // Build prompt
  const prompt = buildSelectionPrompt(persona, player, context);
  
  // Decision call (Haiku - cheap)
  const provider = getRegistry().getDefault();
  const response = await provider.complete({
    systemPrompt: SELECTOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 250,
    temperature: 0.85,
    model: 'claude-haiku-4-5-20251001',
    metadata: {
      personaId: persona.id,
      threadId: decisionId,
      purpose: 'behavior',
    },
  });
  
  // Log API usage
  await db.apiUsage.add({
    id: crypto.randomUUID(),
    timestamp: tickAt,
    model: response.model,
    endpoint: 'behavioral-selection',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    personaId: persona.id,
    threadId: decisionId,
    providerId: response.providerId,
  });
  
  // Parse decision
  const parsed = parseSelectionResponse(response.content);
  
  return {
    personaId: persona.id,
    decisionAt: tickAt,
    chosenAction: parsed.action,
    reasoning: parsed.reasoning,
    context,
    parameters: parsed.parameters,
    modelTier: 'haiku',
    executedAt: null,
    outcome: null,
  };
}

// -----------------------------------------------------------------------------
// CONTEXT BUILDER
// -----------------------------------------------------------------------------

async function buildContext(persona: Persona, player: Player, tickAt: string) {
  const personaState = await db.personaStates.get(persona.id);
  const relId = relationshipId('player', persona.id);
  const rel = await db.relationships.get(relId);
  
  const depth = rel ? relationshipDepth(rel.metrics) : 0;
  const lastInteraction = rel?.lastInteractionAt || persona.id; // fallback
  const daysSince = rel
    ? Math.floor((new Date(tickAt).getTime() - new Date(rel.lastInteractionAt).getTime()) / 86400000)
    : 999;
  
  // Active drama involving this persona
  const activeDramas = await db.dramaEvents
    .where('initiatorId').equals(persona.id)
    .or('targetIds').equals(persona.id)
    .filter(d => !d.resolvedAt)
    .toArray();
  
  // Recent gossip mentioning this persona or player
  const recentGossipCutoff = new Date(new Date(tickAt).getTime() - 7 * 86400000).toISOString();
  const recentGossip = await db.gossipItems
    .where('publishedAt').above(recentGossipCutoff)
    .toArray();
  const relevantGossip = recentGossip.filter(g => 
    g.basedOnEventIds.length > 0 || 
    g.blindSubjects.some(s => s.actualPersonaId === persona.id)
  );
  
  return {
    relationshipDepthToPlayer: depth,
    daysSinceLastInteraction: daysSince,
    currentLocationICAO: personaState?.currentLocationICAO || persona.fleet[0]?.tailNumber || 'unknown',
    activeDramaIds: activeDramas.map(d => d.id),
    recentGossipIds: relevantGossip.map(g => g.id),
  };
}

// -----------------------------------------------------------------------------
// PROMPT CONSTRUCTION
// -----------------------------------------------------------------------------

const SELECTOR_SYSTEM_PROMPT = `You are roleplaying as a sophisticated character in a luxury social simulation. Given context about your character and current situation, decide what (if anything) you want to do next.

Most ticks, choose "do-nothing" — real people don't act every moment. Only act when there's genuine motivation: missed connection, jealousy, romantic interest, life pressure, business opportunity, drama unfolding.

Output ONLY valid JSON in this exact format:
{
  "action": "<one of the action types>",
  "reasoning": "<one sentence why>",
  "parameters": { <action-specific fields> }
}

Action types and their parameters:
- "do-nothing": {}
- "send-dm": { "topic": "brief description", "tone": "warm|flirty|cool|urgent|playful|cutting" }
- "send-gift": { "occasion": "string", "giftCategoryHint": "jewelry|art|wine|experience|symbolic|etc" }
- "fly-somewhere": { "destinationHint": "city or context", "purpose": "why" }
- "attend-event": { "eventCategoryPreference": "art|music|sport|gala|etc" }
- "check-into-resort": { "resortPreferenceHint": "string" }
- "react-to-gossip": { "gossipReaction": "deny|amplify|ignore|message-player", "gossipId": "if relevant" }
- "reach-out-to-other-persona": { "targetPersonaHint": "name or context", "purpose": "string" }
- "initiate-drama": { "dramaType": "jealousy-confrontation|public-spat|silent-treatment|gift-bomb|etc", "targetHint": "string" }
- "progress-life-event": { "lifeEventHint": "engagement|divorce|coming-out|etc" }
- "ghost-period": { "estimatedDaysAbsent": number }`;

function buildSelectionPrompt(
  persona: Persona, 
  player: Player, 
  context: { 
    relationshipDepthToPlayer: number; 
    daysSinceLastInteraction: number;
    currentLocationICAO: string;
    activeDramaIds: string[];
    recentGossipIds: string[];
  }
): string {
  return `YOU ARE: ${persona.displayName}
Identity: ${persona.gender}, ${persona.pronouns}, ${persona.publicOrientation}, ${persona.relationshipStyle}
Voice: ${persona.voiceStyle}
Drama in your life: ${persona.drama}
Currently at: ${context.currentLocationICAO}
Currently with: ${persona.currentPartners.map(p => `${p.name} (${p.relationship})`).join(', ') || 'no one'}

YOUR DYNAMIC WITH PLAYER (${player.displayName}):
${persona.playerDynamic}
Relationship depth: ${context.relationshipDepthToPlayer}/100
Days since last contact: ${context.daysSinceLastInteraction}

CURRENT SITUATION:
- Active drama threads involving you: ${context.activeDramaIds.length}
- Recent gossip you may have seen: ${context.recentGossipIds.length}
- Your declared relationship style: ${persona.relationshipStyle}

PLAYER'S DECLARED STYLE: ${player.relationshipPreferences?.style || 'undeclared'}
${player.relationshipPreferences?.publiclyKnown ? '(publicly known)' : '(private)'}

What do you do? Remember: most ticks should be "do-nothing". Act only with motivation.`;
}

// -----------------------------------------------------------------------------
// RESPONSE PARSER
// -----------------------------------------------------------------------------

function parseSelectionResponse(content: string): {
  action: PersonaActionType;
  reasoning: string;
  parameters: Record<string, unknown>;
} {
  // Strip markdown code fences if present
  const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    return {
      action: (parsed.action || 'do-nothing') as PersonaActionType,
      reasoning: parsed.reasoning || '',
      parameters: parsed.parameters || {},
    };
  } catch (err) {
    // If LLM returned malformed, default to do-nothing
    return {
      action: 'do-nothing',
      reasoning: `Parse failure: ${err instanceof Error ? err.message : 'unknown'}`,
      parameters: {},
    };
  }
}
