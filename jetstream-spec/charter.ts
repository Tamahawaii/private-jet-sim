// =============================================================================
// YACHT CHARTER & MANAGEMENT
// =============================================================================
// /lib/yachts/charter.ts
//
// Charter yachts for self/guest use, charter out for revenue,
// move yachts between locations, generate logs.

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { applyDelta, EVENT_DEFAULT_IMPACTS, relationshipId } from '@/lib/relationships/affinity';
import type { Yacht, YachtCharter, ISODateString } from '@/types';

// -----------------------------------------------------------------------------
// PURCHASE
// -----------------------------------------------------------------------------

export async function purchaseYacht(yachtId: string): Promise<void> {
  const yacht = await db.yachts.get(yachtId);
  if (!yacht) throw new Error('Yacht not found');
  
  const player = await db.player.get('player');
  if (!player) throw new Error('No player');
  
  if (player.netWorth < yacht.acquisitionPrice) {
    throw new Error('Insufficient funds');
  }
  
  await db.transaction('rw', db.player, db.playerOwnedYachts, db.transactions, async () => {
    // Deduct from net worth
    player.netWorth -= yacht.acquisitionPrice;
    await db.player.put(player);
    
    // Create ownership record
    await db.playerOwnedYachts.add({
      id: crypto.randomUUID(),
      yachtId,
      acquiredAt: new Date().toISOString(),
      acquisitionPrice: yacht.acquisitionPrice,
    });
    
    // Log transaction
    await db.transactions.add({
      id: crypto.randomUUID(),
      type: 'yacht-purchase',
      amount: -yacht.acquisitionPrice,
      at: new Date().toISOString(),
      description: `Acquired ${yacht.name}`,
    });
  });
}

// -----------------------------------------------------------------------------
// CHARTER (SELF-USE OR WITH GUESTS)
// -----------------------------------------------------------------------------

export interface CharterRequest {
  yachtId: string;
  charterPartyType: 'self' | 'guest-personas';
  guestPersonaIds: string[];
  startDate: ISODateString;
  endDate: ISODateString;
  itinerary: { date: ISODateString; locationName: string; activity?: string }[];
}

