// =============================================================================
// DRAMA EVENT SYSTEM
// =============================================================================
// /lib/drama/triggers.ts
//
// Generates drama events. Sonnet for narrative quality.
// Drama types: jealousy, public spats, gift-bombs, ultimatums, ghosting, etc.

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { applyDelta, relationshipId } from '@/lib/relationships/affinity';
import type { 
  DramaEvent, 
  DramaEventType, 
  DramaSeverity, 
  DramaResponseOption,
  Persona,
  ReputationScores
} from '@/types';

export interface TriggerSeed {
  type: DramaEventType;
  initiatorId: string;
  targetHint?: string;
  tickAt: string;
  reasoning?: string;
  severityHint?: DramaSeverity;
}

export interface TriggerResult extends DramaEvent {
  costUsd: number;
}

// -----------------------------------------------------------------------------
// MAIN ENTRY
// -----------------------------------------------------------------------------

export async function triggerDramaEvent(seed: TriggerSeed): Promise<TriggerResult> {
  const initiator = await db.personas.get(seed.initiatorId);
  if (!initiator) throw new Error(`Initiator ${seed.initiatorId} not found`);
  
  // Resolve targets
  const targets = await resolveTargets(seed, initiator);
  
  // Determine severity if not provided
  const severity: DramaSeverity = seed.severityHint || rollSeverity(seed.type);
  
  // Generate narrative via Sonnet
  const provider = getRegistry().getDefault();
  const narrative = await generateDramaNarrative(provider, seed.type, severity, initiator, targets, seed);
  
  // Build options for player response (if player is a target)
  const playerIsTarget = targets.includes('player');
  const responseOptions = playerIsTarget ? buildResponseOptions(seed.type, severity) : [];
  
  // Determine public visibility based on type and severity
  const publicVisibility = rollVisibility(seed.type, severity);
  
  const dramaEvent: DramaEvent = {
    id: crypto.randomUUID(),
    type: seed.type,
    severity,
    triggeredAt: seed.tickAt,
    initiatorId: seed.initiatorId,
    targetIds: targets,
    affectedRelationshipIds: buildAffectedRelIds(seed.initiatorId, targets),
    title: narrative.title,
    narrativeText: narrative.text,
    publicVisibility,
    playerResponseRequired: playerIsTarget,
    playerResponseOptions: responseOptions,
    playerResponseChosen: null,
    resolvedAt: null,
    metricsChanges: computeImmediateMetricChanges(seed.type, severity, seed.initiatorId, targets),
    triggeredFollowups: [],
    reputationImpact: computeReputationImpact(seed.type, severity),
  };
  
  // Apply immediate metric changes
  for (const [relId, delta] of Object.entries(dramaEvent.metricsChanges)) {
    const rel = await db.relationships.get(relId);
    if (rel) {
      rel.metrics = applyDelta(rel.metrics, delta);
      rel.lastInteractionAt = seed.tickAt;
      rel.history.push({
        id: crypto.randomUUID(),
        type: 'argument',  // generic; could refine
        at: seed.tickAt,
        description: dramaEvent.title,
        metricsDelta: delta,
      });
      await db.relationships.put(rel);
    }
  }
  
  // Save drama event
  await db.dramaEvents.add(dramaEvent);
  
  return { ...dramaEvent, costUsd: narrative.costUsd };
}

// -----------------------------------------------------------------------------
// TARGET RESOLUTION
// -----------------------------------------------------------------------------

