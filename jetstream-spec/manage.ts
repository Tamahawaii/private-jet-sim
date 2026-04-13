// =============================================================================
// COLLECTIONS MANAGEMENT
// =============================================================================
// /lib/collections/manage.ts
//
// Acquire collectibles via auction, gallery, persona offers.
// Periodic revaluation. Persona-driven recommendations.

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import type { 
  Collectible, 
  CollectibleCategory, 
  AuctionListing, 
  ISODateString 
} from '@/types';

// -----------------------------------------------------------------------------
// AUCTION ACQUISITION
// -----------------------------------------------------------------------------

export async function bidOnAuction(listingId: string, bidAmount: number): Promise<{ won: boolean; collectible?: Collectible }> {
  const listing = await db.auctionListings.get(listingId);
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'live' && listing.status !== 'upcoming') {
    throw new Error('Auction not biddable');
  }
  
  const player = await db.player.get('player');
  if (!player || player.netWorth < bidAmount) throw new Error('Insufficient funds');
  
  // Simulate competitive bidding: probability of winning depends on bid vs estimate
  const estimateMid = (listing.estimateLow + listing.estimateHigh) / 2;
  const bidRatio = bidAmount / estimateMid;
  
  // Win probability curve
  let winProb = 0;
  if (bidRatio < 0.8) winProb = 0.05;
  else if (bidRatio < 1.0) winProb = 0.25;
  else if (bidRatio < 1.3) winProb = 0.55;
  else if (bidRatio < 1.7) winProb = 0.80;
  else winProb = 0.92;
  
  const won = Math.random() < winProb;
  
  if (!won) {
    // Mark as outbid (could trigger another listing later)
    listing.status = 'sold';
    listing.buyerId = 'unknown';
    listing.hammerPrice = Math.round(bidAmount * (1 + Math.random() * 0.3));
    await db.auctionListings.put(listing);
    return { won: false };
  }
  
  // Won — create collectible
  const collectible: Collectible = {
    id: crypto.randomUUID(),
    category: listing.category,
    title: listing.title,
    artist: listing.artist,
    description: listing.description,
    acquiredAt: new Date().toISOString(),
    acquiredVia: 'auction',
    acquisitionPrice: bidAmount,
    currentValuation: bidAmount,
    lastValuedAt: new Date().toISOString(),
    storageType: 'climate-controlled',
    insurancePerYear: Math.round(bidAmount * 0.005),  // 0.5% of value
    provenance: [
      { owner: 'Previous private collection', period: 'Until present' },
      { owner: 'Player (you)', period: `${new Date().getFullYear()}–present` },
    ],
  };
  
  await db.transaction('rw', db.player, db.collectibles, db.auctionListings, db.transactions, async () => {
    player.netWorth -= bidAmount;
    await db.player.put(player);
    
    await db.collectibles.add(collectible);
    
    listing.status = 'sold';
    listing.buyerId = 'player';
    listing.hammerPrice = bidAmount;
    await db.auctionListings.put(listing);
    
    await db.transactions.add({
      id: crypto.randomUUID(),
      type: 'collectible-acquisition',
      amount: -bidAmount,
      at: new Date().toISOString(),
      description: `Acquired "${collectible.title}" at ${listing.auctionHouse} auction`,
    });
  });
  
  return { won: true, collectible };
}

// -----------------------------------------------------------------------------
// AUCTION LISTING GENERATION (ambient market)
// -----------------------------------------------------------------------------

/**
 * Periodically populates upcoming auction listings.
 * Called via behavioral engine or cron.
 */
export async function generateUpcomingAuctions(count: number = 5): Promise<void> {
  const provider = getRegistry().getDefault();
  
  for (let i = 0; i < count; i++) {
    const category = pickCategory();
    
    const response = await provider.complete({
      systemPrompt: `You generate fictional but plausible auction listings for a luxury social simulation.
Tone: Sotheby's catalog. Specific. Adult. JSON output only.

Format:
{
  "title": "string (lot title)",
  "artist": "string (or null for non-art)",
  "description": "1-3 sentence catalog description",
  "auctionHouse": "Sotheby's | Christie's | Phillips | Bonhams | Heritage",
  "estimateLow": number (USD),
  "estimateHigh": number (USD),
  "saleDateOffsetDays": number (days from now until sale)
}`,
      messages: [{
        role: 'user',
        content: `Generate an upcoming auction lot in category: ${category}. 
Estimate range should reflect category norms (art: $500K-50M, watches: $50K-5M, wine: $5K-500K, cars: $100K-50M, etc.)`
      }],
      maxTokens: 250,
      temperature: 0.95,
      model: 'claude-haiku-4-5-20251001',
      metadata: { purpose: 'auction-listing' },
    });
    
    try {
      const cleaned = response.content.replace(/```json\s*|\s*```/g, '').trim();
      const data = JSON.parse(cleaned);
      
      const saleDate = new Date(Date.now() + (data.saleDateOffsetDays || 14) * 86400000).toISOString();
      
      const listing: AuctionListing = {
        id: crypto.randomUUID(),
        category,
        title: data.title,
        artist: data.artist || undefined,
        description: data.description,
        auctionHouse: data.auctionHouse || 'Sotheby\'s',
        saleDate,
        estimateLow: data.estimateLow,
        estimateHigh: data.estimateHigh,
        status: 'upcoming',
      };
      
      await db.auctionListings.add(listing);
    } catch {
      // Skip malformed
    }
  }
}

