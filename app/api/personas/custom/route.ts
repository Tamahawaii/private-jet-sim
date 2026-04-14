import { NextResponse } from 'next/server';
import { getDefaultProvider } from '../../../../lib/llm/registry';

export async function POST(req: Request) {
  try {
    const { displayName, age, region, archetypeHint } = await req.json();

    const systemPrompt = `You are a world-class narrative designer for a high-end luxury lifestyle simulation.
Your job is to flesh out a sparse "archetype hint" into a rich, distinctive, fully-realized high-net-worth persona dossier.

THE INPUT:
Name: ${displayName}
Age: ${age}
Region: ${region}
Archetype Hint: "${archetypeHint}"

AVOID GENERIC LUXURY TROPES. Do not use phrases like "loves fine wine", "owns a house in the Hamptons", or "drives a sports car" unless it is specifically subverted or intensely specific to their core neurosis. 
Instead of "loves art", use "obsessively collects post-war brutalist sculpture to spite his father."
Their 'voiceStyle' and 'playerDynamic' MUST read with the identical distinctive, natural, and sharp quality as these examples:
- "Hey buddy! Just got back from the office — closed a roll-up in Beaumont... You around?"
- "tu vas bien? been in the atelier since 6am, fabric shipment from lyon arrived..."

You must return ONLY a JSON object matching this exact schema block, with NO markdown formatting outside the braces.

{
  "voiceStyle": "Instructions for an LLM on exactly how to speak as this character in DMs. Be exceptionally specific about vocabulary, punctuation habits, capitalization quirks.",
  "playerDynamic": "How they interact with the player. Are they aloof? Needy? Transactional? Flirtatious?",
  "drama": "1-2 sentences. What current, specific crisis or tension exists in their life right now?",
  "background": "A 3-4 sentence biographical history. Focus on hyper-specific details over broad strokes.",
  "wealthTier": 2, // Integer 1-5 (1=100M+, 5=10B+)
  "netWorth": 4.5, // number in BILLIONS of USD as a float (e.g., 4.5 means $4.5 billion). Match scale to wealthTier: tier 1 = 0.05-0.2, tier 2 = 0.5-2, tier 3 = 2-10, tier 4 = 10-50, tier 5 = 50-500.
  "gender": "man",
  "pronouns": "he/him",
  "publicOrientation": "straight",
  "privateOrientation": "straight",
  "publicRelationshipStatus": "single",
  "relationshipStyle": "monogamous",
  "orientationFlexibility": 20,
  "personality": ["ambitious", "cynical", "loyal"],
  "interests": ["extremely specific interest 1", "highly niche interest 2"],
  "tastes": { "drinks": "...", "wears": "...", "drives": "...", "aesthetic": "...", "music": "..." },
  "currentPartners": [],
  "residences": ["Hyper-specific location 1", "Location 2"]
}`;

    const provider = getDefaultProvider();
    const response = await provider.complete({
       model: 'claude-sonnet-4-6',  // enforce Sonnet for quality schema building
       systemPrompt: systemPrompt,
       messages: [
           { role: 'user', content: 'Generate the JSON profile.' }
       ],
       maxTokens: 1500,
       temperature: 0.85
    });

    let content = response.content.trim();
    if (content.startsWith('```json')) {
        content = content.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (content.startsWith('```')) {
        content = content.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const generated = JSON.parse(content);
    if (generated.netWorth && generated.netWorth < 1000) {
        // Multiply by 1 billion to store as raw dollars
        generated.netWorth = generated.netWorth * 1e9;
    }

    return NextResponse.json(generated);
  } catch (error: any) {
    console.error('Persona Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
