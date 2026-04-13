// =============================================================================
// LIFE EVENTS HANDLER
// =============================================================================
// /lib/life-events/handlers.ts
//
// Marriages, divorces, births, breakups, comings-out, etc.
// Updates persona records, triggers gossip, modifies relationships.

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { relationshipId } from '@/lib/relationships/affinity';
import type { 
  LifeEvent, 
  LifeEventType, 
  Persona,
  PartnerEntry
} from '@/types';

export interface LifeEventSeed {
  primaryPersonaId: string;
  secondaryPersonaId?: string;
  typeHint: string;
  tickAt: string;
  triggeredByDramaEventId?: string;
}

export interface LifeEventResult {
  eventId: string;
  summary: string;
  costUsd: number;
}

// -----------------------------------------------------------------------------
// MAIN ENTRY
// -----------------------------------------------------------------------------

export async function processLifeEvent(seed: LifeEventSeed): Promise<LifeEventResult> {
  const persona = await db.personas.get(seed.primaryPersonaId);
  if (!persona) throw new Error(`Persona ${seed.primaryPersonaId} not found`);
  
  // Resolve event type from hint
  const type = resolveEventType(seed.typeHint, persona);
  
  // Generate descriptive narrative
  const provider = getRegistry().getDefault();
  const narrative = await generateLifeEventNarrative(provider, type, persona, seed);
  
  // Compute status changes for the persona
  const statusChanges = await computeStatusChanges(type, persona, seed);
  
  // Build life event record
  const lifeEvent: LifeEvent = {
    id: crypto.randomUUID(),
    type,
    primaryPersonaId: seed.primaryPersonaId,
    secondaryPersonaId: seed.secondaryPersonaId,
    childPersonaId: undefined,  // Set below for births
    occurredAt: seed.tickAt,
    description: narrative.text,
    publicVisibility: getDefaultVisibility(type),
    triggeredByDramaEventId: seed.triggeredByDramaEventId,
    statusChanges,
    newRelationships: [],
    endedRelationshipIds: [],
  };
  
  // Apply changes
  await applyLifeEventChanges(lifeEvent, persona);
  
  // Save
  await db.lifeEvents.add(lifeEvent);
  
  return {
    eventId: lifeEvent.id,
    summary: `${type}: ${narrative.text.substring(0, 80)}...`,
    costUsd: narrative.costUsd,
  };
}

// -----------------------------------------------------------------------------
// TYPE RESOLUTION
// -----------------------------------------------------------------------------

function resolveEventType(hint: string, persona: Persona): LifeEventType {
  const h = hint.toLowerCase();
  
  if (h.includes('engag')) return 'engagement';
  if (h.includes('marri') || h.includes('wedding')) return 'marriage';
  if (h.includes('separat')) return 'separation';
  if (h.includes('divorc')) return 'divorce';
  if (h.includes('birth') || h.includes('baby') || h.includes('child born')) return 'child-born';
  if (h.includes('adopt')) return 'child-adopted';
  if (h.includes('death') || h.includes('died')) return 'death-in-family';
  if (h.includes('illness') || h.includes('cancer') || h.includes('sick')) return 'major-illness';
  if (h.includes('ipo') || h.includes('exit') || h.includes('award') || h.includes('milestone')) return 'professional-milestone';
  if (h.includes('bankrupt') || h.includes('scandal') || h.includes('loss')) return 'major-loss';
  if (h.includes('religion') || h.includes('faith') || h.includes('convert')) return 'religious-conversion';
  if (h.includes('transition') || h.includes('gender')) return 'gender-transition-announcement';
  if (h.includes('coming out') || h.includes('came out') || h.includes('reveal')) return 'coming-out';
  
  // Smart defaults based on persona context
  if (persona.currentPartners.length > 0) {
    // If they have a partner, drama might be marriage/separation territory
    return Math.random() < 0.5 ? 'engagement' : 'separation';
  }
  
  return 'professional-milestone';  // safe fallback
}

// -----------------------------------------------------------------------------
// NARRATIVE GENERATION
// -----------------------------------------------------------------------------

async function generateLifeEventNarrative(
  provider: ReturnType<ReturnType<typeof getRegistry>['getDefault']>,
  type: LifeEventType,
  persona: Persona,
  seed: LifeEventSeed
): Promise<{ text: string; costUsd: number }> {
  const systemPrompt = `You write life-event descriptions for a luxury social simulation. 
Tone: literary, factual, dignified. Specific. Adult. 2-3 sentences. Third person.

Avoid clichés. Avoid "love wins". Just state what happened, where, with whom, with quiet weight.`;

  let secondary: Persona | undefined;
  if (seed.secondaryPersonaId) {
    secondary = await db.personas.get(seed.secondaryPersonaId);
  }

  const userPrompt = `Persona: ${persona.displayName}
Their drama context: ${persona.drama}
Their current partners: ${persona.currentPartners.map(p => p.name).join(', ') || 'none'}
${secondary ? `Other party: ${secondary.displayName}` : ''}

Event type: ${type}
${seed.triggeredByDramaEventId ? '(Triggered by recent drama)' : ''}

Write a 2-3 sentence description.`;

  // Sonnet for big events, Haiku for smaller
  const useModel = ['marriage', 'divorce', 'death-in-family', 'coming-out', 'gender-transition-announcement', 'major-loss']
    .includes(type) ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  const response = await provider.complete({
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 200,
    temperature: 0.85,
    model: useModel,
    metadata: { personaId: persona.id, purpose: 'life-event' },
  });
  
  await db.apiUsage.add({
    id: crypto.randomUUID(),
    timestamp: seed.tickAt,
    model: response.model,
    endpoint: 'life-event-narrative',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    personaId: persona.id,
    providerId: response.providerId,
  });
  
  return { text: response.content.trim(), costUsd: response.estimatedCostUsd };
}

