import { db } from '../db';
import { useStore } from '../../app/lib/store';
import { DMMessage } from '../../types';
import { AI_MODELS } from '../constants';

export interface ProactiveDMOptions {
  trigger: 'flight_arrival' | 'reaction' | 'event_invite' | 'rivalry' | 'player_initiated';
  relatedId?: string;
  /** Toast shown when the text lands. Defaults to "<Name> texted you." */
  toast?: string | null;
  /** Used when the AI endpoint is unavailable so the world still moves. */
  fallback?: string;
  /** Skip if the persona texted within this many ms (default 6h of sim time). */
  cooldownMs?: number;
}

/**
 * Makes an AI friend reach out first. The situation is fed to the model as a
 * hidden prompt; only the persona's reply is stored in the thread.
 */
export async function sendProactiveDM(personaId: string, situation: string, opts: ProactiveDMOptions): Promise<DMMessage | null> {
  if (typeof window === 'undefined') return null;
  const persona = await db.personas.get(personaId);
  if (!persona) return null;
  const state = await db.personaState.where('personaId').equals(personaId).first();
  const player = await db.player.get('player');
  const simNow = useStore.getState().getNow();

  const cooldown = opts.cooldownMs ?? 6 * 3600 * 1000;
  if (state?.lastDmSentAt && simNow - new Date(state.lastDmSentAt).getTime() < cooldown) return null;

  let thread = await db.dmThreads.where('personaId').equals(personaId).first();
  if (!thread) {
    thread = { id: crypto.randomUUID(), personaId, messages: [], lastMessageAt: new Date().toISOString(), unreadCount: 0 };
    await db.dmThreads.add(thread);
  }

  const hidden: DMMessage = {
    id: 'hidden',
    from: 'player',
    content: `[SITUATION — do not quote this: ${situation}] You are reaching out first. Write ONE short text in your own voice reacting to the situation. No greetings like "hey" unless natural.`,
    sentAt: new Date().toISOString(),
  };

  let content = '';
  try {
    const res = await fetch('/api/ai/haiku', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId,
        playerContext: { displayName: player?.displayName || 'Player', netWorth: player?.netWorth || 0 },
        personaState: state,
        persona,
        recentMessages: [...thread.messages.slice(-10), hidden],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      content = (data.content || '').trim();
      if (data.usage?.inputTokens && data.usage?.outputTokens) {
        const cost = (data.usage.inputTokens * (1.0 / 1e6)) + (data.usage.outputTokens * (3.0 / 1e6));
        await db.apiUsage.add({
          id: crypto.randomUUID(), timestamp: new Date().toISOString(), model: AI_MODELS.HAIKU, endpoint: '/api/ai/haiku',
          inputTokens: data.usage.inputTokens, outputTokens: data.usage.outputTokens, estimatedCostUsd: cost, personaId, threadId: thread.id,
        });
      }
    }
  } catch (e) {
    console.warn('[proactiveDm] AI unavailable, using fallback', e);
  }

  if (!content) content = opts.fallback || '';
  if (!content) return null;

  const msg: DMMessage = {
    id: crypto.randomUUID(),
    from: personaId,
    content,
    sentAt: new Date().toISOString(),
    context: { trigger: opts.trigger, relatedId: opts.relatedId },
  };

  await db.dmThreads.update(thread.id, {
    messages: [...thread.messages, msg],
    lastMessageAt: msg.sentAt,
    unreadCount: (thread.unreadCount || 0) + 1,
  });
  if (state) await db.personaState.update(personaId, { lastDmSentAt: new Date(simNow).toISOString(), lastInteractionAt: new Date(simNow).toISOString() });

  await db.notifications.add({
    id: crypto.randomUUID(),
    type: 'dm',
    title: `${persona.displayName.split(' ')[0]} texted you`,
    body: content.length > 120 ? content.slice(0, 117) + '…' : content,
    createdAt: new Date(simNow).toISOString(),
    readAt: null,
    linkTo: `/social/dms/${personaId}`,
  });

  if (opts.toast !== null) {
    useStore.getState().addToast({
      message: opts.toast || `${persona.displayName.split(' ')[0]}: “${content.length > 90 ? content.slice(0, 87) + '…' : content}”`,
      link: `/social/dms/${personaId}`,
    });
  }
  return msg;
}
