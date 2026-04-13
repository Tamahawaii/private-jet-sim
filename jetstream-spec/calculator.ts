// =============================================================================
// PLAYER REPUTATION CALCULATOR
// =============================================================================
// /lib/reputation/calculator.ts
//
// Multi-axis reputation: discretion, fidelity, generosity, dramaProne
// Derived from player's history, calibrated to declared style.

import { db } from '@/lib/db';
import type { 
  ReputationScores, 
  ReputationLabel, 
  PlayerReputation, 
  Player,
  PlayerRelationshipStyle 
} from '@/types';

// -----------------------------------------------------------------------------
// MAIN CALCULATOR
// -----------------------------------------------------------------------------

export async function recalculateReputation(): Promise<PlayerReputation> {
  const player = await db.player.get('player');
  if (!player) throw new Error('No player');
  
  const now = new Date().toISOString();
  
  // Compute fresh scores
  const scores: ReputationScores = {
    discretion: await computeDiscretion(),
    fidelity: await computeFidelity(player),
    generosity: await computeGenerosity(),
    dramaProne: await computeDramaProne(),
  };
  
  // Generate labels
  const labels = computeLabels(scores);
  const publicLabels = labels.filter(l => l.threshold >= 70 || l.threshold <= 30).map(l => l.label);
  
  // Load existing reputation
  let reputation = await db.playerReputation.get('player-reputation');
  
  if (!reputation) {
    reputation = {
      scores,
      labels,
      publicLabels,
      lastUpdatedAt: now,
      history: [{ at: now, scores }],
    } as PlayerReputation;
    await (db.playerReputation as any).put({ id: 'player-reputation', ...reputation });
  } else {
    // Add to history if changed meaningfully
    const lastSnapshot = reputation.history[reputation.history.length - 1];
    const changed = Object.keys(scores).some(k => 
      Math.abs(scores[k as keyof ReputationScores] - lastSnapshot.scores[k as keyof ReputationScores]) >= 5
    );
    
    if (changed) {
      reputation.history.push({ at: now, scores });
      // Keep last 50 snapshots
      if (reputation.history.length > 50) reputation.history = reputation.history.slice(-50);
    }
    
    reputation.scores = scores;
    reputation.labels = labels;
    reputation.publicLabels = publicLabels;
    reputation.lastUpdatedAt = now;
    
    await (db.playerReputation as any).put({ id: 'player-reputation', ...reputation });
  }
  
  return reputation;
}

// -----------------------------------------------------------------------------
// AXIS COMPUTATIONS
// -----------------------------------------------------------------------------

async function computeDiscretion(): Promise<number> {
  // Start at 50 (neutral)
  let score = 50;
  
  // Each gossip-column or press visibility event affecting player drops discretion
  const dramaEvents = await db.dramaEvents.toArray();
  const playerInvolved = dramaEvents.filter(d => 
    d.targetIds.includes('player') || d.initiatorId === 'player'
  );
  
  for (const drama of playerInvolved) {
    if (drama.publicVisibility === 'press') score -= 8;
    else if (drama.publicVisibility === 'gossip-column') score -= 3;
    else if (drama.publicVisibility === 'whispered') score -= 1;
  }
  
  // Each gossip item naming player drops discretion
  const gossip = await db.gossipItems.toArray();
  const playerGossip = gossip.filter(g => 
    g.body.toLowerCase().includes('tama') || 
    g.body.toLowerCase().includes('honolulu tech') ||
    g.basedOnEventIds.length > 0  // simplification: any gossip linked to player events
  );
  for (const item of playerGossip) {
    if (item.format === 'public-column' && !item.blindSubjects.length) score -= 2;
    else if (item.format === 'blind-item') score -= 0.5;
  }
  
  // Each intimateEncounter that triggered gossip drops discretion
  const encounters = await db.intimateEncounters.toArray();
  const publicEncounters = encounters.filter(e => 
    e.participantIds.includes('player') && e.triggeredGossip
  );
  score -= publicEncounters.length * 2;
  
  return clamp(score);
}

async function computeFidelity(player: Player): Promise<number> {
  const declaredStyle = (player.relationshipPreferences?.style || 'undeclared') as PlayerRelationshipStyle;
  
  // Count current "active" romantic relationships
  const relationships = await db.relationships
    .where('participantA').equals('player')
    .or('participantB').equals('player')
    .toArray();
  
  const romanticActive = relationships.filter(rel => 
    ['flirting', 'romantic-interest', 'dating', 'situationship', 
     'intimate-occasional', 'partners', 'married'].includes(rel.status)
  ).length;
  
  // Fidelity scoring is calibrated to style
  switch (declaredStyle) {
    case 'monogamous':
      // Penalize any concurrent romantic relationships beyond 1
      if (romanticActive <= 1) return 90;
      if (romanticActive === 2) return 50;
      if (romanticActive === 3) return 25;
      return 10;
    
    case 'open':
      // Open: fidelity is high if all are publicly known, low if hidden
      if (player.relationshipPreferences?.publiclyKnown) return 80;
      return 50;
    
    case 'polyamorous':
      // Poly: high fidelity if multiple ongoing committed
      if (romanticActive === 0) return 50;
      if (romanticActive >= 2) return 85;
      return 70;
    
    case 'casual':
      // Casual: fidelity = honoring "no commitments" stance
      const longTermActive = relationships.filter(r => 
        ['partners', 'married', 'dating'].includes(r.status)
      ).length;
      if (longTermActive === 0) return 80;
      return 40;
    
    case 'undeclared':
    default:
      return 50;
  }
}

