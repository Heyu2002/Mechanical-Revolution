import type {
  ProviderConfig,
  ProviderRequestOptions,
  ProviderResponse,
  ProviderStreamChunk,
  Message,
  ProviderToolSchema,
} from "../types.js";

/**
 * Abstract base class for all LLM providers.
 *
 * Providers are classified by apiType (openai/anthropic), not by brand.
 * A single provider class (e.g., OpenAIProvider) serves multiple brands
 * (OpenAI, Doubao, Qwen, Ollama, DeepSeek) that share the same API format.
 */
export abstract class BaseProvider {
  protected providerConfig: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.providerConfig = config;
  }

  /** Whether this provider supports native tool calling */
  get nativeToolCall(): boolean {
    return this.providerConfig.nativeToolCall;
  }

  /** Context window size in tokens */
  get contextWindow(): number {
    return this.providerConfig.contextWindow ?? 128000;
  }

  /** Non-streaming completion */
  abstract complete(options: ProviderRequestOptions): Promise<ProviderResponse>;

  /** Streaming completion — returns async iterable of chunks */
  abstract stream(
    options: ProviderRequestOptions
  ): AsyncIterable<ProviderStreamChunk>;

  /** Normalize framework Messages → provider-specific format */
  protected abstract toProviderMessages(messages: Message[]): unknown[];

  /** Normalize framework ToolSchemas → provider-specific format */
  protected abstract toProviderTools(tools: ProviderToolSchema[]): unknown[];
}
