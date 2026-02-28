import { BaseProvider } from "./base.js";
import type { ProviderConfig, ApiType } from "../types.js";

type ProviderFactory = (config: ProviderConfig) => BaseProvider;

/**
 * Provider Registry — maps apiType to factory functions.
 *
 * Key design: providers are resolved by apiType (openai/anthropic),
 * not by brand name. Multiple brands (Doubao, Qwen, Ollama, DeepSeek)
 * share the same "openai" apiType and use the same OpenAIProvider.
 */
class ProviderRegistry {
  private factories = new Map<string, ProviderFactory>();
  private instances = new Map<string, BaseProvider>();

  /**
   * Register a provider factory for an apiType.
   */
  register(apiType: string, factory: ProviderFactory): void {
    this.factories.set(apiType, factory);
  }

  /**
   * Get or create a provider instance for a given provider config.
   * Uses apiType to select the right factory, and caches by a unique key
   * (apiType + baseUrl) to reuse instances for the same endpoint.
   */
  get(providerName: string, config: ProviderConfig): BaseProvider {
    const cacheKey = `${providerName}:${config.apiType}:${config.baseUrl}`;

    if (!this.instances.has(cacheKey)) {
      const factory = this.factories.get(config.apiType);
      if (!factory) {
        throw new Error(
          `No provider registered for apiType: "${config.apiType}". ` +
            `Available apiTypes: ${[...this.factories.keys()].join(", ")}. ` +
            `Register with providerRegistry.register().`
        );
      }
      this.instances.set(cacheKey, factory(config));
    }

    return this.instances.get(cacheKey)!;
  }

  has(apiType: string): boolean {
    return this.factories.has(apiType);
  }

  list(): string[] {
    return [...this.factories.keys()];
  }

  /**
   * Clear cached instances (useful for testing or config reload).
   */
  clear(): void {
    this.instances.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
