import Anthropic from '@anthropic-ai/sdk';

export const claude = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null;
