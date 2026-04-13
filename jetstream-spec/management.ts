// =============================================================================
// REAL ESTATE MANAGEMENT
// =============================================================================
// /lib/realestate/management.ts
//
// Acquire residences, host events, apply recurring costs, generate caretaker DMs.

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { applyDelta, EVENT_DEFAULT_IMPACTS, relationshipId } from '@/lib/relationships/affinity';
import type { Residence, PropertyEvent, ISODateString } from '@/types';

// -----------------------------------------------------------------------------
// PURCHASE
// -----------------------------------------------------------------------------

export async function purchaseResidence(residenceId: string): Promise<void> {
  const residence = await db.residences.get(residenceId);
  if (!residence) throw new Error('Residence not found');
  
  const player = await db.player.get('player');
  if (!player) throw new Error('No player');
  
  if (player.netWorth < residence.acquisitionPrice) {
    throw new Error('Insufficient funds');
  }
  
  await db.transaction('rw', db.player, db.playerOwnedResidences, db.transactions, async () => {
    player.netWorth -= residence.acquisitionPrice;
    await db.player.put(player);
    
    await db.playerOwnedResidences.add({
      id: crypto.randomUUID(),
      residenceId,
      acquiredAt: new Date().toISOString(),
      acquisitionPrice: residence.acquisitionPrice,
    });
    
    await db.transactions.add({
      id: crypto.randomUUID(),
      type: 'residence-purchase',
      amount: -residence.acquisitionPrice,
      at: new Date().toISOString(),
      description: `Acquired ${residence.name} (${residence.city})`,
    });
  });
}

// -----------------------------------------------------------------------------
// HOST EVENTS
// -----------------------------------------------------------------------------

export interface HostEventRequest {
  residenceId: string;
  type: PropertyEvent['type'];
  startDate: ISODateString;
  endDate: ISODateString;
  guestPersonaIds: string[];
  notes?: string;
}

export async function hostPropertyEvent(req: HostEventRequest): Promise<PropertyEvent> {
  const residence = await db.residences.get(req.residenceId);
  if (!residence) throw new Error('Residence not found');
  if (!residence.canHostEvents) throw new Error('This residence cannot host events');
  if (req.guestPersonaIds.length > residence.maxEventGuests) {
    throw new Error(`Max ${residence.maxEventGuests} guests for this venue`);
  }
  
  // Check ownership
  const ownership = await db.playerOwnedResidences.where('residenceId').equals(req.residenceId).first();
  if (!ownership) throw new Error('You do not own this residence');
  
  // Calculate cost (varies by event type)
  const cost = calculateEventCost(req.type, req.guestPersonaIds.length, residence);
  
  const player = await db.player.get('player');
  if (!player || player.netWorth < cost) throw new Error('Insufficient funds for event');
  
  const event: PropertyEvent = {
    id: crypto.randomUUID(),
    residenceId: req.residenceId,
    type: req.type,
    startDate: req.startDate,
    endDate: req.endDate,
    guestPersonaIds: req.guestPersonaIds,
    cost,
    notes: req.notes,
  };
  
  await db.transaction('rw', db.player, db.propertyEvents, db.relationships, db.transactions, async () => {
    player.netWorth -= cost;
    await db.player.put(player);
    
    await db.propertyEvents.add(event);
    
    // Apply relationship deltas to all guests
    for (const pid of req.guestPersonaIds) {
      const relId = relationshipId('player', pid);
      const rel = await db.relationships.get(relId);
      if (rel) {
        const delta = getEventMetricsDelta(req.type);
        rel.metrics = applyDelta(rel.metrics, delta);
        rel.lastInteractionAt = req.startDate;
        rel.history.push({
          id: crypto.randomUUID(),
          type: 'shared-event',
          at: req.startDate,
          description: `${prettifyEventType(req.type)} at ${residence.name}`,
        });
        await db.relationships.put(rel);
      }
    }
    
    await db.transactions.add({
      id: crypto.randomUUID(),
      type: 'event-hosting',
      amount: -cost,
      at: req.startDate,
      description: `${prettifyEventType(req.type)} at ${residence.name} (${req.guestPersonaIds.length} guests)`,
    });
  });
  
  // Generate event recap (async, non-blocking)
  generateEventRecap(event.id).catch(console.error);
  
  return event;
}

function calculateEventCost(type: PropertyEvent['type'], guestCount: number, residence: Residence): number {
  const perGuest = {
    'dinner-party': 2500,
    'weekend-house-party': 8000,
    'gala-fundraiser': 5000,
    'private-concert': 15000,
    'art-opening': 4000,
    'wedding-host': 12000,
    'wake': 3000,
    'meeting': 1500,
  }[type];
  
  // Base cost + per-guest scaling
  const base = perGuest * guestCount;
  
  // Premium residences cost more to host at
  const multiplier = residence.acquisitionPrice > 100000000 ? 1.5 : 1.0;
  
  return Math.round(base * multiplier);
}

function getEventMetricsDelta(type: PropertyEvent['type']): Partial<{ affection: number; trust: number; heat: number }> {
  switch (type) {
    case 'dinner-party':
    case 'meeting':
      return { affection: 4, trust: 3 };
    case 'weekend-house-party':
      return { affection: 8, trust: 5, heat: 4 };
    case 'gala-fundraiser':
    case 'art-opening':
      return { affection: 6, trust: 5 };
    case 'private-concert':
      return { affection: 10, trust: 4, heat: 3 };
    case 'wedding-host':
      return { affection: 12, trust: 10 };
    case 'wake':
      return { trust: 8, affection: 6 };
  }
}