async function resolveTargets(seed: TriggerSeed, initiator: Persona): Promise<string[]> {
  // If targetHint mentions "player", target player
  if (seed.targetHint?.toLowerCase().includes('player') || 
      seed.targetHint?.toLowerCase().includes('tama')) {
    return ['player'];
  }
  
  // If hint matches a persona name
  if (seed.targetHint) {
    const allPersonas = await db.personas.toArray();
    const match = allPersonas.find(p => 
      p.displayName.toLowerCase().includes(seed.targetHint!.toLowerCase())
    );
    if (match) return [match.id];
  }
  
  // Default: player is target for most drama types
  if (['jealousy-confrontation', 'silent-treatment', 'gift-bomb', 'ultimatum', 
       'showing-up-uninvited', 'marriage-proposal', 'breakup-initiated'].includes(seed.type)) {
    return ['player'];
  }
  
  // Other drama: pick someone from initiator's relationships
  const relationships = await db.relationships.where('participantA').equals(initiator.id)
    .or('participantB').equals(initiator.id).toArray();
  
  if (relationships.length === 0) return ['player'];
  
  const random = relationships[Math.floor(Math.random() * relationships.length)];
  const otherId = random.participantA === initiator.id ? random.participantB : random.participantA;
  return [otherId];
}

// -----------------------------------------------------------------------------
// SEVERITY ROLL
// -----------------------------------------------------------------------------

function rollSeverity(type: DramaEventType): DramaSeverity {
  const severeTypes: DramaEventType[] = [
    'betrayal-reveal', 'breakup-initiated', 'ultimatum', 
    'press-leak', 'public-declaration', 'marriage-proposal'
  ];
  
  if (severeTypes.includes(type)) {
    const r = Math.random();
    if (r < 0.05) return 'catastrophic';
    if (r < 0.4) return 'major';
    return 'moderate';
  }
  
  // Lighter dramas
  const r = Math.random();
  if (r < 0.6) return 'minor';
  if (r < 0.95) return 'moderate';
  return 'major';
}

// -----------------------------------------------------------------------------
// NARRATIVE GENERATION
// -----------------------------------------------------------------------------

async function generateDramaNarrative(
  provider: ReturnType<ReturnType<typeof getRegistry>['getDefault']>,
  type: DramaEventType,
  severity: DramaSeverity,
  initiator: Persona,
  targets: string[],
  seed: TriggerSeed
): Promise<{ title: string; text: string; costUsd: number }> {
  const targetNames = await Promise.all(targets.map(async id => {
    if (id === 'player') {
      const p = await db.player.get('player');
      return p?.displayName || 'player';
    }
    const persona = await db.personas.get(id);
    return persona?.displayName || id;
  }));
  
  const systemPrompt = `You write drama events for a luxury social simulation. Tone: prestige TV — Succession, Big Little Lies, Industry. 
Specific. Adult. Charged. Never melodramatic.

Output JSON:
{
  "title": "<8-12 word headline. Specific. Names named.>",
  "text": "<2-4 sentence description. Third person. Show what happened, where, what was said or done. Specific details — what room, what drink, what was overheard.>"
}`;

  const userPrompt = `Generate a drama event:
- Type: ${type}
- Severity: ${severity}
- Initiator: ${initiator.displayName} (${initiator.voiceStyle})
- Initiator's drama context: ${initiator.drama}
- Target(s): ${targetNames.join(', ')}
- Reasoning that led to this: ${seed.reasoning || 'unstated'}
- Any additional hint: ${seed.targetHint || 'none'}

Generate the JSON.`;

  // Sonnet for big severity, Haiku for minor
  const useModel = (severity === 'major' || severity === 'catastrophic') 
    ? 'claude-sonnet-4-6' 
    : 'claude-haiku-4-5-20251001';

  const response = await provider.complete({
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 400,
    temperature: 0.9,
    model: useModel,
    metadata: { personaId: initiator.id, purpose: 'drama' },
  });
  
  await db.apiUsage.add({
    id: crypto.randomUUID(),
    timestamp: seed.tickAt,
    model: response.model,
    endpoint: 'drama-narrative',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    personaId: initiator.id,
    providerId: response.providerId,
  });
  
  const cleaned = response.content.replace(/```json\s*|\s*```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || `${initiator.displayName} caused drama`,
      text: parsed.text || '',
      costUsd: response.estimatedCostUsd,
    };
  } catch {
    return {
      title: `${initiator.displayName} ${type.replace(/-/g, ' ')}`,
      text: response.content.substring(0, 300),
      costUsd: response.estimatedCostUsd,
    };
  }
}