// -----------------------------------------------------------------------------
// STATUS CHANGES
// -----------------------------------------------------------------------------

async function computeStatusChanges(
  type: LifeEventType,
  persona: Persona,
  seed: LifeEventSeed
): Promise<LifeEvent['statusChanges']> {
  const changes: LifeEvent['statusChanges'] = [];
  
  switch (type) {
    case 'engagement':
      changes.push({
        personaId: persona.id,
        field: 'publicRelationshipStatus',
        oldValue: persona.publicRelationshipStatus,
        newValue: 'engaged',
      });
      break;
    
    case 'marriage':
      changes.push({
        personaId: persona.id,
        field: 'publicRelationshipStatus',
        oldValue: persona.publicRelationshipStatus,
        newValue: 'married',
      });
      // Update partner status
      if (seed.secondaryPersonaId) {
        const newPartners: PartnerEntry[] = [
          ...persona.currentPartners,
          {
            name: (await db.personas.get(seed.secondaryPersonaId))?.displayName || 'spouse',
            relationship: 'spouse (newly married)',
            status: 'in honeymoon period',
            publicly_known: true,
          }
        ];
        changes.push({
          personaId: persona.id,
          field: 'currentPartners',
          oldValue: persona.currentPartners,
          newValue: newPartners,
        });
      }
      break;
    
    case 'separation':
    case 'divorce':
      changes.push({
        personaId: persona.id,
        field: 'publicRelationshipStatus',
        oldValue: persona.publicRelationshipStatus,
        newValue: type === 'divorce' ? 'divorced' : 'separated',
      });
      // Remove partner from currentPartners
      if (seed.secondaryPersonaId) {
        const targetName = (await db.personas.get(seed.secondaryPersonaId))?.displayName;
        const newPartners = persona.currentPartners.filter(p => p.name !== targetName);
        changes.push({
          personaId: persona.id,
          field: 'currentPartners',
          oldValue: persona.currentPartners,
          newValue: newPartners,
        });
      }
      break;
    
    case 'coming-out':
      // Promote privateOrientation to publicOrientation
      if ((persona as any).privateOrientation) {
        changes.push({
          personaId: persona.id,
          field: 'publicOrientation',
          oldValue: persona.publicOrientation,
          newValue: (persona as any).privateOrientation,
        });
      }
      break;
    
    case 'child-born':
    case 'child-adopted':
      // Child not modeled as full persona for now; tracked in description
      break;
  }
  
  return changes;
}

// -----------------------------------------------------------------------------
// APPLY CHANGES
// -----------------------------------------------------------------------------

async function applyLifeEventChanges(lifeEvent: LifeEvent, persona: Persona): Promise<void> {
  for (const change of lifeEvent.statusChanges) {
    const target = await db.personas.get(change.personaId);
    if (!target) continue;
    
    (target as any)[change.field] = change.newValue;
    await db.personas.put(target);
  }
  
  // For marriage/divorce, update relationships table
  if ((lifeEvent.type === 'marriage' || lifeEvent.type === 'divorce') && lifeEvent.secondaryPersonaId) {
    const relId = relationshipId(lifeEvent.primaryPersonaId, lifeEvent.secondaryPersonaId);
    const rel = await db.relationships.get(relId);
    if (rel) {
      rel.status = lifeEvent.type === 'marriage' ? 'married' : 'estranged';
      rel.history.push({
        id: crypto.randomUUID(),
        type: lifeEvent.type === 'marriage' ? 'relationship-defined' : 'breakup',
        at: lifeEvent.occurredAt,
        description: lifeEvent.description,
      });
      await db.relationships.put(rel);
    }
  }
}

// -----------------------------------------------------------------------------
// VISIBILITY DEFAULTS
// -----------------------------------------------------------------------------

function getDefaultVisibility(type: LifeEventType): LifeEvent['publicVisibility'] {
  switch (type) {
    case 'engagement':
    case 'marriage':
    case 'divorce':
    case 'coming-out':
    case 'professional-milestone':
      return 'gossip-column';
    case 'separation':
      return 'whispered';
    case 'death-in-family':
    case 'major-illness':
      return 'family-only';
    case 'child-born':
    case 'child-adopted':
      return 'whispered';
    case 'major-loss':
    case 'gender-transition-announcement':
    case 'religious-conversion':
      return 'private';
  }
}
