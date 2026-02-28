import { z } from "zod";

// ─── Messages (unified across providers) ───

export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface Message {
  role: Role;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

// ─── Tool ───

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description: string;
  parameters: z.ZodType<TInput>;
  execute: (input: TInput, ctx: AgentContext) => Promise<TOutput>;
}

// ─── Handoff ───

export interface HandoffTarget {
  agent: AgentConfig;
  description: string;
  contextFilter?: (ctx: AgentContext) => AgentContext;
  inputFilter?: (history: Message[]) => Message[];
}

export interface HandoffResult {
  targetAgent: string;
  context: AgentContext;
  history: Message[];
}

// ─── Guardrail ───

export type GuardrailAction = "block" | "warn" | "log";

export interface GuardrailResult {
  passed: boolean;
  action: GuardrailAction;
  message?: string;
}

export interface Guardrail {
  name: string;
  type: "input" | "output";
  validate: (content: string, ctx: AgentContext) => Promise<GuardrailResult>;
}

// ─── Agent ───

export interface AgentCapabilities {
  summary: string;              // 模型简短描述（如 "Claude Opus 4 - 编码能力突出"）
  modelStrengths: string[];     // 模型优势（如 ["长代码生成", "复杂逻辑", "架构设计"]）
  taskTypes: string[];          // 擅长的任务类型（如 ["code_writing", "debugging", "refactoring"]）
  languages?: string[];         // 擅长的编程语言或自然语言（可选）
  bestFor?: string[];           // 最适合的场景（可选）
  limitations?: string[];       // 限制说明（可选）
}

export interface AgentRunConfig {
  maxTurns?: number;            // 最大轮次
  timeoutMinutes?: number;      // 超时时间（分钟）
}

export interface AgentToolConfig {
  tools?: string[];             // 工具名称列表（从注册表解析）
  toolDefinitions?: ToolDefinition[];  // 直接提供的工具定义
}

export interface AgentConfig {
  name: string;
  description?: string;         // Agent 描述（用于显示和选择）
  instructions: string | ((ctx: AgentContext) => string);
  provider: string;
  model: string;

  // 工具配置
  tools?: ToolDefinition[];     // 保持向后兼容
  toolConfig?: AgentToolConfig; // 新的工具配置方式

  // 其他配置
  handoffs?: HandoffTarget[];
  guardrails?: Guardrail[];

  // 运行配置
  maxTurns?: number;            // 保持向后兼容
  runConfig?: AgentRunConfig;   // 新的运行配置方式

  // 模型参数
  temperature?: number;
  topP?: number;
  maxTokens?: number;

  // 能力描述
  capabilities?: AgentCapabilities;

  // 元数据
  source?: "builtin" | "user" | "project";  // Agent 来源
  filePath?: string;            // Markdown 文件路径（如果从文件加载）
}

// ─── Context ───

export interface AgentContext<T extends Record<string, unknown> = Record<string, unknown>> {
  state: T;
  history: Message[];
  currentAgent: string;
  handoffChain: string[];
  metadata: Record<string, unknown>;
}

// ─── Provider ───