function pickCategory(): CollectibleCategory {
  const cats: CollectibleCategory[] = ['art', 'wine', 'whiskey', 'classic-car', 'watch', 'jewelry', 'rare-book'];
  // Weight toward art (most common) and watches/wine
  const weights = [40, 15, 10, 12, 12, 6, 5];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < cats.length; i++) {
    if (r < weights[i]) return cats[i];
    r -= weights[i];
  }
  return 'art';
}

// -----------------------------------------------------------------------------
// PERSONA-INITIATED OFFERINGS
// -----------------------------------------------------------------------------

/**
 * Some personas will privately offer pieces from their collection to player.
 * Triggered occasionally by behavioral engine for art-world personas.
 */
export async function generatePersonaPrivateOffer(personaId: string): Promise<void> {
  const persona = await db.personas.get(personaId);
  if (!persona) return;
  
  // Only certain personas are dealers/collectors enough to make offers
  const isArtWorld = /art|gallery|collector|curator|dealer/i.test(persona.background || '');
  if (!isArtWorld && Math.random() > 0.1) return;
  
  const provider = getRegistry().getDefault();
  
  const response = await provider.complete({
    systemPrompt: `You write a private DM from a sophisticated collector/dealer offering a piece to a peer.
Tone: in-character for the sender. Brief. 2-3 sentences. Mention what, briefly why offered, the asking price.
Output JSON: { "dmText": "string", "title": "string", "category": "art|wine|watch|jewelry|sculpture|etc", "askingPrice": number }`,
    messages: [{
      role: 'user',
      content: `Sender: ${persona.displayName}
Their voice: ${persona.voiceStyle}
Their background: ${persona.background}

Generate a DM offering player a piece from their collection. Asking price should reflect the piece's prestige (commonly $200K to $20M).`
    }],
    maxTokens: 250,
    temperature: 0.9,
    model: 'claude-haiku-4-5-20251001',
    metadata: { personaId, purpose: 'private-offer' },
  });
  
  try {
    const cleaned = response.content.replace(/```json\s*|\s*```/g, '').trim();
    const data = JSON.parse(cleaned);
    
    // Send DM
    let thread = await db.dmThreads
      .where('participantIds').equals(personaId)
      .first();
    if (!thread) {
      thread = {
        id: crypto.randomUUID(),
        participantIds: [personaId, 'player'],
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        unreadCountForPlayer: 0,
      };
      await db.dmThreads.add(thread);
    }
    
    await db.dmMessages.add({
      id: crypto.randomUUID(),
      threadId: thread.id,
      senderId: personaId,
      content: data.dmText,
      sentAt: new Date().toISOString(),
      readByPlayer: false,
      isProactive: true,
      // Attach a special "private offer" payload
      attachedOffer: {
        title: data.title,
        category: data.category,
        askingPrice: data.askingPrice,
        sellerId: personaId,
      },
    });
    
    thread.unreadCountForPlayer = (thread.unreadCountForPlayer || 0) + 1;
    thread.lastMessageAt = new Date().toISOString();
    await db.dmThreads.put(thread);
  } catch {
    // Skip malformed
  }
}

// -----------------------------------------------------------------------------
// REVALUATION
// -----------------------------------------------------------------------------

export async function revalueCollections(): Promise<void> {
  // Periodically (e.g., once per sim-quarter) revalue all owned collectibles
  // Simulates market drift: art generally up 3-7% annually, wine more volatile, etc.
  
  const items = await db.collectibles.toArray();
  for (const item of items) {
    const annualDrift = {
      'art': 0.05,
      'wine': 0.04,
      'whiskey': 0.06,
      'classic-car': 0.07,
      'watch': 0.05,
      'jewelry': 0.03,
      'rare-book': 0.02,
      'sculpture': 0.04,
      'photography': 0.03,
      'design-object': 0.02,
    }[item.category] || 0.03;
    
    // Quarterly drift with volatility
    const drift = (annualDrift / 4) + (Math.random() - 0.5) * 0.04;
    item.currentValuation = Math.round(item.currentValuation * (1 + drift));
    item.lastValuedAt = new Date().toISOString();
    
    await db.collectibles.put(item);
  }
}