export async function bookCharter(req: CharterRequest): Promise<YachtCharter> {
  const yacht = await db.yachts.get(req.yachtId);
  if (!yacht) throw new Error('Yacht not found');
  
  // Check ownership
  const ownership = await db.playerOwnedYachts.where('yachtId').equals(req.yachtId).first();
  if (!ownership) throw new Error('You do not own this yacht');
  
  // Calculate cost
  const days = Math.ceil(
    (new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / 86400000
  );
  const operatingDailyCost = yacht.annualOperatingCost / 365;
  const cost = Math.round(operatingDailyCost * days);
  
  const player = await db.player.get('player');
  if (!player || player.netWorth < cost) throw new Error('Insufficient funds');
  
  const charter: YachtCharter = {
    id: crypto.randomUUID(),
    yachtId: req.yachtId,
    charterPartyType: req.charterPartyType,
    guestPersonaIds: req.guestPersonaIds,
    startDate: req.startDate,
    endDate: req.endDate,
    itinerary: req.itinerary,
    costToPlayer: cost,
    revenueToPlayer: 0,
    logEntries: [],
  };
  
  await db.transaction('rw', db.player, db.yachtCharters, db.yachts, db.relationships, db.transactions, async () => {
    // Deduct
    player.netWorth -= cost;
    await db.player.put(player);
    
    // Save charter
    await db.yachtCharters.add(charter);
    
    // Update yacht state
    yacht.status = 'in-charter';
    yacht.currentLocationName = req.itinerary[0]?.locationName || yacht.currentLocationName;
    await db.yachts.put(yacht);
    
    // Log transaction
    await db.transactions.add({
      id: crypto.randomUUID(),
      type: 'yacht-charter',
      amount: -cost,
      at: new Date().toISOString(),
      description: `${yacht.name} charter, ${days} days`,
    });
    
    // For guest charters, apply relationship deltas
    if (req.charterPartyType === 'guest-personas') {
      for (const pid of req.guestPersonaIds) {
        const relId = relationshipId('player', pid);
        const rel = await db.relationships.get(relId);
        if (rel) {
          // Yacht time is high-intimacy
          rel.metrics = applyDelta(rel.metrics, { 
            affection: 8, 
            heat: 6, 
            trust: 4, 
            romanticTension: 5 
          });
          rel.lastInteractionAt = new Date().toISOString();
          rel.history.push({
            id: crypto.randomUUID(),
            type: 'shared-event',
            at: new Date().toISOString(),
            description: `${days} days aboard ${yacht.name} — ${req.itinerary.map(i => i.locationName).join(' → ')}`,
          });
          await db.relationships.put(rel);
        }
      }
    }
  });
  
  return charter;
}

// -----------------------------------------------------------------------------
// CHARTER OUT (REVENUE MODE)
// -----------------------------------------------------------------------------

export async function listYachtForCharter(yachtId: string, weeksAvailable: number): Promise<{ projectedRevenue: number }> {
  const yacht = await db.yachts.get(yachtId);
  if (!yacht) throw new Error('Yacht not found');
  
  // Charter market simulation: 60-90% utilization typical
  const utilization = 0.6 + Math.random() * 0.3;
  const projectedRevenue = Math.round(yacht.charterRatePerWeek * weeksAvailable * utilization);
  
  // Mark yacht as available
  yacht.status = 'in-charter';
  await db.yachts.put(yacht);
  
  return { projectedRevenue };
}

// -----------------------------------------------------------------------------
// LOG ENTRY GENERATION (ambient narrative)
// -----------------------------------------------------------------------------

export async function generateCharterLogEntry(charterId: string): Promise<void> {
  const charter = await db.yachtCharters.get(charterId);
  if (!charter) return;
  
  const yacht = await db.yachts.get(charter.yachtId);
  if (!yacht) return;
  
  const guests = await Promise.all(
    charter.guestPersonaIds.map(id => db.personas.get(id))
  );
  
  const provider = getRegistry().getDefault();
  const response = await provider.complete({
    systemPrompt: `You write brief yacht log entries for a luxury social simulation. 
Tone: captain's log meets travel journal. Specific. Adult. 1-3 sentences. Reference current location, weather, what guests did.`,
    messages: [{
      role: 'user',
      content: `Yacht: ${yacht.name} (${yacht.lengthMeters}m ${yacht.builder})
Currently at: ${yacht.currentLocationName}
Guests aboard: ${guests.filter(Boolean).map(g => g!.displayName).join(', ') || 'owner only'}

Write a brief log entry for today.`
    }],
    maxTokens: 150,
    temperature: 0.85,
    model: 'claude-haiku-4-5-20251001',
    metadata: { purpose: 'yacht-log' },
  });
  
  charter.logEntries.push({
    at: new Date().toISOString(),
    entry: response.content.trim(),
  });
  
  await db.yachtCharters.put(charter);
}

// -----------------------------------------------------------------------------
// MONTHLY OPERATING COSTS
// -----------------------------------------------------------------------------

export async function applyMonthlyYachtCosts(): Promise<{ totalCost: number; breakdown: any[] }> {
  const owned = await db.playerOwnedYachts.toArray();
  const player = await db.player.get('player');
  if (!player) return { totalCost: 0, breakdown: [] };
  
  let total = 0;
  const breakdown = [];
  
  for (const ownership of owned) {
    const yacht = await db.yachts.get(ownership.yachtId);
    if (!yacht) continue;
    
    const monthlyCost = Math.round(yacht.annualOperatingCost / 12);
    total += monthlyCost;
    
    breakdown.push({
      yachtName: yacht.name,
      cost: monthlyCost,
      category: 'operating',
    });
    
    await db.recurringCosts.add({
      id: crypto.randomUUID(),
      source: 'yacht',
      sourceId: yacht.id,
      category: 'maintenance',
      amountUsd: monthlyCost,
      appliedAt: new Date().toISOString(),
      description: `${yacht.name} monthly operating cost`,
    });
  }
  
  player.netWorth -= total;
  await db.player.put(player);
  
  return { totalCost: total, breakdown };
}
