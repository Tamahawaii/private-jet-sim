// =============================================================================
// AFFINITY CALCULATION ENGINE
// =============================================================================
// /lib/relationships/affinity.ts
//
// Pure functions for computing relationship metrics changes.
// No side effects. Easy to unit test.

import type { 
  Relationship, 
  RelationshipMetrics, 
  RelationshipStatus,
  RelationshipEventType 
} from '@/types';

// -----------------------------------------------------------------------------
// METRIC BOUNDS
// -----------------------------------------------------------------------------

const MIN = 0;
const MAX = 100;

export function clamp(value: number): number {
  return Math.max(MIN, Math.min(MAX, value));
}

export function applyDelta(
  metrics: RelationshipMetrics, 
  delta: Partial<RelationshipMetrics>
): RelationshipMetrics {
  return {
    affection: clamp(metrics.affection + (delta.affection ?? 0)),
    trust: clamp(metrics.trust + (delta.trust ?? 0)),
    heat: clamp(metrics.heat + (delta.heat ?? 0)),
    romanticTension: clamp(metrics.romanticTension + (delta.romanticTension ?? 0)),
    rivalry: clamp(metrics.rivalry + (delta.rivalry ?? 0)),
  };
}

// -----------------------------------------------------------------------------
// EVENT IMPACT TABLE
// -----------------------------------------------------------------------------

/**
 * Default metric impacts per event type.
 * These are starting values; specific events can override via metricsDelta.
 */
export const EVENT_DEFAULT_IMPACTS: Record<RelationshipEventType, Partial<RelationshipMetrics>> = {
  'first-meeting':              { affection: 3, trust: 1, heat: 5 },
  'shared-flight':              { affection: 5, trust: 3, heat: 8, romanticTension: 2 },
  'shared-event':               { affection: 4, heat: 6, romanticTension: 1 },
  'shared-resort-stay':         { affection: 8, trust: 5, heat: 10, romanticTension: 4 },
  'gift-sent':                  { affection: 6, heat: 4 },
  'gift-received':              { affection: 8, heat: 5 },
  'dm-exchanged':               { affection: 1, heat: 2 },
  'flirtation':                 { heat: 8, romanticTension: 6 },
  'first-kiss':                 { heat: 20, romanticTension: 25, affection: 5 },
  'first-intimacy':             { heat: 30, romanticTension: 30, affection: 10, trust: 5 },
  'argument':                   { affection: -8, trust: -10, rivalry: 5 },
  'reconciliation':             { affection: 6, trust: 4 },
  'public-appearance-together': { affection: 3, heat: 6, romanticTension: 3 },
  'breakup':                    { affection: -15, trust: -10, heat: -20, romanticTension: -25 },
  'relationship-defined':       { affection: 10, trust: 10 },
  'rivalry-declared':           { rivalry: 30, affection: -5 },
  'gossip-spread':              { trust: -8, rivalry: 4 },
  'jealousy-incident':          { heat: 5, trust: -5, rivalry: 3 },
};

// -----------------------------------------------------------------------------
// HEAT DECAY
// -----------------------------------------------------------------------------

/**
 * Heat decays without contact. Other metrics are stickier.
 * Apply daily based on time since last interaction.
 * 
 * Daily decay rate: 5 points per day after a 2-day grace period.
 */
export function applyHeatDecay(
  metrics: RelationshipMetrics,
  lastInteractionAt: string,
  currentTime: string
): RelationshipMetrics {
  const lastMs = new Date(lastInteractionAt).getTime();
  const currentMs = new Date(currentTime).getTime();
  const daysElapsed = Math.max(0, (currentMs - lastMs) / (1000 * 60 * 60 * 24));
  const decayDays = Math.max(0, daysElapsed - 2);  // 2-day grace
  const decay = Math.floor(decayDays * 5);
  
  if (decay === 0) return metrics;
  
  return {
    ...metrics,
    heat: clamp(metrics.heat - decay),
    romanticTension: clamp(metrics.romanticTension - Math.floor(decay * 0.4)),  // slower decay
  };
}

// -----------------------------------------------------------------------------
// STATUS DERIVATION
// -----------------------------------------------------------------------------

/**
 * Suggest a relationship status based on current metrics.
 * This is advisory — actual status changes should be triggered by significant events.
 */
export function suggestStatus(metrics: RelationshipMetrics, currentStatus: RelationshipStatus): RelationshipStatus {
  const { affection, trust, heat, romanticTension, rivalry } = metrics;
  
  // Hostility paths
  if (rivalry > 70 && affection < 20) return 'enemies';
  if (rivalry > 50 && affection < 30) return 'rivals';
  if (currentStatus === 'partners' && affection < 20 && trust < 20) return 'estranged';
  
  // Romantic paths (require romantic tension)
  if (romanticTension > 80 && affection > 70 && trust > 70) {
    if (currentStatus === 'married') return 'married';
    if (currentStatus === 'partners') return 'partners';
    return 'partners';  // suggested upgrade
  }
  if (romanticTension > 60 && affection > 50) return 'dating';
  if (romanticTension > 50 && currentStatus === 'intimate-occasional') return 'situationship';
  if (romanticTension > 40) return 'flirting';
  
  // Friendship paths
  if (affection > 80 && trust > 70) return 'close-friends';
  if (affection > 50 && trust > 30) return 'friends';
  if (affection > 20) return 'acquaintances';
  
  return 'strangers';
}

