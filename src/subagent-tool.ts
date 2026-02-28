/**
 * Subagent Tool
 *
 * 将 Agent 包装为工具，使其可以被其他 Agent 调用
 * 这是实现层级 Agent 委派的核心机制
 *
 * 参考 Gemini-CLI 的 SubagentTool 设计
 */

import { z } from "zod";
import type {
  ToolDefinition,
  AgentConfig,
  AgentContext,
  Message,
  RunResult,
} from "./types.js";
import type { Runner } from "./runner.js";

export interface SubagentToolOptions {
  /**
   * 是否传递父 Agent 的上下文
   */
  inheritContext?: boolean;

  /**
   * 是否传递父 Agent 的历史消息
   */
  inheritHistory?: boolean;

  /**
   * 最大轮次覆盖（如果不指定，使用 Agent 自己的配置）
   */
  maxTurns?: number;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;
}

/**
 * SubagentTool 类
 *
 * 将 Agent 包装为可调用的工具
 */
export class SubagentTool implements ToolDefinition {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters: z.ZodType;

  constructor(
    private agent: AgentConfig,
    private runner: Runner,
    private options: SubagentToolOptions = {}
  ) {
    // 工具名称：delegate_to_<agent-name>
    this.name = `delegate_to_${agent.name.replace(/[^a-zA-Z0-9_]/g, "_")}`;

    // 工具描述：包含 Agent 的能力信息
    this.description = this.buildDescription();

    // 参数定义
    this.parameters = z.object({
      task: z.string().describe("The task to delegate to this agent"),
      context: z.string().optional().describe("Additional context for the task"),
      instructions: z.string().optional().describe("Specific instructions for this delegation"),
    });
  }

  /**
   * 构建工具描述
   */
  private buildDescription(): string {
    const parts: string[] = [];

    // 基本描述
    if (this.agent.description) {
      parts.push(this.agent.description);
    } else if (this.agent.capabilities?.summary) {
      parts.push(this.agent.capabilities.summary);
    } else {
      parts.push(`Delegate task to ${this.agent.name}`);
    }

    // 能力信息
    if (this.agent.capabilities) {
      const cap = this.agent.capabilities;

      if (cap.modelStrengths && cap.modelStrengths.length > 0) {
        parts.push(`\nStrengths: ${cap.modelStrengths.slice(0, 5).join(", ")}`);
      }

      if (cap.taskTypes && cap.taskTypes.length > 0) {
        parts.push(`Task types: ${cap.taskTypes.slice(0, 5).join(", ")}`);
      }

      if (cap.bestFor && cap.bestFor.length > 0) {
        parts.push(`Best for: ${cap.bestFor.slice(0, 5).join(", ")}`);
      }
    }

    // 模型信息
    parts.push(`\nModel: ${this.agent.provider}/${this.agent.model}`);

    return parts.join("\n");
  }

  /**
   * 执行工具（调用子 Agent）
   */
  async execute(
    input: { task: string; context?: string; instructions?: string },
    parentContext: AgentContext
  ): Promise<string> {
    // 创建子 Agent 的上下文
    const childContext = this.createChildContext(parentContext, input);

    // 构建子 Agent 的输入
    const childInput = this.buildChildInput(input);

    // 执行子 Agent
    try {
      const result = await this.runner.run(this.agent, childInput, childContext);

      // 返回结果
      return this.formatResult(result);
    } catch (error) {
      // 错误处理
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error delegating to ${this.agent.name}: ${errorMessage}`;
    }
  }

  /**
   * 创建子 Agent 的上下文
   */
  private createChildContext(
    parentContext: AgentContext,
    input: { task: string; context?: string; instructions?: string }
  ): AgentContext {
    const childContext: AgentContext = {
      state: this.options.inheritContext ? { ...parentContext.state } : {},
      history: this.options.inheritHistory ? [...parentContext.history] : [],
      currentAgent: this.agent.name,
      handoffChain: [...parentContext.handoffChain, this.agent.name],
      metadata: {
        ...parentContext.metadata,
        parentAgent: parentContext.currentAgent,
        delegatedTask: input.task,
        delegationContext: input.context,
        delegationInstructions: input.instructions,
      },
    };

    return childContext;
  }

  /**
   * 构建子 Agent 的输入
   */
  private buildChildInput(input: {
    task: string;
    context?: string;
    instructions?: string;
  }): string {
    const parts: string[] = [];

    // 任务
    parts.push(input.task);

    // 额外上下文
    if (input.context) {
      parts.push(`\nContext: ${input.context}`);
    }

    // 特定指令
    if (input.instructions) {
      parts.push(`\nInstructions: ${input.instructions}`);
    }

    return parts.join("\n");
  }

  /**
   * 格式化结果
   */
  private formatResult(result: RunResult): string {
    // 简单返回输出
    // 可以根据需要添加更多信息（如使用的工具、轮次等）
    return result.output;
  }

  /**
   * 获取包装的 Agent
   */
  getAgent(): AgentConfig {
    return this.agent;
  }

  /**
   * 获取工具选项
   */
  getOptions(): SubagentToolOptions {
    return this.options;
  }
}

/**
 * 创建 SubagentTool 的便捷函数
 */
export function createSubagentTool(
  agent: AgentConfig,
  runner: Runner,
  options?: SubagentToolOptions
): SubagentTool {
  return new SubagentTool(agent, runner, options);
}

/**
 * 批量创建 SubagentTool
 */
export function createSubagentTools(
  agents: AgentConfig[],
  runner: Runner,
  options?: SubagentToolOptions
): SubagentTool[] {
  return agents.map(agent => createSubagentTool(agent, runner, options));
}

/**
 * 检查工具是否为 SubagentTool
 */
export function isSubagentTool(tool: ToolDefinition): tool is SubagentTool {
  return tool instanceof SubagentTool;
}
