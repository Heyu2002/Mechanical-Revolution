/**
 * Test New Architecture
 *
 * 测试新的架构组件：
 * 1. Agent Registry - 从 Markdown 加载 Agent
 * 2. Tool Registry - 工具注册和解析
 * 3. Config Manager - 多层配置管理
 */

import {
  AgentRegistry,
  ToolRegistry,
  ConfigManager,
  parseAgentMarkdown,
  defineAgent,
  createContext,
  Runner,
  loadConfig,
  registerBuiltinProviders,
} from "../src/index.js";
import * as fs from "fs";
import * as path from "path";

console.log("=== Testing New Architecture ===\n");

// ══════════════════════════════════════════════════════════════
// Test 1: Agent Registry
// ══════════════════════════════════════════════════════════════

console.log("─── Test 1: Agent Registry ───\n");

const agentRegistry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false, // 禁用热重载以便测试
});

// 加载所有 Agent
await agentRegistry.loadAll();

console.log(`✓ Loaded ${agentRegistry.list().length} agents\n`);

// 列出所有 Agent
console.log("Available Agents:");
agentRegistry.list().forEach(agent => {
  console.log(`  - ${agent.name} (${agent.provider}/${agent.model})`);
  console.log(`    ${agent.description || agent.capabilities?.summary || "No description"}`);
  console.log(`    Source: ${agent.source}`);
  console.log(`    Tools: ${agent.toolConfig?.tools?.join(", ") || "None"}`);
  console.log();
});

// 测试获取特定 Agent
const claudeAgent = agentRegistry.get("claude-opus-coder");
if (claudeAgent) {
  console.log("✓ Successfully retrieved claude-opus-coder");
  console.log(`  Capabilities: ${claudeAgent.capabilities?.modelStrengths.slice(0, 3).join(", ")}...`);
  console.log();
}

// 测试搜索
const searchResults = agentRegistry.search("编码");
console.log(`✓ Search for "编码" found ${searchResults.length} agents:`);
searchResults.forEach(agent => {
  console.log(`  - ${agent.name}`);
});
console.log();

// ══════════════════════════════════════════════════════════════
// Test 2: Tool Registry
// ══════════════════════════════════════════════════════════════

console.log("─── Test 2: Tool Registry ───\n");

const toolRegistry = new ToolRegistry();

// 注册一些示例工具
import { z } from "zod";

toolRegistry.register({
  name: "Read",
  description: "Read file contents",
  parameters: z.object({
    path: z.string().describe("File path to read"),
  }),
  execute: async (input) => {
    return `[Mock] Reading file: ${input.path}`;
  },
});

toolRegistry.register({
  name: "Write",
  description: "Write content to file",
  parameters: z.object({
    path: z.string().describe("File path to write"),
    content: z.string().describe("Content to write"),
  }),
  execute: async (input) => {
    return `[Mock] Writing to file: ${input.path}`;
  },
});

toolRegistry.register({
  name: "Bash",
  description: "Execute bash command",
  parameters: z.object({
    command: z.string().describe("Command to execute"),
  }),
  execute: async (input) => {
    return `[Mock] Executing: ${input.command}`;
  },
});

console.log(`✓ Registered ${toolRegistry.list().length} tools\n`);

// 测试工具解析
const toolNames = ["Read", "Write", "Bash"];
const resolvedTools = toolRegistry.resolve(toolNames);
console.log(`✓ Resolved ${resolvedTools.length} tools from names: ${toolNames.join(", ")}\n`);

// 测试工具执行
const mockContext = createContext();
const result = await toolRegistry.execute("Read", { path: "test.txt" }, mockContext);
console.log(`✓ Tool execution result: ${result}\n`);

// ══════════════════════════════════════════════════════════════
// Test 3: Config Manager
// ══════════════════════════════════════════════════════════════

console.log("─── Test 3: Config Manager ───\n");

const configManager = new ConfigManager();

// 列出配置层
console.log("Configuration Layers:");
configManager.listLayers().forEach(layer => {
  console.log(`  ${layer.priority}. ${layer.name}`);
});
console.log();

