// =============================================================================
// PERSONA ACTION EXECUTOR
// =============================================================================
// /lib/behavioral/action-executor.ts
//
// Takes a PersonaActionDecision and actually does the thing:
// inserts DMs, picks gifts, triggers drama events, etc.

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { triggerDramaEvent } from '@/lib/drama/triggers';
import { renderIntimateEncounter } from '@/lib/intimacy/encounter';
import { processLifeEvent } from '@/lib/life-events/handlers';
import { applyDelta, EVENT_DEFAULT_IMPACTS, relationshipId } from '@/lib/relationships/affinity';
import type { 
  PersonaActionDecision, 
  Persona, 
  Player,
  PersonaActionType
} from '@/types';

export interface ExecutionResult {
  summary: string;
  costUsd: number;
  triggeredEvents: { type: string; id: string }[];
}

// -----------------------------------------------------------------------------
// MAIN EXECUTOR
// -----------------------------------------------------------------------------

export async function executeAction(
  decision: PersonaActionDecision,
  persona: Persona,
  player: Player,
  tickAt: string
): Promise<ExecutionResult> {
  switch (decision.chosenAction) {
    case 'do-nothing':
      return { summary: 'No action taken', costUsd: 0, triggeredEvents: [] };
    
    case 'send-dm':
      return await executeSendDm(decision, persona, player, tickAt);
    
    case 'send-gift':
      return await executeSendGift(decision, persona, player, tickAt);
    
    case 'fly-somewhere':
      return await executeFly(decision, persona, tickAt);
    
    case 'attend-event':
      return await executeAttendEvent(decision, persona, tickAt);
    
    case 'check-into-resort':
      return await executeCheckInResort(decision, persona, tickAt);
    
    case 'react-to-gossip':
      return await executeGossipReaction(decision, persona, player, tickAt);
    
    case 'reach-out-to-other-persona':
      return await executePersonaToPersonaContact(decision, persona, tickAt);
    
    case 'initiate-drama':
      return await executeInitiateDrama(decision, persona, player, tickAt);
    
    case 'progress-life-event':
      return await executeProgressLifeEvent(decision, persona, tickAt);
    
    case 'ghost-period':
      return await executeGhostPeriod(decision, persona, tickAt);
    
    default:
      return { 
        summary: `Unknown action: ${decision.chosenAction}`, 
        costUsd: 0, 
        triggeredEvents: [] 
      };
  }
}

// -----------------------------------------------------------------------------
// ACTION HANDLERS
// -----------------------------------------------------------------------------

