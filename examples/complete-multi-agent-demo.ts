/**
 * Complete Multi-Agent Collaboration Example
 *
 * 演示完整的多 Agent 协作流程：
 * 1. 从 Markdown 加载 Agent
 * 2. 创建 SubagentTool
 * 3. 配置 Orchestrator
 * 4. 智能路由和任务分解
 * 5. 事件追踪
 */

import {
  AgentRegistry,
  ToolRegistry,
  ConfigManager,
  EventBus,
  createSubagentTool,
  defineAgent,
  createContext,
  Runner,
  loadConfig,
  registerBuiltinProviders,
  createOrchestratorInstructions,
  handoff,
  createComplexityClassifier,
  createAgentMatcher,
} from "../src/index.js";
import * as path from "path";

console.log("=== Complete Multi-Agent Collaboration Example ===\n");

// ══════════════════════════════════════════════════════════════
// Step 1: 初始化系统组件
// ══════════════════════════════════════════════════════════════

console.log("─── Step 1: Initialize System Components ───\n");

// 事件总线
const eventBus = new EventBus();

// 配置管理器
const configManager = new ConfigManager();
const frameworkConfig = configManager.getConfig();

// Agent 注册表
const agentRegistry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

// 工具注册表
const toolRegistry = new ToolRegistry();

// 加载配置和注册 Provider
const config = loadConfig();
registerBuiltinProviders();

// Runner
const runner = new Runner(config);

console.log("✓ System components initialized\n");

// ══════════════════════════════════════════════════════════════
// Step 2: 加载 Agent
// ══════════════════════════════════════════════════════════════

console.log("─── Step 2: Load Agents ───\n");

await agentRegistry.loadAll();

const claudeAgent = agentRegistry.get("claude-opus-coder");
const doubaoAgent = agentRegistry.get("doubao-chinese-vision");

if (!claudeAgent || !doubaoAgent) {
  console.error("❌ Required agents not found");
  process.exit(1);
}

console.log(`✓ Loaded ${agentRegistry.list().length} agents:`);
agentRegistry.list().forEach(agent => {
  console.log(`  - ${agent.name} (${agent.provider}/${agent.model})`);
});
console.log();

// ══════════════════════════════════════════════════════════════
// Step 3: 创建 SubagentTool
// ══════════════════════════════════════════════════════════════

console.log("─── Step 3: Create Subagent Tools ───\n");

const claudeTool = createSubagentTool(claudeAgent, runner, {
  inheritContext: true,
  inheritHistory: false,
});

const doubaoTool = createSubagentTool(doubaoAgent, runner, {
  inheritContext: true,
  inheritHistory: false,
});

console.log("✓ Created subagent tools:");
console.log(`  - ${claudeTool.name}`);
console.log(`  - ${doubaoTool.name}`);
console.log();

// ══════════════════════════════════════════════════════════════
// Step 4: 配置 Orchestrator
// ══════════════════════════════════════════════════════════════

console.log("─── Step 4: Configure Orchestrator ───\n");

const allAgents = [claudeAgent, doubaoAgent];

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: createOrchestratorInstructions(allAgents),
  provider: "anthropic",
  model: "claude-opus-4-6-kiro",
  tools: [claudeTool, doubaoTool],
  handoffs: [
    handoff(claudeAgent, "Delegate coding tasks to Claude Opus"),
    handoff(doubaoAgent, "Delegate Chinese/image tasks to Doubao"),
  ],
  maxTurns: 30,
});

console.log("✓ Orchestrator configured with:");
console.log(`  - ${orchestratorAgent.tools?.length || 0} subagent tools`);
console.log(`  - ${orchestratorAgent.handoffs?.length || 0} handoff targets`);
console.log();

// ══════════════════════════════════════════════════════════════
// Step 5: 设置事件监听
// ══════════════════════════════════════════════════════════════

console.log("─── Step 5: Setup Event Listeners ───\n");

eventBus.onAgentStarted(event => {
  console.log(`[Event] Agent started: ${event.agent} (${event.provider}/${event.model})`);
});

eventBus.onAgentCompleted(event => {
  console.log(`[Event] Agent completed: ${event.agent}`);
  console.log(`  Output: ${event.result.output.substring(0, 100)}...`);
});

eventBus.onToolCalled(event => {
  console.log(`[Event] Tool called: ${event.tool} by ${event.agent}`);
});

eventBus.onRoutingDecision(event => {
  console.log(`[Event] Routing: ${event.from} → ${event.to}`);
  console.log(`  Reason: ${event.reason}`);
  if (event.complexity !== undefined) {
    console.log(`  Complexity: ${event.complexity.toFixed(1)}`);
  }
  if (event.similarity !== undefined) {
    console.log(`  Similarity: ${(event.similarity * 100).toFixed(1)}%`);
  }
});

console.log("✓ Event listeners configured\n");

// ══════════════════════════════════════════════════════════════
// Step 6: 智能路由函数
// ══════════════════════════════════════════════════════════════

console.log("─── Step 6: Smart Routing Function ───\n");

const complexityClassifier = createComplexityClassifier();
const agentMatcher = createAgentMatcher(allAgents);

