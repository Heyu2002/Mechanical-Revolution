/**
 * Event Bus
 *
 * 事件驱动架构的核心组件
 * 用于组件间的解耦通信
 *
 * 参考 Gemini-CLI 的 MessageBus 设计
 */

import { EventEmitter } from "events";
import type {
  AgentConfig,
  ToolDefinition,
  RunResult,
  TaskFlow,
  Message,
} from "../types.js";

// ─── Event Types ───

export interface AgentStartedEvent {
  type: "agent:started";
  agent: string;
  provider: string;
  model: string;
  timestamp: number;
}

export interface AgentCompletedEvent {
  type: "agent:completed";
  agent: string;
  result: RunResult;
  timestamp: number;
}

export interface AgentErrorEvent {
  type: "agent:error";
  agent: string;
  error: Error;
  timestamp: number;
}

export interface ToolCalledEvent {
  type: "tool:called";
  agent: string;
  tool: string;
  params: any;
  timestamp: number;
}

export interface ToolCompletedEvent {
  type: "tool:completed";
  agent: string;
  tool: string;
  result: any;
  duration: number;
  timestamp: number;
}

export interface ToolErrorEvent {
  type: "tool:error";
  agent: string;
  tool: string;
  error: Error;
  timestamp: number;
}

export interface RoutingDecisionEvent {
  type: "routing:decision";
  from: string;
  to: string;
  reason: string;
  complexity?: number;
  similarity?: number;
  timestamp: number;
}

export interface LearningUpdatedEvent {
  type: "learning:updated";
  samples: number;
  accuracy: number;
  weights: Record<string, number>;
  timestamp: number;
}