// -----------------------------------------------------------------------------
// RESPONSE OPTIONS
// -----------------------------------------------------------------------------

function buildResponseOptions(type: DramaEventType, severity: DramaSeverity): DramaResponseOption[] {
  // Base options vary by drama type
  const options: DramaResponseOption[] = [];
  
  switch (type) {
    case 'jealousy-confrontation':
      options.push(
        { id: 'apologize', label: 'Apologize sincerely', consequencePreview: 'Affection up, agency down', reputationDeltaPreview: { fidelity: 5 } },
        { id: 'explain', label: 'Explain calmly', consequencePreview: 'Trust up if convincing, drama prolonged if not', reputationDeltaPreview: {} },
        { id: 'deny', label: 'Deny everything', consequencePreview: 'Risk: backfires badly if proof exists', reputationDeltaPreview: { discretion: -3 } },
        { id: 'turn-it-around', label: 'Make THEM apologize', consequencePreview: 'Affection plummet, dominance up', reputationDeltaPreview: { dramaProne: 8 } },
      );
      break;
    
    case 'ultimatum':
      options.push(
        { id: 'accept', label: 'Accept their terms', consequencePreview: 'Resolves drama, narrows future options', reputationDeltaPreview: { fidelity: 8 } },
        { id: 'reject', label: 'Reject the ultimatum', consequencePreview: 'Likely breakup-initiated follow-up', reputationDeltaPreview: { dramaProne: 5 } },
        { id: 'negotiate', label: 'Counter-propose', consequencePreview: 'Buy time but appear non-committal', reputationDeltaPreview: {} },
      );
      break;
    
    case 'silent-treatment':
      options.push(
        { id: 'reach-out', label: 'Reach out to fix it', consequencePreview: 'Affection up, may extend drama', reputationDeltaPreview: { generosity: 3 } },
        { id: 'wait-them-out', label: 'Let them come back', consequencePreview: 'Test of who breaks first', reputationDeltaPreview: {} },
        { id: 'send-gift', label: 'Send conciliatory gift', consequencePreview: 'Effective but expensive', reputationDeltaPreview: { generosity: 6 } },
      );
      break;
    
    case 'marriage-proposal':
      options.push(
        { id: 'accept', label: 'Accept', consequencePreview: 'Marriage life event triggers', reputationDeltaPreview: { fidelity: 15 } },
        { id: 'decline-gently', label: 'Decline gently', consequencePreview: 'Likely breakup but with some grace', reputationDeltaPreview: { dramaProne: 4 } },
        { id: 'ask-for-time', label: 'Ask for time to think', consequencePreview: 'Drama prolonged, decision deferred', reputationDeltaPreview: {} },
      );
      break;
    
    default:
      options.push(
        { id: 'engage', label: 'Engage directly', consequencePreview: 'Resolution attempted', reputationDeltaPreview: {} },
        { id: 'deflect', label: 'Deflect/dismiss', consequencePreview: 'Drama may compound', reputationDeltaPreview: { dramaProne: 3 } },
        { id: 'ignore', label: 'Ignore entirely', consequencePreview: 'Drama festers', reputationDeltaPreview: { discretion: 2, dramaProne: 5 } },
      );
  }
  
  return options;
}

// -----------------------------------------------------------------------------
// VISIBILITY ROLL
// -----------------------------------------------------------------------------

function rollVisibility(type: DramaEventType, severity: DramaSeverity): DramaEvent['publicVisibility'] {
  if (['public-spat', 'press-leak', 'public-declaration'].includes(type)) return 'gossip-column';
  if (severity === 'catastrophic') return 'press';
  if (severity === 'major') return Math.random() < 0.6 ? 'gossip-column' : 'whispered';
  if (severity === 'moderate') return Math.random() < 0.3 ? 'whispered' : 'private';
  return 'private';
}

// -----------------------------------------------------------------------------
// METRIC CHANGES
// -----------------------------------------------------------------------------