// -----------------------------------------------------------------------------
// COMPATIBILITY SCORING
// -----------------------------------------------------------------------------

/**
 * Computes how naturally compatible two personas are based on their identity fields.
 * Used to calibrate baseline metric changes — compatible personas warm up faster.
 * Returns multiplier 0.5-1.5.
 */
export function computeCompatibility(personaA: any, personaB: any): number {
  let score = 1.0;
  
  // Orientation alignment (for romantic potential)
  // Note: this only affects romantic metric scaling, not affection/trust
  // Implementation deferred to romantic metric specifically
  
  // Wealth tier proximity (closer = more natural socializing)
  if (personaA.wealthTier && personaB.wealthTier) {
    const tierDiff = Math.abs(personaA.wealthTier - personaB.wealthTier);
    if (tierDiff === 0) score += 0.1;
    else if (tierDiff >= 3) score -= 0.15;
  }
  
  // Shared interests
  if (Array.isArray(personaA.interests) && Array.isArray(personaB.interests)) {
    const overlap = personaA.interests.filter((i: string) =>
      personaB.interests.some((j: string) => 
        i.toLowerCase().includes(j.toLowerCase()) || j.toLowerCase().includes(i.toLowerCase())
      )
    ).length;
    score += Math.min(0.3, overlap * 0.05);
  }
  
  // Shared region
  if (personaA.region && personaB.region) {
    const regionA = personaA.region.split(' ')[0].toLowerCase();
    const regionB = personaB.region.split(' ')[0].toLowerCase();
    if (regionA === regionB) score += 0.1;
  }
  
  return Math.max(0.5, Math.min(1.5, score));
}

/**
 * Returns true if romantic potential exists based on orientations.
 */
export function hasRomanticPotential(personaA: any, personaB: any): boolean {
  const aOrient = (personaA.publicOrientation || '').toLowerCase();
  const bOrient = (personaB.publicOrientation || '').toLowerCase();
  const aGender = (personaA.gender || '').toLowerCase();
  const bGender = (personaB.gender || '').toLowerCase();
  
  // Use private orientation if revealed (flexibility)
  const aActualOrient = (personaA.privateOrientation || personaA.publicOrientation || '').toLowerCase();
  const bActualOrient = (personaB.privateOrientation || personaB.publicOrientation || '').toLowerCase();
  
  // Bi/pan/fluid/poly = open to either
  const aOpen = /bi|pan|fluid|queer|curious/.test(aActualOrient);
  const bOpen = /bi|pan|fluid|queer|curious/.test(bActualOrient);
  
  if (aOpen && bOpen) return true;
  if (aOpen && bOrient.includes('straight') && aGender !== bGender) return true;
  if (aOpen && (bOrient.includes('gay') || bOrient.includes('lesbian')) && aGender === bGender) return true;
  if (bOpen && aOrient.includes('straight') && aGender !== bGender) return true;
  if (bOpen && (aOrient.includes('gay') || aOrient.includes('lesbian')) && aGender === bGender) return true;
  
  // Both straight: opposite gender
  if (aOrient.includes('straight') && bOrient.includes('straight') && aGender !== bGender) return true;
  
  // Both gay/lesbian: same gender
  if ((aOrient.includes('gay') || aOrient.includes('lesbian')) && 
      (bOrient.includes('gay') || bOrient.includes('lesbian')) && 
      aGender === bGender) return true;
  
  return false;
}

// -----------------------------------------------------------------------------
// COMPOSITE METRIC HELPERS
// -----------------------------------------------------------------------------

export function relationshipDepth(metrics: RelationshipMetrics): number {
  // 0-100 single-axis "how close are these two?" for general queries
  return Math.round(
    (metrics.affection * 0.35) +
    (metrics.trust * 0.35) +
    (metrics.heat * 0.15) +
    (metrics.romanticTension * 0.15)
  );
}

export function isHostile(metrics: RelationshipMetrics): boolean {
  return metrics.rivalry > 50 || metrics.affection < 15;
}

export function isRomantic(metrics: RelationshipMetrics): boolean {
  return metrics.romanticTension > 50;
}

// -----------------------------------------------------------------------------
// INITIAL STATE
// -----------------------------------------------------------------------------

export function emptyMetrics(): RelationshipMetrics {
  return { affection: 0, trust: 0, heat: 0, romanticTension: 0, rivalry: 0 };
}

export function relationshipId(personaIdA: string, personaIdB: string): string {
  // Sort alphabetically for deterministic IDs
  const [a, b] = [personaIdA, personaIdB].sort();
  return `${a}__${b}`;
}
