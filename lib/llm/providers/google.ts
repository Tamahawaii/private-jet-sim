// =============================================================================
// GOOGLE (GEMINI) LLM PROVIDER
// =============================================================================
// /lib/llm/providers/google.ts

import type { LLMProvider, LLMRequest, LLMResponse, LLMProviderConfig, LLMModel } from '../types';

const GOOGLE_MODELS: LLMModel[] = [
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    pricing: { inputPer1M: 0.30, outputPer1M: 2.50 },
    maxContextTokens: 1_000_000,
    capabilities: ['chat', 'json', 'tools', 'vision'],
    recommended: true,
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    pricing: { inputPer1M: 1.25, outputPer1M: 10.00 },
    maxContextTokens: 2_000_000,
    capabilities: ['chat', 'json', 'tools', 'vision'],
  },
];

export class GoogleProvider implements LLMProvider {
  readonly id = 'google' as const;
  readonly displayName = 'Google (Gemini)';
  readonly models = GOOGLE_MODELS;
  readonly config: LLMProviderConfig;
  
  constructor(config: LLMProviderConfig) {
    this.config = {
      ...config,
      defaultModel: config.defaultModel || 'gemini-2.5-flash',
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models',
    };
  }
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.defaultModel;
    const modelInfo = this.models.find(m => m.id === model);
    if (!modelInfo) throw new Error(`Unknown Google model: ${model}`);
    
    // Convert OpenAI-style messages to Gemini format
    const contents = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.8,
      },
    };
    
    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
    }
    
    const url = `${this.config.baseUrl}/${model}:generateContent?key=${this.config.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.config.customHeaders || {}) },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    
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
      return { ok: true, message: 'Connected to Google AI API' };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  private calculateCost(inputTokens: number, outputTokens: number, model: LLMModel): number {
    return (inputTokens / 1_000_000) * model.pricing.inputPer1M
         + (outputTokens / 1_000_000) * model.pricing.outputPer1M;
  }
}