async function executeSendDm(
  decision: PersonaActionDecision,
  persona: Persona,
  player: Player,
  tickAt: string
): Promise<ExecutionResult> {
  const provider = getRegistry().getDefault();
  const params = decision.parameters as { topic?: string; tone?: string };
  
  // Find or create thread
  let thread = await db.dmThreads
    .where('participantIds').equals(persona.id)
    .first();
  if (!thread) {
    thread = {
      id: crypto.randomUUID(),
      participantIds: [persona.id, 'player'],
      createdAt: tickAt,
      lastMessageAt: tickAt,
      unreadCountForPlayer: 0,
    };
    await db.dmThreads.add(thread);
  }
  
  // Generate message
  const response = await provider.complete({
    systemPrompt: `You are ${persona.displayName}. ${persona.voiceStyle}. 
Your dynamic with player: ${persona.playerDynamic}
Send a brief, in-character DM. Match the requested tone. 1-3 sentences typically.`,
    messages: [{
      role: 'user',
      content: `Send a proactive DM to player. Topic: ${params.topic || 'just reaching out'}. Tone: ${params.tone || 'warm'}.`
    }],
    maxTokens: 200,
    temperature: 0.9,
    model: 'claude-haiku-4-5-20251001',
    metadata: { personaId: persona.id, threadId: thread.id, purpose: 'dm' },
  });
  
  // Save message
  const messageId = crypto.randomUUID();
  await db.dmMessages.add({
    id: messageId,
    threadId: thread.id,
    senderId: persona.id,
    content: response.content,
    sentAt: tickAt,
    readByPlayer: false,
    isProactive: true,
  });
  
  // Update thread
  thread.lastMessageAt = tickAt;
  thread.unreadCountForPlayer = (thread.unreadCountForPlayer || 0) + 1;
  await db.dmThreads.put(thread);
  
  // Apply relationship delta
  const relId = relationshipId('player', persona.id);
  const rel = await db.relationships.get(relId);
  if (rel) {
    rel.metrics = applyDelta(rel.metrics, EVENT_DEFAULT_IMPACTS['dm-exchanged']);
    rel.lastInteractionAt = tickAt;
    rel.history.push({
      id: crypto.randomUUID(),
      type: 'dm-exchanged',
      at: tickAt,
      description: `${persona.displayName} reached out (proactive)`,
      contextRefs: { dmThreadId: thread.id },
    });
    await db.relationships.put(rel);
  }
  
  // Log API usage
  await db.apiUsage.add({
    id: crypto.randomUUID(),
    timestamp: tickAt,
    model: response.model,
    endpoint: 'proactive-dm',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    personaId: persona.id,
    threadId: thread.id,
    providerId: response.providerId,
  });
  
  return {
    summary: `Sent proactive DM: "${response.content.substring(0, 60)}..."`,
    costUsd: response.estimatedCostUsd,
    triggeredEvents: [{ type: 'dm', id: messageId }],
  };
}

async function executeSendGift(
  decision: PersonaActionDecision,
  persona: Persona,
  player: Player,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { occasion?: string; giftCategoryHint?: string };
  
  // Pick gift from catalog matching persona's wealth and player preference
  const allGifts = await db.giftItems.toArray();
  const candidates = allGifts.filter(g => {
    if (params.giftCategoryHint && !g.category.includes(params.giftCategoryHint)) return false;
    if (g.basePrice > persona.netWorth * 0.0001) return false; // proportional to wealth
    return true;
  });
  if (candidates.length === 0) return { summary: 'No suitable gifts available', costUsd: 0, triggeredEvents: [] };
  
  const gift = candidates[Math.floor(Math.random() * candidates.length)];
  
  // Insert gift record
  const giftId = crypto.randomUUID();
  await db.giftsSent.add({
    id: giftId,
    giftItemId: gift.id,
    fromId: persona.id,
    toId: 'player',
    occasion: params.occasion,
    sentAt: tickAt,
    receivedAt: tickAt,
    metricsApplied: gift.affinityImpact,
  });
  
  // Apply relationship delta
  const relId = relationshipId('player', persona.id);
  const rel = await db.relationships.get(relId);
  if (rel) {
    rel.metrics = applyDelta(rel.metrics, gift.affinityImpact);
    rel.lastInteractionAt = tickAt;
    rel.history.push({
      id: crypto.randomUUID(),
      type: 'gift-sent',
      at: tickAt,
      description: `${persona.displayName} sent: ${gift.name}`,
      contextRefs: { giftId },
    });
    await db.relationships.put(rel);
  }
  
  // Send accompanying DM
  const provider = getRegistry().getDefault();
  const dmResponse = await provider.complete({
    systemPrompt: `You are ${persona.displayName}. ${persona.voiceStyle}.`,
    messages: [{
      role: 'user',
      content: `You just sent player a gift: "${gift.name}" - ${gift.description}. Occasion: ${params.occasion || 'just because'}. Send a brief accompanying DM (1-2 sentences) in your voice.`
    }],
    maxTokens: 150,
    temperature: 0.9,
    model: 'claude-haiku-4-5-20251001',
    metadata: { personaId: persona.id, purpose: 'gift-card' },
  });
  
  return {
    summary: `Sent gift: ${gift.name} ($${gift.basePrice})`,
    costUsd: dmResponse.estimatedCostUsd,
    triggeredEvents: [{ type: 'gift', id: giftId }],
  };
}

