// ─── Core Types ───
export type {
  Role,
  Message,
  ToolCall,
  ToolDefinition,
  AgentConfig,
  AgentCapabilities,
  AgentRunConfig,
  AgentToolConfig,
  AgentContext,
  HandoffTarget,
  HandoffResult,
  Guardrail,
  GuardrailResult,
  GuardrailAction,
  ApiType,
  ProviderConfig,
  ProviderRequestOptions,
  ProviderResponse,
  ProviderStreamChunk,
  ProviderToolSchema,
  MailConfig,
  MemoryConfig,
  NotificationConfig,
  Trace,
  TraceSpan,
  TraceSpanType,
  TaskState,
  TaskStatus,
  TaskFlowNode,
  TaskFlow,
  RunnerEvent,
  RunResult,
  FrameworkConfig,
} from "./types.js";
export { isProviderConfig } from "./types.js";

// ─── Core Module ───
export * from "./core/index.js";

// ─── Routing Module ───
export * from "./routing/index.js";

// ─── Memory Module ───
export * from "./memory/index.js";

// ─── Skills Module ───
export * from "./skills/index.js";

// ─── Observability Module ───
export * from "./observability/index.js";

// ─── Config Module ───
export * from "./config/index.js";

// ─── Providers ───
export { BaseProvider } from "./providers/base.js";
export { OpenAIProvider } from "./providers/openai.js";
export { AnthropicProvider } from "./providers/anthropic.js";
export { providerRegistry, registerBuiltinProviders } from "./providers/index.js";
export { buildToolCallPrompt, parseToolCallFromText } from "./providers/tool-prompt.js";

// ─── Prompts ───
// Note: Prompt content is stored in src/prompts/ as Markdown files
// Loaded dynamically by core/prompt-loader
export { DEFAULT_SYSTEM_PROMPT, PROMPT_PARTS, buildSystemPrompt } from "./core/index.js";
export { ARCHITECTURE_REFERENCE, getArchitectureReference } from "./core/index.js";
export type { SystemPromptParts } from "./core/index.js";

// ─── Utils ───
export { Logger, logger } from "./utils/logger.js";
export { collectStream, createChannel } from "./utils/stream.js";