export interface ProviderToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ProviderRequestOptions {
  model: string;
  messages: Message[];
  tools?: ProviderToolSchema[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ProviderResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "tool_calls" | "length" | "content_filter";
}

export interface ProviderStreamChunk {
  type: "text_delta" | "tool_call_delta" | "done";
  content?: string;
  toolCall?: Partial<ToolCall>;
}

// ─── Tracing ───

export type TraceSpanType = "agent" | "llm" | "tool" | "handoff" | "guardrail";

export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  type: TraceSpanType;
  startTime: number;
  endTime?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Trace {
  id: string;
  spans: TraceSpan[];
  startTime: number;
  endTime?: number;
}

// ─── Task Flow (A2A-inspired) ───

export type TaskState =
  | "submitted"       // Task acknowledged, queued
  | "working"         // Agent actively processing
  | "completed"       // Terminal: success
  | "failed"          // Terminal: error
  | "canceled"        // Terminal: user/system canceled
  | "handoff";        // Transferring to another agent

export interface TaskStatus {
  state: TaskState;
  message?: string;
  timestamp: number;
}

export interface TaskFlowNode {
  taskId: string;
  contextId: string;          // Groups all related tasks in one session
  sourceAgent?: string;       // Who delegated this task (undefined = user)
  targetAgent: string;        // Who is executing this task
  provider: string;           // Provider being used
  model: string;              // Model being used
  input: string;              // The input/request for this task
  statusHistory: TaskStatus[];// Full state transition log
  currentState: TaskState;
  output?: string;            // Final output (when completed)
  error?: string;             // Error message (when failed)
  toolCalls: Array<{          // Tools invoked during this task
    toolName: string;
    args: unknown;
    result?: unknown;
  }>;
  childTaskId?: string;       // Task created by handoff from this one
  startTime: number;
  endTime?: number;
}

export interface TaskFlow {
  contextId: string;
  tasks: TaskFlowNode[];      // Ordered list of all tasks in this flow
  activeTaskId?: string;      // Currently executing task
  startTime: number;
  endTime?: number;
}

// ─── Runner Events ───

export type RunnerEvent =
  | { type: "task_submitted"; taskId: string; contextId: string; agent: string; provider: string; model: string; input: string }
  | { type: "task_working"; taskId: string; agent: string }
  | { type: "llm_call"; taskId: string; agent: string; provider: string; model: string; turn: number }
  | { type: "llm_response"; taskId: string; response: ProviderResponse }
  | { type: "tool_call"; taskId: string; agent: string; toolName: string; args: unknown }
  | { type: "tool_result"; taskId: string; agent: string; toolName: string; result: unknown }
  | { type: "task_handoff"; taskId: string; fromAgent: string; toAgent: string; reason?: string; newTaskId: string; toProvider: string; toModel: string }
  | { type: "guardrail_triggered"; taskId: string; guardrail: string; result: GuardrailResult }
  | { type: "task_completed"; taskId: string; agent: string; output: string }
  | { type: "task_failed"; taskId: string; agent: string; error: string }
  | { type: "text_delta"; taskId: string; content: string }
  | { type: "flow_complete"; flow: TaskFlow };

export interface RunResult {
  output: string;
  context: AgentContext;
  trace: Trace;
  flow: TaskFlow;
  lastAgent: string;
}

// ─── Config ───

export type ApiType = "openai" | "anthropic" | "dashscope" | (string & {});

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: ApiType;
  nativeToolCall: boolean;
  contextWindow?: number;
  embedding?: {
    model: string;
    apiType: string;
    dimensions: number;
  };
}

export interface MailConfig {
  smtp: { host: string; port: number; secure: boolean };
  pop3?: { host: string; port: number };
  imap?: { host: string; port: number };
  user: string;
  pass: string;
  pollInterval: number;
  whitelist: string[];
}

export interface MemoryConfig {
  embeddingProvider: string;
  memoryAgent: {
    provider: string;
    model: string;
  };
}

export interface NotificationConfig {
  enabled: boolean;
  appWhitelist: string[];
  appBlacklist: string[];
  diffApps: string[];
}

export interface FrameworkConfig {
  autonomousMode?: boolean;
  defaultProvider?: string;  // optional fallback, agents should specify their own
  mouseSpeed?: number;
  workspace?: string;

  /** Provider configs, extracted from the flat JSON by the config loader */
  providers: Record<string, ProviderConfig>;

  mail?: MailConfig;
  memory?: MemoryConfig;
  notification?: NotificationConfig;
  tracing?: {
    enabled?: boolean;
    output?: "console" | "file" | "custom";
    filePath?: string;
  };
}

/**
 * Helper to extract provider configs from the flat FrameworkConfig.
 * Provider configs are identified by having `apiKey` and `apiType` fields.
 */
export function isProviderConfig(value: unknown): value is ProviderConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    "apiKey" in value &&
    "apiType" in value
  );
}