async function executeFly(
  decision: PersonaActionDecision,
  persona: Persona,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { destinationHint?: string; purpose?: string };
  
  // Find airport matching hint
  const airports = await db.airports.toArray();
  let destination = null;
  
  if (params.destinationHint) {
    const hint = params.destinationHint.toLowerCase();
    destination = airports.find(a => 
      a.city?.toLowerCase().includes(hint) || 
      a.name?.toLowerCase().includes(hint) ||
      a.country?.toLowerCase().includes(hint)
    );
  }
  
  // Fallback: pick from preferred resorts or residences
  if (!destination && persona.preferredResorts.length > 0) {
    const resorts = await db.resorts.toArray();
    const preferred = resorts.filter(r => persona.preferredResorts.includes(r.id));
    if (preferred.length > 0) {
      const resort = preferred[Math.floor(Math.random() * preferred.length)];
      destination = airports.find(a => a.icao === resort.locationICAO);
    }
  }
  
  if (!destination) return { summary: 'No suitable destination', costUsd: 0, triggeredEvents: [] };
  
  // Update persona state
  const state = await db.personaStates.get(persona.id);
  if (state) {
    state.currentLocationICAO = destination.icao;
    await db.personaStates.put(state);
  }
  
  return {
    summary: `Flew to ${destination.city} (${destination.icao}) — ${params.purpose || 'no stated purpose'}`,
    costUsd: 0,
    triggeredEvents: [],
  };
}

async function executeAttendEvent(
  decision: PersonaActionDecision,
  persona: Persona,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { eventCategoryPreference?: string };
  
  // Find upcoming events matching preference
  const allEvents = await db.events.toArray();
  const upcoming = allEvents.filter(e => 
    new Date(e.startDate).getTime() > new Date(tickAt).getTime() &&
    (!params.eventCategoryPreference || e.category === params.eventCategoryPreference)
  );
  if (upcoming.length === 0) return { summary: 'No upcoming events match', costUsd: 0, triggeredEvents: [] };
  
  const event = upcoming[Math.floor(Math.random() * upcoming.length)];
  
  // Add to confirmed attendees if not already
  if (!event.confirmedAttendees?.includes(persona.id)) {
    event.confirmedAttendees = [...(event.confirmedAttendees || []), persona.id];
    await db.events.put(event);
  }
  
  return {
    summary: `RSVP'd to ${event.name}`,
    costUsd: 0,
    triggeredEvents: [{ type: 'event-rsvp', id: event.id }],
  };
}

async function executeCheckInResort(
  decision: PersonaActionDecision,
  persona: Persona,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { resortPreferenceHint?: string };
  
  const resorts = await db.resorts.toArray();
  const preferred = resorts.filter(r => persona.preferredResorts.includes(r.id));
  if (preferred.length === 0) return { summary: 'No preferred resorts', costUsd: 0, triggeredEvents: [] };
  
  const resort = preferred[Math.floor(Math.random() * preferred.length)];
  
  // Update persona state to be at resort
  const state = await db.personaStates.get(persona.id);
  if (state) {
    state.currentLocationICAO = resort.locationICAO;
    await db.personaStates.put(state);
  }
  
  return {
    summary: `Checked into ${resort.name}`,
    costUsd: 0,
    triggeredEvents: [],
  };
}

async function executeGossipReaction(
  decision: PersonaActionDecision,
  persona: Persona,
  player: Player,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { gossipReaction?: string; gossipId?: string };
  
  // If reaction is to message player, send DM
  if (params.gossipReaction === 'message-player') {
    return await executeSendDm({
      ...decision,
      parameters: { topic: 'reacting to recent gossip', tone: 'cool' },
    }, persona, player, tickAt);
  }
  
  // Other reactions logged but no immediate effect (Phase 10 will expand this)
  return {
    summary: `Reacted to gossip: ${params.gossipReaction}`,
    costUsd: 0,
    triggeredEvents: [],
  };
}

