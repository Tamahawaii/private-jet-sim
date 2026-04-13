// =============================================================================
// PERSONA BEHAVIORAL ENGINE
// =============================================================================
// /lib/behavioral/engine.ts
//
// The heart of "the world is alive". Personas autonomously decide and act.
// Two entry points: background tick (cron) + on-open burst (catch-up).

import { db } from '@/lib/db';
import { getRegistry } from '@/lib/llm/registry';
import { applyDelta, EVENT_DEFAULT_IMPACTS, relationshipId, applyHeatDecay } from '@/lib/relationships/affinity';
import { selectPersonaAction } from './action-selector';
import { executeAction } from './action-executor';
import { recalculateReputation } from '@/lib/reputation/calculator';
import { generateGossipForRecentEvents } from '@/lib/gossip/generator';
import type { 
  BehavioralTickLog, 
  PersonaActionDecision, 
  Persona, 
  Player 
} from '@/types';

const TICK_PROBABILITY_PER_PERSONA = 0.35;  // ~35% of personas evaluate per tick
const MAX_ACTIONS_PER_BURST = 8;             // cap to prevent cost explosion

// -----------------------------------------------------------------------------
// MAIN ENTRY POINTS
// -----------------------------------------------------------------------------

/**
 * Background tick. Called by cron-like scheduler (e.g., once per sim-day).
 * Light evaluation across all personas; cheap model decisions.
 */
export async function runBackgroundTick(): Promise<BehavioralTickLog> {
  const startTime = performance.now();
  const tickAt = await getCurrentSimTime();
  const log: BehavioralTickLog = {
    id: crypto.randomUUID(),
    tickAt,
    trigger: 'background-cron',
    personasEvaluated: 0,
    actionsTaken: 0,
    totalCostUsd: 0,
    decisions: [],
    durationMs: 0,
  };
  
  const personas = await db.personas.toArray();
  const player = await db.player.get('player');
  if (!player) throw new Error('No player record');
  
  // Apply heat decay to all relationships first (cheap, no LLM)
  await applyGlobalHeatDecay(tickAt);
  
  // Evaluate subset of personas
  const eligible = personas.filter(p => Math.random() < TICK_PROBABILITY_PER_PERSONA);
  log.personasEvaluated = eligible.length;
  
  let actionsExecuted = 0;
  for (const persona of eligible) {
    if (actionsExecuted >= MAX_ACTIONS_PER_BURST) break;
    
    const decision = await selectPersonaAction(persona, player, tickAt);
    log.decisions.push(decision);
    log.totalCostUsd += await getDecisionCost(decision.id);
    
    if (decision.chosenAction !== 'do-nothing') {
      const outcome = await executeAction(decision, persona, player, tickAt);
      decision.executedAt = tickAt;
      decision.outcome = outcome.summary;
      log.totalCostUsd += outcome.costUsd;
      actionsExecuted++;
      log.actionsTaken++;
    }
    
    await db.personaActionDecisions.put(decision);
  }
  
  // After all actions, generate gossip for any newly significant events
  const gossipResult = await generateGossipForRecentEvents(tickAt);
  log.totalCostUsd += gossipResult.costUsd;
  
  // Recalculate player reputation if any events occurred
  if (log.actionsTaken > 0) {
    await recalculateReputation();
  }
  
  log.durationMs = performance.now() - startTime;
  await db.behavioralTickLogs.add(log);
  return log;
}

/**
 * On-app-open burst. Called when player opens app after absence.
 * Processes "missed time" — runs multiple ticks worth of activity.
 */
export async function runOnOpenBurst(): Promise<BehavioralTickLog> {
  const startTime = performance.now();
  const tickAt = await getCurrentSimTime();
  
  // Determine how much sim-time elapsed since last burst
  const lastBurst = await db.behavioralTickLogs
    .where('trigger').anyOf(['background-cron', 'on-app-open'])
    .reverse()
    .first();
  
  const lastTickAt = lastBurst?.tickAt || tickAt;
  const hoursElapsed = (new Date(tickAt).getTime() - new Date(lastTickAt).getTime()) / (1000 * 60 * 60);
  
  // Scale activity by absence: short absence = light burst, long = catch-up burst
  const burstIntensity = Math.min(3, Math.max(0.5, hoursElapsed / 24));
  const TICK_PROB = TICK_PROBABILITY_PER_PERSONA * burstIntensity;
  const MAX_ACTIONS = Math.min(15, Math.ceil(MAX_ACTIONS_PER_BURST * burstIntensity));
  
  const log: BehavioralTickLog = {
    id: crypto.randomUUID(),
    tickAt,
    trigger: 'on-app-open',
    personasEvaluated: 0,
    actionsTaken: 0,
    totalCostUsd: 0,
    decisions: [],
    durationMs: 0,
  };
  
  const personas = await db.personas.toArray();
  const player = await db.player.get('player');
  if (!player) throw new Error('No player record');
  
  await applyGlobalHeatDecay(tickAt);
  
  const eligible = personas.filter(p => Math.random() < TICK_PROB);
  log.personasEvaluated = eligible.length;
  
  let actionsExecuted = 0;
  for (const persona of eligible) {
    if (actionsExecuted >= MAX_ACTIONS) break;
    
    const decision = await selectPersonaAction(persona, player, tickAt);
    log.decisions.push(decision);
    
    if (decision.chosenAction !== 'do-nothing') {
      const outcome = await executeAction(decision, persona, player, tickAt);
      decision.executedAt = tickAt;
      decision.outcome = outcome.summary;
      log.totalCostUsd += outcome.costUsd;
      actionsExecuted++;
      log.actionsTaken++;
    }
    
    await db.personaActionDecisions.put(decision);
  }
  
  const gossipResult = await generateGossipForRecentEvents(tickAt);
  log.totalCostUsd += gossipResult.costUsd;
  
  if (log.actionsTaken > 0) {
    await recalculateReputation();
  }
  
  log.durationMs = performance.now() - startTime;
  await db.behavioralTickLogs.add(log);
  return log;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

async function applyGlobalHeatDecay(tickAt: string) {
  const allRels = await db.relationships.toArray();
  const updates = allRels
    .map(rel => ({
      rel,
      decayed: applyHeatDecay(rel.metrics, rel.lastInteractionAt, tickAt),
    }))
    .filter(({ rel, decayed }) => decayed.heat !== rel.metrics.heat);
  
  for (const { rel, decayed } of updates) {
    rel.metrics = decayed;
    await db.relationships.put(rel);
  }
}

async function getCurrentSimTime(): Promise<string> {
  // Use existing sim-time helper from project
  // This is a placeholder - call your existing getSimTime() / getCurrentTime() function
  return new Date().toISOString();
}

async function getDecisionCost(decisionId: string): Promise<number> {
  const usage = await db.apiUsage
    .where('threadId').equals(decisionId)
    .first();
  return usage?.estimatedCostUsd || 0;
}

// -----------------------------------------------------------------------------
// CRON TRIGGER (Vercel cron or similar)
// -----------------------------------------------------------------------------

/**
 * Vercel cron handler. Add to /app/api/cron/behavioral-tick/route.ts:
 * 
 * import { runBackgroundTick } from '@/lib/behavioral/engine';
 * 
 * export async function GET(request: Request) {
 *   // Verify cron secret
 *   const auth = request.headers.get('authorization');
 *   if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 *   const log = await runBackgroundTick();
 *   return Response.json({ ok: true, log });
 * }
 * 
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/behavioral-tick",
 *     "schedule": "0 *\u002F8 * * *"  // every 8 hours real-time = ~3 sim-days
 *   }]
 * }
 */
