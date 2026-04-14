import { NextResponse } from 'next/server';
import { getDefaultProvider } from '../../../../lib/llm/registry';
import { AI_MODELS } from '../../../../lib/constants';

interface DMMessage {
  id: string;
  from: string;
  content: string;
  sentAt: string;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const reqBody = await req.json();
    const { personaId, playerContext, personaState, recentMessages, persona, giftContext } = reqBody;

    if (!personaId || !recentMessages || !persona) {
      return NextResponse.json({ error: 'Missing payload requirements' }, { status: 400 });
    }

    // 2. Build system prompt
    const systemPrompt = `You are ${persona.displayName}, a ${persona.age}-year-old resident of ${persona.region}. 

VOICE STYLE & TONE
${persona.voiceStyle}

BACKGROUND & INTERESTS
${persona.background}
Interests include: ${persona.interests?.join(", ") || 'General luxury'}

THE DYNAMIC
You are DMing your friend the player (name: ${playerContext.displayName}).
${persona.playerDynamic}

Private drama context:
${persona.drama}

Current locale: ${personaState?.currentLocationICAO || persona.residences?.[0] || 'Unknown address'}. ${personaState?.lastFlightWithPlayer ? `[CRITICAL CONTEXT: Flew with player from ${personaState.lastFlightWithPlayer.originICAO} to ${personaState.currentLocationICAO} recently.]`: ''}
${giftContext ? `
[CRITICAL EVENT: THE PLAYER JUST SENT YOU A GIFT]
Gift Details: ${giftContext.giftName} - "${giftContext.description}"
Player's Optional Note: "${giftContext.personalNote || 'No personal note provided'}"

React to receiving this gift AUTHENTICALLY and in your exact voice. 
Keep your response short (1-3 sentences max).
Do NOT be generically grateful or write "oh my god thank you so much" UNLESS that fits your character perfectly. If your character is suspicious, be guarded. If you are analytical, analyze the gesture's meaning. If you are wealthy and bored, be amused or dismissive. If you are romantic but careful, show hesitation. Match your canonical tone impeccably. You are responding in a text message format directly to them.
` : ''}

This is a real-time messaging thread. Your messages should feel like authentic texts — short, natural, in your voice.
You are a fictional character in a simulation. Stay in character. Keep responses under 3 sentences unless asked for more. Don't reveal you are an AI. Don't break the fourth wall.`;

    // 3. Construct Claude Messages
    // Slice to 20 window context and format them with correct 'user' or 'assistant'
    const formattedMessages = recentMessages.slice(-20).filter((m: DMMessage) => m.content !== 'AI coming soon...').map((m: DMMessage) => ({
       role: m.from === 'player' ? 'user' : 'assistant',
       content: m.content
    }));

    // Anthropic requires conversations to start with a 'user' turn.
    // If the first message in the window is an 'assistant' message, prepend a system/user initialization to satisfy the API.
    if (formattedMessages.length > 0 && formattedMessages[0].role === 'assistant') {
       formattedMessages.unshift({ role: 'user', content: '[Thread recovered. Continue context.]' });
    }

    if (formattedMessages.length === 0) {
       // Start the conversation if no previous valid texts exist
       formattedMessages.push({
           role: 'user',
           content: 'Hey!'
       });
    }

    console.log(`[API REQUEST] To: ${persona.displayName} (${personaId})`);
    console.log('[API PAYLOAD]', JSON.stringify(formattedMessages, null, 2));

    // 4. Hit LLM Provider
    const provider = getDefaultProvider();
    const response = await provider.complete({
      systemPrompt: systemPrompt,
      messages: formattedMessages,
      maxTokens: 300,
      temperature: 0.85,
      metadata: {
        personaId: persona.id,
        purpose: 'dm',
      },
    });

    console.log('[API RESPONSE]', JSON.stringify({
       content: response.content,
       inputTokens: response.inputTokens,
       outputTokens: response.outputTokens,
       cost: response.estimatedCostUsd,
       provider: response.providerId,
    }, null, 2));

    let replyContent = response.content || "";
    
    // Safety fallback for empty content causing crashes on UI side
    if (!replyContent || replyContent.trim().length <= 2) {
       replyContent = ""; 
    }

    return NextResponse.json({
        content: replyContent,
        usage: {
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            estimatedCostUsd: response.estimatedCostUsd,
            providerId: response.providerId
        }
    });

  } catch (error: any) {
    console.error('Claude API Error:', error);
    if (error.status === 429) {
       return NextResponse.json({ error: 'Rate limit hit' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Internal API Error' }, { status: 500 });
  }
}
