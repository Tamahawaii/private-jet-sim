// =============================================================================
// ANTHROPIC LLM PROVIDER
// =============================================================================
// /lib/llm/providers/anthropic.ts

import type { LLMProvider, LLMRequest, LLMResponse, LLMProviderConfig, LLMModel } from '../types';

const ANTHROPIC_MODELS: LLMModel[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    pricing: { inputPer1M: 1.00, outputPer1M: 5.00 },
    maxContextTokens: 200_000,
    capabilities: ['chat', 'json', 'tools', 'vision'],
    recommended: true,
  },
  {
    id: 'claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6',
    pricing: { inputPer1M: 3.00, outputPer1M: 15.00 },
    maxContextTokens: 200_000,
    capabilities: ['chat', 'json', 'tools', 'vision'],
  },
  {
    id: 'claude-opus-4-6',
    displayName: 'Claude Opus 4.6',
    pricing: { inputPer1M: 15.00, outputPer1M: 75.00 },
    maxContextTokens: 200_000,
    capabilities: ['chat', 'json', 'tools', 'vision'],
  },
];

export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Anthropic (Claude)';
  readonly models = ANTHROPIC_MODELS;
  readonly config: LLMProviderConfig;
  
  constructor(config: LLMProviderConfig) {
    this.config = {
      ...config,
      defaultModel: config.defaultModel || 'claude-haiku-4-5-20251001',
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1/messages',
    };
  }
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;
    const modelInfo = this.models.find(m => m.id === model);
    if (!modelInfo) throw new Error(`Unknown Anthropic model: ${model}`);
    
    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.8,
      messages: request.messages.filter(m => m.role !== 'system'),
    };
    if (request.systemPrompt) body.system = request.systemPrompt;
    
    const response = await fetch(this.config.baseUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        ...(this.config.customHeaders || {}),
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    
    return {
      content,
      inputTokens,
      outputTokens,
      estimatedCostUsd: this.calculateCost(inputTokens, outputTokens, modelInfo),
      model,
      providerId: this.id,
      rawResponse: data,
    };
  }
  
  async testConnection(): Promise<{ok: boolean; message: string}> {
    try {
      await this.complete({
        messages: [{ role: 'user', content: 'Reply with "OK".' }],
        maxTokens: 10,
        model: 'claude-haiku-4-5-20251001',
      });
      return { ok: true, message: 'Connected to Anthropic API' };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  private calculateCost(inputTokens: number, outputTokens: number, model: LLMModel): number {
    return (inputTokens / 1_000_000) * model.pricing.inputPer1M
         + (outputTokens / 1_000_000) * model.pricing.outputPer1M;
  }
}
