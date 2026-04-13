// =============================================================================
// LLM PROVIDER REGISTRY
// =============================================================================
// /lib/llm/registry.ts
//
// Server-side singleton. Initialize once on cold start.
// Reads API keys from environment variables.

import type { LLMProvider, LLMProviderId, ProviderRegistry, ProviderRegistryEntry } from './types';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { OpenAIProvider } from './providers/openai';

class ProviderRegistryImpl implements ProviderRegistry {
  providers: Record<LLMProviderId, ProviderRegistryEntry> = {};
  defaultProviderId: LLMProviderId = 'anthropic';
  
  constructor() {
    this.initializeProviders();
  }
  
  private initializeProviders() {
    // Anthropic - always required
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.anthropic = {
        provider: new AnthropicProvider({
          apiKey: process.env.ANTHROPIC_API_KEY,
          defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-haiku-4-5-20251001',
        }),
        enabled: true,
        isDefault: true,
      };
    }
    
    // Google - optional
    if (process.env.GOOGLE_AI_API_KEY) {
      this.providers.google = {
        provider: new GoogleProvider({
          apiKey: process.env.GOOGLE_AI_API_KEY,
          defaultModel: process.env.GOOGLE_DEFAULT_MODEL || 'gemini-2.5-flash',
        }),
        enabled: true,
        isDefault: false,
      };
    }
    
    // OpenAI - optional
    if (process.env.OPENAI_API_KEY) {
      this.providers.openai = {
        provider: new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
        }),
        enabled: true,
        isDefault: false,
      };
    }
    
    // User can override default via env
    const requestedDefault = process.env.LLM_DEFAULT_PROVIDER as LLMProviderId | undefined;
    if (requestedDefault && this.providers[requestedDefault]?.enabled) {
      this.setDefault(requestedDefault);
    }
    
    if (!this.providers[this.defaultProviderId]) {
      throw new Error('No LLM provider configured. Set ANTHROPIC_API_KEY at minimum.');
    }
  }
  
  getDefault(): LLMProvider {
    const entry = this.providers[this.defaultProviderId];
    if (!entry) throw new Error(`Default provider ${this.defaultProviderId} not registered`);
    return entry.provider;
  }
  
  get(id: LLMProviderId): LLMProvider | null {
    return this.providers[id]?.provider || null;
  }
  
  setDefault(id: LLMProviderId): void {
    if (!this.providers[id]) throw new Error(`Provider ${id} not registered`);
    if (!this.providers[id].enabled) throw new Error(`Provider ${id} is disabled`);
    
    Object.values(this.providers).forEach(entry => entry.isDefault = false);
    this.providers[id].isDefault = true;
    this.defaultProviderId = id;
  }
  
  enable(id: LLMProviderId): void {
    if (this.providers[id]) this.providers[id].enabled = true;
  }
  
  disable(id: LLMProviderId): void {
    if (this.providers[id]) this.providers[id].enabled = false;
    if (this.defaultProviderId === id) {
      // Reassign default to any other enabled provider
      const next = Object.values(this.providers).find(e => e.enabled);
      if (!next) throw new Error('Cannot disable last enabled provider');
      this.setDefault(next.provider.id);
    }
  }
}

// Singleton — only instantiate once per server lifecycle
let registryInstance: ProviderRegistryImpl | null = null;

export function getRegistry(): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistryImpl();
  }
  return registryInstance;
}

// Convenience: get default provider directly
export function getDefaultProvider() {
  return getRegistry().getDefault();
}
