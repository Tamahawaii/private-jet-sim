// =============================================================================
// YEAR IN REVIEW GENERATOR
// =============================================================================
// /lib/year-review/generator.ts
//
// At end of each sim-year, generate a Spotify-Wrapped-style recap.
// Uses Sonnet for the narrative essay (this is a moment that should sing).

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import type { 
  YearInReview, 
  ReputationScores, 
  Collectible 
} from '@/types';

// -----------------------------------------------------------------------------
// MAIN ENTRY
// -----------------------------------------------------------------------------

export async function generateYearInReview(year: number): Promise<YearInReview> {
  const yearStart = new Date(`${year}-01-01T00:00:00Z`).toISOString();
  const yearEnd = new Date(`${year}-12-31T23:59:59Z`).toISOString();
  
  // Gather raw stats
  const stats = await gatherYearStats(yearStart, yearEnd);
  
  // Generate narrative via Sonnet
  const provider = getRegistry().getDefault();
  const narrative = await generateNarrative(provider, year, stats);
  
  const review: YearInReview = {
    id: `year-review-${year}`,
    year,
    generatedAt: new Date().toISOString(),
    ...stats,
    yearNarrative: narrative.essay,
    highlights: narrative.highlights,
    oneSentenceSummary: narrative.oneSentence,
    awards: narrative.awards,
  };
  
  await db.yearsInReview.put(review);
  return review;
}

// -----------------------------------------------------------------------------
// STATS GATHERING
// -----------------------------------------------------------------------------

async function gatherYearStats(yearStart: string, yearEnd: string) {
  // Net worth start/end
  const transactions = await db.transactions
    .where('at').between(yearStart, yearEnd)
    .toArray();
  
  const netWorthChange = transactions.reduce((sum, t) => sum + t.amount, 0);
  const player = await db.player.get('player');
  const netWorthEnd = player?.netWorth || 0;
  const netWorthStart = netWorthEnd - netWorthChange;
  
  // Flights
  const flights = await db.flights
    .where('departureTime').between(yearStart, yearEnd)
    .toArray();
  
  const totalNm = flights.reduce((sum, f) => sum + (f.distanceNm || 0), 0);
  const airports = new Set<string>();
  const destinationCounts: Record<string, number> = {};
  for (const f of flights) {
    if (f.departureAirportICAO) airports.add(f.departureAirportICAO);
    if (f.arrivalAirportICAO) {
      airports.add(f.arrivalAirportICAO);
      destinationCounts[f.arrivalAirportICAO] = (destinationCounts[f.arrivalAirportICAO] || 0) + 1;
    }
  }
  const topDestinations = Object.entries(destinationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([icao, count]) => ({ name: icao, count }));
  
  // Yacht charters
  const charters = await db.yachtCharters
    .where('startDate').between(yearStart, yearEnd)
    .toArray();
  
  // Events hosted
  const events = await db.propertyEvents
    .where('startDate').between(yearStart, yearEnd)
    .toArray();
  
  // Relationships
  const allRelationships = await db.relationships.toArray();
  const playerRels = allRelationships.filter(r => 
    r.participantA === 'player' || r.participantB === 'player'
  );
  const newRelationships = playerRels
    .filter(r => r.history.length > 0 && r.history[0].at >= yearStart && r.history[0].at <= yearEnd)
    .map(r => ({
      personaId: r.participantA === 'player' ? r.participantB : r.participantA,
      status: r.status,
    }));
  
  // Life events (marriages, divorces) attended
  const lifeEvents = await db.lifeEvents
    .where('occurredAt').between(yearStart, yearEnd)
    .toArray();
  const marriagesAttended = lifeEvents.filter(le => le.type === 'marriage').length;
  const divorcesWitnessed = lifeEvents.filter(le => le.type === 'divorce').length;
  
  // Drama
  const dramaEvents = await db.dramaEvents
    .where('triggeredAt').between(yearStart, yearEnd)
    .toArray();
  const playerDrama = dramaEvents.filter(d => 
    d.targetIds.includes('player') || d.initiatorId === 'player'
  );
  // Top 5 most consequential dramas (by severity)
  const sevWeight = { minor: 1, moderate: 3, major: 8, catastrophic: 20 };
  const notableDrama = playerDrama
    .sort((a, b) => sevWeight[b.severity] - sevWeight[a.severity])
    .slice(0, 5)
    .map(d => d.id);
  
  // Reputation
  const reputation = await db.playerReputation.get('player-reputation');
  const reputationStart = reputation?.history.find(h => h.at >= yearStart)?.scores || 
    { discretion: 50, fidelity: 50, generosity: 50, dramaProne: 30 };
  const reputationEnd = reputation?.scores || reputationStart;
  
  // Collecting
  const collectibles = await db.collectibles
    .where('acquiredAt').between(yearStart, yearEnd)
    .toArray();
  const totalSpentOnArt = collectibles
    .filter(c => c.category === 'art')
    .reduce((sum, c) => sum + c.acquisitionPrice, 0);
  
  // Gossip
  const gossip = await db.gossipItems
    .where('publishedAt').between(yearStart, yearEnd)
    .toArray();
  const playerGossip = gossip.filter(g => 
    g.body.toLowerCase().includes('honolulu') || 
    g.body.toLowerCase().includes('tama') ||
    g.blindSubjects.some(s => s.actualPersonaId === 'player')
  );
  const correctionsIssued = gossip.filter(g => g.playerCorrectionIssued).length;
  
  return {
    netWorthStart,
    netWorthEnd,
    netWorthChange,
    flightCount: flights.length,
    totalNauticalMiles: Math.round(totalNm),
    uniqueAirports: airports.size,
    topDestinations,
    yachtCharters: charters.length,
    eventsHosted: events.length,
    newRelationships,
    endedRelationships: [], // would compute from breakup events
    marriagesAttended,
    divorcesWitnessed,
    dramaEventCount: playerDrama.length,
    notableDramaIds: notableDrama,
    reputationStart,
    reputationEnd,
    publicLabelsEnd: reputation?.publicLabels || [],
    collectiblesAcquired: collectibles.length,
    totalSpentOnArt,
    gossipItemsAboutPlayer: playerGossip.length,
    correctionsIssued,
  };
}

