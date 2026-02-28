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

// ─── Core Primitives ───
export { defineAgent, resolveInstructions, createOrchestratorInstructions } from "./agent.js";
export { defineTool, toolToSchema, executeTool } from "./tool.js";
export { handoff, handoffsToTools, isHandoffTool } from "./handoff.js";
export { createContext, cloneContext } from "./context.js";
export {
  defineGuardrail,
  runGuardrails,
  maxLengthGuardrail,
  contentFilterGuardrail,
} from "./guardrail.js";

// ─── Runner ───
export { Runner } from "./runner.js";

// ─── Task Flow ───
export { TaskFlowTracker } from "./task-flow.js";

// ─── Tracing ───
export { Tracer, formatTrace } from "./tracing.js";

// ─── Config ───
export { loadConfig, getProviders, getProviderConfig } from "./config.js";

// ─── Providers ───
export { BaseProvider } from "./providers/base.js";
export { OpenAIProvider } from "./providers/openai.js";
export { AnthropicProvider } from "./providers/anthropic.js";
export { providerRegistry, registerBuiltinProviders } from "./providers/index.js";
export { buildToolCallPrompt, parseToolCallFromText } from "./providers/tool-prompt.js";

// ─── Prompts ───
export { DEFAULT_SYSTEM_PROMPT, PROMPT_PARTS, buildSystemPrompt } from "./prompts/index.js";
export {
  TRIAGE_PROMPT,
  RESEARCHER_PROMPT,
  MATHEMATICIAN_PROMPT,
  CODER_PROMPT,
  TRANSLATOR_PROMPT,
  SUMMARIZER_PROMPT,
  ORCHESTRATOR_PROMPT,
  AGENT_PROMPTS,
} from "./prompts/index.js";
export type { SystemPromptParts } from "./prompts/index.js";

// ─── Skills ───
export { SkillLoader } from "./skill-loader.js";
export type { Skill, SkillMetadata } from "./skill-loader.js";

// ─── Agent Matcher ───
export { TFIDFAgentMatcher, createAgentMatcher } from "./agent-matcher.js";
export type { AgentMatchResult } from "./agent-matcher.js";

// ─── Chat Detector ───
export { SimpleChatDetector, createChatDetector } from "./chat-detector.js";
export type { ChatDetectionResult } from "./chat-detector.js";

// ─── AI Task Router ───
export { AITaskRouter, createAIRouter } from "./ai-task-router.js";
export type { TaskRoutingDecision } from "./ai-task-router.js";

// ─── Task Complexity ───
export { TaskComplexityClassifier, createComplexityClassifier } from "./task-complexity.js";
export type { TaskComplexityResult, TaskFeatures } from "./task-complexity.js";

// ─── Adaptive Task Complexity ───
export { AdaptiveTaskComplexityClassifier, createAdaptiveClassifier } from "./adaptive-task-complexity.js";
export type { TrainingSample, LearningStats } from "./adaptive-task-complexity.js";

// ─── Agent Registry ───
export { AgentRegistry } from "./agent-registry.js";
export type { AgentRegistryOptions } from "./agent-registry.js";

// ─── Agent Loader ───
export { parseAgentMarkdown, serializeAgentMarkdown } from "./agent-loader.js";

// ─── Tool Registry ───
export { ToolRegistry, globalToolRegistry } from "./tool-registry.js";

// ─── Config Manager ───
export { ConfigManager, globalConfigManager } from "./config-manager.js";
export type { ConfigLayer } from "./config-manager.js";

// ─── Subagent Tool ───
export { SubagentTool, createSubagentTool, createSubagentTools, isSubagentTool } from "./subagent-tool.js";
export type { SubagentToolOptions } from "./subagent-tool.js";

// ─── Event Bus ───
export { EventBus, globalEventBus } from "./event-bus.js";
export type {
  BusEvent,
  AgentStartedEvent,
  AgentCompletedEvent,
  AgentErrorEvent,
  ToolCalledEvent,
  ToolCompletedEvent,
  ToolErrorEvent,
  RoutingDecisionEvent,
  LearningUpdatedEvent,
  ConfigChangedEvent,
  AgentRegisteredEvent,
  AgentUnregisteredEvent,
  FlowCompleteEvent,
} from "./event-bus.js";

// ─── Task Memory System ───
export { TaskMemorySystem, createTaskMemorySystem } from "./task-memory-system.js";
export type {
  TaskMemoryEntry,
  TaskStep,
  TaskDecomposition,
  TaskMemorySearchResult,
  TaskMemoryConfig,
  QuickMemory,
  DeepMemory,
} from "./task-memory-system.js";

// ─── Utils ───
export { Logger, logger } from "./utils/logger.js";
export { collectStream, createChannel } from "./utils/stream.js";