async function computeGenerosity(): Promise<number> {
  // Count gifts sent BY player to others
  const giftsSent = await db.giftsSent.where('fromId').equals('player').toArray();
  
  // Total spent on gifts in last 90 sim-days
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
  const recent = giftsSent.filter(g => g.sentAt >= cutoff);
  
  let totalSpent = 0;
  for (const sent of recent) {
    const item = await db.giftItems.get(sent.giftItemId);
    if (item) totalSpent += item.basePrice;
  }
  
  // Score: log-scaled
  // $0 = 30, $50K = 60, $500K = 90
  const score = 30 + Math.min(60, Math.log10(Math.max(1, totalSpent / 1000)) * 15);
  
  return clamp(score);
}

async function computeDramaProne(): Promise<number> {
  // Count drama events involving player in last 60 sim-days
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString();
  const dramaEvents = await db.dramaEvents
    .where('triggeredAt').above(cutoff)
    .toArray();
  
  const playerInvolved = dramaEvents.filter(d => 
    d.targetIds.includes('player') || d.initiatorId === 'player'
  );
  
  // Each drama bumps score by severity weight
  let score = 30; // baseline
  for (const drama of playerInvolved) {
    score += { minor: 2, moderate: 5, major: 10, catastrophic: 18 }[drama.severity];
  }
  
  return clamp(score);
}

// -----------------------------------------------------------------------------
// LABEL GENERATION
// -----------------------------------------------------------------------------

function computeLabels(scores: ReputationScores): ReputationLabel[] {
  const labels: ReputationLabel[] = [];
  
  // Discretion
  if (scores.discretion >= 80) labels.push({ axis: 'discretion', threshold: scores.discretion, label: 'discreet' });
  else if (scores.discretion >= 60) labels.push({ axis: 'discretion', threshold: scores.discretion, label: 'careful' });
  else if (scores.discretion <= 30) labels.push({ axis: 'discretion', threshold: scores.discretion, label: 'messy' });
  else if (scores.discretion <= 15) labels.push({ axis: 'discretion', threshold: scores.discretion, label: 'tabloid magnet' });
  
  // Fidelity
  if (scores.fidelity >= 85) labels.push({ axis: 'fidelity', threshold: scores.fidelity, label: 'true to your word' });
  else if (scores.fidelity >= 70) labels.push({ axis: 'fidelity', threshold: scores.fidelity, label: 'reliable' });
  else if (scores.fidelity <= 30) labels.push({ axis: 'fidelity', threshold: scores.fidelity, label: 'unpredictable' });
  else if (scores.fidelity <= 15) labels.push({ axis: 'fidelity', threshold: scores.fidelity, label: 'famously unfaithful' });
  
  // Generosity
  if (scores.generosity >= 85) labels.push({ axis: 'generosity', threshold: scores.generosity, label: 'legendary host' });
  else if (scores.generosity >= 70) labels.push({ axis: 'generosity', threshold: scores.generosity, label: 'generous' });
  else if (scores.generosity <= 30) labels.push({ axis: 'generosity', threshold: scores.generosity, label: 'tight-fisted' });
  
  // DramaProne
  if (scores.dramaProne >= 80) labels.push({ axis: 'dramaProne', threshold: scores.dramaProne, label: 'drama magnet' });
  else if (scores.dramaProne >= 60) labels.push({ axis: 'dramaProne', threshold: scores.dramaProne, label: 'lives in headlines' });
  else if (scores.dramaProne <= 25) labels.push({ axis: 'dramaProne', threshold: scores.dramaProne, label: 'quietly powerful' });
  
  return labels;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export async function getReputation(): Promise<PlayerReputation | null> {
  const rep = await db.playerReputation.get('player-reputation');
  return rep || null;
}

/**
 * Personas can use this to know how to approach player on first interaction.
 * Returns a brief reputation summary for prompt context.
 */
export async function getReputationContextForPrompts(): Promise<string> {
  const rep = await getReputation();
  if (!rep) return 'Unknown reputation.';
  
  if (rep.publicLabels.length === 0) return 'No notable public reputation yet.';
  return `Public reputation: ${rep.publicLabels.join(', ')}.`;
}