function smartRoute(input: string, currentAgent = doubaoAgent) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`User Input: "${input}"`);
  console.log(`Current Agent: ${currentAgent.name}\n`);

  // 1. 判断复杂度
  const complexityResult = complexityClassifier.classify(input);
  console.log(`Complexity Analysis:`);
  console.log(`  - Score: ${complexityResult.complexity.toFixed(1)}/100`);
  console.log(`  - Decision: ${complexityResult.decision}`);
  console.log(`  - Should Decompose: ${complexityResult.shouldDecompose ? "Yes" : "No"}`);

  // 2. 匹配 Agent
  const matchResult = agentMatcher.findBestAgent(input, currentAgent, allAgents);
  console.log(`\nAgent Matching:`);
  console.log(`  - Best Agent: ${matchResult.bestAgent.name}`);
  console.log(`  - Similarity: ${(matchResult.similarity * 100).toFixed(1)}%`);
  console.log(`  - Should Handoff: ${matchResult.shouldHandoff ? "Yes" : "No"}`);
  console.log(`  - Reasoning: ${matchResult.reasoning}`);

  // 3. 决策
  let selectedAgent;
  let reason;

  if (complexityResult.shouldDecompose) {
    selectedAgent = orchestratorAgent;
    reason = "Complex task - using Orchestrator for decomposition";
  } else if (matchResult.shouldHandoff) {
    selectedAgent = matchResult.bestAgent;
    reason = `Switching to ${matchResult.bestAgent.name} (better match)`;
  } else {
    selectedAgent = currentAgent;
    reason = `Keeping current agent ${currentAgent.name}`;
  }

  console.log(`\n✅ Decision: ${reason}`);
  console.log(`   Selected Agent: ${selectedAgent.name} (${selectedAgent.provider}/${selectedAgent.model})`);
  console.log(`${"=".repeat(80)}\n`);

  // 发送路由事件
  eventBus.emitRoutingDecision(
    currentAgent.name,
    selectedAgent.name,
    reason,
    complexityResult.complexity,
    matchResult.similarity
  );

  return selectedAgent;
}

console.log("✓ Smart routing function ready\n");

// ══════════════════════════════════════════════════════════════
// Step 7: 测试用例
// ══════════════════════════════════════════════════════════════

console.log("─── Step 7: Test Cases ───\n");

const testCases = [
  { input: "你好", currentAgent: doubaoAgent },
  { input: "帮我实现一个二叉树遍历算法", currentAgent: doubaoAgent },
  { input: "写一篇关于人工智能的中文文章", currentAgent: claudeAgent },
  {
    input: "研究 React 19 新特性，然后创建示例组件，并编写测试",
    currentAgent: doubaoAgent,
  },
];

console.log("Running test cases...\n");

testCases.forEach((testCase, index) => {
  console.log(`\nTest Case ${index + 1}:`);
  const selectedAgent = smartRoute(testCase.input, testCase.currentAgent);
});

// ══════════════════════════════════════════════════════════════
// Step 8: 实际执行示例（可选）
// ══════════════════════════════════════════════════════════════

console.log("\n─── Step 8: Actual Execution Example ───\n");

async function runExample() {
  const input = "帮我实现一个快速排序算法，用 TypeScript 编写";

  console.log(`Input: "${input}"\n`);

  // 智能路由
  const selectedAgent = smartRoute(input, doubaoAgent);

  console.log("Executing with selected agent...\n");

  try {
    // 发送 Agent 启动事件
    eventBus.emitAgentStarted(
      selectedAgent.name,
      selectedAgent.provider,
      selectedAgent.model
    );

    const context = createContext();
    const result = await runner.run(selectedAgent, input, context);

    // 发送 Agent 完成事件
    eventBus.emitAgentCompleted(selectedAgent.name, result);

    console.log("\n─── Result ───\n");
    console.log(result.output);
    console.log(`\nLast Agent: ${result.lastAgent}`);
    console.log(`Total Tasks: ${result.flow.tasks.length}`);

    // 发送流程完成事件
    eventBus.emitFlowComplete(result.flow);
  } catch (error) {
    console.error("Error:", error);
    eventBus.emitAgentError(
      selectedAgent.name,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// 运行示例
runExample()
  .then(() => {
    console.log("\n─── Example Complete ───");
  })
  .catch(error => {
    console.error("Fatal error:", error);
  });

// ══════════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════════

console.log("\n─── Summary ───\n");

console.log("✅ Multi-Agent Collaboration System Ready!");
console.log();
console.log("Components:");
console.log("  1. ✓ Agent Registry - Load agents from Markdown");
console.log("  2. ✓ Tool Registry - Manage tools");
console.log("  3. ✓ Config Manager - Multi-layer configuration");
console.log("  4. ✓ Event Bus - Event-driven architecture");
console.log("  5. ✓ SubagentTool - Agent delegation");
console.log("  6. ✓ Smart Routing - Complexity + Similarity");
console.log("  7. ✓ Orchestrator - Task decomposition");
console.log();
console.log("Features:");
console.log("  - Dynamic agent loading from Markdown");
console.log("  - Hierarchical agent delegation");
console.log("  - Intelligent task routing");
console.log("  - Event-driven monitoring");
console.log("  - Multi-layer configuration");
console.log();