function prettifyEventType(type: PropertyEvent['type']): string {
  return type.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// -----------------------------------------------------------------------------
// CARETAKER DMS
// -----------------------------------------------------------------------------

/**
 * Periodically (e.g., once a month per residence), caretaker may DM player
 * with property updates: maintenance issues, neighbor news, security incidents,
 * "the cherry blossoms are blooming" — ambient ownership texture.
 */
export async function generateCaretakerDM(residenceId: string): Promise<void> {
  const residence = await db.residences.get(residenceId);
  if (!residence || !residence.caretakerName) return;
  
  const provider = getRegistry().getDefault();
  const response = await provider.complete({
    systemPrompt: `You write brief, in-character DMs from a residence caretaker to the property owner.
Tone: respectful, warm, professionally familiar. Brief. 1-3 sentences. No fluff.
Mix it up: maintenance updates, weather notes, local color, requests for approval, neighbor news.`,
    messages: [{
      role: 'user',
      content: `Caretaker: ${residence.caretakerName}
Property: ${residence.name} in ${residence.city}, ${residence.country}
Type: ${residence.type}
Currently occupied: ${residence.currentlyOccupied}
Last visited: ${residence.lastVisitedAt || 'not visited yet'}

Write a brief DM update.`
    }],
    maxTokens: 150,
    temperature: 0.9,
    model: 'claude-haiku-4-5-20251001',
    metadata: { purpose: 'caretaker-dm' },
  });
  
  // Find or create thread with caretaker (caretaker is a "lite persona")
  const caretakerSenderId = `caretaker-${residenceId}`;
  let thread = await db.dmThreads
    .where('participantIds').equals(caretakerSenderId)
    .first();
  if (!thread) {
    thread = {
      id: crypto.randomUUID(),
      participantIds: [caretakerSenderId, 'player'],
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      unreadCountForPlayer: 0,
    };
    await db.dmThreads.add(thread);
  }
  
  await db.dmMessages.add({
    id: crypto.randomUUID(),
    threadId: thread.id,
    senderId: caretakerSenderId,
    content: response.content.trim(),
    sentAt: new Date().toISOString(),
    readByPlayer: false,
    isProactive: true,
  });
  
  thread.lastMessageAt = new Date().toISOString();
  thread.unreadCountForPlayer = (thread.unreadCountForPlayer || 0) + 1;
  await db.dmThreads.put(thread);
}

// -----------------------------------------------------------------------------
// EVENT RECAP
// -----------------------------------------------------------------------------

async function generateEventRecap(eventId: string): Promise<void> {
  const event = await db.propertyEvents.get(eventId);
  if (!event) return;
  
  const residence = await db.residences.get(event.residenceId);
  const guests = await Promise.all(event.guestPersonaIds.map(id => db.personas.get(id)));
  
  if (!residence) return;
  
  const provider = getRegistry().getDefault();
  const response = await provider.complete({
    systemPrompt: `You write event recaps for a luxury social simulation.
Tone: society-page mid-summary. Specific. Adult. 2-4 sentences. Reference what happened, who was there, a moment that stood out.`,
    messages: [{
      role: 'user',
      content: `Event type: ${prettifyEventType(event.type)}
Venue: ${residence.name} in ${residence.city}
Guests: ${guests.filter(Boolean).map(g => g!.displayName).join(', ')}
Notes: ${event.notes || 'none'}

Write the recap.`
    }],
    maxTokens: 250,
    temperature: 0.85,
    model: 'claude-haiku-4-5-20251001',
    metadata: { purpose: 'event-recap' },
  });
  
  event.generatedRecap = response.content.trim();
  await db.propertyEvents.put(event);
}

// -----------------------------------------------------------------------------
// MONTHLY HOLDING COSTS
// -----------------------------------------------------------------------------

export async function applyMonthlyResidenceCosts(): Promise<{ totalCost: number; breakdown: any[] }> {
  const owned = await db.playerOwnedResidences.toArray();
  const player = await db.player.get('player');
  if (!player) return { totalCost: 0, breakdown: [] };
  
  let total = 0;
  const breakdown = [];
  
  for (const ownership of owned) {
    const residence = await db.residences.get(ownership.residenceId);
    if (!residence) continue;
    
    const monthlyTax = Math.round(residence.annualPropertyTax / 12);
    const monthlyMaintenance = Math.round(residence.annualMaintenanceCost / 12);
    const monthlyInsurance = Math.round(residence.annualInsurance / 12);
    
    const subtotal = monthlyTax + monthlyMaintenance + monthlyInsurance;
    total += subtotal;
    
    breakdown.push({
      residenceName: residence.name,
      tax: monthlyTax,
      maintenance: monthlyMaintenance,
      insurance: monthlyInsurance,
      total: subtotal,
    });
    
    // Log each line item
    for (const [category, amount] of [['tax', monthlyTax], ['maintenance', monthlyMaintenance], ['insurance', monthlyInsurance]] as const) {
      await db.recurringCosts.add({
        id: crypto.randomUUID(),
        source: 'residence',
        sourceId: residence.id,
        category: category as any,
        amountUsd: amount,
        appliedAt: new Date().toISOString(),
        description: `${residence.name} monthly ${category}`,
      });
    }
  }
  
  player.netWorth -= total;
  await db.player.put(player);
  
  return { totalCost: total, breakdown };
}
