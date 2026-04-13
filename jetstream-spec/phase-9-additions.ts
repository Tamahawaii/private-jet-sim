// =============================================================================
// JETSTREAM TYPE SCHEMA ADDITIONS - PHASE 9
// =============================================================================
// Add these to /types/index.ts
//
// Covers: behavioral engine, intimacy, drama, life events, reputation, gossip

import type { ISODateString } from './index';

// -----------------------------------------------------------------------------
// PLAYER RELATIONSHIP STYLE
// -----------------------------------------------------------------------------

export type PlayerRelationshipStyle = 
  | 'monogamous'        // one partner at a time
  | 'open'              // multiple partners, all aware
  | 'polyamorous'       // multiple committed relationships
  | 'casual'            // no commitments wanted
  | 'undeclared';       // hasn't chosen yet (default)

// Stored on player record (extends Player type from Phase 6)
export interface PlayerRelationshipPreferences {
  style: PlayerRelationshipStyle;
  declaredAt: ISODateString | null;
  publiclyKnown: boolean;       // do personas know your declared style?
}

// -----------------------------------------------------------------------------
// INTIMATE ENCOUNTERS
// -----------------------------------------------------------------------------

export type IntimacyDepth =
  | 'kiss'                  // just a kiss
  | 'makeout'               // extended physical
  | 'first-night'           // first sleeping together
  | 'returning'             // ongoing intimate relationship
  | 'morning-after'         // post-encounter scene specifically
  | 'reunion'               // after time apart;

export interface IntimateEncounter {
  id: string;
  participantIds: string[];        // ['player', 'persona-id']
  initiatedBy: string;             // 'player' or persona ID
  depth: IntimacyDepth;
  location: string;                // ICAO or 'private' or descriptor
  occurredAt: ISODateString;
  
  // Fade-to-black rendering
  buildupText: string;             // 1-3 sentences leading in (LLM-generated)
  emojis: string[];                // 4-6 contextual emojis to bounce
  fadeText: string;                // atmospheric paragraph (LLM-generated, sensual not explicit)
  morningAfterText: string | null; // optional: brief morning-after scene
  
  // Consequence tracking
  metricsApplied: Partial<{
    affection: number;
    trust: number;
    heat: number;
    romanticTension: number;
  }>;
  triggeredJealousyFrom: string[]; // persona IDs who got jealous (for drama triggers)
  triggeredGossip: boolean;
  isPubliclyKnown: boolean;        // did paparazzi/staff/guests see them?
}

// -----------------------------------------------------------------------------
// DRAMA EVENTS
// -----------------------------------------------------------------------------

export type DramaEventType =
  | 'jealousy-confrontation'        // X confronts Y about their thing with Z
  | 'public-spat'                    // argument visible at event/restaurant
  | 'social-snub'                    // not invited / pointedly excluded
  | 'silent-treatment'               // persona stops responding to player
  | 'gift-bomb'                      // persona sends extravagant gift to claim territory
  | 'showing-up-uninvited'           // persona flies in to interrupt
  | 'public-declaration'             // persona publicly claims relationship
  | 'rumor-spread'                   // persona spreads story (true or false)
  | 'ex-resurfaces'                  // a persona's ex returns
  | 'family-pressure'                // persona's family creates strain
  | 'betrayal-reveal'                // secret comes out (closeted reveal, affair, etc.)
  | 'reconciliation-offered'         // persona seeks to make up
  | 'ultimatum'                      // persona demands choice
  | 'marriage-proposal'              // proposal made
  | 'breakup-initiated'              // ending offered
  | 'new-rival-introduced'           // new persona/customNPC enters scene
  | 'professional-conflict'          // business clash spills into personal
  | 'press-leak'                     // embarrassing info leaked
  | 'secret-meeting-discovered'      // someone catches someone with someone
  | 'protective-friend-intervenes';  // friend confronts player on persona's behalf