function computeImmediateMetricChanges(
  type: DramaEventType,
  severity: DramaSeverity,
  initiatorId: string,
  targetIds: string[]
): Record<string, Partial<{ affection: number; trust: number; heat: number; romanticTension: number; rivalry: number }>> {
  const result: Record<string, any> = {};
  const sevMult = { minor: 0.5, moderate: 1.0, major: 1.5, catastrophic: 2.5 }[severity];
  
  for (const targetId of targetIds) {
    const relId = relationshipId(initiatorId, targetId);
    
    // Default impacts by type
    switch (type) {
      case 'jealousy-confrontation':
        result[relId] = { affection: -5 * sevMult, trust: -3 * sevMult, heat: 5 * sevMult, rivalry: 2 * sevMult };
        break;
      case 'gift-bomb':
        result[relId] = { affection: 8 * sevMult, heat: 12 * sevMult, romanticTension: 6 * sevMult };
        break;
      case 'silent-treatment':
        result[relId] = { affection: -4 * sevMult, heat: -10 * sevMult, trust: -3 * sevMult };
        break;
      case 'public-declaration':
        result[relId] = { affection: 6 * sevMult, romanticTension: 10 * sevMult, trust: -2 * sevMult };
        break;
      case 'breakup-initiated':
        result[relId] = { affection: -15 * sevMult, heat: -25, romanticTension: -25 * sevMult, trust: -10 * sevMult };
        break;
      case 'reconciliation-offered':
        result[relId] = { affection: 8 * sevMult, trust: 6 * sevMult };
        break;
      default:
        result[relId] = { affection: -2 * sevMult, heat: 3 * sevMult };
    }
  }
  
  return result;
}

// -----------------------------------------------------------------------------
// REPUTATION IMPACT
// -----------------------------------------------------------------------------

function computeReputationImpact(type: DramaEventType, severity: DramaSeverity): Partial<ReputationScores> {
  const sevMult = { minor: 0.5, moderate: 1.0, major: 1.5, catastrophic: 2.5 }[severity];
  
  // Most drama bumps dramaProne
  const base: Partial<ReputationScores> = { dramaProne: Math.round(2 * sevMult) };
  
  switch (type) {
    case 'press-leak':
    case 'public-spat':
    case 'public-declaration':
    case 'secret-meeting-discovered':
      base.discretion = Math.round(-4 * sevMult);
      break;
    case 'gift-bomb':
      base.generosity = Math.round(3 * sevMult);
      break;
    case 'reconciliation-offered':
      base.dramaProne = Math.round(-1 * sevMult);
      break;
  }
  
  return base;
}

function buildAffectedRelIds(initiatorId: string, targets: string[]): string[] {
  return targets.map(t => relationshipId(initiatorId, t));
}

// -----------------------------------------------------------------------------
// PLAYER RESPONSE RESOLVER
// -----------------------------------------------------------------------------

export async function resolveDramaResponse(
  dramaEventId: string,
  responseOptionId: string,
  tickAt: string
): Promise<void> {
  const drama = await db.dramaEvents.get(dramaEventId);
  if (!drama) throw new Error('Drama event not found');
  
  const option = drama.playerResponseOptions.find(o => o.id === responseOptionId);
  if (!option) throw new Error('Response option not found');
  
  drama.playerResponseChosen = responseOptionId;
  drama.resolvedAt = tickAt;
  
  // Apply reputation delta from option
  const player = await db.player.get('player');
  if (player) {
    // Reputation handled separately by recalculateReputation
    // This just notes the choice happened
  }
  
  await db.dramaEvents.put(drama);
  
  // Some response choices trigger follow-up drama
  if (responseOptionId === 'reject' && drama.type === 'ultimatum') {
    await triggerDramaEvent({
      type: 'breakup-initiated',
      initiatorId: drama.initiatorId,
      targetHint: 'player',
      tickAt,
      reasoning: 'Followup to rejected ultimatum',
    });
  }
}
