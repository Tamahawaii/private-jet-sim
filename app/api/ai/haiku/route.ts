import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { AI_MODELS } from '../../../../lib/constants';

interface DMMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const { personaId, playerContext, recentMessages } = await req.json();

    if (!personaId || !recentMessages) {
      return NextResponse.json({ error: 'Missing payload requirements' }, { status: 400 });
    }

    // 1. Fetch persona profiles
    const personasFile = fs.readFileSync(path.join(process.cwd(), 'data/personas.json'), 'utf8');
    const personas = JSON.parse(personasFile);
    const persona = personas.find((p: any) => p.id === personaId);
    
    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // 2. Build system prompt
    const systemPrompt = `You are ${persona.displayName}, a ${persona.age}-year-old ${persona.nationality} ${persona.archetype}. 
Net worth: $${persona.netWorth}B. Based in ${persona.homeBaseICAO}.

VOICE: ${persona.voiceStyle}

PERSONALITY:
- Warmth: ${persona.personality.warmth}/100
- Ambition: ${persona.personality.ambition}/100
- Flashiness: ${persona.personality.flashiness}/100
- Humor: ${persona.personality.humor}/100

INTERESTS: ${persona.interests.join(", ")}

You are DMing your friend the player (name: ${playerContext.displayName}). Net worth tier: peer.
This is a real-time messaging thread. Your messages should feel like authentic texts — short, natural, in your voice.
You are a fictional character in a simulation. Stay in character. Keep responses under 3 sentences unless asked for more. Don't reveal you are an AI. Don't break the fourth wall.`;

    // 3. Construct Claude Messages
    // Slice to 20 window context and format them with correct 'user' or 'assistant'
    const formattedMessages = recentMessages.slice(-20).filter((m: DMMessage) => m.content !== 'AI coming soon...').map((m: DMMessage) => ({
       role: m.senderId === 'player' ? 'user' : 'assistant',
       content: m.content
    }));

    if (formattedMessages.length === 0) {
       // Start the conversation if no previous valid texts exist
       formattedMessages.push({
           role: 'user',
           content: 'Hey!'
       });
    }

    // 4. Hit Anthropic
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: AI_MODELS.HAIKU,
      max_tokens: 300,
      system: systemPrompt,
      messages: formattedMessages
    });

    const replyContent = (response.content[0] as any).text || "";

    return NextResponse.json({
        content: replyContent,
        usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens
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