// -----------------------------------------------------------------------------
// NARRATIVE GENERATION (Sonnet)
// -----------------------------------------------------------------------------

async function generateNarrative(
  provider: ReturnType<ReturnType<typeof getRegistry>['getDefault']>,
  year: number,
  stats: any
): Promise<{
  essay: string;
  highlights: string[];
  oneSentence: string;
  awards: { title: string; recipient: string; reasoning: string }[];
}> {
  // Pull in some narrative texture from notable drama / life events / encounters
  const notableDramas = await Promise.all(
    stats.notableDramaIds.map((id: string) => db.dramaEvents.get(id))
  );
  
  const player = await db.player.get('player');
  
  const systemPrompt = `You write end-of-year reviews for a luxury social simulation, in the style of a New Yorker year-end essay crossed with Spotify Wrapped.

Tone: literary, reflective, knowing. Specific not generic. 3-4 paragraphs for the essay. 5-8 highlights. One memorable sentence summary. 3-5 fictional awards.

OUTPUT JSON ONLY:
{
  "essay": "string (3-4 paragraphs separated by \\n\\n)",
  "highlights": ["short bullet 1", "short bullet 2", ...],
  "oneSentence": "string (memorable one-liner)",
  "awards": [
    {"title": "Award name", "recipient": "Persona name or 'You'", "reasoning": "1 sentence why"},
    ...
  ]
}`;

  const userPrompt = `YEAR: ${year}
Player: ${player?.displayName || 'Tama'} (Honolulu-based gay tech founder, billionaire)

STATS:
- Net worth: $${(stats.netWorthStart / 1e9).toFixed(1)}B → $${(stats.netWorthEnd / 1e9).toFixed(1)}B (${stats.netWorthChange >= 0 ? '+' : ''}$${(stats.netWorthChange / 1e6).toFixed(0)}M)
- Flights: ${stats.flightCount} (${stats.totalNauticalMiles.toLocaleString()} nm), ${stats.uniqueAirports} airports
- Top destinations: ${stats.topDestinations.map((d: any) => d.name).join(', ')}
- Yacht charters: ${stats.yachtCharters}
- Events hosted: ${stats.eventsHosted}
- New relationships: ${stats.newRelationships.length}
- Marriages attended: ${stats.marriagesAttended}
- Drama events: ${stats.dramaEventCount}
- Collectibles acquired: ${stats.collectiblesAcquired} ($${(stats.totalSpentOnArt / 1e6).toFixed(1)}M on art)
- Gossip items mentioning you: ${stats.gossipItemsAboutPlayer}
- Reputation labels at year end: ${stats.publicLabelsEnd.join(', ') || 'none'}

NOTABLE DRAMA THIS YEAR:
${notableDramas.filter(Boolean).map((d: any) => `- ${d.title}: ${d.narrativeText}`).join('\n') || 'A quiet year, dramatically.'}

REPUTATION SHIFT:
- Discretion: ${stats.reputationStart.discretion} → ${stats.reputationEnd.discretion}
- Fidelity: ${stats.reputationStart.fidelity} → ${stats.reputationEnd.fidelity}
- Generosity: ${stats.reputationStart.generosity} → ${stats.reputationEnd.generosity}
- Drama-prone: ${stats.reputationStart.dramaProne} → ${stats.reputationEnd.dramaProne}

Generate the year-in-review JSON.`;

  const response = await provider.complete({
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 1500,
    temperature: 0.85,
    model: 'claude-sonnet-4-6',  // Sonnet — this is a marquee moment
    metadata: { purpose: 'year-in-review' },
  });
  
  await db.apiUsage.add({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    model: response.model,
    endpoint: 'year-in-review',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    providerId: response.providerId,
  });
  
  const cleaned = response.content.replace(/```json\s*|\s*```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      essay: response.content,
      highlights: [],
      oneSentence: 'A year.',
      awards: [],
    };
  }
}
