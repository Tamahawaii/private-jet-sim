// =============================================================================
// JETSTREAM PLUGGABLE LLM PROVIDER SYSTEM
// =============================================================================
// Add to /lib/llm/types.ts
//
// All providers conform to this interface so DM/behavior code is provider-agnostic.

export type LLMProviderId = 'anthropic' | 'google' | 'openai' | string;

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  systemPrompt?: string;        // separated for providers that prefer it
  maxTokens?: number;            // default 1024
  temperature?: number;          // default 0.8
  model?: string;                // override registry default
  metadata?: {                   // for cost tracking
    personaId?: string;
    threadId?: string;
    purpose?: 'dm' | 'behavior' | 'gossip' | 'custom-persona-bio' | string;
  };
}

export interface LLMResponse {
  content: string;               // the actual text response
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  model: string;                 // actual model used
  providerId: LLMProviderId;
  rawResponse?: unknown;         // for debugging
}

export interface LLMProviderConfig {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;              // override (proxies, etc.)
  customHeaders?: Record<string, string>;
}

// Cost per 1M tokens (USD)
export interface LLMModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export interface LLMModel {
  id: string;                    // 'claude-haiku-4-5-20251001'
  displayName: string;           // 'Claude Haiku 4.5'
  pricing: LLMModelPricing;
  maxContextTokens: number;
  capabilities: ('chat' | 'json' | 'tools' | 'vision')[];
  recommended?: boolean;          // shown first in UI
}

export interface LLMProvider {
  readonly id: LLMProviderId;
  readonly displayName: string;
  readonly models: LLMModel[];
  readonly config: LLMProviderConfig;
  
  /**
   * Generate a completion. All providers normalize to this signature.
   * Should throw on auth/network failure with descriptive message.
   */
  complete(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Validate that the provider is properly configured and reachable.
   * Optional - used by settings UI "Test Connection" button.
   */
  testConnection?(): Promise<{ok: boolean; message: string}>;
}

export interface ProviderRegistryEntry {
  provider: LLMProvider;
  enabled: boolean;
  isDefault: boolean;            // exactly one provider should be default
}

export interface ProviderRegistry {
  providers: Record<LLMProviderId, ProviderRegistryEntry>;
  defaultProviderId: LLMProviderId;
  
  getDefault(): LLMProvider;
  get(id: LLMProviderId): LLMProvider | null;
  setDefault(id: LLMProviderId): void;
  enable(id: LLMProviderId): void;
  disable(id: LLMProviderId): void;
}

// -----------------------------------------------------------------------------
// USAGE PATTERN
// -----------------------------------------------------------------------------
// 
// // OLD (provider-specific):
// const response = await callAnthropic(systemPrompt, messages);
//
// // NEW (provider-agnostic):
// const provider = registry.getDefault();
// const response = await provider.complete({
//   systemPrompt,
//   messages,
//   maxTokens: 800,
//   metadata: { personaId, threadId, purpose: 'dm' }
// });
// 
// // Cost is automatically calculated and ready to log:
// await db.apiUsage.add({
//   id: crypto.randomUUID(),
//   timestamp: new Date().toISOString(),
//   model: response.model,
//   endpoint: 'dm',
//   inputTokens: response.inputTokens,
//   outputTokens: response.outputTokens,
//   estimatedCostUsd: response.estimatedCostUsd,
//   personaId,
//   threadId,
//   providerId: response.providerId,
// });
