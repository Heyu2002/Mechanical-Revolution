/**
 * Agent Markdown Loader
 *
 * 解析 Markdown 格式的 Agent 定义文件
 * 格式：YAML frontmatter + Markdown 内容
 *
 * 示例：
 * ---
 * name: my-agent
 * description: My custom agent
 * provider: anthropic
 * model: claude-3-5-sonnet
 * temperature: 0.7
 * maxTurns: 20
 * tools: [Read, Write, Bash]
 * capabilities:
 *   summary: "Specialized in coding"
 *   modelStrengths: [code_generation, debugging]
 *   taskTypes: [code_writing, refactoring]
 * ---
 *
 * System prompt goes here...
 */

import * as yaml from "yaml";
import type { AgentConfig, AgentCapabilities, AgentRunConfig, AgentToolConfig } from "../../types.js";

interface AgentFrontmatter {
  name: string;
  description?: string;
  provider: string;
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  maxTurns?: number;
  timeoutMinutes?: number;
  tools?: string[];
  capabilities?: {
    summary: string;
    modelStrengths?: string[];
    taskTypes?: string[];
    languages?: string[];
    bestFor?: string[];
    limitations?: string[];
  };
}

/**
 * 解析 Agent Markdown 文件
 */
export function parseAgentMarkdown(content: string): AgentConfig {
  // 提取 frontmatter 和 body
  const { frontmatter, body } = extractFrontmatter(content);

  // 解析 frontmatter
  const parsed = yaml.parse(frontmatter) as AgentFrontmatter;

  // 验证必需字段
  if (!parsed.name) {
    throw new Error("Agent name is required");
  }
  if (!parsed.provider) {
    throw new Error("Agent provider is required");
  }
  if (!parsed.model) {
    throw new Error("Agent model is required");
  }

  // 构建 AgentConfig
  const agent: AgentConfig = {
    name: parsed.name,
    description: parsed.description,
    instructions: body.trim(),
    provider: parsed.provider,
    model: parsed.model,
    temperature: parsed.temperature,
    topP: parsed.topP,
    maxTokens: parsed.maxTokens,
  };

  // 运行配置
  if (parsed.maxTurns !== undefined || parsed.timeoutMinutes !== undefined) {
    agent.runConfig = {
      maxTurns: parsed.maxTurns,
      timeoutMinutes: parsed.timeoutMinutes,
    };
  }

  // 保持向后兼容
  if (parsed.maxTurns !== undefined) {
    agent.maxTurns = parsed.maxTurns;
  }

  // 工具配置
  if (parsed.tools && parsed.tools.length > 0) {
    agent.toolConfig = {
      tools: parsed.tools,
    };
  }

  // 能力描述
  if (parsed.capabilities) {
    agent.capabilities = {
      summary: parsed.capabilities.summary,
      modelStrengths: parsed.capabilities.modelStrengths || [],
      taskTypes: parsed.capabilities.taskTypes || [],
      languages: parsed.capabilities.languages,
      bestFor: parsed.capabilities.bestFor,
      limitations: parsed.capabilities.limitations,
    };
  }

  return agent;
}

/**
 * 提取 YAML frontmatter 和 Markdown body
 */
function extractFrontmatter(content: string): { frontmatter: string; body: string } {
  const lines = content.split("\n");

  // 检查是否以 --- 开头
  if (lines[0]?.trim() !== "---") {
    throw new Error("Invalid agent file: missing frontmatter delimiter");
  }

  // 找到第二个 ---
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error("Invalid agent file: missing closing frontmatter delimiter");
  }

  // 提取 frontmatter 和 body
  const frontmatter = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n");

  return { frontmatter, body };
}

/**
 * 序列化 Agent 为 Markdown
 */
export function serializeAgentMarkdown(agent: AgentConfig): string {
  // 构建 frontmatter 对象
  const frontmatter: AgentFrontmatter = {
    name: agent.name,
    description: agent.description,
    provider: agent.provider,
    model: agent.model,
  };

  // 可选字段
  if (agent.temperature !== undefined) {
    frontmatter.temperature = agent.temperature;
  }
  if (agent.topP !== undefined) {
    frontmatter.topP = agent.topP;
  }
  if (agent.maxTokens !== undefined) {
    frontmatter.maxTokens = agent.maxTokens;
  }

  // 运行配置
  if (agent.runConfig) {
    if (agent.runConfig.maxTurns !== undefined) {
      frontmatter.maxTurns = agent.runConfig.maxTurns;
    }
    if (agent.runConfig.timeoutMinutes !== undefined) {
      frontmatter.timeoutMinutes = agent.runConfig.timeoutMinutes;
    }
  } else if (agent.maxTurns !== undefined) {
    // 向后兼容
    frontmatter.maxTurns = agent.maxTurns;
  }

  // 工具配置
  if (agent.toolConfig?.tools) {
    frontmatter.tools = agent.toolConfig.tools;
  }

  // 能力描述
  if (agent.capabilities) {
    frontmatter.capabilities = {
      summary: agent.capabilities.summary,
      modelStrengths: agent.capabilities.modelStrengths,
      taskTypes: agent.capabilities.taskTypes,
      languages: agent.capabilities.languages,
      bestFor: agent.capabilities.bestFor,
      limitations: agent.capabilities.limitations,
    };
  }

  // 序列化 frontmatter
  const yamlContent = yaml.stringify(frontmatter, {
    lineWidth: 0, // 不自动换行
    defaultStringType: "QUOTE_DOUBLE",
  });

  // 获取 instructions
  const instructions = typeof agent.instructions === "string"
    ? agent.instructions
    : "[Dynamic instructions - cannot serialize]";

  // 组合
  return `---\n${yamlContent}---\n\n${instructions}\n`;
}
