import { db } from '../db';
import { applyDelta, emptyMetrics, relationshipId, EVENT_DEFAULT_IMPACTS } from './affinity';
import { RelationshipEventType, RelationshipMetrics } from '../../types';

/**
 * Ensures a player-to-persona relationship exists in the database.
 * If none exists, seeds one with empty metrics.
 */
export async function seedPlayerRelationship(personaId: string): Promise<void> {
  if (!personaId) return;
  const relId = relationshipId('player', personaId);
  const existing = await db.relationships.get(relId);
  const [participantA, participantB] = ['player', personaId].sort();
  if (!existing) {
    await db.relationships.put({
      id: relId,
      participantA,
      participantB,
      metrics: emptyMetrics(),
      status: 'strangers',
      isPubliclyKnown: true,
      history: [],
      startedAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString()
    });
  }
}

/**
 * Applies a relationship event between the player and a persona: bumps the
 * affinity metrics by the event's default impact and logs it.
 */
export async function recordPlayerRelationshipEvent(
  personaId: string,
  type: RelationshipEventType,
  description: string,
  contextRefs?: { eventId?: string; flightId?: string; resortBookingId?: string; giftId?: string; dmThreadId?: string },
  delta?: Partial<RelationshipMetrics>,
  atIso: string = new Date().toISOString()
): Promise<void> {
  if (!personaId || personaId === 'player') return;
  await seedPlayerRelationship(personaId);
  const relId = relationshipId('player', personaId);
  const rel = await db.relationships.get(relId);
  if (!rel) return;
  const impact = delta ?? EVENT_DEFAULT_IMPACTS[type] ?? {};
  rel.metrics = applyDelta(rel.metrics, impact);
  rel.lastInteractionAt = atIso;
  await db.relationships.put(rel);
  await db.relationshipEvents.put({
    id: crypto.randomUUID(),
    relationshipId: relId,
    type,
    at: atIso,
    description,
    metricsDelta: impact,
    contextRefs,
  });
}