export type DramaSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic';

export interface DramaEvent {
  id: string;
  type: DramaEventType;
  severity: DramaSeverity;
  triggeredAt: ISODateString;
  
  // Participants
  initiatorId: string;             // persona who initiated (or 'world' for systemic)
  targetIds: string[];             // persona(s) targeted (may include 'player')
  affectedRelationshipIds: string[];
  
  // Content
  title: string;                   // "Theo confronts you about Rio"
  narrativeText: string;           // LLM-generated 2-4 sentence description
  publicVisibility: 'private' | 'whispered' | 'gossip-column' | 'press';
  
  // Player response
  playerResponseRequired: boolean;
  playerResponseOptions: DramaResponseOption[];
  playerResponseChosen: string | null;  // option ID
  resolvedAt: ISODateString | null;
  
  // Consequences
  metricsChanges: Record<string, Partial<{   // relationshipId → metric deltas
    affection: number;
    trust: number;
    heat: number;
    romanticTension: number;
    rivalry: number;
  }>>;
  triggeredFollowups: string[];    // dramaEvent IDs spawned by this
  reputationImpact: Partial<ReputationScores>;
}

export interface DramaResponseOption {
  id: string;
  label: string;                   // "Tell the truth", "Deny everything", "Ignore"
  consequencePreview: string;      // brief hint at outcome
  reputationDeltaPreview: Partial<ReputationScores>;
}

// -----------------------------------------------------------------------------
// LIFE EVENTS (marriages, divorces, births, breakups)
// -----------------------------------------------------------------------------

export type LifeEventType =
  | 'engagement'
  | 'marriage'
  | 'separation'
  | 'divorce'
  | 'child-born'
  | 'child-adopted'
  | 'death-in-family'
  | 'major-illness'
  | 'professional-milestone'        // IPO, sale, big award
  | 'major-loss'                    // bankruptcy, scandal
  | 'religious-conversion'
  | 'gender-transition-announcement'
  | 'coming-out';

export interface LifeEvent {
  id: string;
  type: LifeEventType;
  primaryPersonaId: string;
  secondaryPersonaId?: string;       // for marriages, divorces, etc.
  childPersonaId?: string;           // for births (child becomes a "minor persona" not playable)
  occurredAt: ISODateString;
  description: string;
  publicVisibility: 'private' | 'family-only' | 'whispered' | 'gossip-column' | 'press';
  triggeredByDramaEventId?: string;  // if this was the result of drama
  
  // Effects
  statusChanges: {
    personaId: string;
    field: 'currentPartners' | 'publicRelationshipStatus' | 'publicOrientation';
    oldValue: unknown;
    newValue: unknown;
  }[];
  newRelationships?: { participantA: string; participantB: string; status: string }[];
  endedRelationshipIds?: string[];
}

// -----------------------------------------------------------------------------
// REPUTATION SYSTEM (multi-axis)
// -----------------------------------------------------------------------------

export interface ReputationScores {
  discretion: number;        // 0-100. High = secrets stay secret. Low = leaks happen.
  fidelity: number;          // 0-100. Calibrated against declared style.
                             //   Mono player + multiple partners = low fidelity
                             //   Open player + multiple partners = high fidelity
                             //   Measures: do you honor what you've declared?
  generosity: number;        // 0-100. Gifts, hospitality, time given freely.
  dramaProne: number;        // 0-100. High = drama follows you. Low = serene.
}

export interface ReputationLabel {
  axis: keyof ReputationScores;
  threshold: number;
  label: string;             // "discreet", "messy", "legendary host", "drama magnet"
}

export interface PlayerReputation {
  scores: ReputationScores;
  labels: ReputationLabel[];        // current active labels
  publicLabels: string[];           // those visible in gossip column
  lastUpdatedAt: ISODateString;
  history: {                        // snapshots over time
    at: ISODateString;
    scores: ReputationScores;
    triggerEventId?: string;
  }[];
}