async function executePersonaToPersonaContact(
  decision: PersonaActionDecision,
  persona: Persona,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { targetPersonaHint?: string; purpose?: string };
  
  // Find target persona
  const allPersonas = await db.personas.toArray();
  let target = null;
  if (params.targetPersonaHint) {
    const hint = params.targetPersonaHint.toLowerCase();
    target = allPersonas.find(p => p.displayName.toLowerCase().includes(hint));
  }
  if (!target) {
    // Pick a random persona they have a relationship with
    const otherIds = allPersonas.filter(p => p.id !== persona.id).map(p => p.id);
    const randomTarget = otherIds[Math.floor(Math.random() * otherIds.length)];
    target = await db.personas.get(randomTarget);
  }
  if (!target) return { summary: 'No target found', costUsd: 0, triggeredEvents: [] };
  
  // Apply small relationship update between the two personas
  const relId = relationshipId(persona.id, target.id);
  const rel = await db.relationships.get(relId);
  if (rel) {
    rel.metrics = applyDelta(rel.metrics, { affection: 2, heat: 1 });
    rel.lastInteractionAt = tickAt;
    rel.history.push({
      id: crypto.randomUUID(),
      type: 'dm-exchanged',
      at: tickAt,
      description: `${persona.displayName} reached out to ${target.displayName}: ${params.purpose || 'catching up'}`,
    });
    await db.relationships.put(rel);
  }
  
  return {
    summary: `Reached out to ${target.displayName}: ${params.purpose || 'catching up'}`,
    costUsd: 0,
    triggeredEvents: [],
  };
}

async function executeInitiateDrama(
  decision: PersonaActionDecision,
  persona: Persona,
  player: Player,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { dramaType?: string; targetHint?: string };
  
  // Delegate to drama trigger system (uses Sonnet for narrative quality)
  const dramaEvent = await triggerDramaEvent({
    type: (params.dramaType as any) || 'jealousy-confrontation',
    initiatorId: persona.id,
    targetHint: params.targetHint,
    tickAt,
    reasoning: decision.reasoning,
  });
  
  return {
    summary: `Initiated drama: ${dramaEvent.title}`,
    costUsd: dramaEvent.costUsd,
    triggeredEvents: [{ type: 'drama', id: dramaEvent.id }],
  };
}

async function executeProgressLifeEvent(
  decision: PersonaActionDecision,
  persona: Persona,
  tickAt: string
): Promise<ExecutionResult> {
  const params = decision.parameters as { lifeEventHint?: string };
  
  // Delegate to life event handler
  const result = await processLifeEvent({
    primaryPersonaId: persona.id,
    typeHint: params.lifeEventHint || 'unspecified',
    tickAt,
  });
  
  return {
    summary: result.summary,
    costUsd: result.costUsd,
    triggeredEvents: [{ type: 'life-event', id: result.eventId }],
  };
}

async function executeGhostPeriod(
  decision: PersonaActionDecision,
  persona: Persona,
  tickAt: string
): Promise<ExecutionResult> {
  // Mark persona as "ghosting" — don't pick them in next N ticks
  const state = await db.personaStates.get(persona.id);
  if (state) {
    const ghostUntil = new Date(new Date(tickAt).getTime() + 
      ((decision.parameters as any).estimatedDaysAbsent || 5) * 86400000).toISOString();
    state.ghostUntil = ghostUntil;
    await db.personaStates.put(state);
  }
  
  return {
    summary: `Going dark for ~${(decision.parameters as any).estimatedDaysAbsent || 5} days`,
    costUsd: 0,
    triggeredEvents: [],
  };
}
