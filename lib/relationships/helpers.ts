import { db } from '../db';
import { emptyMetrics, relationshipId } from './affinity';

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
