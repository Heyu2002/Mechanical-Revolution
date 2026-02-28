/**
 * Tool Registry
 *
 * 管理所有工具的注册、查询和执行
 * 支持：
 * - 内置工具
 * - 动态注册工具
 * - 工具解析（从名称到定义）
 */

import type { ToolDefinition, AgentContext } from "./types.js";
import { z } from "zod";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * 注册工具
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 批量注册工具
   */
  registerAll(tools: ToolDefinition[]): void {
    tools.forEach(tool => this.register(tool));
  }

  /**
   * 获取工具
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 列出所有工具
   */
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * 列出工具名称
   */
  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 解析工具名称列表为工具定义列表
   */
  resolve(toolNames: string[]): ToolDefinition[] {
    const resolved: ToolDefinition[] = [];
    const missing: string[] = [];

    for (const name of toolNames) {
      const tool = this.get(name);
      if (tool) {
        resolved.push(tool);
      } else {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      console.warn(`Warning: Tools not found in registry: ${missing.join(", ")}`);
    }

    return resolved;
  }

  /**
   * 执行工具
   */
  async execute<TInput = any, TOutput = any>(
    name: string,
    input: TInput,
    context: AgentContext
  ): Promise<TOutput> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // 验证输入
    const validatedInput = tool.parameters.parse(input);

    // 执行工具
    return tool.execute(validatedInput, context) as Promise<TOutput>;
  }

  /**
   * 转换为 Provider 工具定义格式
   */
  toProviderSchema(tools: ToolDefinition[]): Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return tools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJsonSchema(tool.parameters),
      },
    }));
  }

  /**
   * 注销工具
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * 将 Zod schema 转换为 JSON Schema
   */
  private zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
    // 简化版本，实际应该使用 zod-to-json-schema
    // 这里只处理常见的对象类型
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodTypeToJsonSchema(value as z.ZodType);
        if (!(value as z.ZodType).isOptional()) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    return { type: "object" };
  }

  /**
   * 将单个 Zod 类型转换为 JSON Schema 类型
   */
  private zodTypeToJsonSchema(zodType: z.ZodType): Record<string, unknown> {
    if (zodType instanceof z.ZodString) {
      return { type: "string" };
    }
    if (zodType instanceof z.ZodNumber) {
      return { type: "number" };
    }
    if (zodType instanceof z.ZodBoolean) {
      return { type: "boolean" };
    }
    if (zodType instanceof z.ZodArray) {
      return {
        type: "array",
        items: this.zodTypeToJsonSchema(zodType.element),
      };
    }
    if (zodType instanceof z.ZodObject) {
      return this.zodToJsonSchema(zodType);
    }
    if (zodType instanceof z.ZodOptional) {
      return this.zodTypeToJsonSchema(zodType.unwrap());
    }
    if (zodType instanceof z.ZodNullable) {
      return this.zodTypeToJsonSchema(zodType.unwrap());
    }

    return { type: "string" };
  }
}

/**
 * 全局工具注册表实例
 */
export const globalToolRegistry = new ToolRegistry();
