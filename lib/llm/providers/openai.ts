// =============================================================================
// OPENAI LLM PROVIDER
// =============================================================================
// /lib/llm/providers/openai.ts

import type { LLMProvider, LLMRequest, LLMResponse, LLMProviderConfig, LLMModel } from '../types';

const OPENAI_MODELS: LLMModel[] = [
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    pricing: { inputPer1M: 0.15, outputPer1M: 0.60 },
    maxContextTokens: 128_000,
    capabilities: ['chat', 'json', 'tools', 'vision'],
    recommended: true,
  },
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    pricing: { inputPer1M: 2.50, outputPer1M: 10.00 },
    maxContextTokens: 128_000,
    capabilities: ['chat', 'json', 'tools', 'vision'],
  },
];

export class OpenAIProvider implements LLMProvider {
  readonly id = 'openai' as const;
  readonly displayName = 'OpenAI (GPT)';
  readonly models = OPENAI_MODELS;
  readonly config: LLMProviderConfig;
  
  constructor(config: LLMProviderConfig) {
    this.config = {
      ...config,
      defaultModel: config.defaultModel || 'gpt-4o-mini',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1/chat/completions',
    };
  }
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;
    const modelInfo = this.models.find(m => m.id === model);
    if (!modelInfo) throw new Error(`Unknown OpenAI model: ${model}`);
    
    const messages = [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      ...request.messages,
    ];
    
    const body = {
      model,
      messages,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.8,
    };
    
    const response = await fetch(this.config.baseUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...(this.config.customHeaders || {}),
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    
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
      });
      return { ok: true, message: 'Connected to OpenAI API' };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  private calculateCost(inputTokens: number, outputTokens: number, model: LLMModel): number {
    return (inputTokens / 1_000_000) * model.pricing.inputPer1M
         + (outputTokens / 1_000_000) * model.pricing.outputPer1M;
  }
}