// -----------------------------------------------------------------------------
// BEHAVIORAL ENGINE
// -----------------------------------------------------------------------------

/**
 * What a persona might choose to do on any given tick.
 * Selected via LLM (Haiku tier for selection, Sonnet for execution of big actions).
 */
export type PersonaActionType =
  | 'do-nothing'                   // most common — personas don't act every tick
  | 'send-dm'                      // proactive message to player
  | 'send-gift'                    // proactive gift to player
  | 'fly-somewhere'                // change locations
  | 'attend-event'                 // RSVP to upcoming event
  | 'check-into-resort'            // book a stay
  | 'react-to-gossip'              // respond to recent gossip about player or about themselves
  | 'reach-out-to-other-persona'   // strengthen/test persona-to-persona bond
  | 'initiate-drama'               // trigger a drama event
  | 'progress-life-event'          // movement on engagement, divorce, etc.
  | 'ghost-period';                // intentionally absent for days

export interface PersonaActionDecision {
  personaId: string;
  decisionAt: ISODateString;
  chosenAction: PersonaActionType;
  reasoning: string;               // LLM's brief explanation
  context: {                       // input context that drove decision
    relationshipDepthToPlayer: number;
    daysSinceLastInteraction: number;
    currentLocationICAO: string;
    activeDramaIds: string[];
    recentGossipIds: string[];
  };
  parameters: Record<string, unknown>;  // action-specific params
  modelTier: 'haiku' | 'sonnet';   // which model decided
  executedAt: ISODateString | null;
  outcome: string | null;          // brief post-execution log
}

export interface BehavioralTickLog {
  id: string;
  tickAt: ISODateString;
  trigger: 'background-cron' | 'on-app-open' | 'manual';
  personasEvaluated: number;
  actionsTaken: number;
  totalCostUsd: number;
  decisions: PersonaActionDecision[];
  durationMs: number;
}

// -----------------------------------------------------------------------------
// GOSSIP COLUMN
// -----------------------------------------------------------------------------

export type GossipFormat = 'public-column' | 'blind-item';

export interface GossipItem {
  id: string;
  format: GossipFormat;
  publishedAt: ISODateString;
  
  // Content
  headline: string | null;         // for public column items
  body: string;                    // 1-3 sentence story
  
  // Truth tracking
  isAccurate: boolean;             // false = juicy false rumor
  basedOnEventIds: string[];       // intimateEncounter / dramaEvent / lifeEvent IDs
  
  // For blind items
  blindSubjects: {
    description: string;           // "a Honolulu tech founder"
    actualPersonaId: string;       // for resolution if player guesses or it's revealed
  }[];
  
  // Public reactions
  authorVoice: 'tabloid' | 'editorial' | 'instagram-meme' | 'whisper' | 'wire-news';
  reactionsFromPersonas: {
    personaId: string;
    reactionDmId?: string;         // they DM'd player about it
  }[];
  
  // Player engagement
  playerHasRead: boolean;
  playerHasResponded: boolean;
  playerCorrectionIssued: boolean; // public correction of false rumor
}

// -----------------------------------------------------------------------------
// DEXIE SCHEMA UPDATES
// -----------------------------------------------------------------------------
//
// db.version(N).stores({
//   ...existing,
//   intimateEncounters: 'id, occurredAt, *participantIds',
//   dramaEvents: 'id, type, severity, triggeredAt, initiatorId, *targetIds',
//   lifeEvents: 'id, type, primaryPersonaId, occurredAt',
//   playerReputation: 'id',                    // single record, id = 'player-reputation'
//   personaActionDecisions: 'id, personaId, decisionAt, chosenAction',
//   behavioralTickLogs: 'id, tickAt, trigger',
//   gossipItems: 'id, publishedAt, format, isAccurate',
// });
//
// Player record gets new field: relationshipPreferences: PlayerRelationshipPreferences