export interface ConfigChangedEvent {
  type: "config:changed";
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

export interface AgentRegisteredEvent {
  type: "agent:registered";
  agent: AgentConfig;
  timestamp: number;
}

export interface AgentUnregisteredEvent {
  type: "agent:unregistered";
  agentName: string;
  timestamp: number;
}

export interface FlowCompleteEvent {
  type: "flow:complete";
  flow: TaskFlow;
  timestamp: number;
}

export type BusEvent =
  | AgentStartedEvent
  | AgentCompletedEvent
  | AgentErrorEvent
  | ToolCalledEvent
  | ToolCompletedEvent
  | ToolErrorEvent
  | RoutingDecisionEvent
  | LearningUpdatedEvent
  | ConfigChangedEvent
  | AgentRegisteredEvent
  | AgentUnregisteredEvent
  | FlowCompleteEvent;

// ─── Event Bus ───

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // 增加最大监听器数量
  }

  // ─── Emit Methods ───

  emitAgentStarted(agent: string, provider: string, model: string): void {
    this.emit("agent:started", {
      type: "agent:started",
      agent,
      provider,
      model,
      timestamp: Date.now(),
    } as AgentStartedEvent);
  }

  emitAgentCompleted(agent: string, result: RunResult): void {
    this.emit("agent:completed", {
      type: "agent:completed",
      agent,
      result,
      timestamp: Date.now(),
    } as AgentCompletedEvent);
  }

  emitAgentError(agent: string, error: Error): void {
    this.emit("agent:error", {
      type: "agent:error",
      agent,
      error,
      timestamp: Date.now(),
    } as AgentErrorEvent);
  }

  emitToolCalled(agent: string, tool: string, params: any): void {
    this.emit("tool:called", {
      type: "tool:called",
      agent,
      tool,
      params,
      timestamp: Date.now(),
    } as ToolCalledEvent);
  }

  emitToolCompleted(agent: string, tool: string, result: any, duration: number): void {
    this.emit("tool:completed", {
      type: "tool:completed",
      agent,
      tool,
      result,
      duration,
      timestamp: Date.now(),
    } as ToolCompletedEvent);
  }

  emitToolError(agent: string, tool: string, error: Error): void {
    this.emit("tool:error", {
      type: "tool:error",
      agent,
      tool,
      error,
      timestamp: Date.now(),
    } as ToolErrorEvent);
  }

  emitRoutingDecision(
    from: string,
    to: string,
    reason: string,
    complexity?: number,
    similarity?: number
  ): void {
    this.emit("routing:decision", {
      type: "routing:decision",
      from,
      to,
      reason,
      complexity,
      similarity,
      timestamp: Date.now(),
    } as RoutingDecisionEvent);
  }

  emitLearningUpdated(
    samples: number,
    accuracy: number,
    weights: Record<string, number>
  ): void {
    this.emit("learning:updated", {
      type: "learning:updated",
      samples,
      accuracy,
      weights,
      timestamp: Date.now(),
    } as LearningUpdatedEvent);
  }

  emitConfigChanged(key: string, oldValue: any, newValue: any): void {
    this.emit("config:changed", {
      type: "config:changed",
      key,
      oldValue,
      newValue,
      timestamp: Date.now(),
    } as ConfigChangedEvent);
  }

  emitAgentRegistered(agent: AgentConfig): void {
    this.emit("agent:registered", {
      type: "agent:registered",
      agent,
      timestamp: Date.now(),
    } as AgentRegisteredEvent);
  }

  emitAgentUnregistered(agentName: string): void {
    this.emit("agent:unregistered", {
      type: "agent:unregistered",
      agentName,
      timestamp: Date.now(),
    } as AgentUnregisteredEvent);
  }

  emitFlowComplete(flow: TaskFlow): void {
    this.emit("flow:complete", {
      type: "flow:complete",
      flow,
      timestamp: Date.now(),
    } as FlowCompleteEvent);
  }

  // ─── Subscribe Methods ───

  onAgentStarted(handler: (event: AgentStartedEvent) => void): void {
    this.on("agent:started", handler);
  }

  onAgentCompleted(handler: (event: AgentCompletedEvent) => void): void {
    this.on("agent:completed", handler);
  }

  onAgentError(handler: (event: AgentErrorEvent) => void): void {
    this.on("agent:error", handler);
  }

  onToolCalled(handler: (event: ToolCalledEvent) => void): void {
    this.on("tool:called", handler);
  }

  onToolCompleted(handler: (event: ToolCompletedEvent) => void): void {
    this.on("tool:completed", handler);
  }

  onToolError(handler: (event: ToolErrorEvent) => void): void {
    this.on("tool:error", handler);
  }

  onRoutingDecision(handler: (event: RoutingDecisionEvent) => void): void {
    this.on("routing:decision", handler);
  }

  onLearningUpdated(handler: (event: LearningUpdatedEvent) => void): void {
    this.on("learning:updated", handler);
  }

  onConfigChanged(handler: (event: ConfigChangedEvent) => void): void {
    this.on("config:changed", handler);
  }

  onAgentRegistered(handler: (event: AgentRegisteredEvent) => void): void {
    this.on("agent:registered", handler);
  }

  onAgentUnregistered(handler: (event: AgentUnregisteredEvent) => void): void {
    this.on("agent:unregistered", handler);
  }

  onFlowComplete(handler: (event: FlowCompleteEvent) => void): void {
    this.on("flow:complete", handler);
  }

  // ─── Utility Methods ───

  /**
   * 订阅所有事件（用于调试）
   */
  onAny(handler: (event: BusEvent) => void): void {
    const eventTypes = [
      "agent:started",
      "agent:completed",
      "agent:error",
      "tool:called",
      "tool:completed",
      "tool:error",
      "routing:decision",
      "learning:updated",
      "config:changed",
      "agent:registered",
      "agent:unregistered",
      "flow:complete",
    ];

    eventTypes.forEach(type => {
      this.on(type, handler);
    });
  }

  /**
   * 清除所有监听器
   */
  clearAll(): void {
    this.removeAllListeners();
  }
}

/**
 * 全局事件总线实例
 */
export const globalEventBus = new EventBus();