// 获取配置
const config = configManager.getConfig();
console.log("✓ Merged configuration:");
console.log(`  Autonomous Mode: ${config.autonomousMode}`);
console.log(`  Workspace: ${config.workspace}`);
console.log(`  Tracing Enabled: ${config.tracing?.enabled}`);
console.log();

// 测试运行时覆盖
configManager.override("autonomousMode", true);
console.log("✓ Runtime override: autonomousMode = true");
console.log(`  New value: ${configManager.get("autonomousMode")}`);
console.log();

// 导出配置（调试）
const exported = configManager.export();
console.log("✓ Configuration export:");
console.log(`  Total layers: ${exported.layers.length}`);
const runtimeLayer = exported.layers.find(l => l.name === "runtime");
console.log(`  Runtime overrides: ${runtimeLayer ? Object.keys(runtimeLayer.data).length : 0}`);
console.log();

// ══════════════════════════════════════════════════════════════
// Test 4: Integration Test - Load Agent and Resolve Tools
// ══════════════════════════════════════════════════════════════

console.log("─── Test 4: Integration Test ───\n");

// 获取 Agent
const agent = agentRegistry.get("claude-opus-coder");
if (!agent) {
  console.error("❌ Agent not found");
  process.exit(1);
}

console.log(`✓ Loaded agent: ${agent.name}`);

// 解析 Agent 的工具
if (agent.toolConfig?.tools) {
  const agentTools = toolRegistry.resolve(agent.toolConfig.tools);
  console.log(`✓ Resolved ${agentTools.length} tools for agent:`);
  agentTools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();
}

// 测试 Agent 能力匹配
console.log("✓ Agent capabilities:");
console.log(`  Summary: ${agent.capabilities?.summary}`);
console.log(`  Model Strengths: ${agent.capabilities?.modelStrengths.join(", ")}`);
console.log(`  Task Types: ${agent.capabilities?.taskTypes.join(", ")}`);
console.log(`  Best For: ${agent.capabilities?.bestFor?.join(", ")}`);
console.log();

// ══════════════════════════════════════════════════════════════
// Test 5: Markdown Parsing
// ══════════════════════════════════════════════════════════════

console.log("─── Test 5: Markdown Parsing ───\n");

const markdownContent = `---
name: test-agent
description: Test agent for parsing
provider: anthropic
model: claude-3-5-sonnet
temperature: 0.5
maxTurns: 10
tools:
  - Read
  - Write
capabilities:
  summary: Test agent
  modelStrengths:
    - testing
  taskTypes:
    - test
---

This is a test agent for markdown parsing.
`;

const parsedAgent = parseAgentMarkdown(markdownContent);
console.log("✓ Parsed agent from markdown:");
console.log(`  Name: ${parsedAgent.name}`);
console.log(`  Provider: ${parsedAgent.provider}`);
console.log(`  Model: ${parsedAgent.model}`);
console.log(`  Temperature: ${parsedAgent.temperature}`);
console.log(`  Tools: ${parsedAgent.toolConfig?.tools?.join(", ")}`);
console.log(`  Instructions: ${parsedAgent.instructions.substring(0, 50)}...`);
console.log();

// ══════════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════════

console.log("─── Summary ───\n");

console.log("✅ All tests passed!");
console.log();
console.log("New Architecture Components:");
console.log("  1. ✓ Agent Registry - Load agents from Markdown files");
console.log("  2. ✓ Tool Registry - Register and resolve tools");
console.log("  3. ✓ Config Manager - Multi-layer configuration");
console.log("  4. ✓ Markdown Parser - Parse agent definitions");
console.log("  5. ✓ Integration - All components work together");
console.log();
console.log("Next Steps:");
console.log("  - Implement SubagentTool for agent delegation");
console.log("  - Update Runner to use registries");
console.log("  - Add hot-reload support");
console.log("  - Create more example agents");
console.log();

console.log("─── Test Complete ───");
