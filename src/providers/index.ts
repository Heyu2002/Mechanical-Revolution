export { BaseProvider } from "./base.js";
export { OpenAIProvider } from "./openai.js";
export { AnthropicProvider } from "./anthropic.js";
export { providerRegistry } from "./registry.js";
export { buildToolCallPrompt, parseToolCallFromText } from "./tool-prompt.js";

import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { providerRegistry } from "./registry.js";

/**
 * Register built-in providers by apiType.
 *
 * - "openai" → OpenAIProvider (serves OpenAI, Doubao, Qwen, Ollama, DeepSeek, etc.)
 * - "anthropic" → AnthropicProvider (serves Anthropic/Claude)
 *
 * Called once at framework initialization.
 */
export function registerBuiltinProviders(): void {
  providerRegistry.register("openai", (config) => new OpenAIProvider(config));
  providerRegistry.register("anthropic", (config) => new AnthropicProvider(config));
}
